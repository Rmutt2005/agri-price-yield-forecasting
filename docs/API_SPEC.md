# API Specification

## Conventions

- JSON over HTTP under `/api`.
- Dates use `YYYY-MM-DD`; timestamps are ISO 8601.
- Stable English keys/enums are used at the API boundary; Thai labels belong to the UI.
- Validation errors return `400`; unauthenticated requests `401`; forbidden requests `403`; missing resources `404`; maintenance/dependency failures `503`.
- Session authentication uses an HttpOnly `agri_session` cookie with a 7-day TTL enforced server-side. The default development runtime stores state in memory; after migrations, setting `AGRI_PERSISTENCE=postgres` selects the PostgreSQL-backed core repositories for auth/session, catalog, observations, cultivation, analysis, datasets, sources, models and system status. `AGRI_ARTIFACT_STORAGE=filesystem` selects the restart-safe local artifact provider.

## Public Catalog

```text
GET /api/areas
GET /api/crops
GET /api/varieties?cropKey=<crop-key>
GET /api/factors
```

Responses return `{ data: [...] }`. The development catalog contains 3 synthetic areas, 5 crops, one synthetic standard variety per crop and 27 active factors.

## Auth and Profile

```text
POST  /api/auth/register
POST  /api/auth/login
POST  /api/auth/logout
GET   /api/me
PATCH /api/me
```

Registration and login set an HttpOnly session cookie. Profile updates can change name/email and can change a password only when the current password is supplied. Password hashes are never returned.

## Cultivation and Decision Support

```text
GET   /api/cultivations
POST  /api/cultivations
GET   /api/cultivations/:id
PATCH /api/cultivations/:id

GET  /api/analysis
POST /api/analysis
GET  /api/analysis/:id

GET  /api/dashboard
```

`POST /api/cultivations` and `PATCH /api/cultivations/:id` validate the same canonical cultivation input as analysis and scope records to the authenticated user. `POST /api/analysis` returns one complete `AnalysisResponse` containing expected harvest date, yield, harvest-date price, five-level disease risk, economics, model/rule versions and data quality metadata. Business formulas are not reconstructed in the frontend.

Analysis and cultivation mutations return `503` while system status is `MAINTENANCE`. When raw weather observations cover any part of the cultivation window, the analysis service aggregates them; missing days are reported as stale data. It falls back to the development summary when no raw records cover the window.

`GET /api/dashboard` returns the latest authenticated analysis plus a user-scoped chart read model containing historical/forecast price, observed/predicted yield comparison and cost/revenue/profit data. Before the first analysis it returns explicit empty/stale chart metadata.

## User Search

```text
GET /api/users?q=<name-or-email>
PATCH /api/users/:id
```

Search requires `user:search` (`OFFICER` or `ADMIN`). Results are limited to 100 active users and contain public profile fields only. Status updates use `{ "active": true|false }`; Officer can manage only general `USER` accounts, while Admin can manage all accounts except self-deactivation. Deactivation revokes the target's sessions.

## Data Sources and Ingestion

```text
GET   /api/data-sources
PATCH /api/data-sources/:id
POST  /api/ingestion/prices
POST  /api/ingestion/weather
POST  /api/ingestion/yields
```

All endpoints require `OFFICER` or `ADMIN`. Ingestion payloads use `{ sourceKey, records }`. Price records must use `currency: "THB"`, `unit: "kg"` and an explicit `priceType` (`WHOLESALE`, `RETAIL`, `FARM_GATE`, or `OTHER`). Weather records are normalized to raw daily observations by area/date. Yield records use `areaKey`, `cropKey`, `harvestDate` and non-negative `yieldKgPerRai`. Invalid records are reported individually; records are deduplicated by canonical natural keys before persistence in the selected repository. Disabled sources do not accept records. Yield observations feed dashboard comparisons when available; the default demo path falls back to the labeled synthetic reference series.

The source registry includes MOC, NABC/OAE and Talad Thai as disabled contract entries, plus an enabled synthetic development source.

## Datasets and Models

```text
POST /api/datasets
GET  /api/datasets
POST /api/datasets/:id/train
GET  /api/models
POST /api/models/:id/activate
POST /api/models/:id/rollback
```

All endpoints require `OFFICER` or `ADMIN`. The current development upload contract accepts either a JSON object with a dataset name, `dataOrigin`, rows and optional `columnMapping`, or `multipart/form-data` with a `.csv`/`.json` file and the same fields. Body/file size is limited to 2 MB and rows to 10,000. Validation checks required targets, catalog keys, dates, known factors, scalar types, duplicates and provenance. Dataset rows are omitted from list responses.

Training creates an inactive `CANDIDATE` yield model with deterministic seed `42`, train/validation/test counts, MAE/RMSE/R² metrics, a learned baseline parameter and an `ArtifactStore` reference. It never activates automatically. `GET /api/models` also returns a comparison read model for each candidate: `BETTER`, `WORSE` or `INCONCLUSIVE` against the active model using MAE/RMSE/R². PostgreSQL model lifecycle reads verify supported memory/file artifact locations and checksums before prediction or activation.

Activation and rollback require JSON `{ "confirm": true }`. Activation archives the current model of the same type; rollback activates a selected archived model. Once activated, a trained candidate's stored parameter is used by the yield prediction adapter.

## Administration

```text
GET   /api/admin/users
PATCH /api/admin/users/:id/role
GET   /api/admin/system-status
PATCH /api/admin/system-status
```

Role management and system status require `ADMIN`. System status is `NORMAL` or `MAINTENANCE`; maintenance blocks cultivation and analysis mutations while catalog and read-only endpoints remain available.

## Authorization Matrix

| Capability | USER | OFFICER | ADMIN |
|---|---:|---:|---:|
| Own profile, cultivation and analysis | yes | yes | yes |
| Search active users | no | yes | yes |
| Price/weather ingestion and source registry | no | yes | yes |
| Dataset upload/validation/training | no | yes | yes |
| Model activation/rollback | no | yes | yes |
| Change user roles | no | no | yes |
| Change system status | no | no | yes |

Every capability is checked in the server handler; navigation visibility is only a usability layer.
