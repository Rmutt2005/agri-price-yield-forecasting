# ML and Risk Specification

## Principles

- Start with reproducible structured/tabular baselines; do not introduce deep learning without data volume and validation evidence.
- A model version owns an immutable feature schema. The dynamic Factor Registry does not mean every model accepts every factor.
- Keep raw observations and provenance so feature generation and retraining are auditable.
- Synthetic data demonstrates workflow only; it cannot support real-world accuracy claims.

## Yield Model

Target: `yield_kg_per_rai`.

Inputs come from area/soil, weather windows, crop/variety and cultivation/management. The first implementation should use a deterministic baseline suitable for tabular data, a reproducible seed, and train/validation/test splits.

Required metrics: MAE, RMSE, R². Prediction output includes value, `kg/rai`, model version, input feature schema and timestamp.

Derived weather features may include average temperature, total rainfall, average humidity, max/min temperature and rainy-day count over the cultivation window.

The current development implementation aggregates raw `WeatherObservation` records with `lib/ml/weatherFeatures.ts` and the analysis path consumes that vector when the window has observations. It reports expected/observed/missing days and provenance; missing records are surfaced rather than silently converted to zero. If a future window has no raw records, the development weather summary is an explicit fallback and the response is marked stale.

## Price Forecast

Target: canonical price in `THB/kg` for one configured `price_type` (initially wholesale when data supports it). The forecast date is the expected harvest date derived from planting date and crop growing days.

The baseline must preserve crop, time/seasonality and market/source normalization. `lib/ml/priceEvaluation.ts` compares the deterministic forecast with a same-series last-observed naive baseline and records MAE/RMSE/R² for both. The active synthetic price model exposes those comparison metrics. Never aggregate wholesale/retail/farm-gate records together.

## Disease Risk Engine

Until labelled disease data exists, use a configurable rule engine rather than a made-up classifier. Inputs can include temperature, humidity, rainfall, soil moisture and crop. Output is a normalized score, one of five risk levels, a rule version and an input summary.

Suggested score mapping (configuration, not hardcoded UI behavior):

```text
0.00–0.19 VERY_LOW
0.20–0.39 LOW
0.40–0.59 MEDIUM
0.60–0.79 HIGH
0.80–1.00 VERY_HIGH
```

## Training Lifecycle

```text
Upload -> Parse -> Detect schema -> Map factors -> Validate ->
Create dataset version -> Train candidate -> Evaluate ->
Compare active -> Explicit activation or archive -> Rollback if needed
```

Candidate models never activate automatically. Store artifact checksum/location, learned baseline parameters and metrics. Activation records actor, timestamp and prior active version. Rollback reactivates a known-good archived version.

The Officer model registry compares candidate MAE/RMSE/R² with the active model. `BETTER` means all comparable metrics improve, `WORSE` means all comparable metrics regress, and mixed or missing metrics are `INCONCLUSIVE`; the UI surfaces this result in the confirmation step. The initial formula yield baseline deliberately has no held-out metrics, so it is not represented as a false perfect model.

The development trainer uses a deterministic seed (`42`) and records train/validation/test row counts in the model metrics. It is a mean-yield baseline whose JSON artifact is written through `ArtifactStore` (in-memory by default, local filesystem when configured); the metrics demonstrate the lifecycle and are not a claim of production accuracy. Dataset factor values pass through the registry-driven `normalizeFactorValue` boundary; supported source units such as °F/inch/mph can be converted to canonical units before a production adapter persists them.

## Leakage and Evaluation Rules

- Do not use observations after the prediction cutoff or harvest outcome as input features.
- Split by time/cultivation boundary where appropriate; never let duplicate rows cross train/test.
- Report missingness, synthetic/actual mix, row counts and feature schema with metrics.
- A candidate that is worse than active requires explicit policy handling and must not silently replace it.
