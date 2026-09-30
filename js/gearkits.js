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

// `find` names the shelf to open when there is nothing single to add (legs to match a head's bowl).
const slot = (key, he, en, qty, match, add, find = null) => ({ key, he, en, qty, match, add, find });
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

// Monitor-recorders: the media the maker names. Models not listed get the monitor kit only.
const RECORDERS = [
  { rx: /\bninja\b/i, src: 'Atomos, Ninja: records to AtomX SSDmini (or Master Caddy drives)',
    media: { add: 'x_atomos_ssdmini', qty: 2, match: /ssdmini|master caddy/i, he: 'מדיה AtomX SSDmini', en: 'AtomX SSDmini media' } },
];
const recorderExtras = (p) => {
  const r = RECORDERS.find(x => x.rx.test(p.name || ''));
  return r ? [{ ...slot('media', r.media.he, r.media.en, r.media.qty, r.media.match, r.media.add), src: r.src }] : [];
};
// Monitors that run on NP-F (L-Series) batteries, per the maker. Their kit carries a power choice:
// NP-F batteries on the monitor, or V-Lock through a D-Tap cable (from the camera's battery or a plate).
export const NPF_MONITORS = [
  { rx: /\bninja\b/i, src: 'Atomos, Ninja: a rear L-series battery plate powers it with NP-F batteries' },
  { rx: /shogun connect/i, src: 'Atomos support: SHOGUN CONNECT runs on the DC supply or NP-F / L-Series batteries' },
  { rx: /video assist/i, src: 'Blackmagic Design, Video Assist: L-Series batteries' },
  { rx: /fw279s?\b/i, src: 'Feelworld: F970 (NP-F) battery plate for the FW279 / FW279S' },
];
export const npfMonitor = (p) => NPF_MONITORS.find(x => x.rx.test(p?.name || '')) || null;
const NPF = /np-?f\s?[5-9]\d0|l-series/i;
// The D-Tap slot names the plug each model takes (see gearKitStatus).
const DTAP = () => slot('dtap', 'כבל D-Tap', 'D-Tap power cable', 1, /d-?tap/i, 'x_gen_dtap');
const monitorPower = (p, ctx) => {
  const m = npfMonitor(p);
  if (!m) return [DTAP()];
  const route = ctx?.route === 'vlock' ? 'vlock' : 'native';
  const power = { fam: 'NP-F', route };
  return route === 'vlock'
    ? [{ ...DTAP(), power }]
    : [{ ...slot('battery', 'סוללות NP-F', 'NP-F batteries', 2, NPF, 3467), src: m.src, power }];
};

// Tripods. A head's bowl, from the maker where we have it, else from its name; unknown bowls open the legs shelf.
export const BOWLS = [
  { rx: /video (18|20)\b/i, bowl: 100, src: 'Sachtler Video 18 S2 / Video 20 S1 manual: tie-down with the 100 mm ball base' },
  { rx: /video 25/i, bowl: 150, src: 'Sachtler Video 25 Plus manual: 150 mm half ball' },
  { rx: /focus 22/i, bowl: 'both', src: 'Cartoni: Focus 22 comes as a 100 mm and a 150 mm model' },
  { rx: /focus (10|12|18)\b|c20s/i, bowl: 100, src: 'Cartoni EFP 100 tripod (100 mm bowl): compatible with Focus 10, 12, 18, 22, C20S' },
  { rx: /master|maxima|lambda 25/i, bowl: 'mitchell', src: 'Cartoni: Mitchell flat base (150 mm bowl adapter optional)' },
  { rx: /2065/i, bowl: 150, src: "O'Connor Ultimate 2065 package: 150 mm ball base" },
  { rx: /atlas 40/i, bowl: 150, src: 'Ronford-Baker Atlas 40: head bases 150 mm or Mitchell (adaptor)' },
  { rx: /509hd/i, bowl: 100, src: 'Manfrotto 509HD: incorporated 100 mm half ball' },
];
export const bowlOf = (name) => BOWLS.find(b => b.rx.test(name))?.bowl
  // from the name only when it says millimetres (a model number like L100 or S100 is not a bowl)
  ?? (/150\s?(mm|\/)/i.test(name) ? 150 : /\b100\s?mm/i.test(name) ? 100 : /\b75\s?mm|svt75/i.test(name) ? 75 : /mitchell|flat (base|head)/i.test(name) ? 'mitchell' : null);
// What a tripod-department item is, for the department's own filter row.
export function tripodKind(catalog, p) {
  const subs = SUB(catalog, p);
  if (subs.includes('Tripod Accessories')) return 'accessory';
  if (subs.includes('Gimbals') || subs.includes('Gimbals & Stabilizers')) return 'gimbal';
  if (subs.includes('Steadicam & Handheld')) return 'stabilizer';
  if (subs.includes('Body Support')) return 'body';
  if (subs.includes('Car Mounts')) return 'car';
  if (subs.includes('Underwater Housings')) return 'underwater';
  if (subs.includes('Tripod Legs')) return 'legs';
  if (isHead(catalog, p)) return 'head';
  if (/tripod|with .*legs|pedestal|monopod/i.test(p.name)) return 'system';
  return 'support';
}
const LEGS_FOR = { 100: ['x_gen_legs100', 862], 150: [3562, 3569, 3571], mitchell: [3565, 3577], both: ['x_gen_legs100', 862, 3562, 3569, 3571] };
const HIHAT_FOR = { 100: 3723, 150: 3720, mitchell: 18529, both: [3723, 3720] };
const isHead = (catalog, p) => {
  const subs = SUB(catalog, p);
  if (subs.includes('Fluid Heads') || subs.includes('Gear Head')) return true;
  return subs.includes('System / Friction Head') && /head/i.test(p.name) && !/tripod|legs|monopod|pedestal|platform|kit/i.test(p.name);
};
const SAND = /sand ?bag|shot ?bag/i;
const LEGS = /tripod legs|baby (legs|tripod)|tall tripod/i;
const TRIPOD_LEGS = { dept: 'tripods', subcat: 'Tripod Legs' };
const FLUID_HEADS = { dept: 'tripods', subcat: 'Fluid Heads' };
const FIELD_MONITORS = { dept: 'monitors', subcat: 'Field Monitors' };
// The camera plate: Sony's shoulder camcorders take the VCT-14 (Sony lists the PXW-X400, PXW-Z450,
// PMW-350 and PDW-F800); otherwise the head's own quick-release plate or a Euro plate.
const VCT_CAMERAS = /pxw-?x400|pxw-?z450|pmw-?350|pdw-?f?800/i;
const plateSlot = (ctx) => (ctx?.camera && VCT_CAMERAS.test(ctx.camera.name)
  ? { ...slot('plate', 'פלטת Sony VCT-14', 'Sony VCT-14 tripod plate', 1, /vct-?14/i, 'x_sony_vct14'), src: 'Sony Pro, VCT-14 compatible products' }
  : slot('plate', 'פלטת מצלמה — ראש / יורו / VCT', 'Camera plate — head / Euro / VCT', 1, /camera plate|quick-?release plate|euro|vct-?14/i, ['x_gen_head_plate', 'x_gen_euro_plate', 'x_sony_vct14']));

export const powerInputOf =(product) => (product ? POWER_INPUTS.find(x => x.rx.test(product.name)) || null : null);

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
    slots: (p, ctx) => [
      slot('arm', 'זרוע — UT Arm / Noga Arm', 'Arm — UT Arm / Noga Arm', 1, /monitor arm|^ut arm$|noga|magic arm/i, [4080, 'x_gen_noga_arm']),
      ...recorderExtras(p),
      slot('hood', 'סאן־הוד', 'Sunhood', 1, /sun ?hood/i, 'x_gen_sunhood'),
      ...monitorPower(p, ctx),
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
    when: (catalog, p) => SUB(catalog, p).some(s => s === 'Gimbals' || s === 'Gimbals & Stabilizers') && /ronin|\brs ?\d/i.test(p.name) && !/wheel|grip$|pad|mimic/i.test(p.name),
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
    id: 'head', he: 'ראש חצובה', en: 'Tripod head',
    when: (catalog, p) => catalog.deptKey(p.dept) === 'tripods' && isHead(catalog, p),
    slots: (p, ctx) => {
      const bowl = bowlOf(p.name);
      return [
        plateSlot(ctx),
        slot('panbar', 'פאן־בר שני', 'Second pan bar', 1, /pan ?bar/i, 'x_gen_pan_bar'),
        { ...slot('legs', bowl ? `רגליים ${bowl === 'mitchell' ? 'מיטשל' : bowl === 'both' ? '100 / 150 מ״מ' : bowl + ' מ״מ'}` : 'רגליים בקוטר הקערה של הראש',
          bowl ? `Legs — ${bowl === 'mitchell' ? 'Mitchell' : bowl === 'both' ? '100 / 150 mm' : bowl + ' mm'}` : 'Legs for the head’s bowl', 1, LEGS, LEGS_FOR[bowl] ?? null, TRIPOD_LEGS), src: BOWLS.find(b => b.rx.test(p.name))?.src },
        slot('hihat', 'היי־האט', 'Hi-hat', 1, /hi-?hat|high hat/i, HIHAT_FOR[bowl] ?? [3720, 3723]),
        slot('spreader', 'ספרדר', 'Spreader', 1, /spreader/i, 'x_gen_spreader'),
        slot('sand', 'שק חול', 'Sandbag', 1, SAND, 3896),
      ];
    },
  },
  {
    id: 'tripod-system', he: 'מערכת חצובה', en: 'Tripod system',
    when: (catalog, p) => catalog.deptKey(p.dept) === 'tripods' && /tripod|with .*legs/i.test(p.name) && !isHead(catalog, p)
      && !SUB(catalog, p).some(x => ['Tripod Legs', 'Tripod Accessories', 'Hi-Hats & Low Hats'].includes(x)) && !/monopod|pedestal|platform|\bpc tripod|baby|high hat|hi-?hat|adaptor|spreader|plate/i.test(p.name),
    slots: (p, ctx) => [
      plateSlot(ctx),
      slot('spreader', 'ספרדר', 'Spreader', 1, /spreader/i, 'x_gen_spreader'),
      slot('sand', 'שק חול', 'Sandbag', 1, SAND, 3896),
    ],
  },
  {
    id: 'legs', he: 'רגלי חצובה', en: 'Tripod legs',
    when: (catalog, p) => SUB(catalog, p).some(x => x === 'Tripod Legs' || x === 'Hi-Hats & Low Hats'),
    slots: (p) => [
      slot('head', 'ראש בקוטר הקערה', 'A head for the bowl', 1, /fluid head|\bhead\b/i, null, FLUID_HEADS),
      ...(/hi-?hat|high hat/i.test(p.name) ? [] : [slot('spreader', 'ספרדר', 'Spreader', 1, /spreader/i, 'x_gen_spreader')]),
      ...(/tall/i.test(p.name) ? [slot('dolly', 'עגלת גלגלים לחצובה', 'Tripod dolly (wheels)', 1, /tripod dolly/i, 'x_gen_tripod_dolly')] : []),
      slot('sand', 'שק חול', 'Sandbag', 1, SAND, 3896),
    ],
  },
  {
    id: 'dolly', he: 'דולי', en: 'Dolly',
    when: (catalog, p) => catalog.deptKey(p.dept) === 'grip' && /dolly/i.test(p.name) && !/slider|spreader|skate|skater|floor|hot buttons|dana|wedge/i.test(p.name),
    slots: [
      slot('track', 'מסילה ישרה 8′', 'Straight track 8′', 4, /track straight|straight track/i, 4706),
      slot('wedges', 'וודג׳ים', 'Wedges', 1, /wedge/i, 'x_gen_wedges'),
      slot('apple', 'אפל בוקס', 'Apple boxes', 2, /apple box/i, 3910),
      slot('sand', 'שקי חול', 'Sandbags', 4, SAND, 3896),
      slot('hihat', 'היי־האט 150 / מיטשל', 'Hi-hat 150 / Mitchell', 1, /hi-?hat|high hat/i, [3720, 18529]),
      slot('euro', 'אדפטר יורו', 'Euro adapter', 1, /euro/i, [27233, 'x_gen_euro_plate']),
    ],
  },
  {
    id: 'slider', he: 'סליידר', en: 'Slider',
    when: (catalog, p) => catalog.deptKey(p.dept) === 'grip' && /slider/i.test(p.name) && !/dolly slider/i.test(p.name),
    slots: [
      slot('legs', 'רגלי חצובה 150', 'Tripod legs 150', 2, LEGS, [3571, 3562], TRIPOD_LEGS),
      slot('head', 'ראש נוזלי', 'Fluid head', 1, /fluid head|\bhead\b/i, null, FLUID_HEADS),
      slot('sand', 'שקי חול', 'Sandbags', 2, SAND, 3896),
    ],
  },
  {
    id: 'dana', he: 'דנה דולי', en: 'Dana Dolly',
    when: (catalog, p) => /dana dolly/i.test(p.name),
    slots: [
      slot('pipe', 'צינור / ספיד־ריל', 'Pipe / speed rail', 2, /steel pipe|speed ?rail/i, [4583, 4585]),
      slot('stand', 'קומבו סטנד', 'Combo stand', 2, /combo stand/i, 'x_gen_combo_stand'),
      slot('sand', 'שקי חול', 'Sandbags', 4, SAND, 3896),
      slot('hihat', 'היי־האט', 'Hi-hat', 1, /hi-?hat|high hat/i, [3720, 18529]),
    ],
  },
  {
    id: 'jib', he: 'ג׳יב', en: 'Jib',
    when: (catalog, p) => catalog.deptKey(p.dept) === 'grip' && /jib|crane/i.test(p.name) && !/track|accessor|counter ?weight/i.test(p.name),
    slots: [
      slot('weights', 'משקולות נגד', 'Counterweights', 1, /counter ?weight/i, 'x_gen_counterweights'),
      slot('legs', 'רגליים כבדות', 'Heavy-duty legs', 1, LEGS, 3569, TRIPOD_LEGS),
      slot('head', 'ראש (רמוט או נוזלי)', 'Head (remote or fluid)', 1, /fluid head|remote head|\bhead\b/i, null, FLUID_HEADS),
      slot('monitor', 'מוניטור שטח', 'Field monitor', 1, /monitor/i, null, FIELD_MONITORS),
      slot('sdi', 'כבל SDI ארוך', 'Long SDI cable', 1, /sdi cable — long|long sdi/i, 'x_gen_sdi_long'),
      slot('sand', 'שקי חול', 'Sandbags', 4, SAND, 3896),
    ],
  },
  {
    id: 'car', he: 'מתקן רכב', en: 'Car mount',
    when: (catalog, p) => /car mount|car mounting|tank mount|hydra alien|megagrip|mokit/i.test(p.name),
    slots: [
      slot('suction', 'צלחת ואקום נוספת', 'Extra suction cup', 1, /suction/i, [26152, 3920]),
      slot('ratchet', 'רצועות רצ׳ט', 'Ratchet straps', 4, /ratchet/i, 'x_gen_ratchet'),
      slot('safety', 'רצועות ביטחון', 'Safety straps', 2, /safety (strap|cable)/i, 'x_gen_safety_strap'),
      slot('sdi', 'כבל SDI ארוך', 'Long SDI cable', 1, /sdi cable — long|long sdi/i, 'x_gen_sdi_long'),
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

// A kit's slots may depend on the model (a follow focus's own battery, a gimbal's grip).
// `ctx.camera` is the camera being built around, for slots that depend on it (a tripod's camera plate).
export const kitSlotsOf = (kit, product, ctx = {}) => (typeof kit.slots === 'function' ? kit.slots(product || {}, ctx) : kit.slots);
// What the maker packs in the box, for kits that know it (DJI gimbals).
export const inTheBox = (kit, product) => (kit?.box && product ? kit.box(product) : null);

export const gearKitFor = (catalog, product) => (product && !product.manual ? GEAR_KITS.find(k => k.when(catalog, product)) || null : null);

// Slot progress for one kit, scaled by how many of the parent item the list holds. With the parent
// product given, the D-Tap slot names the plug that model takes.
export function gearKitStatus(kit, parentQty, items, resolve, parent = null, ctx = {}) {
  const products = items.map(it => ({ it, p: resolve(it.productId) })).filter(x => x.p);
  const input = powerInputOf(parent);
  return kitSlotsOf(kit, parent, ctx).map(s0 => {
    const plug = s0.key === 'dtap' && input ? PLUGS[input.plug] : null;
    const s = plug ? { ...s0, he: `כבל D-Tap ל־${plug.he}`, en: `D-Tap to ${plug.en} cable`, add: plug.add, match: plug.match, src: input.src } : s0;
    const need = s.qty * Math.max(1, parentQty);
    const have = products.filter(x => s.match.test(x.p.name)).reduce((n, x) => n + x.it.qty, 0);
    return { ...s, need, have, done: have >= need };
  });
}
