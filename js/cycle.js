// Flo-style cycle engine: learns averages, predicts period, fertile window, ovulation, phases.
import { addDays, diffDays, today } from './core.js';
import { NEGATIVE_MOODS, SYMPTOM_INDEX } from './content.js';

const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };

/** Periods sorted by start; ends filled with predicted length when missing. */
export function normalize(periods) {
  return [...periods].filter(p => p.start).sort((a, b) => a.start.localeCompare(b.start));
}

export function stats(st) {
  const ps = normalize(st.periods);
  const lens = [];
  for (let i = 1; i < ps.length; i++) { const L = diffDays(ps[i].start, ps[i - 1].start); if (L >= 15 && L <= 60) lens.push(L); }
  const recent = lens.slice(-6);
  // weighted average: newer cycles count more
  let cycleLen = st.settings.cycleLen || 28;
  if (recent.length) { let w = 0, s = 0; recent.forEach((L, i) => { s += L * (i + 1); w += i + 1; }); cycleLen = Math.round(s / w); }
  const pl = ps.filter(p => p.end).map(p => diffDays(p.end, p.start) + 1).filter(x => x > 0 && x < 15).slice(-6);
  const periodLen = pl.length ? Math.round(mean(pl)) : (st.settings.periodLen || 5);
  const variation = recent.length > 1 ? Math.round(sd(recent) * 10) / 10 : 0;
  return { cycleLen, periodLen, variation, irregular: variation > 7, lengths: lens, count: ps.length, learned: recent.length };
}

/** Everything about a given day. */
export function dayInfo(st, date = today()) {
  const ps = normalize(st.periods);
  const s = stats(st);
  if (!ps.length) return { known: false, s };
  // last period that started on/before date
  let last = null; for (const p of ps) if (p.start <= date) last = p;
  if (!last) last = ps[0];
  const lastEnd = last.end || addDays(last.start, s.periodLen - 1);
  let cycleStart = last.start;
  let nextStart = addDays(cycleStart, s.cycleLen);
  // if the date is past the predicted next start with no logged period, roll forward predictions
  while (date >= nextStart) { cycleStart = nextStart; nextStart = addDays(nextStart, s.cycleLen); }
  const predictedCycle = cycleStart !== last.start;
  const day = diffDays(date, cycleStart) + 1;
  const ovulation = addDays(nextStart, -14);
  const fertileStart = addDays(ovulation, -5), fertileEnd = addDays(ovulation, 1);
  const periodEnd = predictedCycle ? addDays(cycleStart, s.periodLen - 1) : lastEnd;
  const inPeriod = date >= cycleStart && date <= periodEnd;
  let phase;
  if (inPeriod) phase = 'period';
  else if (date < fertileStart) phase = 'follicular';
  else if (date <= fertileEnd) phase = 'ovulation';
  else phase = 'luteal';
  const daysToNext = diffDays(nextStart, date);
  const pms = phase === 'luteal' && daysToNext <= 5;
  const late = !predictedCycle ? false : (date > addDays(last.start, s.cycleLen) && !ps.some(p => p.start > last.start));
  const daysLate = late ? diffDays(date, addDays(last.start, s.cycleLen)) : 0;
  let fertility = 'low';
  if (date >= fertileStart && date <= fertileEnd) fertility = date === ovulation ? 'peak' : 'high';
  return { known: true, s, day, phase, inPeriod, predicted: predictedCycle, cycleStart, nextStart, daysToNext, ovulation, fertileStart, fertileEnd, periodEnd, pms, fertility, late, daysLate };
}

/** Marks for a calendar day: logged period, predicted period, fertile, ovulation. */
export function calendarMark(st, date) {
  const ps = normalize(st.periods);
  const s = stats(st);
  for (const p of ps) { const end = p.end || addDays(p.start, s.periodLen - 1); if (date >= p.start && date <= end) return 'period'; }
  if (!ps.length) return '';
  const i = dayInfo(st, date);
  if (date > today() || i.predicted) {
    if (i.inPeriod) return 'predicted';
  }
  if (date === i.ovulation) return 'ovulation';
  if (date >= i.fertileStart && date <= i.fertileEnd) return 'fertile';
  return '';
}

export function isPeriodDay(st, date) {
  const s = stats(st);
  return normalize(st.periods).find(p => date >= p.start && date <= (p.end || addDays(p.start, s.periodLen - 1)));
}

/** Start a period today (or on a date); closes an open one. */
export function startPeriod(st, date = today()) {
  if (isPeriodDay(st, date)) return;
  // merge if within 2 days after an existing period end
  st.periods.push({ start: date, end: null });
}
export function endPeriod(st, date = today()) {
  const ps = normalize(st.periods);
  let last = null; for (const p of ps) if (p.start <= date) last = p;
  if (last) last.end = date;
}
export function removePeriodContaining(st, date) {
  const p = isPeriodDay(st, date); if (p) st.periods = st.periods.filter(x => x !== p);
}

/** Pattern insights from logs. */
export function insights(st) {
  const out = [];
  const s = stats(st);
  if (s.learned >= 2) out.push({ e: '🔁', t: `Your cycles average ${s.cycleLen} days` + (s.irregular ? ', and they vary quite a bit. That\'s okay, predictions will widen.' : ` and stay within about ±${Math.max(1, Math.round(s.variation))} days.`) });
  else out.push({ e: '🌱', t: 'Log two or more periods and Bloop starts learning your rhythm.' });
  const byPhase = {}; const byDayBefore = {};
  let negPMS = 0, negOther = 0, pmsDays = 0, otherDays = 0;
  for (const [date, log] of Object.entries(st.logs)) {
    const i = dayInfo(st, date); if (!i.known) continue;
    for (const k of (log.sym || [])) {
      byPhase[k] = byPhase[k] || { period: 0, follicular: 0, ovulation: 0, luteal: 0, total: 0 };
      byPhase[k][i.phase]++; byPhase[k].total++;
    }
    const neg = (log.sym || []).some(k => NEGATIVE_MOODS.includes(k.split(':')[1]));
    if (i.pms) { pmsDays++; if (neg) negPMS++; } else { otherDays++; if (neg) negOther++; }
    if (i.inPeriod && (log.sym || []).includes('pain:cramps')) byDayBefore[i.day] = (byDayBefore[i.day] || 0) + 1;
  }
  const top = Object.entries(byPhase).filter(([, v]) => v.total >= 3).sort((a, b) => b[1].total - a[1].total).slice(0, 4);
  for (const [k, v] of top) {
    const phase = Object.entries(v).filter(([p]) => p !== 'total').sort((a, b) => b[1] - a[1])[0][0];
    const sym = SYMPTOM_INDEX[k]; if (!sym) continue;
    out.push({ e: sym.emoji, t: `${sym.name} shows up most in your ${phase === 'period' ? 'period' : phase + ' phase'} (${v[phase]} of ${v.total} times).` });
  }
  const crampDay = Object.entries(byDayBefore).sort((a, b) => b[1] - a[1])[0];
  if (crampDay && crampDay[1] >= 2) out.push({ e: '🌀', t: `Cramps usually peak on day ${crampDay[0]} of your period. Heat pad ready that day.` });
  if (pmsDays >= 4 && otherDays >= 4) {
    const a = negPMS / pmsDays, b = negOther / otherDays;
    if (a > b + 0.15) out.push({ e: '🌙', t: `Tough moods are ${Math.round(a / Math.max(b, 0.05))}× more likely in the 5 days before your period. Totally normal, be extra soft with yourself then.` });
  }
  return out;
}

/** Well-being battery 0–100 from today's log + phase. */
export function battery(st, date = today()) {
  const i = dayInfo(st, date); const log = st.logs[date] || {};
  let b = 75;
  if (i.known) b += { period: -18, follicular: 8, ovulation: 15, luteal: -4 }[i.phase] + (i.pms ? -8 : 0);
  if (log.pain != null) b -= log.pain * 3;
  if (log.energy != null) b += (log.energy - 3) * 8;
  if (log.sleep != null) b += log.sleep >= 7 ? 6 : log.sleep < 6 ? -12 : 0;
  if (log.water != null) b += log.water >= 6 ? 5 : log.water < 3 ? -6 : 0;
  const sym = log.sym || [];
  if (sym.includes('body:fatigue')) b -= 10;
  if (sym.some(k => ['mood:happy', 'mood:loving', 'mood:energetic', 'mood:confident'].includes(k))) b += 6;
  return Math.max(5, Math.min(100, Math.round(b)));
}

// ---------------------------------------------------------------- baby planning
// Approximate chance of conceiving from intercourse on a given day relative to ovulation
// (classic fertile-window research: the 2 days before ovulation and ovulation day are the best).
const CHANCE = { '-5': 10, '-4': 16, '-3': 14, '-2': 27, '-1': 31, '0': 33, '1': 5 };

/** {pct, level, label} for a date, nudged by her own logs (positive ovulation test, egg-white discharge). */
export function conceptionChance(st, date = today()) {
  const i = dayInfo(st, date);
  if (!i.known) return null;
  let pct = CHANCE[String(diffDays(date, i.ovulation))] || 1;
  const log = st.logs[date] || {}, prev = st.logs[addDays(date, -1)] || {};
  if (log.ovu === 'pos' || prev.ovu === 'pos') pct = Math.max(pct, 30);
  if ((log.sym || []).includes('discharge:eggwhite')) pct = Math.max(pct, 25);
  if (i.inPeriod) pct = Math.min(pct, 1);
  const level = pct >= 27 ? 'peak' : pct >= 14 ? 'high' : pct >= 5 ? 'medium' : 'low';
  const label = { peak: 'Best day 💞', high: 'High chance 🌿', medium: 'Some chance 🌱', low: 'Low chance' }[level];
  return { pct, level, label, info: i };
}

/** The next (or current) fertile window with a chance per day and the best days highlighted. */
export function fertilePlan(st) {
  const t = today(); const i = dayInfo(st, t);
  if (!i.known) return null;
  let ov = i.ovulation;
  if (diffDays(t, ov) > 1) ov = addDays(ov, stats(st).cycleLen); // this cycle's window has passed
  const days = [];
  for (let k = -5; k <= 1; k++) { const d = addDays(ov, k); days.push({ date: d, ...conceptionChance(st, d) }); }
  const best = days.filter(d => d.level === 'peak').map(d => d.date);
  const intimate = days.filter(d => /intimacy:(unprotected|protected)/.test((st.logs[d.date]?.sym || []).join(' '))).map(d => d.date);
  return { ovulation: ov, days, best, intimate, irregular: i.s.irregular, learned: i.s.learned };
}
