การใช้งาน
หน้าแรก (Landing Page): แสดงภาพรวมระบบและปุ่มเปลี่ยนธีม
เข้าสู่ระบบ/สมัครสมาชิก: ระบบ authentication พื้นฐาน
แดชบอร์ด: ดูข้อมูลสรุปผลผลิต ราคา ความเสี่ยงโรค และกราฟพยากรณ์
โปรไฟล์: จัดการข้อมูลส่วนตัวและเปลี่ยนรหัสผ่าน
หน้าป้อนข้อมูล: สำหรับเพิ่มข้อมูลการเกษตร (UI เท่านั้น)
การพัฒนา
Frontend: Next.js 14 + TypeScript + Tailwind CSS
UI Components: Custom components ด้วย glassmorphism design
Charts: Recharts สำหรับแสดงข้อมูลกราฟิก
Theme: Dark/Light mode ด้วย CSS variables
Icons: Lucide React
Fonts: Google Fonts "Prompt" รองรับภาษาไทย
โครงสร้างโฟลเดอร์
app/
├── dashboard/          # หน้าหลักแดชบอร์ด
├── login/             # เข้าสู่ระบบ
├── register/          # สมัครสมาชิก
├── profile/           # จัดการโปรไฟล์
├── input/             # ป้อนข้อมูล
├── layout.tsx         # Layout หลัก
└── globals.css        # Global styles
 
components/
├── layout/            # Components การจัดวาง
│   ├── Navbar.tsx     # Navigation bar
│   ├── Sidebar.tsx    # เมนูด้านข้าง
│   ├── DashboardShell.tsx
│   └── ThemeClient.tsx
└── ui/                # UI components
    ├── Button.tsx
    ├── Card.tsx
    ├── FormInput.tsx
    └── ChartCard.tsx
 
lib/
└── mockData.ts        # ข้อมูลจำลอง
การปรับแต่งธีม
ระบบรองรับการปรับแต่งสีผ่าน CSS custom properties ใน globals.css:

css
:root {
  --chart-axis: rgba(15,23,42,0.72);
  --chart-legend: rgba(15,23,42,0.72);
  /* ... */
}
การ deploy
bash
npm run build
npm start
ฟีเจอร์ในอนาคต
Backend API integration
Database connection
Real-time data updates
Export reports
Multi-language support
User roles and permissions
