# HILLKOFF Coffee Machine Knowledge Center (HKMC)

ระบบฐานข้อมูลกลางสำหรับเครื่องจักรและอุปกรณ์ทั้งหมดของ HILLKOFF
เพื่อให้ทีมช่างค้นหาและศึกษาข้อมูลเครื่องจักรได้อย่างรวดเร็ว

**ไม่ใช่**ระบบซ่อม / **ไม่ใช่**ระบบสต๊อก / **ไม่ใช่**ระบบขาย / **ไม่มี**ระบบ Login

> เอกสารนี้แก้ไขทั้งหมดให้ตรงกับ Flow ที่กำหนดไว้ในเอกสาร Concept ล่าสุด — โครงสร้างเดิม
> ของ Sprint 1-3 (สถานะเครื่อง, ฟิลด์ "ช่างผู้ประเมิน/วันที่ประเมิน", แท็บ Assessment,
> Spec builder แบบอิสระ) ถูกแทนที่ทั้งหมดตามรายละเอียดด้านล่าง

## หน้าที่ของระบบ (5 อย่างเท่านั้น)

1. เพิ่มเครื่องใหม่ → 2. บันทึกข้อมูลเครื่อง → 3. บันทึกข้อมูลภายในเครื่อง →
4. บันทึกรายการอะไหล่ภายในเครื่อง → 5. ค้นหาข้อมูล

## โครงสร้างระบบ

```
Dashboard
├── Search
├── Coffee Machine / Grinder / Tea Machine / Ice Machine / Other
├── Add Machine
└── HILLKOFFBOT AI
        │
        ▼
   Machine List → Machine Detail
                       ├── Overview
                       ├── Specification
                       ├── Internal Structure
                       ├── Parts List
                       ├── Gallery
                       ├── Documents
                       └── AI Assistant
```

**ไม่มี**: งานซ่อม, สต๊อก, รายงาน, Dashboard KPI, จำนวนเครื่องรวมบนหน้าแรก, สถานะ
"ต้องตรวจสอบ"

## หน้า Dashboard

- Sidebar: หมวดหมู่ 5 อย่าง (Coffee Machine / Grinder / Tea Machine / Ice Machine /
  Other), เพิ่มเครื่องจักร, HILLKOFFBOT AI
- Search bar (พิมพ์ค้นหา หรือกด `/`)
- Machine List แสดงเป็นการ์ด: รูปเครื่อง + ชื่อเครื่อง เท่านั้น (ไม่มี badge สถานะ)
- คลิกการ์ด → เข้า Machine Detail

## หน้า Machine Detail (หัวใจของระบบ)

Header: รูปปก, ชื่อเครื่อง, รหัสเครื่อง, หมวดหมู่, ยี่ห้อ, รุ่น, ประเภท

7 แท็บ:
| แท็บ | เนื้อหา |
|---|---|
| **Overview** | รูปปก, ชื่อเครื่อง, ยี่ห้อ, รุ่น, ประเภท, รายละเอียด (ไม่มี Serial / ประเทศ / ปีผลิต / ผู้จำหน่าย) |
| **Specification** | Voltage, Power, Frequency, Coffee Boiler, Steam Boiler, Pump, Group, PID, Display, Dimension, Weight, Water Tank |
| **Internal Structure** | รูปประกอบ: Cover, Internal, Boiler, Pump, PCB, Flowmeter, Valve, Relay, Sensor, Other — เป็นเพียงรูป ไม่มีระบบซ่อม |
| **Parts List** | ตาราง รูป / ชื่ออะไหล่ / ยี่ห้อ / รุ่น / หมายเหตุ — คลิกแถวเพื่อดู Part Detail (ใช้กับเครื่องไหนบ้าง) ไม่มีจำนวนคงเหลือ/ราคา/สต๊อก |
| **Gallery** | Cover, Front, Back, Left, Right, Top, Internal, Others |
| **Documents** | User Manual, Service Manual, Parts List, Wiring Diagram, Firmware, Brochure |
| **AI Assistant** | ถาม HILLKOFFBOT เกี่ยวกับเครื่องนี้โดยเฉพาะ |

## หน้า Add Machine — Wizard 6 ขั้นตอน

1. **ข้อมูลพื้นฐาน** — เลือกหมวดหมู่, ชื่อเครื่อง, ยี่ห้อ, รุ่น, ประเภท, รายละเอียด
2. **Specification** — กรอกฟิลด์คงที่ 12 รายการ (ไม่ระบุ = N/A)
3. **Upload Images** — รูปหน้าปก (1 รูป) + รูปแกลเลอรี (Front/Back/Left/Right/Top/Internal/Others)
4. **Internal Images** — รูปตามกลุ่ม Cover/Internal/Boiler/Pump/PCB/Flowmeter/Valve/Relay/Sensor/Other
5. **Parts List** — เพิ่ม/ลบแถวอะไหล่ได้อิสระ (รูป, ชื่อ, ยี่ห้อ, รุ่น, หมายเหตุ)
6. **Documents** — แนบไฟล์เอกสารตาม 6 ประเภท พร้อมสรุปข้อมูล + รหัสเครื่องที่ระบบสร้างให้
   → กด **บันทึกเครื่องจักร** → หน้าสำเร็จ (ไปที่ Dashboard / ดูรายละเอียด / เพิ่มเครื่องอีกเครื่อง)

เชื่อมกับ Google Sheet / Drive จริงแล้วผ่าน Apps Script Web App (`js/api-client.js`
→ `appscript/Code.gs`) — รูปภาพและเอกสารอัปโหลดขึ้น Drive ทันทีที่เลือกไฟล์ ข้อมูล
เครื่องจักรบันทึกลง Sheet เมื่อกด "บันทึกเครื่องจักร" ในขั้นตอนสุดท้าย ดูรายละเอียดการ
ตั้งค่าที่ `docs/BACKEND-INTEGRATION.md`

## HILLKOFFBOT AI

ตอบคำถามจากฐานข้อมูลเท่านั้น เช่น "Rocket R9 ใช้ Pump อะไร", "La Marzocco GB5 ใช้
Boiler กี่ลิตร", "ขอดู Wiring Diagram" — **ไม่วิเคราะห์งานซ่อม**

เข้าถึงได้ 2 ทาง: หน้าเต็ม (`html/ai-assistant.html`) และแท็บ AI Assistant ภายใน
Machine Detail ของแต่ละเครื่อง ทั้งสองใช้ตัวจับคู่คำถามชุดเดียวกัน
(`js/ai-bot.js`) ซึ่งเป็นการจำลองแบบฝั่ง client เท่านั้น (Sprint 5 จะเปลี่ยนเป็น AI
backend จริง)

## Google Sheet (แผน Sprint 6)

5 ตาราง: Machine, Specification, Parts, Images, Documents

## Google Drive (แผน Sprint 6)

```
<Machine Name>
├── Cover
├── Gallery
├── Internal
├── Parts
└── Documents
```

## โครงสร้างโปรเจกต์

```
HILLKOFF-WEB/
├── appscript/
│   └── Code.gs               Apps Script Web App backend (doGet/doPost, Sheet + Drive)
├── html/
│   ├── index.html           Dashboard
│   ├── machine-detail.html  Machine Detail (7 tabs)
│   ├── add-machine.html     Add Machine — 6-step wizard
│   └── ai-assistant.html    HILLKOFFBOT AI (standalone page)
├── css/
│   ├── style.css            HK UI Kit: tokens, reset, shell, buttons, badges, cards
│   ├── dashboard.css        Sidebar/chips/grid/machine card
│   ├── detail.css           Header, tabs, spec table, image groups, parts table, AI panel
│   └── wizard.css           Stepper, form controls, category picker, dropzones, parts rows
├── js/
│   ├── utils.js             Icons, toast, sidebar toggle, file reading, formatting
│   ├── api-client.js        fetch wrapper for the Apps Script Web App
│   ├── machines-data.js     ★ Shared data layer (category meta, spec/image/doc schema, seed data, live API cache)
│   ├── ai-bot.js            Shared HILLKOFFBOT keyword matcher (used by both AI surfaces)
│   ├── dashboard.js         Category filter, search, grid render
│   ├── machine-detail.js    Header + 7 tab panels + part modal
│   ├── add-machine.js       6-step wizard state machine
│   └── ai-assistant.js      Standalone AI page
├── assets/
├── README.md
├── CHANGELOG.md
└── VERSION.md
```

## วิธีเปิดใช้งาน

1. เปิดโฟลเดอร์นี้ใน VS Code
2. ติดตั้งส่วนขยาย **Live Server** (ผู้พัฒนา: Ritwick Dey) หากยังไม่มี
3. คลิกขวาที่ `html/index.html` → **Open with Live Server**

## HILLKOFF UI KIT — Design Tokens

| Token | ค่า | ใช้สำหรับ |
|---|---|---|
| `--hk-bg` | `#0F0D0B` | พื้นหลังหลัก |
| `--hk-surface` | `#1B1714` | การ์ด/แผง |
| `--hk-gold` | `#F2B705` | สีหลัก (CI HILLKOFF) |
| `--hk-text` | `#F3EFE7` | ตัวอักษรหลัก |
| `--hk-success` | `#4CAF6D` | ยืนยันสำเร็จ |
| `--hk-warn` | `#E5A93E` | แจ้งเตือน |
| `--hk-danger` | `#E5484D` | ข้อผิดพลาด |

Typography: **Sora** (หัวข้อ), **Inter** (เนื้อหา), **IBM Plex Mono** (รหัสเครื่อง/ตัวเลข)

Naming standard: `hk-<component>`, `hk-<component>__<part>`, `is-<state>`

## Roadmap

| Sprint | เนื้อหา |
|---|---|
| 1-3 (rebuilt) | Dashboard, Machine Detail (7 tabs), Add Machine (6-step wizard) ✅ |
| 4 | Parts Database (Interactive Parts, Exploded View) |
| 5 | HILLKOFFBOT AI (เชื่อม backend จริง) |
| 6 | เชื่อม Google Sheet / Google Drive / Apps Script |

## หมายเหตุ

Frontend เป็น **HTML/CSS/JS ล้วน** (ไม่มี framework/build step) เชื่อมต่อกับ
Google Sheet / Drive ผ่าน Apps Script Web App เดียว (`js/api-client.js`) และ
**ไม่มีระบบ Login** ตามที่ระบุในเอกสาร Concept
#   - H I L L K O F F - K n o w l e d g e - C e n t e r  
 