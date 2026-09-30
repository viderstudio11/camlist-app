// Accessories, sorted the way a camera assistant looks for them. The source files filters by size only
// (4X5.6, 4X4, 6X6, Round) and puts everything else under "General Accessories"; names fill the rest.

export const ACC_KINDS = ['filters', 'mattebox', 'follow', 'lenssupport', 'control', 'timecode', 'viewfinder', 'action', 'underwater', 'camera', 'other'];
export const FILTER_TYPES = ['nd', 'irnd', 'vnd', 'grad', 'diffusion', 'pola', 'color', 'effects', 'closeup', 'protect'];
export const FILTER_SIZES = ['4x5.65', '4x4', '6x6', 'round', 'osmo'];

const has = (subs, ...names) => names.some(n => subs.includes(n));

// Which shelf an accessory sits on. `subs` are its subcategory names in English.
export function accessoryKind(p, subs = []) {
  const n = p.name || '';
  if (has(subs, 'Filters', '4X5.6', '4X4', '6X6', 'Round')) return 'filters';
  if (has(subs, 'Matte Boxes')) return 'mattebox';
  if (has(subs, 'Follow Focus', 'Wireless Follow Focus', 'Manual Follow Focus')) return 'follow';
  if (has(subs, 'Underwater') || /underwater|housing/i.test(n)) return 'underwater';
  if (/lens support|\bls-?\d|15mm/i.test(n)) return 'lenssupport';
  if (/time-?code|syncbox|\bgr-?1\b|clapper|slate|tally/i.test(n)) return 'timecode';
  if (/finder|\bevf\b|viewfinder|loupe/i.test(n)) return 'viewfinder';
  if (/gopro|\bhero\d|media mod|max lens|suction/i.test(n) || /gopro/i.test(p.brandName || '')) return 'action';
  if (/cooler|xlr-k[0-9]|audio adapter|rialto|extension system|giga t|changing tent|remote (timer|shutter)/i.test(n)) return 'camera';
  if (has(subs, 'Controlers') || /zoom|remote|\brcu\b|\bccu\b|\brm-|controller|pan-bar|motor|stream deck/i.test(n)) return 'control';
  return 'other';
}

// What a filter does to the picture.
export function filterType(name = '') {
  if (/irnd|ir\s?nd/i.test(name)) return 'irnd';
  if (/variable nd|\bvnd\b/i.test(name)) return 'vnd';
  if (/\bndg\b|grad/i.test(name)) return 'grad';
  if (/\bnd\s?[\d.]|\bndf\b|solid nd|neutral density/i.test(name)) return 'nd';
  if (/pola/i.test(name)) return 'pola';
  if (/close-?up|diopter/i.test(name)) return 'closeup';
  if (/protector|explosion|clear\b|\buv\b/i.test(name)) return 'protect';
  if (/mist|diffusion|glimmer|soft ?fx|satin|pearlescent|low contrast|black magic|smoque/i.test(name)) return 'diffusion';
  if (/streak|star|flare|bokeh/i.test(name)) return 'effects';
  if (/suede|coral|sepia|tobacco|chocolate|warm|cool|blocker|\bcto\b|\bctb\b|85|80a/i.test(name)) return 'color';
  return null;
}

// The glass size, from the source's size subcategories, else from the name.
export function filterSize(p, subs = []) {
  if (subs.includes('4X5.6')) return '4x5.65';
  if (subs.includes('4X4')) return '4x4';
  if (subs.includes('6X6')) return '6x6';
  if (subs.includes('Round')) return 'round';
  const n = p.name || '';
  if (/osmo/i.test(n)) return 'osmo';
  if (/4\s?[x×]\s?5\.6/i.test(n)) return '4x5.65';
  if (/6\.6\s?[x×]\s?6\.6|6\s?[x×]\s?6/i.test(n)) return '6x6';
  if (/4\s?[x×]\s?4/i.test(n)) return '4x4';
  if (/\b\d{2,3}\s?mm\b/i.test(n)) return 'round';
  return null;
}
