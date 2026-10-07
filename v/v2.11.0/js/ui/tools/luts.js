// LUT bank: the makers' official LUT pages by camera (reached from Downloads).
import { esc } from '../dom.js';
import { S, D } from './shared.js';

// Maker, then camera, then one answer: the log it records, the LUT to monitor with, and the maker's own
// download. A camera that records two logs (Canon Log 2 and 3) gets both, the current one first.
function lutsTool(T, lang) {
  const logs = D.lut.logs || [];
  if (!logs.length) return `<p class="tnote">—</p>`;
  const Tp = (k, p) => T(k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
  const chip = (attr, val, label, on) => `<button class="chip pick ${on ? 'on' : ''}" ${attr}="${esc(val)}">${label}</button>`;

  const brands = [...new Set(logs.map(g => g.brand))];
  const brand = brands.includes(S.luts.brand) ? S.luts.brand : brands[0];
  const models = [...new Set(logs.filter(g => g.brand === brand).flatMap(g => g.cameras.map(c => c.name)))];
  const model = models.includes(S.luts.model) ? S.luts.model : '';
  const hits = model ? logs.filter(g => g.brand === brand && g.cameras.some(c => c.name === model)) : [];

  const answerFor = (g, i) => {
    const cam = g.cameras.find(c => c.name === model);
    const url = cam?.url || g.url;
    return `<div class="card sh-answer ok lut-answer ${i ? 'second' : ''}">
      ${i ? `<div class="tsub">${esc(T('lut_also'))}</div>` : `<p class="sh-small">${esc(Tp('lut_records', { cam: model }))}</p>`}
      <b class="lut-log">${esc(g.name)}</b>
      <p class="sh-line">${esc(T('lut_monitor'))}: <b>${esc(g.monitor)}</b></p>
      ${i && url === (hits[0].cameras.find(c => c.name === model)?.url || hits[0].url) ? '' : `<a class="btn primary lut-dl" href="${esc(url)}" target="_blank" rel="noopener">${esc(T('lut_download'))} ↗</a>`}
      ${(lang === 'he' ? g.howHe : g.howEn) ? `<p class="tnote">${esc(lang === 'he' ? g.howHe : g.howEn)}</p>` : ''}
      <details class="src-more">
        <summary><span class="src-badge ok">${esc(T('src_official'))}</span> ${esc(g.source)} <span class="src-i">ⓘ</span></summary>
        ${(lang === 'he' ? g.noteHe : g.noteEn) ? `<p>${esc(lang === 'he' ? g.noteHe : g.noteEn)}</p>` : ''}
        ${g.luts?.length ? `<p>${esc(T('lut_files'))}: ${g.luts.map(esc).join(' · ')}</p>` : ''}
        <p>${esc(T('lut_disclaimer'))}</p>
      </details>
    </div>`;
  };

  const answer = hits.length ? hits.map(answerFor).join('')
    : `<div class="card sh-answer warn"><p class="sh-line">${esc(T('lut_pick'))}</p></div>`;
  return `${answer}
    <div class="card sh-sec">
      <div class="tsub">1 · ${esc(T('camera_step'))}</div>
      <div class="chips">${brands.map(x => chip('data-lutbrand', x, esc(x), x === brand)).join('')}</div>
      <div class="chips fov-models">${models.map(m => chip('data-lutmodel', m, esc(m), m === model)).join('')}</div>
    </div>`;
}

export { lutsTool as view };

export function bind(root, ctx, { T, lang, rewire }) {
  root.querySelectorAll('[data-lutbrand]').forEach(b => { b.onclick = () => { S.luts.brand = b.dataset.lutbrand; S.luts.model = ''; ctx.render(); }; });
  root.querySelectorAll('[data-lutmodel]').forEach(b => { b.onclick = () => { S.luts.model = b.dataset.lutmodel; ctx.render(); }; });
}
