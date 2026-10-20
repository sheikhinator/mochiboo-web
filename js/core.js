// MochiBoo core: dates, crypto, encrypted store, encrypted relay.

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const uid = () => crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- dates (local, YYYY-MM-DD) ----------
export const pad = n => String(n).padStart(2, '0');
export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const today = () => iso(new Date());
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 86400000);
export const fmt = (s, o = { day: 'numeric', month: 'short' }) => parse(s).toLocaleDateString(undefined, o);

// ---------- base64url ----------
export const b64u = bytes => { let s = ''; bytes.forEach(b => s += String.fromCharCode(b)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
export const unb64u = str => { str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '='; const bin = atob(str); return Uint8Array.from(bin, c => c.charCodeAt(0)); };
const te = new TextEncoder(), td = new TextDecoder();

// ---------- crypto ----------
export async function deriveKey(secret, salt = 'mochiboo-v1', iterations = 100000) {
  const base = await crypto.subtle.importKey('raw', te.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: te.encode(salt), iterations },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function seal(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(JSON.stringify(obj))));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
  return 'mb1.' + b64u(out);
}
export async function open(key, env) {
  if (!env || !env.startsWith('mb1.')) throw new Error('not a MochiBoo message');
  const raw = unb64u(env.slice(4));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, key, raw.slice(12));
  return JSON.parse(td.decode(pt));
}

// ---------- pairing code ----------
export function parsePairCode(code) {
  code = (code || '').trim();
  const m = code.match(/MOCHIBOO1:([A-Za-z0-9_-]+)/);
  if (!m) throw new Error('That code doesn\'t look like a MochiBoo pairing code.');
  const p = JSON.parse(td.decode(unb64u(m[1])));
  if (!p.s || !p.a || !p.b) throw new Error('This pairing code is incomplete. Ask him to show it again.');
  return p;
}

// ---------- store ----------
const KEY_PLAIN = 'mb_store', KEY_ENC = 'mb_store_enc', KEY_SALT = 'mb_pin_salt';

export const defaultState = () => ({
  v: 1, name: '', partnerName: 'Boo', pair: null, firstUse: today(),
  settings: { goal: 'track', aiPrivacy: 'anonymous', theme: 'strawberry', autoSeason: true, phaseTheme: false, sounds: true, cycleLen: 28, periodLen: 5, sharing: true, outfit: 'bow', pin: false, hidePrivate: true },
  periods: [], logs: {}, kit: {}, notes: [], needs: [], wishes: [], coupons: [], jar: [],
  qotd: {}, tonight: { incoming: null, outgoing: null }, match: { mine: null, his: null, celebrated: null }, vibe: 1, hisVibe: null,
  dates: { together: '', birthday: '', anniversary: '', extra: [] }, song: { url: '', title: '' },
  hugs: { mine: 0, his: 0, lastMatch: 0 }, hearts: { sent: 0, got: 0, lastGot: 0 },
  outbox: [], seen: [], lastPoll: '', lastSync: 0, ai: { gemini: '', groq: '', openrouter: '', chat: [] }, bloopTaps: 0,
});

let pinKey = null;
const KEY_DEV = 'mb_store_dev';
export function hasEncryptedStore() { return !!localStorage.getItem(KEY_ENC); }

/** A non-extractable AES key that lives inside the browser's key store: it can encrypt/decrypt but can never be read or copied out. */
let devKey = null;
async function deviceKey() {
  if (devKey) return devKey;
  const db = await new Promise((res, rej) => { const r = indexedDB.open('mochiboo', 1); r.onupgradeneeded = () => r.result.createObjectStore('keys'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const get = () => new Promise(res => { const t = db.transaction('keys').objectStore('keys').get('dev'); t.onsuccess = () => res(t.result); t.onerror = () => res(null); });
  devKey = await get();
  if (!devKey) {
    devKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await new Promise(res => { const t = db.transaction('keys', 'readwrite'); t.objectStore('keys').put(devKey, 'dev'); t.oncomplete = res; t.onerror = res; });
  }
  return devKey;
}

export async function loadStore(pin) {
  if (hasEncryptedStore()) {
    if (!pin) return null;
    const salt = localStorage.getItem(KEY_SALT);
    const key = await deriveKey(pin, 'mochiboo-pin-' + salt, 150000);
    const st = await open(key, localStorage.getItem(KEY_ENC)); // throws on wrong PIN
    pinKey = key; return merge(st);
  }
  const dev = localStorage.getItem(KEY_DEV);
  if (dev) { try { return merge(await open(await deviceKey(), dev)); } catch { /* key lost: fall through to fresh state */ } }
  const raw = localStorage.getItem(KEY_PLAIN); // migrate older unencrypted data
  return merge(raw ? JSON.parse(raw) : defaultState());
}
function merge(st) {
  const d = defaultState();
  for (const k of Object.keys(d)) if (st[k] === undefined) st[k] = d[k];
  st.settings = { ...d.settings, ...st.settings };
  return st;
}
/** Always encrypted at rest: with her PIN if she set one, otherwise with the locked device key. */
export async function saveStore(st) {
  if (pinKey) { localStorage.setItem(KEY_ENC, await seal(pinKey, st)); localStorage.removeItem(KEY_DEV); }
  else localStorage.setItem(KEY_DEV, await seal(await deviceKey(), st));
  localStorage.removeItem(KEY_PLAIN);
}
export async function setPin(st, pin) {
  if (!pin) { pinKey = null; localStorage.removeItem(KEY_ENC); localStorage.removeItem(KEY_SALT); st.settings.pin = false; return saveStore(st); }
  const salt = b64u(crypto.getRandomValues(new Uint8Array(12)));
  localStorage.setItem(KEY_SALT, salt);
  pinKey = await deriveKey(pin, 'mochiboo-pin-' + salt, 150000);
  st.settings.pin = true;
  return saveStore(st);
}

// ---------- relay (ntfy, end-to-end encrypted) ----------
export const RELAY = 'https://ntfy.sh';
let relayKey = null, relaySecret = null;
async function key(st) {
  if (!st.pair) throw new Error('not paired');
  if (relaySecret !== st.pair.s) { relayKey = await deriveKey(st.pair.s); relaySecret = st.pair.s; }
  return relayKey;
}

export async function publish(topic, env) {
  const r = await fetch(`${RELAY}/${topic}`, { method: 'POST', body: env });
  if (!r.ok) throw new Error('relay ' + r.status);
}

/** Queue + send a message to him. Reliable: stays in outbox until he acks. */
export async function send(st, t, d = {}) {
  if (!st.pair) return null;
  const msg = { id: uid(), t, ts: Date.now(), from: 'her', d };
  const env = await seal(await key(st), msg);
  if (t !== 'ack') st.outbox.push({ id: msg.id, t, env, ts: msg.ts, lastTry: 0 });
  try { await publish(st.pair.a, env); const o = st.outbox.find(x => x.id === msg.id); if (o) o.lastTry = Date.now(); }
  catch (e) { /* offline: retried on next sync */ }
  return msg;
}

/** Pull new messages from him, ack them, resend anything unacked. Returns decrypted messages. */
export async function sync(st) {
  if (!st.pair) return [];
  const k = await key(st);
  const since = st.lastPoll || 'all';
  const res = await fetch(`${RELAY}/${st.pair.b}/json?poll=1&since=${encodeURIComponent(since)}`);
  if (!res.ok) throw new Error('relay ' + res.status);
  const lines = (await res.text()).split('\n').filter(Boolean);
  const out = [], toAck = [];
  for (const line of lines) {
    let ev; try { ev = JSON.parse(line); } catch { continue; }
    if (ev.event !== 'message' || !ev.message) continue;
    st.lastPoll = ev.id;
    let msg; try { msg = await open(k, ev.message); } catch { continue; }
    if (msg.from !== 'him') continue;
    if (msg.t === 'ack') { const ids = new Set(msg.d.ids || []); st.outbox = st.outbox.filter(o => !ids.has(o.id)); continue; }
    if (st.seen.includes(msg.id)) { toAck.push(msg.id); continue; }
    st.seen.push(msg.id); if (st.seen.length > 600) st.seen = st.seen.slice(-400);
    toAck.push(msg.id); out.push(msg);
  }
  if (toAck.length) await send(st, 'ack', { ids: toAck });
  // resend unacked (ntfy keeps messages ~12h, so re-post every 6h for up to 7 days)
  const now = Date.now();
  st.outbox = st.outbox.filter(o => now - o.ts < 7 * 864e5);
  for (const o of st.outbox) if (now - o.lastTry > 6 * 36e5) { try { await publish(st.pair.a, o.env); o.lastTry = now; } catch { break; } }
  st.lastSync = now;
  return out;
}
