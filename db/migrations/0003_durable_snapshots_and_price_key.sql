-- Persist API read-model snapshots and make nullable observation key parts idempotent.

ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS response_snapshot jsonb;

ALTER TABLE training_datasets
  ADD COLUMN IF NOT EXISTS rows_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE training_datasets
  ADD COLUMN IF NOT EXISTS source_file_name text;

ALTER TABLE training_datasets
  ADD COLUMN IF NOT EXISTS artifact_location text;

ALTER TABLE training_datasets
  ADD COLUMN IF NOT EXISTS artifact_checksum text;

CREATE UNIQUE INDEX IF NOT EXISTS price_observation_natural_key_idx
  ON price_observations (
    crop_id,
    observed_date,
    price_type,
    COALESCE(market, ''),
    COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
