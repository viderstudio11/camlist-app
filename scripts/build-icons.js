// Pulls the glyphs Amir picked (one per slot, 2026-09-28) from the open-source icon sets and
// prints them as { key: { viewBox, body } } JSON, ready to paste into js/ui/icons.js.
// The app never loads an icon font or CDN at runtime — this runs once, by hand.
//
// Usage: node scripts/build-icons.js > icons.json

const CDN = 'https://cdn.jsdelivr.net/npm';
const SRC = {
  bs: (n) => `${CDN}/bootstrap-icons@1.11.3/icons/${n}.svg`,
  fa: (n) => `${CDN}/@fortawesome/fontawesome-free@6.5.2/svgs/solid/${n}.svg`,
  ms: (n) => `${CDN}/@material-symbols/svg-500@0.23.0/sharp/${n}-fill.svg`,
  ph: (n) => `${CDN}/@phosphor-icons/core@2.1.1/assets/fill/${n}-fill.svg`,
};

export const PICKS = {
  // departments
  cameras: ['bs', 'camera-reels-fill'],
  video: ['ms', 'connected_tv'],
  power: ['bs', 'battery-charging'],
  accessories: ['fa', 'screwdriver-wrench'],
  other: ['bs', 'box-seam-fill'],
  // tools
  media: ['fa', 'sd-card'],
  sun: ['ms', 'wb_twilight'],
  shutter: ['bs', 'film'],
  fov: ['bs', 'person-bounding-box'],
  offload: ['bs', 'copy'],
  units: ['ms', 'square_foot'],
  luts: ['bs', 'palette-fill'],
  hours: ['ph', 'clipboard-text'],
  viewfinder: ['bs', 'eye-fill'],
  pickup: ['bs', 'clipboard2-check-fill'],
  expendables: ['fa', 'tape'],
};

async function glyph([lib, name]) {
  const res = await fetch(SRC[lib](name));
  if (!res.ok) throw new Error(`${lib}/${name}: HTTP ${res.status}`);
  const svg = await res.text();
  const viewBox = svg.match(/viewBox="([^"]+)"/)[1];
  const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
    .replace(/<!--[\s\S]*?-->/g, '').replace(/\s(class|fill)="[^"]*"/g, '').replace(/\s+/g, ' ').trim();
  return { viewBox, body };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('build-icons.js')) {
  const out = {};
  for (const [k, pick] of Object.entries(PICKS)) out[k] = await glyph(pick);
  process.stdout.write(JSON.stringify(out, null, 1));
}
