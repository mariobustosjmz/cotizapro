-- ================================================
-- Seed Data for New Modules (Sprint 3)
-- Migration: 024_seed_new_modules.sql
-- Created: 2026-02-24
-- Description: Demo data for quote_templates, work_events, and quote_payments
-- ================================================

-- Demo organization ID
-- org_id: 00000000-0000-0000-0000-000000000002
-- demo user_id: 00000000-0000-0000-0000-000000000001
-- client IDs: 00000000-0000-0000-0002-000000000002, 003, 004

-- ================================================
-- 1. Quote Templates (5 rows)
-- ================================================

DELETE FROM quote_templates
WHERE id IN (
  '00000000-0000-0000-0005-000000000001',
  '00000000-0000-0000-0005-000000000002',
  '00000000-0000-0000-0005-000000000003',
  '00000000-0000-0000-0005-000000000004',
  '00000000-0000-0000-0005-000000000005'
);

INSERT INTO quote_templates (
  id,
  organization_id,
  name,
  description,
  default_items,
  default_notes,
  default_terms_and_conditions,
  default_discount_rate,
  default_valid_days,
  category,
  is_active,
  usage_count,
  created_by,
  promotional_label,
  promotional_valid_until
) VALUES
(
  '00000000-0000-0000-0005-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'Mantenimiento Preventivo AC',
  'Servicio de mantenimiento preventivo para sistemas de aire acondicionado residencial',
  '[
    {
      "service_id": null,
      "description": "Revisión y limpieza de filtros",
      "quantity": 1,
      "unit_price": 800,
      "unit_type": "fixed"
    },
    {
      "service_id": null,
      "description": "Inspección de refrigerante",
      "quantity": 1,
      "unit_price": 600,
      "unit_type": "fixed"
    },
    {
      "service_id": null,
      "description": "Limpieza de serpentín",
      "quantity": 1,
      "unit_price": 1200,
      "unit_type": "fixed"
    }
  ]'::jsonb,
  'Este servicio incluye inspección completa y limpieza de componentes principales. Realizado por técnicos certificados.',
  'Validez: 30 días. Pago: 50% anticipo, 50% al completar. Garantía: 3 meses en mano de obra.',
  0,
  30,
  'hvac',
  true,
  3,
  '00000000-0000-0000-0000-000000000001',
  NULL,
  NULL
),
(
  '00000000-0000-0000-0005-000000000002',
  '00000000-0000-0000-0000-000000000002',
  'Instalación Equipo Residencial',
  'Instalación completa de equipo de aire acondicionado para residencias',
  '[
    {
      "service_id": null,
      "description": "Equipos AC (exterior + interior) e instalación",
      "quantity": 1,
      "unit_price": 18000,
      "unit_type": "fixed"
    },
    {
      "service_id": null,
      "description": "Refrigerante R410A (carga)",
      "quantity": 5,
      "unit_price": 450,
      "unit_type": "per_unit"
    },
    {
      "service_id": null,
      "description": "Tubería y accesorios de cobre",
      "quantity": 15,
      "unit_price": 200,
      "unit_type": "per_unit"
    }
  ]'::jsonb,
  'Incluye desinstalación de equipo viejo, instalación de nuevo equipo, pruebas de funcionamiento y capacitación de uso.',
  'Validez: 30 días. Pago: 40% anticipo, 60% al entregar. Garantía: 1 año en equipo, 2 años en mano de obra.',
  5,
  30,
  'hvac',
  true,
  5,
  '00000000-0000-0000-0000-000000000001',
  'Promoción Verano 2026',
  '2026-08-31'
),
(
  '00000000-0000-0000-0005-000000000003',
  '00000000-0000-0000-0000-000000000002',
  'Limpieza y Recarga de Gas',
  'Servicio de limpieza de sistema y recarga de refrigerante',
  '[
    {
      "service_id": null,
      "description": "Limpieza profunda del sistema",
      "quantity": 2,
      "unit_price": 900,
      "unit_type": "per_hour"
    },
    {
      "service_id": null,
      "description": "Recarga de refrigerante R410A",
      "quantity": 6,
      "unit_price": 400,
      "unit_type": "per_unit"
    }
  ]'::jsonb,
  'Servicio especializado para sistemas con bajo rendimiento. Incluye diagnóstico previo sin costo.',
  'Validez: 30 días. Pago: total al completar. Garantía: 1 mes en servicio realizado.',
  0,
  30,
  'hvac',
  true,
  2,
  '00000000-0000-0000-0000-000000000001',
  NULL,
  NULL
),
(
  '00000000-0000-0000-0005-000000000004',
  '00000000-0000-0000-0000-000000000002',
  'Sistema de Ventilación Comercial',
  'Diseño e instalación de sistemas de ventilación para espacios comerciales',
  '[
    {
      "service_id": null,
      "description": "Evaluación técnica y diseño del sistema",
      "quantity": 4,
      "unit_price": 2500,
      "unit_type": "per_hour"
    },
    {
      "service_id": null,
      "description": "Ductos y dampers",
      "quantity": 80,
      "unit_price": 350,
      "unit_type": "per_unit"
    },
    {
      "service_id": null,
      "description": "Equipo de ventilación profesional",
      "quantity": 1,
      "unit_price": 25000,
      "unit_type": "fixed"
    },
    {
      "service_id": null,
      "description": "Instalación e integración",
      "quantity": 16,
      "unit_price": 1800,
      "unit_type": "per_hour"
    }
  ]'::jsonb,
  'Sistema personalizado para negocios, oficinas y espacios públicos. Incluye planos, cálculos de flujo y cumplimiento normativo.',
  'Validez: 45 días. Pago: 30% anticipo, 30% a mitad de obra, 40% al completar. Garantía: 2 años en equipo, 3 años en mano de obra.',
  10,
  45,
  'hvac',
  true,
  1,
  '00000000-0000-0000-0000-000000000001',
  'Descuento Empresa',
  '2026-06-30'
),
(
  '00000000-0000-0000-0005-000000000005',
  '00000000-0000-0000-0000-000000000002',
  'Diagnóstico y Reparación',
  'Diagnóstico completo y reparación de equipos de aire acondicionado',
  '[
    {
      "service_id": null,
      "description": "Diagnóstico técnico (sin compromiso)",
      "quantity": 1,
      "unit_price": 500,
      "unit_type": "fixed"
    },
    {
      "service_id": null,
      "description": "Reparación y ajustes",
      "quantity": 3,
      "unit_price": 1500,
      "unit_type": "per_hour"
    },
    {
      "service_id": null,
      "description": "Repuestos y materiales",
      "quantity": 1,
      "unit_price": 2000,
      "unit_type": "fixed"
    }
  ]'::jsonb,
  'Evaluación completa del sistema para identificar problemas. Se presenta presupuesto antes de comenzar reparaciones.',
  'Validez: 30 días. Pago: total al completar. Garantía: 2 meses en mano de obra, 1 año en repuestos.',
  0,
  30,
  'hvac',
  true,
  4,
  '00000000-0000-0000-0000-000000000001',
  NULL,
  NULL
);

-- ================================================
-- 2. Work Events (10 rows)
-- ================================================

DELETE FROM work_events
WHERE id IN (
  '00000000-0000-0000-0006-000000000001',
  '00000000-0000-0000-0006-000000000002',
  '00000000-0000-0000-0006-000000000003',
  '00000000-0000-0000-0006-000000000004',
  '00000000-0000-0000-0006-000000000005',
  '00000000-0000-0000-0006-000000000006',
  '00000000-0000-0000-0006-000000000007',
  '00000000-0000-0000-0006-000000000008',
  '00000000-0000-0000-0006-000000000009',
  '00000000-0000-0000-0006-000000000010'
);

INSERT INTO work_events (
  id,
  organization_id,
  client_id,
  quote_id,
  assigned_to,
  title,
  event_type,
  scheduled_start,
  scheduled_end,
  address,
  notes,
  status
) VALUES
(
  '00000000-0000-0000-0006-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0002-000000000002',
  '00000000-0000-0000-0003-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Instalación AC residencial - Apartamento Centro',
  'instalacion',
  '2026-02-23 08:00:00+00:00',
  '2026-02-23 14:00:00+00:00',
  'Apartamento 302, Calle Principal 456, Centro',
  'Traer herramientas de instalación completa. Cliente solicita iniciar a las 8 AM.',
  'completado'
),
(
  '00000000-0000-0000-0006-000000000002',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0002-000000000003',
  '00000000-0000-0000-0003-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Medición para nuevo sistema',
  'medicion',
  '2026-02-24 09:00:00+00:00',
  '2026-02-24 10:30:00+00:00',
  'Casa, Avenida Comercial 789, Sector Oriente',
  'Tomar medidas de espacio, fotos de equipos existentes. Presupuestar sistema completo.',
  'completado'
),
(
  '00000000-0000-0000-0006-000000000003',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0002-000000000004',
  '00000000-0000-0000-0003-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'Mantenimiento preventivo mensual',
  'mantenimiento',
  '2026-02-25 10:00:00+00:00',
  '2026-02-25 11:30:00+00:00',
  'Oficina corporativa, Zona Empresarial 123',
  'Limpieza de filtros, inspección de refrigerante, prueba de funcionamiento.',
  'en_camino'
),
(
  '00000000-0000-0000-0006-000000000004',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0002-000000000002',
  NULL,
  '00000000-0000-0000-0000-000000000001',
  'Visita técnica - Diagnóstico de falla',
  'visita_tecnica',
  '2026-02-26 14:00:00+00:00',
  '2026-02-26 15:30:00+00:00',
  'Apartamento 302, Calle Principal 456, Centro',
  'Cliente reporta ruido anormal en unidad interior. Diagnosticar y presupuestar reparación.',
  'pendiente'
),
(
  '00000000-0000-0000-0006-000000000005',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0002-000000000003',
  '00000000-0000-0000-0003-000000000006',
  '00000000-0000-0000-0000-000000000001',
  'Recarga de gas refrigerante',
  'mantenimiento',
  '2026-02-27 08:00:00+00:00',
  '2026-02-27 09:30:00+00:00',
  'Casa, Avenida Comercial 789, Sector Oriente',
  'Sistema con baja carga. Evacuar, recargar R410A, verificar presiones.',
  'pendiente'
),
(
  '00000000-0000-0000-0006-000000000006',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0002-000000000004',
  '00000000-0000-0000-0003-000000000009',
  '00000000-0000-0000-0000-000000000001',
  'Revisión post-instalación',
  'visita_tecnica',
  '2026-02-28 11:00:00+00:00',
  '2026-02-28 12:00:00+00:00',
  'Oficina corporativa, Zona Empresarial 123',
  'Verificar instalación anterior. Cliente reporta funcionamiento correcto.',
  'pendiente'
),
(
  '00000000-0000-0000-0006-000000000007',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0002-000000000002',
  '00000000-0000-0000-0003-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Seguimiento cliente - Satisfacción',
  'otro',
  '2026-03-03 15:00:00+00:00',
  '2026-03-03 15:30:00+00:00',
  'Llamada telefónica',
  'Seguimiento post-venta. Verificar que cliente está satisfecho con la instalación.',
  'pendiente'
),
(
  '00000000-0000-0000-0006-000000000008',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0002-000000000003',
  NULL,
  '00000000-0000-0000-0000-000000000001',
  'Cotización - Sistema ventilación comercial',
  'medicion',
  '2026-03-04 09:00:00+00:00',
  '2026-03-04 12:00:00+00:00',
  'Centro comercial, Avenida Principal 555',
  'Evaluación completa para sistema de ventilación. Traer equipos de medición. Presupuesto para 15 espacios.',
  'pendiente'
),
(
  '00000000-0000-0000-0006-000000000009',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0002-000000000004',
  '00000000-0000-0000-0003-000000000014',
  '00000000-0000-0000-0000-000000000001',
  'Mantenimiento contrato anual',
  'mantenimiento',
  '2026-02-23 13:00:00+00:00',
  '2026-02-23 14:30:00+00:00',
  'Oficina corporativa, Zona Empresarial 123',
  'Servicio incluido en contrato anual. Limpieza profunda, inspección, ajustes.',
  'completado'
),
(
  '00000000-0000-0000-0006-000000000010',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0002-000000000002',
  '00000000-0000-0000-0003-000000000015',
  '00000000-0000-0000-0000-000000000001',
  'Inspección anual equipos',
  'visita_tecnica',
  '2026-03-05 10:00:00+00:00',
  '2026-03-05 11:00:00+00:00',
  'Apartamento 302, Calle Principal 456, Centro',
  'Inspección anual de garantía. Certificar que equipo funciona correctamente.',
  'pendiente'
);

-- ================================================
-- 3. Quote Payments (8 rows)
-- ================================================

DELETE FROM quote_payments
WHERE id IN (
  '00000000-0000-0000-0007-000000000001',
  '00000000-0000-0000-0007-000000000002',
  '00000000-0000-0000-0007-000000000003',
  '00000000-0000-0000-0007-000000000004',
  '00000000-0000-0000-0007-000000000005',
  '00000000-0000-0000-0007-000000000006',
  '00000000-0000-0000-0007-000000000007',
  '00000000-0000-0000-0007-000000000008'
);

INSERT INTO quote_payments (
  id,
  organization_id,
  quote_id,
  amount,
  payment_type,
  payment_method,
  payment_date,
  notes,
  received_by
) VALUES
(
  '00000000-0000-0000-0007-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0003-000000000001',
  14656.60,
  'anticipo',
  'transferencia',
  '2026-02-15',
  'Anticipo para mantenimiento preventivo. Transferencia bancaria confirmada.',
  '00000000-0000-0000-0000-000000000001'
),
(
  '00000000-0000-0000-0007-000000000002',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0003-000000000002',
  20000.00,
  'anticipo',
  'transferencia',
  '2026-02-16',
  'Anticipo 35% para instalación residencial.',
  '00000000-0000-0000-0000-000000000001'
),
(
  '00000000-0000-0000-0007-000000000003',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0003-000000000002',
  15000.00,
  'parcial',
  'transferencia',
  '2026-02-20',
  'Pago parcial durante la instalación. Falta liquidación final.',
  '00000000-0000-0000-0000-000000000001'
),
(
  '00000000-0000-0000-0007-000000000004',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0003-000000000004',
  90000.00,
  'anticipo',
  'transferencia',
  '2026-02-10',
  'Anticipo 50% para sistema ventilación comercial. Proyecto grande.',
  '00000000-0000-0000-0000-000000000001'
),
(
  '00000000-0000-0000-0007-000000000005',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0003-000000000004',
  50000.00,
  'parcial',
  'transferencia',
  '2026-02-18',
  'Pago parcial a mitad de obra. Proyecto en ejecución.',
  '00000000-0000-0000-0000-000000000001'
),
(
  '00000000-0000-0000-0007-000000000006',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0003-000000000006',
  43639.20,
  'anticipo',
  'efectivo',
  '2026-02-12',
  'Anticipo en efectivo. Recibido por técnico en sitio.',
  '00000000-0000-0000-0000-000000000001'
),
(
  '00000000-0000-0000-0007-000000000007',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0003-000000000014',
  12162.60,
  'liquidacion',
  'transferencia',
  '2026-02-22',
  'Pago final y liquidación completa del servicio.',
  '00000000-0000-0000-0000-000000000001'
),
(
  '00000000-0000-0000-0007-000000000008',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0003-000000000015',
  4698.00,
  'liquidacion',
  'efectivo',
  '2026-02-21',
  'Pago final en efectivo. Diagnóstico y reparación completados.',
  '00000000-0000-0000-0000-000000000001'
);

-- ================================================
-- Verification Queries (for testing after migration)
-- ================================================
-- SELECT COUNT(*) FROM quote_templates WHERE organization_id = '00000000-0000-0000-0000-000000000002';
-- SELECT COUNT(*) FROM work_events WHERE organization_id = '00000000-0000-0000-0000-000000000002';
-- SELECT COUNT(*) FROM quote_payments WHERE organization_id = '00000000-0000-0000-0000-000000000002';
