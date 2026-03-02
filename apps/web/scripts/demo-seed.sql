-- ============================================================
-- CotizaPro — Demo Seed: ClimaSol HVAC Business
-- ============================================================
-- Scenario: "ClimaSol - Soluciones en Aire Acondicionado"
--   A realistic HVAC provider in Mexico with:
--   - 15 services (equipment sales + installation + maintenance + repair)
--   - 10 clients (residential + commercial across CDMX / MTY / GDL)
--   - 15 quotes in various statuses (draft/sent/viewed/accepted/rejected/expired)
--   - 10 follow-up reminders (pending/completed/snoozed, some overdue, some recurring)
--
-- DEMO CREDENTIALS:
--   Email   : demo@climasol.mx
--   Password: ClimaSol2026!
--
-- HOW TO RUN:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this entire file
--   3. Click "Run" (uses service role — bypasses RLS)
--
-- To clean up demo data:
--   DELETE FROM organizations WHERE id = '00000000-0000-0000-0000-000000000002';
--   DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001';
-- ============================================================

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- STEP 0: Clean up previous demo data (idempotent)
-- ============================================================

-- Delete org cascades to: clients, service_catalog, quotes, quote_items, reminders
DELETE FROM organizations WHERE id = '00000000-0000-0000-0000-000000000002';

-- Delete auth user cascades to: profiles (via ON DELETE CASCADE)
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001';

-- ============================================================
-- STEP 1: Create demo auth user
-- ============================================================

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  phone
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'demo@climasol.mx',
  crypt('ClimaSol2026!', gen_salt('bf')),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Demo ClimaSol"}',
  FALSE,
  NOW(),
  NOW(),
  '',
  '',
  '',
  '',
  NULL
);

-- Create auth identity (required for email/password login)
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'demo@climasol.mx',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"demo@climasol.mx","email_verified":true,"provider":"email"}',
  'email',
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 2: Create organization
-- ============================================================

INSERT INTO organizations (
  id,
  name,
  slug,
  subscription_status,
  plan,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'ClimaSol - Soluciones en Aire Acondicionado',
  'climasol',
  'active',
  'pro',
  NOW(),
  NOW()
);

-- ============================================================
-- STEP 3: Create profile (owner role)
-- ============================================================

INSERT INTO profiles (
  id,
  organization_id,
  role,
  email,
  full_name,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'owner',
  'demo@climasol.mx',
  'Alejandro Ruiz Navarro',
  NOW(),
  NOW()
);

-- ============================================================
-- STEP 4: Service Catalog (15 HVAC services)
-- ============================================================

INSERT INTO service_catalog (id, organization_id, name, category, description, unit_price, unit_type, estimated_duration_minutes, is_active) VALUES

-- Equipment Sales
('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000002',
 'Equipo Minisplit Inverter 9,000 BTU', 'hvac',
 'Minisplit inverter 9,000 BTU frío/calor, marca Carrier o equivalente. Incluye soporte de pared.',
 5800.00, 'per_unit', NULL, TRUE),

('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000002',
 'Equipo Minisplit Inverter 12,000 BTU', 'hvac',
 'Minisplit inverter 12,000 BTU (1 ton) frío/calor, marca Carrier o equivalente. Control remoto y WiFi incluidos.',
 7200.00, 'per_unit', NULL, TRUE),

('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000002',
 'Equipo Minisplit Inverter 18,000 BTU', 'hvac',
 'Minisplit inverter 18,000 BTU (1.5 ton) frío/calor, alta eficiencia SEER 20.',
 9800.00, 'per_unit', NULL, TRUE),

('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000002',
 'Equipo Minisplit Inverter 24,000 BTU', 'hvac',
 'Minisplit inverter 24,000 BTU (2 ton) frío/calor, alta eficiencia SEER 22.',
 12500.00, 'per_unit', NULL, TRUE),

('00000000-0000-0000-0001-000000000013', '00000000-0000-0000-0000-000000000002',
 'Sistema Multi-Split (2 zonas)', 'hvac',
 'Sistema multi-split para 2 zonas independientes, unidad exterior de alta capacidad. Incluye 2 unidades interiores de 12,000 BTU.',
 18000.00, 'fixed', NULL, TRUE),

('00000000-0000-0000-0001-000000000014', '00000000-0000-0000-0000-000000000002',
 'Sistema VRF Comercial (por zona)', 'hvac',
 'Sistema de volumen de refrigerante variable (VRF) para aplicaciones comerciales. Precio por zona de hasta 18,000 BTU.',
 45000.00, 'per_unit', NULL, TRUE),

-- Installation Services
('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000002',
 'Instalación Minisplit 9,000 BTU', 'hvac',
 'Instalación completa de minisplit 9K BTU. Incluye montaje, carga de gas, cableado hasta 5m y prueba de funcionamiento.',
 4500.00, 'fixed', 240, TRUE),

('00000000-0000-0000-0001-000000000006', '00000000-0000-0000-0000-000000000002',
 'Instalación Minisplit 12,000 BTU', 'hvac',
 'Instalación completa de minisplit 12K BTU. Incluye montaje, carga de gas, cableado hasta 5m y prueba de funcionamiento.',
 5200.00, 'fixed', 300, TRUE),

('00000000-0000-0000-0001-000000000007', '00000000-0000-0000-0000-000000000002',
 'Instalación Minisplit 18,000 BTU', 'hvac',
 'Instalación completa de minisplit 18K BTU. Incluye montaje, carga de gas, cableado hasta 5m y soporte metálico.',
 6800.00, 'fixed', 360, TRUE),

('00000000-0000-0000-0001-000000000008', '00000000-0000-0000-0000-000000000002',
 'Instalación Minisplit 24,000 BTU', 'hvac',
 'Instalación completa de minisplit 24K BTU. Incluye montaje, carga de gas, cableado hasta 5m y soporte metálico reforzado.',
 8500.00, 'fixed', 420, TRUE),

-- Maintenance & Service
('00000000-0000-0000-0001-000000000009', '00000000-0000-0000-0000-000000000002',
 'Mantenimiento Preventivo Minisplit', 'hvac',
 'Mantenimiento preventivo completo: limpieza de filtros, serpentín evaporador y condensador, revisión de niveles de gas, prueba eléctrica y de temperatura.',
 750.00, 'fixed', 90, TRUE),

('00000000-0000-0000-0001-000000000010', '00000000-0000-0000-0000-000000000002',
 'Limpieza Profunda con Espuma', 'hvac',
 'Lavado profundo con espuma biodegradable de unidad interior y exterior. Incluye desinfección y eliminación de hongos y bacterias.',
 600.00, 'fixed', 120, TRUE),

('00000000-0000-0000-0001-000000000011', '00000000-0000-0000-0000-000000000002',
 'Mantenimiento Correctivo / Reparación', 'hvac',
 'Servicio técnico correctivo por hora. Diagnóstico incluido. Piezas de repuesto cotizadas por separado.',
 450.00, 'per_hour', 60, TRUE),

('00000000-0000-0000-0001-000000000012', '00000000-0000-0000-0000-000000000002',
 'Recarga de Gas Refrigerante R-410A', 'hvac',
 'Recarga de gas refrigerante R-410A por libra. Incluye verificación de fugas con detector electrónico.',
 850.00, 'per_unit', 60, TRUE),

('00000000-0000-0000-0001-000000000015', '00000000-0000-0000-0000-000000000002',
 'Revisión y Diagnóstico', 'hvac',
 'Revisión completa del sistema: diagnóstico eléctrico, mecánico y de refrigeración. Incluye reporte técnico escrito.',
 350.00, 'fixed', 60, TRUE);

-- ============================================================
-- STEP 5: Clients (10 realistic Mexican businesses & residences)
-- ============================================================

INSERT INTO clients (id, organization_id, name, email, phone, whatsapp_phone, address, city, state, postal_code, notes, tags, created_by, created_at) VALUES

('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000002',
 'María González Fuentes', 'maria.gonzalez@gmail.com', '55 1234 5678', '55 1234 5678',
 'Calle Roble 45, Col. Pedregal de San Ángel', 'Ciudad de México', 'CDMX', '01900',
 'Cliente residencial. 2 equipos instalados en sala y recámara principal. Prefiere comunicación por WhatsApp.',
 ARRAY['residencial', 'cliente-frecuente', 'whatsapp'],
 '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '8 months'),

('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000002',
 'Corporativo Noreste S.A. de C.V.', 'admin@corporativoNoreste.com.mx', '81 8765 4321', '81 8765 4320',
 'Av. Constitución 1200, Piso 8, Col. Centro', 'Monterrey', 'Nuevo León', '64000',
 'Empresa con 8 oficinas climatizadas. Contrato de mantenimiento semestral. Contacto: Ing. Roberto Sánchez.',
 ARRAY['comercial', 'contrato-mantenimiento', 'cliente-frecuente', 'alto-valor'],
 '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '7 months'),

('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-000000000002',
 'Restaurante El Asador del Río', 'contacto@elasador.com.mx', '33 3344 5566', '33 3344 5567',
 'Av. Vallarta 2800, Col. Americana', 'Guadalajara', 'Jalisco', '44160',
 'Restaurante con cocina industrial. 4 zonas de climatización. Requiere atención de emergencia disponible. Dueño: Carlos Ramos.',
 ARRAY['comercial', 'restaurante', 'urgencias'],
 '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '6 months'),

('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0000-000000000002',
 'Hotel Boutique Las Palmas', 'mantenimiento@laspalmashotel.com', '998 887 6543', '998 887 6544',
 'Blvd. Kukulcán Km 9.5, Zona Hotelera', 'Cancún', 'Quintana Roo', '77500',
 'Hotel boutique 4 estrellas, 32 habitaciones. Sistema VRF instalado en Dic 2025. Contrato de mantenimiento anual. Gerente: Ana Martínez.',
 ARRAY['comercial', 'hotelero', 'vrf', 'contrato-mantenimiento', 'alto-valor'],
 '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '9 months'),

('00000000-0000-0000-0002-000000000005', '00000000-0000-0000-0000-000000000002',
 'Luis Alejandro Torres Mora', 'ltorres@outlook.com', '55 9988 7766', '55 9988 7766',
 'Prolongación Paseo de la Reforma 1180, Col. Santa Fe', 'Ciudad de México', 'CDMX', '05348',
 'Residencia nueva en Santa Fe. Cotización pendiente para instalar 1 equipo recámara principal.',
 ARRAY['residencial', 'nuevo-cliente'],
 '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 months'),

('00000000-0000-0000-0002-000000000006', '00000000-0000-0000-0000-000000000002',
 'Clínica Dental Sonrisa Perfecta', 'recepcion@sonrisaperfecta.mx', '55 5678 9012', '55 5678 9013',
 'Av. Insurgentes Sur 1602, Col. Crédito Constructor', 'Ciudad de México', 'CDMX', '03940',
 '3 consultorios climatizados. Instalación realizada en Ene 2026. Dra. Patricia López. Requiere máxima limpieza en intervenciones.',
 ARRAY['comercial', 'salud', 'cliente-frecuente'],
 '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '5 months'),

('00000000-0000-0000-0002-000000000007', '00000000-0000-0000-0000-000000000002',
 'Centro Comercial Perinorte Plaza', 'operaciones@perinorte.com.mx', '55 5504 4400', NULL,
 'Calzada Vallejo 1210, Gustavo A. Madero', 'Ciudad de México', 'CDMX', '07780',
 'Centro comercial con 45,000 m². Proyecto de renovación HVAC en evaluación. Gerente de Operaciones: Gustavo Herrera. Proceso de licitación.',
 ARRAY['comercial', 'gran-proyecto', 'licitacion'],
 '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 months'),

('00000000-0000-0000-0002-000000000008', '00000000-0000-0000-0000-000000000002',
 'Edificio Corporativo Plaza Norte', 'facilities@plazanorte.com.mx', '81 8900 1122', '81 8900 1123',
 'Av. del Bosque 3000, Valle Oriente', 'San Pedro Garza García', 'Nuevo León', '66260',
 'Edificio corporativo 12 pisos, 10 zonas. Cotización perdida en Nov 2025 (precio). Mantener contacto para renovación futura.',
 ARRAY['comercial', 'corporativo', 'cotizacion-perdida'],
 '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '10 months'),

('00000000-0000-0000-0002-000000000009', '00000000-0000-0000-0000-000000000002',
 'Mario González Jiménez', 'mgonzalez@hotmail.com', '33 1122 3344', '33 1122 3344',
 'Calle Pino 88, Col. Bugambilias', 'Zapopan', 'Jalisco', '45236',
 'Residencia campestre 280 m². 5 equipos instalados en Ene 2026. Muy satisfecho con el servicio. Referido por cliente C1.',
 ARRAY['residencial', 'cliente-frecuente', 'referido'],
 '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '4 months'),

('00000000-0000-0000-0002-000000000010', '00000000-0000-0000-0000-000000000002',
 'Colegio Montessori Chapultepec', 'administracion@montessorichapultepec.edu.mx', '55 5553 1122', NULL,
 'Av. Constituyentes 455, Col. Daniel Garza', 'Ciudad de México', 'CDMX', '11830',
 'Colegio privado 35 aulas. Cotización para sistema completo expiró en Ene 2026 sin respuesta. Lic. Carmen Vega (directora). Recontactar para temporada calor.',
 ARRAY['comercial', 'educacion', 'cotizacion-vencida'],
 '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '11 months');

-- ============================================================
-- STEP 6: Quotes + Quote Items (15 quotes, various statuses)
-- ============================================================

-- Q1 — accepted — COT-2025-001 — María González — Instalación 2 minisplits
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, valid_until,
  subtotal, tax_rate, tax_amount, discount_rate, discount_amount, total,
  notes, terms_and_conditions, created_by, sent_at, viewed_at, accepted_at, created_at) VALUES
('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000001', 'COT-2025-001', 'accepted', '2025-11-14',
 26600.00, 16.00, 4043.20, 5.00, 1330.00, 29313.20,
 'Instalación de 2 equipos minisplit inverter 12K BTU en sala y recámara principal. Materiales incluidos.',
 'Garantía de 1 año en mano de obra. Garantía de equipo según fabricante (2 años). Pago: 50% anticipo, 50% contra entrega.',
 '00000000-0000-0000-0000-000000000001',
 '2025-10-16', '2025-10-17', '2025-10-22',
 '2025-10-15');

INSERT INTO quote_items (quote_id, service_id, description, quantity, unit_price, unit_type, subtotal, sort_order) VALUES
('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0001-000000000002', 'Equipo Minisplit Inverter 12,000 BTU', 2, 7200.00, 'per_unit', 14400.00, 0),
('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0001-000000000006', 'Instalación Minisplit 12,000 BTU', 2, 5200.00, 'fixed', 10400.00, 1),
('00000000-0000-0000-0003-000000000001', NULL, 'Materiales adicionales: tubing, cableado y soportes', 1, 1800.00, 'fixed', 1800.00, 2);

-- Q2 — accepted — COT-2025-002 — Corporativo Noreste — Sistema multi-zona
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, valid_until,
  subtotal, tax_rate, tax_amount, discount_rate, discount_amount, total,
  notes, terms_and_conditions, created_by, sent_at, viewed_at, accepted_at, created_at) VALUES
('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000002', 'COT-2025-002', 'accepted', '2025-12-05',
 54100.00, 16.00, 7963.52, 8.00, 4328.00, 57735.52,
 'Instalación de 2 sistemas multi-split (4 zonas en total) para pisos 7 y 8. Incluye materiales y obra civil menor.',
 'Garantía de 1 año en mano de obra. Pago: 40% anticipo, 40% al inicio de obra, 20% contra entrega.',
 '00000000-0000-0000-0000-000000000001',
 '2025-11-06', '2025-11-08', '2025-11-12',
 '2025-11-05');

INSERT INTO quote_items (quote_id, service_id, description, quantity, unit_price, unit_type, subtotal, sort_order) VALUES
('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0001-000000000013', 'Sistema Multi-Split (2 zonas)', 2, 18000.00, 'fixed', 36000.00, 0),
('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0001-000000000007', 'Instalación y puesta en marcha sistema multi-split', 2, 6800.00, 'fixed', 13600.00, 1),
('00000000-0000-0000-0003-000000000002', NULL, 'Materiales, obra civil menor y adecuaciones eléctricas', 1, 4500.00, 'fixed', 4500.00, 2);

-- Q3 — rejected — COT-2025-003 — Edificio Corporativo Plaza Norte — Gran proyecto perdido
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, valid_until,
  subtotal, tax_rate, tax_amount, discount_rate, discount_amount, total,
  notes, terms_and_conditions, created_by, sent_at, viewed_at, rejected_at, rejection_reason, created_at) VALUES
('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000008', 'COT-2025-003', 'rejected', '2025-12-20',
 248000.00, 16.00, 39680.00, 0.00, 0.00, 287680.00,
 'Propuesta para climatización completa de 10 zonas (pisos 1-10). Equipos de alta eficiencia para uso 24/7.',
 'Garantía de 1 año en mano de obra. Pago: 30% anticipo, 30% al 50% de avance, 40% contra entrega.',
 '00000000-0000-0000-0000-000000000001',
 '2025-11-21', '2025-11-24', '2025-11-28',
 'Optaron por proveedor con precio menor. No evaluaron calidad de equipos ni garantías.',
 '2025-11-20');

INSERT INTO quote_items (quote_id, service_id, description, quantity, unit_price, unit_type, subtotal, sort_order) VALUES
('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0001-000000000013', 'Sistema Multi-Split (2 zonas) - por piso', 10, 18000.00, 'fixed', 180000.00, 0),
('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0001-000000000007', 'Instalación y comisionamiento por sistema', 10, 6800.00, 'fixed', 68000.00, 1);

-- Q4 — accepted — COT-2025-004 — Hotel Boutique Las Palmas — Sistema VRF
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, valid_until,
  subtotal, tax_rate, tax_amount, discount_rate, discount_amount, total,
  notes, terms_and_conditions, created_by, sent_at, viewed_at, accepted_at, created_at) VALUES
('00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000004', 'COT-2025-004', 'accepted', '2026-01-09',
 164500.00, 16.00, 25004.00, 5.00, 8225.00, 181279.00,
 'Sistema VRF para 3 bloques del hotel (32 habitaciones). Incluye 3 unidades exteriores VRF, configuración BMS y 6 mantenimientos preventivos del primer año.',
 'Contrato de mantenimiento anual incluido. Garantía 2 años en sistema. Pago: 30% anticipo, 40% a inicio de obra, 30% contra recepción.',
 '00000000-0000-0000-0000-000000000001',
 '2025-12-11', '2025-12-14', '2025-12-18',
 '2025-12-10');

INSERT INTO quote_items (quote_id, service_id, description, quantity, unit_price, unit_type, subtotal, sort_order) VALUES
('00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0001-000000000014', 'Sistema VRF Comercial - unidad exterior (por zona de 18K BTU)', 3, 45000.00, 'per_unit', 135000.00, 0),
('00000000-0000-0000-0003-000000000004', NULL, 'Instalación completa sistema VRF: tubing, BMS y comisionamiento', 1, 25000.00, 'fixed', 25000.00, 1),
('00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0001-000000000009', 'Mantenimiento preventivo (6 servicios incluidos en contrato)', 6, 750.00, 'fixed', 4500.00, 2);

-- Q5 — expired — COT-2025-005 — Colegio Montessori — Cotización vencida
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, valid_until,
  subtotal, tax_rate, tax_amount, discount_rate, discount_amount, total,
  notes, created_by, sent_at, viewed_at, created_at) VALUES
('00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000010', 'COT-2025-005', 'expired', '2026-01-19',
 127750.00, 16.00, 20440.00, 0.00, 0.00, 148190.00,
 'Propuesta para climatización de 35 aulas + sala de maestros + oficinas. Sistemas multi-split por zona.',
 '00000000-0000-0000-0000-000000000001',
 '2025-12-21', '2025-12-22',
 '2025-12-20');

INSERT INTO quote_items (quote_id, service_id, description, quantity, unit_price, unit_type, subtotal, sort_order) VALUES
('00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0001-000000000013', 'Sistema Multi-Split (2 zonas) - por bloque de aulas', 5, 18000.00, 'fixed', 90000.00, 0),
('00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0001-000000000007', 'Instalación y puesta en marcha por sistema', 5, 6800.00, 'fixed', 34000.00, 1),
('00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0001-000000000009', 'Mantenimiento preventivo anual incluido (5 equipos)', 5, 750.00, 'fixed', 3750.00, 2);

-- Q6 — accepted — COT-2026-001 — Residencia Campestre González — Instalación completa 5 equipos
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, valid_until,
  subtotal, tax_rate, tax_amount, discount_rate, discount_amount, total,
  notes, terms_and_conditions, created_by, sent_at, viewed_at, accepted_at, created_at) VALUES
('00000000-0000-0000-0003-000000000006', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000009', 'COT-2026-001', 'accepted', '2026-02-07',
 79200.00, 16.00, 12038.40, 5.00, 3960.00, 87278.40,
 'Instalación completa residencia Bugambilias: 2 equipos 24K BTU (sala + comedor) y 3 equipos 12K BTU (3 recámaras).',
 'Garantía 1 año mano de obra. Pago: 50% anticipo, 50% contra entrega.',
 '00000000-0000-0000-0000-000000000001',
 '2026-01-09', '2026-01-11', '2026-01-15',
 '2026-01-08');

INSERT INTO quote_items (quote_id, service_id, description, quantity, unit_price, unit_type, subtotal, sort_order) VALUES
('00000000-0000-0000-0003-000000000006', '00000000-0000-0000-0001-000000000004', 'Equipo Minisplit Inverter 24,000 BTU', 2, 12500.00, 'per_unit', 25000.00, 0),
('00000000-0000-0000-0003-000000000006', '00000000-0000-0000-0001-000000000002', 'Equipo Minisplit Inverter 12,000 BTU', 3, 7200.00, 'per_unit', 21600.00, 1),
('00000000-0000-0000-0003-000000000006', '00000000-0000-0000-0001-000000000008', 'Instalación Minisplit 24,000 BTU', 2, 8500.00, 'fixed', 17000.00, 2),
('00000000-0000-0000-0003-000000000006', '00000000-0000-0000-0001-000000000006', 'Instalación Minisplit 12,000 BTU', 3, 5200.00, 'fixed', 15600.00, 3);

-- Q7 — sent — COT-2026-002 — Restaurante El Asador — Renovación HVAC
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, valid_until,
  subtotal, tax_rate, tax_amount, discount_rate, discount_amount, total,
  notes, terms_and_conditions, created_by, sent_at, created_at) VALUES
('00000000-0000-0000-0003-000000000007', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000003', 'COT-2026-002', 'sent', '2026-02-14',
 84350.00, 16.00, 12146.40, 10.00, 8435.00, 88061.40,
 'Renovación completa sistema de climatización restaurante. 4 zonas independientes: cocina, salón principal, bar y privado.',
 'Descuento especial por volumen. Garantía 1 año. Pago: 40% anticipo, 60% contra entrega.',
 '00000000-0000-0000-0000-000000000001',
 '2026-01-16',
 '2026-01-15');

INSERT INTO quote_items (quote_id, service_id, description, quantity, unit_price, unit_type, subtotal, sort_order) VALUES
('00000000-0000-0000-0003-000000000007', '00000000-0000-0000-0001-000000000004', 'Equipo Minisplit Inverter 24,000 BTU (por zona)', 4, 12500.00, 'per_unit', 50000.00, 0),
('00000000-0000-0000-0003-000000000007', '00000000-0000-0000-0001-000000000008', 'Instalación Minisplit 24,000 BTU', 4, 8500.00, 'fixed', 34000.00, 1),
('00000000-0000-0000-0003-000000000007', '00000000-0000-0000-0001-000000000015', 'Revisión y diagnóstico sistema actual antes de instalación', 1, 350.00, 'fixed', 350.00, 2);

-- Q8 — viewed — COT-2026-003 — Clínica Dental Sonrisa — 3 equipos + recarga
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, valid_until,
  subtotal, tax_rate, tax_amount, discount_rate, discount_amount, total,
  notes, created_by, sent_at, viewed_at, created_at) VALUES
('00000000-0000-0000-0003-000000000008', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000006', 'COT-2026-003', 'viewed', '2026-02-21',
 39750.00, 16.00, 6042.00, 5.00, 1987.50, 43804.50,
 '3 equipos para los 3 consultorios dentales. Incluye recarga de gas R-410A para equipo existente en recepción.',
 '00000000-0000-0000-0000-000000000001',
 '2026-01-23', '2026-01-25',
 '2026-01-22');

INSERT INTO quote_items (quote_id, service_id, description, quantity, unit_price, unit_type, subtotal, sort_order) VALUES
('00000000-0000-0000-0003-000000000008', '00000000-0000-0000-0001-000000000002', 'Equipo Minisplit Inverter 12,000 BTU', 3, 7200.00, 'per_unit', 21600.00, 0),
('00000000-0000-0000-0003-000000000008', '00000000-0000-0000-0001-000000000006', 'Instalación Minisplit 12,000 BTU', 3, 5200.00, 'fixed', 15600.00, 1),
('00000000-0000-0000-0003-000000000008', '00000000-0000-0000-0001-000000000012', 'Recarga Gas Refrigerante R-410A (equipo recepción)', 3, 850.00, 'per_unit', 2550.00, 2);

-- Q9 — accepted — COT-2026-004 — María González — Mantenimiento anual
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, valid_until,
  subtotal, tax_rate, tax_amount, discount_rate, discount_amount, total,
  notes, created_by, sent_at, accepted_at, created_at) VALUES
('00000000-0000-0000-0003-000000000009', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000001', 'COT-2026-004', 'accepted', '2026-02-28',
 3550.00, 16.00, 568.00, 0.00, 0.00, 4118.00,
 'Mantenimiento anual preventivo para los 2 equipos instalados en Octubre 2025. Incluye limpieza profunda y revisión de gas.',
 '00000000-0000-0000-0000-000000000001',
 '2026-01-31', '2026-02-01',
 '2026-01-30');

INSERT INTO quote_items (quote_id, service_id, description, quantity, unit_price, unit_type, subtotal, sort_order) VALUES
('00000000-0000-0000-0003-000000000009', '00000000-0000-0000-0001-000000000009', 'Mantenimiento Preventivo Minisplit', 2, 750.00, 'fixed', 1500.00, 0),
('00000000-0000-0000-0003-000000000009', '00000000-0000-0000-0001-000000000012', 'Recarga Gas Refrigerante R-410A', 1, 850.00, 'per_unit', 850.00, 1),
('00000000-0000-0000-0003-000000000009', '00000000-0000-0000-0001-000000000010', 'Limpieza Profunda con Espuma', 2, 600.00, 'fixed', 1200.00, 2);

-- Q10 — sent — COT-2026-005 — Casa Torres — Minisplit 18K BTU
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, valid_until,
  subtotal, tax_rate, tax_amount, discount_rate, discount_amount, total,
  notes, created_by, sent_at, created_at) VALUES
('00000000-0000-0000-0003-000000000010', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000005', 'COT-2026-005', 'sent', '2026-03-04',
 16600.00, 16.00, 2656.00, 0.00, 0.00, 19256.00,
 'Equipo e instalación para recámara principal. Pared exterior de 25cm requiere adaptación de tubing.',
 '00000000-0000-0000-0000-000000000001',
 '2026-02-03',
 '2026-02-02');

INSERT INTO quote_items (quote_id, service_id, description, quantity, unit_price, unit_type, subtotal, sort_order) VALUES
('00000000-0000-0000-0003-000000000010', '00000000-0000-0000-0001-000000000003', 'Equipo Minisplit Inverter 18,000 BTU', 1, 9800.00, 'per_unit', 9800.00, 0),
('00000000-0000-0000-0003-000000000010', '00000000-0000-0000-0001-000000000007', 'Instalación Minisplit 18,000 BTU', 1, 6800.00, 'fixed', 6800.00, 1);

-- Q11 — draft — COT-2026-006 — Centro Comercial Perinorte — Gran proyecto VRF
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, valid_until,
  subtotal, tax_rate, tax_amount, discount_rate, discount_amount, total,
  notes, created_by, created_at) VALUES
('00000000-0000-0000-0003-000000000011', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000007', 'COT-2026-006', 'draft', '2026-03-10',
 362400.00, 16.00, 51025.92, 12.00, 43488.00, 369937.92,
 'BORRADOR — Propuesta inicial para licitación. Pendiente revisión con gerencia antes de enviar. 8 zonas VRF + inspección general.',
 '00000000-0000-0000-0000-000000000001',
 '2026-02-08');

INSERT INTO quote_items (quote_id, service_id, description, quantity, unit_price, unit_type, subtotal, sort_order) VALUES
('00000000-0000-0000-0003-000000000011', '00000000-0000-0000-0001-000000000014', 'Sistema VRF Comercial (por zona de hasta 18K BTU)', 8, 45000.00, 'per_unit', 360000.00, 0),
('00000000-0000-0000-0003-000000000011', '00000000-0000-0000-0001-000000000015', 'Inspección y diagnóstico sistema existente', 4, 600.00, 'per_hour', 2400.00, 1);

-- Q12 — viewed — COT-2026-007 — Hotel Las Palmas — Mantenimiento semestral
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, valid_until,
  subtotal, tax_rate, tax_amount, discount_rate, discount_amount, total,
  notes, created_by, sent_at, viewed_at, created_at) VALUES
('00000000-0000-0000-0003-000000000012', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000004', 'COT-2026-007', 'viewed', '2026-03-12',
 9300.00, 16.00, 1413.60, 5.00, 465.00, 10248.60,
 'Mantenimiento semestral del sistema VRF instalado en Diciembre 2025. 6 unidades interiores + inspección de centrales.',
 '00000000-0000-0000-0000-000000000001',
 '2026-02-11', '2026-02-12',
 '2026-02-10');

INSERT INTO quote_items (quote_id, service_id, description, quantity, unit_price, unit_type, subtotal, sort_order) VALUES
('00000000-0000-0000-0003-000000000012', '00000000-0000-0000-0001-000000000009', 'Mantenimiento Preventivo unidad interior VRF', 6, 750.00, 'fixed', 4500.00, 0),
('00000000-0000-0000-0003-000000000012', '00000000-0000-0000-0001-000000000010', 'Limpieza Profunda con Espuma', 6, 600.00, 'fixed', 3600.00, 1),
('00000000-0000-0000-0003-000000000012', '00000000-0000-0000-0001-000000000015', 'Inspección unidades exteriores VRF', 2, 600.00, 'per_hour', 1200.00, 2);

-- Q13 — draft — COT-2026-008 — Restaurante El Asador — Reparación emergente
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, valid_until,
  subtotal, tax_rate, tax_amount, discount_rate, discount_amount, total,
  notes, created_by, created_at) VALUES
('00000000-0000-0000-0003-000000000013', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000003', 'COT-2026-008', 'draft', '2026-03-14',
 3400.00, 16.00, 544.00, 0.00, 0.00, 3944.00,
 'BORRADOR — Reparación emergente: unidad del bar perdió gas. Diagnóstico inicial indica fuga en serpentín. Pendiente confirmar con cliente.',
 '00000000-0000-0000-0000-000000000001',
 '2026-02-12');

INSERT INTO quote_items (quote_id, service_id, description, quantity, unit_price, unit_type, subtotal, sort_order) VALUES
('00000000-0000-0000-0003-000000000013', '00000000-0000-0000-0001-000000000015', 'Revisión y Diagnóstico', 1, 350.00, 'fixed', 350.00, 0),
('00000000-0000-0000-0003-000000000013', '00000000-0000-0000-0001-000000000011', 'Mantenimiento Correctivo / Reparación serpentín', 3, 450.00, 'per_hour', 1350.00, 1),
('00000000-0000-0000-0003-000000000013', '00000000-0000-0000-0001-000000000012', 'Recarga Gas Refrigerante R-410A', 2, 850.00, 'per_unit', 1700.00, 2);

-- Q14 — sent — COT-2026-009 — Corporativo Noreste — Mantenimiento semestral
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, valid_until,
  subtotal, tax_rate, tax_amount, discount_rate, discount_amount, total,
  notes, terms_and_conditions, created_by, sent_at, created_at) VALUES
('00000000-0000-0000-0003-000000000014', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000002', 'COT-2026-009', 'sent', '2026-03-16',
 11650.00, 16.00, 1677.60, 10.00, 1165.00, 12162.60,
 'Mantenimiento semestral de los 8 equipos de oficina. Incluye corrección de fallas reportadas en 3 equipos.',
 'Descuento por contrato. Facturación mensual disponible.',
 '00000000-0000-0000-0000-000000000001',
 '2026-02-14',
 '2026-02-14');

INSERT INTO quote_items (quote_id, service_id, description, quantity, unit_price, unit_type, subtotal, sort_order) VALUES
('00000000-0000-0000-0003-000000000014', '00000000-0000-0000-0001-000000000009', 'Mantenimiento Preventivo Minisplit', 8, 750.00, 'fixed', 6000.00, 0),
('00000000-0000-0000-0003-000000000014', '00000000-0000-0000-0001-000000000012', 'Recarga Gas Refrigerante R-410A (equipos con fuga)', 4, 850.00, 'per_unit', 3400.00, 1),
('00000000-0000-0000-0003-000000000014', '00000000-0000-0000-0001-000000000011', 'Reparación correctiva (3 equipos con fallas)', 5, 450.00, 'per_hour', 2250.00, 2);

-- Q15 — accepted — COT-2026-010 — Clínica Dental Sonrisa — Mantenimiento preventivo
INSERT INTO quotes (id, organization_id, client_id, quote_number, status, valid_until,
  subtotal, tax_rate, tax_amount, discount_rate, discount_amount, total,
  notes, created_by, sent_at, accepted_at, created_at) VALUES
('00000000-0000-0000-0003-000000000015', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000006', 'COT-2026-010', 'accepted', '2026-03-17',
 4050.00, 16.00, 648.00, 0.00, 0.00, 4698.00,
 'Primer mantenimiento preventivo de los 3 equipos instalados en Enero 2026.',
 '00000000-0000-0000-0000-000000000001',
 '2026-02-15', '2026-02-15',
 '2026-02-15');

INSERT INTO quote_items (quote_id, service_id, description, quantity, unit_price, unit_type, subtotal, sort_order) VALUES
('00000000-0000-0000-0003-000000000015', '00000000-0000-0000-0001-000000000009', 'Mantenimiento Preventivo Minisplit', 3, 750.00, 'fixed', 2250.00, 0),
('00000000-0000-0000-0003-000000000015', '00000000-0000-0000-0001-000000000010', 'Limpieza Profunda con Espuma', 3, 600.00, 'fixed', 1800.00, 1);

-- ============================================================
-- STEP 7: Follow-up Reminders (10 reminders, mixed statuses)
-- ============================================================

INSERT INTO follow_up_reminders (id, organization_id, client_id, title, description, reminder_type, scheduled_date, status, priority, is_recurring, recurrence_interval_months, related_quote_id, related_service_category) VALUES

-- R1: Upcoming maintenance reminder (recurring)
('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000001',
 'Mantenimiento preventivo anual — María González',
 'Recordar a la cliente que es momento del mantenimiento anual de sus 2 equipos. Cotización COT-2026-004 ya aceptada. Programar fecha de visita.',
 'maintenance', '2026-03-01', 'pending', 'high', TRUE, 12,
 '00000000-0000-0000-0003-000000000009', 'hvac'),

-- R2: Follow-up on sent quote
('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000003',
 'Seguimiento cotización COT-2026-002 — Restaurante El Asador',
 'La cotización fue enviada hace 5 días. Llamar a Carlos Ramos para confirmar recepción y resolver dudas. Posible visita para confirmar medidas.',
 'follow_up', '2026-02-20', 'pending', 'normal', FALSE, NULL,
 '00000000-0000-0000-0003-000000000007', 'hvac'),

-- R3: Urgent contract renewal
('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000004',
 'Renovar contrato mantenimiento — Hotel Boutique Las Palmas',
 'El contrato de mantenimiento anual del hotel vence en Marzo. Enviar propuesta de renovación antes del 20 de Febrero. Cotización de mantenimiento semestral ya vista por cliente.',
 'renewal', '2026-02-18', 'pending', 'urgent', TRUE, 12,
 '00000000-0000-0000-0003-000000000012', 'hvac'),

-- R4: Completed maintenance reminder
('00000000-0000-0000-0004-000000000004', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000006',
 'Revisión semestral completada — Clínica Dental Sonrisa',
 'Mantenimiento preventivo semestral realizado satisfactoriamente. Dra. López muy contenta con el servicio. Agendar próximo mantenimiento para Julio 2026.',
 'maintenance', '2026-01-15', 'completed', 'normal', TRUE, 6,
 '00000000-0000-0000-0003-000000000015', 'hvac'),

-- R5: Future re-contact for lost client
('00000000-0000-0000-0004-000000000005', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000008',
 'Recontactar Edificio Corporativo Plaza Norte — Nueva oportunidad',
 'Perdimos licitación en Nov 2025 por precio. Recontactar en Marzo para presentar nueva propuesta con mejor esquema financiero o propuesta de mantenimiento solamente.',
 'follow_up', '2026-03-15', 'pending', 'normal', FALSE, NULL,
 NULL, 'hvac'),

-- R6: Snoozed low-priority reminder
('00000000-0000-0000-0004-000000000006', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000010',
 'Nueva temporada calor — Colegio Montessori',
 'La cotización expiró sin respuesta. Recontactar en Abril antes de la temporada de calor (Mayo-Agosto) con nueva propuesta actualizada.',
 'follow_up', '2026-04-01', 'snoozed', 'low', FALSE, NULL,
 NULL, 'hvac'),

-- R7: Upcoming maintenance (recurring) — referido
('00000000-0000-0000-0004-000000000007', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000009',
 'Primer mantenimiento anual — Residencia Campestre González',
 'Los 5 equipos llevan 1 mes instalados. Agendar primera revisión preventiva y verificar funcionamiento correcto. Cliente muy satisfecho, pedir referidos.',
 'maintenance', '2026-02-25', 'pending', 'high', TRUE, 12,
 '00000000-0000-0000-0003-000000000006', 'hvac'),

-- R8: Follow-up on large draft quote
('00000000-0000-0000-0004-000000000008', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000007',
 'Seguimiento propuesta VRF — Centro Comercial Perinorte',
 'Cotización COT-2026-006 en borrador (pendiente revisión interna). Confirmar con gerencia y enviar antes del 25 Feb para cumplir plazo de licitación.',
 'follow_up', '2026-02-22', 'pending', 'normal', FALSE, NULL,
 '00000000-0000-0000-0003-000000000011', 'hvac'),

-- R9: Completed — Corporativo Noreste post-installation
('00000000-0000-0000-0004-000000000009', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000002',
 'Confirmación satisfacción instalación — Corporativo Noreste',
 'Llamar a Ing. Roberto Sánchez para confirmar satisfacción con instalación completada. Ofrecer contrato mantenimiento semestral. COMPLETADO: cliente muy satisfecho y acepta cotización mantenimiento.',
 'follow_up', '2026-01-30', 'completed', 'high', FALSE, NULL,
 '00000000-0000-0000-0003-000000000002', 'hvac'),

-- R10: OVERDUE — Casa Torres (past date, still pending)
('00000000-0000-0000-0004-000000000010', '00000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0002-000000000005',
 'URGENTE: Primera revisión post-cotización — Casa Torres',
 'Luis Torres solicitó confirmación de disponibilidad antes del 10 de Febrero. Cotización enviada el 3 Feb pero no ha respondido. VENCIDO — llamar inmediatamente.',
 'maintenance', '2026-02-10', 'pending', 'urgent', FALSE, NULL,
 '00000000-0000-0000-0003-000000000010', 'hvac');

-- ============================================================
-- VERIFICATION: Count all inserted records
-- ============================================================

SELECT 'Demo data inserted successfully!' AS message;
SELECT 'auth.users' AS table_name, COUNT(*) AS count FROM auth.users WHERE email = 'demo@climasol.mx'
UNION ALL SELECT 'organizations', COUNT(*) FROM organizations WHERE id = '00000000-0000-0000-0000-000000000002'
UNION ALL SELECT 'profiles', COUNT(*) FROM profiles WHERE organization_id = '00000000-0000-0000-0000-000000000002'
UNION ALL SELECT 'service_catalog', COUNT(*) FROM service_catalog WHERE organization_id = '00000000-0000-0000-0000-000000000002'
UNION ALL SELECT 'clients', COUNT(*) FROM clients WHERE organization_id = '00000000-0000-0000-0000-000000000002'
UNION ALL SELECT 'quotes', COUNT(*) FROM quotes WHERE organization_id = '00000000-0000-0000-0000-000000000002'
UNION ALL SELECT 'quote_items', COUNT(*) FROM quote_items WHERE quote_id IN (SELECT id FROM quotes WHERE organization_id = '00000000-0000-0000-0000-000000000002')
UNION ALL SELECT 'follow_up_reminders', COUNT(*) FROM follow_up_reminders WHERE organization_id = '00000000-0000-0000-0000-000000000002';
