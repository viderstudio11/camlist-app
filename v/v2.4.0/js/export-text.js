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

// WhatsApp and mail read *text* as bold, so each department stands out as a heading with its count.
// Every item is a bullet with its quantity set apart ("8 ×") so it never runs into a number in the name
// ("160GB"), and a note sits on its own line under the item.
export function buildShareText(project, groups, { lang = 'he', includeNotes = true, includeLinks = false, now = new Date() } = {}) {
  const lines = [`*${project.name || t('untitled', {}, lang)}*`];
  if (project.productionCo) lines.push(project.productionCo);
  // Dates and phone numbers are wrapped in Unicode isolates so a Hebrew name beside them never flips them.
  const iso = (s) => (s ? `⁦${s}⁩` : '');
  const meta = [project.techManager ? `${t('tech_manager', {}, lang)}: ${project.techManager}` : '', iso(formatDateRange(project.dateFrom, project.dateTo))].filter(Boolean);
  if (meta.length) lines.push(meta.join(' · '));
  const contact = [project.phone, project.email].filter(Boolean).map(iso);
  if (contact.length) lines.push(contact.join(' · '));
  if (includeNotes && project.notes) lines.push(project.notes);
  for (const g of groups) {
    lines.push('', `*${deptLabel(g.key, lang)}*`);
    for (const { item, product } of g.entries) {
      lines.push(`• ${item.qty} × ${displayName(product)}`);
      if (includeNotes && item.note) lines.push(`   ↳ ${item.note}`);
      if (includeLinks && product.url) lines.push(`   ${product.url}`);
    }
  }
  // Only each item's quantity is a number on the page — no department counts and no total, which read as more quantities.
  lines.push('', `CamList · ${fmtDate(todayStr(now))}`);
  return lines.join('\n');
}
