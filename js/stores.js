// Where a product can be looked up: the maker's own site and three stores (B&H, Amazon, Adorama).
// The catalog has no fixed product address at each store, so the links search the store for
// "brand + model", which lands on the product or a very short list. The maker link opens the maker's
// official site (or, for cameras, the product's own official page).
//
// AFFILIATE: each store's referral tag, empty until the business signs up with that store's programme
// (B&H and Adorama run theirs through partner networks, Amazon through Amazon Associates). Filled in
// here, every store link in the app carries it — no screen needs to change.
export const AFFILIATE = { bh: '', amazon: '', adorama: '' };

// Official sites by catalog brand id — each opened and checked on 2026-10-05 (403 = the site refuses
// scripted checks but opens in a browser). Brands whose site could not be reached get no maker link.
export const MAKER_URLS = {
  "laowa": "https://www.venuslens.net/",
  "blackmagic-design": "https://www.blackmagicdesign.com/",
  "hollyland": "https://www.hollyland.com/",
  "sigma": "https://www.sigma-global.com/",
  "angenieux": "https://www.angenieux.com/",
  "chrosziel": "https://www.chrosziel.com/",
  "insta360": "https://www.insta360.com/",
  "manfrotto": "https://www.manfrotto.com/",
  "swit": "https://www.swit.cc/",
  "atomos": "https://www.atomos.com/",
  "aja": "https://www.aja.com/",
  "cartoni": "https://www.cartoni.com/",
  "kramer": "https://www.kramerav.com/",
  "decimator-design": "https://www.decimator.com/",
  "ibe": "https://www.ibe-optics.com/",
  "vocas": "https://www.vocas.com/",
  "datavideo": "https://www.datavideo.com/",
  "sandisk": "https://www.sandisk.com/",
  "kipon": "https://www.kipon.com/",
  "apple": "https://www.apple.com/",
  "video-devices": "https://www.sounddevices.com/",
  "angelbird": "https://www.angelbird.com/",
  "portkeys": "https://www.portkeys.com/",
  "metabones": "https://www.metabones.com/",
  "shape": "https://www.shapewlb.com/",
  "accsoon": "https://www.accsoon.com/",
  "polarpro": "https://www.polarpro.com/",
  "vision-research": "https://www.phantomhighspeed.com/",
  "jvc": "https://www.jvc.com/",
  "arri": "https://www.arri.com/",
  "mark-roberts-motion-control": "https://www.mrmoco.com/",
  "p-s-technik": "https://www.pstechnik.de/",
  "tiffen": "https://www.tiffen.com/",
  "dji": "https://www.dji.com/",
  "marshall": "https://www.marshall-usa.com/",
  "tilta": "https://www.tilta.com/",
  "zeiss": "https://www.zeiss.com/",
  "dzofilm": "https://www.dzofilm.com/",
  "smallrig": "https://www.smallrig.com/",
  "teradek": "https://www.teradek.com/",
  "smallhd": "https://www.smallhd.com/",
  "red": "https://www.red.com/",
  "cooke": "https://www.cookeoptics.com/",
  "panasonic": "https://pro-av.panasonic.net/",
  "arri-fujinon": "https://www.fujifilm.com/",
  "wooden-camera": "https://www.woodencamera.com/",
  "fujifilm": "https://www.fujifilm.com/",
  "viltrox": "https://www.viltrox.com/",
  "zacuto": "https://www.zacuto.com/",
  "cmotion": "https://www.cmotion.eu/",
  "sirui": "https://www.sirui.com/",
  "lexar": "https://www.lexar.com/",
  "flowcine": "https://www.flowcine.com/",
  "preston": "https://www.prestoncinema.com/",
  "kupo": "https://www.kupogrip.com/",
  "lensbaby": "https://www.lensbaby.com/",
  "dana-dolly": "https://www.danadolly.com/",
  "fujinon": "https://www.fujifilm.com/",
  "freefly": "https://www.freeflysystems.com/",
  "vinten": "https://www.vinten.com/",
  "prograde": "https://www.progradedigital.com/",
  "edelkrone": "https://www.edelkrone.com/",
  "easyrig": "https://www.easyrig.se/",
  "aputure": "https://www.aputure.com/",
  "schneider": "https://www.schneiderkreuznach.com/",
  "leica": "https://www.leica-camera.com/",
  "sachtler": "https://www.sachtler.com/",
  "gopro": "https://www.gopro.com/",
  "convergent-design": "https://www.convergent-design.com/",
  "glidecam": "https://www.glidecam.com/",
  "samyang": "https://www.samyanglensglobal.com/",
  "codex": "https://www.codex.online/",
  "canon": "https://www.usa.canon.com/",
  "sony": "https://pro.sony/"
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
  // straight to the maker: the product's own page when we have it (cameras), else the maker's official site
  const maker = official || MAKER_URLS[p?.brand] || '';
  return {
    maker,
    stores: [
      { id: 'bh', name: 'B&H', url: tag(`https://www.bhphotovideo.com/c/search?q=${enc(q)}`, 'bh') },
      { id: 'amazon', name: 'Amazon', url: tag(`https://www.amazon.com/s?k=${enc(q)}`, 'amazon') },
      { id: 'adorama', name: 'Adorama', url: tag(`https://www.adorama.com/l/?searchinfo=${enc(q)}`, 'adorama') },
    ],
  };
}
