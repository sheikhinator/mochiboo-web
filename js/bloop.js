// Bloop — the jelly blob mascot. Expression follows mood/phase; outfits unlock over time.

const FACES = {
  happy: { eyes: 'open', mouth: 'M-7 10 Q0 18 7 10', blush: .75 },
  sleepy: { eyes: 'closed', mouth: 'M-4 13 Q0 15 4 13', blush: .55 },
  glowy: { eyes: 'sparkle', mouth: 'M-8 9 Q0 20 8 9', blush: .9 },
  grumpy: { eyes: 'flat', mouth: 'M-6 15 Q0 9 6 15', blush: .5 },
  love: { eyes: 'heart', mouth: 'M-7 10 Q0 18 7 10', blush: 1 },
  sad: { eyes: 'teary', mouth: 'M-6 15 Q0 10 6 15', blush: .6 },
  kiss: { eyes: 'wink', mouth: 'kiss', blush: 1 },
};

export function moodFor(info, log) {
  const sym = (log && log.sym) || [];
  if (sym.some(k => ['mood:sad', 'mood:emotional', 'mood:lonely'].includes(k))) return 'sad';
  if (sym.some(k => ['mood:angry', 'mood:irritable'].includes(k))) return 'grumpy';
  if (sym.some(k => ['mood:loving', 'mood:playful'].includes(k))) return 'love';
  if (!info || !info.known) return 'happy';
  if (info.phase === 'period') return 'sleepy';
  if (info.phase === 'ovulation') return 'glowy';
  if (info.pms) return 'grumpy';
  return 'happy';
}

function eyes(kind) {
  const ink = 'var(--blob-ink)';
  switch (kind) {
    case 'closed': return `<path d="M-19 -3 q6 5 12 0 M7 -3 q6 5 12 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case 'flat': return `<path d="M-19 -5 l12 2 M7 -3 l12 -2" stroke="${ink}" stroke-width="3.2" stroke-linecap="round"/><circle cx="-13" cy="1" r="3" fill="${ink}"/><circle cx="13" cy="1" r="3" fill="${ink}"/>`;
    case 'heart': return [-13, 13].map(x => `<path transform="translate(${x} -1) scale(.55)" d="M0 6 C-10 -4 -18 6 0 18 C18 6 10 -4 0 6Z" fill="#FF2E63"/>`).join('');
    case 'sparkle': return [-13, 13].map(x => `<circle cx="${x}" cy="-1" r="6.5" fill="${ink}"/><circle cx="${x + 2.2}" cy="-3.5" r="2.4" fill="#fff"/><circle cx="${x - 2}" cy="1.5" r="1.1" fill="#fff"/>`).join('');
    case 'teary': return [-13, 13].map(x => `<circle cx="${x}" cy="-1" r="5.5" fill="${ink}"/><circle cx="${x + 1.8}" cy="-3" r="1.8" fill="#fff"/>`).join('') + `<path d="M-17 6 q-2 5 1 7 q3 -2 1 -7z" fill="#8FD3FF"/>`;
    case 'wink': return `<circle cx="-13" cy="-1" r="5.5" fill="${ink}"/><circle cx="-11" cy="-3" r="1.8" fill="#fff"/><path d="M7 -1 q6 -5 12 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    default: return [-13, 13].map(x => `<circle cx="${x}" cy="-1" r="5.5" fill="${ink}"/><circle cx="${x + 1.8}" cy="-3" r="1.8" fill="#fff"/>`).join('');
  }
}

function outfit(o) {
  switch (o) {
    case 'bow': return `<g transform="translate(26 -40) rotate(18)"><path d="M0 0 L-14 -9 Q-17 0 -14 9Z M0 0 L14 -9 Q17 0 14 9Z" fill="#FF2E63"/><circle r="4.5" fill="#FF6F9C"/></g>`;
    case 'flowers': return [-30, -15, 0, 15, 30].map((x, i) => `<g transform="translate(${x} ${-44 + Math.abs(x) * .28})">${[0, 72, 144, 216, 288].map(a => `<circle transform="rotate(${a}) translate(0 -5)" r="4" fill="${['#FFB3CA', '#FFF', '#FFD86B', '#C5AEFF', '#FFB3CA'][i]}"/>`).join('')}<circle r="2.6" fill="#FFB547"/></g>`).join('');
    case 'bunny': return `<path d="M-20 -38 Q-34 -86 -16 -84 Q-6 -80 -8 -40Z M20 -38 Q34 -86 16 -84 Q6 -80 8 -40Z" fill="var(--blob)"/><path d="M-17 -42 Q-26 -74 -16 -74 Q-11 -70 -12 -44Z M17 -42 Q26 -74 16 -74 Q11 -70 12 -44Z" fill="#FFD1DE"/>`;
    case 'hoodie': return `<path d="M-50 20 Q-52 -48 0 -50 Q52 -48 50 20 Q36 -30 0 -32 Q-36 -30 -50 20Z" fill="#B9A3FF"/><circle cx="-12" cy="34" r="2.5" fill="#fff"/><circle cx="12" cy="34" r="2.5" fill="#fff"/>`;
    case 'crown': return `<g transform="translate(0 -46)"><path d="M-20 8 L-22 -10 L-10 -1 L0 -14 L10 -1 L22 -10 L20 8Z" fill="#FFCF4A"/><circle cy="-14" r="3" fill="#FF5C8A"/><circle cx="-22" cy="-10" r="2.4" fill="#FF5C8A"/><circle cx="22" cy="-10" r="2.4" fill="#FF5C8A"/></g>`;
    default: return '';
  }
}

/** Returns an SVG string. size in px. */
export function bloopSVG({ mood = 'happy', outfit: o = 'none', size = 160, wobble = true } = {}) {
  const f = FACES[mood] || FACES.happy;
  const mouth = f.mouth === 'kiss'
    ? `<path d="M0 12 C-5 7 -9 12 0 17 C9 12 5 7 0 12Z" fill="#FF2E63"/>`
    : `<path d="${f.mouth}" stroke="var(--blob-ink)" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const behind = o === 'bunny' || o === 'hoodie' ? outfit(o) : '';
  const front = o !== 'bunny' && o !== 'hoodie' ? outfit(o) : '';
  return `<svg class="bloop ${wobble ? 'wobble' : ''} mood-${mood}" width="${size}" height="${size}" viewBox="-70 -95 140 150" aria-hidden="true">
    <ellipse cx="0" cy="46" rx="40" ry="6" fill="var(--blob-shadow)"/>
    ${behind}
    <path class="bloop-body" d="M-46 30 C-54 -18 -30 -46 0 -46 C32 -46 54 -18 46 30 C42 46 -42 46 -46 30Z" fill="var(--blob)"/>
    <ellipse cx="-22" cy="-28" rx="9" ry="5" fill="#fff" opacity=".45" transform="rotate(-25 -22 -28)"/>
    ${mood === 'glowy' ? '<g class="sparkles"><path d="M44 -40 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" fill="#FFCF4A"/><path d="M-50 -20 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5z" fill="#FFCF4A"/></g>' : ''}
    ${eyes(f.eyes)}
    <ellipse cx="-24" cy="9" rx="7" ry="4" fill="#FF5C8A" opacity="${f.blush}"/>
    <ellipse cx="24" cy="9" rx="7" ry="4" fill="#FF5C8A" opacity="${f.blush}"/>
    ${mouth}
    ${front}
  </svg>`;
}
