-- Mobadra / Activity Achievement Platform
-- PostgreSQL schema for Neon

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS mobadra_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  event_name text NOT NULL,
  organization_name text NOT NULL,
  event_date date,
  event_location text,
  participant_count integer CHECK (participant_count IS NULL OR participant_count >= 0),
  event_field text,
  target_audience text,
  event_goal text,
  summary text,
  logo_data_url text,
  evidence_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  designer text,
  follow_up text,
  event_director text,
  assistants text,
  school_principal text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mobadra_events_created_at_idx
  ON mobadra_events (created_at DESC);

CREATE INDEX IF NOT EXISTS mobadra_events_published_slug_idx
  ON mobadra_events (slug)
  WHERE is_published = true;

CREATE OR REPLACE FUNCTION mobadra_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mobadra_events_set_updated_at ON mobadra_events;

CREATE TRIGGER mobadra_events_set_updated_at
BEFORE UPDATE ON mobadra_events
FOR EACH ROW
EXECUTE FUNCTION mobadra_set_updated_at();
