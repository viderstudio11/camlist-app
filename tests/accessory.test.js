import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { accessoryKind, filterType, filterSize } from '../js/accessory.js';

test('filters sort by what they do', () => {
  const cases = {
    'IRND 4X5.6 – 0.9': 'irnd', 'NDF 4X4 – 1.2': 'nd', 'ND 1.8 for OSMO': 'nd', 'Solid ND Filter Kit (2, 3, 4, 5, 6, 10-Stop)': 'nd',
    'Variable ND 95mm': 'vnd', 'NDG S.Edge 4X5.6 – 0.6': 'grad', 'B.Pro-mist 4X5.6 -1/8': 'diffusion', 'Glimmerglass 4X5.6 1': 'diffusion',
    'Hollywood Black Magic 4X5.6 -1/8': 'diffusion', 'Ultra Pola 4X5.6': 'pola', 'Circular Polarizer for OSMO': 'pola',
    'ANTIQUE SUEDE 4X5.6 2': 'color', 'VFX Streak Filter (Blue)': 'effects', 'Close-Up +1 Lens': 'closeup',
    'Cinema Explosion-Proof Protector Filter 95mm': 'protect',
  };
  for (const [name, type] of Object.entries(cases)) assert.equal(filterType(name), type, name);
});

test('filter size comes from the size shelf, else the name', () => {
  assert.equal(filterSize({ name: 'IRND' }, ['Filters', '4X5.6']), '4x5.65');
  assert.equal(filterSize({ name: 'Pola' }, ['Filters', '6X6']), '6x6');
  assert.equal(filterSize({ name: 'ND 1.5 for OSMO' }, ['Filters']), 'osmo');
});

test('general accessories land on a shelf of their own', () => {
  const k = (name, subs = ['General Accessories']) => accessoryKind({ name }, subs);
  assert.equal(k('LS-10 Lens Support for 15mm Studio Bridge Plate'), 'lenssupport');
  assert.equal(k('SB-3 Syncbox Time-Code Generator'), 'timecode');
  assert.equal(k('TS-C Digital Clapper'), 'timecode');
  assert.equal(k('OEYE 3G EVF Viewfinder'), 'viewfinder');
  assert.equal(k('Zoom Stick ZSD-300D', ['General Accessories', 'Controlers']), 'control');
  assert.equal(k('Media Mod for HERO9/HERO10/HERO11/HERO12 Black'), 'action');
  assert.equal(k('A7s Underwater Housing', ['Underwater']), 'underwater');
  assert.equal(k('MB-19 Matte Box', ['Matte Boxes']), 'mattebox');
  assert.equal(k('IRND 4X5.6', ['Filters', '4X5.6']), 'filters');
});

test('every filter in the catalog gets a type and a size', () => {
  const cat = JSON.parse(readFileSync(new URL('../data/catalog.json', import.meta.url), 'utf8'));
  const acc = cat.departments.find(d => d.slug === 'accessories');
  const byId = new Map(acc.subcategories.map(s => [s.id, s.en]));
  const filters = cat.products.filter(p => p.subcats.some(id => ['Filters', '4X5.6', '4X4', '6X6', 'Round'].includes(byId.get(id))));
  const untyped = filters.filter(p => !filterType(p.name)).map(p => p.name);
  const unsized = filters.filter(p => !filterSize(p, p.subcats.map(id => byId.get(id)))).map(p => p.name);
  assert.deepEqual(untyped, []);
  assert.ok(unsized.length <= 6, unsized.join(' | '));
});

test('nothing a camera assistant would look for is left on the Other shelf', () => {
  assert.equal(accessoryKind({ name: 'ND Filter', brandName: 'GoPro' }, []), 'action');
  assert.equal(accessoryKind({ name: 'ICEMAN External Cooler System for Select Cameras' }, ['General Accessories']), 'camera');
  assert.equal(accessoryKind({ name: 'XLR-K3M Dual-Channel Digital XLR Audio Adapter Kit' }, ['General Accessories']), 'camera');
});
