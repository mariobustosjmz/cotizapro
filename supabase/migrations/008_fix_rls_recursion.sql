-- ================================================
-- Fix RLS Recursion Issues
-- Migration: 008_fix_rls_recursion.sql
-- Created: 2026-02-14
-- Description: Eliminate recursive RLS policies by using JWT claim directly
-- ================================================

-- Helper function to get organization_id from current user's JWT
-- This avoids querying the profiles table in RLS policies
CREATE OR REPLACE FUNCTION public.user_organization_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    -- Try JWT user_metadata first (set during signup)
    (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID,
    -- Fallback to profiles table lookup (direct, not nested)
    (SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1)
  );
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION public.user_organization_id IS 'Returns the organization_id for the current authenticated user from JWT or profiles table';

-- ================================================
-- Drop existing recursive policies
-- ================================================

-- quote_items policies
DROP POLICY IF EXISTS "Users can view quote items" ON quote_items;
DROP POLICY IF EXISTS "Users can manage quote items" ON quote_items;

-- quote_notifications policies
DROP POLICY IF EXISTS "Users can view notifications for their quotes" ON quote_notifications;
DROP POLICY IF EXISTS "Users can insert notifications for their quotes" ON quote_notifications;

-- follow_up_reminders policies
DROP POLICY IF EXISTS "Users can view reminders in their organization" ON follow_up_reminders;
DROP POLICY IF EXISTS "Users can insert reminders in their organization" ON follow_up_reminders;
DROP POLICY IF EXISTS "Users can update reminders in their organization" ON follow_up_reminders;
DROP POLICY IF EXISTS "Users can delete reminders in their organization" ON follow_up_reminders;

-- ================================================
-- Create non-recursive policies using helper function
-- ================================================

-- quote_items: Check if the quote belongs to user's organization
CREATE POLICY "Users can view quote items in their organization"
  ON quote_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.organization_id = public.user_organization_id()
    )
  );

CREATE POLICY "Users can insert quote items in their organization"
  ON quote_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.organization_id = public.user_organization_id()
    )
  );

CREATE POLICY "Users can update quote items in their organization"
  ON quote_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.organization_id = public.user_organization_id()
    )
  );

CREATE POLICY "Users can delete quote items in their organization"
  ON quote_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.organization_id = public.user_organization_id()
    )
  );

-- quote_notifications: Check if the quote belongs to user's organization
CREATE POLICY "Users can view quote notifications in their organization"
  ON quote_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_notifications.quote_id
      AND quotes.organization_id = public.user_organization_id()
    )
  );

CREATE POLICY "Users can insert quote notifications in their organization"
  ON quote_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_notifications.quote_id
      AND quotes.organization_id = public.user_organization_id()
    )
  );

-- follow_up_reminders: Direct organization_id comparison
CREATE POLICY "Users can view reminders in their organization"
  ON follow_up_reminders FOR SELECT
  TO authenticated
  USING (organization_id = public.user_organization_id());

CREATE POLICY "Users can insert reminders in their organization"
  ON follow_up_reminders FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.user_organization_id());

CREATE POLICY "Users can update reminders in their organization"
  ON follow_up_reminders FOR UPDATE
  TO authenticated
  USING (organization_id = public.user_organization_id());

CREATE POLICY "Users can delete reminders in their organization"
  ON follow_up_reminders FOR DELETE
  TO authenticated
  USING (organization_id = public.user_organization_id());

-- ================================================
-- Also update other tables to use helper function
-- ================================================

-- Recreate clients policies with helper function
DROP POLICY IF EXISTS "Users can view clients in their organization" ON clients;
DROP POLICY IF EXISTS "Users can insert clients in their organization" ON clients;
DROP POLICY IF EXISTS "Users can update clients in their organization" ON clients;
DROP POLICY IF EXISTS "Users can delete clients in their organization" ON clients;

CREATE POLICY "Users can view clients in their organization"
  ON clients FOR SELECT
  TO authenticated
  USING (organization_id = public.user_organization_id());

CREATE POLICY "Users can insert clients in their organization"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.user_organization_id());

CREATE POLICY "Users can update clients in their organization"
  ON clients FOR UPDATE
  TO authenticated
  USING (organization_id = public.user_organization_id());

CREATE POLICY "Users can delete clients in their organization"
  ON clients FOR DELETE
  TO authenticated
  USING (organization_id = public.user_organization_id());

-- Recreate service_catalog policies with helper function
DROP POLICY IF EXISTS "Users can view services in their organization" ON service_catalog;
DROP POLICY IF EXISTS "Admins can manage services in their organization" ON service_catalog;

CREATE POLICY "Users can view services in their organization"
  ON service_catalog FOR SELECT
  TO authenticated
  USING (organization_id = public.user_organization_id());

CREATE POLICY "Admins can manage services in their organization"
  ON service_catalog FOR ALL
  TO authenticated
  USING (
    organization_id = public.user_organization_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Recreate quotes policies with helper function
DROP POLICY IF EXISTS "Users can view quotes in their organization" ON quotes;
DROP POLICY IF EXISTS "Users can create quotes in their organization" ON quotes;
DROP POLICY IF EXISTS "Users can update quotes in their organization" ON quotes;
DROP POLICY IF EXISTS "Users can delete quotes in their organization" ON quotes;

CREATE POLICY "Users can view quotes in their organization"
  ON quotes FOR SELECT
  TO authenticated
  USING (organization_id = public.user_organization_id());

CREATE POLICY "Users can create quotes in their organization"
  ON quotes FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.user_organization_id());

CREATE POLICY "Users can update quotes in their organization"
  ON quotes FOR UPDATE
  TO authenticated
  USING (organization_id = public.user_organization_id());

CREATE POLICY "Users can delete quotes in their organization"
  ON quotes FOR DELETE
  TO authenticated
  USING (organization_id = public.user_organization_id());

-- ================================================
-- END OF MIGRATION
-- ================================================
