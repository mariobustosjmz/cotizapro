-- Custom field definitions per org per entity type
CREATE TABLE custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('client', 'service', 'quote')),
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (
    field_type IN ('text', 'textarea', 'number', 'date', 'select', 'checkbox', 'url', 'phone', 'email')
  ),
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  options JSONB,
  placeholder TEXT,
  default_value TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, entity_type, field_key)
);

CREATE INDEX idx_custom_field_definitions_org ON custom_field_definitions(organization_id);
CREATE INDEX idx_custom_field_definitions_entity ON custom_field_definitions(organization_id, entity_type);

ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_read_fields" ON custom_field_definitions FOR SELECT
  USING (organization_id::text = auth.jwt()->>'organization_id');

CREATE POLICY "org_admins_manage_fields" ON custom_field_definitions FOR ALL
  USING (organization_id::text = auth.jwt()->>'organization_id')
  WITH CHECK (organization_id::text = auth.jwt()->>'organization_id');
