import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCatalog } from '../js/catalog.js';
import { proposeParents, setParent } from '../js/accassign.js';

const read = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const catalog = createCatalog(read('catalog.json'), [], read('extra.json'));
const find = (rx) => catalog.products.find(p => rx.test(p.name));
const resolve = (id) => catalog.byId(id);

test('an older list: the D-Tap cable and sunhood next to one monitor are proposed for it', () => {
  const mon = find(/LMD-A180/), dtap = catalog.byId('x_gen_dtap_xlr4'), hood = catalog.byId('x_gen_sunhood'), cam = find(/^PXW-FX6$/);
  const project = { items: [{ productId: cam.id, qty: 1 }, { productId: mon.id, qty: 1 }, { productId: dtap.id, qty: 1 }, { productId: hood.id, qty: 1 }] };
  const got = proposeParents(project, catalog, resolve);
  assert.deepEqual(got.map(x => [x.productId, x.candidates]), [[dtap.id, [mon.id]], [hood.id, [mon.id]]]);
});

test('with two items that fit, both are offered; placed or dismissed items are not proposed again', () => {
  const a = find(/LMD-A180/), b = find(/LMD-A170/), hood = catalog.byId('x_gen_sunhood');
  const project = { items: [{ productId: a.id, qty: 1 }, { productId: b.id, qty: 1 }, { productId: hood.id, qty: 1 }] };
  assert.deepEqual(proposeParents(project, catalog, resolve)[0].candidates, [a.id, b.id]);
  assert.equal(proposeParents(project, catalog, resolve, { dismissed: [hood.id] }).length, 0);
  const placed = { items: setParent(project.items, hood.id, a.id) };
  assert.equal(proposeParents(placed, catalog, resolve).length, 0);
});

test('a monitor is never proposed as another item’s accessory', () => {
  const a = find(/LMD-A180/), wl = find(/Bolt 4K 750 12G/);
  const project = { items: [{ productId: a.id, qty: 1 }, { productId: wl.id, qty: 1 }] };
  assert.equal(proposeParents(project, catalog, resolve).length, 0);
});
