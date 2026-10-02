// Where a product can be looked up: the maker's own site and three stores (B&H, Amazon, Adorama).
// The catalog has no fixed product address at each store, so the links search the store for
// "brand + model", which lands on the product or a very short list. The maker link searches only
// inside the maker's official site, so its first hit is the official product page.
//
// AFFILIATE: each store's referral tag, empty until the business signs up with that store's programme
// (B&H and Adorama run theirs through partner networks, Amazon through Amazon Associates). Filled in
// here, every store link in the app carries it — no screen needs to change.
export const AFFILIATE = { bh: '', amazon: '', adorama: '' };

// Official sites by catalog brand id. Brands not listed fall back to a plain web search.
export const MAKER_SITES = {
  tiffen: 'tiffen.com', sony: 'sony.com OR site:pro.sony', zeiss: 'zeiss.com', arri: 'arri.com',
  panasonic: 'panasonic.com OR site:pro-av.panasonic.net', canon: 'canon.com', matthews: 'matthewsgrip.com',
  'blackmagic-design': 'blackmagicdesign.com', tilta: 'tilta.com', dji: 'dji.com', dzofilm: 'dzofilm.com',
  laowa: 'venuslens.net', fujinon: 'fujifilm.com', gopro: 'gopro.com', samyang: 'samyanglensglobal.com',
  fxlion: 'fxlion.com', teradek: 'teradek.com', cooke: 'cookeoptics.com', hollyland: 'hollyland.com',
  cartoni: 'cartoni.com', 'ronford-baker': 'ronfordbaker.co.uk', sigma: 'sigma-global.com', smallhd: 'smallhd.com',
  swit: 'swit.cc', angenieux: 'angenieux.com', chrosziel: 'chrosziel.com', nisi: 'nisifilters.com', red: 'red.com',
  easyrig: 'easyrig.se', insta360: 'insta360.com', manfrotto: 'manfrotto.com', viltrox: 'viltrox.com',
  tokina: 'tokinalens.com', lexar: 'lexar.com', portkeys: 'portkeys.com', aja: 'aja.com', bon: 'bonmonitors.com',
  'decimator-design': 'decimator.com', sachtler: 'sachtler.com', 'wooden-camera': 'woodencamera.com',
  'arri-fujinon': 'fujifilm.com OR site:arri.com', atomos: 'atomos.com', ibe: 'ibe-optics.com', kramer: 'kramerav.com',
  leica: 'leica-camera.com', metabones: 'metabones.com', zacuto: 'zacuto.com', angelbird: 'angelbird.com',
  apple: 'apple.com', cmotion: 'cmotion.eu', flowcine: 'flowcine.com', freefly: 'freeflysystems.com',
  fujifilm: 'fujifilm.com', sandisk: 'sandisk.com', sirui: 'sirui.com', vocas: 'vocas.com', datavideo: 'datavideo.com',
  denecke: 'denecke.com', kipon: 'kipon.com', kupo: 'kupogrip.com', shape: 'shapewlb.com', vinten: 'vinten.com',
  'vision-research': 'phantomhighspeed.com', 'video-devices': 'sounddevices.com', accsoon: 'accsoon.com',
  aputure: 'aputure.com', codex: 'codex.online', edelkrone: 'edelkrone.com', ifootage: 'ifootage.com',
  jvc: 'jvc.com', lensbaby: 'lensbaby.com', polarpro: 'polarpro.com', preston: 'prestoncinema.com',
  prograde: 'progradedigital.com', schneider: 'schneiderkreuznach.com', smallrig: 'smallrig.com',
  transvideo: 'transvideo.eu', glidecam: 'glidecam.com', 'dana-dolly': 'danadolly.com', 'p-s-technik': 'pstechnik.de',
  'convergent-design': 'convergent-design.com', marshall: 'marshall-usa.com', 'mark-roberts-motion-control': 'mrmoco.com',
};

const enc = (s) => encodeURIComponent(String(s || '').replace(/\s+/g, ' ').trim());
const tag = (url, store) => {
  const t = AFFILIATE[store];
  if (!t) return url;
  return url + (store === 'amazon' ? `&tag=${enc(t)}` : `&${t}`);
};

// "Sony PXW-FX6" — the brand first unless the name already carries it.
export const lookupName = (p) => {
  const name = String(p?.name || '').trim();
  const brand = p?.brand === 'general' || p?.brand === 'utopia' ? '' : String(p?.brandName || '').trim();
  return brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${name}` : name;
};

export function productLinks(p, { official = '' } = {}) {
  const q = lookupName(p);
  const site = MAKER_SITES[p?.brand];
  const maker = official
    || (site ? `https://www.google.com/search?q=${enc(`site:${site} ${p?.name || ''}`)}` : (p?.brand && p.brand !== 'general' && p.brand !== 'utopia' ? `https://www.google.com/search?q=${enc(`${q} official`)}` : ''));
  return {
    maker,
    stores: [
      { id: 'bh', name: 'B&H', url: tag(`https://www.bhphotovideo.com/c/search?q=${enc(q)}`, 'bh') },
      { id: 'amazon', name: 'Amazon', url: tag(`https://www.amazon.com/s?k=${enc(q)}`, 'amazon') },
      { id: 'adorama', name: 'Adorama', url: tag(`https://www.adorama.com/l/?searchinfo=${enc(q)}`, 'adorama') },
    ],
  };
}
