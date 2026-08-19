/* =========================================================
   HILLKOFF · ai-assistant.js
   ========================================================= */

const HK_AI_EXAMPLES = [
  'Rocket R9 ใช้ Pump อะไร',
  'แนะนำเครื่องชงกาแฟสำหรับร้านเล็กๆ หน่อย',
  'La Marzocco GB5 ใช้ Boiler กี่ลิตร',
  'Dual Boiler กับ Single Boiler ต่างกันยังไง',
];

let HK_AI_HISTORY = [];

function hkRenderAIRoot(){
  const root = document.getElementById('hk-ai-root');
  root.innerHTML = `
    <div class="hk-ai-panel" style="height: 520px;">
      <div class="hk-ai-panel__log" id="hk-ai-log">
        <div class="hk-ai-msg hk-ai-msg--bot">สวัสดีครับ ผมคือ <strong>HILLKOFFBOT</strong> ถามอะไรเกี่ยวกับเครื่องจักรในระบบ หรือคำถามทั่วไปเกี่ยวกับเครื่องชงกาแฟได้เลยครับ</div>
      </div>
      <div class="hk-ai-panel__suggestions">
        ${HK_AI_EXAMPLES.map(q => `<button class="hk-ai-suggestion" data-q="${hkEscapeHtml(q)}">${hkEscapeHtml(q)}</button>`).join('')}
      </div>
      <div class="hk-ai-panel__input">
        <input type="text" id="hk-ai-input" placeholder="พิมพ์คำถาม เช่น Rocket R9 ใช้ Pump อะไร">
        <button class="hk-btn hk-btn--primary" id="hk-ai-send">ส่ง</button>
      </div>
    </div>`;

  const log = document.getElementById('hk-ai-log');
  const input = document.getElementById('hk-ai-input');
  const send = document.getElementById('hk-ai-send');

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

    const result = await hkAskBotAI(q, null, HK_AI_HISTORY);
    document.getElementById(typingId)?.remove();
    log.insertAdjacentHTML('beforeend', `<div class="hk-ai-msg hk-ai-msg--bot">${hkEscapeHtml(result.text)}</div>`);
    log.scrollTop = log.scrollHeight;
    if(!result.ok) hkToast('AI ไม่พร้อมใช้งานตอนนี้ ใช้คำตอบสำรองจากฐานข้อมูลแทน');

    HK_AI_HISTORY.push({ role: 'user', text: q }, { role: 'bot', text: result.text });
    input.disabled = false;
    send.disabled = false;
    input.focus();
  }
  send.addEventListener('click', () => ask(input.value));
  input.addEventListener('keydown', (e) => { if(e.key === 'Enter') ask(input.value); });
  document.querySelectorAll('.hk-ai-suggestion').forEach(btn => btn.addEventListener('click', () => ask(btn.dataset.q)));
}

document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = hkIcon(el.getAttribute('data-icon')));
  hkWireSidebarToggle();
  hkAuthRenderSidebarFooter();
  hkRenderAIRoot();
  await hkBootstrapMachines();
  if(HK_LAST_LOAD_ERROR) hkToast(hkLoadErrorToastMessage());
});
