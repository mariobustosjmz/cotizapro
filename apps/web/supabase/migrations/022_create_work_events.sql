-- Create work_events table for Sprint 3: Work Calendar
CREATE TABLE work_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  quote_id         UUID REFERENCES quotes(id) ON DELETE SET NULL,
  assigned_to      UUID REFERENCES auth.users(id),
  title            TEXT NOT NULL,
  event_type       TEXT NOT NULL CHECK (event_type IN (
    'instalacion','medicion','visita_tecnica','mantenimiento','otro'
  )),
  scheduled_start  TIMESTAMPTZ NOT NULL,
  scheduled_end    TIMESTAMPTZ NOT NULL,
  address          TEXT,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN (
    'pendiente','en_camino','completado','cancelado'
  )),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_event_duration CHECK (scheduled_end > scheduled_start)
);

ALTER TABLE work_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view work events"
  ON work_events FOR SELECT
  USING (organization_id = (auth.jwt()->>'organization_id')::UUID);

CREATE POLICY "org members can insert work events"
  ON work_events FOR INSERT
  WITH CHECK (organization_id = (auth.jwt()->>'organization_id')::UUID);

CREATE POLICY "org members can update work events"
  ON work_events FOR UPDATE
  USING (organization_id = (auth.jwt()->>'organization_id')::UUID)
  WITH CHECK (organization_id = (auth.jwt()->>'organization_id')::UUID);

CREATE POLICY "org admins can delete work events"
  ON work_events FOR DELETE
  USING (
    organization_id = (auth.jwt()->>'organization_id')::UUID
    AND (auth.jwt()->>'role') IN ('owner','admin')
  );

CREATE INDEX idx_work_events_org_start ON work_events(organization_id, scheduled_start);
CREATE INDEX idx_work_events_client_id ON work_events(client_id);
CREATE INDEX idx_work_events_assigned_to ON work_events(assigned_to);
