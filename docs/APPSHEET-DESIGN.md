# AppSheet Design — companion app for the same Google Sheet

AppSheet reads the same 5-tab Sheet described in `BACKEND-INTEGRATION.md`
directly (no Apps Script needed on this side). Use it as the mobile/tablet
companion for the team — same data, same MachineID scheme, so anything
added in AppSheet shows up in the web Dashboard on next load and vice versa.

## 1. Connect the data

**Data → Tables → Add new table**, select the same spreadsheet, add all 5
tabs (Machine, Specification, Parts, Images, Documents). AppSheet will
auto-detect columns; adjust these manually:

| Table | Key column | Notes |
|---|---|---|
| Machine | `MachineID` | |
| Specification | `MachineID` | one row per machine — set as key since it's 1:1 |
| Parts | `PartID` | |
| Images | `ImageID` | |
| Documents | `DocumentID` | |

**Column type fixes:**
- `Machine.Category` → type **Enum**, values: `coffee, grinder, tea, ice, other`
  (set display names ยี่ห้อ→label mapping via `EnumInputMode: Buttons`, or keep
  matching the 5 sidebar categories in the web app 1:1)
- `Machine.CoverImageURL`, `Parts.ImageURL`, `Images.ImageURL` → type **Image**
  (AppSheet renders the Drive URL as a thumbnail automatically)
- `Documents.FileURL` → type **File**
- `Specification.MachineID`, `Parts.MachineID`, `Images.MachineID`,
  `Documents.MachineID` → type **Ref**, referencing `Machine.MachineID`.
  This is what makes each machine's spec/parts/images/documents show up
  automatically as related data on its Detail view — no manual joins needed.
- `Images.Section` → Enum: `Gallery, Internal`
- `Images.GroupKey` → Enum, values depend on `Section` (see below)
- `Documents.DocType` → Enum: `UserManual, ServiceManual, PartsList, WiringDiagram, Firmware, Brochure`

Since `GroupKey`'s valid values differ by `Section`, either accept one
combined Enum with all 18 group keys, or split Images into two slices
(see below) so each has its own scoped GroupKey Enum — cleaner UX.

## 2. Slices (to mirror the web app's groupings)

Create these under **Data → Slices**:

- `Gallery Images` — Images where `[Section] = "Gallery"`
- `Internal Images` — Images where `[Section] = "Internal"`
- Per-category slices on Machine (optional, if you want dedicated tabs
  instead of one filterable Deck view): `Coffee Machines`, `Grinders`,
  `Tea Machines`, `Ice Machines`, `Other`

## 3. Views — mapped to the web app

| Web app page/tab | AppSheet view |
|---|---|
| Dashboard (`index.html`) | **Deck view** on Machine, grouped by `Category`, showing `CoverImageURL` + `Name` + `MachineID` — same "just image + name" the Concept doc asks for. Search bar is built in. |
| Machine Detail → Overview | **Detail view** on Machine (Name, Brand, Model, Type, Description, CoverImageURL) |
| → Specification | Related **Table/Detail view** on Specification (auto-appears via the Ref column; set to Table view type since it's a fixed 12-field form) |
| → Internal Structure | Related **Deck view** on the `Internal Images` slice, grouped by `GroupKey` |
| → Parts List | Related **Table view** on Parts (Name, Brand, Model, Note, thumbnail) |
| → Gallery | Related **Deck view** on the `Gallery Images` slice, grouped by `GroupKey` |
| → Documents | Related **Table view** on Documents (DocType, FileName, file icon) |
| → AI Assistant | Not replicated in AppSheet (chat logic lives in the web app). Add a **URL action button** on the Machine Detail view — *"เปิด HILLKOFFBOT AI"* — deep-linking to `https://<hosted-web-app>/html/machine-detail.html?id=[MachineID]#ai`, so the AppSheet user jumps straight to that machine's AI tab on the web. Requires hosting the static site somewhere with a stable URL (GitHub Pages, Firebase Hosting, or Apps Script `HtmlService` all work). |
| Add Machine wizard | See §4 below — AppSheet's natural pattern differs from a linear wizard |
| HILLKOFFBOT AI (standalone) | Same URL-action approach, pointed at `ai-assistant.html` |

Set the main view group order in **UX → Views** so Dashboard is the
starting view, and nest Specification/Parts/Gallery/Internal/Documents
under the Machine Detail view (AppSheet does this automatically once the
Ref columns are set — they appear as scrollable sections on the detail
page, closest AppSheet equivalent to the web app's tabs).

## 4. "Add Machine" flow

AppSheet doesn't have a native multi-step wizard component, so the
pragmatic equivalent is: **Add Machine form → then add related rows from
the detail view**, which covers the same 6 groups of data, just navigated
differently:

1. **+ button on the Dashboard Deck view** → Form view on Machine
   (Category, Name, Brand, Model, Type, Description, CoverImageURL) —
   covers wizard Step 1 + the cover part of Step 3
2. On Save, AppSheet lands on the new machine's Detail view. From there:
   - Related **Specification** section → **+** → Form view with the 12
     fixed fields, `MachineID` pre-filled via `LINKTOFORM` — covers Step 2
   - Related **Gallery Images** / **Internal Images** sections → **+** →
     quick Form (pick `GroupKey`, attach photo) — covers Steps 3–4
   - Related **Parts** section → **+** → Form (Name, Brand, Model, Note,
     photo) — covers Step 5, repeatable
   - Related **Documents** section → **+** → Form (pick `DocType`, attach
     file) — covers Step 6

This trades the single linear wizard for a "fill the main record, then
top up its related sections" pattern — the standard, low-maintenance way
to do it in AppSheet. If a strict step-by-step feel is important on
mobile too, a closer approximation is possible with a sequence of
**System-generated Actions** (e.g. "Save & add specification next") using
`LINKTOFORM(Specification, "MachineID", [MachineID])` chained from a
"Saved" behavior action — worth doing only if the team specifically wants
it, since it adds real setup and maintenance overhead for limited gain.

## 5. Actions worth adding

- **Open on Web** (Machine detail view) — `LINKTOURL` to
  `.../machine-detail.html?id=[MachineID]`, for anyone who wants the full
  desktop layout or the AI Assistant tab
- **Add Specification / Add Part / Add Image / Add Document** — the
  default related-table "+" actions described above; no extra config
  needed once Ref columns are set
- Optional: a **QR/Barcode** action on Machine (`MachineID` as the code)
  if machines get a physical label — scan → jumps straight to that
  machine's Detail view. Not in the Concept doc, but a natural AppSheet
  add-on if it's useful to the team later.

## 6. Access

AppSheet requires Google sign-in — set **Security → Require sign-in** and
restrict to the HILLKOFF Workspace domain. This is intentionally
different from the web app (which the Concept doc says should have no
login): AppSheet is the internal, authenticated companion; the static web
app stays link-open. Both still read/write the same Sheet, so permissions
on the Sheet/Drive folder itself remain the real access boundary either
way — make sure the Sheet and Drive root folder are shared with the same
team AppSheet is restricted to.

## 6.1 New tab: Approvals

The web app's Internal Structure tab now ends with a 5-department +
MD sign-off workflow (see `BACKEND-INTEGRATION.md` → "Machine evaluation
/ approval-to-sell workflow"), backed by a new `Approvals` tab
(`MachineID`, `Department`, `Name`, `SignedDate`). Add it as a table with
`MachineID` as a **Ref** to `Machine.MachineID`, same pattern as the other
four tabs, and `Department` as an **Enum**: `technicianDept, technicianAdmin,
partsAdmin, sales, purchasing, md`. A related **Table view** on this slice
from the Machine Detail view gives the team read access to who's signed;
actual signing is easiest to leave on the web app for now, since it's the
side that enforces the per-department minimums and the one-way lock.

## 7. Keeping both in sync going forward

Because AppSheet and the web app (via Apps Script) both write to the same
5 tabs using the same `MachineID` / group-key / doc-type conventions, no
sync job is needed — just keep column names and Enum values identical if
either side changes. If you rename a group key or category in one place
(e.g. `js/machines-data.js`'s `HK_CATEGORIES`), mirror it in the Sheet's
Enum values so both surfaces keep agreeing on what a valid row looks like.
