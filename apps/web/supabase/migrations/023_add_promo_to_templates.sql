ALTER TABLE quote_templates
  ADD COLUMN IF NOT EXISTS promotional_label TEXT,
  ADD COLUMN IF NOT EXISTS promotional_valid_until DATE;
