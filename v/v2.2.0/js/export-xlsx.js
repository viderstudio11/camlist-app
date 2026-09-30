import { loadScript, download } from './ui/dom.js';
import { displayName, formatDateRange } from './export-text.js';

export const safeName = (s) => (String(s || '').trim() || 'gearlist').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 60);

export async function exportXlsx(project, groups, { lang, includeNotes = true, includeLinks = true, t }) {
  await loadScript('vendor/xlsx.full.min.js');
  const X = globalThis.XLSX;
  const rows = [
    [project.name || t('untitled')],
    [project.productionCo || ''],
    [`${t('tech_manager')}: ${project.techManager || ''}`, formatDateRange(project.dateFrom, project.dateTo)],
    [[project.phone, project.email].filter(Boolean).join(' · ')],
    [project.notes || ''],
    [],
  ];
  const head = [t('department'), t('brand'), t('item'), t('qty')];
  if (includeNotes) head.push(t('notes'));
  if (includeLinks) head.push(t('link'));
  rows.push(head);
  let total = 0;
  for (const g of groups) {
    rows.push([t(`dept_${g.key}`)]);
    for (const { item, product } of g.entries) {
      total += item.qty;
      const r = [t(`dept_${g.key}`), product.brandName || '', displayName(product), item.qty];
      if (includeNotes) r.push(item.note || '');
      if (includeLinks) r.push(product.url || '');
      rows.push(r);
    }
  }
  rows.push([], [t('total'), '', '', total]);
  const ws = X.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 48 }, { wch: 6 }, { wch: 28 }, { wch: 40 }];
  if (lang === 'he') ws['!views'] = [{ RTL: true }];
  const wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, ws, 'Gear List');
  const out = X.write(wb, { bookType: 'xlsx', type: 'array' });
  download(`${safeName(project.name)}-gearlist.xlsx`, new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
