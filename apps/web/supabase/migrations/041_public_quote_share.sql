-- ================================================
-- Migration: 041_public_quote_share.sql
-- D1 (docs/superpowers/specs/2026-10-13-cotizacion-publica-y-cobro-design.md): cotización pública con
-- "Aceptar" y anticipo.
-- 1. quote_shares: una liga activa por cotización; se guarda solo el sha256 del token de 32 bytes.
-- 2. quote_share_events: respuestas por hash de IP para limitar abuso (patrón de submit_quote_request).
-- 3. quotes.deposit_percent (ajuste por cotización) y quotes.accepted_by_name.
-- 4. organizations.settings: deposit_percent (0-100, por omisión 50), deposit_instructions (<= 500) y
--    deposit_payment_url (http/https). update_org_settings las acepta y las valida.
-- 5. RPCs: create_quote_share (miembros), get_public_quote (solo lectura), mark_public_quote_viewed y
--    respond_public_quote (anon). La vista se marca desde el navegador y no al leer: los generadores de
--    vista previa de WhatsApp y redes abren la liga sin ejecutar JavaScript.
-- 6. quote_notifications admite client_accepted / client_rejected y se publica en Realtime para la campana.
-- ================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ------------------------------------------------------------
-- Columnas nuevas en quotes
-- ------------------------------------------------------------
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_percent SMALLINT
  CONSTRAINT quotes_deposit_percent_check CHECK (deposit_percent BETWEEN 0 AND 100);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS accepted_by_name TEXT
  CONSTRAINT quotes_accepted_by_name_check CHECK (char_length(accepted_by_name) <= 120);

-- ------------------------------------------------------------
-- Tablas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quote_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  first_viewed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quote_shares_quote ON quote_shares(quote_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_shares_org ON quote_shares(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_quote_shares_active ON quote_shares(quote_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS quote_share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  share_id UUID NOT NULL REFERENCES quote_shares(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('accept', 'reject')),
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quote_share_events_ip ON quote_share_events(ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_share_events_share ON quote_share_events(share_id);
ALTER TABLE quote_share_events DROP CONSTRAINT IF EXISTS quote_share_events_ip_hash_format;
ALTER TABLE quote_share_events ADD CONSTRAINT quote_share_events_ip_hash_format CHECK (ip_hash ~ '^[a-f0-9]{64}$') NOT VALID;
ALTER TABLE quote_share_events VALIDATE CONSTRAINT quote_share_events_ip_hash_format;

-- ------------------------------------------------------------
-- RLS y privilegios: miembros ven y revocan; nadie inserta directo; anon no toca las tablas.
-- ------------------------------------------------------------
ALTER TABLE quote_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_share_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON quote_shares FROM anon, authenticated;
REVOKE ALL ON quote_share_events FROM anon, authenticated;
GRANT SELECT (id, quote_id, organization_id, expires_at, revoked_at, first_viewed_at, created_by, created_at)
  ON quote_shares TO authenticated;
GRANT UPDATE (revoked_at) ON quote_shares TO authenticated;

DROP POLICY IF EXISTS "Members view quote shares" ON quote_shares;
CREATE POLICY "Members view quote shares" ON quote_shares FOR SELECT TO authenticated
  USING (organization_id = public.user_organization_id());
DROP POLICY IF EXISTS "Workers revoke quote shares" ON quote_shares;
CREATE POLICY "Workers revoke quote shares" ON quote_shares FOR UPDATE TO authenticated
  USING (organization_id = public.user_organization_id() AND public.user_has_role(ARRAY['owner','admin','member']))
  WITH CHECK (organization_id = public.user_organization_id() AND revoked_at IS NOT NULL);

-- ------------------------------------------------------------
-- quote_notifications: avisos de respuesta del cliente (recipient = quien respondió)
-- ------------------------------------------------------------
ALTER TABLE quote_notifications DROP CONSTRAINT IF EXISTS valid_notification_type;
ALTER TABLE quote_notifications ADD CONSTRAINT valid_notification_type
  CHECK (notification_type IN ('email', 'whatsapp', 'client_accepted', 'client_rejected'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'quote_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE quote_notifications;
  END IF;
END $$;

-- ------------------------------------------------------------
-- Funciones internas (sin EXECUTE para anon ni authenticated)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deposit_settings_error(p_settings JSONB)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  v_pct JSONB := p_settings->'deposit_percent';
  v_text JSONB := p_settings->'deposit_instructions';
  v_url JSONB := p_settings->'deposit_payment_url';
BEGIN
  IF v_pct IS NOT NULL AND jsonb_typeof(v_pct) <> 'null'
     AND NOT (jsonb_typeof(v_pct) = 'number' AND v_pct::text ~ '^[0-9]{1,3}$' AND v_pct::text::int <= 100) THEN
    RETURN 'invalid_deposit_percent';
  END IF;
  IF v_text IS NOT NULL AND jsonb_typeof(v_text) <> 'null'
     AND NOT (jsonb_typeof(v_text) = 'string' AND char_length(v_text #>> '{}') <= 500) THEN
    RETURN 'invalid_deposit_instructions';
  END IF;
  IF v_url IS NOT NULL AND jsonb_typeof(v_url) <> 'null'
     AND NOT (jsonb_typeof(v_url) = 'string' AND char_length(v_url #>> '{}') <= 500
              AND (v_url #>> '{}') ~ '^https?://[^[:space:]"<>]+$') THEN
    RETURN 'invalid_deposit_payment_url';
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.org_deposit_percent(p_settings JSONB)
RETURNS INTEGER
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN jsonb_typeof(p_settings->'deposit_percent') = 'number'
     AND (p_settings->>'deposit_percent') ~ '^[0-9]{1,3}$'
     AND (p_settings->>'deposit_percent')::int <= 100
    THEN (p_settings->>'deposit_percent')::int
    ELSE 50
  END;
$$;

CREATE OR REPLACE FUNCTION public.public_quote_deposit(p_quote_percent SMALLINT, p_settings JSONB)
RETURNS JSONB
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'percent', COALESCE(p_quote_percent::int, public.org_deposit_percent(p_settings)),
    'instructions', CASE WHEN jsonb_typeof(p_settings->'deposit_instructions') = 'string'
      THEN NULLIF(left(btrim(p_settings->>'deposit_instructions'), 500), '') END,
    'payment_url', CASE WHEN jsonb_typeof(p_settings->'deposit_payment_url') = 'string'
      AND length(p_settings->>'deposit_payment_url') <= 500
      AND p_settings->>'deposit_payment_url' ~ '^https?://[^[:space:]"<>]+$'
      THEN p_settings->>'deposit_payment_url' END
  );
$$;

CREATE OR REPLACE FUNCTION public.quote_share_hash(p_token TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE SET search_path = public, extensions AS $$
  SELECT encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.active_quote_share(p_token TEXT)
RETURNS quote_shares
LANGUAGE sql STABLE SET search_path = public, extensions AS $$
  SELECT * FROM quote_shares
  WHERE p_token ~ '^[a-f0-9]{64}$'
    AND token_hash = public.quote_share_hash(p_token)
    AND revoked_at IS NULL
    AND expires_at > now()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.public_quote_business(p_org_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'name', o.name,
    'brand_color', CASE WHEN o.settings->>'brand_color' ~ '^#[0-9A-Fa-f]{6}$' THEN o.settings->>'brand_color' END,
    'logo_url', CASE WHEN length(o.settings->>'logo_url') <= 500
      AND o.settings->>'logo_url' ~ '^https?://[^[:space:]"<>]+$' THEN o.settings->>'logo_url' END,
    'phone', NULLIF(COALESCE(pp.whatsapp_phone, regexp_replace(COALESCE(o.settings->>'company_phone', ''), '[^0-9]', '', 'g')), '')
  )
  FROM organizations o
  LEFT JOIN public_profiles pp ON pp.organization_id = o.id
  WHERE o.id = p_org_id;
$$;

CREATE OR REPLACE FUNCTION public.public_quote_items(p_quote_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'description', i.description, 'quantity', i.quantity, 'unit_type', i.unit_type,
    'unit_price', i.unit_price, 'subtotal', i.subtotal
  ) ORDER BY i.sort_order, i.created_at), '[]'::jsonb)
  FROM (
    SELECT description, quantity, unit_type, unit_price, subtotal, sort_order, created_at
    FROM quote_items WHERE quote_id = p_quote_id ORDER BY sort_order, created_at LIMIT 100
  ) i;
$$;

CREATE OR REPLACE FUNCTION public.quote_is_past_validity(p_valid_until DATE)
RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT p_valid_until < (now() AT TIME ZONE 'America/Mexico_City')::date;
$$;

-- ------------------------------------------------------------
-- Configuración: update_org_settings acepta y valida el anticipo (resto igual que 039)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_org_settings(p_name TEXT, p_settings JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller profiles%ROWTYPE;
  v_allowed CONSTANT TEXT[] := ARRAY['company_address', 'company_phone', 'company_email', 'quote_terms',
    'quote_valid_days', 'tax_rate', 'logo_url', 'brand_color', 'checklist_dismissed_at',
    'deposit_percent', 'deposit_instructions', 'deposit_payment_url'];
  v_patch JSONB;
  v_error TEXT;
  v_org organizations%ROWTYPE;
BEGIN
  SELECT * INTO v_caller FROM profiles WHERE id = auth.uid();
  IF NOT FOUND OR v_caller.role NOT IN ('owner', 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_name IS NOT NULL AND length(btrim(p_name)) NOT BETWEEN 1 AND 255 THEN RAISE EXCEPTION 'invalid_name'; END IF;

  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb) INTO v_patch
  FROM jsonb_each(COALESCE(p_settings, '{}'::jsonb)) WHERE key = ANY(v_allowed);

  v_error := public.deposit_settings_error(v_patch);
  IF v_error IS NOT NULL THEN RAISE EXCEPTION '%', v_error USING ERRCODE = '22023'; END IF;

  UPDATE organizations
  SET name = COALESCE(btrim(p_name), name),
      settings = COALESCE(settings, '{}'::jsonb) || v_patch,
      updated_at = now()
  WHERE id = v_caller.organization_id
  RETURNING * INTO v_org;

  RETURN jsonb_build_object('id', v_org.id, 'name', v_org.name, 'slug', v_org.slug, 'settings', v_org.settings);
END;
$$;

-- ------------------------------------------------------------
-- RPCs
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_quote_share(p_quote_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_quote quotes%ROWTYPE;
  v_token TEXT := encode(extensions.gen_random_bytes(32), 'hex');
BEGIN
  SELECT * INTO v_quote FROM quotes
  WHERE id = p_quote_id AND organization_id = public.user_organization_id()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'quote_not_found' USING ERRCODE = 'P0002'; END IF;
  IF NOT public.user_has_role(ARRAY['owner','admin','member']) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;

  UPDATE quote_shares SET revoked_at = now() WHERE quote_id = p_quote_id AND revoked_at IS NULL;
  -- Mínimo 7 días: reenviar una cotización vencida debe abrir la página con el aviso "Vencida".
  INSERT INTO quote_shares (quote_id, organization_id, token_hash, expires_at, created_by)
  VALUES (
    v_quote.id, v_quote.organization_id, public.quote_share_hash(v_token),
    GREATEST(COALESCE((v_quote.valid_until + 30)::timestamptz, now() + INTERVAL '60 days'), now() + INTERVAL '7 days'),
    auth.uid()
  );
  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_quote(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_share quote_shares%ROWTYPE := public.active_quote_share(p_token);
  v_quote quotes%ROWTYPE;
  v_settings JSONB;
BEGIN
  IF v_share.id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v_quote FROM quotes WHERE id = v_share.quote_id;
  SELECT COALESCE(settings, '{}'::jsonb) INTO v_settings FROM organizations WHERE id = v_share.organization_id;

  RETURN jsonb_build_object(
    'business', public.public_quote_business(v_share.organization_id),
    'client_first_name', (SELECT NULLIF(split_part(btrim(name), ' ', 1), '') FROM clients WHERE id = v_quote.client_id),
    'quote_number', v_quote.quote_number,
    'issued_on', (v_quote.created_at AT TIME ZONE 'America/Mexico_City')::date,
    'valid_until', v_quote.valid_until,
    'status', v_quote.status,
    'is_expired', public.quote_is_past_validity(v_quote.valid_until),
    'accepted_at', v_quote.accepted_at,
    'rejected_at', v_quote.rejected_at,
    'accepted_by_name', v_quote.accepted_by_name,
    'subtotal', v_quote.subtotal,
    'discount_rate', COALESCE(v_quote.discount_rate, 0),
    'discount_amount', COALESCE(v_quote.discount_amount, 0),
    'tax_rate', COALESCE(v_quote.tax_rate, 0),
    'tax_amount', v_quote.tax_amount,
    'total', v_quote.total,
    'terms', v_quote.terms_and_conditions,
    'items', public.public_quote_items(v_quote.id),
    'deposit', public.public_quote_deposit(v_quote.deposit_percent, v_settings),
    'is_owner_preview', public.user_organization_id() IS NOT DISTINCT FROM v_share.organization_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_public_quote_viewed(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_share quote_shares%ROWTYPE := public.active_quote_share(p_token);
BEGIN
  IF v_share.id IS NULL THEN RETURN false; END IF;
  IF public.user_organization_id() IS NOT DISTINCT FROM v_share.organization_id THEN RETURN false; END IF;

  UPDATE quote_shares SET first_viewed_at = now() WHERE id = v_share.id AND first_viewed_at IS NULL;
  UPDATE quotes
  SET viewed_at = COALESCE(viewed_at, now()),
      status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END
  WHERE id = v_share.quote_id AND (viewed_at IS NULL OR status = 'sent');
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_public_quote(
  p_token TEXT, p_action TEXT, p_reason TEXT DEFAULT NULL, p_name TEXT DEFAULT NULL, p_ip_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_share quote_shares%ROWTYPE := public.active_quote_share(p_token);
  v_quote quotes%ROWTYPE;
  v_name TEXT := NULLIF(left(btrim(COALESCE(p_name, '')), 120), '');
  v_accept BOOLEAN := p_action = 'accept';
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('accept', 'reject') THEN RAISE EXCEPTION 'invalid_action' USING ERRCODE = '22023'; END IF;
  IF p_ip_hash IS NULL OR p_ip_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid_request' USING ERRCODE = '22023'; END IF;
  IF v_share.id IS NULL THEN RAISE EXCEPTION 'invalid_token' USING ERRCODE = 'P0002'; END IF;
  IF public.user_organization_id() IS NOT DISTINCT FROM v_share.organization_id THEN
    RAISE EXCEPTION 'owner_preview' USING ERRCODE = '42501';
  END IF;
  IF (
    SELECT count(*) FROM quote_share_events WHERE ip_hash = p_ip_hash AND created_at > now() - INTERVAL '1 hour'
  ) >= 20 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;
  IF (
    SELECT count(*) FROM quote_share_events WHERE share_id = v_share.id AND created_at > now() - INTERVAL '1 hour'
  ) >= 20 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_quote FROM quotes WHERE id = v_share.quote_id FOR UPDATE;
  INSERT INTO quote_share_events (organization_id, share_id, action, ip_hash)
  VALUES (v_share.organization_id, v_share.id, p_action, p_ip_hash);

  IF v_quote.status NOT IN ('sent', 'viewed') THEN
    RETURN jsonb_build_object('status', v_quote.status, 'changed', false);
  END IF;
  IF public.quote_is_past_validity(v_quote.valid_until) THEN RAISE EXCEPTION 'quote_expired' USING ERRCODE = 'P0001'; END IF;

  UPDATE quotes SET
    status = CASE WHEN v_accept THEN 'accepted' ELSE 'rejected' END,
    viewed_at = COALESCE(viewed_at, now()),
    accepted_at = CASE WHEN v_accept THEN now() ELSE accepted_at END,
    accepted_by_name = CASE WHEN v_accept THEN v_name ELSE accepted_by_name END,
    rejected_at = CASE WHEN v_accept THEN rejected_at ELSE now() END,
    rejection_reason = CASE WHEN v_accept THEN rejection_reason ELSE NULLIF(left(btrim(COALESCE(p_reason, '')), 500), '') END
  WHERE id = v_quote.id
  RETURNING * INTO v_quote;

  UPDATE quote_shares SET first_viewed_at = COALESCE(first_viewed_at, now()) WHERE id = v_share.id;
  INSERT INTO quote_notifications (quote_id, notification_type, recipient, status)
  VALUES (
    v_quote.id,
    CASE WHEN v_accept THEN 'client_accepted' ELSE 'client_rejected' END,
    COALESCE(v_name, (SELECT public.short_client_name(name) FROM clients WHERE id = v_quote.client_id), 'Cliente'),
    'sent'
  );
  RETURN jsonb_build_object('status', v_quote.status, 'changed', true);
END;
$$;

-- ------------------------------------------------------------
-- Privilegios de funciones
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.deposit_settings_error(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.org_deposit_percent(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.public_quote_deposit(SMALLINT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.quote_share_hash(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.active_quote_share(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.public_quote_business(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.public_quote_items(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.quote_is_past_validity(DATE) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.update_org_settings(TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_quote_share(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_quote(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_public_quote_viewed(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.respond_public_quote(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.update_org_settings(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_quote_share(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_quote(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_public_quote_viewed(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_public_quote(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 7. Los miembros marcan como leídos los avisos de su organización (la campana usa PATCH status/read_at).
REVOKE UPDATE ON public.quote_notifications FROM authenticated;
GRANT UPDATE (status, read_at) ON public.quote_notifications TO authenticated;

DROP POLICY IF EXISTS "Members mark quote notifications read" ON public.quote_notifications;
CREATE POLICY "Members mark quote notifications read" ON public.quote_notifications
  FOR UPDATE TO authenticated
  USING (
    notification_type IN ('client_accepted', 'client_rejected')
    AND EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_notifications.quote_id AND q.organization_id = public.user_organization_id()
    )
  )
  WITH CHECK (
    notification_type IN ('client_accepted', 'client_rejected')
    AND status = 'read'
    AND EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_notifications.quote_id AND q.organization_id = public.user_organization_id()
    )
  );
