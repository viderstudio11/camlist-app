import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShareText, displayName, formatDateRange } from '../js/export-text.js';

const project = { name: 'המירוץ למיליון 12', productionCo: 'קשת 12', techManager: 'Amir', phone: '050-1234567', email: 'a@b.com', dateFrom: '2026-10-12', dateTo: '2026-10-28', notes: 'יחידה 2 מצטרפת ב-20.10' };
const groups = [
  { dept: 7, key: 'cameras', entries: [
    { item: { productId: 1, qty: 2, note: 'Cam A+B' }, product: { name: 'FX6', brandName: 'Sony', url: 'https://u/fx6' } },
    { item: { productId: 2, qty: 1, note: '' }, product: { name: 'ARRI ALEXA 35', brandName: 'ARRI', url: null } },
  ] },
  { dept: 'other', key: 'other', entries: [
    { item: { productId: 'm_1', qty: 1, note: '' }, product: { name: 'Shogun 7', brandName: null } },
  ] },
];

test('displayName prefixes brand only when missing', () => {
  assert.equal(displayName({ name: 'FX6', brandName: 'Sony' }), 'Sony FX6');
  assert.equal(displayName({ name: 'ARRI ALEXA 35', brandName: 'ARRI' }), 'ARRI ALEXA 35');
  assert.equal(displayName({ name: 'sony fx3', brandName: 'Sony' }), 'sony fx3');
  assert.equal(displayName({ name: 'X', brandName: null }), 'X');
});

test('formatDateRange', () => {
  assert.equal(formatDateRange('2026-10-12', '2026-10-28', 'he'), '12.10.2026–28.10.2026');
  assert.equal(formatDateRange('2026-10-12', '', 'he'), '12.10.2026');
  assert.equal(formatDateRange('', '', 'he'), '');
});

test('hebrew share text snapshot', () => {
  const txt = buildShareText(project, groups, { lang: 'he', now: new Date('2026-09-17T10:00:00Z') }).replace(/[‎‏]/g, '').replace(/⁨([^⁩]*)⁩/g, '$1');
  assert.equal(txt, [
    '*המירוץ למיליון 12*',
    'קשת 12',
    'עוזר צלם: Amir · ⁦12.10.2026–28.10.2026⁩',
    '⁦050-1234567⁩ · ⁦a@b.com⁩',
    'יחידה 2 מצטרפת ב-20.10',
    '',
    '*מצלמות*',
    '• 2 × Sony FX6',
    '   ↳ Cam A+B',
    '• 1 × ARRI ALEXA 35',
    '',
    '*אחר*',
    '• 1 × Shogun 7',
    '',
    'CamList · 17.09.2026',
  ].join('\n'));
});

test('english, no notes, with links', () => {
  const txt = buildShareText(project, groups, { lang: 'en', includeNotes: false, includeLinks: true, now: new Date('2026-09-17T10:00:00Z') }).replace(/[‎‏]/g, '').replace(/⁨([^⁩]*)⁩/g, '$1');
  assert.ok(txt.includes('*Cameras*'));
  assert.ok(txt.includes('• 2 × Sony FX6\n   https://u/fx6'));
  assert.ok(!txt.includes('Cam A+B'));
  assert.ok(!txt.includes('יחידה 2'));
  assert.ok(txt.endsWith('CamList · 17.09.2026'));
  assert.ok(!/items|Total/.test(txt), 'no counts beyond each item’s quantity');
});

test('an accessory picked for an item is set in under it', () => {
  const g = [{ dept: 1, key: 'monitors', entries: [
    { item: { productId: 'm', qty: 1, note: '' }, product: { name: 'Ninja', brandName: 'Atomos' } },
    { item: { productId: 'd', qty: 1, note: 'short' }, product: { name: 'D-Tap to DC Cable', brandName: null }, accessory: true },
  ] }];
  const txt = buildShareText({ name: 'X' }, g, { lang: 'en', now: new Date('2026-09-30T10:00:00Z') }).replace(/[‎‏]/g, '').replace(/⁨([^⁩]*)⁩/g, '$1');
  assert.ok(txt.includes('• 1 × Atomos Ninja\n   ◦ 1 × D-Tap to DC Cable\n      ↳ short'));
});

test('every line that is not a heading carries the document’s direction, so an English name never pulls it the other way', () => {
  const RLM = '\u200F', LRM = '\u200E';
  const he = buildShareText(project, groups, { lang: 'he', now: new Date('2026-09-17T10:00:00Z') }).split('\n');
  for (const l of he) if (l && !/^\*.*\*$/.test(l)) assert.ok(l.startsWith(RLM), JSON.stringify(l));
  assert.ok(he.includes('*מצלמות*'), 'headings stay bare so WhatsApp still makes them bold');
  const en = buildShareText(project, groups, { lang: 'en', now: new Date('2026-09-17T10:00:00Z') }).split('\n');
  for (const l of en) if (l && !/^\*.*\*$/.test(l)) assert.ok(l.startsWith(LRM), JSON.stringify(l));
});

test('free text keeps its own direction inside the line: a Hebrew note in an English list, an English note in a Hebrew one', () => {
  const FSI = '\u2068', PDI = '\u2069';
  const p = { name: 'X', notes: 'צילומי חוץ, Day 1 בנמל', productionCo: 'Keshet Studios', techManager: 'עמיר' };
  const g = [{ dept: 1, key: 'cameras', entries: [{ item: { productId: 1, qty: 2, note: 'מצלמה A + B' }, product: { name: 'EOS C70', brandName: 'Canon' } }] }];
  const en = buildShareText(p, g, { lang: 'en', now: new Date('2026-09-30T10:00:00Z') });
  for (const s of ['צילומי חוץ, Day 1 בנמל', 'מצלמה A + B', 'Keshet Studios', 'עמיר', 'Canon EOS C70']) assert.ok(en.includes(FSI + s + PDI), s);
});
