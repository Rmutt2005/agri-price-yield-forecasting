# Architecture

## Current State

The repository is a Next.js 14.2.35 App Router application with React 18, strict TypeScript, Tailwind CSS, Recharts and Lucide React. The original glassmorphism/light-dark Thai UI remains the visual baseline, while the backend foundation now lives beside it as a typed modular monolith.

```text
app/
  page routes: landing, auth, dashboard, input, profile, officer, admin
  api routes: catalog (including varieties), auth, cultivation, analysis/dashboard, ingestion, datasets, models, admin
components/
  reusable UI, dashboard shell, navigation and theme
lib/
  domain/        entities, catalog, factor registry and pure rules
  application/   validation, authorization, analysis, ingestion, training and admin use cases
  repositories/  interfaces, in-memory adapters and opt-in PostgreSQL adapters
  data/          synthetic seed and external adapter contracts
  ml/            deterministic yield/price baseline adapters
db/              PostgreSQL pool, migration runner, migrations and seed boundary
docs/            source of truth
```

## Runtime Shape

```text
Browser UI (Next App Router)
        |
        v
API Route Handlers
        |
        v
Application Services
        |
        +--> Domain Services
        |      factors, harvest, economics, disease risk
        |
        +--> Repository Interfaces
        |      +--> in-memory adapters (default development runtime)
        |      +--> PostgreSQL core adapters (`AGRI_PERSISTENCE=postgres`)
        |
        +--> Prediction/Model Registry
               +--> deterministic structured-data baselines
               +--> future Python training/artifact runtime
```

The frontend does not choose models or reproduce business formulas. The analysis response is the shared decision-support contract.

The PostgreSQL boundary is lazy and opt-in: `db/client.ts` does not open a connection until a database command or a selected PostgreSQL repository requests one. `db/migrationRunner.ts` applies numerically ordered SQL files transactionally and records applied versions in `schema_migrations`. `db/seedSynthetic.ts` uses parameterized upserts and `ON CONFLICT` guards so the catalog, raw observations and baseline models can be materialized repeatedly without duplicate rows. All core PostgreSQL repositories use parameterized queries; auth additionally uses scrypt password hashes, hashed session tokens and transaction-scoped account/session mutations. Dataset/model artifacts go through `ArtifactStore`, with in-memory and validated local-filesystem providers.

## Data Flow

1. A user submits canonical cultivation input (`areaKey`, `cropKey`, planting date, area in rai, factors and costs).
2. The route authenticates the session, checks maintenance mode and validates catalog keys, units, ranges and factors.
3. The analysis service resolves the active yield, price and disease versions, calculates expected harvest date and obtains raw weather from the seed plus development ingestion repository, with an explicit summary fallback.
4. The active yield adapter, price baseline and versioned disease rule engine produce predictions.
5. The economics service calculates revenue, total cost, profit and break-even values in canonical units.
6. The analysis repository stores a user-scoped record. The analysis and dashboard routes return provenance, model versions, feature schema, timestamp and user-scoped chart read models. Dashboard historical price uses matching ingested observations when available and falls back to the documented synthetic series otherwise.

Cultivation, dataset, ingestion and model lifecycle routes use the same repository boundary. In development, repositories are stored on `globalThis` so Next route bundles share state during a dev session.

## Domain Boundaries

- `Area`, `Crop` and `FactorDefinition` are catalog/configuration data; the initial catalog is synthetic and extensible.
- Raw weather, price and factor observations retain source and `DataOrigin`; ingestion normalizes before storage and deduplicates canonical keys. Dashboard reads the matching price observations without mixing price types.
- A model version owns an immutable feature schema. New registry factors do not silently enter an existing model.
- Training creates a candidate with deterministic split metadata and learned baseline parameters. Activation and rollback are explicit operations.
- The model registry exposes a metric comparison read model. Lower MAE/RMSE and higher R² are improvements; absent or mixed metrics are `INCONCLUSIVE`, so placeholder metrics cannot create a false pass/fail.
- Disease risk is a five-level configurable rule engine until labelled disease data exists.

## Security Boundaries

- Sessions are server-side lookups using an HttpOnly cookie; passwords are scrypt-hashed and public user responses omit hashes. The PostgreSQL auth option stores only a SHA-256 session-token hash and deletes sessions on deactivation.
- `USER` records are scoped by owner for analysis and cultivation reads.
- `OFFICER`/`ADMIN` management APIs perform explicit permission checks in route handlers.
- Admin role and system-status changes are never authorized by UI visibility alone.
- Dataset uploads accept bounded JSON/CSV files in the current development path, limited to 2 MB and 10,000 rows, with schema/type/range/duplicate checks.
- Credentials belong in environment variables; `.env.example` contains placeholders only.

## Runtime Modes and Limitations

### Development/demo

Use the deterministic synthetic catalog, weather/price/yield baselines and in-memory repositories by default. Responses identify `SYNTHETIC`; baseline metrics and model artifacts are workflow demonstrations, not real-world accuracy claims. The local filesystem artifact provider is available for restart-safe development.

### Production path

Run `npm run db:migrate` and `npm run db:seed:synthetic` after configuring PostgreSQL. Set `AGRI_PERSISTENCE=postgres` only after the migration succeeds to select all durable core repositories. Set `AGRI_ARTIFACT_STORAGE=filesystem` for a local durable artifact provider; production still needs a managed object-storage implementation, operational backup/retention and real source adapters. API contracts should remain stable.

The synthetic source has deterministic price/weather adapters for development. MOC, NABC/OAE, Talad Thai and the external weather adapter expose contract-only unavailable implementations so missing credentials do not block development of the rest of the system.

## Architectural Invariants

- Canonical units are yield `kg/rai`, price `THB/kg`, area `rai` and currency `THB`.
- Raw observations are retained; derived features are reproducible from raw data.
- Provenance is explicit and synthetic values are not presented as Royal Project observations.
- Candidate models never activate automatically.
- Important predictions record model/rule version, timestamp and input feature schema.
- Existing visual language remains the frontend baseline.
