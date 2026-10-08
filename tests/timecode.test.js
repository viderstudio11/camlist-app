import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTc, formatTc, runFrom, dayFrames } from '../js/tools/timecode.js';

test('parseTc reads typed timecode in any separator, and refuses what cannot exist', () => {
  assert.equal(parseTc('01:00:00:00', 25), 90000);
  assert.equal(parseTc('01000000', 25), 90000);
  assert.equal(parseTc('00:00:01:25', 25), null);       // 25 fps counts frames 0–24
  assert.equal(parseTc('00:00:01:23', 25), 48);
  assert.equal(parseTc('24:00:00:00', 25), null);
  assert.equal(parseTc('12:34', 25), null);
  assert.equal(parseTc('00:01:00;00', 29.97), null);    // dropped label
  assert.equal(parseTc('00:01:00;02', 29.97), 1800);
  assert.equal(parseTc('00:10:00;00', 29.97), 17982);
});

test('formatTc writes frames back, drop-frame labels for 29.97', () => {
  assert.equal(formatTc(90000, 25), '01:00:00:00');
  assert.equal(formatTc(1800, 29.97), '00:01:00;02');
  assert.equal(formatTc(17982, 29.97), '00:10:00;00');
  assert.equal(formatTc(dayFrames(25) + 5, 25), '00:00:00:05');   // past midnight wraps
  for (const tc of ['13:59:59;29', '00:09:59;29', '23:59:59;29']) assert.equal(formatTc(parseTc(tc, 29.97), 29.97), tc);
  assert.equal(formatTc(parseTc('10:00:00:00', 23.976), 23.976), '10:00:00:00');
});

test('runFrom counts real frames since the jam', () => {
  assert.equal(runFrom(100, 0, 1000, 25), 125);
  assert.equal(runFrom(0, 0, 1001, 23.976), 24);
  assert.equal(runFrom(0, 0, 60060, 29.97), 1800);
});
