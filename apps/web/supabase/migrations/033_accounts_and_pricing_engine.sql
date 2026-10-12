-- Migration 033: account types, trade templates and configurable pricing engine
-- Spec: docs/superpowers/specs/2026-10-11-cotizapro-plataforma-design.md (sections 2.1, 2.2)

-- ------------------------------------------------------------
-- Organizations: account type, trade, onboarding
-- ------------------------------------------------------------
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS trade TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_account_type_check;
ALTER TABLE organizations
  ADD CONSTRAINT organizations_account_type_check CHECK (account_type IN ('person', 'group', 'company'));

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_trade_check;
ALTER TABLE organizations
  ADD CONSTRAINT organizations_trade_check
  CHECK (trade IS NULL OR trade IN ('glass', 'plumbing', 'electrical', 'hvac', 'sewing', 'general'));

-- ------------------------------------------------------------
-- Price lists (shared by configurable products)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  unit TEXT NOT NULL CHECK (unit IN ('sqm', 'lm', 'unit', 'hour', 'fixed')),
  dimensions TEXT[] NOT NULL CHECK (array_length(dimensions, 1) BETWEEN 1 AND 4),
  rows JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(rows) = 'array'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_lists_org ON price_lists(organization_id) WHERE is_active;

DROP TRIGGER IF EXISTS update_price_lists_updated_at ON price_lists;
CREATE TRIGGER update_price_lists_updated_at
  BEFORE UPDATE ON price_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view price lists" ON price_lists;
CREATE POLICY "Members can view price lists"
  ON price_lists FOR SELECT
  TO authenticated
  USING (organization_id = public.user_organization_id());

DROP POLICY IF EXISTS "Admins can manage price lists" ON price_lists;
CREATE POLICY "Admins can manage price lists"
  ON price_lists FOR ALL
  TO authenticated
  USING (
    organization_id = public.user_organization_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  )
  WITH CHECK (
    organization_id = public.user_organization_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- ------------------------------------------------------------
-- Service catalog: configurable product definition, open categories
-- ------------------------------------------------------------
ALTER TABLE service_catalog ADD COLUMN IF NOT EXISTS pricing_blocks JSONB;
ALTER TABLE service_catalog DROP CONSTRAINT IF EXISTS valid_category;
ALTER TABLE service_catalog
  ADD CONSTRAINT valid_category CHECK (char_length(category) BETWEEN 1 AND 40);

ALTER TABLE service_catalog DROP CONSTRAINT IF EXISTS valid_unit_type;
ALTER TABLE service_catalog
  ADD CONSTRAINT valid_unit_type CHECK (unit_type IN ('fixed', 'per_hour', 'per_sqm', 'per_unit', 'per_lm'));

ALTER TABLE service_catalog DROP CONSTRAINT IF EXISTS service_catalog_pricing_blocks_object;
ALTER TABLE service_catalog
  ADD CONSTRAINT service_catalog_pricing_blocks_object
  CHECK (pricing_blocks IS NULL OR jsonb_typeof(pricing_blocks) = 'object');

-- ------------------------------------------------------------
-- Quote items: engine input, breakdown and frozen pricing snapshot
-- ------------------------------------------------------------
ALTER TABLE quote_items
  ADD COLUMN IF NOT EXISTS input JSONB,
  ADD COLUMN IF NOT EXISTS breakdown JSONB,
  ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB;

ALTER TABLE quote_items DROP CONSTRAINT IF EXISTS valid_unit_type;
ALTER TABLE quote_items
  ADD CONSTRAINT valid_unit_type CHECK (unit_type IN ('fixed', 'per_hour', 'per_sqm', 'per_unit', 'per_lm'));

COMMENT ON COLUMN service_catalog.pricing_blocks IS 'ProductDefinition of @cotizapro/quoting. NULL = simple unit pricing.';
COMMENT ON COLUMN quote_items.breakdown IS 'QuoteLineResult computed server-side by @cotizapro/quoting at save time.';
COMMENT ON COLUMN quote_items.pricing_snapshot IS 'Product definition and price lists used, frozen at save time.';
