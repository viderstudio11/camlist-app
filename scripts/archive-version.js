// Archives the current build under v/<version>/ so any past version can be opened and compared
// later. Only the files that define a version's look and behaviour are copied — index.html, css
// and js. The heavy shared assets (the catalog, the logos, the export libraries) are read from
// the live root through a <base> tag, which keeps each archive around 300 KB instead of 3.4 MB.
//
// Because <base> also redirects the archive's own stylesheet and entry script, those two are
// rewritten to root-relative paths. Module imports inside the js folder resolve against the
// module's own URL, so they stay inside the archive and need no rewriting.
//
// Usage: node scripts/archive-version.js [--label "what changed"]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = '/camlist-app';      // the Pages path this project is served from
const ARCHIVE = path.join(ROOT, 'v');

const version = (() => {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const m = sw.match(/const VERSION = '([^']+)'/);
  if (!m) throw new Error('no VERSION in sw.js');
  return m[1];
})();

const asArg = process.argv.indexOf('--as');
// --as lets a build be published to the archive under its own name without going live,
// which is how a version gets previewed before it replaces the one people are using.
const name = asArg > -1 ? process.argv[asArg + 1] : null;
const labelArg = process.argv.indexOf('--label');
const label = labelArg > -1 ? process.argv[labelArg + 1] || '' : '';

const copyDir = (from, to) => {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
};

function archive() {
  const dir = path.join(ARCHIVE, name || version);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  copyDir(path.join(ROOT, 'css'), path.join(dir, 'css'));
  copyDir(path.join(ROOT, 'js'), path.join(dir, 'js'));

  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const base = `${SITE}/v/${name || version}/`;
  html = html
    .replace('<head>', `<head>\n<base href="${SITE}/">`)
    .replace(/href="css\//g, `href="${base}css/`)
    .replace(/src="js\//g, `src="${base}js/`)
    .replace(/<link rel="manifest"[^>]*>\n?/, '')
    .replace('</head>', `<script>window.__camlistArchive = ${JSON.stringify(version)};</script>\n</head>`);
  fs.writeFileSync(path.join(dir, 'index.html'), html);

  // An archived copy must not install a service worker: it would fight the live one for scope.
  const appPath = path.join(dir, 'js', 'app.js');
  let app = fs.readFileSync(appPath, 'utf8');
  app = app.replace(
    "const devNoSW = ['localhost', '127.0.0.1'].includes(location.hostname) && !location.search.includes('sw=1');",
    "const devNoSW = true; // archived copy: never registers a worker",
  );
  fs.writeFileSync(appPath, app);

  return dir;
}

function readIndex() {
  const file = path.join(ARCHIVE, 'versions.json');
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}

function writeIndex(list) {
  fs.mkdirSync(ARCHIVE, { recursive: true });
  fs.writeFileSync(path.join(ARCHIVE, 'versions.json'), JSON.stringify(list, null, 1));

  const rows = list.map(v => `
    <li>
      <a href="${v.version}/">${v.version}</a>
      <time>${v.date}</time>
      <span>${v.label ? v.label.replace(/[<>&]/g, '') : ''}</span>
    </li>`).join('');

  fs.writeFileSync(path.join(ARCHIVE, 'index.html'), `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cam2List · גרסאות</title>
<style>
  :root { color-scheme: light dark; --bg:#F5F4F1; --fg:#14171A; --mid:#545A63; --line:rgba(0,0,0,.12); --card:#fff; }
  @media (prefers-color-scheme: dark){ :root{ --bg:#14161A; --fg:#F2F4F7; --mid:#9BA3B0; --line:rgba(255,255,255,.14); --card:#1A1D23; } }
  html,body{background:var(--bg)}
  body { margin:0; font-family:"Assistant",-apple-system,"Segoe UI",Roboto,"Noto Sans Hebrew",sans-serif;
    color:var(--fg); line-height:1.55; }
  .wrap { max-width:640px; margin:0 auto; padding-block:32px 60px; padding-inline:16px; }
  h1 { font-size:26px; font-weight:800; letter-spacing:-.02em; margin:0 0 6px; }
  p.sub { color:var(--mid); margin:0 0 24px; font-size:15px; }
  ul { list-style:none; margin:0; padding:0; display:grid; gap:8px; }
  li { display:flex; align-items:baseline; gap:12px; padding:12px 14px; background:var(--card);
    border:1px solid var(--line); border-radius:10px; flex-wrap:wrap; }
  a { font-weight:800; font-size:16px; color:inherit; text-decoration:none; }
  a:hover { text-decoration:underline; }
  time { font-family:ui-monospace,Menlo,monospace; font-size:12px; color:var(--mid); }
  li span { flex:1 1 100%; color:var(--mid); font-size:13px; }
  .back { display:inline-block; margin-top:26px; color:var(--mid); font-size:14px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>גרסאות Cam2List</h1>
  <p class="sub">כל גרסה שהועלתה, שמורה וניתנת לפתיחה. הן חולקות את המאגר והלוגואים עם הגרסה החיה, כך שההבדל ביניהן הוא העיצוב וההתנהגות.</p>
  <ul>${rows}</ul>
  <a class="back" href="${SITE}/">← לגרסה הנוכחית</a>
</div>
</body>
</html>
`);
}

const dir = archive();
const list = readIndex().filter(v => v.version !== (name || version));
list.unshift({ version: name || version, date: new Date().toISOString().slice(0, 10), label });
writeIndex(list);

const size = (() => {
  let total = 0;
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else total += fs.statSync(p).size;
  } };
  walk(dir);
  return Math.round(total / 1024);
})();

console.log(`archived ${version} (${size} KB) → v/${name || version}/  ·  ${list.length} versions in the index`);
