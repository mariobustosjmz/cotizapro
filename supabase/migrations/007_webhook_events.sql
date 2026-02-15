-- Webhook Events Table for Idempotency
-- Migration: 007_webhook_events
-- Created: 2026-02-14

-- Create webhook_events table to track processed webhooks
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  data JSONB,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id ON webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);

-- Enable Row-Level Security
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can insert and query webhook events
CREATE POLICY "Service role can manage webhook events"
  ON webhook_events FOR ALL
  USING (true)
  WITH CHECK (true);
