import test from 'node:test';
import assert from 'node:assert/strict';
import { addItem, setQty } from '../js/list.js';
import { activeProject, deptStrip, cameraChips, sunNext } from '../js/home.js';

const ORDER = [
  { id: 7, key: 'cameras' }, { id: 8, key: 'lenses' }, { id: 9, key: 'video' }, { id: 10, key: 'tripods' },
  { id: 11, key: 'grip' }, { id: 12, key: 'power' }, { id: 13, key: 'accessories' },
];
const P = {
  1: { id: 1, name: 'FX6', brandName: 'Sony', dept: 7 },
  2: { id: 2, name: 'ALEXA 35', brandName: 'ARRI', dept: 7 },
  3: { id: 3, name: 'FX3', brandName: 'Sony', dept: 7 },
  4: { id: 4, name: 'VENICE 2', brandName: 'Sony', dept: 7 },
  5: { id: 5, name: '24-70', brandName: 'Sony', dept: 8 },
};
const resolve = (id) => P[id];

test('activeProject is the most recently touched project, or null', () => {
  assert.equal(activeProject([]), null);
  assert.equal(activeProject(undefined), null);
  assert.equal(activeProject([{ id: 'a', updatedAt: 1 }, { id: 'b', updatedAt: 5 }, { id: 'c', updatedAt: 3 }]).id, 'b');
});

test('deptStrip always has the seven departments, zeros when empty', () => {
  const s = deptStrip([], resolve, ORDER);
  assert.equal(s.length, 7);
  assert.deepEqual(s.map(d => d.key), ORDER.map(d => d.key));
  assert.ok(s.every(d => d.qty === 0 && d.share === 0));
});

test('deptStrip shares are relative to the fullest department', () => {
  let items = addItem([], P[1], 2);
  items = addItem(items, P[5], 1);
  const s = deptStrip(items, resolve, ORDER);
  assert.equal(s.find(d => d.key === 'cameras').qty, 2);
  assert.equal(s.find(d => d.key === 'cameras').share, 1);
  assert.equal(s.find(d => d.key === 'lenses').share, 0.5);
  assert.equal(s.find(d => d.key === 'grip').share, 0);
});

test('cameraChips lists up to three cameras, most first', () => {
  let items = addItem([], P[1], 4);
  items = addItem(items, P[2], 2);
  items = addItem(items, P[3], 1);
  items = addItem(items, P[4], 3);
  items = addItem(items, P[5], 9);
  const c = cameraChips(items, resolve, ORDER);
  assert.deepEqual(c, [{ name: 'FX6', qty: 4 }, { name: 'VENICE 2', qty: 3 }, { name: 'ALEXA 35', qty: 2 }]);
  assert.deepEqual(cameraChips(setQty(items, 1, 0).filter(i => P[i.productId].dept !== 7), resolve, ORDER), []);
});

test('sunNext: counts down to the golden hour, then golden, then tomorrow’s sunrise', () => {
  const at = (h, m = 0) => new Date(Date.UTC(2026, 9, 8, h, m));
  const day = { sunset: at(15, 30), goldenEvening: { from: at(14, 40), to: at(15, 30) } };
  const tomorrow = { sunrise: new Date(Date.UTC(2026, 9, 9, 3, 50)) };
  assert.deepEqual(sunNext(at(13, 48), day, tomorrow), { kind: 'before', at: day.sunset, inMin: 52 });
  assert.deepEqual(sunNext(at(15, 0), day, tomorrow), { kind: 'golden', at: day.sunset });
  assert.deepEqual(sunNext(at(16, 0), day, tomorrow), { kind: 'after', at: tomorrow.sunrise });
  assert.equal(sunNext(at(12), { polar: true }), null);
});
