// Small shared formatters. Hebrew reads badly with a bare "1" in front of a plural,
// so quantities pick a singular or plural word instead of always printing the number.

export const hrs = (n) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10).toString();

export const unit = (t, n, one, many) => (Number(n) === 1 ? t(one) : `${n} ${t(many)}`);

// One block per shooting hour, the way a camera shows a battery: lit blocks are hours you have.
export const segBlocks = (hours, need, max = 24) => {
  const total = Math.min(Math.max(Math.ceil(need) || 1, 1), max);
  const lit = Math.max(0, Math.min(Math.round(hours), total));
  return Array.from({ length: total }, (_, i) => `<i class="${i < lit ? '' : 'off'}"></i>`).join('');
};

// 1.5 → "1:30", for shoot times and transfer times.
export const hm = (hours) => {
  const total = Math.max(0, Math.round(hours * 60));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export const num = (n, digits = 1) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return Math.abs(v) >= 100 ? Math.round(v).toString() : v.toFixed(digits).replace(/\.0$/, '');
};
