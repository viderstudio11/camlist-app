// "Goes with": what a camera assistant adds next, right after adding something. A monitor wants a stand
// and cables, a head wants legs, a battery wants its charger. Suggestions come from the catalog itself.
import { BATTERY, mediaFamilies } from './compat.js';

const subNames = (catalog, p) => (p.subcats || []).map(id => catalog.departments.flatMap(d => d.subcategories).find(s => s.id === id)?.en).filter(Boolean);
const inches = (name) => { const m = String(name).match(/(\d+(?:\.\d+)?)\s*(?:["″”]|inch|in\b)/i); return m ? Number(m[1]) : null; };
const byName = (catalog, rx) => catalog.products.find(p => rx.test(p.name)) || null;
const familiesOf = (name) => Object.entries(BATTERY).filter(([, rx]) => rx.test(name)).map(([k]) => k);

// Returns catalog products worth offering after `product` is added, minus what the list already has.
export function companionsFor(product, catalog, { items = [], resolve = () => null, limit = 6 } = {}) {
  if (!product || product.manual) return [];
  const dept = catalog.deptKey(product.dept);
  const subs = subNames(catalog, product);
  const name = product.name || '';
  const out = [];
  const add = (p) => { if (p && p.id !== product.id && !out.includes(p)) out.push(p); };
  const cable = (rx) => add(byName(catalog, rx));
  const bnc = /^bnc cable$/i, hdmi = /^hdmi cable$/i, usbc = /^usb-c to usb-c cable$/i;

  const isVideo = dept === 'video' || dept === 'monitors';   // Monitors split off Video; older catalogs keep them there
  if (isVideo && (subs.includes('Wireless Video') || /bolt|cosmo|mars|pyro|wireless/i.test(name))) {
    cable(bnc); cable(hdmi);
  } else if (isVideo && !subs.some(x => ['Recorders & Media', 'Viewfinders & EVF', 'Monitor Accessories'].includes(x)) && /monitor|lcd|oled|\blmd\b|\bpvm\b|\bbvm\b|smallhd|cine \d|ultra \d|indie|vision/i.test(name)) {
    const size = inches(name);
    if (size == null || size >= 13) add(byName(catalog, /^monitor stand$/i));
    else add(byName(catalog, /^ut arm$/i));
    cable(bnc); cable(hdmi);
  } else if (dept === 'tripods' && (subs.includes('Fluid Heads') || (subs.includes('System / Friction Head') && /head/i.test(name) && !/tripod|legs|kit|system/i.test(name)))) {
    const legs = catalog.products.filter(p => subNames(catalog, p).includes('Tripod Legs'));
    legs.filter(p => p.brand === product.brand).concat(legs).forEach(add);
  } else if (dept === 'tripods' && subs.includes('Tripod Legs')) {
    const heads = catalog.products.filter(p => subNames(catalog, p).includes('Fluid Heads'));
    heads.filter(p => p.brand === product.brand).concat(heads).forEach(add);
  } else if (dept === 'power' && familiesOf(name).length && !/plate|cable/i.test(name)) {
    const fam = familiesOf(name)[0];
    const isCharger = /charger|station/i.test(name);
    const want = catalog.products.filter(p => catalog.deptKey(p.dept) === 'power' && p.id !== product.id
      && familiesOf(p.name).includes(fam) && /charger|station/i.test(p.name) !== isCharger);
    want.filter(p => p.brand === product.brand).concat(want).forEach(add);
  } else if (dept === 'media' && subs.includes('Computers')) {
    // Readers for the cards already in the list, then a hub and a cable.
    const fams = items.map(it => resolve(it.productId)).filter(p => p && subNames(catalog, p).includes('Memory Cards')).flatMap(p => mediaFamilies(p.name));
    catalog.products.filter(p => subNames(catalog, p).includes('Card Readers') && mediaFamilies(p.name).some(f => fams.includes(f))).forEach(add);
    add(byName(catalog, /^usb-c hub$/i)); cable(usbc);
  } else if (dept === 'media' && subs.includes('Card Readers')) {
    cable(usbc); add(byName(catalog, /^usb-c to usb-a cable$/i));
  } else if (/^(c-stand|monitor stand)$/i.test(name)) {
    add(byName(catalog, /^sand ?bag$/i));
  }
  const have = new Set(items.map(it => it.productId));
  return out.filter(p => !have.has(p.id)).slice(0, limit);
}
