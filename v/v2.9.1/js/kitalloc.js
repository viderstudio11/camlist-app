// Each camera built around keeps its own kit: the units added through that camera's kit slots.
// A project from before this existed has no allocation at all; its one built camera keeps counting the
// whole list until a second camera is built, and then its progress so far is written down as its own.

// The allocation to pass to compat.kitStatus: null = the old whole-list counting.
export const allocFor = (project, camId) => (project.kitAlloc ? project.kitAlloc[camId] || {} : null);

// Called before a camera's allocation first changes. Seeds the map from the whole-list counts of the camera
// that was being built, so switching cameras never loses what the first one had.
export function ensureAlloc(project, compat, resolve) {
  if (project.kitAlloc) return { ...project.kitAlloc };
  const out = {};
  const cam = project.buildCameraId != null ? resolve(project.buildCameraId) : null;
  const prof = cam ? compat.profileFor(cam) : null;
  if (prof) out[project.buildCameraId] = Object.fromEntries(compat.kitStatus(prof, project.items, resolve).map(s => [s.slot, s.have]));
  return out;
}

// Add (or take back) units on one camera's slot.
export function bump(alloc, camId, slot, delta) {
  const cam = { ...(alloc[camId] || {}) };
  cam[slot] = Math.max(0, (cam[slot] || 0) + delta);
  return { ...alloc, [camId]: cam };
}
