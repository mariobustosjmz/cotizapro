-- Pruebas de seguridad de la migración 041 (cotización pública). Requiere el seed demo:
--   psql "postgresql://postgres:postgres@127.0.0.1:54332/postgres" -v ON_ERROR_STOP=1 -f apps/web/supabase/tests/public_quote_security.sql
-- Todo corre dentro de una transacción que se revierte. Termina con error si alguna prueba falla.
BEGIN;

CREATE TEMP TABLE _results (name TEXT, ok BOOLEAN, detail TEXT);
CREATE TEMP TABLE _tok (label TEXT PRIMARY KEY, token TEXT);
GRANT ALL ON _results, _tok TO anon, authenticated;

CREATE TEMP TABLE _fx AS
SELECT
  (SELECT id FROM auth.users WHERE email = 'direccion@megaglass.demo.cotizapro.mx') AS owner_id,
  (SELECT id FROM quotes WHERE organization_id = '00000000-0000-0000-00c0-000000000001' AND status = 'sent' ORDER BY created_at, id LIMIT 1) AS q_sent,
  (SELECT id FROM quotes WHERE organization_id = '00000000-0000-0000-00c0-000000000001' AND status = 'sent' ORDER BY created_at, id OFFSET 1 LIMIT 1) AS q_reject,
  (SELECT id FROM quotes WHERE organization_id = '00000000-0000-0000-00c0-000000000001' AND status = 'sent' ORDER BY created_at, id OFFSET 2 LIMIT 1) AS q_expired,
  (SELECT id FROM quotes WHERE organization_id = '00000000-0000-0000-00c0-000000000001' AND status = 'draft' ORDER BY created_at, id LIMIT 1) AS q_draft,
  (SELECT id FROM quotes WHERE organization_id = '00000000-0000-0000-00c0-000000000001' AND status = 'cobrado' ORDER BY created_at, id LIMIT 1) AS q_paid,
  (SELECT id FROM quotes WHERE organization_id = '00000000-0000-0000-00c0-000000000003' ORDER BY created_at, id LIMIT 1) AS q_other_org;
ALTER TABLE _fx ADD COLUMN client_email TEXT;
UPDATE _fx SET client_email = (SELECT c.email FROM clients c JOIN quotes q ON q.client_id = c.id WHERE q.id = _fx.q_sent);
GRANT SELECT ON _fx TO anon, authenticated;

-- Fixtures como postgres: vigencias futuras salvo la vencida; sin anticipo configurado.
UPDATE quotes SET valid_until = current_date + 15
WHERE id IN (SELECT q_sent FROM _fx UNION ALL SELECT q_reject FROM _fx UNION ALL SELECT q_draft FROM _fx UNION ALL SELECT q_paid FROM _fx);
UPDATE quotes SET valid_until = current_date - 3 WHERE id = (SELECT q_expired FROM _fx);
UPDATE quotes SET deposit_percent = NULL WHERE organization_id = '00000000-0000-0000-00c0-000000000001';
UPDATE organizations SET settings = COALESCE(settings, '{}'::jsonb) - 'deposit_percent' - 'deposit_instructions' - 'deposit_payment_url'
WHERE id = '00000000-0000-0000-00c0-000000000001';

-- ---------------- A. propietario de MEGAGLASS ----------------
SELECT set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true) FROM _fx;
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_first TEXT; v_second TEXT; v_err TEXT := '';
BEGIN
  v_first := create_quote_share((SELECT q_sent FROM _fx));
  v_second := create_quote_share((SELECT q_sent FROM _fx));
  INSERT INTO _tok VALUES ('revoked', v_first), ('sent', v_second);
  INSERT INTO _tok VALUES ('reject', create_quote_share((SELECT q_reject FROM _fx)));
  INSERT INTO _tok VALUES ('expired', create_quote_share((SELECT q_expired FROM _fx)));
  INSERT INTO _tok VALUES ('draft', create_quote_share((SELECT q_draft FROM _fx)));
  INSERT INTO _tok VALUES ('paid', create_quote_share((SELECT q_paid FROM _fx)));
  INSERT INTO _results VALUES ('token is 64 hex chars', v_second ~ '^[a-f0-9]{64}$', length(v_second)::text);
  INSERT INTO _results VALUES ('a new link revokes the previous one',
    (SELECT count(*) FROM quote_shares WHERE quote_id = (SELECT q_sent FROM _fx) AND revoked_at IS NULL) = 1, NULL);
  BEGIN PERFORM create_quote_share((SELECT q_other_org FROM _fx)); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('cannot share another org quote', v_err = 'quote_not_found', v_err);
END $$;

INSERT INTO _results SELECT 'owner sees preview flag', (get_public_quote(token)->>'is_owner_preview')::boolean, NULL FROM _tok WHERE label = 'sent';
INSERT INTO _results SELECT 'owner view does not mark viewed', NOT mark_public_quote_viewed(token), NULL FROM _tok WHERE label = 'sent';

DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN PERFORM respond_public_quote((SELECT token FROM _tok WHERE label = 'sent'), 'accept', NULL, NULL, repeat('a',64));
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('business cannot answer its own link', v_err = 'owner_preview', v_err);
  v_err := '';
  BEGIN UPDATE quote_shares SET token_hash = repeat('0', 64) WHERE quote_id = (SELECT q_draft FROM _fx);
  EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; END;
  INSERT INTO _results VALUES ('members cannot rewrite token_hash', v_err = '42501', v_err);
END $$;

-- ---------------- B. anónimo (el cliente) ----------------
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;

DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN PERFORM count(*) FROM quote_shares; EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; END;
  INSERT INTO _results VALUES ('anon cannot read quote_shares', v_err = '42501', v_err);
  v_err := '';
  BEGIN PERFORM count(*) FROM quote_share_events; EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; END;
  INSERT INTO _results VALUES ('anon cannot read quote_share_events', v_err = '42501', v_err);
  v_err := '';
  BEGIN PERFORM create_quote_share((SELECT q_sent FROM _fx)); EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; END;
  INSERT INTO _results VALUES ('anon cannot create links', v_err = '42501', v_err);
END $$;

INSERT INTO _results SELECT 'revoked link returns null', get_public_quote(token) IS NULL, NULL FROM _tok WHERE label = 'revoked';
INSERT INTO _results SELECT 'malformed token returns null', get_public_quote('abc') IS NULL AND get_public_quote(NULL) IS NULL, NULL;
INSERT INTO _results SELECT 'unknown token returns null', get_public_quote(repeat('a', 64)) IS NULL, NULL;

INSERT INTO _results
SELECT 'public quote has business, items and the 50 % default deposit',
  q->'business'->>'name' = 'MEGAGLASS Demo' AND jsonb_array_length(q->'items') > 0
    AND (q->'deposit'->>'percent')::int = 50 AND NOT (q->>'is_owner_preview')::boolean,
  left(q::text, 160)
FROM (SELECT get_public_quote(token) AS q FROM _tok WHERE label = 'sent') s;

INSERT INTO _results
SELECT 'public quote exposes no client contact, notes or costs',
  position(COALESCE(f.client_email, '@@sin-correo@@') IN q::text) = 0
    AND NOT q ? 'notes' AND position('breakdown' IN q::text) = 0 AND position('pricing_snapshot' IN q::text) = 0,
  NULL
FROM (SELECT get_public_quote(token) AS q FROM _tok WHERE label = 'sent') s, _fx f;

INSERT INTO _results SELECT 'reading the link does not change status', get_public_quote(token)->>'status' = 'sent', NULL FROM _tok WHERE label = 'sent';

DO $$
BEGIN
  PERFORM mark_public_quote_viewed((SELECT token FROM _tok WHERE label = 'sent'));
END $$;
INSERT INTO _results SELECT 'client view marks viewed', get_public_quote(token)->>'status' = 'viewed', NULL FROM _tok WHERE label = 'sent';

DO $$
DECLARE v_tok TEXT := (SELECT token FROM _tok WHERE label = 'sent'); v_first JSONB; v_second JSONB; v_quote JSONB;
BEGIN
  v_first := respond_public_quote(v_tok, 'accept', NULL, '  Laura Pérez  ', repeat('b',64));
  v_second := respond_public_quote(v_tok, 'accept', NULL, 'Otra Persona', repeat('b',64));
  v_quote := get_public_quote(v_tok);
  INSERT INTO _results VALUES ('accept changes status once', v_first->>'status' = 'accepted' AND (v_first->>'changed')::boolean, v_first::text);
  INSERT INTO _results VALUES ('second accept is idempotent', v_second->>'status' = 'accepted' AND NOT (v_second->>'changed')::boolean, v_second::text);
  INSERT INTO _results VALUES ('accept stores trimmed name and accepted_at',
    v_quote->>'accepted_by_name' = 'Laura Pérez' AND v_quote->>'accepted_at' IS NOT NULL, v_quote->>'accepted_by_name');
END $$;

DO $$
DECLARE v JSONB;
BEGIN
  v := respond_public_quote((SELECT token FROM _tok WHERE label = 'draft'), 'accept', NULL, NULL, repeat('c',64));
  INSERT INTO _results VALUES ('cannot accept a draft', v->>'status' = 'draft' AND NOT (v->>'changed')::boolean, v::text);
  v := respond_public_quote((SELECT token FROM _tok WHERE label = 'paid'), 'accept', NULL, NULL, repeat('c',64));
  INSERT INTO _results VALUES ('cannot accept a paid quote', v->>'status' = 'cobrado' AND NOT (v->>'changed')::boolean, v::text);
END $$;

DO $$
DECLARE v JSONB; v_err TEXT := '';
BEGIN
  v := get_public_quote((SELECT token FROM _tok WHERE label = 'expired'));
  INSERT INTO _results VALUES ('resent expired quote link still opens and says expired', v IS NOT NULL AND (v->>'is_expired')::boolean, NULL);
  BEGIN PERFORM respond_public_quote((SELECT token FROM _tok WHERE label = 'expired'), 'accept', NULL, NULL, repeat('c',64));
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('cannot accept an expired quote', v_err = 'quote_expired', v_err);
END $$;

DO $$
DECLARE v JSONB; v_tok TEXT := (SELECT token FROM _tok WHERE label = 'reject');
BEGIN
  v := respond_public_quote(v_tok, 'reject', '  Muy caro  ', NULL, repeat('d',64));
  INSERT INTO _results VALUES ('reject stores status', v->>'status' = 'rejected' AND (v->>'changed')::boolean, v::text);
  INSERT INTO _results VALUES ('reject writes rejected_at', get_public_quote(v_tok)->>'rejected_at' IS NOT NULL, NULL);
END $$;

DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN PERFORM respond_public_quote((SELECT token FROM _tok WHERE label = 'paid'), 'delete', NULL, NULL, repeat('e',64));
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('unknown action rejected', v_err = 'invalid_action', v_err);
END $$;

DO $$
DECLARE i INT; v_err TEXT := '';
BEGIN
  FOR i IN 1..21 LOOP
    BEGIN PERFORM respond_public_quote((SELECT token FROM _tok WHERE label = 'paid'), 'accept', NULL, NULL, repeat('f',64));
    EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  END LOOP;
  INSERT INTO _results VALUES ('21st response in an hour from one IP is rate limited', v_err = 'rate_limited', v_err);
END $$;

DO $$
DECLARE v_err TEXT := ''; v_tok TEXT := (SELECT token FROM _tok WHERE label = 'reject'); i INT;
BEGIN
  BEGIN PERFORM respond_public_quote(v_tok, 'accept', NULL, NULL, NULL);
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('NULL ip_hash rejected', v_err = 'invalid_request', v_err);
  v_err := '';
  BEGIN PERFORM respond_public_quote(v_tok, 'accept', NULL, NULL, 'xyz');
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('malformed ip_hash rejected', v_err = 'invalid_request', v_err);

  FOR i IN 1..19 LOOP
    PERFORM respond_public_quote(v_tok, 'accept', NULL, NULL, encode(sha256(('cap-' || i)::bytea), 'hex'));
  END LOOP;
  v_err := '';
  BEGIN PERFORM respond_public_quote(v_tok, 'accept', NULL, NULL, encode(sha256('cap-new'::bytea), 'hex'));
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('per-link cap: 21st event with a new IP is rate limited', v_err = 'rate_limited', v_err);
END $$;

-- ---------------- C. propietario de nuevo ----------------
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true) FROM _fx;
SET LOCAL ROLE authenticated;

INSERT INTO _results SELECT 'business gets one client_accepted notice', count(*) = 1, count(*)::text
FROM quote_notifications WHERE quote_id = (SELECT q_sent FROM _fx) AND notification_type = 'client_accepted';
INSERT INTO _results SELECT 'rejection reason stored trimmed', rejection_reason = 'Muy caro', rejection_reason
FROM quotes WHERE id = (SELECT q_reject FROM _fx);
INSERT INTO _results SELECT 'viewed_at and accepted_at written', viewed_at IS NOT NULL AND accepted_at IS NOT NULL, NULL
FROM quotes WHERE id = (SELECT q_sent FROM _fx);

UPDATE quote_shares SET revoked_at = now() WHERE quote_id = (SELECT q_draft FROM _fx) AND revoked_at IS NULL;
INSERT INTO _results SELECT 'member can revoke a link', get_public_quote(token) IS NULL, NULL FROM _tok WHERE label = 'draft';

DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN UPDATE quote_shares SET revoked_at = NULL WHERE quote_id = (SELECT q_sent FROM _fx) AND revoked_at IS NOT NULL;
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('a revoked link cannot be reactivated', v_err LIKE '%row-level security%', v_err);
END $$;

DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN PERFORM update_org_settings(NULL, '{"deposit_percent": 150}'::jsonb); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('deposit percent above 100 rejected', v_err = 'invalid_deposit_percent', v_err);
  v_err := '';
  BEGIN PERFORM update_org_settings(NULL, '{"deposit_percent": 33.5}'::jsonb); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('decimal deposit percent rejected', v_err = 'invalid_deposit_percent', v_err);
  v_err := '';
  BEGIN PERFORM update_org_settings(NULL, '{"deposit_payment_url": "javascript:alert(1)"}'::jsonb); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('non-http payment url rejected', v_err = 'invalid_deposit_payment_url', v_err);
  v_err := '';
  BEGIN PERFORM update_org_settings(NULL, jsonb_build_object('deposit_instructions', repeat('x', 501))); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('instructions over 500 chars rejected', v_err = 'invalid_deposit_instructions', v_err);
  PERFORM update_org_settings(NULL, '{"deposit_percent": 30, "deposit_payment_url": "https://mpago.la/abc", "deposit_instructions": "CLABE 012"}'::jsonb);
END $$;

INSERT INTO _results
SELECT 'valid deposit settings reach the public quote',
  (q->'deposit'->>'percent')::int = 30 AND q->'deposit'->>'payment_url' = 'https://mpago.la/abc' AND q->'deposit'->>'instructions' = 'CLABE 012',
  (q->'deposit')::text
FROM (SELECT get_public_quote(token) AS q FROM _tok WHERE label = 'reject') s;

UPDATE quotes SET deposit_percent = 0 WHERE id = (SELECT q_reject FROM _fx);
INSERT INTO _results SELECT 'per-quote deposit percent wins', (get_public_quote(token)->'deposit'->>'percent')::int = 0, NULL
FROM _tok WHERE label = 'reject';

-- ---------------- D. como postgres ----------------
RESET ROLE;
INSERT INTO _results SELECT 'link expires 30 days after valid_until', expires_at::date = current_date + 45, expires_at::text
FROM quote_shares WHERE quote_id = (SELECT q_reject FROM _fx) AND revoked_at IS NULL;
INSERT INTO _results SELECT 'expired quote link lives at least 7 days', expires_at > now() + INTERVAL '6 days', expires_at::text
FROM quote_shares WHERE quote_id = (SELECT q_expired FROM _fx) AND revoked_at IS NULL;
UPDATE quote_shares SET expires_at = now() - INTERVAL '1 second' WHERE quote_id = (SELECT q_paid FROM _fx) AND revoked_at IS NULL;
INSERT INTO _results SELECT 'expired link returns null', get_public_quote(token) IS NULL, NULL FROM _tok WHERE label = 'paid';


-- ---------------- E. avisos de respuesta: marcar como leído ----------------
INSERT INTO quote_notifications (quote_id, notification_type, recipient, status)
SELECT q_reject, 'client_accepted', 'Cliente prueba', 'sent' FROM _fx
UNION ALL SELECT q_reject, 'email', 'cliente@prueba.mx', 'sent' FROM _fx;

SELECT set_config('request.jwt.claims', json_build_object('sub', '78fd3397-42ad-4685-8513-208e99ec33bb', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_rows INT;
BEGIN
  UPDATE quote_notifications SET status = 'read', read_at = now() WHERE quote_id = (SELECT q_reject FROM _fx);
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  INSERT INTO _results VALUES ('other org cannot mark a response read', v_rows = 0, v_rows::text);
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true) FROM _fx;
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_rows INT; v_err TEXT := '';
BEGIN
  UPDATE quote_notifications SET status = 'read', read_at = now()
  WHERE notification_type = 'email' AND quote_id = (SELECT q_reject FROM _fx);
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  INSERT INTO _results VALUES ('member cannot change an email send log', v_rows = 0, v_rows::text);

  BEGIN
    UPDATE quote_notifications SET status = 'failed'
    WHERE notification_type = 'client_accepted' AND quote_id = (SELECT q_reject FROM _fx);
    GET DIAGNOSTICS v_rows = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; v_rows := 0; END;
  INSERT INTO _results VALUES ('member cannot set a response to failed', v_rows = 0 AND v_err IN ('', '42501'), v_err || '/' || v_rows);

  UPDATE quote_notifications SET status = 'read', read_at = now()
  WHERE notification_type = 'client_accepted' AND quote_id = (SELECT q_reject FROM _fx);
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  INSERT INTO _results VALUES ('member marks a same-org response read', v_rows = 1, v_rows::text);
END $$;
RESET ROLE;

SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, name, detail FROM _results ORDER BY ok NULLS FIRST, name;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) FILTER (WHERE ok IS NOT TRUE) AS failed FROM _results;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM _results WHERE ok IS NOT TRUE) THEN RAISE EXCEPTION 'public quote security tests failed'; END IF;
END $$;
ROLLBACK;
