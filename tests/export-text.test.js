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
  const txt = buildShareText(project, groups, { lang: 'he', now: new Date('2026-09-17T10:00:00Z') });
  assert.equal(txt, [
    '*המירוץ למיליון 12*',
    'קשת 12',
    'עוזר צלם: Amir · ⁦12.10.2026–28.10.2026⁩',
    '⁦050-1234567⁩ · ⁦a@b.com⁩',
    'יחידה 2 מצטרפת ב-20.10',
    '',
    '*מצלמות · 3*',
    '• 2 × Sony FX6',
    '   ↳ Cam A+B',
    '• 1 × ARRI ALEXA 35',
    '',
    '*אחר · 1*',
    '• 1 × Shogun 7',
    '',
    '4 פריטים · CamList · 17.09.2026',
  ].join('\n'));
});

test('english, no notes, with links', () => {
  const txt = buildShareText(project, groups, { lang: 'en', includeNotes: false, includeLinks: true, now: new Date('2026-09-17T10:00:00Z') });
  assert.ok(txt.includes('*Cameras · 3*'));
  assert.ok(txt.includes('• 2 × Sony FX6\n   https://u/fx6'));
  assert.ok(!txt.includes('Cam A+B'));
  assert.ok(!txt.includes('יחידה 2'));
  assert.ok(txt.endsWith('4 items · CamList · 17.09.2026'));
});
