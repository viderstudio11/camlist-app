// "Build around a camera": camera profiles + rules that grade every catalog product against the active camera.
// Verdicts: native | adapter | partial | no | unknown (lens/media/battery we couldn't identify) | neutral (not subject to rules).
import { normalize } from './catalog.js';

const MOUNT_ALIASES = {
  'e': 'E', 'e-mount': 'E', 'e mount': 'E', 'sony e': 'E', 'sony e-mount': 'E', 'sony e mount': 'E', 'fe': 'E',
  'pl': 'PL', 'pl-mount': 'PL', 'pl mount': 'PL', 'arri pl': 'PL', 'lpl': 'LPL', 'lpl mount': 'LPL', 'lpl-mount': 'LPL',
  'ef': 'EF', 'ef mount': 'EF', 'ef-mount': 'EF', 'canon ef': 'EF', 'ef-s': 'EF', 'rf': 'RF', 'canon rf': 'RF', 'rf mount': 'RF',
  'l': 'L', 'l-mount': 'L', 'l mount': 'L', 'leica l': 'L', 'mft': 'MFT', 'm4/3': 'MFT', 'm43': 'MFT', 'micro four thirds': 'MFT', 'micro 4/3': 'MFT',
  'b4': 'B4', 'b4 2': 'B4', '2 3': 'B4', 'm': 'M', 'm-mount': 'M', 'leica m': 'M', 'g': 'G', 'gfx': 'G', 'g-mount': 'G', 'g mount': 'G',
  'f': 'F', 'nikon f': 'F', 'z': 'Z', 'nikon z': 'Z', 'x': 'X', 'fuji x': 'X', 'x-mount': 'X', 'dl': 'DL', 'dl-mount': 'DL',
};
const MOUNT_NAME_RX = [
  ['LPL', /\blpl\b/i], ['PL', /\bpl\b(?!\s*\/?\s*e)|pl-mount|pl mount/i], ['EF', /\bef\b|ef-mount|ef mount/i], ['RF', /\brf\b(?!\s*(tx|rx|venue))/i],
  ['E', /\be-?mount\b|\bsony e\b|\bfe\b(?=\s*\d)|\(e\)|\be\/|\/e\b/i], ['L', /\bl-?mount\b|\bleica l\b/i], ['MFT', /\bmft\b|micro four thirds|\bm4\/3\b|\bm43\b/i],
  ['B4', /\bb4\b|2\/3/i], ['G', /\bg-?mount\b|\bgfx\b/i], ['M', /\bm-?mount\b|\bleica m\b/i], ['DL', /\bdl-?mount\b/i], ['F', /\bnikon f\b|\bf-?mount\b/i], ['Z', /\bnikon z\b|\bz-?mount\b/i],
];
const SUBCAT_MOUNT = { 'PL-Mount': 'PL', 'HDSLR E-Mount': 'E', 'HDSLR EF-Mount': 'EF', 'Broadcast / ENG B4-Mount': 'B4', 'MFT M4/3': 'MFT', 'L-Mount': 'L', 'G-Mount': 'G', 'M-Mount': 'M' };
const SUBCAT_FORMAT = { 'Full Frame': 'FF', '35mm Prime': 'S35', '35mm Zoom': 'S35', 'Broadcast / ENG B4-Mount': '2/3', '16mm': '16', 'MFT M4/3': 'MFT', 'G-Mount': 'MF', 'Medium Format': 'MF' };

// Media families, matched on product names. Order matters only for display; specificity is resolved in mediaFamilies().
export const MEDIA = {
  'CFexpress A': /cfexpress[\s\d.]*(type\s*)?-?a\b/i, 'CFexpress B': /cfexpress[\s\d.]*(type\s*)?-?b\b/i, 'microSD': /micro\s*-?sd/i,
  'SD': /(^|[^a-z])(sd|sdxc|sdhc)([^a-z]|$)/i, 'CFast': /cfast/i, 'XQD': /xqd/i, 'SxS': /sxs/i, 'AXS': /\baxs\b/i, 'Codex': /codex|compact drive/i,
  'RED MINI-MAG': /mini-?mag|redmag/i, 'P2': /express\s*p2|\bp2\b/i, 'CF': /(^|[^a-z])cf([^a-z]|$)|compact\s*flash/i, 'SSD': /\bssd\b|\bt7\b|\bt5\b/i, 'ProSSD': /pro-?ssd/i,
  'CineMag': /cinemag/i, 'XDCAM': /xdcam|professional disc/i,
};
// Things in "Recorders & Media" that are neither cards nor readers (laptops, decks, monitor-recorders).
const MEDIA_IGNORE = /recorder|monitor|macbook|ipad|vostro|hyperdeck|video assist|apollo|odyssey|\bpix\b|hvr-|betacam|br-hd|player|sumo|ninja|shogun/i;
const READER_RX = /reader|dock|station/i;
// Resolve overlapping matches: RED mags ⊃ SSD, ProSSD ⊃ SSD. (The SD regex already refuses "microSD".)
export function mediaFamilies(name) {
  let f = Object.entries(MEDIA).filter(([, rx]) => rx.test(name)).map(([k]) => k);
  if (f.includes('RED MINI-MAG') || f.includes('ProSSD')) f = f.filter(x => x !== 'SSD');
  return f;
}
// Battery families — each regex also covers that family's chargers (BC-U1 → BP-U, LC-E6 → LP-E6, D-3004S → V-Mount…).
export const BATTERY = {
  'BP-U': /bp-?u\s?\d*|\bu\d{2,3}\b|bc-?u\d/i,
  'V-Mount': /v[-\s]?mount|v[-\s]?lock|bp-?gl\d|\bbp-?\d{2,3}s\b|\bv\d{2,3}\b|\bd-?3004|\bsc-?302|fx-?m2s/i,
  'Gold': /gold|anton|\bab-?mount|\bg\d{2,3}\b/i, 'B-Mount': /\bb-?mount/i,
  'NP-F': /np-?f\d{3}|ac-?vl1|bc-?l1/i, 'NP-FV': /np-?fv|bc-?qm1/i, 'NP-FZ100': /np-?fz|fz-?100|bc-?qz1/i, 'NP-FW50': /fw-?50|bc-?trw/i, 'NP-SA100': /np-?sa\d{2,3}/i,
  'LP-E6': /lp-?e6|lc-?e6/i, 'BP-A': /bp-?a\d{2}|cg-?a\d{2}/i, 'BP-9': /bp-?9\d{2}|ca-?930|cg-?940/i,
  'VBR': /\bvbr|\bvbd|ag-?vb[rd]|vw-?vb[rd]|vw-?ad20|ag-?b23|s-?8d58/i, 'VBG': /vbg\d|vw-?vbg/i, 'VBT': /vbt\d|vw-?vbt|vw-?bc10/i, 'CGA-D54': /cga-?d54|de-?a20|ag-?b23/i,
  'DMW-BLF19': /blf-?19/i, 'DMW-BLK22': /blk-?22/i, 'DMW-BLJ31': /blj-?31/i, 'NP-W235': /w-?235/i, 'TB50': /tb-?50/i, 'BP-FL': /bp-?fl/i,
  'GoPro': /\bhero\d*|gopro|aadbd/i, 'Insta360': /insta360|\bx[345]\b|למצלמת x|ace pro/i, 'Osmo': /osmo/i,
};
// A D-Tap-to-dummy-battery cable per battery family (the item it adds and how its name reads).
export const DUMMY = {
  'BP-U': { add: 'x_gen_dummy_bpu', rx: 'bp-?u' }, 'NP-FZ100': { add: 'x_gen_dummy_fz100', rx: 'np-?fz' }, 'NP-FW50': { add: 'x_gen_dummy_fw50', rx: 'np-?fw' },
  'NP-F': { add: 'x_gen_dummy_npf', rx: 'np-?f\\b|np-?f5|l-series' }, 'NP-FV': { add: 'x_gen_dummy_npfv', rx: 'np-?fv' }, 'NP-SA100': { add: 'x_gen_dummy_sa100', rx: 'np-?sa' },
  'BP-A': { add: 'x_gen_dummy_bpa', rx: 'bp-?a' }, 'BP-9': { add: 'x_gen_dummy_bp9', rx: 'bp-?9' }, 'LP-E6': { add: 'x_gen_dummy_lpe6', rx: 'lp-?e6' },
  'DMW-BLJ31': { add: 'x_gen_dummy_blj31', rx: 'blj-?31' }, 'DMW-BLK22': { add: 'x_gen_dummy_blk22', rx: 'blk-?22' }, 'DMW-BLF19': { add: 'x_gen_dummy_blf19', rx: 'blf-?19' },
  'VBR': { add: 'x_gen_dummy_vbr', rx: 'vbr' }, 'NP-W235': { add: 'x_gen_dummy_w235', rx: 'w-?235' },
};
// Power items that are not camera batteries/chargers (lighting/grid power, UPS, adapters).
const POWER_IGNORE = /dummy|48v|power pack|portable power|\bups\b|\bgel\b|\b(12|24)v battery|24v battery charger|d-tap batt|li-ion 11\.1v|energy storage|vertex/i;

export function parseMounts(text) {
  const out = new Set();
  for (const part of String(text || '').split(/[,;&+/]|\band\b|\bor\b/i)) {
    const key = normalize(part).replace(/ mount$/, '').trim();
    if (MOUNT_ALIASES[key]) out.add(MOUNT_ALIASES[key]);
  }
  return out;
}
export function mountsInName(name) {
  const out = new Set();
  for (const [m, rx] of MOUNT_NAME_RX) if (rx.test(name || '')) out.add(m);
  return out;
}

export function createCompat(data, catalog) {
  const deptKey = (p) => catalog.deptKey(p.dept);
  const subNames = (p) => p.subcats.map(id => catalog.departments.flatMap(d => d.subcategories).find(s => s.id === id)?.en).filter(Boolean);
  const profiles = data.cameras || [];
  const adapters = data.adapters || {};

  function profileFor(product) {
    if (!product) return null;
    let prof = profiles.find(c => c.id === product.id);
    if (!prof) prof = profiles.find(c => c.match && new RegExp(c.match, 'i').test(product.name));
    if (!prof) return null;
    const usable = new Set([...(prof.mount || []).flatMap(m => adapters[m] || []), ...(prof.adapters || [])]);
    for (const m of prof.mount || []) usable.delete(m);
    return { ...prof, product, adapterMounts: [...usable], kit: data.kits?.[prof.type] || [] };
  }
  const isCamera = (p) => deptKey(p) === 'cameras';

  function lensInfo(p) {
    const subs = subNames(p);
    const mounts = new Set();
    for (const key of ['Mount', 'Lens Mount']) for (const m of parseMounts((p.attrs?.[key] || []).join(', '))) mounts.add(m);
    for (const s of subs) if (SUBCAT_MOUNT[s]) mounts.add(SUBCAT_MOUNT[s]);
    if (!mounts.size) for (const m of mountsInName(p.name)) mounts.add(m);
    let format = null;
    for (const s of subs) if (SUBCAT_FORMAT[s]) { format = format === 'FF' ? 'FF' : SUBCAT_FORMAT[s]; }
    const cov = (p.attrs?.['Sensor Coverage / Format Compatibility'] || []).join(' ');
    if (/full ?frame/i.test(cov)) format = 'FF'; else if (/super ?35|s35/i.test(cov) && !format) format = 'S35';
    if (!format && /\bff\b|full[- ]?frame|vista/i.test(p.name)) format = 'FF';
    if (!format && /\bs35\b|super ?35/i.test(p.name)) format = 'S35';
    return { mounts, format, isAdapter: subs.includes('Lens Adapters'), isSet: subs.includes('Lens Sets') };
  }

  const familiesIn = (table, name) => Object.entries(table).filter(([, rx]) => rx.test(name)).map(([k]) => k);

  // Returns { status, reason } for a product against a camera profile.
  function verdict(product, prof, opts = {}) {
    if (!prof || !product || product.manual) return { status: 'neutral' };
    const dept = deptKey(product);
    const subs = subNames(product);
    const camFmt = prof.format;
    if (dept === 'lenses') {
      const info = lensInfo(product);
      if (info.isAdapter) {
        const targets = mountsInName(product.name);
        if (!targets.size) return { status: 'unknown' };
        return prof.mount.some(m => targets.has(m)) ? { status: 'native', reason: 'adapter-for-camera' } : { status: 'no', reason: 'adapter-other-camera' };
      }
      if (!info.mounts.size) return { status: 'unknown' };
      const native = prof.mount.some(m => info.mounts.has(m));
      const viaAdapter = !native && prof.adapterMounts.some(m => info.mounts.has(m));
      if (!native && !viaAdapter) return { status: 'no', reason: 'mount' };
      // sensor coverage
      let partial = false;
      if (info.format) {
        const rank = { '16': 0, 'MFT': 1, '2/3': 1, 'S35': 2, 'FF': 3, 'MF': 4 };
        if (camFmt in rank && info.format in rank && rank[info.format] < rank[camFmt]) partial = true;
      }
      if (partial) return { status: 'partial', reason: 'coverage', via: viaAdapter ? 'adapter' : 'native' };
      return viaAdapter ? { status: 'adapter', reason: 'mount' } : { status: 'native' };
    }
    if (dept === 'media' ? subs.includes('Memory Cards') || subs.includes('Card Readers') : dept === 'video' && subs.includes('Recorders & Media')) {
      if (MEDIA_IGNORE.test(product.name)) return { status: 'neutral', kind: 'other' };
      const fams = mediaFamilies(product.name);
      const kind = READER_RX.test(product.name) ? 'reader' : fams.length ? 'card' : 'other';
      if (kind === 'other') return { status: 'neutral', kind };
      if (!fams.length) return { status: 'unknown', kind };
      // A reader is judged against the card families already chosen in the project (opts.chosenMedia), else the camera's.
      const want = kind === 'reader' && opts.chosenMedia?.length ? opts.chosenMedia : (prof.media || []);
      const idx = fams.map(f => want.indexOf(f)).filter(i => i >= 0);
      const family = idx.length ? want[Math.min(...idx)] : fams[0];
      return idx.length ? { status: 'native', reason: 'media', kind, family, pref: Math.min(...idx) } : { status: 'no', reason: 'media', kind, family };
    }
    if (dept === 'power' && (subs.includes('Batteries') || subs.includes('Chargers & PSU'))) {
      if (POWER_IGNORE.test(product.name)) return { status: 'neutral', kind: 'other' };
      const isBattery = subs.includes('Batteries') && !/charger|station/i.test(product.name);
      const kind = isBattery ? 'battery' : 'charger';
      const fams = familiesIn(BATTERY, product.name);
      if (!fams.length) return { status: 'unknown', kind };
      const idx = fams.map(f => (prof.battery || []).indexOf(f)).filter(i => i >= 0);
      const family = idx.length ? prof.battery[Math.min(...idx)] : fams[0];
      return idx.length ? { status: 'native', reason: 'battery', kind, family, pref: Math.min(...idx) } : { status: 'no', reason: 'battery', kind, family };
    }
    return { status: 'neutral' };
  }

  // Card families the project already contains (used to pick the right reader).
  function chosenMedia(prof, items, resolve) {
    const fams = [];
    for (const it of items) { const p = resolve(it.productId); if (!p) continue; const v = verdict(p, prof); if (v.kind === 'card' && v.family && !fams.includes(v.family)) fams.push(v.family); }
    return fams;
  }
  // Readers in the catalog that cover a family — empty means the catalog has none for it.
  const readersFor = (family) => catalog.products.filter(p => ['media', 'video'].includes(catalog.deptKey(p.dept)) && READER_RX.test(p.name) && mediaFamilies(p.name).includes(family));

  // Kit slot progress against the project's items: how many units of matching products are already in the list.
  // A slot with `kind` (card / reader / battery / charger) only counts items of that kind.
  // With `alloc` (what was added through this camera's own kit, per slot) a second camera starts empty instead
  // of counting the first camera's cards and batteries; the list still caps it.
  // Power through V-Lock: a camera on its own battery family can run from a V-Lock battery on a plate,
  // with a D-Tap cable into a dummy battery of that family. The battery slot then counts V-Lock batteries
  // (half as many — each lasts longer), the charger slot V-Lock chargers, and a plate and a dummy cable join.
  function canVlock(prof) {
    const fam = prof?.battery?.[0];
    return !!fam && !prof.battery.some(b => ['V-Mount', 'Gold', 'B-Mount'].includes(b)) && !!DUMMY[fam] && !['action', 'ptz'].includes(prof.type);
  }
  function powered(prof, route) {
    if (route !== 'vlock' || !canVlock(prof)) return prof;
    const fam = prof.battery[0], d = DUMMY[fam];
    return { ...prof, battery: ['V-Mount'], native: prof.battery, route: 'vlock',
      kit: (prof.kit || []).flatMap(s => (s.slot !== 'battery' ? [s] : [
        { ...s, qty: Math.max(2, Math.ceil(s.qty / 2)), he: 'סוללות V-Lock', en: 'V-Lock batteries' },
        { slot: 'vplate', he: 'פלטת V-Lock עם D-Tap', en: 'V-Lock plate with D-Tap', qty: 1, match: 'v-?(mount|lock) (battery )?plate', add: 'x_gen_plate_v' },
        // a camera with a DC input its maker names plugs straight in; the rest take a dummy battery
        prof.dc ? { slot: 'dummy', he: prof.dc.he, en: prof.dc.en, qty: 1, match: prof.dc.match, add: prof.dc.add, src: prof.dc.src }
          : { slot: 'dummy', he: `כבל D-Tap לסוללת דמה ${fam}`, en: `D-Tap to ${fam} dummy battery`, qty: 1, match: `dummy.*(${d.rx})`, add: d.add },
      ])) };
  }

  function kitStatus(prof, items, resolve, alloc = null) {
    const chosen = chosenMedia(prof, items, resolve);
    return (prof?.kit || []).map(slot => {
      // A slot names where its gear lives (Media & Offload, Monitors, Lens Control…) and where it used to be:
      // a catalog without the newer department still finds it in the old place. A subcat may be a list.
      const has = (slug) => catalog.departments.some(d => d.slug === slug);
      const where = !has(slot.dept) && slot.fallback ? slot.fallback : slot;
      const dept = catalog.departments.find(d => d.slug === where.dept);
      const deptId = dept?.id;
      const wanted = [where.subcat].flat().filter(Boolean);
      const subIds = wanted.map(en => (dept?.subcategories || []).find(s => s.en === en)?.id).filter(x => x != null);
      const subId = subIds[0] ?? null;
      // A slot that names its item (the V-Lock plate, a dummy battery) counts by name, wherever it is filed.
      const rx = slot.match ? new RegExp(slot.match, 'i') : null;
      const have = items.reduce((n, it) => {
        const p = resolve(it.productId) || { dept: it.snapshot?.dept, subcats: [] };
        if (rx) return rx.test(p.name || '') ? n + it.qty : n;
        if (p.dept !== deptId || (subIds.length && !subIds.some(x => (p.subcats || []).includes(x)))) return n;
        if (slot.kind && p.name && verdict(p, prof, { chosenMedia: chosen }).kind !== slot.kind) return n;
        return n + it.qty;
      }, 0);
      const mine = alloc ? Math.min(alloc[slot.slot] || 0, have) : have;
      const out = { ...slot, deptId, subId, have: mine, done: mine >= slot.qty };
      if (slot.kind === 'reader') { out.wanted = chosen.length ? chosen : (prof.media || []); out.missing = out.wanted.filter(f => !readersFor(f).length); }
      // the cage row: a camera with a cage made for it gets that cage in one tap (the shelf stays one "choose" away)
      if (slot.slot === 'rig' && prof?.product) {
        const cage = (data.cages || []).find(g => new RegExp(g.rx, 'i').test(prof.product.name));
        if (cage) out.add = cage.add;
      }
      return out;
    });
  }

  return { profileFor, isCamera, lensInfo, verdict, kitStatus, chosenMedia, readersFor, profiles, canVlock, powered };
}

export async function loadCompat(url = 'data/compat.json') {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`compat ${res.status}`);
  return res.json();
}
