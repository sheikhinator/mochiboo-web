// Shared UI infrastructure: app context, sheets, toasts, particles, sounds, themes.
import { $, saveStore, today, parse } from './core.js';
import { THEMES } from './content.js';

export const ctx = { st: null, view: 'home', render: () => {} };

export async function save() { await saveStore(ctx.st); }
export async function commit() { await save(); ctx.render(); }

// ---------- toast ----------
let toastTimer;
export function toast(text, ms = 2400) {
  let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = text; requestAnimationFrame(() => t.classList.add('on'));
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), ms);
}

// ---------- sheets ----------
const sheets = [];
export function sheet(title, html, mount) {
  const scrim = document.createElement('div'); scrim.className = 'scrim';
  const el = document.createElement('section'); el.className = 'sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', title.replace(/<[^>]+>/g, ''));
  el.innerHTML = `<div class="grab"></div><div class="sheet-head"><h2>${title}</h2><button class="icon-btn" data-close aria-label="Close">✕</button></div><div class="sheet-body">${html}</div>`;
  document.body.append(scrim, el);
  const close = () => { el.classList.remove('on'); scrim.classList.remove('on'); setTimeout(() => { el.remove(); scrim.remove(); }, 380); const i = sheets.indexOf(api); if (i >= 0) sheets.splice(i, 1); };
  const api = { el, close, body: el.querySelector('.sheet-body') };
  scrim.onclick = close; el.querySelector('[data-close]').onclick = close;
  sheets.push(api);
  requestAnimationFrame(() => { scrim.classList.add('on'); el.classList.add('on'); });
  if (mount) mount(api.body, api);
  return api;
}
export const closeAllSheets = () => [...sheets].forEach(s => s.close());

// ---------- particles ----------
export function burst(x, y, emojis = ['💗', '💖', '💕', '✨'], n = 7) {
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div'); p.className = 'fx';
    p.textContent = emojis[i % emojis.length];
    p.style.left = x - 11 + 'px'; p.style.top = y - 11 + 'px';
    p.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px'); p.style.setProperty('--rot', (Math.random() * 80 - 40) + 'deg');
    p.style.animationDelay = i * 40 + 'ms';
    document.body.append(p); setTimeout(() => p.remove(), 1600);
  }
}
export function confetti(n = 70) {
  const colors = ['#FF5C8A', '#FFB547', '#7CCBA2', '#A07CFF', '#FF8FB1', '#5CC8FF', '#FFCF4A'];
  const cx = innerWidth / 2, cy = innerHeight / 2.3;
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div'); c.className = 'confetti';
    c.style.left = cx + 'px'; c.style.top = cy + 'px'; c.style.background = colors[i % colors.length];
    const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 260;
    c.style.setProperty('--dx', Math.cos(a) * d + 'px'); c.style.setProperty('--dy', Math.sin(a) * d + 200 + 'px'); c.style.setProperty('--rot', Math.random() * 720 + 'deg');
    document.body.append(c); setTimeout(() => c.remove(), 1700);
  }
  sound('yay');
}
export function fireworks() { confetti(60); setTimeout(() => confetti(60), 450); setTimeout(() => burst(innerWidth / 2, innerHeight / 2, ['💖', '🎆', '✨', '💞'], 14), 300); }
export function rain(emojis, count = 26, durMin = 6) {
  for (let i = 0; i < count; i++) {
    const f = document.createElement('div'); f.className = 'fall';
    f.textContent = emojis[i % emojis.length]; f.style.left = Math.random() * 100 + 'vw'; f.style.fontSize = 14 + Math.random() * 14 + 'px';
    f.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px'); f.style.setProperty('--rot', Math.random() * 360 + 'deg');
    const dur = durMin + Math.random() * 5; f.style.animationDuration = dur + 's'; f.style.animationDelay = Math.random() * 4 + 's';
    document.body.append(f); setTimeout(() => f.remove(), (dur + 4.5) * 1000);
  }
}

// ---------- sounds (tiny synth, no files) ----------
let ac;
export function sound(kind = 'bloop') {
  if (!ctx.st?.settings.sounds) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination);
    const t = ac.currentTime; o.type = 'sine';
    const notes = { bloop: [520, 880, .14], pop: [700, 1200, .08], yay: [660, 1320, .3], soft: [440, 560, .2] }[kind] || [520, 880, .14];
    o.frequency.setValueAtTime(notes[0], t); o.frequency.exponentialRampToValueAtTime(notes[1], t + notes[2]);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.12, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + notes[2] + .1);
    o.start(t); o.stop(t + notes[2] + .12);
    if (kind === 'yay') { const o2 = ac.createOscillator(); o2.connect(g); o2.frequency.setValueAtTime(990, t + .12); o2.start(t + .12); o2.stop(t + .4); }
  } catch { }
}
let rainNode;
export function rainSound(on) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (!on) { rainNode?.stop(); rainNode = null; return; }
    const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), data = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; data[i] = last * 3.5; }
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200;
    const g = ac.createGain(); g.gain.value = .5;
    src.connect(f); f.connect(g); g.connect(ac.destination); src.start(); rainNode = src;
  } catch { }
}

// ---------- themes ----------
const PHASE_THEME = { period: 'sakura', follicular: 'cottoncandy', ovulation: 'peach', luteal: 'lavender' };
export function applyTheme(phase) {
  const s = ctx.st.settings;
  const id = s.phaseTheme && phase ? PHASE_THEME[phase] : s.theme;
  const t = THEMES[id] || THEMES.strawberry;
  const r = document.documentElement;
  for (const k of ['bg', 'surface', 'soft', 'ink', 'muted', 'primary', 'accent', 'blob']) r.style.setProperty('--' + k, t[k]);
  r.classList.toggle('dark', t.dark);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t.bg);
}

/** Seasonal magic for today: returns {emojis, greeting, outfit?} or null. */
export function season(st) {
  const d = today(), md = d.slice(5), y = d.slice(0, 4);
  const eid = { '2026-05-27': 1, '2027-03-10': 1, '2027-05-17': 1, '2028-02-27': 1, '2028-05-05': 1 };
  for (const k of Object.keys(eid)) { const diff = (parse(d) - parse(k)) / 864e5; if (diff >= -1 && diff <= 2) return { emojis: ['🌙', '✨', '⭐'], greeting: 'Eid Mubarak, my moon 🌙' }; }
  const dates = st.dates || {};
  if (dates.birthday && dates.birthday.slice(5) === md) return { emojis: ['🎂', '🎈', '🎉', '💗'], greeting: 'Happy birthday, princess 👑', outfit: 'crown' };
  if (dates.anniversary && dates.anniversary.slice(5) === md) return { emojis: ['💞', '💍', '🌹'], greeting: 'Happy anniversary, us 💞' };
  if (md >= '02-07' && md <= '02-14') return { emojis: ['🌹', '💌', '💘'], greeting: md === '02-14' ? 'Happy Valentine\'s, my love 💘' : 'Valentine\'s week 💌' };
  if (md >= '12-15' || md <= '01-10') return { emojis: ['❄️', '⛄', '✨'], greeting: 'Cosy season ❄️' };
  if (md >= '03-20' && md <= '04-10') return { emojis: ['🌸', '🌷'], greeting: 'Spring is blooming 🌸' };
  return null;
}
