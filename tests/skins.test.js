import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKINS, skin, nextTheme, migrateSettings, THEMES } from '../js/skins.js';

test('the lighting switch cycles day → sun → night → day', () => {
  assert.deepEqual(THEMES, ['light', 'sun', 'dark']);
  assert.equal(nextTheme('light'), 'sun');
  assert.equal(nextTheme('sun'), 'dark');
  assert.equal(nextTheme('dark'), 'light');
  assert.equal(nextTheme('bogus'), 'sun');
});

test('saved v1 skins that were dropped land on a valid look', () => {
  assert.deepEqual(migrateSettings({ skin: 'pixel', theme: 'light' }), { skin: 'clean', theme: 'light' });
  assert.deepEqual(migrateSettings({ skin: 'night', theme: 'light' }), { skin: 'clean', theme: 'dark' });
  assert.deepEqual(migrateSettings({ skin: 'contrast' }), { skin: 'clean', theme: 'sun' });
  assert.deepEqual(migrateSettings({ skin: 'arri', theme: 'dark' }), { skin: 'arri', theme: 'dark' });
  assert.deepEqual(migrateSettings({}), { skin: 'clean', theme: 'dark' });
  assert.deepEqual(migrateSettings({ skin: 'sony', theme: 'weird' }), { skin: 'sony', theme: 'dark' });
});

test('the bank is the default, the seven camera skins and the three camera-world themes', () => {
  assert.deepEqual(SKINS.map(s => s.id), ['clean', 'arri', 'sony', 'blackmagic', 'red', 'panasonic', 'canon', 'broadcast', 'monitor', 'slate', 'barrel']);
  assert.deepEqual(SKINS.filter(s => s.group === 'world').map(s => s.id), ['monitor', 'slate', 'barrel']);
  assert.equal(skin('clean').he, 'ברירת מחדל');
  assert.equal(skin('clean').en, 'Default');
});
