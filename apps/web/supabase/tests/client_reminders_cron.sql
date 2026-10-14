-- Pruebas de la migración 042, parte C (cron de recordatorios al cliente). Requiere el seed demo.
--   psql "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/client_reminders_cron.sql
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE _results (name TEXT, ok BOOLEAN, detail TEXT);
GRANT ALL ON _results TO anon, authenticated;

INSERT INTO platform_settings (key, value)
VALUES ('cron_key_sha256', encode(extensions.digest(repeat('k', 40), 'sha256'), 'hex'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- A: pagado sin periodo (escribe). B: pagado vencido (solo lectura). C: Gratis con fecha pasada (nunca vence).
CREATE TEMP TABLE _orgs ON COMMIT DROP AS
SELECT '00000000-0000-0000-00c0-000000000002'::uuid AS a,
       '00000000-0000-0000-00c0-000000000004'::uuid AS b,
       (SELECT o.id FROM organizations o WHERE o.plan = 'free'
          AND EXISTS (SELECT 1 FROM clients c WHERE c.organization_id = o.id)
        ORDER BY o.created_at LIMIT 1) AS c;

UPDATE organizations SET current_period_end = NULL WHERE id = (SELECT a FROM _orgs);
UPDATE organizations SET plan = 'pro', current_period_end = now() - interval '1 day' WHERE id = (SELECT b FROM _orgs);
UPDATE organizations SET current_period_end = now() - interval '30 days' WHERE id = (SELECT c FROM _orgs);

INSERT INTO follow_up_reminders (id, organization_id, client_id, title, reminder_type, scheduled_date, status,
  auto_send_notification, notification_channels, notification_sent_at)
SELECT v.id, cli.organization_id, cli.id, 'Prueba cron', v.kind, current_date + v.days, v.status, v.auto, ARRAY['email'], v.sent
FROM (VALUES
  ('00000000-0000-0000-0000-00000000c001'::uuid, 'a', 'maintenance', 0, 'pending', true, NULL::timestamptz),
  ('00000000-0000-0000-0000-00000000c002'::uuid, 'a', 'follow_up', 0, 'pending', true, NULL),
  ('00000000-0000-0000-0000-00000000c003'::uuid, 'a', 'renewal', 0, 'pending', false, NULL),
  ('00000000-0000-0000-0000-00000000c004'::uuid, 'a', 'renewal', 5, 'pending', true, NULL),
  ('00000000-0000-0000-0000-00000000c005'::uuid, 'a', 'renewal', 1, 'pending', true, NULL),
  ('00000000-0000-0000-0000-00000000c006'::uuid, 'a', 'maintenance', 0, 'cancelled', true, NULL),
  ('00000000-0000-0000-0000-00000000c007'::uuid, 'a', 'maintenance', 0, 'pending', true, now()),
  ('00000000-0000-0000-0000-00000000c008'::uuid, 'a', 'maintenance', -5, 'pending', true, NULL),
  ('00000000-0000-0000-0000-00000000c101'::uuid, 'b', 'maintenance', 0, 'pending', true, NULL),
  ('00000000-0000-0000-0000-00000000c201'::uuid, 'c', 'maintenance', -2, 'pending', true, NULL)
) AS v(id, org, kind, days, status, auto, sent)
CROSS JOIN _orgs
JOIN LATERAL (
  SELECT c.id, c.organization_id FROM clients c
  WHERE c.organization_id = CASE v.org WHEN 'a' THEN _orgs.a WHEN 'b' THEN _orgs.b ELSE _orgs.c END
  ORDER BY c.created_at LIMIT 1
) cli ON true;

CREATE TEMP TABLE _due (id UUID) ON COMMIT DROP;
GRANT ALL ON _due TO anon;

SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;

DO $$
DECLARE v_err TEXT; v_key TEXT;
BEGIN
  FOREACH v_key IN ARRAY ARRAY[repeat('x', 40), ''] LOOP
    v_err := '';
    BEGIN PERFORM * FROM client_reminders_due(NULLIF(v_key, ''), current_date + 1); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
    INSERT INTO _results VALUES ('due: wrong or empty cron key is forbidden (' || length(v_key) || ')', v_err = 'forbidden', v_err);
    v_err := '';
    BEGIN PERFORM mark_client_reminder_sent(NULLIF(v_key, ''), '00000000-0000-0000-0000-00000000c001', now()); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
    INSERT INTO _results VALUES ('mark: wrong or empty cron key is forbidden (' || length(v_key) || ')', v_err = 'forbidden', v_err);
  END LOOP;
END $$;

INSERT INTO _due SELECT id FROM client_reminders_due(repeat('k', 40), current_date + 1)
WHERE id::text LIKE '00000000-0000-0000-0000-00000000c%';

INSERT INTO _results
SELECT 'only due pending notifiable auto reminders of writable orgs',
       array_agg(id ORDER BY id) = ARRAY['00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000c005',
                                         '00000000-0000-0000-0000-00000000c201']::uuid[],
       array_agg(id ORDER BY id)::text
FROM _due;

INSERT INTO _results
SELECT 'expired paid org is excluded', NOT EXISTS (SELECT 1 FROM _due WHERE id = '00000000-0000-0000-0000-00000000c101'), NULL;

INSERT INTO _results
SELECT 'free org with past period end, 2 days overdue, is still included',
       EXISTS (SELECT 1 FROM _due WHERE id = '00000000-0000-0000-0000-00000000c201'), NULL;

INSERT INTO _results
SELECT 'reminder 5 days overdue is excluded', NOT EXISTS (SELECT 1 FROM _due WHERE id = '00000000-0000-0000-0000-00000000c008'), NULL;
RESET ROLE;

INSERT INTO _results
SELECT 'row carries client and organization data',
       count(*) FILTER (WHERE d.client_name = c.name AND d.client_email IS NOT DISTINCT FROM c.email AND d.organization_name = o.name
         AND d.reminder_type = 'maintenance' AND d.notification_channels = ARRAY['email'] AND d.scheduled_date = current_date) = 1,
       count(*)::text || ' row(s): ' || COALESCE(string_agg(d.client_name || ' / ' || d.organization_name, ', '), '')
FROM client_reminders_due(repeat('k', 40), current_date + 1) d
JOIN follow_up_reminders r ON r.id = d.id
JOIN clients c ON c.id = r.client_id
JOIN organizations o ON o.id = r.organization_id
WHERE d.id = '00000000-0000-0000-0000-00000000c001';

-- Al renovar, la misma organización vuelve a enviar: la exclusión es por el vencimiento, no por la organización.
UPDATE organizations SET current_period_end = now() + interval '1 month' WHERE id = (SELECT b FROM _orgs);
INSERT INTO _results
SELECT 'renewed org is included again',
       EXISTS (SELECT 1 FROM client_reminders_due(repeat('k', 40), current_date + 1) WHERE id = '00000000-0000-0000-0000-00000000c101'),
       NULL;

SET LOCAL ROLE anon;
INSERT INTO _results VALUES ('first mark returns true',
  mark_client_reminder_sent(repeat('k', 40), '00000000-0000-0000-0000-00000000c001', now()), NULL);
INSERT INTO _results VALUES ('second mark returns false',
  NOT mark_client_reminder_sent(repeat('k', 40), '00000000-0000-0000-0000-00000000c001', now()), NULL);
INSERT INTO _results VALUES ('cancelled reminder is not marked',
  NOT mark_client_reminder_sent(repeat('k', 40), '00000000-0000-0000-0000-00000000c006', now()), NULL);
INSERT INTO _results VALUES ('already sent reminder is not marked',
  NOT mark_client_reminder_sent(repeat('k', 40), '00000000-0000-0000-0000-00000000c007', now()), NULL);
INSERT INTO _results VALUES ('internal follow_up reminder is not marked',
  NOT mark_client_reminder_sent(repeat('k', 40), '00000000-0000-0000-0000-00000000c002', now()), NULL);
INSERT INTO _results VALUES ('reminder without auto notification is not marked',
  NOT mark_client_reminder_sent(repeat('k', 40), '00000000-0000-0000-0000-00000000c003', now()), NULL);
INSERT INTO _results
SELECT 'marked reminder leaves the due list',
       NOT EXISTS (SELECT 1 FROM client_reminders_due(repeat('k', 40), current_date + 1) WHERE id = '00000000-0000-0000-0000-00000000c001'),
       NULL;
RESET ROLE;

INSERT INTO _results
SELECT 'mark sets status sent and notification_sent_at', status = 'sent' AND notification_sent_at IS NOT NULL, status
FROM follow_up_reminders WHERE id = '00000000-0000-0000-0000-00000000c001';

INSERT INTO _results
SELECT 'functions are security definer with fixed search_path and no PUBLIC grant: ' || p.proname,
       p.prosecdef AND p.proconfig = ARRAY['search_path=public']
         AND p.proacl IS NOT NULL AND NOT EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee = 0)
         AND has_function_privilege('anon', p.oid, 'EXECUTE'),
       p.proacl::text
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace AND p.proname IN ('client_reminders_due', 'mark_client_reminder_sent');

INSERT INTO _results SELECT 'all 20 prior assertions ran', count(*) = 20, count(*)::text FROM _results;

SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, name, detail FROM _results ORDER BY ok, name;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) FILTER (WHERE NOT ok) AS failed FROM _results;
ROLLBACK;
