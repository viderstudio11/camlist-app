// The live viewfinder: the phone's camera full screen, with the frame the chosen cine camera and
// lens would take in from where you stand. A focal ruler along the bottom scrolls like a zoom ring,
// and the frame follows it live.
import { esc } from './dom.js';
import { feel } from '../feel.js';

// The phone's main camera, as the 35 mm-equivalent focal length makers quote (diagonal-based).
// Browsers open the main (1×) camera for the rear-facing request on nearly every phone.
const PHONE_EQ = 26;
// Half the angle across the long side of a 4:3 phone sensor: the long side is 4/5 of the diagonal,
// and a 16:9 video stream crops the short side only, so the long side holds for video too.
const TAN_HALF_LONG = (43.27 / 2) * 0.8 / PHONE_EQ;

let open = null;

/**
 * @param {object} o
 * @param {{name:string, w:number, h:number, mode?:string}} o.cam  sensor size in mm (recorded area)
 * @param {{mm:number, have:boolean}[]} o.stops  focal stops for the ruler; `have` = a catalog lens covers it
 * @param {number} o.focal  starting focal length
 * @param {(k:string)=>string} o.T
 * @param {(mm:number)=>void} o.onClose  called with the focal length last shown
 */
export async function openViewfinder(o) {
  if (open) return;
  const { cam, stops, T } = o;
  // The sensor window in use: the recording format's, switchable here with one tap.
  const modes = o.modes || [];
  let mi = Math.max(0, modes.findIndex(m => m.id === o.modeId));
  let area = modes.length ? { w: modes[mi].w, h: modes[mi].h } : { w: cam.w, h: cam.h };
  let idx = Math.max(0, stops.findIndex(s => s.mm >= o.focal));
  if (stops[idx]?.mm !== o.focal && idx > 0 && Math.abs(stops[idx - 1].mm - o.focal) < Math.abs(stops[idx].mm - o.focal)) idx -= 1;

  const el = document.createElement('div');
  el.className = 'vfx';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', T('viewfinder'));
  el.innerHTML = `
    <video class="vfx-video" playsinline autoplay muted></video>
    <div class="vfx-cmp" hidden><span></span></div>
    <div class="vfx-frame"><span class="vfx-mm"></span></div>
    <div class="vfx-wide" hidden></div>
    <div class="vfx-top">
      <div class="vfx-cam"><b>${esc(cam.name)}</b>${modes.length > 1 ? `<button class="vfx-mode" aria-label="${esc(T('rec_format'))}"></button>` : `<small>${esc(cam.mode || '')}</small>`}</div>
      <div class="vfx-btns"><button class="vfx-turn" aria-label="${esc(T('vf_turn'))}" title="${esc(T('vf_turn'))}">⟳</button><button class="vfx-close" aria-label="${esc(T('vf_stop'))}">✕</button></div>
    </div>
    <div class="vfx-bottom">
      <div class="vfx-read"><b class="vfx-big"></b><span class="vfx-deg"></span><button class="vfx-vs" hidden aria-label="${esc(T('vf_cmp_clear'))}"></button></div>
      <div class="vfx-at"></div>
      <div class="vfx-ruler" dir="ltr" role="listbox" aria-label="${esc(T('vf_ruler'))}">
        ${stops.map((s, i) => `<button class="vfx-stop ${s.have ? 'have' : ''}" role="option" data-i="${i}"><b>${s.mm}</b></button>`).join('')}
      </div>
      <p class="vfx-note">${esc(T('vf_hold'))}</p>
    </div>`;
  document.body.appendChild(el);
  document.documentElement.classList.add('vfx-on');

  // The app itself stays upright; the viewfinder opens sideways, the way a cine frame is seen.
  // Full screen first (it must come straight from the tap), then the screen is turned.
  let orient = 'landscape';
  const turn = (to) => {
    orient = to;
    el.classList.toggle('vfx-portrait', to === 'portrait');
    screen.orientation?.lock?.(to).catch(() => {});
  };
  const goFull = el.requestFullscreen?.({ navigationUI: 'hide' }) || el.webkitRequestFullscreen?.();
  Promise.resolve(goFull).then(() => turn('landscape')).catch(() => {});

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
  } catch {
    leaveFullscreen();
    document.documentElement.classList.remove('vfx-on');
    el.remove();
    return false;
  }

  const video = el.querySelector('video');
  const frame = el.querySelector('.vfx-frame');
  const wide = el.querySelector('.vfx-wide');
  const ruler = el.querySelector('.vfx-ruler');
  video.srcObject = stream;

  // Where the cine frame falls on screen. The video fills the screen (cover), so the phone's angle
  // per screen pixel comes from the stream's own size and the cover scale.
  // A lens held for comparison: a second, dashed frame, so two lenses can be weighed from the same spot.
  let cmp = null;
  const cmpEl = el.querySelector('.vfx-cmp');
  const vs = el.querySelector('.vfx-vs');
  const sizeOf = (mm) => {
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return null;
    const tanPerVideoPx = TAN_HALF_LONG / (Math.max(vw, vh) / 2);
    const scale = Math.max(el.clientWidth / vw, el.clientHeight / vh);
    return { w: ((area.w / (2 * mm)) / tanPerVideoPx) * 2 * scale, h: ((area.h / (2 * mm)) / tanPerVideoPx) * 2 * scale };
  };
  const draw = () => {
    const mm = stops[idx].mm;
    const vw = video.videoWidth, vh = video.videoHeight;
    const SW = el.clientWidth, SH = el.clientHeight;
    el.querySelector('.vfx-big').innerHTML = `${mm}<small>mm</small>`;
    el.querySelector('.vfx-deg').textContent = `${Math.round((2 * Math.atan(area.w / (2 * mm)) * 180) / Math.PI)}°`;
    el.querySelector('.vfx-mm').textContent = `${mm}mm`;
    el.querySelector('.vfx-at').textContent = o.frameLine ? o.frameLine(mm, area) : '';
    const mb = el.querySelector('.vfx-mode'); if (mb) mb.textContent = `${modes[mi].label} ▾`;
    ruler.querySelectorAll('.vfx-stop').forEach((b, i) => { b.classList.toggle('on', i === idx); b.classList.toggle('cmp', i === cmp); b.setAttribute('aria-selected', i === idx); });
    vs.hidden = cmp == null;
    if (cmp != null) vs.textContent = `vs ${stops[cmp].mm}mm ✕`;
    const c = cmp != null && sizeOf(stops[cmp].mm);
    cmpEl.hidden = !c;
    if (c) { cmpEl.style.width = `${c.w}px`; cmpEl.style.height = `${c.h}px`; cmpEl.querySelector('span').textContent = `${stops[cmp].mm}mm`; }
    const z = sizeOf(mm);
    if (!z) return;
    const fw = z.w, fh = z.h;
    frame.style.width = `${fw}px`;
    frame.style.height = `${fh}px`;
    const tooWide = fw > SW * 1.02 || fh > SH * 1.02;
    // Upright, a phone sees far less across than along; sideways it may well hold this lens.
    const short = Math.min(vw, vh) / Math.max(vw, vh);
    const fitsSideways = SH > SW && area.w / (2 * mm) <= TAN_HALF_LONG && area.h / (2 * mm) <= TAN_HALF_LONG * short;
    wide.textContent = T(fitsSideways ? 'vf_rotate' : 'vf_wider');
    wide.hidden = !tooWide;
    frame.classList.toggle('over', tooWide);
  };

  // The stop nearest the ruler's centre is the chosen one, so scrolling the ruler is turning the ring.
  const centreOn = (i, smooth) => {
    const b = ruler.children[i];
    ruler.scrollTo({ left: b.offsetLeft - (ruler.clientWidth - b.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
  };
  const tick = () => feel.detent();
  // stepping past either end of the ring knocks against the stop instead of moving
  const step = (dir) => {
    const n = idx + dir;
    if (n < 0 || n >= stops.length) { feel.end(); return; }
    idx = n; tick(); draw(); centreOn(idx, true);
  };
  const curve = () => {
    const mid = ruler.scrollLeft + ruler.clientWidth / 2;
    const half = ruler.clientWidth / 2 || 1;
    for (const b of ruler.children) {
      const d = Math.max(-1.3, Math.min(1.3, (b.offsetLeft + b.offsetWidth / 2 - mid) / half));
      b.style.transform = `translateY(${(d * d * 22).toFixed(1)}px) rotate(${(d * 16).toFixed(1)}deg)`;
      b.style.opacity = (1 - Math.abs(d) * 0.5).toFixed(2);
    }
  };
  let raf = 0;
  ruler.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      curve();
      const mid = ruler.scrollLeft + ruler.clientWidth / 2;
      let best = idx, d = Infinity;
      [...ruler.children].forEach((b, i) => { const c = Math.abs(b.offsetLeft + b.offsetWidth / 2 - mid); if (c < d) { d = c; best = i; } });
      if (best !== idx) { idx = best; tick(); draw(); }
    });
  }, { passive: true });
  // Holding a lens pins it as the comparison frame; holding it again (or tapping "vs") lets it go.
  let hold = 0, held = false;
  ruler.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.vfx-stop');
    if (!b) return;
    held = false;
    clearTimeout(hold);
    hold = setTimeout(() => {
      held = true;
      const i = Number(b.dataset.i);
      cmp = cmp === i ? null : i;
      feel.pin();
      draw();
    }, 450);
  });
  const cancelHold = () => clearTimeout(hold);
  ruler.addEventListener('pointerup', cancelHold);
  ruler.addEventListener('pointercancel', cancelHold);
  ruler.addEventListener('scroll', cancelHold, { passive: true });
  ruler.addEventListener('contextmenu', (e) => e.preventDefault());
  vs.onclick = () => { cmp = null; draw(); };
  ruler.addEventListener('click', (e) => {
    const b = e.target.closest('.vfx-stop');
    if (!b || held) { held = false; return; }
    idx = Number(b.dataset.i); tick(); draw(); centreOn(idx, true);
  });

  // A swipe across the picture steps one lens, for a thumb that is not on the ruler.
  let sx = null;
  video.addEventListener('pointerdown', (e) => { sx = e.clientX; });
  video.addEventListener('pointerup', (e) => {
    if (sx == null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) < 40) return;
    step(dx < 0 ? 1 : -1);
  });

  const onResize = () => { draw(); centreOn(idx, false); curve(); };
  video.addEventListener('loadedmetadata', onResize);
  window.addEventListener('resize', onResize);

  const close = () => {
    if (!open) return;
    open = null;
    stream.getTracks().forEach(tr => tr.stop());
    window.removeEventListener('resize', onResize);
    window.removeEventListener('hashchange', close);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('fullscreenchange', onFs);
    document.documentElement.classList.remove('vfx-on');
    leaveFullscreen();
    el.remove();
    o.onClose(stops[idx].mm);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') step(e.key === 'ArrowRight' ? 1 : -1);
  };
  el.querySelector('.vfx-close').onclick = close;
  el.querySelector('.vfx-mode')?.addEventListener('click', () => {
    mi = (mi + 1) % modes.length;
    area = { w: modes[mi].w, h: modes[mi].h };
    o.onMode?.(modes[mi].id); feel.detent(); draw();
  });
  el.querySelector('.vfx-turn').onclick = () => turn(orient === 'landscape' ? 'portrait' : 'landscape');
  window.addEventListener('hashchange', close);
  document.addEventListener('keydown', onKey);
  // Leaving full screen with the phone's back gesture closes the viewfinder too.
  const onFs = () => {
    if (document.fullscreenElement === el) { el.dataset.fs = '1'; return; }
    if (!document.fullscreenElement && !document.webkitFullscreenElement && open && el.dataset.fs) close();
  };
  document.addEventListener('fullscreenchange', onFs);
  open = { close };

  draw();
  requestAnimationFrame(() => { centreOn(idx, false); curve(); });
  el.querySelector('.vfx-close').focus();
  return true;
}

export const closeViewfinder = () => open?.close();

function leaveFullscreen() {
  try { screen.orientation?.unlock?.(); } catch { /* not supported */ }
  if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {});
}

// The ruler's stops: the usual cine primes, plus every focal length a catalog lens for this camera
// offers (primes, and both ends of each zoom). A stop is marked when a catalog lens covers it.
export function rulerStops(lenses, base) {
  const set = new Set(base);
  for (const l of lenses) { set.add(l.min); set.add(l.max); }
  return [...set].filter(mm => mm > 0 && mm <= 400).sort((a, b) => a - b)
    .map(mm => ({ mm, have: lenses.some(l => l.min <= mm && mm <= l.max) }));
}
