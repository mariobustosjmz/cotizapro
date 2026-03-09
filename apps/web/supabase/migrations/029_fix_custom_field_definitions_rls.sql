-- Fix custom_field_definitions RLS policies to use user_organization_id() helper
-- Migration: 029_fix_custom_field_definitions_rls
-- Fixes: policies in 011 used auth.jwt()->>'organization_id' (top-level JWT claim)
-- but organization_id is stored in user_metadata — use the existing helper function instead

-- Drop incorrect policies from migration 011
DROP POLICY IF EXISTS "org_members_read_fields" ON custom_field_definitions;
DROP POLICY IF EXISTS "org_admins_manage_fields" ON custom_field_definitions;

-- Recreate using public.user_organization_id() (reads from user_metadata, consistent with all other tables)
CREATE POLICY "org_members_read_fields" ON custom_field_definitions FOR SELECT
  USING (organization_id = public.user_organization_id());

CREATE POLICY "org_admins_manage_fields" ON custom_field_definitions FOR ALL
  USING (organization_id = public.user_organization_id())
  WITH CHECK (organization_id = public.user_organization_id());
