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
-- 0. Foundation: org, auth user, profile, clients, services
-- ================================================

INSERT INTO organizations (id, name, slug, subscription_status, plan)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'ClimaSol HVAC',
  'climasol-hvac',
  'active',
  'pro'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new,
  email_change, phone_change, email_change_token_current,
  is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'demo@climasol.mx',
  crypt('ClimaSol2026!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"organization_id":"00000000-0000-0000-0000-000000000002","full_name":"Demo Admin"}'::jsonb,
  '', '', '',
  '', '', '',
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  created_at, updated_at, last_sign_in_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"demo@climasol.mx"}'::jsonb,
  'email',
  '00000000-0000-0000-0000-000000000001',
  NOW(), NOW(), NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO profiles (id, organization_id, role, email, full_name)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'owner',
  'demo@climasol.mx',
  'Demo Admin'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (id, organization_id, name, email, phone, company_name, address, city, created_by) VALUES
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000002', 'Juan Perez', 'juan@example.com', '8121234567', 'Residencial Las Lomas', 'Av. Roble 123', 'Monterrey', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000002', 'Maria Garcia', 'maria@example.com', '8129876543', 'Hotel Sierra Madre', 'Blvd. Diaz Ordaz 456', 'San Pedro', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-000000000002', 'Carlos Rodriguez', 'carlos@example.com', '8125551234', 'Plaza Comercial Norte', 'Av. Universidad 789', 'Monterrey', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0000-000000000002', 'Ana Martinez', 'ana@example.com', '8124443210', 'Restaurante El Norte', 'Calle Morelos 321', 'Guadalupe', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0002-000000000005', '00000000-0000-0000-0000-000000000002', 'Roberto Torres', 'roberto@example.com', '8127778899', 'Oficinas Torres Mora', 'Av. Lazaro Cardenas 500', 'Monterrey', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0002-000000000006', '00000000-0000-0000-0000-000000000002', 'Laura Fernandez', 'laura@example.com', '8123336644', 'Clinica Dental Sonrisa', 'Calle Hidalgo 88', 'San Nicolas', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0002-000000000007', '00000000-0000-0000-0000-000000000002', 'Pedro Sanchez', 'pedro@example.com', '8126665544', 'Gym Power Fitness', 'Av. Eugenio Garza Sada 1200', 'Monterrey', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0002-000000000008', '00000000-0000-0000-0000-000000000002', 'Sofia Lopez', 'sofia@example.com', '8128887722', 'Escuela Primaria Sol', 'Calle Juarez 45', 'Apodaca', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0002-000000000009', '00000000-0000-0000-0000-000000000002', 'Miguel Ramirez', 'miguel@example.com', '8122221133', 'Taller Mecanico Ramirez', 'Av. Madero 670', 'Escobedo', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0002-000000000010', '00000000-0000-0000-0000-000000000002', 'Isabella Herrera', 'isabella@example.com', '8129994455', 'Boutique Moda Chic', 'Calle Padre Mier 200', 'Monterrey', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO service_catalog (id, organization_id, name, description, unit_price, unit_type, category, is_active) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000002', 'Instalacion Minisplit 1 Ton', 'Instalacion completa de minisplit de 1 tonelada', 4500.00, 'fixed', 'hvac', true),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000002', 'Mantenimiento Preventivo', 'Limpieza, revision de gas y filtros', 800.00, 'fixed', 'hvac', true),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000002', 'Recarga de Gas R410A', 'Recarga de refrigerante R410A por libra', 350.00, 'per_unit', 'hvac', true),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000002', 'Diagnostico General', 'Revision y diagnostico de fallas', 500.00, 'fixed', 'hvac', true),
  ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000002', 'Mano de Obra Tecnico', 'Hora de trabajo de tecnico certificado', 250.00, 'per_hour', 'hvac', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO quotes (id, organization_id, client_id, quote_number, status, subtotal, tax_rate, tax_amount, total, valid_until, notes, created_by, created_at) VALUES
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0002-000000000001', 'COT-2026-001', 'draft', 4500.00, 16, 720.00, 5220.00, '2026-03-15', 'Instalacion minisplit residencial', '00000000-0000-0000-0000-000000000001', '2026-02-01'),
  ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0002-000000000002', 'COT-2026-002', 'sent', 12000.00, 16, 1920.00, 13920.00, '2026-03-20', 'Mantenimiento hotel 15 unidades', '00000000-0000-0000-0000-000000000001', '2026-02-05'),
  ('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0002-000000000003', 'COT-2026-003', 'accepted', 25000.00, 16, 4000.00, 29000.00, '2026-03-25', 'Instalacion sistema central plaza comercial', '00000000-0000-0000-0000-000000000001', '2026-02-10'),
  ('00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0002-000000000004', 'COT-2026-004', 'rejected', 3200.00, 16, 512.00, 3712.00, '2026-02-28', 'Reparacion equipo restaurante', '00000000-0000-0000-0000-000000000001', '2026-02-08'),
  ('00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0002-000000000005', 'COT-2026-005', 'en_instalacion', 18000.00, 16, 2880.00, 20880.00, '2026-03-30', 'Instalacion 2 minisplits oficinas', '00000000-0000-0000-0000-000000000001', '2026-02-12')
ON CONFLICT (id) DO NOTHING;

INSERT INTO quote_items (id, quote_id, description, quantity, unit_price, unit_type, subtotal) VALUES
  ('00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0003-000000000001', 'Instalacion Minisplit 1 Ton', 1, 4500.00, 'fixed', 4500.00),
  ('00000000-0000-0000-0006-000000000002', '00000000-0000-0000-0003-000000000002', 'Mantenimiento Preventivo', 15, 800.00, 'fixed', 12000.00),
  ('00000000-0000-0000-0006-000000000003', '00000000-0000-0000-0003-000000000003', 'Instalacion Sistema Central', 1, 25000.00, 'fixed', 25000.00),
  ('00000000-0000-0000-0006-000000000004', '00000000-0000-0000-0003-000000000004', 'Diagnostico + Reparacion', 1, 3200.00, 'fixed', 3200.00),
  ('00000000-0000-0000-0006-000000000005', '00000000-0000-0000-0003-000000000005', 'Instalacion Minisplit 1.5 Ton', 2, 9000.00, 'fixed', 18000.00)
ON CONFLICT (id) DO NOTHING;

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
  '00000000-0000-0000-0003-000000000003',
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
  '00000000-0000-0000-0003-000000000004',
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
  '00000000-0000-0000-0003-000000000002',
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
  '00000000-0000-0000-0003-000000000005',
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
  '00000000-0000-0000-0003-000000000003',
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
  '00000000-0000-0000-0003-000000000002',
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
  '00000000-0000-0000-0003-000000000005',
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
