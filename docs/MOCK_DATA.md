# Mock Data

## Purpose

Synthetic data exists for development, UI review, pipeline demonstrations and integration tests only. It must never be represented as an observation from the Royal Project or used to claim production accuracy.

## Current Synthetic Seed

The deterministic generator is in `lib/data/syntheticSeed.ts` and is exposed by `npm run seed:synthetic`.

| Dataset | Count | Provenance | Notes |
|---|---:|---|---|
| Data sources | 1 | `SYNTHETIC` | enabled `source-synthetic` development source |
| Areas | 3 | `SYNTHETIC` | `AREA_001`–`AREA_003`, coordinates/elevation are placeholders |
| Crops | 5 | `SYNTHETIC` | the five initial crops in the requirements |
| Crop varieties | 5 | `SYNTHETIC` | one `*_STANDARD` catalog record per crop |
| Area factor observations | 39 | `SYNTHETIC` | 13 area/soil values per area at the seed date |
| Weather observations | 90 | `SYNTHETIC` | 30 daily records per area from 2026-01-01 |
| Price observations | 450 | `SYNTHETIC` | 90 daily wholesale records per crop, canonical `THB/kg` |
| Yield observations | 15 | `SYNTHETIC` | one area/crop record for every combination |
| Cost examples | 9 | `SYNTHETIC` | examples for the first three crops in each area |

## Catalog Values

### Crops

- `HEAD_LETTUCE` — ผักกาดหอมห่อ — 45 growing days
- `CABBAGE` — กะหล่ำปลี — 75 growing days
- `COS_LETTUCE` — ผักกาดหวานคอส — 50 growing days
- `TAIWAN_BABY_BOK_CHOY` — เบบี้กวางตุ้งไต้หวัน — 35 growing days
- `JAPANESE_PUMPKIN` — ฟักทองญี่ปุ่น — 90 growing days

The canonical key is uppercase `TAIWAN_BABY_BOK_CHOY`.

### Areas

`AREA_001`, `AREA_002` and `AREA_003` are configurable catalog records with synthetic names, locations, latitude, longitude and elevation. They are not real Royal Project locations.

### Crop varieties

Each initial crop has one synthetic `*_STANDARD` variety in the catalog. It is a development placeholder; real varieties and optional growing-day overrides can be added as catalog data without changing application logic.

## Generation Rules

- Dates and IDs are deterministic for seed records; analysis/session IDs are runtime IDs.
- Weather is generated around area-specific summaries with small daily variation. Temperature is in °C, rainfall in mm, humidity in percent, solar radiation in MJ/m² and wind in m/s.
- Prices use a crop base price, monthly seasonality and a weekly pulse. Only `WHOLESALE` is generated, so retail/farm-gate values are never mixed into the target.
- Yield uses the deterministic structured baseline from `lib/ml/baseline.ts` with area, crop, growing days and weather summary.
- Costs are in THB per rai and split into fertilizer, chemical, labor and other categories.
- Every generated observation carries `dataOrigin = SYNTHETIC` and `sourceId = source-synthetic`.
- Area/soil factor observations are typed scalar records and retain their factor key and canonical unit; they are seed payloads for the future observation adapter.

## Prototype Fallback Data

`lib/mockData.ts` still contains the original dashboard chart/summary values so the visual baseline has useful content before a user creates an analysis. The dashboard labels this fallback as synthetic/example data; it is presentation data, not a persisted observation.

## Replacement Path for Real Data

```text
Import -> Map columns/factors -> Validate -> Create dataset version ->
Train candidate -> Evaluate -> Compare with active -> Activate explicitly
```

Replacing the seed must not require changing domain contracts, API response shapes or frontend business logic. Real records must retain `ACTUAL` provenance and source metadata; imputed records must be marked `IMPUTED`.

The Officer development screen accepts both JSON rows and CSV/JSON files. A column mapping such as `{"area":"areaKey","crop":"cropKey","yield":"yieldKgPerRai"}` is applied before validation; unmapped columns must be active Factor Registry keys.
