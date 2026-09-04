# Agricultural Decision Support System

ศัพท์กลางของระบบสนับสนุนการตัดสินใจด้านการเพาะปลูก เพื่อให้ domain, API, data และ UI ใช้ความหมายเดียวกัน

## Agricultural Domain

**Area**:
พื้นที่ศึกษา/แปลงปลูกที่มีตำแหน่งและสภาพแวดล้อมอ้างอิง
_Avoid_: Site, location อย่างเดียว

**Crop**:
ชนิดพืชที่เพาะปลูก เช่น ผักกาดหอมห่อหรือกะหล่ำปลี
_Avoid_: Product, commodity เมื่อหมายถึงพืชที่ปลูก

**Crop Variety**:
สายพันธุ์ย่อยของ Crop ที่อาจมีรอบการปลูกแตกต่างกัน
_Avoid_: Crop type

**Cultivation Cycle**:
รอบการเพาะปลูกหนึ่งรอบ ตั้งแต่วันปลูกจนถึงการเก็บเกี่ยวของผู้ใช้ใน Area ที่เลือก
_Avoid_: Project, batch เมื่อหมายถึงรอบการปลูก

**Factor**:
ปัจจัยเชิงพื้นที่ ดิน อากาศ พืช หรือการจัดการที่ใช้บันทึกหรือสร้างคุณลักษณะสำหรับการวิเคราะห์
_Avoid_: Metric เมื่อหมายถึง input factor

**Observation**:
ค่าที่สังเกตได้ ณ พื้นที่/รอบการปลูก/วันเวลา พร้อมแหล่งที่มาและ provenance
_Avoid_: Prediction, estimate

## Decision Outputs

**Yield**:
ผลผลิตที่คาดการณ์หรือสังเกตได้ โดยหน่วยกลางคือกิโลกรัมต่อไร่ (`kg/rai`)
_Avoid_: Volume เมื่อหมายถึงผลผลิต

**Price**:
ราคาของ Crop ณ วันและตลาดที่ระบุ โดยหน่วยกลางคือบาทต่อกิโลกรัม (`THB/kg`)
_Avoid_: Revenue เมื่อหมายถึงราคาต่อหน่วย

**Disease Risk**:
ระดับความเสี่ยงโรคพืชแบบภาพรวม 5 ระดับ โดยไม่ระบุชื่อโรค
_Avoid_: Disease diagnosis, confirmed disease

**Economics**:
ผลคำนวณรายได้ ต้นทุน กำไร และค่า break-even จาก Yield, Price, พื้นที่ และต้นทุน
_Avoid_: Financial result เมื่อหมายถึงผลคำนวณของรอบปลูก

**Prediction**:
ค่าประมาณจาก model หรือ rule ที่ต้องระบุ version, feature schema, เวลา และหน่วย
_Avoid_: Actual, Observation

## Data and Governance

**Data Origin**:
provenance ของข้อมูล: `ACTUAL`, `IMPUTED` หรือ `SYNTHETIC`
_Avoid_: Mock เมื่อหมายถึงข้อมูลที่ถูกสร้างเพื่อ development โดยเฉพาะ

**Training Dataset**:
ชุดข้อมูลที่ผ่านการตรวจ schema และคุณภาพ เพื่อใช้ฝึก/ประเมิน model version
_Avoid_: Upload file เมื่อชุดข้อมูลถูกสร้างเป็น version แล้ว

**Model Version**:
รุ่นของ model หรือ risk rule ที่มี target, feature schema, metrics, สถานะ และประวัติการใช้งาน
_Avoid_: Algorithm เมื่อหมายถึงรุ่นที่ deploy ได้

**Data Source**:
แหล่งกำเนิดข้อมูลที่มีชนิด ลำดับความสำคัญ สถานะ และประวัติการทำงาน
_Avoid_: Provider เมื่อหมายถึง registry record ทั้งหมด

**User Role**:
ขอบเขตสิทธิ์ของผู้ใช้: `USER`, `OFFICER` หรือ `ADMIN`
_Avoid_: Permission เมื่อหมายถึงตัวบุคคล/ระดับสิทธิ์รวม

**System Status**:
สถานะพร้อมใช้งานของระบบ: `NORMAL` หรือ `MAINTENANCE`
_Avoid_: Health check เมื่อหมายถึงโหมดการให้บริการ
