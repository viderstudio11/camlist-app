#!/usr/bin/env node
// Weekly: has a maker posted a new version? For every official download page the app links to
// (camera firmware, the Downloads list, the LUT pages), read the version numbers on the page and compare
// them with last week's. A page whose set of versions changed is marked with today's date, and the app
// shows it as "new" for three weeks. Pages that refuse scripted reads (some makers do) are skipped,
// never guessed. Output: data/downloads-watch.json.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read = (f) => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'));
const OUT = new URL('../data/downloads-watch.json', import.meta.url);
const today = new Date().toISOString().slice(0, 10);

const urls = new Set();
for (const c of read('data/compat.json').cameras || []) if (c.firmware) urls.add(c.firmware);
for (const it of read('data/downloads.json').items || []) urls.add(it.url);
for (const g of read('data/luts.json').logs || []) { if (g.url) urls.add(g.url); for (const c of g.cameras || []) if (c.url) urls.add(c.url); }

const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { pages: {} };
const pages = {};

// Version-looking tokens only ("Ver. 3.02", "v6.1.0", "SUP 7.3.2", "Firmware 2.8"): page furniture
// such as dates, prices or session ids changes all the time, versions only when there is a release.
const versions = (html) => {
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
  const found = new Set();
  for (const m of text.matchAll(/\b(?:v(?:er(?:sion)?)?\.?|SUP|firmware|fw)\s?(\d{1,3}(?:\.\d{1,3}){1,3})\b/gi)) found.add(m[1]);
  return [...found].sort();
};

async function check(url) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Cam2List download watch; +https://viderstudio11.github.io/camlist-app/)' }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
    if (!res.ok) return { status: res.status };
    const v = versions(await res.text());
    return { status: 200, versions: v, sig: createHash('sha1').update(v.join('|')).digest('hex').slice(0, 16) };
  } catch (e) { return { status: 0 }; }
}

const list = [...urls];
for (let i = 0; i < list.length; i += 6) {
  const batch = list.slice(i, i + 6);
  const results = await Promise.all(batch.map(check));
  batch.forEach((url, k) => {
    const r = results[k];
    const old = prev.pages?.[url] || {};
    const entry = { checked: today, status: r.status, sig: old.sig || null, latest: old.latest || [], changed: old.changed || null };
    if (r.status === 200 && r.versions.length) {
      if (old.sig && old.sig !== r.sig) entry.changed = today; // a new set of versions since last week
      entry.sig = r.sig; entry.latest = r.versions.slice(-5);
    }
    pages[url] = entry;
  });
}
writeFileSync(OUT, JSON.stringify({ _readme: 'Written weekly by scripts/watch-downloads.js. changed = the date a page\'s version numbers last changed (null until a change is seen). status 403/0 = the page refuses scripted reads; it is skipped, not guessed.', updated: today, pages }, null, 1) + '\n');
const changed = Object.entries(pages).filter(([, p]) => p.changed === today).map(([u]) => u);
const read200 = Object.values(pages).filter(p => p.status === 200).length;
console.log(`checked ${list.length} pages, read ${read200}, changed today: ${changed.length}`);
changed.forEach(u => console.log('  new:', u));
