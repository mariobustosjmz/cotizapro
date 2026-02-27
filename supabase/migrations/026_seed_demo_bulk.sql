-- Migration: 026_seed_demo_bulk.sql
-- Purpose: Bulk seed data for ClimaSol demo — realistic volume for all modules
--   - 12 new quotes spanning Oct 2025 – Feb 2026 (various statuses)
--   - 30+ quote_payments across 5 months (analytics depth)
--   - 20+ work_events dense in current/next week (calendar realism)
--   - 3 new templates with rich default_items
-- Idempotent: DELETE by fixed UUID prefix, then INSERT
--
-- Profile ID: 00000000-0000-0000-0000-000000000001
-- Org ID:     00000000-0000-0000-0000-000000000002

-- ============================================================
-- 0. CLEANUP (idempotent)
-- ============================================================
DELETE FROM quote_payments WHERE id::text LIKE '00000000-0000-0000-0007-%';
DELETE FROM work_events WHERE id::text LIKE '00000000-0000-0000-0008-%';
DELETE FROM quote_items WHERE quote_id::text LIKE '00000000-0000-0000-0009-%';
DELETE FROM quotes WHERE id::text LIKE '00000000-0000-0000-0009-%';
DELETE FROM quote_templates WHERE id::text LIKE '00000000-0000-0000-000a-%';

-- ============================================================
-- 1. NEW QUOTES (12 quotes across 5 months)
-- ============================================================

-- Oct 2025: 2 cobrado (old completed work)
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, subtotal, tax_rate, tax_amount, total, valid_until, notes, created_by, created_at) VALUES
  ('00000000-0000-0000-0009-000000000001',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000005',
   'COT-2025-006', 'cobrado',
   15517.24, 16, 2482.76, 18000.00,
   '2025-11-15',
   'Instalación 2 minisplits oficinas Torres Mora. Cobrado.',
   '00000000-0000-0000-0000-000000000001',
   '2025-10-05'),
  ('00000000-0000-0000-0009-000000000002',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000006',
   'COT-2025-007', 'cobrado',
   6896.55, 16, 1103.45, 8000.00,
   '2025-11-10',
   'Mantenimiento y recarga gas Clínica Dental. Cobrado total.',
   '00000000-0000-0000-0000-000000000001',
   '2025-10-20');

-- Nov 2025: 2 (1 cobrado, 1 completado)
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, subtotal, tax_rate, tax_amount, total, valid_until, notes, created_by, created_at) VALUES
  ('00000000-0000-0000-0009-000000000003',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000007',
   'COT-2025-008', 'cobrado',
   51724.14, 16, 8275.86, 60000.00,
   '2025-12-20',
   'Sistema VRF Centro Comercial Perinorte ala norte. Cobrado.',
   '00000000-0000-0000-0000-000000000001',
   '2025-11-10'),
  ('00000000-0000-0000-0009-000000000004',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000009',
   'COT-2025-009', 'completado',
   10344.83, 16, 1655.17, 12000.00,
   '2025-12-15',
   'Diagnóstico + reparación González & Asociados. Trabajo terminado, pendiente cobro.',
   '00000000-0000-0000-0000-000000000001',
   '2025-11-25');

-- Dec 2025: 2 (1 cobrado, 1 en_instalacion)
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, subtotal, tax_rate, tax_amount, total, valid_until, notes, created_by, created_at) VALUES
  ('00000000-0000-0000-0009-000000000005',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000001',
   'COT-2025-010', 'cobrado',
   3448.28, 16, 551.72, 4000.00,
   '2026-01-20',
   'Mantenimiento preventivo semestral María González. Cobrado.',
   '00000000-0000-0000-0000-000000000001',
   '2025-12-05'),
  ('00000000-0000-0000-0009-000000000006',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000004',
   'COT-2025-011', 'en_instalacion',
   34482.76, 16, 5517.24, 40000.00,
   '2026-02-01',
   'Ampliación sistema AC Hotel Las Palmas, nuevas suites piso 3.',
   '00000000-0000-0000-0000-000000000001',
   '2025-12-18');

-- Jan 2026: 3 (1 cobrado, 1 completado, 1 sent)
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, subtotal, tax_rate, tax_amount, total, valid_until, notes, created_by, created_at) VALUES
  ('00000000-0000-0000-0009-000000000007',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000003',
   'COT-2026-017', 'cobrado',
   12931.03, 16, 2068.97, 15000.00,
   '2026-03-01',
   'Extractor campana industrial + ductos El Asador del Río. Cobrado.',
   '00000000-0000-0000-0000-000000000001',
   '2026-01-10'),
  ('00000000-0000-0000-0009-000000000008',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000010',
   'COT-2026-018', 'completado',
   25862.07, 16, 4137.93, 30000.00,
   '2026-03-10',
   'Mantenimiento anual 8 equipos Colegio Montessori. Trabajo terminado.',
   '00000000-0000-0000-0000-000000000001',
   '2026-01-18'),
  ('00000000-0000-0000-0009-000000000009',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000008',
   'COT-2026-019', 'sent',
   86206.90, 16, 13793.10, 100000.00,
   '2026-03-15',
   'Proyecto completo edificio Plaza Norte: 12 equipos + ductos + control centralizado.',
   '00000000-0000-0000-0000-000000000001',
   '2026-01-28');

-- Feb 2026: 3 (1 accepted, 1 draft, 1 en_instalacion)
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, subtotal, tax_rate, tax_amount, total, valid_until, notes, created_by, created_at) VALUES
  ('00000000-0000-0000-0009-000000000010',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000002',
   'COT-2026-020', 'accepted',
   37931.03, 16, 6068.97, 44000.00,
   '2026-04-01',
   'Reemplazo equipos obsoletos Corporativo Noreste pisos 1-2.',
   '00000000-0000-0000-0000-000000000001',
   '2026-02-10'),
  ('00000000-0000-0000-0009-000000000011',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000006',
   'COT-2026-021', 'draft',
   20689.66, 16, 3310.34, 24000.00,
   '2026-04-15',
   'Propuesta ampliación sistema AC Clínica Dental — 3 consultorios nuevos.',
   '00000000-0000-0000-0000-000000000001',
   '2026-02-20'),
  ('00000000-0000-0000-0009-000000000012',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000009',
   'COT-2026-022', 'en_instalacion',
   17241.38, 16, 2758.62, 20000.00,
   '2026-04-01',
   'Instalación central González & Asociados Monterrey — sala juntas + dirección.',
   '00000000-0000-0000-0000-000000000001',
   '2026-02-15');

-- ============================================================
-- 2. QUOTE ITEMS for all 12 new quotes
-- ============================================================

-- Quote 01 (COT-2025-006) Torres Mora — 2 minisplits
INSERT INTO quote_items (id, quote_id, service_id, description, quantity, unit_price, unit_type, subtotal) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000001', '00000000-0000-0000-0001-000000000002', 'Minisplit 12,000 BTU oficina principal', 1, 7200.00, 'per_unit', 7200.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000001', '00000000-0000-0000-0001-000000000001', 'Minisplit 9,000 BTU sala reuniones', 1, 5800.00, 'per_unit', 5800.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000001', '00000000-0000-0000-0001-000000000005', 'Instalación equipo 9K', 1, 4500.00, 'fixed', 4500.00);

-- Quote 02 (COT-2025-007) Clínica Dental — mantenimiento
INSERT INTO quote_items (id, quote_id, service_id, description, quantity, unit_price, unit_type, subtotal) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000002', '00000000-0000-0000-0001-000000000009', 'Mantenimiento preventivo 3 equipos', 3, 750.00, 'fixed', 2250.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000002', '00000000-0000-0000-0001-000000000012', 'Recarga gas R-410A', 3, 850.00, 'per_unit', 2550.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000002', '00000000-0000-0000-0001-000000000010', 'Limpieza profunda espuma', 3, 600.00, 'fixed', 1800.00);

-- Quote 03 (COT-2025-008) Perinorte — VRF
INSERT INTO quote_items (id, quote_id, service_id, description, quantity, unit_price, unit_type, subtotal) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000003', '00000000-0000-0000-0001-000000000014', 'VRF comercial ala norte', 1, 45000.00, 'per_unit', 45000.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000003', NULL, 'Ductos y canalización', 1, 8000.00, 'fixed', 8000.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000003', NULL, 'Control centralizado', 1, 7000.00, 'fixed', 7000.00);

-- Quote 04 (COT-2025-009) González & Asociados — diagnóstico
INSERT INTO quote_items (id, quote_id, service_id, description, quantity, unit_price, unit_type, subtotal) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000004', '00000000-0000-0000-0001-000000000015', 'Diagnóstico 4 equipos', 4, 350.00, 'fixed', 1400.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000004', '00000000-0000-0000-0001-000000000011', 'Reparación compresor', 6, 450.00, 'per_hour', 2700.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000004', '00000000-0000-0000-0001-000000000012', 'Recarga gas R-410A', 4, 850.00, 'per_unit', 3400.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000004', NULL, 'Refacciones (válvula expansión)', 2, 2500.00, 'per_unit', 5000.00);

-- Quote 05 (COT-2025-010) María González — mantenimiento
INSERT INTO quote_items (id, quote_id, service_id, description, quantity, unit_price, unit_type, subtotal) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000005', '00000000-0000-0000-0001-000000000009', 'Mantenimiento preventivo', 2, 750.00, 'fixed', 1500.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000005', '00000000-0000-0000-0001-000000000010', 'Limpieza profunda', 2, 600.00, 'fixed', 1200.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000005', '00000000-0000-0000-0001-000000000012', 'Recarga gas refrigerante', 1, 850.00, 'per_unit', 850.00);

-- Quote 06 (COT-2025-011) Hotel Las Palmas — ampliación
INSERT INTO quote_items (id, quote_id, service_id, description, quantity, unit_price, unit_type, subtotal) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000006', '00000000-0000-0000-0001-000000000004', 'Minisplit 24K BTU suites piso 3', 2, 12500.00, 'per_unit', 25000.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000006', '00000000-0000-0000-0001-000000000008', 'Instalación 24K BTU', 2, 8500.00, 'fixed', 17000.00);

-- Quote 07 (COT-2026-017) El Asador — extractor
INSERT INTO quote_items (id, quote_id, service_id, description, quantity, unit_price, unit_type, subtotal) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000007', NULL, 'Extractor campana industrial 1,200 CFM', 1, 8500.00, 'fixed', 8500.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000007', NULL, 'Ducto acero inoxidable 6m', 1, 3500.00, 'fixed', 3500.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000007', NULL, 'Mano de obra e instalación', 1, 3000.00, 'fixed', 3000.00);

-- Quote 08 (COT-2026-018) Colegio Montessori — mantenimiento anual
INSERT INTO quote_items (id, quote_id, service_id, description, quantity, unit_price, unit_type, subtotal) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000008', '00000000-0000-0000-0001-000000000009', 'Mantenimiento preventivo', 8, 750.00, 'fixed', 6000.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000008', '00000000-0000-0000-0001-000000000010', 'Limpieza profunda espuma', 8, 600.00, 'fixed', 4800.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000008', '00000000-0000-0000-0001-000000000012', 'Recarga gas', 4, 850.00, 'per_unit', 3400.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000008', NULL, 'Filtros de repuesto', 8, 450.00, 'per_unit', 3600.00);

-- Quote 09 (COT-2026-019) Plaza Norte — proyecto grande
INSERT INTO quote_items (id, quote_id, service_id, description, quantity, unit_price, unit_type, subtotal) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000009', '00000000-0000-0000-0001-000000000004', 'Minisplit 24K BTU', 6, 12500.00, 'per_unit', 75000.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000009', '00000000-0000-0000-0001-000000000003', 'Minisplit 18K BTU', 6, 9800.00, 'per_unit', 58800.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000009', NULL, 'Control centralizado BMS', 1, 15000.00, 'fixed', 15000.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000009', NULL, 'Instalación y puesta en marcha completa', 1, 18000.00, 'fixed', 18000.00);

-- Quote 10 (COT-2026-020) Corporativo Noreste — reemplazo
INSERT INTO quote_items (id, quote_id, service_id, description, quantity, unit_price, unit_type, subtotal) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000010', '00000000-0000-0000-0001-000000000003', 'Minisplit 18K BTU reemplazo', 4, 9800.00, 'per_unit', 39200.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000010', NULL, 'Retiro equipos viejos + instalación', 4, 2000.00, 'per_unit', 8000.00);

-- Quote 11 (COT-2026-021) Clínica Dental — draft
INSERT INTO quote_items (id, quote_id, service_id, description, quantity, unit_price, unit_type, subtotal) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000011', '00000000-0000-0000-0001-000000000002', 'Minisplit 12K BTU consultorios', 3, 7200.00, 'per_unit', 21600.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000011', '00000000-0000-0000-0001-000000000006', 'Instalación 12K BTU', 3, 5200.00, 'fixed', 15600.00);

-- Quote 12 (COT-2026-022) González & Asociados — en_instalacion
INSERT INTO quote_items (id, quote_id, service_id, description, quantity, unit_price, unit_type, subtotal) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000012', '00000000-0000-0000-0001-000000000013', 'Multi-Split 2 zonas (sala juntas + dirección)', 1, 18000.00, 'fixed', 18000.00),
  (gen_random_uuid(), '00000000-0000-0000-0009-000000000012', NULL, 'Instalación + cableado eléctrico', 1, 3000.00, 'fixed', 3000.00);

-- ============================================================
-- 3. QUOTE PAYMENTS — 30 payments across Oct 2025 – Feb 2026
-- ============================================================

INSERT INTO quote_payments (id, organization_id, quote_id, amount, payment_type, payment_method, payment_date, notes, received_by) VALUES
  -- Oct 2025
  ('00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0009-000000000001', 9000.00, 'anticipo', 'transferencia', '2025-10-10',
   'Anticipo 50% Torres Mora', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0007-000000000002', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0009-000000000001', 9000.00, 'liquidacion', 'transferencia', '2025-10-28',
   'Liquidación Torres Mora', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0007-000000000003', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0009-000000000002', 8000.00, 'liquidacion', 'efectivo', '2025-10-25',
   'Pago único Clínica Dental mantenimiento', '00000000-0000-0000-0000-000000000001'),

  -- Nov 2025
  ('00000000-0000-0000-0007-000000000004', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0009-000000000003', 30000.00, 'anticipo', 'transferencia', '2025-11-15',
   'Anticipo 50% VRF Perinorte', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0007-000000000005', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0009-000000000003', 20000.00, 'parcial', 'transferencia', '2025-11-28',
   'Segundo pago VRF Perinorte', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0007-000000000006', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0009-000000000004', 6000.00, 'anticipo', 'cheque', '2025-11-28',
   'Anticipo 50% González & Asociados diagnóstico', '00000000-0000-0000-0000-000000000001'),

  -- Dec 2025
  ('00000000-0000-0000-0007-000000000007', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0009-000000000003', 10000.00, 'liquidacion', 'cheque', '2025-12-10',
   'Liquidación VRF Perinorte', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0007-000000000008', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0009-000000000005', 4000.00, 'liquidacion', 'efectivo', '2025-12-12',
   'Pago único María González mantenimiento', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0007-000000000009', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0009-000000000006', 20000.00, 'anticipo', 'transferencia', '2025-12-22',
   'Anticipo 50% Hotel Las Palmas ampliación', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0007-000000000010', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0003-000000000001', 14656.60, 'anticipo', 'transferencia', '2025-12-15',
   'Anticipo 50% COT-2025-001', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0007-000000000011', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0003-000000000002', 28867.76, 'anticipo', 'transferencia', '2025-12-18',
   'Anticipo 50% COT-2025-002', '00000000-0000-0000-0000-000000000001'),

  -- Jan 2026
  ('00000000-0000-0000-0007-000000000012', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0009-000000000007', 7500.00, 'anticipo', 'transferencia', '2026-01-12',
   'Anticipo 50% El Asador extractor', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0007-000000000013', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0009-000000000007', 7500.00, 'liquidacion', 'efectivo', '2026-01-25',
   'Liquidación El Asador extractor', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0007-000000000014', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0009-000000000008', 15000.00, 'anticipo', 'transferencia', '2026-01-20',
   'Anticipo 50% Montessori mantenimiento anual', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0007-000000000015', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0003-000000000001', 14656.60, 'liquidacion', 'cheque', '2026-01-10',
   'Liquidación COT-2025-001', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0007-000000000016', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0003-000000000002', 28867.76, 'liquidacion', 'transferencia', '2026-01-15',
   'Liquidación COT-2025-002', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0007-000000000017', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0003-000000000004', 90639.50, 'anticipo', 'transferencia', '2026-01-05',
   'Anticipo 50% COT-2025-004', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0007-000000000018', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0003-000000000006', 43639.20, 'anticipo', 'transferencia', '2026-01-12',
   'Anticipo 50% COT-2026-001', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0007-000000000019', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0009-000000000004', 6000.00, 'liquidacion', 'transferencia', '2026-01-08',
   'Liquidación González & Asociados diagnóstico', '00000000-0000-0000-0000-000000000001'),

  -- Feb 2026
  ('00000000-0000-0000-0007-000000000020', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0009-000000000008', 15000.00, 'liquidacion', 'cheque', '2026-02-05',
   'Liquidación Montessori mantenimiento anual', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0007-000000000021', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0009-000000000010', 22000.00, 'anticipo', 'transferencia', '2026-02-14',
   'Anticipo 50% Corporativo Noreste reemplazo', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0007-000000000022', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0009-000000000012', 10000.00, 'anticipo', 'transferencia', '2026-02-18',
   'Anticipo 50% González Mty instalación', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0007-000000000023', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0003-000000000004', 90639.50, 'liquidacion', 'transferencia', '2026-02-08',
   'Liquidación COT-2025-004', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0007-000000000024', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0003-000000000006', 43639.20, 'liquidacion', 'cheque', '2026-02-20',
   'Liquidación COT-2026-001', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0007-000000000025', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0009-000000000006', 10000.00, 'parcial', 'transferencia', '2026-02-22',
   'Segundo pago Hotel Las Palmas ampliación', '00000000-0000-0000-0000-000000000001');

-- ============================================================
-- 4. WORK EVENTS — 22 events dense around current week
-- ============================================================

INSERT INTO work_events (id, organization_id, client_id, quote_id, assigned_to, title, event_type, scheduled_start, scheduled_end, address, notes, status) VALUES
  -- Past week (completado)
  ('00000000-0000-0000-0008-000000000001', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000005', '00000000-0000-0000-0009-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Mantenimiento post-instalación Torres Mora',
   'mantenimiento',
   (CURRENT_DATE - 6) + TIME '09:00', (CURRENT_DATE - 6) + TIME '12:00',
   'Av. Constitución 456, Monterrey, NL',
   'Revisión a 3 meses de instalación. Todo en orden.',
   'completado'),

  ('00000000-0000-0000-0008-000000000002', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000006', '00000000-0000-0000-0009-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'Limpieza profunda Clínica Dental',
   'mantenimiento',
   (CURRENT_DATE - 5) + TIME '08:00', (CURRENT_DATE - 5) + TIME '11:00',
   'Calle Hidalgo 234, Col. Centro, CDMX',
   'Limpieza semestral 3 equipos.',
   'completado'),

  ('00000000-0000-0000-0008-000000000003', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000010', '00000000-0000-0000-0009-000000000008',
   '00000000-0000-0000-0000-000000000001',
   'Mantenimiento anual Montessori — Aulas 1-4',
   'mantenimiento',
   (CURRENT_DATE - 4) + TIME '07:30', (CURRENT_DATE - 4) + TIME '14:00',
   'Av. Insurgentes Sur 3500, CDMX',
   'Primera etapa mantenimiento anual. 4 equipos revisados.',
   'completado'),

  ('00000000-0000-0000-0008-000000000004', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000010', '00000000-0000-0000-0009-000000000008',
   '00000000-0000-0000-0000-000000000001',
   'Mantenimiento anual Montessori — Aulas 5-8',
   'mantenimiento',
   (CURRENT_DATE - 3) + TIME '07:30', (CURRENT_DATE - 3) + TIME '14:00',
   'Av. Insurgentes Sur 3500, CDMX',
   'Segunda etapa. 4 equipos restantes.',
   'completado'),

  ('00000000-0000-0000-0008-000000000005', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0009-000000000007',
   '00000000-0000-0000-0000-000000000001',
   'Entrega final extractor — El Asador',
   'visita_tecnica',
   (CURRENT_DATE - 2) + TIME '10:00', (CURRENT_DATE - 2) + TIME '12:00',
   'Blvd. Díaz Ordaz 450, Guadalajara, JAL',
   'Entrega y pruebas de funcionamiento. Firmada acta.',
   'completado'),

  -- Yesterday
  ('00000000-0000-0000-0008-000000000006', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000009', '00000000-0000-0000-0009-000000000012',
   '00000000-0000-0000-0000-000000000001',
   'Instalación Multi-Split González Mty — Día 1',
   'instalacion',
   (CURRENT_DATE - 1) + TIME '08:00', (CURRENT_DATE - 1) + TIME '17:00',
   'Av. Lázaro Cárdenas 2400, Monterrey, NL',
   'Base y tubería frigorífica. Falta conexión eléctrica.',
   'completado'),

  -- TODAY
  ('00000000-0000-0000-0008-000000000007', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000009', '00000000-0000-0000-0009-000000000012',
   '00000000-0000-0000-0000-000000000001',
   'Instalación Multi-Split González Mty — Día 2',
   'instalacion',
   CURRENT_DATE + TIME '08:00', CURRENT_DATE + TIME '16:00',
   'Av. Lázaro Cárdenas 2400, Monterrey, NL',
   'Conexión eléctrica, vacío y carga de gas. Puesta en marcha.',
   'en_camino'),

  ('00000000-0000-0000-0008-000000000008', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000001', NULL,
   '00000000-0000-0000-0000-000000000001',
   'Visita diagnóstico — María González (ruido equipo)',
   'visita_tecnica',
   CURRENT_DATE + TIME '14:00', CURRENT_DATE + TIME '15:30',
   'Calle Álamo 23, Col. Del Valle, CDMX',
   'Reporta ruido intermitente en equipo sala. Posible aspas desbalanceadas.',
   'pendiente'),

  -- Tomorrow
  ('00000000-0000-0000-0008-000000000009', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0009-000000000006',
   '00000000-0000-0000-0000-000000000001',
   'Instalación Hotel Las Palmas piso 3 — Suite 301',
   'instalacion',
   (CURRENT_DATE + 1) + TIME '08:00', (CURRENT_DATE + 1) + TIME '13:00',
   'Av. Reforma 1245, Col. Juárez, CDMX',
   'Primer equipo 24K BTU suite 301. Coordinar con recepción.',
   'pendiente'),

  ('00000000-0000-0000-0008-000000000010', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0009-000000000006',
   '00000000-0000-0000-0000-000000000001',
   'Instalación Hotel Las Palmas piso 3 — Suite 302',
   'instalacion',
   (CURRENT_DATE + 1) + TIME '14:00', (CURRENT_DATE + 1) + TIME '18:00',
   'Av. Reforma 1245, Col. Juárez, CDMX',
   'Segundo equipo 24K BTU suite 302.',
   'pendiente'),

  -- Day +2
  ('00000000-0000-0000-0008-000000000011', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0009-000000000010',
   '00000000-0000-0000-0000-000000000001',
   'Medición para reemplazo Corporativo Noreste',
   'medicion',
   (CURRENT_DATE + 2) + TIME '09:00', (CURRENT_DATE + 2) + TIME '12:00',
   'Blvd. Constitución 890, Monterrey, NL',
   'Medir ductos existentes para reemplazo equipos pisos 1-2.',
   'pendiente'),

  ('00000000-0000-0000-0008-000000000012', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000007', NULL,
   '00000000-0000-0000-0000-000000000001',
   'Mantenimiento trimestral Perinorte Plaza',
   'mantenimiento',
   (CURRENT_DATE + 2) + TIME '14:00', (CURRENT_DATE + 2) + TIME '18:00',
   'Centro Comercial Perinorte, CDMX',
   'Mantenimiento preventivo trimestral VRF ala norte.',
   'pendiente'),

  -- Day +3
  ('00000000-0000-0000-0008-000000000013', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0009-000000000010',
   '00000000-0000-0000-0000-000000000001',
   'Retiro equipos viejos Corporativo Noreste P1',
   'instalacion',
   (CURRENT_DATE + 3) + TIME '08:00', (CURRENT_DATE + 3) + TIME '14:00',
   'Blvd. Constitución 890, Monterrey, NL',
   'Desmontar 2 equipos obsoletos piso 1.',
   'pendiente'),

  -- Day +4
  ('00000000-0000-0000-0008-000000000014', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0009-000000000010',
   '00000000-0000-0000-0000-000000000001',
   'Instalación equipos nuevos Corporativo Noreste P1',
   'instalacion',
   (CURRENT_DATE + 4) + TIME '08:00', (CURRENT_DATE + 4) + TIME '17:00',
   'Blvd. Constitución 890, Monterrey, NL',
   'Instalar 2 Minisplit 18K BTU reemplazo piso 1.',
   'pendiente'),

  ('00000000-0000-0000-0008-000000000015', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000008', '00000000-0000-0000-0009-000000000009',
   '00000000-0000-0000-0000-000000000001',
   'Visita técnica pre-proyecto Plaza Norte',
   'visita_tecnica',
   (CURRENT_DATE + 4) + TIME '10:00', (CURRENT_DATE + 4) + TIME '12:00',
   'Av. Universidad 1500, CDMX',
   'Presentar propuesta técnica al director de inmueble.',
   'pendiente'),

  -- Day +5
  ('00000000-0000-0000-0008-000000000016', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0009-000000000010',
   '00000000-0000-0000-0000-000000000001',
   'Retiro + Instalación Corporativo Noreste P2',
   'instalacion',
   (CURRENT_DATE + 5) + TIME '08:00', (CURRENT_DATE + 5) + TIME '17:00',
   'Blvd. Constitución 890, Monterrey, NL',
   'Piso 2: retiro 2 equipos + instalación 2 nuevos 18K BTU.',
   'pendiente'),

  -- Day +6
  ('00000000-0000-0000-0008-000000000017', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0009-000000000010',
   '00000000-0000-0000-0000-000000000001',
   'Puesta en marcha y pruebas Corporativo Noreste',
   'visita_tecnica',
   (CURRENT_DATE + 6) + TIME '09:00', (CURRENT_DATE + 6) + TIME '12:00',
   'Blvd. Constitución 890, Monterrey, NL',
   'Pruebas de funcionamiento 4 equipos nuevos.',
   'pendiente'),

  -- Next week
  ('00000000-0000-0000-0008-000000000018', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000001', NULL,
   '00000000-0000-0000-0000-000000000001',
   'Mantenimiento preventivo María González',
   'mantenimiento',
   (CURRENT_DATE + 8) + TIME '10:00', (CURRENT_DATE + 8) + TIME '12:00',
   'Calle Álamo 23, Col. Del Valle, CDMX',
   'Mantenimiento trimestral 2 equipos residenciales.',
   'pendiente'),

  ('00000000-0000-0000-0008-000000000019', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000006', NULL,
   '00000000-0000-0000-0000-000000000001',
   'Medición consultorios nuevos Clínica Dental',
   'medicion',
   (CURRENT_DATE + 9) + TIME '08:30', (CURRENT_DATE + 9) + TIME '10:30',
   'Calle Hidalgo 234, Col. Centro, CDMX',
   'Tomar medidas para cotización COT-2026-021.',
   'pendiente'),

  ('00000000-0000-0000-0008-000000000020', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0009-000000000006',
   '00000000-0000-0000-0000-000000000001',
   'Pruebas y entrega Hotel Las Palmas piso 3',
   'visita_tecnica',
   (CURRENT_DATE + 10) + TIME '10:00', (CURRENT_DATE + 10) + TIME '13:00',
   'Av. Reforma 1245, Col. Juárez, CDMX',
   'Verificación final, firma de acta de entrega.',
   'pendiente'),

  ('00000000-0000-0000-0008-000000000021', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000009', '00000000-0000-0000-0009-000000000012',
   '00000000-0000-0000-0000-000000000001',
   'Entrega y pruebas González Mty',
   'visita_tecnica',
   (CURRENT_DATE + 10) + TIME '15:00', (CURRENT_DATE + 10) + TIME '17:00',
   'Av. Lázaro Cárdenas 2400, Monterrey, NL',
   'Entrega final multi-split. Firma de acta.',
   'pendiente'),

  ('00000000-0000-0000-0008-000000000022', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000005', NULL,
   '00000000-0000-0000-0000-000000000001',
   'Mantenimiento semestral Torres Mora',
   'mantenimiento',
   (CURRENT_DATE + 12) + TIME '09:00', (CURRENT_DATE + 12) + TIME '12:00',
   'Av. Constitución 456, Monterrey, NL',
   'Mantenimiento preventivo 2 equipos oficinas.',
   'pendiente');

-- ============================================================
-- 5. NEW TEMPLATES (3 additional with default_items)
-- ============================================================

INSERT INTO quote_templates (id, organization_id, name, description, default_items, default_notes, default_terms_and_conditions, default_discount_rate, default_valid_days, category, is_active, usage_count, created_by, promotional_label, promotional_valid_until) VALUES
  ('00000000-0000-0000-000a-000000000001',
   '00000000-0000-0000-0000-000000000002',
   'Paquete Residencial Básico',
   'Equipo + instalación + primera limpieza para hogar',
   '[{"description":"Minisplit Inverter 12,000 BTU","quantity":1,"unit_price":7200,"unit_type":"per_unit"},{"description":"Instalación estándar","quantity":1,"unit_price":5200,"unit_type":"fixed"},{"description":"Limpieza profunda espuma (cortesía)","quantity":1,"unit_price":600,"unit_type":"fixed"}]',
   'Incluye materiales de instalación hasta 5m de tubería. Garantía 1 año en instalación.',
   'Vigencia según fecha indicada. Anticipo 50% para programar. Garantía de equipo según fabricante. Garantía instalación 12 meses.',
   5, 15, 'hvac', true, 0,
   '00000000-0000-0000-0000-000000000001',
   'Promo Primavera -5%', '2026-04-30'),

  ('00000000-0000-0000-000a-000000000002',
   '00000000-0000-0000-0000-000000000002',
   'Contrato Mantenimiento Anual (4 visitas)',
   'Mantenimiento preventivo trimestral para clientes recurrentes',
   '[{"description":"Mantenimiento preventivo","quantity":4,"unit_price":750,"unit_type":"fixed"},{"description":"Limpieza profunda espuma","quantity":4,"unit_price":600,"unit_type":"fixed"},{"description":"Recarga gas R-410A (si requerido)","quantity":1,"unit_price":850,"unit_type":"per_unit"}]',
   'Incluye 4 visitas programadas. Gas refrigerante solo si nivel bajo (verificado con manómetro).',
   'Pago trimestral o anual con 10% descuento. Cancelación con 30 días de aviso. No incluye refacciones mayores.',
   10, 30, 'hvac', true, 0,
   '00000000-0000-0000-0000-000000000001',
   NULL, NULL),

  ('00000000-0000-0000-000a-000000000003',
   '00000000-0000-0000-0000-000000000002',
   'Proyecto Comercial Multi-Zona',
   'Sistemas multi-split o VRF para espacios comerciales',
   '[{"description":"Sistema Multi-Split (2 zonas)","quantity":1,"unit_price":18000,"unit_type":"fixed"},{"description":"Control centralizado","quantity":1,"unit_price":7000,"unit_type":"fixed"},{"description":"Instalación y puesta en marcha","quantity":1,"unit_price":8000,"unit_type":"fixed"}]',
   'Requiere visita técnica previa para dimensionamiento. Incluye capacitación de operación al personal.',
   'Anticipo 50% para iniciar. 30% al terminar instalación. 20% liquidación contra acta de entrega. Garantía instalación 12 meses. Equipos según fabricante.',
   0, 45, 'hvac', true, 0,
   '00000000-0000-0000-0000-000000000001',
   'Descuento Volumen Disponible', '2026-06-30');

-- ============================================================
-- VERIFICATION
-- ============================================================
DO $$
DECLARE
  v_new_quotes    INT;
  v_new_items     INT;
  v_new_payments  INT;
  v_new_events    INT;
  v_new_templates INT;
  v_total_quotes  INT;
  v_total_payments INT;
  v_total_events  INT;
BEGIN
  SELECT COUNT(*) INTO v_new_quotes FROM quotes WHERE id::text LIKE '00000000-0000-0000-0009-%';
  SELECT COUNT(*) INTO v_new_items FROM quote_items WHERE quote_id::text LIKE '00000000-0000-0000-0009-%';
  SELECT COUNT(*) INTO v_new_payments FROM quote_payments WHERE id::text LIKE '00000000-0000-0000-0007-%';
  SELECT COUNT(*) INTO v_new_events FROM work_events WHERE id::text LIKE '00000000-0000-0000-0008-%';
  SELECT COUNT(*) INTO v_new_templates FROM quote_templates WHERE id::text LIKE '00000000-0000-0000-000a-%';

  SELECT COUNT(*) INTO v_total_quotes FROM quotes WHERE organization_id = '00000000-0000-0000-0000-000000000002';
  SELECT COUNT(*) INTO v_total_payments FROM quote_payments WHERE organization_id = '00000000-0000-0000-0000-000000000002';
  SELECT COUNT(*) INTO v_total_events FROM work_events WHERE organization_id = '00000000-0000-0000-0000-000000000002';

  RAISE NOTICE '=== 026_seed_demo_bulk.sql Results ===';
  RAISE NOTICE 'New quotes:    % (expected 12)', v_new_quotes;
  RAISE NOTICE 'New items:     % (expected ~35)', v_new_items;
  RAISE NOTICE 'New payments:  % (expected 25)', v_new_payments;
  RAISE NOTICE 'New events:    % (expected 22)', v_new_events;
  RAISE NOTICE 'New templates: % (expected 3)', v_new_templates;
  RAISE NOTICE '---';
  RAISE NOTICE 'TOTAL quotes:    %', v_total_quotes;
  RAISE NOTICE 'TOTAL payments:  %', v_total_payments;
  RAISE NOTICE 'TOTAL events:    %', v_total_events;
  RAISE NOTICE '=====================================';
END $$;
