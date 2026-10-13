-- ================================================
-- Migration: 038_team_members_access.sql
-- La página de Equipo solo mostraba el perfil propio: la única política SELECT de profiles era
-- id = auth.uid(). Ahora los miembros ven los perfiles de su organización (user_organization_id() es
-- SECURITY DEFINER y lee profiles sin pasar por RLS, así que no hay recursión).
-- Cambiar rol y quitar miembro pasan a RPCs con las mismas reglas que tenía la API, porque el trigger de
-- 037 bloquea esos cambios por petición directa y no hay política UPDATE/DELETE sobre otros perfiles.
-- ================================================

DROP POLICY IF EXISTS "Members view profiles in their organization" ON public.profiles;
CREATE POLICY "Members view profiles in their organization" ON public.profiles
  FOR SELECT TO authenticated
  USING (organization_id = public.user_organization_id());

CREATE OR REPLACE FUNCTION public.set_member_role(p_member UUID, p_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller profiles%ROWTYPE;
  v_target profiles%ROWTYPE;
BEGIN
  IF p_role NOT IN ('admin', 'member', 'viewer') THEN RAISE EXCEPTION 'invalid_role'; END IF;
  SELECT * INTO v_caller FROM profiles WHERE id = auth.uid();
  IF NOT FOUND OR v_caller.role NOT IN ('owner', 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_member = v_caller.id THEN RAISE EXCEPTION 'self_change'; END IF;
  SELECT * INTO v_target FROM profiles WHERE id = p_member AND organization_id = v_caller.organization_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_target.role = 'owner' THEN RAISE EXCEPTION 'owner_protected'; END IF;
  IF p_role = 'admin' AND v_caller.role <> 'owner' THEN RAISE EXCEPTION 'owner_only'; END IF;

  UPDATE profiles SET role = p_role, updated_at = now() WHERE id = p_member;
  RETURN jsonb_build_object('id', v_target.id, 'email', v_target.email, 'full_name', v_target.full_name,
    'role', p_role, 'avatar_url', v_target.avatar_url, 'created_at', v_target.created_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_member(p_member UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller profiles%ROWTYPE;
  v_target profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_caller FROM profiles WHERE id = auth.uid();
  IF NOT FOUND OR v_caller.role NOT IN ('owner', 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_member = v_caller.id THEN RAISE EXCEPTION 'self_change'; END IF;
  SELECT * INTO v_target FROM profiles WHERE id = p_member AND organization_id = v_caller.organization_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_target.role = 'owner' THEN RAISE EXCEPTION 'owner_protected'; END IF;

  DELETE FROM profiles WHERE id = p_member;
END;
$$;

REVOKE ALL ON FUNCTION public.set_member_role(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_member_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_member(UUID) TO authenticated;
