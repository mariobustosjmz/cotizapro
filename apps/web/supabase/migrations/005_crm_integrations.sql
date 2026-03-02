-- ================================================
-- CRM Integrations System
-- Migration: 005_crm_integrations.sql
-- Created: 2026-02-13
-- Description: CRM integration connectors and sync system
-- ================================================

-- ================================================
-- CRM Connections Table
-- ================================================

CREATE TABLE crm_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- CRM Provider
  provider TEXT NOT NULL, -- "salesforce", "hubspot", "zoho", "pipedrive", "custom"
  provider_display_name TEXT NOT NULL,

  -- Authentication
  auth_type TEXT NOT NULL, -- "oauth2", "api_key", "basic"
  access_token TEXT,
  refresh_token TEXT,
  api_key TEXT,
  api_secret TEXT,
  instance_url TEXT, -- For Salesforce, etc.
  expires_at TIMESTAMPTZ,

  -- Configuration
  config JSONB DEFAULT '{}', -- Provider-specific config
  field_mappings JSONB, -- Maps CotizaPro fields to CRM fields

  -- Sync settings
  sync_enabled BOOLEAN DEFAULT true,
  sync_direction TEXT DEFAULT 'bidirectional', -- "to_crm", "from_crm", "bidirectional"
  sync_entities TEXT[] DEFAULT ARRAY['contacts', 'opportunities'], -- What to sync
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'active', -- "active", "error", "disabled"
  last_error TEXT,

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_provider CHECK (provider IN ('salesforce', 'hubspot', 'zoho', 'pipedrive', 'custom')),
  CONSTRAINT valid_auth_type CHECK (auth_type IN ('oauth2', 'api_key', 'basic')),
  CONSTRAINT valid_sync_direction CHECK (sync_direction IN ('to_crm', 'from_crm', 'bidirectional')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'error', 'disabled'))
);

-- ================================================
-- CRM Sync Logs Table
-- ================================================

CREATE TABLE crm_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crm_connection_id UUID NOT NULL REFERENCES crm_connections(id) ON DELETE CASCADE,

  -- Sync details
  sync_type TEXT NOT NULL, -- "full", "incremental"
  direction TEXT NOT NULL, -- "to_crm", "from_crm"
  entity_type TEXT NOT NULL, -- "contacts", "opportunities", etc.

  -- Results
  status TEXT NOT NULL, -- "success", "partial", "failed"
  records_processed INTEGER DEFAULT 0,
  records_synced INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Error tracking
  errors JSONB, -- Array of error objects

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Constraints
  CONSTRAINT valid_sync_type CHECK (sync_type IN ('full', 'incremental')),
  CONSTRAINT valid_sync_direction CHECK (direction IN ('to_crm', 'from_crm')),
  CONSTRAINT valid_sync_status CHECK (status IN ('success', 'partial', 'failed'))
);

-- ================================================
-- CRM Entity Mappings Table
-- ================================================

CREATE TABLE crm_entity_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crm_connection_id UUID NOT NULL REFERENCES crm_connections(id) ON DELETE CASCADE,

  -- Local entity
  entity_type TEXT NOT NULL, -- "client", "quote", "reminder"
  entity_id UUID NOT NULL,

  -- CRM entity
  crm_entity_type TEXT NOT NULL, -- "Contact", "Opportunity", etc.
  crm_entity_id TEXT NOT NULL,
  crm_entity_url TEXT,

  -- Sync metadata
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_hash TEXT, -- Hash of data to detect changes

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_entity_type CHECK (entity_type IN ('client', 'quote', 'reminder')),
  UNIQUE(crm_connection_id, entity_type, entity_id),
  UNIQUE(crm_connection_id, crm_entity_type, crm_entity_id)
);

-- ================================================
-- RLS Policies
-- ================================================

-- CRM Connections
ALTER TABLE crm_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view CRM connections in their organization"
  ON crm_connections FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage CRM connections in their organization"
  ON crm_connections FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- CRM Sync Logs
ALTER TABLE crm_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sync logs in their organization"
  ON crm_sync_logs FOR SELECT
  TO authenticated
  USING (crm_connection_id IN (
    SELECT id FROM crm_connections
    WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- CRM Entity Mappings
ALTER TABLE crm_entity_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view entity mappings in their organization"
  ON crm_entity_mappings FOR SELECT
  TO authenticated
  USING (crm_connection_id IN (
    SELECT id FROM crm_connections
    WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- ================================================
-- Indexes
-- ================================================

CREATE INDEX idx_crm_connections_organization ON crm_connections(organization_id);
CREATE INDEX idx_crm_connections_provider ON crm_connections(provider);
CREATE INDEX idx_crm_connections_status ON crm_connections(status);

CREATE INDEX idx_crm_sync_logs_connection ON crm_sync_logs(crm_connection_id);
CREATE INDEX idx_crm_sync_logs_status ON crm_sync_logs(status);
CREATE INDEX idx_crm_sync_logs_started ON crm_sync_logs(started_at DESC);

CREATE INDEX idx_crm_mappings_connection ON crm_entity_mappings(crm_connection_id);
CREATE INDEX idx_crm_mappings_entity ON crm_entity_mappings(entity_type, entity_id);
CREATE INDEX idx_crm_mappings_crm_entity ON crm_entity_mappings(crm_entity_type, crm_entity_id);

-- ================================================
-- Triggers
-- ================================================

CREATE TRIGGER update_crm_connections_updated_at
  BEFORE UPDATE ON crm_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_entity_mappings_updated_at
  BEFORE UPDATE ON crm_entity_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Functions
-- ================================================

-- Function to get CRM connection by provider
CREATE OR REPLACE FUNCTION get_crm_connection(org_id UUID, provider_name TEXT)
RETURNS TABLE (
  id UUID,
  provider TEXT,
  access_token TEXT,
  instance_url TEXT,
  field_mappings JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    crm_connections.id,
    crm_connections.provider,
    crm_connections.access_token,
    crm_connections.instance_url,
    crm_connections.field_mappings
  FROM crm_connections
  WHERE organization_id = org_id
    AND provider = provider_name
    AND status = 'active'
    AND sync_enabled = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to log sync results
CREATE OR REPLACE FUNCTION log_crm_sync(
  connection_id UUID,
  sync_type_val TEXT,
  direction_val TEXT,
  entity_type_val TEXT,
  status_val TEXT,
  processed INTEGER,
  synced INTEGER,
  failed INTEGER,
  errors_val JSONB
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
  duration INTEGER;
BEGIN
  duration := EXTRACT(EPOCH FROM (NOW() - (SELECT started_at FROM crm_sync_logs WHERE crm_connection_id = connection_id ORDER BY started_at DESC LIMIT 1)));

  INSERT INTO crm_sync_logs (
    crm_connection_id,
    sync_type,
    direction,
    entity_type,
    status,
    records_processed,
    records_synced,
    records_failed,
    errors,
    completed_at,
    duration_seconds
  ) VALUES (
    connection_id,
    sync_type_val,
    direction_val,
    entity_type_val,
    status_val,
    processed,
    synced,
    failed,
    errors_val,
    NOW(),
    COALESCE(duration, 0)
  )
  RETURNING id INTO log_id;

  -- Update last_sync_at on connection
  UPDATE crm_connections
  SET last_sync_at = NOW()
  WHERE id = connection_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Comments
-- ================================================

COMMENT ON TABLE crm_connections IS 'CRM integration connections for syncing data with external CRM systems.';
COMMENT ON TABLE crm_sync_logs IS 'Logs of all CRM sync operations for auditing and troubleshooting.';
COMMENT ON TABLE crm_entity_mappings IS 'Maps local entities (clients, quotes) to CRM entities (Contacts, Opportunities).';
COMMENT ON FUNCTION get_crm_connection IS 'Retrieves active CRM connection for a given organization and provider.';
COMMENT ON FUNCTION log_crm_sync IS 'Logs the results of a CRM sync operation.';
