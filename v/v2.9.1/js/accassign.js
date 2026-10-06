// Items added before the list remembered what an accessory was picked for: find the ones that fit a kit
// slot of another item in the list (a D-Tap cable next to a monitor), so they can be placed under it.
// Nothing moves on its own — the list proposes, the user confirms; with several fitting items the user picks.
import { gearKitFor, kitSlotsOf } from './gearkits.js';

// → [{ productId, candidates: [parentId…] }] for items with no parent yet that fit at least one kit.
export function proposeParents(project, catalog, resolve, { dismissed = [] } = {}) {
  const items = project.items || [];
  const skip = new Set(dismissed.map(String));
  const parents = items.map(it => ({ it, p: resolve(it.productId) }))
    .map(x => ({ ...x, kit: x.p ? gearKitFor(catalog, x.p) : null }))
    .filter(x => x.kit);
  const camera = project.buildCameraId != null ? resolve(project.buildCameraId) : null;
  const out = [];
  for (const it of items) {
    if (it.for != null || skip.has(String(it.productId))) continue;
    const p = resolve(it.productId);
    if (!p || gearKitFor(catalog, p)) continue;                  // a unit with its own kit is nobody's accessory
    const candidates = parents
      .filter(x => x.it.productId !== it.productId)
      .filter(x => kitSlotsOf(x.kit, x.p, { camera, route: (project.powerRoute || {})[x.p.id] }).some(s => s.match.test(p.name)))
      .map(x => x.it.productId);
    if (candidates.length) out.push({ productId: it.productId, candidates });
  }
  return out;
}

// Place an item under another one (the same field an accessory picked from a suggestion carries).
export const setParent = (items, productId, parentId) => items.map(x => (x.productId === productId ? { ...x, for: parentId } : x));
