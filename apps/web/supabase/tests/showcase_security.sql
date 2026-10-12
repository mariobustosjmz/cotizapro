-- Security tests for migration 034. Run after the demo seed:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/showcase_security.sql
-- Everything runs inside a transaction that is rolled back.
BEGIN;

CREATE TEMP TABLE _results (name TEXT, ok BOOLEAN, detail TEXT);
GRANT ALL ON _results TO anon, authenticated;

-- Fixtures prepared as postgres
UPDATE public_profiles SET is_published = false WHERE organization_id = '00000000-0000-0000-00c0-000000000002';
CREATE TEMP TABLE _fx AS
SELECT
  (SELECT storage_path FROM job_photos WHERE organization_id = '00000000-0000-0000-00c0-000000000001' AND NOT is_public LIMIT 1) AS private_photo,
  (SELECT storage_path FROM job_photos WHERE organization_id = '00000000-0000-0000-00c0-000000000001' AND is_public LIMIT 1) AS public_photo,
  (SELECT id FROM quotes WHERE organization_id = '00000000-0000-0000-00c0-000000000003' AND status = 'cobrado' LIMIT 1) AS other_org_quote,
  (SELECT id FROM auth.users WHERE email = 'direccion@megaglass.demo.cotizapro.mx') AS megaglass_owner;
GRANT SELECT ON _fx TO anon, authenticated;

-- ---------------- anon ----------------
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

INSERT INTO _results SELECT 'anon cannot read reviews table', count(*) = 0, count(*)::text FROM reviews;
INSERT INTO _results SELECT 'anon cannot read quote_requests', count(*) = 0, count(*)::text FROM quote_requests;
INSERT INTO _results SELECT 'anon cannot read public_profiles table', count(*) = 0, count(*)::text FROM public_profiles;
INSERT INTO _results SELECT 'anon cannot read job_photos table', count(*) = 0, count(*)::text FROM job_photos;
INSERT INTO _results SELECT 'anon cannot read clients', count(*) = 0, count(*)::text FROM clients;

INSERT INTO _results
SELECT 'published profile is returned', p IS NOT NULL AND jsonb_array_length(p->'services') > 0 AND jsonb_array_length(p->'reviews') > 0, left(p::text, 80)
FROM (SELECT get_public_profile('megaglass-demo') AS p) s;

INSERT INTO _results
SELECT 'review client names are shortened', bool_and((r->>'client') ~ '^[^ ]+( [^ ]\.)?$'), string_agg(r->>'client', ',')
FROM jsonb_array_elements(get_public_profile('megaglass-demo')->'reviews') r;

INSERT INTO _results
SELECT 'profile exposes no client emails or phones', position('@correo.demo' IN get_public_profile('megaglass-demo')::text) = 0, NULL;

INSERT INTO _results SELECT 'unpublished profile returns null', get_public_profile('cuadrilla-voltaje') IS NULL, NULL;
INSERT INTO _results SELECT 'unknown slug returns null', get_public_profile('no-existe') IS NULL, NULL;
INSERT INTO _results SELECT 'private photo not public', NOT is_public_photo(private_photo), private_photo FROM _fx;
INSERT INTO _results SELECT 'public photo is public', is_public_photo(public_photo), public_photo FROM _fx;

DO $$
DECLARE i INT; v_err TEXT := '';
BEGIN
  FOR i IN 1..6 LOOP
    BEGIN
      PERFORM submit_quote_request('megaglass-demo', 'Prueba Seguridad', '8112345678', NULL, 'Mensaje de prueba de límite', '{}'::jsonb, 'iphash-test');
    EXCEPTION WHEN OTHERS THEN v_err := SQLERRM;
    END;
  END LOOP;
  INSERT INTO _results VALUES ('6th request in an hour is rate limited', v_err = 'rate_limited', v_err);
END $$;

DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN PERFORM submit_quote_request('cuadrilla-voltaje', 'Prueba', '8112345678', NULL, 'Mensaje de prueba', '{}'::jsonb, 'iphash-2');
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('request to unpublished profile rejected', v_err = 'profile_not_found', v_err);
END $$;

DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN PERFORM submit_review('token-falso', 5, 'x');
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('forged review token rejected', v_err = 'invalid_token', v_err);
END $$;

DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN PERFORM create_review_request('00000000-0000-0000-0000-000000000000');
  EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; END;
  INSERT INTO _results VALUES ('anon cannot create review requests', v_err = '42501', v_err);
END $$;

-- ---------------- authenticated (MEGAGLASS owner) ----------------
RESET ROLE;
SELECT set_config('request.jwt.claims',
  json_build_object('role', 'authenticated', 'sub', megaglass_owner,
    'user_metadata', json_build_object('organization_id', '00000000-0000-0000-00c0-000000000001'))::text, true)
FROM _fx;
SET LOCAL ROLE authenticated;

INSERT INTO _results SELECT 'member sees only own org requests', bool_and(organization_id = '00000000-0000-0000-00c0-000000000001'), count(*)::text FROM quote_requests;

DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN PERFORM create_review_request((SELECT other_org_quote FROM _fx));
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('cannot request review for another org quote', v_err = 'quote_not_found', v_err);
END $$;

DO $$
DECLARE v_token TEXT; v_ok BOOLEAN; v_err TEXT := '';
BEGIN
  SELECT create_review_request((SELECT id FROM quotes WHERE status = 'cobrado' AND id NOT IN (SELECT quote_id FROM reviews WHERE submitted_at IS NOT NULL) LIMIT 1)) INTO v_token;
  SELECT submit_review(v_token, 5, 'Excelente') INTO v_ok;
  BEGIN PERFORM submit_review(v_token, 1, 'reuso'); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('review token works once', v_ok AND v_err = 'invalid_token', v_err);
END $$;

DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN UPDATE reviews SET rating = 1 WHERE submitted_at IS NOT NULL; EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('business cannot alter review rating', v_err LIKE 'Solo se puede editar%', v_err);
END $$;

RESET ROLE;
SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, name, detail FROM _results ORDER BY ok, name;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) FILTER (WHERE NOT ok) AS failed FROM _results;
ROLLBACK;
