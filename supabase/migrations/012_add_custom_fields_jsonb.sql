-- Add custom_fields JSONB columns to entity tables
ALTER TABLE clients ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE service_catalog ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE quotes ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;

-- GIN indexes for JSONB querying
CREATE INDEX idx_clients_custom_fields ON clients USING GIN(custom_fields);
CREATE INDEX idx_services_custom_fields ON service_catalog USING GIN(custom_fields);
CREATE INDEX idx_quotes_custom_fields ON quotes USING GIN(custom_fields);
