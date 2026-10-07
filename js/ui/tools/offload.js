// Offload: how long copying the day takes, from the reader, the port and the drive.
import { esc } from '../dom.js';
import { offload, transfer, READERS, DRIVES, PORTS } from '../../tools/convert.js';
import { num, hm } from '../../format.js';
import { S, more, field, numIn } from './shared.js';

const GB_CHIPS = [256, 512, 1000, 2000, 4000];

function offloadTool(T, lang) {
  const s = S.offload;
  const Tp = (k, p) => T(k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
  const chip = (attr, val, label, on) => `<button class="chip pick ${on ? 'on' : ''}" ${attr}="${esc(val)}">${label}</button>`;
  const gb = (x) => (x >= 1000 ? `${num(x / 1000, x % 1000 ? 2 : 0)} TB` : `${num(x, 0)} GB`);
  const name = (x) => (lang === 'he' ? x.he : x.en);

  // One end is the card in its reader, the other the drive; the slower one sets the pace.
  const rd = READERS.find(x => x.id === s.reader) || READERS[0];
  const dv = DRIVES.find(x => x.id === s.drive) || DRIVES[0];
  const readMBs = s.readOther ? s.readMBs : rd.mbPerSec;
  const writeMBs = s.writeOther ? s.writeMBs : dv.mbPerSec;
  const port = (PORTS.find(x => x.id === s.port) || PORTS[2]).mbPerSec;
  const t = transfer(readMBs, writeMBs, { readers: s.readers, port });
  const r = offload({ gb: s.gb, mbPerSec: t.mbPerSec, copies: s.copies, verify: s.verify });
  // one card at a time, as it comes off the camera during the day
  const perCard = s.cardGb ? offload({ gb: s.cardGb, mbPerSec: transfer(readMBs, writeMBs, { port }).mbPerSec, copies: s.copies, verify: s.verify }).totalHours : 0;
  const srcName = `${s.readers > 1 ? `${s.readers} × ` : ''}${s.readOther ? `${num(readMBs, 0)} MB/s` : `${name(rd)} (${num(readMBs, 0)} MB/s)`}`;
  const dstName = s.writeOther ? `${num(writeMBs, 0)} MB/s` : `${name(dv)} (${num(writeMBs, 0)} MB/s)`;
  const sources = [!s.readOther && rd.src, !s.writeOther && dv.src].filter(Boolean);

  const gbOther = !GB_CHIPS.includes(s.gb) || s.customGb;
  const answer = `<div class="card sh-answer ok">
    <div class="fov-top"><b class="sh-big">${r.totalHours ? hm(r.totalHours) : '—'}</b><span class="sh-small">${esc(Tp('off_for', { gb: gb(s.gb) }))}</span></div>
    <p class="sh-line">${esc(Tp('off_sentence', { gb: gb(s.gb), src: srcName, dst: dstName, n: s.copies }))} ${esc(T(s.verify ? 'off_verify' : 'off_noverify'))}</p>
    ${r.passes ? `<div class="passes">${Array.from({ length: r.passes }, (_, i) => {
      const check = s.verify && i % 2;
      return `<span class="pass ${check ? 'verify' : ''}">${check ? '✓' : Math.floor(i / (s.verify ? 2 : 1)) + 1}</span>`;
    }).join('')}</div>
    <p class="tnote">${esc(Tp('off_each', { n: r.passes, t: hm(r.perCopyHours), space: gb(r.totalGb) }))}</p>` : ''}
    ${perCard ? `<p class="sh-line">${esc(Tp('off_per_card', { card: gb(s.cardGb), t: hm(perCard) }))}</p>` : ''}
    <p class="sh-line ${t.limit === 'source' ? '' : 'warn'}">${esc(T({ source: s.readers > 1 ? 'off_limit_src2' : 'off_limit_src', dest: 'off_limit_dst', port: 'off_limit_port' }[t.limit]))}</p>
    <details class="src-more">
      <summary><span class="src-badge ok">${esc(T('off_maker'))}</span> ${esc(T('off_caveat'))} <span class="src-i">ⓘ</span></summary>
      ${sources.map(x => `<p>${esc(x)}</p>`).join('')}
    </details>
  </div>`;

  return `${answer}
    <div class="card sh-sec">
      <div class="tsub">1 · ${esc(T('footage'))}</div>
      ${s.fromMedia ? `<p class="tnote">${esc(T('off_from_media'))}</p>` : ''}
      <div class="chips">${GB_CHIPS.map(x => chip('data-ogb', x, gb(x), !gbOther && x === s.gb)).join('')}${chip('data-ogb-custom', 1, esc(T('other_val')), gbOther)}</div>
      ${gbOther ? `<div class="sh-custom">${field('GB', numIn('gb', s.gb, { min: 1, max: 200000, step: 1 }))}</div>` : ''}
    </div>
    <div class="card sh-sec">
      <div class="tsub">2 · ${esc(T('off_source'))}</div>
      <div class="chips">${READERS.map(x => chip('data-oread', x.id, esc(name(x)), !s.readOther && x.id === rd.id)).join('')}${chip('data-oread-custom', 1, esc(T('other_val')), s.readOther)}</div>
      ${s.readOther ? `<div class="sh-custom">${field('MB/s', numIn('readMBs', s.readMBs, { min: 1, max: 10000, step: 10 }))}</div>` : ''}
    </div>
    <div class="card sh-sec">
      <div class="tsub">3 · ${esc(T('drive'))}</div>
      <div class="chips">${DRIVES.map(x => chip('data-odrive', x.id, esc(name(x)), !s.writeOther && x.id === dv.id)).join('')}${chip('data-odrive-custom', 1, esc(T('other_val')), s.writeOther)}</div>
      ${s.writeOther ? `<div class="sh-custom">${field('MB/s', numIn('writeMBs', s.writeMBs, { min: 1, max: 10000, step: 10 }))}</div>` : ''}
    </div>
    ${more('offload', T('off_more'), `${s.copies}× · ${s.verify ? T('verify') : '—'} · ${s.readers}× · ${(PORTS.find(x => x.id === s.port) || {}).label || ''}`, `<div class="card sh-sec">
      <div class="sh-row"><span>${esc(T('off_readers'))}</span><div class="chips">${[1, 2].map(x => chip('data-oreaders', x, String(x), x === s.readers)).join('')}</div></div>
      <div class="sh-row"><span>${esc(T('off_port'))}</span><div class="chips">${PORTS.map(x => chip('data-oport', x.id, esc(x.label), x.id === s.port)).join('')}</div></div>
      <div class="tsub" style="margin-top:10px">${esc(T('copies'))}</div>
      <div class="chips">${[1, 2, 3].map(x => chip('data-ocopies', x, String(x), x === s.copies)).join('')}</div>
      <label class="switch"><span>${esc(T('verify'))}</span><input type="checkbox" data-f="verify" ${s.verify ? 'checked' : ''}></label>
    </div>`)}`;
}

export { offloadTool as view };

export function bind(root, ctx, { T, lang, rewire }) {
  const off = S.offload;
  root.querySelectorAll('[data-ogb]').forEach(b => { b.onclick = () => { Object.assign(off, { gb: Number(b.dataset.ogb), customGb: false, fromMedia: false }); ctx.render(); }; });
  root.querySelector('[data-ogb-custom]')?.addEventListener('click', () => { off.customGb = true; ctx.render(); });
  root.querySelectorAll('[data-oread]').forEach(b => { b.onclick = () => { Object.assign(off, { reader: b.dataset.oread, readOther: false }); ctx.render(); }; });
  root.querySelector('[data-oread-custom]')?.addEventListener('click', () => { off.readOther = true; ctx.render(); });
  root.querySelectorAll('[data-odrive]').forEach(b => { b.onclick = () => { Object.assign(off, { drive: b.dataset.odrive, writeOther: false }); ctx.render(); }; });
  root.querySelector('[data-odrive-custom]')?.addEventListener('click', () => { off.writeOther = true; ctx.render(); });
  root.querySelectorAll('[data-oreaders]').forEach(b => { b.onclick = () => { off.readers = Number(b.dataset.oreaders); ctx.render(); }; });
  root.querySelectorAll('[data-oport]').forEach(b => { b.onclick = () => { off.port = b.dataset.oport; ctx.render(); }; });
  root.querySelectorAll('[data-ocopies]').forEach(b => { b.onclick = () => { off.copies = Number(b.dataset.ocopies); ctx.render(); }; });
}
