import { esc, icons, toast } from './dom.js';
import { groupByDept } from '../list.js';
import { buildShareText, displayName, formatDateRange, roleKey } from '../export-text.js';
import { exportXlsx } from '../export-xlsx.js';
import { feel } from '../feel.js';
import { exportDocx } from '../export-docx.js';
import { renderPrint } from '../export-print.js';

const opts = { includeNotes: true, includeLinks: false, includeImages: false };
let docLang = null;   // null = follow the UI language
let format = 'text';  // text · pdf · xlsx · docx
const FORMATS = [['text', null], ['pdf', 'PDF'], ['xlsx', 'Excel'], ['docx', 'Word']];

// The share text as WhatsApp shows it: *bold* headings, one line per item, notes indented under it.
const textPreview = (txt, previewDir) => txt.split('\n').map(l0 => {
  const l = l0.replace(/^[‎‏]/, '');   // the direction mark is for the chat app; the preview sets dir itself
  const bold = /^\*(.+)\*$/.exec(l);
  const cls = bold ? 'tx-h' : l.trim().startsWith('◦') ? 'tx-acc' : l.startsWith('      ') ? 'tx-note deep' : l.startsWith('   ') ? 'tx-note' : '';
  return `<div dir="${previewDir}" class="${cls}">${bold ? `<b>${esc(bold[1])}</b>` : esc(l.trim()) || '&nbsp;'}</div>`;
}).join('');

// PDF, Word and Excel share one picture of the document: departments with their counts, quantity first.
function docPreview(p, groups, t, sheet) {
  // each detail isolated, the dates left to right, so a Hebrew name beside them never flips them
  const range = formatDateRange(p.dateFrom, p.dateTo);
  const meta = [p.productionCo && `<bdi>${esc(p.productionCo)}</bdi>`, p.techManager && `${esc(t(roleKey(p.role)))}: <bdi>${esc(p.techManager)}</bdi>`, range && `<bdi dir="ltr">${esc(range)}</bdi>`].filter(Boolean);
  const rows = groups.map(g => {
    const items = g.entries.map(({ item, product, accessory }) => `
      <div class="dp-row ${accessory ? 'acc' : ''}"><b>${item.qty}×</b><span><bdi>${esc(displayName(product))}</bdi>${opts.includeNotes && item.note ? `<small><bdi>${esc(item.note)}</bdi></small>` : ''}</span></div>`).join('');
    return `<div class="dp-dept"><span>${esc(t(`dept_${g.key}`))}</span></div>${items}`;
  }).join('');
  return `<div class="docprev ${sheet ? 'sheet' : ''}">
    ${sheet ? '' : '<div class="dp-stripe"></div>'}
    <div class="dp-title"><bdi>${esc(p.name || t('untitled'))}</bdi></div>
    ${meta.length ? `<div class="dp-meta">${meta.join('  ·  ')}</div>` : ''}
    ${rows}
    <div class="dp-foot">Cam2List</div>
  </div>`;
}

// Pick a format, see that format, one action. The options sit folded underneath.
export function render(ctx, { id, print }, root) {
  const { store } = ctx;
  const p = store.getProject(id);
  const groups = groupByDept(p.items, ctx.resolve, ctx.deptOrder());
  if (print) return renderPrint(ctx, p, groups, root, { ...opts, lang: docLang || ctx.lang() });
  const T = ctx.t;                                  // the controls speak the screen's language
  ctx.setTopbar({ title: esc(T('export')), back: `#/p/${id}` });
  const lang = () => docLang || ctx.lang();
  const t = (k, prm) => ctx.t(k, prm, lang());      // the preview speaks the document's
  const text = () => buildShareText(p, groups, { lang: lang(), ...opts });
  const ACTION = { text: T('share'), pdf: T('save_pdf'), xlsx: T('download_xlsx'), docx: T('download_docx') };
  const HINT = { text: T('fmt_text_hint'), pdf: T('fmt_pdf_hint'), xlsx: T('fmt_xlsx_hint'), docx: T('fmt_docx_hint') };
  const optLine = [lang() === 'he' ? 'עברית' : 'English', opts.includeNotes && T('include_notes'), opts.includeLinks && T('include_links'), opts.includeImages && T('include_images')].filter(Boolean).join(' · ');

  root.innerHTML = `
    <div class="card sh-sec ex-formats">
      <div class="chips">${FORMATS.map(([k, l]) => `<button class="chip pick ${format === k ? 'on' : ''}" data-fmt="${k}">${esc(l || T('fmt_text'))}</button>`).join('')}</div>
      <p class="tnote">${esc(HINT[format])}</p>
    </div>
    <div class="ex-preview" dir="${lang() === 'he' ? 'rtl' : 'ltr'}">${format === 'text' ? `<div class="preview tx">${textPreview(text(), lang() === 'he' ? 'rtl' : 'ltr')}</div>` : docPreview(p, groups, t, format === 'xlsx')}</div>
    <button class="btn primary block ex-go" data-go>${format === 'text' ? icons.share : icons.check}${esc(ACTION[format])}</button>
    <details class="card ex-opts">
      <summary>${esc(T('ex_options'))} <span>${esc(optLine)}</span></summary>
      <div class="doclang"><span>${T('doc_lang')}</span><div class="seg">
        <button class="${lang() === 'he' ? 'active' : ''}" data-doclang="he">עברית</button>
        <button class="${lang() === 'en' ? 'active' : ''}" data-doclang="en">English</button>
      </div></div>
      <label class="switch"><span>${T('include_notes')}</span><input type="checkbox" data-opt="includeNotes" ${opts.includeNotes ? 'checked' : ''}></label>
      <label class="switch"><span>${T('include_links')}</span><input type="checkbox" data-opt="includeLinks" ${opts.includeLinks ? 'checked' : ''}></label>
      <label class="switch" style="border:0"><span>${T('include_images')}</span><input type="checkbox" data-opt="includeImages" ${opts.includeImages ? 'checked' : ''}></label>
    </details>`;

  const again = (keepOpen) => { render(ctx, { id }, root); if (keepOpen) root.querySelector('.ex-opts').open = true; };
  root.querySelectorAll('[data-fmt]').forEach(b => { b.onclick = () => { format = b.dataset.fmt; again(); }; });
  root.querySelectorAll('[data-opt]').forEach(c => { c.onchange = () => { opts[c.dataset.opt] = c.checked; again(true); }; });
  root.querySelectorAll('[data-doclang]').forEach(b => { b.onclick = () => { docLang = b.dataset.doclang; again(true); }; });
  const copy = async (txt) => { await navigator.clipboard.writeText(txt); toast(T('copied'), { kind: 'ok' }); };
  const share = async () => {
    const txt = text();
    try { if (navigator.share) await navigator.share({ title: p.name, text: txt }); else await copy(txt); }
    catch (err) { if (err?.name === 'AbortError') return; try { await copy(txt); } catch { toast(T('export_failed'), { kind: 'err' }); } }
  };
  const file = (fn) => async (btn) => {
    btn.disabled = true;
    try { await fn(p, groups, { lang: lang(), ...opts, t }); feel.clap(); }
    catch (err) { console.error(err); toast(T('export_failed'), { kind: 'err' }); }
    finally { btn.disabled = false; }
  };
  const go = { text: share, pdf: () => { feel.clap(); ctx.navigate(`#/p/${id}/print`); }, xlsx: file(exportXlsx), docx: file(exportDocx) };
  root.querySelector('[data-go]').onclick = (e) => go[format](e.currentTarget);
}
