-- Smart Education Initiative: users, sessions, and newsletters
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS smart_edu_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS smart_edu_sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES smart_edu_users(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS smart_newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  prepared_by text,
  newsletter_date date,
  image_data_url text,
  created_by uuid REFERENCES smart_edu_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION smart_has_users()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM smart_edu_users WHERE is_active=true);
$$;

CREATE OR REPLACE FUNCTION smart_create_first_user(
  p_username text,
  p_display_name text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  u smart_edu_users%ROWTYPE;
BEGIN
  IF EXISTS (SELECT 1 FROM smart_edu_users) THEN
    RAISE EXCEPTION 'first_user_already_exists' USING ERRCODE='42501';
  END IF;

  IF length(trim(coalesce(p_username,''))) < 3 THEN
    RAISE EXCEPTION 'username_too_short' USING ERRCODE='22023';
  END IF;

  IF length(coalesce(p_password,'')) < 6 THEN
    RAISE EXCEPTION 'password_too_short' USING ERRCODE='22023';
  END IF;

  INSERT INTO smart_edu_users(username,display_name,password_hash)
  VALUES(
    lower(trim(p_username)),
    left(coalesce(nullif(trim(p_display_name),''),trim(p_username)),120),
    crypt(p_password,gen_salt('bf'))
  )
  RETURNING * INTO u;

  RETURN jsonb_build_object(
    'id',u.id,
    'username',u.username,
    'displayName',u.display_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION smart_edu_login(p_username text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  u smart_edu_users%ROWTYPE;
  raw_token text;
BEGIN
  SELECT * INTO u
  FROM smart_edu_users
  WHERE lower(username)=lower(trim(p_username))
    AND is_active=true;

  IF u.id IS NULL OR u.password_hash <> crypt(coalesce(p_password,''), u.password_hash) THEN
    RAISE EXCEPTION 'invalid_credentials' USING ERRCODE='28000';
  END IF;

  raw_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO smart_edu_sessions(token_hash,user_id,expires_at)
  VALUES(
    encode(digest(raw_token,'sha256'),'hex'),
    u.id,
    now() + interval '12 hours'
  );

  RETURN jsonb_build_object(
    'token',raw_token,
    'user',jsonb_build_object(
      'id',u.id,
      'username',u.username,
      'displayName',u.display_name
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION smart_edu_session(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  u smart_edu_users%ROWTYPE;
BEGIN
  SELECT u2.* INTO u
  FROM smart_edu_sessions s
  JOIN smart_edu_users u2 ON u2.id=s.user_id
  WHERE s.token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex')
    AND s.expires_at > now()
    AND u2.is_active=true
  LIMIT 1;

  IF u.id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id',u.id,
    'username',u.username,
    'displayName',u.display_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION smart_save_newsletter(p_token text, p_newsletter jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid;
  saved smart_newsletters%ROWTYPE;
  v_slug text;
BEGIN
  SELECT s.user_id INTO uid
  FROM smart_edu_sessions s
  JOIN smart_edu_users u ON u.id=s.user_id
  WHERE s.token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex')
    AND s.expires_at > now()
    AND u.is_active=true
  LIMIT 1;

  IF uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE='28000';
  END IF;

  IF nullif(trim(p_newsletter->>'title'),'') IS NULL THEN
    RAISE EXCEPTION 'title_required' USING ERRCODE='22023';
  END IF;

  v_slug := nullif(trim(p_newsletter->>'slug'),'');
  IF v_slug IS NULL THEN
    v_slug := 'newsletter-' || substr(encode(gen_random_bytes(8),'hex'),1,16);
  END IF;

  INSERT INTO smart_newsletters(
    slug,title,prepared_by,newsletter_date,image_data_url,created_by
  )
  VALUES(
    v_slug,
    left(coalesce(p_newsletter->>'title',''),160),
    left(coalesce(p_newsletter->>'preparedBy',''),120),
    nullif(p_newsletter->>'newsletterDate','')::date,
    coalesce(p_newsletter->>'imageDataUrl',''),
    uid
  )
  ON CONFLICT(slug) DO UPDATE SET
    title=EXCLUDED.title,
    prepared_by=EXCLUDED.prepared_by,
    newsletter_date=EXCLUDED.newsletter_date,
    image_data_url=EXCLUDED.image_data_url,
    updated_at=now()
  RETURNING * INTO saved;

  RETURN to_jsonb(saved);
END;
$$;

REVOKE ALL ON FUNCTION smart_has_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION smart_create_first_user(text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION smart_edu_login(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION smart_edu_session(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION smart_save_newsletter(text,jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION smart_has_users() TO anonymous;
GRANT EXECUTE ON FUNCTION smart_create_first_user(text,text,text) TO anonymous;
GRANT EXECUTE ON FUNCTION smart_edu_login(text,text) TO anonymous;
GRANT EXECUTE ON FUNCTION smart_edu_session(text) TO anonymous;
GRANT EXECUTE ON FUNCTION smart_save_newsletter(text,jsonb) TO anonymous;
