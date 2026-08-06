/* =========================================================
   HILLKOFF · add-machine.js
   6-step wizard: ข้อมูลพื้นฐาน -> Specification -> Upload Images
   -> Internal Images -> Parts List -> Documents -> Finish
   ========================================================= */

const HK_WIZARD_STEPS = [
  { n: 1, label: 'ข้อมูลพื้นฐาน' },
  { n: 2, label: 'Specification' },
  { n: 3, label: 'Upload Images' },
  { n: 4, label: 'Internal Images' },
  { n: 5, label: 'Parts List' },
  { n: 6, label: 'Documents' },
];

let hkWizard = {
  step: 1,
  category: '',
  name: '', brand: '', model: '', type: '', description: '',
  specification: null,
  coverImage: null,
  gallery: null,
  internalImages: null,
  parts: [],
  documents: null,
};

function hkResetWizard(){
  hkWizard = {
    step: 1,
    // Files get uploaded to Drive as soon as they're picked (not saved for
    // later), so we need a folder name before the real MachineID exists —
    // this stand-in groups this machine's files together in Drive; the
    // folder just won't be renamed to match the final MachineID.
    tempId: `wizard-${Date.now()}`,
    category: '', name: '', brand: '', model: '', type: '', description: '',
    specification: hkEmptySpec(),
    coverImage: null,
    gallery: hkEmptyGroupedImages(HK_GALLERY_GROUPS),
    internalImages: hkEmptyGroupedImages(HK_INTERNAL_GROUPS),
    parts: [],
    documents: hkEmptyDocuments(),
  };
}

let hkPartRowSeq = 1;
function hkNewPartRow(){
  return { rowId: `row-${hkPartRowSeq++}`, image: null, name: '', brand: '', model: '', note: '' };
}

/* ---------- Stepper ---------- */
function hkStepperHtml(){
  return `<div class="hk-stepper">${HK_WIZARD_STEPS.map((s, i) => `
    ${i > 0 ? '<div class="hk-step__line"></div>' : ''}
    <div class="hk-step ${s.n === hkWizard.step ? 'is-active' : ''} ${s.n < hkWizard.step ? 'is-done' : ''}">
      <div class="hk-step__dot">${s.n < hkWizard.step ? '✓' : s.n}</div>
      <div class="hk-step__label">${s.label}</div>
    </div>`).join('')}</div>`;
}

/* ---------- Step 1: ข้อมูลพื้นฐาน ---------- */
function hkStep1Html(){
  const cats = Object.entries(HK_CATEGORIES).map(([key, meta]) => `
    <div class="hk-catoption ${hkWizard.category === key ? 'is-selected' : ''}" data-category="${key}">
      <div class="hk-catoption__icon">${hkIcon(meta.icon)}</div>
      <div class="hk-catoption__label">${meta.label}</div>
    </div>`).join('');

  return `
    <div class="hk-card hk-card--pad">
      <div class="hk-field__label">เลือกหมวดหมู่ <span class="required">*</span></div>
      <div class="hk-catpicker" id="hk-catpicker">${cats}</div>
      <div class="hk-field__error" id="err-category">กรุณาเลือกหมวดหมู่</div>

      <div class="hk-row2">
        <div class="hk-field" id="field-name">
          <label class="hk-field__label">ชื่อเครื่อง <span class="required">*</span></label>
          <input class="hk-input" id="in-name" value="${hkEscapeHtml(hkWizard.name)}" placeholder="เช่น Rocket R9">
          <div class="hk-field__error">กรุณากรอกชื่อเครื่อง</div>
        </div>
        <div class="hk-field" id="field-brand">
          <label class="hk-field__label">ยี่ห้อ <span class="required">*</span></label>
          <input class="hk-input" id="in-brand" value="${hkEscapeHtml(hkWizard.brand)}" placeholder="เช่น Rocket Espresso">
          <div class="hk-field__error">กรุณากรอกยี่ห้อ</div>
        </div>
      </div>
      <div class="hk-row2">
        <div class="hk-field">
          <label class="hk-field__label">รุ่น</label>
          <input class="hk-input" id="in-model" value="${hkEscapeHtml(hkWizard.model)}" placeholder="เช่น R9 ONE">
        </div>
        <div class="hk-field">
          <label class="hk-field__label">ประเภท</label>
          <input class="hk-input" id="in-type" value="${hkEscapeHtml(hkWizard.type)}" placeholder="เช่น เครื่องชงกาแฟ 2 กรุ๊ป">
        </div>
      </div>
      <div class="hk-field">
        <label class="hk-field__label">รายละเอียด</label>
        <textarea class="hk-textarea" id="in-description" placeholder="คำอธิบายเครื่องจักรโดยย่อ">${hkEscapeHtml(hkWizard.description)}</textarea>
      </div>
    </div>`;
}
function hkWireStep1(){
  document.querySelectorAll('#hk-catpicker .hk-catoption').forEach(opt => {
    opt.addEventListener('click', () => {
      hkWizard.category = opt.dataset.category;
      document.querySelectorAll('#hk-catpicker .hk-catoption').forEach(o => o.classList.remove('is-selected'));
      opt.classList.add('is-selected');
      document.getElementById('err-category').style.display = 'none';
    });
  });
  ['name','brand','model','type','description'].forEach(key => {
    const el = document.getElementById(`in-${key}`);
    el?.addEventListener('input', (e) => { hkWizard[key] = e.target.value; });
  });
}
function hkValidateStep1(){
  let valid = true;
  document.getElementById('err-category').style.display = 'none';
  if(!hkWizard.category){ document.getElementById('err-category').style.display = 'block'; valid = false; }

  ['name','brand'].forEach(key => {
    const field = document.getElementById(`field-${key}`);
    field.classList.remove('hk-field--error');
    if(!hkWizard[key] || !hkWizard[key].trim()){
      field.classList.add('hk-field--error');
      valid = false;
    }
  });
  return valid;
}

/* ---------- Step 2: Specification ---------- */
function hkStep2Html(){
  const fields = HK_SPEC_FIELDS.map(f => `
    <div class="hk-field">
      <label class="hk-field__label">${f.label}</label>
      <input class="hk-input" data-spec="${f.key}" value="${hkEscapeHtml(hkWizard.specification[f.key] || '')}" placeholder="ไม่ระบุ = N/A">
    </div>`).join('');
  return `<div class="hk-card hk-card--pad"><div class="hk-spec-grid">${fields}</div></div>`;
}
function hkWireStep2(){
  document.querySelectorAll('[data-spec]').forEach(input => {
    input.addEventListener('input', (e) => { hkWizard.specification[e.target.dataset.spec] = e.target.value; });
  });
}

/* ---------- Shared: grouped image uploader ---------- */
function hkUploadGroupHtml(groups, storeKey){
  return groups.map(g => {
    const items = hkWizard[storeKey][g.key] || [];
    const thumbs = items.map((img, idx) => `
      <div class="hk-thumb">
        <img src="${hkDriveImgUrl(img)}" alt="">
        <button type="button" class="hk-thumb__remove" data-remove-group="${storeKey}" data-group-key="${g.key}" data-idx="${idx}">✕</button>
      </div>`).join('');
    return `
      <div class="hk-upload-group">
        <div class="hk-upload-group__label">${g.label}</div>
        <label class="hk-dropzone" style="padding:16px;">
          <input type="file" accept="image/*" multiple data-upload-group="${storeKey}" data-group-key="${g.key}">
          <div style="display:flex; align-items:center; justify-content:center; gap:8px; font-size:13px;">${hkIcon('image')} คลิกเพื่อเพิ่มรูป (${g.label})</div>
        </label>
        <div class="hk-thumb-row">${thumbs}</div>
      </div>`;
  }).join('');
}
function hkWireUploadGroups(){
  document.querySelectorAll('[data-upload-group]').forEach(input => {
    input.addEventListener('change', async (e) => {
      const storeKey = input.dataset.uploadGroup;
      const groupKey = input.dataset.groupKey;
      const files = Array.from(e.target.files || []);
      if(files.length === 0) return;
      const folder = storeKey === 'internalImages' ? 'Internal' : 'Gallery';
      hkToast(`กำลังอัปโหลดรูป (${files.length} ไฟล์)...`);
      for(const file of files){
        try{
          const res = await hkApiUploadFile(file, hkWizard.tempId, hkWizard.name || 'เครื่องใหม่', folder);
          if(res && res.url) hkWizard[storeKey][groupKey].push(res.url);
          else hkToast('อัปโหลดไม่สำเร็จ: ' + file.name);
        }catch(err){
          hkToast('อัปโหลดไม่สำเร็จ: ' + file.name);
        }
      }
      hkRenderStep();
    });
  });
  document.querySelectorAll('[data-remove-group]').forEach(btn => {
    btn.addEventListener('click', () => {
      const storeKey = btn.dataset.removeGroup;
      const groupKey = btn.dataset.groupKey;
      const idx = parseInt(btn.dataset.idx, 10);
      hkWizard[storeKey][groupKey].splice(idx, 1);
      hkRenderStep();
    });
  });
}

/* ---------- Step 3: Upload Images (cover + gallery) ---------- */
function hkStep3Html(){
  const galleryGroups = HK_GALLERY_GROUPS.filter(g => g.key !== 'cover');
  return `
    <div class="hk-card hk-card--pad">
      <div class="hk-field__label">รูปภาพหน้าปก</div>
      <div class="hk-field__hint" style="margin-bottom:10px;">ใช้แสดงบนการ์ด Dashboard และหัวข้อหน้ารายละเอียด</div>
      ${hkWizard.coverImage ? `
        <div class="hk-cover-preview">
          <img src="${hkDriveImgUrl(hkWizard.coverImage)}" alt="cover">
          <button type="button" class="hk-cover-preview__remove" id="btn-remove-cover">✕</button>
        </div>` : `
        <label class="hk-dropzone" style="max-width:220px; margin-bottom:20px;">
          <input type="file" accept="image/*" id="in-cover">
          <div class="hk-dropzone__icon">${hkIcon('image')}</div>
          <div>ลากรูปมาวาง หรือคลิกเพื่อเลือก</div>
        </label>`}
    </div>
    <div class="hk-card hk-card--pad" style="margin-top:18px;">
      <div class="hk-field__label" style="margin-bottom:14px;">รูปแกลเลอรี</div>
      ${hkUploadGroupHtml(galleryGroups, 'gallery')}
    </div>`;
}
function hkWireStep3(){
  document.getElementById('in-cover')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    hkToast('กำลังอัปโหลดรูปหน้าปก...');
    try{
      const res = await hkApiUploadFile(file, hkWizard.tempId, hkWizard.name || 'เครื่องใหม่', 'Cover');
      if(res && res.url) hkWizard.coverImage = res.url;
      else hkToast('อัปโหลดไม่สำเร็จ');
    }catch(err){
      hkToast('อัปโหลดไม่สำเร็จ: ' + err.message);
    }
    hkRenderStep();
  });
  document.getElementById('btn-remove-cover')?.addEventListener('click', () => {
    hkWizard.coverImage = null;
    hkRenderStep();
  });
  hkWireUploadGroups();
}

/* ---------- Step 4: Internal Images ---------- */
function hkStep4Html(){
  return `
    <div class="hk-card hk-card--pad">
      <div class="hk-field__hint" style="margin-bottom:14px;">รูปประกอบโครงสร้างภายในเครื่อง (Internal Use Only) — ไม่ใช่ระบบซ่อม เป็นเพียงรูปอ้างอิง</div>
      ${hkUploadGroupHtml(HK_INTERNAL_GROUPS, 'internalImages')}
    </div>`;
}
function hkWireStep4(){ hkWireUploadGroups(); }

/* ---------- Step 5: Parts List ---------- */
function hkStep5Html(){
  if(hkWizard.parts.length === 0) hkWizard.parts.push(hkNewPartRow());
  const rows = hkWizard.parts.map(row => `
    <div class="hk-parts-row" data-row-id="${row.rowId}">
      <label class="hk-parts-row__thumb">
        <input type="file" accept="image/*" data-part-image="${row.rowId}" style="display:none;">
        ${row.image ? `<img src="${hkDriveImgUrl(row.image)}" alt="">` : hkIcon('image')}
      </label>
      <input type="text" placeholder="ชื่ออะไหล่" value="${hkEscapeHtml(row.name)}" data-part-field="name" data-row-id="${row.rowId}">
      <input type="text" placeholder="ยี่ห้อ" value="${hkEscapeHtml(row.brand)}" data-part-field="brand" data-row-id="${row.rowId}">
      <input type="text" placeholder="รุ่น" value="${hkEscapeHtml(row.model)}" data-part-field="model" data-row-id="${row.rowId}">
      <input type="text" placeholder="หมายเหตุ" value="${hkEscapeHtml(row.note)}" data-part-field="note" data-row-id="${row.rowId}">
      <button type="button" class="hk-parts-row__remove" data-remove-row="${row.rowId}" aria-label="ลบแถว">✕</button>
    </div>`).join('');
  return `
    <div class="hk-card hk-card--pad">
      <div class="hk-field__hint" style="margin-bottom:14px;">รายอะไหล่ภายในตัวเครื่อง — เพิ่มได้เท่าที่ต้องการ (ไม่บังคับ)</div>
      <div class="hk-parts-rows" id="hk-parts-rows">${rows}</div>
      <button type="button" class="hk-btn hk-btn--ghost hk-btn--sm" id="btn-add-part">+ เพิ่มแถวอะไหล่</button>
    </div>`;
}
function hkWireStep5(){
  document.getElementById('btn-add-part')?.addEventListener('click', () => {
    hkWizard.parts.push(hkNewPartRow());
    hkRenderStep();
  });
  document.querySelectorAll('[data-remove-row]').forEach(btn => {
    btn.addEventListener('click', () => {
      hkWizard.parts = hkWizard.parts.filter(r => r.rowId !== btn.dataset.removeRow);
      if(hkWizard.parts.length === 0) hkWizard.parts.push(hkNewPartRow());
      hkRenderStep();
    });
  });
  document.querySelectorAll('[data-part-field]').forEach(input => {
    input.addEventListener('input', (e) => {
      const row = hkWizard.parts.find(r => r.rowId === e.target.dataset.rowId);
      if(row) row[e.target.dataset.partField] = e.target.value;
    });
  });
  document.querySelectorAll('[data-part-image]').forEach(input => {
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const row = hkWizard.parts.find(r => r.rowId === e.target.dataset.partImage);
      if(!row) return;
      hkToast('กำลังอัปโหลดรูปอะไหล่...');
      try{
        const res = await hkApiUploadFile(file, hkWizard.tempId, hkWizard.name || 'เครื่องใหม่', 'Parts');
        if(res && res.url){ row.image = res.url; hkRenderStep(); }
        else hkToast('อัปโหลดไม่สำเร็จ');
      }catch(err){
        hkToast('อัปโหลดไม่สำเร็จ: ' + err.message);
      }
    });
  });
}

/* ---------- Step 6: Documents + Review ---------- */
function hkStep6Html(){
  const docItems = HK_DOCUMENT_TYPES.map(t => {
    const doc = hkWizard.documents[t.key];
    return `
      <div class="hk-doc-upload">
        <div class="hk-doc-upload__icon">${hkIcon('doc')}</div>
        <div class="hk-doc-upload__body">
          <div class="hk-doc-upload__name">${t.label}</div>
          <div class="hk-doc-upload__status">${doc ? hkEscapeHtml(doc.name) : 'ยังไม่มีไฟล์'}</div>
        </div>
        <label class="hk-doc-upload__btn">
          ${doc ? 'เปลี่ยนไฟล์' : 'เลือกไฟล์'}
          <input type="file" style="display:none;" data-doc-upload="${t.key}">
        </label>
      </div>`;
  }).join('');

  const meta = HK_CATEGORIES[hkWizard.category] || {};
  const machineId = nextIdForCategory(hkWizard.category);
  const partsCount = hkWizard.parts.filter(p => p.name.trim()).length;

  return `
    <div class="hk-card hk-card--pad">
      <div class="hk-field__label" style="margin-bottom:14px;">เอกสาร</div>
      <div class="hk-doc-upload-grid">${docItems}</div>
    </div>

    <div class="hk-review-card" style="margin-top:18px;">
      <div class="hk-review-id">
        <div>
          <div style="font-size:12px; color:var(--hk-text-dim);">รหัสเครื่องจักร (สร้างอัตโนมัติ)</div>
          <div class="hk-review-id__code">${machineId || '-'}</div>
        </div>
        <span class="hk-badge hk-badge--gold">${meta.label || '-'}</span>
      </div>
      <h4>สรุปก่อนบันทึก</h4>
      <div class="hk-kv-grid" style="margin-top:0;">
        <div class="hk-kv-grid__item"><div class="hk-kv-grid__label">ชื่อเครื่อง</div><div class="hk-kv-grid__value">${hkEscapeHtml(hkWizard.name || '-')}</div></div>
        <div class="hk-kv-grid__item"><div class="hk-kv-grid__label">ยี่ห้อ / รุ่น</div><div class="hk-kv-grid__value">${hkEscapeHtml(hkWizard.brand || '-')} / ${hkEscapeHtml(hkWizard.model || '-')}</div></div>
        <div class="hk-kv-grid__item"><div class="hk-kv-grid__label">ประเภท</div><div class="hk-kv-grid__value">${hkEscapeHtml(hkWizard.type || '-')}</div></div>
        <div class="hk-kv-grid__item"><div class="hk-kv-grid__label">รายการอะไหล่</div><div class="hk-kv-grid__value">${partsCount} รายการ</div></div>
      </div>
    </div>`;
}
function hkWireStep6(){
  document.querySelectorAll('[data-doc-upload]').forEach(input => {
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if(!file) return;
      hkToast('กำลังอัปโหลดเอกสาร...');
      try{
        const res = await hkApiUploadFile(file, hkWizard.tempId, hkWizard.name || 'เครื่องใหม่', 'Documents');
        if(res && res.url){
          hkWizard.documents[input.dataset.docUpload] = { name: file.name, url: res.url };
          hkRenderStep();
        }else{
          hkToast('อัปโหลดไม่สำเร็จ');
        }
      }catch(err){
        hkToast('อัปโหลดไม่สำเร็จ: ' + err.message);
      }
    });
  });
}

const HK_STEP_RENDERERS = {
  1: { html: hkStep1Html, wire: hkWireStep1, validate: hkValidateStep1 },
  2: { html: hkStep2Html, wire: hkWireStep2, validate: () => true },
  3: { html: hkStep3Html, wire: hkWireStep3, validate: () => true },
  4: { html: hkStep4Html, wire: hkWireStep4, validate: () => true },
  5: { html: hkStep5Html, wire: hkWireStep5, validate: () => true },
  6: { html: hkStep6Html, wire: hkWireStep6, validate: () => true },
};

/* ---------- Main render ---------- */
function hkRenderStep(){
  const root = document.getElementById('hk-wizard-root');
  const stepDef = HK_STEP_RENDERERS[hkWizard.step];
  const isLast = hkWizard.step === HK_WIZARD_STEPS.length;

  root.innerHTML = `
    ${hkStepperHtml()}
    ${stepDef.html()}
    <div class="hk-wizard-nav">
      <button class="hk-btn hk-btn--ghost" id="btn-prev" ${hkWizard.step === 1 ? 'disabled' : ''}>ย้อนกลับ</button>
      <button class="hk-btn hk-btn--primary" id="btn-next">${isLast ? 'บันทึกเครื่องจักร' : 'ถัดไป'}</button>
    </div>`;

  document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = hkIcon(el.getAttribute('data-icon')));
  stepDef.wire();

  document.getElementById('btn-prev').addEventListener('click', () => {
    hkWizard.step = Math.max(1, hkWizard.step - 1);
    hkRenderStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.getElementById('btn-next').addEventListener('click', async () => {
    if(!HK_STEP_RENDERERS[hkWizard.step].validate()) return;
    if(isLast){ await hkSubmitMachine(); return; }
    hkWizard.step = Math.min(HK_WIZARD_STEPS.length, hkWizard.step + 1);
    hkRenderStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ---------- Submit ---------- */
function hkBuildMachinePayload(){
  const images = [];
  HK_GALLERY_GROUPS.filter(g => g.key !== 'cover').forEach(g => {
    (hkWizard.gallery[g.key] || []).forEach(url => images.push({ section: 'Gallery', groupKey: g.key, url }));
  });
  HK_INTERNAL_GROUPS.forEach(g => {
    (hkWizard.internalImages[g.key] || []).forEach(url => images.push({ section: 'Internal', groupKey: g.key, url }));
  });
  if(hkWizard.coverImage) images.push({ section: 'Gallery', groupKey: 'cover', url: hkWizard.coverImage });

  const documents = [];
  HK_DOCUMENT_TYPES.forEach(t => {
    const doc = hkWizard.documents[t.key];
    if(doc) documents.push({ docType: t.key, name: doc.name, url: doc.url || '' });
  });

  const parts = hkWizard.parts
    .filter(p => p.name.trim())
    .map(p => ({ name: p.name.trim(), brand: p.brand.trim(), model: p.model.trim(), note: p.note.trim(), imageUrl: p.image || '' }));

  return {
    category: hkWizard.category,
    name: hkWizard.name.trim(), brand: hkWizard.brand.trim(), model: hkWizard.model.trim(),
    type: hkWizard.type.trim(), description: hkWizard.description.trim(),
    coverImageUrl: hkWizard.coverImage || '',
    specification: hkWizard.specification,
    parts, images, documents,
  };
}

async function hkSubmitMachine(){
  const btn = document.getElementById('btn-next');
  const prevBtn = document.getElementById('btn-prev');
  if(btn){ btn.disabled = true; btn.textContent = 'กำลังบันทึก...'; }
  if(prevBtn) prevBtn.disabled = true;

  const payload = hkBuildMachinePayload();
  try{
    const result = await addMachine(payload);
    hkRenderSuccess({ id: result.id, name: payload.name });
  }catch(err){
    hkToast('บันทึกไม่สำเร็จ: ' + err.message);
    if(btn){ btn.disabled = false; btn.textContent = 'บันทึกเครื่องจักร'; }
    if(prevBtn) prevBtn.disabled = false;
  }
}

function hkRenderSuccess(machine){
  const root = document.getElementById('hk-wizard-root');
  root.innerHTML = `
    <div class="hk-success">
      <div class="hk-success__icon">✓</div>
      <h2>บันทึกเครื่องจักรสำเร็จ</h2>
      <p>เครื่องจักร <strong>${hkEscapeHtml(machine.name)}</strong> (${machine.id}) ถูกเพิ่มเข้าสู่ระบบแล้ว</p>
      <div class="hk-success__actions">
        <a href="machine-detail.html?id=${machine.id}" class="hk-btn hk-btn--primary">ดูรายละเอียดเครื่องจักร</a>
        <a href="index.html" class="hk-btn hk-btn--ghost">ไปที่ Dashboard</a>
        <button class="hk-btn hk-btn--ghost" id="btn-add-another">เพิ่มเครื่องจักรอีกเครื่อง</button>
      </div>
    </div>`;
  document.getElementById('btn-add-another').addEventListener('click', () => {
    hkResetWizard();
    hkRenderStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  hkResetWizard();
  document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = hkIcon(el.getAttribute('data-icon')));
  hkWireSidebarToggle();
  hkRenderStep();

  await hkBootstrapMachines();
  if(HK_LAST_LOAD_ERROR) hkToast('โหลดข้อมูลจากฐานข้อมูลไม่สำเร็จ — รหัสเครื่องที่แสดงอาจไม่ตรงกับของจริง');
});
