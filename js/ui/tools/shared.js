// What every tool shares: the data files they read, the work kept while the app is open (and the
// settings kept on this phone), and the small pieces each tool's form is built from.
import { esc } from '../dom.js';
import { createMedia } from '../../tools/media.js';

// The app's data files, handed over once they load.
export const D = {
  media: createMedia({}),
  lut: { logs: [] },
  dl: { departments: [], items: [] },
  // the weekly watch: a page whose version numbers changed in the last three weeks is shown as new
  watch: { pages: {} },
  places: { countries: [], defaultCountry: 'IL' },
  // a query carried by the route (#/tools/downloads?q=…), read once by the tool it opens
  route: new URLSearchParams(''),
};
export const setCodecs = (data) => { D.media = createMedia(data); };
export const setLuts = (data) => { D.lut = data || D.lut; };
export const setDownloads = (data) => { D.dl = data || D.dl; };
export const setWatch = (data) => { D.watch = data || D.watch; };
export const setPlaces = (data) => { D.places = data || D.places; };
export const isNew = (url) => { const d = D.watch.pages?.[url]?.changed; return !!d && (Date.now() - new Date(d).getTime()) < 21 * 864e5; };
// Everything the user typed, kept while the app is open so switching tools does not reset the work.
export const S = {
  media: { brand: 'Sony', cam: 'fx6', fmt: '', fps: 25, mtype: '', card: 0, cardPicked: false, customCard: false, backup: false, hours: 10, customHours: false },
  fov: { distance: 4, unit: 'm', shot: 'waist', focal: 0, fps: 25, cam: '', camBrand: '', modes: {}, recent: [], q: '', picking: false, fromProject: false, calcOpen: false },
  shutter: { fps: 25, mode: 'speed', speed: 50, angle: 180, mains: 50, projectFps: 25, customFps: false },
  offload: { gb: 1000, reader: 'CFexpress A', drive: 'ssd10', copies: 2, verify: true, customGb: false, fromMedia: false, readOther: false, readMBs: 800, writeOther: false, writeMBs: 1000, readers: 1, port: 'tb', cardGb: 0 },
  sun: { country: 'IL', city: 0, date: new Date().toISOString().slice(0, 10), dateMode: 'today', lat: null, lon: null },
  units: { group: 'length', from: 'm', value: 1, mah: 6600, volts: 14.4, batMode: 'mah', wh: 98, ndKind: 'density', nd: 0.9, temp: 20, tempUnit: 'c' },
  luts: { brand: '', model: '' },
  downloads: { dept: 'cameras', q: '' },
  hours: { call: '07:00', wrap: '19:30', breaks: 60, customBreaks: false, base: 10, tier1h: 2, tier1pct: 125, tier2pct: 150, turnaround: 11, dayRate: 0 },
};

// The timesheet keeps its rules and rate on this phone: set once, not every day.
const HOURS_KEY = 'camlist.hours';
const HOURS_KEEP = ['breaks', 'customBreaks', 'base', 'tier1h', 'tier1pct', 'tier2pct', 'turnaround', 'dayRate'];
try { const kept = JSON.parse(localStorage.getItem(HOURS_KEY) || '{}'); for (const k of HOURS_KEEP) if (kept[k] != null) S.hours[k] = kept[k]; } catch { /* private window */ }
export const keepHours = () => { try { localStorage.setItem(HOURS_KEY, JSON.stringify(Object.fromEntries(HOURS_KEEP.map(k => [k, S.hours[k]])))); } catch { /* ignore */ } };

// The lens tool remembers its camera and last lens on this phone, so opening it again picks up where
// the user left off. Kept in this browser only; losing it just means starting from the project's camera.
const FOV_KEY = 'camlist.fov';
const FOV_KEEP = ['cam', 'camBrand', 'res', 'sens', 'modes', 'recent', 'focal', 'distance', 'unit', 'shot', 'fps'];
// The cameras used last, newest first — the picker and the viewfinder offer them before anything else.
export const pushRecent = (id) => { S.fov.recent = [String(id), ...(S.fov.recent || []).map(String).filter(x => x !== String(id))].slice(0, 5); };
try {
  const kept = JSON.parse(localStorage.getItem(FOV_KEY) || '{}');
  for (const k of FOV_KEEP) if (kept[k] != null) S.fov[k] = kept[k];
} catch { /* private window or blocked storage */ }
// The distance tape's marks, as a focus puller's tape reads: fine up close, coarse far off.
export const DIST_M = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40, 50, 75, 100];
export const DIST_FT = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 50, 60, 75, 100, 150, 200, 300];
export const keepFov = () => { try { localStorage.setItem(FOV_KEY, JSON.stringify(Object.fromEntries(FOV_KEEP.map(k => [k, S.fov[k]])))); } catch { /* ignore */ } };

// Every tool: the answer first, the one or two questions that change it, and the rest folded under one
// card whose line says what is set now. The fold stays open while the app is open.
export const OPEN = {};
export const more = (key, label, summary, inner) => `<details class="card tool-more" data-more="${key}" ${OPEN[key] ? 'open' : ''}><summary><span>${esc(label)}</span><b>${esc(summary)}</b></summary>${inner}</details>`;
export const field = (label, inner) => `<label class="tfield"><span>${esc(label)}</span>${inner}</label>`;
export const sel = (name, options, value) => `<select data-f="${name}">${options.map(o =>
  `<option value="${esc(o.v)}" ${String(o.v) === String(value) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`;
export const numIn = (name, value, { min = 0, max = 100000, step = 'any' } = {}) =>
  `<input type="number" data-f="${name}" value="${esc(value)}" min="${min}" max="${max}" step="${step}" inputmode="decimal">`;
export const out = (rows) => `<div class="tout">${rows.map(([k, v, cls = '']) =>
  `<div class="torow ${cls}"><span>${esc(k)}</span><b>${v}</b></div>`).join('')}</div>`;

// Every tool leads with its answer. The form is what you adjust; this is what you came for.
export const headline = (value, unit, caption, cls = '') => `<div class="thead ${cls}">
  <div class="thead-v"><b>${value}</b>${unit ? `<i>${esc(unit)}</i>` : ''}</div>
  ${caption ? `<div class="thead-c">${caption}</div>` : ''}
</div>`;
// A fold remembers being open while the app is open.
export const bindMore = (root) => root.querySelectorAll('[data-more]').forEach(d => d.addEventListener('toggle', () => { OPEN[d.dataset.more] = d.open; }));
