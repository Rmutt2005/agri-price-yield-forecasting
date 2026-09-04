-- Agricultural Decision Support System baseline schema.
-- Apply with a PostgreSQL migration runner after DATABASE_URL is configured.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE data_origin AS ENUM ('ACTUAL', 'IMPUTED', 'SYNTHETIC');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE factor_category AS ENUM ('AREA', 'SOIL', 'WEATHER', 'CROP', 'MANAGEMENT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE factor_data_type AS ENUM ('NUMBER', 'CATEGORY', 'BOOLEAN', 'TEXT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE price_type AS ENUM ('WHOLESALE', 'RETAIL', 'FARM_GATE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE data_source_type AS ENUM ('API', 'SCRAPER', 'MANUAL_UPLOAD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('USER', 'OFFICER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE model_type AS ENUM ('YIELD', 'PRICE', 'DISEASE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE model_status AS ENUM ('TRAINING', 'CANDIDATE', 'ACTIVE', 'ARCHIVED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE dataset_status AS ENUM ('UPLOADED', 'VALIDATED', 'TRAINING', 'TRAINED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE system_mode AS ENUM ('NORMAL', 'MAINTENANCE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_key text NOT NULL UNIQUE,
  name text NOT NULL,
  location text NOT NULL,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  elevation_m double precision NOT NULL CHECK (elevation_m >= 0),
  data_origin data_origin NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_key text NOT NULL UNIQUE,
  name text NOT NULL,
  default_growing_days integer NOT NULL CHECK (default_growing_days > 0),
  data_origin data_origin NOT NULL DEFAULT 'SYNTHETIC',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crop_varieties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id uuid NOT NULL REFERENCES crops(id),
  variety_key text NOT NULL,
  name text NOT NULL,
  growing_days_override integer CHECK (growing_days_override > 0),
  data_origin data_origin NOT NULL DEFAULT 'SYNTHETIC',
  active boolean NOT NULL DEFAULT true,
  UNIQUE (crop_id, variety_key),
  UNIQUE (variety_key)
);

CREATE TABLE IF NOT EXISTS factor_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_key text NOT NULL UNIQUE,
  name text NOT NULL,
  category factor_category NOT NULL,
  data_type factor_data_type NOT NULL,
  unit text,
  description text NOT NULL DEFAULT '',
  aggregation_method text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  name text NOT NULL,
  source_type data_source_type NOT NULL,
  priority integer NOT NULL CHECK (priority >= 0),
  enabled boolean NOT NULL DEFAULT true,
  status text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_success_at timestamptz,
  last_failure_at timestamptz
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role user_role NOT NULL DEFAULT 'USER',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode system_mode NOT NULL,
  message text,
  changed_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cultivation_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  area_id uuid NOT NULL REFERENCES areas(id),
  crop_id uuid NOT NULL REFERENCES crops(id),
  variety_id uuid REFERENCES crop_varieties(id),
  planting_date date NOT NULL,
  area_rai numeric(12, 4) NOT NULL CHECK (area_rai > 0),
  growing_days_override integer CHECK (growing_days_override > 0),
  management_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'PLANNED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS factor_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid REFERENCES areas(id),
  cultivation_cycle_id uuid REFERENCES cultivation_cycles(id),
  factor_id uuid NOT NULL REFERENCES factor_definitions(id),
  observed_at timestamptz NOT NULL,
  value jsonb NOT NULL,
  unit text,
  source_id uuid REFERENCES data_sources(id),
  data_origin data_origin NOT NULL,
  quality_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  CHECK (area_id IS NOT NULL OR cultivation_cycle_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS weather_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES areas(id),
  observed_date date NOT NULL,
  temperature_min_c numeric(8, 3),
  temperature_max_c numeric(8, 3),
  temperature_avg_c numeric(8, 3),
  rainfall_mm numeric(12, 3) CHECK (rainfall_mm >= 0),
  relative_humidity_pct numeric(6, 3) CHECK (relative_humidity_pct BETWEEN 0 AND 100),
  solar_radiation numeric(12, 3),
  wind_speed_mps numeric(12, 3) CHECK (wind_speed_mps >= 0),
  source_id uuid REFERENCES data_sources(id),
  data_origin data_origin NOT NULL,
  quality_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (area_id, observed_date, source_id)
);

CREATE TABLE IF NOT EXISTS price_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id uuid NOT NULL REFERENCES crops(id),
  observed_date date NOT NULL,
  price numeric(14, 4) NOT NULL CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'THB' CHECK (currency = 'THB'),
  unit text NOT NULL DEFAULT 'kg' CHECK (unit = 'kg'),
  price_type price_type NOT NULL,
  market text,
  source_id uuid REFERENCES data_sources(id),
  data_origin data_origin NOT NULL,
  quality_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (crop_id, observed_date, price_type, market, source_id)
);

CREATE TABLE IF NOT EXISTS yield_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivation_cycle_id uuid REFERENCES cultivation_cycles(id),
  area_id uuid NOT NULL REFERENCES areas(id),
  crop_id uuid NOT NULL REFERENCES crops(id),
  harvest_date date NOT NULL,
  yield_kg_per_rai numeric(14, 4) NOT NULL CHECK (yield_kg_per_rai >= 0),
  source_id uuid REFERENCES data_sources(id),
  data_origin data_origin NOT NULL,
  quality_flags jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivation_cycle_id uuid NOT NULL REFERENCES cultivation_cycles(id),
  category text NOT NULL,
  amount_thb numeric(14, 4) NOT NULL CHECK (amount_thb >= 0),
  data_origin data_origin NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_key text NOT NULL UNIQUE,
  version text NOT NULL,
  name text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES users(id),
  source_id uuid REFERENCES data_sources(id),
  file_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  mapped_factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  row_count integer NOT NULL DEFAULT 0 CHECK (row_count >= 0),
  data_origin data_origin NOT NULL,
  status dataset_status NOT NULL DEFAULT 'UPLOADED',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_key text NOT NULL,
  version text NOT NULL,
  model_type model_type NOT NULL,
  target text NOT NULL,
  feature_schema jsonb NOT NULL,
  training_dataset_id uuid REFERENCES training_datasets(id),
  training_timestamp timestamptz NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  status model_status NOT NULL,
  artifact_location text,
  artifact_checksum text,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES users(id),
  activated_at timestamptz,
  UNIQUE (model_type, version)
);

CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  cultivation_cycle_id uuid REFERENCES cultivation_cycles(id),
  input_snapshot jsonb NOT NULL,
  expected_harvest_date date NOT NULL,
  data_quality jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES analyses(id),
  model_version_id uuid REFERENCES model_versions(id),
  model_type model_type NOT NULL,
  target text NOT NULL,
  value numeric(18, 6) NOT NULL,
  unit text NOT NULL,
  input_feature_schema jsonb NOT NULL,
  prediction_timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS disease_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES analyses(id),
  risk_score numeric(6, 5) NOT NULL CHECK (risk_score BETWEEN 0 AND 1),
  risk_level risk_level NOT NULL,
  rule_version text NOT NULL,
  input_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_origin data_origin NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_model_per_type
  ON model_versions (model_type) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS weather_area_date_idx
  ON weather_observations (area_id, observed_date);
CREATE INDEX IF NOT EXISTS price_crop_date_type_idx
  ON price_observations (crop_id, observed_date, price_type);
CREATE INDEX IF NOT EXISTS factor_observation_factor_time_idx
  ON factor_observations (factor_id, observed_at);
