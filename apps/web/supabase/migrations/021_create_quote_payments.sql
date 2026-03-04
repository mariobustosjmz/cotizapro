-- Create quote_payments table for tracking payments against quotes
CREATE TABLE quote_payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_id         UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  amount           NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_type     TEXT NOT NULL CHECK (payment_type IN ('anticipo','parcial','liquidacion')),
  payment_method   TEXT NOT NULL CHECK (payment_method IN ('efectivo','transferencia','cheque','otro')),
  payment_date     DATE NOT NULL,
  notes            TEXT,
  received_by      UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE quote_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Organization members can view payments
CREATE POLICY "org members can view payments"
  ON quote_payments FOR SELECT
  USING (organization_id = user_organization_id());

-- RLS Policy: Organization members can insert payments
CREATE POLICY "org members can insert payments"
  ON quote_payments FOR INSERT
  WITH CHECK (organization_id = user_organization_id());

-- RLS Policy: Organization admins/owners can delete payments
CREATE POLICY "org admins can delete payments"
  ON quote_payments FOR DELETE
  USING (
    organization_id = user_organization_id()
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('owner','admin')
  );

-- Create indexes for common queries
CREATE INDEX idx_quote_payments_quote_id ON quote_payments(quote_id);
CREATE INDEX idx_quote_payments_org_id ON quote_payments(organization_id);
CREATE INDEX idx_quote_payments_payment_date ON quote_payments(payment_date);
