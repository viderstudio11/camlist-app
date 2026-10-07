// On a desktop-wide window the gear list and the catalog share the screen, so adding gear never
// means leaving the list. Phones and narrow windows keep one screen at a time.
export const SPLIT_MIN = 1024;

// The project id in a list or add-gear route, or null for every other screen.
export const splitProjectId = (hash) => hash.match(/^#\/p\/([^/]+)(?:\/add)?$/)?.[1] ?? null;

export const isSplitRoute = (hash, width) => width >= SPLIT_MIN && splitProjectId(hash) !== null;

// After a store change, redraw only the pane you are not working in. Each pane already updates
// itself in place; redrawing the one under your finger would swallow the click that caused it.
export const panesToRefresh = ({ inList, inCat }) => ({ list: !inList, cat: !inCat });
