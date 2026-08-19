/* =========================================================
   HILLKOFF · dashboard.js
   ========================================================= */

let hkState = {
  category: hkQueryParam('filter') || 'all',
  query: '',
};

function hkRenderIcons(){
  document.querySelectorAll('[data-icon]').forEach(el => {
    el.innerHTML = hkIcon(el.getAttribute('data-icon'));
  });
}

function hkRenderSidebarCategories(){
  const list = document.getElementById('hk-sidebar-categories');
  const counts = categoryCounts();
  document.querySelector('[data-count="all"]').textContent = counts.all;

  Object.entries(HK_CATEGORIES).forEach(([key, meta]) => {
    const li = document.createElement('li');
    li.className = 'hk-navitem';
    li.dataset.category = key;
    li.innerHTML = `
      <span class="hk-navitem__icon">${hkIcon(meta.icon)}</span>
      <span>${meta.label}</span>
      <span class="hk-navitem__count">${counts[key] || 0}</span>`;
    list.appendChild(li);
  });

  list.querySelectorAll('.hk-navitem').forEach(item => {
    item.addEventListener('click', () => hkSetCategory(item.dataset.category));
  });
}

function hkRenderChips(){
  const chips = document.getElementById('hk-chips');
  const counts = categoryCounts();
  const items = [{ key: 'all', label: 'ทั้งหมด' }, ...Object.entries(HK_CATEGORIES).map(([key, meta]) => ({ key, label: meta.label }))];
  chips.innerHTML = items.map(it => `
    <button type="button" class="hk-chip" data-category="${it.key}">
      ${it.label} <span class="mono" style="opacity:.7;font-size:11px;">${counts[it.key] || 0}</span>
    </button>`).join('');
  chips.querySelectorAll('.hk-chip').forEach(chip => {
    chip.addEventListener('click', () => hkSetCategory(chip.dataset.category));
  });
}

function hkSetCategory(category){
  hkState.category = category;
  const url = new URL(window.location.href);
  if(category === 'all') url.searchParams.delete('filter');
  else url.searchParams.set('filter', category);
  window.history.replaceState({}, '', url);
  hkSyncActiveStates();
  hkRenderGrid();
}

function hkSyncActiveStates(){
  document.querySelectorAll('#hk-sidebar-categories .hk-navitem').forEach(el => {
    el.classList.toggle('is-active', el.dataset.category === hkState.category);
  });
  document.querySelectorAll('#hk-chips .hk-chip').forEach(el => {
    el.classList.toggle('is-active', el.dataset.category === hkState.category);
  });
  const title = document.getElementById('hk-page-title');
  const meta = HK_CATEGORIES[hkState.category];
  title.textContent = meta ? meta.label : 'เครื่องจักรทั้งหมด';
}

function hkMachineCardHtml(m){
  const meta = HK_CATEGORIES[m.category] || {};
  const media = m.coverImage
    ? `<img src="${hkDriveImgUrl(m.coverImage)}" alt="${hkEscapeHtml(m.name)}">`
    : hkIcon(meta.icon);
  const isNew = m.__isNew ? '<span class="hk-badge hk-badge--new hk-mcard__badge">ใหม่</span>' : '';
  const approvalStatus = hkApprovalStatus(m);
  const approvalLabel = approvalStatus === 'approved' ? '✓ อนุมัติแล้ว' : approvalStatus === 'rejected' ? '✕ ไม่อนุมัติ' : '⏳ รออนุมัติ';
  return `
    <article class="hk-mcard" data-id="${m.id}">
      <div class="hk-mcard__media">${isNew}${media}</div>
      <div class="hk-mcard__body">
        <div class="hk-mcard__cat">${meta.label || m.category}</div>
        <div class="hk-mcard__name">${hkEscapeHtml(m.name)}</div>
        <div class="hk-mcard__meta">${hkEscapeHtml(m.brand || '')}${m.model ? ' · ' + hkEscapeHtml(m.model) : ''}</div>
        <div class="hk-mcard__id">${m.id}</div>
        <div style="margin-top:6px;">
          <span class="hk-approval-status hk-approval-status--${approvalStatus}" style="font-size:11px;padding:3px 9px;">
            ${approvalLabel}
          </span>
        </div>
      </div>
    </article>`;
}

function hkRenderGrid(){
  const grid = document.getElementById('hk-grid');
  const empty = document.getElementById('hk-empty');
  const results = searchMachines(hkState.query, hkState.category);

  if(results.length === 0){
    grid.style.display = 'none';
    empty.style.display = '';
    return;
  }
  grid.style.display = '';
  empty.style.display = 'none';
  grid.innerHTML = results.map(hkMachineCardHtml).join('');
  grid.querySelectorAll('.hk-mcard').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `machine-detail.html?id=${encodeURIComponent(card.dataset.id)}`;
    });
  });
}

function hkRenderSkeleton(){
  const grid = document.getElementById('hk-grid');
  grid.innerHTML = Array.from({ length: 8 }).map(() => `<div class="hk-skeleton hk-skeleton-card"></div>`).join('');
}

function hkWireSearch(){
  const input = document.getElementById('hk-search-input');
  input.addEventListener('input', (e) => {
    hkState.query = e.target.value;
    hkRenderGrid();
  });
  hkWireSearchShortcut('#hk-search-input');
}

document.addEventListener('DOMContentLoaded', async () => {
  hkRenderIcons();
  hkWireSearch();
  hkWireSidebarToggle();
  hkAuthRenderSidebarFooter();
  hkRenderSkeleton();

  await hkBootstrapMachines();
  if(HK_LAST_LOAD_ERROR) hkToast(hkLoadErrorToastMessage());

  hkRenderSidebarCategories();
  hkRenderChips();
  hkSyncActiveStates();
  hkRenderIcons();
  hkRenderGrid();
});
