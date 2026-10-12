-- Migration: 032_ensure_templates_seed.sql
-- Purpose: Idempotent re-seed for all 8 ClimaSol demo templates +
--          March 2026 demo payments (from migration 031) in case they
--          were not applied to the production database.
-- Idempotent: DELETE by fixed UUID prefix + WHERE NOT EXISTS for payments
--
-- Org ID: 00000000-0000-0000-0000-000000000002

-- ============================================================
-- ENSURE SETTINGS COLUMN EXISTS (from migration 030, idempotent)
-- Required by /api/auth/organization → Settings > Empresa tab
-- ============================================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- ============================================================
-- CLEANUP (idempotent)
-- ============================================================
DELETE FROM quote_templates WHERE id::text LIKE '00000000-0000-0000-0005-%';
DELETE FROM quote_templates WHERE id::text LIKE '00000000-0000-0000-000a-%';

-- ============================================================
-- TEMPLATES (5 from migration 024)
-- ============================================================
INSERT INTO quote_templates (id, organization_id, name, description, default_terms_and_conditions, default_discount_rate, is_active, promotional_label, promotional_valid_until) VALUES
  ('00000000-0000-0000-0005-000000000001',
   '00000000-0000-0000-0000-000000000002',
   'Mantenimiento Preventivo AC',
   'Revisión general, limpieza de filtros, verificación de gas refrigerante y ajuste eléctrico.',
   'Servicio garantizado por 30 días. Aplica para equipos residenciales y semi-comerciales.',
   NULL,
   true, NULL, NULL),

  ('00000000-0000-0000-0005-000000000002',
   '00000000-0000-0000-0000-000000000002',
   'Instalación Equipo Residencial',
   'Instalación completa de minisplit residencial hasta 2 ton. Incluye soporte, canaleta y prueba.',
   'Garantía de instalación: 6 meses. Equipo no incluido salvo especificación.',
   NULL,
   true, NULL, NULL),

  ('00000000-0000-0000-0005-000000000003',
   '00000000-0000-0000-0000-000000000002',
   'Diagnóstico y Reparación',
   'Diagnóstico completo con informe técnico. Reparación incluida si se aprueba la cotización.',
   'Diagnóstico sin costo si se acepta la reparación. Repuestos con garantía de fábrica.',
   NULL,
   true, NULL, NULL),

  ('00000000-0000-0000-0005-000000000004',
   '00000000-0000-0000-0000-000000000002',
   'Proyecto Comercial HVAC',
   'Diseño, suministro e instalación de sistema HVAC para locales comerciales y oficinas.',
   'Proyecto llave en mano. Garantía total 12 meses. Incluye planos y memoria técnica.',
   5,
   true, NULL, NULL),

  ('00000000-0000-0000-0005-000000000005',
   '00000000-0000-0000-0000-000000000002',
   'Contrato Anual Mantenimiento',
   'Plan de mantenimiento preventivo 4 visitas al año por equipo. Incluye mano de obra.',
   'Contrato renovable anualmente. Cancelación con 30 días de anticipación.',
   10,
   true, NULL, NULL);

-- ============================================================
-- TEMPLATES (3 from migration 026)
-- ============================================================
INSERT INTO quote_templates (id, organization_id, name, description, default_terms_and_conditions, default_discount_rate, is_active, promotional_label, promotional_valid_until) VALUES
  ('00000000-0000-0000-000a-000000000001',
   '00000000-0000-0000-0000-000000000002',
   'Paquete Residencial Básico',
   'Instalación + primer mantenimiento gratis para casas nuevas.',
   'Válido para viviendas nuevas con comprobante. No acumulable con otras promociones.',
   NULL,
   true, 'Vivienda Nueva', '2026-12-31'),

  ('00000000-0000-0000-000a-000000000002',
   '00000000-0000-0000-0000-000000000002',
   'Contrato Mantenimiento Anual',
   '4 visitas preventivas anuales + descuento en reparaciones para clientes frecuentes.',
   'Descuento del 15% en refacciones para clientes con contrato activo.',
   15,
   true, NULL, NULL),

  ('00000000-0000-0000-000a-000000000003',
   '00000000-0000-0000-0000-000000000002',
   'Proyecto Comercial Multi-Zona',
   'Diseño y ejecución de sistemas multi-zona para centros comerciales y edificios de oficinas.',
   'Garantía extendida 18 meses. Incluye comisionamiento y capacitación al personal.',
   8,
   true, 'Temporada Verano', '2026-06-30');

-- ============================================================
-- MARCH 2026 PAYMENTS (from migration 031, idempotent)
-- Ensures income analytics bar chart shows data for current month
-- ============================================================
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
