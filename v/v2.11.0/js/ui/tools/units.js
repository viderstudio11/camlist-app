// Units: length, weight, data, rates, batteries, ND and temperature.
import { esc } from '../dom.js';
import { UNIT_GROUPS, convert, cToF, fToC, mahToWh, ndFrom, flightCheck } from '../../tools/convert.js';
import { num } from '../../format.js';
import { S, field, numIn } from './shared.js';

// One category at a time: type a value in one unit and read it in all the others. Battery, ND and
// temperature are their own small calculators because they do not scale from zero.
const UNIT_TABS = ['length', 'weight', 'data', 'rate', 'battery', 'nd', 'temp'];
function unitsTool(T, lang) {
  const s = S.units;
  const chip = (attr, val, label, on) => `<button class="chip pick ${on ? 'on' : ''}" ${attr}="${esc(val)}">${label}</button>`;
  const tab = UNIT_TABS.includes(s.group) ? s.group : 'length';
  const tabs = `<div class="card sh-sec"><div class="chips">${UNIT_TABS.map(k => chip('data-utab', k, esc(T('u_' + k)), k === tab)).join('')}</div></div>`;
  const row = (label, value, cls = '') => `<div class="u-row ${cls}"><span>${esc(label)}</span><b>${value}</b></div>`;
  let body = '';

  if (['length', 'weight', 'data', 'rate'].includes(tab)) {
    const g = UNIT_GROUPS.find(x => x.id === tab);
    const from = g.units.find(u => u.id === s.from) || g.units[0];
    body = `<div class="card sh-answer ok">
        <div class="u-input">${numIn('value', s.value)}<span>${esc(from.label)}</span></div>
        <div class="chips">${g.units.map(u => chip('data-ufrom', u.id, esc(u.label), u.id === from.id)).join('')}</div>
        <div class="u-list">${g.units.filter(u => u.id !== from.id).map(u => row(u.label, num(convert(g.id, from.id, u.id, s.value), 3))).join('')}</div>
      </div>`;
  } else if (tab === 'battery') {
    const wh = s.batMode === 'wh' ? Number(s.wh) : mahToWh(s.mah, s.volts);
    const fly = flightCheck(wh);
    body = `<div class="card sh-answer ${fly.level === 'ok' ? 'ok' : 'warn'}">
        <div class="fov-top"><b class="sh-big">${num(wh, 0)}</b><span class="sh-small">Wh</span></div>
        <p class="sh-line fly-${fly.level}">${esc(T(fly.key))}</p>
        <div class="chips">${chip('data-ubat', 'mah', 'mAh + V', s.batMode !== 'wh')}${chip('data-ubat', 'wh', 'Wh', s.batMode === 'wh')}</div>
        ${s.batMode === 'wh'
          ? `<div class="hr-times">${field('Wh', numIn('wh', s.wh, { min: 1, max: 2000, step: 1 }))}</div>`
          : `<div class="hr-times">${field('mAh', numIn('mah', s.mah, { min: 1, max: 100000, step: 10 }))}${field(T('volts'), numIn('volts', s.volts, { min: 1, max: 60, step: 0.1 }))}</div>`}
        <details class="src-more"><summary><span class="src-badge ok">IATA</span> ${esc(T('fly_src_short'))} <span class="src-i">ⓘ</span></summary><p>${esc(T('fly_src'))}</p></details>
      </div>`;
  } else if (tab === 'nd') {
    const kind = ['density', 'factor', 'stops'].includes(s.ndKind) ? s.ndKind : 'density';
    const r = ndFrom(kind, s.nd);
    const common = { density: [0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1], factor: [2, 4, 8, 16, 64, 256, 1000], stops: [1, 2, 3, 4, 5, 6, 7, 10] }[kind];
    body = `<div class="card sh-answer ok">
        <div class="fov-top"><b class="sh-big">${num(r.stops, 1)}</b><span class="sh-small">${esc(T('nd_stops'))}</span></div>
        <div class="chips">${['density', 'factor', 'stops'].map(k => chip('data-undk', k, esc(T('nd_' + k)), k === kind)).join('')}</div>
        <div class="chips fov-models">${common.map(v => chip('data-und', v, kind === 'factor' ? `ND${v}` : String(v), Number(s.nd) === v)).join('')}</div>
        <div class="u-input">${numIn('nd', s.nd, { min: 0, max: 10000, step: 'any' })}<span>${esc(T('nd_' + kind))}</span></div>
        <div class="u-list">
          ${row(T('nd_density'), num(r.density, 1))}${row(T('nd_factor'), `ND${num(r.factor, 0)}`)}${row(T('nd_stops'), num(r.stops, 1))}${row(T('nd_light'), `${num(r.light * 100, r.light < 0.01 ? 2 : 1)}%`)}
        </div>
      </div>`;
  } else {
    const unit = s.tempUnit === 'f' ? 'f' : 'c';
    const other = unit === 'c' ? `${num(cToF(s.temp), 1)} °F` : `${num(fToC(s.temp), 1)} °C`;
    body = `<div class="card sh-answer ok">
        <div class="fov-top"><b class="sh-big">${other}</b></div>
        <div class="u-input">${numIn('temp', s.temp, { min: -100, max: 300, step: 0.5 })}<span>°${unit.toUpperCase()}</span></div>
        <div class="chips">${chip('data-utemp', 'c', '°C', unit === 'c')}${chip('data-utemp', 'f', '°F', unit === 'f')}</div>
      </div>`;
  }
  return body + tabs;
}

export { unitsTool as view };

export function bind(root, ctx, { T, lang, rewire }) {
  const un = S.units;
  root.querySelectorAll('[data-utab]').forEach(b => { b.onclick = () => { un.group = b.dataset.utab; const g = UNIT_GROUPS.find(x => x.id === un.group); if (g && !g.units.some(u => u.id === un.from)) un.from = g.units[0].id; ctx.render(); }; });
  root.querySelectorAll('[data-ufrom]').forEach(b => { b.onclick = () => { un.from = b.dataset.ufrom; ctx.render(); }; });
  root.querySelectorAll('[data-ubat]').forEach(b => { b.onclick = () => { un.batMode = b.dataset.ubat; ctx.render(); }; });
  root.querySelectorAll('[data-undk]').forEach(b => { b.onclick = () => { const r = ndFrom(un.ndKind, un.nd); un.ndKind = b.dataset.undk; un.nd = un.ndKind === 'factor' ? Math.round(r.factor) : Math.round(r[un.ndKind] * 10) / 10; ctx.render(); }; });
  root.querySelectorAll('[data-und]').forEach(b => { b.onclick = () => { un.nd = Number(b.dataset.und); ctx.render(); }; });
  root.querySelectorAll('[data-utemp]').forEach(b => { b.onclick = () => { if (b.dataset.utemp !== un.tempUnit) un.temp = Math.round((b.dataset.utemp === 'f' ? cToF(un.temp) : fToC(un.temp)) * 10) / 10; un.tempUnit = b.dataset.utemp; ctx.render(); }; });
}
