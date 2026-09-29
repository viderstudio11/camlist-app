// "Build around" for more than cameras: a monitor, a wireless video set, a follow focus… each carries a
// short list of must-have accessories. A slot is met by items already in the list whose name matches it;
// its quantity scales with how many of the parent item the list holds (two monitors, two stands).
// Suggested contents — Amir reviews and corrects them. `add` names the catalog item a tap adds (a list
// means a choice: V-Mount or Gold plate). The SDI and HDMI slots use the catalog's own BNC / HDMI cables.

const SUB = (catalog, p) => (p.subcats || []).map(id => catalog.departments.flatMap(d => d.subcategories).find(s => s.id === id)?.en).filter(Boolean);
const inches = (name) => { const m = String(name).match(/(\d+(?:\.\d+)?)\s*(?:["″”]|inch|in\b)/i); return m ? Number(m[1]) : null; };
const isMonitor = (catalog, p) => catalog.deptKey(p.dept) === 'video' && !SUB(catalog, p).includes('Recorders & Media')
  && !SUB(catalog, p).includes('Wireless Video') && /monitor|lcd|oled|\blmd\b|\bpvm\b|\bbvm\b|smallhd|cine \d|indie|vision/i.test(p.name);

const slot = (key, he, en, qty, match, add) => ({ key, he, en, qty, match, add });
// On-camera by the source's own subcategory, else by the screen size in the name (under 13″).
const onCamera = (catalog, p) => SUB(catalog, p).includes('On Camera') || (inches(p.name) ?? 17) < 13;

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
      slot('xlr4', 'כבל 4 פין XLR', '4-pin XLR power cable', 1, /4-?pin xlr/i, 'x_gen_xlr4'),
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
    when: (catalog, p) => catalog.deptKey(p.dept) === 'video' && (SUB(catalog, p).includes('Wireless Video') || /bolt|cosmo|mars|pyro/i.test(p.name)),
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

// Slot progress for one kit, scaled by how many of the parent item the list holds.
export function gearKitStatus(kit, parentQty, items, resolve) {
  const products = items.map(it => ({ it, p: resolve(it.productId) })).filter(x => x.p);
  return kit.slots.map(s => {
    const need = s.qty * Math.max(1, parentQty);
    const have = products.filter(x => s.match.test(x.p.name)).reduce((n, x) => n + x.it.qty, 0);
    return { ...s, need, have, done: have >= need };
  });
}
