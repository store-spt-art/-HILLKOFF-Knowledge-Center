/* =========================================================
   HILLKOFF · api-client.js  (wired in — see machines-data.js)
   ---------------------------------------------------------
   HK_API_URL below points at the deployed Apps Script Web App.
   machines-data.js fetches the full machine list once on page
   load (hkBootstrapMachines) and caches it in memory; all the
   existing sync helpers (getAllMachines, searchMachines, etc.)
   read from that cache, so dashboard.js / machine-detail.js
   didn't need to change. add-machine.js's submit now calls
   hkApiCreateMachine directly.

   POST requests are sent with Content-Type: text/plain on purpose.
   Apps Script Web Apps don't handle CORS preflight (OPTIONS)
   requests, so sending JSON as text/plain keeps the browser from
   triggering one — Code.gs still JSON.parses the body normally.
   ========================================================= */

const HK_API_URL = 'https://script.google.com/macros/s/AKfycbzovLq8VYyTWD_v5xaw7sOXxM7Ar2UFfp-H-ZrUmv6WuBSLdnzkgrOb8rhCDTx-TGTL/exec';

// Every request (GET or POST) carries the session token from auth.js.
// If the backend ever comes back with {error:'unauthorized'} — missing
// token, forged token, expired token, or a disabled account — bounce to
// the login page immediately instead of making every caller check for it.
async function hkApiHandleResponse(res){
  const data = await res.json();
  if(data && data.error === 'unauthorized'){
    hkAuthClearSession();
    hkAuthRedirectToLogin();
  }
  return data;
}

async function hkApiListMachines(){
  const res = await fetch(`${HK_API_URL}?action=list&token=${encodeURIComponent(hkAuthGetToken() || '')}`);
  return hkApiHandleResponse(res);
}

async function hkApiGetMachine(id){
  const res = await fetch(`${HK_API_URL}?action=get&id=${encodeURIComponent(id)}&token=${encodeURIComponent(hkAuthGetToken() || '')}`);
  return hkApiHandleResponse(res);
}

async function hkApiPost(action, payload){
  const res = await fetch(HK_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload, token: hkAuthGetToken() }),
  });
  return hkApiHandleResponse(res);
}

// Login is the one call that must NOT carry a token (there isn't one
// yet) and must NOT trigger the auto-redirect-to-login on failure —
// the login page handles its own error display.
async function hkApiLogin(email, password){
  const res = await fetch(HK_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'login', payload: { email, password } }),
  });
  return res.json();
}

async function hkApiCreateMachine(machine){
  return hkApiPost('createMachine', machine);
}

// Persists the whole approval object (departments + mdApproval) for one
// machine. Requires an `updateApproval` action + an `Approvals` tab on
// the Code.gs side — see the "Machine evaluation / approval workflow"
// section in docs/BACKEND-INTEGRATION.md for the exact addition needed.
async function hkApiUpdateApproval(machineId, approval){
  return hkApiPost('updateApproval', { machineId, approval });
}

// Editing an existing machine's basic info / specification / parts /
// images / documents (everything except the locked approval section).
async function hkApiUpdateMachineInfo(machineId, fields){
  return hkApiPost('updateMachineInfo', { machineId, ...fields });
}
async function hkApiUpdateSpecification(machineId, specification){
  return hkApiPost('updateSpecification', { machineId, specification });
}
async function hkApiUpdateInternalNotes(machineId, internalNotes){
  return hkApiPost('updateInternalNotes', { machineId, internalNotes });
}
async function hkApiAddPart(machineId, part){
  return hkApiPost('addPart', { machineId, ...part });
}
async function hkApiUpdatePart(partId, fields){
  return hkApiPost('updatePart', { partId, ...fields });
}
async function hkApiDeletePart(partId){
  return hkApiPost('deletePart', { partId });
}
async function hkApiAddImage(payload){
  return hkApiPost('addImage', payload);
}
async function hkApiDeleteImage(payload){
  return hkApiPost('deleteImage', payload);
}
async function hkApiSetDocument(payload){
  return hkApiPost('setDocument', payload);
}
async function hkApiDeleteDocument(payload){
  return hkApiPost('deleteDocument', payload);
}

// history: [{role:'user'|'bot', text}] — the last few turns, sent so
// Gemini has conversational context (Code.gs caps this to the last 10).
async function hkApiAiChat(message, history){
  return hkApiPost('aiChat', { message, history });
}

// file: a File object from an <input type="file">
// folder: 'Cover' | 'Gallery' | 'Internal' | 'Parts' | 'Documents'
async function hkApiUploadFile(file, machineId, machineName, folder){
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return hkApiPost('uploadFile', {
    machineId, machineName, folder,
    fileName: file.name, mimeType: file.type, base64,
  });
}
