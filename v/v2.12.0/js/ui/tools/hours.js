// Hours: a day's timesheet — overtime tiers, turnaround and the pay for the day.
import { esc } from '../dom.js';
import { hoursReport } from '../../tools/convert.js';
import { num, hm } from '../../format.js';
import { S, more, field, numIn, keepHours } from './shared.js';


function hoursTool(T, lang) {
  const s = S.hours;
  const Tp = (k, p) => T(k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
  const chip = (attr, val, label, on) => `<button class="chip pick ${on ? 'on' : ''}" ${attr}="${esc(val)}">${label}</button>`;
  const r = hoursReport(s);
  const money = (v) => `₪${num(v, 0)}`;
  // The day drawn as one bar: regular, the first overtime tier, the rest.
  const total = Math.max(r.worked, s.base);
  const seg = (h, cls) => (h > 0 ? `<i class="${cls}" style="width:${((h / total) * 100).toFixed(1)}%"></i>` : '');
  const parts = [`${hm(r.regular)} ${T('hr_regular')}`, r.tier1 && `${hm(r.tier1)} ${Tp('hr_at', { p: s.tier1pct })}`, r.tier2 && `${hm(r.tier2)} ${Tp('hr_at', { p: s.tier2pct })}`].filter(Boolean);
  const breakOther = ![0, 30, 45, 60].includes(s.breaks) || s.customBreaks;
  keepHours();

  return `<div class="card sh-answer ${r.tier1 ? 'warn-soft' : 'ok'}">
      <div class="fov-top"><b class="sh-big">${hm(r.worked)}</b><span class="sh-small">${esc(T('worked'))}</span></div>
      <div class="hr-bar">${seg(r.regular, 'reg')}${seg(r.tier1, 't1')}${seg(r.tier2, 't2')}</div>
      <p class="sh-line">${esc(parts.join(' · '))}</p>
      ${r.pay != null ? `<p class="sh-line"><b>${esc(T('hr_pay'))}: ${money(r.pay)}</b>${r.pay > s.dayRate ? ` · ${esc(Tp('hr_pay_split', { day: money(s.dayRate), ot: money(r.pay - s.dayRate) }))}` : ''}</p>` : ''}
      <p class="sh-line">${esc(T('next_call'))}: <b>${r.nextCall}</b>${r.nextDay ? ` · ${esc(T('next_day'))}` : ''} <span class="tnote">(${esc(Tp('hr_rest', { h: s.turnaround }))})</span></p>
    </div>
    <div class="card sh-sec">
      <div class="tsub">${esc(T('hr_times'))}</div>
      <div class="hr-times">${field(T('call_time'), `<input type="time" data-f="call" value="${esc(s.call)}">`)}${field(T('wrap_time'), `<input type="time" data-f="wrap" value="${esc(s.wrap)}">`)}</div>
      <div class="sh-row"><span>${esc(T('hr_breaks'))}</span><div class="chips">${[0, 30, 45, 60].map(x => chip('data-hbreak', x, x ? `${x}′` : '0', !breakOther && x === s.breaks)).join('')}${chip('data-hbreak-custom', 1, esc(T('other_val')), breakOther)}</div></div>
      ${breakOther ? `<div class="sh-custom">${field(T('break_min'), numIn('breaks', s.breaks, { min: 0, max: 600, step: 5 }))}</div>` : ''}
    </div>
    ${more('hours', T('hr_rules_rate'), `${s.base}h · ${s.tier1pct}% / ${s.tier2pct}% · ${s.turnaround}h${s.dayRate ? ` · ₪${s.dayRate}` : ''}`, `<div class="card sh-sec">
      <div class="tsub">${esc(T('hr_rules'))}</div>
      <div class="sh-row"><span>${esc(T('hr_day'))}</span><div class="chips">${[8, 9, 10, 12].map(x => chip('data-hbase', x, `${x}h`, x === s.base)).join('')}</div></div>
      <div class="sh-row"><span>${esc(T('hr_first'))}</span><div class="chips">${[1, 2, 3].map(x => chip('data-ht1h', x, `${x}h`, x === s.tier1h)).join('')}${[125, 150].map(x => chip('data-ht1p', x, `${x}%`, x === s.tier1pct)).join('')}</div></div>
      <div class="sh-row"><span>${esc(T('hr_after'))}</span><div class="chips">${[150, 175, 200].map(x => chip('data-ht2p', x, `${x}%`, x === s.tier2pct)).join('')}</div></div>
      <div class="sh-row"><span>${esc(T('turnaround_h'))}</span><div class="chips">${[8, 10, 11, 12].map(x => chip('data-hturn', x, `${x}h`, x === s.turnaround)).join('')}</div></div>
    </div>
    <div class="card sh-sec">
      <div class="tsub" style="margin-top:12px">${esc(T('hr_rate'))}</div>
      <div class="sh-custom">${field('₪', numIn('dayRate', s.dayRate || '', { min: 0, max: 100000, step: 50 }))}</div>
      <p class="tnote">${esc(T('hr_rate_note'))}</p>
    </div>`)}`;
}

export { hoursTool as view };

export function bind(root, ctx, { T, lang, rewire }) {
  const hr = S.hours;
  root.querySelectorAll('[data-hbreak]').forEach(b => { b.onclick = () => { Object.assign(hr, { breaks: Number(b.dataset.hbreak), customBreaks: false }); ctx.render(); }; });
  root.querySelector('[data-hbreak-custom]')?.addEventListener('click', () => { hr.customBreaks = true; ctx.render(); });
  for (const [attr, key] of [['hbase', 'base'], ['ht1h', 'tier1h'], ['ht1p', 'tier1pct'], ['ht2p', 'tier2pct'], ['hturn', 'turnaround']]) {
    root.querySelectorAll(`[data-${attr}]`).forEach(b => { b.onclick = () => { hr[key] = Number(b.dataset[attr]); ctx.render(); }; });
  }
}
