-- ================================================
-- Migration: 027_enable_realtime_publications.sql
-- Created: 2026-02-27
-- Description: Enable Supabase realtime for dashboard auto-refresh
-- ================================================

-- Enable realtime on quotes table
ALTER PUBLICATION supabase_realtime ADD TABLE quotes;

-- Enable realtime on clients table
ALTER PUBLICATION supabase_realtime ADD TABLE clients;

-- Enable realtime on follow_up_reminders table
ALTER PUBLICATION supabase_realtime ADD TABLE follow_up_reminders;

-- Enable realtime on quote_payments table (for payment updates)
ALTER PUBLICATION supabase_realtime ADD TABLE quote_payments;

-- Enable realtime on work_events table (for calendar updates)
ALTER PUBLICATION supabase_realtime ADD TABLE work_events;

-- Enable realtime on quote_templates table (for template updates)
ALTER PUBLICATION supabase_realtime ADD TABLE quote_templates;

-- Note: Realtime subscriptions respect RLS policies automatically
-- Only authenticated users within the same organization will receive updates
