-- ================================================
-- Follow-Up Reminders System
-- Migration: 003_follow_up_reminders.sql
-- Created: 2026-02-13
-- Description: Sistema de recordatorios de seguimiento para clientes
-- ================================================

-- ================================================
-- Follow-Up Reminders Table
-- ================================================

-- Tabla de recordatorios programados para seguimiento de clientes
CREATE TABLE follow_up_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Información del recordatorio
  title TEXT NOT NULL, -- Ej: "Mantenimiento anual de minisplit"
  description TEXT, -- Notas adicionales
  reminder_type TEXT NOT NULL, -- "maintenance", "follow_up", "renewal", "custom"

  -- Fechas
  scheduled_date DATE NOT NULL, -- Fecha en que debe ejecutarse el recordatorio
  completed_at TIMESTAMPTZ, -- Fecha en que se completó el recordatorio
  snoozed_until DATE, -- Si se pospuso, hasta cuándo

  -- Estado
  status TEXT NOT NULL DEFAULT 'pending', -- "pending", "sent", "completed", "snoozed", "cancelled"
  priority TEXT NOT NULL DEFAULT 'normal', -- "low", "normal", "high", "urgent"

  -- Acciones automáticas
  auto_send_notification BOOLEAN DEFAULT false, -- Enviar notificación automáticamente
  notification_channels TEXT[], -- ["email", "whatsapp"]
  notification_sent_at TIMESTAMPTZ,

  -- Relaciones opcionales
  related_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL, -- Cotización relacionada si la hay
  related_service_category TEXT, -- "hvac", "painting", "plumbing", etc.

  -- Recurrencia (para recordatorios periódicos)
  is_recurring BOOLEAN DEFAULT false,
  recurrence_interval_months INTEGER, -- Cada cuántos meses se repite (6, 12, etc.)
  next_occurrence_id UUID REFERENCES follow_up_reminders(id) ON DELETE SET NULL, -- Siguiente ocurrencia

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_reminder_type CHECK (reminder_type IN ('maintenance', 'follow_up', 'renewal', 'custom')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'completed', 'snoozed', 'cancelled')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT valid_service_category CHECK (
    related_service_category IS NULL OR
    related_service_category IN ('hvac', 'painting', 'plumbing', 'electrical', 'other')
  ),
  CONSTRAINT valid_recurrence CHECK (
    (is_recurring = false AND recurrence_interval_months IS NULL) OR
    (is_recurring = true AND recurrence_interval_months IS NOT NULL AND recurrence_interval_months > 0)
  )
);

-- ================================================
-- RLS Policies
-- ================================================

ALTER TABLE follow_up_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reminders in their organization"
  ON follow_up_reminders FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert reminders in their organization"
  ON follow_up_reminders FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update reminders in their organization"
  ON follow_up_reminders FOR UPDATE
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete reminders in their organization"
  ON follow_up_reminders FOR DELETE
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- ================================================
-- Indexes
-- ================================================

CREATE INDEX idx_follow_up_reminders_organization ON follow_up_reminders(organization_id);
CREATE INDEX idx_follow_up_reminders_client ON follow_up_reminders(client_id);
CREATE INDEX idx_follow_up_reminders_scheduled_date ON follow_up_reminders(scheduled_date);
CREATE INDEX idx_follow_up_reminders_status ON follow_up_reminders(status);
CREATE INDEX idx_follow_up_reminders_priority ON follow_up_reminders(priority);
CREATE INDEX idx_follow_up_reminders_type ON follow_up_reminders(reminder_type);

-- Índice compuesto para consultas comunes (recordatorios pendientes por fecha)
CREATE INDEX idx_follow_up_reminders_pending_by_date
  ON follow_up_reminders(organization_id, status, scheduled_date)
  WHERE status = 'pending';

-- ================================================
-- Triggers
-- ================================================

CREATE TRIGGER update_follow_up_reminders_updated_at
  BEFORE UPDATE ON follow_up_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Functions
-- ================================================

-- Función para crear próxima ocurrencia de recordatorio recurrente
CREATE OR REPLACE FUNCTION create_next_reminder_occurrence(reminder_id UUID)
RETURNS UUID AS $$
DECLARE
  current_reminder follow_up_reminders%ROWTYPE;
  next_reminder_id UUID;
  next_scheduled_date DATE;
BEGIN
  -- Obtener el recordatorio actual
  SELECT * INTO current_reminder
  FROM follow_up_reminders
  WHERE id = reminder_id;

  -- Verificar que sea recurrente
  IF current_reminder.is_recurring = false OR current_reminder.recurrence_interval_months IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calcular próxima fecha
  next_scheduled_date := current_reminder.scheduled_date +
    (current_reminder.recurrence_interval_months || ' months')::INTERVAL;

  -- Crear próximo recordatorio
  INSERT INTO follow_up_reminders (
    organization_id,
    client_id,
    title,
    description,
    reminder_type,
    scheduled_date,
    status,
    priority,
    auto_send_notification,
    notification_channels,
    related_quote_id,
    related_service_category,
    is_recurring,
    recurrence_interval_months,
    created_by
  ) VALUES (
    current_reminder.organization_id,
    current_reminder.client_id,
    current_reminder.title,
    current_reminder.description,
    current_reminder.reminder_type,
    next_scheduled_date,
    'pending',
    current_reminder.priority,
    current_reminder.auto_send_notification,
    current_reminder.notification_channels,
    current_reminder.related_quote_id,
    current_reminder.related_service_category,
    true,
    current_reminder.recurrence_interval_months,
    current_reminder.created_by
  )
  RETURNING id INTO next_reminder_id;

  -- Actualizar el recordatorio actual con la referencia al próximo
  UPDATE follow_up_reminders
  SET next_occurrence_id = next_reminder_id
  WHERE id = reminder_id;

  RETURN next_reminder_id;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener recordatorios vencidos (due reminders)
CREATE OR REPLACE FUNCTION get_due_reminders(org_id UUID, days_ahead INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  client_id UUID,
  client_name TEXT,
  title TEXT,
  scheduled_date DATE,
  priority TEXT,
  reminder_type TEXT,
  days_until_due INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.client_id,
    c.name as client_name,
    r.title,
    r.scheduled_date,
    r.priority,
    r.reminder_type,
    (r.scheduled_date - CURRENT_DATE)::INTEGER as days_until_due
  FROM follow_up_reminders r
  JOIN clients c ON c.id = r.client_id
  WHERE r.organization_id = org_id
    AND r.status = 'pending'
    AND r.scheduled_date <= CURRENT_DATE + (days_ahead || ' days')::INTERVAL
  ORDER BY r.scheduled_date ASC,
           CASE r.priority
             WHEN 'urgent' THEN 1
             WHEN 'high' THEN 2
             WHEN 'normal' THEN 3
             WHEN 'low' THEN 4
           END;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Comments
-- ================================================

COMMENT ON TABLE follow_up_reminders IS 'Sistema de recordatorios de seguimiento para clientes. Permite programar seguimientos automáticos (ej: mantenimiento anual de minisplit en 12 meses).';
COMMENT ON COLUMN follow_up_reminders.reminder_type IS 'Tipo de recordatorio: maintenance (mantenimiento periódico), follow_up (seguimiento general), renewal (renovación), custom (personalizado)';
COMMENT ON COLUMN follow_up_reminders.status IS 'Estado: pending (pendiente), sent (notificación enviada), completed (completado), snoozed (pospuesto), cancelled (cancelado)';
COMMENT ON COLUMN follow_up_reminders.is_recurring IS 'Si es true, se creará automáticamente el siguiente recordatorio al completar este';
COMMENT ON COLUMN follow_up_reminders.recurrence_interval_months IS 'Intervalo de recurrencia en meses (ej: 6 para semestral, 12 para anual)';
COMMENT ON FUNCTION create_next_reminder_occurrence IS 'Crea la siguiente ocurrencia de un recordatorio recurrente automáticamente';
COMMENT ON FUNCTION get_due_reminders IS 'Obtiene recordatorios vencidos o próximos a vencer para una organización';
