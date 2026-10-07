// Lens choice: the camera, the lens dial, the live viewfinder and the distance — what a lens takes in from here.
import { esc, toast } from '../dom.js';
import { toolIcon, deptIcon } from '../icons.js';
import { PRIME_SET, SHOTS, lensFor, frameAt, pickLens, toUnit, fromUnit } from '../../tools/fov.js';
import { num } from '../../format.js';
import { activeProject } from '../../home.js';
import { feel } from '../../feel.js';
import { openViewfinder, rulerStops, phoneCal } from '../viewfinder.js';
import { S, keepFov, pushRecent, DIST_M, DIST_FT } from './shared.js';
import { isoLine } from './iso.js';

// A 1.75 m figure drawn once in a 60 × 175 box — one unit to the centimetre — then placed with a
// transform, so the proportions hold at any size. Seven and a half heads tall.
const FIG_W = 60, FIG_H = 175;
const FIG = [
  '<ellipse cx="30" cy="14" rx="8.6" ry="11"/>',
  '<path d="M26.6 24.6 L26.6 29 L33.4 29 L33.4 24.6"/>',
  '<path d="M13 33 Q13 29.4 16.6 29 L43.4 29 Q47 29.4 47 33 L44.6 67 L46.4 90 L13.6 90 L15.4 67 Z"/>',
  '<path d="M13.4 33.4 L8.6 35.6 L5.6 88 L10.8 89 L15.2 66"/>',
  '<path d="M46.6 33.4 L51.4 35.6 L54.4 88 L49.2 89 L44.8 66"/>',
  '<path d="M15.6 90 L28.4 90 L27.6 128 L26.4 168 L17.6 168 L18.2 128 Z"/>',
  '<path d="M44.4 90 L31.6 90 L32.4 128 L33.6 168 L42.4 168 L41.8 128 Z"/>',
  '<path d="M16.4 168 L11.6 172 L11.6 174.4 L27 174.4 L27 168"/>',
  '<path d="M43.6 168 L48.4 172 L48.4 174.4 L33 174.4 L33 168"/>',
].join('');


// Camera names as crews say them: "Sony FX6", not "PXW-FX6"; "Blackmagic Pocket 4K", not "Pocket Cinema Camera 4K".
const MAKER_SHORT = { sony: 'Sony', arri: 'ARRI', canon: 'Canon', red: 'RED', 'blackmagic-design': 'Blackmagic', panasonic: 'Panasonic', dji: 'DJI', fujifilm: 'Fujifilm', nikon: 'Nikon' };
export const camModel = (product) => {
  let n = String(product?.name || '');
  const brand = String(product?.brandName || '');
  if (brand && n.toLowerCase().startsWith(brand.toLowerCase() + ' ')) n = n.slice(brand.length + 1);
  n = n.replace(/\((\d+(?:\.\d)?K)\)/gi, ' $1')                                     // "(8K)" → "8K"
    .replace(/\s*\(?\b(RF|EF|PL|L|E)(\/(RF|EF|PL))*[- ]Mount\)?/gi, (m, a, b) => (/^\s+(EF|PL) MOUNT$/i.test(m) ? ` ${a}` : ''))
    .replace(/\s*(Digital Motion Picture|Digital Cinema|Mirrorless Digital|Mirrorless|Cinema Box|Box Cinema|4-Axis Cinema|Cinema)?\s*Camera\b/gi, '')
    .replace(/^(Lumix|EOS|ALPHA)\s+/i, '').replace(/^(PXW|ILME|PMW|AU|DC)-/i, '')
    .replace(/\bMark\s+/gi, '').replace(/\bMonochrome\b/gi, 'Mono')
    .replace(/\s+/g, ' ').trim();
  return n || String(product?.name || '');
};
export const camFull = (product) => {
  const b = MAKER_SHORT[product?.brand] || product?.brandName || '';
  const m = camModel(product);
  return b && !m.toLowerCase().startsWith(b.toLowerCase()) ? `${b} ${m}` : m;
};

// What the full-screen viewfinder needs, from the tool's last render.
let fovView = null;
function fovTool(T, lang, ctx) {
  fovView = null;
  const s = S.fov;
  const Tp = (k, p) => T(k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
  const name = (o) => (lang === 'he' ? o.he : o.en);
  const unit = s.unit === 'ft' ? 'ft' : 'm';
  const uLabel = T(unit === 'ft' ? 'feet' : 'meters');
  // A distance in the chosen unit, rounded the way a tape measure is read.
  const dist = (m) => { const v = toUnit(m, unit); return num(v, v < 10 ? 1 : 0); };

  // Only cameras whose recording sensor area has been verified are offered — the answer is only
  // as right as that number, so a camera without it is left out rather than guessed.
  const cams = (ctx?.compat?.profiles || [])
    .filter(p => p.sensor)
    .map(p => { const product = ctx.catalog.byId(p.id); return { prof: product ? ctx.compat.profileFor(product) : null, product }; })
    .filter(x => x.product && x.prof)
    .sort((a, b) => (b.prof.year || 0) - (a.prof.year || 0) || a.product.name.localeCompare(b.product.name));
  // Catalog names carry the maker's marketing tail ('8K Digital Motion Picture Camera'); the model is enough here.
  const short = (c) => c.product.name.replace(/\s+(\d+K\s+)?(Digital Motion Picture|Digital Cinema|Mirrorless|Cinema|Full[- ]Frame)?\s*Camera\b.*$/i, '').trim() || c.product.name;
  const sensOf = (label, fmt) => {
    const L = String(label || '');
    if (/open gate|\b(3:2|4:3|6:5|1:1|8:9)\b/i.test(L)) return 'OG';
    if (/super ?16|\bS16\b/i.test(L)) return 'S16';
    if (/\bS35c?\b|super ?35/i.test(L)) return 'S35';
    if (/\bFF|\bLF\b|full ?frame/i.test(L)) return 'FF';
    return fmt;
  };
  // Picking a camera is a maker tab and a model name — resolution and sensor are chosen after, in the format button.
  const MAKER_ORDER = ['arri', 'sony', 'canon', 'red', 'blackmagic-design', 'panasonic', 'fujifilm', 'nikon', 'dji'];
  const rank = (b) => { const i = MAKER_ORDER.indexOf(b); return i < 0 ? MAKER_ORDER.length : i; };
  const brands = [...new Map(cams.map(c => [c.product.brand, c.product.brandName || c.product.brand])).entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || cams.filter(c => c.product.brand === b[0]).length - cams.filter(c => c.product.brand === a[0]).length);
  if (!s.cam && !s.picking) {
    const p = activeProject(ctx.store.state.projects || []);
    const pc = p && cams.find(c => String(c.product.id) === String(p.buildCameraId));
    if (pc) Object.assign(s, { cam: String(pc.prof.id), camBrand: pc.product.brand, fromProject: true });
  }
  const cam = cams.find(c => String(c.prof.id) === String(s.cam)) || null;
  const shot = SHOTS.find(x => x.id === s.shot) || SHOTS[3];
  const chip = (attr, val, label, on, extra = '') => `<button class="chip pick ${on ? 'on' : ''}" ${attr}="${esc(val)}">${label}${extra}</button>`;

  // The camera: one line once chosen; the brand and model lists open only to change it.
  const modesOf = (c) => c?.prof.sensor.modes || [];
  const modeOf = (c) => { const ms = modesOf(c); return ms.find(m => m.id === s.modes?.[c.prof.id]) || ms[0] || null; };
  const areaOf = (c) => { const m = modeOf(c); return m ? { w: m.w, h: m.h, mode: m.label } : c.prof.sensor; };
  const curArea = cam ? areaOf(cam) : null;
  // the sensor part the chosen format reads (an S35 mode on a full-frame camera says S35)
  const SENS_NAME = { FF: T('fmt_FF'), S35: 'Super 35', OG: 'Open Gate', S16: 'Super 16', MFT: 'MFT' };
  const sensorNote = cam ? [SENS_NAME[sensOf(curArea.mode, cam.prof.format)] || T('fmt_' + cam.prof.format), curArea.mode].filter(Boolean).join(' · ') : '';
  // Each recording format reads a different window of the sensor, so the choice changes the frame.
  const modeRow = cam && modesOf(cam).length > 1
    ? `<div class="fov-modes"><div class="tsub">${esc(T('rec_format'))} · ${esc(Tp('n_formats', { n: modesOf(cam).length }))}</div>
      <button class="fov-modebtn ${s.modesOpen ? 'open' : ''}" data-modes-toggle aria-expanded="${!!s.modesOpen}"><b>${esc(modeOf(cam).label)}</b><span aria-hidden="true">▾</span></button>
      ${s.modesOpen ? `<div class="model-list fov-modelist">${modesOf(cam).map(m => `<button class="model-row ${modeOf(cam).id === m.id ? 'on' : ''}" data-cmode="${esc(m.id)}"><b>${esc(m.label)}</b></button>`).join('')}</div>` : ''}
      ${modeOf(cam).pending ? `<p class="tnote">${esc(T('mode_approx'))}</p>` : ''}</div>`
    : '';
  // the project's camera and the recent ones, as quick picks
  const projProf = (() => { const p = activeProject(ctx.store.state.projects || []); const pc = p && cams.find(c => String(c.product.id) === String(p.buildCameraId)); return pc ? String(pc.prof.id) : null; })();
  const quickIds = [...new Set([projProf, ...(s.recent || []).map(String)].filter(Boolean))].slice(0, 5);
  const quick = quickIds.map(id => cams.find(c => String(c.prof.id) === id)).filter(Boolean);
  // the maker tab open: the one picked, else the current camera's maker, else the first
  if (!brands.some(([b]) => b === s.camBrand)) s.camBrand = cam?.product.brand || brands[0]?.[0] || '';
  const models = cams.filter(c => c.product.brand === s.camBrand);
  // a row is the model's name and year — nothing else to read
  const term = (s.q || '').trim().toLowerCase();
  const rowHTML = (c) => `<button class="model-row ${cam === c ? 'on' : ''}" data-cmodel="${esc(c.prof.id)}" data-cmodelmode=""><b>${esc(term ? camFull(c.product) : camModel(c.product))}</b><small>${esc(c.prof.year || '')}</small></button>`;
  const hits = term ? cams.filter(c => (camFull(c.product) + ' ' + c.product.name + ' ' + (c.product.brandName || '')).toLowerCase().includes(term)) : [];
  const resultsHTML = term
    ? `<div class="fov-models-box"><div class="tsub">${esc(Tp('cam_hits', { n: hits.length }))}</div>${hits.length ? `<div class="model-list">${hits.slice(0, 30).map(rowHTML).join('')}</div>` : `<p class="tnote">${esc(T('cam_none'))}</p>`}</div>`
    : `<div class="fov-makers" role="tablist" aria-label="${esc(T('maker'))}">${brands.map(([slug, n]) => `<button class="fov-maker ${slug === s.camBrand ? 'on' : ''}" role="tab" aria-selected="${slug === s.camBrand}" data-cbrand="${esc(slug)}">${esc(n)}</button>`).join('')}</div>
        <div class="model-list fov-modellist">${models.map(rowHTML).join('')}</div>`;
  const pickCard = cam && !s.picking
    ? `<div class="card sh-sec fov-cam" data-part="cam">
        <div class="fov-cam-row"><span class="fov-cam-ico" aria-hidden="true">${deptIcon('cameras')}</span><div class="fov-cam-txt"><div class="tsub">${esc(T('camera_step'))}${s.fromProject ? ` · ${esc(T('from_project'))}` : ''}</div><b>${esc(camFull(cam.product))}</b><p class="tnote">${esc(sensorNote)}</p>${isoLine(cam.prof.id) ? `<p class="tnote fov-iso">${esc(T('iso_base_lbl'))} <b dir="ltr">${esc(isoLine(cam.prof.id))}</b></p>` : ''}<a class="fw-link" href="#/tools/downloads?q=${encodeURIComponent(short(cam))}">${esc(T('dl_for_cam'))} ›</a></div>
        <button class="btn sm" data-cchange>${esc(T('change'))}</button></div>
        ${modeRow}
      </div>`
    : `<div class="card sh-sec" data-part="cam">
        ${quick.length ? `<div class="tsub">${esc(T('cam_yours'))}</div><div class="chips fov-quick">${quick.map(c => chip('data-crecent', c.prof.id, `${esc(camFull(c.product))}${String(c.prof.id) === projProf ? ` <i class="n">${esc(T('cam_from_project'))}</i>` : ''}`, cam && c === cam)).join('')}</div>` : ''}
        <input class="fov-q" type="search" data-camq value="${esc(s.q || '')}" placeholder="${esc(T('cam_search_ph'))}" autocomplete="off" enterkeyhint="search" aria-label="${esc(T('cam_search_ph'))}">
        <div data-part="camresults">${resultsHTML}</div>
        <p class="tnote">${esc(T('verified_only'))}</p>
        ${cam ? `<button class="btn sm fov-pick-cancel" data-cpick-cancel>${esc(T('cancel_pick'))}</button>` : ''}
      </div>`;

  if (!cam) {
    return `<div class="card sh-answer warn" data-part="answer"><p class="sh-line">${esc(T('choose_camera_first'))}</p></div>${pickCard}`;
  }

  const sn = curArea;
  const need = lensFor(sn, s.distance, shot.height);

  // The lenses in the catalog that mount on this camera, read as focal ranges off their names.
  const focalOf = (nm = '') => {
    const zoom = nm.match(/(\d{1,4})\s*[-–]\s*(\d{1,4})\s*mm/i);
    if (zoom) return { min: Number(zoom[1]), max: Number(zoom[2]) };
    const prime = nm.match(/(\d{1,4}(?:\.\d)?)\s*mm/i);
    return prime ? { min: Number(prime[1]), max: Number(prime[1]) } : null;
  };
  const byLabel = new Map();
  for (const p of ctx.catalog.products) {
    if (ctx.catalog.deptKey(p.dept) !== 'lenses') continue;
    const f = focalOf(p.name);
    if (!f) continue;
    const v = ctx.compat.verdict(p, cam.prof);
    if (v.status !== 'native' && v.status !== 'adapter') continue;
    const label = f.min === f.max ? `${f.min}` : `${f.min}-${f.max}`;
    if (!byLabel.has(label)) byLabel.set(label, { ...f, label, adapter: v.status === 'adapter' });
  }
  const catalogLenses = [...byLabel.values()].sort((a, b) => a.min - b.min || a.max - b.max);
  const lenses = catalogLenses.length ? catalogLenses : PRIME_SET.map(x => ({ min: x, max: x, label: `${x}` }));
  const rec = pickLens(need, lenses);
  const focal = s.focal > 0 ? s.focal : rec.focal;

  const stops = rulerStops([], PRIME_SET);
  const nearestStop = (mm) => stops.reduce((b, x) => (Math.abs(x.mm - mm) < Math.abs(b.mm - mm) ? x : b), stops[0]).mm;
  const shown = nearestStop(focal);
  // the lens the ring is on now (moved by the ring itself, the shot chips, or a typed distance)
  const liveMM = () => nearestStop(s.focal > 0 ? s.focal : shown);

  // Where the frame sits on a 1.75 m person, in metres above the ground: a frame taller than the
  // person stands on the ground; a tighter one sits on the upper body with a little headroom,
  // where an operator would put it.
  const PERSON_M = 1.75;
  const figureAt = (x, groundY, h) => {
    const k = h / FIG_H;
    return `<g class="fig" transform="translate(${(x - (FIG_W * k) / 2).toFixed(2)} ${(groundY - h).toFixed(2)}) scale(${k.toFixed(4)})">${FIG}</g>`;
  };
  // The shot a frame height makes on a standing person, by the nearest of the named shot sizes.
  const shotOf = (hM) => SHOTS.reduce((b, x) => (Math.abs(Math.log(x.height / hM)) < Math.abs(Math.log(b.height / hM)) ? x : b), SHOTS[0]);
  const LOOKS = { arri: 'ARRI', sony: 'Sony', red: 'RED', canon: 'Canon' };
  const fmtTxt = String(sn.mode || '').replace(/\s+/g, ' ').slice(0, 22);
  const fpsTxt = (Number(s.fps) || 25).toFixed(2);

  // The monitor: exactly what the camera sees from here, dressed the way the chosen camera world's monitor
  // dresses a picture (inspired by each maker's field monitor, not a copy of it). Only facts the app knows.
  const monitorHTML = (mm) => {
    const look = LOOKS[s.look] ? s.look : 'arri';
    const fr = frameAt(sn, mm, s.distance);
    const bottomM = fr.heightM >= PERSON_M ? 0 : PERSON_M + fr.heightM * 0.12 - fr.heightM;
    const two = fr.widthM >= PERSON_M * 2.4;
    const MW = 320, MH = Math.round((MW * sn.h) / sn.w), mpx = MW / fr.widthM, mGround = MH + bottomM * mpx;
    const people = two ? [MW / 2 - fr.widthM * 0.22 * mpx, MW / 2 + fr.widthM * 0.22 * mpx] : [MW / 2];
    const size = `${num(toUnit(fr.widthM, unit), 2)}×${num(toUnit(fr.heightM, unit), 2)}${unit}`;
    const tx = (x, y, str, o = {}) => `<text x="${x}" y="${y}" class="ml-t ${o.cls || ''}" text-anchor="${o.a || 'start'}">${esc(str)}</text>`;
    const ov = {
      arri: `<rect width="${MW}" height="17" class="ml-bar"/><rect y="${MH - 17}" width="${MW}" height="17" class="ml-bar"/>
        ${tx(8, 12, 'STBY')}${tx(54, 12, fpsTxt)}${tx(104, 12, fmtTxt)}${tx(8, MH - 5, `${mm}mm`)}${tx(MW - 8, MH - 5, size, { a: 'end' })}
        <rect x="18" y="26" width="${MW - 36}" height="${MH - 52}" class="ml-line"/>`,
      sony: `${[[16, 16, 1, 1], [MW - 16, 16, -1, 1], [16, MH - 16, 1, -1], [MW - 16, MH - 16, -1, -1]].map(([x, y, dx, dy]) => `<path d="M${x} ${y + dy * 14} L${x} ${y} L${x + dx * 14} ${y}" class="ml-corner"/>`).join('')}
        <rect x="22" y="6" width="34" height="13" rx="2" class="ml-stby"/>${tx(39, 16, 'STBY', { a: 'middle', cls: 'ml-b' })}
        ${tx(64, 16, fmtTxt, { cls: 'ml-sh' })}${tx(MW - 22, 16, `${fpsTxt}p`, { a: 'end', cls: 'ml-sh' })}
        ${tx(22, MH - 6, `${mm}mm`, { cls: 'ml-sh' })}${tx(MW - 22, MH - 6, size, { a: 'end', cls: 'ml-sh' })}`,
      red: `<rect width="${MW}" height="18" class="ml-bar ml-black"/><rect y="${MH - 18}" width="${MW}" height="18" class="ml-bar ml-black"/>
        ${[[`${fpsTxt} FPS`, 6], [fmtTxt, 84]].map(([t, x]) => `<rect x="${x}" y="3" width="${t.length * 6.2 + 8}" height="12" rx="1" class="ml-box"/>${tx(x + 4, 12.5, t)}`).join('')}
        <circle cx="${MW - 14}" cy="9" r="4.5" class="ml-rec"/>${tx(8, MH - 5.5, `${mm}mm`)}${tx(MW - 8, MH - 5.5, size, { a: 'end' })}
        <rect x="22" y="28" width="${MW - 44}" height="${MH - 56}" class="ml-line ml-dash"/>`,
      canon: `<rect x="12" y="12" width="${MW - 24}" height="${MH - 24}" class="ml-line"/>
        <path d="M${MW / 2 - 8} ${MH / 2} h16 M${MW / 2} ${MH / 2 - 8} v16" class="ml-cross"/>
        <rect y="${MH - 20}" width="${MW}" height="20" class="ml-band"/>
        ${tx(10, MH - 6.5, `STBY  ${mm}mm`, { cls: 'ml-sans' })}${tx(MW - 10, MH - 6.5, `${fpsTxt}P  ${size}`, { a: 'end', cls: 'ml-sans' })}`,
    }[look];
    return `<svg viewBox="0 0 ${MW} ${MH}" class="fov-monitor" role="img" aria-label="${esc(T('framing'))}" direction="ltr">
      <defs><clipPath id="fov-clip"><rect width="${MW}" height="${MH}" rx="6"/></clipPath></defs>
      <rect width="${MW}" height="${MH}" rx="6" class="mon-bg"/>
      <g clip-path="url(#fov-clip)"><rect y="${mGround.toFixed(1)}" width="${MW}" height="${MH}" class="mon-floor"/>${people.map(x => figureAt(x, mGround, PERSON_M * mpx)).join('')}${ov}</g>
    </svg>`;
  };
  const factsHTML = (mm) => {
    const fr = frameAt(sn, mm, s.distance);
    return `<span class="fov-shot">${esc(name(shotOf(fr.heightM)))}</span><span>${esc(Tp('frame_line', { w: num(toUnit(fr.widthM, unit), 2), h: num(toUnit(fr.heightM, unit), 2), u: uLabel, a: num(fr.hFov, 0) }))}</span>`;
  };
  const readHTML = (mm) => {
    const lens = lenses.find(l => l.min === l.max && l.min === mm) || lenses.filter(l => l.min <= mm && mm <= l.max).sort((x, y) => (x.max / x.min) - (y.max / y.min))[0];
    const lname = lens ? (lens.min === lens.max ? T('prime_lbl') : `${T('zoom_lbl')} ${lens.label}`) : '';
    return `<b>${mm}</b><i>mm · ${num(frameAt(sn, mm, s.distance).hFov, 0)}°</i>${lname ? `<span class="sh-small">${esc(lname)}</span>` : ''}`;
  };
  // which lens frames a shot from here: the catalog's (or a standard prime), on the ring's nearest mark
  const focalForShot = (id) => { const sh = SHOTS.find(x => x.id === id) || shot; const r = pickLens(lensFor(sn, s.distance, sh.height), lenses); return r ? nearestStop(r.focal) : shown; };

  // 1. The lens ring: turned like the focal ring on the lens, under a fixed witness mark.
  const ring = `<div class="card fov-ringcard" data-part="vf">
    <div class="tsub">${esc(T('lens_now'))}</div>
    <div class="fov-read" data-part="read">${readHTML(shown)}</div>
    <div class="fov-ringwrap"><div class="fov-ring" dir="ltr" data-ring data-vals="${stops.map(x => x.mm).join(',')}" role="slider" aria-label="${esc(T('vf_ruler'))}" aria-valuetext="${shown} mm">${stops.map((x, i) => `<button class="fov-rmark" data-ri="${i}" tabindex="-1">${x.mm}</button>`).join('')}</div><i class="fov-witness" aria-hidden="true"></i></div>
    <button class="btn primary fov-open" data-vf-start>${toolIcon('fov')}${esc(T('vf_start'))}</button>
    <p class="tnote">${esc(Tp('vf_hint', { cam: camFull(cam.product) }))}</p>
    <div class="fov-cal ${phoneCal() ? 'ok' : 'warn'}"><span>${phoneCal() ? '✓ ' : '⚠ '}${esc(phoneCal() ? Tp('vf_cal_ok', { eq: phoneCal().eq }) : T('vf_cal_none'))}</span><button class="btn sm" data-vf-cal>${esc(T('vf_cal_btn'))}</button></div>
  </div>`;

  // 2. Distance and frame: drag the tape and the monitor, the shot and the frame size follow live.
  const frameAtLine = (mm) => { const z = frameAt(sn, mm, s.distance); return Tp('frame_at', { mm, d: dist(s.distance), u: uLabel, w: num(toUnit(z.widthM, unit), 2), h: num(toUnit(z.heightM, unit), 2) }); };
  const TAPE = unit === 'ft' ? DIST_FT : DIST_M;
  const tapeMajor = (v) => (unit === 'ft' ? [5, 10, 20, 50, 100, 200].includes(v) : [1, 2, 3, 5, 10, 20, 50, 100].includes(v));
  const tape = `<div class="fov-tapewrap"><div class="fov-tape" dir="ltr" data-tape data-vals="${TAPE.join(',')}" role="slider" aria-label="${esc(T('distance_step'))}" aria-valuetext="${esc(`${dist(s.distance)} ${uLabel}`)}">${TAPE.map((v, i) => `<button class="fov-tick ${tapeMajor(v) ? 'major' : ''}" data-ti="${i}" tabindex="-1"><b>${v}</b></button>`).join('')}</div><i class="fov-needle" aria-hidden="true"></i></div>`;
  const look = LOOKS[s.look] ? s.look : 'arri';
  const frameCard = `<div class="card fov-framecard" data-part="distrow">
    <div class="fov-looks" role="group" aria-label="${esc(T('mon_look'))}"><span class="tsub">${esc(T('mon_look'))}</span>${Object.entries(LOOKS).map(([k, n]) => `<button class="fov-look ${k === look ? 'on' : ''}" data-mlook="${k}" aria-pressed="${k === look}">${n}</button>`).join('')}</div>
    <div class="fov-mon" data-part="mon">${monitorHTML(shown)}</div>
    <div class="fov-facts" data-part="facts">${factsHTML(shown)}</div>
    <div class="fov-distin2"><label class="fov-distin"><span class="tsub">${esc(T('distance_step'))}</span>
      <input type="number" data-fdist2 value="${esc(dist(s.distance))}" min="0.2" max="600" step="0.1" inputmode="decimal" aria-label="${esc(T('distance_step'))}"></label>
      <div class="seg sh-mode"><button class="${unit === 'm' ? 'active' : ''}" data-unit="m">${esc(T('meters'))}</button><button class="${unit === 'ft' ? 'active' : ''}" data-unit="ft">${esc(T('feet'))}</button></div></div>
    ${tape}
    <div class="tsub" style="margin-top:12px">${esc(T('lens_for_shot'))}</div>
    <div class="chips fov-shots">${SHOTS.map(x => `<button class="chip pick" data-shot="${x.id}">${esc(name(x))}</button>`).join('')}</div>
  </div>`;

  fovView = { cam: { id: cam.prof.id, name: camFull(cam.product), w: sn.w, h: sn.h, mode: sn.mode }, stops, focal: shown,
    frameAtLine: () => frameAtLine(liveMM()), liveMM, monitorHTML, factsHTML, readHTML, focalForShot,
    modes: modesOf(cam), modeId: modeOf(cam)?.id,
    cameras: cams.map(c => ({ id: c.prof.id, name: camFull(c.product), modes: modesOf(c), w: c.prof.sensor.w, h: c.prof.sensor.h, mode: c.prof.sensor.mode })),
    projectId: projProf, recent: (s.recent || []).slice(),
    modeFor: (id) => S.fov.modes?.[id],
    onMode: (camId, id) => { S.fov.modes = { ...(S.fov.modes || {}), [camId]: id }; keepFov(); },
    onCamera: (id) => { Object.assign(S.fov, { cam: String(id), fromProject: false }); pushRecent(id); keepFov(); },
    frameLine: (mm, area = sn) => { const z = frameAt(area, mm, s.distance); return Tp('vf_at', { d: dist(s.distance), u: uLabel, w: num(toUnit(z.widthM, unit), 2), h: num(toUnit(z.heightM, unit), 2) }); },
    // the same, short and in Latin units: for the frame labels and the data burned into a grab
    frameSize: (mm, area = sn) => { const z = frameAt(area, mm, s.distance); return `${num(toUnit(z.widthM, unit), 2)}×${num(toUnit(z.heightM, unit), 2)}${unit}`; },
    get distance() { return `${dist(s.distance)}${unit}`; },
    fps: s.fps || 25, onFps: (f) => { S.fov.fps = f; keepFov(); },
    get look() { return LOOKS[s.look] ? s.look : 'arri'; } };
  keepFov();

  // The page: the camera, the lens ring, and the frame from where you stand.
  return `${pickCard}${ring}${frameCard}`;
}

export { fovTool as view };


export function bind(root, ctx, { T, lang, rewire }) {
  root.querySelectorAll('[data-cbrand]').forEach(b => { b.onclick = () => { Object.assign(S.fov, { camBrand: b.dataset.cbrand, picking: true }); ctx.render(); }; });
  root.querySelectorAll('[data-cmodel]').forEach(b => { b.onclick = () => {
    // a row is a camera in a format: choosing it sets both
    const modes = b.dataset.cmodelmode ? { ...(S.fov.modes || {}), [b.dataset.cmodel]: b.dataset.cmodelmode } : S.fov.modes;
    Object.assign(S.fov, { cam: b.dataset.cmodel, modes, focal: 0, picking: false, fromProject: false, q: '' }); pushRecent(b.dataset.cmodel); feel.detent(); ctx.render();
  }; });
  root.querySelectorAll('[data-crecent]').forEach(b => { b.onclick = () => { Object.assign(S.fov, { cam: b.dataset.crecent, focal: 0, picking: false, fromProject: false, q: '' }); pushRecent(b.dataset.crecent); feel.detent(); ctx.render(); }; });
  root.querySelector('[data-cpick-cancel]')?.addEventListener('click', () => { Object.assign(S.fov, { picking: false, q: '' }); ctx.render(); });
  // typing redraws only the results, so the keyboard stays up
  const camq = root.querySelector('[data-camq]');
  if (camq) camq.oninput = () => {
    S.fov.q = camq.value;
    const tpl = document.createElement('template');
    tpl.innerHTML = fovTool(T, lang, ctx);
    const fresh = tpl.content.querySelector('[data-part="camresults"]');
    const cur = root.querySelector('[data-part="camresults"]');
    if (!fresh || !cur) return;
    cur.replaceWith(fresh);
    fresh.querySelectorAll('[data-cmodel]').forEach(b => { b.onclick = () => {
      const modes = b.dataset.cmodelmode ? { ...(S.fov.modes || {}), [b.dataset.cmodel]: b.dataset.cmodelmode } : S.fov.modes;
      Object.assign(S.fov, { cam: b.dataset.cmodel, modes, focal: 0, picking: false, fromProject: false, q: '' }); pushRecent(b.dataset.cmodel); feel.detent(); ctx.render();
    }; });
    fresh.querySelectorAll('[data-cbrand]').forEach(b => { b.onclick = () => { Object.assign(S.fov, { camBrand: b.dataset.cbrand, picking: true }); ctx.render(); }; });
  };
  root.querySelectorAll('[data-unit]').forEach(b => { b.onclick = () => { S.fov.unit = b.dataset.unit; ctx.render(); }; });
  root.querySelector('[data-vf-cal]')?.addEventListener('click', async () => {
    if (!fovView) return;
    const ok = await openViewfinder({ ...fovView, T, calibrate: true, onClose: () => ctx.render() });
    if (ok && ok !== true) toast(T(ok === 'unsupported' ? 'vf_err_inapp' : ok === 'nocamera' ? 'vf_err_nocam' : 'vf_denied'), { kind: 'err', ms: 9000 });
  });
  root.querySelector('[data-vf-start]')?.addEventListener('click', async () => {
    if (!fovView) return;
    const ok = await openViewfinder({ ...fovView, T, onClose: (mm) => { S.fov.focal = mm; ctx.render(); } });
    // tell the user what to do, by the reason (and by phone: iPhone permissions live elsewhere)
    if (ok && ok !== true) {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const key = ok === 'unsupported' ? 'vf_err_inapp' : ok === 'denied' ? (ios ? 'vf_err_denied_ios' : 'vf_err_denied') : ok === 'nocamera' ? 'vf_err_nocam' : 'vf_denied';
      toast(T(key), { kind: 'err', ms: 9000 });
    }
  });
  // Repaint what follows the lens and the distance, leaving the strips (and the finger on them) alone.
  const paint = () => {
    if (!fovView?.liveMM) return;
    const mm = fovView.liveMM();
    fovView.focal = mm;
    const part = (p, html) => { const el = root.querySelector(`[data-part="${p}"]`); if (el) el.innerHTML = html; };
    part('read', fovView.readHTML(mm)); part('mon', fovView.monitorHTML(mm)); part('facts', fovView.factsHTML(mm));
    const fd = root.querySelector('[data-fdist2]'); if (fd && document.activeElement !== fd) { const v = toUnit(S.fov.distance, S.fov.unit); fd.value = num(v, v < 10 ? 1 : 0); }
  };
  // A strip of marks scrolled under a fixed mark: the one under it is picked, a detent on each.
  const snapStrip = (el, vals, current, pick) => {
    if (!el) return null;
    let at = vals.reduce((bi, v, i) => (Math.abs(v - current) < Math.abs(vals[bi] - current) ? i : bi), 0);
    const centre = (i, smooth) => { const b = el.children[i]; el.scrollTo({ left: b.offsetLeft - (el.clientWidth - b.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' }); };
    const mark = () => [...el.children].forEach((b, i) => b.classList.toggle('on', i === at));
    mark();
    requestAnimationFrame(() => centre(at, false));
    // only the user's own drag moves it — not the strip being centred on a value set elsewhere
    let user = false, lastTick = 0, settleT = 0, raf = 0;
    ['pointerdown', 'touchstart', 'wheel'].forEach(ev => el.addEventListener(ev, () => { user = true; }, { passive: true }));
    el.addEventListener('scroll', () => {
      if (!user) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const mid = el.scrollLeft + el.clientWidth / 2;
        let best = at, d = Infinity;
        [...el.children].forEach((b, i) => { const c = Math.abs(b.offsetLeft + b.offsetWidth / 2 - mid); if (c < d) { d = c; best = i; } });
        if (best === at) return;
        at = best; mark(); pick(vals[at]);
        const now = performance.now(); if (now - lastTick > 60) { lastTick = now; feel.detent(); }
      });
      clearTimeout(settleT);
      settleT = setTimeout(() => { keepFov(); feel.settle(); }, 220);
    }, { passive: true });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || b.parentElement !== el) return;
      user = true; at = [...el.children].indexOf(b); mark(); pick(vals[at]); centre(at, true); keepFov(); feel.detent();
    });
    return { set: (v) => { at = vals.indexOf(v); if (at < 0) return; mark(); centre(at, true); } };
  };
  const ringEl = root.querySelector('[data-ring]');
  const ringVals = ringEl ? ringEl.dataset.vals.split(',').map(Number) : [];
  const ring = snapStrip(ringEl, ringVals, fovView?.focal, (mm) => { S.fov.focal = mm; ringEl.setAttribute('aria-valuetext', `${mm} mm`); paint(); });
  const tapeEl = root.querySelector('[data-tape]');
  snapStrip(tapeEl, tapeEl ? tapeEl.dataset.vals.split(',').map(Number) : [], toUnit(S.fov.distance, S.fov.unit), (v) => {
    // the lens stays where it is while the distance changes
    if (!(S.fov.focal > 0) && fovView) S.fov.focal = fovView.focal;
    S.fov.distance = fromUnit(v, S.fov.unit); tapeEl.setAttribute('aria-valuetext', String(v)); paint();
  });
  // a typed distance moves the tape too (a full redraw centres it)
  const fd2 = root.querySelector('[data-fdist2]');
  if (fd2) fd2.onchange = () => { const v = Number(fd2.value); if (v > 0) { if (!(S.fov.focal > 0) && fovView) S.fov.focal = fovView.focal; S.fov.distance = fromUnit(v, S.fov.unit); } ctx.render(); };
  // a shot size turns the ring to the lens that frames it from here
  root.querySelectorAll('[data-shot]').forEach(b => { b.onclick = () => {
    if (!fovView) return;
    const mm = fovView.focalForShot(b.dataset.shot);
    Object.assign(S.fov, { shot: b.dataset.shot, focal: mm }); keepFov(); feel.detent();
    ring?.set(mm); paint();
    root.querySelectorAll('[data-shot]').forEach(x => x.classList.toggle('on', x === b));
  }; });
  root.querySelectorAll('[data-mlook]').forEach(b => { b.onclick = () => {
    S.fov.look = b.dataset.mlook; keepFov(); feel.detent(); paint();
    root.querySelectorAll('[data-mlook]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
  }; });
  root.querySelectorAll('[data-cmode]').forEach(b => { b.onclick = () => { S.fov.modes = { ...(S.fov.modes || {}), [S.fov.cam]: b.dataset.cmode }; S.fov.modesOpen = false; feel.detent(); ctx.render(); }; });
  root.querySelector('[data-modes-toggle]')?.addEventListener('click', () => { S.fov.modesOpen = !S.fov.modesOpen; ctx.render(); });
  root.querySelector('[data-cchange]')?.addEventListener('click', () => { Object.assign(S.fov, { picking: true, camBrand: '' }); ctx.render(); });   // opens on the current camera's maker
}
