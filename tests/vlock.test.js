import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCatalog } from '../js/catalog.js';
import { createCompat } from '../js/compat.js';

const read = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const catalog = createCatalog(read('catalog.json'), [], read('extra.json'));
const compat = createCompat(read('compat.json'), catalog);
const cam = (rx) => compat.profileFor(catalog.products.find(p => rx.test(p.name)));

test('a camera on its own battery family can go V-Lock; V-Lock-native cameras and action cameras cannot', () => {
  assert.ok(compat.canVlock(cam(/^ILME-FX3$/)));
  assert.ok(compat.canVlock(cam(/^PXW-FX6$/)));
  assert.equal(compat.canVlock(cam(/^ALEXA Mini LF$/i)), false);
  assert.equal(compat.canVlock(cam(/^PXW-X400$/)), false);
});

test('the V-Lock route: V-Lock batteries (half as many), a plate and the dummy cable of the native family', () => {
  const fx3 = cam(/^ILME-FX3$/);
  const v = compat.powered(fx3, 'vlock');
  assert.deepEqual(v.battery, ['V-Mount']);
  const slots = v.kit.map(s => s.slot);
  assert.ok(slots.includes('vplate') && slots.includes('dummy'));
  const bat = v.kit.find(s => s.slot === 'battery'), native = fx3.kit.find(s => s.slot === 'battery');
  assert.equal(bat.qty, Math.max(2, Math.ceil(native.qty / 2)));
  assert.equal(catalog.byId(v.kit.find(s => s.slot === 'dummy').add).name, 'Dummy Battery NP-FZ100 — D-Tap Cable');
  assert.equal(compat.powered(fx3, 'native'), fx3, 'the native route is the profile itself');
});

test('in the V-Lock kit a V-Mount battery counts, the plate and dummy count by name, and a dummy is never a battery', () => {
  const v = compat.powered(cam(/^ILME-FX3$/), 'vlock');
  const vbat = catalog.products.find(p => /v-?mount battery/i.test(p.name) && !/plate|charger/i.test(p.name));
  const items = [{ productId: vbat.id, qty: 2 }, { productId: 'x_gen_plate_v', qty: 1 }, { productId: 'x_gen_dummy_fz100', qty: 1 }];
  const st = Object.fromEntries(compat.kitStatus(v, items, (id) => catalog.byId(id)).map(s => [s.slot, s.have]));
  assert.equal(st.battery, 2);
  assert.equal(st.vplate, 1);
  assert.equal(st.dummy, 1);
  const nat = Object.fromEntries(compat.kitStatus(cam(/^ILME-FX3$/), [{ productId: 'x_gen_dummy_fz100', qty: 1 }], (id) => catalog.byId(id)).map(s => [s.slot, s.have]));
  assert.equal(nat.battery, 0);
});
