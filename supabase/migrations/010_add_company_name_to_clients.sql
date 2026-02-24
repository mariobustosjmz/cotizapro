-- Add company_name to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Update demo seed data with company names for individual contacts
UPDATE clients SET company_name = 'ClimaSol HVAC'
WHERE id = '00000000-0000-0000-0002-000000000001';
UPDATE clients SET company_name = 'Torres Mora Construcciones'
WHERE id = '00000000-0000-0000-0002-000000000005';
UPDATE clients SET company_name = 'González & Asociados Monterrey'
WHERE id = '00000000-0000-0000-0002-000000000009';

-- Index for search performance
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients (organization_id, company_name)
WHERE company_name IS NOT NULL;
