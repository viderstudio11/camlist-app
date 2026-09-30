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

// Fonts. Word on Android carries a Latin-only Arial and does not fall back for Hebrew, so a run whose
// complex-script font is Arial draws empty boxes there. The complex-script slot gets a Hebrew font the
// Office apps fetch on demand, and every run says it is Hebrew (w:lang bidi), which is what the mobile
// apps read to pick a font. `FONT_VARIANT` exists only while the fix is being tried on a phone.
export const FONT_VARIANTS = {
  a: { latin: 'Arial', cs: 'Arial' },
  b: { latin: 'Arial', cs: 'David' },
  c: { latin: null, cs: null },
};
let FONT_VARIANT = 'b';
export const setFontVariant = (v) => { FONT_VARIANT = v; };

// The document reads like the printed list: each department a shaded heading row with its count,
// then quantity first, the item (its brand already in the name), and the note in grey.
export async function exportDocx(project, groups, { lang, includeNotes = true, includeLinks = false, t }) {
  await loadScript('vendor/docx.umd.js');
  const D = globalThis.docx;
  const rtl = lang === 'he';
  const F = FONT_VARIANTS[FONT_VARIANT];
  const font = F.latin ? { ascii: F.latin, hAnsi: F.latin, eastAsia: F.latin, cs: F.cs, hint: rtl ? 'cs' : undefined } : undefined;
  const language = rtl ? { value: 'en-US', bidirectional: 'he-IL' } : { value: 'en-US' };
  const run = (text, o = {}) => new D.TextRun({ text: String(text ?? ''), rightToLeft: rtl, font, language,
    size: o.size || 22, bold: !!o.bold, color: o.color });
  const P = (text, o = {}) => new D.Paragraph({
    bidirectional: rtl,
    alignment: o.center ? D.AlignmentType.CENTER : o.end ? (rtl ? D.AlignmentType.LEFT : D.AlignmentType.RIGHT) : (rtl ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT),
    spacing: { after: 60, ...(o.spacing || {}) },
    children: [run(text, o)],
  });
  const W = { qty: 10, item: includeNotes ? 58 : 90, notes: 32, link: 30 };
  const cell = (children, o = {}) => new D.TableCell({
    width: { size: o.w, type: D.WidthType.PERCENTAGE }, columnSpan: o.span,
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
  const cols = ['qty', 'item', ...(includeNotes ? ['notes'] : []), ...(includeLinks ? ['link'] : [])];

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
  let total = 0;
  for (const g of groups) {
    const count = g.entries.reduce((n, e) => n + e.item.qty, 0);
    rows.push(new D.TableRow({ cantSplit: true, children: [
      cell([P(`${t(`dept_${g.key}`)}  ·  ${count}`, { bold: true, size: 22 })], { w: 100, span: cols.length, shade: 'EFEFEF', borders: headBorders }),
    ] }));
    for (const { item, product } of g.entries) {
      total += item.qty;
      const v = { qty: `${item.qty}×`, item: displayName(product), notes: item.note || '', link: product.url || '' };
      rows.push(new D.TableRow({ cantSplit: true, children: cols.map(k => cell([P(v[k], {
        bold: k === 'qty', color: k === 'notes' || k === 'link' ? '666666' : undefined, size: k === 'notes' || k === 'link' ? 19 : 22,
      })], { w: W[k], borders: rowBorders })) }));
    }
  }
  children.push(new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE }, visuallyRightToLeft: rtl, rows }));
  children.push(P(t('items_count', { n: total }), { bold: true, spacing: { before: 200 } }));

  const doc = new D.Document({ creator: 'CamList', title: project.name || 'Gear list',
    styles: { default: { document: { run: { ...(font ? { font } : {}), language, size: 22 } } } },
    sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 900, right: 900 } } }, children }] });
  sortRunProperties(doc);
  const blob = await D.Packer.toBlob(doc);
  download(`${safeName(project.name)}-gearlist.docx`, blob);
}
