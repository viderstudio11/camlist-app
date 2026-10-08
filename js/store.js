const KEY = 'camlist.v1';
const DEFAULT = () => ({ settings: { lang: 'he', techManager: '', theme: 'dark', skin: 'clean' }, manualProducts: [], projects: [] });

// The shape of a save. Raise it when the stored shape changes, and migrate older saves in parse().
export const SCHEMA = 1;

export function localStorageAdapter() {
  return {
    get: () => { try { return globalThis.localStorage?.getItem(KEY) ?? null; } catch { return null; } },
    set: (v) => { globalThis.localStorage.setItem(KEY, v); },
    // a save that cannot be read is kept under its own key, so it can still be recovered by hand
    keep: (k, v) => { try { globalThis.localStorage.setItem(k, v); } catch { /* storage full: nothing more to do */ } },
  };
}

const now = () => new Date().toISOString();
const uid = (prefix) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function createStore(storage = localStorageAdapter()) {
  let state = DEFAULT();
  let storageOk = true;
  let recovered = false;
  const parse = (raw) => { const parsed = JSON.parse(raw); return { ...DEFAULT(), ...parsed, settings: { ...DEFAULT().settings, ...(parsed.settings || {}) } }; };
  const raw0 = storage.get();
  if (raw0) {
    try { state = parse(raw0); } catch {
      // Unreadable (a write cut short, say). Starting empty would overwrite it on the next save, so the
      // original is set aside first and the app tells the user.
      storage.keep?.(`${KEY}.unreadable.${Date.now()}`, raw0);
      state = DEFAULT(); recovered = true;
    }
  }

  const listeners = new Set();
  const emit = () => {
    try { storage.set(JSON.stringify({ ...state, schema: SCHEMA })); storageOk = true; } catch { storageOk = false; }
    listeners.forEach(fn => fn(state));
  };
  const project = (id) => state.projects.find(p => p.id === id);
  const touch = (p) => { p.updatedAt = now(); };

  const store = {
    get state() { return state; },
    get storageOk() { return storageOk; },
    get recovered() { return recovered; },
    // Another window of the app (the installed app and a browser tab) saved: take its state in, so this
    // window's next save builds on it instead of writing over it.
    reloadFrom(raw) {
      if (!raw) return;
      try { state = parse(raw); } catch { return; }
      listeners.forEach(fn => fn(state));
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    setSettings(patch) { state.settings = { ...state.settings, ...patch }; state.settingsUpdatedAt = now(); emit(); },
    createProject(fields = {}) {
      const p = { id: uid('p'), name: '', techManager: state.settings.techManager || '', role: state.settings.role || 'ac', dateFrom: '', dateTo: '', notes: '',
        ...fields, items: fields.items ? [...fields.items] : [], createdAt: now(), updatedAt: now() };
      state.projects.unshift(p); emit(); return p;
    },
    getProject: project,
    updateProject(id, patch) { const p = project(id); if (!p) return; Object.assign(p, patch); touch(p); emit(); },
    deleteProject(id) { state.projects = state.projects.filter(p => p.id !== id); emit(); },
    duplicateProject(id) {
      const src = project(id); if (!src) return null;
      const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = src;
      return store.createProject({ ...rest, name: `${src.name || ''} (2)`.trim(), items: src.items.map(x => ({ ...x })) });
    },
    setItems(id, items) { const p = project(id); if (!p) return; p.items = items; touch(p); emit(); },
    setBuildCamera(id, productId) { const p = project(id); if (!p) return; p.buildCameraId = productId ?? null; touch(p); emit(); },
    setShoot(id, patch) { const p = project(id); if (!p) return; Object.assign(p, patch); touch(p); emit(); },

    // Versions are snapshots of the list, kept so a change can be undone days later.
    // Restoring one snapshots the current state first, so nothing is ever lost by restoring.
    saveVersion(id, label = '') {
      const p = project(id);
      if (!p) return null;
      p.versions = p.versions || [];
      const v = {
        id: uid('v'),
        label: String(label || '').slice(0, 60),
        at: now(),
        items: JSON.parse(JSON.stringify(p.items || [])),
        buildCameraId: p.buildCameraId ?? null,
      };
      p.versions.unshift(v);
      p.versions = p.versions.slice(0, 30);
      touch(p); emit();
      return v;
    },
    restoreVersion(id, versionId, autoLabel = '') {
      const p = project(id);
      const v = p?.versions?.find(x => x.id === versionId);
      if (!p || !v) return false;
      store.saveVersion(id, autoLabel);
      p.items = JSON.parse(JSON.stringify(v.items));
      p.buildCameraId = v.buildCameraId ?? null;
      touch(p); emit();
      return true;
    },
    deleteVersion(id, versionId) {
      const p = project(id);
      if (!p?.versions) return;
      p.versions = p.versions.filter(x => x.id !== versionId);
      touch(p); emit();
    },
    addManualProduct({ name, brand = null, brandName = null, dept = 'other' }) {
      const m = { id: uid('m'), name: String(name).trim(), brand, brandName, dept, createdAt: now() };
      state.manualProducts.push(m); emit(); return m;
    },
    deleteManualProduct(id) {
      const usedBy = state.projects.filter(p => p.items.some(i => i.productId === id)).map(p => p.name);
      if (usedBy.length) return { ok: false, usedBy };
      state.manualProducts = state.manualProducts.filter(m => m.id !== id); emit();
      return { ok: true, usedBy: [] };
    },
    exportBackup() { return { app: 'camlist', version: 1, exportedAt: now(), ...structuredClone(state) }; },
    importBackup(obj) {
      if (!obj || obj.app !== 'camlist' || !Array.isArray(obj.projects)) throw new Error('invalid backup');
      let projects = 0, manual = 0;
      for (const p of obj.projects) {
        const i = state.projects.findIndex(x => x.id === p.id);
        if (i >= 0) state.projects[i] = p; else state.projects.unshift(p);
        projects++;
      }
      for (const m of obj.manualProducts || []) {
        const i = state.manualProducts.findIndex(x => x.id === m.id);
        if (i >= 0) state.manualProducts[i] = m; else state.manualProducts.push(m);
        manual++;
      }
      if (obj.settings && obj.exportedAt && obj.exportedAt > (state.settingsUpdatedAt || '')) state.settings = { ...state.settings, ...obj.settings };
      emit();
      return { projects, manual };
    },
  };
  return store;
}
