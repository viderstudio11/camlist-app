// The tools screen: the grid of tools, and each tool's page. Every tool lives in its own file under
// ./tools/ (its view and its wiring); this file routes to them and binds what all forms share.
import { esc } from './dom.js';
import { toolIcon } from './icons.js';
import { closeViewfinder } from './viewfinder.js';
import { shutterChoices } from '../tools/shutter.js';
import { L } from './tools/strings.js';
import { S, D, bindMore } from './tools/shared.js';
import * as media from './tools/media.js';
import * as fov from './tools/fov.js';
import * as shutter from './tools/shutter.js';
import * as offload from './tools/offload.js';
import * as sun from './tools/sun.js';
import * as luts from './tools/luts.js';
import * as hours from './tools/hours.js';
import * as units from './tools/units.js';
import * as downloads from './tools/downloads.js';
import * as slate from './tools/slate.js';
import * as iso from './tools/iso.js';

export { setCodecs, setLuts, setDownloads, setWatch, setPlaces, setIso } from './tools/shared.js';
export { camModel, camFull } from './tools/fov.js';

const VIEWS = { media, fov, shutter, hours, offload, sun, luts, units, downloads, slate, iso };

// Short labels for places outside the tools screen (the home screen's tool row).
export const toolLabel = (k, lang) => L[k]?.[lang] ?? L[k]?.he ?? k;

const TOOLS = ['media', 'fov', 'iso', 'shutter', 'slate', 'hours', 'offload', 'sun', 'downloads', 'units'];


export function render(ctx, { tool: id }, root) {
  const lang = ctx.lang();
  const T = (k) => L[k]?.[lang] ?? L[k]?.he ?? k;

  if (!id) {
    closeViewfinder();
    ctx.setTopbar({ title: esc(T('tools')), back: '#/' });
    root.innerHTML = `
      <p class="screen-sub">${esc(T('tools_sub'))}</p>
      <div class="tool-grid">${TOOLS.map(k => `
        <button class="tool-tile" data-tool="${k}">
          <span class="tool-ico">${toolIcon(k)}</span>
          <b>${esc(T(k))}</b>
          <small>${esc(T(`${k}_sub`))}</small>
        </button>`).join('')}</div>`;
    root.querySelectorAll('[data-tool]').forEach(btn => {
      btn.onclick = () => ctx.navigate(`#/tools/${btn.dataset.tool}`);
    });
    return;
  }

  if (id !== 'fov') closeViewfinder();
  D.route = new URLSearchParams(arguments[1]?.query || '');
  ctx.setTopbar({ title: esc(T(id)), back: '#/tools' });
  const body = VIEWS[id];
  if (!body) { ctx.navigate('#/tools'); return; }
  root.innerHTML = `<div class="tool">${body.view(T, lang, ctx)}</div>`;
  wire(root, ctx, id, T, lang);
}

// ---------- wiring ----------
// What every tool form shares (a field writes into the tool's state; a fold remembers being open),
// then the tool's own wiring.
function wire(root, ctx, id, T, lang) {
  const s = S[id];
  const redraw = () => ctx.render();
  root.querySelectorAll('[data-f]').forEach(el => {
    el.onchange = () => {
      const k = el.dataset.f;
      if (el.type === 'checkbox') s[k] = el.checked;
      else if (el.type === 'date' || el.tagName === 'SELECT' && Number.isNaN(Number(el.value))) s[k] = el.value;
      else s[k] = el.type === 'number' || !Number.isNaN(Number(el.value)) ? Number(el.value) : el.value;

      if (id === 'fov' && k === 'distance') s.focal = 0;
      if (id === 'media' && k === 'card') s.cardPicked = true;
      if (id === 'fov' && k === 'cam') s.cam = el.value;
      if (id === 'fov' && k === 'camBrand') { s.camBrand = el.value; s.cam = ''; }
      if (id === 'shutter' && k === 'fps') { s.speed = shutterChoices(s.fps, s.mains, 'speed').recommended?.value ?? s.speed; s.angle = shutterChoices(s.fps, s.mains, 'angle').recommended?.value ?? s.angle; }
      if (id === 'offload' && k === 'gb') s.fromMedia = false;
      if (id === 'sun' && k === 'country') { s.lat = null; s.lon = null; s.city = 0; }
      redraw();
    };
  });

  bindMore(root);
  root.querySelector('[data-tool-go]')?.addEventListener('click', (e) => ctx.navigate(`#/tools/${e.currentTarget.dataset.toolGo}`));
  VIEWS[id].bind?.(root, ctx, { T, lang, rewire: () => wire(root, ctx, id, T, lang) });
}
