import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/store.js';

const mem = () => { let s = null; return { get: () => s, set: (v) => { s = v; } }; };

test('starts empty with default settings and persists on change', () => {
  const st = mem();
  const store = createStore(st);
  assert.deepEqual(store.state.settings, { lang: 'he', techManager: '', theme: 'light', skin: 'clean' });
  store.setSettings({ lang: 'en' });
  assert.equal(JSON.parse(st.get()).settings.lang, 'en');
  assert.equal(createStore(st).state.settings.lang, 'en');
});

test('project CRUD + duplicate + items', () => {
  const store = createStore(mem());
  const p = store.createProject({ name: 'Race', techManager: 'Amir' });
  assert.match(p.id, /^p_/);
  assert.equal(store.getProject(p.id).name, 'Race');
  store.setItems(p.id, [{ productId: 1, qty: 2, note: '', snapshot: { name: 'FX6', brand: 'sony', brandName: 'Sony', dept: 7 } }]);
  const d = store.duplicateProject(p.id);
  assert.notEqual(d.id, p.id);
  assert.equal(d.items.length, 1);
  assert.equal(d.name, 'Race (2)');
  store.updateProject(p.id, { name: 'Race 12' });
  assert.equal(store.getProject(p.id).name, 'Race 12');
  store.deleteProject(p.id);
  assert.equal(store.state.projects.length, 1);
});

test('manual products: add, refuse delete when used', () => {
  const store = createStore(mem());
  const m = store.addManualProduct({ name: 'Shogun', brand: 'atomos', brandName: 'Atomos', dept: 'other' });
  assert.match(m.id, /^m_/);
  const p = store.createProject({ name: 'X' });
  store.setItems(p.id, [{ productId: m.id, qty: 1, note: '', snapshot: {} }]);
  assert.deepEqual(store.deleteManualProduct(m.id), { ok: false, usedBy: ['X'] });
  store.setItems(p.id, []);
  assert.deepEqual(store.deleteManualProduct(m.id), { ok: true, usedBy: [] });
});

test('backup export/import merges by id, rejects invalid', () => {
  const a = createStore(mem());
  const p = a.createProject({ name: 'A' });
  const m = a.addManualProduct({ name: 'M', brand: null, brandName: null, dept: 'other' });
  const backup = a.exportBackup();
  assert.equal(backup.app, 'camlist');
  const b = createStore(mem());
  b.createProject({ name: 'B' });
  const r = b.importBackup(backup);
  assert.deepEqual(r, { projects: 1, manual: 1 });
  assert.deepEqual(b.state.projects.map(x => x.name).sort(), ['A', 'B']);
  assert.equal(b.state.manualProducts[0].id, m.id);
  b.importBackup({ ...backup, projects: [{ ...p, name: 'A2' }] });
  assert.equal(b.getProject(p.id).name, 'A2');
  assert.throws(() => b.importBackup({ app: 'other' }));
  assert.throws(() => b.importBackup(null));
});

test('subscribe fires on every mutation', () => {
  const store = createStore(mem());
  let n = 0; store.subscribe(() => n++);
  store.createProject({ name: 'X' });
  store.setSettings({ techManager: 'A' });
  assert.equal(n, 2);
});

test('versions snapshot the list and restoring never loses the current one', () => {
  const store = createStore(mem());
  const p = store.createProject({ name: 'Version test' });
  store.setItems(p.id, [{ productId: 1, qty: 2, note: '' }]);
  const v1 = store.saveVersion(p.id, 'day one');
  assert.equal(store.getProject(p.id).versions.length, 1);
  assert.equal(v1.items[0].qty, 2);

  store.setItems(p.id, [{ productId: 1, qty: 9, note: '' }, { productId: 2, qty: 1, note: '' }]);
  assert.equal(store.restoreVersion(p.id, v1.id, 'before restore'), true);

  const after = store.getProject(p.id);
  assert.equal(after.items.length, 1);
  assert.equal(after.items[0].qty, 2);
  // Restoring kept the state it replaced, so the 9 is still reachable.
  assert.equal(after.versions.length, 2);
  assert.equal(after.versions[0].label, 'before restore');
  assert.equal(after.versions[0].items.find(i => i.productId === 1).qty, 9);

  // A snapshot is a copy, not a live reference.
  store.setItems(p.id, [{ productId: 1, qty: 5, note: '' }]);
  assert.equal(v1.items[0].qty, 2);

  store.deleteVersion(p.id, v1.id);
  assert.equal(store.getProject(p.id).versions.some(v => v.id === v1.id), false);
  assert.equal(store.restoreVersion(p.id, 'nope'), false);
});

test('a corrupted save is kept aside, not overwritten, and the app says so', () => {
  const kept = {};
  const st = { get: () => '{"projects":[{"id":"p_1","name":"Big sh', set: () => {}, keep: (k, v) => { kept[k] = v; } };
  const store = createStore(st);
  assert.equal(store.state.projects.length, 0);
  assert.ok(store.recovered, 'the app knows it started over');
  assert.deepEqual(Object.values(kept), ['{"projects":[{"id":"p_1","name":"Big sh']);
});

test('saves carry a schema number', () => {
  const st = mem();
  createStore(st).setSettings({ lang: 'en' });
  assert.equal(JSON.parse(st.get()).schema, 1);
});

test('a change saved in another window is taken in, not overwritten by this one', () => {
  const st = mem();
  const a = createStore(st), b = createStore(st);
  const p = a.createProject({ name: 'From A' });
  b.reloadFrom(st.get());                         // the browser's storage event, in the app
  assert.equal(b.getProject(p.id)?.name, 'From A');
  b.createProject({ name: 'From B' });
  assert.deepEqual(JSON.parse(st.get()).projects.map(x => x.name).sort(), ['From A', 'From B']);
});
