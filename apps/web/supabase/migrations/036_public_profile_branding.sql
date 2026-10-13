-- ================================================
-- Migration: 036_public_profile_branding.sql
-- La página pública usa la marca de la empresa. get_public_profile agrega 'brand_color' (solo hex #RRGGBB)
-- y 'logo_url' de Configuración (solo http/https), que la página usa si no hay logo subido a Storage.
-- El resto de la función queda igual que en 034.
-- ================================================

CREATE OR REPLACE FUNCTION public.get_public_profile(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org organizations%ROWTYPE;
  v_profile public_profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_org FROM organizations WHERE slug = lower(p_slug);
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO v_profile FROM public_profiles WHERE organization_id = v_org.id AND is_published;
  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'slug', v_org.slug,
    'account_type', v_org.account_type,
    'trade', v_org.trade,
    'member_since', v_org.created_at,
    'brand_color', CASE WHEN v_org.settings->>'brand_color' ~ '^#[0-9A-Fa-f]{6}$' THEN v_org.settings->>'brand_color' ELSE NULL END,
    'logo_url', CASE WHEN length(v_org.settings->>'logo_url') <= 500 AND v_org.settings->>'logo_url' ~ '^https?://[^[:space:]"<>]+$' THEN v_org.settings->>'logo_url' ELSE NULL END,
    'profile', jsonb_build_object(
      'display_name', v_profile.display_name, 'headline', v_profile.headline, 'bio', v_profile.bio,
      'service_area', v_profile.service_area, 'city', v_profile.city,
      'whatsapp_phone', v_profile.whatsapp_phone, 'contact_email', v_profile.contact_email,
      'logo_path', v_profile.logo_path, 'cover_path', v_profile.cover_path
    ),
    'stats', jsonb_build_object(
      'completed_jobs', (SELECT count(*) FROM quotes WHERE organization_id = v_org.id AND status IN ('completado', 'cobrado')),
      'review_count', (SELECT count(*) FROM reviews WHERE organization_id = v_org.id AND submitted_at IS NOT NULL AND is_visible),
      'rating_avg', (SELECT round(avg(rating)::numeric, 1) FROM reviews WHERE organization_id = v_org.id AND submitted_at IS NOT NULL AND is_visible)
    ),
    'services', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', s.name, 'description', s.description, 'category', s.category, 'unit_type', s.unit_type,
        'price_from', CASE WHEN v_profile.show_prices THEN s.unit_price ELSE NULL END
      ) ORDER BY s.category, s.name)
      FROM (SELECT * FROM service_catalog WHERE organization_id = v_org.id AND is_active ORDER BY name LIMIT 30) s
    ), '[]'::jsonb),
    'photos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('path', p.storage_path, 'kind', p.kind, 'caption', p.caption, 'job', p.quote_id) ORDER BY p.created_at DESC)
      FROM (SELECT * FROM job_photos WHERE organization_id = v_org.id AND is_public ORDER BY created_at DESC LIMIT 36) p
    ), '[]'::jsonb),
    'reviews', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'rating', r.rating, 'comment', r.comment, 'owner_reply', r.owner_reply,
        'submitted_at', r.submitted_at, 'client', public.short_client_name(c.name)
      ) ORDER BY r.submitted_at DESC)
      FROM (SELECT * FROM reviews WHERE organization_id = v_org.id AND submitted_at IS NOT NULL AND is_visible ORDER BY submitted_at DESC LIMIT 20) r
      LEFT JOIN clients c ON c.id = r.client_id
    ), '[]'::jsonb)
  );
END;
$$;
