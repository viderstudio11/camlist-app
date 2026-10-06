import { t } from './i18n.js';
export const slugify = (name = '') => name.toLowerCase().trim()
  .replace(/['’]/g, '').replace(/[^a-z0-9֐-׿]+/g, '-').replace(/^-+|-+$/g, '');

// Brand-ish colours for the typographic fallback (full name, never initials).
export const BUILTIN = {
  arri: { fg: '#ffffff', bg: '#1f4fd8', weight: 900, spacing: 0.1 },
  sony: { fg: '#ffffff', bg: '#000000', weight: 800, serif: true },
  canon: { fg: '#ffffff', bg: '#cc0000', weight: 800, italic: true },
  red: { fg: '#e0262b', bg: '#111111', weight: 900, spacing: 0.06 },
  nikon: { fg: '#111111', bg: '#f7d117', weight: 800 },
  'blackmagic-design': { fg: '#ffffff', bg: '#2b2b2b', weight: 700 },
  panasonic: { fg: '#ffffff', bg: '#0b3d91', weight: 800 },
  dji: { fg: '#ffffff', bg: '#000000', weight: 900, spacing: 0.08 },
  gopro: { fg: '#111111', bg: '#00a3e0', weight: 900 },
  insta360: { fg: '#111111', bg: '#ffb800', weight: 800 },
  zeiss: { fg: '#ffffff', bg: '#0060a8', weight: 800, spacing: 0.1 },
  cooke: { fg: '#111111', bg: '#f5c400', weight: 800, serif: true },
  angenieux: { fg: '#ffffff', bg: '#7a0c1a', weight: 700, serif: true },
  fujinon: { fg: '#ffffff', bg: '#008a3e', weight: 800, spacing: 0.04 },
  fujifilm: { fg: '#ffffff', bg: '#008a3e', weight: 800, spacing: 0.04 },
  sigma: { fg: '#ffffff', bg: '#111111', weight: 800, spacing: 0.08 },
  leica: { fg: '#ffffff', bg: '#e20612', weight: 800 },
  laowa: { fg: '#ffffff', bg: '#222222', weight: 800, spacing: 0.08 },
  teradek: { fg: '#ffffff', bg: '#0a84ff', weight: 800 },
  smallhd: { fg: '#ffffff', bg: '#f26522', weight: 800 },
  atomos: { fg: '#111111', bg: '#f5f5f5', weight: 800, spacing: 0.06 },
  tilta: { fg: '#ffffff', bg: '#c8102e', weight: 900, spacing: 0.1 },
  smallrig: { fg: '#111111', bg: '#f5f5f5', weight: 800 },
  sachtler: { fg: '#ffffff', bg: '#004b87', weight: 700 },
  oconnor: { fg: '#ffffff', bg: '#005eb8', weight: 800 },
  vinten: { fg: '#ffffff', bg: '#1a7fd6', weight: 800, italic: true },
  'wooden-camera': { fg: '#111111', bg: '#f2c14e', weight: 900, spacing: 0.06 },
  'bright-tangerine': { fg: '#111111', bg: '#ff7f11', weight: 800 },
  easyrig: { fg: '#ffffff', bg: '#d6001c', weight: 800 },
  freefly: { fg: '#ffffff', bg: '#0d0d0d', weight: 800, spacing: 0.08 },
  tiffen: { fg: '#ffffff', bg: '#004b8d', weight: 800 },
  hollyland: { fg: '#ffffff', bg: '#1b1b1b', weight: 800 },
  aputure: { fg: '#ffffff', bg: '#2a2a2a', weight: 800 },
  manfrotto: { fg: '#ffffff', bg: '#d0021b', weight: 800 },
  cartoni: { fg: '#ffffff', bg: '#c00000', weight: 800 },
  dzofilm: { fg: '#ffffff', bg: '#000000', weight: 800, spacing: 0.06 },
  sirui: { fg: '#ffffff', bg: '#004aad', weight: 800, spacing: 0.08 },
  portkeys: { fg: '#ffffff', bg: '#0b0b0b', weight: 800, spacing: 0.04 },
  shape: { fg: '#ffffff', bg: '#1b1b1b', weight: 900, spacing: 0.1 },
  matthews: { fg: '#ffffff', bg: '#d0021b', weight: 900, spacing: 0.04 },
  avenger: { fg: '#ffffff', bg: '#111111', weight: 900, spacing: 0.06 },
  samyang: { fg: '#ffffff', bg: '#c00000', weight: 800, spacing: 0.04 },
  fxlion: { fg: '#ffffff', bg: '#e05a00', weight: 900, spacing: 0.06 },
  'ronford-baker': { fg: '#ffffff', bg: '#2f3b52', weight: 800 },
  utopia: { fg: '#ffffff', bg: '#e0262b', weight: 900, spacing: 0.1 },
  'core-swx': { fg: '#ffffff', bg: '#0a5bd3', weight: 900, spacing: 0.06 },
  'anton-bauer': { fg: '#ffffff', bg: '#005a9c', weight: 800 },
  nanlite: { fg: '#ffffff', bg: '#00a0e9', weight: 800, spacing: 0.06 },
  godox: { fg: '#ffffff', bg: '#ff6b00', weight: 800 },
  nisi: { fg: '#ffffff', bg: '#3b3b3b', weight: 800 },
  tokina: { fg: '#ffffff', bg: '#1a3a7a', weight: 800 },
  tamron: { fg: '#ffffff', bg: '#1b1b1b', weight: 800, spacing: 0.06 },
  swit: { fg: '#ffffff', bg: '#c8102e', weight: 900, spacing: 0.08 },
  chrosziel: { fg: '#ffffff', bg: '#005f9e', weight: 800 },
  viltrox: { fg: '#ffffff', bg: '#111111', weight: 800, spacing: 0.06 },
  vaxis: { fg: '#ffffff', bg: '#111111', weight: 800, spacing: 0.08 },
  aja: { fg: '#ffffff', bg: '#0055a5', weight: 900, spacing: 0.1 },
  lexar: { fg: '#ffffff', bg: '#0067b1', weight: 800 },
  sandisk: { fg: '#ffffff', bg: '#d0021b', weight: 800 },
  angelbird: { fg: '#ffffff', bg: '#2c3e50', weight: 800 },
};

const hash = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.codePointAt(0)) >>> 0; return h; };
export const hueOf = (slug) => hash(slug || '') % 360;

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// logos/index.json → { "arri.svg": "light", "teradek.svg": "dark" }. Loaded once by the app (setLogoIndex);
// until then, and for brands without a file, the typographic fallback is used.
let files = new Map(); // slug → { file, plate }
export function setLogoIndex(index) {
  files = new Map();
  const entries = Array.isArray(index) ? index.map(f => [f, 'light']) : Object.entries(index || {});
  for (const [file, plate] of entries) {
    const slug = file.replace(/\.[^.]+$/, '');
    if (!files.has(slug) || file.endsWith('.svg')) files.set(slug, { file, plate: plate === 'dark' ? 'dark' : 'light' });
  }
}
export const hasLogoFile = (slug) => files.has(slug);
export const logoFile = (slug) => files.get(slug)?.file || null;

// Typographic fallback: the full brand name in the brand's colours (or a hue derived from the slug).
export function fallbackHTML(slug, name, size = 'row') {
  const b = BUILTIN[slug];
  const style = b
    ? `--bg:${b.bg};--fg:${b.fg};--w:${b.weight || 800};--ls:${b.spacing || 0}em;${b.italic ? 'font-style:italic;' : ''}${b.serif ? 'font-family:Georgia,"Times New Roman",serif;' : ''}`
    : `--bg:hsl(${hueOf(slug)} 40% 26%);--fg:#fff;--w:800;--ls:0.02em;`;
  return `<span class="logo logo-${size} logo-text" style="${style}" title="${esc(name || slug)}">${esc(name || slug)}</span>`;
}

// In the gear list the product name is what matters, so the brand is set in plain type there.
// The marks stay where they help you navigate: the brand grid and the jump rail in the catalog.
// No-name gear ("General") reads in the interface language.
const label = (slug, name) => (slug === 'general' ? t('brand_general') : name || slug);

export function brandText(slug, name) {
  const text = label(slug, name);
  return text ? `<span class="brandname" title="${esc(text)}">${esc(text)}</span>` : '';
}

export function logoHTML(slug, name, size = 'row') {
  name = label(slug, name);
  if (!slug) return `<span class="logo logo-${size} logo-none" aria-hidden="true"></span>`;
  const f = files.get(slug);
  if (!f) return fallbackHTML(slug, name, size);
  return `<span class="logo logo-${size} logo-img plate-${f.plate}" title="${esc(name || slug)}"><img src="logos/${esc(f.file)}" alt="${esc(name || slug)}" loading="lazy" onerror="this.parentElement.outerHTML=window.__logoFallback?window.__logoFallback('${esc(slug)}','${esc(size)}'):''"></span>`;
}
