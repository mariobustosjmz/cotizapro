-- ================================================
-- CotizaPro MVP Database Schema
-- Migration: 002_cotizapro_schema.sql
-- Created: 2026-02-13
-- Description: Complete schema for quote management SaaS
-- ================================================

-- ================================================
-- TASK 1: Clients Table
-- ================================================

-- Clients table with multi-tenancy support
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  whatsapp_phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  notes TEXT,
  tags TEXT[], -- Array of tags like "high-value", "regular", etc
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clients in their organization"
  ON clients FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert clients in their organization"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update clients in their organization"
  ON clients FOR UPDATE
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete clients in their organization"
  ON clients FOR DELETE
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- Indexes for clients
CREATE INDEX idx_clients_organization ON clients(organization_id);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_email ON clients(email);

-- Updated_at trigger for clients
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TASK 2: Service Catalog Table
-- ================================================

-- Service catalog table with category-based organization
CREATE TABLE service_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- "hvac", "painting", "plumbing", "electrical", "other"
  description TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  unit_type TEXT NOT NULL, -- "fixed", "per_hour", "per_sqm", "per_unit"
  estimated_duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_category CHECK (category IN ('hvac', 'painting', 'plumbing', 'electrical', 'other')),
  CONSTRAINT valid_unit_type CHECK (unit_type IN ('fixed', 'per_hour', 'per_sqm', 'per_unit'))
);

-- RLS policies for service_catalog
ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view services in their organization"
  ON service_catalog FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage services in their organization"
  ON service_catalog FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Indexes for service_catalog
CREATE INDEX idx_service_catalog_organization ON service_catalog(organization_id);
CREATE INDEX idx_service_catalog_category ON service_catalog(category);
CREATE INDEX idx_service_catalog_active ON service_catalog(is_active) WHERE is_active = true;

-- Updated_at trigger for service_catalog
CREATE TRIGGER update_service_catalog_updated_at
  BEFORE UPDATE ON service_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TASK 3: Quotes and Quote Items Tables
-- ================================================

-- Quotes table with complete quote lifecycle tracking
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL, -- Auto-generated: "COT-2026-001"
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft', -- "draft", "sent", "viewed", "accepted", "rejected", "expired"
  valid_until DATE NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 16.00, -- IVA 16%
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_rate DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  terms_and_conditions TEXT,
  created_by UUID REFERENCES profiles(id),
  sent_at TIMESTAMPTZ,
  sent_via TEXT[], -- ["email", "whatsapp"]
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, quote_number),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'))
);

-- Quote line items
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  service_id UUID REFERENCES service_catalog(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  unit_type TEXT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_unit_type CHECK (unit_type IN ('fixed', 'per_hour', 'per_sqm', 'per_unit'))
);

-- RLS policies for quotes
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quotes in their organization"
  ON quotes FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create quotes in their organization"
  ON quotes FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update quotes in their organization"
  ON quotes FOR UPDATE
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete quotes in their organization"
  ON quotes FOR DELETE
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- RLS policies for quote_items
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quote items"
  ON quote_items FOR SELECT
  TO authenticated
  USING (quote_id IN (
    SELECT id FROM quotes WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage quote items"
  ON quote_items FOR ALL
  TO authenticated
  USING (quote_id IN (
    SELECT id FROM quotes WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- Indexes for quotes
CREATE INDEX idx_quotes_organization ON quotes(organization_id);
CREATE INDEX idx_quotes_client ON quotes(client_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX idx_quotes_number ON quotes(quote_number);

-- Indexes for quote_items
CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX idx_quote_items_service ON quote_items(service_id);
CREATE INDEX idx_quote_items_sort ON quote_items(quote_id, sort_order);

-- Updated_at trigger for quotes
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate quote number: "COT-YYYY-###"
CREATE OR REPLACE FUNCTION generate_quote_number(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  year TEXT;
  count INTEGER;
  quote_num TEXT;
BEGIN
  year := EXTRACT(YEAR FROM NOW())::TEXT;

  SELECT COUNT(*) + 1 INTO count
  FROM quotes
  WHERE organization_id = org_id
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  quote_num := 'COT-' || year || '-' || LPAD(count::TEXT, 3, '0');

  RETURN quote_num;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- TASK 4: Quote Notifications Table
-- ================================================

-- Notifications sent (for tracking WhatsApp/Email sends)
CREATE TABLE quote_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- "email", "whatsapp"
  recipient TEXT NOT NULL,
  status TEXT NOT NULL, -- "sent", "delivered", "failed", "read"
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  CONSTRAINT valid_notification_type CHECK (notification_type IN ('email', 'whatsapp')),
  CONSTRAINT valid_notification_status CHECK (status IN ('sent', 'delivered', 'failed', 'read'))
);

-- RLS policies for quote_notifications
ALTER TABLE quote_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notifications for their quotes"
  ON quote_notifications FOR SELECT
  TO authenticated
  USING (quote_id IN (
    SELECT id FROM quotes WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert notifications for their quotes"
  ON quote_notifications FOR INSERT
  TO authenticated
  WITH CHECK (quote_id IN (
    SELECT id FROM quotes WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- Indexes for quote_notifications
CREATE INDEX idx_quote_notifications_quote ON quote_notifications(quote_id);
CREATE INDEX idx_quote_notifications_status ON quote_notifications(status);
CREATE INDEX idx_quote_notifications_type ON quote_notifications(notification_type);
CREATE INDEX idx_quote_notifications_sent_at ON quote_notifications(sent_at DESC);

-- ================================================
-- COMMENTS & DOCUMENTATION
-- ================================================

COMMENT ON TABLE clients IS 'Customer/client records with multi-tenant isolation';
COMMENT ON TABLE service_catalog IS 'Service catalog with pricing and categories (HVAC, painting, plumbing, electrical)';
COMMENT ON TABLE quotes IS 'Quotes/estimates with automatic numbering and lifecycle tracking';
COMMENT ON TABLE quote_items IS 'Line items for quotes with quantity, price, and subtotal';
COMMENT ON TABLE quote_notifications IS 'Tracking for WhatsApp and email notifications sent for quotes';

COMMENT ON FUNCTION generate_quote_number IS 'Generates sequential quote numbers in format COT-YYYY-###';

-- ================================================
-- END OF MIGRATION
-- ================================================
