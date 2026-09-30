// Power & media maths for the active camera: how many shooting hours the chosen batteries and cards actually give.
// Battery watt-hours come from the product name when it states them, otherwise from the model table in data/power.json.
// Card capacity is parsed from the product name (160GB, 1TB…). Bitrates are per recording format.

const WH_IN_NAME = /(\d+(?:\.\d+)?)\s*wh\b/i;
const CAP_IN_NAME = /(\d+(?:\.\d+)?)\s*(tb|gb)\b/i;

export function whOf(product, table = {}) {
  if (!product?.name) return 0;
  const inName = product.name.match(WH_IN_NAME);
  if (inName) return Number(inName[1]);
  const hit = Object.keys(table).find(model => new RegExp(`\\b${model.replace(/[-]/g, '-?')}\\b`, 'i').test(product.name));
  return hit ? Number(table[hit]) : 0;
}

export function gbOf(product) {
  const m = product?.name?.match(CAP_IN_NAME);
  if (!m) return 0;
  return m[2].toLowerCase() === 'tb' ? Number(m[1]) * 1000 : Number(m[1]);
}

// hours = capacity in gigabits / bitrate — 1 GB counted as 8000 Mbit, the way card makers count it.
export const hoursFromMedia = (gb, mbps) => (mbps > 0 ? (gb * 8000) / mbps / 3600 : 0);
export const hoursFromPower = (wh, watts) => (watts > 0 ? wh / watts : 0);

export function createPower(data, catalog, compat) {
  const cams = data.cameras || {};
  const fmts = data.formats || {};
  const table = data.batteryWh || {};

  const wattsFor = (prof) => Number(cams[prof?.product?.id] ?? cams[`_type_${prof?.type}`] ?? 0);
  const formatsFor = (prof) => fmts[prof?.product?.id] || fmts[`_type_${prof?.type}`] || fmts._type_cinema || [];

  // Totals for the batteries and cards in the list that actually fit the active camera.
  function totals(prof, items, resolve) {
    let wh = 0, gb = 0, batteries = 0, cards = 0, unknownBatteries = 0;
    for (const it of items) {
      const p = resolve(it.productId);
      if (!p) continue;
      const v = compat.verdict(p, prof);
      if (v.kind === 'battery' && v.status === 'native') {
        const w = whOf(p, table);
        batteries += it.qty;
        if (w) wh += w * it.qty; else unknownBatteries += it.qty;
      }
      if (v.kind === 'card' && v.status === 'native') {
        const g = gbOf(p);
        if (g) { gb += g * it.qty; cards += it.qty; }
      }
    }
    return { wh, gb, batteries, cards, unknownBatteries };
  }

  // Full summary for the meters: hours available vs hours needed, and what to add to close a gap.
  function summary(prof, items, resolve, { formatIndex = 0, shootHours = 10 } = {}) {
    const t = totals(prof, items, resolve);
    const watts = wattsFor(prof);
    const list = formatsFor(prof);
    const format = list[Math.min(formatIndex, Math.max(list.length - 1, 0))] || null;
    const powerHours = hoursFromPower(t.wh, watts);
    const mediaHours = format ? hoursFromMedia(t.gb, format.mbps) : 0;
    const need = Math.max(shootHours, 0);
    const perBattery = t.batteries ? t.wh / t.batteries : 0;
    const perCard = t.cards ? t.gb / t.cards : 0;
    return {
      ...t, watts, format, formats: list, shootHours: need,
      powerHours, mediaHours,
      powerOk: powerHours >= need, mediaOk: mediaHours >= need,
      powerGap: Math.max(need - powerHours, 0), mediaGap: Math.max(need - mediaHours, 0),
      addBatteries: perBattery > 0 ? Math.ceil(Math.max(need - powerHours, 0) * watts / perBattery) : 0,
      addCards: perCard > 0 && format ? Math.ceil((Math.max(need - mediaHours, 0) * format.mbps * 3600) / 8000 / perCard) : 0,
    };
  }

  return { wattsFor, formatsFor, totals, summary, whOf: (p) => whOf(p, table), gbOf };
}

export async function loadPower(url = 'data/power.json') {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`power ${res.status}`);
  return res.json();
}
