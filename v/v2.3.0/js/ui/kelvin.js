// Kelvin meter: the phone camera, white balance locked, pointed at a white or grey card in the light.
// Android Chrome exposes white-balance control on many phones; where it does not, the tool says so
// instead of guessing — an auto-balanced camera always sees the card as neutral.
import { esc, toast } from './dom.js';
import { rgbToCct, lockedToLight, kelvinLabel } from '../tools/kelvin.js';

const LOCK = 5500;
const st = { stream: null, supported: null, lock: LOCK, k: null, level: 'ok', timer: null };

export function stopKelvin() {
  clearInterval(st.timer); st.timer = null;
  st.stream?.getTracks().forEach(t => t.stop());
  st.stream = null; st.k = null;
}

async function start(ctx, T) {
  try {
    st.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
  } catch {
    toast(T('k_denied'), { kind: 'err', ms: 4000 });
    return;
  }
  const track = st.stream.getVideoTracks()[0];
  const caps = track.getCapabilities?.() || {};
  const range = caps.colorTemperature;
  st.supported = !!(caps.whiteBalanceMode?.includes('manual') && range);
  if (st.supported) {
    st.lock = Math.min(Math.max(LOCK, range.min || LOCK), range.max || LOCK);
    try { await track.applyConstraints({ advanced: [{ whiteBalanceMode: 'manual', colorTemperature: st.lock }] }); }
    catch { st.supported = false; }
  }
  ctx.render();
}

// The centre of the frame, averaged. Clipped or very dark samples say so rather than give a number.
function sample(root, T) {
  const video = root.querySelector('[data-k-video]');
  if (!video || video.readyState < 2 || !st.supported) return;
  const c = sample.canvas || (sample.canvas = document.createElement('canvas'));
  const n = 48; c.width = n; c.height = n;
  const vw = video.videoWidth, vh = video.videoHeight, side = Math.min(vw, vh) * 0.2;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, n, n);
  const px = g.getImageData(0, 0, n, n).data;
  let r = 0, gr = 0, b = 0, max = 0;
  for (let i = 0; i < px.length; i += 4) { r += px[i]; gr += px[i + 1]; b += px[i + 2]; max = Math.max(max, px[i], px[i + 1], px[i + 2]); }
  const count = px.length / 4; r /= count; gr /= count; b /= count;
  const note = root.querySelector('[data-k-note]'), big = root.querySelector('[data-k-value]'), name = root.querySelector('[data-k-name]');
  if (max >= 254) { note.textContent = T('k_bright'); return; }
  if ((r + gr + b) / 3 < 25) { note.textContent = T('k_dark'); return; }
  const k = lockedToLight(rgbToCct(r, gr, b), st.lock);
  if (!(k > 1000 && k < 20000)) return;
  st.k = st.k ? st.k * 0.7 + k * 0.3 : k;           // steady the number while the hand moves
  big.textContent = String(Math.round(st.k / 50) * 50);
  name.textContent = T(kelvinLabel(st.k));
  note.textContent = T('k_hold');
}

export function kelvinTool(T) {
  const on = !!st.stream;
  const answer = !on
    ? `<div class="card sh-answer warn"><p class="sh-line">${esc(T('k_intro'))}</p></div>`
    : st.supported
      ? `<div class="card sh-answer ok">
          <div class="fov-top"><b class="sh-big" data-k-value>—</b><span class="sh-small">K</span></div>
          <p class="sh-line"><b data-k-name></b></p>
          <p class="tnote" data-k-note>${esc(T('k_aim'))}</p>
        </div>`
      : `<div class="card sh-answer warn"><p class="sh-line">${esc(T('k_unsupported'))}</p></div>`;
  return `${answer}
    <div class="card k-view">
      ${on ? `<div class="k-frame"><video data-k-video autoplay playsinline muted></video><i class="k-reticle"></i></div>
        <button class="btn" data-k-stop>${esc(T('k_stop'))}</button>`
      : `<button class="btn primary" data-k-start>${esc(T('k_start'))}</button>`}
      <details class="src-more">
        <summary><span class="src-badge est">${esc(T('k_badge'))}</span> ${esc(T('k_caveat'))} <span class="src-i">ⓘ</span></summary>
        <p>${esc(T('k_how'))}</p>
      </details>
    </div>`;
}

export function wireKelvin(root, ctx, T) {
  root.querySelector('[data-k-start]')?.addEventListener('click', () => start(ctx, T));
  root.querySelector('[data-k-stop]')?.addEventListener('click', () => { stopKelvin(); ctx.render(); });
  const video = root.querySelector('[data-k-video]');
  if (video && st.stream) {
    video.srcObject = st.stream;
    clearInterval(st.timer);
    st.timer = setInterval(() => { if (!document.body.contains(video)) { clearInterval(st.timer); return; } sample(root, T); }, 300);
  }
}
