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
// Wireless follow focus. A hand unit sold on its own needs a motor; the kits (Nucleus-M, Focus Pro
// All-In-One…) ship with one. The hand unit's battery, from the maker.
const handUnitOnly = (p) => /hand unit|\bhi-5\b|\bwcu-\d|\bctrl\.5\b/i.test(p.name || '');
const FF_MOTOR = [
  { rx: /arri/i, add: 13076 },                         // ARRI cforce mini
  { rx: /dji/i, add: 'x_dji_focus_pro_motor' },
];
export const HAND_BATTERIES = [
  { rx: /\bhi-5\b/i, qty: 2, add: 'x_arri_lbp3500', match: /lbp-?3500/i, he: 'סוללות LBP-3500', en: 'LBP-3500 batteries', src: 'ARRI Online Shop, Hand Units: Hi-5 runs on the Li-Ion Battery Pack LBP-3500, hot-swap' },
  { rx: /nucleus-?m\b|nucleus m(ii|\b)/i, qty: 2, add: 3467, match: /np-?f\s?[5-9]\d0|l-series/i, he: 'סוללות NP-F550 (L-Series)', en: 'NP-F550 batteries (L-Series)', src: 'Tilta: the Nucleus-M / M II hand units are powered by Sony NP-F550 batteries' },
  { rx: /\bctrl\.5\b/i, qty: 2, add: 3466, match: /np-?f\s?[79]\d0/i, he: 'סוללות NP-F970', en: 'NP-F970 batteries', src: 'Teradek CTRL.5 Quick Start Guide: attach a Sony NP-F970 battery to the back' },
];
const handBattery = (p) => {
  const b = HAND_BATTERIES.find(x => x.rx.test(p.name || ''));
  return b ? [{ ...slot('battery', b.he, b.en, b.qty, b.match, b.add), src: b.src }] : [];
};

// DJI gimbals: the spare grip and charger each model takes, and whether the Focus Pro Motor fits
// (DJI Ronin Series Accessories Compatibility List). A Combo already ships with the motor.
const BG30 = { match: /bg30/i, add: 'x_dji_bg30' }, BG33 = { match: /bg33/i, add: 'x_dji_bg33' };
const GIMBAL = [
  { rx: /rs ?5/i, grip: BG33, pd: true, motor: true },
  { rx: /rs ?4 ?mini/i, pd: true },
  { rx: /rs ?4|rs ?3|rs ?2|ronin s 2/i, grip: BG30, pd: true, motor: true },
];
// In the box, from DJI's own pages. Models without an official list yet show none.
export const GIMBAL_BOX = [
  { rx: /rs ?5/i, src: 'DJI Store, DJI RS 5 — In the Box',
    items: ['Gimbal', 'Quick-Open Tripod', 'Lens-Fastening Support', 'Screw Kit', 'RS 5 Upper Quick-Release Plate', 'RS 5 Lower Quick-Release Plate', 'BG33 Battery Grip', 'Multi-Camera Control Cable (USB-C, 30 cm)'] },
  { rx: /rs ?4 ?pro/i, src: 'DJI Store, DJI RS 4 Pro — In the Box; Combo additions: DJI Beginner’s Guide to RS 4 / RS 4 Pro',
    items: ['Gimbal', 'BG30 Battery Grip', 'Quick-Release Plate (Arca-Swiss/Manfrotto)', 'Extended Grip/Tripod (Metal)', 'Briefcase Handle', 'Lens-Fastening Support (Extended)', 'Multi-Camera Control Cable (USB-C, 30 cm)', 'USB-C Charging Cable (40 cm)', 'Screw Kit', 'Carrying Case'],
    combo: ['DJI Focus Pro Motor', 'Motor Rod Mount Kit', 'Focus Gear Strip'] },
  { rx: /rs ?4 ?mini/i, src: 'DJI Store, DJI RS 4 Mini — In the Box',
    items: ['Gimbal', 'Quick-Release Plate', 'RS 4 Mini Tripod', 'L-Shaped Multi-Camera Control Cable (USB-C, 30 cm)', 'USB-C Charging Cable (40 cm)', 'Screw Kit'] },
  { rx: /rs ?3 ?pro/i, src: 'DJI launch announcement, RS 3 Pro and RS 3 Pro Combo (June 2022)',
    items: ['Gimbal', 'BG30 Grip', 'USB-C Charging Cable', 'Lens-Fastening Support (Extended)', 'Extended Grip/Tripod (Metal)', 'Quick-Release Plates', 'Briefcase Handle', 'Multi-Camera Control Cable', 'Screw Kit', 'Carrying Case'],
    combo: ['Extended Quick-Release Plate', 'Phone Holder', 'Focus Motor (2022)', 'Focus Motor Rod Kit', 'Focus Gear Strip', 'Ronin Image Transmitter', 'Hook-and-Loop Straps ×2', 'Additional cables'] },
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
      slot('arm', 'זרוע — UT Arm / Noga Arm', 'Arm — UT Arm / Noga Arm', 1, /monitor arm|^ut arm$|noga|magic arm/i, [4080, 'x_gen_noga_arm']),
      slot('hood', 'סאן־הוד', 'Sunhood', 1, /sun ?hood/i, 'x_gen_sunhood'),
      slot('dtap', 'כבל D-Tap', 'D-Tap power cable', 1, /d-?tap/i, 'x_gen_dtap'),
      slot('sdi', 'כבל BNC קצר', 'Short BNC cable', 1, /\bsdi cable|^bnc cable/i, 'x_gen_bnc_short'),
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
    when: (catalog, p) => SUB(catalog, p).includes('Wireless Follow Focus') && !/\bmotor\b|\bria-|radio interface/i.test(p.name),
    slots: (p) => [
      ...(handUnitOnly(p) ? [slot('motor', 'מנוע פוקוס', 'Focus motor', 1, /\bmotor\b/i, FF_MOTOR.find(m => m.rx.test(p.brandName || p.name))?.add ?? null)] : []),
      slot('rings', 'טבעות גיר', 'Lens gear rings', 1, /gear rings?|gear strip/i, 'x_gen_gear_rings'),
      slot('marks', 'טבעות סימון', 'Focus marking rings', 1, /marking rings?/i, 'x_gen_marking_rings'),
      ...handBattery(p),
      slot('strap', 'רצועת יד', 'Hand unit wrist strap', 1, /wrist strap/i, 'x_gen_ff_strap'),
      slot('rods', 'מוטות 15 מ״מ', '15mm rods', 1, /15 ?mm rods?/i, 'x_gen_rods15'),
      slot('dtap', 'כבל D-Tap למנועים', 'D-Tap cable for the motors', 1, /d-?tap/i, 'x_gen_dtap'),
    ],
  },
  {
    id: 'gimbal', he: 'גימבל', en: 'Gimbal',
    when: (catalog, p) => SUB(catalog, p).includes('Gimbals & Stabilizers') && /ronin|\brs ?\d/i.test(p.name) && !/wheel|grip$|pad|mimic/i.test(p.name),
    box: (p) => GIMBAL_BOX.find(b => b.rx.test(p.name)) || null,
    slots: (p) => {
      const m = GIMBAL.find(g => g.rx.test(p.name)) || {};
      return [
        ...(m.grip ? [slot('grip', 'גריפ סוללה רזרבי', 'Spare battery grip', 1, m.grip.match, m.grip.add)] : []),
        ...(m.pd ? [slot('charger', 'מטען USB-C PD 65W', 'USB-C PD charger 65W', 1, /usb-?c pd|65 ?w/i, 'x_gen_usbc_pd65')] : []),
        ...(m.motor && !/combo/i.test(p.name) ? [
          slot('motor', 'מנוע פוקוס Focus Pro', 'Focus Pro Motor', 1, /focus (pro )?motor/i, 'x_dji_focus_pro_motor'),
          slot('rodkit', 'ערכת מוט למנוע', 'Motor rod mount kit', 1, /rod mount kit|motor rod/i, 'x_dji_motor_rod_kit'),
          slot('strip', 'רצועת גיר', 'Focus gear strip', 1, /gear strip|gear rings?/i, 'x_dji_gear_strip'),
        ] : []),
        slot('hdmi', 'כבל HDMI קצר', 'Short HDMI cable', 1, /hdmi cable/i, 5504),
      ];
    },
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

// A kit's slots may depend on the model (a follow focus's own battery, a gimbal's grip).
export const kitSlotsOf = (kit, product) => (typeof kit.slots === 'function' ? kit.slots(product || {}) : kit.slots);
// What the maker packs in the box, for kits that know it (DJI gimbals).
export const inTheBox = (kit, product) => (kit?.box && product ? kit.box(product) : null);

export const gearKitFor = (catalog, product) => (product && !product.manual ? GEAR_KITS.find(k => k.when(catalog, product)) || null : null);

// Slot progress for one kit, scaled by how many of the parent item the list holds. With the parent
// product given, the D-Tap slot names the plug that model takes.
export function gearKitStatus(kit, parentQty, items, resolve, parent = null) {
  const products = items.map(it => ({ it, p: resolve(it.productId) })).filter(x => x.p);
  const input = powerInputOf(parent);
  return kitSlotsOf(kit, parent).map(s0 => {
    const plug = s0.key === 'dtap' && input ? PLUGS[input.plug] : null;
    const s = plug ? { ...s0, he: `כבל D-Tap ל־${plug.he}`, en: `D-Tap to ${plug.en} cable`, add: plug.add, match: plug.match, src: input.src } : s0;
    const need = s.qty * Math.max(1, parentQty);
    const have = products.filter(x => s.match.test(x.p.name)).reduce((n, x) => n + x.it.qty, 0);
    return { ...s, need, have, done: have >= need };
  });
}
