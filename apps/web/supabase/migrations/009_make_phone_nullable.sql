-- Make phone field nullable in clients table
-- Phone should be optional, not required

ALTER TABLE clients
  ALTER COLUMN phone DROP NOT NULL;

-- Add comment to document this change
COMMENT ON COLUMN clients.phone IS 'Client phone number (optional)';
