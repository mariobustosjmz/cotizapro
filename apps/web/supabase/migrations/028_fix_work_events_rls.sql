-- Fix work_events RLS policies to use user_organization_id() helper
-- Migration: 028_fix_work_events_rls
-- Fixes: policies in 022 used auth.jwt()->>'organization_id' (top-level JWT claim)
-- but organization_id is stored in user_metadata — use the existing helper function instead

-- Drop incorrect policies from migration 022
DROP POLICY IF EXISTS "org members can view work events" ON work_events;
DROP POLICY IF EXISTS "org members can insert work events" ON work_events;
DROP POLICY IF EXISTS "org members can update work events" ON work_events;
DROP POLICY IF EXISTS "org members can delete work events" ON work_events;

-- Recreate using public.user_organization_id() (reads from user_metadata, consistent with all other tables)
CREATE POLICY "org members can view work events"
  ON work_events FOR SELECT
  USING (organization_id = public.user_organization_id());

CREATE POLICY "org members can insert work events"
  ON work_events FOR INSERT
  WITH CHECK (organization_id = public.user_organization_id());

CREATE POLICY "org members can update work events"
  ON work_events FOR UPDATE
  USING (organization_id = public.user_organization_id())
  WITH CHECK (organization_id = public.user_organization_id());

CREATE POLICY "org members can delete work events"
  ON work_events FOR DELETE
  USING (organization_id = public.user_organization_id());
