import { $, $$, esc, today, diffDays, fmt, addDays, send, parsePairCode, setPin, deriveKey, seal, open, uid } from './core.js';
import { ctx, save, commit, toast, sheet, burst, confetti, sound, rainSound, applyTheme } from './ui.js';
import { PHASES, PERIOD_KIT, BLOOP_OUTFITS, THEMES, SYMPTOM_INDEX } from './content.js';
import { dayInfo, stats, insights, normalize, battery, fertilePlan, conceptionChance } from './cycle.js';
import { bloopSVG } from './bloop.js';
import { askPrivately, shield } from './ai.js';
import { sendCycle, sendLog, syncNow } from './app.js';

export function renderMe(view) {
  const st = ctx.st, s = stats(st);
  const ins = insights(st);
  const ps = normalize(st.periods);
  const hist = [];
  for (let i = 1; i < ps.length; i++) { const L = diffDays(ps[i].start, ps[i - 1].start); if (L >= 15 && L <= 60) hist.push({ L, d: ps[i - 1].start }); }
  const h = hist.slice(-6), max = Math.max(35, ...h.map(x => x.L));
  const daysUsed = diffDays(today(), st.firstUse) + 1;

  view.innerHTML = `
  <div class="topbar"><h1>Me</h1><button class="icon-btn" id="settingsBtn" aria-label="Settings">⚙️</button></div>

  <div class="card"><h3>✨ Your patterns</h3><div class="stack" style="margin-top:8px">${ins.map(i => `<div class="row" style="align-items:flex-start"><span style="font-size:22px">${i.e}</span><p>${esc(i.t)}</p></div>`).join('')}</div></div>

  <div class="card"><div class="row between"><h3>Cycle history</h3><span class="small muted">${s.count} period${s.count === 1 ? '' : 's'} logged</span></div>
    ${h.length ? `<div class="bars">${h.map(x => `<div style="height:${x.L / max * 100}%"><span>${x.L}</span></div>`).join('')}</div><div class="bars-x">${h.map(x => `<span>${fmt(x.d, { month: 'short' })}</span>`).join('')}</div>`
      : `<p class="small muted">Your cycle lengths show up here after two periods.</p>`}
    <button class="btn soft sm" id="reportBtn" style="margin-top:14px">🩺 Doctor report</button>
  </div>

  <div class="grid2">
    <button class="tile" id="babyBtn"><span class="e">👶</span><div><b>Baby planning</b><span>${st.settings.goal === 'ttc' ? 'Trying mode on 💞' : 'Your best days to conceive'}</span></div></button>
    <button class="tile" id="askBtn"><span class="e">🫧</span><div><b>Ask Bloop</b><span>Your sweet AI buddy</span></div></button>
    <button class="tile" id="comfortBtn"><span class="e">🌧️</span><div><b>Cramp comfort</b><span>Breathe, rain, warmth</span></div></button>
    <button class="tile" id="careBtn"><span class="e">🧴</span><div><b>Self-care</b><span>For every phase</span></div></button>
    <button class="tile" id="kitBtn"><span class="e">👜</span><div><b>Period kit</b><span>${PERIOD_KIT.filter(k => st.kit[k]).length}/${PERIOD_KIT.length} packed</span></div></button>
    <button class="tile" id="wardrobeBtn"><span class="e">🎀</span><div><b>Bloop's closet</b><span>Dress up Bloop</span></div></button>
    <button class="tile" id="themeBtn"><span class="e">🎨</span><div><b>Themes</b><span>${THEMES[st.settings.theme]?.name}</span></div></button>
  </div>
  <p class="small muted" style="text-align:center;margin-top:18px">You've been using MochiBoo for ${daysUsed} day${daysUsed === 1 ? '' : 's'} 💗</p>`;

  $('#settingsBtn').onclick = openSettings;
  $('#babyBtn').onclick = openBaby;
  $('#reportBtn').onclick = openReport;
  $('#askBtn').onclick = openAsk;
  $('#comfortBtn').onclick = openComfort;
  $('#careBtn').onclick = () => sheet('Self-care by phase', Object.values(PHASES).map(p => `<div class="card"><h3>${p.emoji} ${p.name}</h3><p class="small muted">${p.feel}</p><ul style="margin:8px 0 0;padding-left:20px">${p.care.map(c => `<li>${c}</li>`).join('')}</ul></div>`).join(''));
  $('#kitBtn').onclick = openKit;
  $('#wardrobeBtn').onclick = openWardrobe;
  $('#themeBtn').onclick = openThemes;
}

export function openBaby() {
  const st = ctx.st;
  const plan = fertilePlan(st);
  const today_ = conceptionChance(st);
  const ttc = st.settings.goal === 'ttc';
  const bar = d => `<div class="row" style="padding:6px 0;gap:10px"><b style="width:74px;font-size:14px">${fmt(d.date, { weekday: 'short', day: 'numeric' })}</b>
    <div class="battery" style="height:16px;flex:1"><i style="width:${Math.max(4, d.pct * 3)}%;background:${d.level === 'peak' ? 'var(--accent)' : d.level === 'high' ? 'var(--fertile)' : 'var(--soft)'}"></i></div>
    <span class="small" style="width:96px;text-align:right">${d.level === 'peak' ? '💞 Best' : d.level === 'high' ? '🌿 High' : d.level === 'medium' ? '🌱 Some' : 'Low'}${(st.logs[d.date]?.sym || []).some(k => /intimacy:(un)?protected/.test(k)) ? ' 🍒' : ''}</span></div>`;
  const sh = sheet('Baby planning 👶', `
    <div class="switch"><span><b>We're trying for a baby</b><br><span class="small muted">Highlights your best days on Today${st.pair ? ' and on ' + esc(st.partnerName) + '\'s phone' : ''}</span></span><input type="checkbox" class="toggle" id="ttc" ${ttc ? 'checked' : ''}></div>
    ${!plan ? `<div class="card flat"><p>Log your last period first, then I can find your best days 🫧</p></div>` : `
    <div class="card" style="text-align:center"><p class="small muted">Today</p><h2>${today_.label}</h2><p class="small muted" style="margin-top:4px">About ${today_.pct}% chance per cycle from being together today</p></div>
    <div class="card"><h3>Your next fertile window</h3><p class="small muted" style="margin-bottom:8px">Ovulation expected around <b>${fmt(plan.ovulation, { weekday: 'long', day: 'numeric', month: 'long' })}</b></p>
      ${plan.days.map(bar).join('')}
      <p class="small" style="margin-top:10px">💞 Best days: <b>${plan.best.map(d => fmt(d, { weekday: 'short', day: 'numeric' })).join(', ')}</b></p>
      ${plan.intimate.length ? `<p class="small muted" style="margin-top:4px">🍒 Together on ${plan.intimate.length} fertile day${plan.intimate.length > 1 ? 's' : ''} this window</p>` : ''}</div>
    <div class="card"><h3>Tips that really help</h3><ul style="padding-left:20px;margin:6px 0 0">
      <li>Be together every 1 to 2 days during the fertile window, especially the 3 best days.</li>
      <li>Ovulation tests make this much more accurate: log ➕ when one turns positive. The next 1 to 2 days are the best.</li>
      <li>Clear, stretchy "egg white" discharge means ovulation is close. Log it and I'll boost that day.</li>
      <li>A small rise in basal temperature that stays up means ovulation has just happened.</li>
      <li>Ask your doctor about starting folic acid or a prenatal vitamin.</li></ul></div>
    <p class="small muted">${plan.learned < 3 ? 'Predictions get sharper after 3 or more logged periods. ' : ''}${plan.irregular ? 'Your cycles vary a lot, so ovulation tests are extra useful. ' : ''}These are estimates from your data, not a medical guarantee. If you've been trying for 12 months (or 6 months if you're over 35), it's worth seeing a doctor together.</p>`}`);
  $('#ttc', sh.el).onchange = async e => {
    st.settings.goal = e.target.checked ? 'ttc' : 'track';
    await send(st, 'goal', { goal: st.settings.goal }); await save(); ctx.render();
    if (e.target.checked) { confetti(); toast('Trying mode on. Sending baby dust ✨👶'); } else toast('Trying mode off');
  };
}

function openKit() {
  const st = ctx.st;
  const sh = sheet('Period kit 👜', `<p class="muted small">Pack it before your period sneaks up.</p>${PERIOD_KIT.map(k => `<div class="switch"><span>${esc(k)}</span><input type="checkbox" class="toggle" data-k="${esc(k)}" ${st.kit[k] ? 'checked' : ''}></div>`).join('')}`);
  $$('[data-k]', sh.el).forEach(c => c.onchange = async () => { st.kit[c.dataset.k] = c.checked; await save(); if (PERIOD_KIT.every(k => st.kit[k])) { confetti(); toast('Kit fully packed. Ready for anything 💪'); } ctx.render(); });
}

function openComfort() {
  let rainOn = false;
  const sh = sheet('Cramp comfort 🌧️', `<div class="breathe" id="br">Breathe in</div>
    <p style="text-align:center" class="muted">In for 4, hold for 2, out for 4. Let your tummy go soft.</p>
    <div class="stack" style="margin-top:16px"><button class="btn block soft" id="rain">🌧️ Play rain sounds</button>
    <div class="note">🔥 Heat pad on your lower tummy or back</div><div class="note">🫖 Ginger or chamomile tea</div><div class="note">🧘‍♀️ Child's pose for 2 minutes</div><div class="note">💊 Painkillers work best taken early</div>
    <button class="btn block" id="callBoo">🧸 Ask ${esc(ctx.st.partnerName)} for cuddles</button></div>`);
  const labels = ['Breathe in', 'Hold', 'Breathe out'];
  let i = 0; const iv = setInterval(() => { const el = $('#br', sh.el); if (!el) return clearInterval(iv); i = (i + 1) % 3; el.textContent = labels[i]; }, 3400);
  $('#rain', sh.el).onclick = e => { rainOn = !rainOn; rainSound(rainOn); e.target.textContent = rainOn ? '⏸️ Stop rain' : '🌧️ Play rain sounds'; };
  $('#callBoo', sh.el).onclick = async () => { await send(ctx.st, 'need', { kind: 'cuddles', emoji: '🧸', label: 'Cuddles (cramps)' }); ctx.st.needs.unshift({ id: uid(), kind: 'cuddles', emoji: '🧸', label: 'Cuddles (cramps)', ts: Date.now() }); await save(); toast('He knows. Help is on the way 🧸'); };
  const oldClose = sh.close; sh.close = () => { rainSound(false); clearInterval(iv); oldClose(); };
  sh.el.querySelector('[data-close]').onclick = sh.close;
}

function openWardrobe() {
  const st = ctx.st, used = diffDays(today(), st.firstUse);
  const sh = sheet('Bloop\'s closet 🎀', `<div class="grid3">${BLOOP_OUTFITS.map(([id, n, need]) => {
    const locked = used < need;
    return `<button class="tile" data-o="${id}" ${locked ? 'disabled' : ''} style="align-items:center;text-align:center;${st.settings.outfit === id ? 'outline:3px solid var(--primary)' : ''};${locked ? 'opacity:.5' : ''}">${bloopSVG({ mood: 'happy', outfit: id, size: 70, wobble: false })}<b style="font-size:13px">${n}</b><span>${locked ? `🔒 Day ${need}` : ''}</span></button>`;
  }).join('')}</div><p class="small muted" style="margin-top:12px">New outfits unlock the longer you use MochiBoo.</p>`);
  $$('[data-o]', sh.el).forEach(b => b.onclick = async () => { st.settings.outfit = b.dataset.o; sound('yay'); sh.close(); await commit(); toast('Bloop looks adorable 🥹'); });
}

function openThemes() {
  const st = ctx.st;
  const sh = sheet('Themes 🎨', `<div class="grid2">${Object.entries(THEMES).map(([id, t]) => `<button class="swatch ${st.settings.theme === id ? 'on' : ''}" data-t="${id}" style="background:${t.bg};color:${t.ink}"><div class="dots"><i style="background:${t.primary}"></i><i style="background:${t.blob}"></i><i style="background:${t.soft}"></i><i style="background:${t.accent}"></i></div><b>${t.name}</b></button>`).join('')}</div>
    <div class="switch"><span>🌙 Follow my cycle phase</span><input type="checkbox" class="toggle" id="pt" ${st.settings.phaseTheme ? 'checked' : ''}></div>
    <div class="switch"><span>🎉 Seasonal magic (Valentine's, birthday, Eid…)</span><input type="checkbox" class="toggle" id="as" ${st.settings.autoSeason ? 'checked' : ''}></div>`);
  $$('[data-t]', sh.el).forEach(b => b.onclick = async () => { st.settings.theme = b.dataset.t; st.settings.phaseTheme = false; $$('[data-t]', sh.el).forEach(x => x.classList.toggle('on', x === b)); $('#pt', sh.el).checked = false; applyTheme(); sound('pop'); await save(); ctx.render(); });
  $('#pt', sh.el).onchange = async e => { st.settings.phaseTheme = e.target.checked; await commit(); };
  $('#as', sh.el).onchange = async e => { st.settings.autoSeason = e.target.checked; await save(); };
}

function openReport() {
  const st = ctx.st, s = stats(st), ps = normalize(st.periods).slice(-6), info = dayInfo(st);
  const symCount = {};
  for (const [d, l] of Object.entries(st.logs)) if (diffDays(today(), d) <= 180) for (const k of l.sym || []) symCount[k] = (symCount[k] || 0) + 1;
  const top = Object.entries(symCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const painDays = Object.values(st.logs).filter(l => l.pain >= 6).length;
  const html = `<div id="printArea">
    <p class="muted small">Cycle report for ${esc(st.name)}, generated ${fmt(today(), { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    <div class="card"><h3>Summary</h3><p>Average cycle: <b>${s.cycleLen} days</b>${s.learned > 1 ? ` (variation ±${s.variation} days)` : ''}<br>Average period: <b>${s.periodLen} days</b><br>Periods logged: <b>${s.count}</b>${info.known ? `<br>Next period expected: <b>${fmt(info.nextStart, { day: 'numeric', month: 'long' })}</b>` : ''}<br>Days with pain 6/10 or more: <b>${painDays}</b></p></div>
    <div class="card"><h3>Recent periods</h3>${ps.map(p => `<p>${fmt(p.start, { day: 'numeric', month: 'short', year: 'numeric' })} → ${p.end ? fmt(p.end) : 'ongoing'}${p.end ? ` (${diffDays(p.end, p.start) + 1} days)` : ''}</p>`).join('') || '<p class="muted">None logged yet</p>'}</div>
    <div class="card"><h3>Most logged symptoms (6 months)</h3>${top.map(([k, n]) => `<p>${SYMPTOM_INDEX[k]?.emoji || ''} ${SYMPTOM_INDEX[k]?.name || k}: ${n} days</p>`).join('') || '<p class="muted">Nothing logged yet</p>'}</div>
  </div><button class="btn block" id="print">🖨️ Print or save as PDF</button>`;
  const sh = sheet('Doctor report 🩺', html);
  $('#print', sh.el).onclick = () => {
    const w = window.open('', '_blank');
    if (!w) return toast('Allow pop-ups to print the report');
    w.document.write(`<html><head><title>MochiBoo cycle report</title><style>body{font-family:system-ui;padding:24px;color:#222}.card{border:1px solid #ddd;border-radius:12px;padding:12px 16px;margin:12px 0}h3{margin:0 0 6px}.muted{color:#777}</style></head><body><h2>Cycle report</h2>${$('#printArea', sh.el).innerHTML}</body></html>`);
    w.document.close(); setTimeout(() => w.print(), 300);
  };
}

function openAsk() {
  const st = ctx.st; st.ai.chat = st.ai.chat || [];
  const info = dayInfo(st), log = st.logs[today()] || {};
  const mode = st.settings.aiPrivacy || 'anonymous';
  const guard = mode === 'full' ? { scrub: t => t, unscrub: t => t } : shield({ '[HER]': st.name, '[HIM]': st.partnerName });
  const health = mode === 'minimal' ? (info.known ? `She is in her ${info.phase} phase.` : '')
    : `Today: ${info.known ? `cycle day ${info.day}, ${info.phase} phase${info.pms ? ' (PMS days)' : ''}, next period in ${info.daysToNext} days, average cycle ${info.s.cycleLen} days` : 'no cycle data yet'}. Today's log: ${(log.sym || []).map(k => SYMPTOM_INDEX[k]?.name).filter(Boolean).join(', ') || 'nothing'}${log.pain ? `, pain ${log.pain}/10` : ''}. Battery ${battery(st)}%.`;
  const sys = `You are Bloop, a tiny pink jelly-blob mascot living in MochiBoo, a cute app [HIM] made for his wife [HER]. Talk to [HER] warmly, playfully and briefly (under 120 words), with a few cute emojis. Always call her [HER] and her husband [HIM], exactly like that. You help with cycle questions, self-care, comfort and cheering her up. You are not a doctor: for severe pain, very heavy bleeding, missed periods with concern, or anything worrying, gently suggest seeing a doctor.
${health}`.replace(/\[HER\]/g, mode === 'full' ? st.name : '[HER]').replace(/\[HIM\]/g, mode === 'full' ? st.partnerName : '[HIM]');
  const draw = sh => {
    sh.body.innerHTML = `<div class="chat" id="chat">${st.ai.chat.length ? '' : `<div class="bubble bot">Hi ${esc(st.name)}! 🫧 Ask me anything: cramps, cravings, moods, or just say hi 💗</div>`}${st.ai.chat.map(m => `<div class="bubble ${m.role === 'user' ? 'me' : 'bot'}">${esc(m.content)}</div>`).join('')}</div>
      <div class="chips" style="margin:8px 0">${['Why am I so moody? 🥺', 'Help my cramps 🌀', 'What should I eat today? 🍓', 'Cheer me up 💗'].map(q => `<button class="chip" data-q="${esc(q)}">${q}</button>`).join('')}</div>
      <div class="row"><input class="input" id="ai" placeholder="Talk to Bloop…"><button class="btn sm" id="go" aria-label="Send">💗</button></div>
      ${st.ai.chat.length ? '<button class="btn ghost sm" id="clear">Clear chat</button>' : ''}`;
    const go = async (text) => {
      if (!text) return;
      st.ai.chat.push({ role: 'user', content: text }); draw(sh);
      const box = $('#chat', sh.el); box.insertAdjacentHTML('beforeend', '<div class="bubble bot" id="typing">Bloop is thinking… 🫧</div>'); box.lastElementChild.scrollIntoView({ block: 'end' });
      try { const r = await askPrivately(st.ai, sys, st.ai.chat.slice(-12), guard); st.ai.chat.push({ role: 'assistant', content: r.trim() }); }
      catch (e) { st.ai.chat.push({ role: 'assistant', content: e.message }); }
      st.ai.chat = st.ai.chat.slice(-40); await save(); draw(sh); $('#chat', sh.el).lastElementChild?.scrollIntoView({ block: 'end' });
    };
    $('#go', sh.el).onclick = () => go($('#ai', sh.el).value.trim());
    $('#ai', sh.el).onkeydown = e => { if (e.key === 'Enter') go(e.target.value.trim()); };
    $$('[data-q]', sh.el).forEach(b => b.onclick = () => go(b.dataset.q));
    $('#clear', sh.el)?.addEventListener('click', async () => { st.ai.chat = []; await save(); draw(sh); });
  };
  const sh = sheet('Ask Bloop 🫧', ''); draw(sh);
}

// ======================================================= pairing
export function openPairing() {
  const st = ctx.st;
  const sh = sheet('Connect with your boo 💞', `<p class="muted">Open MochiBoo on his phone → Settings → Pair. Scan his QR or paste his code.</p>
    <button class="btn block soft" id="scan" style="margin-top:12px">📷 Scan QR code</button>
    <textarea class="input" id="code" placeholder="MOCHIBOO1:…" style="margin-top:12px"></textarea><p class="small" id="err" style="color:var(--accent)"></p>
    <button class="btn block" id="pair" style="margin-top:10px">Connect</button>
    ${st.pair ? `<button class="btn ghost block" id="unpair">Disconnect</button>` : ''}`);
  const doPair = async code => {
    try {
      const p = parsePairCode(code); st.pair = p; st.partnerName = p.hn || st.partnerName; st.lastPoll = ''; st.outbox = [];
      if (p.at && !st.dates.together) st.dates.together = p.at;
      await send(st, 'hello', { name: st.name }); await send(st, 'goal', { goal: st.settings.goal }); await sendCycle();
      for (const d of Object.keys(st.logs).sort().slice(-60)) await sendLog(d);
      if (st.wishes.length) await send(st, 'wish', { items: st.wishes });
      await save(); sh.close(); confetti(); toast(`Connected with ${st.partnerName} 💞`); ctx.render(); syncNow();
    } catch (e) { $('#err', sh.el).textContent = e.message; }
  };
  $('#scan', sh.el).onclick = () => scanQR(doPair);
  $('#pair', sh.el).onclick = () => doPair($('#code', sh.el).value);
  $('#unpair', sh.el)?.addEventListener('click', async () => { st.pair = null; await save(); sh.close(); ctx.render(); toast('Disconnected'); });
}

export function scanQR(onCode) {
  let stream, raf, done = false;
  const sh = sheet('Scan his code 📷', `<video class="scan" playsinline muted></video><p class="small muted" style="margin-top:10px;text-align:center">Point at the QR on his phone</p>`);
  const stop = () => { done = true; cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()); };
  const oldClose = sh.close; sh.close = () => { stop(); oldClose(); }; sh.el.querySelector('[data-close]').onclick = sh.close;
  const load = window.jsQR ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = './vendor/jsQR.js'; s.onload = res; s.onerror = rej; document.head.append(s); });
  load.then(() => navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })).then(s => {
    stream = s; const v = $('video', sh.el); v.srcObject = s; v.play();
    const c = document.createElement('canvas'), g = c.getContext('2d', { willReadFrequently: true });
    const tick = () => {
      if (done) return;
      if (v.readyState >= 2) {
        c.width = v.videoWidth; c.height = v.videoHeight; g.drawImage(v, 0, 0);
        const r = window.jsQR(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
        if (r && r.data.includes('MOCHIBOO1:')) { sh.close(); sound('yay'); onCode(r.data); return; }
      }
      raf = requestAnimationFrame(tick);
    }; tick();
  }).catch(() => { sh.body.innerHTML = '<p>Camera isn\'t available. Paste his code instead 💗</p>'; });
}

// ======================================================= settings
function openSettings() {
  const st = ctx.st, se = st.settings;
  const sh = sheet('Settings ⚙️', `
    <div class="card"><h3>You</h3>
      <label class="field" for="sn">Your name</label><input class="input" id="sn" value="${esc(st.name)}">
      <label class="field" for="pn">What you call him</label><input class="input" id="pn" value="${esc(st.partnerName)}">
      <label class="field" for="bd">Your birthday</label><input class="input" type="date" id="bd" value="${st.dates.birthday || ''}">
      <label class="field" for="tg">Together since</label><input class="input" type="date" id="tg" value="${st.dates.together || ''}">
      <label class="field" for="an">Anniversary</label><input class="input" type="date" id="an" value="${st.dates.anniversary || ''}">
    </div>
    <div class="card"><h3>Cycle</h3>
      <label class="field" for="cl">Typical cycle: <b id="clv">${se.cycleLen}</b> days</label><input type="range" id="cl" min="20" max="45" value="${se.cycleLen}">
      <label class="field" for="pl">Typical period: <b id="plv">${se.periodLen}</b> days</label><input type="range" id="pl" min="2" max="10" value="${se.periodLen}">
      <p class="small muted">Once you log a few periods, MochiBoo uses your real averages instead.</p>
    </div>
    <div class="card"><h3>Privacy</h3>
      <div class="switch"><span>💞 Share my cycle & logs with ${esc(st.partnerName)}</span><input type="checkbox" class="toggle" id="sh" ${se.sharing ? 'checked' : ''}></div>
      <div class="switch"><span>🔒 PIN lock</span><input type="checkbox" class="toggle" id="pin" ${se.pin ? 'checked' : ''}></div>
      <div class="switch"><span>🔔 Cute sounds</span><input type="checkbox" class="toggle" id="snd" ${se.sounds ? 'checked' : ''}></div>
      <button class="btn soft block" id="pairB" style="margin-top:10px">${st.pair ? '💞 Paired with ' + esc(st.partnerName) : '🔗 Pair with him'}</button>
      ${st.outbox.length ? `<p class="small muted" style="margin-top:8px">${st.outbox.length} message${st.outbox.length > 1 ? 's' : ''} waiting for him to confirm.</p>` : ''}
    </div>
    <div class="card"><h3>Ask Bloop (optional AI)</h3><p class="small muted">Keys stay encrypted on this phone. Your names are swapped out before anything is sent, unless you pick Full.</p>
      <label class="field" for="aip">What the AI may know</label>
      <select class="input" id="aip">
        <option value="anonymous" ${st.settings.aiPrivacy !== 'full' && st.settings.aiPrivacy !== 'minimal' ? 'selected' : ''}>🕶️ Anonymous: no names, just today's cycle info</option>
        <option value="minimal" ${st.settings.aiPrivacy === 'minimal' ? 'selected' : ''}>🔒 Minimal: no names, only your phase</option>
        <option value="full" ${st.settings.aiPrivacy === 'full' ? 'selected' : ''}>💗 Full: names included</option>
      </select>
      <label class="field" for="kg">Gemini key</label><input class="input" id="kg" type="password" value="${esc(st.ai.gemini)}" autocomplete="off">
      <label class="field" for="kq">Groq key</label><input class="input" id="kq" type="password" value="${esc(st.ai.groq)}" autocomplete="off">
      <label class="field" for="ko">OpenRouter key</label><input class="input" id="ko" type="password" value="${esc(st.ai.openrouter)}" autocomplete="off">
    </div>
    <div class="card"><h3>Backup</h3><p class="small muted">Your data lives only on this phone. ${st.pair ? `${esc(st.partnerName)}'s app keeps a copy too.` : ''}</p>
      <div class="grid2" style="margin-top:10px"><button class="btn soft sm" id="exp">Export backup</button><button class="btn soft sm" id="imp">Import backup</button></div>
      ${st.pair ? `<button class="btn ghost block sm" id="restore">Restore from ${esc(st.partnerName)}'s phone</button>` : ''}
      <input type="file" id="impF" accept=".mochiboo,application/octet-stream,text/plain" class="hidden">
    </div>
    <button class="btn block" id="saveS">Save settings</button>
    <p class="small muted" style="text-align:center;margin-top:14px">MochiBoo · made with love by ${esc(st.partnerName)} 💗</p>`);
  const b = sh.body;
  $('#cl', b).oninput = e => $('#clv', b).textContent = e.target.value;
  $('#pl', b).oninput = e => $('#plv', b).textContent = e.target.value;
  $('#pairB', b).onclick = () => { sh.close(); openPairing(); };
  $('#pin', b).onchange = e => {
    if (!e.target.checked) { setPin(st, null).then(() => toast('PIN removed')); return; }
    const p = prompt('Choose a 4-digit PIN'); if (!/^\d{4}$/.test(p || '')) { e.target.checked = false; return toast('PIN must be 4 digits'); }
    const p2 = prompt('Type it again'); if (p !== p2) { e.target.checked = false; return toast('PINs didn\'t match'); }
    setPin(st, p).then(() => toast('🔒 Locked with your PIN'));
  };
  $('#saveS', b).onclick = async () => {
    const wasSharing = se.sharing;
    st.name = $('#sn', b).value.trim() || st.name; st.partnerName = $('#pn', b).value.trim() || st.partnerName;
    st.dates = { ...st.dates, birthday: $('#bd', b).value, together: $('#tg', b).value, anniversary: $('#an', b).value };
    se.cycleLen = +$('#cl', b).value; se.periodLen = +$('#pl', b).value;
    se.sharing = $('#sh', b).checked; se.sounds = $('#snd', b).checked;
    st.settings.aiPrivacy = $('#aip', b).value; st.ai.gemini = $('#kg', b).value.trim(); st.ai.groq = $('#kq', b).value.trim(); st.ai.openrouter = $('#ko', b).value.trim();
    if (wasSharing !== se.sharing) await send(st, 'share', { sharing: se.sharing });
    if (se.sharing) { await sendCycle(); if (!wasSharing) for (const d of Object.keys(st.logs).sort().slice(-60)) await sendLog(d); }
    await send(st, 'dates', { birthday: st.dates.birthday, together: st.dates.together, anniversary: st.dates.anniversary });
    sh.close(); await commit(); toast('Saved 💗');
  };
  $('#exp', b).onclick = async () => {
    const pw = prompt('Choose a backup password (you\'ll need it to restore)'); if (!pw) return;
    const key = await deriveKey(pw, 'mochiboo-backup');
    const data = { ...st, outbox: [], seen: [] };
    const file = new File([await seal(key, data)], `mochiboo-${today()}.mochiboo`, { type: 'text/plain' });
    if (navigator.canShare?.({ files: [file] })) navigator.share({ files: [file], title: 'MochiBoo backup' }).catch(() => {});
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click(); }
  };
  $('#imp', b).onclick = () => $('#impF', b).click();
  $('#impF', b).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    const pw = prompt('Backup password'); if (!pw) return;
    try { const data = await open(await deriveKey(pw, 'mochiboo-backup'), (await f.text()).trim()); Object.assign(st, data); await save(); sh.close(); confetti(); ctx.render(); toast('Backup restored ✨'); }
    catch { toast('Wrong password or not a MochiBoo backup'); }
  };
  $('#restore', b)?.addEventListener('click', async () => { await send(st, 'restore_req', {}); await save(); toast(`Asked ${st.partnerName}'s phone. Your data arrives in a minute ✨`, 3500); });
}
