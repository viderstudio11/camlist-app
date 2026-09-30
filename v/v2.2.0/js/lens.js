// Lens classification for the quick filters: type (prime / zoom / set / anamorphic / macro / vintage / adapter),
// mount and sensor coverage. Utopia's subcategories cover part of it; names fill the rest.
// 24-70mm · "zoom" · broadcast zoom-ratio notation: HJ14ex4.3, J11AX4.5, A10x4.8
const ZOOM_RX = /\d+\s*-\s*\d+\s*(mm)?\b|\bzoom\b|\d+(\.\d+)?\s*(e?x|ax)\s*\d/i;
const PRIME_RX = /(^|[^\d-])\d{1,3}(\.\d)?\s*mm(?!\s*-\s*\d)/i;                        // 50mm, T1.5 85 mm
const SET_RX = /\bset\b|\bkit\b|\bprime \d\b|\bof \d+\b/i;
// Adapters/extenders only — a lens named "… 50mm PL-Mount" must NOT match, so a bare "mount" is not enough.
const ADAPTER_RX = /adapter|adaptor|extender|converter|\bto\b[\w\s-]{0,12}mount|^.{0,24}lens mount\s*$/i;

export const LENS_TYPES = ['prime', 'zoom', 'set', 'anamorphic', 'macro', 'vintage', 'adapter'];

// Returns every type that applies, so an anamorphic prime is found under both "prime" and "anamorphic".
export function lensTypes(product, subNames = []) {
  const name = product.name || '';
  const has = (s) => subNames.includes(s);
  const out = new Set();
  // Utopia files a few real lenses under "Lens Adapters", so the name wins when it looks like glass.
  const looksLikeLens = ZOOM_RX.test(name) || PRIME_RX.test(name);
  if (ADAPTER_RX.test(name) || (has('Lens Adapters') && !looksLikeLens)) { out.add('adapter'); return [...out]; }
  if (has('Lens Sets') || SET_RX.test(name)) out.add('set');
  if (has('Anamorphic') || /anamorphic/i.test(name)) out.add('anamorphic');
  if (has('Macro') || /\bmacro\b|probe/i.test(name)) out.add('macro');
  if (has('Vintage Lenses') || /vintage/i.test(name)) out.add('vintage');
  if (has('35mm Zoom') || ZOOM_RX.test(name)) out.add('zoom');
  else if (has('35mm Prime') || PRIME_RX.test(name)) out.add('prime');
  // A set of primes is still a prime set; a set with a range in the name is a zoom set.
  if (out.has('set') && !out.has('zoom') && !out.has('prime') && /prime/i.test(name)) out.add('prime');
  return [...out];
}

// Coverage buckets used by the filter row: Full Frame and larger vs cropped sensors.
export const FORMATS = ['FF', 'S35', 'MFT', '2/3', '16', 'MF'];
