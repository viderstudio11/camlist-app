// Colour temperature from what the phone camera sees. With the camera's white balance locked at a known
// value, a white or grey card lit by the light reads warmer or cooler than neutral; the shift, in mireds,
// is the light's distance from the lock. sRGB → XYZ (D65) → xy → McCamy's CCT approximation.

const lin = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };

// Correlated colour temperature of an sRGB colour, in kelvin (McCamy 1992).
export function rgbToCct(r, g, b) {
  const R = lin(r), G = lin(g), B = lin(b);
  const X = 0.4124 * R + 0.3576 * G + 0.1805 * B;
  const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const Z = 0.0193 * R + 0.1192 * G + 0.9505 * B;
  const sum = X + Y + Z;
  if (!(sum > 0)) return 0;
  const x = X / sum, y = Y / sum;
  const n = (x - 0.3320) / (0.1858 - y);
  return 449 * n ** 3 + 3525 * n ** 2 + 6823.3 * n + 5520.33;
}

// sRGB's white is D65 (6504 K). A card that reads as D65 under a camera locked at `lock` K is lit by
// `lock` K light; any other reading moves by the same number of mireds.
export function lockedToLight(measured, lock) {
  const mired = 1e6 / measured + 1e6 / lock - 1e6 / 6504;
  return mired > 0 ? 1e6 / mired : 0;
}

// Familiar names for a reading.
export function kelvinLabel(k) {
  if (k < 2400) return 'k_candle';
  if (k < 3600) return 'k_tungsten';
  if (k < 4800) return 'k_mixed';
  if (k < 6200) return 'k_daylight';
  if (k < 7000) return 'k_overcast';
  return 'k_shade';
}
