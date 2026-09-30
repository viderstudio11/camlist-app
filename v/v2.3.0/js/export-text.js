import { t } from './i18n.js';

export function displayName(p) {
  const b = p.brandName;
  if (!b || p.brand === 'general' || p.name.toLowerCase().startsWith(b.toLowerCase())) return p.name;
  return `${b} ${p.name}`;
}

export const fmtDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
};
export function formatDateRange(from, to) {
  const a = fmtDate(from), b = fmtDate(to);
  return a && b ? `${a}–${b}` : a || b;
}
export const deptLabel = (key, lang) => t(`dept_${key}`, {}, lang);
export const todayStr = (now = new Date()) => now.toISOString().slice(0, 10);

export function buildShareText(project, groups, { lang = 'he', includeNotes = true, includeLinks = false, now = new Date() } = {}) {
  const lines = [project.name || t('untitled', {}, lang)];
  if (project.productionCo) lines.push(project.productionCo);
  const meta = [project.techManager ? `${t('tech_manager', {}, lang)}: ${project.techManager}` : '', formatDateRange(project.dateFrom, project.dateTo)].filter(Boolean);
  if (meta.length) lines.push(meta.join(' | '));
  const contact = [project.phone, project.email].filter(Boolean);
  if (contact.length) lines.push(contact.join(' · '));
  if (includeNotes && project.notes) lines.push(project.notes);
  let total = 0;
  for (const g of groups) {
    lines.push('', `${deptLabel(g.key, lang)}:`);
    for (const { item, product } of g.entries) {
      total += item.qty;
      const note = includeNotes && item.note ? `  (${item.note})` : '';
      lines.push(` ${item.qty}× ${displayName(product)}${note}`);
      if (includeLinks && product.url) lines.push(`   ${product.url}`);
    }
  }
  lines.push('', '—', `${t('total', {}, lang)} ${t('items_count', { n: total }, lang)} · CamList · ${fmtDate(todayStr(now))}`);
  return lines.join('\n');
}
