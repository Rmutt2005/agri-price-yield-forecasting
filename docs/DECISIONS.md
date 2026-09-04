# Decisions

## DEC-001 — Preserve the existing UI visual baseline

Date: 2026-09-04  
Status: Accepted

Context: Repository has a usable glassmorphism/light-dark Thai UI prototype.

Decision: Keep existing theme, layout and reusable components as the frontend baseline. Add functionality and states incrementally; do not perform a wholesale redesign.

Reason: Meets the product direction while reducing visual regression and implementation scope.

Alternatives: Redesign from scratch; rejected because it does not improve the core decision-support requirement.

Consequences: New pages must use the existing design tokens/components or extend them consistently.

## DEC-002 — Use a modular monolith before extracting services

Date: 2026-09-04  
Status: Accepted

Context: Current repository has no backend, database or ML service, and the project needs maintainable typed boundaries without unnecessary operational complexity.

Decision: Implement API route handlers, application services, domain services and repository adapters in one Next.js deployment first. Keep model-training/prediction behind interfaces so a Python runtime can be added later.

Reason: Fastest path to an end-to-end system while preserving explicit boundaries for PostgreSQL and ML.

Alternatives: Immediate microservices; rejected until scale, ownership or runtime constraints justify them.

Consequences: Server/client boundaries and dependency direction must be enforced by folder ownership and tests.

## DEC-003 — Use a flexible Factor Registry

Date: 2026-09-04  
Status: Accepted

Context: Agricultural factors will evolve when real project data arrives.

Decision: Store factor definitions and typed observations as registry-driven data instead of fixed columns for every factor.

Reason: New factors can be mapped and validated without database redesign; model feature schemas remain explicit per model version.

Alternatives: One wide table with a column per factor; rejected because each factor change would require a migration and application rewrite.

Consequences: Factor validation and conversion need strong contracts; model training must snapshot a fixed feature schema.

## DEC-004 — Start disease risk as configurable rules

Date: 2026-09-04  
Status: Accepted

Context: No labelled disease dataset is available.

Decision: Implement a versioned five-level rule engine first and preserve the same API shape for a future labelled ML model.

Reason: Avoids unsupported classifier accuracy claims while delivering useful, testable behavior.

Alternatives: Train a synthetic classifier; rejected because it would create misleading confidence.

Consequences: Rule thresholds/configuration need versioning and audit metadata.

## DEC-005 — Keep generated build output out of Git

Date: 2026-09-04  
Status: Accepted

Context: `.next` was tracked and caused large unrelated working-tree diffs after development/build commands.

Decision: Ignore `.next` and stage removal of the tracked generated files; do not delete the local build output as part of this cleanup.

Reason: Keeps source history reviewable while retaining local build usability.

Consequences: The staged cleanup must be committed before it is reflected in shared branch history.

## DEC-006 — Use an in-memory development adapter behind repository interfaces

Date: 2026-09-04  
Status: Accepted

Context: Development needs a working end-to-end flow before database credentials and a migration runner are available.

Decision: Use global in-memory repositories for the local runtime and tests, while keeping interfaces and a PostgreSQL migration boundary in place.

Reason: It keeps the dev loop runnable without pretending that transient storage is production persistence.

Alternatives: Couple routes directly to browser state; rejected because it would weaken server authorization and make the production migration harder.

Consequences: State resets on process restart; production must wire durable repositories before deployment.

## DEC-007 — Store learned baseline parameters and make activation affect prediction

Date: 2026-09-04  
Status: Accepted

Context: A model lifecycle is not useful if activation changes only a version label while predictions continue using the old implementation.

Decision: Development yield candidates store a learned mean-yield parameter. The prediction adapter reads the active model's parameter and rolls back to the prior adapter when the prior model is reactivated.

Reason: This provides an auditable, testable lifecycle without fabricating a production-grade ML artifact from synthetic data.

Alternatives: Return only metadata; rejected because it would fail the activation → prediction contract.

Consequences: The current trainer remains a deliberately simple baseline; a future artifact adapter can replace the parameter while preserving the model contract.

## DEC-008 — Read dashboard history from the server-scoped API

Date: 2026-09-04  
Status: Accepted

Context: Browser session storage could retain a previous user's analysis after logout/login on the same device.

Decision: Dashboard loads the latest analysis and chart read model through the authenticated `/api/dashboard` endpoint; the input page does not persist result data in browser storage.

Reason: User ownership is enforced at the repository/API boundary and avoids cross-account stale data.

Alternatives: Keep session storage and attach a user ID; rejected because it adds a second client-side source of truth.

Consequences: The development analysis repository must be shared across route bundles, so its singleton is stored on `globalThis`; matching ingested price observations now feed the dashboard, while PostgreSQL and durable observation queries remain the production path.

## DEC-009 — Parse CSV/JSON at the API boundary and keep uploads ephemeral in development

Date: 2026-09-04  
Status: Accepted

Context: Officer training data may arrive as CSV or JSON before a durable object store is configured.

Decision: Accept bounded CSV/JSON multipart uploads, parse scalar values, apply explicit column mappings, validate against the Factor Registry, and keep validated rows in the development repository only.

Reason: It provides the required import → map → validate workflow without unsafe file paths or silently accepting arbitrary columns.

Alternatives: Accept arbitrary files or require JSON-only; rejected because the former is unsafe and the latter blocks the expected handoff format.

Consequences: The default in-memory provider remains ephemeral; setting `AGRI_ARTIFACT_STORAGE=filesystem` makes local development uploads/model artifacts restart-safe. A managed object-storage provider is still required for production deployment.

## DEC-010 — Use raw weather when available and explicit deterministic fallbacks

Date: 2026-09-04  
Status: Accepted

Context: The seed contains a bounded weather history while users may request future windows outside that history.

Decision: Aggregate raw daily observations for covered windows, report missing/stale/provenance metadata, and use the synthetic area summary only when no raw record covers the window.

Reason: Preserves raw-data lineage without making the development flow unusable for dates not present in the seed.

Alternatives: Always use the summary or fail when history is missing; rejected because they either bypass the time-series design or block synthetic development.

Consequences: Production adapters must populate the observation repository and provide a policy for missing historical windows.

## DEC-011 — Make PostgreSQL migration and seed writes explicit

Date: 2026-09-04  
Status: Accepted

Context: The development runtime must remain usable without a database, while the schema and synthetic observations need a repeatable path into PostgreSQL when an environment is available.

Decision: Add a lazy `pg` pool, transaction-scoped migration runner, durable session/natural-key migration, and a parameterized synthetic catalog/observation seed. Keep normal `seed:synthetic` read-only and require the explicit `db:seed:synthetic` command with `DATABASE_URL` for writes.

Reason: Prevents accidental writes during local tests and makes the database boundary reproducible without changing the current development API contracts.

Alternatives: Connect to PostgreSQL automatically at application import time; rejected because it would make tests and the no-database dev path fragile. Keep only a SQL file; rejected because migration ordering and seed idempotency would remain manual.

Consequences: The migration/seed path is executable when PostgreSQL is configured, while actual database runtime verification and production object-storage operations remain environment-dependent.

## DEC-012 — Compare candidate models without inventing baseline metrics

Date: 2026-09-04  
Status: Accepted

Context: The Officer lifecycle requires comparison with the active model, but the initial deterministic yield formula has no held-out evaluation metrics.

Decision: Expose a comparison read model using MAE/RMSE/R² directionality. Mark a comparison `INCONCLUSIVE` when the active model has no comparable metric or when metric outcomes are mixed; do not represent the formula baseline with perfect placeholder scores.

Reason: Prevents a synthetic placeholder from falsely rejecting every trained candidate while still surfacing objectively worse candidates when comparable metrics exist.

Alternatives: Auto-activate only candidates that improve every metric; rejected because missing/mixed metrics would force an unsupported policy. Treat placeholders as perfect; rejected as misleading.

Consequences: Activation remains explicit and reviewable; a production policy can later require a minimum evaluation set and thresholds.

## DEC-013 — Make durable authentication an explicit runtime opt-in

Date: 2026-09-04  
Status: Accepted

Context: The PostgreSQL schema supports the domain state, but the default development flow must continue to run without a configured database.

Decision: Add asynchronous PostgreSQL adapters for all core repositories and select them together only when `AGRI_PERSISTENCE=postgres`; keep the in-memory repositories as the default no-database runtime.

Reason: It provides a real persistent session boundary without making a no-database development install fail or creating a mixed, undocumented persistence mode.

Alternatives: Connect PostgreSQL automatically; rejected because local development has no guaranteed database. Select repositories independently; rejected because a mixed persistence mode would make ownership and restart behavior harder to reason about.

Consequences: Repository and session boundaries are Promise-aware. The PostgreSQL path requires `DATABASE_URL` and migrations; all core API state can be durable under the opt-in runtime, while the default remains in-memory for a fast dev loop. Runtime integration still needs a configured PostgreSQL environment.

## DEC-014 — Put dataset and model artifacts behind an explicit provider

Date: 2026-09-04  
Status: Accepted

Context: Dataset uploads and trained model metadata need an artifact location/checksum without coupling the application to a cloud vendor during development.

Decision: Route JSON artifacts through `ArtifactStore`, use an immutable in-memory provider by default, and offer a validated local-filesystem provider selected by `AGRI_ARTIFACT_STORAGE=filesystem`.

Reason: Keeps the development path dependency-light while making artifact addressing, checksum verification and path safety explicit before a managed object-storage adapter is introduced.

Consequences: File-backed development artifacts survive process restarts under `.data/artifacts` and are ignored by Git; production still needs a managed provider with backup, retention and access-control policies.
