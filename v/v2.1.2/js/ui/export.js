import { esc, icons, toast } from './dom.js';
import { groupByDept, totalQty } from '../list.js';
import { buildShareText } from '../export-text.js';
import { exportXlsx } from '../export-xlsx.js';
import { exportDocx } from '../export-docx.js';
import { renderPrint } from '../export-print.js';

const opts = { includeNotes: true, includeLinks: false, includeImages: false };
let docLang = null; // null = follow the UI language
// Each line gets dir=auto so mixed Hebrew/English lines render the way WhatsApp/mail clients show them.
const previewHTML = (txt) => txt.split('\n').map(l => `<div dir="auto">${esc(l) || '&nbsp;'}</div>`).join('');

export function render(ctx, { id, print }, root) {
  const { store, t } = ctx;
  const p = store.getProject(id);
  const groups = groupByDept(p.items, ctx.resolve, ctx.deptOrder());
  if (print) return renderPrint(ctx, p, groups, root, { ...opts, lang: docLang || ctx.lang() });
  ctx.setTopbar({ title: esc(t('export')), back: `#/p/${id}` });
  const lang = () => docLang || ctx.lang();
  const text = () => buildShareText(p, groups, { lang: lang(), ...opts });
  root.innerHTML = `
    <div class="section-title">${t('preview')} <span class="count">${totalQty(p.items)}</span></div>
    <div class="preview" data-preview>${previewHTML(text())}</div>
    <div class="card" style="margin-top:12px;padding:12px 16px 4px">
      <div class="doclang"><span>${t('doc_lang')}</span><div class="seg">
        <button class="${lang() === 'he' ? 'active' : ''}" data-doclang="he">עברית</button>
        <button class="${lang() === 'en' ? 'active' : ''}" data-doclang="en">English</button>
      </div></div>
      <label class="switch"><span>${t('include_notes')}</span><input type="checkbox" data-opt="includeNotes" ${opts.includeNotes ? 'checked' : ''}></label>
      <label class="switch"><span>${t('include_links')}</span><input type="checkbox" data-opt="includeLinks" ${opts.includeLinks ? 'checked' : ''}></label>
      <label class="switch" style="border:0"><span>${t('include_images')}</span><input type="checkbox" data-opt="includeImages" ${opts.includeImages ? 'checked' : ''}></label>
    </div>
    <div class="export-grid">
      <button class="btn primary" data-share>${icons.share}${t('share')}<small>WhatsApp · Mail</small></button>
      <button class="btn" data-xlsx>📊 ${t('excel')}<small>.xlsx</small></button>
      <button class="btn" data-docx>📝 ${t('word')}<small>.docx</small></button>
      <button class="btn" data-pdf>🖨️ ${t('pdf')}<small>${t('pdf_hint')}</small></button>
    </div>`;
  root.querySelectorAll('[data-opt]').forEach(c => { c.onchange = () => { opts[c.dataset.opt] = c.checked; root.querySelector('[data-preview]').innerHTML = previewHTML(text()); }; });
  root.querySelectorAll('[data-doclang]').forEach(b => { b.onclick = () => { docLang = b.dataset.doclang; render(ctx, { id }, root); }; });
  const copy = async (txt) => { await navigator.clipboard.writeText(txt); toast(t('copied'), { kind: 'ok' }); };
  root.querySelector('[data-share]').onclick = async () => {
    const txt = text();
    try {
      if (navigator.share) await navigator.share({ title: p.name, text: txt });
      else await copy(txt);
    } catch (e) {
      if (e?.name === 'AbortError') return;
      try { await copy(txt); } catch { toast(t('export_failed'), { kind: 'err' }); }
    }
  };
  const run = (fn) => async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    try { await fn(p, groups, { lang: lang(), ...opts, t: (k, prm) => t(k, prm, lang()) }); }
    catch (err) { console.error(err); toast(t('export_failed'), { kind: 'err' }); }
    finally { btn.disabled = false; }
  };
  root.querySelector('[data-xlsx]').onclick = run(exportXlsx);
  root.querySelector('[data-docx]').onclick = run(exportDocx);
  root.querySelector('[data-pdf]').onclick = () => ctx.navigate(`#/p/${id}/print`);
}
