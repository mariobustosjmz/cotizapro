-- ================================================
-- Migration: 035_organization_member_count.sql
-- Cuenta los usuarios de la organización de quien llama. La política de profiles solo deja ver el
-- perfil propio, así que el cobro por usuario adicional necesita este conteo sin exponer perfiles ajenos.
-- ================================================

CREATE OR REPLACE FUNCTION public.organization_member_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.profiles p
  WHERE p.organization_id = (SELECT me.organization_id FROM public.profiles me WHERE me.id = auth.uid())
$$;

COMMENT ON FUNCTION public.organization_member_count IS 'Número de usuarios de la organización del usuario autenticado (cobro por usuario adicional)';

REVOKE ALL ON FUNCTION public.organization_member_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.organization_member_count() FROM anon;
GRANT EXECUTE ON FUNCTION public.organization_member_count() TO authenticated;
