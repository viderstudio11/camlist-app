// Lens choice: the camera, the lens dial, the live viewfinder and the distance — what a lens takes in from here.
import { esc, toast } from '../dom.js';
import { toolIcon, deptIcon } from '../icons.js';
import { PRIME_SET, SHOTS, lensFor, frameAt, pickLens, toUnit, fromUnit } from '../../tools/fov.js';
import { num } from '../../format.js';
import { activeProject } from '../../home.js';
import { feel } from '../../feel.js';
import { openViewfinder, rulerStops } from '../viewfinder.js';
import { S, keepFov, pushRecent, DIST_M, DIST_FT } from './shared.js';

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

// Distance slider: logarithmic, 0.5 m to 30 m, so the short distances where a step matters get
// most of the travel.
const DIST_MIN = 0.5, DIST_MAX = 30;
const distToSlider = (d) => Math.round((Math.log(d / DIST_MIN) / Math.log(DIST_MAX / DIST_MIN)) * 1000);
const sliderToDist = (v) => {
  const d = DIST_MIN * (DIST_MAX / DIST_MIN) ** (v / 1000);
  return d < 3 ? Math.round(d * 10) / 10 : d < 10 ? Math.round(d * 4) / 4 : Math.round(d);
};

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
        <div class="fov-cam-row"><span class="fov-cam-ico" aria-hidden="true">${deptIcon('cameras')}</span><div class="fov-cam-txt"><div class="tsub">${esc(T('camera_step'))}${s.fromProject ? ` · ${esc(T('from_project'))}` : ''}</div><b>${esc(camFull(cam.product))}</b><p class="tnote">${esc(sensorNote)}</p><a class="fw-link" href="#/tools/downloads?q=${encodeURIComponent(short(cam))}">${esc(T('dl_for_cam'))} ›</a></div>
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

  const distCard = `<div class="card sh-sec" data-part="dist">
    <div class="sh-head"><div class="tsub">${esc(T('distance_step'))}</div>
      <div class="seg sh-mode"><button class="${unit === 'm' ? 'active' : ''}" data-unit="m">${esc(T('meters'))}</button><button class="${unit === 'ft' ? 'active' : ''}" data-unit="ft">${esc(T('feet'))}</button></div></div>
    <div class="fov-dist"><input type="range" min="0" max="1000" step="1" value="${distToSlider(s.distance)}" data-dist aria-label="${esc(T('distance_step'))}">
      <label class="fov-dnum"><input type="number" data-fdist value="${esc(dist(s.distance))}" min="0.2" max="600" step="0.1" inputmode="decimal"><span>${esc(uLabel)}</span></label></div>
    <div class="tsub" style="margin-top:12px">${esc(T('shot_step'))}</div>
    <div class="chips">${SHOTS.map(x => chip('data-shot', x.id, esc(name(x)), x.id === shot.id)).join('')}</div>
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
  const fr = frameAt(sn, focal, s.distance);
  const isRec = !(s.focal > 0) || s.focal === rec.focal;
  // Which lens that focal length is on: a prime of exactly that length, else the narrowest zoom holding it.
  const onLens = lenses.find(l => l.min === l.max && l.min === focal)
    || lenses.filter(l => l.min <= focal && focal <= l.max).sort((x, y) => (x.max / x.min) - (y.max / y.min))[0];
  const lensName = onLens ? (onLens.min === onLens.max ? T('prime_lbl') : `${T('zoom_lbl')} ${onLens.label}`) : '';

  // Where the frame sits on a 1.75 m person, in metres above the ground: a frame taller than the
  // person stands on the ground; a tighter one sits on the upper body with a little headroom,
  // where an operator would put it. Both drawings below use this, so they always agree.
  const PERSON_M = 1.75;
  const bottomM = fr.heightM >= PERSON_M ? 0 : PERSON_M + fr.heightM * 0.12 - fr.heightM;
  const two = fr.widthM >= PERSON_M * 2.4;
  const figureAt = (x, groundY, h) => {
    const k = h / FIG_H;
    return `<g class="fig" transform="translate(${(x - (FIG_W * k) / 2).toFixed(2)} ${(groundY - h).toFixed(2)}) scale(${k.toFixed(4)})">${FIG}</g>`;
  };

  // 1. The monitor: exactly what the camera sees, in the sensor's own aspect ratio.
  const MW = 320, MH = Math.round((MW * sn.h) / sn.w);
  const mpx = MW / fr.widthM;
  const mGround = MH + bottomM * mpx;
  const people = two ? [MW / 2 - fr.widthM * 0.22 * mpx, MW / 2 + fr.widthM * 0.22 * mpx] : [MW / 2];
  const monitor = `<svg viewBox="0 0 ${MW} ${MH}" class="fov-monitor" role="img" aria-label="${esc(T('framing'))}">
    <defs><clipPath id="fov-clip"><rect width="${MW}" height="${MH}" rx="6"/></clipPath></defs>
    <rect width="${MW}" height="${MH}" rx="6" class="mon-bg"/>
    <g clip-path="url(#fov-clip)"><rect y="${mGround.toFixed(1)}" width="${MW}" height="${MH}" class="mon-floor"/>${people.map(x => figureAt(x, mGround, PERSON_M * mpx)).join('')}</g>
    <rect x="${MW * 0.05}" y="${MH * 0.05}" width="${MW * 0.9}" height="${MH * 0.9}" class="mon-safe"/>
    <path d="M${MW / 2 - 8} ${MH / 2}h16M${MW / 2} ${MH / 2 - 8}v16" class="mon-cross"/>
    <text x="10" y="${MH - 10}" class="mon-mm">${focal}mm</text>
    <rect width="${MW}" height="${MH}" rx="6" class="mon-edge"/>
  </svg>`;

  // 2. The measurement: the same frame on the person against a height scale, with its real size.
  const box = 150, top = 18, L = 28;
  const tallest = Math.max(fr.heightM + bottomM, PERSON_M) * 1.08;
  const px = (box - top) / tallest;
  const fw = fr.widthM * px, fh = fr.heightM * px, ph = PERSON_M * px;
  const vw = Math.max(fw + 30, 200) + L + 40;
  const cx = L + (vw - L - 40) / 2;
  const gy = box - 2;
  const fx0 = cx - fw / 2, fx1 = cx + fw / 2, fy = gy - (bottomM + fr.heightM) * px;
  const step = unit === 'ft' ? 0.6096 : 0.5; // a tick every 2 ft or every half metre
  const ticks = [];
  for (let m = 0; m <= tallest + 1e-9; m += step) {
    const y = gy - m * px;
    ticks.push(`<line x1="${L - 6}" y1="${y.toFixed(1)}" x2="${L}" y2="${y.toFixed(1)}" class="ms-tick"/><text x="${L - 8}" y="${(y + 3.5).toFixed(1)}" class="ms-num" text-anchor="end">${num(toUnit(m, unit), unit === 'ft' ? 0 : 1)}</text>`);
  }
  const measured = `<svg viewBox="0 0 ${vw.toFixed(0)} ${box}" class="fov-measure" role="img">
    <line x1="${L}" y1="${top - 6}" x2="${L}" y2="${gy}" class="ms-tick"/>${ticks.join('')}
    <line x1="${L}" y1="${gy}" x2="${vw}" y2="${gy}" class="ms-ground"/>
    ${(two ? [cx - fw * 0.22, cx + fw * 0.22] : [cx]).map(x => figureAt(x, gy, ph)).join('')}
    <rect x="${fx0.toFixed(1)}" y="${fy.toFixed(1)}" width="${fw.toFixed(1)}" height="${fh.toFixed(1)}" class="ms-frame"/>
    <path d="M${(fx1 + 8).toFixed(1)} ${fy.toFixed(1)}v${fh.toFixed(1)}M${(fx1 + 4).toFixed(1)} ${fy.toFixed(1)}h8M${(fx1 + 4).toFixed(1)} ${(fy + fh).toFixed(1)}h8" class="ms-dim"/>
    <text x="${(fx1 + 13).toFixed(1)}" y="${(fy + fh / 2 + 4).toFixed(1)}" class="ms-lbl">${num(toUnit(fr.heightM, unit), 2)}</text>
    <path d="M${fx0.toFixed(1)} ${(fy - 7).toFixed(1)}h${fw.toFixed(1)}M${fx0.toFixed(1)} ${(fy - 11).toFixed(1)}v8M${fx1.toFixed(1)} ${(fy - 11).toFixed(1)}v8" class="ms-dim"/>
    <text x="${cx.toFixed(1)}" y="${(fy - 12).toFixed(1)}" class="ms-lbl" text-anchor="middle">${num(toUnit(fr.widthM, unit), 2)} ${esc(uLabel)}</text>
  </svg>`;

  const answer = `<div class="card sh-answer ok" data-part="answer">
    <div class="fov-top"><b class="sh-big">${focal}<small>mm</small></b>${lensName ? `<span class="sh-small">${esc(lensName)}</span>` : ''}${isRec ? `<span class="sh-rec">${esc(T('recommended'))}</span>` : `<button class="linkbtn" data-lens-reset>${esc(Tp('back_to_rec', { mm: rec.focal }))}</button>`}</div>
    <p class="sh-line">${esc(Tp('need_sentence', { d: dist(s.distance), u: uLabel, shot: name(shot), cam: cam.product.name, mm: num(need, 1) }))}</p>
    ${monitor}
    <details class="fov-more"><summary>${esc(Tp('frame_line', { w: num(toUnit(fr.widthM, unit), 2), h: num(toUnit(fr.heightM, unit), 2), u: uLabel, a: num(fr.hFov, 0) }))}</summary>${measured}</details>
  </div>`;

  const stops = rulerStops([], PRIME_SET);
  const at = stops.reduce((b, x, i) => (Math.abs(x.mm - focal) < Math.abs(stops[b].mm - focal) ? i : b), 0);
  const shown = stops[at].mm;
  // An arc from 180° to 0°: the lit part runs up to this lens's place among the stops.
  const R = 70, CX = 80, CY = 76;
  const pt = (t) => [CX - R * Math.cos(Math.PI * t), CY - R * Math.sin(Math.PI * t)];
  const tEnd = stops.length > 1 ? at / (stops.length - 1) : 0;
  const [x0, y0] = pt(0), [x1, y1] = pt(Math.max(tEnd, 0.001));
  const viewfinder = `<div class="card fov-dialcard" data-part="vf">
    <div class="tsub">${esc(T('lens_now'))}</div>
    <div class="fov-dial">
      <button class="fov-step" data-fstep="-1" aria-label="${esc(T('lens_wider'))}" ${at === 0 ? 'aria-disabled="true"' : ''}>‹</button>
      <svg viewBox="0 0 160 84" class="fov-arc" role="img" aria-label="${shown} mm">
        <path d="M${x0} ${y0} A${R} ${R} 0 0 1 ${CX + R} ${CY}" class="arc-bg"/>
        <path d="M${x0} ${y0} A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" class="arc-on"/>
        <text x="80" y="70" text-anchor="middle" class="arc-mm">${shown}<tspan class="arc-u" dx="2">mm</tspan></text>
      </svg>
      <button class="fov-step" data-fstep="1" aria-label="${esc(T('lens_longer'))}" ${at === stops.length - 1 ? 'aria-disabled="true"' : ''}>›</button>
    </div>
    <button class="btn primary fov-open" data-vf-start>${toolIcon('fov')}${esc(T('vf_start'))}</button>
    <p class="tnote">${esc(Tp('vf_hint', { cam: camFull(cam.product) }))}</p>
  </div>
`;
  const frameAtLine = (mm) => { const z = frameAt(sn, mm, s.distance); return Tp('frame_at', { mm, d: dist(s.distance), u: uLabel, w: num(toUnit(z.widthM, unit), 2), h: num(toUnit(z.heightM, unit), 2) }); };
  const TAPE = unit === 'ft' ? DIST_FT : DIST_M;
  const tapeMajor = (v) => (unit === 'ft' ? [5, 10, 20, 50, 100, 200].includes(v) : [1, 2, 3, 5, 10, 20, 50, 100].includes(v));
  const tape = `<div class="fov-tapewrap"><div class="fov-tape" dir="ltr" data-tape data-vals="${TAPE.join(',')}" role="slider" aria-label="${esc(T('distance_step'))}" aria-valuetext="${esc(`${dist(s.distance)} ${uLabel}`)}">${TAPE.map((v, i) => `<button class="fov-tick ${tapeMajor(v) ? 'major' : ''}" data-ti="${i}" tabindex="-1"><b>${v}</b></button>`).join('')}</div><i class="fov-needle" aria-hidden="true"></i></div>`;
  const distRow = `<div class="card fov-distrow" data-part="distrow">
    <label class="fov-distin"><span class="tsub">${esc(T('distance_step'))}</span>
      <input type="number" data-fdist2 value="${esc(dist(s.distance))}" min="0.2" max="600" step="0.1" inputmode="decimal" aria-label="${esc(T('distance_step'))}"></label>
    <div class="seg sh-mode"><button class="${unit === 'm' ? 'active' : ''}" data-unit="m">${esc(T('meters'))}</button><button class="${unit === 'ft' ? 'active' : ''}" data-unit="ft">${esc(T('feet'))}</button></div>
    ${tape}
    <p class="fov-frameline">${esc(frameAtLine(shown))}</p>
  </div>`;

  fovView = { cam: { id: cam.prof.id, name: camFull(cam.product), w: sn.w, h: sn.h, mode: sn.mode }, stops, focal: shown,
    frameAtLine: () => frameAtLine(shown),
    modes: modesOf(cam), modeId: modeOf(cam)?.id,
    cameras: cams.map(c => ({ id: c.prof.id, name: camFull(c.product), modes: modesOf(c), w: c.prof.sensor.w, h: c.prof.sensor.h, mode: c.prof.sensor.mode })),
    projectId: projProf, recent: (s.recent || []).slice(),
    modeFor: (id) => S.fov.modes?.[id],
    onMode: (camId, id) => { S.fov.modes = { ...(S.fov.modes || {}), [camId]: id }; keepFov(); },
    onCamera: (id) => { Object.assign(S.fov, { cam: String(id), fromProject: false }); pushRecent(id); keepFov(); },
    frameLine: (mm, area = sn) => { const z = frameAt(area, mm, s.distance); return Tp('vf_at', { d: dist(s.distance), u: uLabel, w: num(toUnit(z.widthM, unit), 2), h: num(toUnit(z.heightM, unit), 2) }); },
    // the same, short and in Latin units: for the frame labels and the data burned into a grab
    frameSize: (mm, area = sn) => { const z = frameAt(area, mm, s.distance); return `${num(toUnit(z.widthM, unit), 2)}×${num(toUnit(z.heightM, unit), 2)}${unit}`; },
    distance: `${dist(s.distance)}${unit}`,
    fps: s.fps || 25, onFps: (f) => { S.fov.fps = f; keepFov(); } };
  keepFov();

  // The page is the camera and the viewfinder; the calculation from a distance waits folded.
  return `${pickCard}${viewfinder}${distRow}<details class="card fov-calc" ${s.calcOpen ? 'open' : ''} data-calc><summary>${esc(T('calc_by_distance'))}</summary>${distCard}${answer}</details>`;
}

export { fovTool as view };

export function bind(root, ctx, { T, lang, rewire }) {
  root.querySelectorAll('[data-lens]').forEach(b => { b.onclick = () => { S.fov.focal = Number(b.dataset.lens); ctx.render(); }; });
  root.querySelector('[data-lens-reset]')?.addEventListener('click', () => { S.fov.focal = 0; ctx.render(); });
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
  const fdist = root.querySelector('[data-fdist]');
  if (fdist) fdist.onchange = () => { const v = Number(fdist.value); if (v > 0) { S.fov.distance = fromUnit(v, S.fov.unit); S.fov.focal = 0; } ctx.render(); };
  root.querySelectorAll('[data-shot]').forEach(b => { b.onclick = () => { S.fov.shot = b.dataset.shot; S.fov.focal = 0; ctx.render(); }; });
  // Dragging the distance redraws everything but the slider itself, so the drag is never interrupted.
  const dist = root.querySelector('[data-dist]');
  if (dist) dist.oninput = () => {
    S.fov.distance = sliderToDist(Number(dist.value));
    S.fov.focal = 0;
    const tpl = document.createElement('template');
    tpl.innerHTML = fovTool(T, lang, ctx);
    tpl.content.querySelectorAll('[data-part]').forEach(fresh => {
      const part = fresh.dataset.part;
      if (part === 'dist') { const n = root.querySelector('[data-part="dist"] [data-fdist]'); const v = toUnit(S.fov.distance, S.fov.unit); if (n) n.value = num(v, v < 10 ? 1 : 0); return; }
      root.querySelector(`[data-part="${part}"]`)?.replaceWith(fresh);
    });
    rewire();
  };
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
  root.querySelector('[data-calc]')?.addEventListener('toggle', (e) => { S.fov.calcOpen = e.currentTarget.open; });
  root.querySelectorAll('[data-fstep]').forEach(b => { b.onclick = () => {
    const stops = fovView?.stops; if (!stops) return;
    const i = stops.findIndex(x => x.mm === fovView.focal) + Number(b.dataset.fstep);
    if (i < 0 || i >= stops.length) { feel.end(); return; }
    S.fov.focal = stops[i].mm; feel.detent(); ctx.render();
  }; });
  // the page's distance changes the frame, not the lens
  const fd2 = root.querySelector('[data-fdist2]');
  if (fd2) fd2.onchange = () => { const v = Number(fd2.value); if (v > 0) S.fov.distance = fromUnit(v, S.fov.unit); ctx.render(); };
  // Dragging the tape: the distance, the box and the frame line follow live, a detent on every mark.
  const tapeEl = root.querySelector('[data-tape]');
  if (tapeEl) {
    const vals = tapeEl.dataset.vals.split(',').map(Number);
    const here = toUnit(S.fov.distance, S.fov.unit);
    let ti = vals.reduce((bi, v, i) => (Math.abs(v - here) < Math.abs(vals[bi] - here) ? i : bi), 0);
    const centre = (i, smooth) => { const b = tapeEl.children[i]; tapeEl.scrollTo({ left: b.offsetLeft - (tapeEl.clientWidth - b.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' }); };
    const mark = () => tapeEl.querySelectorAll('.fov-tick').forEach((b, i) => b.classList.toggle('on', i === ti));
    const apply = () => {
      S.fov.distance = fromUnit(vals[ti], S.fov.unit);
      if (fd2) fd2.value = String(vals[ti]);
      const fl = root.querySelector('.fov-frameline');
      if (fl && fovView?.frameAtLine) fl.textContent = fovView.frameAtLine();
      tapeEl.setAttribute('aria-valuetext', String(vals[ti]));
    };
    mark();
    requestAnimationFrame(() => centre(ti, false));
    // only the user's own drag moves the distance — not the tape being centred on a typed value
    let user = false, lastTick = 0, settleT = 0, raf = 0;
    ['pointerdown', 'touchstart', 'wheel'].forEach(ev => tapeEl.addEventListener(ev, () => { user = true; }, { passive: true }));
    tapeEl.addEventListener('scroll', () => {
      if (!user) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const mid = tapeEl.scrollLeft + tapeEl.clientWidth / 2;
        let best = ti, d = Infinity;
        [...tapeEl.children].forEach((b, i) => { const c = Math.abs(b.offsetLeft + b.offsetWidth / 2 - mid); if (c < d) { d = c; best = i; } });
        if (best === ti) return;
        ti = best; mark(); apply();
        const now = performance.now(); if (now - lastTick > 60) { lastTick = now; feel.detent(); }
      });
      clearTimeout(settleT);
      settleT = setTimeout(() => { keepFov(); feel.settle(); if (S.fov.calcOpen) ctx.render(); }, 220);
    }, { passive: true });
    tapeEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ti]'); if (!b) return;
      user = true; ti = Number(b.dataset.ti); mark(); apply(); centre(ti, true); keepFov(); feel.detent();
    });
  }
  root.querySelectorAll('[data-cmode]').forEach(b => { b.onclick = () => { S.fov.modes = { ...(S.fov.modes || {}), [S.fov.cam]: b.dataset.cmode }; S.fov.modesOpen = false; feel.detent(); ctx.render(); }; });
  root.querySelector('[data-modes-toggle]')?.addEventListener('click', () => { S.fov.modesOpen = !S.fov.modesOpen; ctx.render(); });
  root.querySelector('[data-cchange]')?.addEventListener('click', () => { Object.assign(S.fov, { picking: true, camBrand: '' }); ctx.render(); });   // opens on the current camera's maker
}
