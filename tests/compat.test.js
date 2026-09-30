import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCatalog } from '../js/catalog.js';
import { createCompat, parseMounts, mountsInName } from '../js/compat.js';

const compatData = JSON.parse(readFileSync(new URL('../data/compat.json', import.meta.url), 'utf8'));
const data = {
  departments: [
    { id: 7, slug: 'cameras', he: 'מצלמות', en: 'Cameras', order: 1, subcategories: [] },
    { id: 8, slug: 'lenses', he: 'עדשות', en: 'Lenses', order: 2, subcategories: [
      { id: 20, parent: null, he: 'Full Frame', en: 'Full Frame' }, { id: 21, parent: null, he: 'PL-Mount', en: 'PL-Mount' }, { id: 22, parent: null, he: 'HDSLR E-Mount', en: 'HDSLR E-Mount' },
      { id: 23, parent: null, he: '35mm Prime', en: '35mm Prime' }, { id: 24, parent: null, he: 'מתאמי עדשה', en: 'Lens Adapters' }, { id: 25, parent: null, he: 'B4', en: 'Broadcast / ENG B4-Mount' } ] },
    { id: 900001, slug: 'video', he: 'וידאו', en: 'Video', order: 3, subcategories: [{ id: 260, parent: null, he: 'מקליטים', en: 'Recorders & Media' }, { id: 222, parent: null, he: 'On Camera', en: 'On Camera' }] },
    { id: 900003, slug: 'power', he: 'כוח', en: 'Power', order: 4, subcategories: [{ id: 252, parent: null, he: 'סוללות', en: 'Batteries' }, { id: 253, parent: null, he: 'מטענים', en: 'Chargers & PSU' }] },
  ],
  brands: [],
  products: [
    { id: 16514, name: 'PXW-FX6', brand: 'sony', dept: 7, subcats: [] },
    { id: 12328, name: 'ALEXA 35', brand: 'arri', dept: 7, subcats: [] },
    { id: 1, name: 'FE 24-70mm f/2.8 GM II', brand: 'sony', dept: 8, subcats: [20, 22], attrs: { Mount: ['E-Mount'] } },
    { id: 2, name: 'Supreme Prime 50mm T1.5', brand: 'zeiss', dept: 8, subcats: [20, 21], attrs: { Mount: ['PL'] } },
    { id: 3, name: 'CP.3 35mm T2.1', brand: 'zeiss', dept: 8, subcats: [23, 21], attrs: { Mount: ['PL'], 'Sensor Coverage / Format Compatibility': ['Super35'] } },
    { id: 4, name: 'HJ22 B4 zoom', brand: 'canon', dept: 8, subcats: [25] },
    { id: 5, name: 'Metabones PL to E-Mount adapter', brand: 'metabones', dept: 8, subcats: [24] },
    { id: 6, name: 'Mystery lens', brand: null, dept: 8, subcats: [] },
    { id: 7, name: '160GB CFexpress Type A TOUGH Memory Card', brand: 'sony', dept: 900001, subcats: [260] },
    { id: 8, name: '128GB SxS PRO+ Memory Card', brand: 'sony', dept: 900001, subcats: [260] },
    { id: 9, name: 'Shogun 7 recorder', brand: 'atomos', dept: 900001, subcats: [260] },
    { id: 10, name: 'BP-U100 Battery', brand: 'sony', dept: 900003, subcats: [252] },
    { id: 11, name: '250Wh V-Mount Battery BP-250S', brand: 'fxlion', dept: 900003, subcats: [252] },
    { id: 12, name: 'Ultra 7 monitor', brand: 'smallhd', dept: 900001, subcats: [222] },
    { id: 13, name: '64GB microSD card', brand: 'sandisk', dept: 900001, subcats: [260] },
  ],
};
const catalog = createCatalog(data);
const compat = createCompat(compatData, catalog);

test('parseMounts and mountsInName', () => {
  assert.deepEqual([...parseMounts('E MOUNT')], ['E']);
  assert.deepEqual([...parseMounts('PL/EF/E-mount')].sort(), ['E', 'EF', 'PL']);
  assert.deepEqual([...parseMounts('Sony E-Mount, PL-mount')].sort(), ['E', 'PL']);
  assert.ok(mountsInName('Metabones PL to E-Mount adapter').has('PL') && mountsInName('Metabones PL to E-Mount adapter').has('E'));
});

test('profileFor by id and by name; adapter mounts derived', () => {
  const fx6 = compat.profileFor(catalog.byId(16514));
  assert.equal(fx6.type, 'cinema-compact');
  assert.deepEqual(fx6.mount, ['E']);
  assert.ok(fx6.adapterMounts.includes('PL') && fx6.adapterMounts.includes('EF'));
  assert.equal(compat.profileFor({ id: 999, name: 'HERO13 Black', dept: 7, subcats: [] }).type, 'action');
  assert.equal(compat.profileFor({ id: 998, name: 'Unknown cam', dept: 7, subcats: [] }), null);
  assert.ok(fx6.kit.length > 3);
});

test('lens verdicts for FX6 (E, FF)', () => {
  const fx6 = compat.profileFor(catalog.byId(16514));
  assert.equal(compat.verdict(catalog.byId(1), fx6).status, 'native');   // E-mount FF
  assert.equal(compat.verdict(catalog.byId(2), fx6).status, 'adapter');  // PL FF via adapter
  assert.equal(compat.verdict(catalog.byId(3), fx6).status, 'partial');  // PL S35 on FF sensor
  assert.equal(compat.verdict(catalog.byId(4), fx6).status, 'no');       // B4
  assert.equal(compat.verdict(catalog.byId(5), fx6).status, 'native');   // PL→E adapter
  assert.equal(compat.verdict(catalog.byId(6), fx6).status, 'unknown');
});

test('lens verdicts for ALEXA 35 (LPL, S35)', () => {
  const a35 = compat.profileFor(catalog.byId(12328));
  assert.equal(compat.verdict(catalog.byId(2), a35).status, 'adapter');  // PL via PL-to-LPL
  assert.equal(compat.verdict(catalog.byId(3), a35).status, 'adapter');  // S35 PL on S35: fine, via adapter
  assert.equal(compat.verdict(catalog.byId(1), a35).status, 'no');       // E-mount
  assert.equal(compat.verdict(catalog.byId(5), a35).status, 'no');       // PL→E adapter is for E cameras
});

test('media and battery verdicts', () => {
  const fx6 = compat.profileFor(catalog.byId(16514));
  assert.equal(compat.verdict(catalog.byId(7), fx6).status, 'native');   // CFexpress A
  assert.equal(compat.verdict(catalog.byId(8), fx6).status, 'no');       // SxS
  assert.equal(compat.verdict(catalog.byId(9), fx6).status, 'neutral');  // recorder
  assert.equal(compat.verdict(catalog.byId(13), fx6).status, 'no');      // microSD is not SD
  assert.equal(compat.verdict(catalog.byId(10), fx6).status, 'native');  // BP-U
  assert.equal(compat.verdict(catalog.byId(11), fx6).status, 'no');      // V-mount
  assert.equal(compat.verdict(catalog.byId(12), fx6).status, 'neutral'); // monitor
  const a35 = compat.profileFor(catalog.byId(12328));
  assert.equal(compat.verdict(catalog.byId(11), a35).status, 'native');  // V-mount ok on ALEXA 35
});

test('kitStatus counts units already in the list', () => {
  const fx6 = compat.profileFor(catalog.byId(16514));
  const items = [{ productId: 7, qty: 2 }, { productId: 10, qty: 6 }, { productId: 1, qty: 1 }];
  const st = compat.kitStatus(fx6, items, (id) => catalog.byId(id));
  const media = st.find(s => s.slot === 'media'), batt = st.find(s => s.slot === 'battery'), lens = st.find(s => s.slot === 'lens');
  assert.equal(media.have, 2); assert.equal(media.done, false);
  assert.equal(batt.have, 6); assert.equal(batt.done, true);
  assert.equal(lens.have, 1);
});

test('kitStatus with a camera’s own allocation counts only what was added for that camera', () => {
  const fx6 = compat.profileFor(catalog.byId(16514));
  const items = [{ productId: 7, qty: 4 }, { productId: 10, qty: 6 }];
  // nothing allocated to this camera yet: it starts empty even though the list has cards and batteries
  const fresh = compat.kitStatus(fx6, items, (id) => catalog.byId(id), {});
  assert.equal(fresh.find(s => s.slot === 'media').have, 0);
  assert.equal(fresh.find(s => s.slot === 'battery').have, 0);
  // two of the four cards were added through this camera's kit
  const mine = compat.kitStatus(fx6, items, (id) => catalog.byId(id), { media: 2 });
  assert.equal(mine.find(s => s.slot === 'media').have, 2);
  // an allocation never exceeds what the list still holds
  const capped = compat.kitStatus(fx6, items, (id) => catalog.byId(id), { media: 9 });
  assert.equal(capped.find(s => s.slot === 'media').have, 4);
});
