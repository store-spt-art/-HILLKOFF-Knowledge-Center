/* =========================================================
   HILLKOFF · login.js
   ========================================================= */

const HK_ALLOWED_EMAIL_RE = /@hillkoff\.(com|co\.th)$/i;

// Only ever redirect to a local .html page — never an absolute or
// external URL, so a crafted ?redirect= can't be used to bounce someone
// off-site after logging in.
function hkLoginRedirectTarget(){
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  if(redirect && /^[a-zA-Z0-9_-]+\.html(\?.*)?$/.test(redirect)) return redirect;
  return 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  // Already logged in with a non-expired token? Skip straight past the form.
  const existing = hkAuthGetToken();
  if(existing && !hkAuthTokenExpired(existing)){
    window.location.href = hkLoginRedirectTarget();
    return;
  }

  const form = document.getElementById('hk-login-form');
  const errorBox = document.getElementById('hk-login-error');
  const submitBtn = document.getElementById('hk-login-submit');
  const emailInput = document.getElementById('hk-login-email');
  const passwordInput = document.getElementById('hk-login-password');

  function showError(message){
    errorBox.textContent = message;
    errorBox.style.display = '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if(!HK_ALLOWED_EMAIL_RE.test(email)){
      showError('กรุณาใช้อีเมลบริษัท (@hillkoff.com หรือ @hillkoff.co.th) เท่านั้น');
      return;
    }
    if(!password){
      showError('กรุณากรอกรหัสผ่าน');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'กำลังเข้าสู่ระบบ...';
    try{
      const result = await hkApiLogin(email, password);
      if(result && result.error) throw new Error(result.error);
      if(!result || !result.token) throw new Error('เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่');
      hkAuthSetSession(result.token, result.email || email);
      window.location.href = hkLoginRedirectTarget();
    }catch(err){
      showError(err.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่');
      submitBtn.disabled = false;
      submitBtn.textContent = 'เข้าสู่ระบบ';
    }
  });
});
