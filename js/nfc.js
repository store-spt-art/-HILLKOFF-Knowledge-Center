/* =========================================================
   HILLKOFF · nfc.js — public NFC Machine Profile page
   ---------------------------------------------------------
   No login required, no app shell (sidebar/navbar) — this is the page a
   customer or technician lands on after scanning an NFC tag on the
   machine itself. It only ever calls the one deliberately public backend
   action (`nfcProfile`, via hkApiGetNfcProfile in api-client.js), which
   in turn only ever returns Overview/Specification/Gallery fields the
   admin has explicitly chosen to expose — see Code.gs's getNfcProfile()
   for the authoritative list of what can never leave that function.
   ========================================================= */

const HK_NFC_SPEC_LABELS = {
  voltage: 'Voltage', power: 'Power', frequency: 'Frequency',
  coffeeBoiler: 'Coffee Boiler', steamBoiler: 'Steam Boiler', pump: 'Pump',
  group: 'Group', pid: 'PID', display: 'Display',
  dimension: 'Dimension', weight: 'Weight', waterTank: 'Water Tank',
};

const HK_NFC_GALLERY_LABELS = {
  cover: 'Cover', front: 'Front', back: 'Back', left: 'Left', right: 'Right',
  top: 'Top', internal: 'Internal', others: 'Others',
};

function hkNfcQueryToken(){
  return new URLSearchParams(window.location.search).get('token') || '';
}

function hkNfcRenderUnavailable(message){
  document.getElementById('hk-nfc-root').innerHTML = `
    <div class="hk-nfc-card hk-nfc-card--unavailable">
      <div class="hk-nfc-brand">
        <div class="hk-brand__mark">HK</div>
        <div class="hk-nfc-brand__name">HILLKOFF</div>
      </div>
      <div class="hk-nfc-unavailable__icon">🔌</div>
      <h1 class="hk-nfc-unavailable__title">Machine Unavailable</h1>
      <p class="hk-nfc-unavailable__text">${hkEscapeHtml(message)}</p>
    </div>`;
}

function hkNfcSpecTableHtml(spec){
  const rows = Object.entries(HK_NFC_SPEC_LABELS)
    .filter(([key]) => spec[key] !== undefined && spec[key] !== '')
    .map(([key, label]) => `<tr><td>${label}</td><td>${hkEscapeHtml(spec[key])}</td></tr>`)
    .join('');
  if(!rows) return '';
  return `
    <div class="hk-nfc-section">
      <div class="hk-nfc-section__title">Specification</div>
      <table class="hk-nfc-spec-table"><tbody>${rows}</tbody></table>
    </div>`;
}

function hkNfcGalleryHtml(gallery){
  const groups = Object.keys(gallery || {}).filter(k => gallery[k] && gallery[k].length);
  if(!groups.length) return '';
  const groupsHtml = groups.map(key => {
    const label = HK_NFC_GALLERY_LABELS[key] || key;
    const tiles = gallery[key].map(url => `
      <div class="hk-nfc-gallery-tile"><img src="${hkDriveImgUrl(url)}" alt="" loading="lazy"></div>`).join('');
    return `
      <div class="hk-nfc-gallery-group">
        <div class="hk-nfc-gallery-group__label">${label}</div>
        <div class="hk-nfc-gallery-group__grid">${tiles}</div>
      </div>`;
  }).join('');
  return `
    <div class="hk-nfc-section">
      <div class="hk-nfc-section__title">Gallery</div>
      ${groupsHtml}
    </div>`;
}

function hkNfcRenderProfile(p){
  const overviewHtml = (p.overview && p.overview.description)
    ? `<div class="hk-nfc-section"><div class="hk-nfc-section__title">Overview</div><div class="hk-nfc-description">${p.overview.description}</div></div>`
    : '';
  const specHtml = p.specification ? hkNfcSpecTableHtml(p.specification) : '';
  const galleryHtml = hkNfcGalleryHtml(p.gallery);
  const coverHtml = p.coverImage
    ? `<div class="hk-nfc-cover"><img src="${hkDriveImgUrl(p.coverImage)}" alt="${hkEscapeHtml(p.name)}"></div>`
    : `<div class="hk-nfc-cover hk-nfc-cover--empty">☕</div>`;

  document.getElementById('hk-nfc-root').innerHTML = `
    <div class="hk-nfc-card">
      <div class="hk-nfc-brand">
        <div class="hk-brand__mark">HK</div>
        <div class="hk-nfc-brand__name">HILLKOFF<span>Knowledge Center</span></div>
      </div>
      ${coverHtml}
      <div class="hk-nfc-body-content">
        <span class="hk-badge hk-badge--gold">${hkEscapeHtml(p.category || '')}</span>
        <h1 class="hk-nfc-title">${hkEscapeHtml(p.name)}</h1>
        <div class="hk-nfc-meta">
          <div><div class="hk-nfc-meta__label">ยี่ห้อ</div><div class="hk-nfc-meta__value">${hkEscapeHtml(p.brand || '-')}</div></div>
          <div><div class="hk-nfc-meta__label">รุ่น</div><div class="hk-nfc-meta__value">${hkEscapeHtml(p.model || '-')}</div></div>
          <div><div class="hk-nfc-meta__label">ประเภท</div><div class="hk-nfc-meta__value">${hkEscapeHtml(p.type || '-')}</div></div>
          ${p.bcCode ? `<div><div class="hk-nfc-meta__label">รหัส BC</div><div class="hk-nfc-meta__value">${hkEscapeHtml(p.bcCode)}</div></div>` : ''}
        </div>
        ${overviewHtml}
        ${specHtml}
        ${galleryHtml}
        <p class="hk-nfc-footer">ข้อมูลจาก HILLKOFF Knowledge Center</p>
      </div>
    </div>`;
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = hkNfcQueryToken();
  if(!token){
    hkNfcRenderUnavailable('ไม่พบข้อมูลเครื่องจักรนี้ กรุณาสแกน NFC อีกครั้งหรือติดต่อทีมงาน');
    return;
  }
  try{
    const result = await hkApiGetNfcProfile(token);
    if(!result || result.error){
      hkNfcRenderUnavailable('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง');
      return;
    }
    if(!result.ok){
      hkNfcRenderUnavailable(
        result.status === 'unavailable'
          ? 'ข้อมูลเครื่องนี้ไม่พร้อมให้บริการในขณะนี้'
          : 'ไม่พบข้อมูลเครื่องจักรนี้ กรุณาสแกน NFC อีกครั้งหรือติดต่อทีมงาน'
      );
      return;
    }
    hkNfcRenderProfile(result);
  }catch(err){
    console.error('Failed to load NFC profile:', err);
    hkNfcRenderUnavailable('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง');
  }
});
