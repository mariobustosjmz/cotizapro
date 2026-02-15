-- ================================================
-- Webhooks and Templates System
-- Migration: 004_webhooks_and_templates.sql
-- Created: 2026-02-13
-- Description: Webhook subscriptions and quote templates
-- ================================================

-- ================================================
-- Webhook Subscriptions Table
-- ================================================

CREATE TABLE webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Webhook configuration
  url TEXT NOT NULL,
  event_types TEXT[] NOT NULL, -- ["quote.created", "quote.sent", "quote.accepted", etc.]
  is_active BOOLEAN DEFAULT true,

  -- Security
  secret_key TEXT NOT NULL, -- For signing payloads

  -- Retry configuration
  max_retries INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 60,

  -- Metadata
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_triggered_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_url CHECK (url ~* '^https?://'),
  CONSTRAINT valid_event_types CHECK (array_length(event_types, 1) > 0)
);

-- ================================================
-- Webhook Delivery Logs Table
-- ================================================

CREATE TABLE webhook_delivery_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,

  -- Delivery details
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,

  -- Response tracking
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,

  -- Retry tracking
  attempt_number INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- "pending", "success", "failed", "retrying"

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('pending', 'success', 'failed', 'retrying'))
);

-- ================================================
-- Quote Templates Table
-- ================================================

CREATE TABLE quote_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Template details
  name TEXT NOT NULL,
  description TEXT,

  -- Template content
  default_items JSONB, -- Array of default quote items
  default_notes TEXT,
  default_terms_and_conditions TEXT,
  default_discount_rate DECIMAL(5,2) DEFAULT 0,
  default_valid_days INTEGER DEFAULT 30, -- Validity period in days

  -- Category/type
  category TEXT, -- "hvac", "painting", etc. (optional)

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_discount CHECK (default_discount_rate >= 0 AND default_discount_rate <= 100),
  CONSTRAINT valid_days CHECK (default_valid_days > 0 AND default_valid_days <= 365)
);

-- ================================================
-- RLS Policies
-- ================================================

-- Webhook Subscriptions
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view webhooks in their organization"
  ON webhook_subscriptions FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage webhooks in their organization"
  ON webhook_subscriptions FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Webhook Delivery Logs
ALTER TABLE webhook_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view webhook logs in their organization"
  ON webhook_delivery_logs FOR SELECT
  TO authenticated
  USING (webhook_subscription_id IN (
    SELECT id FROM webhook_subscriptions
    WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- Quote Templates
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates in their organization"
  ON quote_templates FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage templates in their organization"
  ON quote_templates FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- ================================================
-- Indexes
-- ================================================

CREATE INDEX idx_webhook_subscriptions_organization ON webhook_subscriptions(organization_id);
CREATE INDEX idx_webhook_subscriptions_active ON webhook_subscriptions(is_active) WHERE is_active = true;

CREATE INDEX idx_webhook_logs_subscription ON webhook_delivery_logs(webhook_subscription_id);
CREATE INDEX idx_webhook_logs_status ON webhook_delivery_logs(status);
CREATE INDEX idx_webhook_logs_retry ON webhook_delivery_logs(next_retry_at) WHERE status = 'retrying';

CREATE INDEX idx_quote_templates_organization ON quote_templates(organization_id);
CREATE INDEX idx_quote_templates_category ON quote_templates(category);
CREATE INDEX idx_quote_templates_active ON quote_templates(is_active) WHERE is_active = true;

-- ================================================
-- Triggers
-- ================================================

CREATE TRIGGER update_webhook_subscriptions_updated_at
  BEFORE UPDATE ON webhook_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_templates_updated_at
  BEFORE UPDATE ON quote_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Functions
-- ================================================

-- Function to increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE quote_templates
  SET usage_count = usage_count + 1
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending webhook deliveries for retry
CREATE OR REPLACE FUNCTION get_pending_webhook_deliveries()
RETURNS TABLE (
  id UUID,
  webhook_subscription_id UUID,
  event_type TEXT,
  payload JSONB,
  attempt_number INTEGER,
  max_attempts INTEGER,
  url TEXT,
  secret_key TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wdl.id,
    wdl.webhook_subscription_id,
    wdl.event_type,
    wdl.payload,
    wdl.attempt_number,
    wdl.max_attempts,
    ws.url,
    ws.secret_key
  FROM webhook_delivery_logs wdl
  JOIN webhook_subscriptions ws ON ws.id = wdl.webhook_subscription_id
  WHERE wdl.status IN ('pending', 'retrying')
    AND ws.is_active = true
    AND (wdl.next_retry_at IS NULL OR wdl.next_retry_at <= NOW())
  ORDER BY wdl.created_at ASC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Comments
-- ================================================

COMMENT ON TABLE webhook_subscriptions IS 'Webhook subscriptions for external integrations. Allows organizations to receive real-time notifications of events.';
COMMENT ON TABLE webhook_delivery_logs IS 'Logs of all webhook delivery attempts, including retries and failures.';
COMMENT ON TABLE quote_templates IS 'Reusable quote templates with pre-configured items, notes, and terms.';
COMMENT ON FUNCTION increment_template_usage IS 'Increments usage count when a template is used to create a quote.';
COMMENT ON FUNCTION get_pending_webhook_deliveries IS 'Returns pending webhook deliveries that need to be sent or retried.';
