// Media: how much the day records and how many cards it takes, from the camera and its format.
import { esc } from '../dom.js';
import { READERS } from '../../tools/convert.js';
import { num, hm } from '../../format.js';
import { S, D, more, field, numIn } from './shared.js';

const HOUR_CHIPS = [2, 4, 6, 8, 10, 12, 14];
const fpsVal = (v) => (/i$/.test(v) ? v : Number(v));

function mediaTool(T) {
  const s = S.media;
  const Tp = (k, p) => T(k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
  const chip = (attr, val, label, on, extra = '') => `<button class="chip pick ${on ? 'on' : ''}" ${attr}="${esc(val)}">${label}${extra}</button>`;
  const gb = (x) => (x >= 1000 ? `${num(x / 1000, x % 1000 ? 2 : 0)} TB` : `${num(x, 0)} GB`);

  // Maker first, then the body, then what that body records: three short lists, never a long one.
  const cams = D.media.cameras.filter(c => c.brand && c.brand !== '—' && c.formats?.length);
  const brands = [...new Set(cams.map(c => c.brand))];
  const cam = cams.find(c => c.id === s.cam) || null;
  if (cam && !s.brand) s.brand = cam.brand;
  const models = cams.filter(c => c.brand === s.brand);
  const fmts = cam ? D.media.formatsOf(cam) : [];
  const fmt = fmts.find(f => f.key === s.fmt) || fmts[0] || null;
  if (fmt) {
    s.fmt = fmt.key;
    if (!fmt.fps.includes(s.fps)) s.fps = [...fmt.fps].sort((a, b) => Math.abs(parseFloat(a) - 25) - Math.abs(parseFloat(b) - 25))[0];
  }

  // The cards this camera takes. Until the user picks one, the card the maker's own table used.
  const types = cam ? D.media.mediaOf(cam) : [];
  const kinds = types.length ? types : [{ type: '', sizes: D.media.cards }];
  if (!s.cardPicked || !kinds.some(t => t.type === s.mtype)) {
    const d = D.media.defaultCard(cam, fmt) || { type: kinds[0].type, size: kinds[0].sizes[kinds[0].sizes.length >> 1] };
    s.mtype = d.type; s.card = d.size;
  }
  const kind = kinds.find(t => t.type === s.mtype) || kinds[0];
  const usable = D.media.usableGb(s.mtype, s.card);
  const copies = s.backup && !cam?.oneSlot ? 2 : 1;

  const rate = fmt ? fmt.rate(s.fps) : 0;
  const onCard = D.media.hoursOn(usable, rate);
  const cards = D.media.cardsFor(s.hours, usable, rate, copies);
  const totalGb = D.media.gbPerHour(rate) * s.hours;
  const cardName = `${gb(s.card)}${s.mtype ? ` ${s.mtype}` : ''}`;

  const pick = `<div class="card sh-sec" data-part="cam">
    <div class="tsub">1 · ${esc(T('camera_step'))}</div>
    <div class="chips">${brands.map(b => chip('data-mbrand', b, esc(b), b === s.brand)).join('')}</div>
    ${models.length ? `<div class="chips fov-models">${models.map(c => chip('data-mcam', c.id, esc(c.label), cam && c.id === cam.id)).join('')}</div>` : ''}
  </div>`;
  if (!cam) return `<div class="card sh-answer warn"><p class="sh-line">${esc(T('media_pick_first'))}</p></div>${pick}`;

  // How the rate was reached, in one line; where it comes from, one tap away.
  const rateLine = fmt.capped?.(s.fps) ? Tp('cap_rate', { r: num(rate, 0), mb: num(rate / 8, 0) })
    : fmt.maxOnly ? Tp('max_rate', { r: num(rate, 0) })
      : fmt.fromTimes ? Tp('eff_rate', { r: num(rate, 0) }) : `${num(rate, 0)} Mbps`;
  const sources = [fmt.src, kind.src ? Tp('card_src', { s: kind.src }) : ''].filter(Boolean);

  const shown = Math.min(cards, 24);
  const answer = `<div class="card sh-answer ok">
    <div class="fov-top"><b class="sh-big">${cards || '—'}</b><span class="sh-small">${esc(Tp('cards_of', { card: cardName }))}</span></div>
    <p class="sh-line">${esc(Tp('media_sentence', { h: s.hours, fmt: fmt.label, fps: s.fps, cam: cam.label, total: gb(Math.round(totalGb)), per: hm(onCard) }))}${usable !== s.card ? ` ${esc(Tp('usable_note', { u: gb(usable) }))}` : ''}${copies > 1 ? ` ${esc(T('backup_note'))}` : ''}</p>
    ${cards ? `<div class="cards">${Array.from({ length: shown }, (_, i) => {
      // with a backup, the cards come in identical pairs; the last pair is the part-filled one
      const set = Math.floor(i / copies), sets = cards / copies;
      const part = set === sets - 1 ? (s.hours / onCard) % 1 || 1 : 1;
      return `<span class="cardchip${copies > 1 && i % 2 ? ' twin' : ''}"><i style="height:${(part * 100).toFixed(0)}%"></i><em>${gb(s.card)}</em></span>`;
    }).join('')}${cards > 24 ? `<span class="cardmore">+${cards - 24}</span>` : ''}</div>` : ''}
    <details class="src-more">
      <summary><span class="src-badge ${fmt.official ? 'ok' : 'est'}">${esc(T(fmt.official ? 'src_official' : 'src_estimate'))}</span> ${esc(rateLine)} <span class="src-i" aria-label="${esc(T('src_more'))}">ⓘ</span></summary>
      ${sources.map(x => `<p>${esc(x)}</p>`).join('')}
    </details>
    ${totalGb > 0 ? `<button class="to-offload" data-to-offload="${Math.round(totalGb)}">${esc(Tp('to_offload', { total: gb(Math.round(totalGb)) }))}</button>` : ''}
  </div>`;

  // Frame size first, then the codecs recorded at it: two short rows instead of one long one.
  const groups = D.media.groupFormats(fmts);
  const group = groups.find(g => g.formats.includes(fmt)) || groups[0];
  const hoursOther = !HOUR_CHIPS.includes(s.hours) || s.customHours;
  const cardOther = !kind.sizes.includes(s.card) || s.customCard;

  return `${answer}${pick}${more('media', T('media_more'), `${group.res} ${fmt.codec} · ${s.fps}p · ${gb(s.card)} · ${s.hours}h`, `<div class="card sh-sec">
      <div class="tsub">${esc(T('format_pick'))}</div>
      ${groups.length > 1 ? `<div class="chips">${groups.map(g => chip('data-mres', g.res, esc(g.res), g === group)).join('')}</div>` : `<p class="tnote">${esc(group.res)}</p>`}
      <div class="chips fov-models">${group.formats.map(f => chip('data-mfmt', f.key, esc(f.codec), f.key === fmt.key)).join('')}</div>
    </div>
    <div class="card sh-sec">
      <div class="tsub">${esc(T('fps'))}</div>
      <div class="chips">${fmt.fps.map(x => chip('data-mfps', x, String(x), x === s.fps)).join('')}</div>
    </div>
    <div class="card sh-sec">
      <div class="tsub">${esc(T('card'))}</div>
      ${kinds.length > 1 ? `<div class="chips">${kinds.map(t => chip('data-mtype', t.type, esc(t.type), t.type === s.mtype)).join('')}</div>` : kind.type ? `<p class="tnote">${esc(kind.type)}</p>` : ''}
      <div class="chips fov-models">${kind.sizes.map(x => chip('data-mcard', x, gb(x), !cardOther && x === s.card)).join('')}${chip('data-mcard-custom', 1, esc(T('other_val')), cardOther)}</div>
      ${cardOther ? `<div class="sh-custom">${field('GB', numIn('card', s.card, { min: 1, max: 100000, step: 1 }))}</div>` : ''}
      ${cam.oneSlot ? '' : `<label class="switch"><span>${esc(T('backup_lbl'))}</span><input type="checkbox" data-f="backup" ${s.backup ? 'checked' : ''}></label>`}
    </div>
    <div class="card sh-sec">
      <div class="tsub">${esc(T('shoot_hours'))}</div>
      <div class="chips">${HOUR_CHIPS.map(x => chip('data-mhours', x, String(x), !hoursOther && x === s.hours)).join('')}${chip('data-mhours-custom', 1, esc(T('other_val')), hoursOther)}</div>
      ${hoursOther ? `<div class="sh-custom">${field(T('shoot_hours'), numIn('hours', s.hours, { min: 0.5, max: 48, step: 0.5 }))}</div>` : ''}
    </div>`)}`;
}

export { mediaTool as view };

export function bind(root, ctx, { T, lang, rewire }) {
  // A new camera starts again from the card its maker's table used.
  const newCam = (m) => Object.assign(m, { fmt: '', cardPicked: false, customCard: false });
  root.querySelectorAll('[data-mbrand]').forEach(b => { b.onclick = () => { S.media.brand = b.dataset.mbrand; S.media.cam = ''; newCam(S.media); ctx.render(); }; });
  root.querySelectorAll('[data-mcam]').forEach(b => { b.onclick = () => { S.media.cam = b.dataset.mcam; newCam(S.media); ctx.render(); }; });
  root.querySelectorAll('[data-mres]').forEach(b => { b.onclick = () => {
    // keep the codec when the new frame size has it
    const fmts = D.media.formatsOf(D.media.cameras.find(c => c.id === S.media.cam));
    const cur = fmts.find(f => f.key === S.media.fmt);
    const at = fmts.filter(f => f.res === b.dataset.mres);
    S.media.fmt = (at.find(f => f.codec === cur?.codec) || at[0])?.key || '';
    ctx.render();
  }; });
  root.querySelectorAll('[data-mfmt]').forEach(b => { b.onclick = () => { S.media.fmt = b.dataset.mfmt; ctx.render(); }; });
  root.querySelectorAll('[data-mfps]').forEach(b => { b.onclick = () => { S.media.fps = fpsVal(b.dataset.mfps); ctx.render(); }; });
  root.querySelectorAll('[data-mtype]').forEach(b => { b.onclick = () => {
    const t = D.media.mediaOf(D.media.cameras.find(c => c.id === S.media.cam)).find(x => x.type === b.dataset.mtype);
    Object.assign(S.media, { mtype: t.type, card: t.sizes[t.sizes.length >> 1], cardPicked: true, customCard: false });
    ctx.render();
  }; });
  root.querySelectorAll('[data-mcard]').forEach(b => { b.onclick = () => { Object.assign(S.media, { card: Number(b.dataset.mcard), cardPicked: true, customCard: false }); ctx.render(); }; });
  root.querySelector('[data-mcard-custom]')?.addEventListener('click', () => { Object.assign(S.media, { customCard: true, cardPicked: true }); ctx.render(); });
  // The media tool hands over the day's footage and the card it goes on.
  root.querySelector('[data-to-offload]')?.addEventListener('click', (e) => {
    Object.assign(S.offload, { gb: Number(e.currentTarget.dataset.toOffload), fromMedia: true, customGb: false, cardGb: D.media.usableGb(S.media.mtype, S.media.card) });
    if (READERS.some(x => x.id === S.media.mtype)) Object.assign(S.offload, { reader: S.media.mtype, readOther: false });
    ctx.navigate('#/tools/offload');
  });
  root.querySelectorAll('[data-mhours]').forEach(b => { b.onclick = () => { S.media.hours = Number(b.dataset.mhours); S.media.customHours = false; ctx.render(); }; });
  root.querySelector('[data-mhours-custom]')?.addEventListener('click', () => { S.media.customHours = true; ctx.render(); });
}
