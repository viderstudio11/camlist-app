export const snapshotOf = (p) => ({ name: p.name, brand: p.brand || null, brandName: p.brandName || null, dept: p.dept });

// `parent`: the item this one was picked for (a monitor's D-Tap cable, a gimbal's spare grip). It keeps
// that context for good — the list and every export show it under that item. An item first added on
// its own stays on its own.
export function addItem(items, product, qty = 1, parent = null) {
  const i = items.findIndex(x => x.productId === product.id);
  if (i >= 0) return items.map((x, k) => (k === i ? { ...x, qty: x.qty + qty } : x));
  return [...items, { productId: product.id, qty, note: '', snapshot: snapshotOf(product), ...(parent != null ? { for: parent } : {}) }];
}
export function setQty(items, productId, qty) {
  if (qty <= 0) return removeItem(items, productId);
  return items.map(x => (x.productId === productId ? { ...x, qty } : x));
}
export const setNote = (items, productId, note) => items.map(x => (x.productId === productId ? { ...x, note } : x));
export const removeItem = (items, productId) => items.filter(x => x.productId !== productId);
export const getQty = (items, productId) => items.find(x => x.productId === productId)?.qty || 0;
export const totalQty = (items) => items.reduce((s, x) => s + x.qty, 0);

// Departments in their order, items in the order they were added — except that an accessory picked for
// an item in the list sits right under that item, in its department (entry.accessory = true).
export function groupByDept(items, resolve, deptOrder) {
  const groups = deptOrder.map(d => ({ dept: d.id, key: d.key, entries: [] }));
  const other = { dept: 'other', key: 'other', entries: [] };
  const inList = new Set(items.map(x => x.productId));
  const isAcc = (item) => item.for != null && item.for !== item.productId && inList.has(item.for);
  const entryOf = (item) => ({ item, product: resolve(item.productId) || { id: item.productId, ...item.snapshot } });
  const placed = new Set();
  const place = (g, item, depth) => {
    if (placed.has(item.productId)) return;
    placed.add(item.productId);
    g.entries.push({ ...entryOf(item), ...(depth ? { accessory: true } : {}) });
    for (const acc of items.filter(x => isAcc(x) && x.for === item.productId)) place(g, acc, depth + 1);
  };
  for (const item of items) {
    if (isAcc(item)) continue;
    const { product } = entryOf(item);
    place(groups.find(x => x.dept === product.dept) || other, item, 0);
  }
  // an accessory whose chain never reaches a listed item (a loop) still gets listed on its own
  for (const item of items) if (!placed.has(item.productId)) place(groups.find(x => x.dept === entryOf(item).product.dept) || other, item, 0);
  return [...groups, other].filter(g => g.entries.length);
}
