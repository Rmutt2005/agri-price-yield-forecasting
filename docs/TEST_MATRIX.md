# Test Matrix

Status values: `PASS`, `FAIL`, `BLOCKED`, `NOT_TESTED`.

## Baseline

| ID | Check | Command/evidence | Status | Notes |
|---|---|---|---|---|
| BASE-001 | lint | `npm run lint` | PASS | No ESLint warnings/errors |
| BASE-002 | typecheck | `npm run typecheck` | PASS | Strict TypeScript check |
| BASE-003 | unit/integration runner | `npm test` | PASS | Vitest: 29 files / 80 tests |
| BASE-004 | production build | `npm run build` | PASS | 31 routes generated; build skips lint by config and compiles/typechecks successfully |
| BASE-005 | clean dependency install | isolated `npm ci --ignore-scripts --offline --no-audit` | PASS | 504 packages installed; production-only offline audit reports 0 |
| BASE-006 | patch whitespace check | `git diff --check` | PASS | No whitespace errors |
| BASE-007 | synthetic seed command | `npm run seed:synthetic` | PASS | source 1, areas 3, crops 5, weather 90, prices 450, yields 15 |
| BASE-008 | production dependency audit | `npm audit --omit=dev --offline` | PASS | 0 production dependency vulnerabilities; dev dependency audit remains documented |
| BASE-009 | PostgreSQL migration boundary | `npm run db:migrate` without `DATABASE_URL` + migration loader test | PASS | Fails closed with actionable configuration error; SQL execution requires a configured PostgreSQL instance |
| BASE-010 | PostgreSQL development admin bootstrap boundary | `db:seed:synthetic` source inspection + guarded parameterized insert | PASS | `DEV_ADMIN_*` is opt-in/idempotent and rejected when `NODE_ENV`/`APP_ENV` is production |

## Required Unit Tests

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| UNIT-001 | economic formulas and zero/negative guards | PASS | `lib/domain/economics.test.ts` |
| UNIT-002 | factor type/unit conversion | PASS | `lib/domain/factorValues.test.ts` |
| UNIT-003 | weather feature aggregation | PASS | `lib/ml/weatherFeatures.test.ts` |
| UNIT-004 | harvest-date calculation and overrides | PASS | `lib/domain/harvest.test.ts` |
| UNIT-005 | five-level risk mapping | PASS | `lib/domain/risk.test.ts` |
| UNIT-006 | price normalization and price-type isolation | PASS | `lib/application/ingestionService.test.ts` |
| UNIT-007 | role/permission policy | PASS | `lib/application/authorization.test.ts` |
| UNIT-008 | model activation/rollback/comparison policy | PASS | `lib/repositories/modelRepository.test.ts`, `lib/ml/modelComparison.test.ts` |
| UNIT-009 | auth validation/password/session boundary | PASS | `authService` and `authRepository` tests, including expiry/revocation |
| UNIT-010 | dataset parsing/validation and provenance | PASS | `datasetParser`, `datasetService` tests |
| UNIT-011 | cultivation ownership | PASS | `cultivationRepository.test.ts` |
| UNIT-012 | price forecast vs naive baseline | PASS | `lib/ml/priceEvaluation.test.ts` |
| UNIT-013 | crop-variety validation and ingested raw-weather merge | PASS | `analysisService.test.ts`, `weatherRepository.test.ts` |
| UNIT-014 | dashboard chart read model, empty state and ingested-price provenance | PASS | `lib/application/dashboardService.test.ts` |
| UNIT-015 | PostgreSQL repository mappings and parameterized observation writes | PASS | `lib/repositories/postgresRepositories.test.ts` |
| UNIT-016 | immutable artifact storage, checksum and path-safety boundary | PASS | `lib/repositories/artifactStore.test.ts` |

## Required Integration Tests

| ID | Flow | Status | Evidence |
|---|---|---|---|
| INT-001 | dataset upload → schema validation/report | PASS | API route integration tests cover JSON and multipart CSV mapping |
| INT-002 | weather ingestion → normalized storage → feature repository | PASS | API route integration plus `weatherRepository.test.ts` |
| INT-003 | price ingestion → canonical record/dedupe | PASS | API route integration test accepts canonical wholesale price and reports duplicate |
| INT-012 | yield ingestion → normalized storage/dedupe | PASS | API route and normalization tests cover canonical target/provenance path |
| INT-004 | training → candidate model version | PASS | API route integration test |
| INT-005 | candidate activation → prediction uses active model | PASS | Active candidate parameter changes yield output/version |
| INT-006 | rollback → previous known-good model | PASS | API route integration test |
| INT-007 | analysis composition pipeline | PASS | Authenticated analysis API integration test |
| INT-008 | ownership and role/status boundaries | PASS | User cross-read, forbidden management and managed-user status requests tested |
| INT-009 | maintenance mode behavior | PASS | Cultivation mutation returns `503`; status restored to `NORMAL` |
| INT-010 | user-scoped dashboard read model | PASS | API route integration test returns latest analysis, price forecast and yield comparison |
| INT-011 | durable repository adapter contract boundary | PASS | PostgreSQL adapter tests cover catalog, observations, cultivation, analysis, dataset, sources, models and system status without requiring a live database |

## Required E2E Scenarios

| ID | Scenario | Status | Notes |
|---|---|---|---|
| E2E-001 | USER selects area/crop, enters planting date/area/costs, views complete analysis | PASS | Local browser smoke verified empty dashboard → input → complete result dashboard |
| E2E-002 | OFFICER uploads/maps/validates/trains/inspects/activates candidate | NOT_TESTED | Browser verified upload/map/validation/train/metrics; activation confirmation was not accepted; API INT-004/005/006 covers mutation |
| E2E-003 | ADMIN changes role and maintenance status, verifies permissions | NOT_TESTED | Browser verified Admin role-management screen and Officer denial; maintenance confirmation was not accepted; API INT-009 covers mutation |

## Failure and Edge Cases

| ID | Case | Status | Notes |
|---|---|---|---|
| EDGE-001 | weather/price source unavailable | PASS | Contract-only adapters raise `SourceUnavailableError` |
| EDGE-002 | missing history/no active model | PASS | Analysis unit tests cover explicit no-raw-weather fallback and controlled `NO_ACTIVE_MODEL` error branches |
| EDGE-003 | invalid dataset format/schema/units | PASS | Dataset and ingestion validation tests |
| EDGE-004 | training failure/corrupt artifact | PASS | Invalid training path and corrupt-artifact guard are covered by service/repository tests |
| EDGE-005 | duplicate ingestion | PASS | Integration route asserts `accepted: 0` and `duplicates: 1` |
| EDGE-006 | expired/unauthorized authentication | PASS | Unauthenticated/forbidden API assertions plus expired session test |
| EDGE-007 | maintenance mode behavior | PASS | API integration test |

## Smoke Checks

| ID | Check | Evidence | Status |
|---|---|---|---|
| SMOKE-001 | catalog/seed endpoints | 3 areas, 5 crops, 5 varieties, 27 factors, 39 area factor observations | PASS |
| SMOKE-002 | valid analysis request | Complete response with harvest/yield/price/risk/economics and `SYNTHETIC` origin | PASS |
| SMOKE-003 | invalid analysis request | `400` with structured issues | PASS |
| SMOKE-004 | auth session lifecycle | register → `/api/me` → logout → `401` | PASS |
| SMOKE-005 | officer/admin lifecycle | dataset → train → activate → rollback; ingestion; maintenance block | PASS |
| SMOKE-006 | development runtime boundary | `GET /api/dashboard` unauthenticated `401`, `GET /api/varieties` `200`, `/dashboard` `200` | PASS |
| SMOKE-007 | PostgreSQL tooling without configuration | `npm run db:migrate` | PASS | No connection attempted; clear `DATABASE_URL` error |
| SMOKE-008 | local artifact provider | `artifactStore.test.ts` | PASS | Immutable JSON artifacts, checksums and root/path validation |
| SMOKE-009 | local HTTP black-box core flow | Next runtime + `Invoke-WebRequest`/`curl`: auth → analysis/detail/dashboard; yield ingestion; dataset → train → activate → rollback; maintenance block | PASS | Unauthenticated dashboard `401`; normal mutations/reads succeeded; maintenance mutation `503`; server stopped after QA |
