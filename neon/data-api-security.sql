-- Run after Neon Auth + Data API are provisioned.
-- Configure the admin key separately; do not commit the plaintext key.
--
-- Example:
-- INSERT INTO mobadra_settings(setting_key, setting_value)
-- VALUES ('admin_key_sha256', encode(digest('YOUR_ADMIN_KEY','sha256'),'hex'))
-- ON CONFLICT (setting_key) DO UPDATE
-- SET setting_value = EXCLUDED.setting_value, updated_at = now();

ALTER TABLE mobadra_events ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anonymous;
REVOKE INSERT, UPDATE, DELETE ON mobadra_events FROM anonymous;
GRANT SELECT ON mobadra_events TO anonymous;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename='mobadra_events'
      AND policyname='mobadra_public_read'
  ) THEN
    CREATE POLICY mobadra_public_read
      ON mobadra_events
      FOR SELECT
      TO anonymous
      USING (is_published = true);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION mobadra_save_event(p_admin_key text, p_event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  expected_hash text;
  supplied_hash text;
  saved mobadra_events%ROWTYPE;
  v_slug text;
  v_participant_count integer;
  v_design_theme text;
BEGIN
  SELECT setting_value
    INTO expected_hash
    FROM mobadra_settings
   WHERE setting_key = 'admin_key_sha256';

  supplied_hash := encode(digest(coalesce(p_admin_key,''), 'sha256'), 'hex');

  IF expected_hash IS NULL OR supplied_hash <> expected_hash THEN
    RAISE EXCEPTION 'invalid_admin_key' USING ERRCODE = '28000';
  END IF;

  v_slug := nullif(trim(p_event->>'slug'), '');
  IF v_slug IS NULL OR v_slug !~ '^event-[a-zA-Z0-9-]{8,80}$' THEN
    RAISE EXCEPTION 'invalid_slug' USING ERRCODE = '22023';
  END IF;

  IF nullif(trim(p_event->>'eventName'),'') IS NULL THEN
    RAISE EXCEPTION 'event_name_required' USING ERRCODE = '22023';
  END IF;

  IF nullif(trim(p_event->>'organizationName'),'') IS NULL THEN
    RAISE EXCEPTION 'organization_name_required' USING ERRCODE = '22023';
  END IF;

  IF nullif(p_event->>'participantCount','') IS NULL THEN
    v_participant_count := NULL;
  ELSE
    v_participant_count := (p_event->>'participantCount')::integer;
    IF v_participant_count < 0 OR v_participant_count > 99999 THEN
      RAISE EXCEPTION 'invalid_participant_count' USING ERRCODE = '22023';
    END IF;
  END IF;

  v_design_theme := coalesce(nullif(p_event->>'designTheme',''), 'blue');
  IF v_design_theme NOT IN ('blue','gold','green','burgundy') THEN
    v_design_theme := 'blue';
  END IF;

  INSERT INTO mobadra_events (
    slug, event_name, organization_name, event_date, event_location,
    participant_count, event_field, target_audience, event_goal, summary,
    logo_data_url, evidence_images, designer, follow_up, event_director,
    assistants, school_principal, design_theme, is_published
  )
  VALUES (
    v_slug,
    left(coalesce(p_event->>'eventName',''),120),
    left(coalesce(p_event->>'organizationName',''),120),
    nullif(p_event->>'eventDate','')::date,
    left(coalesce(p_event->>'eventLocation',''),120),
    v_participant_count,
    left(coalesce(p_event->>'eventField',''),80),
    left(coalesce(p_event->>'targetAudience',''),160),
    left(coalesce(p_event->>'eventGoal',''),1000),
    left(coalesce(p_event->>'summary',''),1800),
    coalesce(p_event->>'logoDataUrl',''),
    CASE
      WHEN jsonb_typeof(p_event->'evidence')='array' THEN p_event->'evidence'
      ELSE '[]'::jsonb
    END,
    left(coalesce(p_event->>'designer',''),120),
    left(coalesce(p_event->>'followUp',''),120),
    left(coalesce(p_event->>'eventDirector',''),120),
    left(coalesce(p_event->>'assistants',''),220),
    left(coalesce(p_event->>'schoolPrincipal',''),120),
    v_design_theme,
    true
  )
  ON CONFLICT (slug) DO UPDATE SET
    event_name=EXCLUDED.event_name,
    organization_name=EXCLUDED.organization_name,
    event_date=EXCLUDED.event_date,
    event_location=EXCLUDED.event_location,
    participant_count=EXCLUDED.participant_count,
    event_field=EXCLUDED.event_field,
    target_audience=EXCLUDED.target_audience,
    event_goal=EXCLUDED.event_goal,
    summary=EXCLUDED.summary,
    logo_data_url=EXCLUDED.logo_data_url,
    evidence_images=EXCLUDED.evidence_images,
    designer=EXCLUDED.designer,
    follow_up=EXCLUDED.follow_up,
    event_director=EXCLUDED.event_director,
    assistants=EXCLUDED.assistants,
    school_principal=EXCLUDED.school_principal,
    design_theme=EXCLUDED.design_theme,
    is_published=true
  RETURNING * INTO saved;

  RETURN to_jsonb(saved);
END;
$$;

REVOKE ALL ON FUNCTION mobadra_save_event(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mobadra_save_event(text, jsonb) TO anonymous;
