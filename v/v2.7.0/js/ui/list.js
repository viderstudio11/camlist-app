import { esc, icons, toast, openSheet, confirmDialog } from './dom.js';
import { groupByDept, setQty, setNote, addItem } from '../list.js';
import { gearKitFor, gearKitStatus, inTheBox } from '../gearkits.js';
import { brandText } from '../brands.js';
import { displayName, formatDateRange } from '../export-text.js';
import { DEPT_EMOJI } from '../i18n.js';
import { deptIcon } from './icons-dept.js';
import { toolIcon } from './icons.js';
import { editProjectSheet } from './projects.js';
import { presetCatalog } from './catalog.js';
import { allocFor, ensureAlloc, bump } from '../kitalloc.js';
import { proposeParents, setParent } from '../accassign.js';

const collapsed = new Set();
let showKit = false;
const openKits = new Set(); // items whose must-have checklist is open // set by "Build around": bring the new kit into view on the next draw

// Each detail isolated, so a date range beside a Hebrew name never flips (02.10–01.10).
const bidi = (s) => `<bdi${/^[0-9.–-]+$/.test(s) ? ' dir="ltr"' : ''}>${esc(s)}</bdi>`;
export const thumbHTML = (p, key) => `<div class="thumb"><span>${DEPT_EMOJI[key] || '📦'}</span>${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</div>`;
export const parseId = (s) => (/^\d+$/.test(s) ? Number(s) : s);

// Camera profile summary chips (mount · sensor · media · battery)
export function profileChips(prof, t) {
  if (!prof) return '';
  const chips = [];
  if (prof.mount?.length) chips.push(`${t('mount')}: ${prof.mount.join(' / ')}`);
  if (prof.format) chips.push(t(`fmt_${prof.format}`));
  if (prof.media?.length) chips.push(prof.media.join(' / '));
  if (prof.battery?.length) chips.push(prof.battery.join(' / '));
  return chips.map(c => `<span class="pchip">${esc(c)}</span>`).join('');
}

export function render(ctx, { id }, root) {
  const { store, t, compat } = ctx;
  const p = store.getProject(id);
  ctx.setTopbar({
    title: `${esc(p.name || t('untitled'))}<small>${[formatDateRange(p.dateFrom, p.dateTo)].filter(Boolean).map(bidi).join(' · ')}</small>`,
    back: '#/',
    right: [
      { icon: icons.edit, label: t('rename'), onClick: () => editProjectSheet(ctx, id) },
    ],
  });

  const active = p.buildCameraId != null ? ctx.resolve(p.buildCameraId) : null;
  // The camera's own profile, and the one the kit runs on: its native batteries or V-Lock, as chosen.
  const baseProf = active ? compat.profileFor(active) : null;
  const activeProf = baseProf ? compat.powered(baseProf, (p.powerRoute || {})[p.buildCameraId]) : null;
  const groups = groupByDept(p.items, ctx.resolve, ctx.deptOrder());

  const gearKit = (product) => gearKitFor(ctx.catalog, product);
  const qtyOf = (pid) => p.items.find(i => i.productId === pid)?.qty || 1;
  // The camera being built around (else the first camera in the list) — a tripod's plate depends on it.
  const kitCamera = () => (p.buildCameraId != null ? ctx.resolve(p.buildCameraId) : p.items.map(i => ctx.resolve(i.productId)).find(x => x && compat.isCamera(x))) || null;
  const kitSlots = (product) => gearKitStatus(gearKit(product), qtyOf(product.id), p.items, ctx.resolve, product, { camera: kitCamera(), route: (p.powerRoute || {})[product.id] });
  // Monitors, wireless video, follow focus, matte boxes, laptops: a chip under the item opens its
  // must-have checklist in place, so several kits can be open side by side.
  const kitChip = (product) => {
    if (!gearKit(product)) return '';
    const st = kitSlots(product), done = st.filter(x => x.done).length;
    return `<button class="buildbtn kitchip ${done === st.length ? 'active' : ''}" data-kitchip="${esc(product.id)}">${done === st.length ? '✓' : '▾'} ${t('kit_short')} ${done}/${st.length}</button>`;
  };
  const slotRows = (product) => kitSlots(product).map(x => `
      <div class="slot ${x.done ? 'done' : ''}">
        <span class="slot-check">${x.done ? '✓' : ''}</span>
        <span class="slot-label">${esc(ctx.lang() === 'he' ? x.he : x.en)}${x.power ? `<span class="seg pwr"><button class="${x.power.route === 'vlock' ? '' : 'active'}" data-mpower="${esc(product.id)}" data-route="native">${x.power.fam}</button><button class="${x.power.route === 'vlock' ? 'active' : ''}" data-mpower="${esc(product.id)}" data-route="vlock">V-Lock</button></span>` : ''}</span>
        <span class="slot-have">${x.have} / ${x.need}</span>
        ${x.done ? '' : x.add != null ? `<button class="btn sm" data-kitadd="${esc(product.id)}" data-slot="${esc(x.key)}">${t('add')}</button>` : `<button class="btn sm" data-kitfind="${esc(product.id)}" data-slot="${esc(x.key)}">${t('choose')}</button>`}
      </div>`).join('');
  const inlineKit = (product) => (openKits.has(product.id) && gearKit(product)
    ? `<div class="gkit"><div class="gkit-head">${t('must_have_for', { name: esc(displayName(product)) })}</div><div class="slots">${slotRows(product)}</div>${boxNote(product)}</div>` : '');
  // What the maker packs in the box (DJI gimbals), so the case can be checked against it.
  const boxNote = (product) => {
    const b = inTheBox(gearKit(product), product);
    if (!b) return '';
    const items = [...b.items, ...(/combo/i.test(product.name) ? b.combo || [] : [])];
    return `<details class="inbox"><summary>${t('in_the_box')} · ${items.length}</summary><ul>${items.map(i => `<li dir="ltr">${esc(i)}</li>`).join('')}</ul><small>${esc(b.src)}</small></details>`;
  };
  const buildBtn = (product) => {
    if (!compat.isCamera(product) || !compat.profileFor(product)) return '';
    const isActive = p.buildCameraId === product.id;
    return `<button class="buildbtn ${isActive ? 'active' : ''}" data-build="${esc(product.id)}">${isActive ? `✓ ${t('active_camera')}` : `⚙ ${t('build_around')}`}</button>`;
  };

  const tailHTML = (item) => {
    return `<div class="stepper compact"><button data-d="-1" aria-label="-">−</button><span class="q">${item.qty}</span><button class="plus" data-d="1" aria-label="+">+</button></div>`;
  };

  const sections = groups.map(g => `
    <section class="group ${collapsed.has(g.key) ? 'collapsed' : ''}" data-key="${g.key}">
      <div class="group-head"><span class="dept-ico sm">${deptIcon(g.key)}</span><h2>${t(`dept_${g.key}`)}</h2><span class="chev">${icons.chev}</span></div>
      <div class="group-body">${g.entries.map(({ item, product, accessory }) => `
        <div class="row ${p.buildCameraId === product.id ? 'is-build' : ''} ${accessory ? 'acc' : ''}" data-pid="${esc(item.productId)}">
          ${thumbHTML(product, g.key)}
          <div class="body">
            <div class="name">${esc(displayName(product))}</div>
            <div class="sub">${brandText(product.brand, product.brandName)}${product.manual ? `<span class="chip">${t('manual_item')}</span>` : ''}${buildBtn(product) + kitChip(product)}</div>
            <input class="note" value="${esc(item.note)}" placeholder="${t('note_placeholder')}" data-note>
          </div>
          ${tailHTML(item)}
        </div>${inlineKit(product)}`).join('')}</div>
    </section>`);


  const powerSwitch = () => { const v = activeProf.route === 'vlock'; return `<span class="seg pwr"><button class="${v ? '' : 'active'}" data-power="native">${esc(t('power_native', { fam: baseProf.battery[0] }))}</button><button class="${v ? 'active' : ''}" data-power="vlock">V-Lock</button></span>`; };
  let kitHTML = '';
  // Base kit checklist for the active camera
  if (active && activeProf) {
    const slots = compat.kitStatus(activeProf, p.items, ctx.resolve, allocFor(p, p.buildCameraId));
    const lang = ctx.lang();
    kitHTML = `<section class="kit">
      <div class="kit-head">
        ${thumbHTML(active, 'cameras')}
        <div class="kit-title"><small>${t('base_kit')} · ${t('building_around')}</small><b dir="auto">${esc(displayName(active))}</b><div class="pchips">${profileChips(activeProf, t)}</div></div>
        <button class="iconbtn" data-clear-build aria-label="${t('clear_build')}" title="${t('clear_build')}">×</button>
      </div>
      <div class="slots">${slots.map(s => `
        <div class="slot ${s.done ? 'done' : ''}" data-slot="${esc(s.slot)}">
          <span class="slot-check">${s.done ? '✓' : ''}</span>
          <span class="slot-label">${esc(lang === 'he' ? s.he : s.en)}${s.slot === 'battery' && compat.canVlock(baseProf) ? powerSwitch() : ''}${s.missing?.length ? `<small class="slot-warn">⚠ ${t('no_reader_short', { fam: esc(s.missing.join(' / ')) })}</small>` : ''}</span>
          <span class="slot-have">${s.have} / ${s.qty}</span>
          ${s.add ? (s.done ? '' : `<button class="btn sm" data-slotadd="${esc(s.slot)}">${t('add')}</button>`) : `<button class="btn sm ${s.done ? 'ghost' : ''}" data-choose="${esc(s.slot)}">${s.done ? '+' : t('choose')}</button>`}
        </div>`).join('')}</div>
    </section>`;
  }

  // A quiet project header: who it is for and what is in it, with the iris ring behind it.
  const headHTML = `<header class="phead">
    <span class="lbl">${t('gear_list')}</span>
    <h1 dir="auto">${esc(p.name || t('untitled'))}</h1>
    <p>${[p.productionCo, p.techManager, formatDateRange(p.dateFrom, p.dateTo)].filter(Boolean).map(bidi).join(' · ')}</p>
    <div class="ticks"></div>
  </header>`;
  const listHTML = groups.length ? ''
    : `<div class="empty"><div class="big">🧰</div><h2>${t('list_empty')}</h2><p>${t('list_empty_hint')}</p></div>`;
  // The kit sits right under the cameras it is built around, not three screens down the list.
  const camAt = groups.findIndex(g => g.key === 'cameras');
  if (kitHTML) sections.splice(camAt + 1, 0, kitHTML);
  // Accessories added before the list remembered their item: offer to place them under it.
  const proposals = proposeParents(p, ctx.catalog, ctx.resolve, { dismissed: p.accDismissed || [] });
  const assignHTML = proposals.length ? `<section class="card assign-card"><div><b>${esc(proposals.length === 1 ? t('assign_title_one') : t('assign_title', { n: proposals.length }))}</b><p>${esc(t('assign_hint'))}</p></div>
    <div class="assign-acts"><button class="btn sm primary" data-assign>${t('assign_review')}</button><button class="btn sm ghost" data-assign-later>${t('assign_later')}</button></div></section>` : '';
  root.innerHTML = headHTML + assignHTML + (groups.length ? sections.join('') : listHTML);
  if (showKit) { showKit = false; root.querySelector('.kit')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  root.insertAdjacentHTML('beforeend', `<div class="bottombar"><button class="btn primary" data-add>${icons.plus}${t('add_gear')}</button><button class="btn" data-export ${p.items.length ? '' : 'disabled'}>${icons.share}${t('export')}</button></div>`);

  // Adding gear starts from the departments page, not wherever the catalog was left.
  root.querySelector('[data-add]')?.addEventListener('click', () => { presetCatalog({}); ctx.navigate(`#/p/${id}/add`); });
  root.querySelector('[data-export]')?.addEventListener('click', () => ctx.navigate(`#/p/${id}/export`));
  root.querySelectorAll('.group-head').forEach(h => { h.onclick = () => { const k = h.parentElement.dataset.key; collapsed.has(k) ? collapsed.delete(k) : collapsed.add(k); h.parentElement.classList.toggle('collapsed'); }; });
  // Building around a different camera opens its own, empty kit; the first camera's progress is kept as its own.
  root.querySelectorAll('[data-build]').forEach(b => { b.onclick = () => {
    const pid = parseId(b.dataset.build); const on = p.buildCameraId !== pid;
    if (on && p.buildCameraId != null && p.buildCameraId !== pid) store.updateProject(id, { kitAlloc: ensureAlloc(p, compat, ctx.resolve) });
    store.setBuildCamera(id, on ? pid : null); showKit = on; ctx.render();
  }; });
  root.querySelector('[data-clear-build]')?.addEventListener('click', () => { store.setBuildCamera(id, null); ctx.render(); });
  root.querySelectorAll('[data-kitchip]').forEach(b => { b.onclick = () => { const k = parseId(b.dataset.kitchip); openKits.has(k) ? openKits.delete(k) : openKits.add(k); ctx.render(); }; });
  // A missing slot adds what it lacks; a slot with a choice (V-Mount or Gold plate) asks first.
  root.querySelectorAll('[data-kitadd]').forEach(b => { b.onclick = () => {
    const parent = ctx.resolve(parseId(b.dataset.kitadd));
    const slot = kitSlots(parent).find(x => x.key === b.dataset.slot);
    const put = (pid) => {
      const items = store.getProject(id).items, cur = items.find(i => i.productId === pid)?.qty || 0;
      const n = slot.need - slot.have;
      store.setItems(id, cur ? setQty(items, pid, cur + n) : addItem(items, ctx.resolve(pid), n, parent.id));   // listed under the item it was picked for
      ctx.render();
    };
    const choices = [slot.add].flat();
    if (choices.length === 1) return put(choices[0]);
    openSheet({ title: ctx.lang() === 'he' ? slot.he : slot.en, bodyHTML: '', stack: true,
      actions: choices.map(c => ({ label: ctx.resolve(c).name, onClick: () => put(c) })) });
  }; });
  // "Choose" opens the shelf the slot names (legs for a head, a fluid head for a slider…), else the departments.
  root.querySelectorAll('[data-kitfind]').forEach(b => { b.onclick = () => {
    const slot = kitSlots(ctx.resolve(parseId(b.dataset.kitfind))).find(x => x.key === b.dataset.slot);
    const d = slot?.find ? ctx.catalog.departments.find(x => x.slug === slot.find.dept) : null;
    const sub = d?.subcategories.find(x => x.en === slot.find.subcat);
    presetCatalog(d ? { dept: d.id, subcat: sub?.id ?? null } : {});
    ctx.navigate(`#/p/${id}/add`);
  }; });
  // a monitor on NP-F: its own batteries, or V-Lock through a D-Tap cable — kept per monitor
  root.querySelector('[data-assign-later]')?.addEventListener('click', () => {
    store.updateProject(id, { accDismissed: [...(p.accDismissed || []), ...proposals.map(x => x.productId)] });
    ctx.render();
  });
  root.querySelector('[data-assign]')?.addEventListener('click', () => {
    const name = (pid) => displayName(ctx.resolve(pid) || { name: String(pid) });
    const rowHTML = (x) => `<label class="assign-row"><input type="checkbox" data-pid="${esc(x.productId)}" checked>
      <span class="assign-name" dir="auto">${esc(name(x.productId))}</span><span class="assign-arrow">→</span>
      ${x.candidates.length === 1 ? `<span class="assign-parent" dir="auto" data-parent="${esc(x.candidates[0])}">${esc(name(x.candidates[0]))}</span>`
        : `<select data-parent-of="${esc(x.productId)}">${x.candidates.map(c => `<option value="${esc(c)}">${esc(name(c))}</option>`).join('')}</select>`}</label>`;
    openSheet({
      title: t('assign_sheet_title'),
      bodyHTML: `<p class="tnote">${esc(t('assign_sheet_hint'))}</p><div class="assign-list">${proposals.map(rowHTML).join('')}</div>`,
      actions: [{ label: t('cancel'), kind: 'ghost' }, { label: t('assign_apply'), kind: 'primary', onClick: (body) => {
        let items = store.getProject(id).items;
        const skipped = [];
        for (const x of proposals) {
          const on = body.querySelector(`input[data-pid="${CSS.escape(String(x.productId))}"]`)?.checked;
          if (!on) { skipped.push(x.productId); continue; }
          const sel = body.querySelector(`[data-parent-of="${CSS.escape(String(x.productId))}"]`);
          const parent = sel ? parseId(sel.value) : x.candidates[0];
          items = setParent(items, x.productId, parent);
        }
        store.setItems(id, items);
        // the ones left unticked are not proposed again
        if (skipped.length) store.updateProject(id, { accDismissed: [...(store.getProject(id).accDismissed || []), ...skipped] });
        ctx.render();
      } }],
    });
  });
  root.querySelectorAll('[data-mpower]').forEach(b => { b.onclick = () => {
    store.updateProject(id, { powerRoute: { ...(p.powerRoute || {}), [parseId(b.dataset.mpower)]: b.dataset.route } });
    ctx.render();
  }; });
  root.querySelectorAll('[data-power]').forEach(b => { b.onclick = () => {
    store.updateProject(id, { powerRoute: { ...(p.powerRoute || {}), [p.buildCameraId]: b.dataset.power } });
    ctx.render();
  }; });
  // The plate and the dummy cable are single items: one tap adds what is missing, counted for this camera.
  root.querySelectorAll('[data-slotadd]').forEach(b => { b.onclick = () => {
    const pr = store.getProject(id);
    const slot = compat.kitStatus(activeProf, pr.items, ctx.resolve, allocFor(pr, p.buildCameraId)).find(s => s.slot === b.dataset.slotadd);
    const n = Math.max(1, slot.qty - slot.have), alloc0 = ensureAlloc(pr, compat, ctx.resolve);
    const cur = pr.items.find(i => i.productId === slot.add)?.qty || 0;
    store.setItems(id, cur ? setQty(pr.items, slot.add, cur + n) : addItem(pr.items, ctx.resolve(slot.add), n, p.buildCameraId));
    if (pr.kitAlloc || Object.keys(alloc0).length) store.updateProject(id, { kitAlloc: bump(alloc0, p.buildCameraId, slot.slot, n) });
    ctx.render();
  }; });
  root.querySelectorAll('[data-choose]').forEach(b => { b.onclick = () => {
    const slot = compat.kitStatus(activeProf, p.items, ctx.resolve, allocFor(p, p.buildCameraId)).find(s => s.slot === b.dataset.choose);
    presetCatalog({ dept: slot.deptId, subcat: slot.subId, strict: true, kind: slot.kind || null, kitCam: p.buildCameraId, slot: slot.slot });
    ctx.navigate(`#/p/${id}/add`);
  }; });

  root.querySelectorAll('.row').forEach(row => {
    const productId = parseId(row.dataset.pid);
    row.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => {
      const cur = store.getProject(id).items.find(i => i.productId === productId)?.qty || 0;
      const next = cur + Number(b.dataset.d);
      store.setItems(id, setQty(store.getProject(id).items, productId, next));
      if (next <= 0) { if (p.buildCameraId === productId) store.setBuildCamera(id, null); ctx.render(); } else { row.querySelector('.q').textContent = next; syncCounts(); }
    }; });
    const note = row.querySelector('[data-note]');
    if (note) {
      note.onchange = () => store.setItems(id, setNote(store.getProject(id).items, productId, note.value.trim()));
      note.onkeydown = (e) => { if (e.key === 'Enter') note.blur(); };
    }
  });

  function syncCounts() {
    const items = store.getProject(id).items;
    if (activeProf) compat.kitStatus(activeProf, items, ctx.resolve, allocFor(store.getProject(id), p.buildCameraId)).forEach(s => { const el = root.querySelector(`.slot[data-slot="${s.slot}"]`); if (!el) return; el.classList.toggle('done', s.done); el.querySelector('.slot-have').textContent = `${s.have} / ${s.qty}`; el.querySelector('.slot-check').textContent = s.done ? '✓' : ''; });
  }
}


// A list changes all week. A version is a snapshot you can come back to.
export function versionsSheet(ctx, id) {
  const { store, t } = ctx;
  const lang = ctx.lang();
  const locale = lang === 'he' ? 'he-IL' : 'en-GB';
  const draw = () => {
    const p = store.getProject(id);
    const list = p?.versions || [];
    return `
      <label class="vlabel"><span>${esc(t('version_label'))}</span><input data-vlabel maxlength="60" autocomplete="off"></label>
      <button class="btn primary" data-vsave style="width:100%;margin-bottom:12px">${esc(t('save_version'))}</button>
      ${list.length ? `<div class="vlist">${list.map(v => `
        <div class="vrow" data-vid="${esc(v.id)}">
          <div class="vmain">
            <b dir="auto">${esc(v.label || t('auto_version'))}</b>
            <small>${new Date(v.at).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })} · ${esc(t('items_in_version', { n: v.items.reduce((s, x) => s + x.qty, 0) }))}</small>
          </div>
          <button class="btn sm" data-vrestore>${esc(t('restore'))}</button>
          <button class="iconbtn sm" data-vdel aria-label="${esc(t('delete'))}">×</button>
        </div>`).join('')}</div>`
        : `<p class="tnote">${esc(t('no_versions'))}</p>`}`;
  };

  const { body, close } = openSheet({ title: t('versions'), bodyHTML: draw() });
  const rewire = () => { body.innerHTML = draw(); bind(); };

  function bind() {
    body.querySelector('[data-vsave]').onclick = () => {
      store.saveVersion(id, body.querySelector('[data-vlabel]')?.value.trim() || '');
      toast(t('version_saved'), { kind: 'ok' });
      rewire();
    };
    body.querySelectorAll('[data-vrestore]').forEach(b => {
      b.onclick = async () => {
        const vid = b.closest('.vrow').dataset.vid;
        if (!(await confirmDialog(t('restore') + '?', { okLabel: t('restore'), cancelLabel: t('cancel'), danger: false }))) return;
        store.restoreVersion(id, vid, t('before_restore'));
        toast(t('version_restored'), { kind: 'ok' });
        close();
        ctx.render();
      };
    });
    body.querySelectorAll('[data-vdel]').forEach(b => {
      b.onclick = () => { store.deleteVersion(id, b.closest('.vrow').dataset.vid); rewire(); };
    });
  }
  bind();
}
