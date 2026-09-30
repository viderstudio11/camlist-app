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

// Every run is marked Hebrew (w:lang bidi) with Arial in each font slot, so the complex-script text has
// a font and a language to shape with in any Word.
const FONT = { ascii: 'Arial', hAnsi: 'Arial', eastAsia: 'Arial', cs: 'Arial' };

// Widths are absolute (twentieths of a point). Word on Android reads percentage widths as next to nothing
// and lays each column out one letter wide; a fixed grid in twips reads the same everywhere.
const PAGE = { width: 11906, margin: 900 };   // A4
const USABLE = PAGE.width - PAGE.margin * 2;

// The document reads like the printed list: each department a shaded heading row with its count,
// then quantity first, the item (its brand already in the name), and the note in grey.
export async function exportDocx(project, groups, { lang, includeNotes = true, includeLinks = false, t }) {
  await loadScript('vendor/docx.umd.js');
  const D = globalThis.docx;
  const rtl = lang === 'he';
  const font = { ...FONT, hint: rtl ? 'cs' : undefined };
  const language = rtl ? { value: 'en-US', bidirectional: 'he-IL' } : { value: 'en-US' };
  const run = (text, o = {}) => new D.TextRun({ text: String(text ?? ''), rightToLeft: rtl, font, language,
    size: o.size || 22, bold: !!o.bold, color: o.color });
  const P = (text, o = {}) => new D.Paragraph({
    bidirectional: rtl,
    alignment: o.center ? D.AlignmentType.CENTER : o.end ? (rtl ? D.AlignmentType.LEFT : D.AlignmentType.RIGHT) : (rtl ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT),
    spacing: { after: 60, ...(o.spacing || {}) },
    children: [run(text, o)],
  });
  const cols = ['qty', 'item', ...(includeNotes ? ['notes'] : []), ...(includeLinks ? ['link'] : [])];
  const share = { qty: 10, item: 58, notes: 32, link: 30 };
  const sum = cols.reduce((n, k) => n + share[k], 0);
  const W = Object.fromEntries(cols.map(k => [k, Math.round((share[k] / sum) * USABLE)]));
  const cell = (children, o = {}) => new D.TableCell({
    width: { size: o.w, type: D.WidthType.DXA }, columnSpan: o.span,
    shading: o.shade ? { fill: o.shade, type: D.ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 50, bottom: 50, left: 110, right: 110 },
    verticalAlign: D.VerticalAlign.CENTER,
    borders: o.borders,
    children,
  });
  const none = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const hair = { style: D.BorderStyle.SINGLE, size: 2, color: 'DDDDDD' };
  const rowBorders = { top: none, left: none, right: none, bottom: hair };
  const headBorders = { top: none, left: none, right: none, bottom: { style: D.BorderStyle.SINGLE, size: 8, color: '111111' } };

  const children = [
    P(project.name || t('untitled'), { size: 40, bold: true }),
    ...(project.productionCo ? [P(project.productionCo, { size: 24, color: '444444' })] : []),
  ];
  const meta = [project.techManager ? `${t('tech_manager')}: ${project.techManager}` : '', formatDateRange(project.dateFrom, project.dateTo)].filter(Boolean).join('   ·   ');
  if (meta) children.push(P(meta, { color: '555555' }));
  const contact = [project.phone, project.email].filter(Boolean).join('   ·   ');
  if (contact) children.push(P(contact, { color: '777777', size: 20 }));
  if (project.notes) children.push(P(project.notes, { color: '555555' }));
  children.push(P('', { spacing: { after: 120 } }));

  const rows = [];
  for (const g of groups) {
    rows.push(new D.TableRow({ cantSplit: true, children: [
      cell([P(t(`dept_${g.key}`), { bold: true, size: 22 })], { w: USABLE, span: cols.length, shade: 'EFEFEF', borders: headBorders }),
    ] }));
    for (const { item, product } of g.entries) {
      const v = { qty: `${item.qty}×`, item: displayName(product), notes: item.note || '', link: product.url || '' };
      rows.push(new D.TableRow({ cantSplit: true, children: cols.map(k => cell([P(v[k], {
        bold: k === 'qty', color: k === 'notes' || k === 'link' ? '666666' : undefined, size: k === 'notes' || k === 'link' ? 19 : 22,
      })], { w: W[k], borders: rowBorders })) }));
    }
  }
  children.push(new D.Table({ width: { size: USABLE, type: D.WidthType.DXA }, columnWidths: cols.map(k => W[k]), layout: D.TableLayoutType.FIXED, visuallyRightToLeft: rtl, rows }));

  const doc = new D.Document({ creator: 'CamList', title: project.name || 'Gear list',
    styles: { default: { document: { run: { ...(font ? { font } : {}), language, size: 22 } } } },
    sections: [{ properties: { page: { size: { width: PAGE.width, height: 16838 }, margin: { top: 900, bottom: 900, left: PAGE.margin, right: PAGE.margin } } }, children }] });
  sortRunProperties(doc);
  const blob = await D.Packer.toBlob(doc);
  download(`${safeName(project.name)}-gearlist.docx`, blob);
}
