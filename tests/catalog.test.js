import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalog, normalize } from '../js/catalog.js';

const data = {
  departments: [
    { id: 7, slug: 'cameras', he: 'מצלמות', en: 'Cameras', order: 1, subcategories: [{ id: 12, parent: null, he: 'Digital Cinema', en: 'Digital Cinema', count: 2 }] },
    { id: 8, slug: 'lenses', he: 'עדשות', en: 'Lenses', order: 2, subcategories: [{ id: 20, parent: null, he: 'Full Frame', en: 'Full Frame', count: 1 }] },
  ],
  brands: [{ id: 'sony', name: 'Sony', count: 2 }, { id: 'arri', name: 'ARRI', count: 1 }],
  products: [
    { id: 1, name: 'FX6', brand: 'sony', dept: 7, subcats: [12], image: null, url: 'u1', sku: '' },
    { id: 2, name: 'ALEXA 35', brand: 'arri', dept: 7, subcats: [12], image: null, url: 'u2', sku: '' },
    { id: 3, name: 'FE 24-70mm f/2.8 GM II', brand: 'sony', dept: 8, subcats: [20], image: null, url: 'u3', sku: '' },
  ],
};

test('normalize lowercases and unifies separators', () => {
  assert.equal(normalize('FE 24-70mm f/2.8 GM II'), 'fe 24 70mm f 2 8 gm ii');
});

test('search is AND over tokens, dash/space insensitive, ranks name-prefix first', () => {
  const c = createCatalog(data);
  assert.deepEqual(c.search('24 70').map(p => p.id), [3]);
  assert.deepEqual(c.search('24-70').map(p => p.id), [3]);
  assert.deepEqual(c.search('sony').map(p => p.id), [1, 3]);
  assert.deepEqual(c.search('fx').map(p => p.id), [1]);
  assert.deepEqual(c.search('sony gm').map(p => p.id), [3]);
  assert.deepEqual(c.search('digital cinema').map(p => p.id).sort(), [1, 2]);
});

test('search filters by dept/brand and respects limit', () => {
  const c = createCatalog(data);
  assert.deepEqual(c.search('sony', { dept: 8 }).map(p => p.id), [3]);
  assert.deepEqual(c.search('', { brand: 'sony' }).map(p => p.id), [1, 3]);
  assert.equal(c.search('', { limit: 1 }).length, 1);
});

test('manual products are included and flagged', () => {
  const c = createCatalog(data, [{ id: 'm_1', name: 'Shogun 7', brand: 'atomos', brandName: 'Atomos', dept: 'other' }]);
  const r = c.search('shogun');
  assert.equal(r.length, 1);
  assert.equal(r[0].manual, true);
  assert.equal(c.byId('m_1').name, 'Shogun 7');
  assert.equal(c.brandName('atomos'), 'Atomos');
  c.setManual([]);
  assert.equal(c.search('shogun').length, 0);
});

test('indexes and helpers', () => {
  const c = createCatalog(data);
  assert.deepEqual(c.byDept(7).map(p => p.id), [1, 2]);
  assert.deepEqual(c.bySubcat(20).map(p => p.id), [3]);
  assert.deepEqual(c.byBrand('sony').map(p => p.id), [1, 3]);
  assert.equal(c.deptKey(7), 'cameras');
  assert.equal(c.deptKey('other'), 'other');
  assert.equal(c.deptKey(999), 'other');
  assert.equal(c.byId(2).brandName, 'ARRI');
  assert.deepEqual(c.subcatsOf(7).map(s => s.id), [12]);
});

test('brand match outranks name-contains (arri → ARRI cameras before "ARRI PL" lenses)', () => {
  const c = createCatalog({ ...data, products: [
    { id: 10, name: 'Supreme Prime 50mm (ARRI PL)', brand: 'zeiss', dept: 8, subcats: [20] },
    { id: 11, name: 'ALEXA 35', brand: 'arri', dept: 7, subcats: [12] },
    { id: 12, name: 'ARRIFLEX 416', brand: 'arri', dept: 7, subcats: [12] },
  ] });
  assert.deepEqual(c.search('arri').map(p => p.id), [12, 11, 10]);
});

test('extra products merge with dept/subcat resolution, brand added, flagged extra', () => {
  const c = createCatalog(data, [], { brands: [{ id: 'prograde', name: 'ProGrade Digital' }], products: [
    { id: 'x_1', name: 'CFexpress Type A Reader', brand: 'prograde', dept: 'cameras', subcat: 'Digital Cinema' },
    { id: 'x_2', name: 'Nowhere', brand: 'prograde', dept: 'nope' },
  ] });
  const x = c.byId('x_1');
  assert.equal(x.extra, true); assert.equal(x.dept, 7); assert.deepEqual(x.subcats, [12]); assert.equal(x.brandName, 'ProGrade Digital');
  assert.equal(c.byId('x_2'), undefined);
  assert.equal(c.brands.find(b => b.id === 'prograde').count, 1);
  assert.equal(c.search('cfexpress')[0].id, 'x_1');
});

test('a subcategory includes the products filed in its sub-subcategories', () => {
  // Utopia files e.g. wireless follow focus under "Follow Focus"; browsing the parent must show them.
  const nested = {
    departments: [{ id: 9, slug: 'accessories', he: 'אביזרים', en: 'Accessories', order: 1, subcategories: [
      { id: 244, parent: null, he: 'פולופוקוס', en: 'Follow Focus', count: 3 },
      { id: 246, parent: 244, he: 'פולופוקוס אלחוטי', en: 'Wireless Follow Focus', count: 1 },
      { id: 900, parent: 246, he: 'x', en: 'x', count: 1 },
    ] }],
    brands: [],
    products: [
      { id: 1, name: 'Direct', brand: null, dept: 9, subcats: [244], image: null, url: '', sku: '' },
      { id: 2, name: 'Wireless', brand: null, dept: 9, subcats: [246], image: null, url: '', sku: '' },
      { id: 3, name: 'Deeper', brand: null, dept: 9, subcats: [900], image: null, url: '', sku: '' },
      { id: 4, name: 'Both', brand: null, dept: 9, subcats: [244, 246], image: null, url: '', sku: '' },
    ],
  };
  const c = createCatalog(nested);
  assert.deepEqual(c.bySubcat(244).map(p => p.id).sort(), [1, 2, 3, 4]);
  assert.deepEqual(c.bySubcat(246).map(p => p.id).sort(), [2, 3, 4]);
  assert.deepEqual(c.subcatsOf(9).map(s => s.id), [244]);
});

test('house-brand and unbranded products read as General, and never carry the rental house’s name', async () => {
  const { displayName } = await import('../js/export-text.js');
  const cat = createCatalog({
    departments: [{ id: 1, slug: 'grip', he: 'גריפ', en: 'Grip', order: 1, subcategories: [] }],
    brands: [{ id: 'utopia', name: 'Utopia', count: 1 }, { id: 'sony', name: 'Sony', count: 1 }],
    products: [
      { id: 1, name: 'Apple Box 50X30X10', brand: 'utopia', dept: 1 },
      { id: 2, name: 'Sand bag', brand: null, dept: 1 },
      { id: 3, name: 'PXW-FX6', brand: 'sony', dept: 1 },
    ],
  });
  for (const id of [1, 2]) {
    const p = cat.byId(id);
    assert.equal(p.brand, 'general');
    assert.equal(p.brandName, 'General');
    assert.equal(displayName(p), p.name, 'no brand prefix on a generic item');
  }
  assert.equal(displayName(cat.byId(3)), 'Sony PXW-FX6');
  assert.ok(!cat.brands.some(b => /utopia/i.test(b.name)));
  assert.equal(cat.brands.find(b => b.id === 'general').count, 2);
});

test('a supplement can add a department and move products into it by name', () => {
  const cat = createCatalog({
    departments: [{ id: 900001, slug: 'video', he: 'וידאו', en: 'Video', order: 3, subcategories: [{ id: 260, parent: null, he: 'מקליטים וכרטיסים', en: 'Recorders & Media' }] },
      { id: 12, slug: 'grip', he: 'גריפ', en: 'Grip', order: 5, subcategories: [] }],
    brands: [],
    products: [
      { id: 1, name: '160GB CFexpress Type A TOUGH Memory Card', brand: 'sony', dept: 900001, subcats: [260] },
      { id: 2, name: 'AXS-CR1 Card Reader', brand: 'sony', dept: 900001, subcats: [260] },
      { id: 3, name: 'Ninja 5.2″ 4K HDMI Recording Monitor', brand: 'atomos', dept: 900001, subcats: [260] },
      { id: 4, name: 'MacBook Pro', brand: 'apple', dept: 900001, subcats: [260] },
    ],
  }, [], {
    departments: [{ slug: 'media', he: 'מדיה ופריקה', en: 'Media & Offload', after: 'video',
      subcategories: [{ key: 'cards', he: 'כרטיסי זיכרון', en: 'Memory Cards' }, { key: 'readers', he: 'קוראי כרטיסים', en: 'Card Readers' }, { key: 'computers', he: 'מחשבים', en: 'Computers' }] }],
    moves: [
      { from: 'Recorders & Media', match: 'reader|dock|station', to: 'media', subcat: 'Card Readers' },
      { from: 'Recorders & Media', match: 'macbook|laptop', to: 'media', subcat: 'Computers' },
      { from: 'Recorders & Media', match: 'memory card|\bssd\b', to: 'media', subcat: 'Memory Cards' },
    ],
    brands: [],
    products: [{ id: 'x_laptop_pc', name: 'Laptop — Windows PC', brand: null, dept: 'media', subcat: 'Computers' }],
  });
  assert.deepEqual(cat.departments.map(d => d.slug), ['video', 'media', 'grip']);
  const media = cat.departments.find(d => d.slug === 'media');
  const sub = (en) => media.subcategories.find(s => s.en === en).id;
  assert.equal(cat.byId(1).dept, media.id);
  assert.deepEqual(cat.byId(1).subcats, [sub('Memory Cards')]);
  assert.deepEqual(cat.byId(2).subcats, [sub('Card Readers')]);
  assert.deepEqual(cat.byId(4).subcats, [sub('Computers')]);
  assert.equal(cat.deptKey(cat.byId(3).dept), 'video', 'a recorder stays in Video');
  assert.equal(cat.byId('x_laptop_pc').dept, media.id);
  assert.equal(cat.byId('x_laptop_pc').brand, 'general');
  assert.equal(cat.bySubcat(sub('Computers')).length, 2);
});

test('a move reads the source shelf even when a new department reuses its name, or takes shelf-less items by department', () => {
  const cat = createCatalog({
    departments: [{ id: 9, slug: 'accessories', he: 'אביזרים', en: 'Accessories', order: 4, subcategories: [{ id: 246, parent: null, he: 'פולו אלחוטי', en: 'Wireless Follow Focus' }] }],
    brands: [],
    products: [
      { id: 1, name: 'Nucleus-M', brand: 'tilta', dept: 9, subcats: [246] },
      { id: 2, name: 'BNC Cable', brand: 'utopia', dept: 9, subcats: [] },
    ],
  }, [], {
    departments: [{ slug: 'lenscontrol', he: 'שליטה בעדשה', en: 'Lens Control & Support', after: 'accessories', subcategories: [{ he: 'פולו אלחוטי', en: 'Wireless Follow Focus' }, { he: 'כבלים', en: 'Cables' }] }],
    moves: [
      { from: 'Wireless Follow Focus', match: '.', to: 'lenscontrol', subcat: 'Wireless Follow Focus' },
      { fromDept: 'accessories', match: '^bnc cable$', to: 'lenscontrol', subcat: 'Cables' },
    ],
    brands: [], products: [],
  });
  const lc = cat.departments.find(d => d.slug === 'lenscontrol');
  assert.equal(cat.byId(1).dept, lc.id);
  assert.deepEqual(cat.byId(1).subcats, [lc.subcategories[0].id]);
  assert.deepEqual(cat.byId(2).subcats, [lc.subcategories[1].id]);
});

test('expendables: its own department and a basic set that points at real items', async () => {
  const { readFileSync } = await import('node:fs');
  const read = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
  const cat = createCatalog(read('catalog.json'), [], read('extra.json'));
  const d = cat.departments.find(x => x.slug === 'expendables');
  assert.ok(d);
  assert.equal(cat.departments[cat.departments.indexOf(d) - 1].slug, 'accessories');
  const set = cat.preset('expendables');
  assert.ok(set.length >= 15);
  for (const { id, qty } of set) { assert.ok(cat.byId(id), id); assert.ok(qty > 0); assert.equal(cat.byId(id).dept, d.id); }
  assert.equal(cat.byId('x_exp_gaffer2').brand, 'general');
});
