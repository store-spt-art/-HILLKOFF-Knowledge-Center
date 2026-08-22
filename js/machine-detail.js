/* =========================================================
   HILLKOFF · machine-detail.js
   ========================================================= */

// Which tab stays selected across re-renders triggered by edits.
let HK_ACTIVE_TAB = 'overview';
// Toggle-based edit mode for the two "whole panel" forms, plus the two
// image-manage modes (Internal Structure / Gallery) — remove (✕) buttons
// and the "+" upload tile only show once someone deliberately turns
// manage mode on, so browsing photos never risks an accidental delete.
let HK_EDIT_STATE = { overview: false, specification: false, internalImages: false, galleryImages: false, internalNotes: false };
// Live Quill editor instance while the internal-notes rich-text form is open.
let HK_QUILL_INSTANCE = null;
// Live Quill editor instance while the Overview description rich-text form is open.
let HK_OVERVIEW_QUILL_INSTANCE = null;
// Per-image NFC visibility list for the current machine's Gallery photos
// (fetched separately from the main machine object — see hkWireNfcPanel).
let HK_NFC_GALLERY_CACHE = null;
// Add/edit state for the Parts List inline form.
let HK_PART_FORM_STATE = { mode: null, partId: null };

function hkRenderSidebarCategoriesDetail(activeCategory){
  const list = document.getElementById('hk-sidebar-categories');
  Object.entries(HK_CATEGORIES).forEach(([key, meta]) => {
    const li = document.createElement('li');
    li.className = 'hk-navitem' + (key === activeCategory ? ' is-active' : '');
    li.innerHTML = `<span class="hk-navitem__icon">${hkIcon(meta.icon)}</span><span>${meta.label}</span>`;
    li.addEventListener('click', () => { window.location.href = `index.html?filter=${key}`; });
    list.appendChild(li);
  });
  document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = hkIcon(el.getAttribute('data-icon')));
}

function hkRenderBreadcrumb(machine){
  const meta = HK_CATEGORIES[machine.category] || {};
  document.getElementById('hk-breadcrumb').innerHTML = `
    <a href="index.html">Dashboard</a>
    <span class="hk-breadcrumb__sep">/</span>
    <a href="index.html?filter=${machine.category}">${meta.label || machine.category}</a>
    <span class="hk-breadcrumb__sep">/</span>
    <span style="color:var(--hk-text);">${hkEscapeHtml(machine.name)}</span>`;
}

function hkRenderHeader(machine){
  const meta = HK_CATEGORIES[machine.category] || {};
  const media = machine.coverImage
    ? `<img src="${hkDriveImgUrl(machine.coverImage)}" alt="${hkEscapeHtml(machine.name)}">`
    : hkIcon(meta.icon);
  return `
    <div class="hk-dheader">
      <div class="hk-dheader__media">${media}</div>
      <div class="hk-dheader__body">
        <div class="hk-dheader__top">
          <span class="hk-badge hk-badge--gold">${meta.label || machine.category}</span>
          <span class="hk-badge mono">${machine.id}</span>
          <span id="hk-header-approval-badge">${hkApprovalStatusBadgeHtml(machine)}</span>
        </div>
        <h1 class="hk-dheader__name">${hkEscapeHtml(machine.name)}</h1>
        <p style="margin:0;">${hkEscapeHtml(machine.type || '')}</p>
        <div class="hk-dheader__meta">
          <div class="hk-dheader__meta-item">
            <div class="hk-dheader__meta-label">ยี่ห้อ</div>
            <div class="hk-dheader__meta-value">${hkEscapeHtml(machine.brand || '-')}</div>
          </div>
          <div class="hk-dheader__meta-item">
            <div class="hk-dheader__meta-label">รุ่น</div>
            <div class="hk-dheader__meta-value">${hkEscapeHtml(machine.model || '-')}</div>
          </div>
          <div class="hk-dheader__meta-item">
            <div class="hk-dheader__meta-label">ประเภท</div>
            <div class="hk-dheader__meta-value">${hkEscapeHtml(machine.type || '-')}</div>
          </div>
          <div class="hk-dheader__meta-item">
            <div class="hk-dheader__meta-label">รหัส BC</div>
            <div class="hk-dheader__meta-value">${hkEscapeHtml(machine.bcCode || '-')}</div>
          </div>
        </div>
      </div>
    </div>`;
}

const HK_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'specification', label: 'Specification' },
  { key: 'internal', label: 'Internal Structure' },
  { key: 'parts', label: 'Parts List' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'documents', label: 'Documents' },
  { key: 'nfc', label: 'NFC' },
  { key: 'ai', label: 'AI Assistant' },
];

function hkPanelOverview(m){
  if(HK_EDIT_STATE.overview) return hkOverviewEditFormHtml(m);
  const plain = (m.description || '').replace(/<[^>]*>/g, '').trim();
  return `
    <div class="hk-panel-actionbar">
      <button type="button" class="hk-btn hk-btn--ghost hk-btn--sm" data-edit-overview>✎ แก้ไขข้อมูลเครื่อง</button>
    </div>
    <div class="hk-overview-description ql-editor">
      ${plain ? m.description : '<p class="hk-internal-notes__empty">ยังไม่มีคำอธิบายสำหรับเครื่องจักรนี้</p>'}
    </div>
    <div class="hk-kv-grid">
      <div class="hk-kv-grid__item"><div class="hk-kv-grid__label">ชื่อเครื่อง</div><div class="hk-kv-grid__value">${hkEscapeHtml(m.name)}</div></div>
      <div class="hk-kv-grid__item"><div class="hk-kv-grid__label">ยี่ห้อ</div><div class="hk-kv-grid__value">${hkEscapeHtml(m.brand || '-')}</div></div>
      <div class="hk-kv-grid__item"><div class="hk-kv-grid__label">รุ่น</div><div class="hk-kv-grid__value">${hkEscapeHtml(m.model || '-')}</div></div>
      <div class="hk-kv-grid__item"><div class="hk-kv-grid__label">ประเภท</div><div class="hk-kv-grid__value">${hkEscapeHtml(m.type || '-')}</div></div>
      <div class="hk-kv-grid__item"><div class="hk-kv-grid__label">รหัส BC</div><div class="hk-kv-grid__value">${hkEscapeHtml(m.bcCode || '-')}</div></div>
    </div>`;
}

function hkOverviewEditFormHtml(m){
  const catOptions = Object.entries(HK_CATEGORIES).map(([key, meta]) =>
    `<option value="${key}" ${m.category === key ? 'selected' : ''}>${meta.label}</option>`).join('');
  const coverPreview = m.coverImage
    ? `<div class="hk-cover-preview"><img src="${hkDriveImgUrl(m.coverImage)}" alt=""><button type="button" class="hk-cover-preview__remove" data-edit-cover-remove>✕</button></div>`
    : '';
  return `
    <div style="max-width:640px;">
      <div class="hk-row2">
        <div class="hk-field">
          <label class="hk-field__label">หมวดหมู่</label>
          <select class="hk-select" id="hk-edit-category">${catOptions}</select>
        </div>
        <div class="hk-field">
          <label class="hk-field__label">ชื่อเครื่อง</label>
          <input class="hk-input" id="hk-edit-name" type="text" value="${hkEscapeHtml(m.name)}">
        </div>
      </div>
      <div class="hk-row2">
        <div class="hk-field">
          <label class="hk-field__label">ยี่ห้อ</label>
          <input class="hk-input" id="hk-edit-brand" type="text" value="${hkEscapeHtml(m.brand || '')}">
        </div>
        <div class="hk-field">
          <label class="hk-field__label">รุ่น</label>
          <input class="hk-input" id="hk-edit-model" type="text" value="${hkEscapeHtml(m.model || '')}">
        </div>
      </div>
      <div class="hk-field">
        <label class="hk-field__label">ประเภท</label>
        <input class="hk-input" id="hk-edit-type" type="text" value="${hkEscapeHtml(m.type || '')}">
      </div>
      <div class="hk-field">
        <label class="hk-field__label">รหัส BC</label>
        <input class="hk-input" id="hk-edit-bccode" type="text" value="${hkEscapeHtml(m.bcCode || '')}" placeholder="เช่น BC-10234">
      </div>
      <div class="hk-field">
        <label class="hk-field__label">คำอธิบาย</label>
        <div id="hk-edit-description-wrap" class="hk-quill-wrap">
          <div id="hk-edit-description-editor"></div>
        </div>
      </div>
      <div class="hk-field">
        <label class="hk-field__label">รูปหน้าปก</label>
        ${coverPreview}
        <label class="hk-dropzone" style="display:block;">
          <div class="hk-dropzone__icon">${hkIcon('image')}</div>
          <div>คลิกเพื่อเลือกรูปใหม่</div>
          <input type="file" id="hk-edit-cover-input" accept="image/*">
        </label>
      </div>
      <div class="hk-wizard-nav">
        <button type="button" class="hk-btn hk-btn--ghost" id="hk-edit-overview-cancel">ยกเลิก</button>
        <button type="button" class="hk-btn hk-btn--primary" id="hk-edit-overview-save">บันทึก</button>
      </div>
    </div>`;
}

function hkWireOverviewPanel(machine){
  const panel = document.querySelector('.hk-tabpanel[data-panel="overview"]');
  if(!panel) return;
  let pendingRemoveCover = false;

  const editBtn = panel.querySelector('[data-edit-overview]');
  if(editBtn) editBtn.addEventListener('click', () => {
    HK_EDIT_STATE.overview = true;
    hkRerenderPanel(machine, 'overview');
  });

  const cancelBtn = panel.querySelector('#hk-edit-overview-cancel');
  if(cancelBtn) cancelBtn.addEventListener('click', () => {
    HK_EDIT_STATE.overview = false;
    HK_OVERVIEW_QUILL_INSTANCE = null;
    hkRerenderPanel(machine, 'overview');
  });

  const removeCoverBtn = panel.querySelector('[data-edit-cover-remove]');
  if(removeCoverBtn) removeCoverBtn.addEventListener('click', () => {
    pendingRemoveCover = true;
    removeCoverBtn.closest('.hk-cover-preview').style.display = 'none';
  });

  const saveBtn = panel.querySelector('#hk-edit-overview-save');
  if(saveBtn) saveBtn.addEventListener('click', async () => {
    const name = panel.querySelector('#hk-edit-name').value.trim();
    if(!name){ hkToast('กรุณาระบุชื่อเครื่อง'); return; }
    const category = panel.querySelector('#hk-edit-category').value;
    const brand = panel.querySelector('#hk-edit-brand').value.trim();
    const model = panel.querySelector('#hk-edit-model').value.trim();
    const type = panel.querySelector('#hk-edit-type').value.trim();
    const bcCode = panel.querySelector('#hk-edit-bccode').value.trim();
    const description = HK_OVERVIEW_QUILL_INSTANCE ? HK_OVERVIEW_QUILL_INSTANCE.root.innerHTML : (machine.description || '');
    const fileInput = panel.querySelector('#hk-edit-cover-input');
    const file = fileInput.files && fileInput.files[0];
    try{
      let coverImage;
      if(file){
        const uploadRes = await hkApiUploadFile(file, machine.id, name, 'Cover');
        if(uploadRes && uploadRes.error) throw new Error(uploadRes.error);
        coverImage = uploadRes.url;
      }else if(pendingRemoveCover){
        coverImage = '';
      }
      await updateMachineInfo(machine.id, { category, name, brand, model, type, bcCode, description, coverImage });
      if(HK_LAST_SAVE_ERROR) hkToast('บันทึกไว้ในเครื่องนี้ชั่วคราว (บันทึกไปยังฐานข้อมูลไม่สำเร็จ)');
      HK_EDIT_STATE.overview = false;
      HK_OVERVIEW_QUILL_INSTANCE = null;
      hkRenderBreadcrumb(machine);
      hkRenderDetail(machine);
    }catch(err){ hkToast(err.message || 'บันทึกไม่สำเร็จ'); }
  });

  const editorEl = panel.querySelector('#hk-edit-description-editor');
  if(editorEl && window.Quill){
    HK_OVERVIEW_QUILL_INSTANCE = new Quill(editorEl, {
      theme: 'snow',
      placeholder: 'คำอธิบายเครื่องจักรโดยย่อ...',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ align: [] }],
          ['blockquote', 'code-block'],
          ['link'],
          ['clean'],
        ],
      },
    });
    HK_OVERVIEW_QUILL_INSTANCE.root.innerHTML = machine.description || '';
  }
}

function hkPanelSpecification(m){
  if(HK_EDIT_STATE.specification) return hkSpecEditFormHtml(m);
  const rows = HK_SPEC_FIELDS.map(f => `
    <tr><td>${f.label}</td><td>${hkEscapeHtml(m.specification?.[f.key] || '-')}</td></tr>`).join('');
  return `
    <div class="hk-panel-actionbar">
      <button type="button" class="hk-btn hk-btn--ghost hk-btn--sm" data-edit-spec>✎ แก้ไข Specification</button>
    </div>
    <div class="hk-table-scroll"><table class="hk-spec-table"><tbody>${rows}</tbody></table></div>`;
}

function hkSpecEditFormHtml(m){
  const rows = HK_SPEC_FIELDS.map(f => `
    <tr>
      <td>${f.label}</td>
      <td><input class="hk-input" style="font-family:var(--hk-font-mono);" data-spec-field="${f.key}" value="${hkEscapeHtml(m.specification?.[f.key] || '')}"></td>
    </tr>`).join('');
  return `
    <div class="hk-table-scroll"><table class="hk-spec-table"><tbody>${rows}</tbody></table></div>
    <div class="hk-wizard-nav">
      <button type="button" class="hk-btn hk-btn--ghost" data-edit-spec-cancel>ยกเลิก</button>
      <button type="button" class="hk-btn hk-btn--primary" data-edit-spec-save>บันทึก</button>
    </div>`;
}

function hkWireSpecificationPanel(machine){
  const panel = document.querySelector('.hk-tabpanel[data-panel="specification"]');
  if(!panel) return;

  const editBtn = panel.querySelector('[data-edit-spec]');
  if(editBtn) editBtn.addEventListener('click', () => {
    HK_EDIT_STATE.specification = true;
    hkRerenderPanel(machine, 'specification');
  });

  const cancelBtn = panel.querySelector('[data-edit-spec-cancel]');
  if(cancelBtn) cancelBtn.addEventListener('click', () => {
    HK_EDIT_STATE.specification = false;
    hkRerenderPanel(machine, 'specification');
  });

  const saveBtn = panel.querySelector('[data-edit-spec-save]');
  if(saveBtn) saveBtn.addEventListener('click', async () => {
    const spec = {};
    panel.querySelectorAll('[data-spec-field]').forEach(input => { spec[input.dataset.specField] = input.value.trim(); });
    try{
      await updateSpecification(machine.id, spec);
      if(HK_LAST_SAVE_ERROR) hkToast('บันทึกไว้ในเครื่องนี้ชั่วคราว (บันทึกไปยังฐานข้อมูลไม่สำเร็จ)');
      HK_EDIT_STATE.specification = false;
      hkRerenderPanel(machine, 'specification');
    }catch(err){ hkToast(err.message || 'บันทึกไม่สำเร็จ'); }
  });
}

function hkImageGroupsHtml(groups, data, section, managing){
  return groups.map(g => {
    const items = (data?.[g.key] || []);
    const tiles = items.map(url => `
      <div class="hk-imgtile">
        <img src="${hkDriveImgUrl(url)}" alt="" data-img-view data-url="${hkEscapeHtml(url)}">
        ${managing ? `<button type="button" class="hk-thumb__remove" data-img-remove data-section="${section}" data-group="${g.key}" data-url="${hkEscapeHtml(url)}" aria-label="ลบรูป">✕</button>` : ''}
      </div>`).join('');
    const addTile = managing ? `
      <label class="hk-imgtile hk-imgtile--add">
        ${hkIcon('add')}
        <input type="file" accept="image/*" multiple data-img-add data-section="${section}" data-group="${g.key}">
      </label>` : '';
    const emptyNote = (!managing && items.length === 0)
      ? `<div class="hk-imgtile hk-imgtile--empty">${hkIcon('image')}<span>ไม่มีรูป</span></div>` : '';
    return `
      <div class="hk-imggroup">
        <div class="hk-imggroup__label">${g.label}</div>
        <div class="hk-imggroup__grid">${tiles}${addTile}${emptyNote}</div>
      </div>`;
  }).join('');
}

// Shared lightbox — reuses the same backdrop element hkOpenPartModal
// uses, so only one popup can ever be open at a time.
function hkOpenImageLightbox(url){
  let backdrop = document.querySelector('.hk-modal-backdrop');
  if(!backdrop){
    backdrop = document.createElement('div');
    backdrop.className = 'hk-modal-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', (e) => { if(e.target === backdrop) backdrop.classList.remove('is-visible'); });
  }
  backdrop.innerHTML = `
    <div class="hk-modal hk-modal--lightbox">
      <button class="hk-modal__close" data-close-modal>✕</button>
      <img class="hk-lightbox-img" src="${hkDriveImgUrl(url)}" alt="">
    </div>`;
  backdrop.querySelector('[data-close-modal]').addEventListener('click', () => backdrop.classList.remove('is-visible'));
  backdrop.classList.add('is-visible');
}

function hkWireImagePanel(machine, panelKey){
  const panel = document.querySelector(`.hk-tabpanel[data-panel="${panelKey}"]`);
  if(!panel) return;
  const stateKey = panelKey === 'internal' ? 'internalImages' : 'galleryImages';

  const manageToggle = panel.querySelector('[data-img-manage-toggle]');
  if(manageToggle) manageToggle.addEventListener('click', () => {
    HK_EDIT_STATE[stateKey] = !HK_EDIT_STATE[stateKey];
    hkRerenderPanel(machine, panelKey);
  });

  panel.querySelectorAll('[data-img-add]').forEach(input => {
    input.addEventListener('change', async () => {
      const section = input.dataset.section;
      const group = input.dataset.group;
      const files = Array.from(input.files || []);
      if(!files.length) return;
      for(const file of files){
        try{ await addImageToMachine(machine.id, section, group, file); }
        catch(err){ hkToast(err.message || 'อัปโหลดไม่สำเร็จ'); }
      }
      if(HK_LAST_SAVE_ERROR) hkToast('บันทึกไว้ในเครื่องนี้ชั่วคราว (บันทึกไปยังฐานข้อมูลไม่สำเร็จ)');
      hkRerenderPanel(machine, panelKey);
    });
  });

  panel.querySelectorAll('[data-img-remove]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if(!confirm('ลบรูปนี้? การลบไม่สามารถย้อนกลับได้')) return;
      try{ await removeImageFromMachine(machine.id, btn.dataset.section, btn.dataset.group, btn.dataset.url); }
      catch(err){ hkToast(err.message || 'ลบไม่สำเร็จ'); }
      if(HK_LAST_SAVE_ERROR) hkToast('บันทึกไว้ในเครื่องนี้ชั่วคราว (บันทึกไปยังฐานข้อมูลไม่สำเร็จ)');
      hkRerenderPanel(machine, panelKey);
    });
  });

  panel.querySelectorAll('[data-img-view]').forEach(img => {
    img.addEventListener('click', () => hkOpenImageLightbox(img.dataset.url));
  });
}

function hkPanelInternal(m){
  const managing = HK_EDIT_STATE.internalImages;
  return `
    <div class="hk-internal-note">🔒 Internal Use Only — สำหรับทีมช่างภายในเท่านั้น (เป็นเพียงรูปประกอบ ไม่มีระบบซ่อม)</div>
    <div id="hk-internal-notes-root">${hkInternalNotesSectionHtml(m)}</div>
    <div class="hk-panel-actionbar">
      <button type="button" class="hk-btn ${managing ? 'hk-btn--primary' : 'hk-btn--ghost'} hk-btn--sm" data-img-manage-toggle>
        ${managing ? '✓ เสร็จสิ้น' : '✎ จัดการรูปภาพ'}
      </button>
    </div>
    ${hkImageGroupsHtml(HK_INTERNAL_GROUPS, m.internalImages, 'Internal', managing)}
    <div id="hk-approval-root"></div>`;
}

// "การประเมินเชิงลึกจากช่าง" — a free-form, richly-formatted technical
// assessment (headings, bold, lists, alignment — like typing in Word),
// separate from the plain-text description on the Overview tab. Stored
// as HTML from the Quill editor.
function hkInternalNotesSectionHtml(m){
  if(HK_EDIT_STATE.internalNotes){
    return `
      <div class="hk-internal-notes">
        <div class="hk-internal-notes__head">
          <div class="hk-internal-notes__title">การประเมินเชิงลึกจากช่าง</div>
        </div>
        <div id="hk-internal-notes-editor-wrap" class="hk-quill-wrap">
          <div id="hk-internal-notes-editor"></div>
        </div>
        <div class="hk-wizard-nav">
          <button type="button" class="hk-btn hk-btn--ghost" data-notes-cancel>ยกเลิก</button>
          <button type="button" class="hk-btn hk-btn--primary" data-notes-save>บันทึก</button>
        </div>
      </div>`;
  }
  const plain = (m.internalNotes || '').replace(/<[^>]*>/g, '').trim();
  return `
    <div class="hk-internal-notes">
      <div class="hk-internal-notes__head">
        <div class="hk-internal-notes__title">การประเมินเชิงลึกจากช่าง</div>
        <button type="button" class="hk-btn hk-btn--ghost hk-btn--sm" data-notes-edit>✎ แก้ไข</button>
      </div>
      <div class="hk-internal-notes__body ql-editor">
        ${plain ? m.internalNotes : '<p class="hk-internal-notes__empty">ยังไม่มีข้อมูลการประเมิน</p>'}
      </div>
    </div>`;
}

function hkWireInternalNotesPanel(machine){
  const root = document.getElementById('hk-internal-notes-root');
  if(!root) return;

  const editBtn = root.querySelector('[data-notes-edit]');
  if(editBtn) editBtn.addEventListener('click', () => {
    HK_EDIT_STATE.internalNotes = true;
    hkRerenderInternalNotes(machine);
  });

  const cancelBtn = root.querySelector('[data-notes-cancel]');
  if(cancelBtn) cancelBtn.addEventListener('click', () => {
    HK_EDIT_STATE.internalNotes = false;
    HK_QUILL_INSTANCE = null;
    hkRerenderInternalNotes(machine);
  });

  const saveBtn = root.querySelector('[data-notes-save]');
  if(saveBtn) saveBtn.addEventListener('click', async () => {
    const html = HK_QUILL_INSTANCE ? HK_QUILL_INSTANCE.root.innerHTML : (machine.internalNotes || '');
    try{
      await updateInternalNotes(machine.id, html);
      if(HK_LAST_SAVE_ERROR) hkToast('บันทึกไว้ในเครื่องนี้ชั่วคราว (บันทึกไปยังฐานข้อมูลไม่สำเร็จ)');
      HK_EDIT_STATE.internalNotes = false;
      HK_QUILL_INSTANCE = null;
      hkRerenderInternalNotes(machine);
    }catch(err){ hkToast(err.message || 'บันทึกไม่สำเร็จ'); }
  });

  const editorEl = root.querySelector('#hk-internal-notes-editor');
  if(editorEl && window.Quill){
    HK_QUILL_INSTANCE = new Quill(editorEl, {
      theme: 'snow',
      placeholder: 'พิมพ์รายละเอียดการประเมินเชิงลึก...',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ align: [] }],
          ['blockquote', 'code-block'],
          ['link'],
          ['clean'],
        ],
      },
    });
    HK_QUILL_INSTANCE.root.innerHTML = machine.internalNotes || '';
  }
}

function hkRerenderInternalNotes(machine){
  const root = document.getElementById('hk-internal-notes-root');
  if(!root) return;
  root.innerHTML = hkInternalNotesSectionHtml(machine);
  hkWireInternalNotesPanel(machine);
}

/* ---------- Machine evaluation / approval-to-sell ---------- */

function hkApprovalStatusBadgeHtml(m){
  const status = hkApprovalStatus(m);
  const label = status === 'approved' ? '✓ อนุมัตินำเข้าขายแล้ว' : status === 'rejected' ? '✕ ไม่อนุมัติ' : '⏳ รอการอนุมัติ';
  return `<span class="hk-approval-status hk-approval-status--${status}">${label}</span>`;
}

function hkApprovalDeptHtml(m, dept){
  const sigs = (m.approval?.departments?.[dept.key]) || [];
  const locked = hkIsApprovalLocked(m);
  const complete = sigs.length >= dept.required;
  const list = sigs.length
    ? sigs.map((s, i) => {
        const nameLine = dept.extraField && s[dept.extraField.key]
          ? `${hkEscapeHtml(s.name)} <span class="hk-approval-sig__subdept">(${hkEscapeHtml(s[dept.extraField.key])})</span>`
          : hkEscapeHtml(s.name);
        const commentLine = s.comment
          ? `<div class="hk-approval-sig__comment">${hkEscapeHtml(s.comment)}</div>`
          : '';
        return `
        <div class="hk-approval-sig">
          <div class="hk-approval-sig__row">
            <span><span class="hk-approval-sig__name">${nameLine}</span> <span class="hk-approval-sig__date">${hkEscapeHtml(s.date)}</span></span>
            ${locked ? '' : `<button type="button" class="hk-approval-sig__remove" data-approval-remove data-dept="${dept.key}" data-index="${i}" aria-label="ลบรายชื่อ">✕</button>`}
          </div>
          ${commentLine}
        </div>`;
      }).join('')
    : `<div class="hk-approval-sig-empty">ยังไม่มีผู้ลงชื่อ</div>`;
  const need = dept.atLeast ? `อย่างน้อย ${dept.required} คน` : `${dept.required} คน`;
  const extraInput = dept.extraField
    ? `<input type="text" placeholder="${dept.extraField.label}" data-approval-extra>`
    : '';
  const form = locked ? '' : `
    <div class="hk-approval-dept__form" data-approval-form data-dept="${dept.key}">
      <input type="text" placeholder="ชื่อผู้ประเมิน" data-approval-name>
      ${extraInput}
      <input type="date" data-approval-date>
      <textarea placeholder="ข้อความการประเมิน" data-approval-comment rows="2"></textarea>
      <button type="button" class="hk-btn hk-btn--ghost hk-btn--sm" data-approval-add data-dept="${dept.key}">+ ลงชื่อ</button>
    </div>`;
  return `
    <div class="hk-approval-dept${complete ? ' is-complete' : ''}">
      <div class="hk-approval-dept__head">
        <div class="hk-approval-dept__label">${dept.label}</div>
        <div class="hk-approval-dept__count${complete ? ' is-complete' : ''}">${sigs.length}/${need}</div>
      </div>
      <div class="hk-approval-sig-list">${list}</div>
      ${form}
    </div>`;
}

function hkApprovalMdHtml(m){
  const md = m.approval?.mdApproval;
  const locked = hkIsApprovalLocked(m);
  if(md && locked){
    return `
      <div class="hk-approval-md is-approved">
        <div class="hk-approval-md__label">${HK_MD_APPROVAL_LABEL}</div>
        <div class="hk-approval-md__signed">✅ อนุมัติโดย <strong>${hkEscapeHtml(md.name)}</strong> <span class="hk-approval-sig__date">${hkEscapeHtml(md.date)}</span></div>
        ${md.comment ? `<div class="hk-approval-sig__comment">${hkEscapeHtml(md.comment)}</div>` : ''}
      </div>`;
  }
  const ready = hkApprovalDepartmentsComplete(m.approval);
  const wasRejected = md && md.decision === 'rejected';
  const rejectedNote = wasRejected ? `
    <div class="hk-approval-md__rejected-note">
      ❌ ไม่อนุมัติล่าสุดโดย <strong>${hkEscapeHtml(md.name)}</strong> <span class="hk-approval-sig__date">${hkEscapeHtml(md.date)}</span>
      ${md.comment ? `<div class="hk-approval-sig__comment">${hkEscapeHtml(md.comment)}</div>` : ''}
    </div>` : '';
  return `
    <div class="hk-approval-md${wasRejected ? ' is-rejected' : ''}">
      <div class="hk-approval-md__label">${HK_MD_APPROVAL_LABEL}</div>
      ${rejectedNote}
      <p class="hk-approval-md__hint">${ready ? 'ทุกแผนกลงชื่อครบแล้ว พร้อมให้ผู้บริหาร/MD พิจารณา' : 'ต้องรอให้ทุกแผนกด้านบนลงชื่อครบก่อน จึงจะอนุมัติได้ (กด "ไม่อนุมัติ" ได้ทันทีโดยไม่ต้องรอ)'}</p>
      <div class="hk-approval-dept__form" data-approval-md-form>
        <input type="text" placeholder="ชื่อผู้พิจารณา" data-approval-md-name>
        <input type="date" data-approval-md-date>
        <textarea placeholder="ข้อความการประเมิน / ความเห็น (จำเป็นถ้าเลือกไม่อนุมัติ)" data-approval-md-comment rows="2"></textarea>
        <div class="hk-approval-md__actions">
          <button type="button" class="hk-btn hk-btn--danger hk-btn--sm" data-approval-md-decision="rejected">✕ ไม่อนุมัติ</button>
          <button type="button" class="hk-btn hk-btn--primary hk-btn--sm" data-approval-md-decision="approved" ${ready ? '' : 'disabled'}>อนุมัตินำเข้าขาย</button>
        </div>
      </div>
    </div>`;
}

function hkApprovalSectionHtml(m){
  const locked = hkIsApprovalLocked(m);
  const lockedNote = locked
    ? `<div class="hk-approval-locked-note">🔒 อนุมัติแล้ว — ไม่สามารถแก้ไขรายชื่อผู้ประเมินได้อีก</div>`
    : '';
  return `
    <div class="hk-approval">
      <div class="hk-approval__head">
        <h3 class="hk-approval__title">การประเมิน &amp; อนุมัตินำเข้าขาย</h3>
        ${hkApprovalStatusBadgeHtml(m)}
      </div>
      ${lockedNote}
      <div class="hk-approval-grid">
        ${HK_APPROVAL_DEPARTMENTS.map(d => hkApprovalDeptHtml(m, d)).join('')}
      </div>
      ${hkApprovalMdHtml(m)}
    </div>`;
}

function hkRenderApprovalSection(machine){
  const root = document.getElementById('hk-approval-root');
  if(!root) return;
  root.innerHTML = hkApprovalSectionHtml(machine);
  hkWireApprovalSection(machine);
}

function hkWireApprovalSection(machine){
  const root = document.getElementById('hk-approval-root');
  if(!root) return;

  root.querySelectorAll('[data-approval-add]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const dept = btn.dataset.dept;
      const form = root.querySelector(`[data-approval-form][data-dept="${dept}"]`);
      const name = form.querySelector('[data-approval-name]').value.trim();
      const date = form.querySelector('[data-approval-date]').value;
      const comment = form.querySelector('[data-approval-comment]').value.trim();
      const extraEl = form.querySelector('[data-approval-extra]');
      const deptMeta = HK_APPROVAL_DEPARTMENTS.find(d => d.key === dept);
      if(!name){ hkToast('กรุณาระบุชื่อผู้ประเมิน'); return; }
      if(extraEl && deptMeta?.extraField && !extraEl.value.trim()){ hkToast(`กรุณาระบุ${deptMeta.extraField.label}`); return; }
      const fields = { name, date, comment };
      if(extraEl && deptMeta?.extraField) fields[deptMeta.extraField.key] = extraEl.value.trim();
      try{
        await addApprovalSignature(machine.id, dept, fields);
        if(HK_LAST_APPROVAL_SAVE_ERROR) hkToast('บันทึกไว้ในเครื่องนี้ชั่วคราว (บันทึกไปยังฐานข้อมูลไม่สำเร็จ)');
        hkRenderApprovalSection(machine);
      }catch(err){ hkToast(err.message || 'เกิดข้อผิดพลาด'); }
    });
  });

  root.querySelectorAll('[data-approval-remove]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const dept = btn.dataset.dept;
      const index = parseInt(btn.dataset.index, 10);
      try{
        await removeApprovalSignature(machine.id, dept, index);
        hkRenderApprovalSection(machine);
      }catch(err){ hkToast(err.message || 'เกิดข้อผิดพลาด'); }
    });
  });

  root.querySelectorAll('[data-approval-md-decision]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const decision = btn.dataset.approvalMdDecision; // 'approved' | 'rejected'
      const name = root.querySelector('[data-approval-md-name]').value.trim();
      const date = root.querySelector('[data-approval-md-date]').value;
      const comment = root.querySelector('[data-approval-md-comment]').value.trim();
      if(!name){ hkToast('กรุณาระบุชื่อผู้พิจารณา'); return; }
      if(decision === 'rejected' && !comment){ hkToast('กรุณาระบุเหตุผลที่ไม่อนุมัติ'); return; }
      const confirmMsg = decision === 'approved'
        ? 'ยืนยันการอนุมัตินำเข้าขาย? หลังจากนี้จะไม่สามารถแก้ไขรายชื่อผู้ประเมินได้อีก'
        : 'ยืนยันการไม่อนุมัติ?';
      if(!confirm(confirmMsg)) return;
      try{
        await setMdDecision(machine.id, decision, name, date, comment);
        if(HK_LAST_APPROVAL_SAVE_ERROR) hkToast('บันทึกไว้ในเครื่องนี้ชั่วคราว (บันทึกไปยังฐานข้อมูลไม่สำเร็จ)');
        hkRenderApprovalSection(machine);
        hkUpdateHeaderApprovalBadge(machine);
      }catch(err){ hkToast(err.message || 'เกิดข้อผิดพลาด'); }
    });
  });
}

// Keeps the top badge next to the machine name in sync after MD approval,
// without re-rendering the whole detail page (which would reset tabs).
function hkUpdateHeaderApprovalBadge(machine){
  const badge = document.getElementById('hk-header-approval-badge');
  if(badge) badge.innerHTML = hkApprovalStatusBadgeHtml(machine);
}

function hkPanelGallery(m){
  const managing = HK_EDIT_STATE.galleryImages;
  return `
    <div class="hk-panel-actionbar">
      <button type="button" class="hk-btn ${managing ? 'hk-btn--primary' : 'hk-btn--ghost'} hk-btn--sm" data-img-manage-toggle>
        ${managing ? '✓ เสร็จสิ้น' : '✎ จัดการรูปภาพ'}
      </button>
    </div>
    ${hkImageGroupsHtml(HK_GALLERY_GROUPS, m.gallery, 'Gallery', managing)}`;
}

function hkPanelParts(m){
  const rows = (m.parts || []).map(p => `
    <tr data-part-id="${p.id || ''}">
      <td><div class="hk-parts-thumb">${p.image ? `<img src="${hkDriveImgUrl(p.image)}" alt="">` : hkIcon('image')}</div></td>
      <td>${hkEscapeHtml(p.name)}</td>
      <td>${hkEscapeHtml(p.brand || '-')}</td>
      <td>${hkEscapeHtml(p.model || '-')}</td>
      <td>${hkEscapeHtml(p.note || '-')}</td>
      <td style="white-space:nowrap;">
        <button type="button" class="hk-btn hk-btn--ghost hk-btn--sm" data-part-edit data-id="${p.id || ''}">แก้ไข</button>
        <button type="button" class="hk-btn hk-btn--danger hk-btn--sm" data-part-delete data-id="${p.id || ''}">ลบ</button>
      </td>
    </tr>`).join('');
  const table = (m.parts && m.parts.length)
    ? `<div class="hk-table-scroll"><table class="hk-parts-table"><thead><tr><th>รูป</th><th>ชื่ออะไหล่</th><th>ยี่ห้อ</th><th>รุ่น</th><th>หมายเหตุ</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`
    : `<div class="hk-empty"><div class="hk-empty__icon">🔧</div><h3>ยังไม่มีรายการอะไหล่</h3></div>`;
  return `
    <div class="hk-panel-actionbar">
      <button type="button" class="hk-btn hk-btn--primary hk-btn--sm" data-part-add-toggle>+ เพิ่มอะไหล่</button>
    </div>
    ${hkPartFormHtml(m)}
    ${table}`;
}

function hkPartFormHtml(m){
  if(!HK_PART_FORM_STATE.mode) return '';
  const editing = HK_PART_FORM_STATE.mode === 'edit';
  const part = editing ? (m.parts || []).find(p => p.id === HK_PART_FORM_STATE.partId) : null;
  const preview = part && part.image
    ? `<div class="hk-cover-preview" style="width:80px;height:80px;"><img src="${hkDriveImgUrl(part.image)}" alt=""></div>` : '';
  return `
    <div class="hk-review-card" id="hk-part-form">
      <h4>${editing ? 'แก้ไขอะไหล่' : 'เพิ่มอะไหล่'}</h4>
      <div class="hk-row2">
        <div class="hk-field"><label class="hk-field__label">ชื่ออะไหล่</label><input class="hk-input" id="hk-part-name" value="${hkEscapeHtml(part?.name || '')}"></div>
        <div class="hk-field"><label class="hk-field__label">ยี่ห้อ</label><input class="hk-input" id="hk-part-brand" value="${hkEscapeHtml(part?.brand || '')}"></div>
      </div>
      <div class="hk-row2">
        <div class="hk-field"><label class="hk-field__label">รุ่น</label><input class="hk-input" id="hk-part-model" value="${hkEscapeHtml(part?.model || '')}"></div>
        <div class="hk-field"><label class="hk-field__label">หมายเหตุ</label><input class="hk-input" id="hk-part-note" value="${hkEscapeHtml(part?.note || '')}"></div>
      </div>
      <div class="hk-field">
        <label class="hk-field__label">รูปอะไหล่</label>
        ${preview}
        <input type="file" accept="image/*" id="hk-part-image">
      </div>
      <div class="hk-wizard-nav">
        <button type="button" class="hk-btn hk-btn--ghost" id="hk-part-form-cancel">ยกเลิก</button>
        <button type="button" class="hk-btn hk-btn--primary" id="hk-part-form-save">บันทึก</button>
      </div>
    </div>`;
}

function hkWirePartsPanel(machine){
  const panel = document.querySelector('.hk-tabpanel[data-panel="parts"]');
  if(!panel) return;

  const addToggle = panel.querySelector('[data-part-add-toggle]');
  if(addToggle) addToggle.addEventListener('click', () => {
    HK_PART_FORM_STATE = { mode: 'add', partId: null };
    hkRerenderPanel(machine, 'parts');
  });

  panel.querySelectorAll('[data-part-edit]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      HK_PART_FORM_STATE = { mode: 'edit', partId: btn.dataset.id };
      hkRerenderPanel(machine, 'parts');
    });
  });

  panel.querySelectorAll('[data-part-delete]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if(!confirm('ลบอะไหล่นี้?')) return;
      try{ await removePartFromMachine(machine.id, btn.dataset.id); }
      catch(err){ hkToast(err.message || 'ลบไม่สำเร็จ'); }
      if(HK_LAST_SAVE_ERROR) hkToast('บันทึกไว้ในเครื่องนี้ชั่วคราว (บันทึกไปยังฐานข้อมูลไม่สำเร็จ)');
      hkRerenderPanel(machine, 'parts');
    });
  });

  const cancelBtn = panel.querySelector('#hk-part-form-cancel');
  if(cancelBtn) cancelBtn.addEventListener('click', () => {
    HK_PART_FORM_STATE = { mode: null, partId: null };
    hkRerenderPanel(machine, 'parts');
  });

  const saveBtn = panel.querySelector('#hk-part-form-save');
  if(saveBtn) saveBtn.addEventListener('click', async () => {
    const name = panel.querySelector('#hk-part-name').value.trim();
    if(!name){ hkToast('กรุณาระบุชื่ออะไหล่'); return; }
    const brand = panel.querySelector('#hk-part-brand').value.trim();
    const model = panel.querySelector('#hk-part-model').value.trim();
    const note = panel.querySelector('#hk-part-note').value.trim();
    const fileInput = panel.querySelector('#hk-part-image');
    const file = fileInput.files && fileInput.files[0];
    try{
      let imageUrl;
      if(file){
        const uploadRes = await hkApiUploadFile(file, machine.id, machine.name, 'Parts');
        if(uploadRes && uploadRes.error) throw new Error(uploadRes.error);
        imageUrl = uploadRes.url;
      }
      if(HK_PART_FORM_STATE.mode === 'add'){
        await addPartToMachine(machine.id, { name, brand, model, note, imageUrl });
      }else{
        const fields = { name, brand, model, note };
        if(imageUrl !== undefined) fields.imageUrl = imageUrl;
        await updatePartInMachine(machine.id, HK_PART_FORM_STATE.partId, fields);
      }
      if(HK_LAST_SAVE_ERROR) hkToast('บันทึกไว้ในเครื่องนี้ชั่วคราว (บันทึกไปยังฐานข้อมูลไม่สำเร็จ)');
      HK_PART_FORM_STATE = { mode: null, partId: null };
      hkRerenderPanel(machine, 'parts');
    }catch(err){ hkToast(err.message || 'บันทึกไม่สำเร็จ'); }
  });

  panel.querySelectorAll('[data-part-id]').forEach(row => {
    if(!row.dataset.partId) return;
    row.addEventListener('click', (e) => {
      if(e.target.closest('button')) return;
      hkOpenPartModal(machine, row.dataset.partId);
    });
  });
}

function hkPanelDocuments(m){
  const items = HK_DOCUMENT_TYPES.map(t => {
    const doc = m.documents?.[t.key];
    const body = `
        <div class="hk-doc-item__icon">${hkIcon('doc')}</div>
        <div style="flex:1;min-width:0;">
          <div class="hk-doc-item__name">${t.label}</div>
          <div class="hk-doc-item__status">${doc ? hkEscapeHtml(doc.name || 'มีไฟล์แนบ') : 'ยังไม่มีไฟล์'}</div>
        </div>`;
    const actions = doc
      ? `<div style="display:flex;gap:6px;flex-shrink:0;">
           ${doc.url ? `<a href="${doc.url}" target="_blank" rel="noopener" class="hk-btn hk-btn--ghost hk-btn--sm">เปิด</a>` : ''}
           <label class="hk-btn hk-btn--ghost hk-btn--sm" style="cursor:pointer;">แทนที่<input type="file" style="display:none;" data-doc-replace data-doctype="${t.key}"></label>
           <button type="button" class="hk-btn hk-btn--danger hk-btn--sm" data-doc-delete data-doctype="${t.key}">ลบ</button>
         </div>`
      : `<label class="hk-btn hk-btn--ghost hk-btn--sm" style="cursor:pointer;flex-shrink:0;">อัปโหลด<input type="file" style="display:none;" data-doc-upload data-doctype="${t.key}"></label>`;
    return `<div class="hk-doc-item">${body}${actions}</div>`;
  }).join('');
  return `<div class="hk-doc-list">${items}</div>`;
}

function hkWireDocumentsPanel(machine){
  const panel = document.querySelector('.hk-tabpanel[data-panel="documents"]');
  if(!panel) return;

  panel.querySelectorAll('[data-doc-upload], [data-doc-replace]').forEach(input => {
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if(!file) return;
      const docType = input.dataset.doctype;
      try{ await setDocumentOnMachine(machine.id, docType, file); }
      catch(err){ hkToast(err.message || 'อัปโหลดไม่สำเร็จ'); }
      if(HK_LAST_SAVE_ERROR) hkToast('บันทึกไว้ในเครื่องนี้ชั่วคราว (บันทึกไปยังฐานข้อมูลไม่สำเร็จ)');
      hkRerenderPanel(machine, 'documents');
    });
  });

  panel.querySelectorAll('[data-doc-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if(!confirm('ลบเอกสารนี้?')) return;
      try{ await removeDocumentFromMachine(machine.id, btn.dataset.doctype); }
      catch(err){ hkToast(err.message || 'ลบไม่สำเร็จ'); }
      if(HK_LAST_SAVE_ERROR) hkToast('บันทึกไว้ในเครื่องนี้ชั่วคราว (บันทึกไปยังฐานข้อมูลไม่สำเร็จ)');
      hkRerenderPanel(machine, 'documents');
    });
  });
}

function hkPanelAI(m){
  return `
    <div class="hk-ai-panel">
      <div class="hk-ai-panel__log" id="hk-ai-log">
        <div class="hk-ai-msg hk-ai-msg--bot">สวัสดีครับ ผมคือ HILLKOFFBOT ถามข้อมูลของ <strong>${hkEscapeHtml(m.name)}</strong> หรือคำถามทั่วไปเกี่ยวกับเครื่องชงกาแฟได้เลยครับ</div>
      </div>
      <div class="hk-ai-panel__suggestions">
        <button class="hk-ai-suggestion" data-q="ใช้ Pump อะไร">ใช้ Pump อะไร</button>
        <button class="hk-ai-suggestion" data-q="ใช้ Boiler กี่ลิตร">ใช้ Boiler กี่ลิตร</button>
        <button class="hk-ai-suggestion" data-q="เหมาะกับร้านแบบไหน">เหมาะกับร้านแบบไหน</button>
      </div>
      <div class="hk-ai-panel__input">
        <input type="text" id="hk-ai-input" placeholder="พิมพ์คำถามเกี่ยวกับ ${hkEscapeHtml(m.name)}...">
        <button class="hk-btn hk-btn--primary" id="hk-ai-send">ส่ง</button>
      </div>
    </div>`;
}

/* ---------- NFC Public Machine Profile ---------- */

function hkNfcStatusBadgeHtml(status){
  const map = {
    active: { cls: 'active', label: '🟢 ACTIVE' },
    disabled: { cls: 'disabled', label: '⚪ DISABLED' },
    not_registered: { cls: 'not-registered', label: '⚪ ยังไม่ได้ลงทะเบียน' },
  };
  const s = map[status] || map.not_registered;
  return `<span class="hk-nfc-status hk-nfc-status--${s.cls}">${s.label}</span>`;
}

// The public nfc.html page lives alongside machine-detail.html in the
// same html/ folder, so this just swaps the filename in the current URL.
function hkNfcUrl(token){
  if(!token) return '';
  const path = window.location.pathname.replace(/[^/]*$/, '');
  return `${window.location.origin}${path}nfc.html?token=${encodeURIComponent(token)}`;
}

function hkNfcGalleryChecklistHtml(gallery){
  if(!gallery || !gallery.length){
    return `<p class="hk-nfc-loading">ยังไม่มีรูปใน Gallery — ไปที่แท็บ Gallery เพื่อเพิ่มรูปก่อน</p>`;
  }
  const byGroup = {};
  gallery.forEach(g => { if(!byGroup[g.groupKey]) byGroup[g.groupKey] = []; byGroup[g.groupKey].push(g); });
  return Object.entries(byGroup).map(([groupKey, items]) => {
    const meta = HK_GALLERY_GROUPS.find(g => g.key === groupKey);
    const label = meta ? meta.label : groupKey;
    const tiles = items.map(item => `
      <label class="hk-nfc-gallery-tile">
        <img src="${hkDriveImgUrl(item.url)}" alt="">
        <input type="checkbox" data-nfc-gallery-toggle data-group="${hkEscapeHtml(groupKey)}" data-url="${hkEscapeHtml(item.url)}" ${item.showOnNfc ? 'checked' : ''}>
      </label>`).join('');
    return `
      <div class="hk-nfc-gallery-group">
        <div class="hk-nfc-gallery-group__label">${label}</div>
        <div class="hk-nfc-gallery-group__grid">${tiles}</div>
      </div>`;
  }).join('');
}

function hkPanelNfc(m){
  const nfc = m.nfc || { status: 'not_registered', token: '', showOverview: true, showSpecification: true, hiddenSpecFields: [] };

  if(nfc.status === 'not_registered'){
    return `
      <div class="hk-nfc-panel">
        ${hkNfcStatusBadgeHtml(nfc.status)}
        <p class="hk-nfc-intro">เปิดใช้งาน NFC เพื่อสร้างลิงก์สาธารณะสำหรับติดแท็กบนตัวเครื่อง — ผู้ที่แตะมือถือที่แท็กจะเห็นเฉพาะ <strong>Overview, Specification, และ Gallery</strong> ตามส่วนที่เลือกเปิดไว้เท่านั้น ไม่รวม Internal Structure, Parts List, Documents, หรือ AI Assistant</p>
        <button type="button" class="hk-btn hk-btn--primary" data-nfc-enable>+ เปิดใช้งาน NFC</button>
      </div>`;
  }

  const url = hkNfcUrl(nfc.token);
  const active = nfc.status === 'active';
  const specRows = HK_SPEC_FIELDS.map(f => `
    <label class="hk-nfc-check">
      <input type="checkbox" data-nfc-spec-field="${f.key}" ${nfc.hiddenSpecFields.includes(f.key) ? '' : 'checked'}>
      <span>${f.label}</span>
    </label>`).join('');
  const galleryHtml = (HK_NFC_GALLERY_CACHE && HK_NFC_GALLERY_CACHE.machineId === m.id)
    ? hkNfcGalleryChecklistHtml(HK_NFC_GALLERY_CACHE.gallery)
    : `<p class="hk-nfc-loading">กำลังโหลดรายการรูปภาพ...</p>`;

  return `
    <div class="hk-nfc-panel">
      <div class="hk-nfc-panel__head">
        ${hkNfcStatusBadgeHtml(nfc.status)}
        <div class="hk-nfc-panel__actions">
          <button type="button" class="hk-btn hk-btn--ghost hk-btn--sm" data-nfc-preview">👁 ดูตัวอย่าง</button>
          <button type="button" class="hk-btn ${active ? 'hk-btn--danger' : 'hk-btn--primary'} hk-btn--sm" data-nfc-toggle>${active ? 'ปิดใช้งาน NFC' : 'เปิดใช้งาน NFC'}</button>
        </div>
      </div>

      <div class="hk-nfc-url-row">
        <input type="text" class="hk-input" readonly value="${hkEscapeHtml(url)}" data-nfc-url>
        <button type="button" class="hk-btn hk-btn--ghost hk-btn--sm" data-nfc-copy>คัดลอกลิงก์</button>
      </div>
      <button type="button" class="hk-nfc-regenerate-link" data-nfc-regenerate>สร้างลิงก์ใหม่ (ลิงก์/แท็กเดิมจะใช้ไม่ได้ทันที)</button>

      <div class="hk-nfc-section">
        <label class="hk-nfc-check hk-nfc-check--section">
          <input type="checkbox" data-nfc-show-overview ${nfc.showOverview ? 'checked' : ''}>
          <span><strong>แสดง Overview</strong> (คำอธิบายเครื่อง)</span>
        </label>
      </div>

      <div class="hk-nfc-section">
        <label class="hk-nfc-check hk-nfc-check--section">
          <input type="checkbox" data-nfc-show-spec ${nfc.showSpecification ? 'checked' : ''}>
          <span><strong>แสดง Specification</strong> — เลือกได้ว่าจะให้แสดงหัวข้อไหนบ้าง</span>
        </label>
        <div class="hk-nfc-spec-fields" data-nfc-spec-fields${nfc.showSpecification ? '' : ' style="display:none;"'}>
          ${specRows}
        </div>
      </div>

      <div class="hk-nfc-section">
        <div class="hk-nfc-section__label"><strong>Gallery</strong> — เลือกรูปที่จะให้แสดงบนหน้า NFC (ไม่รวม Internal Structure)</div>
        ${galleryHtml}
      </div>

      <div class="hk-wizard-nav">
        <button type="button" class="hk-btn hk-btn--primary" data-nfc-save>บันทึกการตั้งค่า NFC</button>
      </div>
    </div>`;
}

async function hkWireNfcPanel(machine){
  const panel = document.querySelector('.hk-tabpanel[data-panel="nfc"]');
  if(!panel) return;

  const enableBtn = panel.querySelector('[data-nfc-enable]');
  if(enableBtn) enableBtn.addEventListener('click', async () => {
    try{
      await updateNfcSettings(machine.id, { enabled: true });
      if(HK_LAST_SAVE_ERROR) hkToast('บันทึกไว้ในเครื่องนี้ชั่วคราว (บันทึกไปยังฐานข้อมูลไม่สำเร็จ)');
      hkRerenderPanel(machine, 'nfc');
    }catch(err){ hkToast(err.message || 'เกิดข้อผิดพลาด'); }
  });

  const toggleBtn = panel.querySelector('[data-nfc-toggle]');
  if(toggleBtn) toggleBtn.addEventListener('click', async () => {
    const enabling = machine.nfc.status !== 'active';
    try{
      await updateNfcSettings(machine.id, { enabled: enabling });
      if(HK_LAST_SAVE_ERROR) hkToast('บันทึกไว้ในเครื่องนี้ชั่วคราว (บันทึกไปยังฐานข้อมูลไม่สำเร็จ)');
      hkRerenderPanel(machine, 'nfc');
    }catch(err){ hkToast(err.message || 'เกิดข้อผิดพลาด'); }
  });

  const copyBtn = panel.querySelector('[data-nfc-copy]');
  if(copyBtn) copyBtn.addEventListener('click', async () => {
    const input = panel.querySelector('[data-nfc-url]');
    try{
      await navigator.clipboard.writeText(input.value);
      hkToast('คัดลอกลิงก์แล้ว');
    }catch(e){
      input.select();
      hkToast('เลือกลิงก์ไว้ให้แล้ว กด Ctrl+C เพื่อคัดลอก');
    }
  });

  const previewBtn = panel.querySelector('[data-nfc-preview]');
  if(previewBtn) previewBtn.addEventListener('click', () => {
    const input = panel.querySelector('[data-nfc-url]');
    if(input && input.value) window.open(input.value, '_blank');
  });

  const regenBtn = panel.querySelector('[data-nfc-regenerate]');
  if(regenBtn) regenBtn.addEventListener('click', async () => {
    if(!confirm('สร้างลิงก์ใหม่? ลิงก์เดิม (และแท็ก NFC ที่เขียนไว้แล้ว) จะใช้งานไม่ได้ทันที')) return;
    try{
      await regenerateNfcToken(machine.id);
      if(HK_LAST_SAVE_ERROR) hkToast('บันทึกไว้ในเครื่องนี้ชั่วคราว (บันทึกไปยังฐานข้อมูลไม่สำเร็จ)');
      hkToast('สร้างลิงก์ใหม่แล้ว');
      hkRerenderPanel(machine, 'nfc');
    }catch(err){ hkToast(err.message || 'เกิดข้อผิดพลาด'); }
  });

  const showSpecCheckbox = panel.querySelector('[data-nfc-show-spec]');
  if(showSpecCheckbox) showSpecCheckbox.addEventListener('change', () => {
    const fieldsBox = panel.querySelector('[data-nfc-spec-fields]');
    if(fieldsBox) fieldsBox.style.display = showSpecCheckbox.checked ? '' : 'none';
  });

  const saveBtn = panel.querySelector('[data-nfc-save]');
  if(saveBtn) saveBtn.addEventListener('click', async () => {
    const showOverview = panel.querySelector('[data-nfc-show-overview]').checked;
    const showSpecification = panel.querySelector('[data-nfc-show-spec]').checked;
    const hiddenSpecFields = HK_SPEC_FIELDS.filter(f => {
      const cb = panel.querySelector(`[data-nfc-spec-field="${f.key}"]`);
      return cb && !cb.checked;
    }).map(f => f.key);
    try{
      await updateNfcSettings(machine.id, { showOverview, showSpecification, hiddenSpecFields });
      if(HK_LAST_SAVE_ERROR) hkToast('บันทึกไว้ในเครื่องนี้ชั่วคราว (บันทึกไปยังฐานข้อมูลไม่สำเร็จ)');
      hkToast('บันทึกการตั้งค่า NFC แล้ว');
    }catch(err){ hkToast(err.message || 'บันทึกไม่สำเร็จ'); }
  });

  panel.querySelectorAll('[data-nfc-gallery-toggle]').forEach(cb => {
    cb.addEventListener('change', async () => {
      try{
        await setImageNfcVisibility(machine.id, cb.dataset.group, cb.dataset.url, cb.checked);
      }catch(err){ hkToast(err.message || 'บันทึกไม่สำเร็จ'); cb.checked = !cb.checked; }
    });
  });

  // Lazy-load the per-image gallery visibility list once per machine —
  // not part of the main machine object, and no need to re-fetch it on
  // every re-render of this same panel.
  if(machine.nfc && machine.nfc.status !== 'not_registered' &&
     (!HK_NFC_GALLERY_CACHE || HK_NFC_GALLERY_CACHE.machineId !== machine.id)){
    try{
      const settings = await fetchNfcSettings(machine.id);
      HK_NFC_GALLERY_CACHE = { machineId: machine.id, gallery: settings.gallery || [] };
      hkRerenderPanel(machine, 'nfc');
    }catch(err){ console.error('Failed to load NFC gallery settings:', err); }
  }
}

const HK_PANEL_RENDERERS = {
  overview: hkPanelOverview,
  specification: hkPanelSpecification,
  internal: hkPanelInternal,
  parts: hkPanelParts,
  gallery: hkPanelGallery,
  documents: hkPanelDocuments,
  nfc: hkPanelNfc,
  ai: hkPanelAI,
};

const HK_PANEL_WIRERS = {
  overview: hkWireOverviewPanel,
  specification: hkWireSpecificationPanel,
  internal: (machine) => { hkWireInternalNotesPanel(machine); hkWireImagePanel(machine, 'internal'); hkRenderApprovalSection(machine); },
  parts: hkWirePartsPanel,
  gallery: (machine) => hkWireImagePanel(machine, 'gallery'),
  documents: hkWireDocumentsPanel,
  nfc: hkWireNfcPanel,
  ai: hkWireAIPanel,
};

// Re-renders just one tab panel's content and rewires it — used after any
// edit/add/remove so the rest of the page (tabs, header, other panels)
// doesn't get rebuilt and the person doesn't lose their place.
function hkRerenderPanel(machine, key){
  const panel = document.querySelector(`.hk-tabpanel[data-panel="${key}"]`);
  if(!panel) return;
  panel.innerHTML = HK_PANEL_RENDERERS[key](machine);
  const wire = HK_PANEL_WIRERS[key];
  if(wire) wire(machine);
}

function hkWireAIPanel(machine){
  const log = document.getElementById('hk-ai-log');
  const input = document.getElementById('hk-ai-input');
  const send = document.getElementById('hk-ai-send');
  if(!log || !input || !send) return;

  const history = [];

  async function ask(text){
    const q = text.trim();
    if(!q) return;
    log.insertAdjacentHTML('beforeend', `<div class="hk-ai-msg hk-ai-msg--user">${hkEscapeHtml(q)}</div>`);
    input.value = '';
    input.disabled = true;
    send.disabled = true;
    const typingId = 'hk-ai-typing-' + Date.now();
    log.insertAdjacentHTML('beforeend', `<div class="hk-ai-msg hk-ai-msg--bot" id="${typingId}">กำลังพิมพ์...</div>`);
    log.scrollTop = log.scrollHeight;

    const result = await hkAskBotAI(q, machine, history);
    document.getElementById(typingId)?.remove();
    log.insertAdjacentHTML('beforeend', `<div class="hk-ai-msg hk-ai-msg--bot">${hkEscapeHtml(result.text)}</div>`);
    log.scrollTop = log.scrollHeight;
    if(!result.ok) hkToast('AI ไม่พร้อมใช้งานตอนนี้ ใช้คำตอบสำรองจากฐานข้อมูลแทน');

    history.push({ role: 'user', text: q }, { role: 'bot', text: result.text });
    input.disabled = false;
    send.disabled = false;
    input.focus();
  }
  send.addEventListener('click', () => ask(input.value));
  input.addEventListener('keydown', (e) => { if(e.key === 'Enter') ask(input.value); });
  document.querySelectorAll('.hk-ai-suggestion').forEach(btn => {
    btn.addEventListener('click', () => ask(btn.dataset.q));
  });
}

function hkOpenPartModal(machine, partId){
  const part = getPartByIdWithUsage(partId, machine.id);
  if(!part) return;
  let backdrop = document.querySelector('.hk-modal-backdrop');
  if(!backdrop){
    backdrop = document.createElement('div');
    backdrop.className = 'hk-modal-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', (e) => { if(e.target === backdrop) backdrop.classList.remove('is-visible'); });
  }
  const usedIn = (part.usedIn || []).map(u => `<a href="machine-detail.html?id=${u.id}" class="hk-badge" style="margin:3px 6px 0 0;">${hkEscapeHtml(u.name)}</a>`).join('');
  backdrop.innerHTML = `
    <div class="hk-modal">
      <button class="hk-modal__close" data-close-modal>✕</button>
      <div class="hk-modal__media">${part.image ? `<img src="${hkDriveImgUrl(part.image)}" alt="">` : hkIcon('image')}</div>
      <h3 style="margin-bottom:4px;">${hkEscapeHtml(part.name)}</h3>
      <p style="margin-bottom:14px;">${hkEscapeHtml(part.brand || '-')} · ${hkEscapeHtml(part.model || '-')}</p>
      <div class="hk-kv-grid" style="margin-top:0;">
        <div class="hk-kv-grid__item" style="grid-column:1/-1;">
          <div class="hk-kv-grid__label">รายละเอียด</div>
          <div class="hk-kv-grid__value" style="font-weight:400;">${hkEscapeHtml(part.note || '-')}</div>
        </div>
      </div>
      <div style="margin-top:16px;">
        <div class="hk-dheader__meta-label" style="margin-bottom:8px;">ใช้กับเครื่อง</div>
        ${usedIn || '<p style="margin:0;">-</p>'}
      </div>
    </div>`;
  backdrop.querySelector('[data-close-modal]').addEventListener('click', () => backdrop.classList.remove('is-visible'));
  backdrop.classList.add('is-visible');
}

function hkRenderDetail(machine){
  const root = document.getElementById('hk-detail-root');
  const tabsHtml = HK_TABS.map((t) => `<div class="hk-tab${t.key === HK_ACTIVE_TAB ? ' is-active' : ''}" data-tab="${t.key}">${t.label}</div>`).join('');
  const panelsHtml = HK_TABS.map((t) => `<div class="hk-tabpanel${t.key === HK_ACTIVE_TAB ? ' is-active' : ''}" data-panel="${t.key}">${HK_PANEL_RENDERERS[t.key](machine)}</div>`).join('');

  root.innerHTML = `
    ${hkRenderHeader(machine)}
    <div class="hk-tabs">${tabsHtml}</div>
    <div>${panelsHtml}</div>`;

  root.querySelectorAll('.hk-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      HK_ACTIVE_TAB = tab.dataset.tab;
      root.querySelectorAll('.hk-tab').forEach(t => t.classList.remove('is-active'));
      root.querySelectorAll('.hk-tabpanel').forEach(p => p.classList.remove('is-active'));
      tab.classList.add('is-active');
      root.querySelector(`.hk-tabpanel[data-panel="${tab.dataset.tab}"]`).classList.add('is-active');
    });
  });

  hkWireOverviewPanel(machine);
  hkWireSpecificationPanel(machine);
  hkWireInternalNotesPanel(machine);
  hkWireImagePanel(machine, 'internal');
  hkWireImagePanel(machine, 'gallery');
  hkWirePartsPanel(machine);
  hkWireDocumentsPanel(machine);
  hkWireNfcPanel(machine);
  hkWireAIPanel(machine);
  hkRenderApprovalSection(machine);
}

function hkRenderNotFound(){
  document.getElementById('hk-detail-root').innerHTML = `
    <div class="hk-empty">
      <div class="hk-empty__icon">🤔</div>
      <h3>ไม่พบเครื่องจักรนี้</h3>
      <p>รหัสเครื่องจักรอาจไม่ถูกต้อง หรือถูกลบไปแล้ว</p>
      <a href="index.html" class="hk-btn hk-btn--primary" style="margin-top:12px;">กลับไป Dashboard</a>
    </div>`;
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('hk-detail-root').innerHTML = `
    <div class="hk-empty"><div class="hk-empty__icon">⏳</div><h3>กำลังโหลดข้อมูล...</h3></div>`;
  hkAuthRenderSidebarFooter();

  await hkBootstrapMachines();
  if(HK_LAST_LOAD_ERROR) hkToast(hkLoadErrorToastMessage());

  const id = hkQueryParam('id');
  const machine = id ? getMachineById(id) : null;

  if(!machine){
    hkRenderSidebarCategoriesDetail(null);
    hkWireSidebarToggle();
    hkRenderNotFound();
    document.getElementById('hk-breadcrumb').innerHTML = `<a href="index.html">Dashboard</a>`;
    return;
  }

  hkRenderSidebarCategoriesDetail(machine.category);
  hkWireSidebarToggle();
  hkRenderBreadcrumb(machine);
  hkRenderDetail(machine);
});
