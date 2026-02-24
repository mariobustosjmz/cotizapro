-- Sprint 1: Extend quote status enum with installation workflow statuses
-- New statuses: en_instalacion, completado, cobrado (additive, retrocompatible)

-- Drop constraint under either possible name (idempotent)
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check
  CHECK (status IN (
    'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired',
    'en_instalacion', 'completado', 'cobrado'
  ));
