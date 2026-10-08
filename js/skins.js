// Design skins. A skin is a whole language, not a palette: typeface, density, how a selected row
// is marked, how a department heading is drawn, what a button looks like, whether numerals are
// monospaced. It is applied by putting data-skin on the root element, so switching is pure CSS.
//
// The camera skins are an homage in colour, type and proportion to the menus those cameras show —
// moving from ARRI to SONY should feel like picking up a different body. They are not copies of
// anyone's interface.
//
// `fonts` names the Google Fonts families a skin needs. They are fetched only when that skin is
// chosen, so eleven typefaces never load at once. Hebrew always falls through to a face that has it.

export const SKINS = [
  {
    id: 'clean', group: 'plain',
    he: 'ברירת מחדל', en: 'Default',
    descHe: 'מכשיר מדידה: ענבר, שנתות סקאלה ומספרים טבלאיים',
    descEn: 'Measuring instrument: amber, scale ticks and tabular numerals',
    swatch: ['#F4F3EF', '#16171A', '#E88A00'],
    // Karantina, Heebo and Barlow Condensed are loaded by style.css for every skin.
    fonts: [],
  },
  {
    id: 'arri', group: 'camera',
    he: 'ARRI', en: 'ARRI',
    descHe: 'אפור שטוח, ענבר, תוויות באותיות קטנות ומספרים במונוספייס',
    descEn: 'Flat grey, amber, small-caps labels and monospaced numerals',
    swatch: ['#262626', '#EFEFEF', '#FFB020'],
    fonts: ['Heebo:wght@400;500;700;800;900', 'IBM+Plex+Mono:wght@400;500;600'],
  },
  {
    id: 'sony', group: 'camera',
    he: 'SONY', en: 'SONY',
    descHe: 'שחור וכחול, פונט צר ושורות צפופות — הרבה פרמטרים במסך',
    descEn: 'Black and blue, condensed type, dense rows — many parameters on screen',
    swatch: ['#0B0B0B', '#EDEDED', '#1273E6'],
    fonts: ['Barlow+Condensed:wght@400;500;600;700', 'Noto+Sans+Hebrew:wght@400;500;700;800'],
  },
  {
    id: 'blackmagic', group: 'camera',
    he: 'Blackmagic', en: 'Blackmagic',
    descHe: 'פחם, אריחים מעוגלים ומרווחים, כחול — הכי נוח לאצבע',
    descEn: 'Charcoal, rounded roomy tiles, blue — the easiest on a finger',
    swatch: ['#1B1B1D', '#F5F5F7', '#0A84FF'],
    fonts: ['Assistant:wght@400;500;600;700;800'],
  },
  {
    id: 'red', group: 'camera',
    he: 'RED', en: 'RED',
    descHe: 'שחור ואדום, כותרות צרות באותיות גדולות ומספרים ענקיים',
    descEn: 'Black and red, narrow uppercase headings and oversized numerals',
    swatch: ['#0D0D0D', '#F2F2F2', '#C8102E'],
    fonts: ['Oswald:wght@400;500;600;700', 'Noto+Sans+Hebrew:wght@400;500;700;800'],
  },
  {
    id: 'panasonic', group: 'camera',
    he: 'Panasonic', en: 'Panasonic',
    descHe: 'פחם קריר וכחול עמוק, טיפוגרפיה טכנית ושורות מרובעות',
    descEn: 'Cool charcoal and deep blue, technical type and squared rows',
    swatch: ['#1E2126', '#E9EDF2', '#3D8BFF'],
    fonts: ['IBM+Plex+Sans:wght@400;500;600;700', 'Noto+Sans+Hebrew:wght@400;500;700;800'],
  },
  {
    id: 'canon', group: 'camera',
    he: 'Canon', en: 'Canon',
    descHe: 'אפור חמים ואדום קאנון, תוויות זעירות וצפיפות של Cinema EOS',
    descEn: 'Warm grey and Canon red, tiny labels and Cinema EOS density',
    swatch: ['#2A2724', '#F0EBE6', '#E03A36'],
    fonts: ['Barlow:wght@400;500;600;700', 'Noto+Sans+Hebrew:wght@400;500;700;800'],
  },
  {
    id: 'broadcast', group: 'camera',
    he: 'שידור', en: 'Broadcast',
    descHe: 'שחור וצהוב, הכול במונוספייס — ציוד שידור',
    descEn: 'Black and yellow, all monospaced — broadcast gear',
    swatch: ['#000000', '#FFFFFF', '#FFD400'],
    fonts: ['IBM+Plex+Mono:wght@400;500;600;700', 'Noto+Sans+Hebrew:wght@400;500;700;800'],
  },
];

// The camera-world themes are not one maker's menus but the objects around a camera: the field
// monitor, the slate, the lens barrel.
SKINS.push(
  {
    id: 'monitor', group: 'world',
    he: 'מוניטור שטח', en: 'Field monitor',
    descHe: 'כהה וירוק כמו מסך שטח: נורת REC, פינות קווי מסגרת ומספרים במונוספייס',
    descEn: 'Dark and green like a field monitor: REC light, frame-line corners, monospaced numerals',
    swatch: ['#0D0F12', '#E8EAED', '#34C759'],
    fonts: ['IBM+Plex+Mono:wght@400;500;600;700', 'Heebo:wght@400;500;700;800;900'],
  },
  {
    id: 'slate', group: 'world',
    he: 'סלייט', en: 'Slate',
    descHe: 'פסי קלאפר בשחור־לבן, כותרות בסגנון לוח וקווים ישרים',
    descEn: 'Black-and-white clapper stripes, board-style headings, straight lines',
    swatch: ['#F2F1EC', '#141414', '#141414'],
    fonts: ['Frank+Ruhl+Libre:wght@500;700;900', 'Heebo:wght@400;500;700;800;900'],
  },
  {
    id: 'barrel', group: 'world',
    he: 'גוף עדשה', en: 'Lens barrel',
    descHe: 'שחור אנודייז, מספרים חרוטים בצהוב, חריצי אחיזה ונקודת mount אדומה',
    descEn: 'Anodised black, yellow engraved numerals, knurled grip and a red mount dot',
    swatch: ['#141414', '#F4F4F4', '#F2C230'],
    fonts: ['Barlow+Condensed:wght@400;500;600;700', 'Heebo:wght@400;500;700;800;900'],
  },
);

export const GROUPS = [
  { id: 'plain', he: 'ברירת מחדל', en: 'Default' },
  { id: 'world', he: 'עולם המצלמה', en: 'Camera world' },
  { id: 'camera', he: 'מצלמות', en: 'Cameras' },
];

// Lighting is separate from the skin: day for most work, sun for reading outside in direct light,
// night for dark sets. The top-bar button steps through them in this order.
export const THEMES = ['light', 'sun', 'dark'];
export const nextTheme = (t) => THEMES[(Math.max(THEMES.indexOf(t), 0) + 1) % THEMES.length];

// v1 had fifteen skins. The ones that were really lighting modes become lighting; the rest fall
// back to the default so nobody opens the app on a look that no longer exists.
const SKIN_TO_THEME = { night: 'dark', contrast: 'sun' };
export function migrateSettings(s = {}) {
  const known = SKINS.some(k => k.id === s.skin);
  const theme = SKIN_TO_THEME[s.skin] || (THEMES.includes(s.theme) ? s.theme : 'dark');
  return { skin: known ? s.skin : 'clean', theme };
}

export const DEFAULT_SKIN = 'clean';
export const isSkin = (id) => SKINS.some(s => s.id === id);
export const skin = (id) => SKINS.find(s => s.id === id) || SKINS[0];

// A skin's typefaces are fetched the first time it is chosen, and the link is left in place
// so switching back and forth does not refetch.
const loaded = new Set();
export function loadSkinFonts(id, doc = document) {
  const s = skin(id);
  for (const family of s.fonts || []) {
    if (loaded.has(family)) continue;
    loaded.add(family);
    const link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
    doc.head.appendChild(link);
  }
}
