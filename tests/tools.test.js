import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMedia } from '../js/tools/media.js';
import { timeFromAngle, angleFromTime, asFraction, flicker, safeAngles, slowMotion, FRAME_RATES, shutterChoices } from '../js/tools/shutter.js';
import { coverage, focalFor, angleOfView, nearestPrime, sensor, SHOTS, lensFor, frameAt, pickLens, toUnit, fromUnit } from '../js/tools/fov.js';
import { sunDay, crossings } from '../js/tools/solar.js';
import { offload, transfer, READERS, DRIVES, convert, cToF, fToC, mahToWh } from '../js/tools/convert.js';

const url = (p) => new URL(p, import.meta.url);
const media = createMedia(JSON.parse(readFileSync(url('../data/codecs.json'), 'utf8')));

test('ProRes matches the rates Apple publishes', () => {
  // Apple ProRes White Paper: 422 HQ is 220 Mbps at 1920×1080 29.97p, 707 at UHD 29.97p.
  assert.ok(Math.abs(media.mbps('prores-hq', 'hd', 29.97) - 220) < 3, media.mbps('prores-hq', 'hd', 29.97));
  // 707 Mbps is Apple's UHD figure at 24p; at 29.97 the same codec is four times the HD rate.
  assert.ok(Math.abs(media.mbps('prores-hq', 'uhd', 24) - 707) < 10, media.mbps('prores-hq', 'uhd', 24));
  assert.ok(Math.abs(media.mbps('prores-hq', 'uhd', 29.97) - 880) < 12, media.mbps('prores-hq', 'uhd', 29.97));
  // 4444 XQ: 500 at HD, 1591 at UHD.
  assert.ok(Math.abs(media.mbps('prores-xq', 'hd', 29.97) - 500) < 5);
  assert.ok(Math.abs(media.mbps('prores-xq', 'uhd', 24) - 1591) < 20);
  // Proxy is the cheapest of the family.
  assert.ok(media.mbps('prores-proxy', 'uhd', 25) < media.mbps('prores-lt', 'uhd', 25));
});

test('ProRes scales with frame rate, XAVC-L does not', () => {
  const hq25 = media.mbps('prores-hq', 'uhd', 25);
  const hq50 = media.mbps('prores-hq', 'uhd', 50);
  assert.ok(Math.abs(hq50 / hq25 - 2) < 0.01, `${hq25} → ${hq50}`);
  assert.equal(media.mbps('xavc-l', 'uhd', 25), media.mbps('xavc-l', 'uhd', 50));
});

test('XAVC-I follows the figures in the Sony manuals', () => {
  assert.ok(Math.abs(media.mbps('xavc-i', 'uhd', 25) - 240) < 1, media.mbps('xavc-i', 'uhd', 25));
  assert.ok(Math.abs(media.mbps('xavc-i', 'uhd', 50) - 500) < 1);
  assert.ok(Math.abs(media.mbps('xavc-i', 'hd', 25) - 112) < 1);
  // 40p is not published, so it lands between 30p and 50p.
  const at40 = media.mbps('xavc-i', 'uhd', 40);
  assert.ok(at40 > 300 && at40 < 500, at40);
});

test('card hours and how many cards a day needs', () => {
  const rate = media.mbps('xavc-i', 'uhd', 25);        // 240 Mbps
  const hours = media.hoursOn(160, rate);               // a 160GB CFexpress A
  assert.ok(Math.abs(hours - 1.48) < 0.05, hours);
  assert.equal(media.cardsFor(10, 160, rate), 7);
  assert.ok(Math.abs(media.gbPerHour(rate) - 108) < 1);
});

test('ARRIRAW is huge, and huge in the right proportion', () => {
  const raw = media.mbps('arriraw', '4.6kog', 24);
  // 4608 × 3164 × 24 × 12 bits ≈ 4.2 Gbps
  assert.ok(raw > 4000 && raw < 4300, raw);
  assert.ok(media.mbps('prores-hq', 'uhd', 24) < raw / 5);
});

test('shutter angle and exposure time are the same statement', () => {
  assert.ok(Math.abs(timeFromAngle(25, 180) - 1 / 50) < 1e-9);
  assert.equal(asFraction(timeFromAngle(25, 180)), '1/50');
  assert.equal(asFraction(timeFromAngle(24, 172.8)), '1/50');
  assert.ok(Math.abs(angleFromTime(25, 1 / 50) - 180) < 1e-9);
});

test('flicker: 1/50 is safe on 50 Hz, 1/60 is not', () => {
  assert.equal(flicker(1 / 50, 50).safe, true);
  assert.equal(flicker(1 / 100, 50).safe, true);
  assert.equal(flicker(1 / 60, 50).safe, false);
  assert.equal(flicker(1 / 60, 60).safe, true);
  const angles = safeAngles(25, 50);
  assert.equal(angles[0].angle, 180);           // nearest to 180 comes first
  assert.ok(angles.every(a => flicker(a.seconds, 50).safe));
});

test('slow motion factor', () => {
  assert.equal(slowMotion(50, 25).factor, 2);
  assert.equal(slowMotion(25, 25).label, '1:1');
  assert.ok(slowMotion(120, 25).label.includes('slower'));
});

test('field of view: the lens that frames a full figure', () => {
  const s = sensor('s35');
  // A 2.2 m frame width from 4 m on Super 35
  const f = focalFor(s.w, 2.2, 4);
  assert.ok(Math.abs(f - 45.3) < 0.5, f);
  assert.equal(nearestPrime(f), 50);
  const c = coverage('s35', 50, 4);
  assert.ok(Math.abs(c.widthM - 1.99) < 0.02, c.widthM);
  // A 50 mm is wider on full frame than on Super 35
  assert.ok(angleOfView(36, 50) > angleOfView(24.89, 50));
});

test('sun: Tel Aviv in late September', () => {
  const day = sunDay(new Date(Date.UTC(2026, 8, 26)), 32.0853, 34.7818);
  assert.ok(day.sunrise instanceof Date && day.sunset instanceof Date);
  // Four days after the equinox the day is a little under twelve hours.
  assert.ok(day.dayLengthHours > 11.6 && day.dayLengthHours < 12.2, day.dayLengthHours);
  assert.ok(day.sunrise < day.noon && day.noon < day.sunset);
  // Golden hour sits against sunrise and sunset, and lasts well under two hours.
  assert.equal(+day.goldenMorning.from, +day.sunrise);
  assert.equal(+day.goldenEvening.to, +day.sunset);
  const goldenMin = (day.goldenMorning.to - day.goldenMorning.from) / 60000;
  assert.ok(goldenMin > 20 && goldenMin < 90, goldenMin);
  // Blue hour comes before sunrise and after sunset.
  assert.ok(day.blueMorning.from < day.sunrise);
  assert.ok(day.blueEvening.to > day.sunset);
});

test('sun: the poles do not have a sunrise in midwinter', () => {
  const c = crossings(new Date(Date.UTC(2026, 11, 21)), 78.2, 15.6); // Svalbard
  assert.equal(c.rise, null);
  assert.equal(sunDay(new Date(Date.UTC(2026, 11, 21)), 78.2, 15.6).polar, true);
});

test('offload time counts every copy and the read-back', () => {
  const r = offload({ gb: 1000, mbPerSec: 500, copies: 2, verify: true });
  assert.ok(Math.abs(r.perCopyHours - 0.555) < 0.01, r.perCopyHours);
  assert.equal(r.passes, 4);
  assert.ok(Math.abs(r.totalHours - 2.22) < 0.02, r.totalHours);
  assert.equal(r.totalGb, 2000);
  assert.equal(offload({ gb: 0, mbPerSec: 500 }).totalHours, 0);
});

test('unit conversion', () => {
  assert.ok(Math.abs(convert('length', 'in', 'mm', 1) - 25.4) < 1e-6);
  assert.ok(Math.abs(convert('length', 'm', 'ft', 1) - 3.28084) < 1e-4);
  assert.ok(Math.abs(convert('weight', 'kg', 'lb', 1) - 2.20462) < 1e-4);
  assert.ok(Math.abs(convert('data', 'tb', 'gb', 1) - 1000) < 1e-9);
  assert.ok(Math.abs(convert('rate', 'mbs', 'mbps', 1) - 8) < 1e-9);
  assert.equal(cToF(0), 32);
  assert.ok(Math.abs(fToC(212) - 100) < 1e-9);
  assert.ok(Math.abs(mahToWh(6600, 14.4) - 95.04) < 0.01);
});

test('frame rates are the ones cameras offer today, up to 240', () => {
  assert.deepEqual(FRAME_RATES, [23.98, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 100, 119.88, 120, 150, 180, 200, 240]);
});

test('shutter speeds: only what the frame allows, flicker-safe marked, 180° recommended', () => {
  const pal = shutterChoices(25, 50, 'speed');
  assert.equal(pal.recommended.label, '1/50');
  assert.ok(pal.anySafe);
  assert.ok(pal.options.every(o => o.seconds <= 1 / 25 + 1e-9), 'no exposure longer than a frame');
  assert.ok(pal.options.find(o => o.label === '1/50').safe);
  assert.equal(pal.options.find(o => o.label === '1/60').safe, false);

  // 24p under 60 Hz light: 1/48 would flicker, the nearest safe speed is 1/60.
  assert.equal(shutterChoices(24, 60, 'speed').recommended.label, '1/60');

  // 120 fps under 50 Hz: nothing short enough is flicker-free — say so, still recommend 180°.
  const hs = shutterChoices(120, 50, 'speed');
  assert.equal(hs.anySafe, false);
  assert.equal(hs.recommended.label, '1/240');
});

test('shutter angles: common angles plus the safe ones, 180° recommended at 25p', () => {
  const a = shutterChoices(25, 50, 'angle');
  assert.equal(a.recommended.value, 180);
  assert.ok(a.options.every(o => o.value > 0 && o.value <= 360));
  assert.ok(a.options.some(o => o.value === 172.8));
  // 24p under 50 Hz: 180° (1/48) flickers, 172.8° (1/50) is the safe classic.
  assert.equal(shutterChoices(24, 50, 'angle').recommended.value, 172.8);
});

test('shot sizes are framed by height, like an operator frames a person', () => {
  assert.deepEqual(SHOTS.map(s => s.id), ['ecu', 'cu', 'chest', 'waist', 'knees', 'full', 'wide']);
  assert.ok(SHOTS.every((s, i) => i === 0 || s.height > SHOTS[i - 1].height), 'tighter to wider');
  assert.equal(SHOTS.find(s => s.id === 'full').height, 2.0);
});

test('lens for a shot: sensor height × distance ÷ frame height', () => {
  // FX6 in UHD (20.0 mm high), 4 m away, waist shot (1.1 m of person): 72.7 mm.
  const fx6 = { w: 35.6, h: 20.0 };
  assert.ok(Math.abs(lensFor(fx6, 4, 1.1) - 72.73) < 0.01);
  // What that lens then shows: the frame height comes back to 1.1 m, the width follows 16:9.
  const f = frameAt(fx6, lensFor(fx6, 4, 1.1), 4);
  assert.ok(Math.abs(f.heightM - 1.1) < 1e-9);
  assert.ok(Math.abs(f.widthM - 1.958) < 0.001);
});

test('pickLens names a real lens: a zoom that covers it, else the nearest prime', () => {
  const lenses = [{ min: 25, max: 25 }, { min: 35, max: 35 }, { min: 50, max: 50 }, { min: 85, max: 85 }];
  assert.deepEqual(pickLens(72.7, lenses), { min: 85, max: 85, focal: 85 });
  assert.deepEqual(pickLens(40, lenses), { min: 35, max: 35, focal: 35 });
  assert.deepEqual(pickLens(72.7, [...lenses, { min: 24, max: 70 }, { min: 70, max: 200 }]), { min: 70, max: 200, focal: 73 });
  assert.equal(pickLens(50, []), null);
});

test('distances read in metres or feet', () => {
  assert.ok(Math.abs(toUnit(4, 'ft') - 13.1234) < 0.001);
  assert.equal(toUnit(4, 'm'), 4);
  assert.ok(Math.abs(fromUnit(10, 'ft') - 3.048) < 1e-9);
  assert.equal(fromUnit(3, 'm'), 3);
});

test('camera formats: official recording times become rates that give the same times back', () => {
  const m = createMedia({
    frameRates: [25, 50],
    codecs: [{ id: 'xavc-i', label: 'XAVC-I', model: 'points', src: 'published', points: { uhd: { 25: 240, 50: 500 } } }],
    resolutions: [{ id: 'uhd', label: 'UHD 3840×2160', w: 3840, h: 2160, tier: 'uhd' }],
    cameras: [
      { id: 'fx5', brand: 'Sony', label: 'FX5', formats: [
        { id: 'si-uhd', codec: 'XAVC S-I', res: 'UHD 3840×2160', card: 960, minutes: { '59.94': 205, 25: 488, '23.98': 508 }, src: 'Sony Help Guide' },
      ] },
      { id: 'fx6', brand: 'Sony', label: 'PXW-FX6', formats: [['xavc-i', 'uhd']] },
    ],
  });
  const fx5 = m.formatsOf(m.cameras[0]);
  assert.equal(fx5.length, 1);
  assert.deepEqual(fx5[0].fps, [23.98, 25, 59.94]);
  assert.equal(fx5[0].official, true);
  const r = fx5[0].rate(25);
  assert.ok(Math.abs(r - 262.3) < 0.1, r);
  assert.ok(Math.abs(m.hoursOn(960, r) * 60 - 488) < 1e-6, 'gives Sony\'s 488 minutes back');
  assert.equal(fx5[0].rate(30), 0, 'a frame rate the format does not record gives nothing');

  const fx6 = m.formatsOf(m.cameras[1]);
  assert.deepEqual(fx6[0].fps, [25, 50]);
  assert.equal(fx6[0].rate(25), 240);
  assert.equal(fx6[0].label, 'XAVC-I · UHD 3840×2160');
  assert.equal(fx6[0].official, true);
});

test('camera formats: a generic format can carry the camera’s top frame rate', () => {
  const m = createMedia({
    frameRates: [24, 25, 50, 60, 120],
    codecs: [{ id: 'prores-hq', label: 'ProRes 422 HQ', model: 'bpp', bpp: 3.6, src: 'published' }],
    resolutions: [{ id: 'dci4k', label: '4K 4096×2160', w: 4096, h: 2160, tier: 'dci4k' }],
    cameras: [{ id: 'komodo', brand: 'RED', label: 'KOMODO 6K', formats: [['prores-hq', 'dci4k', 60]] }],
  });
  const [f] = m.formatsOf(m.cameras[0]);
  assert.deepEqual(f.fps, [24, 25, 50, 60]);
  assert.equal(f.key, 'prores-hq:dci4k');
});

test('the tools screen module parses and loads', async () => {
  const mod = await import('../js/ui/tools.js');
  assert.equal(typeof mod.render, 'function');
  assert.equal(mod.toolLabel('media', 'en'), 'Media');
});

test('camera formats: a frame size in MB gives the rate at every frame rate', () => {
  const m = createMedia({ cameras: [{ id: 'a35', brand: 'ARRI', label: 'ALEXA 35', formats: [
    { id: 'raw-4k', codec: 'ARRIRAW', res: '4K 16:9', frameMB: 15.4, fps: [24, 25, 50], src: 'ARRI AFRO' },
  ] }] });
  const [f] = m.formatsOf(m.cameras[0]);
  assert.deepEqual(f.fps, [24, 25, 50]);
  assert.ok(Math.abs(f.rate(25) - 3080) < 1e-9, f.rate(25)); // 15.4 MB × 8 × 25
  assert.equal(f.rate(30), 0);
  assert.equal(f.official, true);
});

test('camera formats: a frame size never goes past the camera’s top write speed', () => {
  const m = createMedia({ cameras: [{ id: 'raptor', brand: 'RED', label: 'V-RAPTOR', formats: [
    { id: 'hq', codec: 'REDCODE HQ', res: '8K', frameMB: 446 / 24, fps: [24, 60], capMBs: 800, src: 'RED' },
  ] }] });
  const [f] = m.formatsOf(m.cameras[0]);
  assert.ok(Math.abs(f.rate(24) - 3568) < 1e-9, f.rate(24));
  assert.equal(f.rate(60), 6400, 'held at 800 MB/s');
  assert.equal(f.capped(60), true);
  assert.equal(f.capped(24), false);
});

test('camera formats: interlaced rates stay apart from progressive ones', () => {
  const m = createMedia({ cameras: [{ id: 'x400', brand: 'Sony', label: 'PXW-X400', formats: [
    { id: 'xavci-hd', codec: 'XAVC-I', res: 'HD 1920×1080', mbps: { 25: 111, 50: 222, '50i': 111, '59.94i': 111 }, src: 'Sony' },
  ] }] });
  const [f] = m.formatsOf(m.cameras[0]);
  assert.deepEqual(f.fps, [25, 50, '50i', '59.94i']);
  assert.equal(f.rate('50i'), 111);
  assert.equal(f.rate(50), 222);
  assert.equal(f.codec, 'XAVC-I');
  assert.equal(f.res, 'HD 1920×1080');
});

test('camera formats: grouped by frame size, in the maker’s order', () => {
  const m = createMedia({
    codecs: [{ id: 'prores-hq', label: 'ProRes 422 HQ', model: 'bpp', bpp: 3.6, src: 'published' }],
    resolutions: [{ id: 'uhd', label: 'UHD 3840×2160', w: 3840, h: 2160, tier: 'uhd' }],
    cameras: [{ id: 'c', brand: 'X', label: 'C', formats: [
      { id: 'a', codec: 'RAW', res: '8K', mbps: { 25: 1 } },
      { id: 'b', codec: 'X-OCN', res: '6K', mbps: { 25: 1 } },
      { id: 'c', codec: 'X-OCN', res: '8K', mbps: { 25: 1 } },
      ['prores-hq', 'uhd'],
    ] }],
  });
  const groups = m.groupFormats(m.formatsOf(m.cameras[0]));
  assert.deepEqual(groups.map(g => g.res), ['8K', '6K', 'UHD 3840×2160']);
  assert.deepEqual(groups[0].formats.map(f => f.codec), ['RAW', 'X-OCN']);
  assert.equal(groups[2].formats[0].codec, 'ProRes 422 HQ');
});

test('camera media: the cards a camera takes, and the one its maker’s table used', () => {
  const m = createMedia({
    media: {
      'CFexpress B': { sizes: [128, 256, 512, 960, 1920], src: 'Sony CEB-G' },
      SD: { sizes: [64, 128, 256], src: 'Sony SF-G' },
      'Codex Compact Drive': { sizes: [1000, 2000], usable: { 1000: 960, 2000: 1920 }, src: 'Codex' },
    },
    cameras: [
      { id: 'burano', brand: 'Sony', label: 'BURANO', media: ['CFexpress B'], formats: [
        { id: 'x', codec: 'X-OCN LT', res: '8.6K', card: 960, minutes: { 25: 100 } },
        { id: 'y', codec: 'XAVC-I', res: 'UHD', mbps: { 25: 240 } },
      ] },
      { id: 'c70', brand: 'Canon', label: 'EOS C70', media: ['SD'], formats: [{ id: 'z', codec: 'XF-AVC', res: '4K', mbps: { 25: 410 } }] },
      { id: 'a35', brand: 'ARRI', label: 'ALEXA 35', media: ['Codex Compact Drive'], formats: [] },
    ],
  });
  const [burano, c70, a35] = m.cameras;
  assert.deepEqual(m.mediaOf(burano).map(x => x.type), ['CFexpress B']);
  const [x, y] = m.formatsOf(burano);
  assert.deepEqual(m.defaultCard(burano, x), { type: 'CFexpress B', size: 960 }, 'the card the maker timed');
  assert.deepEqual(m.defaultCard(burano, y), { type: 'CFexpress B', size: 512 }, 'else the middle size');
  assert.deepEqual(m.defaultCard(c70, m.formatsOf(c70)[0]), { type: 'SD', size: 128 });
  assert.equal(m.usableGb('Codex Compact Drive', 1000), 960, 'a 1TB Compact Drive holds 960 GB');
  assert.equal(m.usableGb('SD', 128), 128);
  assert.equal(m.usableGb('SD', 100), 100, 'a size typed by hand is taken as is');
  assert.equal(m.mediaOf(a35)[0].sizes.length, 2);
});

test('a backup copy on a second card doubles the cards', () => {
  const m = createMedia({});
  assert.equal(m.cardsFor(10, 160, 240), 7);
  assert.equal(m.cardsFor(10, 160, 240, 2), 14);
});

test('offload: the slower of the card reader and the drive sets the pace', () => {
  const cfa = READERS.find(r => r.id === 'CFexpress A');
  assert.equal(cfa.mbPerSec, 800, 'Sony CEA-G reads 800 MB/s, under the MRW-G2’s 10 Gb/s link');
  const t7 = DRIVES.find(d => d.id === 'ssd10');
  assert.deepEqual(transfer(cfa.mbPerSec, t7.mbPerSec), { mbPerSec: 800, limit: 'source' });
  const hdd = DRIVES.find(d => d.id === 'hdd');
  assert.deepEqual(transfer(cfa.mbPerSec, hdd.mbPerSec), { mbPerSec: hdd.mbPerSec, limit: 'dest' });
  for (const x of [...READERS, ...DRIVES]) assert.ok(x.mbPerSec > 0 && x.src, x.id);
});

test('offload: every card type the media tool knows has a reader', async () => {
  const codecs = JSON.parse(readFileSync(url('../data/codecs.json'), 'utf8'));
  for (const type of Object.keys(codecs.media)) assert.ok(READERS.some(r => r.id === type), type);
});

test('offload: two readers share one drive; the computer port caps each link', () => {
  // two CFexpress A cards at once into a T9: 2 × 800 MB/s, under the drive's 1950
  assert.deepEqual(transfer(800, 1950, { readers: 2 }), { mbPerSec: 1600, limit: 'source' });
  // two readers into a T7: the drive becomes the bottleneck
  assert.deepEqual(transfer(800, 1000, { readers: 2 }), { mbPerSec: 1000, limit: 'dest' });
  // an old 5 Gb/s port holds a fast drive back
  assert.deepEqual(transfer(1250, 1950, { port: 500 }), { mbPerSec: 500, limit: 'port' });
  assert.deepEqual(transfer(300, 1950, { port: 500 }), { mbPerSec: 300, limit: 'source' });
});

test('sun: times read in the place’s own clock, not the phone’s', async () => {
  const { localTime, todayIn, zoneOf } = await import('../js/tools/solar.js');
  assert.equal(localTime(new Date(Date.UTC(2026, 8, 29, 9, 0)), 'Asia/Tokyo'), '18:00');
  assert.equal(localTime(new Date(Date.UTC(2026, 8, 29, 9, 0)), 'Asia/Jerusalem'), '12:00');
  assert.equal(todayIn('Pacific/Auckland', new Date(Date.UTC(2026, 8, 29, 20, 0))), '2026-09-30');
  const places = JSON.parse(readFileSync(url('../data/places.json'), 'utf8'));
  for (const c of places.countries) for (const city of c.cities) {
    const tz = zoneOf(c, city);
    assert.ok(tz, `${city.en} has a time zone`);
    assert.doesNotThrow(() => localTime(new Date(), tz), `${city.en}: ${tz}`);
  }
  const jp = places.countries.find(c => c.code === 'JP');
  const tokyo = jp.cities[0];
  const day = sunDay(new Date(Date.UTC(2026, 8, 29)), tokyo.lat, tokyo.lon);
  const set = localTime(day.sunset, zoneOf(jp, tokyo));
  assert.ok(set >= '17:20' && set <= '17:35', `Tokyo sunset ${set}`);
  const us = places.countries.find(c => c.code === 'US');
  assert.equal(zoneOf(us, us.cities.find(x => x.en === 'Albuquerque')), 'America/Denver');
});

test('sun: what the light is doing now, and how long until it changes', async () => {
  const { sunStatus } = await import('../js/tools/solar.js');
  const h = (hh, mm = 0) => new Date(Date.UTC(2026, 8, 29, hh, mm));
  const day = { sunrise: h(6, 30), sunset: h(18, 30), goldenEvening: { from: h(18), to: h(18, 30) }, blueEvening: { from: h(18, 30), to: h(19) } };
  assert.deepEqual(sunStatus(day, h(5)), { key: 'st_sunrise_in', ms: 90 * 60000 });
  assert.deepEqual(sunStatus(day, h(16, 48)), { key: 'st_golden_in', ms: 72 * 60000 });
  assert.deepEqual(sunStatus(day, h(18, 10)), { key: 'st_golden_now', ms: 20 * 60000 });
  assert.deepEqual(sunStatus(day, h(18, 40)), { key: 'st_blue_now', ms: 20 * 60000 });
  assert.deepEqual(sunStatus(day, h(20)), { key: 'st_dark', ms: 0 });
});

test('LUTs: every camera leads to the maker’s own download page', () => {
  const luts = JSON.parse(readFileSync(url('../data/luts.json'), 'utf8'));
  for (const g of luts.logs) {
    assert.match(g.url, /^https:\/\//, g.id);
    assert.ok(g.monitor, `${g.id} names the LUT to monitor with`);
    assert.ok(g.cameras.length, g.id);
    for (const c of g.cameras) assert.ok(c.name && (!c.url || /^https:\/\//.test(c.url)), `${g.id}/${c.name}`);
  }
  // A camera that records two logs shows both (Canon Log 2 and 3 on the C70).
  const c70 = luts.logs.filter(g => g.cameras.some(c => c.name === 'EOS C70')).map(g => g.id);
  assert.deepEqual(c70, ['clog3', 'clog2']);
});

test('hours: regular time, the first overtime tier, the rest, and the pay', async () => {
  const { hoursReport } = await import('../js/tools/convert.js');
  // 07:00–20:30 with an hour's break = 12:30 worked; a 10-hour day, 2 h at 125%, then 150%
  const r = hoursReport({ call: '07:00', wrap: '20:30', breaks: 60, base: 10, tier1h: 2, tier1pct: 125, tier2pct: 150, turnaround: 11, dayRate: 1000 });
  assert.equal(r.worked, 12.5);
  assert.deepEqual([r.regular, r.tier1, r.tier2], [10, 2, 0.5]);
  // hourly = 1000 / 10; pay = 1000 + 2 × 100 × 1.25 + 0.5 × 100 × 1.5
  assert.equal(r.pay, 1000 + 250 + 75);
  assert.equal(r.nextCall, '07:30');
  assert.equal(r.nextDay, true);
  // a short day: all regular, no overtime, the day rate stands
  const s = hoursReport({ call: '08:00', wrap: '14:00', breaks: 0, base: 10, tier1h: 2, tier1pct: 125, tier2pct: 150, turnaround: 11, dayRate: 1000 });
  assert.deepEqual([s.worked, s.tier1, s.tier2, s.pay], [6, 0, 0, 1000]);
  // past midnight
  const n = hoursReport({ call: '18:00', wrap: '02:00', breaks: 0, base: 10, tier1h: 2, tier1pct: 125, tier2pct: 150, turnaround: 10 });
  assert.equal(n.worked, 8);
  assert.equal(n.pay, null, 'no day rate, no pay line');
});

test('ND: density, factor and stops are one number three ways', async () => {
  const { ndFrom } = await import('../js/tools/convert.js');
  const a = ndFrom('density', 0.9);
  assert.equal(Math.round(a.stops * 10) / 10, 3);
  assert.equal(Math.round(a.factor), 8);
  const b = ndFrom('factor', 64);
  assert.equal(Math.round(b.stops), 6);
  assert.equal(Math.round(b.density * 10) / 10, 1.8);
  assert.equal(ndFrom('density', 1.8).factor, 64, 'ND 1.8 reads ND64, as the filters are labelled');
  const c = ndFrom('stops', 10);
  assert.equal(Math.round(c.factor), 1024);
});

test('battery: watt-hours and whether it may fly', async () => {
  const { flightCheck } = await import('../js/tools/convert.js');
  assert.equal(flightCheck(98).key, 'fly_ok');
  assert.equal(flightCheck(150).key, 'fly_approval');
  assert.equal(flightCheck(250).key, 'fly_no');
  assert.ok(Math.abs(mahToWh(6600, 14.4) - 95.04) < 1e-9);
});
