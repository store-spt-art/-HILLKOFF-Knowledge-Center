# Changelog

## [2.2.3] — Fixed Google Drive images not rendering (broken image icon)
`uc?export=view&id=...` links — used for every photo/document uploaded
through the wizard — don't reliably render inside `<img>` tags; Google
often blocks the hotlink even when the file's sharing is set to "Anyone
with the link". Symptom: newly uploaded photos (e.g. Internal Structure →
Boiler) showed a broken-image icon instead of the picture.

### Changed
- `appscript/Code.gs` — `handleUploadFile()` now returns the
  `drive.google.com/thumbnail?id=...&sz=w1000` URL instead, which embeds
  reliably
- `js/utils.js` — added `hkDriveImgUrl(url)`, which rewrites any Drive URL
  (old `uc?...id=` format or the new `thumbnail?id=` format) to the
  reliable thumbnail form at render time. Applied everywhere an uploaded
  image is displayed: dashboard cards, Machine Detail (header cover,
  Gallery, Internal Structure, Parts table, part detail modal), and the
  Add Machine wizard's own previews
- Because the fix is applied at render time (not by editing stored data),
  machines added before this fix — with the old broken URL format already
  saved in the Sheet — display correctly too, no manual Sheet edits needed

## [2.2.2] — Internal Structure access gate removed
Both the Google OAuth version and the shared-passcode version of the
Internal Structure gate turned out not to be worth the ongoing setup
friction right now. Removed entirely to get back to a clean, fully-working
baseline — every tab is open again, no login of any kind anywhere on the
site, matching the original Concept doc.

### Removed
- `appscript/Auth.gs`, `js/auth.js` — deleted
- `checkAccess` routing in `Code.gs`'s `doPost`
- Passcode/sign-in prompt on the Internal Structure tab in `machine-detail.js`
  — it now renders its images directly again, same as every other tab

### Notes
- The implementation history (both OAuth and passcode versions) is kept in
  the `[2.2.0]` and `[2.2.1]` entries above if this gets revisited later —
  no need to redesign from scratch, just re-add the two files and the
  routing line

## [2.2.1] — Internal Structure gate switched from Google OAuth to a shared passcode
The Google Sign-In approach from 2.2.0 required a full Google Cloud Console
setup (OAuth consent screen, Client ID, test users, matching Authorized
JavaScript origins) that turned out to be too much friction for what's
meant to be a lightweight internal gate. Replaced with a single shared
passcode — no Google Cloud project needed at all.

### Changed
- `appscript/Auth.gs` — `checkAccess()` now compares a submitted passcode
  against `INTERNAL_ACCESS_CODE` instead of verifying a Google ID token.
  Removed `verifyGoogleIdToken()` and the `GOOGLE_OAUTH_CLIENT_ID` constant
- `js/auth.js` — renders a passcode input instead of a Google Sign-In
  button (`hkRenderPasscodeGate` replaces `hkRenderGoogleSignIn`)
- `js/machine-detail.js` — Internal Structure gate wired to the new
  passcode flow; no longer shows a "this account isn't authorized"
  state since there's no per-person identity anymore, just "correct
  passcode or not"
- `html/machine-detail.html` — removed the Google Identity Services
  `<script>` tag, no longer needed
- Removed the `Users` sheet tab requirement — access is now one shared
  secret, not a per-email allow-list

### Notes
- Trade-off: no record of *which* person viewed Internal Structure, only
  that they had the passcode. Fine for the intended use (keep casual
  browsers out, not audit individual staff) — revisit with real OAuth if
  per-person tracking becomes a real requirement later
- Setup is now just: set `INTERNAL_ACCESS_CODE` in `Auth.gs`, redeploy,
  share the passcode with the team — see `docs/BACKEND-INTEGRATION.md`

## [2.2.0] — Internal Structure access gate (Google Sign-In)
Site-wide login is still intentionally absent (per the Concept doc). This
adds a narrow, opt-in gate on just the Internal Structure tab in Machine
Detail — everything else stays open.

### Added
- `appscript/Auth.gs` — new file, `checkAccess(idToken)` verifies a Google
  ID token directly with Google (`oauth2.googleapis.com/tokeninfo`) and
  checks the email against a new `Users` sheet tab (`Email | Role`)
- `js/auth.js` — renders the Google Sign-In button and calls the backend
  to verify; caches an "authorized" result in `sessionStorage` for the tab
- `Code.gs` — `doPost` now routes a `checkAccess` action to `Auth.gs`;
  added `Users` to the `SHEETS` map

### Changed
- `js/machine-detail.js` — Internal Structure tab now renders a locked
  placeholder + Sign-In button until the backend confirms the signed-in
  email is on the `Users` sheet
- `html/machine-detail.html` — loads the Google Identity Services script
  and `js/auth.js`

### Notes
- Requires a one-time setup: a Google OAuth Client ID (Google Cloud
  Console) pasted into both `Auth.gs` and `js/auth.js`, and at least one
  row in the new `Users` sheet — see `docs/BACKEND-INTEGRATION.md`
  ("Adding the Internal Structure access gate") or
  `docs/GETTING-STARTED-TH.md` (ช่วงที่ 4) for the click-by-click version
- The same gate pattern (`hkRenderGoogleSignIn` + swap-in-content-on-auth)
  can be copied onto other tabs (e.g. Documents) later if needed — not
  done yet since only Internal Structure was requested

## [2.1.0] — Wired to the real backend (Google Sheet / Drive / Apps Script)
### Changed
- `js/machines-data.js` — replaced the `localStorage` (`hk_pending_machines`)
  data source with a live fetch from the deployed Apps Script Web App
  (`hkBootstrapMachines()`, cached in memory per page load). Falls back to
  the local seed data if the fetch fails, so the UI never goes fully blank
- `addMachine()` is now `async` and writes through to the Sheet via
  `hkApiCreateMachine`
- Every image/document picker in the Add Machine wizard now uploads to
  Google Drive immediately on file selection (`hkApiUploadFile`) instead of
  embedding a base64 data URL — avoids the Google Sheets ~50,000-character
  per-cell limit, which would otherwise fail the save on anything but tiny
  images
- Machine Detail → Documents tab: entries with a stored file URL are now
  clickable links, not just status text

### Added
- `js/api-client.js` — connected (`HK_API_URL` points at the live deployment)

## [2.0.0] — Rebuild: align entire project with the Concept/Flow document
This is a ground-up rebuild. The previous 1.2.x line (Dashboard + Machine Detail +
4-step Add Machine wizard) had drifted from the intended product: it had grown a
"ช่างผู้ประเมิน / วันที่ประเมิน" assessment framing, a readiness-score Assessment tab,
free-form spec builders, and status badges implying repair tracking. None of that is
in the Concept document, which describes a plain machine knowledge base with 5
functions only (add / save machine info / save internal info / save parts / search).
Every file was rewritten to match that document directly.

### Removed
- Login system (explicitly out of scope per the Concept doc — internal tool, few users)
- Machine status badges ("พร้อมใช้งาน" / "ต้องตรวจสอบ") and any repair-adjacent framing
- Assessment tab (readiness score + checklist) — not part of the Concept flow
- Dashboard KPI / stat strip / total machine count
- "ช่างผู้ประเมิน" / "วันที่ประเมิน" labels and the underlying assessment framing —
  Overview now uses ยี่ห้อ / รุ่น / ประเภท directly, no evaluator or evaluation date
- Free-form key/value Specification builder — replaced with the fixed 12-field set
  from the Concept doc (Voltage, Power, Frequency, Coffee Boiler, Steam Boiler, Pump,
  Group, PID, Display, Dimension, Weight, Water Tank)

### Changed
- Add Machine wizard: 4 steps → **6 steps** (ข้อมูลพื้นฐาน, Specification, Upload
  Images, Internal Images, Parts List, Documents), matching the Concept doc exactly
- Machine Detail: 6 tabs → **7 tabs** (Overview, Specification, Internal Structure,
  Parts List, Gallery, Documents, AI Assistant) — "Internal" renamed/reframed as
  "Internal Structure" (illustrative photos only, still no repair system), "Parts
  List" is now a first-class tab instead of buried in Internal
- Parts List is now a real table (รูป / ชื่ออะไหล่ / ยี่ห้อ / รุ่น / หมายเหตุ) with a
  Part Detail view showing which machines use that part — no stock/price/warehouse
  fields, matching the Concept doc's explicit exclusions
- Google Drive folder plan changed to `<Machine Name>/Cover,Gallery,Internal,Parts,Documents`
- Google Sheet plan simplified to 5 tables: Machine, Specification, Parts, Images, Documents

### Added
- `html/ai-assistant.html` + `js/ai-bot.js` — HILLKOFFBOT AI, both as a standalone
  page and as a tab embedded in Machine Detail. Answers only from the local machine
  database (client-side keyword matcher for now); explicitly does not reason about
  repairs, matching "AI ไม่ต้องวิเคราะห์งานซ่อม"
- Grouped image galleries for both Internal Structure (10 groups) and Gallery
  (8 groups), each with its own uploader in the wizard

### Notes
- Frontend-only (HTML/CSS/JS), no build step, no backend calls — same approach as
  before, just restructured
- New machines still save to `localStorage` (`hk_pending_machines`) until Sprint 6
  connects Google Sheets / Drive
