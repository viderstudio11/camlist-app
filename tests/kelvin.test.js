import test from 'node:test';
import assert from 'node:assert/strict';
import { rgbToCct, lockedToLight, kelvinLabel } from '../js/tools/kelvin.js';

test('a neutral pixel reads as sRGB’s own white, about 6500 K', () => {
  const k = rgbToCct(200, 200, 200);
  assert.ok(Math.abs(k - 6500) < 150, k);
});

test('warmer pixels read lower, cooler pixels higher', () => {
  assert.ok(rgbToCct(255, 190, 130) < rgbToCct(220, 220, 220));
  assert.ok(rgbToCct(180, 200, 255) > rgbToCct(220, 220, 220));
});

test('with white balance locked, a neutral card means the light matches the lock', () => {
  assert.ok(Math.abs(lockedToLight(6504, 5500) - 5500) < 1);
  // a card that reads warmer than neutral means the light is warmer than the lock
  assert.ok(lockedToLight(4000, 5500) < 5500);
});

test('the reading gets a plain name', () => {
  assert.equal(kelvinLabel(3200), 'k_tungsten');
  assert.equal(kelvinLabel(5600), 'k_daylight');
  assert.equal(kelvinLabel(7500), 'k_shade');
});
