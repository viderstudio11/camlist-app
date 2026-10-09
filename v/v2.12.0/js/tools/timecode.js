// Timecode as frame counts: reading a typed value, writing it back, and running it on from a jam.
// 23.976 and 29.97 run at 24000/1001 and 30000/1001 frames a second; 29.97 is labelled drop-frame
// (two frame numbers skipped each minute except every tenth), so its label stays on the wall clock.

export const rateOf = (fps) => (fps === 23.976 ? 24000 / 1001 : fps === 29.97 ? 30000 / 1001 : fps);
const isDF = (fps) => fps === 29.97;
const baseOf = (fps) => Math.round(fps);
// how many labels one day holds
export const dayFrames = (fps) => (isDF(fps) ? 2589408 : baseOf(fps) * 86400);

const pad = (n) => String(n).padStart(2, '0');

// "14:22:05:12", "14:22:05;12" or "14220512" → a frame count, or null when it is not a valid timecode.
export function parseTc(text, fps) {
  const d = String(text || '').replace(/\D/g, '');
  if (d.length !== 8) return null;
  const [hh, mm, ss, ff] = [0, 2, 4, 6].map(i => Number(d.slice(i, i + 2)));
  const base = baseOf(fps);
  if (hh > 23 || mm > 59 || ss > 59 || ff >= base) return null;
  if (isDF(fps) && ss === 0 && ff < 2 && mm % 10 !== 0) return null;   // those labels do not exist
  const labels = ((hh * 60 + mm) * 60 + ss) * base + ff;
  if (!isDF(fps)) return labels;
  const minutes = hh * 60 + mm;
  return labels - 2 * (minutes - Math.floor(minutes / 10));
}

export function formatTc(frames, fps) {
  const day = dayFrames(fps);
  let n = ((Math.floor(frames) % day) + day) % day;
  const base = baseOf(fps);
  if (isDF(fps)) {
    const tens = Math.floor(n / 17982), rest = n % 17982;
    n += 18 * tens + (rest > 1 ? 2 * Math.floor((rest - 2) / 1798) : 0);
  }
  const ff = n % base, s = Math.floor(n / base);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}${isDF(fps) ? ';' : ':'}${pad(ff)}`;
}

// Free run: the frame reached `ms` after a jam set `start` running.
export const runFrom = (start, jamAt, now, fps) => start + Math.floor(((now - jamAt) / 1000) * rateOf(fps));
