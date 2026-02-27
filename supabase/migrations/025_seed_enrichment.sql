-- Migration: 025_seed_enrichment.sql
-- Purpose: Enrich demo seed data for new modules
--   - 6 quotes with new statuses (en_instalacion x2, completado x2, cobrado x2)
--   - quote_items for each new quote
--   - quote_payments including January 2026 for analytics comparison
--   - work_events linked to new quotes
--   - custom_field_definitions for all entity types
--   - webhook_subscriptions demo configs
-- Idempotent: DELETE by fixed UUID list, then INSERT
--
-- Profile ID (demo@climasol.mx): 00000000-0000-0000-0000-000000000001
-- Org ID (ClimaSol HVAC):        00000000-0000-0000-0000-000000000002

-- ============================================================
-- 1. CLEANUP (idempotent)
-- ============================================================
DELETE FROM quote_payments WHERE id IN (
  '00000000-0000-0000-0004-000000000101',
  '00000000-0000-0000-0004-000000000102',
  '00000000-0000-0000-0004-000000000103',
  '00000000-0000-0000-0004-000000000104',
  '00000000-0000-0000-0004-000000000105',
  '00000000-0000-0000-0004-000000000106',
  '00000000-0000-0000-0004-000000000107',
  '00000000-0000-0000-0004-000000000108'
);

DELETE FROM quote_items WHERE quote_id IN (
  '00000000-0000-0000-0003-000000000016',
  '00000000-0000-0000-0003-000000000017',
  '00000000-0000-0000-0003-000000000018',
  '00000000-0000-0000-0003-000000000019',
  '00000000-0000-0000-0003-000000000020',
  '00000000-0000-0000-0003-000000000021'
);

DELETE FROM work_events WHERE id IN (
  '00000000-0000-0000-0005-000000000101',
  '00000000-0000-0000-0005-000000000102',
  '00000000-0000-0000-0005-000000000103',
  '00000000-0000-0000-0005-000000000104',
  '00000000-0000-0000-0005-000000000105',
  '00000000-0000-0000-0005-000000000106'
);

DELETE FROM quotes WHERE id IN (
  '00000000-0000-0000-0003-000000000016',
  '00000000-0000-0000-0003-000000000017',
  '00000000-0000-0000-0003-000000000018',
  '00000000-0000-0000-0003-000000000019',
  '00000000-0000-0000-0003-000000000020',
  '00000000-0000-0000-0003-000000000021'
);

-- ============================================================
-- 2. NEW QUOTES (en_instalacion x2, completado x2, cobrado x2)
-- created_by references profiles.id = 00000000-0000-0000-0000-000000000001
-- ============================================================

-- Quote 16: en_instalacion — Hotel Boutique Las Palmas
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, subtotal, tax_rate, tax_amount, total, valid_until, notes, created_by, created_at) VALUES (
  '00000000-0000-0000-0003-000000000016',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0002-000000000004',
  'COT-2026-011', 'en_instalacion',
  19655.17, 16, 3144.83, 22800.00,
  NOW() + INTERVAL '30 days',
  'Sistema 3 zonas para suites ejecutivas. Instalación en progreso, materiales entregados.',
  '00000000-0000-0000-0000-000000000001',
  NOW() - INTERVAL '20 days'
);

-- Quote 17: en_instalacion — Corporativo Noreste
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, subtotal, tax_rate, tax_amount, total, valid_until, notes, created_by, created_at) VALUES (
  '00000000-0000-0000-0003-000000000017',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0002-000000000002',
  'COT-2026-012', 'en_instalacion',
  43103.45, 16, 6896.55, 50000.00,
  NOW() + INTERVAL '45 days',
  'Proyecto VRF 4 pisos. Instalación en curso — ductos listos, equipos pendientes.',
  '00000000-0000-0000-0000-000000000001',
  NOW() - INTERVAL '25 days'
);

-- Quote 18: completado — Colegio Montessori
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, subtotal, tax_rate, tax_amount, total, valid_until, notes, created_by, created_at) VALUES (
  '00000000-0000-0000-0003-000000000018',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0002-000000000010',
  'COT-2026-013', 'completado',
  12068.97, 16, 1931.03, 14000.00,
  NOW() + INTERVAL '60 days',
  '4 minisplits en aulas. Trabajo finalizado, pendiente cobranza.',
  '00000000-0000-0000-0000-000000000001',
  NOW() - INTERVAL '40 days'
);

-- Quote 19: completado — Restaurante El Asador
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, subtotal, tax_rate, tax_amount, total, valid_until, notes, created_by, created_at) VALUES (
  '00000000-0000-0000-0003-000000000019',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0002-000000000003',
  'COT-2026-014', 'completado',
  8620.69, 16, 1379.31, 10000.00,
  NOW() + INTERVAL '60 days',
  'Climatización cocina instalada y probada. Facturación pendiente.',
  '00000000-0000-0000-0000-000000000001',
  NOW() - INTERVAL '35 days'
);

-- Quote 20: cobrado — María González (liquidada)
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, subtotal, tax_rate, tax_amount, total, valid_until, notes, created_by, created_at) VALUES (
  '00000000-0000-0000-0003-000000000020',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0002-000000000001',
  'COT-2026-015', 'cobrado',
  6896.55, 16, 1103.45, 8000.00,
  NOW() + INTERVAL '90 days',
  'Minisplit 18,000 BTU sala y recámara. Cobrado en su totalidad.',
  '00000000-0000-0000-0000-000000000001',
  NOW() - INTERVAL '50 days'
);

-- Quote 21: cobrado — Edificio Corporativo Plaza Norte (liquidada)
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, subtotal, tax_rate, tax_amount, total, valid_until, notes, created_by, created_at) VALUES (
  '00000000-0000-0000-0003-000000000021',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0002-000000000008',
  'COT-2026-016', 'cobrado',
  25862.07, 16, 4137.93, 30000.00,
  NOW() + INTERVAL '90 days',
  'Multi-split 3 pisos lobby + salas. Cobrado. Cliente recurrente.',
  '00000000-0000-0000-0000-000000000001',
  NOW() - INTERVAL '55 days'
);

-- ============================================================
-- 3. QUOTE ITEMS
-- ============================================================

-- Items for Quote 16 (en_instalacion)
INSERT INTO quote_items (id, quote_id, service_id, description, quantity, unit_price, unit_type, subtotal) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0003-000000000016',
   '00000000-0000-0000-0001-000000000013',
   'Sistema Multi-Split (2 zonas) — Suites ejecutivas', 1, 18000.00, 'fixed', 18000.00),
  (gen_random_uuid(), '00000000-0000-0000-0003-000000000016',
   NULL, 'Mano de obra instalación multi-zona', 1, 4800.00, 'fixed', 4800.00);

-- Items for Quote 17 (en_instalacion)
INSERT INTO quote_items (id, quote_id, service_id, description, quantity, unit_price, unit_type, subtotal) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0003-000000000017',
   '00000000-0000-0000-0001-000000000014',
   'Sistema VRF Comercial — 4 zonas corporativas', 4, 45000.00, 'per_unit', 180000.00),
  (gen_random_uuid(), '00000000-0000-0000-0003-000000000017',
   NULL, 'Materiales y canalización ductos', 1, 15000.00, 'fixed', 15000.00);

-- Items for Quote 18 (completado)
INSERT INTO quote_items (id, quote_id, service_id, description, quantity, unit_price, unit_type, subtotal) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0003-000000000018',
   '00000000-0000-0000-0001-000000000002',
   'Minisplit Inverter 12,000 BTU — Aulas', 4, 7200.00, 'per_unit', 28800.00),
  (gen_random_uuid(), '00000000-0000-0000-0003-000000000018',
   NULL, 'Instalación y conexión eléctrica', 4, 1200.00, 'per_unit', 4800.00);

-- Items for Quote 19 (completado)
INSERT INTO quote_items (id, quote_id, service_id, description, quantity, unit_price, unit_type, subtotal) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0003-000000000019',
   '00000000-0000-0000-0001-000000000001',
   'Minisplit Inverter 9,000 BTU — Cocina', 2, 5800.00, 'per_unit', 11600.00),
  (gen_random_uuid(), '00000000-0000-0000-0003-000000000019',
   NULL, 'Instalación y tuberías frigoríficas', 1, 2400.00, 'fixed', 2400.00);

-- Items for Quote 20 (cobrado)
INSERT INTO quote_items (id, quote_id, service_id, description, quantity, unit_price, unit_type, subtotal) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0003-000000000020',
   '00000000-0000-0000-0001-000000000003',
   'Minisplit Inverter 18,000 BTU', 1, 9800.00, 'fixed', 9800.00),
  (gen_random_uuid(), '00000000-0000-0000-0003-000000000020',
   NULL, 'Instalación residencial', 1, 1800.00, 'fixed', 1800.00);

-- Items for Quote 21 (cobrado)
INSERT INTO quote_items (id, quote_id, service_id, description, quantity, unit_price, unit_type, subtotal) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0003-000000000021',
   '00000000-0000-0000-0001-000000000013',
   'Sistema Multi-Split (2 zonas)', 2, 18000.00, 'per_unit', 36000.00),
  (gen_random_uuid(), '00000000-0000-0000-0003-000000000021',
   NULL, 'Instalación y puesta en marcha', 1, 5000.00, 'fixed', 5000.00);

-- ============================================================
-- 4. QUOTE PAYMENTS
-- Columns: id, organization_id, quote_id, amount, payment_type,
--          payment_method, payment_date, notes, received_by, created_at
-- payment_type check constraint values TBD — using 'anticipo'/'liquidacion'
-- ============================================================

-- Check payment_type valid values
DO $$
DECLARE v_check TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_check
    FROM pg_constraint WHERE conname = 'quote_payments_payment_type_check';
  RAISE NOTICE 'payment_type check: %', v_check;
END $$;

-- payment_method values: efectivo | transferencia | cheque | otro
-- Quote 20 (cobrado) payments — fully paid, Feb 2026
INSERT INTO quote_payments (id, organization_id, quote_id, amount, payment_type, payment_method, payment_date, notes, received_by) VALUES
  ('00000000-0000-0000-0004-000000000101',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0003-000000000020',
   5000.00, 'anticipo', 'transferencia', '2026-02-05',
   'Anticipo 62.5% — María González', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0004-000000000102',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0003-000000000020',
   3000.00, 'liquidacion', 'efectivo', '2026-02-12',
   'Liquidación final — María González', '00000000-0000-0000-0000-000000000001');

-- Quote 21 (cobrado) payments — fully paid, Jan+Feb 2026
INSERT INTO quote_payments (id, organization_id, quote_id, amount, payment_type, payment_method, payment_date, notes, received_by) VALUES
  ('00000000-0000-0000-0004-000000000103',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0003-000000000021',
   18000.00, 'anticipo', 'transferencia', '2026-01-28',
   'Anticipo 60% — Edificio Plaza Norte', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0004-000000000104',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0003-000000000021',
   12000.00, 'liquidacion', 'cheque', '2026-02-10',
   'Liquidación saldo — Edificio Plaza Norte', '00000000-0000-0000-0000-000000000001');

-- January 2026 backfill — existing accepted quotes for analytics comparison
INSERT INTO quote_payments (id, organization_id, quote_id, amount, payment_type, payment_method, payment_date, notes, received_by) VALUES
  ('00000000-0000-0000-0004-000000000105',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0003-000000000015',
   2500.00, 'anticipo', 'transferencia', '2026-01-15',
   'Anticipo enero — COT-2026-010', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0004-000000000106',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0003-000000000014',
   6000.00, 'anticipo', 'transferencia', '2026-01-20',
   'Anticipo enero — COT-2026-009', '00000000-0000-0000-0000-000000000001');

-- Quote 16 (en_instalacion) advance — Feb 2026
INSERT INTO quote_payments (id, organization_id, quote_id, amount, payment_type, payment_method, payment_date, notes, received_by) VALUES
  ('00000000-0000-0000-0004-000000000107',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0003-000000000016',
   11400.00, 'anticipo', 'transferencia', '2026-02-08',
   'Anticipo 50% — Hotel Las Palmas', '00000000-0000-0000-0000-000000000001');

-- Quote 17 (en_instalacion) advance — Jan 2026
INSERT INTO quote_payments (id, organization_id, quote_id, amount, payment_type, payment_method, payment_date, notes, received_by) VALUES
  ('00000000-0000-0000-0004-000000000108',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0003-000000000017',
   25000.00, 'anticipo', 'transferencia', '2026-01-25',
   'Anticipo 50% — Corporativo Noreste VRF', '00000000-0000-0000-0000-000000000001');

-- ============================================================
-- 5. WORK EVENTS FOR NEW QUOTES
-- event_type: instalacion | medicion | visita_tecnica | mantenimiento | otro
-- status: pendiente | en_camino | completado | cancelado
-- ============================================================

INSERT INTO work_events (id, organization_id, client_id, quote_id, assigned_to, title, event_type, scheduled_start, scheduled_end, address, notes, status) VALUES
  ('00000000-0000-0000-0005-000000000101',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000004',
   '00000000-0000-0000-0003-000000000016',
   '00000000-0000-0000-0000-000000000001',
   'Instalación Multi-Split — Hotel Las Palmas',
   'instalacion',
   NOW() + INTERVAL '2 days',
   NOW() + INTERVAL '2 days' + INTERVAL '8 hours',
   'Av. Reforma 1245, Col. Juárez, CDMX',
   'Instalar sistema multi-split 2 zonas suites ejecutivas. Llevar herramienta de vacío.',
   'pendiente'),
  ('00000000-0000-0000-0005-000000000102',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000002',
   '00000000-0000-0000-0003-000000000017',
   '00000000-0000-0000-0000-000000000001',
   'Instalación VRF — Corporativo Noreste Día 2',
   'instalacion',
   NOW() + INTERVAL '3 days',
   NOW() + INTERVAL '3 days' + INTERVAL '10 hours',
   'Blvd. Constitución 890, Monterrey, NL',
   'Continuar canalización pisos 3 y 4. Coordinar con residente de obra.',
   'en_camino'),
  ('00000000-0000-0000-0005-000000000103',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000010',
   '00000000-0000-0000-0003-000000000018',
   '00000000-0000-0000-0000-000000000001',
   'Visita técnica entrega — Colegio Montessori',
   'visita_tecnica',
   NOW() - INTERVAL '5 days',
   NOW() - INTERVAL '5 days' + INTERVAL '3 hours',
   'Av. Insurgentes Sur 3500, CDMX',
   'Revisión final 4 equipos. Cliente firmó acta de entrega.',
   'completado'),
  ('00000000-0000-0000-0005-000000000104',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000003',
   '00000000-0000-0000-0003-000000000019',
   '00000000-0000-0000-0000-000000000001',
   'Mantenimiento preventivo — El Asador del Río',
   'mantenimiento',
   NOW() + INTERVAL '14 days',
   NOW() + INTERVAL '14 days' + INTERVAL '4 hours',
   'Blvd. Díaz Ordaz 450, Guadalajara, JAL',
   'Primer servicio a 30 días de instalación.',
   'pendiente'),
  ('00000000-0000-0000-0005-000000000105',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000008',
   '00000000-0000-0000-0003-000000000021',
   '00000000-0000-0000-0000-000000000001',
   'Mantenimiento semestral — Edificio Plaza Norte',
   'mantenimiento',
   NOW() + INTERVAL '30 days',
   NOW() + INTERVAL '30 days' + INTERVAL '6 hours',
   'Av. Universidad 1500, CDMX',
   'Mantenimiento preventivo semestral. Limpiar filtros, revisar refrigerante.',
   'pendiente'),
  ('00000000-0000-0000-0005-000000000106',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0002-000000000001',
   '00000000-0000-0000-0003-000000000020',
   '00000000-0000-0000-0000-000000000001',
   'Visita técnica soporte — María González',
   'visita_tecnica',
   NOW() - INTERVAL '3 days',
   NOW() - INTERVAL '3 days' + INTERVAL '2 hours',
   'Calle Álamo 23, Col. Del Valle, CDMX',
   'Revisión por ruido inusual. Ajuste paletas y limpieza general.',
   'completado');

-- ============================================================
-- 6. CUSTOM FIELD DEFINITIONS
-- field_type: text | textarea | number | date | select | checkbox | url | phone | email
-- ============================================================
DELETE FROM custom_field_definitions WHERE organization_id = '00000000-0000-0000-0000-000000000002'
  AND field_key IN (
    'rfc', 'tipo_persona', 'zona_geografica', 'contacto_obra',
    'categoria_servicio', 'garantia_meses', 'requiere_andamio',
    'tipo_instalacion', 'porcentaje_anticipo', 'requiere_permiso'
  );

-- Client fields
INSERT INTO custom_field_definitions (organization_id, entity_type, field_key, field_label, field_type, is_required, is_active, placeholder, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000002', 'client', 'rfc', 'RFC', 'text', false, true, 'XAXX010101000', 10),
  ('00000000-0000-0000-0000-000000000002', 'client', 'tipo_persona', 'Tipo de Persona', 'select', false, true, NULL, 20),
  ('00000000-0000-0000-0000-000000000002', 'client', 'zona_geografica', 'Zona Geográfica', 'text', false, true, 'CDMX Norte', 30),
  ('00000000-0000-0000-0000-000000000002', 'client', 'contacto_obra', 'Contacto en Obra', 'text', false, true, 'Nombre del responsable', 40);

UPDATE custom_field_definitions SET options = '["Física", "Moral"]'::jsonb
  WHERE organization_id = '00000000-0000-0000-0000-000000000002' AND field_key = 'tipo_persona';

-- Service fields
INSERT INTO custom_field_definitions (organization_id, entity_type, field_key, field_label, field_type, is_required, is_active, placeholder, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000002', 'service', 'categoria_servicio', 'Categoría', 'select', false, true, NULL, 10),
  ('00000000-0000-0000-0000-000000000002', 'service', 'garantia_meses', 'Garantía (meses)', 'number', false, true, '12', 20),
  ('00000000-0000-0000-0000-000000000002', 'service', 'requiere_andamio', 'Requiere Andamio', 'checkbox', false, true, NULL, 30);

UPDATE custom_field_definitions SET options = '["Equipos", "Instalación", "Mantenimiento", "Refacciones"]'::jsonb
  WHERE organization_id = '00000000-0000-0000-0000-000000000002' AND field_key = 'categoria_servicio';

-- Quote fields
INSERT INTO custom_field_definitions (organization_id, entity_type, field_key, field_label, field_type, is_required, is_active, placeholder, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000002', 'quote', 'tipo_instalacion', 'Tipo de Instalación', 'select', false, true, NULL, 10),
  ('00000000-0000-0000-0000-000000000002', 'quote', 'porcentaje_anticipo', 'Anticipo (%)', 'number', false, true, '50', 20),
  ('00000000-0000-0000-0000-000000000002', 'quote', 'requiere_permiso', 'Requiere Permiso', 'checkbox', false, true, NULL, 30);

UPDATE custom_field_definitions SET options = '["Residencial", "Comercial", "Industrial"]'::jsonb
  WHERE organization_id = '00000000-0000-0000-0000-000000000002' AND field_key = 'tipo_instalacion';

-- ============================================================
-- 7. WEBHOOK SUBSCRIPTIONS
-- created_by references profiles.id
-- ============================================================
DELETE FROM webhook_subscriptions WHERE organization_id = '00000000-0000-0000-0000-000000000002'
  AND url IN (
    'https://hooks.example.com/climasol/quotes',
    'https://hooks.example.com/climasol/payments'
  );

INSERT INTO webhook_subscriptions (organization_id, url, event_types, is_active, secret_key, max_retries, retry_delay_seconds, description, created_by) VALUES
  ('00000000-0000-0000-0000-000000000002',
   'https://hooks.example.com/climasol/quotes',
   ARRAY['quote.created', 'quote.status_changed', 'quote.accepted'],
   true,
   'whs_climasol_quotes_secret_demo_2026',
   3, 60,
   'Integración CRM — notificaciones de cotizaciones',
   '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002',
   'https://hooks.example.com/climasol/payments',
   ARRAY['payment.received', 'payment.completed'],
   true,
   'whs_climasol_payments_secret_demo_2026',
   5, 120,
   'Integración contabilidad — notificaciones de pagos',
   '00000000-0000-0000-0000-000000000001');

-- ============================================================
-- VERIFICATION
-- ============================================================
DO $$
DECLARE
  v_new_status_quotes   INT;
  v_jan_payments        INT;
  v_feb_payments        INT;
  v_custom_fields       INT;
  v_webhooks            INT;
  v_new_work_events     INT;
  v_total_quotes        INT;
  v_total_payments      INT;
BEGIN
  SELECT COUNT(*) INTO v_new_status_quotes FROM quotes
    WHERE organization_id = '00000000-0000-0000-0000-000000000002'
    AND status IN ('en_instalacion', 'completado', 'cobrado');

  SELECT COUNT(*) INTO v_jan_payments FROM quote_payments
    WHERE organization_id = '00000000-0000-0000-0000-000000000002'
    AND payment_date >= '2026-01-01' AND payment_date <= '2026-01-31';

  SELECT COUNT(*) INTO v_feb_payments FROM quote_payments
    WHERE organization_id = '00000000-0000-0000-0000-000000000002'
    AND payment_date >= '2026-02-01' AND payment_date <= '2026-02-28';

  SELECT COUNT(*) INTO v_custom_fields FROM custom_field_definitions
    WHERE organization_id = '00000000-0000-0000-0000-000000000002';

  SELECT COUNT(*) INTO v_webhooks FROM webhook_subscriptions
    WHERE organization_id = '00000000-0000-0000-0000-000000000002';

  SELECT COUNT(*) INTO v_new_work_events FROM work_events
    WHERE organization_id = '00000000-0000-0000-0000-000000000002'
    AND quote_id IN (
      '00000000-0000-0000-0003-000000000016',
      '00000000-0000-0000-0003-000000000017',
      '00000000-0000-0000-0003-000000000018',
      '00000000-0000-0000-0003-000000000019',
      '00000000-0000-0000-0003-000000000020',
      '00000000-0000-0000-0003-000000000021'
    );

  SELECT COUNT(*) INTO v_total_quotes FROM quotes
    WHERE organization_id = '00000000-0000-0000-0000-000000000002';

  SELECT COUNT(*) INTO v_total_payments FROM quote_payments
    WHERE organization_id = '00000000-0000-0000-0000-000000000002';

  RAISE NOTICE '=== 025_seed_enrichment.sql — Results ===';
  RAISE NOTICE 'Quotes en_instalacion/completado/cobrado: %  (expected 6)', v_new_status_quotes;
  RAISE NOTICE 'Payments January 2026:                    %  (expected 3)', v_jan_payments;
  RAISE NOTICE 'Payments February 2026:                   %  (expected 5)', v_feb_payments;
  RAISE NOTICE 'Custom field definitions:                 %  (expected 10)', v_custom_fields;
  RAISE NOTICE 'Webhook subscriptions:                    %  (expected 2)', v_webhooks;
  RAISE NOTICE 'Work events (new quotes):                 %  (expected 6)', v_new_work_events;
  RAISE NOTICE 'Total quotes org:                        %', v_total_quotes;
  RAISE NOTICE 'Total payments org:                      %', v_total_payments;
  RAISE NOTICE '=========================================';
END $$;
