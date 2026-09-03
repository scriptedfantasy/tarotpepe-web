#!/usr/bin/env node
// The critic's visit: one evening played as a visitor, every stage screenshot, every beat timed.
// Two picks by clicking the fan, the third typed ("the second from the right"); a real answer; a
// follow-up. Also two contact sheets from a CDP screencast: eight frames while Pepe talks and
// eight while a card turns. Prints a timings table, stalls over 15 s, console errors, dark frames,
// overlapping DOM text, and what the cursor / input look like.
//   node tools/_critic-visit.mjs [--out /abs/dir] [--prefix whole-r1]
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const outDir = args.out ?? new URL('../public/progress/shots', import.meta.url).pathname;
const prefix = args.prefix ?? 'whole-r1';
mkdirSync(outDir, { recursive: true });
const url = 'http://127.0.0.1:5173/';
const W = 1600, H = 900;
const BEATS = ['idle', 'title', 'greeting', 'question', 'answer', 'shuffle', 'fan', 'dealt', 'reading', 'followup', 'farewell', 'closing'];
const at = (s) => BEATS.indexOf(s.beat);

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errors = [];
const consoleErrors = [];
const warnings = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
  if (m.type() === 'warning' && /\[flow\]/.test(m.text())) warnings.push(m.text());
});
// Vite HMR stub: other builders edit files constantly; a reload mid-visit is a black frame.
await page.route('**/@vite/client', (route) =>
  route.fulfill({
    contentType: 'application/javascript',
    body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(id, css){ let s = document.querySelector('style[data-vite-dev-id="' + id + '"]'); if (!s) { s = document.createElement('style'); s.setAttribute('data-vite-dev-id', id); document.head.appendChild(s); } s.textContent = css; }
export function removeStyle(id){ document.querySelector('style[data-vite-dev-id="' + id + '"]')?.remove(); }
export function injectQuery(url){ return url; }
export class ErrorOverlay {}`,
  }),
);
const t0 = Date.now();
const secs = () => ((Date.now() - t0) / 1000).toFixed(1);
const log = (...a) => console.log(`[${secs()}s]`, ...a);
const notes = [];
const note = (s) => { notes.push(`[${secs()}s] ${s}`); log('NOTE', s); };

// ---- stills ------------------------------------------------------------------------------------------
const shots = [];
async function shot(name) {
  const path = `${outDir}/${prefix}-${name}.png`;
  const began = Date.now();
  const buf = await page.screenshot();
  await sharp(buf).png().toFile(path);
  const st = await sharp(buf).greyscale().stats();
  const mean = st.channels[0].mean;
  shots.push({ name, mean: +mean.toFixed(1), cost: Date.now() - began });
  log('shot', name, `mean ${mean.toFixed(0)}`, `(${Date.now() - began} ms)`);
  if (mean < 40) note(`dark frame: ${prefix}-${name}.png (mean luminance ${mean.toFixed(0)})`);
  return path;
}

// ---- the page's state ---------------------------------------------------------------------------------
const state = () =>
  page.evaluate(() => {
    const T = window.__theatre;
    const cap = document.querySelector('#dialogue .cap');
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.width && r.height ? [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] : null;
    };
    const vis = (el) => el && !el.hidden && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none' && +getComputedStyle(el).opacity > 0.05;
    const els = {
      cap: cap && vis(cap) ? cap : null,
      field: document.querySelector('#dialogue input.field'),
      mic: document.querySelector('#dialogue button.mic'),
      title: document.querySelector('#titles .card'),
      inter: document.querySelector('#dialogue .inter'),
    };
    const rects = {};
    for (const [k, el] of Object.entries(els)) if (el && vis(el)) rects[k] = rect(el);
    return {
      beat: T?.pieces?.flow?.beat,
      shot: T?.pieces?.camera?.current,
      caption: cap && vis(cap) ? cap.textContent.replace(/\s+/g, ' ').trim().slice(0, 140) : null,
      inter: !!(cap && vis(cap) && cap.classList.contains('inter')),
      field: !!els.field,
      placeholder: els.field?.placeholder ?? null,
      mic: !!els.mic,
      title: !!els.title,
      titleText: els.title ? els.title.textContent.replace(/\s+/g, ' ').trim().slice(0, 120) : null,
      fan: T?.pieces?.reveal?.fanCount ?? 0,
      picks: (T?.pieces?.reveal?.picks ?? []).map((p) => `${p.ordinal}:${p.slug}`),
      drawn: (T?.pieces?.cards?.drawn?.children ?? []).length,
      mind: T?.pieces?.mind?.provider,
      cursor: getComputedStyle(document.querySelector('#stage canvas') ?? document.body).cursor,
      rects,
    };
  });

// ---- the timeline: a poller that records every change of beat / shot / caption / title ------------------
const timeline = [];
let polling = true;
let last = {};
const overlaps = new Set();
(async () => {
  while (polling) {
    try {
      const s = await state();
      const key = `${s.beat}|${s.shot}|${s.caption}|${s.titleText}|${s.field}|${s.inter}`;
      if (key !== last.key) {
        timeline.push({ t: (Date.now() - t0) / 1000, beat: s.beat, shot: s.shot, caption: s.caption, title: s.titleText, field: s.field, inter: s.inter });
        last = { key };
      }
      // DOM text overlapping DOM text
      const ks = Object.keys(s.rects);
      for (let i = 0; i < ks.length; i++)
        for (let j = i + 1; j < ks.length; j++) {
          const a = s.rects[ks[i]], b = s.rects[ks[j]];
          if (a && b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]) overlaps.add(`${ks[i]} x ${ks[j]} at ${s.beat}/${s.shot} (${a} vs ${b})`);
        }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
})();

async function until(label, fn, seconds = 60) {
  const start = Date.now();
  for (;;) {
    const s = await state();
    if (fn(s)) return s;
    if (Date.now() - start > seconds * 1000) throw new Error(`stalled waiting for ${label}: ${JSON.stringify({ beat: s.beat, shot: s.shot, caption: s.caption, field: s.field, picks: s.picks })}`);
    await page.waitForTimeout(100);
  }
}
async function reach(beat, name = beat, extra = () => true, seconds = 90) {
  const idx = BEATS.indexOf(beat);
  const s = await until(beat, (s) => at(s) > idx || (at(s) === idx && extra(s)), seconds);
  if (at(s) === idx) {
    await shot(name);
    log(beat, JSON.stringify({ shot: s.shot, caption: s.caption, field: s.field }));
  } else note(`${beat}: already past (now ${s.beat}) before a still could be taken`);
  return s;
}

// ---- contact sheets from a CDP screencast: real painted frames, timestamped -----------------------------
const cdp = await page.context().newCDPSession(page);
let cast = null;
cdp.on('Page.screencastFrame', async (f) => {
  if (cast) cast.frames.push({ t: f.metadata.timestamp, data: Buffer.from(f.data, 'base64') });
  try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {}
});
async function sheet(name, seconds, every = 0.17, count = 8) {
  cast = { frames: [] };
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  const began = Date.now();
  await page.waitForTimeout(seconds * 1000);
  await cdp.send('Page.stopScreencast');
  const frames = cast.frames;
  cast = null;
  if (!frames.length) {
    note(`contact sheet ${name}: the screencast delivered no frames in ${seconds}s`);
    return;
  }
  const first = frames[0].t;
  const chosen = [];
  for (let k = 0; k < count; k++) {
    const want = first + k * every;
    let best = null;
    for (const f of frames) if (f.t >= want - 1e-3 && (!best || f.t < best.t)) best = f;
    if (best && !chosen.includes(best)) chosen.push(best);
  }
  const cw = Math.round(W / 2), ch = Math.round(H / 2);
  const cols = 4, rows = Math.ceil(chosen.length / cols);
  const tiles = await Promise.all(chosen.map((f) => sharp(f.data).resize(cw, ch, { fit: 'contain', background: '#111' }).png().toBuffer()));
  const path = `${outDir}/${prefix}-${name}.png`;
  await sharp({ create: { width: cw * cols, height: ch * Math.max(1, rows), channels: 3, background: '#111' } })
    .composite(tiles.map((input, i) => ({ input, left: (i % cols) * cw, top: Math.floor(i / cols) * ch })))
    .png()
    .toFile(path);
  const gaps = chosen.slice(1).map((f, i) => ((f.t - chosen[i].t) * 1000).toFixed(0));
  log(`sheet ${name}: ${frames.length} frames painted in ${((Date.now() - began) / 1000).toFixed(1)}s (${(frames.length / seconds).toFixed(1)} fps painted); chose ${chosen.length}, gaps ms: ${gaps.join(' ')}`);
  shots.push({ name, sheet: true, painted: frames.length, gaps });
}

// ---- the DOM controls, as CSS ----------------------------------------------------------------------------
const describe = (sel) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName, cls: el.className, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
      font: cs.fontFamily.slice(0, 60), size: cs.fontSize, transform: cs.textTransform, spacing: cs.letterSpacing, color: cs.color,
      bg: cs.backgroundColor, bgImage: cs.backgroundImage.slice(0, 60), border: cs.border, radius: cs.borderRadius, outline: cs.outline, shadow: cs.boxShadow.slice(0, 60),
      cursor: cs.cursor, caret: cs.caretColor, placeholder: el.placeholder ?? null, text: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 80), inner: el.innerHTML.slice(0, 200),
    };
  }, sel);

await page.goto(url, { waitUntil: 'load', timeout: 60000 });
while (Date.now() - t0 < 150000) {
  const ready = await page.evaluate(() => window.__theatreReady === true).catch(() => false);
  if (ready) break;
  await page.waitForTimeout(250);
}
log('ready');
const transcript = [];
try {
  // 1. the title
  const ti = await until('the title card', (s) => s.title && s.beat === 'title', 30);
  log('title', JSON.stringify({ title: ti.titleText, shot: ti.shot, cursor: ti.cursor, mind: ti.mind }));
  await page.waitForTimeout(1200);
  await shot('title');
  log('title css', JSON.stringify(await describe('#titles .card')));
  await page.keyboard.press('Enter');
  const ch1 = await until('chapter one', (s) => (s.title && s.beat === 'title' && s.titleText !== ti.titleText) || at(s) > 1, 15);
  if (ch1.title && ch1.beat === 'title') {
    log('chapter1', JSON.stringify({ title: ch1.titleText }));
    await shot('chapter1');
  } else note('chapter one: passed before a still (or no chapter card)');

  // 2. the greeting: the home composite, then Pepe talking (a sheet)
  const g = await reach('greeting', 'greeting', (s) => !!s.caption);
  log('greeting caption css', JSON.stringify(await describe('#dialogue .cap')));
  if (g.beat === 'greeting') await sheet('talk-sheet', 4.0);
  const g2 = await state();
  if (g2.beat === 'greeting' && g2.caption) await shot('greeting-2');

  // 3. the question and the answer
  const q = await until('the question field', (s) => s.beat === 'question' && s.field, 60);
  log('question', JSON.stringify({ caption: q.caption, placeholder: q.placeholder, mic: q.mic, cursor: q.cursor }));
  if (!q.mic) note('no mic button in this browser (SpeechRecognition / speechSynthesis missing in headless Chromium)');
  await page.waitForTimeout(700);
  await shot('question-empty');
  log('field css', JSON.stringify(await describe('#dialogue input.field')));
  log('mic css', JSON.stringify(await describe('#dialogue button.mic')));
  log('dialogue ui css', JSON.stringify(await describe('#dialogue .ask')) || 'no .ask');
  await page.keyboard.type('I keep starting things and not finishing them.', { delay: 25 });
  await shot('question-typed');
  await page.keyboard.press('Enter');
  await reach('answer', 'answer', (s) => !!s.caption);

  // 4. chapter two, the shuffle, the fan
  const ch2 = await until('chapter two', (s) => (s.title && s.beat === 'answer') || at(s) > 4, 60);
  if (ch2.title) await shot('chapter2'); else note('chapter two: passed before a still');
  await reach('shuffle', 'shuffle', (s) => s.shot === 'table' || !!s.caption);
  const f = await until('the fan laid', (s) => (s.beat === 'fan' && s.fan >= 21) || at(s) > 6, 60);
  log('fan', JSON.stringify({ fan: f.fan, caption: f.caption, shot: f.shot }));
  await shot('fan-laid');

  // the first pick: a hover on the fan, then a click
  const pp = await until('the pick prompt', (s) => s.field, 40);
  log('pick prompt', JSON.stringify({ caption: pp.caption, placeholder: pp.placeholder, cursor: pp.cursor }));
  let pos = await page.evaluate(() => window.__theatre.pieces.reveal.fanScreenPositions());
  log('fan on screen', pos.length, 'cards; first', JSON.stringify(pos[0]), 'last', JSON.stringify(pos[pos.length - 1]));
  await page.mouse.move(pos[5].x, pos[5].y, { steps: 6 });
  await page.waitForTimeout(500);
  const hov = await state();
  log('hover cursor', hov.cursor);
  await shot('fan-hover');
  await page.mouse.down();
  await page.mouse.up();
  const p1 = await until('pick 1', (s) => s.picks.length === 1, 20);
  log('pick 1', JSON.stringify(p1.picks));
  await shot('pick1');

  // the second: another click, far side of the fan
  await until('the second prompt', (s) => s.field && s.picks.length === 1, 30);
  pos = await page.evaluate(() => window.__theatre.pieces.reveal.fanScreenPositions());
  const idx2 = Math.min(pos.length - 1, 14);
  await page.mouse.move(pos[idx2].x, pos[idx2].y, { steps: 6 });
  await page.waitForTimeout(400);
  await page.mouse.down();
  await page.mouse.up();
  const p2 = await until('pick 2', (s) => s.picks.length === 2, 20);
  log('pick 2', JSON.stringify(p2.picks));
  await shot('pick2');

  // the third: named
  const p3p = await until('the third prompt', (s) => s.field && s.picks.length === 2, 30);
  log('third prompt', JSON.stringify({ caption: p3p.caption, placeholder: p3p.placeholder }));
  pos = await page.evaluate(() => window.__theatre.pieces.reveal.fanScreenPositions());
  const remaining = pos.length;
  await page.keyboard.type('the second from the right', { delay: 25 });
  await shot('pick3-typed');
  await page.keyboard.press('Enter');
  const p3 = await until('pick 3', (s) => s.picks.length === 3, 20);
  log('pick 3', JSON.stringify(p3.picks), `(fan had ${remaining} cards; the second from the right is ordinal ${remaining - 1} of the remaining, if ordinals count from 1 at the left)`);
  await shot('pick3');
  await reach('dealt', 'dealt', (s) => s.shot === 'table');

  // 5. chapter three; the readings — the first turn as a sheet
  const ch3 = await until('chapter three', (s) => (s.title && s.beat === 'dealt') || at(s) > 7, 60);
  if (ch3.title) await shot('chapter3'); else note('chapter three: passed before a still');
  await until('the first turn', (s) => s.beat === 'reading' || at(s) > 8, 60);
  await sheet('turn-sheet', 3.0);
  for (let i = 0; i < 3; i++) {
    const ins = await until(`insert ${i}`, (s) => s.shot === `card${i}` || at(s) > 8 || s.shot === `card${i + 1}`, 90);
    if (ins.shot !== `card${i}`) {
      note(`card ${i}: the insert had passed (now ${ins.shot}/${ins.beat})`);
      continue;
    }
    log(`card ${i} insert`, JSON.stringify({ caption: ins.caption, inter: ins.inter }));
    await shot(`reading${i}-insert`);
    const line = await until(`reading ${i} line`, (s) => s.shot !== `card${i}` || (s.caption && !s.inter), 60);
    if (line.shot === `card${i}`) {
      await shot(`reading${i}-line`);
      log(`card ${i} line`, JSON.stringify({ caption: line.caption }));
    }
    const back = await until(`reading ${i} back`, (s) => s.shot === 'pepe' || s.shot === 'table' || at(s) > 8, 60);
    if (back.shot === 'pepe') {
      await shot(`reading${i}-pepe`);
      log(`card ${i} pepe`, JSON.stringify({ caption: back.caption }));
    }
  }

  // 6. the follow-up, the farewell, the door, the end
  const fu = await until('the follow-up field', (s) => s.beat === 'followup' && s.field, 120);
  log('followup', JSON.stringify({ caption: fu.caption, placeholder: fu.placeholder }));
  await shot('followup-prompt');
  await page.keyboard.type('Which one matters most?', { delay: 25 });
  await shot('followup-typed');
  await page.keyboard.press('Enter');
  const fr = await until('the follow-up reply', (s) => (s.beat === 'followup' && s.caption && !s.field) || at(s) > 9, 30);
  if (fr.beat === 'followup') {
    log('followup reply', JSON.stringify({ caption: fr.caption }));
    await shot('followup-reply');
  } else note('follow-up reply: passed before a still');
  await reach('farewell', 'farewell', (s) => !!s.caption);
  const ep = await until('the epilogue card', (s) => (s.title && s.beat === 'farewell') || at(s) > 10, 60);
  if (ep.title) { log('epilogue', ep.titleText); await shot('epilogue'); } else note('epilogue card: passed before a still');
  const door = await until('the door', (s) => (!s.title && s.shot === 'door') || at(s) > 10, 30);
  if (door.shot === 'door' && !door.title) await shot('door'); else note('door shot: passed before a still');
  const end = await until('the closing card', (s) => s.beat === 'closing' && s.title, 40);
  log('closing', end.titleText);
  await page.waitForTimeout(800);
  await shot('closing');
  transcript.push(...(await page.evaluate(() => (window.__theatre.pieces.mind?.history ?? []).map((h) => `${h.role}: ${h.text}`))));
  // wait on the closing card: does it hold, or does it move on by itself?
  await page.waitForTimeout(6000);
  const still = await state();
  log('closing after 6 s more', JSON.stringify({ beat: still.beat, title: still.titleText }));
  await page.mouse.click(800, 450);
  const again = await until('the title again', (s) => s.beat === 'title' && s.title && s.drawn === 0, 30);
  log('again', JSON.stringify({ title: again.titleText, drawn: again.drawn }));
  await shot('again');
} catch (e) {
  errors.push(`VISIT: ${e.message}`);
  await shot('FAILED').catch(() => {});
}
polling = false;
await page.waitForTimeout(200);
await browser.close();

// ---- the report --------------------------------------------------------------------------------------
console.log('\nTIMELINE (t, hold, beat / shot / what is on screen)');
for (let i = 0; i < timeline.length; i++) {
  const e = timeline[i], n = timeline[i + 1];
  const hold = n ? (n.t - e.t).toFixed(1) : '-';
  const what = e.title ? `TITLE "${e.title}"` : e.caption ? `${e.inter ? 'INTER ' : ''}"${e.caption}"` : e.field ? '(field)' : '';
  console.log(`  ${e.t.toFixed(1).padStart(6)}s  ${String(hold).padStart(5)}s  ${String(e.beat).padEnd(9)} ${String(e.shot).padEnd(6)} ${what}`);
}
const stalls = timeline.filter((e, i) => timeline[i + 1] && timeline[i + 1].t - e.t > 15 && !e.field);
if (stalls.length) console.log('\nSTALLS > 15 s (no change on screen, no field waiting):\n' + stalls.map((e) => `  ${e.t.toFixed(1)}s ${e.beat}/${e.shot} "${e.caption ?? e.title ?? ''}"`).join('\n'));
console.log('\nSHOTS (mean luminance 0-255; a black frame is < 40)');
for (const s of shots) console.log(`  ${s.name.padEnd(18)} ${s.sheet ? `sheet, ${s.painted} painted frames, gaps ${s.gaps.join('/')}` : `mean ${s.mean} (${s.cost} ms)`}`);
if (overlaps.size) console.log('\nDOM OVERLAPS:\n' + [...overlaps].map((o) => '  ' + o).join('\n'));
if (notes.length) console.log('\nNOTES:\n' + notes.map((n) => '  ' + n).join('\n'));
console.log('\nTRANSCRIPT (the mind)\n' + (transcript.length ? transcript.map((l) => '  ' + l).join('\n') : '  (none)'));
if (warnings.length) console.log('\nflow warnings:\n' + warnings.map((w) => ' - ' + w).join('\n'));
if (consoleErrors.length) console.log('\nCONSOLE ERRORS:\n' + consoleErrors.map((e) => ' - ' + e).join('\n'));
if (errors.length) {
  console.error('\nPAGE / VISIT ERRORS:\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(2);
}
console.log(`\nok in ${secs()}s; shots in ${outDir} as ${prefix}-*.png`);
