import { esc, openSheet, confirmDialog, icons } from './dom.js';
import { formatDateRange } from '../export-text.js';
import { activeProject, deptStrip, cameraChips } from '../home.js';
import { deptIcon, toolIcon } from './icons.js';
import { toolLabel } from './tools.js';

export function projectForm(t, p = {}) {
  const opt = `<em class="opt">(${t('optional')})</em>`;
  return `<div class="form">
    <label>${t('project_name')}<input name="name" value="${esc(p.name || '')}" autocomplete="off" enterkeyhint="done"></label>
    <label>${t('production_co')} ${opt}<input name="productionCo" value="${esc(p.productionCo || '')}" autocomplete="off"></label>
    <label>${t('tech_manager')} ${opt}<input name="techManager" value="${esc(p.techManager || '')}" autocomplete="off"></label>
    <div class="two">
      <label>${t('phone')} ${opt}<input type="tel" name="phone" value="${esc(p.phone || '')}" autocomplete="off" inputmode="tel"></label>
      <label>${t('email')} ${opt}<input type="email" name="email" value="${esc(p.email || '')}" autocomplete="off" inputmode="email"></label>
    </div>
    <div class="two">
      <label>${t('date_from')} ${opt}<input type="date" name="dateFrom" value="${esc(p.dateFrom || '')}"></label>
      <label>${t('date_to')} ${opt}<input type="date" name="dateTo" value="${esc(p.dateTo || '')}"></label>
    </div>
    <label>${t('notes')} ${opt}<textarea name="notes">${esc(p.notes || '')}</textarea></label>
  </div>`;
}
export const readForm = (body) => Object.fromEntries([...body.querySelectorAll('[name]')].map(i => [i.name, i.value.trim()]));

export function editProjectSheet(ctx, id) {
  const { store, t } = ctx;
  const p = store.getProject(id);
  openSheet({
    title: t('rename'), bodyHTML: projectForm(t, p),
    actions: [
      { label: t('cancel'), kind: 'ghost' },
      { label: t('save'), kind: 'primary', onClick: (b) => { store.updateProject(id, readForm(b)); ctx.render(); } },
    ],
  });
}

// Home opens on the project you are working on: a hero card with its departments and cameras,
// then the field tools, then every project. The wordmark shrinks into the top bar.
const HOME_TOOLS = ['media', 'sun', 'shutter', 'fov', 'hours'];

export function render(ctx, _params, root) {
  const { store, t } = ctx;
  const projects = store.state.projects;
  const lang = ctx.lang();
  const locale = lang === 'he' ? 'he-IL' : 'en-GB';
  ctx.setTopbar({ title: `<span class="brandmark">CAM<b>LIST</b></span>`, right: [{ icon: icons.gear, onClick: () => ctx.navigate('#/settings'), label: t('settings') }] });

  const active = activeProject(projects);
  let hero = '';
  if (active) {
    const range = formatDateRange(active.dateFrom, active.dateTo);
    const cams = cameraChips(active.items, ctx.resolve, ctx.deptOrder());
    const strip = deptStrip(active.items, ctx.resolve, ctx.deptOrder());
    const who = [active.productionCo, active.techManager ? `${t('tech_manager')}: ${active.techManager}` : ''].filter(Boolean).map(esc).join(' · ');
    hero = `<div class="home-sec"><span class="lbl">${t('active_project')}</span></div>
    <article class="phero" data-id="${esc(active.id)}">
      <div class="ticks"></div>
      <div class="phero-in">
        <div class="phero-top"><span class="tag">ACTIVE</span>${range ? `<span class="num phero-dates" dir="ltr">${range}</span>` : ''}</div>
        <h2 class="h-display phero-name" dir="auto">${esc(active.name || t('untitled'))}</h2>
        ${who ? `<p class="phero-sub" dir="auto">${who}</p>` : ''}
        ${cams.length ? `<div class="camchips">${cams.map(c => `<span class="camchip" dir="ltr">${esc(c.name)} <b class="num">×${c.qty}</b></span>`).join('')}</div>` : ''}
        ${strip.length ? `<div class="dstrip">${strip.map(d => `<div class="ds ${d.qty ? '' : 'nil'}" title="${esc(t(`dept_${d.key}`))}"><span class="ds-ico">${deptIcon(d.key)}</span><i><u style="width:${Math.round(d.share * 100)}%"></u></i></div>`).join('')}</div>` : ''}
        <div class="phero-acts"><button class="btn primary" data-open>${t('open_list')}<span class="fwd">${icons.back}</span></button><button class="btn sq" data-export aria-label="${esc(t('export'))}" ${active.items.length ? '' : 'disabled'}>${icons.share}</button></div>
        <div class="phero-meta"><span>${t('updated')} ${new Date(active.updatedAt).toLocaleDateString(locale)}</span></div>
      </div>
    </article>`;
  }

  const tools = `<div class="home-sec"><span class="lbl">${t('tools')}</span><button class="linkbtn" data-tools>${t('all')}</button></div>
    <div class="toolrow">${HOME_TOOLS.map(k => `<button class="tr-t" data-tool="${k}"><span class="tool-ico">${toolIcon(k)}</span><span class="tr-n">${esc(toolLabel(k, lang))}</span></button>`).join('')}</div>`;

  const rows = projects.map(p => {
    const main = cameraChips(p.items, ctx.resolve, ctx.deptOrder())[0];
    const sub = [p.productionCo, formatDateRange(p.dateFrom, p.dateTo), main?.name].filter(Boolean).map(s => `<bdi${/^[0-9.–-]+$/.test(s) ? ' dir="ltr"' : ''}>${esc(s)}</bdi>`).join(' · ');
    return `<article class="prow" data-id="${esc(p.id)}">
      <div class="prow-main"><b dir="auto">${esc(p.name || t('untitled'))}</b>${sub ? `<small dir="auto">${sub}</small>` : ''}</div>
      <button class="iconbtn more" data-more aria-label="more">${icons.more}</button>
    </article>`;
  }).join('');

  root.innerHTML = projects.length
    ? `${hero}${tools}<div class="home-sec"><span class="lbl">${t('projects')}</span><span class="num home-count">${String(projects.length).padStart(2, '0')}</span></div><div class="plist">${rows}</div>`
    : `<div class="card home-empty"><h2 class="h-display">${t('no_projects')}</h2><p>${t('no_projects_hint')}</p></div>${tools}`;
  root.insertAdjacentHTML('beforeend', `<div class="bottombar fabbar"><button class="btn fab" data-new>${icons.plus}${t('new_project')}</button></div>`);

  root.querySelector('[data-new]').onclick = () => openSheet({
    title: t('new_project'), bodyHTML: projectForm(t, { techManager: store.state.settings.techManager }),
    actions: [{ label: t('cancel'), kind: 'ghost' }, { label: t('save'), kind: 'primary', onClick: (body) => { const f = readForm(body); if (!f.name) { body.querySelector('[name=name]').focus(); return false; } const p = store.createProject(f); ctx.navigate(`#/p/${p.id}`); } }],
    onOpen: (body) => body.querySelector('[name=name]').focus(),
  });
  root.querySelector('[data-tools]')?.addEventListener('click', () => ctx.navigate('#/tools'));
  root.querySelectorAll('[data-tool]').forEach(b => { b.onclick = () => ctx.navigate(`#/tools/${b.dataset.tool}`); });
  if (active) {
    root.querySelector('[data-open]').onclick = () => ctx.navigate(`#/p/${active.id}`);
    root.querySelector('.phero [data-export]').onclick = () => ctx.navigate(`#/p/${active.id}/export`);
  }
  root.querySelectorAll('.prow').forEach(row => {
    const id = row.dataset.id;
    row.onclick = (e) => { if (!e.target.closest('[data-more]')) ctx.navigate(`#/p/${id}`); };
    row.querySelector('[data-more]').onclick = () => {
      const p = store.getProject(id);
      openSheet({ title: p.name || t('untitled'), stack: true, actions: [
        { label: t('rename'), onClick: () => { setTimeout(() => editProjectSheet(ctx, id), 60); } },
        { label: t('duplicate'), onClick: () => { const d = store.duplicateProject(id); ctx.navigate(`#/p/${d.id}`); } },
        { label: t('delete'), kind: 'danger', onClick: () => { setTimeout(async () => { if (await confirmDialog(t('confirm_delete_project', { name: p.name || t('untitled') }), { okLabel: t('delete'), cancelLabel: t('cancel') })) { store.deleteProject(id); ctx.render(); } }, 60); } },
        { label: t('cancel'), kind: 'ghost' },
      ] });
    };
  });
}
