-- Pruebas de la migración 042, parte B (avisos del cron). Requiere el seed demo.
--   psql "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/billing_notices.sql
BEGIN;

CREATE TEMP TABLE _results (name TEXT, ok BOOLEAN, detail TEXT);
GRANT ALL ON _results TO anon, authenticated;

INSERT INTO platform_settings (key, value)
VALUES ('cron_key_sha256', encode(extensions.digest('test-cron-key-0123456789abcdef0123456789', 'sha256'), 'hex'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

UPDATE organizations SET plan = 'pro', current_period_end = now() + interval '3 days'
WHERE id = '00000000-0000-0000-00c0-000000000003';
UPDATE organizations SET current_period_end = now() + interval '2 days'
WHERE id = (SELECT id FROM organizations WHERE plan = 'free' ORDER BY created_at LIMIT 1);

SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;

DO $$
DECLARE v_err TEXT; v_key TEXT;
BEGIN
  FOREACH v_key IN ARRAY ARRAY['otra-llave-0123456789abcdef0123456789', ''] LOOP
    v_err := '';
    BEGIN PERFORM * FROM billing_notices_due(NULLIF(v_key, '')); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
    INSERT INTO _results VALUES ('wrong or empty cron key is forbidden (' || length(v_key) || ')', v_err = 'forbidden', v_err);
  END LOOP;

  v_err := '';
  BEGIN PERFORM cron_key_valid('test-cron-key-0123456789abcdef0123456789'); EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; END;
  INSERT INTO _results VALUES ('anon cannot call cron_key_valid', v_err = '42501', v_err);

  v_err := '';
  BEGIN PERFORM count(*) FROM billing_notices; EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; END;
  INSERT INTO _results VALUES ('anon cannot read billing_notices', v_err = '42501', v_err);

  v_err := '';
  BEGIN PERFORM count(*) FROM platform_settings; EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; END;
  INSERT INTO _results VALUES ('anon cannot read platform_settings', v_err = '42501', v_err);
END $$;

INSERT INTO _results
SELECT 'due list has Don Beto with owner email and no sent kinds',
  count(*) = 1 AND bool_and(owner_email = 'beto@plomeria.demo.cotizapro.mx') AND bool_and(cardinality(sent_kinds) = 0),
  count(*)::text
FROM billing_notices_due('test-cron-key-0123456789abcdef0123456789')
WHERE organization_id = '00000000-0000-0000-00c0-000000000003';

INSERT INTO _results
SELECT 'free orgs are never due', count(*) = 0, count(*)::text
FROM billing_notices_due('test-cron-key-0123456789abcdef0123456789') WHERE plan = 'free';

DO $$
DECLARE
  v_key CONSTANT TEXT := 'test-cron-key-0123456789abcdef0123456789';
  v_org CONSTANT UUID := '00000000-0000-0000-00c0-000000000003';
  v_end TIMESTAMPTZ;
  v_first BOOLEAN; v_second BOOLEAN; v_third BOOLEAN; v_err TEXT := '';
BEGIN
  SELECT current_period_end INTO v_end FROM billing_notices_due(v_key) WHERE organization_id = v_org;
  v_first := claim_billing_notice(v_key, v_org, v_end, 'd3');
  v_second := claim_billing_notice(v_key, v_org, v_end, 'd3');
  PERFORM release_billing_notice(v_key, v_org, v_end, 'd3');
  v_third := claim_billing_notice(v_key, v_org, v_end, 'd3');
  INSERT INTO _results VALUES ('claim is once per kind and release allows retry', v_first AND NOT v_second AND v_third,
    format('%s/%s/%s', v_first, v_second, v_third));

  INSERT INTO _results
  SELECT 'sent kinds are reported back', count(*) = 1 AND bool_and('d3' = ANY(sent_kinds)), string_agg(sent_kinds::text, ',')
  FROM billing_notices_due(v_key) WHERE organization_id = v_org;

  BEGIN PERFORM claim_billing_notice(v_key, v_org, v_end, 'd5'); EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; END;
  INSERT INTO _results VALUES ('unknown notice kind is rejected', v_err = '23514', v_err);

  INSERT INTO _results VALUES ('claim with a stale period end is refused',
    NOT claim_billing_notice(v_key, v_org, v_end + interval '1 millisecond', 'd7'), NULL);
  INSERT INTO _results SELECT 'claim for a free org is refused',
    NOT claim_billing_notice(v_key, (SELECT id FROM organizations WHERE plan = 'free' ORDER BY created_at LIMIT 1), v_end, 'd7'), NULL;

  PERFORM claim_billing_notice(v_key, v_org, v_end, 'd7');
  PERFORM release_billing_notice(v_key, v_org, v_end, 'd7');
  INSERT INTO _results
  SELECT 'release only removes its own kind', count(*) = 1 AND bool_and(sent_kinds = ARRAY['d3']), string_agg(sent_kinds::text, ',')
  FROM billing_notices_due(v_key) WHERE organization_id = v_org;

  v_err := '';
  BEGIN PERFORM claim_billing_notice('otra-llave-0123456789abcdef0123456789', v_org, v_end, 'd1'); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('claim with wrong key is forbidden', v_err = 'forbidden', v_err);
  v_err := '';
  BEGIN PERFORM release_billing_notice('otra-llave-0123456789abcdef0123456789', v_org, v_end, 'd3'); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('release with wrong key is forbidden', v_err = 'forbidden', v_err);
END $$;

-- Límites de la ventana: de 3 días vencida a 7 días por vencer, ambos incluidos.
RESET ROLE;
CREATE TEMP TABLE _window (label TEXT, offset_interval INTERVAL, due BOOLEAN);
INSERT INTO _window VALUES
  ('7 days ahead is due', interval '7 days', true),
  ('7 days and 1 second ahead is not due', interval '7 days 1 second', false),
  ('3 days and 1 second past is not due', interval '-3 days -1 second', false);
GRANT SELECT ON _window TO anon;

DO $$
DECLARE v_row RECORD; v_count INTEGER;
BEGIN
  FOR v_row IN SELECT * FROM _window LOOP
    UPDATE organizations SET current_period_end = now() + v_row.offset_interval
    WHERE id = '00000000-0000-0000-00c0-000000000003';
    SELECT count(*) INTO v_count FROM billing_notices_due('test-cron-key-0123456789abcdef0123456789')
    WHERE organization_id = '00000000-0000-0000-00c0-000000000003';
    INSERT INTO _results VALUES ('window: ' || v_row.label, (v_count = 1) = v_row.due, v_count::text);
  END LOOP;

  UPDATE organizations SET current_period_end = NULL WHERE id = '00000000-0000-0000-00c0-000000000003';
  SELECT count(*) INTO v_count FROM billing_notices_due('test-cron-key-0123456789abcdef0123456789')
  WHERE organization_id = '00000000-0000-0000-00c0-000000000003';
  INSERT INTO _results VALUES ('window: paid org without period end is not due', v_count = 0, v_count::text);
END $$;

-- Sin la llave guardada, el cron no entra con ninguna llave.
DELETE FROM platform_settings WHERE key = 'cron_key_sha256';
SET LOCAL ROLE anon;
DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN PERFORM * FROM billing_notices_due('test-cron-key-0123456789abcdef0123456789'); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('missing stored key fails closed', v_err = 'forbidden', v_err);
END $$;

RESET ROLE;
SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, name, detail FROM _results ORDER BY ok, name;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) FILTER (WHERE NOT ok) AS failed FROM _results;
ROLLBACK;
