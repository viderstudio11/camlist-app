// The VidTooList brand, drawn as a cine lens: the name sits between a focus scale above and an iris
// ring below. VID's I is the amber focus witness line reaching up to the focus scale; LIST's I is turned
// over, its dot below, reaching down to the iris ring; the double O is the ∞ engraved on a focus ring.
// The app icon (V2) is the initials VTL in the same language, the T the witness line between the scales.

// The engraved ∞: a lemniscate that crosses in the middle (two touching rings read as spectacles).
const LEM = (() => {
  const p = [];
  for (let i = 0; i <= 72; i++) {
    const t = (i / 72) * 2 * Math.PI, d = 1 + Math.sin(t) ** 2;
    p.push(`${(12 + (11 * Math.cos(t)) / d).toFixed(2)} ${(6 + (13.75 * Math.sin(t) * Math.cos(t)) / d).toFixed(2)}`);
  }
  return `M${p.join(' L')}Z`;
})();
const inf = (cx, cy, w, sw, attrs) => {
  const k = w / 22;
  return `<path transform="translate(${(cx - 12 * k).toFixed(2)} ${(cy - 6 * k).toFixed(2)}) scale(${k.toFixed(3)})" d="${LEM}" fill="none" stroke-width="${(sw / k).toFixed(3)}" stroke-linejoin="round" ${attrs}/>`;
};
// a straight scale: a tick every `step`, a long one every fifth
const ticks = (x0, x1, y, step, h, hMaj, dir, attrs) => {
  let s = '';
  for (let n = 0, x = x0; x <= x1 + 0.01; x += step, n++) {
    const len = n % 5 === 0 ? hMaj : h;
    s += `<line x1="${x.toFixed(1)}" y1="${y}" x2="${x.toFixed(1)}" y2="${y + dir * len}" stroke-width="${n % 5 === 0 ? 1.8 : 1.1}" ${attrs}/>`;
  }
  return s;
};

const F = `font-family="'Barlow Condensed', sans-serif" font-weight="500" font-size="54" text-anchor="middle"`;
const letter = (x, ch) => `<text x="${x}" y="58" ${F} class="wm-ink">${ch}</text>`;

// The wordmark for the top bar, 300×76. Colours come from the page (class names, see style.css).
export function wordmark(label = 'VidTooList') {
  return `<svg class="wmk" viewBox="0 0 300 76" role="img" aria-label="${label}">`
    + `<g class="wm-tick">${ticks(4, 296, 2, 5.84, 5, 9, 1, '')}${ticks(4, 296, 74, 5.84, 5, 9, -1, '')}</g>`
    + letter(16, 'V') + letter(70, 'D') + letter(100, 'T')
    + inf(152, 39, 50, 3.2, 'class="wm-inf"')
    + letter(204, 'L') + letter(254, 'S') + letter(282, 'T')
    // VID's I: the focus witness line, dot on top, reaching the focus scale
    + `<g class="wm-acc"><rect x="41.6" y="18" width="5" height="40"/><rect x="43.1" y="2" width="2" height="12"/><circle cx="44.1" cy="12.5" r="3.4"/>`
    // LIST's I, turned over: dot below, reaching the iris ring
    + `<rect x="226.4" y="20" width="5" height="40"/><circle cx="228.9" cy="65" r="3.4"/><rect x="227.9" y="66" width="2" height="8"/></g>`
    + '</svg>';
}

// The app icon (V2), on a 120 box: VTL between the scales, the amber T crossing from one to the other.
// `inset` shrinks the drawing toward the centre so it survives a maskable crop.
export function iconSVG({ size = 512, inset = 0.74, bg = true } = {}) {
  const fg = '#ECE9E2', mut = '#8f8b84', amber = '#F2A33A';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 120 120">`
    + (bg ? '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a2c30"/><stop offset="1" stop-color="#131416"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/>' : '')
    + `<g transform="translate(60 60) scale(${inset}) translate(-60 -60)">`
    + ticks(12, 108, 16, 4.8, 5, 10, 1, `stroke="${mut}"`)
    + ticks(12, 108, 104, 4.8, 5, 10, -1, `stroke="${mut}"`)
    + `<path d="M21 44 L32 85 L43 44" fill="none" stroke="${fg}" stroke-width="7" stroke-linejoin="bevel"/>`
    + `<path d="M77 44 V86 H97" fill="none" stroke="${fg}" stroke-width="7" stroke-linejoin="miter"/>`
    + `<path d="M48 44 H72 M60 44 V100" fill="none" stroke="${amber}" stroke-width="7"/>`
    + '</g></svg>';
}
