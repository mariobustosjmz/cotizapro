-- Pruebas de la migración 042, parte A. Requiere el seed demo (cuentas *.demo.cotizapro.mx).
--   psql "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/billing_superadmin.sql
-- Todo corre en una transacción con ROLLBACK.
BEGIN;

CREATE TEMP TABLE _results (name TEXT, ok BOOLEAN, detail TEXT);
GRANT ALL ON _results TO anon, authenticated;

CREATE TEMP TABLE _fx AS
SELECT
  '00000000-0000-0000-00c0-000000000003'::uuid AS beto_org,
  '00000000-0000-0000-00c0-000000000002'::uuid AS voltaje_org,
  '00000000-0000-0000-00c0-000000000001'::uuid AS megaglass_org,
  (SELECT id FROM auth.users WHERE email = 'direccion@megaglass.demo.cotizapro.mx') AS admin_uid,
  (SELECT id FROM auth.users WHERE email = 'hector@voltaje.demo.cotizapro.mx') AS outsider_uid,
  (SELECT id FROM auth.users WHERE email = 'beto@plomeria.demo.cotizapro.mx') AS beto_uid,
  (SELECT id FROM organizations WHERE plan = 'free' ORDER BY created_at LIMIT 1) AS free_org;
GRANT SELECT ON _fx TO anon, authenticated;

INSERT INTO platform_admins (user_id) SELECT admin_uid FROM _fx;
-- Más de 100 cuentas para que el tope del listado sea observable.
INSERT INTO organizations (name, slug) SELECT 'Tope ' || g, 'tope-prueba-' || g FROM generate_series(1, 105) g;
UPDATE organizations SET plan = 'pro', subscription_status = 'active', current_period_end = NULL
WHERE id = (SELECT beto_org FROM _fx);

-- ---------------- postgres: reglas de solo lectura ----------------
INSERT INTO _results SELECT 'paid org without period stays writable', org_is_writable(megaglass_org), NULL FROM _fx;
UPDATE organizations SET current_period_end = now() - interval '30 days' WHERE id = (SELECT free_org FROM _fx);
INSERT INTO _results SELECT 'free org never expires', org_is_writable(free_org), NULL FROM _fx;

-- ---------------- anon ----------------
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;

DO $$
DECLARE v_state TEXT := '';
BEGIN
  BEGIN PERFORM is_platform_admin(); EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE; END;
  INSERT INTO _results VALUES ('anon cannot call is_platform_admin', v_state = '42501', v_state);
  v_state := '';
  BEGIN PERFORM * FROM admin_list_organizations(NULL, 10, 0); EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE; END;
  INSERT INTO _results VALUES ('anon cannot call admin_list_organizations', v_state = '42501', v_state);
END $$;

-- ---------------- authenticated: propietario de Plomería Don Beto ----------------
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', beto_uid)::text, true) FROM _fx;
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_state TEXT;
BEGIN
  v_state := '';
  BEGIN UPDATE organizations SET current_period_end = now() + interval '1 year' WHERE id = '00000000-0000-0000-00c0-000000000003';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE; END;
  INSERT INTO _results VALUES ('owner cannot extend current_period_end', v_state = '42501', v_state);

  v_state := '';
  BEGIN UPDATE organizations SET billing_reference = 'pagado' WHERE id = '00000000-0000-0000-00c0-000000000003';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE; END;
  INSERT INTO _results VALUES ('owner cannot set billing_reference', v_state = '42501', v_state);

  v_state := '';
  BEGIN UPDATE organizations SET billing_provider = 'mercadopago_manual' WHERE id = '00000000-0000-0000-00c0-000000000003';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE; END;
  INSERT INTO _results VALUES ('owner cannot set billing_provider', v_state = '42501', v_state);

  v_state := '';
  BEGIN UPDATE organizations SET plan = 'enterprise' WHERE id = '00000000-0000-0000-00c0-000000000003';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE; END;
  INSERT INTO _results VALUES ('owner cannot change plan', v_state = '42501', v_state);

  v_state := '';
  BEGIN PERFORM count(*) FROM platform_admins; EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE; END;
  INSERT INTO _results VALUES ('authenticated cannot read platform_admins', v_state = '42501', v_state);

  v_state := '';
  BEGIN PERFORM count(*) FROM plan_activations; EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE; END;
  INSERT INTO _results VALUES ('authenticated cannot read plan_activations', v_state = '42501', v_state);

  v_state := '';
  BEGIN PERFORM org_is_writable('00000000-0000-0000-00c0-000000000003'); EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE; END;
  INSERT INTO _results VALUES ('authenticated cannot call org_is_writable', v_state = '42501', v_state);
END $$;

INSERT INTO _results SELECT 'owner is not platform admin', NOT is_platform_admin(), NULL;
INSERT INTO _results SELECT 'open-ended paid org is writable', current_org_is_writable(), NULL;
INSERT INTO _results
SELECT 'org_plan_limits of own org (Taller)',
  (org_plan_limits(beto_org)->>'included_users')::int = 3
  AND (org_plan_limits(beto_org)->>'extra_users_allowed')::boolean
  AND org_plan_limits(beto_org)->'monthly_quotes' = 'null'::jsonb,
  org_plan_limits(beto_org)::text
FROM _fx;
INSERT INTO _results SELECT 'org_plan_limits hides other orgs', org_plan_limits(voltaje_org) IS NULL, NULL FROM _fx;

-- ---------------- authenticated: usuario que no es superadmin ----------------
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', outsider_uid)::text, true) FROM _fx;
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_err TEXT; v_fn TEXT;
BEGIN
  FOREACH v_fn IN ARRAY ARRAY['list', 'activate', 'suspend', 'history'] LOOP
    v_err := '';
    BEGIN
      CASE v_fn
        WHEN 'list' THEN PERFORM * FROM admin_list_organizations(NULL, 10, 0);
        WHEN 'activate' THEN PERFORM admin_activate_plan('00000000-0000-0000-00c0-000000000002', 'enterprise', 1, 12, 0, 'hack');
        WHEN 'suspend' THEN PERFORM admin_suspend_plan('00000000-0000-0000-00c0-000000000003', 'hack');
        ELSE PERFORM * FROM admin_list_plan_activations('00000000-0000-0000-00c0-000000000003', 10);
      END CASE;
    EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
    INSERT INTO _results VALUES ('non-admin gets forbidden on ' || v_fn, v_err = 'forbidden', v_err);
  END LOOP;
END $$;

-- ---------------- authenticated: superadmin ----------------
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', admin_uid)::text, true) FROM _fx;
SET LOCAL ROLE authenticated;

INSERT INTO _results SELECT 'admin is platform admin', is_platform_admin(), NULL;
INSERT INTO _results
SELECT 'admin search finds Don Beto with 1 user', count(*) = 1 AND bool_and(member_count = 1), count(*)::text
FROM admin_list_organizations('plomeria-don-beto', 10, 0);
INSERT INTO _results SELECT 'search escapes % wildcard', count(*) = 0, count(*)::text FROM admin_list_organizations('%', 10, 0);
INSERT INTO _results SELECT 'search escapes _ wildcard', count(*) = 0, count(*)::text FROM admin_list_organizations('plomeria_don', 10, 0);
INSERT INTO _results SELECT 'search escapes backslash', count(*) = 0, count(*)::text FROM admin_list_organizations(E'\\', 10, 0);
INSERT INTO _results SELECT 'list limit is clamped to 100', count(*) = 100, count(*)::text FROM admin_list_organizations(NULL, 5000, 0);

DO $$
DECLARE v_first JSONB; v_second JSONB; v_end1 TIMESTAMPTZ; v_end2 TIMESTAMPTZ;
BEGIN
  v_first := admin_activate_plan('00000000-0000-0000-00c0-000000000003', 'pro', 1, 1, 999, 'MP-TEST-1');
  v_end1 := (v_first->>'current_period_end')::timestamptz;
  INSERT INTO _results VALUES ('first activation counts from today', v_end1 = now() + interval '1 month', v_end1::text);

  v_second := admin_activate_plan('00000000-0000-0000-00c0-000000000003', 'pro', 1, 2, 1998, 'MP-TEST-2');
  v_end2 := (v_second->>'current_period_end')::timestamptz;
  INSERT INTO _results VALUES ('renewal extends from current end', v_end2 = v_end1 + interval '2 months', v_end2::text);
END $$;

INSERT INTO _results
SELECT 'activations audited with admin email and amount',
  count(*) = 2 AND bool_and(activated_by_email = 'direccion@megaglass.demo.cotizapro.mx') AND sum(amount) = 2997,
  count(*)::text
FROM admin_list_plan_activations('00000000-0000-0000-00c0-000000000003', 10)
WHERE reference LIKE 'MP-TEST-%';

DO $$
DECLARE v_err TEXT; v_case TEXT;
BEGIN
  FOREACH v_case IN ARRAY ARRAY['invalid_plan', 'invalid_users', 'invalid_months', 'invalid_amount', 'invalid_amount_nan', 'invalid_amount_huge', 'invalid_reference', 'invalid_reference_free', 'org_not_found', 'invalid_reason', 'free_plan_not_suspendable'] LOOP
    v_err := '';
    BEGIN
      CASE v_case
        WHEN 'invalid_plan' THEN PERFORM admin_activate_plan('00000000-0000-0000-00c0-000000000003', 'gold', 1, 1, 0, 'x');
        WHEN 'invalid_users' THEN PERFORM admin_activate_plan('00000000-0000-0000-00c0-000000000003', 'pro', 0, 1, 0, 'x');
        WHEN 'invalid_months' THEN PERFORM admin_activate_plan('00000000-0000-0000-00c0-000000000003', 'pro', 1, 13, 0, 'x');
        WHEN 'invalid_amount' THEN PERFORM admin_activate_plan('00000000-0000-0000-00c0-000000000003', 'pro', 1, 1, -1, 'x');
        WHEN 'invalid_amount_nan' THEN PERFORM admin_activate_plan('00000000-0000-0000-00c0-000000000003', 'pro', 1, 1, 'NaN'::numeric, 'x');
        WHEN 'invalid_amount_huge' THEN PERFORM admin_activate_plan('00000000-0000-0000-00c0-000000000003', 'pro', 1, 1, 1e12, 'x');
        WHEN 'invalid_reference_free' THEN PERFORM admin_activate_plan('00000000-0000-0000-00c0-000000000003', 'free', 1, 1, 0, repeat('x', 130));
        WHEN 'invalid_reference' THEN PERFORM admin_activate_plan('00000000-0000-0000-00c0-000000000003', 'pro', 1, 1, 0, '  ');
        WHEN 'org_not_found' THEN PERFORM admin_activate_plan(gen_random_uuid(), 'pro', 1, 1, 0, 'x');
        WHEN 'invalid_reason' THEN PERFORM admin_suspend_plan('00000000-0000-0000-00c0-000000000003', 'x');
        ELSE PERFORM admin_suspend_plan((SELECT free_org FROM _fx), 'Prueba de suspensión');
      END CASE;
    EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
    INSERT INTO _results VALUES ('rejects ' || v_case, v_err = regexp_replace(v_case, '_(nan|huge|free)$', ''), v_err);
  END LOOP;
END $$;

-- Cuenta vencida hace 10 días: la renovación cuenta desde hoy.
RESET ROLE;
UPDATE organizations SET current_period_end = now() - interval '10 days' WHERE id = (SELECT beto_org FROM _fx);
SELECT set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', admin_uid)::text, true) FROM _fx;
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_res JSONB;
BEGIN
  v_res := admin_activate_plan('00000000-0000-0000-00c0-000000000003', 'pro', 1, 1, 999, 'MP-TEST-3');
  INSERT INTO _results VALUES ('expired renewal counts from today',
    (v_res->>'current_period_end')::timestamptz = now() + interval '1 month', v_res::text);

  v_res := admin_suspend_plan('00000000-0000-0000-00c0-000000000003', 'Pago rechazado en prueba');
  INSERT INTO _results VALUES ('suspend ends the period now', (v_res->>'current_period_end')::timestamptz = now(), v_res::text);
END $$;

-- El propietario ya no puede escribir.
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', beto_uid)::text, true) FROM _fx;
SET LOCAL ROLE authenticated;
INSERT INTO _results SELECT 'suspended org is read-only', NOT current_org_is_writable(), NULL;

RESET ROLE;
INSERT INTO _results
SELECT 'suspend marks status canceled and audits it',
  o.subscription_status = 'canceled'
  AND EXISTS (SELECT 1 FROM plan_activations a WHERE a.organization_id = o.id AND a.action = 'suspend'),
  o.subscription_status
FROM organizations o WHERE o.id = (SELECT beto_org FROM _fx);

SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, name, detail FROM _results ORDER BY ok, name;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) FILTER (WHERE NOT ok) AS failed FROM _results;
ROLLBACK;
