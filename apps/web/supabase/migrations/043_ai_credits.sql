-- ================================================
-- Migration: 043_ai_credits.sql
-- Créditos mensuales de IA (spec 2026-10-13-ia-creditos-y-funciones-design.md §2.2).
-- - ai_usage_events guarda solo metadatos (función, créditos, tokens, latencia, estado), nunca contenido.
-- - ai_reserve / ai_finish: reserva y cierre atómicos. finish_nonce no es legible por los miembros, así nadie
--   puede cerrar como 'failed' (reembolso) una reserva que el servidor está usando.
-- - Límites activos salvo que el GUC ai.limits_enforced valga 'off' (ALTER DATABASE ... SET ai.limits_enforced).
-- - admin_grant_ai_credits / admin_ai_usage dependen de is_platform_admin() (migración 042, D2).
-- ================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feature TEXT NOT NULL CHECK (feature IN ('whatsapp_draft', 'describe_item', 'follow_up', 'rewrite', 'showcase_texts')),
  credits INTEGER NOT NULL CHECK (credits >= 0),
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'ok', 'failed')),
  finish_nonce UUID NOT NULL DEFAULT gen_random_uuid(),
  prompt_tokens INTEGER CHECK (prompt_tokens >= 0),
  completion_tokens INTEGER CHECK (completion_tokens >= 0),
  latency_ms INTEGER CHECK (latency_ms >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
-- Borrar a un miembro no debe reembolsar el mes de la empresa ni borrar la bitácora: el evento queda sin usuario.
-- Se rehace la FK por nombre para que una base con la versión previa (NOT NULL + CASCADE) quede igual.
ALTER TABLE public.ai_usage_events ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.ai_usage_events DROP CONSTRAINT IF EXISTS ai_usage_events_user_id_fkey;
ALTER TABLE public.ai_usage_events ADD CONSTRAINT ai_usage_events_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ai_usage_events_org_created_idx ON public.ai_usage_events (organization_id, created_at);
CREATE INDEX IF NOT EXISTS ai_usage_events_user_created_idx ON public.ai_usage_events (user_id, created_at);
CREATE INDEX IF NOT EXISTS ai_usage_events_org_reserved_idx ON public.ai_usage_events (organization_id, created_at)
  WHERE status = 'reserved';

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members read org ai usage" ON public.ai_usage_events;
CREATE POLICY "Members read org ai usage" ON public.ai_usage_events
  FOR SELECT TO authenticated
  USING (organization_id = public.user_organization_id());
REVOKE ALL ON public.ai_usage_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ai_usage_events TO service_role;
GRANT SELECT (id, organization_id, user_id, feature, credits, status, prompt_tokens, completion_tokens, latency_ms, created_at, finished_at)
  ON public.ai_usage_events TO authenticated;

CREATE TABLE IF NOT EXISTS public.ai_credit_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL CHECK (credits > 0 AND credits <= 100000),
  source TEXT NOT NULL CHECK (source IN ('pack', 'courtesy')),
  reference TEXT CHECK (char_length(reference) <= 200),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_credit_grants_org_expires_idx ON public.ai_credit_grants (organization_id, expires_at);
-- Un pago de paquete se acredita una sola vez por empresa; las cortesías no llevan referencia obligatoria.
CREATE UNIQUE INDEX IF NOT EXISTS ai_credit_grants_pack_reference_uidx ON public.ai_credit_grants (organization_id, reference)
  WHERE source = 'pack' AND reference IS NOT NULL;
ALTER TABLE public.ai_credit_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_credit_grants FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ai_credit_grants TO service_role;

CREATE TABLE IF NOT EXISTS public.ai_usage_alerts (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  threshold SMALLINT NOT NULL CHECK (threshold IN (80, 100)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, period_start, threshold)
);
ALTER TABLE public.ai_usage_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage_alerts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ai_usage_alerts TO service_role;

CREATE OR REPLACE FUNCTION public.ai_monthly_allowance(p_plan TEXT)
RETURNS INTEGER LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_plan
    WHEN 'free' THEN 25
    WHEN 'starter' THEN 150
    WHEN 'pro' THEN 400
    WHEN 'enterprise' THEN 1200
    ELSE 25
  END
$$;

CREATE OR REPLACE FUNCTION public.ai_feature_credits(p_feature TEXT)
RETURNS INTEGER LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_feature
    WHEN 'whatsapp_draft' THEN 3
    WHEN 'describe_item' THEN 2
    WHEN 'follow_up' THEN 1
    WHEN 'rewrite' THEN 1
    WHEN 'showcase_texts' THEN 2
  END
$$;

-- Espejos de AI_TIME_ZONE (lib/ai/period.ts) y AI_DAILY_USER_CAP (lib/ai/features.ts); ver lib/ai/sql-mirror.test.ts.
CREATE OR REPLACE FUNCTION public.ai_time_zone()
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT 'America/Monterrey'::TEXT
$$;

CREATE OR REPLACE FUNCTION public.ai_daily_user_cap()
RETURNS INTEGER LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT 40
$$;

-- Una reserva más vieja que esto ya no cuenta como usada, no se puede cerrar y se expira como 'failed'.
CREATE OR REPLACE FUNCTION public.ai_reservation_ttl()
RETURNS INTERVAL LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT interval '5 minutes'
$$;

CREATE OR REPLACE FUNCTION public.ai_period_start(p_at TIMESTAMPTZ DEFAULT now())
RETURNS TIMESTAMPTZ LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT date_trunc('month', p_at AT TIME ZONE public.ai_time_zone()) AT TIME ZONE public.ai_time_zone()
$$;

CREATE OR REPLACE FUNCTION public.ai_period_end(p_at TIMESTAMPTZ DEFAULT now())
RETURNS TIMESTAMPTZ LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT (date_trunc('month', p_at AT TIME ZONE public.ai_time_zone()) + interval '1 month') AT TIME ZONE public.ai_time_zone()
$$;

CREATE OR REPLACE FUNCTION public.ai_day_start(p_at TIMESTAMPTZ DEFAULT now())
RETURNS TIMESTAMPTZ LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT date_trunc('day', p_at AT TIME ZONE public.ai_time_zone()) AT TIME ZONE public.ai_time_zone()
$$;

CREATE OR REPLACE FUNCTION public.ai_limits_enforced()
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce(nullif(current_setting('ai.limits_enforced', true), ''), 'on') <> 'off'
$$;

CREATE OR REPLACE FUNCTION public.ai_normalize_text(p_text TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT btrim(regexp_replace(translate(lower(coalesce(p_text, '')), 'áéíóúüñ', 'aeiouun'), '\s+', ' ', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.ai_expire_stale(p_org UUID)
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH expired AS (
    UPDATE public.ai_usage_events
       SET status = 'failed', credits = 0, finished_at = now()
     WHERE organization_id = p_org AND status = 'reserved' AND created_at < now() - public.ai_reservation_ttl()
    RETURNING 1
  )
  SELECT count(*)::INTEGER FROM expired
$$;

CREATE OR REPLACE FUNCTION public.ai_org_balance(p_org UUID)
RETURNS TABLE (used INTEGER, allowance INTEGER, pack_credits INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    coalesce((
      SELECT sum(e.credits) FROM public.ai_usage_events e
       WHERE e.organization_id = p_org AND e.created_at >= public.ai_period_start()
         AND (e.status = 'ok' OR (e.status = 'reserved' AND e.created_at >= now() - public.ai_reservation_ttl()))
    ), 0)::INTEGER,
    public.ai_monthly_allowance((SELECT o.plan FROM public.organizations o WHERE o.id = p_org)),
    coalesce((
      SELECT sum(g.credits) FROM public.ai_credit_grants g
       WHERE g.organization_id = p_org AND g.expires_at > now()
    ), 0)::INTEGER
$$;

CREATE OR REPLACE FUNCTION public.ai_reserve(p_feature TEXT, p_credits INTEGER)
RETURNS TABLE (event_id UUID, nonce UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_org UUID;
  v_used INTEGER;
  v_allowance INTEGER;
  v_packs INTEGER;
  v_daily INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF public.ai_feature_credits(p_feature) IS NULL OR p_credits IS DISTINCT FROM public.ai_feature_credits(p_feature) THEN
    RAISE EXCEPTION 'ai_invalid_feature' USING ERRCODE = '22023';
  END IF;
  v_org := public.user_organization_id();
  IF v_org IS NULL THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('ai_credits:' || v_org::TEXT, 0));
  PERFORM public.ai_expire_stale(v_org);
  SELECT b.used, b.allowance, b.pack_credits INTO v_used, v_allowance, v_packs FROM public.ai_org_balance(v_org) b;
  SELECT coalesce(sum(e.credits), 0)::INTEGER INTO v_daily
    FROM public.ai_usage_events e
   WHERE e.user_id = v_uid AND e.status IN ('ok', 'reserved') AND e.created_at >= public.ai_day_start();

  IF public.ai_limits_enforced() AND v_used + p_credits > v_allowance + v_packs THEN
    RAISE EXCEPTION 'ai_quota_exceeded' USING ERRCODE = 'P0001';
  END IF;
  IF public.ai_limits_enforced() AND v_daily + p_credits > public.ai_daily_user_cap() THEN
    RAISE EXCEPTION 'ai_daily_cap' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
    INSERT INTO public.ai_usage_events AS e (organization_id, user_id, feature, credits)
    VALUES (v_org, v_uid, p_feature, p_credits)
    RETURNING e.id, e.finish_nonce;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_finish(
  p_event UUID,
  p_nonce UUID,
  p_ok BOOLEAN,
  p_prompt_tokens INTEGER DEFAULT NULL,
  p_completion_tokens INTEGER DEFAULT NULL,
  p_latency_ms INTEGER DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows INTEGER;
BEGIN
  UPDATE public.ai_usage_events e
     SET status = CASE WHEN p_ok THEN 'ok' ELSE 'failed' END,
         credits = CASE WHEN p_ok THEN e.credits ELSE 0 END,
         prompt_tokens = CASE WHEN p_prompt_tokens >= 0 THEN p_prompt_tokens END,
         completion_tokens = CASE WHEN p_completion_tokens >= 0 THEN p_completion_tokens END,
         latency_ms = CASE WHEN p_latency_ms >= 0 THEN p_latency_ms END,
         finished_at = now()
   WHERE e.id = p_event AND e.finish_nonce = p_nonce AND e.user_id = auth.uid()
     AND e.status = 'reserved' AND e.created_at >= now() - public.ai_reservation_ttl();
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'ai_event_not_open' USING ERRCODE = 'P0001'; END IF;
  RETURN p_ok;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_usage_summary_for(p_org UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_used INTEGER;
  v_allowance INTEGER;
  v_packs INTEGER;
  v_total INTEGER;
  v_start TIMESTAMPTZ := public.ai_period_start();
BEGIN
  SELECT b.used, b.allowance, b.pack_credits INTO v_used, v_allowance, v_packs FROM public.ai_org_balance(p_org) b;
  v_total := v_allowance + v_packs;
  RETURN jsonb_build_object(
    'used', v_used,
    'allowance', v_allowance,
    'pack_credits', v_packs,
    'remaining', greatest(v_total - v_used, 0),
    'percent', CASE WHEN v_total <= 0 THEN 100 ELSE least(100, floor(v_used * 100.0 / v_total))::INTEGER END,
    'resets_on', to_char(public.ai_period_end() AT TIME ZONE public.ai_time_zone(), 'YYYY-MM-DD'),
    'enforced', public.ai_limits_enforced(),
    'by_feature', coalesce((
      SELECT jsonb_agg(jsonb_build_object('feature', f.feature, 'credits', f.credits, 'uses', f.uses) ORDER BY f.credits DESC)
        FROM (
          SELECT e.feature, sum(e.credits)::INTEGER AS credits, count(*)::INTEGER AS uses
            FROM public.ai_usage_events e
           WHERE e.organization_id = p_org AND e.status = 'ok' AND e.created_at >= v_start
           GROUP BY e.feature
        ) f
    ), '[]'::jsonb),
    'packs', coalesce((
      SELECT jsonb_agg(jsonb_build_object('credits', g.credits, 'source', g.source, 'expires_at', g.expires_at) ORDER BY g.expires_at)
        FROM public.ai_credit_grants g
       WHERE g.organization_id = p_org AND g.expires_at > now()
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_usage_summary()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org UUID := public.user_organization_id();
BEGIN
  IF v_org IS NULL THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN public.ai_usage_summary_for(v_org);
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_claim_usage_alert(p_threshold INTEGER)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org UUID := public.user_organization_id();
  v_rows INTEGER;
  v_email TEXT;
BEGIN
  IF v_org IS NULL THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_threshold IS NULL OR p_threshold NOT IN (80, 100) THEN RAISE EXCEPTION 'ai_invalid_threshold' USING ERRCODE = '22023'; END IF;
  IF (public.ai_usage_summary_for(v_org)->>'percent')::INTEGER < p_threshold THEN RETURN NULL; END IF;

  INSERT INTO public.ai_usage_alerts (organization_id, period_start, threshold)
  VALUES (v_org, (public.ai_period_start() AT TIME ZONE public.ai_time_zone())::DATE, p_threshold)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN NULL; END IF;

  SELECT p.email INTO v_email FROM public.profiles p
   WHERE p.organization_id = v_org AND p.role = 'owner'
   ORDER BY p.created_at LIMIT 1;
  RETURN v_email;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_match_services(p_terms TEXT[])
RETURNS TABLE (term_index INTEGER, service_id UUID, service_name TEXT, score REAL)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, extensions AS $$
  WITH terms AS (
    SELECT (t.ord - 1)::INTEGER AS idx, public.ai_normalize_text(t.term) AS term
      FROM unnest(p_terms[1:15]) WITH ORDINALITY AS t(term, ord)
     WHERE length(btrim(coalesce(t.term, ''))) > 0
  ),
  scored AS (
    SELECT terms.idx, s.id, s.name, similarity(public.ai_normalize_text(s.name), terms.term) AS sim
      FROM terms
     CROSS JOIN public.service_catalog s
     WHERE s.is_active IS TRUE AND s.organization_id = public.user_organization_id()
  ),
  ranked AS (
    SELECT scored.idx, scored.id, scored.name, scored.sim,
           row_number() OVER (PARTITION BY scored.idx ORDER BY scored.sim DESC, scored.name) AS rn
      FROM scored
     WHERE scored.sim >= 0.3
  )
  SELECT ranked.idx, ranked.id, ranked.name, ranked.sim FROM ranked WHERE ranked.rn <= 3 ORDER BY ranked.idx, ranked.rn
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_ai_credits(p_org UUID, p_credits INTEGER, p_source TEXT, p_reference TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID;
  v_reference TEXT := nullif(btrim(coalesce(p_reference, '')), '');
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_source IS NULL OR p_source NOT IN ('pack', 'courtesy') THEN RAISE EXCEPTION 'ai_invalid_source' USING ERRCODE = '22023'; END IF;
  IF p_credits IS NULL OR p_credits <= 0 OR p_credits > 100000 THEN RAISE EXCEPTION 'ai_invalid_credits' USING ERRCODE = '22023'; END IF;
  IF char_length(v_reference) > 200 THEN RAISE EXCEPTION 'ai_invalid_reference' USING ERRCODE = '22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org) THEN
    RAISE EXCEPTION 'organization_not_found' USING ERRCODE = 'P0002';
  END IF;

  BEGIN
    INSERT INTO public.ai_credit_grants (organization_id, credits, source, reference, granted_by, expires_at)
    VALUES (p_org, p_credits, p_source, v_reference, auth.uid(), public.ai_period_end())
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'ai_duplicate_reference' USING ERRCODE = '23505';
  END;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_ai_usage(p_org UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org) THEN
    RAISE EXCEPTION 'organization_not_found' USING ERRCODE = 'P0002';
  END IF;
  RETURN public.ai_usage_summary_for(p_org);
END;
$$;

-- Helpers puros: solo los usan funciones SECURITY DEFINER (dueño postgres). ai_normalize_text conserva
-- authenticated porque ai_match_services es SECURITY INVOKER.
REVOKE ALL ON FUNCTION public.ai_monthly_allowance(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_feature_credits(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_time_zone() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_daily_user_cap() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_reservation_ttl() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_period_start(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_period_end(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_day_start(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_limits_enforced() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_normalize_text(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_normalize_text(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.ai_expire_stale(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_org_balance(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_usage_summary_for(UUID) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_reserve(TEXT, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ai_finish(UUID, UUID, BOOLEAN, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ai_usage_summary() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ai_claim_usage_alert(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ai_match_services(TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_grant_ai_credits(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_ai_usage(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.ai_reserve(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_finish(UUID, UUID, BOOLEAN, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_usage_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_claim_usage_alert(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_match_services(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_ai_credits(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ai_usage(UUID) TO authenticated;
