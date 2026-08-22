/* =========================================================
   HILLKOFF · machines-data.js
   Central data layer. Single source of truth for all pages.
   Structure here mirrors what Sprint 6 will fetch from the
   Google Sheet (5 tables: Machine / Specification / Parts /
   Images / Documents) — only the "how it's fetched" changes
   later, not the shape.
   ========================================================= */

const HK_CATEGORIES = {
  coffee:  { label: 'Coffee Machine', prefix: 'CM', icon: 'coffee' },
  grinder: { label: 'Grinder',        prefix: 'GR', icon: 'grinder' },
  tea:     { label: 'Tea Machine',    prefix: 'TM', icon: 'tea' },
  ice:     { label: 'Ice Machine',    prefix: 'IM', icon: 'ice' },
  other:   { label: 'Other',          prefix: 'OT', icon: 'other' },
};

const HK_SPEC_FIELDS = [
  { key: 'voltage',     label: 'Voltage' },
  { key: 'power',       label: 'Power' },
  { key: 'frequency',   label: 'Frequency' },
  { key: 'coffeeBoiler',label: 'Coffee Boiler' },
  { key: 'steamBoiler', label: 'Steam Boiler' },
  { key: 'pump',        label: 'Pump' },
  { key: 'group',       label: 'Group' },
  { key: 'pid',         label: 'PID' },
  { key: 'display',     label: 'Display' },
  { key: 'dimension',   label: 'Dimension' },
  { key: 'weight',      label: 'Weight' },
  { key: 'waterTank',   label: 'Water Tank' },
];

const HK_INTERNAL_GROUPS = [
  { key: 'cover',      label: 'Cover' },
  { key: 'internal',   label: 'Internal' },
  { key: 'boiler',     label: 'Boiler' },
  { key: 'pump',       label: 'Pump' },
  { key: 'pcb',        label: 'PCB' },
  { key: 'flowmeter',  label: 'Flowmeter' },
  { key: 'valve',      label: 'Valve' },
  { key: 'relay',      label: 'Relay' },
  { key: 'sensor',     label: 'Sensor' },
  { key: 'other',      label: 'Other' },
];

const HK_GALLERY_GROUPS = [
  { key: 'cover',    label: 'Cover' },
  { key: 'front',    label: 'Front' },
  { key: 'back',     label: 'Back' },
  { key: 'left',     label: 'Left' },
  { key: 'right',    label: 'Right' },
  { key: 'top',      label: 'Top' },
  { key: 'internal', label: 'Internal' },
  { key: 'others',   label: 'Others' },
];

const HK_DOCUMENT_TYPES = [
  { key: 'userManual',    label: 'User Manual' },
  { key: 'serviceManual', label: 'Service Manual' },
  { key: 'partsList',     label: 'Parts List' },
  { key: 'wiringDiagram', label: 'Wiring Diagram' },
  { key: 'firmware',      label: 'Firmware' },
  { key: 'brochure',      label: 'Brochure' },
];

/* ---------- Machine evaluation / approval-to-sell workflow ----------
   Lives inside the Internal Structure tab, underneath the existing
   image groups. Five departments each sign off with a typed name +
   date (no image/e-signature), then an MD/executive gives the final
   "approved to sell" sign-off. Once the MD has signed, the whole
   section locks — no more edits to any signature, by anyone — until
   someone with backend access clears mdApproval directly in the Sheet.
   The MD button itself only becomes available once every department
   has reached its required signer count. */
const HK_APPROVAL_DEPARTMENTS = [
  { key: 'technicianDept',  label: 'แผนกช่าง',        required: 2 },
  { key: 'technicianAdmin', label: 'ธุรการช่าง',        required: 1 },
  { key: 'partsAdmin',      label: 'ธุรการอะไหล่',      required: 1 },
  { key: 'sales',           label: 'ทีมขาย',           required: 2, atLeast: true,
    extraField: { key: 'subDept', label: 'แผนก/ทีมย่อย' } },
  { key: 'purchasing',      label: 'แผนกจัดซื้อ',       required: 1 },
];
const HK_MD_APPROVAL_LABEL = 'ผู้อนุมัตินำเข้าขาย (ผู้บริหาร / MD)';

function hkEmptyApproval(){
  const departments = {};
  HK_APPROVAL_DEPARTMENTS.forEach(d => departments[d.key] = []);
  return { departments, mdApproval: null };
}

// True once every department has met its minimum signer count.
function hkApprovalDepartmentsComplete(approval){
  if(!approval) return false;
  return HK_APPROVAL_DEPARTMENTS.every(d => (approval.departments[d.key] || []).length >= d.required);
}

// 'approved' | 'pending' | 'rejected' — drives the Dashboard badge.
// Legacy machines approved before the reject/decision field existed have
// mdApproval set but no `decision` — treated as 'approved' for compatibility.
function hkApprovalStatus(machine){
  const md = machine?.approval?.mdApproval;
  if(!md) return 'pending';
  return md.decision === 'rejected' ? 'rejected' : 'approved';
}

// Once the MD has *approved* (not rejected) the entire section (every
// department + the MD block) is locked and read-only. A rejection is not
// final — departments can keep editing and the MD can revisit later.
function hkIsApprovalLocked(machine){
  const md = machine?.approval?.mdApproval;
  return !!md && md.decision !== 'rejected';
}

function hkEmptySpec(){
  const s = {};
  HK_SPEC_FIELDS.forEach(f => s[f.key] = '');
  return s;
}
function hkEmptyGroupedImages(groups){
  const g = {};
  groups.forEach(x => g[x.key] = []);
  return g;
}
function hkEmptyDocuments(){
  const d = {};
  HK_DOCUMENT_TYPES.forEach(t => d[t.key] = null);
  return d;
}

/* ---------- Seed data ---------- */
const HK_MACHINES_SEED = [
  {
    id: 'CM-001', category: 'coffee',
    name: 'Rocket R9', brand: 'Rocket Espresso', model: 'R9 ONE', type: 'เครื่องชงกาแฟ 2 กรุ๊ป', bcCode: '',
    description: 'เครื่องชงกาแฟ 2 กรุ๊ป ระบบ Dual Boiler พร้อม PID ควบคุมอุณหภูมิ เหมาะสำหรับร้านที่ต้องการความคงที่ของอุณหภูมิสูง',
    internalNotes: '',
    coverImage: null,
    specification: { ...hkEmptySpec(), voltage: '220V', power: '2600W', frequency: '50Hz', coffeeBoiler: '2L', steamBoiler: '2.7L', pump: 'Rotary Pump', group: '2 Group', pid: 'Dual PID', display: 'TFT Display', dimension: '75 x 55 x 50 cm', weight: '48 kg', waterTank: '3L (Direct plumb-in ได้)' },
    internalImages: hkEmptyGroupedImages(HK_INTERNAL_GROUPS),
    gallery: hkEmptyGroupedImages(HK_GALLERY_GROUPS),
    documents: hkEmptyDocuments(),
    approval: hkEmptyApproval(),
    parts: [
      { id: 'PT-0001', image: null, name: 'Rotary Pump', brand: 'Fluid-o-Tech', model: 'PA204', note: 'Pump หลัก' },
      { id: 'PT-0002', image: null, name: 'Steam Boiler', brand: '-', model: '3L', note: 'Boiler ไอน้ำ' },
      { id: 'PT-0003', image: null, name: 'PCB Main', brand: '-', model: 'PCB-01', note: 'Main Board' },
    ],
    createdAt: '2025-01-10T00:00:00.000Z',
  },
  {
    id: 'CM-002', category: 'coffee',
    name: 'Rocket Boxer', brand: 'Rocket Espresso', model: 'Boxer', type: 'เครื่องชงกาแฟ 1 กรุ๊ป', bcCode: '',
    description: 'เครื่องชงกาแฟ 1 กรุ๊ป ขนาดกะทัดรัด เหมาะกับร้านพื้นที่จำกัดหรือใช้เป็นเครื่องสำรอง',
    internalNotes: '',
    coverImage: null,
    specification: { ...hkEmptySpec(), voltage: '220V', power: '1500W', frequency: '50Hz', coffeeBoiler: '1L', steamBoiler: '1.8L', pump: 'Rotary Pump', group: '1 Group', pid: 'Single PID', display: 'Analog Gauge', dimension: '48 x 50 x 42 cm', weight: '32 kg', waterTank: '2.2L' },
    internalImages: hkEmptyGroupedImages(HK_INTERNAL_GROUPS),
    gallery: hkEmptyGroupedImages(HK_GALLERY_GROUPS),
    documents: hkEmptyDocuments(),
    approval: hkEmptyApproval(),
    parts: [
      { id: 'PT-0004', image: null, name: 'Rotary Pump', brand: 'Fluid-o-Tech', model: 'PA204', note: 'Pump หลัก' },
    ],
    createdAt: '2025-01-12T00:00:00.000Z',
  },
  {
    id: 'CM-003', category: 'coffee',
    name: 'La Marzocco GB5', brand: 'La Marzocco', model: 'GB5', type: 'เครื่องชงกาแฟ 3 กรุ๊ป', bcCode: '',
    description: 'เครื่องชงกาแฟระดับพรีเมียม 3 กรุ๊ป ระบบ Saturated Group พร้อม Boiler ขนาดใหญ่รองรับร้านที่มีปริมาณขายสูง',
    internalNotes: '',
    coverImage: null,
    specification: { ...hkEmptySpec(), voltage: '380V (3 Phase)', power: '6000W', frequency: '50Hz', coffeeBoiler: '3 x 1.4L', steamBoiler: '11L', pump: 'Rotary Pump', group: '3 Group Saturated', pid: 'Digital PID ทุกหัว', display: 'LCD Display', dimension: '96 x 58 x 54 cm', weight: '115 kg', waterTank: 'Direct plumb-in' },
    internalImages: hkEmptyGroupedImages(HK_INTERNAL_GROUPS),
    gallery: hkEmptyGroupedImages(HK_GALLERY_GROUPS),
    documents: hkEmptyDocuments(),
    approval: hkEmptyApproval(),
    parts: [
      { id: 'PT-0005', image: null, name: 'PCB Main', brand: '-', model: 'PCB-01', note: 'Main Board' },
    ],
    createdAt: '2025-01-15T00:00:00.000Z',
  },
  {
    id: 'CM-004', category: 'coffee',
    name: 'Nuova Aurelia', brand: 'Nuova Simonelli', model: 'Aurelia', type: 'เครื่องชงกาแฟ 2 กรุ๊ป', bcCode: '',
    description: 'เครื่องชงกาแฟ 2 กรุ๊ป ระบบ Volumetric ตวงปริมาณน้ำอัตโนมัติ',
    internalNotes: '',
    coverImage: null,
    specification: { ...hkEmptySpec(), voltage: '220V', power: '3200W', frequency: '50Hz', coffeeBoiler: '2 x 1L', steamBoiler: '5L', pump: 'Rotary Pump', group: '2 Group Volumetric', pid: 'PID Boiler เดียว', display: 'LED Display', dimension: '80 x 56 x 52 cm', weight: '62 kg', waterTank: '4L / Direct plumb-in' },
    internalImages: hkEmptyGroupedImages(HK_INTERNAL_GROUPS),
    gallery: hkEmptyGroupedImages(HK_GALLERY_GROUPS),
    documents: hkEmptyDocuments(),
    approval: hkEmptyApproval(),
    parts: [
      { id: 'PT-0006', image: null, name: 'Rotary Pump', brand: 'Fluid-o-Tech', model: 'PA204', note: 'Pump หลัก' },
    ],
    createdAt: '2025-01-18T00:00:00.000Z',
  },
  {
    id: 'CM-005', category: 'coffee',
    name: 'Casadio Undici', brand: 'Casadio', model: 'Undici A/E', type: 'เครื่องชงกาแฟ 2 กรุ๊ป', bcCode: '',
    description: 'เครื่องชงกาแฟ 2 กรุ๊ป ตัวถังสแตนเลส เหมาะกับการใช้งานหนักต่อเนื่อง',
    internalNotes: '',
    coverImage: null,
    specification: { ...hkEmptySpec(), voltage: '220V', power: '3000W', frequency: '50Hz', coffeeBoiler: '2 x 0.9L', steamBoiler: '5L', pump: 'Rotary Pump', group: '2 Group', pid: '-', display: 'Analog Gauge', dimension: '78 x 55 x 50 cm', weight: '58 kg', waterTank: '3L / Direct plumb-in' },
    internalImages: hkEmptyGroupedImages(HK_INTERNAL_GROUPS),
    gallery: hkEmptyGroupedImages(HK_GALLERY_GROUPS),
    documents: hkEmptyDocuments(),
    approval: hkEmptyApproval(),
    parts: [],
    createdAt: '2025-01-20T00:00:00.000Z',
  },
  {
    id: 'GR-001', category: 'grinder',
    name: 'Mazzer Robur', brand: 'Mazzer', model: 'Robur Electronic', type: 'เครื่องบดกาแฟ', bcCode: '',
    description: 'เครื่องบดกาแฟใบมีดแบน 71mm สำหรับร้านที่มีปริมาณบดสูง',
    internalNotes: '',
    coverImage: null,
    specification: { ...hkEmptySpec(), voltage: '220V', power: '650W', frequency: '50Hz', dimension: '22 x 42 x 60 cm', weight: '18 kg' },
    internalImages: hkEmptyGroupedImages(HK_INTERNAL_GROUPS),
    gallery: hkEmptyGroupedImages(HK_GALLERY_GROUPS),
    documents: hkEmptyDocuments(),
    approval: hkEmptyApproval(),
    parts: [],
    createdAt: '2025-01-22T00:00:00.000Z',
  },
  {
    id: 'TM-001', category: 'tea',
    name: 'Fuji Tea Machine', brand: 'Fuji', model: 'FJ-1200', type: 'เครื่องชงชา', bcCode: '',
    description: 'เครื่องชงชาระบบผสมอัตโนมัติ ปรับความหวาน-ความเข้มได้',
    internalNotes: '',
    coverImage: null,
    specification: { ...hkEmptySpec(), voltage: '220V', power: '1200W', frequency: '50Hz', dimension: '40 x 50 x 70 cm', weight: '35 kg' },
    internalImages: hkEmptyGroupedImages(HK_INTERNAL_GROUPS),
    gallery: hkEmptyGroupedImages(HK_GALLERY_GROUPS),
    documents: hkEmptyDocuments(),
    approval: hkEmptyApproval(),
    parts: [],
    createdAt: '2025-01-24T00:00:00.000Z',
  },
  {
    id: 'IM-001', category: 'ice',
    name: 'Hoshizaki IM-100', brand: 'Hoshizaki', model: 'IM-100', type: 'เครื่องทำน้ำแข็ง', bcCode: '',
    description: 'เครื่องทำน้ำแข็งก้อนเล็กระบบ Air-cooled กำลังผลิต 100 กก./วัน',
    internalNotes: '',
    coverImage: null,
    specification: { ...hkEmptySpec(), voltage: '220V', power: '900W', frequency: '50Hz', dimension: '54 x 60 x 80 cm', weight: '52 kg' },
    internalImages: hkEmptyGroupedImages(HK_INTERNAL_GROUPS),
    gallery: hkEmptyGroupedImages(HK_GALLERY_GROUPS),
    documents: hkEmptyDocuments(),
    approval: hkEmptyApproval(),
    parts: [],
    createdAt: '2025-01-26T00:00:00.000Z',
  },
];

/* ---------- Live data cache (backed by the Apps Script Web App) ----------
   hkBootstrapMachines() fetches the full list once (call it before the
   first render on every page). Every other function below just reads
   this in-memory cache, so none of the existing sync call sites in
   dashboard.js / machine-detail.js needed to change. If the fetch fails
   (offline, URL not set yet, etc.) it falls back to the local seed data
   so the UI still has something to show instead of breaking. */
let HK_MACHINES_CACHE = [];
let HK_LAST_LOAD_ERROR = null;
let HK_LAST_LOAD_USED_CACHE = false;

// sessionStorage key holding the last successful real fetch — used as a
// fallback if a later fetch fails, so a transient blip shows slightly
// stale real data instead of jumping all the way to generic demo seed
// data (which used to be the only fallback).
const HK_MACHINES_CACHE_KEY = 'hk_machines_cache_v1';

async function hkBootstrapMachines(){
  try{
    const data = await hkApiListMachines();
    if(!Array.isArray(data)) throw new Error(data && data.error ? data.error : 'Unexpected response shape');
    HK_MACHINES_CACHE = data;
    HK_LAST_LOAD_ERROR = null;
    HK_LAST_LOAD_USED_CACHE = false;
    try{ sessionStorage.setItem(HK_MACHINES_CACHE_KEY, JSON.stringify(data)); }catch(e){ /* storage full/unavailable — not worth failing over */ }
  }catch(err){
    let lastGood = null;
    try{ lastGood = JSON.parse(sessionStorage.getItem(HK_MACHINES_CACHE_KEY) || 'null'); }catch(e){ /* ignore corrupt cache */ }
    if(Array.isArray(lastGood) && lastGood.length){
      HK_MACHINES_CACHE = lastGood;
      HK_LAST_LOAD_USED_CACHE = true;
      console.error('Failed to load machines from the backend, falling back to the last successful load this session:', err);
    }else{
      HK_MACHINES_CACHE = HK_MACHINES_SEED;
      HK_LAST_LOAD_USED_CACHE = false;
      console.error('Failed to load machines from the backend, falling back to seed data:', err);
    }
    HK_LAST_LOAD_ERROR = err;
  }
  return HK_MACHINES_CACHE;
}

// Shared toast copy for the 4 pages that show a fallback warning — says
// something more accurate than "showing demo data" when we actually
// managed to fall back to real (if slightly stale) data instead.
function hkLoadErrorToastMessage(){
  return HK_LAST_LOAD_USED_CACHE
    ? 'โหลดข้อมูลล่าสุดไม่สำเร็จ กำลังแสดงข้อมูลที่โหลดไว้ล่าสุดแทน'
    : 'โหลดข้อมูลจากฐานข้อมูลไม่สำเร็จ กำลังแสดงข้อมูลตัวอย่างแทน';
}

/* ---------- Public query API ---------- */
function getAllMachines(){
  return HK_MACHINES_CACHE;
}
function getMachineById(id){
  return getAllMachines().find(m => m.id === id) || null;
}
function getMachinesByCategory(category){
  if(!category || category === 'all') return getAllMachines();
  return getAllMachines().filter(m => m.category === category);
}
function searchMachines(query, category){
  const base = getMachinesByCategory(category);
  const q = (query || '').trim().toLowerCase();
  if(!q) return base;
  return base.filter(m =>
    [m.name, m.brand, m.model, m.type, m.id, m.bcCode].filter(Boolean).some(v => v.toLowerCase().includes(q))
  );
}
function nextIdForCategory(category){
  const meta = HK_CATEGORIES[category];
  if(!meta) return null;
  const nums = getAllMachines()
    .filter(m => m.category === category)
    .map(m => parseInt((m.id || '').split('-')[1], 10))
    .filter(n => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${meta.prefix}-${String(next).padStart(3, '0')}`;
}
// payload shape: { category, name, brand, model, type, description,
//   coverImageUrl, specification, parts: [...], images: [...], documents: [...] }
// (see docs/BACKEND-INTEGRATION.md for the exact field names). Saves to the
// real backend, then refreshes the local cache so the new machine shows up
// immediately without a page reload.
async function addMachine(payload){
  const result = await hkApiCreateMachine(payload);
  if(result && result.error) throw new Error(result.error);
  await hkBootstrapMachines();
  return result;
}
/* ---------- Approval workflow mutations ----------
   These mutate the in-memory cache immediately (so the UI feels
   instant) and then try to persist to the backend. If the backend
   doesn't yet support the `updateApproval` action (see
   docs/BACKEND-INTEGRATION.md for the required Code.gs addition),
   the change still sticks locally for this session and a warning is
   surfaced via HK_LAST_APPROVAL_SAVE_ERROR so the caller can toast it. */
let HK_LAST_APPROVAL_SAVE_ERROR = null;

async function hkPersistApproval(machine){
  try{
    const result = await hkApiUpdateApproval(machine.id, machine.approval);
    if(result && result.error) throw new Error(result.error);
    HK_LAST_APPROVAL_SAVE_ERROR = null;
  }catch(err){
    console.error('Failed to save approval data to the backend (it will only persist locally for now):', err);
    HK_LAST_APPROVAL_SAVE_ERROR = err;
  }
}

async function addApprovalSignature(machineId, deptKey, fields){
  const machine = getMachineById(machineId);
  if(!machine) throw new Error('Machine not found');
  if(hkIsApprovalLocked(machine)) throw new Error('อนุมัติแล้ว ไม่สามารถแก้ไขได้');
  if(!machine.approval) machine.approval = hkEmptyApproval();
  if(!machine.approval.departments[deptKey]) machine.approval.departments[deptKey] = [];
  const sig = {
    name: (fields.name || '').trim(),
    date: fields.date || new Date().toISOString().slice(0, 10),
    comment: (fields.comment || '').trim(),
  };
  const deptMeta = HK_APPROVAL_DEPARTMENTS.find(d => d.key === deptKey);
  if(deptMeta && deptMeta.extraField){
    sig[deptMeta.extraField.key] = (fields[deptMeta.extraField.key] || '').trim();
  }
  machine.approval.departments[deptKey].push(sig);
  await hkPersistApproval(machine);
  return machine.approval;
}

async function removeApprovalSignature(machineId, deptKey, index){
  const machine = getMachineById(machineId);
  if(!machine) throw new Error('Machine not found');
  if(hkIsApprovalLocked(machine)) throw new Error('อนุมัติแล้ว ไม่สามารถแก้ไขได้');
  if(!machine.approval || !machine.approval.departments[deptKey]) return;
  machine.approval.departments[deptKey].splice(index, 1);
  await hkPersistApproval(machine);
  return machine.approval;
}

// decision: 'approved' | 'rejected'. Approving requires every department
// to have met its minimum; rejecting doesn't (an MD can reject early
// without waiting for signatures) but does require a comment, so there's
// always a reason recorded for departments to act on.
async function setMdDecision(machineId, decision, name, date, comment){
  const machine = getMachineById(machineId);
  if(!machine) throw new Error('Machine not found');
  if(hkIsApprovalLocked(machine)) throw new Error('อนุมัติแล้ว ไม่สามารถแก้ไขได้');
  if(decision === 'approved' && !hkApprovalDepartmentsComplete(machine.approval)) throw new Error('ยังลงชื่อไม่ครบทุกแผนก');
  if(decision === 'rejected' && !(comment || '').trim()) throw new Error('กรุณาระบุเหตุผลที่ไม่อนุมัติ');
  machine.approval.mdApproval = {
    name: (name || '').trim(),
    date: date || new Date().toISOString().slice(0, 10),
    comment: (comment || '').trim(),
    decision: decision,
  };
  await hkPersistApproval(machine);
  return machine.approval;
}

/* ---------- Machine / spec / parts / images / documents edits ----------
   Everything about a machine can be edited after creation EXCEPT the
   approval workflow above, which locks once the MD has signed. These
   mutate the in-memory cache immediately, then try to persist; if the
   backend call fails the change still sticks locally for this session
   and HK_LAST_SAVE_ERROR is set so the caller can toast a warning. */
let HK_LAST_SAVE_ERROR = null;

async function hkTryPersist(promise){
  try{
    const result = await promise;
    if(result && result.error) throw new Error(result.error);
    HK_LAST_SAVE_ERROR = null;
    return result;
  }catch(err){
    console.error('Failed to save to the backend (kept locally for this session only):', err);
    HK_LAST_SAVE_ERROR = err;
    return null;
  }
}

async function updateMachineInfo(machineId, fields){
  const machine = getMachineById(machineId);
  if(!machine) throw new Error('Machine not found');
  machine.category = fields.category;
  machine.name = fields.name;
  machine.brand = fields.brand;
  machine.model = fields.model;
  machine.type = fields.type;
  machine.bcCode = fields.bcCode;
  machine.description = fields.description;
  if(fields.coverImage !== undefined) machine.coverImage = fields.coverImage || null;
  await hkTryPersist(hkApiUpdateMachineInfo(machineId, {
    category: machine.category, name: machine.name, brand: machine.brand, model: machine.model,
    type: machine.type, bcCode: machine.bcCode, description: machine.description, coverImageUrl: machine.coverImage,
  }));
  return machine;
}

async function updateSpecification(machineId, spec){
  const machine = getMachineById(machineId);
  if(!machine) throw new Error('Machine not found');
  machine.specification = { ...machine.specification, ...spec };
  await hkTryPersist(hkApiUpdateSpecification(machineId, machine.specification));
  return machine;
}

// internalNotes is HTML from the Quill rich-text editor on the Internal
// Structure tab — a separate, freely-formatted "in-depth technician
// assessment" field, distinct from the plain-text `description` shown
// on Overview.
async function updateInternalNotes(machineId, html){
  const machine = getMachineById(machineId);
  if(!machine) throw new Error('Machine not found');
  machine.internalNotes = html;
  await hkTryPersist(hkApiUpdateInternalNotes(machineId, html));
  return machine;
}

async function addPartToMachine(machineId, part){
  const machine = getMachineById(machineId);
  if(!machine) throw new Error('Machine not found');
  const localPart = { id: null, name: part.name || '', brand: part.brand || '', model: part.model || '', note: part.note || '', image: part.imageUrl || null };
  machine.parts = machine.parts || [];
  machine.parts.push(localPart);
  const result = await hkTryPersist(hkApiAddPart(machineId, part));
  if(result && result.id) localPart.id = result.id;
  return machine;
}

async function updatePartInMachine(machineId, partId, fields){
  const machine = getMachineById(machineId);
  if(!machine) throw new Error('Machine not found');
  const part = (machine.parts || []).find(p => p.id === partId);
  if(!part) throw new Error('Part not found');
  part.name = fields.name; part.brand = fields.brand; part.model = fields.model; part.note = fields.note;
  if(fields.imageUrl !== undefined) part.image = fields.imageUrl;
  if(partId) await hkTryPersist(hkApiUpdatePart(partId, { name: part.name, brand: part.brand, model: part.model, note: part.note, imageUrl: part.image }));
  return machine;
}

async function removePartFromMachine(machineId, partId){
  const machine = getMachineById(machineId);
  if(!machine) throw new Error('Machine not found');
  machine.parts = (machine.parts || []).filter(p => p.id !== partId);
  if(partId) await hkTryPersist(hkApiDeletePart(partId));
  return machine;
}

async function addImageToMachine(machineId, section, groupKey, file){
  const machine = getMachineById(machineId);
  if(!machine) throw new Error('Machine not found');
  const folder = section === 'Internal' ? 'Internal' : 'Gallery';
  const uploadRes = await hkApiUploadFile(file, machineId, machine.name, folder);
  if(uploadRes && uploadRes.error) throw new Error(uploadRes.error);
  const url = uploadRes.url;
  const bucket = section === 'Internal' ? machine.internalImages : machine.gallery;
  if(!bucket[groupKey]) bucket[groupKey] = [];
  bucket[groupKey].push(url);
  await hkTryPersist(hkApiAddImage({ machineId, section, groupKey, url }));
  return machine;
}

async function removeImageFromMachine(machineId, section, groupKey, url){
  const machine = getMachineById(machineId);
  if(!machine) throw new Error('Machine not found');
  const bucket = section === 'Internal' ? machine.internalImages : machine.gallery;
  if(bucket[groupKey]) bucket[groupKey] = bucket[groupKey].filter(u => u !== url);
  await hkTryPersist(hkApiDeleteImage({ machineId, section, groupKey, url }));
  return machine;
}

async function setDocumentOnMachine(machineId, docType, file){
  const machine = getMachineById(machineId);
  if(!machine) throw new Error('Machine not found');
  const uploadRes = await hkApiUploadFile(file, machineId, machine.name, 'Documents');
  if(uploadRes && uploadRes.error) throw new Error(uploadRes.error);
  machine.documents = machine.documents || {};
  machine.documents[docType] = { name: file.name, url: uploadRes.url };
  await hkTryPersist(hkApiSetDocument({ machineId, docType, name: file.name, url: uploadRes.url }));
  return machine;
}

async function removeDocumentFromMachine(machineId, docType){
  const machine = getMachineById(machineId);
  if(!machine) throw new Error('Machine not found');
  if(machine.documents) machine.documents[docType] = null;
  await hkTryPersist(hkApiDeleteDocument({ machineId, docType }));
  return machine;
}

/* ---------- NFC Public Machine Profile ----------
   Settings (status, token, overview/spec/gallery visibility) live in
   machine.nfc, already included by bundleMachine() on the backend. The
   gallery-with-per-image-visibility list used only by the NFC settings
   tab is fetched separately (hkApiGetNfcSettings) since the main
   machine.gallery shape elsewhere is just plain URL strings. */

async function fetchNfcSettings(machineId){
  const result = await hkApiGetNfcSettings(machineId);
  if(result && result.error) throw new Error(result.error);
  return result;
}

// fields: { enabled, showOverview, showSpecification, hiddenSpecFields }
async function updateNfcSettings(machineId, fields){
  const machine = getMachineById(machineId);
  if(!machine) throw new Error('Machine not found');
  const result = await hkTryPersist(hkApiUpdateNfcSettings({ machineId, ...fields }));
  if(machine.nfc){
    if(fields.enabled === true) machine.nfc.status = 'active';
    if(fields.enabled === false) machine.nfc.status = 'disabled';
    if(fields.showOverview !== undefined) machine.nfc.showOverview = fields.showOverview;
    if(fields.showSpecification !== undefined) machine.nfc.showSpecification = fields.showSpecification;
    if(fields.hiddenSpecFields !== undefined) machine.nfc.hiddenSpecFields = fields.hiddenSpecFields;
    if(result && result.token) machine.nfc.token = result.token;
  }
  return machine;
}

async function regenerateNfcToken(machineId){
  const machine = getMachineById(machineId);
  if(!machine) throw new Error('Machine not found');
  const result = await hkTryPersist(hkApiRegenerateNfcToken(machineId));
  if(machine.nfc && result && result.token) machine.nfc.token = result.token;
  return machine;
}

async function setImageNfcVisibility(machineId, groupKey, url, showOnNfc){
  await hkTryPersist(hkApiUpdateImageNfcVisibility({ machineId, groupKey, url, showOnNfc }));
}

function categoryCounts(){
  const all = getAllMachines();
  const counts = { all: all.length };
  Object.keys(HK_CATEGORIES).forEach(c => counts[c] = all.filter(m => m.category === c).length);
  return counts;
}

/* ---------- Parts index (derived — parts live on machines, this cross-references) ---------- */
function getAllPartsIndex(){
  const machines = getAllMachines();
  const map = new Map();
  machines.forEach(m => {
    (m.parts || []).forEach(p => {
      const key = [p.name, p.brand, p.model].join('|').toLowerCase();
      if(!map.has(key)){
        map.set(key, { ...p, usedIn: [] });
      }
      map.get(key).usedIn.push({ id: m.id, name: m.name });
    });
  });
  return Array.from(map.values());
}
function getPartByIdWithUsage(partId, machineId){
  const machine = getMachineById(machineId);
  const part = machine ? (machine.parts || []).find(p => p.id === partId) : null;
  if(!part) return null;
  const key = [part.name, part.brand, part.model].join('|').toLowerCase();
  const entry = getAllPartsIndex().find(p => [p.name, p.brand, p.model].join('|').toLowerCase() === key);
  return entry || { ...part, usedIn: [{ id: machine.id, name: machine.name }] };
}

window.hkBootstrapMachines = hkBootstrapMachines;
window.hkLoadErrorToastMessage = hkLoadErrorToastMessage;
window.HK_CATEGORIES = HK_CATEGORIES;
window.HK_SPEC_FIELDS = HK_SPEC_FIELDS;
window.HK_INTERNAL_GROUPS = HK_INTERNAL_GROUPS;
window.HK_GALLERY_GROUPS = HK_GALLERY_GROUPS;
window.HK_DOCUMENT_TYPES = HK_DOCUMENT_TYPES;
window.getAllMachines = getAllMachines;
window.getMachineById = getMachineById;
window.getMachinesByCategory = getMachinesByCategory;
window.searchMachines = searchMachines;
window.nextIdForCategory = nextIdForCategory;
window.addMachine = addMachine;
window.categoryCounts = categoryCounts;
window.getAllPartsIndex = getAllPartsIndex;
window.getPartByIdWithUsage = getPartByIdWithUsage;
window.hkEmptySpec = hkEmptySpec;
window.hkEmptyGroupedImages = hkEmptyGroupedImages;
window.hkEmptyDocuments = hkEmptyDocuments;
window.HK_APPROVAL_DEPARTMENTS = HK_APPROVAL_DEPARTMENTS;
window.HK_MD_APPROVAL_LABEL = HK_MD_APPROVAL_LABEL;
window.hkEmptyApproval = hkEmptyApproval;
window.hkApprovalDepartmentsComplete = hkApprovalDepartmentsComplete;
window.hkApprovalStatus = hkApprovalStatus;
window.hkIsApprovalLocked = hkIsApprovalLocked;
window.addApprovalSignature = addApprovalSignature;
window.removeApprovalSignature = removeApprovalSignature;
window.setMdDecision = setMdDecision;
window.updateMachineInfo = updateMachineInfo;
window.updateSpecification = updateSpecification;
window.updateInternalNotes = updateInternalNotes;
window.addPartToMachine = addPartToMachine;
window.updatePartInMachine = updatePartInMachine;
window.removePartFromMachine = removePartFromMachine;
window.addImageToMachine = addImageToMachine;
window.removeImageFromMachine = removeImageFromMachine;
window.setDocumentOnMachine = setDocumentOnMachine;
window.removeDocumentFromMachine = removeDocumentFromMachine;
window.fetchNfcSettings = fetchNfcSettings;
window.updateNfcSettings = updateNfcSettings;
window.regenerateNfcToken = regenerateNfcToken;
window.setImageNfcVisibility = setImageNfcVisibility;
