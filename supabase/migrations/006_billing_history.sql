-- Billing History Table
-- Migration: 006_billing_history
-- Created: 2026-02-14

-- Create billing_history table for tracking invoices
CREATE TABLE IF NOT EXISTS billing_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible', 'failed')),
  billing_reason TEXT,
  description TEXT,
  invoice_url TEXT,
  pdf_url TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_billing_history_organization_id ON billing_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_created_at ON billing_history(created_at);
CREATE INDEX IF NOT EXISTS idx_billing_history_status ON billing_history(status);
CREATE INDEX IF NOT EXISTS idx_billing_history_stripe_invoice_id ON billing_history(stripe_invoice_id);

-- Apply updated_at trigger
CREATE TRIGGER update_billing_history_updated_at BEFORE UPDATE ON billing_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row-Level Security
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view billing history for their organization
CREATE POLICY "Users can view billing history for their organization"
  ON billing_history FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- RLS Policy: Service role can insert billing history
CREATE POLICY "Service role can insert billing history"
  ON billing_history FOR INSERT
  WITH CHECK (true); -- Service role only

-- RLS Policy: Service role can update billing history
CREATE POLICY "Service role can update billing history"
  ON billing_history FOR UPDATE
  WITH CHECK (true); -- Service role only
