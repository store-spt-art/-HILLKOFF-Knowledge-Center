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

const HK_API_URL = 'https://script.google.com/macros/s/AKfycbxasc7hDrcF5VFYR6D9E5Ac5LaWDeBKFdbrTCU3QpNC5WjTb-CrKnws4OvrkgVlyHiX/exec';

// Apps Script Web Apps can occasionally hang or blip on a single request
// (cold start, transient network issue). fetchJson wraps a request with
// a timeout (so a hung request fails fast instead of spinning forever)
// and an optional retry — only used for GET reads (list/get), which are
// safe to retry since they don't change anything. POST actions are never
// auto-retried here, since retrying a write blindly risks creating a
// duplicate machine/part/etc. if the first attempt actually succeeded
// server-side but the response itself got lost.
async function hkFetchJson(url, options, retries){
  const attempts = (retries || 0) + 1;
  let lastErr;
  for(let i = 0; i < attempts; i++){
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try{
      const res = await fetch(url, { ...options, signal: controller.signal });
      return await res.json();
    }catch(err){
      lastErr = err;
      if(i < attempts - 1) await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }finally{
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

// Every request (GET or POST) carries the session token from auth.js.
// If the backend ever comes back with {error:'unauthorized'} — missing
// token, forged token, expired token, or a disabled account — bounce to
// the login page immediately instead of making every caller check for it.
function hkApiHandleResponse(data){
  if(data && data.error === 'unauthorized'){
    hkAuthClearSession();
    hkAuthRedirectToLogin();
  }
  return data;
}

async function hkApiListMachines(){
  const data = await hkFetchJson(`${HK_API_URL}?action=list&token=${encodeURIComponent(hkAuthGetToken() || '')}`, {}, 1);
  return hkApiHandleResponse(data);
}

async function hkApiGetMachine(id){
  const data = await hkFetchJson(`${HK_API_URL}?action=get&id=${encodeURIComponent(id)}&token=${encodeURIComponent(hkAuthGetToken() || '')}`, {}, 1);
  return hkApiHandleResponse(data);
}

async function hkApiPost(action, payload){
  const data = await hkFetchJson(HK_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload, token: hkAuthGetToken() }),
  }, 0);
  return hkApiHandleResponse(data);
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

// --- NFC Public Machine Profile ---
// getNfcSettings/updateNfcSettings/regenerateNfcToken/updateImageNfcVisibility
// are all authenticated (admin-only, used by the NFC tab on a machine's
// detail page). getNfcProfile is the one deliberately PUBLIC call — no
// token attached, since a person scanning a tag has no login session.
async function hkApiGetNfcSettings(machineId){
  const data = await hkFetchJson(`${HK_API_URL}?action=nfcSettings&id=${encodeURIComponent(machineId)}&token=${encodeURIComponent(hkAuthGetToken() || '')}`, {}, 1);
  return hkApiHandleResponse(data);
}
async function hkApiUpdateNfcSettings(payload){
  return hkApiPost('updateNfcSettings', payload);
}
async function hkApiRegenerateNfcToken(machineId){
  return hkApiPost('regenerateNfcToken', { machineId });
}
async function hkApiUpdateImageNfcVisibility(payload){
  return hkApiPost('updateImageNfcVisibility', payload);
}
// Public — intentionally does not go through hkApiPost/hkFetchJson's
// token attachment, and does not redirect to login on {error:'unauthorized'}
// (there is no such error for this action, but keep this call independent
// of the authenticated-request plumbing on principle).
async function hkApiGetNfcProfile(token){
  const res = await fetch(`${HK_API_URL}?action=nfcProfile&token=${encodeURIComponent(token)}`);
  return res.json();
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
