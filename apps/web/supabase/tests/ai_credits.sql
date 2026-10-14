-- Pruebas de la migración 043 (créditos de IA). Requieren el seed demo (MEGAGLASS y Plomería Don Beto):
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/ai_credits.sql
-- Todo corre dentro de una transacción que se revierte.
BEGIN;

CREATE TEMP TABLE _results (name TEXT, ok BOOLEAN, detail TEXT);
GRANT ALL ON _results TO anon, authenticated;

CREATE TEMP TABLE _fx AS
SELECT
  '00000000-0000-0000-00c0-000000000001'::UUID AS org,
  '00000000-0000-0000-00c0-000000000003'::UUID AS other_org,
  (SELECT id FROM auth.users WHERE email = 'direccion@megaglass.demo.cotizapro.mx') AS owner,
  (SELECT id FROM auth.users WHERE email = 'ventas@megaglass.demo.cotizapro.mx') AS seller,
  (SELECT id FROM auth.users WHERE email = 'beto@plomeria.demo.cotizapro.mx') AS other_owner;
GRANT SELECT ON _fx TO anon, authenticated;

CREATE TEMP TABLE _open (event_id UUID, nonce UUID);
GRANT ALL ON _open TO authenticated;

CREATE TEMP TABLE _grant (id UUID);
GRANT ALL ON _grant TO authenticated;

DELETE FROM ai_usage_events WHERE organization_id IN (SELECT org FROM _fx UNION SELECT other_org FROM _fx);
DELETE FROM ai_credit_grants WHERE organization_id IN (SELECT org FROM _fx UNION SELECT other_org FROM _fx);
DELETE FROM ai_usage_alerts WHERE organization_id IN (SELECT org FROM _fx UNION SELECT other_org FROM _fx);
UPDATE organizations SET plan = 'pro' WHERE id = (SELECT org FROM _fx);

INSERT INTO _results SELECT 'allowance for a missing or unknown plan is the free one',
  ai_monthly_allowance(NULL) = 25 AND ai_monthly_allowance('legacy') = 25, ai_monthly_allowance(NULL)::text;

INSERT INTO _results SELECT 'deleting a member keeps the usage row without user (SET NULL)',
  c.confdeltype = 'n' AND NOT a.attnotnull, c.confdeltype::text || '/' || a.attnotnull::text
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attname = 'user_id'
WHERE c.conname = 'ai_usage_events_user_id_fkey' AND c.conrelid = 'public.ai_usage_events'::regclass;

-- Espejo de PLANS[id].aiCreditsMonthly (lib/plans/catalog.ts), un plan por fila.
INSERT INTO _results SELECT 'allowance free is 25', ai_monthly_allowance('free') = 25, ai_monthly_allowance('free')::text;
INSERT INTO _results SELECT 'allowance starter is 150', ai_monthly_allowance('starter') = 150, ai_monthly_allowance('starter')::text;
INSERT INTO _results SELECT 'allowance pro is 400', ai_monthly_allowance('pro') = 400, ai_monthly_allowance('pro')::text;
INSERT INTO _results SELECT 'allowance enterprise is 1200', ai_monthly_allowance('enterprise') = 1200, ai_monthly_allowance('enterprise')::text;

-- Espejo de aiPeriod() (lib/ai/period.ts): Monterrey es UTC-6, el mes cambia a las 06:00Z.
INSERT INTO _results SELECT 'period start before the 06:00Z boundary is the previous month',
  (ai_period_start('2027-01-01 05:59:59+00') AT TIME ZONE 'America/Monterrey')::DATE = DATE '2026-12-01',
  (ai_period_start('2027-01-01 05:59:59+00') AT TIME ZONE 'America/Monterrey')::DATE::text;
INSERT INTO _results SELECT 'period start at the 06:00Z boundary is the new month',
  (ai_period_start('2027-01-01 06:00:00+00') AT TIME ZONE 'America/Monterrey')::DATE = DATE '2027-01-01',
  (ai_period_start('2027-01-01 06:00:00+00') AT TIME ZONE 'America/Monterrey')::DATE::text;
-- Sin horario de verano desde 2022: el cambio de abril también es a las 06:00Z (con DST sería a las 05:00Z).
INSERT INTO _results SELECT 'no DST: the April boundary is still 06:00Z',
  (ai_period_start('2026-04-01 05:30:00+00') AT TIME ZONE 'America/Monterrey')::DATE = DATE '2026-03-01'
  AND (ai_period_start('2026-04-01 06:00:00+00') AT TIME ZONE 'America/Monterrey')::DATE = DATE '2026-04-01',
  (ai_period_start('2026-04-01 05:30:00+00') AT TIME ZONE 'America/Monterrey')::DATE::text;
INSERT INTO _results SELECT 'the day starts at 06:00Z in Monterrey',
  ai_day_start('2027-01-01 05:59:59+00') = '2026-12-31 06:00:00+00'::TIMESTAMPTZ
  AND ai_day_start('2027-01-01 06:00:00+00') = '2027-01-01 06:00:00+00'::TIMESTAMPTZ,
  ai_day_start('2027-01-01 05:59:59+00')::text;
INSERT INTO _results SELECT 'period end before the 06:00Z boundary resets on the 1st of the new month',
  (ai_period_end('2027-01-01 05:59:59+00') AT TIME ZONE 'America/Monterrey')::DATE = DATE '2027-01-01',
  (ai_period_end('2027-01-01 05:59:59+00') AT TIME ZONE 'America/Monterrey')::DATE::text;
INSERT INTO _results SELECT 'period end at the 06:00Z boundary resets on the 1st of the following month',
  (ai_period_end('2027-01-01 06:00:00+00') AT TIME ZONE 'America/Monterrey')::DATE = DATE '2027-02-01',
  (ai_period_end('2027-01-01 06:00:00+00') AT TIME ZONE 'America/Monterrey')::DATE::text;

-- ---------------- anon ----------------
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN PERFORM ai_reserve('rewrite', 1); EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; END;
  INSERT INTO _results VALUES ('anon cannot reserve credits', v_err = '42501', v_err);
  v_err := '';
  BEGIN PERFORM ai_limits_enforced(); EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; END;
  INSERT INTO _results VALUES ('anon cannot execute ai_limits_enforced', v_err = '42501', v_err);
END $$;
RESET ROLE;

-- ---------------- owner de MEGAGLASS ----------------
SELECT set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', owner)::text, true) FROM _fx;
SET LOCAL ROLE authenticated;

DO $$
DECLARE r RECORD; v_err TEXT := '';
BEGIN
  SELECT * INTO r FROM ai_reserve('describe_item', 2);
  INSERT INTO _results SELECT 'reserve within quota returns an open event', r.event_id IS NOT NULL AND r.nonce IS NOT NULL, NULL;
  BEGIN PERFORM ai_finish(r.event_id, gen_random_uuid(), true, 10, 5, 100); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('finish with a wrong nonce is rejected', v_err = 'ai_event_not_open', v_err);
  PERFORM ai_finish(r.event_id, r.nonce, true, 10, 5, 100);
  v_err := '';
  BEGIN PERFORM ai_finish(r.event_id, r.nonce, false); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('a second finish of the same event is rejected', v_err = 'ai_event_not_open', v_err);
  INSERT INTO _results SELECT 'ok keeps the credits', (ai_usage_summary()->>'used')::INT = 2, ai_usage_summary()->>'used';
  INSERT INTO _results SELECT 'breakdown counts successful uses',
    ai_usage_summary()->'by_feature' @> '[{"feature":"describe_item","credits":2,"uses":1}]'::jsonb, (ai_usage_summary()->'by_feature')::text;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  SELECT * INTO r FROM ai_reserve('rewrite', 1);
  INSERT INTO _results SELECT 'an open reservation counts as used', (ai_usage_summary()->>'used')::INT = 3, ai_usage_summary()->>'used';
  PERFORM ai_finish(r.event_id, r.nonce, false, NULL, NULL, 900);
  INSERT INTO _results SELECT 'failed refunds the credits', (ai_usage_summary()->>'used')::INT = 2, ai_usage_summary()->>'used';
END $$;

DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN PERFORM ai_reserve('whatsapp_draft', 1); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('credits must match the feature', v_err = 'ai_invalid_feature', v_err);
END $$;

DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN
    INSERT INTO ai_usage_events (organization_id, user_id, feature, credits, status) SELECT org, owner, 'rewrite', 0, 'ok' FROM _fx;
  EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; END;
  INSERT INTO _results VALUES ('members cannot insert usage directly', v_err = '42501', v_err);
END $$;

DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN PERFORM finish_nonce FROM ai_usage_events LIMIT 1; EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; END;
  INSERT INTO _results VALUES ('members cannot read finish nonces', v_err = '42501', v_err);
END $$;

INSERT INTO _results SELECT 'members read their org usage rows', count(*) = 2, count(*)::text FROM ai_usage_events;

INSERT INTO _open SELECT * FROM ai_reserve('rewrite', 1);
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', seller)::text, true) FROM _fx;
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN PERFORM ai_finish(event_id, nonce, true) FROM _open; EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('another user cannot close my reservation', v_err = 'ai_event_not_open', v_err);
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', owner)::text, true) FROM _fx;
SET LOCAL ROLE authenticated;
SELECT ai_finish(event_id, nonce, false) FROM _open;

-- ---------------- cupo mensual y paquetes ----------------
RESET ROLE;
INSERT INTO ai_usage_events (organization_id, user_id, feature, credits, status) SELECT org, seller, 'rewrite', 396, 'ok' FROM _fx;
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN PERFORM ai_reserve('whatsapp_draft', 3); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('reserving beyond the monthly quota fails', v_err = 'ai_quota_exceeded', v_err);
END $$;

RESET ROLE;
INSERT INTO ai_credit_grants (organization_id, credits, source, expires_at) SELECT org, 200, 'pack', ai_period_end() FROM _fx;
INSERT INTO ai_credit_grants (organization_id, credits, source, expires_at) SELECT org, 1000, 'pack', now() - interval '1 day' FROM _fx;
SET LOCAL ROLE authenticated;
INSERT INTO _results SELECT 'only active packs add credits', (ai_usage_summary()->>'pack_credits')::INT = 200, ai_usage_summary()->>'pack_credits';
DO $$
DECLARE r RECORD;
BEGIN
  SELECT * INTO r FROM ai_reserve('whatsapp_draft', 3);
  INSERT INTO _results SELECT 'an active pack unlocks more usage', r.event_id IS NOT NULL, NULL;
  PERFORM ai_finish(r.event_id, r.nonce, false);
END $$;

-- ---------------- tope diario ----------------
RESET ROLE;
INSERT INTO ai_usage_events (organization_id, user_id, feature, credits, status) SELECT org, owner, 'rewrite', 37, 'ok' FROM _fx;
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_err TEXT := ''; r RECORD;
BEGIN
  BEGIN PERFORM ai_reserve('describe_item', 2); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('the 40-credit daily cap per user applies', v_err = 'ai_daily_cap', v_err);
  SELECT * INTO r FROM ai_reserve('rewrite', 1);
  INSERT INTO _results SELECT 'reaching exactly 40 in a day is allowed', r.event_id IS NOT NULL, NULL;
  PERFORM ai_finish(r.event_id, r.nonce, false);
END $$;

-- ---------------- reservas colgadas ----------------
RESET ROLE;
INSERT INTO ai_usage_events (id, organization_id, user_id, feature, credits, status, created_at)
SELECT '00000000-0000-4000-8000-0000000000a1', org, seller, 'whatsapp_draft', 3, 'reserved', now() - interval '10 minutes' FROM _fx;
SET LOCAL ROLE authenticated;
DO $$
DECLARE r RECORD;
BEGIN
  SELECT * INTO r FROM ai_reserve('rewrite', 1);
  PERFORM ai_finish(r.event_id, r.nonce, false);
END $$;
RESET ROLE;
INSERT INTO _results SELECT 'a reservation older than 5 minutes expires as failed', status = 'failed' AND credits = 0, status || '/' || credits
FROM ai_usage_events WHERE id = '00000000-0000-4000-8000-0000000000a1';

-- ---------------- avisos 80/100 % ----------------
INSERT INTO ai_usage_events (organization_id, user_id, feature, credits, status) SELECT org, seller, 'rewrite', 45, 'ok' FROM _fx;
SET LOCAL ROLE authenticated;
INSERT INTO _results SELECT 'usage reaches 80 percent', (ai_usage_summary()->>'percent')::INT = 80, ai_usage_summary()->>'percent';
INSERT INTO _results SELECT 'first 80 percent claim returns the owner email', ai_claim_usage_alert(80) = 'direccion@megaglass.demo.cotizapro.mx', NULL;
INSERT INTO _results SELECT 'second 80 percent claim in the month returns null', ai_claim_usage_alert(80) IS NULL, NULL;
INSERT INTO _results SELECT 'the 100 percent alert waits for 100 percent', ai_claim_usage_alert(100) IS NULL, NULL;
DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN PERFORM ai_claim_usage_alert(NULL); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('a NULL alert threshold is rejected', v_err = 'ai_invalid_threshold', v_err);
END $$;

-- ---------------- coincidencia con el catálogo ----------------
INSERT INTO _results SELECT 'trigram match finds the shower enclosure',
  bool_or(term_index = 0 AND service_name = 'Cancel de baño templado'), string_agg(term_index || ':' || service_name, ',')
FROM ai_match_services(ARRAY['cancel de bano templado 9 mm', 'mosquitero de fibra']);
INSERT INTO _results SELECT 'unrelated concepts get no candidates', count(*) = 0, count(*)::text
FROM ai_match_services(ARRAY['cancel de bano templado', 'mosquitero de fibra']) WHERE term_index = 1;

-- ---------------- límites apagados por GUC ----------------
RESET ROLE;
INSERT INTO ai_usage_events (organization_id, user_id, feature, credits, status) SELECT org, seller, 'rewrite', 200, 'ok' FROM _fx;
SET LOCAL ROLE authenticated;
SET LOCAL ai.limits_enforced = 'off';
DO $$
DECLARE r RECORD;
BEGIN
  SELECT * INTO r FROM ai_reserve('whatsapp_draft', 3);
  INSERT INTO _results SELECT 'limits off lets usage go beyond the quota', r.event_id IS NOT NULL, NULL;
  PERFORM ai_finish(r.event_id, r.nonce, false);
END $$;
SET LOCAL ai.limits_enforced = 'on';
DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN PERFORM ai_reserve('whatsapp_draft', 3); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('limits on block usage beyond the quota', v_err = 'ai_quota_exceeded', v_err);
END $$;
INSERT INTO _results SELECT 'usage reaches 100 percent', (ai_usage_summary()->>'percent')::INT = 100, ai_usage_summary()->>'percent';
INSERT INTO _results SELECT 'first 100 percent claim returns the owner email', ai_claim_usage_alert(100) = 'direccion@megaglass.demo.cotizapro.mx', NULL;

-- ---------------- superadmin (D2) ----------------
DO $$
DECLARE v_err TEXT := '';
BEGIN
  IF to_regprocedure('public.is_platform_admin()') IS NULL THEN
    INSERT INTO _results VALUES ('admin_grant_ai_credits needs D2 (skipped)', true, 'is_platform_admin() not found');
    RETURN;
  END IF;
  BEGIN PERFORM admin_grant_ai_credits((SELECT org FROM _fx), 200, 'pack', 'MP-123'); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('non platform admins cannot grant credits', v_err = 'forbidden', v_err);
END $$;

RESET ROLE;
DO $$
BEGIN
  IF to_regclass('public.platform_admins') IS NOT NULL THEN
    EXECUTE 'INSERT INTO public.platform_admins (user_id) SELECT owner FROM _fx';
  END IF;
END $$;
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_err TEXT := '';
BEGIN
  IF to_regprocedure('public.is_platform_admin()') IS NULL THEN RETURN; END IF;
  INSERT INTO _grant SELECT admin_grant_ai_credits((SELECT org FROM _fx), 1000, 'pack', '  MP-456  ');
  INSERT INTO _results SELECT 'admin usage reads the org summary with the new pack',
    (admin_ai_usage((SELECT org FROM _fx))->>'pack_credits')::INT = 1200, admin_ai_usage((SELECT org FROM _fx))->>'pack_credits';
  BEGIN PERFORM admin_grant_ai_credits((SELECT org FROM _fx), 200, 'pack', repeat('x', 201)); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('an over-long grant reference is rejected', v_err = 'ai_invalid_reference', v_err);
  v_err := '';
  BEGIN PERFORM admin_grant_ai_credits((SELECT org FROM _fx), 500, 'pack', 'MP-456'); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('a duplicate pack reference in the same org is rejected', v_err = 'ai_duplicate_reference', v_err);
  v_err := '';
  BEGIN PERFORM admin_grant_ai_credits((SELECT org FROM _fx), 500, 'pack', ' MP-456 '); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('the duplicate check ignores surrounding spaces', v_err = 'ai_duplicate_reference', v_err);
  PERFORM admin_grant_ai_credits((SELECT org FROM _fx), 50, 'courtesy', NULL);
  PERFORM admin_grant_ai_credits((SELECT org FROM _fx), 50, 'courtesy', NULL);
  INSERT INTO _results SELECT 'courtesies without reference can repeat',
    (SELECT count(*) FROM jsonb_array_elements(admin_ai_usage((SELECT org FROM _fx))->'packs') p WHERE p->>'source' = 'courtesy') = 2, NULL;
  PERFORM admin_grant_ai_credits((SELECT other_org FROM _fx), 1000, 'pack', 'MP-456');
  INSERT INTO _results VALUES ('the same pack reference in another org is accepted', true, NULL);
  v_err := '';
  BEGIN PERFORM admin_ai_usage('00000000-0000-0000-0000-00000000dead'); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('admin usage of an unknown org is organization_not_found', v_err = 'organization_not_found', v_err);
END $$;
RESET ROLE;
INSERT INTO _results SELECT 'a platform admin grants a pack that expires at period end',
  coalesce(bool_and(g.credits = 1000 AND g.source = 'pack' AND g.reference = 'MP-456' AND g.granted_by = f.owner
                    AND g.expires_at = ai_period_end()), false) AND count(*) = 1,
  string_agg(g.reference || '/' || g.expires_at::text, ',')
FROM _grant x JOIN ai_credit_grants g ON g.id = x.id CROSS JOIN _fx f;

-- ---------------- otra empresa ----------------
RESET ROLE;
DELETE FROM _open;
WITH ins AS (
  INSERT INTO ai_usage_events (organization_id, user_id, feature, credits)
  SELECT org, owner, 'rewrite', 1 FROM _fx
  RETURNING id, finish_nonce
)
INSERT INTO _open SELECT id, finish_nonce FROM ins;
SELECT set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', other_owner)::text, true) FROM _fx;
SET LOCAL ROLE authenticated;
INSERT INTO _results SELECT 'another org cannot see this org usage', count(*) = 0, count(*)::text
FROM ai_usage_events WHERE organization_id = '00000000-0000-0000-00c0-000000000001';
INSERT INTO _results SELECT 'another org summary starts empty', (ai_usage_summary()->>'used')::INT = 0, ai_usage_summary()->>'used';
DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN PERFORM ai_finish(event_id, nonce, false) FROM _open; EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('another org cannot close a reservation even with its nonce', v_err = 'ai_event_not_open', v_err);
END $$;

RESET ROLE;
SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, name, detail FROM _results ORDER BY ok, name;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) FILTER (WHERE NOT ok) AS failed FROM _results;
ROLLBACK;
