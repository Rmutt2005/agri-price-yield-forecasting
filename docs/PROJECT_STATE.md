# Project State

## Current Phase

Phase 4–22 development foundation, dashboard read model, frontend integration, variety support, browser QA, PostgreSQL migration/seed tooling, all core PostgreSQL repository adapters and artifact-provider boundary are implemented on branch `dev`. Development regression is green; actual PostgreSQL runtime verification, managed object storage and real external adapters remain environment-dependent.

## Current Goal

พัฒนา UI prototype ให้เป็น Agricultural Decision Support System แบบ typed modular monolith ที่เริ่มจาก synthetic data ได้ และสามารถรับข้อมูลจริงภายหลังโดยไม่ต้องรื้อ domain, database schema, API หรือ model lifecycle

## Completed

- ยืนยัน Git repository: `C:\Users\TTTT\Desktop\Projectจบ\agri-price-yield-forecasting`
- ยืนยัน remote: `origin -> https://github.com/Rmutt2005/agri-price-yield-forecasting.git`
- ทำงานบน branch `dev` แยกจาก `main`; ยังไม่มี commit หรือ push บน branch นี้
- รักษา visual baseline เดิม: glassmorphism cards, Thai Prompt font, light/dark theme, sidebar/navbar และ Recharts
- เพิ่ม typed domain model สำหรับ Area, Crop, Factor, Cultivation Cycle, observations, prediction, economics, dataset, model, user, source และ system status
- เพิ่ม catalog พืช 5 ชนิด พื้นที่สังเคราะห์ 3 แห่ง Crop Variety 5 รายการ และ Factor Registry 27 รายการที่ extensible
- เพิ่ม data-driven Crop Variety entity/API พร้อม standard synthetic variety ต่อ crop, หน้า input เลือก variety และ validation ว่า variety ต้องสังกัด crop ที่เลือก
- เพิ่ม harvest-date calculation, economics service และ disease-risk rule engine 5 ระดับ พร้อม unit tests
- เพิ่ม deterministic synthetic seed: source 1, areas 3, crops 5, varieties 5, factor observations 39, weather 90, prices 450, yields 15 และ cost examples
- เพิ่ม typed FactorObservation และ in-memory observation storage พร้อม dedupe ตาม natural key; raw weather ที่ ingest แล้วถูกนำมารวมใน feature aggregation
- เพิ่ม PostgreSQL baseline migration ที่ครอบคลุม catalog, factors, observations, cultivation, analysis, datasets, models, users และ system status
- เพิ่ม server-side auth/session development adapter, password hashing, profile update และ role permissions (`USER`, `OFFICER`, `ADMIN`)
- เพิ่ม API catalog, auth/profile, cultivation CRUD, user search, analysis/history, price/weather/yield ingestion, data-source registry, dataset validation/training, model activation/rollback และ admin status/role management
- เพิ่ม development model registry: active yield/price baseline และ disease rules; trained candidate เก็บ metrics, deterministic split metadata และ learned baseline parameter
- เชื่อมหน้า login, register, profile, input และ dashboard กับ API พร้อม loading/error/empty/synthetic/stale states ที่เกี่ยวข้อง
- เพิ่ม Officer UI สำหรับ dataset validation, training, activation/rollback และค้นหาผู้ใช้; เพิ่ม Admin UI สำหรับ role/system status
- เพิ่ม safe CSV/JSON file parser (ขนาดจำกัด 2 MB), column mapping preview/validation flow และ reject unknown factor/non-scalar values
- เพิ่ม factor value normalization พร้อม unit conversion ที่รองรับ (°F/°C, inch/mm, mph/m/s) และใช้ registry type validation ใน dataset path
- เพิ่ม raw weather aggregation เข้า analysis เมื่อมี observation ครอบคลุม พร้อม missing/stale/provenance warnings และเพิ่ม price forecast-vs-naive metrics
- เพิ่ม model comparison read model สำหรับ candidate เทียบ active (MAE/RMSE/R²), แสดงสถานะดีกว่า/แย่กว่า/สรุปไม่ได้ใน Officer UI และเตือนใน confirmation ก่อน activate
- เพิ่ม user-scoped dashboard read model/API สำหรับ historical/forecast price, observed-vs-predicted yield และ cost/revenue/profit charts พร้อม empty/stale metadata
- ปรับ dashboard chart read model ให้ใช้ราคา canonical ที่ ingest แล้วตาม crop/price type พร้อมรักษา `ACTUAL`/`IMPUTED`/`SYNTHETIC` provenance และ fallback ที่ประกาศชัดเจน
- เพิ่ม session expiry, user status management สำหรับ Officer/Admin และ corrupt-artifact guard ใน model lifecycle
- ตรวจ browser smoke แล้ว: public/auth gate, USER analysis dashboard, ADMIN role management, OFFICER upload/map/validate/train/metrics และ Officer → Admin permission denial
- เพิ่ม `.gitignore` สำหรับ generated output และ stage การนำ `.next` ที่เคยถูก track ออกจาก Git index โดยไม่ลบ build output ในเครื่อง
- เพิ่ม `CONTEXT.md` เป็น glossary ของศัพท์ domain กลาง
- เพิ่ม lazy `pg` pool, transaction-scoped migration runner, `schema_migrations` tracking และ migration สำหรับ durable auth sessions/natural-key indexes
- เพิ่ม explicit PostgreSQL synthetic seed ที่ upsert catalog, varieties, factors และ raw factor/weather/price/yield observations แบบ parameterized และ idempotent
- เพิ่ม opt-in development ADMIN bootstrap ใน PostgreSQL seed ด้วย `DEV_ADMIN_EMAIL`/`DEV_ADMIN_PASSWORD` แบบ parameterized, idempotent และปิดใน production
- เพิ่ม CLI env loader สำหรับ `db:migrate`/`db:seed:synthetic` ให้โหลด `.env` และ `.env.local` โดยไม่ทับค่าที่ export ใน shell
- เพิ่ม `PostgresAuthRepository` แบบ async ที่ใช้ scrypt password hash, hashed session token, parameterized query และ transaction สำหรับ register/deactivate; เปิดใช้ได้ด้วย `AGRI_PERSISTENCE=postgres`
- ปรับ auth/session API handlers ให้ await repository results และเพิ่ม unit coverage ของ PostgreSQL auth โดยไม่ต้องใช้ database จริง
- เพิ่ม `0003_durable_snapshots_and_price_key.sql` สำหรับ analysis/dataset snapshots และ unique natural key ของ price observations
- เพิ่ม typed async PostgreSQL adapters สำหรับ catalog, factor/price/weather/yield observations, cultivation, analysis, dataset, data sources, model lifecycle และ system status; `AGRI_PERSISTENCE=postgres` เลือกใช้ทั้งชุด
- เพิ่ม `ArtifactStore` พร้อม immutable in-memory provider และ validated local-filesystem provider (`AGRI_ARTIFACT_STORAGE=filesystem`) สำหรับ dataset/model JSON และ checksum verification
- เชื่อม persisted yield observations เข้า dashboard comparison โดยยัง fallback เป็น synthetic reference เมื่อไม่มีข้อมูล
- เพิ่ม repository adapter contract tests และปรับ application boundaries ให้รองรับทั้ง sync in-memory และ async PostgreSQL results

## In Progress

- ตรวจ final regression, API black-box behavior และเอกสารให้ตรง implementation ล่าสุด
- ตรวจ database migration/seed tooling และ PostgreSQL runtime เมื่อมี PostgreSQL environment พร้อม
- ตรวจ local filesystem artifact provider และกำหนด managed object-storage adapter/retention policy สำหรับ production
- เตรียมเติม real external source adapters หลังมี source contract/credential ที่ใช้งานได้

## Not Started

- Real MOC, NABC/OAE, Talad Thai และ weather source adapters หลังได้รับ specification/credentials
- Managed cloud object storage สำหรับ dataset/model artifacts ก่อน production deployment

## Next Actions

1. ใช้ branch `dev` ต่อสำหรับงานพัฒนาที่สั่งถัดไป โดยยังไม่ commit/push checkpoint นี้
2. เมื่อ environment พร้อม ให้รัน `npm run db:migrate` และ `npm run db:seed:synthetic` แล้วทดสอบ API ด้วย `AGRI_PERSISTENCE=postgres`
3. เปลี่ยน local filesystem artifact provider เป็น managed object storage พร้อม backup/retention/access policy ก่อน production
4. เติม real external source adapters เมื่อ source contract/credential ใช้งานได้
5. เมื่อข้อมูลจริงมาถึง: import → map factors → validate → version dataset → train/evaluate → activate อย่าง explicit

## Next Exact Actions

1. ใช้ branch `dev` ต่อสำหรับคำสั่งพัฒนาถัดไป โดยยังไม่ commit/push checkpoint นี้
2. เมื่อ environment พร้อม ให้รัน `npm run db:migrate` และ `npm run db:seed:synthetic`
3. เปิด `AGRI_PERSISTENCE=postgres` และทดสอบ auth, ownership, ingestion, dashboard และ model lifecycle กับฐานข้อมูลจริง
4. เมื่อได้ข้อมูลจริง ให้ทำ import → map → validate → version → train/evaluate → explicit activate

## Known Issues

- ค่าเริ่มต้นของ development ยังเป็น in-memory และ state จะหายเมื่อ process restart; เมื่อเปิด `AGRI_PERSISTENCE=postgres` core repositories ทั้งหมดจะใช้ PostgreSQL หลัง migration/seed สำเร็จ
- `db:migrate` และ `db:seed:synthetic` ต้องใช้ `DATABASE_URL` และยังไม่ได้รันกับ PostgreSQL จริงในเครื่องนี้เพราะไม่มี configured database
- Auth/session default ยังเป็น development adapter; `AGRI_PERSISTENCE=postgres` ใช้ durable users/sessions หลัง migration แต่ยังไม่มี rate limiting, CSRF strategy เต็มรูปแบบ หรือ password reset
- Synthetic price/weather adapters ใช้งานได้แบบ deterministic; External MOC, NABC/OAE, Talad Thai และ weather adapter จริงยังเป็น contract-only และคืน source-unavailable จนกว่าจะมี credentials/spec ที่พร้อม
- Dataset parser รองรับ CSV/JSON และ mapping/validation; raw upload snapshot ถูกส่งเข้า `ArtifactStore` โดย default เป็น memory และเลือก local filesystem ได้ แต่ยังไม่มี managed object-storage provider
- Trainer เป็น mean-yield baseline สำหรับ workflow; artifact มี checksum/location ผ่าน `ArtifactStore` และ metrics จาก synthetic/demo ไม่ใช่ความแม่นยำ production
- Price analysis ใช้ deterministic baseline; comparison metrics ที่แสดงใน price model คำนวณจาก synthetic history ไม่ใช่ข้อมูลจริง
- Analysis path ใช้ raw weather window เมื่อมีข้อมูลในช่วงนั้น และใช้ area summary เป็น fallback เมื่อไม่มีข้อมูล
- Full dependency audit จาก clean install พบ 19 รายการใน dev dependency tree; production-only audit (`npm audit --omit=dev --offline`) พบ 0 รายการ. ยังไม่ใช้ `npm audit fix --force` เพราะเสี่ยง major-version regression
- Dashboard ใช้ user-scoped chart read model จาก API เมื่อมีผลวิเคราะห์; historical price และ yield ใช้ observations ที่ persist/ingest แล้วเมื่อมีข้อมูลตรงเงื่อนไข มิฉะนั้น fallback เป็น synthetic และมี banner ระบุ provenance; `lib/mockData.ts` เหลือเป็น fallback สำหรับ empty dashboard เท่านั้น
- `next.config.js` ตั้ง `eslint.ignoreDuringBuilds = true`; จึงต้องเรียก lint แยกจาก build
- `npm run build` อาจแสดง non-blocking warning เรื่อง `caniuse-lite`/Browserslist data ตาม cache ของ dependency; ไม่กระทบ compile/type validity และยังไม่ได้อัปเดต dependency เพื่อหลีกเลี่ยง lockfile churn
- ยังไม่มีข้อมูลจริงจากโครงการหลวง และพื้นที่/soil/factor จริงยังเป็น configuration placeholder

## Last Test Results

- `npm install` / dependency tree: PASS; `package-lock.json` อัปเดตด้วย `pg@8.23.0`, `@types/pg@8.23.1`, `vitest@1.6.0` และ `tsx@4.19.3`
- lint: PASS — `npm run lint`
- typecheck: PASS — `npm run typecheck`
- unit/integration: PASS — `npm test`, 29 test files / 80 tests (รวม PostgreSQL repository/auth และ artifact-store boundary tests)
- integration coverage: PASS — API route tests ครอบคลุม auth ownership, cultivation, user-scoped dashboard charts, role/status boundary, JSON+CSV dataset → train → activate → rollback, ingestion/dedupe และ maintenance mode
- synthetic seed: PASS — `npm run seed:synthetic` ได้ source 1, area 3, crop 5, variety 5, factor observation 39, weather 90, price 450, yield 15
- PostgreSQL tooling guard: PASS — ไม่มี `DATABASE_URL` จึง fail closed พร้อมข้อความตั้งค่า; SQL migration/seed runtime: NOT_TESTED
- HTTP black-box smoke: PASS — auth, analysis/detail, dashboard, yield ingestion, dataset → train → activate → rollback และ maintenance guard ผ่าน; ปิด dev server แล้ว
- clean isolated install: PASS — `npm ci --ignore-scripts --offline --no-audit` ติดตั้ง 504 packages; production-only offline audit: 0 vulnerabilities
- diff check: PASS — `git diff --check`
- browser smoke: PASS — local USER complete analysis; ADMIN role-management screen; OFFICER upload/map/validate/train/metrics; unauthorized Officer → Admin error state. Activation/maintenance confirmation dialogs were not accepted during smoke; API integration covers those mutations.
- development runtime smoke: PASS — local server returned `/api/dashboard` `401` without session, `/api/varieties` `200`, and `/dashboard` `200`; server stopped after verification
- production build: PASS — `npm run build`, 31 routes generated; build intentionally skips lint per config and compiled/typechecked successfully
- PostgreSQL integration: NOT_TESTED — no configured PostgreSQL instance is available on this machine

## Architecture Summary

Next.js modular monolith: App Router UI → API route handlers → application services → pure domain services → repository/adapter interfaces. Development defaults to global in-memory repositories so route bundles share state; `AGRI_PERSISTENCE=postgres` selects all core durable repositories together. `db/` provides a lazy PostgreSQL pool, ordered transactional migration runner and idempotent synthetic seed boundary; `ArtifactStore` separates memory/local-file artifacts from a future managed object store. The frontend consumes one canonical analysis response and does not own business formulas or model selection.

## Active Models

- Yield: `yield-baseline-v1`, active; trained candidates can be activated explicitly and store a mean-yield parameter
- Price: `price-baseline-v1`, active; target type `WHOLESALE`
- Disease: `disease-rules-v1`, active; five-level configurable rule output
- Active model metadata is in-memory by default and PostgreSQL-backed when opted in; initial metrics are synthetic placeholders and must not be treated as production validation

## Mock / Real Data State

- Catalog, seed observations, baseline model artifacts and current analysis responses are synthetic unless a future source adapter marks them otherwise
- `data_origin` values are explicit: `ACTUAL`, `IMPUTED`, `SYNTHETIC`
- No Royal Project data has been supplied or loaded
- Seed target remains 5 crops and 3 configurable synthetic areas

## Important Files

- `app/` — pages and API route handlers
- `components/layout/` — shell, navbar, sidebar and theme
- `components/ui/` — reusable UI primitives
- `lib/domain/` — canonical domain types, catalog, factor registry and rules
- `lib/application/` — validation, authorization, analysis, ingestion, dataset/training and admin services
- `lib/repositories/` — repository interfaces and development adapters
- `lib/data/` — synthetic seed and external source contracts
- `lib/ml/` — deterministic prediction baselines, raw weather features and price evaluation
- `lib/application/dashboardService.ts` — user-scoped dashboard chart read model
- `lib/application/datasetParser.ts` — safe JSON/CSV parsing boundary
- `lib/domain/factorValues.ts` — typed factor/unit normalization
- `db/migrations/0001_initial.sql` — PostgreSQL schema baseline
- `db/migrations/0002_auth_sessions_and_natural_keys.sql` — durable sessions and observation uniqueness
- `db/migrations/0003_durable_snapshots_and_price_key.sql` — analysis/dataset snapshots and price uniqueness
- `db/client.ts`, `db/migrationRunner.ts`, `db/seedSynthetic.ts` — PostgreSQL connection/migration/seed boundary
- `lib/repositories/postgres*.ts` — typed PostgreSQL repository adapters selected by `AGRI_PERSISTENCE=postgres`
- `lib/repositories/artifactStore.ts` — artifact provider, checksum and path-safety boundary
- `lib/repositories/authCore.ts`, `lib/repositories/postgresAuthRepository.ts` — shared auth primitives and durable auth/session adapter
- `docs/` and `CONTEXT.md` — source of truth and glossary

## Important Commands

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run seed:synthetic
npm run db:migrate
npm run db:seed:synthetic
npm run build
```

## Decisions Since Last Update

- ใช้ branch `dev` และยังไม่ commit/push เพื่อรอคำสั่ง checkpoint จากผู้ใช้
- ใช้ modular monolith และ repository boundaries ก่อนแยก ML service
- ใช้ flexible Factor Registry และ immutable feature schema ต่อ model version
- ใช้ versioned five-level disease rules ก่อนมี labelled disease data
- ใช้ deterministic synthetic data พร้อม provenance แทนการรอข้อมูลจริง
- เปลี่ยน analysis/dashboard history ให้เป็น server/API-scoped flow เพื่อลดข้อมูลข้ามบัญชีจาก browser storage
- candidate model ต้อง activate/rollback อย่าง explicit และ prediction adapter อ่าน learned parameter ของ active model
- browser QA ใช้บัญชีทดสอบ local และไม่ยอมรับ confirmation dialog ที่จะเปลี่ยน maintenance/activate state โดยอัตโนมัติ; API tests ยืนยัน behavior แล้ว
- เพิ่ม opt-in `AGRI_PERSISTENCE=postgres` สำหรับ core repository ทั้งชุด; route handlers รองรับ async repository โดย default dev path ยังไม่ต้องมี database
- เพิ่ม `ArtifactStore` แบบ in-memory/local-filesystem และเชื่อม dataset/model artifact checksum
