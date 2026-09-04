-- Runtime hardening for durable authentication and idempotent observation seeding.

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_expiry_idx
  ON auth_sessions (user_id, expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS factor_observation_natural_key_idx
  ON factor_observations (
    area_id,
    COALESCE(cultivation_cycle_id, '00000000-0000-0000-0000-000000000000'::uuid),
    factor_id,
    observed_at,
    COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE UNIQUE INDEX IF NOT EXISTS yield_observation_natural_key_idx
  ON yield_observations (
    area_id,
    crop_id,
    harvest_date,
    COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
