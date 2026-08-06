/**
 * HILLKOFF Coffee Machine Knowledge Center — Apps Script backend
 * ---------------------------------------------------------------
 * Deploy as: Extensions > Apps Script (bound to the Google Sheet) >
 *            Deploy > New deployment > type "Web app"
 *            Execute as: Me
 *            Who has access: Anyone within [your domain] (recommended)
 *
 * This single Web App URL is the ONE integration point for both:
 *   1. The web app (fetch calls from js/api-client.js)
 *   2. AppSheet (points at the same Google Sheet directly — no
 *      Apps Script needed on the AppSheet side, see docs/APPSHEET-DESIGN.md)
 *
 * Sheet layout expected (5 tabs, headers in row 1):
 *   Machine        MachineID | Category | Name | Brand | Model | Type | Description | CoverImageURL | CreatedAt | UpdatedAt
 *   Specification  MachineID | Voltage | Power | Frequency | CoffeeBoiler | SteamBoiler | Pump | Group | PID | Display | Dimension | Weight | WaterTank
 *   Parts          PartID | MachineID | Name | Brand | Model | Note | ImageURL
 *   Images         ImageID | MachineID | Section | GroupKey | ImageURL | UploadedAt
 *   Documents      DocumentID | MachineID | DocType | FileName | FileURL | UploadedAt
 *
 * Section (Images) is "Gallery" or "Internal".
 * GroupKey matches the wizard's group keys, e.g. front/back/left/right/top/internal/others
 * for Gallery, or cover/internal/boiler/pump/pcb/flowmeter/valve/relay/sensor/other for Internal.
 * DocType (Documents) is one of: UserManual, ServiceManual, PartsList, WiringDiagram, Firmware, Brochure
 */

const SHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
const DRIVE_ROOT_FOLDER_ID = 'YOUR_DRIVE_ROOT_FOLDER_ID_HERE';

const SHEETS = {
  MACHINE: 'Machine',
  SPEC: 'Specification',
  PARTS: 'Parts',
  IMAGES: 'Images',
  DOCUMENTS: 'Documents',
};

const CATEGORY_PREFIX = { coffee: 'CM', grinder: 'GR', tea: 'TM', ice: 'IM', other: 'OT' };

/* ============================= Entry points ============================= */

function doGet(e){
  try{
    const action = (e.parameter.action || 'list');
    if(action === 'list') return respond(listMachines());
    if(action === 'get') return respond(getMachine(e.parameter.id));
    return respond({ error: 'unknown action: ' + action }, 400);
  }catch(err){
    return respond({ error: err.message }, 500);
  }
}

function doPost(e){
  try{
    // Sent as text/plain from the browser to avoid a CORS preflight —
    // see docs/BACKEND-INTEGRATION.md for why.
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    let result;
    if(action === 'createMachine') result = createMachine(body.payload);
    else if(action === 'uploadFile') result = handleUploadFile(body.payload);
    else if(action === 'addPart') result = addPart(body.payload);
    else if(action === 'addImage') result = addImageRecord(body.payload);
    else if(action === 'addDocument') result = addDocumentRecord(body.payload);
    else return respond({ error: 'unknown action: ' + action }, 400);
    return respond(result);
  }catch(err){
    return respond({ error: err.message }, 500);
  }
}

function respond(data){
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============================= Sheet helpers ============================= */

function getSheet(name){
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
  if(!sheet) throw new Error('Sheet not found: ' + name);
  return sheet;
}

function sheetToObjects(sheet){
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
}

function appendObjectRow(sheet, obj){
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => obj[h] !== undefined && obj[h] !== null ? obj[h] : '');
  sheet.appendRow(row);
}

function nextMachineId(category){
  const prefix = CATEGORY_PREFIX[category] || 'OT';
  const machines = sheetToObjects(getSheet(SHEETS.MACHINE));
  const nums = machines
    .filter(m => m.Category === category)
    .map(m => parseInt(String(m.MachineID || '').split('-')[1], 10))
    .filter(n => !isNaN(n));
  const next = (nums.length ? Math.max.apply(null, nums) : 0) + 1;
  return prefix + '-' + String(next).padStart(3, '0');
}

function uid(prefix){
  return prefix + '-' + Utilities.getUuid().slice(0, 8);
}

/* ============================= Read model ============================= */

function listMachines(){
  const machines = sheetToObjects(getSheet(SHEETS.MACHINE));
  const specs = sheetToObjects(getSheet(SHEETS.SPEC));
  const parts = sheetToObjects(getSheet(SHEETS.PARTS));
  const images = sheetToObjects(getSheet(SHEETS.IMAGES));
  const docs = sheetToObjects(getSheet(SHEETS.DOCUMENTS));
  return machines.map(m => bundleMachine(m, specs, parts, images, docs));
}

function getMachine(id){
  const machines = sheetToObjects(getSheet(SHEETS.MACHINE));
  const m = machines.find(x => x.MachineID === id);
  if(!m) return null;
  const specs = sheetToObjects(getSheet(SHEETS.SPEC));
  const parts = sheetToObjects(getSheet(SHEETS.PARTS));
  const images = sheetToObjects(getSheet(SHEETS.IMAGES));
  const docs = sheetToObjects(getSheet(SHEETS.DOCUMENTS));
  return bundleMachine(m, specs, parts, images, docs);
}

// Shapes the flat sheet rows into the SAME nested object shape
// js/machines-data.js already uses — this is what makes swapping
// the seed data for a real fetch() a small change on the frontend.
function bundleMachine(m, specs, parts, images, docs){
  const spec = specs.find(s => s.MachineID === m.MachineID) || {};
  const machineParts = parts.filter(p => p.MachineID === m.MachineID)
    .map(p => ({ id: p.PartID, name: p.Name, brand: p.Brand, model: p.Model, note: p.Note, image: p.ImageURL || null }));

  const gallery = {};
  const internalImages = {};
  images.filter(i => i.MachineID === m.MachineID).forEach(img => {
    const bucket = img.Section === 'Internal' ? internalImages : gallery;
    if(!bucket[img.GroupKey]) bucket[img.GroupKey] = [];
    bucket[img.GroupKey].push(img.ImageURL);
  });

  const documents = {};
  docs.filter(d => d.MachineID === m.MachineID).forEach(d => {
    documents[d.DocType] = { name: d.FileName, url: d.FileURL };
  });

  return {
    id: m.MachineID, category: m.Category, name: m.Name, brand: m.Brand, model: m.Model,
    type: m.Type, description: m.Description, coverImage: m.CoverImageURL || null,
    specification: {
      voltage: spec.Voltage || '', power: spec.Power || '', frequency: spec.Frequency || '',
      coffeeBoiler: spec.CoffeeBoiler || '', steamBoiler: spec.SteamBoiler || '', pump: spec.Pump || '',
      group: spec.Group || '', pid: spec.PID || '', display: spec.Display || '',
      dimension: spec.Dimension || '', weight: spec.Weight || '', waterTank: spec.WaterTank || '',
    },
    parts: machineParts,
    gallery: gallery,
    internalImages: internalImages,
    documents: documents,
    createdAt: m.CreatedAt,
  };
}

/* ============================= Write model ============================= */

// payload: { category, name, brand, model, type, description, coverImageUrl,
//            specification: {...12 fields}, parts: [{name,brand,model,note,imageUrl}],
//            images: [{section, groupKey, url}], documents: [{docType, name, url}] }
function createMachine(payload){
  const id = nextMachineId(payload.category);
  const now = new Date().toISOString();

  appendObjectRow(getSheet(SHEETS.MACHINE), {
    MachineID: id, Category: payload.category, Name: payload.name, Brand: payload.brand,
    Model: payload.model, Type: payload.type, Description: payload.description,
    CoverImageURL: payload.coverImageUrl || '', CreatedAt: now, UpdatedAt: now,
  });

  const spec = payload.specification || {};
  appendObjectRow(getSheet(SHEETS.SPEC), {
    MachineID: id, Voltage: spec.voltage, Power: spec.power, Frequency: spec.frequency,
    CoffeeBoiler: spec.coffeeBoiler, SteamBoiler: spec.steamBoiler, Pump: spec.pump,
    Group: spec.group, PID: spec.pid, Display: spec.display, Dimension: spec.dimension,
    Weight: spec.weight, WaterTank: spec.waterTank,
  });

  (payload.parts || []).forEach(p => addPart({ machineId: id, ...p }));
  (payload.images || []).forEach(img => addImageRecord({ machineId: id, ...img }));
  (payload.documents || []).forEach(doc => addDocumentRecord({ machineId: id, ...doc }));

  return { id: id, ok: true };
}

function addPart(payload){
  appendObjectRow(getSheet(SHEETS.PARTS), {
    PartID: uid('PT'), MachineID: payload.machineId, Name: payload.name,
    Brand: payload.brand, Model: payload.model, Note: payload.note, ImageURL: payload.imageUrl || '',
  });
  return { ok: true };
}

function addImageRecord(payload){
  appendObjectRow(getSheet(SHEETS.IMAGES), {
    ImageID: uid('IMG'), MachineID: payload.machineId, Section: payload.section,
    GroupKey: payload.groupKey, ImageURL: payload.url, UploadedAt: new Date().toISOString(),
  });
  return { ok: true };
}

function addDocumentRecord(payload){
  appendObjectRow(getSheet(SHEETS.DOCUMENTS), {
    DocumentID: uid('DOC'), MachineID: payload.machineId, DocType: payload.docType,
    FileName: payload.name, FileURL: payload.url, UploadedAt: new Date().toISOString(),
  });
  return { ok: true };
}

/* ============================= Drive upload ============================= */

// payload: { machineId, machineName, folder ('Cover'|'Gallery'|'Internal'|'Parts'|'Documents'),
//            base64, fileName, mimeType }
function handleUploadFile(payload){
  const folder = getMachineFolder(payload.machineId, payload.machineName, payload.folder);
  const blob = Utilities.newBlob(Utilities.base64Decode(payload.base64), payload.mimeType, payload.fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  // The thumbnail endpoint embeds reliably in <img> tags — the plain
  // uc?export=view link often fails to render (shows a broken image icon)
  // even when sharing is set correctly.
  return { url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1000', fileId: file.getId() };
}

function getMachineFolder(machineId, machineName, subfolder){
  const root = DriveApp.getFolderById(DRIVE_ROOT_FOLDER_ID);
  const machineFolder = getOrCreateFolder(root, machineId + ' - ' + (machineName || ''));
  return subfolder ? getOrCreateFolder(machineFolder, subfolder) : machineFolder;
}

function getOrCreateFolder(parent, name){
  const existing = parent.getFoldersByName(name);
  if(existing.hasNext()) return existing.next();
  return parent.createFolder(name);
}
