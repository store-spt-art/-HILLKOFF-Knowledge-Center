/* =========================================================
   HILLKOFF · ai-bot.js
   HILLKOFFBOT now answers through Gemini (proxied via Code.gs so the
   API key never reaches the browser — see hkApiAiChat in api-client.js),
   grounded in the machine database. hkAskBot() below — the old
   client-side keyword matcher — is kept as an automatic fallback if the
   AI call ever fails (missing API key, quota, offline, etc.) so the bot
   still answers *something* instead of erroring out.
   ========================================================= */

function hkFindMachineInText(text){
  const all = getAllMachines();
  const lower = text.toLowerCase();
  const hit = all.find(m => lower.includes(m.name.toLowerCase()));
  if(hit) return hit;
  // fall back to matching by id (e.g. CM-001)
  return all.find(m => lower.includes(m.id.toLowerCase())) || null;
}

// Preferred path: ask Gemini (via Code.gs), with conversation history for
// context. scopedMachine (on a machine's own AI tab) is woven into the
// question as a hint so the model knows which machine "it" refers to.
// Returns { text, ok } — ok is false when this fell back to the
// old keyword bot, so callers can show a subtle "AI ไม่พร้อมใช้งาน" note.
async function hkAskBotAI(question, scopedMachine, history){
  const q = (question || '').trim();
  if(!q) return { text: 'พิมพ์คำถามเกี่ยวกับเครื่องจักรหรืออะไหล่ได้เลยครับ', ok: true };
  try{
    const prefixed = scopedMachine
      ? `[กำลังดูข้อมูลเครื่อง: ${scopedMachine.name} (${scopedMachine.id})] ${q}`
      : q;
    const result = await hkApiAiChat(prefixed, history || []);
    if(result && result.error) throw new Error(result.error);
    if(!result || !result.reply) throw new Error('ไม่ได้รับคำตอบจาก AI');
    return { text: result.reply, ok: true };
  }catch(err){
    console.error('Gemini chat failed, falling back to the keyword bot:', err);
    return { text: hkAskBot(q, scopedMachine), ok: false, error: err };
  }
}

// Fallback only — simple client-side keyword matcher. Never reasons
// about repairs, stock, or anything outside the data.
function hkAskBot(question, scopedMachine){
  const q = (question || '').trim();
  if(!q) return 'พิมพ์คำถามเกี่ยวกับเครื่องจักรหรืออะไหล่ในฐานข้อมูลได้เลยครับ';
  const lower = q.toLowerCase();
  const machine = scopedMachine || hkFindMachineInText(q);

  if(/boiler|บอยเลอร์|หม้อต้ม/.test(lower)){
    if(machine){
      const cb = machine.specification.coffeeBoiler || 'ไม่มีข้อมูล';
      const sb = machine.specification.steamBoiler || 'ไม่มีข้อมูล';
      return `${machine.name} ใช้ Coffee Boiler ${cb} และ Steam Boiler ${sb} ครับ`;
    }
    return 'ระบุชื่อเครื่องจักรด้วยครับ เช่น "La Marzocco GB5 ใช้ Boiler กี่ลิตร"';
  }

  if(/pump|ปั๊ม/.test(lower)){
    if(machine){
      const pump = machine.specification.pump || 'ไม่มีข้อมูลในสเปก';
      const partMatch = (machine.parts || []).find(p => /pump/i.test(p.name));
      const extra = partMatch ? ` (อะไหล่: ${partMatch.name} — ${partMatch.brand} ${partMatch.model})` : '';
      return `${machine.name} ใช้ ${pump}${extra} ครับ`;
    }
    return 'ระบุชื่อเครื่องจักรด้วยครับ เช่น "Rocket R9 ใช้ Pump อะไร"';
  }

  if(/flowmeter|โฟลว์มิเตอร์|อยู่ตรงไหน|ติดตั้งตรงไหน/.test(lower)){
    return `รูปตำแหน่ง Flowmeter เก็บอยู่ในแท็บ "Internal Structure" ของแต่ละเครื่อง (กลุ่ม Flowmeter)${machine ? ` — ลองดูที่ ${machine.name} ได้ครับ` : ' เลือกเครื่องจักรที่ต้องการแล้วเปิดแท็บ Internal Structure ได้เลยครับ'}`;
  }

  if(/wiring|วงจร|diagram/.test(lower)){
    if(machine){
      const has = machine.documents && machine.documents.wiringDiagram;
      return has ? `${machine.name} มี Wiring Diagram อยู่ในแท็บ Documents ครับ` : `${machine.name} ยังไม่มีไฟล์ Wiring Diagram ในระบบครับ`;
    }
    return 'เปิดแท็บ "Documents" ของเครื่องจักรที่ต้องการ จะมี Wiring Diagram ให้ดาวน์โหลด (ถ้ามีอัปโหลดไว้) ครับ';
  }

  const specHit = HK_SPEC_FIELDS.find(f => lower.includes(f.label.toLowerCase()));
  if(specHit && machine){
    const val = machine.specification[specHit.key] || 'ไม่มีข้อมูล';
    return `${machine.name} — ${specHit.label}: ${val}`;
  }

  if(/อะไหล่|part/.test(lower) && machine){
    if(!machine.parts || machine.parts.length === 0) return `${machine.name} ยังไม่มีรายการอะไหล่ในระบบครับ`;
    return `${machine.name} มีอะไหล่ที่บันทึกไว้: ${machine.parts.map(p => p.name).join(', ')}`;
  }

  if(machine){
    return `${machine.name} (${machine.brand} ${machine.model}) — ${machine.type}. ลองถามเกี่ยวกับ Pump, Boiler, อะไหล่ หรือเอกสารของเครื่องนี้ได้ครับ`;
  }

  return 'ผมตอบได้เฉพาะคำถามที่มีข้อมูลอยู่ในฐานข้อมูลเครื่องจักรครับ ลองถามเช่น "Rocket R9 ใช้ Pump อะไร" หรือ "La Marzocco GB5 ใช้ Boiler กี่ลิตร"';
}
