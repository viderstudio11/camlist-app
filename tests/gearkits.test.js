import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCatalog } from '../js/catalog.js';
import { gearKitFor, gearKitStatus, kitSlotsOf, inTheBox } from '../js/gearkits.js';

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
  // slots can depend on the model, so every product with a kit is checked with its own slots
  for (const prod of catalog.products) { const kit = gearKitFor(catalog, prod); if (!kit) continue; for (const s of kitSlotsOf(kit, prod)) {
    for (const id of [s.add].flat().filter(x => x != null)) {
      const p = catalog.byId(id);
      assert.ok(p, `${kit.id}/${s.key}: ${id}`);
      assert.ok(s.match.test(p.name), `${kit.id}/${s.key}: "${p.name}" must satisfy its own slot`);
    }
  } }
});

const keysOf = (rx) => { const p = find(rx); return kitSlotsOf(gearKitFor(catalog, p), p).map(s => s.key); };

test('a wireless follow focus: a motor only for a hand unit sold alone, and the battery its maker names', () => {
  assert.deepEqual(keysOf(/^Hi-5 Hand Unit$/), ['motor', 'rings', 'marks', 'battery', 'strap', 'rods', 'dtap']);
  assert.deepEqual(keysOf(/^Nucleus-M$/), ['rings', 'marks', 'battery', 'strap', 'rods', 'dtap']);
  assert.deepEqual(keysOf(/^Nucleus-Nano$/), ['rings', 'marks', 'strap', 'rods', 'dtap'], 'no battery to add: it is built in');
  const hi5 = find(/^Hi-5 Hand Unit$/);
  const bat = gearKitStatus(gearKitFor(catalog, hi5), 1, [], (id) => catalog.byId(id), hi5).find(s => s.key === 'battery');
  assert.equal(catalog.byId(bat.add).name, 'LBP-3500 Li-Ion Battery Pack');
  assert.equal(bat.need, 2);
  assert.equal(gearKitFor(catalog, find(/^Cforce Mini Motor$/)), null, 'a motor carries no kit of its own');
});

test('a DJI gimbal: its own spare grip, the motor unless the Combo has it, and what DJI packs in the box', () => {
  assert.equal(gearKitFor(catalog, find(/RONIN RS 5/)).id, 'gimbal');
  assert.deepEqual(keysOf(/RONIN RS 5/), ['grip', 'charger', 'motor', 'rodkit', 'strip', 'hdmi']);
  assert.deepEqual(keysOf(/RS3 PRO COMBO/), ['grip', 'charger', 'hdmi']);
  assert.deepEqual(keysOf(/RS4 Mini/), ['charger', 'hdmi']);
  const rs5 = find(/RONIN RS 5/);
  const grip = gearKitStatus(gearKitFor(catalog, rs5), 1, [], (id) => catalog.byId(id), rs5).find(s => s.key === 'grip');
  assert.equal(catalog.byId(grip.add).name, 'RS BG33 Battery Grip');
  assert.ok(inTheBox(gearKitFor(catalog, rs5), rs5).items.includes('BG33 Battery Grip'));
  assert.equal(gearKitFor(catalog, find(/Gimbal Control Wheels for DJI RS/)), null);
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
  assert.ok(kitSlotsOf(kit).some(s => s.key === 'dtap'));
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

test('big gear gets its kit: head, legs, dolly, slider, Dana Dolly, jib, car mount', () => {
  const kitOf = (rx) => gearKitFor(catalog, find(rx))?.id;
  assert.equal(kitOf(/^Video 18 Fluid Head$/), 'head');
  assert.equal(kitOf(/^Tall Tripod Legs 150mm$/), 'legs');
  assert.equal(kitOf(/^Classic Dolly$/), 'dolly');
  assert.equal(kitOf(/^Slider 60cm 150mm Bowl$/), 'slider');
  assert.equal(kitOf(/^Dana Dolly$/), 'dana');
  assert.equal(kitOf(/^GF-Tele Jib$/), 'jib');
  assert.equal(kitOf(/^Hydra Alien Car Mounting System$/), 'car');
  for (const rx of [/^VCT-14 Tripod Adaptor$/, /^Tripod Spreader/, /^Dolly Wedges Set$/, /^Jib Counterweights Set$/]) assert.equal(kitOf(rx), undefined, String(rx));
});

test('a head: legs sized to its bowl, and the Sony VCT-14 plate when the camera is a Sony shoulder camcorder', () => {
  const head = find(/^C20S 100mm Fluid Head$/);
  const st = (camera) => gearKitStatus(gearKitFor(catalog, head), 1, [], (id) => catalog.byId(id), head, { camera });
  const legs = st(null).find(s => s.key === 'legs');
  assert.equal(legs.add, null, 'no 100 mm tall legs in the catalog: the slot opens the legs shelf');
  assert.deepEqual(legs.find, { dept: 'tripods', subcat: 'Tripod Legs' });
  assert.equal(catalog.byId(st(null).find(s => s.key === 'hihat').add).name, 'High Hat with 100mm Bowl');
  assert.deepEqual(st(find(/PXW-X400/)).find(s => s.key === 'plate').add, 'x_sony_vct14');
  assert.equal([st(find(/ILME-FX3/)).find(s => s.key === 'plate').add].flat().length, 3);
});

test('a Ninja asks for AtomX SSDmini media and NP-F batteries, per Atomos', () => {
  const ninja = find(/^Ninja 5\.2″/);
  const keys = gearKitStatus(gearKitFor(catalog, ninja), 1, [], (id) => catalog.byId(id), ninja).map(s => s.key);
  assert.ok(keys.includes('media') && keys.includes('battery'));
});
