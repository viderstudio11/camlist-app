// Which lens covers the frame you want, from where you can actually stand.
// Sensor sizes are the recorded area, not the full photosite array.

export const SENSORS = [
  { id: 'ff',      label: 'Full Frame 36×24',        w: 36,    h: 24 },
  { id: 'ff-open', label: 'Full Frame Open Gate',    w: 36,    h: 24 },
  { id: 'lf',      label: 'ARRI ALEXA LF 36.7×25.5', w: 36.70, h: 25.54 },
  { id: 's35',     label: 'Super 35 24.9×14',        w: 24.89, h: 14.00 },
  { id: 'a35',     label: 'ALEXA 35 4.6K 27.99×19.22', w: 27.99, h: 19.22 },
  { id: 's35-16x9',label: 'Super 35 16:9 24.9×14',   w: 24.89, h: 14.00 },
  { id: 'mft',     label: 'Micro Four Thirds 17.3×13', w: 17.30, h: 13.00 },
  { id: 's16',     label: 'Super 16 12.52×7.41',     w: 12.52, h: 7.41 },
  { id: '23',      label: '2/3" 9.6×5.4',            w: 9.60,  h: 5.40 },
  { id: '1in',     label: '1" 13.2×8.8',             w: 13.20, h: 8.80 },
  { id: 'mf',      label: 'Medium Format 53.4×40',   w: 53.40, h: 40.00 },
];

export const sensor = (id) => SENSORS.find(s => s.id === id) || SENSORS[0];

// Angle of view across one sensor dimension, in degrees.
export const angleOfView = (dimMm, focalMm) =>
  (focalMm > 0 ? (2 * Math.atan(dimMm / (2 * focalMm)) * 180) / Math.PI : 0);

// How wide the frame is at a distance, in metres.
export const frameWidth = (sensorW, focalMm, distanceM) =>
  (focalMm > 0 ? (sensorW * distanceM) / focalMm : 0);

// The lens that makes the frame exactly that wide from exactly there.
export const focalFor = (sensorW, frameWidthM, distanceM) =>
  (frameWidthM > 0 ? (sensorW * distanceM) / frameWidthM : 0);

// What a lens does from a given distance, reported the way you would check it on set.
export function coverage(sensorId, focalMm, distanceM) {
  const s = sensor(sensorId);
  const w = frameWidth(s.w, focalMm, distanceM);
  const h = frameWidth(s.h, focalMm, distanceM);
  return {
    sensor: s,
    widthM: w,
    heightM: h,
    hFov: angleOfView(s.w, focalMm),
    vFov: angleOfView(s.h, focalMm),
    dFov: angleOfView(Math.hypot(s.w, s.h), focalMm),
  };
}

// The subjects a camera assistant actually frames to, as frame widths in metres.
export const SUBJECTS = [
  { id: 'cu',    he: 'קלוז־אפ',        en: 'Close-up',          width: 0.45 },
  { id: 'mcu',   he: 'חצי קלוז־אפ',    en: 'Medium close-up',   width: 0.8 },
  { id: 'ms',    he: 'בינוני',          en: 'Medium shot',       width: 1.2 },
  { id: 'cowboy',he: 'אמריקאי',         en: 'Cowboy',            width: 1.6 },
  { id: 'full',  he: 'דמות שלמה',       en: 'Full figure',       width: 2.2 },
  { id: 'two',   he: 'שתי דמויות',      en: 'Two shot',          width: 3.0 },
  { id: 'wide',  he: 'רחב',             en: 'Wide',              width: 6.0 },
  { id: 'vwide', he: 'רחב מאוד',        en: 'Very wide',         width: 12.0 },
];

// The focal lengths that are actually in the truck, so the answer names a real lens.
export const PRIME_SET = [12, 14, 16, 18, 21, 25, 27, 32, 35, 40, 50, 65, 75, 100, 135, 150, 180, 200];

export const nearestPrime = (focalMm, set = PRIME_SET) =>
  set.reduce((best, f) => (Math.abs(f - focalMm) < Math.abs(best - focalMm) ? f : best), set[0]);

// Shot sizes by how much of a standing person is in frame, top to bottom, in metres — the way an
// operator frames a person. Height, not width: a 16:9 frame 2.2 m wide is only 1.24 m tall.
export const SHOTS = [
  { id: 'ecu',   he: 'תקריב קיצוני', en: 'Extreme close-up', height: 0.25 },
  { id: 'cu',    he: 'תקריב',        en: 'Close-up',         height: 0.5 },
  { id: 'chest', he: 'עד החזה',      en: 'Medium close-up',  height: 0.75 },
  { id: 'waist', he: 'חצי גוף',      en: 'Medium shot',      height: 1.1 },
  { id: 'knees', he: 'עד הברכיים',   en: 'Cowboy',           height: 1.45 },
  { id: 'full',  he: 'כל הגוף',      en: 'Full figure',      height: 2.0 },
  { id: 'wide',  he: 'רחב',          en: 'Wide',             height: 4.0 },
];

// The focal length that fits frameHeightM of the scene into the sensor's height from distanceM.
export const lensFor = (sensorMm, distanceM, frameHeightM) =>
  (frameHeightM > 0 ? (sensorMm.h * distanceM) / frameHeightM : 0);

// What a focal length shows from a distance: frame width and height in metres, and the angles.
export const frameAt = (sensorMm, focalMm, distanceM) => ({
  widthM: frameWidth(sensorMm.w, focalMm, distanceM),
  heightM: frameWidth(sensorMm.h, focalMm, distanceM),
  hFov: angleOfView(sensorMm.w, focalMm),
});

// A real lens for the focal length: a zoom that covers it (the narrowest such zoom, set to the
// exact focal), otherwise the prime or zoom end nearest to it. lenses: [{ min, max }] in mm.
export function pickLens(needMm, lenses) {
  if (!(needMm > 0) || !lenses?.length) return null;
  const covering = lenses.filter(l => l.max > l.min && l.min <= needMm && needMm <= l.max)
    .sort((a, b) => (a.max / a.min) - (b.max / b.min));
  if (covering.length) return { ...covering[0], focal: Math.round(needMm) };
  let best = null;
  for (const l of lenses) for (const end of new Set([l.min, l.max])) {
    const d = Math.abs(Math.log(end / needMm));
    if (!best || d < best.d) best = { l, end, d };
  }
  return { ...best.l, focal: best.end };
}

// Metres are the working unit; feet are for crews who think in them. 1 ft = 0.3048 m exactly.
export const toUnit = (m, unit) => (unit === 'ft' ? m / 0.3048 : m);
export const fromUnit = (v, unit) => (unit === 'ft' ? v * 0.3048 : v);
