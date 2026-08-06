/* =========================================================
   HILLKOFF · ai-assistant.js
   ========================================================= */

const HK_AI_EXAMPLES = [
  'Rocket R9 ใช้ Pump อะไร',
  'Flowmeter รุ่นนี้อยู่ตรงไหน',
  'La Marzocco GB5 ใช้ Boiler กี่ลิตร',
  'ขอดู Wiring Diagram ของ Nuova Aurelia',
];

function hkRenderAIRoot(){
  const root = document.getElementById('hk-ai-root');
  root.innerHTML = `
    <div class="hk-ai-panel" style="height: 520px;">
      <div class="hk-ai-panel__log" id="hk-ai-log">
        <div class="hk-ai-msg hk-ai-msg--bot">สวัสดีครับ ผมคือ <strong>HILLKOFFBOT</strong> ผมตอบได้เฉพาะข้อมูลที่มีอยู่ในฐานข้อมูลเครื่องจักรครับ ลองถามได้เลย</div>
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

  function ask(text){
    if(!text.trim()) return;
    log.insertAdjacentHTML('beforeend', `<div class="hk-ai-msg hk-ai-msg--user">${hkEscapeHtml(text)}</div>`);
    const answer = hkAskBot(text, null);
    log.insertAdjacentHTML('beforeend', `<div class="hk-ai-msg hk-ai-msg--bot">${hkEscapeHtml(answer)}</div>`);
    log.scrollTop = log.scrollHeight;
    input.value = '';
  }
  send.addEventListener('click', () => ask(input.value));
  input.addEventListener('keydown', (e) => { if(e.key === 'Enter') ask(input.value); });
  document.querySelectorAll('.hk-ai-suggestion').forEach(btn => btn.addEventListener('click', () => ask(btn.dataset.q)));
}

document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = hkIcon(el.getAttribute('data-icon')));
  hkWireSidebarToggle();
  hkRenderAIRoot();
  await hkBootstrapMachines();
  if(HK_LAST_LOAD_ERROR) hkToast('โหลดข้อมูลจากฐานข้อมูลไม่สำเร็จ กำลังแสดงข้อมูลตัวอย่างแทน');
});
