import { $, $$, esc, today, addDays, diffDays, fmt, iso, parse, loadStore, hasEncryptedStore, saveStore, send, sync, parsePairCode, uid } from './core.js';
import { ctx, save, commit, toast, sheet, burst, confetti, fireworks, rain, sound, applyTheme, season, closeAllSheets } from './ui.js';
import { SYMPTOM_GROUPS, PHASES, AFFIRMATIONS, BLOOP_OUTFITS, TONIGHT_ANSWERS } from './content.js';
import { dayInfo, stats, startPeriod, endPeriod, isPeriodDay, removePeriodContaining, calendarMark, battery, normalize, conceptionChance, fertilePlan } from './cycle.js';
import { bloopSVG, moodFor } from './bloop.js';
import { renderUs, openTonight, unreadCount } from './us.js';
import { renderMe, openPairing, openBaby } from './me.js';

const app = $('#app');

// ======================================================= boot
async function boot() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  navigator.storage?.persist?.().catch(() => {});
  if (hasEncryptedStore()) return lockScreen();
  ctx.st = await loadStore();
  start();
}

function start() {
  ctx.render = render;
  if (!ctx.st.name) return onboarding();
  render();
  pollLoop();
  const s = season(ctx.st);
  if (s) setTimeout(() => rain(s.emojis, 22), 600);
}

// ======================================================= lock
function lockScreen() {
  let pin = '';
  app.innerHTML = `<div class="lock"><div>
    <div id="lockBloop">${bloopSVG({ mood: 'kiss', outfit: 'bow', size: 120 })}</div>
    <h2 style="margin-top:8px">Welcome back, cutie</h2><p class="muted">Enter your PIN</p>
    <div class="pindots">${'<i></i>'.repeat(4)}</div>
    <div class="pinpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => k === '' ? '<span></span>' : `<button data-k="${k}">${k}</button>`).join('')}</div>
  </div></div>`;
  const dots = () => $$('.pindots i').forEach((d, i) => d.classList.toggle('on', i < pin.length));
  $$('.pinpad button').forEach(b => b.onclick = async () => {
    const k = b.dataset.k; sound('pop');
    if (k === '⌫') pin = pin.slice(0, -1); else if (pin.length < 4) pin += k;
    dots();
    if (pin.length === 4) {
      try { ctx.st = await loadStore(pin); start(); }
      catch { $('.pindots').classList.add('shake'); setTimeout(() => { $('.pindots').classList.remove('shake'); pin = ''; dots(); }, 450); }
    }
  });
}

// ======================================================= onboarding
function onboarding() {
  const st = ctx.st; applyTheme();
  let step = 0; const data = { name: '', code: '', last: '', cycleLen: 28, periodLen: 5 };
  const steps = [
    () => `<div class="center-col" style="text-align:center;padding-top:30px">${bloopSVG({ mood: 'love', outfit: 'bow', size: 170 })}
      <h1 style="margin-top:10px">Hi, I'm Bloop 🫧</h1><p class="muted" style="margin:8px 0 20px">Someone made this whole little world just for you. Let's set it up together.</p>
      <label class="field" for="nm">What should I call you?</label><input class="input" id="nm" placeholder="Your name or nickname" value="${esc(data.name)}" autocomplete="off">
      <button class="btn block" id="next" style="margin-top:18px">Nice to meet you 💗</button></div>`,
    () => `<div style="padding-top:20px">${bloopSVG({ mood: 'glowy', size: 120 })}<h2 style="margin-top:6px">Connect with your boo</h2>
      <p class="muted" style="margin:6px 0 14px">He has a pairing code in his MochiBoo app. Scan his QR or paste the code. Everything you share is end-to-end encrypted.</p>
      <button class="btn block soft" id="scan">📷 Scan his QR code</button>
      <label class="field" for="code">Or paste the code</label><textarea class="input" id="code" placeholder="MOCHIBOO1:…">${esc(data.code)}</textarea>
      <p class="small muted" id="err" style="color:var(--accent);margin-top:6px"></p>
      <button class="btn block" id="next" style="margin-top:14px">Connect 💞</button>
      <button class="btn ghost block" id="skip">I'll do this later</button></div>`,
    () => `<div style="padding-top:20px">${bloopSVG({ mood: 'sleepy', outfit: 'bow', size: 120 })}<h2 style="margin-top:6px">Your cycle</h2>
      <p class="muted" style="margin:6px 0 10px">This helps me predict things from day one. I learn more every month.</p>
      <label class="field" for="last">When did your last period start?</label><input class="input" type="date" id="last" max="${today()}" value="${data.last}">
      <label class="field" for="cl">Usual cycle length: <b id="clv">${data.cycleLen}</b> days</label><input type="range" id="cl" min="20" max="45" value="${data.cycleLen}">
      <label class="field" for="pl">Usual period length: <b id="plv">${data.periodLen}</b> days</label><input type="range" id="pl" min="2" max="10" value="${data.periodLen}">
      <button class="btn block" id="next" style="margin-top:18px">All done ✨</button>
      <button class="btn ghost block" id="skip">I don't remember</button></div>`,
  ];
  const draw = () => {
    app.innerHTML = steps[step]();
    const next = $('#next'), skip = $('#skip');
    if (step === 0) { const nm = $('#nm'); nm.focus(); next.onclick = () => { data.name = nm.value.trim(); if (!data.name) { nm.focus(); nm.placeholder = 'Type a name first 🥺'; return; } step++; draw(); }; }
    if (step === 1) {
      $('#scan').onclick = () => import('./me.js').then(m => m.scanQR(code => { $('#code').value = code; next.click(); }));
      next.onclick = async () => {
        try { const p = parsePairCode($('#code').value); st.pair = p; st.partnerName = p.hn || 'Boo'; if (p.at) st.dates.together = st.dates.together || p.at; step++; draw(); }
        catch (e) { $('#err').textContent = e.message; }
      };
      skip.onclick = () => { step++; draw(); };
    }
    if (step === 2) {
      $('#cl').oninput = e => $('#clv').textContent = e.target.value;
      $('#pl').oninput = e => $('#plv').textContent = e.target.value;
      const finish = async (withDate) => {
        st.name = data.name; st.settings.cycleLen = +$('#cl').value; st.settings.periodLen = +$('#pl').value;
        if (withDate && $('#last').value) st.periods.push({ start: $('#last').value, end: addDays($('#last').value, st.settings.periodLen - 1) });
        await save();
        if (st.pair) { await send(st, 'hello', { name: st.name }); await sendCycle(); await save(); }
        confetti(); start();
      };
      next.onclick = () => finish(true); skip.onclick = () => finish(false);
    }
  };
  draw();
}

// ======================================================= sync with him
export async function sendCycle() {
  const st = ctx.st; if (!st.pair || !st.settings.sharing) return;
  const s = stats(st);
  await send(st, 'cycle', { periods: st.periods, cycleLen: s.cycleLen, periodLen: s.periodLen, defaults: { cycleLen: st.settings.cycleLen, periodLen: st.settings.periodLen } });
}
export async function sendLog(date) {
  const st = ctx.st; if (!st.pair || !st.settings.sharing) return;
  const e = { ...(st.logs[date] || {}) }; if (e.notePrivate) delete e.note;
  await send(st, 'log', { date, entry: e });
}

let polling = false, restoreBuf = {};
export async function syncNow(silent = true) {
  const st = ctx.st; if (!st?.pair || polling) return;
  polling = true;
  try {
    const msgs = await sync(st);
    for (const m of msgs) handle(m);
    await save();
    if (msgs.length) render();
  } catch (e) { if (!silent) toast('Can\'t reach the love relay right now. Your stuff is safe and will send later.'); }
  finally { polling = false; }
}
function pollLoop() {
  syncNow();
  setInterval(() => { if (document.visibilityState === 'visible') syncNow(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(); });
}

function handle(m) {
  const st = ctx.st, d = m.d || {}, boo = esc(st.partnerName);
  switch (m.t) {
    case 'hello': st.partnerName = d.name || st.partnerName; toast(`💞 Connected with ${esc(d.name)}`); break;
    case 'note': st.notes.unshift({ id: m.id, from: 'him', text: d.text, title: d.title || '', kind: d.kind || 'love', ts: m.ts, opened: false }); toast(d.kind === 'openwhen' ? '💌 A new open-when letter' : `💌 ${boo} sent you a love note`); break;
    case 'jar': st.jar.push({ id: m.id, text: d.text, ts: m.ts, openedOn: null }); toast('🫙 Something new in your love jar'); break;
    case 'coupon': st.coupons.unshift({ id: d.id || m.id, title: d.title, ts: m.ts, used: false }); toast('🎟️ You got a love coupon!'); break;
    case 'need_reply': { const n = st.needs.find(x => x.id === d.ref); if (n) n.reply = d.text; toast(`${boo}: ${esc(d.text)}`, 4000); break; }
    case 'tonight': st.tonight.incoming = { id: m.id, vibe: d.vibe, ts: m.ts, answered: null }; setTimeout(() => openTonight(true), 500); break;
    case 'tonight_reply': if (st.tonight.outgoing) st.tonight.outgoing.answer = d.answer;
      { const a = TONIGHT_ANSWERS.find(x => x[0] === d.answer); toast(`${a ? a[1] + ' ' + a[2] : ''}`, 4000); if (d.answer === 'yes') fireworks(); } break;
    case 'match': st.match.his = { on: !!d.on, until: d.until || 0 }; checkMatch(); break;
    case 'vibe': st.hisVibe = d.level; break;
    case 'heart': st.hearts.got++; st.hearts.lastGot = m.ts; toast(`💗 ${boo} is thinking of you`); setTimeout(() => burst(innerWidth / 2, innerHeight / 2, ['💗', '💖', '💕'], 12), 200); break;
    case 'hug': st.hugs.his = m.ts; if (Math.abs(st.hugs.mine - m.ts) < 60000 && st.hugs.lastMatch !== m.ts) { st.hugs.lastMatch = m.ts; setTimeout(() => { fireworks(); toast('🤗 Hug connected! You both hugged at the same time'); }, 400); } else toast(`🤗 ${boo} sent you a hug. Hug back within a minute!`, 4000); break;
    case 'qotd': st.qotd[d.date] = { ...(st.qotd[d.date] || {}), his: d.answer, q: d.q }; break;
    case 'song': st.song = { url: d.url, title: d.title }; toast('🎶 New song for us'); break;
    case 'dates': st.dates = { ...st.dates, ...d }; break;
    case 'restore': restoreBuf[d.part] = d.data; if (Object.keys(restoreBuf).length === d.total) {
      try { const r = JSON.parse(Array.from({ length: d.total }, (_, i) => restoreBuf[i]).join('')); Object.assign(st, { periods: r.periods || st.periods, logs: { ...(r.logs || {}), ...st.logs }, wishes: r.wishes || st.wishes }); restoreBuf = {}; toast('✨ Your data is back!'); } catch { }
    } break;
  }
}
export function checkMatch() {
  const st = ctx.st, now = Date.now(), m = st.match;
  if (m.mine?.on && m.his?.on && m.mine.until > now && m.his.until > now) {
    const key = String(Math.min(m.mine.until, m.his.until));
    if (st.match.celebrated !== key) { st.match.celebrated = key; setTimeout(() => { fireworks(); sheet('It\'s a match 😏', `<div class="modal-love"><div class="huge">🍒🎆</div><h2>You both feel it tonight</h2><p class="muted" style="margin-top:6px">Secret's out. Have fun, you two 😏</p></div>`); }, 500); }
  }
}

// ======================================================= render
function render() {
  const st = ctx.st; const info = dayInfo(st);
  applyTheme(info.known ? info.phase : null);
  const v = ctx.view;
  const unread = unreadCount();
  app.innerHTML = `<div id="view"></div>
  <nav class="tabbar" aria-label="Main">
    <button data-v="home" class="${v === 'home' ? 'on' : ''}">🫧<span>Today</span></button>
    <button data-v="calendar" class="${v === 'calendar' ? 'on' : ''}">📅<span>Calendar</span></button>
    <button class="plus" id="plus" aria-label="Log today">＋</button>
    <button data-v="us" class="${v === 'us' ? 'on' : ''}">💞<span>Us${unread ? `<b class="badge">${unread}</b>` : ''}</span></button>
    <button data-v="me" class="${v === 'me' ? 'on' : ''}">🌸<span>Me</span></button>
  </nav>`;
  $$('.tabbar [data-v]').forEach(b => b.onclick = () => { ctx.view = b.dataset.v; sound('pop'); render(); scrollTo(0, 0); });
  $('#plus').onclick = () => openLog(today());
  const view = $('#view');
  if (v === 'home') renderHome(view, info);
  else if (v === 'calendar') renderCalendar(view);
  else if (v === 'us') renderUs(view);
  else renderMe(view);
}
ctx.render = render;

// ---------- cycle ring ----------
function arc(cx, cy, r, a0, a1) {
  const p = a => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}
function ringSVG(info) {
  const L = Math.max(info.known ? info.s.cycleLen : 28, (info.day || 1));
  const ang = d => (d - 1) / L * Math.PI * 2 - Math.PI / 2;
  const seg = (a, b, color, w = 16) => `<path d="${arc(150, 150, 128, ang(a) + .03, ang(b + 1) - .03)}" stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  let s = `<svg class="ring" viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="128" stroke="var(--soft)" stroke-width="16" fill="none"/>`;
  for (let d = 1; d <= L; d++) { const a = ang(d); s += `<circle cx="${(150 + 146 * Math.cos(a)).toFixed(1)}" cy="${(150 + 146 * Math.sin(a)).toFixed(1)}" r="1.6" fill="var(--soft)"/>`; }
  if (info.known) {
    const pl = info.s.periodLen;
    s += seg(1, pl, 'var(--period)');
    const fs = diffDays(info.fertileStart, info.cycleStart) + 1, fe = diffDays(info.fertileEnd, info.cycleStart) + 1, ov = diffDays(info.ovulation, info.cycleStart) + 1;
    s += seg(fs, fe, 'var(--fertile)');
    const oa = (ang(ov) + ang(ov + 1)) / 2;
    s += `<circle cx="${(150 + 128 * Math.cos(oa)).toFixed(1)}" cy="${(150 + 128 * Math.sin(oa)).toFixed(1)}" r="9" fill="var(--ovu)" stroke="var(--surface)" stroke-width="3"/>`;
    const ta = (ang(info.day) + ang(info.day + 1)) / 2;
    s += `<circle cx="${(150 + 128 * Math.cos(ta)).toFixed(1)}" cy="${(150 + 128 * Math.sin(ta)).toFixed(1)}" r="14" fill="var(--surface)" stroke="var(--ink)" stroke-width="3.5"/>
      <text x="${(150 + 128 * Math.cos(ta)).toFixed(1)}" y="${(150 + 128 * Math.sin(ta) + 4.5).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="800" font-family="Fredoka, sans-serif" fill="var(--ink)">${info.day}</text>`;
  }
  return s + '</svg>';
}

function statusText(info) {
  if (!info.known) return ['Hi there 🫧', 'Tap + to log your period'];
  if (info.late && info.daysLate > 0 && info.daysLate <= 20) return [`${info.daysLate} day${info.daysLate > 1 ? 's' : ''} late`, 'Log it when it comes 🩸'];
  if (info.phase === 'period' && info.predicted) return ['Period expected', `Around ${fmt(info.cycleStart)}`];
  if (info.phase === 'period') return [`Period day ${info.day}`, `Ends around ${fmt(info.periodEnd)}`];
  const n = info.daysToNext;
  return [n === 1 ? 'Period tomorrow' : `Period in ${n} days`, info.fertility === 'peak' ? 'Ovulation day ✨' : info.fertility === 'high' ? 'Fertile window 🌿' : `Cycle day ${info.day}`];
}

function renderHome(view, info) {
  const st = ctx.st, t = today(), log = st.logs[t] || {};
  const se = season(st);
  const mood = moodFor(info, log);
  const outfit = se?.outfit || st.settings.outfit;
  const [big, sub] = statusText(info);
  const ph = info.known ? PHASES[info.phase] : null;
  const loggedPeriodToday = isPeriodDay(st, t);
  const bat = battery(st);
  const aff = AFFIRMATIONS[(diffDays(t, '2026-01-01') % AFFIRMATIONS.length + AFFIRMATIONS.length) % AFFIRMATIONS.length];
  const hr = new Date().getHours();
  const greet = se?.greeting || (hr < 5 ? 'Up late, cutie?' : hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening');
  const together = st.dates.together ? diffDays(t, st.dates.together) : null;
  const unopened = st.notes.filter(n => n.from === 'him' && !n.opened).length;
  const pendingTonight = st.tonight.incoming && !st.tonight.incoming.answered && Date.now() - st.tonight.incoming.ts < 18 * 36e5;
  const logged = Object.keys(log).length > 0;

  view.innerHTML = `
  <div class="topbar"><div class="hello">${esc(greet)}, ${esc(st.name)}<small>${parse(t).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</small></div>
    <button class="icon-btn" id="syncBtn" aria-label="Sync with ${esc(st.partnerName)}">${st.pair ? '💞' : '🔗'}${st.outbox.length ? '<i class="dot"></i>' : ''}</button></div>

  <div class="hero">${ringSVG(info)}
    <div class="bloop-wrap" id="bloop" role="button" aria-label="Pet Bloop">${bloopSVG({ mood, outfit, size: 168 })}</div>
  </div>
  <div class="status"><div class="big">${big}</div><div class="sub">${sub}</div></div>
  <div style="text-align:center">
    ${ph ? `<button class="phase-pill" id="phaseBtn">${ph.emoji} ${ph.name} phase${info.pms ? ' · PMS days' : ''}</button>` : ''}
  </div>
  <div class="row" style="margin-top:16px;gap:10px">
    ${loggedPeriodToday ? `<button class="btn block" id="endP">🌸 Period ended</button>` : `<button class="btn block" id="startP">🩸 Period started</button>`}
    <button class="btn soft block" id="logBtn">${logged ? '✏️ Edit today' : '📝 Log today'}</button>
  </div>

  ${pendingTonight ? `<button class="envelope" id="tonightIn" style="margin-top:16px"><span class="e">${esc(st.tonight.incoming.vibe)}</span><span><b>Someone's thinking of you…</b><br><span class="small muted">Tap to answer 😏</span></span></button>` : ''}
  ${unopened ? `<button class="envelope" id="notesIn" style="margin-top:14px"><span class="e">💌</span><span><b>${unopened} unopened ${unopened > 1 ? 'letters' : 'letter'} from ${esc(st.partnerName)}</b><br><span class="small muted">Tap to read</span></span></button>` : ''}

  ${st.settings.goal === 'ttc' && info.known ? (() => { const c = conceptionChance(st), pl = fertilePlan(st); return `<button class="card" id="babyCard" style="width:100%;text-align:left;border:0;cursor:pointer">
    <div class="row between"><h3>👶 Baby planning</h3><b style="font-family:var(--display)">${c.label}</b></div>
    <p class="small muted" style="margin-top:6px">${c.level === 'peak' || c.level === 'high' ? 'Today is a great day to be together 💞' : `Best days: ${pl.best.map(d => fmt(d, { weekday: 'short', day: 'numeric' })).join(', ')}`}</p></button>`; })() : ''}

  <div class="card">
    <div class="row between"><h3>Your battery</h3><b style="font-family:var(--display);font-size:20px">${bat}%</b></div>
    <div class="battery" role="meter" aria-valuenow="${bat}" aria-valuemin="0" aria-valuemax="100" aria-label="Well-being battery"><i style="width:${bat}%"></i></div>
    <p class="small muted" style="margin-top:8px">${bat > 75 ? 'Fully charged. Go shine ✨' : bat > 50 ? 'Doing okay. Snack break recommended 🍓' : bat > 30 ? 'Running low. Be gentle with yourself today 🫶' : 'Recharge mode. Blankets, tea and zero guilt 🧸'}</p>
  </div>

  <div class="card flat" style="text-align:center"><p style="font-family:var(--display);font-size:20px;font-weight:500">${esc(aff)}</p><p class="small muted" style="margin-top:6px">Bloop's note for today</p></div>

  ${ph ? `<div class="card"><h3>${ph.emoji} What's happening</h3><p>${ph.body}</p><p class="muted small" style="margin-top:6px">${ph.feel}</p>
    ${info.fertility !== 'low' ? `<p class="small" style="margin-top:10px;background:var(--soft);padding:8px 12px;border-radius:12px">🌿 Fertile days are estimates, not birth control.</p>` : ''}</div>` : ''}

  <div class="grid2">
    ${together != null ? `<div class="tile" style="cursor:default"><span class="e">💞</span><div><b>${together} days</b><span>together with ${esc(st.partnerName)}</span></div></div>` : ''}
    <button class="tile" id="heartBtn"><span class="e">💗</span><div><b>Thinking of you</b><span>Send ${esc(st.partnerName)} a heartbeat</span></div></button>
  </div>
  ${!st.pair ? `<div class="card flat"><h3>🔗 Connect with ${esc(st.partnerName)}</h3><p class="small muted">Pair once and your updates reach him instantly, end-to-end encrypted.</p><button class="btn sm" id="pairBtn" style="margin-top:10px">Pair now</button></div>` : ''}`;

  $('#bloop').onclick = e => {
    const svg = $('#bloop svg'); svg.classList.remove('boing'); void svg.offsetWidth; svg.classList.add('boing');
    sound('bloop'); burst(e.clientX, e.clientY, ['💗', '✨', '🫧']);
    st.bloopTaps = (st.bloopTaps || 0) + 1;
    if (st.bloopTaps % 7 === 0) { $('#bloop').innerHTML = bloopSVG({ mood: 'kiss', outfit, size: 168 }); toast('Achoo! Bloop sneezed hearts 🤧💗'); rain(['💗', '💖', '💕'], 30, 3); }
    save();
  };
  $('#phaseBtn')?.addEventListener('click', () => openPhase(info.phase));
  $('#startP')?.addEventListener('click', async e => { startPeriod(st, t); burst(e.clientX, e.clientY, ['🩸', '💗', '🫶']); await commit(); await sendCycle(); await save(); toast('Logged. Sending you cosy vibes 🫶'); });
  $('#endP')?.addEventListener('click', async e => { endPeriod(st, t); burst(e.clientX, e.clientY, ['🌸', '✨']); await commit(); await sendCycle(); await save(); toast('Period ended. You made it 🌸'); });
  $('#logBtn').onclick = () => openLog(t);
  $('#tonightIn')?.addEventListener('click', () => openTonight(true));
  $('#babyCard')?.addEventListener('click', openBaby);
  $('#notesIn')?.addEventListener('click', () => { ctx.view = 'us'; render(); });
  $('#heartBtn').onclick = async e => { burst(e.clientX, e.clientY, ['💗', '💓', '💞'], 9); sound('soft'); st.hearts.sent++; await send(st, 'heart', {}); await save(); toast(st.pair ? `Heartbeat sent to ${st.partnerName} 💓` : 'Pair first so he can feel it 💓'); };
  $('#syncBtn').onclick = async () => { if (!st.pair) return openPairing(); toast('Checking for love…'); await syncNow(false); };
  $('#pairBtn')?.addEventListener('click', openPairing);
}

export function openPhase(phase) {
  const p = PHASES[phase];
  sheet(`${p.emoji} ${p.name}`, `<p>${p.body}</p><p class="muted" style="margin-top:8px">${p.feel}</p>
    <div class="group-title">Self-care for this phase</div>
    <div class="stack">${p.care.map(c => `<div class="note">💗 ${c}</div>`).join('')}</div>`);
}

// ======================================================= calendar
let calMonth = null;
function renderCalendar(view) {
  const st = ctx.st; const t = today();
  if (!calMonth) calMonth = t.slice(0, 7) + '-01';
  const first = parse(calMonth); const startDow = (first.getDay() + 6) % 7;
  const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  let cells = '';
  for (let i = 0; i < startDow; i++) cells += '<span></span>';
  for (let d = 1; d <= daysIn; d++) {
    const ds = iso(new Date(first.getFullYear(), first.getMonth(), d));
    const mark = calendarMark(st, ds);
    cells += `<button class="d ${mark} ${ds === t ? 'today' : ''}" data-d="${ds}" aria-label="${fmt(ds, { day: 'numeric', month: 'long' })}${mark ? ', ' + mark : ''}">${d}${st.logs[ds] ? '<i class="logdot"></i>' : ''}</button>`;
  }
  const info = dayInfo(st);
  const s = stats(st);
  view.innerHTML = `
  <div class="topbar"><h1>Calendar</h1><button class="icon-btn" id="todayBtn" aria-label="Go to today">📍</button></div>
  <div class="card">
    <div class="cal-head"><button class="icon-btn" id="prev" aria-label="Previous month">‹</button><h3>${first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3><button class="icon-btn" id="next" aria-label="Next month">›</button></div>
    <div class="cal">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<span class="dow">${x}</span>`).join('')}${cells}</div>
    <div class="legend"><span><i style="background:var(--period)"></i>Period</span><span><i style="border:2px dashed var(--period)"></i>Predicted</span><span><i style="background:color-mix(in srgb,var(--fertile) 45%,transparent)"></i>Fertile</span><span><i style="background:var(--ovu)"></i>Ovulation</span></div>
  </div>
  ${info.known ? `<div class="grid2">
    <div class="tile" style="cursor:default"><span class="e">🩸</span><div><b>${fmt(info.nextStart)}</b><span>Next period</span></div></div>
    <div class="tile" style="cursor:default"><span class="e">✨</span><div><b>${fmt(info.ovulation)}</b><span>Ovulation</span></div></div>
    <div class="tile" style="cursor:default"><span class="e">🔁</span><div><b>${s.cycleLen} days</b><span>Average cycle</span></div></div>
    <div class="tile" style="cursor:default"><span class="e">📆</span><div><b>${s.periodLen} days</b><span>Average period</span></div></div>
  </div>` : `<div class="card flat"><p>Tap any day to log a period start. Bloop learns your rhythm from there 🫧</p></div>`}`;
  const move = n => { const d = parse(calMonth); d.setMonth(d.getMonth() + n); calMonth = iso(d); render(); };
  $('#prev').onclick = () => move(-1); $('#next').onclick = () => move(1);
  $('#todayBtn').onclick = () => { calMonth = null; render(); };
  $$('.cal .d').forEach(b => b.onclick = () => openDay(b.dataset.d));
}

function openDay(date) {
  const st = ctx.st; const inP = isPeriodDay(st, date);
  const log = st.logs[date];
  const sh = sheet(fmt(date, { weekday: 'long', day: 'numeric', month: 'long' }), `
    <div class="stack">
      ${inP ? `<button class="btn block soft" id="pEnd">🌸 Period ended this day</button><button class="btn block ghost" id="pDel">Remove this period</button>`
      : `<button class="btn block" id="pStart">🩸 Period started this day</button>`}
      <button class="btn block soft" id="logD">${log ? '✏️ Edit log' : '📝 Log this day'}</button>
    </div>
    ${log ? `<div class="group-title">Logged</div><div class="chips">${(log.sym || []).map(k => { const [g, id] = k.split(':'); const it = SYMPTOM_GROUPS.find(x => x.id === g)?.items.find(x => x[0] === id); return it ? `<span class="chip">${it[1]} ${it[2]}</span>` : ''; }).join('')}</div>` : ''}`);
  const done = async (msg) => { sh.close(); await commit(); await sendCycle(); await save(); toast(msg); };
  $('#pStart', sh.el)?.addEventListener('click', () => { startPeriod(st, date); done('Period logged 🩸'); });
  $('#pEnd', sh.el)?.addEventListener('click', () => { endPeriod(st, date); done('Period end saved 🌸'); });
  $('#pDel', sh.el)?.addEventListener('click', () => { removePeriodContaining(st, date); done('Removed'); });
  $('#logD', sh.el).onclick = () => { sh.close(); openLog(date); };
}

// ======================================================= log sheet
export function openLog(date) {
  const st = ctx.st;
  const e = JSON.parse(JSON.stringify(st.logs[date] || { sym: [] })); e.sym = e.sym || [];
  const groups = SYMPTOM_GROUPS.map(g => `<div class="group-title">${g.name}</div><div class="chips" data-g="${g.id}" ${g.single ? 'data-single' : ''}>
    ${g.items.map(([id, em, n]) => `<button class="chip ${e.sym.includes(g.id + ':' + id) ? 'on' : ''}" data-k="${g.id}:${id}" aria-pressed="${e.sym.includes(g.id + ':' + id)}">${em} ${n}</button>`).join('')}</div>`).join('');
  const drops = (k, n, emoji) => `<div class="drops" data-k="${k}">${Array.from({ length: n }, (_, i) => `<button class="${(e[k] || 0) > i ? 'on' : ''}" data-v="${i + 1}" aria-label="${i + 1}">${emoji}</button>`).join('')}</div>`;
  const sh = sheet(date === today() ? 'How are you today?' : fmt(date, { weekday: 'short', day: 'numeric', month: 'short' }), `
    ${groups}
    <div class="group-title">Pain: <span id="painv">${e.pain ?? 0}</span>/10</div><input type="range" min="0" max="10" value="${e.pain ?? 0}" id="pain" aria-label="Pain level">
    <div class="group-title">Energy</div>${drops('energy', 5, '⚡')}
    <div class="group-title">Water glasses</div>${drops('water', 8, '💧')}
    <div class="group-title">Sleep: <span id="sleepv">${e.sleep ?? 7}</span> hours</div><input type="range" min="0" max="12" step=".5" value="${e.sleep ?? 7}" id="sleep" aria-label="Hours of sleep">
    <div class="group-title">Tests & tracking</div>
    <div class="chips" data-field="ovu" data-single>${[['neg', '➖ Ovulation test negative'], ['pos', '➕ Ovulation test positive']].map(([v, n]) => `<button class="chip ${e.ovu === v ? 'on' : ''}" data-v="${v}">${n}</button>`).join('')}</div>
    <div class="row" style="margin-top:10px"><label class="field" for="bbt" style="margin:0;flex:1">🌡️ Basal temp (°C)</label><input class="input" style="width:120px" id="bbt" inputmode="decimal" placeholder="36.5" value="${e.bbt ?? ''}"></div>
    <div class="switch"><span>💊 Took my pill</span><input type="checkbox" class="toggle" id="pill" ${e.pill ? 'checked' : ''}></div>
    <div class="group-title">Diary</div><textarea class="input" id="note" placeholder="Anything on your mind, cutie?">${esc(e.note || '')}</textarea>
    <div class="switch"><span>🔒 Keep my diary private (only on my phone)</span><input type="checkbox" class="toggle" id="priv" ${e.notePrivate !== false ? 'checked' : ''}></div>
    <button class="btn block" id="saveLog" style="margin-top:16px">Save 💗</button>`);
  const b = sh.body;
  $$('.chips[data-g] .chip', b).forEach(c => c.onclick = () => {
    const box = c.parentElement, k = c.dataset.k;
    if (box.hasAttribute('data-single')) $$('.chip', box).forEach(x => { if (x !== c) { x.classList.remove('on'); e.sym = e.sym.filter(s => s !== x.dataset.k); } });
    c.classList.toggle('on'); c.setAttribute('aria-pressed', c.classList.contains('on'));
    e.sym = c.classList.contains('on') ? [...e.sym, k] : e.sym.filter(s => s !== k); sound('pop');
  });
  $$('.chips[data-field] .chip', b).forEach(c => c.onclick = () => { const on = !c.classList.contains('on'); $$('.chip', c.parentElement).forEach(x => x.classList.remove('on')); if (on) c.classList.add('on'); e[c.parentElement.dataset.field] = on ? c.dataset.v : undefined; });
  $$('.drops', b).forEach(d => $$('button', d).forEach(btn => btn.onclick = () => { const v = +btn.dataset.v; e[d.dataset.k] = e[d.dataset.k] === v ? v - 1 : v; $$('button', d).forEach((x, i) => x.classList.toggle('on', i < e[d.dataset.k])); sound('pop'); }));
  $('#pain', b).oninput = ev => { e.pain = +ev.target.value; $('#painv', b).textContent = e.pain; };
  $('#sleep', b).oninput = ev => { e.sleep = +ev.target.value; $('#sleepv', b).textContent = e.sleep; };
  $('#saveLog', b).onclick = async ev => {
    e.note = $('#note', b).value.trim(); e.notePrivate = $('#priv', b).checked; e.pill = $('#pill', b).checked;
    const bbt = parseFloat($('#bbt', b).value); e.bbt = isNaN(bbt) ? undefined : bbt;
    if (e.sleep === undefined && st.logs[date]?.sleep === undefined) delete e.sleep;
    st.logs[date] = e;
    let cycleChanged = false;
    const flow = e.sym.find(k => k.startsWith('flow:'));
    if (flow && flow !== 'flow:spotting' && !isPeriodDay(st, date)) {
      const prev = normalize(st.periods).filter(p => p.start <= date).pop();
      if (prev && diffDays(date, prev.end || prev.start) <= 2 && diffDays(date, prev.start) < 12) prev.end = date; else startPeriod(st, date);
      cycleChanged = true;
    }
    burst(ev.clientX, ev.clientY, ['💗', '✨', '🌸']); sh.close();
    await commit(); await sendLog(date); if (cycleChanged) await sendCycle(); await save();
    toast(cycleChanged ? 'Saved, and your period is logged 🩸' : 'Saved 💗');
  };
}

boot();
