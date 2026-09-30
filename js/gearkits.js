// "Build around" for more than cameras: a monitor, a wireless video set, a follow focus… each carries a
// short list of must-have accessories. A slot is met by items already in the list whose name matches it;
// its quantity scales with how many of the parent item the list holds (two monitors, two stands).
// Suggested contents — Amir reviews and corrects them. `add` names the catalog item a tap adds (a list
// means a choice: V-Mount or Gold plate). The SDI and HDMI slots use the catalog's own BNC / HDMI cables.

const SUB = (catalog, p) => (p.subcats || []).map(id => catalog.departments.flatMap(d => d.subcategories).find(s => s.id === id)?.en).filter(Boolean);
// Screen size from the name: 18.4″, 7", 13-inch, or the catalog's “17 with the mark in front.
const inches = (name) => {
  const m = String(name).match(/(\d+(?:\.\d+)?)\s*(?:["″”]|inch|in\b)/i) || String(name).match(/[“"]\s*(\d+(?:\.\d+)?)\b/);
  return m ? Number(m[1]) : null;
};
// Accessories, switchers and viewfinders share the monitors' shelves; they carry no kit of their own.
const NOT_A_UNIT = /sun ?hood|rain cover|cage|stand\b|\barm\b|mixer|switcher|\batem\b|\bevf\b|viewfinder|gratical|antenna|router|\bserv\b|vidiu|streaming|extension unit/i;
// Monitors have a department of their own; a catalog from before the split still files them under Video.
const isMonitor = (catalog, p) => ['video', 'monitors'].includes(catalog.deptKey(p.dept)) && !NOT_A_UNIT.test(p.name)
  && !SUB(catalog, p).some(s => ['Recorders & Media', 'Wireless Video', 'Viewfinders & EVF', 'Monitor Accessories'].includes(s))
  && /monitor|lcd|oled|\blmd\b|\bpvm\b|\bbvm\b|smallhd|\bcine \d/i.test(p.name);

const slot = (key, he, en, qty, match, add) => ({ key, he, en, qty, match, add });
// On-camera by the screen size in the name (under 13″), else by the source's own subcategory.
const onCamera = (catalog, p) => { const size = inches(p.name); return size != null ? size < 13 : SUB(catalog, p).some(s => s === 'On-Camera Monitors' || s === 'On Camera'); };

// Where each model takes its power, from the maker's specifications. The kit's D-Tap slot then asks for
// a cable with D-Tap on one end and that plug on the other. A model not listed keeps the plain D-Tap cable.
const PLUGS = {
  xlr4: { he: '4 פין XLR', en: '4-pin XLR', add: 'x_gen_dtap_xlr4', match: /d-?tap.*4-?pin xlr|4-?pin xlr.*d-?tap/i },
  xlr3: { he: '3 פין XLR', en: '3-pin XLR', add: 'x_gen_dtap_xlr3', match: /d-?tap.*3-?pin xlr|3-?pin xlr.*d-?tap/i },
  lemo2: { he: 'LEMO 2 פין', en: '2-pin LEMO', add: 'x_gen_dtap_lemo2', match: /d-?tap.*2-?pin|2-?pin.*d-?tap/i },
  dc21: { he: 'DC 2.1 מ״מ', en: 'DC 2.1 mm barrel', add: 'x_gen_dtap_dc21', match: /d-?tap.*(dc ?2\.1|2\.1 ?mm)|(dc ?2\.1|2\.1 ?mm).*d-?tap/i },
  hirose4: { he: 'הירוסה 4 פין', en: '4-pin Hirose', add: 'x_gen_dtap_hirose4', match: /d-?tap.*hirose|hirose.*d-?tap/i },
};
export const POWER_INPUTS = [
  { rx: /lmd-?a1[78]0/i, plug: 'xlr4', src: 'Sony LMD-A170 / A180: DC 12 V in on 4-pin XLR' },
  { rx: /lmd-?b240/i, plug: 'xlr4', src: 'Sony LMD-B240 specifications: DC input XLR-type 4-pin (male), 12–17 V' },
  { rx: /pvm-?a17[04]/i, plug: 'xlr4', src: 'Sony PVM-A170 / A174 specifications: DC input XLR 4-pin (male), 12–16 V' },
  { rx: /^cine 13/i, plug: 'xlr4', src: 'SmallHD Cine 13: 1× 4-pin XLR, 12–34 V DC in' },
  { rx: /^cine 24/i, plug: 'xlr3', src: 'SmallHD Cine 24: 3-pin XLR power input (or a V-Mount / Gold plate)' },
  { rx: /^cine 7/i, plug: 'lemo2', src: 'SmallHD Cine 7: 2-pin LEMO power input, 10–34 V DC' },
  { rx: /^ultra 7/i, plug: 'lemo2', src: 'SmallHD Ultra 7: power through its 2-pin LEMO ports (or a micro battery plate)' },
  { rx: /^ultra 5/i, plug: 'lemo2', src: 'SmallHD Ultra 5: 2-pin LEMO input only, 10–34 V DC' },
  { rx: /k15 15\.4/i, plug: 'xlr4', src: 'SWIT K15: DC 11–17 V on 4-pin XLR' },
  { rx: /bm7 ii ds/i, plug: 'lemo2', src: 'Portkeys BM7 II DS: 7.4–24 V on 2-pin LEMO (also a locking 5.5 mm barrel)' },
  { rx: /fw279s?\b/i, plug: 'dc21', src: 'Feelworld FW279S: 12 V DC in, 5.5 × 2.1 mm plug' },
  { rx: /bolt 6 lt|bolt 4k lt/i, plug: 'lemo2', src: 'Teradek Bolt 6 LT / Bolt 4K LT: 2-pin LEMO power input, 6–28 V' },
  { rx: /mars 400s pro/i, plug: 'dc21', src: 'Hollyland Mars 400S Pro: DC in 5.5 × 2.1 mm, 6–16 V (also NP-F, USB-C)' },
  { rx: /pyro s\b/i, plug: 'dc21', src: 'Hollyland Pyro S: DC 2.1 mm in, 6–16 V (also NP-F, USB-C)' },
  { rx: /cosmo c1/i, plug: 'lemo2', src: 'Hollyland Cosmo C1: 2-pin LEMO power input on transmitter and receiver' },
];
export const powerInputOf = (product) => (product ? POWER_INPUTS.find(x => x.rx.test(product.name)) || null : null);

export const GEAR_KITS = [
  {
    id: 'monitor-large', he: 'מוניטור שטח', en: 'Field monitor',
    when: (catalog, p) => isMonitor(catalog, p) && !onCamera(catalog, p),
    slots: [
      slot('stand', 'סטנד', 'Stand', 1, /monitor stand|c-stand/i, 'x_gen_monitor_stand'),
      slot('hood', 'סאן־הוד', 'Sunhood', 1, /sun ?hood/i, 'x_gen_sunhood'),
      slot('rain', 'כיסוי גשם', 'Rain cover', 1, /rain cover/i, 'x_gen_rain_cover'),
      slot('ac', 'כבל חשמל', 'AC power cable', 1, /ac power cable|power cord/i, 'x_gen_ac_cable'),
      slot('plate', 'פלייט סוללה', 'Battery plate', 1, /battery plate/i, ['x_gen_plate_v', 'x_gen_plate_gold']),
      slot('dtap', 'כבל מתח D-Tap', 'D-Tap power cable', 1, /d-?tap/i, 'x_gen_dtap'),
      slot('sdi', 'כבל SDI', 'SDI cable', 2, /\bsdi cable|^bnc cable$/i, 5497),
      slot('hdmi', 'כבל HDMI', 'HDMI cable', 1, /^hdmi cable$/i, 5504),
    ],
  },
  {
    id: 'monitor-small', he: 'מוניטור על המצלמה', en: 'On-camera monitor',
    when: (catalog, p) => isMonitor(catalog, p) && onCamera(catalog, p),
    slots: [
      slot('arm', 'זרוע', 'Monitor arm', 1, /monitor arm|^ut arm$|magic arm/i, 'x_gen_monitor_arm'),
      slot('hood', 'סאן־הוד', 'Sunhood', 1, /sun ?hood/i, 'x_gen_sunhood'),
      slot('dtap', 'כבל D-Tap', 'D-Tap power cable', 1, /d-?tap/i, 'x_gen_dtap'),
      slot('sdi', 'כבל SDI קצר', 'Short SDI cable', 1, /\bsdi cable|^bnc cable$/i, 5497),
      slot('hdmi', 'כבל HDMI', 'HDMI cable', 1, /^hdmi cable$/i, 5504),
    ],
  },
  {
    id: 'wireless-video', he: 'וידאו אלחוטי', en: 'Wireless video',
    when: (catalog, p) => catalog.deptKey(p.dept) === 'video' && !NOT_A_UNIT.test(p.name) && (SUB(catalog, p).includes('Wireless Video') || /bolt|cosmo|mars|pyro/i.test(p.name)),
    slots: [
      slot('sdi', 'כבל SDI', 'SDI cable', 2, /\bsdi cable|^bnc cable$/i, 5497),
      slot('hdmi', 'כבל HDMI', 'HDMI cable', 1, /^hdmi cable$/i, 5504),
      slot('dtap', 'כבל D-Tap', 'D-Tap power cable', 2, /d-?tap/i, 'x_gen_dtap'),
      slot('arm', 'זרוע / קלאמפ', 'Arm / clamp', 1, /monitor arm|^ut arm$|magic arm|clamp/i, 'x_gen_monitor_arm'),
    ],
  },
  {
    id: 'follow-focus', he: 'פולו פוקוס אלחוטי', en: 'Wireless follow focus',
    when: (catalog, p) => SUB(catalog, p).includes('Wireless Follow Focus'),
    slots: [
      slot('rods', 'מוטות 15 מ״מ', '15mm rods', 1, /15 ?mm rods?/i, 'x_gen_rods15'),
      slot('rings', 'טבעות גיר', 'Lens gear rings', 1, /gear rings?/i, 'x_gen_gear_rings'),
      slot('dtap', 'כבל D-Tap', 'D-Tap power cable', 1, /d-?tap/i, 'x_gen_dtap'),
    ],
  },
  {
    id: 'mattebox', he: 'מטבוקס', en: 'Matte box',
    when: (catalog, p) => SUB(catalog, p).includes('Matte Boxes'),
    slots: [
      slot('filters', 'פילטרים', 'Filters', 1, /irnd|\bndf?\b|pro-?mist|pola|diffusion|black magic|glimmer|soft ?fx/i, null),
      slot('flag', 'פלאג עליון', 'Top flag', 1, /top flag/i, 'x_gen_top_flag'),
      slot('donut', 'טבעות דונאט', 'Lens donuts', 1, /donut/i, 'x_gen_donuts'),
      slot('rods', 'מוטות 15 מ״מ', '15mm rods', 1, /15 ?mm rods?/i, 'x_gen_rods15'),
    ],
  },
  {
    id: 'laptop', he: 'לפטופ / DIT', en: 'Laptop / DIT',
    when: (catalog, p) => catalog.deptKey(p.dept) === 'media' && SUB(catalog, p).includes('Computers'),
    slots: [
      slot('reader', 'קורא כרטיסים', 'Card reader', 1, /reader|dock/i, null),
      slot('hub', 'USB-C Hub', 'USB-C hub', 1, /usb-?c hub/i, 'x_gen_usbc_hub'),
      slot('ssd', 'דיסק SSD', 'SSD drive', 2, /\bssd\b|t7|t9/i, 'x_gen_ssd'),
    ],
  },
];

export const gearKitFor = (catalog, product) => (product && !product.manual ? GEAR_KITS.find(k => k.when(catalog, product)) || null : null);

// Slot progress for one kit, scaled by how many of the parent item the list holds. With the parent
// product given, the D-Tap slot names the plug that model takes.
export function gearKitStatus(kit, parentQty, items, resolve, parent = null) {
  const products = items.map(it => ({ it, p: resolve(it.productId) })).filter(x => x.p);
  const input = powerInputOf(parent);
  return kit.slots.map(s0 => {
    const plug = s0.key === 'dtap' && input ? PLUGS[input.plug] : null;
    const s = plug ? { ...s0, he: `כבל D-Tap ל־${plug.he}`, en: `D-Tap to ${plug.en} cable`, add: plug.add, match: plug.match, src: input.src } : s0;
    const need = s.qty * Math.max(1, parentQty);
    const have = products.filter(x => s.match.test(x.p.name)).reduce((n, x) => n + x.it.qty, 0);
    return { ...s, need, have, done: have >= need };
  });
}
