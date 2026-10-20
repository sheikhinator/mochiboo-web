import { $, $$, esc, today, diffDays, fmt, parse, send, uid, addDays } from './core.js';
import { ctx, save, commit, toast, sheet, burst, confetti, fireworks, sound } from './ui.js';
import { NEEDS, VIBES, VIBE_LEVELS, TONIGHT_ANSWERS, QUESTIONS } from './content.js';
import { checkMatch } from './app.js';

export function unreadCount() {
  const st = ctx.st; if (!st) return 0;
  const notes = st.notes.filter(n => n.from === 'him' && !n.opened && n.kind !== 'openwhen').length;
  const t = st.tonight.incoming && !st.tonight.incoming.answered && Date.now() - st.tonight.incoming.ts < 18 * 36e5 ? 1 : 0;
  return notes + t;
}

const tonightUntil = () => { const d = new Date(); d.setHours(30, 0, 0, 0); return d.getTime(); }; // until 6am tomorrow
const qIndex = d => ((diffDays(d, '2026-01-01') % QUESTIONS.length) + QUESTIONS.length) % QUESTIONS.length;

function countdown(dateStr) {
  if (!dateStr) return null;
  const t = today(); let next = t.slice(0, 4) + dateStr.slice(4);
  if (next < t) next = (+t.slice(0, 4) + 1) + dateStr.slice(4);
  return diffDays(next, t);
}

export function renderUs(view) {
  const st = ctx.st, boo = esc(st.partnerName), t = today();
  const loveNotes = st.notes.filter(n => n.kind !== 'openwhen');
  const openWhen = st.notes.filter(n => n.kind === 'openwhen');
  const jarLeft = st.jar.filter(j => !j.openedOn).length;
  const jarToday = st.jar.find(j => j.openedOn === t);
  const q = QUESTIONS[qIndex(t)], qa = st.qotd[t] || {};
  const matchOn = st.match.mine?.on && st.match.mine.until > Date.now();
  const recentNeeds = st.needs.slice(0, 3);
  const bday = countdown(st.dates.birthday), anni = countdown(st.dates.anniversary);

  view.innerHTML = `
  <div class="topbar"><h1>You & ${boo}</h1><button class="icon-btn" id="hugBtn" aria-label="Send a distance hug">🤗</button></div>

  <div class="card">
    <h3>I need…</h3><p class="small muted" style="margin-bottom:12px">One tap and ${boo} gets it right away.</p>
    <div class="needs">${NEEDS.map(([k, e, n]) => `<button class="need" data-k="${k}"><span class="e">${e}</span><span>${n}</span></button>`).join('')}</div>
    ${recentNeeds.length ? `<div style="margin-top:12px">${recentNeeds.map(n => `<div class="row between small" style="padding:6px 0;border-top:2px dashed var(--soft)"><span>${n.emoji} ${esc(n.label)}</span><span class="muted">${n.reply ? esc(n.reply) : 'Sent 💌'}</span></div>`).join('')}</div>` : ''}
  </div>

  <div class="grid2">
    <button class="tile" id="tonightBtn"><span class="e">🍒</span><div><b>Tonight?</b><span>Send a little signal</span></div></button>
    <button class="tile" id="matchBtn" aria-pressed="${matchOn}"><span class="e">${matchOn ? '💞' : '🤫'}</span><div><b>${matchOn ? 'Secretly in the mood' : 'Secret match'}</b><span>${matchOn ? 'Only revealed if he is too' : 'Only revealed if you both are'}</span></div></button>
  </div>

  <div class="card">
    <div class="row between"><h3>My vibe</h3>${st.hisVibe != null ? `<span class="small muted">${boo}: ${VIBE_LEVELS[st.hisVibe]?.[0] || ''}</span>` : ''}</div>
    <div class="chips" style="margin-top:8px">${VIBE_LEVELS.map(([e, n], i) => `<button class="chip ${st.vibe === i ? 'on' : ''}" data-vibe="${i}">${e} ${n}</button>`).join('')}</div>
  </div>

  <div class="card">
    <div class="row between"><h3>Love letters ${loveNotes.filter(n => n.from === 'him' && !n.opened).length ? `<b class="badge">${loveNotes.filter(n => n.from === 'him' && !n.opened).length}</b>` : ''}</h3><button class="btn sm" id="writeBtn">✍️ Write</button></div>
    ${loveNotes.length ? loveNotes.slice(0, 4).map(n => n.from === 'him' && !n.opened
      ? `<button class="envelope" data-open="${n.id}"><span class="e">💌</span><span><b>From ${boo}</b><br><span class="small muted">${fmt(new Date(n.ts).toISOString().slice(0, 10))} · tap to open</span></span></button>`
      : `<div class="note ${n.from === 'him' ? 'from-him' : ''}">${esc(n.text)}<div class="meta">${n.from === 'him' ? 'From ' + boo : 'You wrote'} · ${fmt(new Date(n.ts).toISOString().slice(0, 10))}</div></div>`).join('')
      : `<p class="small muted" style="margin-top:6px">No letters yet. Write the first one 💗</p>`}
    ${loveNotes.length > 4 ? `<button class="btn ghost block" id="allNotes">See all ${loveNotes.length}</button>` : ''}
  </div>

  ${openWhen.length ? `<div class="card"><h3>Open when…</h3><p class="small muted">Letters ${boo} wrote for special moments.</p>
    ${openWhen.map(n => `<button class="envelope" data-open="${n.id}"><span class="e">${n.opened ? '📖' : '✉️'}</span><span><b>Open when ${esc(n.title || 'you need me')}</b>${n.opened ? '<br><span class="small muted">Opened</span>' : ''}</span></button>`).join('')}</div>` : ''}

  <div class="grid2">
    <button class="tile" id="jarBtn"><span class="e">🫙</span><div><b>Love jar</b><span>${jarToday ? 'Today\'s note opened' : jarLeft ? jarLeft + ' notes waiting' : 'Empty for now'}</span></div></button>
    <button class="tile" id="couponBtn"><span class="e">🎟️</span><div><b>Coupons</b><span>${st.coupons.filter(c => !c.used).length} to redeem</span></div></button>
    <button class="tile" id="wishBtn"><span class="e">🎀</span><div><b>Wishlist</b><span>${st.wishes.filter(w => !w.got).length} wishes</span></div></button>
    <button class="tile" id="songBtn"><span class="e">🎶</span><div><b>Our song</b><span>${st.song.title ? esc(st.song.title) : 'Not set yet'}</span></div></button>
  </div>

  <div class="card">
    <h3>💭 Question of the day</h3><p style="font-family:var(--display);font-size:19px;margin:6px 0 10px">${esc(q)}</p>
    ${qa.mine ? `<div class="note">${esc(qa.mine)}<div class="meta">Your answer</div></div>
      ${qa.his ? `<div class="note from-him">${esc(qa.his)}<div class="meta">${boo}'s answer</div></div>` : `<p class="small muted">Waiting for ${boo} to answer… you'll see his once he does 🤫</p>`}`
      : `<textarea class="input" id="qaIn" placeholder="Your answer…" style="min-height:70px"></textarea><button class="btn sm" id="qaSend" style="margin-top:10px">Answer & reveal</button>`}
  </div>

  ${bday != null || anni != null ? `<div class="grid2">
    ${anni != null ? `<div class="tile" style="cursor:default"><span class="e">💍</span><div><b>${anni === 0 ? 'Today!' : anni + ' days'}</b><span>to our anniversary</span></div></div>` : ''}
    ${bday != null ? `<div class="tile" style="cursor:default"><span class="e">🎂</span><div><b>${bday === 0 ? 'Today!' : bday + ' days'}</b><span>to your birthday</span></div></div>` : ''}
  </div>` : ''}`;

  // needs
  $$('.need', view).forEach(b => b.onclick = async e => {
    const [k, em, label] = NEEDS.find(n => n[0] === b.dataset.k);
    burst(e.clientX, e.clientY, [em, '💗'], 6); sound('bloop');
    const m = await send(st, 'need', { kind: k, emoji: em, label });
    st.needs.unshift({ id: m?.id || uid(), kind: k, emoji: em, label, ts: Date.now(), reply: null }); st.needs = st.needs.slice(0, 30);
    await commit(); toast(st.pair ? `${em} Sent to ${st.partnerName}` : 'Pair with him first so he gets these 💞');
  });
  $('#hugBtn').onclick = async e => {
    burst(e.clientX, e.clientY, ['🤗', '💗', '🫂'], 10); st.hugs.mine = Date.now();
    await send(st, 'hug', {}); await save();
    if (Math.abs(st.hugs.his - st.hugs.mine) < 60000) { fireworks(); toast('🤗 Hug connected!'); } else toast(`Hug sent! If ${st.partnerName} hugs back within a minute, fireworks 🎆`, 3500);
  };
  $('#tonightBtn').onclick = () => openTonight(false);
  $('#matchBtn').onclick = async () => {
    const on = !matchOn; st.match.mine = { on, until: on ? tonightUntil() : 0 };
    await send(st, 'match', st.match.mine); await commit();
    toast(on ? '🤫 Set. Nobody knows unless you match' : 'Turned off'); checkMatch(); await save();
  };
  $$('[data-vibe]', view).forEach(b => b.onclick = async () => { st.vibe = +b.dataset.vibe; await send(st, 'vibe', { level: st.vibe }); await commit(); sound('pop'); });
  $('#writeBtn').onclick = writeNote;
  $$('[data-open]', view).forEach(b => b.onclick = () => openLetter(b.dataset.open));
  $('#allNotes')?.addEventListener('click', () => sheet('All letters', loveNotes.map(n => `<div class="note ${n.from === 'him' ? 'from-him' : ''}">${esc(n.text)}<div class="meta">${n.from === 'him' ? 'From ' + boo : 'You wrote'} · ${fmt(new Date(n.ts).toISOString().slice(0, 10))}</div></div>`).join('')));
  $('#jarBtn').onclick = openJar;
  $('#couponBtn').onclick = openCoupons;
  $('#wishBtn').onclick = openWishlist;
  $('#songBtn').onclick = () => { if (st.song.url) window.open(st.song.url, '_blank'); else toast(`Ask ${st.partnerName} to pick our song 🎶`); };
  $('#qaSend')?.addEventListener('click', async e => {
    const v = $('#qaIn').value.trim(); if (!v) { $('#qaIn').focus(); toast('Write an answer first 💭'); return; }
    st.qotd[t] = { ...(st.qotd[t] || {}), mine: v, q }; burst(e.clientX, e.clientY, ['💭', '💗']);
    await send(st, 'qotd', { date: t, q, answer: v }); await commit();
  });
}

function writeNote() {
  const st = ctx.st;
  const sh = sheet(`Write to ${esc(st.partnerName)}`, `<textarea class="input" id="nt" placeholder="Dear ${esc(st.partnerName)}…" style="min-height:160px"></textarea>
    <button class="btn block" id="ns" style="margin-top:12px">Send with love 💌</button>`);
  $('#nt', sh.el).focus();
  $('#ns', sh.el).onclick = async e => {
    const text = $('#nt', sh.el).value.trim(); if (!text) { toast('Write something sweet first 💌'); return; }
    const m = await send(st, 'note', { text, kind: 'love' });
    st.notes.unshift({ id: m?.id || uid(), from: 'her', text, kind: 'love', ts: Date.now(), opened: true });
    burst(e.clientX, e.clientY, ['💌', '💗', '💕'], 10); sh.close(); await commit(); toast('Letter sent 💌');
  };
}

function openLetter(id) {
  const st = ctx.st, n = st.notes.find(x => x.id === id); if (!n) return;
  n.opened = true; save();
  sheet(n.kind === 'openwhen' ? `Open when ${esc(n.title || 'you need me')}` : `From ${esc(st.partnerName)} 💌`,
    `<div class="modal-love"><div class="huge">💌</div></div><div class="note from-him" style="font-size:18px;white-space:pre-wrap">${esc(n.text)}</div>`);
  confetti(30); ctx.render();
}

function openJar() {
  const st = ctx.st, t = today();
  const opened = st.jar.find(j => j.openedOn === t);
  if (opened) return sheet('Today\'s love jar note 🫙', `<div class="note from-him" style="font-size:18px">${esc(opened.text)}</div><p class="small muted">Come back tomorrow for another one.</p>`);
  const next = st.jar.find(j => !j.openedOn);
  if (!next) return sheet('Love jar 🫙', `<div class="modal-love"><div class="huge">🫙</div><p>The jar is empty right now. ${esc(st.partnerName)} can fill it from his app.</p></div>`);
  next.openedOn = t; save(); confetti(40);
  sheet('A note from the jar 🫙', `<div class="modal-love"><div class="huge">💗</div></div><div class="note from-him" style="font-size:19px">${esc(next.text)}</div><p class="small muted">${st.jar.filter(j => !j.openedOn).length} notes left. One per day.</p>`);
  ctx.render();
}

function openCoupons() {
  const st = ctx.st;
  const sh = sheet('Love coupons 🎟️', st.coupons.length ? st.coupons.map(c => `<div class="coupon ${c.used ? 'used' : ''}"><b>${esc(c.title)}</b>${c.used ? '<span class="small">Redeemed</span>' : `<button class="btn sm" data-c="${c.id}">Redeem</button>`}</div>`).join('')
    : `<div class="modal-love"><div class="huge">🎟️</div><p>No coupons yet. ${esc(st.partnerName)} gives these out from his app.</p></div>`);
  $$('[data-c]', sh.el).forEach(b => b.onclick = async e => {
    const c = st.coupons.find(x => x.id === b.dataset.c); c.used = true;
    await send(st, 'coupon_redeem', { id: c.id, title: c.title }); burst(e.clientX, e.clientY, ['🎟️', '💗']);
    sh.close(); await commit(); toast(`Redeemed! ${st.partnerName} has been notified 😌`);
  });
}

function openWishlist() {
  const st = ctx.st;
  const draw = sh => {
    sh.body.innerHTML = `<div class="row"><input class="input" id="wi" placeholder="Something you'd love…"><button class="btn sm" id="wa" aria-label="Add wish">Add</button></div>
      <div style="margin-top:12px">${st.wishes.map(w => `<div class="note row between" style="${w.got ? 'opacity:.5;text-decoration:line-through' : ''}"><span>🎀 ${esc(w.text)}</span><span class="row" style="gap:4px"><button class="btn ghost sm" data-got="${w.id}">${w.got ? 'Undo' : 'Got it'}</button><button class="btn ghost sm" data-del="${w.id}" aria-label="Delete">✕</button></span></div>`).join('') || '<p class="small muted">Add things you want so he never has to guess 😌</p>'}</div>`;
    const push = async () => { await send(st, 'wish', { items: st.wishes }); await commit(); draw(sh); };
    $('#wa', sh.el).onclick = () => { const v = $('#wi', sh.el).value.trim(); if (!v) return; st.wishes.unshift({ id: uid(), text: v, got: false }); push(); };
    $$('[data-got]', sh.el).forEach(b => b.onclick = () => { const w = st.wishes.find(x => x.id === b.dataset.got); w.got = !w.got; push(); });
    $$('[data-del]', sh.el).forEach(b => b.onclick = () => { st.wishes = st.wishes.filter(x => x.id !== b.dataset.del); push(); });
  };
  const sh = sheet('My wishlist 🎀', ''); draw(sh);
}

export function openTonight(incoming) {
  const st = ctx.st, boo = esc(st.partnerName);
  const inc = st.tonight.incoming;
  if (incoming && inc && !inc.answered) {
    const sh = sheet('Someone\'s thinking of you…', `<div class="modal-love"><div class="huge">${esc(inc.vibe)}</div><h2>${boo} is in the mood tonight 😏</h2></div>
      <div class="stack">${TONIGHT_ANSWERS.map(([k, e, n]) => `<button class="btn block ${k === 'yes' ? '' : 'soft'}" data-a="${k}">${e} ${n}</button>`).join('')}</div>`);
    $$('[data-a]', sh.el).forEach(b => b.onclick = async () => {
      inc.answered = b.dataset.a; await send(st, 'tonight_reply', { answer: inc.answered, ref: inc.id });
      sh.close(); if (inc.answered === 'yes') fireworks(); else if (inc.answered === 'cuddles') toast('Cuddles it is 🤗💕'); else toast('Playing hard to get 🥺');
      await commit();
    });
    return;
  }
  const sh = sheet('Tonight? 🍒', `<p class="muted">Pick a vibe. ${boo} only sees "someone's thinking of you…" until he opens it 🤫</p>
    <div class="grid4" style="margin-top:14px">${VIBES.map(v => `<button class="need" data-v="${v}"><span class="e">${v}</span></button>`).join('')}</div>
    ${st.tonight.outgoing && Date.now() - st.tonight.outgoing.ts < 18 * 36e5 ? `<p class="small muted" style="margin-top:14px">Last signal: ${esc(st.tonight.outgoing.vibe)} ${st.tonight.outgoing.answer ? '· his answer: ' + (TONIGHT_ANSWERS.find(a => a[0] === st.tonight.outgoing.answer)?.slice(1).join(' ') || '') : '· waiting for him 😏'}</p>` : ''}`);
  $$('[data-v]', sh.el).forEach(b => b.onclick = async e => {
    const vibe = b.dataset.v; burst(e.clientX, e.clientY, [vibe, '💗'], 8);
    const m = await send(st, 'tonight', { vibe });
    st.tonight.outgoing = { id: m?.id, vibe, ts: Date.now(), answer: null };
    sh.close(); await commit(); toast('Signal sent 😏');
  });
}
