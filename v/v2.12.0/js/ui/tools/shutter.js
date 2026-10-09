// Frame rate and shutter: speed or angle, safe values under the local mains, slow motion.
import { esc } from '../dom.js';
import { timeFromAngle, angleFromTime, asFraction, flicker, slowMotion, FRAME_RATES, shutterChoices } from '../../tools/shutter.js';
import { S, more, field, numIn } from './shared.js';

function shutterTool(T) {
  const s = S.shutter;
  const Tp = (k, p) => T(k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
  const { options, recommended, anySafe } = shutterChoices(s.fps, s.mains, s.mode);
  const seconds = s.mode === 'angle' ? timeFromAngle(s.fps, s.angle) : 1 / s.speed;
  const angle = Math.round(angleFromTime(s.fps, seconds) * 10) / 10;
  const f = flicker(seconds, s.mains);
  const slow = slowMotion(s.fps, s.projectFps);
  const fmt = (n) => String(n);
  const isOn = (o) => (s.mode === 'angle' ? Math.abs(o.value - s.angle) < 0.06 : o.value === s.speed);

  // The answer in words: what you are shooting, whether the lights will flicker, what it plays back as.
  const flickerLine = f.safe ? Tp('sh_safe', { hz: s.mains })
    : anySafe ? Tp('sh_unsafe', { hz: s.mains, rec: recommended.label })
      : Tp('sh_none', { hz: s.mains });
  const slowLine = Math.abs(slow.factor - 1) < 0.01 ? T('sh_realtime')
    : slow.factor > 1 ? Tp('sh_slow', { n: Math.round(slow.factor * 100) / 100 })
      : Tp('sh_fast', { n: Math.round((1 / slow.factor) * 100) / 100 });

  const a = Math.max(1, Math.min(angle, 360));
  const r = 42, cxy = 50;
  const [ex, ey] = [cxy + r * Math.sin((a * Math.PI) / 180), cxy - r * Math.cos((a * Math.PI) / 180)];
  const dial = `<svg viewBox="0 0 100 100" class="dial-svg" role="img" aria-label="${a}°">
    <circle cx="${cxy}" cy="${cxy}" r="${r}" class="d-ring"/>
    <path d="M${cxy} ${cxy} L${cxy} ${cxy - r} A${r} ${r} 0 ${a > 180 ? 1 : 0} 1 ${ex.toFixed(2)} ${ey.toFixed(2)} Z" class="d-open"/>
    <circle cx="${cxy}" cy="${cxy}" r="3" class="d-hub"/>
  </svg>`;

  const chip = (attr, val, label, on, extra = '') => `<button class="chip pick ${on ? 'on' : ''}" ${attr}="${val}">${label}${extra}</button>`;

  return `
    <div class="card sh-answer ${f.safe ? 'ok' : 'warn'}">
      <div class="sh-top">${dial}
        <div class="sh-main">
          <b class="sh-big">${s.mode === 'angle' ? `${fmt(s.angle)}°` : asFraction(seconds)}</b>
          <span class="sh-small">${s.mode === 'angle' ? asFraction(seconds) : `${angle}°`} · ${fmt(s.fps)} fps</span>
        </div>
      </div>
      <p class="sh-line ${f.safe ? 'ok' : 'warn'}">${f.safe ? '✓' : '⚠'} ${esc(flickerLine)}</p>
      <p class="sh-line">${esc(T('slowmo'))}: ${esc(slowLine)}</p>
    </div>

    <div class="card sh-sec">
      <div class="tsub">${esc(T('fps'))}</div>
      <div class="chips">${FRAME_RATES.map(x => chip('data-fps', x, fmt(x), !s.customFps && x === s.fps)).join('')}${chip('data-fps-custom', 1, esc(T('other_val')), s.customFps || !FRAME_RATES.includes(s.fps))}</div>
      ${s.customFps || !FRAME_RATES.includes(s.fps) ? `<div class="sh-custom">${field(T('fps'), numIn('fps', s.fps, { min: 1, max: 1000, step: 'any' }))}</div>` : ''}
    </div>

    ${more('shutter', T('sh_more'), `${T('mains_' + s.mains)} · ${fmt(s.projectFps)} fps`, `<div class="card sh-sec">
      <div class="sh-head"><div class="tsub">${esc(T('shutter_lbl'))}</div>
        <div class="seg sh-mode"><button class="${s.mode === 'speed' ? 'active' : ''}" data-shmode="speed">${esc(T('speed_short'))}</button><button class="${s.mode === 'angle' ? 'active' : ''}" data-shmode="angle">${esc(T('angle_short'))}</button></div></div>
      <div class="chips">${options.map(o => chip('data-shv', o.value, esc(o.label), isOn(o),
        `${o.safe ? '<i class="sh-ok">✓</i>' : ''}${recommended && o.value === recommended.value ? `<i class="sh-rec">${esc(T('recommended'))}</i>` : ''}`)).join('')}</div>
      <p class="tnote">${esc(T('sh_hint'))}</p>
    </div>

    <div class="card sh-sec">
      <div class="tsub">${esc(T('mains'))}</div>
      <div class="chips">${chip('data-mains', 50, esc(T('mains_50')), s.mains === 50)}${chip('data-mains', 60, esc(T('mains_60')), s.mains === 60)}</div>
      <div class="tsub" style="margin-top:14px">${esc(T('project_fps'))}</div>
      <div class="chips">${[23.98, 24, 25, 29.97, 30].map(x => chip('data-proj', x, fmt(x), x === s.projectFps)).join('')}</div>
    </div>`)}`;
}

export { shutterTool as view };

export function bind(root, ctx, { T, lang, rewire }) {
  const redraw = () => ctx.render();
  // Frame rate and shutter. A new frame rate or mains frequency moves the shutter to the recommended
  // value, so nobody is left on a combination that no longer makes sense.
  const sh = S.shutter;
  const recommend = () => {
    sh.speed = shutterChoices(sh.fps, sh.mains, 'speed').recommended?.value ?? sh.speed;
    sh.angle = shutterChoices(sh.fps, sh.mains, 'angle').recommended?.value ?? sh.angle;
  };
  root.querySelectorAll('[data-fps]').forEach(b => { b.onclick = () => { sh.fps = Number(b.dataset.fps); sh.customFps = false; recommend(); redraw(); }; });
  root.querySelector('[data-fps-custom]')?.addEventListener('click', () => { sh.customFps = true; redraw(); });
  root.querySelectorAll('[data-mains]').forEach(b => { b.onclick = () => { sh.mains = Number(b.dataset.mains); recommend(); redraw(); }; });
  root.querySelectorAll('[data-proj]').forEach(b => { b.onclick = () => { sh.projectFps = Number(b.dataset.proj); redraw(); }; });
  root.querySelectorAll('[data-shv]').forEach(b => { b.onclick = () => { sh[sh.mode === 'angle' ? 'angle' : 'speed'] = Number(b.dataset.shv); redraw(); }; });
  root.querySelectorAll('[data-shmode]').forEach(b => { b.onclick = () => {
    const to = b.dataset.shmode;
    if (to === sh.mode) return;
    const secs = sh.mode === 'angle' ? timeFromAngle(sh.fps, sh.angle) : 1 / sh.speed;
    if (to === 'angle') sh.angle = Math.round(angleFromTime(sh.fps, secs) * 10) / 10;
    else sh.speed = Math.round(1 / secs);
    sh.mode = to; redraw();
  }; });
}
