// Slate: a time-of-day timecode clock for cameras without timecode (or many cameras at once), with scene,
// take and roll, and a clap — a white flash and the sound of sticks — that marks the same frame in picture
// and sound. Full screen turns it into a big, high-contrast board the cameras can read, upright or sideways.
import { esc } from '../dom.js';
import { feel } from '../../feel.js';
import { more } from './shared.js';

const FPS = [23.976, 24, 25, 29.97, 30, 48, 50, 60];
const ZONES = ['local', 'UTC', 'Europe/London', 'Europe/Paris', 'Asia/Jerusalem', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Australia/Sydney'];
const KEY = 'camlist.slate';
const S = (() => {
  const base = { fps: 25, scene: 1, take: 1, roll: 'A001', off: 0, zone: 'local', sound: 'clap', corr: 0 };
  try { return { ...base, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return base; }
})();
const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private window */ } };
let check = null;   // the last clock check: { offsetMs, plusMinusMs } or { failed: true }

const pad = (n) => String(n).padStart(2, '0');
// How far the chosen place's wall clock is from this phone's, worked out once a minute.
let zoneAt = 0, zoneShift = 0;
const shiftFor = (now) => {
  if (S.zone === 'local') return 0;
  if (now - zoneAt < 60000) return zoneShift;
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: S.zone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(now)).map(x => [x.type, x.value]));
    const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    zoneShift = wall - (now - new Date(now).getTimezoneOffset() * 60000) - (now % 1000) + 0;
    zoneShift = Math.round(zoneShift / 60000) * 60000;
  } catch { zoneShift = 0; }
  zoneAt = now;
  return zoneShift;
};
// Time-of-day timecode: the phone's clock (corrected by the clock check), moved to the chosen zone and
// nudged by whole frames. 29.97 is shown with the drop-frame mark, as time-of-day timecode is.
export const timecode = (now = Date.now()) => {
  const base = Math.round(S.fps);
  const ms = now + S.corr + (S.off * 1000) / S.fps - new Date(now).getTimezoneOffset() * 60000 + shiftFor(now);
  const day = ((ms % 86400000) + 86400000) % 86400000;
  const s = Math.floor(day / 1000), f = Math.floor(((day % 1000) / 1000) * base);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}${S.fps === 29.97 ? ';' : ':'}${pad(f)}`;
};

// The sound of the sticks: two wooden knocks a few milliseconds apart over a short body thump —
// synthesised, so there is no recording to license. Or a plain 1 kHz beep, as sync boxes give.
let ac = null;
function clapSound() {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime + 0.005;
    if (S.sound === 'beep') {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = 1000; g.gain.setValueAtTime(0.35, t); g.gain.setValueAtTime(0.35, t + 0.08); g.gain.linearRampToValueAtTime(0, t + 0.09);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.1);
      return;
    }
    const knock = (at, gain, freq) => {
      const len = Math.round(ac.sampleRate * 0.07), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.006));
      const src = ac.createBufferSource(); src.buffer = buf;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 0.9;
      const g = ac.createGain(); g.gain.value = gain;
      src.connect(bp).connect(g).connect(ac.destination); src.start(at);
    };
    knock(t, 1.4, 2300); knock(t + 0.004, 0.9, 1500);
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.08);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.1);
  } catch { /* audio unavailable */ }
}

// The clock check: the phone's clock against a time server, best of five tries (the shortest round trip
// says the most). Web pages cannot read GPS time; the phone's own clock is network-synced, and this shows
// by how much it is off and how sure the answer is.
async function checkClock() {
  const tries = [];
  for (let i = 0; i < 5; i++) {
    try {
      const t0 = Date.now();
      const r = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=UTC', { cache: 'no-store' });
      const j = await r.json();
      const t1 = Date.now();
      const server = Date.UTC(j.year, j.month - 1, j.day, j.hour, j.minute, j.seconds, j.milliSeconds);
      tries.push({ rtt: t1 - t0, offset: server - (t0 + t1) / 2 });
    } catch { /* one try lost */ }
  }
  if (!tries.length) return { failed: true };
  const best = tries.sort((a, b) => a.rtt - b.rtt)[0];
  return { offsetMs: Math.round(best.offset), plusMinusMs: Math.round(best.rtt / 2) };
}

function slateTool(T, lang) {
  const Tp = (k, p) => T(k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
  const zoneName = (z) => (z === 'local' ? T('sl_zone_local') : z === 'UTC' ? 'UTC' : z.split('/').pop().replace(/_/g, ' '));
  const field = (k, v, steps) => `<div class="sl-f"><small>${esc(T('sl_' + k))}</small>${steps ? `<div class="sl-step"><button data-sl="${k}" data-d="-1" aria-label="−">−</button><b>${esc(v)}</b><button data-sl="${k}" data-d="1" aria-label="+">+</button></div>` : `<input class="sl-roll" value="${esc(v)}" maxlength="8" aria-label="${esc(T('sl_roll'))}">`}</div>`;
  const checkLine = !check ? '' : check.failed ? `<p class="tnote">${esc(T('sl_check_fail'))}</p>`
    : `<p class="tnote">${esc(Tp('sl_check_res', { s: (Math.abs(check.offsetMs) / 1000).toFixed(2), dir: T(check.offsetMs > 0 ? 'sl_behind' : 'sl_ahead'), pm: (check.plusMinusMs / 1000).toFixed(2) }))}</p>
       ${Math.abs(check.offsetMs) > check.plusMinusMs ? `<button class="btn sm" data-sl-apply>${esc(T('sl_apply'))}</button>` : ''}`;
  return `<div class="card sl-card">
      <div class="sl-tc" data-sl-tc dir="ltr">${timecode()}</div>
      <div class="sl-meta"><span>${esc(zoneName(S.zone))}</span><span>${S.fps} fps</span>${S.corr ? `<span>${esc(T('sl_corrected'))}</span>` : ''}</div>
      <div class="chips sl-fps">${FPS.map(f => `<button class="chip pick ${f === S.fps ? 'on' : ''}" data-sl-fps="${f}">${f}</button>`).join('')}</div>
      <div class="sl-board">${field('scene', S.scene, true)}${field('take', S.take, true)}${field('roll', S.roll, false)}</div>
      <button class="btn primary sl-clap" data-sl-clap>${esc(T('sl_clap'))}</button>
      <button class="btn sl-full" data-sl-full>${esc(T('sl_full'))}</button>
    </div>
    ${more('slate', T('sl_more'), `${T(S.sound === 'beep' ? 'sl_beep' : 'sl_sticks')} · ${zoneName(S.zone)}${S.off ? ` · ${S.off > 0 ? '+' : ''}${S.off}f` : ''}`, `<div class="card sh-sec">
      <div class="tsub">${esc(T('sl_sound'))}</div>
      <div class="chips"><button class="chip pick ${S.sound !== 'beep' ? 'on' : ''}" data-sl-sound="clap">${esc(T('sl_sticks'))}</button><button class="chip pick ${S.sound === 'beep' ? 'on' : ''}" data-sl-sound="beep">${esc(T('sl_beep'))}</button></div>
      <div class="tsub" style="margin-top:12px">${esc(T('sl_zone'))}</div>
      <select class="sl-zone" data-sl-zone>${ZONES.map(z => `<option value="${z}" ${z === S.zone ? 'selected' : ''}>${esc(zoneName(z))}</option>`).join('')}</select>
      <div class="tsub" style="margin-top:12px">${esc(T('sl_fine'))}</div>
      <div class="sl-step sl-fine"><button data-sl="off" data-d="-1" aria-label="−">−</button><b>${S.off > 0 ? '+' : ''}${S.off} ${esc(T('sl_frames'))}</b><button data-sl="off" data-d="1" aria-label="+">+</button></div>
      <div class="tsub" style="margin-top:12px">${esc(T('sl_check'))}</div>
      <p class="tnote">${esc(T('sl_check_why'))}</p>
      <button class="btn sm" data-sl-check>${esc(T('sl_check_btn'))}</button>
      ${checkLine}
      ${S.corr ? `<button class="btn sm ghost" data-sl-uncorrect>${esc(T('sl_uncorrect'))}</button>` : ''}
    </div>`)}
    <p class="tnote">${esc(T('sl_note'))}</p>`;
}

// Full screen: the board as big as the screen allows, black and white for the cameras; tap anywhere to clap.
function openFull(T, onClose) {
  const el = document.createElement('div');
  el.className = 'slx';
  el.innerHTML = `<div class="slx-ui">
      <div class="slx-tc" dir="ltr"></div>
      <div class="slx-board"><div><small>${esc(T('sl_scene'))}</small><b class="slx-scene"></b></div><div><small>${esc(T('sl_take'))}</small><b class="slx-take"></b></div><div><small>${esc(T('sl_roll'))}</small><b class="slx-roll"></b></div></div>
      <p class="slx-hint">${esc(T('sl_tap'))}</p>
      <div class="slx-btns"><button class="slx-turn">${esc(T('vf_to_landscape'))}</button><button class="slx-board-btn">${esc(T('sl_digits'))}</button><button class="slx-x" aria-label="${esc(T('vf_stop'))}">✕</button></div>
    </div><div class="slx-flash"></div>`;
  document.body.appendChild(el);
  document.documentElement.classList.add('vfx-on');
  Promise.resolve(el.requestFullscreen?.({ navigationUI: 'hide' }) || el.webkitRequestFullscreen?.()).catch(() => {});
  let lock = null;
  navigator.wakeLock?.request('screen').then(l => { lock = l; }).catch(() => {});
  const tcEl = el.querySelector('.slx-tc');
  const paint = () => { el.querySelector('.slx-scene').textContent = S.scene; el.querySelector('.slx-take').textContent = S.take; el.querySelector('.slx-roll').textContent = S.roll; };
  // the digits fill the width they have, upright or turned
  const fit = () => { const rot = el.classList.contains('slx-rot'); const w = rot ? innerHeight : innerWidth; tcEl.style.fontSize = '100px'; tcEl.style.fontSize = `${Math.floor((100 * w * 0.92) / Math.max(1, tcEl.scrollWidth))}px`; };
  paint();
  let raf = 0;
  const loop = () => { tcEl.textContent = timecode(); raf = requestAnimationFrame(loop); };
  loop(); fit();
  const flash = el.querySelector('.slx-flash');
  const doClap = () => { flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); clapSound(); feel.clap(); setTimeout(() => { S.take += 1; keep(); paint(); }, 400); };
  el.addEventListener('click', (e) => { if (e.target.closest('button')) return; doClap(); });
  let orient = 'portrait';
  el.querySelector('.slx-turn').addEventListener('click', async (e) => {
    orient = orient === 'portrait' ? 'landscape' : 'portrait';
    e.currentTarget.textContent = T(orient === 'landscape' ? 'vf_to_portrait' : 'vf_to_landscape');
    let locked = false;
    if (screen.orientation?.lock) { try { await screen.orientation.lock(orient); locked = true; } catch { /* not here */ } }
    el.classList.toggle('slx-rot', !locked && orient === 'landscape');
    setTimeout(fit, 250);
  });
  el.querySelector('.slx-board-btn').addEventListener('click', (e) => {
    const only = el.classList.toggle('slx-digits');
    e.currentTarget.textContent = T(only ? 'sl_board' : 'sl_digits');
  });
  const close = () => {
    cancelAnimationFrame(raf);
    lock?.release?.().catch?.(() => {});
    try { screen.orientation?.unlock?.(); } catch { /* none */ }
    if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {});
    document.documentElement.classList.remove('vfx-on');
    removeEventListener('resize', fit);
    el.remove();
    onClose?.();
  };
  el.querySelector('.slx-x').addEventListener('click', close);
  addEventListener('resize', fit);
}

export { slateTool as view };

export function bind(root, ctx, { T }) {
  const tcEl = root.querySelector('[data-sl-tc]');
  let raf = 0;
  const loop = () => { if (!tcEl.isConnected) return; tcEl.textContent = timecode(); raf = requestAnimationFrame(loop); };
  if (tcEl) { cancelAnimationFrame(raf); loop(); }
  const redraw = () => { keep(); ctx.render(); };
  root.querySelectorAll('[data-sl-fps]').forEach(b => { b.onclick = () => { S.fps = Number(b.dataset.slFps); feel.detent(); redraw(); }; });
  root.querySelectorAll('[data-sl]').forEach(b => { b.onclick = () => {
    const k = b.dataset.sl, d = Number(b.dataset.d);
    if (k === 'off') S.off += d; else S[k] = Math.max(1, S[k] + d);
    feel.detent(); redraw();
  }; });
  const roll = root.querySelector('.sl-roll');
  if (roll) roll.onchange = () => { S.roll = roll.value.trim().toUpperCase().slice(0, 8) || 'A001'; redraw(); };
  root.querySelector('[data-sl-clap]')?.addEventListener('click', () => {
    clapSound(); feel.clap();
    const card = root.querySelector('.sl-card'); card?.classList.remove('sl-flash'); void card?.offsetWidth; card?.classList.add('sl-flash');
    setTimeout(() => { S.take += 1; redraw(); }, 450);
  });
  root.querySelector('[data-sl-full]')?.addEventListener('click', () => openFull(T, () => ctx.render()));
  root.querySelectorAll('[data-sl-sound]').forEach(b => { b.onclick = () => { S.sound = b.dataset.slSound; clapSound(); redraw(); }; });
  root.querySelector('[data-sl-zone]')?.addEventListener('change', (e) => { S.zone = e.target.value; zoneAt = 0; redraw(); });
  root.querySelector('[data-sl-check]')?.addEventListener('click', async (e) => {
    e.currentTarget.disabled = true; e.currentTarget.textContent = '…';
    check = await checkClock(); ctx.render();
  });
  root.querySelector('[data-sl-apply]')?.addEventListener('click', () => { if (check?.offsetMs) { S.corr = check.offsetMs; check = null; redraw(); } });
  root.querySelector('[data-sl-uncorrect]')?.addEventListener('click', () => { S.corr = 0; redraw(); });
}
