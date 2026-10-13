-- ================================================
-- Migration: 040_security_hardening.sql
-- Hallazgos reproducidos el 2026-10-13 contra la API REST local:
-- 1. Un propietario cambiaba organizations.plan / subscription_status / stripe_* desde el navegador.
-- 2. Políticas "Service role" con `true` para cualquier rol: anon insertaba en webhook_events
--    (y billing_history / usage_logs). service_role no necesita políticas: ignora RLS.
-- 3. create_organization_with_owner (SECURITY DEFINER) se podía llamar sin sesión y con cualquier owner_id.
-- 4. Funciones internas que reciben org_id o ids se podían ejecutar como anon.
-- ================================================

CREATE OR REPLACE FUNCTION public.guard_org_billing_columns()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND (
       NEW.id IS DISTINCT FROM OLD.id
    OR NEW.plan IS DISTINCT FROM OLD.plan
    OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
    OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
    OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
    OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
  ) THEN
    RAISE EXCEPTION 'billing columns cannot be changed directly' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_org_billing_columns ON public.organizations;
CREATE TRIGGER guard_org_billing_columns
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.guard_org_billing_columns();

DROP POLICY IF EXISTS "Service role can manage webhook events" ON public.webhook_events;
DROP POLICY IF EXISTS "Service role can insert billing history" ON public.billing_history;
DROP POLICY IF EXISTS "Service role can update billing history" ON public.billing_history;
DROP POLICY IF EXISTS "Service role can insert usage logs" ON public.usage_logs;

CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  org_name TEXT, org_slug TEXT, owner_id UUID, owner_email TEXT, owner_full_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  new_org_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF owner_id IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_uid) THEN RAISE EXCEPTION 'already_member' USING ERRCODE = '23505'; END IF;

  -- El correo sale de auth.users, no del cliente.
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  INSERT INTO organizations (name, slug) VALUES (org_name, org_slug) RETURNING id INTO new_org_id;
  INSERT INTO profiles (id, organization_id, role, email, full_name)
  VALUES (v_uid, new_org_id, 'owner', COALESCE(v_email, owner_email), owner_full_name);

  RETURN new_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization_with_owner(TEXT, TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization_with_owner(TEXT, TEXT, UUID, TEXT, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_next_reminder_occurrence(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_quote_number(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_crm_connection(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_due_reminders(UUID, INTEGER) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_pending_webhook_deliveries() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_template_usage(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_crm_sync(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, JSONB) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_next_reminder_occurrence(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_quote_number(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_crm_connection(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_due_reminders(UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_pending_webhook_deliveries() TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_template_usage(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_crm_sync(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, JSONB) TO authenticated, service_role;
