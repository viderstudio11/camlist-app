import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCatalog } from '../js/catalog.js';
import { gearKitFor, gearKitStatus, GEAR_KITS } from '../js/gearkits.js';

const read = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const catalog = createCatalog(read('catalog.json'), [], read('extra.json'));
const find = (rx) => catalog.products.find(p => rx.test(p.name));

test('each kind of gear finds its kit', () => {
  assert.equal(gearKitFor(catalog, find(/LMD-A180/)).id, 'monitor-large');
  assert.equal(gearKitFor(catalog, find(/Cine 7″|Indie 7|Ultra 7/)).id, 'monitor-small');
  assert.equal(gearKitFor(catalog, find(/Bolt 4K 750 12G/)).id, 'wireless-video');
  assert.equal(gearKitFor(catalog, find(/Mirage T-16/)).id, 'mattebox');
  assert.equal(gearKitFor(catalog, find(/^Laptop — Mac$/)).id, 'laptop');
  assert.equal(gearKitFor(catalog, find(/PXW-FX6/)), null, 'cameras keep their own base kit');
  assert.equal(gearKitFor(catalog, find(/FE 28-70mm f\/2 GM/)), null);
});

test('every slot that adds something points at a real catalog item', () => {
  for (const kit of GEAR_KITS) for (const s of kit.slots) {
    for (const id of [s.add].flat().filter(x => x != null)) {
      const p = catalog.byId(id);
      assert.ok(p, `${kit.id}/${s.key}: ${id}`);
      assert.ok(s.match.test(p.name), `${kit.id}/${s.key}: "${p.name}" must satisfy its own slot`);
    }
  }
});

test('slots count what is in the list and scale with the parent quantity', () => {
  const mon = find(/LMD-A180/);
  const kit = gearKitFor(catalog, mon);
  const stand = catalog.byId('x_gen_monitor_stand'), bnc = catalog.byId(5497);
  const items = [{ productId: mon.id, qty: 2 }, { productId: stand.id, qty: 1 }, { productId: bnc.id, qty: 6 }];
  const st = gearKitStatus(kit, 2, items, (id) => catalog.byId(id));
  const by = Object.fromEntries(st.map(s => [s.key, s]));
  assert.deepEqual([by.stand.have, by.stand.need, by.stand.done], [1, 2, false]);
  assert.deepEqual([by.sdi.have, by.sdi.need, by.sdi.done], [6, 4, true]);
  assert.equal(by.hood.have, 0);
});

test('a field monitor asks for a D-Tap power cable as well', () => {
  const kit = gearKitFor(catalog, find(/LMD-A180/));
  assert.ok(kit.slots.some(s => s.key === 'dtap'));
});

test('only real monitors and wireless links get a kit — not their accessories, switchers or viewfinders', () => {
  const none = [/^Monitor Sunhood$/, /^Monitor Rain Cover$/, /ATEM Television Studio Pro 4K Live/, /Gratical Eye/, /L2 PLUS Video Mixer/,
    /Antenna Array for Bolt/, /Link Dual-Band Wi-Fi Router/, /^Serv 4K$/, /Vidiu GO/, /Monitor Cage V1/, /Ronin 4D Flex Extension/, /ATEM Streaming Bridge/];
  for (const rx of none) { const p = find(rx); assert.ok(p, String(rx)); assert.equal(gearKitFor(catalog, p), null, p.name); }
  assert.equal(gearKitFor(catalog, find(/SWIT|K15 15\.4/)).id, 'monitor-large', 'a 15.4″ monitor is a field monitor');
  assert.equal(gearKitFor(catalog, find(/LMD-A170/)).id, 'monitor-large');
  assert.equal(gearKitFor(catalog, find(/Bolt 6 LT 750/)).id, 'wireless-video');
});

test('the D-Tap cable in a kit ends in the connector that model takes', () => {
  const dtapOf = (rx) => { const p = find(rx); return gearKitStatus(gearKitFor(catalog, p), 1, [], (id) => catalog.byId(id), p).find(s => s.key === 'dtap'); };
  assert.equal(catalog.byId(dtapOf(/LMD-A180/).add).name, 'D-Tap to 4-Pin XLR Cable');
  assert.equal(catalog.byId(dtapOf(/^Cine 24/).add).name, 'D-Tap to 3-Pin XLR Cable');
  assert.equal(catalog.byId(dtapOf(/Ultra 7 UHD 4K On-Camera/).add).name, 'D-Tap to 2-Pin LEMO Cable');
  assert.equal(catalog.byId(dtapOf(/MARS 400S PRO/).add).name, 'D-Tap to DC 2.1mm Barrel Cable');
  assert.match(dtapOf(/LMD-A180/).en, /4-pin XLR/);
  // a model whose input is not on file keeps the plain D-Tap cable
  assert.equal(dtapOf(/Shimbol|Memory 7 Pro/).add, 'x_gen_dtap');
  // a D-Tap cable with the right plug in the list counts
  const p = find(/LMD-A180/);
  const st = gearKitStatus(gearKitFor(catalog, p), 1, [{ productId: 'x_gen_dtap_xlr4', qty: 1 }], (id) => catalog.byId(id), p);
  assert.equal(st.find(s => s.key === 'dtap').done, true);
});
