import { t } from './i18n.js';

// Who the person named on the list is: the 1st AC by default, or the focus puller, or the DP.
export const ROLES = ['ac', 'fp', 'dp'];
export const roleKey = (role) => ({ fp: 'role_fp', dp: 'role_dp' }[role] || 'tech_manager');

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
  // Dates and phone numbers are wrapped in Unicode isolates so a Hebrew name beside them never flips them.
  const iso = (s) => (s ? `⁦${s}⁩` : '');
  // Free text (names, notes) is isolated too, in its own first-letter direction: a Hebrew note inside an
  // English list, or an English one inside a Hebrew list, reads in its own order and does not reorder the line.
  const own = (s) => (s ? `⁨${s}⁩` : '');
  const lines = [`*${project.name || t('untitled', {}, lang)}*`];
  if (project.productionCo) lines.push(own(project.productionCo));
  const meta = [project.techManager ? `${t(roleKey(project.role), {}, lang)}: ${own(project.techManager)}` : '', iso(formatDateRange(project.dateFrom, project.dateTo))].filter(Boolean);
  if (meta.length) lines.push(meta.join(' · '));
  const contact = [project.phone, project.email].filter(Boolean).map(iso);
  if (contact.length) lines.push(contact.join(' · '));
  if (includeNotes && project.notes) lines.push(own(project.notes));
  for (const g of groups) {
    lines.push('', `*${deptLabel(g.key, lang)}*`);
    for (const { item, product, accessory } of g.entries) {
      // an accessory picked for the item above is set in under it
      const pad = accessory ? '   ' : '';
      lines.push(`${pad}${accessory ? '◦' : '•'} ${item.qty} × ${own(displayName(product))}`);
      if (includeNotes && item.note) lines.push(`${pad}   ↳ ${own(item.note)}`);
      if (includeLinks && product.url) lines.push(`${pad}   ${product.url}`);
    }
  }
  // Only each item's quantity is a number on the page — no department counts and no total, which read as more quantities.
  lines.push('', `Cam2List · ${fmtDate(todayStr(now))}`);
  // Each line takes its direction from its first letter — "• 1 × Sony FX6" would run left-to-right inside
  // a Hebrew list. An invisible mark (RLM / LRM) at the start keeps every line in the document's direction.
  // *Headings* stay bare: a mark before the asterisk would stop WhatsApp making them bold.
  const mark = lang === 'he' ? '‏' : '‎';
  return lines.map(l => (!l || /^\*.*\*$/.test(l) ? l : mark + l)).join('\n');
}
