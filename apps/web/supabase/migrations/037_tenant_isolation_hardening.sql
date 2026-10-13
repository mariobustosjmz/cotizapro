-- ================================================
-- Migration: 037_tenant_isolation_hardening.sql
-- Aislamiento entre empresas.
-- 1. user_organization_id() leía la organización de auth.jwt()->user_metadata, que el usuario puede
--    editar con auth.updateUser(); ahora solo la lee de profiles (SECURITY DEFINER, sin recursión de RLS).
-- 2. Borrar pagos confiaba en user_metadata.role; ahora usa user_has_role().
-- 3. profiles: un usuario podía cambiar su propio role u organization_id. Un trigger lo impide para
--    peticiones directas (authenticated/anon); las funciones SECURITY DEFINER y service_role siguen pudiendo.
-- ================================================

CREATE OR REPLACE FUNCTION public.user_organization_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

DROP POLICY IF EXISTS "org admins can delete payments" ON public.quote_payments;
CREATE POLICY "org admins can delete payments" ON public.quote_payments
  FOR DELETE TO authenticated
  USING (organization_id = public.user_organization_id() AND public.user_has_role(ARRAY['owner', 'admin']));

CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND (
    NEW.id IS DISTINCT FROM OLD.id
    OR NEW.role IS DISTINCT FROM OLD.role
    OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
  ) THEN
    RAISE EXCEPTION 'role and organization_id cannot be changed directly' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_privileged_columns ON public.profiles;
CREATE TRIGGER guard_profile_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_columns();
