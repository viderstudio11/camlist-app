export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function el(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild;
}

export function toast(msg, { kind = '', ms = 2200 } = {}) {
  const host = document.getElementById('toasts');
  const node = el(`<div class="toast ${kind}">${esc(msg)}</div>`);
  host.appendChild(node);
  setTimeout(() => node.remove(), ms);
}

export function openSheet({ title = '', bodyHTML = '', actions = [], stack = false, onOpen }) {
  const dlg = document.getElementById('sheet');
  dlg.innerHTML = `<div class="panel" dir="${document.documentElement.dir}"><div class="grab"></div>${title ? `<h2>${esc(title)}</h2>` : ''}<div class="body">${bodyHTML}</div><div class="actions ${stack ? 'stack' : ''}"></div></div>`;
  const acts = dlg.querySelector('.actions');
  const close = () => { if (dlg.open) dlg.close(); dlg.innerHTML = ''; };
  for (const a of actions) {
    const b = el(`<button class="btn ${a.kind || ''}" type="button">${esc(a.label)}</button>`);
    b.onclick = async () => { const r = await a.onClick?.(dlg.querySelector('.body'), close); if (r !== false) close(); };
    acts.appendChild(b);
  }
  if (!actions.length) acts.remove();
  dlg.onclick = (e) => { if (e.target === dlg) close(); };
  dlg.oncancel = (e) => { e.preventDefault(); close(); };
  dlg.showModal();
  onOpen?.(dlg.querySelector('.body'), close);
  return { close, body: dlg.querySelector('.body') };
}

export const confirmDialog = (msg, { okLabel = 'OK', cancelLabel = 'Cancel', danger = true } = {}) => new Promise((resolve) => {
  openSheet({
    bodyHTML: `<p style="font-size:16px;line-height:1.5">${esc(msg)}</p>`,
    actions: [
      { label: cancelLabel, kind: 'ghost', onClick: () => resolve(false) },
      { label: okLabel, kind: danger ? 'danger' : 'primary', onClick: () => resolve(true) },
    ],
  });
});

export function download(filename, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

const loaded = new Map();
export function loadScript(src) {
  if (!loaded.has(src)) loaded.set(src, new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { loaded.delete(src); rej(new Error(src)); }; document.head.appendChild(s); }));
  return loaded.get(src);
}

export const icons = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 16V3m0 0L8 7m4-4 4 4"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  // Lighting switch: day (sun outline), sun (filled, for direct light), night (moon).
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>',
  sunFill: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="currentColor"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" stroke-width="2.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/></svg>',
};
