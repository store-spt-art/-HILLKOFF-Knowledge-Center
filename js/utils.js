/* =========================================================
   HILLKOFF · utils.js — shared across all pages
   ========================================================= */

const HK_ICONS = {
  coffee: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 9h13a3 3 0 0 1 0 6h-1"/><path d="M4 9v6a4 4 0 0 0 4 4h5a4 4 0 0 0 4-4V9"/><path d="M7 4c-.5 1 .5 1.5 0 2.5M11 4c-.5 1 .5 1.5 0 2.5"/></svg>',
  grinder: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="3" width="10" height="7" rx="1"/><path d="M9 10v2a3 3 0 0 0 6 0v-2"/><path d="M12 15v6M9 21h6"/></svg>',
  tea: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 9h13a3 3 0 0 1 0 6h-1"/><path d="M4 9v6a4 4 0 0 0 4 4h5a4 4 0 0 0 4-4V9"/><path d="M8 5s1 1 0 2M12 5s1 1 0 2M16 5s1 1 0 2"/></svg>',
  ice: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11"/></svg>',
  other: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.6 1z"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  add: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  bot: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="8" width="16" height="11" rx="2"/><path d="M12 8V4M9 4h6"/><circle cx="9" cy="13.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="13.5" r="1.2" fill="currentColor" stroke="none"/><path d="M9 17h6"/></svg>',
  dashboard: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>',
  image: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.7"/><path d="M21 16l-5.5-5.5L4 21"/></svg>',
  doc: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/></svg>',
};

function hkIcon(name){ return HK_ICONS[name] || HK_ICONS.other; }

function hkInitials(text){
  return (text || 'HK').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/* ---------- Sidebar toggle (mobile) ---------- */
function hkWireSidebarToggle(){
  const toggle = document.querySelector('[data-hk-sidebar-toggle]');
  const sidebar = document.querySelector('.hk-sidebar');
  const backdrop = document.querySelector('[data-hk-backdrop]');
  if(!toggle || !sidebar) return;
  const close = () => { sidebar.classList.remove('is-open'); backdrop?.classList.remove('is-visible'); };
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('is-open');
    backdrop?.classList.toggle('is-visible');
  });
  backdrop?.addEventListener('click', close);
  sidebar.querySelectorAll('a, .hk-navitem').forEach(el => el.addEventListener('click', close));
}

/* ---------- Search shortcut ("/") ---------- */
function hkWireSearchShortcut(inputSelector){
  const input = document.querySelector(inputSelector);
  if(!input) return;
  document.addEventListener('keydown', (e) => {
    if(e.key === '/' && document.activeElement !== input){
      e.preventDefault();
      input.focus();
    }
    if(e.key === 'Escape' && document.activeElement === input){
      input.blur();
    }
  });
}

/* ---------- Toast ---------- */
function hkToast(message){
  let toast = document.querySelector('.hk-toast');
  if(!toast){
    toast = document.createElement('div');
    toast.className = 'hk-toast';
    toast.innerHTML = '<span class="hk-toast__dot"></span><span data-hk-toast-text></span>';
    document.body.appendChild(toast);
  }
  toast.querySelector('[data-hk-toast-text]').textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toast._hkTimer);
  toast._hkTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

/* ---------- File -> dataURL ---------- */
function hkReadFileAsDataURL(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function hkFormatDate(iso){
  if(!iso) return '-';
  try{
    return new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  }catch(e){ return iso; }
}

function hkEscapeHtml(str){
  return (str ?? '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function hkQueryParam(name){
  return new URLSearchParams(window.location.search).get(name);
}

// Normalizes any Google Drive link (old uc?export=view&id=, uc?id=, or
// /file/d/.../view formats) into the reliable thumbnail endpoint. Also
// fixes images saved before this fix shipped, without needing to edit
// the Sheet by hand. Non-Drive URLs (data: URIs, other hosts) pass through
// unchanged.
function hkDriveImgUrl(url){
  if(!url) return url;
  const match = url.match(/drive\.google\.com\/(?:uc\?(?:export=view&)?id=|thumbnail\?id=|file\/d\/)([a-zA-Z0-9_-]+)/);
  if(!match) return url;
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
}
