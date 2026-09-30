import { loadScript, download } from './ui/dom.js';
import { displayName, formatDateRange } from './export-text.js';
import { safeName } from './export-xlsx.js';

// OOXML defines the children of <w:rPr> as a sequence, so their order is part of the format.
// The bundled library appends them in the order it happens to check its options, which puts
// <w:rFonts> last. Word repairs that silently; Google Docs and several mobile viewers do not —
// they drop the whole block, and with it the font and the right-to-left flag, so Hebrew comes
// out as empty boxes. Sorting the properties into schema order before packing fixes it at source.
const RPR_ORDER = ['w:rStyle', 'w:rFonts', 'w:b', 'w:bCs', 'w:i', 'w:iCs', 'w:caps', 'w:smallCaps',
  'w:strike', 'w:dstrike', 'w:outline', 'w:shadow', 'w:emboss', 'w:imprint', 'w:noProof',
  'w:snapToGrid', 'w:vanish', 'w:webHidden', 'w:color', 'w:spacing', 'w:w', 'w:kern', 'w:position',
  'w:sz', 'w:szCs', 'w:highlight', 'w:u', 'w:effect', 'w:bdr', 'w:shd', 'w:fitText', 'w:vertAlign',
  'w:rtl', 'w:cs', 'w:em', 'w:lang', 'w:eastAsianLayout', 'w:specVanish', 'w:oMath'];
const rprRank = (el) => {
  const i = RPR_ORDER.indexOf(el?.rootKey);
  return i === -1 ? RPR_ORDER.length : i;
};

// Walks whatever the library built and reorders every run-properties block it finds.
// The document does not keep its runs under a single known key, so this visits every object
// property rather than assuming a shape the library is free to change.
function sortRunProperties(node, seen = new Set()) {
  if (!node || typeof node !== 'object' || seen.has(node)) return;
  seen.add(node);
  if (node.rootKey === 'w:rPr' && Array.isArray(node.root)) {
    node.root.sort((a, b) => rprRank(a) - rprRank(b));
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') sortRunProperties(value, seen);
  }
}

export async function exportDocx(project, groups, { lang, includeNotes = true, includeLinks = false, t }) {
  await loadScript('vendor/docx.umd.js');
  const D = globalThis.docx;
  const rtl = lang === 'he';
  const P = (text, o = {}) => new D.Paragraph({
    bidirectional: rtl,
    alignment: o.center ? D.AlignmentType.CENTER : (rtl ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT),
    spacing: { after: 80 }, ...(o.para || {}),
    children: [new D.TextRun({ text: String(text ?? ''), rightToLeft: rtl,
      font: { ascii: 'Arial', cs: 'Arial', eastAsia: 'Arial', hAnsi: 'Arial' },
      size: o.size || 22, bold: !!o.bold, color: o.color })],
  });
  const cell = (text, o = {}) => new D.TableCell({
    width: { size: o.w, type: D.WidthType.PERCENTAGE }, shading: o.shade ? { fill: o.shade } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [P(text, { bold: o.bold, size: o.size || 20, color: o.color })],
  });
  const cols = [{ k: 'brand', w: 18, label: t('brand') }, { k: 'item', w: 44, label: t('item') }, { k: 'qty', w: 8, label: t('qty') }];
  if (includeNotes) cols.push({ k: 'notes', w: 30, label: t('notes') });
  if (includeLinks) cols.push({ k: 'link', w: 30, label: t('link') });

  const children = [
    P(project.name || t('untitled'), { size: 40, bold: true, center: true }),
    ...(project.productionCo ? [P(project.productionCo, { size: 26, bold: true, color: '555555', center: true })] : []),
    P([project.techManager ? `${t('tech_manager')}: ${project.techManager}` : '', formatDateRange(project.dateFrom, project.dateTo)].filter(Boolean).join('   |   '), { color: '555555' }),
  ];
  const contact = [project.phone, project.email].filter(Boolean).join('   ·   ');
  if (contact) children.push(P(contact, { color: '555555' }));
  if (project.notes) children.push(P(project.notes, { color: '555555' }));
  let total = 0;
  for (const g of groups) {
    children.push(P(t(`dept_${g.key}`), { size: 26, bold: true, color: 'E0262B', para: { spacing: { before: 240, after: 100 } } }));
    const rows = [new D.TableRow({ tableHeader: true, children: cols.map(c => cell(c.label, { w: c.w, bold: true, shade: 'EEEEEE' })) })];
    for (const { item, product } of g.entries) {
      total += item.qty;
      const v = { brand: product.brandName || '', item: displayName(product), qty: item.qty, notes: item.note || '', link: product.url || '' };
      rows.push(new D.TableRow({ children: cols.map(c => cell(v[c.k], { w: c.w, bold: c.k === 'qty' })) }));
    }
    children.push(new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE }, visuallyRightToLeft: rtl, rows }));
  }
  children.push(P(`${t('total')}: ${t('items_count', { n: total })}`, { bold: true, size: 24, para: { spacing: { before: 240 } } }));

  const doc = new D.Document({ creator: 'CamList', title: project.name || 'Gear list',
    styles: { default: { document: { run: { font: { ascii: 'Arial', cs: 'Arial', eastAsia: 'Arial', hAnsi: 'Arial' }, size: 22 } } } },
    sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 900, right: 900 } } }, children }] });
  sortRunProperties(doc);
  const blob = await D.Packer.toBlob(doc);
  download(`${safeName(project.name)}-gearlist.docx`, blob);
}
