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
  const { stops, T } = o;
  // The camera in use can be swapped from here (o.cameras), and with it its recording formats.
  let cam = o.cam;
  // The sensor window in use: the recording format's, switchable here with one tap.
  let modes = o.modes || [];
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
    <div class="vfx-cmp c0" hidden><span></span></div><div class="vfx-cmp c1" hidden><span></span></div><div class="vfx-cmp c2" hidden><span></span></div>
    <div class="vfx-frame"><span class="vfx-mm"></span></div>
    <div class="vfx-ui">
    <div class="vfx-wide" hidden></div>
    <div class="vfx-top">
      <div class="vfx-cam"><button class="vfx-cambtn" aria-label="${esc(T('vf_switch_cam'))}"><b class="vfx-camname"></b><span aria-hidden="true">▾</span></button><button class="vfx-mode" aria-label="${esc(T('rec_format'))}" hidden></button><small class="vfx-modetxt"></small></div>
      <div class="vfx-btns"><button class="vfx-turn" aria-label="${esc(T('vf_turn'))}"><svg class="vfx-turn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="9" width="14" height="9" rx="1.6"/><path d="M14 3.5a6 6 0 0 1 6 6"/><path d="M20 6.2v3.3h-3.3"/></svg><span class="vfx-turn-lbl">${esc(T('vf_to_landscape'))}</span></button><button class="vfx-close" aria-label="${esc(T('vf_stop'))}">✕</button></div>
    </div>
    <div class="vfx-sheet" hidden role="dialog" aria-label="${esc(T('vf_switch_cam'))}">
      <div class="vfx-sheet-head"><b>${esc(T('vf_switch_cam'))}</b><button class="vfx-sheet-x" aria-label="${esc(T('vf_stop'))}">✕</button></div>
      <input class="vfx-q" type="search" placeholder="${esc(T('cam_search_ph'))}" autocomplete="off" enterkeyhint="search">
      <div class="vfx-camlist"></div>
    </div>
    <div class="vfx-bottom">
      <div class="vfx-read"><b class="vfx-big"></b><span class="vfx-deg"></span><button class="vfx-vs" hidden aria-label="${esc(T('vf_cmp_clear'))}"></button></div>
      <div class="vfx-at"></div>
      <div class="vfx-ruler" dir="ltr" role="listbox" aria-label="${esc(T('vf_ruler'))}">
        ${stops.map((s, i) => `<button class="vfx-stop ${s.have ? 'have' : ''}" role="option" data-i="${i}"><b>${s.mm}</b></button>`).join('')}
      </div>
      <p class="vfx-note">${esc(T('vf_hold'))}</p>
    </div>
    </div>`;
  document.body.appendChild(el);
  document.documentElement.classList.add('vfx-on');

  // The app itself stays upright; the viewfinder opens sideways, the way a cine frame is seen.
  // Full screen first (it must come straight from the tap), then the screen is turned.
  // Opens upright, as the phone is held; the turn button goes sideways (and back) on request.
  let orient = 'portrait';
  // Sideways: Android turns the screen (orientation lock, in full screen). iPhone cannot — there the
  // picture stays as it is (it is a window onto the scene either way) and only the controls and the
  // frame turn a quarter, so with the phone held sideways everything reads upright.
  const turn = async (to) => {
    orient = to;
    const lbl = el.querySelector('.vfx-turn-lbl');
    if (lbl) lbl.textContent = T(to === 'landscape' ? 'vf_to_portrait' : 'vf_to_landscape');
    el.classList.toggle('vfx-portrait', to === 'portrait');
    let locked = false;
    if (screen.orientation?.lock) { try { await screen.orientation.lock(to); locked = true; } catch { /* not allowed here */ } }
    el.classList.toggle('vfx-rot', !locked && to === 'landscape');
    if (typeof draw === 'function') { draw(); centreOn(idx, false); curve(); }
  };
  const goFull = el.requestFullscreen?.({ navigationUI: 'hide' }) || el.webkitRequestFullscreen?.();
  Promise.resolve(goFull).catch(() => {});

  // Why the camera did not open decides what the user is told: no camera API at all (the in-app browser
  // of WhatsApp, Instagram and the like, or a page not on https), permission refused, or no camera.
  const fail = (why) => { leaveFullscreen(); document.documentElement.classList.remove('vfx-on'); el.remove(); return why; };
  if (!navigator.mediaDevices?.getUserMedia) return fail('unsupported');
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
  } catch (err) {
    if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') return fail('denied');
    // some phones (older iPhones among them) refuse the size request: ask again for any rear camera
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); }
    catch (err2) { return fail(err2?.name === 'NotAllowedError' ? 'denied' : err2?.name === 'NotFoundError' ? 'nocamera' : 'failed'); }
  }

  const video = el.querySelector('video');
  const frame = el.querySelector('.vfx-frame');
  const wide = el.querySelector('.vfx-wide');
  const ruler = el.querySelector('.vfx-ruler');
  video.srcObject = stream;
  video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', '');
  video.play?.().catch(() => {});

  // Where the cine frame falls on screen. The video fills the screen (cover), so the phone's angle
  // per screen pixel comes from the stream's own size and the cover scale.
  // A lens held for comparison: a second, dashed frame, so two lenses can be weighed from the same spot.
  const MAX_CMP = 3;
  let cmp = [];
  const cmpEls = [...el.querySelectorAll('.vfx-cmp')];
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
    el.querySelector('.vfx-camname').textContent = cam.name;
    const mb = el.querySelector('.vfx-mode');
    mb.hidden = modes.length < 2;
    if (modes.length > 1) mb.textContent = `${modes[mi].label} ▾`;
    el.querySelector('.vfx-modetxt').textContent = modes.length > 1 ? '' : (modes[0]?.label || cam.mode || '');
    ruler.querySelectorAll('.vfx-stop').forEach((b, i) => { const k = cmp.indexOf(i); b.classList.toggle('on', i === idx); b.classList.toggle('cmp', k >= 0); b.classList.remove('c0', 'c1', 'c2'); if (k >= 0) b.classList.add(`c${k}`); b.setAttribute('aria-selected', i === idx); });
    vs.hidden = !cmp.length;
    if (cmp.length) vs.innerHTML = `vs ${cmp.map((i, k) => `<i class="vs-dot c${k}"></i>${stops[i].mm}`).join(' ')} ✕`;
    const rot = el.classList.contains('vfx-rot');
    cmpEls.forEach((e, k) => {
      const i = cmp[k];
      const c = i != null && sizeOf(stops[i].mm);
      e.hidden = !c;
      if (c) { e.style.width = `${rot ? c.h : c.w}px`; e.style.height = `${rot ? c.w : c.h}px`; e.querySelector('span').textContent = `${stops[i].mm}mm`; }
    });
    const z = sizeOf(mm);
    if (!z) return;
    const fw = z.w, fh = z.h;
    frame.style.width = `${rot ? fh : fw}px`;
    frame.style.height = `${rot ? fw : fh}px`;
    const tooWide = rot ? (fw > SH * 1.02 || fh > SW * 1.02) : (fw > SW * 1.02 || fh > SH * 1.02);
    // Upright, a phone sees far less across than along; sideways it may well hold this lens.
    const short = Math.min(vw, vh) / Math.max(vw, vh);
    const fitsSideways = !rot && SH > SW && area.w / (2 * mm) <= TAN_HALF_LONG && area.h / (2 * mm) <= TAN_HALF_LONG * short;
    wide.textContent = T(fitsSideways ? 'vf_rotate' : 'vf_wider');
    wide.hidden = !tooWide;
    frame.classList.toggle('over', tooWide);
  };

  // The stop nearest the ruler's centre is the chosen one, so scrolling the ruler is turning the ring.
  const centreOn = (i, smooth) => {
    const b = ruler.children[i];
    ruler.scrollTo({ left: b.offsetLeft - (ruler.clientWidth - b.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
  };
  let lastTick = 0;
  const tick = () => { const now = performance.now(); if (now - lastTick > 70) { lastTick = now; feel.detent(); } };
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
  let hold = 0, held = false, hx = 0, hy = 0;
  ruler.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.vfx-stop');
    if (!b) return;
    held = false;
    hx = e.clientX; hy = e.clientY;
    clearTimeout(hold);
    hold = setTimeout(() => {
      held = true;
      const i = Number(b.dataset.i);
      // hold again to let a lens go; a fourth replaces the oldest
      cmp = cmp.includes(i) ? cmp.filter(x => x !== i) : [...cmp, i].slice(-MAX_CMP);
      feel.pin();
      draw();
    }, 450);
  });
  const cancelHold = () => clearTimeout(hold);
  ruler.addEventListener('pointerup', cancelHold);
  ruler.addEventListener('pointercancel', cancelHold);
  // only the finger moving lets the hold go — the dial still gliding from a tap does not
  ruler.addEventListener('pointermove', (e) => { if (Math.hypot(e.clientX - hx, e.clientY - hy) > 10) cancelHold(); });
  // when the ring stops on a lens: a firmer click (a short quiet after the last scroll means it has settled)
  let settleT = 0, settledAt = idx;
  ruler.addEventListener('scroll', () => { clearTimeout(settleT); settleT = setTimeout(() => { if (settledAt !== idx) { settledAt = idx; feel.settle(); } }, 160); }, { passive: true });
  ruler.addEventListener('contextmenu', (e) => e.preventDefault());
  vs.onclick = () => { cmp = []; draw(); };
  ruler.addEventListener('click', (e) => {
    const b = e.target.closest('.vfx-stop');
    if (!b || held) { held = false; return; }
    idx = Number(b.dataset.i); tick(); draw(); centreOn(idx, true);
  });

  // A swipe across the picture steps one lens, for a thumb that is not on the ruler.
  let sx = null;
  let sy = null;
  video.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
  video.addEventListener('pointerup', (e) => {
    if (sx == null) return;
    const dx = el.classList.contains('vfx-rot') ? e.clientY - sy : e.clientX - sx; sx = null;
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
    if (e.target.closest?.('.vfx-sheet')) { if (e.key === 'Escape') sheet.hidden = true; return; }
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') step(e.key === 'ArrowRight' ? 1 : -1);
  };
  el.querySelector('.vfx-close').onclick = close;
  el.querySelector('.vfx-mode').addEventListener('click', () => {
    if (modes.length < 2) return;
    mi = (mi + 1) % modes.length;
    area = { w: modes[mi].w, h: modes[mi].h };
    o.onMode?.(cam.id, modes[mi].id); feel.detent(); draw();
  });
  // Switching camera without leaving: the project's and recent cameras first, or search by name.
  const sheet = el.querySelector('.vfx-sheet');
  const list = el.querySelector('.vfx-camlist');
  const q = el.querySelector('.vfx-q');
  const tagOf = (id) => (o.projectId != null && String(id) === String(o.projectId) ? T('cam_from_project') : (o.recent || []).map(String).includes(String(id)) ? T('cam_recent') : '');
  const listCams = () => {
    const term = q.value.trim().toLowerCase();
    const all = o.cameras || [];
    const quick = [o.projectId, ...(o.recent || [])].filter(x => x != null).map(String);
    const found = term ? all.filter(c => c.name.toLowerCase().includes(term))
      : [...quick.map(id => all.find(c => String(c.id) === id)).filter(Boolean), ...all.filter(c => !quick.includes(String(c.id)))];
    list.innerHTML = [...new Map(found.map(c => [String(c.id), c])).values()].slice(0, 40).map(c =>
      `<button class="vfx-camrow ${String(c.id) === String(cam.id) ? 'on' : ''}" data-cam="${esc(c.id)}"><b>${esc(c.name)}</b><small>${esc(String(c.id) === String(cam.id) ? T('cam_now') : tagOf(c.id))}</small></button>`).join('')
      || `<p class="vfx-empty">${esc(T('cam_none'))}</p>`;
  };
  const setCam = (c) => {
    cam = c;
    modes = c.modes || [];
    mi = Math.max(0, modes.findIndex(m => m.id === o.modeFor?.(c.id)));
    area = modes.length ? { w: modes[mi].w, h: modes[mi].h } : { w: c.w, h: c.h };
    o.onCamera?.(c.id);
    feel.detent(); draw();
  };
  el.querySelector('.vfx-cambtn').addEventListener('click', () => { sheet.hidden = !sheet.hidden; if (!sheet.hidden) { q.value = ''; listCams(); } });
  el.querySelector('.vfx-sheet-x').addEventListener('click', () => { sheet.hidden = true; });
  q.addEventListener('input', listCams);
  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cam]'); if (!b) return;
    const c = (o.cameras || []).find(x => String(x.id) === b.dataset.cam);
    if (c) setCam(c);
    sheet.hidden = true;
  });
  el.querySelector('.vfx-turn').onclick = () => {
    const to = orient === 'landscape' ? 'portrait' : 'landscape';
    // turning the screen needs full screen; ask again from this tap if it was refused or left
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      Promise.resolve(el.requestFullscreen?.({ navigationUI: 'hide' }) || el.webkitRequestFullscreen?.()).then(() => turn(to)).catch(() => turn(to));
    } else turn(to);
    feel.detent();
  };
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
