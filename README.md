# Agricultural Decision Support System

ระบบสนับสนุนการตัดสินใจด้านการเพาะปลูกจาก UI prototype เดิม ปัจจุบันมี typed API/domain foundation สำหรับ development โดยใช้ synthetic data เท่านั้น ยังไม่ใช่ข้อมูลจริงจากโครงการหลวง

## Development

```bash
npm install
npm run dev
```

ตรวจสอบก่อน checkpoint:

```bash
npm run typecheck
npm run lint
npm test
npm run seed:synthetic
npm run build
```

หากต้องการ bootstrap admin สำหรับเครื่อง development ให้สร้าง `.env.local` จาก `.env.example` แล้วกำหนด `DEV_ADMIN_EMAIL` และ `DEV_ADMIN_PASSWORD` เฉพาะ local เท่านั้น ห้าม commit credentials; in-memory จะสร้างให้ตอน runtime ส่วน PostgreSQL จะสร้างให้เมื่อรัน `db:seed:synthetic` แบบ explicit

สำหรับ PostgreSQL ให้กำหนด `DATABASE_URL` ก่อน แล้วรัน migration และ seed แบบ explicit:

```bash
npm run db:migrate
npm run db:seed:synthetic
```

CLI จะอ่าน `.env` แล้ว `.env.local` ให้เอง โดยค่าที่ export ใน shell มี precedence; คำสั่ง `seed:synthetic` ปกติยังเป็น read-only สำหรับตรวจ payload/counts และจะเขียนฐานข้อมูลเฉพาะเมื่อเรียก `db:seed:synthetic` เท่านั้น

หลัง migration แล้ว หากต้องการใช้ PostgreSQL เป็น runtime ให้เปิด `AGRI_PERSISTENCE=postgres` ใน `.env.local` ระบบจะเลือก adapter แบบ durable สำหรับ auth/session, catalog, observations, cultivation, analysis, dataset, data source, model และ system status พร้อมกัน ส่วน artifact ใช้ in-memory เป็นค่าเริ่มต้น หรือเปิด `AGRI_ARTIFACT_STORAGE=filesystem` เพื่อเก็บ JSON artifact ไว้ใน `AGRI_ARTIFACT_DIR` (ค่าเริ่มต้น `.data/artifacts`)

## Current Features

- Auth/session development flow: register, login, logout, profile/password update
- Roles and server-side permissions: `USER`, `OFFICER`, `ADMIN`
- Catalog: 3 configurable synthetic areas, 5 crops, 5 crop varieties และ 27-factor registry
- Cultivation input CRUD ที่ scope ตาม user
- Analysis เดียวที่คืน expected harvest date, yield (`kg/rai`), wholesale price (`THB/kg`), disease risk 5 ระดับ และ economics/break-even
- Dashboard read model สำหรับกราฟราคาย้อนหลัง/คาดการณ์, เปรียบเทียบผลผลิต และ cost/revenue/profit โดย scope ตามผู้ใช้
- Officer flow: dataset JSON/CSV upload, column mapping/validation report, deterministic candidate training, metrics, activation และ rollback
- Officer model registry แสดง comparison candidate กับ active ตาม MAE/RMSE/R² และเตือนเมื่อผลแย่กว่าหรือสรุปไม่ได้
- Admin flow: user role management และ `NORMAL`/`MAINTENANCE` system status
- Data source registry และ normalized factor/price/weather observation ingestion
- PostgreSQL schema/migration อยู่ที่ `db/migrations/`; มี lazy pool, transaction migration runner และ core PostgreSQL repositories แบบ opt-in ใน `db/`/`lib/repositories/` พร้อม artifact store ที่เลือก in-memory หรือ local filesystem ได้

## Foundation API

```text
GET/POST /api/cultivations
GET/PATCH /api/cultivations/:id
GET /api/areas
GET /api/crops
GET /api/varieties?cropKey=<crop-key>
GET /api/factors
GET/POST /api/analysis
GET /api/analysis/:id
GET /api/dashboard
POST /api/ingestion/prices
POST /api/ingestion/weather
POST /api/ingestion/yields
POST /api/datasets
POST /api/datasets/:id/train
GET /api/models
POST /api/models/:id/activate
POST /api/models/:id/rollback
```

Analysis response ระบุ canonical units, model/rule versions และ data-quality provenance/stale state; development seed ยังเป็น `SYNTHETIC` จนกว่าจะมีข้อมูลจริง

## Project Structure

```text
app/                 # pages and App Router API routes
components/          # glassmorphism UI/layout/theme components
lib/domain/          # types, catalog, factors and pure business rules
lib/application/     # use cases and validation/authorization
lib/repositories/    # repository interfaces and dev adapters
lib/data/             # synthetic seed and external adapter contracts
lib/ml/               # deterministic prediction baselines
db/migrations/        # PostgreSQL schema baseline
docs/                 # requirements, contracts, state, tests and decisions
CONTEXT.md            # domain glossary
```

## Data and Limitations

Run `npm run seed:synthetic` to inspect reproducible seed counts. Run `npm run db:migrate` followed by `npm run db:seed:synthetic` only after configuring `DATABASE_URL` to materialize the catalog, observations and baseline models in PostgreSQL. Set `AGRI_PERSISTENCE=postgres` only after the migration has succeeded; this enables all core durable repositories while keeping the API contracts unchanged. Set `AGRI_ARTIFACT_STORAGE=filesystem` for restart-safe local dataset/model artifacts; a managed object-storage provider is still required for production-scale deployment. External MOC, NABC/OAE, Talad Thai and weather adapters are contract-only until source credentials/specifications are available. The model trainer is a mean-yield baseline; metrics from synthetic data must not be interpreted as production accuracy.

รายละเอียดต่อเนื่องอยู่ใน [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md), [`docs/API_SPEC.md`](docs/API_SPEC.md) และเอกสารใน `docs/`
