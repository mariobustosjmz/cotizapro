-- ================================================
-- Migration: 042_billing_superadmin.sql
-- D2 del spec 2026-10-13: cobro semi-manual con Mercado Pago.
-- Parte A: periodo pagado, guardia de columnas de facturación, superadmin de plataforma,
--          activaciones auditadas, solo lectura al vencer y límites de plan en SQL.
-- Parte B: avisos de vencimiento para el cron diario.
-- Idempotente. No depende de 041 (D1).
-- ================================================

-- ---------------- Parte A ----------------

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_provider TEXT,
  ADD COLUMN IF NOT EXISTS billing_reference TEXT;

DO $$
BEGIN
  ALTER TABLE public.organizations ADD CONSTRAINT organizations_billing_provider_check
    CHECK (billing_provider IS NULL OR billing_provider IN ('mercadopago_manual', 'stripe'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.organizations ADD CONSTRAINT organizations_billing_reference_check
    CHECK (billing_reference IS NULL OR length(billing_reference) <= 120);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_organizations_current_period_end
  ON public.organizations (current_period_end) WHERE current_period_end IS NOT NULL;

-- 040 creó el trigger; aquí la función suma las columnas nuevas. Las RPC admin_* son SECURITY DEFINER
-- (dueño postgres), así que current_user deja de ser authenticated y sí pueden escribirlas.
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
    OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
    OR NEW.billing_provider IS DISTINCT FROM OLD.billing_provider
    OR NEW.billing_reference IS DISTINCT FROM OLD.billing_reference
  ) THEN
    RAISE EXCEPTION 'billing columns cannot be changed directly' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_admins FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.platform_admins TO service_role;

CREATE TABLE IF NOT EXISTS public.plan_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('activate', 'suspend')),
  previous_plan TEXT NOT NULL,
  new_plan TEXT NOT NULL,
  users_billed INTEGER CHECK (users_billed IS NULL OR users_billed BETWEEN 1 AND 500),
  months INTEGER CHECK (months IS NULL OR months BETWEEN 1 AND 12),
  amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  reference TEXT CHECK (reference IS NULL OR length(reference) <= 120),
  reason TEXT CHECK (reason IS NULL OR length(reason) <= 300),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plan_activations_org_created
  ON public.plan_activations (organization_id, created_at DESC);
ALTER TABLE public.plan_activations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.plan_activations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.plan_activations TO service_role;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

-- true = sin bloqueo de cobro. Gratis nunca vence; un plan pagado sin periodo (demo, presentación) tampoco.
CREATE OR REPLACE FUNCTION public.org_is_writable(p_org UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT o.plan = 'free' OR o.current_period_end IS NULL OR o.current_period_end > now()
    FROM public.organizations o WHERE o.id = p_org
  ), true)
$$;
REVOKE ALL ON FUNCTION public.org_is_writable(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.org_is_writable(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.current_org_is_writable()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.org_is_writable(public.user_organization_id())
$$;
REVOKE ALL ON FUNCTION public.current_org_is_writable() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_org_is_writable() TO authenticated, service_role;

-- Espejo de lib/plans/limits.ts para checks de base de datos en una fase posterior.
CREATE OR REPLACE FUNCTION public.org_plan_limits(p_org UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE o.plan
    WHEN 'free' THEN jsonb_build_object('plan', 'free', 'included_users', 1, 'extra_users_allowed', false, 'monthly_quotes', 5)
    WHEN 'starter' THEN jsonb_build_object('plan', 'starter', 'included_users', 1, 'extra_users_allowed', false, 'monthly_quotes', NULL)
    WHEN 'pro' THEN jsonb_build_object('plan', 'pro', 'included_users', 3, 'extra_users_allowed', true, 'monthly_quotes', NULL)
    WHEN 'enterprise' THEN jsonb_build_object('plan', 'enterprise', 'included_users', 10, 'extra_users_allowed', true, 'monthly_quotes', NULL)
  END
  FROM public.organizations o
  WHERE o.id = p_org
    AND (o.id = public.user_organization_id() OR public.is_platform_admin() OR auth.role() = 'service_role')
$$;
REVOKE ALL ON FUNCTION public.org_plan_limits(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_plan_limits(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_list_organizations(
  p_search TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 25, p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID, name TEXT, slug TEXT, plan TEXT, subscription_status TEXT, current_period_end TIMESTAMPTZ,
  member_count INTEGER, created_at TIMESTAMPTZ, total_count BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  v_pattern TEXT := '%' || replace(replace(replace(COALESCE(btrim(p_search), ''), '\', '\\'), '%', '\%'), '_', '\_') || '%';
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT o.id, o.name, o.slug, o.plan, o.subscription_status, o.current_period_end,
         (SELECT count(*)::integer FROM public.profiles p WHERE p.organization_id = o.id),
         o.created_at, count(*) OVER ()
  FROM public.organizations o
  WHERE o.name ILIKE v_pattern OR o.slug ILIKE v_pattern
  ORDER BY o.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_organizations(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_organizations(TEXT, INTEGER, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_activate_plan(
  p_org UUID, p_plan TEXT, p_users INTEGER, p_months INTEGER, p_amount NUMERIC, p_reference TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org public.organizations%ROWTYPE;
  v_reference TEXT := NULLIF(btrim(COALESCE(p_reference, '')), '');
  v_start TIMESTAMPTZ := now();
  v_end TIMESTAMPTZ;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_plan IS NULL OR p_plan NOT IN ('free', 'starter', 'pro', 'enterprise') THEN RAISE EXCEPTION 'invalid_plan' USING ERRCODE = '22023'; END IF;
  IF p_users IS NULL OR p_users NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'invalid_users' USING ERRCODE = '22023'; END IF;
  IF p_months IS NULL OR p_months NOT BETWEEN 1 AND 12 THEN RAISE EXCEPTION 'invalid_months' USING ERRCODE = '22023'; END IF;
  IF p_amount IS NULL OR p_amount = 'NaN'::numeric OR p_amount < 0 OR p_amount >= 100000000 THEN RAISE EXCEPTION 'invalid_amount' USING ERRCODE = '22023'; END IF;
  IF length(v_reference) > 120 OR (p_plan <> 'free' AND v_reference IS NULL) THEN
    RAISE EXCEPTION 'invalid_reference' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_org FROM public.organizations WHERE id = p_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'org_not_found' USING ERRCODE = 'P0002'; END IF;

  IF p_plan <> 'free' THEN
    v_start := GREATEST(now(), COALESCE(v_org.current_period_end, now()));
    v_end := v_start + make_interval(months => p_months);
  END IF;

  UPDATE public.organizations
  SET plan = p_plan,
      subscription_status = 'active',
      current_period_end = v_end,
      billing_provider = CASE WHEN p_plan = 'free' THEN NULL ELSE 'mercadopago_manual' END,
      billing_reference = v_reference,
      updated_at = now()
  WHERE id = p_org;

  INSERT INTO public.plan_activations (organization_id, action, previous_plan, new_plan, users_billed, months,
    amount, reference, period_start, period_end, activated_by)
  VALUES (p_org, 'activate', v_org.plan, p_plan, p_users,
    CASE WHEN p_plan = 'free' THEN NULL ELSE p_months END,
    CASE WHEN p_plan = 'free' THEN 0 ELSE round(p_amount, 2) END,
    v_reference, v_start, v_end, auth.uid());

  RETURN jsonb_build_object('organization_id', p_org, 'plan', p_plan, 'current_period_end', v_end);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_activate_plan(UUID, TEXT, INTEGER, INTEGER, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_activate_plan(UUID, TEXT, INTEGER, INTEGER, NUMERIC, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_suspend_plan(p_org UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org public.organizations%ROWTYPE;
  v_reason TEXT := btrim(COALESCE(p_reason, ''));
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF length(v_reason) NOT BETWEEN 3 AND 300 THEN RAISE EXCEPTION 'invalid_reason' USING ERRCODE = '22023'; END IF;

  SELECT * INTO v_org FROM public.organizations WHERE id = p_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'org_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_org.plan = 'free' THEN RAISE EXCEPTION 'free_plan_not_suspendable' USING ERRCODE = '22023'; END IF;

  UPDATE public.organizations
  SET subscription_status = 'canceled', current_period_end = now(), updated_at = now()
  WHERE id = p_org;

  INSERT INTO public.plan_activations (organization_id, action, previous_plan, new_plan, reason, period_end, activated_by)
  VALUES (p_org, 'suspend', v_org.plan, v_org.plan, v_reason, now(), auth.uid());

  RETURN jsonb_build_object('organization_id', p_org, 'plan', v_org.plan, 'current_period_end', now());
END;
$$;
REVOKE ALL ON FUNCTION public.admin_suspend_plan(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_suspend_plan(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_plan_activations(p_org UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID, action TEXT, previous_plan TEXT, new_plan TEXT, users_billed INTEGER, months INTEGER,
  amount NUMERIC, reference TEXT, reason TEXT, period_start TIMESTAMPTZ, period_end TIMESTAMPTZ,
  activated_by_email TEXT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT a.id, a.action, a.previous_plan, a.new_plan, a.users_billed, a.months, a.amount, a.reference, a.reason,
         a.period_start, a.period_end, u.email::text, a.created_at
  FROM public.plan_activations a
  LEFT JOIN auth.users u ON u.id = a.activated_by
  WHERE a.organization_id = p_org
  ORDER BY a.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_plan_activations(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_plan_activations(UUID, INTEGER) TO authenticated;

-- ---------------- Parte B: avisos de vencimiento ----------------
-- El contenedor web de producción no recibe la service role: el cron se autentica con el hash de CRON_SECRET.

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_settings FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;

CREATE TABLE IF NOT EXISTS public.billing_notices (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_end TIMESTAMPTZ NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('d7', 'd3', 'd1', 'd0')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, period_end, kind)
);
ALTER TABLE public.billing_notices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_notices FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.billing_notices TO service_role;

CREATE OR REPLACE FUNCTION public.cron_key_valid(p_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_key IS NOT NULL AND length(p_key) >= 32 AND EXISTS (
    SELECT 1 FROM public.platform_settings s
    WHERE s.key = 'cron_key_sha256' AND s.value = encode(extensions.digest(p_key, 'sha256'), 'hex')
  )
$$;
REVOKE ALL ON FUNCTION public.cron_key_valid(TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.billing_notices_due(p_cron_key TEXT)
RETURNS TABLE (
  organization_id UUID, organization_name TEXT, plan TEXT, current_period_end TIMESTAMPTZ,
  owner_email TEXT, owner_name TEXT, sent_kinds TEXT[]
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.cron_key_valid(p_cron_key) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT o.id, o.name, o.plan, o.current_period_end, own.email, own.full_name,
         COALESCE((SELECT array_agg(n.kind ORDER BY n.kind) FROM public.billing_notices n
                   WHERE n.organization_id = o.id AND n.period_end = o.current_period_end), ARRAY[]::text[])
  FROM public.organizations o
  LEFT JOIN LATERAL (
    SELECT p.email, p.full_name FROM public.profiles p
    WHERE p.organization_id = o.id AND p.role = 'owner'
    ORDER BY p.created_at LIMIT 1
  ) own ON true
  WHERE o.plan <> 'free'
    AND o.current_period_end IS NOT NULL
    AND o.current_period_end BETWEEN now() - interval '3 days' AND now() + interval '7 days'
  ORDER BY o.current_period_end
  LIMIT 500;
END;
$$;
REVOKE ALL ON FUNCTION public.billing_notices_due(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_notices_due(TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_billing_notice(p_cron_key TEXT, p_org UUID, p_period_end TIMESTAMPTZ, p_kind TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.cron_key_valid(p_cron_key) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  -- A stale or foreign period would create a claim that billing_notices_due never reports back.
  PERFORM 1 FROM public.organizations
  WHERE id = p_org AND plan <> 'free' AND current_period_end = p_period_end;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.billing_notices (organization_id, period_end, kind)
  VALUES (p_org, p_period_end, p_kind)
  ON CONFLICT DO NOTHING;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_billing_notice(TEXT, UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_billing_notice(TEXT, UUID, TIMESTAMPTZ, TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.release_billing_notice(p_cron_key TEXT, p_org UUID, p_period_end TIMESTAMPTZ, p_kind TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.cron_key_valid(p_cron_key) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.billing_notices
  WHERE organization_id = p_org AND period_end = p_period_end AND kind = p_kind;
END;
$$;
REVOKE ALL ON FUNCTION public.release_billing_notice(TEXT, UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_billing_notice(TEXT, UUID, TIMESTAMPTZ, TEXT) TO anon, authenticated, service_role;

-- ---------------- Parte C: cron de recordatorios al cliente ----------------
-- Mismo criterio que la parte B: sin service role en el contenedor web; la llave del cron se valida por hash.
-- Una cuenta vencida queda en solo lectura y no envía avisos a sus clientes (org_is_writable).
-- La lista de tipos debe coincidir con CLIENT_NOTIFIABLE_TYPES de lib/reminders/client-notice.ts.

CREATE OR REPLACE FUNCTION public.client_reminders_due(p_cron_key TEXT, p_until DATE)
RETURNS TABLE (
  id UUID, reminder_type TEXT, scheduled_date DATE, notification_channels TEXT[],
  client_name TEXT, client_email TEXT, client_phone TEXT, client_whatsapp_phone TEXT,
  organization_name TEXT, organization_settings JSONB
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.cron_key_valid(p_cron_key) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT r.id, r.reminder_type, r.scheduled_date, r.notification_channels,
         c.name, c.email, c.phone, c.whatsapp_phone, o.name, o.settings
  FROM public.follow_up_reminders r
  JOIN public.clients c ON c.id = r.client_id
  JOIN public.organizations o ON o.id = r.organization_id
  WHERE r.auto_send_notification
    AND r.status = 'pending'
    AND r.notification_sent_at IS NULL
    AND r.reminder_type IN ('maintenance', 'renewal')
    AND r.scheduled_date <= p_until
    -- Un rezago viejo (p. ej. al renovar una cuenta vencida) no se manda de golpe; queda pendiente y visible.
    AND r.scheduled_date >= p_until - 3
    AND public.org_is_writable(r.organization_id)
  ORDER BY r.scheduled_date, r.id
  LIMIT 500;
END;
$$;
REVOKE ALL ON FUNCTION public.client_reminders_due(TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_reminders_due(TEXT, DATE) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.mark_client_reminder_sent(p_cron_key TEXT, p_id UUID, p_sent_at TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.cron_key_valid(p_cron_key) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  -- Mismos filtros de fila que client_reminders_due. Sin fecha ni org_is_writable: si el aviso ya salió, se marca
  -- aunque la cuenta venza a media corrida, para no reenviarlo al renovar.
  UPDATE public.follow_up_reminders
  SET status = 'sent', notification_sent_at = COALESCE(p_sent_at, now())
  WHERE id = p_id
    AND auto_send_notification
    AND status = 'pending'
    AND notification_sent_at IS NULL
    AND reminder_type IN ('maintenance', 'renewal');
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_client_reminder_sent(TEXT, UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_client_reminder_sent(TEXT, UUID, TIMESTAMPTZ) TO anon, authenticated, service_role;
