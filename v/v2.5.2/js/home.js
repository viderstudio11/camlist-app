// What the home screen's hero card shows about the project you are working on: which project that
// is, how full each department is, and which cameras it is built on.
import { groupByDept } from './list.js';

const qtyOf = (entries) => entries.reduce((s, e) => s + e.item.qty, 0);

// The project touched last is the one you are most likely coming back to.
export function activeProject(projects) {
  if (!projects?.length) return null;
  return projects.reduce((a, b) => ((b.updatedAt || 0) > (a.updatedAt || 0) ? b : a));
}

// One entry per catalog department, in catalog order, even when empty — the strip never changes
// shape. share is relative to the fullest department, so the bars read as proportions.
export function deptStrip(items, resolve, order) {
  const groups = groupByDept(items || [], resolve, order);
  const rows = order.map(d => ({ key: d.key, qty: qtyOf(groups.find(g => g.key === d.key)?.entries || []) }));
  const max = Math.max(0, ...rows.map(r => r.qty));
  return rows.map(r => ({ ...r, share: max ? r.qty / max : 0 }));
}

// The camera bodies in the list, most first, at most three — short model names, no brand.
export function cameraChips(items, resolve, order) {
  const cams = groupByDept(items || [], resolve, order).find(g => g.key === 'cameras');
  if (!cams) return [];
  return cams.entries
    .map(({ item, product }) => ({ name: product.name, qty: item.qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 3);
}
