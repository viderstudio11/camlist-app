// Sun: sunrise, sunset and the golden hour for a place and a date.
import { esc, icons } from '../dom.js';
import { sunDay, sunStatus, zoneOf, localTime, todayIn } from '../../tools/solar.js';
import { hm } from '../../format.js';
import { S, D, more, sel } from './shared.js';

const deviceZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; } };
const addDays = (iso, n) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

// The day as the sun's path, coloured by the light it gives: blue below the horizon, gold low in the
// sky, plain daylight in between. A real clock across, the sun's real rise and fall up and down.
function sunArc(day, at, T, now) {
  const gM = day.goldenMorning, gE = day.goldenEvening, bM = day.blueMorning, bE = day.blueEvening;
  if (!day.sunrise || !day.sunset || !gE || !bE) return '';
  const W = 320, H = 136, horizon = 104, top = 18;
  const start = +(bM?.from || day.sunrise) - 15 * 60000, end = +bE.to + 15 * 60000;
  const fx = (t) => (t - start) / (end - start);
  // Height follows the real clock: the sun is up between sunrise and sunset, below the horizon outside.
  const dayLen = +day.sunset - +day.sunrise;
  const fy = (t) => Math.sin(((t - +day.sunrise) / dayLen) * Math.PI);
  const X = (t) => 12 + fx(t) * (W - 24);
  const Y = (t) => horizon - fy(t) * (horizon - top);
  const pts = (a, z, n = 24) => Array.from({ length: n + 1 }, (_, i) => a + ((z - a) * i) / n);
  const line = (a, z) => pts(a, z).map((t, i) => `${i ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(t).toFixed(1)}`).join(' ');
  const seg = (a, z, cls) => `<path d="${line(+a, +z)}" class="a-seg ${cls}"/>`;

  // Where the sun is drawn: now on today's page, else at sunset — the answer.
  const t = now ? Math.min(Math.max(+now, start), end) : +day.sunset;
  const sunUp = t >= +day.sunrise && t <= +day.sunset;
  const path = line(start, t, 48);
  const label = (tt, text, dy, anchor = 'middle', cls = '') =>
    `<text x="${X(tt).toFixed(1)}" y="${(Y(tt) + dy).toFixed(1)}" text-anchor="${anchor}" class="a-lab ${cls}">${text}</text>`;
  const dot = (tt) => `<circle cx="${X(tt).toFixed(1)}" cy="${Y(tt).toFixed(1)}" r="3" class="a-dot"/>`;

  return `<svg viewBox="0 0 ${W} ${H}" class="sun-arc" role="img">
    <defs>
      <linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sky-top"/><stop offset="1" class="sky-low"/></linearGradient>
      <radialGradient id="sung"><stop offset="0" class="sun-core"/><stop offset="1" class="sun-halo"/></radialGradient>
    </defs>
    <rect x="0" y="0" width="${W}" height="${horizon}" rx="12" class="a-sky"/>
    <rect x="0" y="${horizon}" width="${W}" height="${H - horizon}" class="a-ground"/>
    <line x1="0" y1="${horizon}" x2="${W}" y2="${horizon}" class="a-horizon"/>
    ${bM ? seg(start, bM.to, 'blue') : ''}${gM ? seg(gM.from, gM.to, 'gold') : ''}
    ${seg(gM?.to || day.sunrise, gE.from, 'day')}${seg(gE.from, gE.to, 'gold')}${seg(bE.from, end, 'blue')}
    ${dot(day.sunrise)}${dot(day.sunset)}
    ${label(day.sunrise, `↑ ${at(day.sunrise)}`, 22, 'start')}
    ${label(day.sunset, `${at(day.sunset)} ↓`, 22, 'end', 'strong')}
    <g class="a-sun ${sunUp ? '' : 'down'}">
      <circle r="15" fill="url(#sung)"/><circle r="7" class="a-sun-core"/>
      <animateMotion dur="1.4s" fill="freeze" calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines=".25 .1 .25 1" path="${path}"/>
    </g>
  </svg>`;
}

function sunTool(T, lang) {
  const s = S.sun;
  const Tp = (k, p) => T(k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
  const chip = (attr, val, label, on) => `<button class="chip pick ${on ? 'on' : ''}" ${attr}="${esc(val)}">${label}</button>`;
  const name = (x) => (lang === 'he' ? x.he : x.en);

  const countries = D.places.countries || [];
  const country = countries.find(c => c.code === s.country) || countries[0];
  const cityList = country?.cities || [];
  const city = cityList[Math.min(s.city, cityList.length - 1)] || null;
  const here = s.lat != null && s.lon != null;
  const lat = here ? s.lat : city?.lat ?? 32.0853;
  const lon = here ? s.lon : city?.lon ?? 34.7818;
  // The times belong to the place: its own clock, or the phone's when "my location" is on.
  const tz = here ? deviceZone() : zoneOf(country, city);
  const at = (d) => localTime(d, tz);
  const placeName = here ? T('my_location') : city ? name(city) : '';

  // Today and tomorrow are the place's today and tomorrow, not the phone's.
  const today = todayIn(tz);
  if (s.dateMode === 'today') s.date = today;
  if (s.dateMode === 'tomorrow') s.date = addDays(today, 1);
  const [y, m, d] = s.date.split('-').map(Number);
  const day = sunDay(new Date(Date.UTC(y, m - 1, d)), lat, lon);
  const span = (w) => (w ? `${at(w.from)} – ${at(w.to)}` : '—');
  const dayWord = s.dateMode === 'today' ? T('today') : s.dateMode === 'tomorrow' ? T('tomorrow')
    : new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

  // Today's page says what the light is doing right now.
  const status = s.dateMode === 'today' && !day.polar ? sunStatus(day) : null;
  const answer = day.polar
    ? `<div class="card sh-answer warn"><p class="sh-line">${esc(T('polar'))}</p></div>`
    : `<div class="card sh-answer ok">
    <div class="fov-top"><b class="sh-big">${at(day.sunset)}</b><span class="sh-small">${esc(Tp('sun_at', { place: placeName, day: dayWord }))}</span></div>
    <p class="sh-line"><span class="k-gold-t">${esc(T('golden'))}</span> ${span(day.goldenEvening)} · <span class="k-blue-t">${esc(T('blue'))}</span> ${span(day.blueEvening)}</p>
    ${status ? `<p class="sun-status ${status.key}">${esc(Tp(status.key, { t: hm(status.ms / 3600000) }))}</p>` : ''}
    ${sunArc(day, at, T, s.dateMode === 'today' ? new Date() : null)}
    <p class="tnote">${esc(T('sun_acc'))}</p>
    <p class="tnote">${esc(Tp('sun_morning', { rise: at(day.sunrise), gold: span(day.goldenMorning), blue: span(day.blueMorning), len: hm(day.dayLengthHours) }))}</p>
    ${tz && tz !== deviceZone() ? `<p class="tnote">${esc(Tp('tz_note', { place: placeName, tz }))}</p>` : ''}
    <details class="src-more">
      <summary><span class="src-badge ok">NOAA</span> ${esc(T('sun_calc'))} <span class="src-i">ⓘ</span></summary>
      <p>${esc(T('sun_src'))}</p>
    </details>
  </div>`;

  const dateOther = s.dateMode === 'pick';
  return `${answer}${more('sun', T('sun_place_date'), `${placeName} · ${dayWord}`, `<div class="card sh-sec">
      <div class="tsub">${esc(T('place'))}</div>
      <div class="sun-country">${sel('country', countries.map(c => ({ v: c.code, l: name(c) })), s.country)}</div>
      <div class="chips fov-models">${cityList.map((c, i) => chip('data-scity', i, esc(name(c)), !here && i === s.city)).join('')}${chip('data-geo', 1, `${icons.pin || '◎'} ${esc(T('my_location'))}`, here)}</div>
    </div>
    <div class="card sh-sec">
      <div class="tsub" style="margin-top:12px">${esc(T('date'))}</div>
      <div class="chips">${chip('data-sdate', 'today', esc(T('today')), s.dateMode === 'today')}${chip('data-sdate', 'tomorrow', esc(T('tomorrow')), s.dateMode === 'tomorrow')}${chip('data-sdate', 'pick', esc(T('other_date')), dateOther)}</div>
      ${dateOther ? `<div class="sh-custom"><input type="date" data-f="date" value="${esc(s.date)}"></div>` : ''}
    </div>`)}`;
}

export { sunTool as view };

export function bind(root, ctx, { T, lang, rewire }) {
  const redraw = () => ctx.render();
  root.querySelectorAll('[data-scity]').forEach(b => { b.onclick = () => { Object.assign(S.sun, { city: Number(b.dataset.scity), lat: null, lon: null }); redraw(); }; });
  root.querySelectorAll('[data-sdate]').forEach(b => { b.onclick = () => { S.sun.dateMode = b.dataset.sdate; redraw(); }; });
  root.querySelector('[data-geo]')?.addEventListener('click', () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { S.sun.lat = pos.coords.latitude; S.sun.lon = pos.coords.longitude; redraw(); },
      () => {},
      { timeout: 8000 },
    );
  });
}
