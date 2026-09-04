# Requirements Checklist

This checklist is the explicit final-audit companion to `docs/REQUIREMENTS.md`.

## Core product

- [x] Five initial crops are catalog entities/configuration.
- [x] Crop varieties are separate catalog entities, can be queried by crop, and support an optional growing-day override.
- [x] Three configurable synthetic study areas exist with explicit provenance.
- [x] Yield prediction returns `kg/rai` and total yield.
- [x] Harvest date is derived from planting date and configurable growing days.
- [x] Price forecast targets the expected harvest date in canonical `THB/kg` wholesale units.
- [x] Disease risk returns five levels with a versioned configurable rule engine.
- [x] Economics returns revenue, total cost, profit, break-even price/yield and profit per rai.
- [x] Dashboard renders the complete decision response plus loading, error, empty, stale and synthetic states.
- [x] Dashboard charts use a user-scoped API read model for historical/forecast price, observed/predicted yield and cost/revenue/profit.

## Data and modeling

- [x] Factor Registry supports the baseline categories/types and extensible factor keys.
- [x] Raw daily weather observations and aggregation features are modeled separately.
- [x] Yield observations have a normalized repository path and feed durable dashboard comparisons when available.
- [x] Dataset validation covers missing values, types, ranges, duplicates, unknown catalog/factors, dates, units and target.
- [x] CSV/JSON parsing, column mapping and provenance reporting are available for development upload.
- [x] Model versions store immutable feature schema, metrics, dataset, timestamp, status and artifact metadata.
- [x] Yield training records deterministic train/validation/test split counts with seed `42` and MAE/RMSE/R².
- [x] Price evaluation compares the forecast with a same-series naive baseline without mixing price types.
- [x] Model activation is explicit, changes prediction behavior, and rollback restores an archived model.
- [x] Candidate metrics are compared with the active model and missing baseline metrics remain inconclusive.
- [x] Synthetic data is clearly labeled and documented as non-production demonstration data.

## Roles and operations

- [x] USER register/login/profile/cultivation/analysis/dashboard flow is server-authorized.
- [x] OFFICER search/status-manages general users and manages dataset/model workflows.
- [x] ADMIN manages roles, account status, system status and model/system health.
- [x] Price, weather and yield ingestion normalize canonical records, preserve provenance and deduplicate natural keys.
- [x] MOC, NABC/OAE, Talad Thai and weather source adapter contracts exist with graceful unavailable behavior.
- [x] Maintenance mode, unauthorized role, expired session, invalid dataset, training failure and corrupt artifact paths are handled.

## Verification state

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test` — 29 files / 80 tests
- [x] Local browser USER flow and empty/auth states
- [x] Local browser ADMIN role-management screen
- [x] Local browser OFFICER upload/map/validate/train/metrics flow
- [x] API integration for activation, rollback, ingestion, dedupe and maintenance
- [x] PostgreSQL migration loader/pool guard and explicit idempotent synthetic seed boundary
- [x] Optional PostgreSQL-backed auth/session adapter with hashed sessions and transaction-scoped status changes
- [x] Optional PostgreSQL adapters for all core repositories with parameterized reads/writes and transaction-scoped model lifecycle changes
- [x] ArtifactStore with immutable in-memory and validated local-filesystem providers plus checksum verification
- [ ] Browser acceptance of activation/maintenance confirmation dialogs — intentionally not auto-accepted during QA; API behavior is covered.
- [x] Clean isolated install with the current lockfile
- [ ] PostgreSQL runtime integration — requires a configured database environment.

## Real-data handoff

- [x] Replacement workflow is documented: import → map factors → validate → version dataset → train/evaluate → explicitly activate.
- [x] Wire core durable PostgreSQL repositories and a development artifact provider behind explicit runtime boundaries.
- [ ] Add managed cloud object storage, backup/retention and operational access policy before production deployment.
- [ ] Enable real external source adapters once source specifications/credentials are supplied.
