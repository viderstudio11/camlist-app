import test from 'node:test';
import assert from 'node:assert/strict';
import { allocFor, bump } from '../js/kitalloc.js';

test('a camera without an allocation counts nothing once allocations exist; none at all means the old counting', () => {
  assert.equal(allocFor({ items: [] }, 1), null);
  assert.deepEqual(allocFor({ kitAlloc: { 1: { media: 2 } } }, 2), {});
  assert.deepEqual(allocFor({ kitAlloc: { 1: { media: 2 } } }, 1), { media: 2 });
});

test('bumping a slot adds and takes back, never below zero, and leaves other cameras alone', () => {
  let a = bump({ 1: { media: 2 } }, 2, 'battery', 6);
  assert.deepEqual(a, { 1: { media: 2 }, 2: { battery: 6 } });
  a = bump(a, 2, 'battery', -10);
  assert.equal(a[2].battery, 0);
});
