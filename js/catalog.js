export const normalize = (s = '') => String(s).toLowerCase()
  .replace(/[֑-ׇ]/g, '')            // hebrew diacritics
  .replace(/[-_/\\.,()\[\]"'+:;|]+/g, ' ')
  .replace(/\s+/g, ' ').trim();

// data = data/catalog.json; manual = user's own items; extra = data/extra.json (products the source catalog
// doesn't carry, referenced by department slug + subcategory English name, flagged `extra: true`).

// The source catalog files its own no-name gear (apple boxes, sand bags, pipes) under the rental house's
// name. The app never shows that name: those, and anything without a brand, read as "General".
export const GENERAL = 'general';
const HOUSE_BRANDS = new Set(['utopia']);
const brandOf = (b) => (!b || HOUSE_BRANDS.has(b) ? GENERAL : b);
export function createCatalog(data, manual = [], extra = null) {
  const departments = (data.departments || []).map(d => ({ ...d })).sort((a, b) => a.order - b.order);
  const sourceDepts = departments.slice();   // moves name the source's shelves, never the supplement's namesakes
  // The supplement can add departments of its own (numeric ids, like the source's, so the screens treat
  // them the same) and slot each one in after a named department.
  (extra?.departments || []).forEach((x, i) => {
    const id = 990001 + i;
    const dept = { id, slug: x.slug, he: x.he, en: x.en, order: 0,
      subcategories: (x.subcategories || []).map((sc, j) => ({ id: id * 100 + j + 1, parent: null, he: sc.he, en: sc.en })) };
    const at = departments.findIndex(d => d.slug === x.after);
    departments.splice(at < 0 ? departments.length : at + 1, 0, dept);
  });
  // …and add subcategories to the source's own departments (Power → Power Cables).
  (extra?.extend || []).forEach((x, i) => {
    const d = departments.find(dd => dd.slug === x.dept);
    if (d) d.subcategories = [...d.subcategories, ...(x.subcategories || []).map((sc, j) => ({ id: 995001 + i * 100 + j, parent: null, he: sc.he, en: sc.en }))];
  });
  const deptMap = new Map(departments.map(d => [d.id, d]));
  // Utopia nests some subcategories (Follow Focus → Wireless / Manual, Filters → 4X5.6 …) and files
  // products only on the deepest one. A subcategory therefore stands for itself plus everything under it.
  const children = new Map();
  for (const d of departments) for (const sc of d.subcategories || []) {
    if (sc.parent != null) children.set(sc.parent, [...(children.get(sc.parent) || []), sc.id]);
  }
  const withDescendants = (id) => {
    const out = new Set([id]);
    for (const x of out) for (const c of children.get(x) || []) out.add(c);
    return out;
  };
  const subcatMap = new Map();
  for (const d of departments) for (const s of d.subcategories || []) subcatMap.set(s.id, { ...s, dept: d.id });
  const brandNames = new Map((data.brands || []).filter(b => !HOUSE_BRANDS.has(b.id)).map(b => [b.id, b.name]));
  brandNames.set(GENERAL, 'General');
  for (const b of extra?.brands || []) brandNames.set(b.id, b.name); // supplement's display names win
  // Moves re-file source products by name — e.g. cards and readers out of Video into Media & Offload.
  const subByName = (en) => sourceDepts.flatMap(d => d.subcategories.map(sc => ({ ...sc, dept: d.id }))).find(sc => sc.en === en || sc.he === en);
  const moves = (extra?.moves || []).map(m => {
    const from = subByName(m.from);
    const dept = departments.find(d => d.slug === m.to);
    const to = dept?.subcategories.find(sc => sc.en === m.subcat);
    return from && dept ? { from: from.id, rx: new RegExp(m.match, 'i'), dept: dept.id, subcats: to ? [to.id] : [] } : null;
  }).filter(Boolean);
  const moved = (p) => {
    const m = moves.find(x => (p.subcats || []).includes(x.from) && x.rx.test(p.name));
    return m ? { ...p, dept: m.dept, subcats: m.subcats } : p;
  };
  const extraProducts = (extra?.products || []).map(x => {
    const d = departments.find(dd => dd.slug === x.dept);
    const s = d?.subcategories.find(ss => ss.en === x.subcat || ss.he === x.subcat);
    return d ? { ...x, dept: d.id, subcats: s ? [s.id] : [], extra: true } : null;
  }).filter(Boolean);

  const products = [];
  const byIdMap = new Map();
  let manualProducts = [];

  const decorate = (p, isManual) => ({
    id: p.id, name: p.name, brand: brandOf(p.brand),
    brandName: brandOf(p.brand) === GENERAL ? 'General' : p.brandName || brandNames.get(p.brand) || p.brand,
    dept: p.dept, subcats: p.subcats || [], image: p.image || null, url: p.url || null, manual: !!isManual, extra: !!p.extra,
    _n: '', _b: '', _all: '',
  });
  const indexOf = (p) => {
    const sub = p.subcats.map(id => subcatMap.get(id)).filter(Boolean).map(s => `${s.he} ${s.en}`).join(' ');
    p._n = normalize(p.name);
    p._b = normalize(p.brandName || '');
    p._all = normalize(`${p.name} ${p.brandName || ''} ${sub}`);
    return p;
  };
  for (const raw of [...(data.products || []).map(moved), ...extraProducts]) {
    const p = indexOf(decorate(raw, false));
    if (p.brand && !brandNames.has(p.brand)) brandNames.set(p.brand, p.brandName);
    products.push(p); byIdMap.set(p.id, p);
  }
  const brands = (data.brands || []).filter(b => !HOUSE_BRANDS.has(b.id)).map(b => ({ ...b }));
  const generalCount = products.filter(p => p.brand === GENERAL).length;
  if (generalCount) brands.push({ id: GENERAL, name: 'General', count: generalCount });
  for (const x of extraProducts) { if (!x.brand) continue; let b = brands.find(bb => bb.id === x.brand); if (!b) { b = { id: x.brand, name: brandNames.get(x.brand), count: 0 }; brands.push(b); } b.name = brandNames.get(x.brand) || b.name; b.count++; }

  function setManual(list) {
    for (const m of manualProducts) byIdMap.delete(m.id);
    manualProducts = (list || []).map(m => indexOf(decorate(m, true)));
    for (const m of manualProducts) { byIdMap.set(m.id, m); if (m.brand && !brandNames.has(m.brand)) brandNames.set(m.brand, m.brandName); }
  }
  setManual(manual);

  const all = () => products.concat(manualProducts);

  function search(q, { dept = null, brand = null, subcat = null, limit = 100 } = {}) {
    const nq = normalize(q);
    const tokens = nq ? nq.split(' ') : [];
    const out = [];
    for (const p of all()) {
      if (dept !== null && dept !== undefined && p.dept !== dept) continue;
      if (brand && p.brand !== brand) continue;
      if (subcat && !p.subcats.includes(subcat)) continue;
      if (tokens.length && !tokens.every(tk => p._all.includes(tk))) continue;
      // 0: name starts with query · 1: query is the brand (e.g. "arri" → ALEXA 35) · 2: name contains query · 3: subcategory/other
      let score = 3;
      if (nq && p._n.startsWith(nq)) score = 0;
      else if (tokens.length && p._b && tokens.every(tk => p._b.includes(tk))) score = 1;
      else if (nq && p._n.includes(nq)) score = 2;
      out.push({ p, score });
    }
    out.sort((a, b) => a.score - b.score); // stable: ties keep catalog order (dept → brand → name)
    return out.slice(0, limit).map(o => o.p);
  }

  return {
    departments, brands, products,
    byId: (id) => byIdMap.get(id),
    byDept: (deptId) => all().filter(p => p.dept === deptId),
    bySubcat: (id) => { const ids = withDescendants(id); return all().filter(p => p.subcats.some(x => ids.has(x))); },
    byBrand: (slug) => all().filter(p => p.brand === slug),
    subcatsOf: (deptId) => (deptMap.get(deptId)?.subcategories || []).filter(s => s.parent === null),
    deptById: (id) => deptMap.get(id),
    deptKey: (id) => deptMap.get(id)?.slug || 'other',
    brandName: (slug) => brandNames.get(slug) || slug,
    search, setManual,
    // A named set from the supplement (the basic expendables cart), limited to items that exist.
    preset: (name) => (extra?.presets?.[name] || []).filter(x => byIdMap.has(x.id)),
    generatedAt: data.generatedAt || null,
  };
}

export async function loadCatalog(url = 'data/catalog.json') {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`catalog ${res.status}`);
  return res.json();
}
