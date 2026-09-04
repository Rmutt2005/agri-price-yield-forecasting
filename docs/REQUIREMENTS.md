# Requirements

## Product Goal

ระบบช่วยผู้ใช้ตัดสินใจด้านการเพาะปลูก โดยแสดงผลผลิตคาดการณ์ (`kg/rai`), ราคาที่คาดว่าจะได้ ณ ช่วงเก็บเกี่ยว, ความเสี่ยงโรคแบบ 5 ระดับ และผลวิเคราะห์เศรษฐศาสตร์ของรอบการปลูก

ข้อมูลจริงจากโครงการหลวงยังไม่พร้อม จึงต้องใช้ synthetic data เพื่อพัฒนาและทดสอบได้ โดยต้องแยก provenance ชัดเจนและห้ามอ้างความแม่นยำจากข้อมูลจำลอง

## Actors and Permissions

### USER

- register/login และแก้ไข profile
- สร้าง/แก้ไข cultivation input
- ขอ analysis/prediction
- ดู dashboard และผลย้อนหลังของตนเอง

### OFFICER

- ทำงานของ USER ได้
- ค้นหาและจัดการผู้ใช้ทั่วไป
- upload dataset, map columns, ตรวจ validation report
- train candidate model, ดู metrics, activate ตาม policy

### ADMIN

- ทำงานที่จำเป็นของ OFFICER ได้
- จัดการ User/Officer และเปลี่ยน role
- เปลี่ยน system status (`NORMAL`/`MAINTENANCE`)
- ตรวจ model/system health และควบคุมความพร้อมระบบ

สิทธิ์ต้อง enforce ที่ backend/API เสมอ ไม่พึ่งการซ่อนปุ่มใน UI

## Domain Scope

ระบบต้องรองรับ entity เหล่านี้:

`Area`, `Crop`, `Crop Variety`, `Cultivation Cycle`, `Factor Definition`, `Factor Observation`, `Weather Observation`, `Yield Observation`, `Price Observation`, `Disease Risk`, `Cost`, `Prediction`, `Training Dataset`, `Model Version`, `User`, `System Status`, `Data Source`

## Catalog Baseline

ต้อง seed เป็น configuration/entity ที่เพิ่มได้ ไม่ hardcode ให้จำกัดเฉพาะรายการนี้:

- Crops: ผักกาดหอมห่อ, กะหล่ำปลี, ผักกาดหวานคอส, เบบี้กวางตุ้งไต้หวัน, ฟักทองญี่ปุ่น
- Areas: `AREA_001`, `AREA_002`, `AREA_003`
- Initial areas มี `data_origin = SYNTHETIC` และรองรับ name, coordinates, elevation และ factor ที่เปลี่ยนภายหลัง
- Crop variety เป็น catalog entity แยกจาก Crop; analysis รองรับ variety ที่สังกัด crop และ growing-days override

## Decision Outputs

ผลวิเคราะห์หนึ่งครั้งต้องมีอย่างน้อย:

- expected harvest date
- yield: `kg_per_rai` และ total kg
- price: expected `THB/kg` ณ ช่วงเก็บเกี่ยว
- disease risk: `VERY_LOW`, `LOW`, `MEDIUM`, `HIGH`, `VERY_HIGH`
- economics: expected revenue, total cost, expected profit, break-even price/yield, profit per rai
- model/rule versions และ data quality/provenance indicators

## Flexible Factors

Factor ใหม่ต้องเพิ่มผ่าน registry/configuration ไม่ใช่เพิ่ม column ทุกครั้ง

Baseline categories: `AREA`, `SOIL`, `WEATHER`, `CROP`, `MANAGEMENT`, `OTHER`

Baseline data types: `NUMBER`, `CATEGORY`, `BOOLEAN`, `TEXT`

Weather ต้องเก็บ raw time-series observations ตาม area/date/source; feature aggregation เป็นชั้น ML/application และต้องไม่ทิ้ง raw observations

## Prediction and Modeling

- Yield canonical target: `yield_kg_per_rai`
- Total yield = predicted kg/rai × `area_rai`
- Baseline models ต้อง reproducible และมี train/validation/test split กับ seed
- Metrics อย่างน้อย: MAE, RMSE, R²
- Model version ต้องมี feature schema, training dataset, metrics, timestamp, status และ artifact location
- Model version หนึ่งรับเฉพาะ feature set ที่ประกาศไว้; factor ใหม่ต้อง train model version ใหม่
- Disease รุ่นแรกเป็น configurable rule engine เพราะยังไม่มี labelled disease data
- Price forecast ต้องคำนวณจาก crop + planting date + growing days ไปยัง expected harvest date และต้องเทียบกับ naive baseline

## Data Quality and Failure Handling

ตรวจ missing values, type, range, duplicates, unknown area/crop/factor, units, dates และ missing target ก่อน training/ingestion

ระบบต้อง handle gracefully เมื่อ source ล่ม, ไม่มี active model, dataset ผิดรูปแบบ, training fail, artifact เสีย, auth หมดอายุ หรืออยู่ใน maintenance mode

## User Experience

รักษา visual language/theme ของ prototype เดิม

Main flow: Login → Dashboard → สร้าง cultivation → เลือก area/crop → planting date/area rai → costs/factors → Analyze → decision dashboard

ทุก async boundary ต้องมี loading, error, empty/no-data และ stale-data state; development/demo ต้องแสดง synthetic-data indication ในจุดที่เหมาะสม

## Quality Gates

Feature/phase จะถือว่าเสร็จเมื่อ implementation, typecheck, lint, relevant tests, error/loading/empty states, permission checks, regression และเอกสารที่เกี่ยวข้องผ่านครบ
