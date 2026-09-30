export const snapshotOf = (p) => ({ name: p.name, brand: p.brand || null, brandName: p.brandName || null, dept: p.dept });

export function addItem(items, product, qty = 1) {
  const i = items.findIndex(x => x.productId === product.id);
  if (i >= 0) return items.map((x, k) => (k === i ? { ...x, qty: x.qty + qty } : x));
  return [...items, { productId: product.id, qty, note: '', snapshot: snapshotOf(product) }];
}
export function setQty(items, productId, qty) {
  if (qty <= 0) return removeItem(items, productId);
  return items.map(x => (x.productId === productId ? { ...x, qty } : x));
}
export const setNote = (items, productId, note) => items.map(x => (x.productId === productId ? { ...x, note } : x));
export const removeItem = (items, productId) => items.filter(x => x.productId !== productId);
export const getQty = (items, productId) => items.find(x => x.productId === productId)?.qty || 0;
export const totalQty = (items) => items.reduce((s, x) => s + x.qty, 0);

export function groupByDept(items, resolve, deptOrder) {
  const groups = deptOrder.map(d => ({ dept: d.id, key: d.key, entries: [] }));
  const other = { dept: 'other', key: 'other', entries: [] };
  for (const item of items) {
    const product = resolve(item.productId) || { id: item.productId, ...item.snapshot };
    const g = groups.find(x => x.dept === product.dept) || other;
    g.entries.push({ item, product });
  }
  return [...groups, other].filter(g => g.entries.length);
}
