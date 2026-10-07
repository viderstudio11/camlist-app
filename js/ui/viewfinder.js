// The live viewfinder: the phone's camera full screen, with the frame the chosen cine camera and
// lens would take in from where you stand. A focal ruler along the bottom scrolls like a zoom ring,
// and the frame follows it live. Dressed as a camera monitor (ARRI-style data bars), it grabs a frame or
// records a clip of exactly the cine frame, the camera data burned in, to send to the director or keep.
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
  // dressed like the chosen camera world's monitor (ARRI bars, Sony corners, RED boxes, Canon band)
  const LOOK = ['arri', 'sony', 'red', 'canon'].includes(o.look) ? o.look : 'arri';
  el.className = `vfx vfx-look-${LOOK}`;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', T('viewfinder'));
  el.innerHTML = `
    <video class="vfx-video" playsinline autoplay muted></video>
    <div class="vfx-cmp c0" hidden><span></span></div><div class="vfx-cmp c1" hidden><span></span></div><div class="vfx-cmp c2" hidden><span></span></div>
    <div class="vfx-frame"><span class="vfx-mm"></span></div>
    <div class="vfx-centre" aria-hidden="true"></div>
    <div class="vfx-ui">
    <div class="vfx-data" dir="ltr"><span class="vfx-rec">STBY</span><button class="vfx-fps" aria-label="${esc(T('vf_fps'))}"></button><span class="vfx-dfmt"></span><span class="vfx-tc"></span></div>
    <div class="vfx-wide" hidden></div>
    <div class="vfx-side">
      <button class="vfx-recbtn" aria-label="${esc(T('vf_rec'))}" hidden><i></i></button>
      <button class="vfx-grab" aria-label="${esc(T('vf_grab'))}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.6"/></svg></button>
      <button class="vfx-thumb" aria-label="${esc(T('vf_share'))}" hidden><img alt=""><i aria-hidden="true" hidden>▶</i></button>
    </div>
    <div class="vfx-msg" role="status" hidden></div>
    <div class="vfx-keep" role="dialog" aria-label="${esc(T('vf_share'))}" hidden>
      <div class="vfx-keep-media"></div>
      <div class="vfx-keep-acts"><button class="vfx-save">${esc(T('vf_save'))}</button><button class="vfx-send">${esc(T('vf_send'))}</button></div>
      <button class="vfx-keep-x" aria-label="${esc(T('vf_stop'))}">✕</button>
    </div>
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
      <button class="vfx-at"><span class="vfx-attxt"></span><i class="vfx-atx" aria-hidden="true"></i></button>
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
  // The monitor's data: frame rate (tap to change, kept), recording format, time-of-day timecode.
  const FPS = [23.98, 24, 25, 29.97, 30, 48, 50, 60];
  let fps = FPS.includes(o.fps) ? o.fps : 25;
  const pad = (n) => String(n).padStart(2, '0');
  const tcNow = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}:${pad(Math.floor((d.getMilliseconds() / 1000) * Math.round(fps)))}`; };
  const fmtLabel = () => (modes.length ? modes[mi].label : (cam.mode || ''));
  const degOf = (mm) => Math.round((2 * Math.atan(area.w / (2 * mm)) * 180) / Math.PI);
  const CMP_COL = ['#ffffff', '#3fd4e6', '#ff5fa2'];
  // The distance data (frame size at the distance, and on each comparison frame) can be put away; kept on this phone.
  let info = true;
  try { info = localStorage.getItem('camlist.vfinfo') !== '0'; } catch { /* private window */ }
  const sizeOf = (mm) => {
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return null;
    const tanPerVideoPx = TAN_HALF_LONG / (Math.max(vw, vh) / 2);
    const scale = Math.max(el.clientWidth / vw, el.clientHeight / vh);
    return { w: ((area.w / (2 * mm)) / tanPerVideoPx) * 2 * scale, h: ((area.h / (2 * mm)) / tanPerVideoPx) * 2 * scale };
  };
  const inside = (w) => `${Math.max(-1, (w - el.clientWidth) / 2 + 6)}px`;
  const draw = () => {
    const mm = stops[idx].mm;
    const vw = video.videoWidth, vh = video.videoHeight;
    const SW = el.clientWidth, SH = el.clientHeight;
    el.querySelector('.vfx-big').innerHTML = `${mm}<small>mm</small>`;
    el.querySelector('.vfx-deg').textContent = `${degOf(mm)}°`;
    el.querySelector('.vfx-fps').textContent = fps.toFixed(2);
    el.querySelector('.vfx-dfmt').textContent = fmtLabel();
    el.querySelector('.vfx-mm').textContent = `${mm}mm`;
    const atEl = el.querySelector('.vfx-at');
    atEl.classList.toggle('off', !info);
    atEl.hidden = !o.frameLine;
    atEl.querySelector('.vfx-attxt').textContent = info ? (o.frameLine ? o.frameLine(mm, area) : '') : `⟷ ${o.distance || ''}`;
    atEl.querySelector('.vfx-attxt').dir = info ? 'auto' : 'ltr';
    atEl.querySelector('.vfx-atx').textContent = info ? '✕' : '';
    atEl.setAttribute('aria-label', T(info ? 'vf_info_hide' : 'vf_info_show'));
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
      if (c) { e.style.width = `${rot ? c.h : c.w}px`; e.style.height = `${rot ? c.w : c.h}px`; e.querySelector('span').style.left = inside(rot ? c.h : c.w); e.querySelector('span').textContent = info && o.frameSize ? `${stops[i].mm}mm · ${o.frameSize(stops[i].mm, area)}` : `${stops[i].mm}mm`; }
    });
    const z = sizeOf(mm);
    if (!z) return;
    const fw = z.w, fh = z.h;
    frame.style.width = `${rot ? fh : fw}px`;
    el.querySelector('.vfx-mm').style.left = inside(rot ? fh : fw);
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
  let hold = 0, held = false, hx = 0, hy = 0, holdEl = null;
  ruler.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.vfx-stop');
    if (!b) return;
    held = false;
    hx = e.clientX; hy = e.clientY;
    clearTimeout(hold);
    const i0 = Number(b.dataset.i);
    holdEl = b;
    b.style.setProperty('--hold', cmp.includes(i0) ? 'rgba(255,255,255,.35)' : CMP_COL[Math.min(cmp.length, MAX_CMP - 1)]);
    b.classList.add('holding');
    hold = setTimeout(() => {
      held = true;
      b.classList.remove('holding');
      const i = Number(b.dataset.i);
      // hold again to let a lens go; a fourth replaces the oldest
      cmp = cmp.includes(i) ? cmp.filter(x => x !== i) : [...cmp, i].slice(-MAX_CMP);
      feel.pin();
      draw();
    }, 450);
  });
  const cancelHold = () => { clearTimeout(hold); holdEl?.classList.remove('holding'); };
  ruler.addEventListener('pointerup', cancelHold);
  ruler.addEventListener('pointercancel', cancelHold);
  // only the finger moving lets the hold go — the dial still gliding from a tap does not
  ruler.addEventListener('pointermove', (e) => { if (Math.hypot(e.clientX - hx, e.clientY - hy) > 10) cancelHold(); });
  // when the ring stops on a lens: a firmer click (a short quiet after the last scroll means it has settled)
  let settleT = 0, settledAt = idx;
  ruler.addEventListener('scroll', () => { clearTimeout(settleT); settleT = setTimeout(() => { if (settledAt !== idx) { settledAt = idx; feel.settle(); } }, 160); }, { passive: true });
  ruler.addEventListener('contextmenu', (e) => e.preventDefault());
  vs.onclick = () => { cmp = []; draw(); };
  el.querySelector('.vfx-at').addEventListener('click', () => { info = !info; try { localStorage.setItem('camlist.vfinfo', info ? '1' : '0'); } catch { /* ignore */ } feel.detent(); draw(); });
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

  // ---- Capture: exactly the cine frame, cut from the phone's picture, with the data burned in ----
  // Draws the frame into a canvas `long` pixels on its long side; false until the camera has a picture.
  const comp = (cv, long, live) => {
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return false;
    const mm = stops[idx].mm;
    const rot = el.classList.contains('vfx-rot');
    const per = TAN_HALF_LONG / (Math.max(vw, vh) / 2);
    const fw = ((area.w / (2 * mm)) / per) * 2, fh = ((area.h / (2 * mm)) / per) * 2;
    const ar = area.w / area.h;
    const OW = ar >= 1 ? long : Math.round(long * ar), OH = ar >= 1 ? Math.round(long / ar) : long;
    if (cv.width !== OW) cv.width = OW;
    if (cv.height !== OH) cv.height = OH;
    const g = cv.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, OW, OH);
    // In video pixels. Sideways on iPhone the picture is not turned, so the cine width runs down the video
    // and the cut is turned upright (the phone is held with its top to the left).
    const sw = rot ? fh : fw, sh = rot ? fw : fh;
    const sx = (vw - sw) / 2, sy = (vh - sh) / 2;
    // only what the phone actually sees; past its edges the frame stays black
    const x0 = Math.max(0, sx), y0 = Math.max(0, sy), x1 = Math.min(vw, sx + sw), y1 = Math.min(vh, sy + sh);
    const DW = rot ? OH : OW, DH = rot ? OW : OH;
    g.save();
    if (rot) { g.translate(0, OH); g.rotate(-Math.PI / 2); }
    g.drawImage(video, x0, y0, x1 - x0, y1 - y0, ((x0 - sx) / sw) * DW, ((y0 - sy) / sh) * DH, ((x1 - x0) / sw) * DW, ((y1 - y0) / sh) * DH);
    g.restore();
    const u = OH / 100;
    const mono = (px, w = 600) => `${w} ${Math.round(px)}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
    // the lenses held for comparison, as on screen (only those longer than this one fit inside)
    g.lineWidth = Math.max(2, u * 0.32);
    cmp.forEach((i, k) => {
      const r = mm / stops[i].mm;
      if (r >= 1) return;
      const w = OW * r, h = OH * r, x = (OW - w) / 2, y = (OH - h) / 2;
      g.setLineDash([u * 1.6, u * 1.1]); g.strokeStyle = CMP_COL[k]; g.strokeRect(x, y, w, h); g.setLineDash([]);
      const t = `${stops[i].mm}mm`;
      g.font = mono(u * 2.6, 700);
      const tw = g.measureText(t).width + u * 1.6;
      g.fillStyle = CMP_COL[k]; g.fillRect(x + w - tw, y + h - u * 3.6, tw, u * 3.6);
      g.fillStyle = '#111'; g.textBaseline = 'middle'; g.fillText(t, x + w - tw + u * 0.8, y + h - u * 1.8);
    });
    // the monitor's data bars, top and bottom
    const bh = Math.round(u * 6);
    const BAR = { arri: 'rgba(24,24,24,.86)', red: 'rgba(0,0,0,.92)', canon: 'rgba(11,30,51,.75)', sony: '' }[LOOK];
    if (BAR) { g.fillStyle = BAR; g.fillRect(0, 0, OW, bh); g.fillRect(0, OH - bh, OW, bh); }
    g.font = mono(bh * 0.5); g.textBaseline = 'middle'; g.textAlign = 'left';
    // Sony's text sits on the picture: an outline keeps it readable
    g.lineWidth = Math.max(2, bh * 0.08); g.strokeStyle = 'rgba(0,0,0,.75)';
    const row = (y, parts) => { let x = bh * 0.45; for (const [t, c] of parts) { if (!t) continue; if (!BAR) g.strokeText(t, x, y); g.fillStyle = c || '#f2f2f2'; g.fillText(t, x, y); x += g.measureText(t).width + bh * 0.8; } };
    const recTxt = live && rec ? `● REC ${recClock()}` : '';
    row(bh / 2, [[recTxt, '#ff4d4d'], [fps.toFixed(2)], [fmtLabel()], [`TC ${tcNow()}`]]);
    row(OH - bh / 2, [[cam.name], [`${mm}mm`], [`${degOf(mm)}°`], [o.distance && o.frameSize ? `@${o.distance} ${o.frameSize(mm, area)}` : '']]);
    g.textAlign = 'right'; g.fillStyle = '#F2A33A'; g.fillText('CamList', OW - bh * 0.45, OH - bh / 2); g.textAlign = 'left';
    return true;
  };
  const posterOf = (cv) => { const p = document.createElement('canvas'); const k = 160 / Math.max(cv.width, cv.height); p.width = Math.round(cv.width * k); p.height = Math.round(cv.height * k); p.getContext('2d').drawImage(cv, 0, 0, p.width, p.height); return p.toDataURL('image/jpeg', 0.7); };
  const stamp = () => { const d = new Date(); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`; };
  const fileBase = () => `CamList_${cam.name.replace(/[^A-Za-z0-9.-]+/g, '-')}_${stops[idx].mm}mm_${stamp()}`;
  const thumb = el.querySelector('.vfx-thumb');
  const msg = el.querySelector('.vfx-msg');
  let msgT = 0;
  const say = (k) => { msg.textContent = T(k); msg.hidden = false; clearTimeout(msgT); msgT = setTimeout(() => { msg.hidden = true; }, 3800); };
  let last = null;
  const keep = (blob, ext, poster, base) => {
    if (last?.url) URL.revokeObjectURL(last.url);
    const file = new File([blob], `${base}.${ext}`, { type: blob.type });
    last = { file, url: URL.createObjectURL(blob) };
    thumb.querySelector('img').src = poster;
    thumb.querySelector('i').hidden = ext === 'jpg';
    thumb.hidden = false;
    say(ext === 'jpg' ? 'vf_grabbed' : 'vf_recorded');
  };
  // Send or keep: the phone's share sheet (WhatsApp to the director, Save to Photos); a download where there is none.
  // The thumbnail opens what was taken, larger, with its two ways out: keep it on the phone, or send it.
  // A web page cannot write into the photo gallery itself. iPhone: the share sheet's "Save Image / Save Video"
  // puts it in Photos. Android: it is downloaded, and the gallery shows it under "Download".
  const keepEl = el.querySelector('.vfx-keep');
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const canShareFile = (file) => { try { return !!navigator.canShare?.({ files: [file] }); } catch { return false; } };
  const shareFile = async (file) => { try { await navigator.share({ files: [file], title: file.name }); } catch { /* closed */ } };
  const downloadFile = ({ file, url }) => { const a = document.createElement('a'); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); };
  thumb.addEventListener('click', () => {
    if (!last) return;
    const media = keepEl.querySelector('.vfx-keep-media');
    media.innerHTML = last.file.type.startsWith('video/') ? `<video src="${last.url}" muted playsinline autoplay loop></video>` : `<img src="${last.url}" alt="">`;
    keepEl.querySelector('.vfx-send').hidden = !canShareFile(last.file);
    keepEl.hidden = false;
  });
  const closeKeep = () => { keepEl.hidden = true; keepEl.querySelector('.vfx-keep-media').innerHTML = ''; };
  keepEl.querySelector('.vfx-keep-x').addEventListener('click', closeKeep);
  keepEl.querySelector('.vfx-save').addEventListener('click', async () => {
    if (!last) return;
    if (ios && canShareFile(last.file)) { await shareFile(last.file); return; }
    downloadFile(last); say(ios ? 'vf_saved_files' : 'vf_saved_dl');
  });
  keepEl.querySelector('.vfx-send').addEventListener('click', () => { if (last) shareFile(last.file); });
  const shot = document.createElement('canvas');
  el.querySelector('.vfx-grab').addEventListener('click', () => {
    if (!comp(shot, 1920, false)) return;
    feel.shutter();
    el.classList.remove('vfx-flash'); void el.offsetWidth; el.classList.add('vfx-flash');
    const poster = posterOf(shot), base = fileBase();
    shot.toBlob((b) => { if (b) keep(b, 'jpg', poster, base); }, 'image/jpeg', 0.92);
  });
  // A clip: the same cut drawn every frame into a canvas the recorder films. No sound (no microphone asked).
  const recCv = document.createElement('canvas');
  const recBtn = el.querySelector('.vfx-recbtn');
  const canRec = typeof MediaRecorder !== 'undefined' && typeof recCv.captureStream === 'function';
  const MIME = canRec ? ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported?.(m)) : '';
  recBtn.hidden = !canRec;
  let rec = null, recStart = 0;
  const recSecs = () => Math.floor((performance.now() - recStart) / 1000);
  const recClock = () => { const t = recSecs(); return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`; };
  const recLabel = () => {
    const on = !!rec;
    recBtn.classList.toggle('on', on);
    recBtn.setAttribute('aria-label', T(on ? 'vf_rec_stop' : 'vf_rec'));
    const r = el.querySelector('.vfx-rec');
    r.classList.toggle('on', on);
    r.textContent = on ? `● REC ${recClock()}` : 'STBY';
  };
  const startRec = () => {
    if (!comp(recCv, 1280, true)) return;
    const st = recCv.captureStream(30);
    let r;
    try { r = new MediaRecorder(st, MIME ? { mimeType: MIME, videoBitsPerSecond: 6000000 } : undefined); } catch { st.getTracks().forEach(t => t.stop()); return; }
    const chunks = [];
    const poster = posterOf(recCv), base = fileBase();
    r.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    r.onstop = () => {
      st.getTracks().forEach(t => t.stop());
      const type = (r.mimeType || MIME || 'video/webm').split(';')[0];
      if (chunks.length && open) keep(new Blob(chunks, { type }), type.includes('mp4') ? 'mp4' : 'webm', poster, base);
    };
    r.start(1000);
    rec = r; recStart = performance.now();
    feel.rec(true); recLabel();
  };
  const stopRec = () => { if (!rec) return; const r = rec; rec = null; if (r.state !== 'inactive') r.stop(); feel.rec(false); recLabel(); };
  recBtn.addEventListener('click', () => (rec ? stopRec() : startRec()));
  el.querySelector('.vfx-fps').addEventListener('click', () => {
    if (rec) return;
    fps = FPS[(FPS.indexOf(fps) + 1) % FPS.length];
    o.onFps?.(fps); feel.detent(); draw();
  });
  // one loop while open: the timecode runs, and while recording the frame is drawn for the recorder
  const tcEl = el.querySelector('.vfx-tc');
  let loopId = 0;
  const loop = () => {
    tcEl.textContent = `TC ${tcNow()}`;
    if (rec) {
      comp(recCv, 1280, true);
      el.querySelector('.vfx-rec').textContent = `● REC ${recClock()}`;
      if (recSecs() >= 180) stopRec();   // three minutes: a reference clip, not a take
    }
    loopId = requestAnimationFrame(loop);
  };
  loopId = requestAnimationFrame(loop);

  const onResize = () => { draw(); centreOn(idx, false); curve(); };
  video.addEventListener('loadedmetadata', onResize);
  window.addEventListener('resize', onResize);

  const close = () => {
    if (!open) return;
    cancelAnimationFrame(loopId);
    stopRec();
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
    stopRec();
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
    stopRec();
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
