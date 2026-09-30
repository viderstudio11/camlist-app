import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCatalog } from '../js/catalog.js';
import { gearKitFor, tripodKind, bowlOf } from '../js/gearkits.js';

const read = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const catalog = createCatalog(read('catalog.json'), [], read('extra.json'));
const find = (rx) => catalog.products.find(p => rx.test(p.name));
const shelf = (p) => p.subcats.map(id => catalog.departments.flatMap(d => d.subcategories).find(s => s.id === id)?.en)[0];

test('cables live in one department: SDI/BNC, HDMI, D-Tap & DC, AC, USB', () => {
  const where = (rx) => [catalog.deptKey(find(rx).dept), shelf(find(rx))];
  assert.deepEqual(where(/^BNC Cable$/), ['cables', 'SDI / BNC']);
  assert.deepEqual(where(/^HDMI Cable$/), ['cables', 'HDMI']);
  assert.deepEqual(where(/^D-Tap to 4-Pin XLR Cable$/), ['cables', 'D-Tap & DC Power']);
  assert.deepEqual(where(/^AC Power Cable$/), ['cables', 'AC Power']);
  assert.deepEqual(where(/^USB-C Hub$/), ['cables', 'USB & Data']);
});

test('power keeps plates and dummy batteries on shelves of their own', () => {
  assert.equal(shelf(find(/^V-Mount Battery Plate$/)), 'Battery Plates');
  assert.equal(shelf(find(/^Mini PD V-Mount Battery Plate$/)), 'Battery Plates');
  assert.equal(shelf(find(/^Dummy Battery BP-U/)), 'Dummy Batteries & Adapters');
});

test('grip: hi-hats and bridge plates on their own shelves; a hi-hat still gets the legs kit', () => {
  const hh = find(/^High Hat with 150mm Bowl$/);
  assert.equal(catalog.deptKey(hh.dept), 'grip');
  assert.equal(shelf(hh), 'Hi-Hats & Low Hats');
  assert.equal(gearKitFor(catalog, hh).id, 'legs');
  assert.equal(shelf(find(/^Bridge Plate BP-8$/)), 'Bridge Plates & Adapters');
  assert.equal(shelf(find(/^Track Straight 8 Foot Section$/)), 'Track & Dolly Accessories');
});

test('tripods: each item has a kind, and a bowl only when the maker or a millimetre figure says so', () => {
  assert.equal(tripodKind(catalog, find(/^Video 20 Fluid Head$/)), 'head');
  assert.equal(tripodKind(catalog, find(/^Tall Tripod Legs 150mm$/)), 'legs');
  assert.equal(tripodKind(catalog, find(/^Pan Bar \(telescopic\)$/)), 'accessory');
  assert.equal(tripodKind(catalog, find(/RONIN RS 5/)), 'gimbal');
  assert.equal(bowlOf('Video 20 Fluid Head'), 100);
  assert.equal(bowlOf('L100 Lambda Fluid Head'), null, 'L100 is a model number');
  assert.equal(bowlOf('Tall Tripod Legs Flat Head'), 'mitchell');
  assert.equal(gearKitFor(catalog, find(/^Tripod Dolly \(wheels\)$/)), null, 'an accessory carries no kit');
});

test('expendables are shelved the way Filmtools shelves them', () => {
  const exp = catalog.departments.find(d => d.slug === 'expendables');
  assert.deepEqual(catalog.subcatsOf(exp.id).map(s => s.en), ['Tape & Adhesives', 'Markers & Chalk', 'Cleaning & Lens Care', 'Batteries', 'Ties & Clips', 'Fabrics & Plastics', 'Safety & Work Gear']);
  assert.equal(shelf(find(/^Clothespins \(C-47\)$/)), 'Ties & Clips');
});

test('a shelf with nothing left on it is not listed', () => {
  const video = catalog.departments.find(d => d.slug === 'video');
  assert.ok(!catalog.subcatsOf(video.id).some(s => ['Monitors', 'On Camera', 'Video Cables'].includes(s.en)));
});

test('second pass: arms, cages and handles in grip; stabilisers and support split; lens accessories shelf', async () => {
  const { accessoryKind } = await import('../js/accessory.js');
  const where = (rx) => [catalog.deptKey(find(rx).dept), shelf(find(rx))];
  assert.deepEqual(where(/^UT Arm$/), ['grip', 'Arms & Shoe Mounts']);
  assert.deepEqual(where(/^Magic Arm$/), ['grip', 'Arms & Shoe Mounts']);
  assert.deepEqual(where(/^Blue Modular Handle$/), ['grip', 'Cages & Handles']);
  assert.deepEqual(where(/RONIN RS 5/), ['tripods', 'Gimbals']);
  assert.deepEqual(where(/^Vario 5$/), ['tripods', 'Body Support']);
  assert.deepEqual(where(/^Hydra Alien Car Mounting System$/), ['tripods', 'Car Mounts']);
  assert.deepEqual(where(/^FX3 Underwater camera housing$/), ['tripods', 'Underwater Housings']);
  assert.equal(gearKitFor(catalog, find(/RONIN RS 5/)).id, 'gimbal', 'the gimbal kit follows the gimbals to their new shelf');
  assert.equal(tripodKind(catalog, find(/^Vario 5$/)), 'body');
  assert.equal(accessoryKind({ name: 'Lens Caps (front / rear)' }, ['General Accessories']), 'lensacc');
});
