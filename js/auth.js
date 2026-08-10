/* =========================================================
   HILLKOFF · auth.js — shared login/session helpers
   ---------------------------------------------------------
   The actual "kick unauthenticated visitors to the login page before
   anything renders" guard lives as a small inline <script> at the very
   top of each protected page's <head> (so it runs before any CSS/HTML
   paints) — see login.html and any other page for the exact snippet.
   This file provides the shared helpers everything else (api-client.js,
   the logout button, login.js) calls into. Include it early in <body>,
   before api-client.js.
   ========================================================= */

const HK_AUTH_TOKEN_KEY = 'hk_auth_token';
const HK_AUTH_EMAIL_KEY = 'hk_auth_email';

function hkAuthGetToken(){
  return localStorage.getItem(HK_AUTH_TOKEN_KEY);
}
function hkAuthGetEmail(){
  return localStorage.getItem(HK_AUTH_EMAIL_KEY);
}
function hkAuthSetSession(token, email){
  localStorage.setItem(HK_AUTH_TOKEN_KEY, token);
  localStorage.setItem(HK_AUTH_EMAIL_KEY, email);
}
function hkAuthClearSession(){
  localStorage.removeItem(HK_AUTH_TOKEN_KEY);
  localStorage.removeItem(HK_AUTH_EMAIL_KEY);
}

// Decodes the token's payload client-side purely to redirect proactively
// instead of waiting for a failed API call — NOT a security boundary.
// The backend re-verifies the HMAC signature on every single request
// regardless of what this check says.
function hkAuthTokenExpired(token){
  if(!token) return true;
  const parts = token.split('.');
  if(parts.length !== 2) return true;
  try{
    const json = atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json);
    return !payload.exp || payload.exp < Date.now();
  }catch(e){ return true; }
}

function hkAuthRedirectToLogin(){
  const here = window.location.pathname.split('/').pop() + window.location.search;
  window.location.href = `login.html?redirect=${encodeURIComponent(here)}`;
}

function hkAuthLogout(){
  hkAuthClearSession();
  window.location.href = 'login.html';
}

function hkAuthEscape(s){
  return (s ?? '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Appends the logged-in user's email + a logout button under the
// sidebar's existing footer note. Call this from each page's own
// DOMContentLoaded handler once the sidebar markup is in the DOM.
function hkAuthRenderSidebarFooter(){
  const footer = document.querySelector('.hk-sidebar__footer');
  if(!footer || document.getElementById('hk-logout-btn')) return;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'margin-top:10px; padding-top:10px; border-top:1px solid var(--hk-border);';
  wrap.innerHTML = `
    <div style="font-size:11.5px; color:var(--hk-text-dim); margin-bottom:8px; word-break:break-all;">${hkAuthEscape(hkAuthGetEmail())}</div>
    <button type="button" id="hk-logout-btn" class="hk-btn hk-btn--ghost hk-btn--sm hk-btn--block">ออกจากระบบ</button>`;
  footer.appendChild(wrap);
  document.getElementById('hk-logout-btn').addEventListener('click', () => {
    if(confirm('ออกจากระบบ?')) hkAuthLogout();
  });
}
