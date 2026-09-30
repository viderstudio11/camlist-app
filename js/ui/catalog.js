import { esc, icons, openSheet, toast } from './dom.js';
import { addItem, setQty, getQty, totalQty } from '../list.js';
import { logoHTML, slugify, brandText } from '../brands.js';
import { normalize } from '../catalog.js';
import { thumbHTML, parseId, profileChips } from './list.js';
import { lensTypes, LENS_TYPES } from '../lens.js';
import { deptIcon } from './icons-dept.js';
import { companionsFor } from '../companions.js';
import { DEPT_EMOJI } from '../i18n.js';
import { BATTERY, mediaFamilies } from '../compat.js';
import { gearKitFor, gearKitStatus, tripodKind, bowlOf } from '../gearkits.js';
import { ensureAlloc, bump } from '../kitalloc.js';
import { accessoryKind, filterType, filterSize, ACC_KINDS, FILTER_TYPES, FILTER_SIZES } from '../accessory.js';

// Departments that drill Brand → models (the rest drill Subcategory → models grouped by brand).
const BRAND_FIRST = new Set(['cameras', 'lenses', 'tripods']);
// Preferred hero image per department (first matching product with an image wins).
const HERO = { cameras: /alexa 35$|fx6|venice/i, lenses: /supreme prime|cooke|s7/i, video: /bolt|teradek/i, monitors: /smallhd|ultra 7|cine 13/i, lenscontrol: /nucleus|cforce|hi-5/i, cables: /d-?tap|bnc|hdmi/i, tripods: /o'?connor|sachtler|fluid head/i, grip: /doorway dolly|dolly|slider/i, power: /v-?mount|battery/i, accessories: /matte ?box|mb-?\d|filter/i, media: /cfexpress|memory card/i };

let st = { pid: null, q: '', view: 'depts', dept: null, subcat: null, brand: null, sub: null };
let preset = null;      // set by the list screen's kit slots before navigating here
let compatOnly = true;  // "compatible only" toggle (per session)
let strict = false;     // entered from a kit slot: show ONLY items that fit the active camera (no neutral/unknown noise)
let lf = { type: null, mount: null, format: null };  // lens quick filters
let tf = { kind: null, bowl: null };                  // tripod quick filters: what it is, and its bowl
let ff = null;                                         // power / media shelves: battery or card family
let af = { kind: null, type: null, size: null };      // accessory quick filters: shelf, then filter type and size
let kind = null;        // kit slot kind (card / reader / battery / charger) — restricts the list to that kind
let kitSlot = null;     // { cam, slot } while choosing for one camera's kit slot: what is added counts for that camera
export function presetCatalog(o) { preset = o; }
const offered = new Set(); // products whose "goes with" window was already shown this session

export function render(ctx, { id }, root) {
  const { store, t, catalog } = ctx;
  if (st.pid !== id) { st = { pid: id, q: '', view: 'depts', dept: null, subcat: null, brand: null, sub: null }; lf = { type: null, mount: null, format: null }; af = { kind: null, type: null, size: null }; tf = { kind: null, bowl: null }; ff = null; }
  if (preset) { st = { pid: id, q: '', view: 'depts', dept: preset.dept ?? null, subcat: preset.subcat ?? null, brand: null, sub: null }; af = { kind: null, type: null, size: null }; strict = !!preset.strict; kind = preset.kind || null; kitSlot = preset.kitCam != null ? { cam: preset.kitCam, slot: preset.slot } : null; compatOnly = true; preset = null; }
  const lang = ctx.lang();
  const { compat, recency } = ctx;
  const project = store.getProject(id);
  const active = project.buildCameraId != null ? ctx.resolve(project.buildCameraId) : null;
  // the kit's power choice (native or V-Lock) decides which batteries and chargers fit
  const prof = active ? compat.powered(compat.profileFor(active), (project.powerRoute || {})[project.buildCameraId]) : null;
  const verdicts = new Map();
  const chosenMedia = prof ? compat.chosenMedia(prof, project.items, ctx.resolve) : [];
  const verdictOf = (p) => { if (!verdicts.has(p.id)) verdicts.set(p.id, prof ? compat.verdict(p, prof, { chosenMedia }) : { status: 'neutral' }); return verdicts.get(p.id); };
  const grade = (p) => verdictOf(p).status;
  let hidden = 0;
  const RANK = { native: 0, adapter: 1, partial: 2, neutral: 3, unknown: 4, no: 5 };
  // Strict (kit slot): only graded-compatible items. Normal build mode: hide "no" only. Always sort best fit first.
  // In strict mode "neutral" items (monitors, heads…) stay only when nothing in the list is graded — otherwise
  // e.g. a media slot would still show readers/recorders next to the matching cards.
  const visible = (list) => {
    if (!prof || !compatOnly) return list;
    if (strict && kind) list = list.filter(p => verdictOf(p).kind === kind);
    const graded = strict && list.some(p => RANK[grade(p)] <= 2);
    // Strict with nothing graded (monitors, heads…): keep everything that isn't a hard "no".
    const fits = (g) => (strict ? RANK[g] <= 2 || (!graded && g !== 'no') : g !== 'no');
    const out = list.filter(p => fits(grade(p)));
    return out.map(p => [RANK[grade(p)] * 100 + (verdictOf(p).pref ?? 50), p])
      .sort((x, y) => x[0] - y[0] || recency.compare(x[1], y[1]))
      .map(x => x[1]);
  };
  // shown(): the list that is actually rendered — the hidden counter is derived from it alone.
  const shown = (list) => { const out = visible(list); hidden = list.length - out.length; return out; };
  // False colour, the way a monitor shows exposure: green fits, yellow needs an adapter, orange crops, red is out.
  const FC = { native: ['ok', 'FIT'], adapter: ['adp', 'ADPT'], partial: ['warn', 'CROP'], unknown: ['dim', '?'], no: ['bad', 'NO'] };
  const tagHTML = (p) => { if (!prof) return ''; const g = grade(p); return FC[g] ? `<span class="fcode ${FC[g][0]}" title="${esc(t('tag_' + g))}">${FC[g][1]}</span>` : ''; };
  const fcClass = (p) => (prof && FC[grade(p)] ? ' fc-' + FC[grade(p)][0] : '');
  const items = () => store.getProject(id).items;
  const rerender = () => render(ctx, { id }, root);
  const deptName = (d) => (lang === 'he' ? d.he : d.en);
  const subName = (s) => (lang === 'he' ? s.he : s.en);
  const allSubcats = catalog.departments.flatMap(d => d.subcategories);
  const subOf = (p) => p.subcats.map(sid => allSubcats.find(s => s.id === sid)).filter(Boolean)[0];
  const arrow = `<span class="arrow">›</span>`;

  const back = () => {
    if (st.q) return () => { st.q = ''; rerender(); };
    if (st.brand && st.dept) return () => { st.brand = null; st.sub = null; rerender(); };
    if (st.brand) return () => { st.brand = null; rerender(); };
    if (st.subcat) return () => { st.subcat = null; rerender(); };
    if (af.kind) return () => { af = { kind: null, type: null, size: null }; rerender(); };
    if (st.dept) return () => { st.dept = null; rerender(); };
    return `#/p/${id}`;
  };
  ctx.setTopbar({ title: esc(t('add_gear')), back: back() });

  // ---- row / group renderers ----
  const productRow = (p, { showBrand = true } = {}) => {
    const q = getQty(items(), p.id);
    const sub = subOf(p);
    // Lenses: say PRIME / ZOOM and the coverage — far more useful on a row than "Full Frame" or a mount subcategory.
    const isLens = catalog.deptKey(p.dept) === 'lenses';
    const lensChips = () => {
      const types = lensTypes(p, subEnOf(p)).filter(x => x !== 'set');
      const main = ['zoom', 'prime'].find(x => types.includes(x));
      const extras = types.filter(x => ['anamorphic', 'macro', 'vintage', 'adapter'].includes(x));
      const fmt = infoOf(p).format;
      const out = [];
      if (main) out.push(`<span class="chip lt">${t('lt_' + main)}</span>`);
      for (const x of extras) out.push(`<span class="chip lt alt">${t('lt_' + x)}</span>`);
      if (fmt) out.push(`<span class="chip">${t('fmt_' + fmt)}</span>`);
      return out.join('');
    };
    return `<div class="row ${q ? 'in-list' : ''}${fcClass(p)}" data-pid="${esc(p.id)}">
      ${thumbHTML(p, catalog.deptKey(p.dept))}
      <div class="body"><div class="name" dir="auto">${esc(p.name)}</div>
        <div class="sub">${showBrand && p.brand ? brandText(p.brand, p.brandName) : ''}${isLens ? lensChips() : (sub ? `<span class="chip">${esc(subName(sub))}</span>` : '')}${p.manual ? `<span class="chip">${t('manual_item')}</span>` : ''}${tagHTML(p)}</div></div>
      ${q ? `<div class="stepper compact"><button data-d="-1" aria-label="-">−</button><span class="q">${q}</span><button class="plus" data-d="1" aria-label="+">+</button></div>` : `<button class="addbtn" data-d="1" aria-label="${t('add')}">+</button>`}
    </div>`;
  };
  // Products grouped under a brand header (logo + full name + count), brands ordered by count desc.
  const groupedByBrand = (prods) => {
    // Kit slots for cards/readers/batteries/chargers group by family (CFexpress A, SD, BP-U…) in the camera's preference order.
    if (strict && kind && prof) {
      const groups = new Map();
      for (const p of prods) { const k = verdictOf(p).family || '—'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); }
      for (const [k, list] of groups) groups.set(k, recency.sort(list));
      const prefOf = (k) => { const i = [...(prof.media || []), ...(prof.battery || [])].indexOf(k); return i < 0 ? 99 : i; };
      const order = [...groups.entries()].sort((a, b) => prefOf(a[0]) - prefOf(b[0]));
      return order.map(([k, list]) => `
        <section class="bgroup">
          <div class="bgroup-head"><span class="brandname">${esc(k)}</span><span class="count">${list.length}</span></div>
          ${list.map(p => productRow(p, { showBrand: true })).join('')}
        </section>`).join('');
    }
    const groups = new Map();
    for (const p of prods) { const k = p.brand || '__none'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); }
    for (const [k, list] of groups) groups.set(k, recency.sort(list)); // newest model of each brand first
    const order = [...groups.entries()].sort((a, b) => (a[0] === '__none') - (b[0] === '__none') || b[1].length - a[1].length);
    return order.map(([k, list]) => `
      <section class="bgroup">
        <div class="bgroup-head" id="bg-${esc(k)}">${k === '__none' ? `<span class="brandname">${t('no_brand')}</span>` : logoHTML(k, catalog.brandName(k), 'head')}<span class="count">${list.length}</span></div>
        ${list.map(p => productRow(p, { showBrand: false })).join('')}
      </section>`).join('') + brandRail(order.map(([k]) => k));
  };
  // Side rail of brand shortcuts for long grouped lists — tap to jump to that brand's header.
  const brandRail = (keys) => (keys.length < 4 ? '' : `<nav class="rail" aria-label="${t('jump_to_brand')}">${keys.map(k => `<button data-jump="bg-${esc(k)}" title="${esc(k === '__none' ? t('no_brand') : catalog.brandName(k))}">${k === '__none' ? `<span class="logo logo-mini logo-text" style="--bg:var(--surface-3);--fg:var(--muted)">…</span>` : logoHTML(k, catalog.brandName(k), 'mini')}</button>`).join('')}</nav>`);
  const brandGrid = (brands) => `<div class="brand-grid">${brands.map(b => `<div class="brand-tile" data-brand="${esc(b.id)}">${logoHTML(b.id, b.name, 'tile')}<span class="c">${t('models_count', { n: b.count })}</span></div>`).join('')}</div>`;
  const brandsIn = (prods) => {
    const m = new Map();
    for (const p of prods) if (p.brand) m.set(p.brand, (m.get(p.brand) || 0) + 1);
    return [...m].map(([id, count]) => ({ id, name: catalog.brandName(id), count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  };
  const manualCTA = `<button class="btn block ghost" data-manual style="margin-top:8px">${t('not_found_add_manual')}</button>`;
  // ---- lens quick filters (type → mount → coverage) ----
  const lensDept = catalog.departments.find(d => d.slug === 'lenses');
  const tripodDept = catalog.departments.find(d => d.slug === 'tripods');
  const inTripods = st.dept === tripodDept?.id && !st.q;
  const tfActive = !!(tf.kind || tf.bowl);
  const TKINDS = ['head', 'legs', 'system', 'accessory', 'gimbal', 'stabilizer', 'body', 'car', 'underwater', 'support'];
  const BOWL_OPTS = [75, 100, 150, 'mitchell'];
  // a head that comes in both sizes (Focus 22) counts for 100 and for 150
  const hasBowl = (p, b) => { const x = bowlOf(p.name); return x === b || (x === 'both' && (b === 100 || b === 150)); };
  const applyTripod = (list) => list.filter(p => (!tf.kind || tripodKind(catalog, p) === tf.kind) && (!tf.bowl || hasBowl(p, tf.bowl)));
  const tripodFilterBar = (pool) => {
    const tchip = (key, options, current) => `<div class="chips fchips"><span class="frow-label">${t('f_' + key)}</span><button class="${current ? '' : 'active'}" data-tf="${key}" data-val="">${t('all')}</button>${options.map(o => `<button class="${String(current) === String(o.val) ? 'active' : ''}" data-tf="${key}" data-val="${esc(o.val)}">${esc(o.label)} <i>${o.n}</i></button>`).join('')}</div>`;
    const byBowl = pool.filter(p => !tf.bowl || hasBowl(p, tf.bowl));
    const byKind = pool.filter(p => !tf.kind || tripodKind(catalog, p) === tf.kind);
    const kinds = TKINDS.map(k => ({ val: k, label: t('tk_' + k), n: byBowl.filter(p => tripodKind(catalog, p) === k).length })).filter(o => o.n);
    const bowls = BOWL_OPTS.map(b => ({ val: b, label: b === 'mitchell' ? t('bowl_mitchell') : `${b} ${t('mm')}`, n: byKind.filter(p => hasBowl(p, b)).length })).filter(o => o.n);
    return `<div class="filterbar">${tchip('tkind', kinds, tf.kind)}${bowls.length ? tchip('bowl', bowls, tf.bowl) : ''}${tfActive ? `<div class="fmeta"><span>${t('results_count', { n: applyTripod(pool).length })}</span><button data-tf-clear>${t('clear_filters')}</button></div>` : ''}</div>`;
  };
  const inLenses = st.dept === lensDept?.id && !st.q;
  const subEnOf = (p) => p.subcats.map(sid => allSubcats.find(s2 => s2.id === sid)?.en).filter(Boolean);
  const typesOf = (p) => lensTypes(p, subEnOf(p));
  const infoOf = (p) => compat.lensInfo(p);
  const lfActive = !!(lf.type || lf.mount || lf.format);
  const applyLens = (list) => list.filter(p =>
    (!lf.type || typesOf(p).includes(lf.type))
    && (!lf.mount || infoOf(p).mounts.has(lf.mount))
    && (!lf.format || infoOf(p).format === lf.format));
  const chipRow = (key, options, current) => `<div class="chips fchips"><span class="frow-label">${t('f_' + key)}</span><button class="${current ? '' : 'active'}" data-lf="${key}" data-val="">${t('all')}</button>${options.map(o => `<button class="${current === o.val ? 'active' : ''}" data-lf="${key}" data-val="${esc(o.val)}">${esc(o.label)} <i>${o.n}</i></button>`).join('')}</div>`;
  const lensFilterBar = () => {
    const base = catalog.byDept(lensDept.id);
    const pool = prof && compatOnly ? base.filter(p => grade(p) !== 'no') : base;
    const count = (fn) => pool.filter(fn).length;
    const types = LENS_TYPES.map(v => ({ val: v, label: t('lt_' + v), n: count(p => typesOf(p).includes(v)) })).filter(o => o.n);
    const mounts = [...new Set(pool.flatMap(p => [...infoOf(p).mounts]))].map(m => ({ val: m, label: m, n: count(p => infoOf(p).mounts.has(m)) })).sort((a, b) => b.n - a.n).filter(o => o.n > 1);
    const fmts = [...new Set(pool.map(p => infoOf(p).format).filter(Boolean))].map(f => ({ val: f, label: t('fmt_' + f), n: count(p => infoOf(p).format === f) })).sort((a, b) => b.n - a.n);
    const shownList = applyLens(pool);
    return `<div class="filterbar">
      ${chipRow('type', types, lf.type)}
      ${chipRow('mount', mounts, lf.mount)}
      ${chipRow('format', fmts, lf.format)}
      ${lfActive ? `<div class="fmeta"><span>${t('results_count', { n: shownList.length })}</span><button data-lf-clear>${t('clear_filters')}</button></div>` : ''}
    </div>`;
  };
  // ---- accessory shelves (shelf → filter type → size) ----
  const kindOf = (p) => accessoryKind(p, subEnOf(p));
  const afChips = (key, options, current) => `<div class="chips fchips"><span class="frow-label">${t('f_' + key)}</span><button class="${current ? '' : 'active'}" data-af="${key}" data-val="">${t('all')}</button>${options.map(o => `<button class="${current === o.val ? 'active' : ''}" data-af="${key}" data-val="${esc(o.val)}">${esc(o.label)} <i>${o.n}</i></button>`).join('')}</div>`;
  const accessoryShelves = (pool) => {
    const kinds = ACC_KINDS.map(k => ({ val: k, label: t('acc_' + k), n: pool.filter(p => kindOf(p) === k).length })).filter(o => o.n);
    if (!af.kind) {
      return `<div class="section-title">${t('choose_subcat')}</div><div class="sub-list">${kinds.map(o => `<div class="card" data-af="kind" data-val="${o.val}"><b>${esc(o.label)}</b><span class="n">${o.n}</span></div>`).join('')}</div>`;
    }
    let list = pool.filter(p => kindOf(p) === af.kind);
    let bar = afChips('kind', kinds, af.kind);
    if (af.kind === 'filters') {
      const typed = (p) => filterType(p.name), sized = (p) => filterSize(p, subEnOf(p));
      const bySize = list.filter(p => !af.size || sized(p) === af.size);
      const byType = list.filter(p => !af.type || typed(p) === af.type);
      const types = FILTER_TYPES.map(v => ({ val: v, label: t('ft_' + v), n: bySize.filter(p => typed(p) === v).length })).filter(o => o.n);
      const sizes = FILTER_SIZES.map(v => ({ val: v, label: t('fs_' + v), n: byType.filter(p => sized(p) === v).length })).filter(o => o.n);
      bar += afChips('type', types, af.type) + afChips('size', sizes, af.size);
      list = list.filter(p => (!af.type || typed(p) === af.type) && (!af.size || sized(p) === af.size));
    }
    return `<div class="filterbar">${bar}</div>${groupedByBrand(shown(list))}${manualCTA}`;
  };
  const SUGGEST_READER = { 'CFexpress A': 'Sony MRW-G2 CFexpress Type A / SD Card Reader', 'CFexpress B': 'ProGrade CFexpress Type B Card Reader', 'CFast': 'CFast 2.0 Card Reader', 'XQD': 'Sony MRW-E90 XQD Card Reader', 'SxS': 'Sony SBAC-US30 SxS Card Reader', 'AXS': 'Sony AXS-CR1 Card Reader', 'Codex': 'Codex Compact Drive Dock', 'SD': 'SD UHS-II Card Reader', 'microSD': 'microSD Card Reader', 'P2': 'Panasonic AU-XPD1 P2 Card Reader', 'RED MINI-MAG': 'RED Station Mini-Mag', 'SSD': 'USB-C SSD Dock' };
  let manualPrefill = '';
  const readerNote = () => {
    const wanted = chosenMedia.length ? chosenMedia : (prof.media || []);
    const missing = wanted.filter(f => !compat.readersFor(f).length);
    if (!missing.length) return '';
    return `<div class="card note-missing"><b>${t('no_reader_at_utopia', { fam: esc(missing.join(' / ')) })}</b><p>${t('no_reader_hint')}</p>${missing.map(f => `<button class="btn sm" data-manual-reader="${esc(SUGGEST_READER[f] || f + ' Card Reader')}">＋ ${esc(SUGGEST_READER[f] || f + ' Card Reader')}</button>`).join(' ')}</div>`;
  };
  const heroImage = (d) => { const list = catalog.byDept(d.id); return (list.find(p => p.image && HERO[d.slug]?.test(p.name)) || list.find(p => p.image))?.image || null; };

  // ---- content ----
  let content = '';
  let crumbs = '';
  if (st.q.trim().length >= 1) {
    const res = shown(catalog.search(st.q.trim(), { limit: 160 }));
    content = (res.length ? groupedByBrand(res) : `<div class="empty"><p>${t('no_results', { q: esc(st.q) })}</p></div>`) + manualCTA;
  } else if (st.view === 'brands' && !st.brand) {
    content = brandGrid(catalog.brands);
  } else if (st.view === 'brands' && st.brand) {
    const all = catalog.byBrand(st.brand);
    const depts = catalog.departments.filter(d => visible(all).some(p => p.dept === d.id));
    const prods = recency.sort(shown(all.filter(p => !st.dept || p.dept === st.dept)));
    crumbs = `<div class="crumbs"><button data-crumb="brands">${t('brands')}</button>${arrow}<span>${esc(catalog.brandName(st.brand))}</span></div>`;
    content = `${depts.length > 1 ? `<div class="chips"><button class="${st.dept ? '' : 'active'}" data-chip="">${t('all')}</button>${depts.map(d => `<button class="${st.dept === d.id ? 'active' : ''}" data-chip="${d.id}"><span class="ci">${deptIcon(d.slug)}</span> ${esc(deptName(d))}</button>`).join('')}</div>` : ''}
      <div class="brand-hero">${logoHTML(st.brand, catalog.brandName(st.brand), 'tile')}<div><small>${t('models_count', { n: prods.length })}</small></div></div>
      ${prods.map(p => productRow(p, { showBrand: false })).join('')}${manualCTA}`;
  } else if (!st.dept) {
    content = `<div class="dept-grid">${catalog.departments.map(d => `<div class="dept-card" data-dept="${d.id}"><div class="dept-card-body"><span class="dept-ico">${deptIcon(d.slug)}</span><h3>${esc(deptName(d))}</h3><div class="n">${catalog.byDept(d.id).length} ${t('products')}</div></div></div>`).join('')}</div>`;
  } else {
    const d = catalog.deptById(st.dept);
    const deptProds = visible(catalog.byDept(st.dept));
    if (BRAND_FIRST.has(d.slug)) {
      if (!st.brand) {
        crumbs = `<div class="crumbs"><button data-crumb="root">${t('departments')}</button>${arrow}<span>${esc(deptName(d))}</span></div>`;
        if (inLenses) {
          content = lensFilterBar() + (lfActive
            ? groupedByBrand(applyLens(deptProds))
            : `<div class="section-title">${t('choose_brand')}</div>${brandGrid(brandsIn(deptProds))}`);
        } else if (inTripods) {
          content = tripodFilterBar(deptProds) + (tfActive
            ? groupedByBrand(applyTripod(deptProds))
            : `<div class="section-title">${t('choose_brand')}</div>${brandGrid(brandsIn(deptProds))}`);
        } else {
          content = `<div class="section-title">${t('choose_brand')}</div>${brandGrid(brandsIn(deptProds))}`;
        }
      } else {
        const all = (inLenses ? applyLens(deptProds) : inTripods ? applyTripod(deptProds) : deptProds).filter(p => p.brand === st.brand);
        const subs = catalog.subcatsOf(st.dept).filter(s => all.some(p => p.subcats.includes(s.id)));
        const prods = recency.sort(shown(st.sub ? all.filter(p => p.subcats.includes(st.sub)) : all));
        crumbs = `<div class="crumbs"><button data-crumb="root">${t('departments')}</button>${arrow}<button data-crumb="dept">${esc(deptName(d))}</button>${arrow}<span>${esc(catalog.brandName(st.brand))}</span></div>`;
        content = `${inLenses ? lensFilterBar() : ''}${inTripods ? tripodFilterBar(deptProds.filter(p => p.brand === st.brand)) : ''}<div class="brand-hero">${logoHTML(st.brand, catalog.brandName(st.brand), 'tile')}<div><small>${esc(deptName(d))} · ${t('models_count', { n: prods.length })}</small></div></div>
          ${subs.length > 1 ? `<div class="chips"><button class="${st.sub ? '' : 'active'}" data-sub-chip="">${t('all')}</button>${subs.map(s => `<button class="${st.sub === s.id ? 'active' : ''}" data-sub-chip="${s.id}">${esc(subName(s))}</button>`).join('')}</div>` : ''}
          ${prods.map(p => productRow(p, { showBrand: false })).join('')}${manualCTA}`;
      }
    } else if (d.slug === 'accessories') {
      // A kit slot arrives with a source subcategory (Filters, Matte Boxes…): open that shelf instead.
      if (st.subcat) {
        const en = d.subcategories.find(x => x.id === st.subcat)?.en;
        af.kind = { Filters: 'filters', 'Matte Boxes': 'mattebox', 'Follow Focus': 'follow' }[en] || af.kind;
        st.subcat = null;
      }
      content = accessoryShelves(deptProds);
      crumbs = `<div class="crumbs"><button data-crumb="root">${t('departments')}</button>${arrow}${af.kind ? `<button data-crumb="dept">${esc(deptName(d))}</button>${arrow}<span>${t('acc_' + af.kind)}</span>` : `<span>${esc(deptName(d))}</span>`}</div>`;
    } else if (!st.subcat) {
      crumbs = `<div class="crumbs"><button data-crumb="root">${t('departments')}</button>${arrow}<span>${esc(deptName(d))}</span></div>`;
      const set = d.slug === 'expendables' ? catalog.preset('expendables').filter(x => !getQty(items(), x.id)) : [];
      content = `${set.length ? `<button class="btn block primary exp-set" data-exp-set>${icons.plus}${t('exp_add_set', { n: set.length })}</button>` : ''}<div class="section-title">${t('choose_subcat')}</div><div class="sub-list">${catalog.subcatsOf(st.dept).map(s => `<div class="card" data-sub="${s.id}"><b>${esc(subName(s))}</b><span class="n">${visible(catalog.bySubcat(s.id)).length}</span></div>`).join('')}</div>`;
    } else {
      const s = d.subcategories.find(x => x.id === st.subcat);
      crumbs = `<div class="crumbs"><button data-crumb="root">${t('departments')}</button>${arrow}<button data-crumb="dept">${esc(deptName(d))}</button>${arrow}<span>${esc(subName(s))}</span></div>`;
      // batteries and chargers by mount, cards and readers by card type — like the stores' own filters
      const famOf = d.slug === 'power' ? (p) => Object.entries(BATTERY).filter(([, rx]) => rx.test(p.name)).map(([k]) => k)
        : d.slug === 'media' ? (p) => mediaFamilies(p.name) : null;
      const shelfItems = catalog.bySubcat(st.subcat);
      const fams = famOf ? [...new Set(shelfItems.flatMap(famOf))].map(v => ({ val: v, n: shelfItems.filter(p => famOf(p).includes(v)).length })).filter(o => o.n).sort((a, b) => b.n - a.n) : [];
      if (ff && !fams.some(o => o.val === ff)) ff = null;
      const famBar = fams.length > 1 ? `<div class="filterbar"><div class="chips fchips"><span class="frow-label">${t('f_' + d.slug + '_fam')}</span><button class="${ff ? '' : 'active'}" data-ff="">${t('all')}</button>${fams.map(o => `<button class="${ff === o.val ? 'active' : ''}" data-ff="${esc(o.val)}">${esc(o.val)} <i>${o.n}</i></button>`).join('')}</div></div>` : '';
      content = famBar + groupedByBrand(shown(ff ? shelfItems.filter(p => famOf(p).includes(ff)) : shelfItems)) + manualCTA;
    }
  }

  root.innerHTML = `
    <div class="search"><div class="field"><span class="sico">${icons.search}</span><input type="search" value="${esc(st.q)}" placeholder="${t('search_placeholder')}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" data-q>${st.q ? `<button class="clear" data-clear aria-label="clear">×</button>` : ''}</div><button class="btn sm manual-btn" data-manual>${icons.plus}${t('my_item')}</button>
      ${prof ? `<div class="cbar"><div class="thumb">${active.image ? `<img src="${esc(active.image)}" alt="">` : `<span class="ci">${deptIcon('cameras')}</span>`}</div><div class="cbar-body"><small>${t('building_around')}</small><b dir="auto">${esc(active.name)}</b><div class="pchips">${profileChips(prof, t)}</div></div><label class="cbar-toggle"><input type="checkbox" data-compat-only ${compatOnly ? 'checked' : ''}><span>${t('compat_only')}</span></label></div>` : ''}
      ${st.q || st.dept || st.brand ? '' : `<div class="tabs"><button class="${st.view === 'depts' ? 'active' : ''}" data-tab="depts">${t('departments')}</button><button class="${st.view === 'brands' ? 'active' : ''}" data-tab="brands">${t('all_brands')}</button></div>`}
    </div>
    ${crumbs}
    ${strict && kind === 'reader' && prof ? readerNote() : ''}
    <div data-content>${content}${hidden && compatOnly ? `<p class="hidden-note">${strict ? t('strict_note', { n: hidden, cam: esc(active.name) }) : t('hidden_count', { n: hidden })} · <button data-show-all>${t('show_all_items')}</button></p>` : ''}</div>
    <div class="bottombar"><button class="btn primary" data-done>${icons.check}${t('back_to_list', { n: totalQty(items()) })}</button></div>`;

  root.classList.toggle('has-rail', !!root.querySelector('.rail'));
  root.style.setProperty('--search-h', root.querySelector('.search').offsetHeight + 'px');
  root.querySelector('[data-compat-only]')?.addEventListener('change', (e) => { compatOnly = e.target.checked; rerender(); });
  root.querySelector('[data-show-all]')?.addEventListener('click', () => { if (strict) { strict = false; kind = null; kitSlot = null; } else compatOnly = false; rerender(); });
  const input = root.querySelector('[data-q]');
  let timer;
  input.oninput = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      st.q = input.value; // spaces stay while typing — trimming here ate the space before the next word
      const pos = input.selectionStart;
      rerender();
      const i2 = root.querySelector('[data-q]'); i2.focus(); try { i2.setSelectionRange(pos, pos); } catch { /* ignore */ }
    }, 120);
  };
  input.onkeydown = (e) => { if (e.key === 'Enter') input.blur(); };
  root.querySelector('[data-clear]')?.addEventListener('click', () => { st.q = ''; rerender(); root.querySelector('[data-q]').focus(); });
  root.querySelectorAll('[data-lf]').forEach(b => { b.onclick = () => { lf[b.dataset.lf] = b.dataset.val || null; rerender(); }; });
  // A chip row scrolls sideways on a phone: keep the chosen chip in view.
  root.querySelectorAll('.filterbar .fchips').forEach(row => {
    const on = row.querySelector('button.active');
    if (on && on !== row.querySelector('button')) row.scrollLeft += on.getBoundingClientRect().left - row.getBoundingClientRect().left - 60;
  });
  root.querySelectorAll('[data-af]').forEach(b => { b.onclick = () => {
    const k = b.dataset.af, v = b.dataset.val || null;
    af = k === 'kind' ? { kind: v, type: null, size: null } : { ...af, [k]: v };
    rerender();
  }; });
  root.querySelector('[data-lf-clear]')?.addEventListener('click', () => { lf = { type: null, mount: null, format: null }; rerender(); });
  root.querySelectorAll('[data-tf]').forEach(b => { b.onclick = () => { const v = b.dataset.val; tf[b.dataset.tf === 'tkind' ? 'kind' : 'bowl'] = v ? (/^\d+$/.test(v) ? Number(v) : v) : null; rerender(); }; });
  root.querySelector('[data-tf-clear]')?.addEventListener('click', () => { tf = { kind: null, bowl: null }; rerender(); });
  root.querySelectorAll('[data-ff]').forEach(b => { b.onclick = () => { ff = b.dataset.ff || null; rerender(); }; });
  root.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => { st.view = b.dataset.tab; st.dept = null; st.subcat = null; st.brand = null; st.sub = null; rerender(); }; });
  root.querySelectorAll('[data-dept]').forEach(c => { c.onclick = () => { st.dept = Number(c.dataset.dept); st.brand = null; st.subcat = null; st.sub = null; lf = { type: null, mount: null, format: null }; af = { kind: null, type: null, size: null }; tf = { kind: null, bowl: null }; ff = null; rerender(); }; });
  root.querySelector('[data-exp-set]')?.addEventListener('click', () => {
    const set = catalog.preset('expendables').filter(x => !getQty(items(), x.id));
    let list = items();
    for (const { id: pid, qty } of set) list = addItem(list, catalog.byId(pid), qty);
    store.setItems(id, list);
    toast(t('exp_added', { n: set.length }), { kind: 'ok' });
    rerender();
  });
  root.querySelectorAll('[data-sub]').forEach(c => { c.onclick = () => { st.subcat = Number(c.dataset.sub); rerender(); }; });
  root.querySelectorAll('[data-brand]').forEach(c => { c.onclick = () => { st.brand = c.dataset.brand; st.sub = null; if (st.view === 'brands') st.dept = null; rerender(); }; });
  root.querySelectorAll('[data-chip]').forEach(c => { c.onclick = () => { st.dept = c.dataset.chip ? Number(c.dataset.chip) : null; rerender(); }; });
  root.querySelectorAll('[data-sub-chip]').forEach(c => { c.onclick = () => { st.sub = c.dataset.subChip ? Number(c.dataset.subChip) : null; rerender(); }; });
  root.querySelectorAll('[data-crumb]').forEach(c => { c.onclick = () => {
    const k = c.dataset.crumb;
    if (k === 'root') { st.dept = null; st.subcat = null; st.brand = null; st.sub = null; af = { kind: null, type: null, size: null }; }
    if (k === 'dept') af = { kind: null, type: null, size: null };
    if (k === 'dept') { st.subcat = null; st.brand = null; st.sub = null; }
    if (k === 'brands') { st.brand = null; st.dept = null; }
    rerender();
  }; });
  root.querySelector('[data-done]').onclick = () => ctx.navigate(`#/p/${id}`);
  root.querySelectorAll('[data-jump]').forEach(b => { b.onclick = () => { const h = document.getElementById(b.dataset.jump); if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });

  const bindRow = (row) => {
    const productId = parseId(row.dataset.pid);
    const showBrand = !!row.querySelector('.brandname');
    row.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => {
      const p = catalog.byId(productId);
      const cur = getQty(items(), productId); const next = cur + Number(b.dataset.d);
      // the camera's allocation is taken before the list changes, so a first seed never counts this unit twice
      const alloc0 = kitSlot ? ensureAlloc(store.getProject(id), ctx.compat, ctx.resolve) : null;
      store.setItems(id, cur ? setQty(items(), productId, next) : addItem(items(), p, 1));
      if (kitSlot) store.updateProject(id, { kitAlloc: bump(alloc0, kitSlot.cam, kitSlot.slot, Math.max(next, 0) - cur) });
      const fresh = document.createElement('template'); fresh.innerHTML = productRow(catalog.byId(productId), { showBrand });
      const nr = fresh.content.firstElementChild; row.replaceWith(nr); bindRow(nr);
      root.querySelector('[data-done]').innerHTML = `${icons.check}${t('back_to_list', { n: totalQty(items()) })}`;
      if (!cur) { toast(t('added'), { kind: 'ok', ms: 900 }); openGoesWith(p); }
    }; });
  };
  root.querySelectorAll('.row').forEach(bindRow);

  // "Goes with": right after something is added, what usually rides along with it. Shown once per product.
  // Gear with a kit (monitor, follow focus, gimbal…) offers that kit's missing pieces, sized to the model:
  // the D-Tap cable ends in its plug, the hand unit gets its own battery, a choice (UT / Noga arm) shows both.
  const kitCamera = () => { const pr = store.getProject(id); return (pr.buildCameraId != null ? ctx.resolve(pr.buildCameraId) : pr.items.map(i => ctx.resolve(i.productId)).find(x => x && compat.isCamera(x))) || null; };
  function kitOffers(p) {
    const kit = gearKitFor(catalog, p);
    if (!kit) return null;
    const qty = items().find(i => i.productId === p.id)?.qty || 1;
    return gearKitStatus(kit, qty, items(), ctx.resolve, p, { camera: kitCamera(), route: (store.getProject(id).powerRoute || {})[p.id] }).filter(s => !s.done && (s.add != null || s.find))
      .flatMap(s => (s.add != null
        ? [s.add].flat().map(pid => ({ c: catalog.byId(pid), n: s.need - s.have, slot: s.key, label: lang === 'he' ? s.he : s.en }))
        : [{ find: s.find, label: lang === 'he' ? s.he : s.en }]))
      .filter(x => x.c || x.find);
  }
  // A slot label that only repeats the item's name ("Lens gear rings" under "Lens Gear Rings Set") says
  // nothing; the brand says more.
  const sameWords = (label, name) => { const n = normalize(name); return normalize(label).split(' ').every(w => n.includes(w.replace(/s$/, ''))); };
  // The page row of a product, redrawn after a change made from the window.
  const refreshRow = (pid) => {
    const inPage = root.querySelector(`.row[data-pid="${CSS.escape(String(pid))}"]`);
    if (inPage) { const tp = document.createElement('template'); tp.innerHTML = productRow(catalog.byId(pid), { showBrand: !!inPage.querySelector('.brandname') }); const nr = tp.content.firstElementChild; inPage.replaceWith(nr); bindRow(nr); }
  };
  const offersFor = (p) => kitOffers(p) || companionsFor(p, catalog, { items: items(), resolve: ctx.resolve }).map(c => ({ c, n: 1 }));
  function openGoesWith(p) {
    if (offered.has(p.id) || !offersFor(p).length) return;
    offered.add(p.id);
    const taken = new Set();     // slots / items picked in this window
    const rowHTML = ({ c, n, slot, label, find }) => (find
      ? `<div class="row gw-row" data-gw-find="${esc(JSON.stringify(find))}"><div class="thumb"><span>${DEPT_EMOJI[find.dept] || '📦'}</span></div>
        <div class="body"><div class="name" dir="auto">${esc(label)}</div></div><button class="btn sm" data-gw-go>${t('choose')} ›</button></div>`
      : `<div class="row gw-row ${slot && taken.has(slot) && !taken.has(String(c.id)) ? 'gw-skip' : ''}" data-gw="${esc(c.id)}" data-n="${n}" ${slot ? `data-gw-slot="${esc(slot)}"` : ''}>${thumbHTML(c, catalog.deptKey(c.dept))}
        <div class="body"><div class="name" dir="auto">${esc(c.name)}${n > 1 ? ` <b>× ${n}</b>` : ''}</div><div class="sub">${label && !sameWords(label, c.name) ? esc(label) : brandText(c.brand, c.brandName)}</div></div>
        ${taken.has(String(c.id)) ? '<span class="gw-done">✓</span>' : slot && taken.has(slot) ? '' : `<button class="addbtn" data-gw-add aria-label="${t('add')}">+</button>`}</div>`);
    const selfHTML = () => `<div class="gw-self"><div class="name" dir="auto">${esc(p.name)}</div>
      <div class="stepper"><button data-gw-q="-1" aria-label="-">−</button><span class="q">${getQty(items(), p.id)}</span><button class="plus" data-gw-q="1" aria-label="+">+</button></div></div>`;
    const { body, close } = openSheet({
      title: t('goes_with', { name: p.name }),
      bodyHTML: `${selfHTML()}<div class="gw-list"></div>`,
      actions: [{ label: t('done'), kind: 'primary' }],
    });
    const list = body.querySelector('.gw-list');
    const draw = () => {
      // what was picked stays listed with its ✓; the rest follows the current quantity
      const now = offersFor(p);
      for (const tid of taken) { if (/^\d+$|^x_/.test(tid) && !now.some(x => x.c && String(x.c.id) === tid)) { const c = catalog.byId(parseId(tid)); if (c) now.push({ c, n: 0 }); } }
      list.innerHTML = now.map(rowHTML).join('');
      list.querySelectorAll('[data-gw-find]').forEach(row => {
        row.querySelector('[data-gw-go]').onclick = () => {
          const find = JSON.parse(row.dataset.gwFind);
          const d = catalog.departments.find(x => x.slug === find.dept);
          close();
          if (d) { st.q = ''; st.dept = d.id; st.subcat = d.subcategories.find(x => x.en === find.subcat)?.id ?? null; st.brand = null; rerender(); }
        };
      });
      list.querySelectorAll('[data-gw-add]').forEach(bt => {
        const row = bt.closest('[data-gw]');
        bt.onclick = () => {
          const c = catalog.byId(parseId(row.dataset.gw)), n = Number(row.dataset.n) || 1;
          const cur = getQty(items(), c.id);
          store.setItems(id, cur ? setQty(items(), c.id, cur + n) : addItem(items(), c, n, p.id));   // picked for p: listed under it
          taken.add(String(c.id)); if (row.dataset.gwSlot) taken.add(row.dataset.gwSlot);
          row.querySelector('[data-gw-add]').outerHTML = '<span class="gw-done">✓</span>';
          // one pick fills a choice slot: the other option steps back
          if (row.dataset.gwSlot) list.querySelectorAll(`[data-gw-slot="${CSS.escape(row.dataset.gwSlot)}"] [data-gw-add]`).forEach(o => { o.closest('.gw-row').classList.add('gw-skip'); o.remove(); });
          refreshRow(c.id);
        };
      });
    };
    body.querySelectorAll('[data-gw-q]').forEach(bt => {
      bt.onclick = () => {
        const next = Math.max(1, getQty(items(), p.id) + Number(bt.dataset.gwQ));
        store.setItems(id, setQty(items(), p.id, next));
        body.querySelector('.gw-self .q').textContent = next;
        refreshRow(p.id);
        draw();
      };
    });
    draw();
  }

  const openManual = () => openSheet({
    title: t('my_item'),
    bodyHTML: `<div class="form">
      <label>${t('item_name')}<input name="name" value="${esc(manualPrefill || st.q)}" autocomplete="off" required></label>
      <label>${t('brand')}<input name="brand" list="brand-list" autocomplete="off" value="${st.brand ? esc(catalog.brandName(st.brand)) : ''}"><datalist id="brand-list">${catalog.brands.map(b => `<option value="${esc(b.name)}">`).join('')}</datalist></label>
      <label>${t('qty')}<input name="qty" type="number" min="1" step="1" value="1" inputmode="numeric"></label>
      <label>${t('department')}<select name="dept">${catalog.departments.map(d => `<option value="${d.id}" ${st.dept === d.id ? 'selected' : ''}>${esc(deptName(d))}</option>`).join('')}<option value="other">${t('other')}</option></select></label>
    </div>`,
    actions: [{ label: t('cancel'), kind: 'ghost' }, { label: t('add'), kind: 'primary', onClick: (body) => {
      const name = body.querySelector('[name=name]').value.trim(); if (!name) { body.querySelector('[name=name]').focus(); return false; }
      const brandName = body.querySelector('[name=brand]').value.trim() || null;
      const deptV = body.querySelector('[name=dept]').value; const dept = deptV === 'other' ? 'other' : Number(deptV);
      const m = store.addManualProduct({ name, brand: brandName ? slugify(brandName) : null, brandName, dept });
      const qty = Math.max(1, Math.round(Number(body.querySelector('[name=qty]').value) || 1));
      store.setItems(id, addItem(items(), catalog.byId(m.id) || { ...m, manual: true }, qty));
      st.q = ''; toast(t('added'), { kind: 'ok' }); rerender();
    } }],
    onOpen: (body) => body.querySelector('[name=name]').focus(),
  });
  root.querySelectorAll('[data-manual]').forEach(b => { b.onclick = () => { manualPrefill = ''; openManual(); }; });
  root.querySelectorAll('[data-manual-reader]').forEach(b => { b.onclick = () => { manualPrefill = b.dataset.manualReader; openManual(); }; });
}
