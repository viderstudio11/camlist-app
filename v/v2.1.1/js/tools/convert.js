// Copy times and unit conversions — the two arithmetic jobs that come up on every job.

// ---------- offload ----------
// Drives quote MB/s; cards and footage are counted in GB. One offload writes every copy.
export function offload({ gb = 0, mbPerSec = 0, copies = 2, verify = true }) {
  if (!(gb > 0) || !(mbPerSec > 0)) return { perCopyHours: 0, totalHours: 0, totalGb: 0 };
  const perCopySeconds = (gb * 1000) / mbPerSec;
  const passes = copies * (verify ? 2 : 1); // verification reads the copy back
  return {
    perCopyHours: perCopySeconds / 3600,
    totalHours: (perCopySeconds * passes) / 3600,
    totalGb: gb * copies,
    passes,
  };
}

// A copy runs at the slower of the two ends: the card as its reader delivers it, and the drive's write speed.
// Several readers offload side by side into the same drive; the computer's port caps every link.
export function transfer(readMBs, writeMBs, { readers = 1, port = Infinity } = {}) {
  const src = readers * Math.min(readMBs, port);
  const dst = Math.min(writeMBs, port);
  const limit = src <= dst ? (port < readMBs ? 'port' : 'source') : (port < writeMBs ? 'port' : 'dest');
  return { mbPerSec: Math.min(src, dst), limit };
}

// The computer's port, as a data ceiling: 5 Gb/s USB loses a fifth to 8b/10b coding, 10 Gb/s about 3%.
// Thunderbolt / USB4 sits above every reader and drive in the lists here.
export const PORTS = [
  { id: 'usb5',  label: 'USB 5Gb',  mbPerSec: 500 },
  { id: 'usb10', label: 'USB 10Gb', mbPerSec: 1200 },
  { id: 'tb',    label: 'Thunderbolt / USB4', mbPerSec: Infinity },
];

// Card readers, one per card type the media tool knows (ids match data/codecs.json "media").
// A card reads no faster than the card itself or the reader's link allows — the slower of the two.
// Every figure is the maker's published top speed; real offloads usually run somewhat below it.
const reader = (id, he, en, card, link, src) => ({ id, he, en, mbPerSec: Math.min(card, link), card, link, src });
export const READERS = [
  reader('SD', 'SD UHS-II', 'SD UHS-II', 300, 300, 'Sony SF-G TOUGH: read 300 MB/s; Sony MRW-S1 UHS-II reader — sony.com'),
  reader('microSD', 'microSD', 'microSD', 190, 190, 'SanDisk Extreme microSDXC: read up to 190 MB/s with a QuickFlow reader — sandisk.com'),
  reader('CFexpress A', 'CFexpress A', 'CFexpress A', 800, 1250, 'Sony CEA-G TOUGH: read 800 MB/s; Sony MRW-G2 reader, USB 10 Gb/s — sony.com'),
  reader('CFexpress B', 'CFexpress B', 'CFexpress B', 1700, 1250, 'Sony CEB-G TOUGH: read 1700 MB/s; Sony MRW-G1 reader, USB 10 Gb/s (1250 MB/s) — sony.com'),
  reader('RED PRO CFexpress', 'RED PRO CFexpress', 'RED PRO CFexpress', 2500, 2500, 'RED CFexpress card reader: up to 20 Gb/s on USB 3.2 Gen 2×2 — RED does not publish the card’s own read speed — red.com'),
  reader('XQD', 'XQD', 'XQD', 440, 1250, 'Sony XQD G series: read 440 MB/s; Sony MRW-G1 reader — sony.com'),
  reader('AXS', 'AXS', 'AXS', 1200, 1200, 'Sony AXS-AR3 Thunderbolt reader: read up to 9.6 Gb/s (1200 MB/s) — pro.sony'),
  reader('SxS', 'SxS', 'SxS', 440, 440, 'Sony SBAC-US30 USB 3.0 reader: about 440 MB/s from SxS PRO+ and SxS-1 — pro.sony'),
  reader('Codex Compact Drive', 'Codex Compact Drive', 'Codex Compact Drive', 1000, 1000, 'Codex Compact Drive Reader (USB-C): up to 8 Gb/s (1 GB/s) — help.codex.online'),
  reader('CFast 2.0', 'CFast 2.0', 'CFast 2.0', 560, 1250, 'Angelbird AV PRO CF: read 560 MB/s; Angelbird CFast 2.0 reader, USB 10 Gb/s — angelbird.com'),
  reader('DJI PROSSD', 'DJI PROSSD', 'DJI PROSSD', 900, 900, 'DJI PROSSD 1TB: read up to 900 MB/s over its USB-C cable — store.dji.com'),
];

// Where the copies go: the maker's top write speed. Networks are their line rate.
export const DRIVES = [
  { id: 'hdd',   he: 'דיסק קשיח נייד',     en: 'Portable hard drive', mbPerSec: 130,  src: 'LaCie Rugged USB-C: up to 130 MB/s — seagate.com' },
  { id: 'raid',  he: 'RAID דיסקים',        en: 'Hard-drive RAID',     mbPerSec: 550,  src: 'LaCie 2big Dock (Thunderbolt 3): up to 550 MB/s — seagate.com' },
  { id: 'ssd10', he: 'SSD נייד USB 10Gb',  en: 'SSD USB 10Gb',        mbPerSec: 1000, src: 'Samsung Portable SSD T7: write up to 1000 MB/s — samsung.com' },
  { id: 'ssd20', he: 'SSD נייד USB 20Gb',  en: 'SSD USB 20Gb',        mbPerSec: 1950, src: 'Samsung Portable SSD T9 (1–2 TB): write up to 1950 MB/s — samsung.com' },
  { id: 'tb',    he: 'SSD Thunderbolt',    en: 'Thunderbolt SSD',     mbPerSec: 2500, src: 'SanDisk PRO-G40 over Thunderbolt 3: write up to 2500 MB/s — sandisk.com' },
  { id: 'lan1',  he: 'רשת 1 ג׳יגה',        en: '1 GbE network',       mbPerSec: 125,  src: '1 Gb/s line rate = 125 MB/s before overhead' },
  { id: 'lan10', he: 'רשת 10 ג׳יגה',       en: '10 GbE network',      mbPerSec: 1250, src: '10 Gb/s line rate = 1250 MB/s before overhead' },
];

// ---------- units ----------
// Pairs, not a generic engine: these are the conversions that actually come up with gear.
export const UNIT_GROUPS = [
  {
    id: 'length', he: 'אורך', en: 'Length',
    units: [
      { id: 'mm', label: 'mm', per: 0.001 },
      { id: 'cm', label: 'cm', per: 0.01 },
      { id: 'm',  label: 'm',  per: 1 },
      { id: 'in', label: 'inch', per: 0.0254 },
      { id: 'ft', label: 'feet', per: 0.3048 },
      { id: 'yd', label: 'yard', per: 0.9144 },
    ],
  },
  {
    id: 'weight', he: 'משקל', en: 'Weight',
    units: [
      { id: 'g',  label: 'g',  per: 0.001 },
      { id: 'kg', label: 'kg', per: 1 },
      { id: 'lb', label: 'lb', per: 0.45359237 },
      { id: 'oz', label: 'oz', per: 0.028349523 },
    ],
  },
  {
    id: 'data', he: 'נפח נתונים', en: 'Data',
    units: [
      { id: 'mb',  label: 'MB',  per: 0.001 },
      { id: 'gb',  label: 'GB',  per: 1 },
      { id: 'tb',  label: 'TB',  per: 1000 },
      { id: 'gib', label: 'GiB', per: 1.073741824 },
      { id: 'tib', label: 'TiB', per: 1099.511627776 },
    ],
  },
  {
    id: 'rate', he: 'קצב', en: 'Rate',
    units: [
      { id: 'mbps', label: 'Mbps', per: 1 },
      { id: 'mbs',  label: 'MB/s', per: 8 },
      { id: 'gbps', label: 'Gbps', per: 1000 },
    ],
  },
];

export function convert(groupId, fromId, toId, value) {
  const g = UNIT_GROUPS.find(x => x.id === groupId);
  if (!g) return 0;
  const from = g.units.find(u => u.id === fromId);
  const to = g.units.find(u => u.id === toId);
  if (!from || !to) return 0;
  return (Number(value) * from.per) / to.per;
}

// Temperature does not scale from zero, so it gets its own pair.
export const cToF = (c) => (Number(c) * 9) / 5 + 32;
export const fToC = (f) => ((Number(f) - 32) * 5) / 9;

// A battery's label says mAh at a voltage; a rental house and an airline both want watt-hours.
export const mahToWh = (mah, volts) => (Number(mah) * Number(volts)) / 1000;
export const whToMah = (wh, volts) => (volts > 0 ? (Number(wh) * 1000) / Number(volts) : 0);
