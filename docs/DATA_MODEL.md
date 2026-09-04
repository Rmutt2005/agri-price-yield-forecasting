# Data Model

## Modeling Rules

- Primary keys are opaque IDs; stable business keys (`crop_key`, `area_key`, `factor_key`) are unique and safe to expose in contracts.
- Timestamps are stored in UTC; date-only agricultural observations use ISO `YYYY-MM-DD` and an explicit timezone policy at the boundary.
- Numeric values always carry a canonical unit in the contract.
- Every imported/derived observation carries `data_origin`: `ACTUAL`, `IMPUTED`, or `SYNTHETIC`.
- Raw observations are append-oriented; corrections are traceable through source and ingestion metadata.

## Core Entities

### Area

`id`, `key`, `name`, `location`, `latitude`, `longitude`, `elevation_m`, `active`, `data_origin`, timestamps

### Crop and Crop Variety

`Crop`: `id`, `key`, `name`, `default_growing_days`, `active`

`CropVariety`: `id`, `crop_id`, `key`, `name`, optional growing-day override, `data_origin`, `active`

The catalog is data-driven; the initial five crops are seed data only.

### Cultivation Cycle

`id`, `user_id`, `area_id`, `crop_id`, optional `variety_id`, `planting_date`, `area_rai`, optional growing-day override, management snapshot, status, timestamps

### Factor Definition

`id`, `key`, `name`, `category`, `data_type`, `unit`, `description`, `aggregation_method`, `active`, timestamps

Categories: `AREA`, `SOIL`, `WEATHER`, `CROP`, `MANAGEMENT`, `OTHER`.

Incoming factor values are validated against the declared data type and can be normalized from supported source units at the adapter boundary; persisted model features remain in the factor's canonical unit.

### Factor Observation

`id`, `area_id`/`cultivation_id`, `factor_id`, `observed_at`, typed value, `unit`, `source_id`, `data_origin`, quality flags, timestamps

Typed value storage may use a validated JSON value at the adapter boundary, but domain contracts expose the declared FactorDefinition type.

### Weather Observation

`id`, `area_id`, `date`, Tmin/Tmax/Tavg, rainfall, relative humidity, solar radiation, wind speed, `source_id`, `data_origin`, quality metadata

This is raw daily time-series data. Feature windows are derived later.

### Yield Observation

`id`, `cultivation_id`/area/crop references, harvest date, `yield_kg_per_rai`, optional total yield, `data_origin`, `source_id`, quality metadata. The observation repository exposes normalized yield records for durable dashboard comparisons and deduplicates the area/crop/date/source natural key.

### Price Observation

`id`, `crop_id`, `date`, `price`, `currency = THB`, `unit = kg`, `price_type`, `market`, `source_id`, `data_origin`, quality metadata

`price_type` is one of `WHOLESALE`, `RETAIL`, `FARM_GATE`, `OTHER`; records of different types must not be averaged together.

### Disease Risk

`id`, cultivation/analysis reference, `risk_score`, `risk_level`, `rule_version`, input summary, timestamp, `data_origin`

Risk levels are `VERY_LOW`, `LOW`, `MEDIUM`, `HIGH`, `VERY_HIGH`.

### Cost

`id`, cultivation/analysis reference, category, amount in THB, notes, `data_origin`, timestamps. Initial categories: fertilizer, chemical, labor, other.

### Prediction and Analysis

`Prediction` records model type, model version, target, value, unit, input feature schema, timestamp and provenance.

`Analysis` is an application-level composition record/response that links harvest, yield, price, risk and economics outputs to one input snapshot.

### Training Dataset

`id`, name, version, source, uploaded_by, source file name, raw rows snapshot, file metadata, detected schema, mapped factors, validation summary, row counts, `data_origin`, artifact location/checksum, created timestamp, status

### Model Version

`id`, model type, semantic version, target, immutable feature schema, training dataset ID, training timestamp, metrics, optional learned parameters, status, artifact location/checksum, created_by, activation metadata

Statuses: `TRAINING`, `CANDIDATE`, `ACTIVE`, `ARCHIVED`, `FAILED`.

### Data Source

`id`, name, type (`API`, `SCRAPER`, `MANUAL_UPLOAD`), priority, enabled, status, metadata, last success/failure timestamps

### User and System Status

`User`: identity, email, password/session representation, role (`USER`, `OFFICER`, `ADMIN`), active state, timestamps.

`SystemStatus`: current mode (`NORMAL`, `MAINTENANCE`), message, changed_by, timestamp.

## Baseline Factor Seed

```text
latitude, longitude, elevation_m
soil_type, soil_ph, sand_pct, silt_pct, clay_pct, organic_matter_pct
drainage_class, water_holding_capacity, slope_degree
temperature_min_c, temperature_max_c, temperature_avg_c, rainfall_mm
relative_humidity_pct, solar_radiation, wind_speed_mps
planting_date, expected_harvest_days, planting_density, irrigation_amount
nitrogen_amount, phosphorus_amount, potassium_amount
```

## Relationships

```text
User 1--* CultivationCycle *--1 Area
CultivationCycle *--1 Crop 1--* CropVariety
Area 1--* WeatherObservation
Area/CultivationCycle 1--* FactorObservation *--1 FactorDefinition
CultivationCycle 1--* YieldObservation
Crop 1--* PriceObservation
CultivationCycle 1--* Cost
TrainingDataset 1--* ModelVersion
ModelVersion 1--* Prediction
DataSource 1--* observations/datasets
```
