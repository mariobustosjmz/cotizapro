-- Migration 034: public showcase (profile, portfolio photos, verified reviews, quote requests)
-- Spec: docs/superpowers/specs/2026-10-11-cotizapro-plataforma-design.md (sections 2.3, 2.4)
-- Anonymous access only through SECURITY DEFINER functions with fixed search_path and
-- through a storage policy for published photos. No anon policies on base tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public_profiles (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 80),
  headline TEXT CHECK (char_length(headline) <= 120),
  bio TEXT CHECK (char_length(bio) <= 1500),
  service_area TEXT CHECK (char_length(service_area) <= 160),
  city TEXT CHECK (char_length(city) <= 80),
  whatsapp_phone TEXT CHECK (whatsapp_phone ~ '^[0-9]{10,15}$'),
  contact_email TEXT CHECK (char_length(contact_email) <= 160),
  logo_path TEXT,
  cover_path TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  show_prices BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL DEFAULT 'other' CHECK (kind IN ('before', 'after', 'other')),
  caption TEXT CHECK (char_length(caption) <= 160),
  is_public BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_job_photos_quote ON job_photos(quote_id);
CREATE INDEX IF NOT EXISTS idx_job_photos_public ON job_photos(organization_id, created_at DESC) WHERE is_public;

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL UNIQUE REFERENCES quotes(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT CHECK (char_length(comment) <= 1000),
  owner_reply TEXT CHECK (char_length(owner_reply) <= 1000),
  token_hash TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_org_submitted ON reviews(organization_id, submitted_at DESC) WHERE submitted_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  phone TEXT NOT NULL CHECK (phone ~ '^[0-9]{10,15}$'),
  email TEXT CHECK (char_length(email) <= 160),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 5 AND 2000),
  details JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'converted', 'discarded')),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quote_requests_org ON quote_requests(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_requests_ip ON quote_requests(ip_hash, created_at DESC);

DROP TRIGGER IF EXISTS update_public_profiles_updated_at ON public_profiles;
CREATE TRIGGER update_public_profiles_updated_at BEFORE UPDATE ON public_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_quote_requests_updated_at ON quote_requests;
CREATE TRIGGER update_quote_requests_updated_at BEFORE UPDATE ON quote_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- RLS (authenticated members only)
-- ------------------------------------------------------------
ALTER TABLE public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_has_role(allowed TEXT[])
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ANY(allowed));
$$;

DROP POLICY IF EXISTS "Members view profile" ON public_profiles;
CREATE POLICY "Members view profile" ON public_profiles FOR SELECT TO authenticated
  USING (organization_id = public.user_organization_id());
DROP POLICY IF EXISTS "Admins manage profile" ON public_profiles;
CREATE POLICY "Admins manage profile" ON public_profiles FOR ALL TO authenticated
  USING (organization_id = public.user_organization_id() AND public.user_has_role(ARRAY['owner','admin']))
  WITH CHECK (organization_id = public.user_organization_id() AND public.user_has_role(ARRAY['owner','admin']));

DROP POLICY IF EXISTS "Members view photos" ON job_photos;
CREATE POLICY "Members view photos" ON job_photos FOR SELECT TO authenticated
  USING (organization_id = public.user_organization_id());
DROP POLICY IF EXISTS "Workers manage photos" ON job_photos;
CREATE POLICY "Workers manage photos" ON job_photos FOR ALL TO authenticated
  USING (organization_id = public.user_organization_id() AND public.user_has_role(ARRAY['owner','admin','member']))
  WITH CHECK (
    organization_id = public.user_organization_id()
    AND public.user_has_role(ARRAY['owner','admin','member'])
    AND EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND q.organization_id = job_photos.organization_id)
  );

DROP POLICY IF EXISTS "Members view reviews" ON reviews;
CREATE POLICY "Members view reviews" ON reviews FOR SELECT TO authenticated
  USING (organization_id = public.user_organization_id());
DROP POLICY IF EXISTS "Admins moderate reviews" ON reviews;
CREATE POLICY "Admins moderate reviews" ON reviews FOR UPDATE TO authenticated
  USING (organization_id = public.user_organization_id() AND public.user_has_role(ARRAY['owner','admin']))
  WITH CHECK (organization_id = public.user_organization_id());

DROP POLICY IF EXISTS "Members view requests" ON quote_requests;
CREATE POLICY "Members view requests" ON quote_requests FOR SELECT TO authenticated
  USING (organization_id = public.user_organization_id());
DROP POLICY IF EXISTS "Workers update requests" ON quote_requests;
CREATE POLICY "Workers update requests" ON quote_requests FOR UPDATE TO authenticated
  USING (organization_id = public.user_organization_id() AND public.user_has_role(ARRAY['owner','admin','member']))
  WITH CHECK (organization_id = public.user_organization_id());

-- Reviews must not be editable by the business except reply and visibility.
CREATE OR REPLACE FUNCTION public.guard_review_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('cotizapro.review_submit', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.rating IS DISTINCT FROM OLD.rating OR NEW.comment IS DISTINCT FROM OLD.comment
     OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at OR NEW.quote_id <> OLD.quote_id
     OR NEW.token_hash <> OLD.token_hash OR NEW.organization_id <> OLD.organization_id THEN
    RAISE EXCEPTION 'Solo se puede editar la respuesta y la visibilidad de una reseña';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_review_update ON reviews;
CREATE TRIGGER guard_review_update BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION public.guard_review_update();

-- ------------------------------------------------------------
-- Public functions
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.short_client_name(full_name TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN full_name IS NULL OR btrim(full_name) = '' THEN 'Cliente'
    WHEN split_part(btrim(full_name), ' ', 2) = '' THEN split_part(btrim(full_name), ' ', 1)
    ELSE split_part(btrim(full_name), ' ', 1) || ' ' || left(split_part(btrim(full_name), ' ', 2), 1) || '.'
  END;
$$;

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

CREATE OR REPLACE FUNCTION public.is_public_photo(p_path TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM job_photos jp
    JOIN public_profiles pp ON pp.organization_id = jp.organization_id
    WHERE jp.storage_path = p_path AND jp.is_public AND pp.is_published
  );
$$;

CREATE OR REPLACE FUNCTION public.submit_quote_request(
  p_slug TEXT, p_name TEXT, p_phone TEXT, p_email TEXT, p_message TEXT, p_details JSONB, p_ip_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id UUID;
  v_id UUID;
  v_phone TEXT := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
BEGIN
  SELECT o.id INTO v_org_id FROM organizations o
  JOIN public_profiles pp ON pp.organization_id = o.id AND pp.is_published
  WHERE o.slug = lower(p_slug);
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0002'; END IF;

  IF p_ip_hash IS NOT NULL AND (
    SELECT count(*) FROM quote_requests WHERE ip_hash = p_ip_hash AND created_at > NOW() - INTERVAL '1 hour'
  ) >= 5 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM quote_requests WHERE organization_id = v_org_id AND created_at > NOW() - INTERVAL '1 day') >= 100 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO quote_requests (organization_id, name, phone, email, message, details, ip_hash)
  VALUES (v_org_id, btrim(p_name), v_phone, NULLIF(btrim(p_email), ''), btrim(p_message), COALESCE(p_details, '{}'::jsonb), p_ip_hash)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'organization_id', v_org_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_review_request(p_quote_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_quote quotes%ROWTYPE;
  v_token TEXT := encode(extensions.gen_random_bytes(24), 'hex');
  v_existing reviews%ROWTYPE;
BEGIN
  SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id AND organization_id = public.user_organization_id();
  IF NOT FOUND THEN RAISE EXCEPTION 'quote_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_quote.status <> 'cobrado' THEN RAISE EXCEPTION 'quote_not_paid' USING ERRCODE = 'P0001'; END IF;
  IF NOT public.user_has_role(ARRAY['owner','admin','member']) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;

  SELECT * INTO v_existing FROM reviews WHERE quote_id = p_quote_id;
  IF FOUND AND v_existing.submitted_at IS NOT NULL THEN RAISE EXCEPTION 'already_reviewed' USING ERRCODE = 'P0001'; END IF;

  PERFORM set_config('cotizapro.review_submit', 'on', true);
  INSERT INTO reviews (organization_id, quote_id, client_id, token_hash, token_expires_at)
  VALUES (v_quote.organization_id, v_quote.id, v_quote.client_id, encode(extensions.digest(v_token, 'sha256'), 'hex'), NOW() + INTERVAL '30 days')
  ON CONFLICT (quote_id) DO UPDATE SET token_hash = EXCLUDED.token_hash, token_expires_at = EXCLUDED.token_expires_at;
  PERFORM set_config('cotizapro.review_submit', 'off', true);

  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_review_request(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_review reviews%ROWTYPE;
BEGIN
  SELECT * INTO v_review FROM reviews WHERE token_hash = encode(extensions.digest(COALESCE(p_token, ''), 'sha256'), 'hex');
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'status', CASE WHEN v_review.submitted_at IS NOT NULL THEN 'submitted' WHEN v_review.token_expires_at < NOW() THEN 'expired' ELSE 'open' END,
    'business', (SELECT COALESCE(pp.display_name, o.name) FROM organizations o LEFT JOIN public_profiles pp ON pp.organization_id = o.id WHERE o.id = v_review.organization_id),
    'slug', (SELECT slug FROM organizations WHERE id = v_review.organization_id),
    'quote_number', (SELECT quote_number FROM quotes WHERE id = v_review.quote_id),
    'client', (SELECT public.short_client_name(name) FROM clients WHERE id = v_review.client_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_review(p_token TEXT, p_rating INTEGER, p_comment TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN RAISE EXCEPTION 'invalid_rating' USING ERRCODE = '22023'; END IF;
  SELECT id INTO v_id FROM reviews
  WHERE token_hash = encode(extensions.digest(COALESCE(p_token, ''), 'sha256'), 'hex')
    AND submitted_at IS NULL AND token_expires_at > NOW()
  FOR UPDATE;
  IF v_id IS NULL THEN RAISE EXCEPTION 'invalid_token' USING ERRCODE = 'P0002'; END IF;

  PERFORM set_config('cotizapro.review_submit', 'on', true);
  UPDATE reviews SET rating = p_rating, comment = NULLIF(left(btrim(COALESCE(p_comment, '')), 1000), ''), submitted_at = NOW()
  WHERE id = v_id;
  PERFORM set_config('cotizapro.review_submit', 'off', true);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_quote_request(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_review_request(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_review(TEXT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_review_request(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_public_photo(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.user_has_role(TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.guard_review_update() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_public_profile(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quote_request(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_review_request(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_review(TEXT, INTEGER, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_review_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_public_photo(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_role(TEXT[]) TO authenticated;

-- ------------------------------------------------------------
-- Storage: private job photos, public brand assets
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('job-photos', 'job-photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('brand-assets', 'brand-assets', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "cotizapro org manages job photos" ON storage.objects;
CREATE POLICY "cotizapro org manages job photos" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'job-photos' AND (storage.foldername(name))[1] = public.user_organization_id()::text)
  WITH CHECK (bucket_id = 'job-photos' AND (storage.foldername(name))[1] = public.user_organization_id()::text);

DROP POLICY IF EXISTS "cotizapro public reads published photos" ON storage.objects;
CREATE POLICY "cotizapro public reads published photos" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'job-photos' AND public.is_public_photo(name));

DROP POLICY IF EXISTS "cotizapro org manages brand assets" ON storage.objects;
CREATE POLICY "cotizapro org manages brand assets" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'brand-assets' AND (storage.foldername(name))[1] = public.user_organization_id()::text)
  WITH CHECK (bucket_id = 'brand-assets' AND (storage.foldername(name))[1] = public.user_organization_id()::text);
