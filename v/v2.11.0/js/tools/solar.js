// Sunrise, sunset and the hours either side of them, from the NOAA solar position equations.
// Everything is computed in UTC minutes and handed back as Date objects, so the device's own
// clock deals with the timezone and with daylight saving.

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

const dayOfYear = (date) => {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 86400000);
};

// Fractional year, in radians.
const gamma = (date, hour = 12) => (2 * Math.PI / 365) * (dayOfYear(date) - 1 + (hour - 12) / 24);

// Minutes by which the sun runs ahead of or behind clock time.
function equationOfTime(g) {
  return 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
    - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
}

// How far north or south of the equator the sun is, in radians.
function declination(g) {
  return 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g)
    - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g)
    - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
}

// The hour angle at which the sun sits at a given elevation. Null when it never gets there.
function hourAngle(latDeg, declRad, elevationDeg) {
  const zenith = rad(90 - elevationDeg);
  const cosH = Math.cos(zenith) / (Math.cos(rad(latDeg)) * Math.cos(declRad)) - Math.tan(rad(latDeg)) * Math.tan(declRad);
  if (cosH > 1 || cosH < -1) return null;
  return deg(Math.acos(cosH));
}

// Both crossings of one elevation, as Date objects. 0.833° below the horizon is the standard
// sunrise/sunset elevation: it allows for refraction and for the sun's own width.
export function crossings(date, lat, lon, elevationDeg = -0.833) {
  const base = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const at = (minutes) => new Date(base + minutes * 60000);

  // One pass at local noon, then a second pass evaluated at the time the first pass found.
  // The sun's declination moves through the day, so re-solving there is worth a few minutes.
  const solve = (hour, sign) => {
    const g = gamma(date, hour);
    const ha = hourAngle(lat, declination(g), elevationDeg);
    if (ha === null) return null;
    return 720 - 4 * (lon + sign * ha) - equationOfTime(g);
  };

  const refine = (sign) => {
    let minutes = solve(12, sign);
    if (minutes === null) return null;
    const second = solve(minutes / 60, sign);
    return second === null ? minutes : second;
  };

  const riseMin = refine(1);
  const setMin = refine(-1);
  if (riseMin === null || setMin === null) {
    const g = gamma(date, 12);
    return { rise: null, set: null, always: declination(g) * (lat >= 0 ? 1 : -1) > 0 };
  }
  return { rise: at(riseMin), set: at(setMin), always: false };
}

export function solarNoon(date, lon) {
  const g = gamma(date, 12);
  const base = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return new Date(base + (720 - 4 * lon - equationOfTime(g)) * 60000);
}

// The whole day as a shooting schedule reads it.
export function sunDay(date, lat, lon) {
  const sun = crossings(date, lat, lon, -0.833);
  const golden = crossings(date, lat, lon, 6);      // magic hour ends when the sun climbs past 6°
  const blueLow = crossings(date, lat, lon, -6);     // civil twilight
  const astro = crossings(date, lat, lon, -12);
  const noon = solarNoon(date, lon);
  const dayMs = sun.rise && sun.set ? sun.set - sun.rise : 0;
  return {
    sunrise: sun.rise,
    sunset: sun.set,
    noon,
    // Golden hour: from sunrise up to 6° in the morning, and back down to sunrise level in the evening.
    goldenMorning: sun.rise && golden.rise ? { from: sun.rise, to: golden.rise } : null,
    goldenEvening: golden.set && sun.set ? { from: golden.set, to: sun.set } : null,
    // Blue hour sits below the horizon, between civil twilight and sunrise or sunset.
    blueMorning: blueLow.rise && sun.rise ? { from: blueLow.rise, to: sun.rise } : null,
    blueEvening: sun.set && blueLow.set ? { from: sun.set, to: blueLow.set } : null,
    civilDawn: blueLow.rise,
    civilDusk: blueLow.set,
    astroDawn: astro.rise,
    astroDusk: astro.set,
    dayLengthHours: dayMs / 3600000,
    polar: !sun.rise || !sun.set,
  };
}

// A short list so nobody has to type coordinates on set.
export const PLACES = [
  { id: 'tlv',    he: 'תל אביב',      en: 'Tel Aviv',     lat: 32.0853, lon: 34.7818 },
  { id: 'jlm',    he: 'ירושלים',      en: 'Jerusalem',    lat: 31.7683, lon: 35.2137 },
  { id: 'haifa',  he: 'חיפה',         en: 'Haifa',        lat: 32.7940, lon: 34.9896 },
  { id: 'beer',   he: 'באר שבע',      en: 'Beer Sheva',   lat: 31.2518, lon: 34.7913 },
  { id: 'eilat',  he: 'אילת',         en: 'Eilat',        lat: 29.5577, lon: 34.9519 },
  { id: 'tiber',  he: 'טבריה',        en: 'Tiberias',     lat: 32.7922, lon: 35.5312 },
  { id: 'mitzpe', he: 'מצפה רמון',    en: 'Mitzpe Ramon', lat: 30.6094, lon: 34.8013 },
  { id: 'dead',   he: 'ים המלח',      en: 'Dead Sea',     lat: 31.5590, lon: 35.4732 },
];

// ---------- the place's own clock ----------
// Sun times belong to the place, not to the phone: a Tokyo sunset read in Tel Aviv is still 17:28.
// Each country carries its IANA time zone; a city overrides it where the country spans several.
export const zoneOf = (country, city) => city?.tz || country?.tz || null;

export function localTime(date, tz) {
  if (!(date instanceof Date) || Number.isNaN(+date)) return '—';
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', ...(tz ? { timeZone: tz } : {}) }).format(date);
}

// Today's date where the place is, as YYYY-MM-DD.
export function todayIn(tz, now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', ...(tz ? { timeZone: tz } : {}) })
    .formatToParts(now).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

// What the light is doing at `now`, and how long until the next change — for today's page only.
export function sunStatus(day, now = new Date()) {
  const t = +now, g = day.goldenEvening, b = day.blueEvening;
  if (day.sunrise && t < +day.sunrise) return { key: 'st_sunrise_in', ms: +day.sunrise - t };
  if (g && t < +g.from) return { key: 'st_golden_in', ms: +g.from - t };
  if (day.sunset && t < +day.sunset) return { key: 'st_golden_now', ms: +day.sunset - t };
  if (b && t < +b.to) return { key: 'st_blue_now', ms: +b.to - t };
  return { key: 'st_dark', ms: 0 };
}
