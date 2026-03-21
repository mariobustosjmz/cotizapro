-- Add settings JSONB column to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Also add settings API route support
COMMENT ON COLUMN organizations.settings IS 'Organization-level settings: company_address, company_phone, company_email, quote_terms, quote_valid_days, tax_rate, logo_url, brand_color';
