-- Migration 031: Add March 2026 demo payments so income analytics shows current-month data
-- Without this, the IncomeAnalytics component shows $0 for March because all seed payments
-- are dated January–February 2026.

-- Use COT-2026-017 (cobrado, quote id 00000000-0000-0000-0009-000000000007, total 15000)
-- and COT-2026-018 (completado, quote id 00000000-0000-0000-0009-000000000008, total 30000)
-- Only insert if they don't already exist (idempotent)

INSERT INTO quote_payments (id, organization_id, quote_id, amount, payment_type, payment_method, payment_date, notes, received_by)
SELECT * FROM (VALUES
  (
    '00000000-0000-0000-0008-000000000101'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0009-000000000007'::uuid,
    9000.00, 'anticipo', 'transferencia', '2026-03-05'::date,
    'Anticipo marzo El Asador',
    '00000000-0000-0000-0000-000000000001'::uuid
  ),
  (
    '00000000-0000-0000-0008-000000000102'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0009-000000000007'::uuid,
    6000.00, 'liquidacion', 'efectivo', '2026-03-12'::date,
    'Liquidacion marzo El Asador',
    '00000000-0000-0000-0000-000000000001'::uuid
  ),
  (
    '00000000-0000-0000-0008-000000000103'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0009-000000000008'::uuid,
    18000.00, 'anticipo', 'transferencia', '2026-03-10'::date,
    'Anticipo marzo COT-2026-018',
    '00000000-0000-0000-0000-000000000001'::uuid
  )
) AS v(id, organization_id, quote_id, amount, payment_type, payment_method, payment_date, notes, received_by)
WHERE NOT EXISTS (
  SELECT 1 FROM quote_payments WHERE id = v.id
);
