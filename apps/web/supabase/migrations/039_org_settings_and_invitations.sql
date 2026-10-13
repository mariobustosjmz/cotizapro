-- ================================================
-- Migration: 039_org_settings_and_invitations.sql
-- 1. update_org_settings: owner y admin guardan Configuración. Antes la API reemplazaba todo el JSON de
--    settings (se perdían claves no enviadas) y la política UPDATE de organizations solo deja al owner.
--    Solo se fusionan claves permitidas; plan y facturación no se tocan desde aquí.
-- 2. get_invitation_preview: la página pública de invitación muestra empresa, rol y una pista del correo.
-- 3. accept_invitation: exige sesión, que el correo coincida con el invitado y que no tenga ya perfil.
-- ================================================

CREATE OR REPLACE FUNCTION public.update_org_settings(p_name TEXT, p_settings JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller profiles%ROWTYPE;
  v_allowed CONSTANT TEXT[] := ARRAY['company_address', 'company_phone', 'company_email', 'quote_terms',
    'quote_valid_days', 'tax_rate', 'logo_url', 'brand_color', 'checklist_dismissed_at'];
  v_patch JSONB;
  v_org organizations%ROWTYPE;
BEGIN
  SELECT * INTO v_caller FROM profiles WHERE id = auth.uid();
  IF NOT FOUND OR v_caller.role NOT IN ('owner', 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_name IS NOT NULL AND length(btrim(p_name)) NOT BETWEEN 1 AND 255 THEN RAISE EXCEPTION 'invalid_name'; END IF;

  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb) INTO v_patch
  FROM jsonb_each(COALESCE(p_settings, '{}'::jsonb)) WHERE key = ANY(v_allowed);

  UPDATE organizations
  SET name = COALESCE(btrim(p_name), name),
      settings = COALESCE(settings, '{}'::jsonb) || v_patch,
      updated_at = now()
  WHERE id = v_caller.organization_id
  RETURNING * INTO v_org;

  RETURN jsonb_build_object('id', v_org.id, 'name', v_org.name, 'slug', v_org.slug, 'settings', v_org.settings);
END;
$$;

REVOKE ALL ON FUNCTION public.update_org_settings(TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_org_settings(TEXT, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_invitation_preview(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv invitations%ROWTYPE;
  v_org_name TEXT;
  v_local TEXT;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN RETURN NULL; END IF;
  SELECT * INTO v_inv FROM invitations WHERE token = p_token;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT name INTO v_org_name FROM organizations WHERE id = v_inv.organization_id;
  v_local := split_part(v_inv.email, '@', 1);

  RETURN jsonb_build_object(
    'organization_name', v_org_name,
    'role', v_inv.role,
    'email_hint', left(v_local, 2) || repeat('*', greatest(length(v_local) - 2, 1)) || '@' || split_part(v_inv.email, '@', 2),
    'status', CASE WHEN v_inv.accepted_at IS NOT NULL THEN 'accepted'
                   WHEN v_inv.expires_at <= now() THEN 'expired'
                   ELSE 'pending' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_invitation_preview(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation_preview(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv invitations%ROWTYPE;
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_name TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_uid) THEN RAISE EXCEPTION 'already_member'; END IF;

  SELECT * INTO v_inv FROM invitations
  WHERE token = invitation_token AND accepted_at IS NULL AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_invitation'; END IF;

  SELECT email, raw_user_meta_data->>'full_name' INTO v_email, v_name FROM auth.users WHERE id = v_uid;
  IF lower(v_email) IS DISTINCT FROM lower(v_inv.email) THEN RAISE EXCEPTION 'email_mismatch'; END IF;

  INSERT INTO profiles (id, organization_id, role, email, full_name)
  VALUES (v_uid, v_inv.organization_id, v_inv.role, v_email, v_name);
  UPDATE invitations SET accepted_at = now() WHERE id = v_inv.id;

  RETURN v_inv.organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_invitation(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation(TEXT) TO authenticated;
