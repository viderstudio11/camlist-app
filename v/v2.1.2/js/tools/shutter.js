// Frame rate, shutter angle and flicker.
// A rotating shutter is described by its angle; a stills-style camera by an exposure time.
// The two are the same thing: time = angle / (360 × fps).

export const timeFromAngle = (fps, angle) => (fps > 0 && angle > 0 ? angle / (360 * fps) : 0);
export const angleFromTime = (fps, seconds) => (fps > 0 && seconds > 0 ? seconds * 360 * fps : 0);

// Shown the way a camera shows it: 1/50, 1/125…
export const asFraction = (seconds) => (seconds > 0 ? `1/${Math.round(1 / seconds)}` : '—');

// Mains-powered light pulses at twice the supply frequency. An exposure is flicker-free when it
// covers a whole number of those pulses — that is why 1/50 and 1/100 are safe on 50 Hz.
export function flicker(seconds, mains = 50) {
  if (!(seconds > 0) || !(mains > 0)) return { safe: false, pulses: 0, error: 1 };
  const pulses = seconds * 2 * mains;
  const nearest = Math.round(pulses);
  const error = nearest > 0 ? Math.abs(pulses - nearest) / nearest : 1;
  return { safe: nearest >= 1 && error < 0.02, pulses, nearest, error };
}

// The angles that come out flicker-free at this frame rate, nearest to 180° first.
export function safeAngles(fps, mains = 50, maxAngle = 360) {
  const out = [];
  for (let k = 1; k <= 64; k++) {
    const seconds = k / (2 * mains);
    const angle = angleFromTime(fps, seconds);
    if (angle > maxAngle + 0.001) break;
    if (angle >= 1) out.push({ angle: Math.round(angle * 10) / 10, seconds, label: asFraction(seconds) });
  }
  return out.sort((a, b) => Math.abs(a.angle - 180) - Math.abs(b.angle - 180));
}

// Shooting at 50 and playing at 25 gives half speed.
export function slowMotion(recordFps, projectFps) {
  if (!(recordFps > 0) || !(projectFps > 0)) return { factor: 0, label: '—' };
  const factor = recordFps / projectFps;
  const label = factor === 1 ? '1:1'
    : factor > 1 ? `${Math.round(factor * 100) / 100}× slower`
      : `${Math.round((1 / factor) * 100) / 100}× faster`;
  return { factor, label, secondsPerSecond: factor };
}

// 24 fps at 172.8° is the film-standard 1/50 — the angles a camera actually offers.
export const COMMON_ANGLES = [11.2, 22.5, 45, 90, 144, 172.8, 180, 270, 360];

// The frame rates cameras offer today — from 23.98 to the 240 that FX3, FX6 and V-RAPTOR reach in HD.
export const FRAME_RATES = [23.98, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 100, 119.88, 120, 150, 180, 200, 240];

// A short list of shutter speeds (the x of 1/x): the everyday ones, plus — per frame rate — the
// one that gives 180° and the ones that are flicker-free under this mains frequency.
const BASE_SPEEDS = [25, 30, 50, 60, 100, 120, 125, 250, 500, 1000];
const speedsFor = (fps, mains) => {
  const set = new Set(BASE_SPEEDS);
  if (fps > 0) set.add(Math.round(2 * fps));
  for (let k = 1; k <= 8; k++) { const d = (2 * mains) / k; if (Number.isInteger(d)) set.add(d); }
  return [...set].sort((a, b) => a - b);
};

// What to offer for this frame rate, which choices are flicker-free under this mains frequency,
// and which one to recommend. The recommendation is the flicker-free choice nearest to 180°,
// preferring one at or under 180° (a touch crisper) over one above it; if nothing at this frame
// rate is flicker-free (120 fps on 50 Hz), it is simply the one nearest to 180°.
export function shutterChoices(fps, mains = 50, mode = 'speed') {
  const frame = fps > 0 ? 1 / fps : 0;
  let options;
  if (mode === 'angle') {
    const angles = new Set([...COMMON_ANGLES, ...safeAngles(fps, mains).map(a => a.angle)]);
    options = [...angles].filter(a => a > 0 && a <= 360).sort((a, b) => a - b)
      .map(a => { const seconds = timeFromAngle(fps, a); return { value: a, seconds, label: `${a}°` }; });
  } else {
    options = speedsFor(fps, mains).filter(d => 1 / d <= frame + 1e-9)
      .map(d => ({ value: d, seconds: 1 / d, label: `1/${d}` }));
  }
  options = options.map(o => ({ ...o, safe: flicker(o.seconds, mains).safe }));

  const target = frame / 2; // 180°
  const dist = (o) => Math.abs(Math.log(o.seconds / target));
  const pick = (list) => [...list].sort((a, b) => dist(a) - dist(b))[0] || null;
  const safe = options.filter(o => o.safe);
  const recommended = pick(safe.filter(o => o.seconds <= target * 1.0001)) || pick(safe) || pick(options);
  return { options, recommended, anySafe: safe.length > 0 };
}
