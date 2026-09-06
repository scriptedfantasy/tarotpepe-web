#!/usr/bin/env node
// Drive a real visit and ask to see the cards again. Enters by the door, asks for a reading, takes
// the three picks, and then says whatever is passed in --say (| separated), logging the intent the
// mind read and where the camera went for it. Screenshots the revisit.
//   node tools/_flow-recall.mjs --say "show me my cards again" --out /tmp/x.png [--width 1600 --height 900]
//   node tools/_flow-recall.mjs --nocards --say "what did i draw"     (never asks for a reading)
//   node tools/_flow-recall.mjs --tap                                  (clicks a laid card instead)
import { chromium } from 'playwright';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const width = +(args.width ?? 1600), height = +(args.height ?? 900);
const lines = String(args.say ?? '').split('|').filter(Boolean);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.route('**/@vite/client', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}' }),
);
const say = (s) => console.log(s);
await page.goto('http://127.0.0.1:5173/?mute=1', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
await page.waitForFunction("window.__theatre?.pieces?.entrance?.mode === 'closed'", null, { timeout: 120000 });
await page.mouse.click(width / 2, height / 2); // in
const state = () =>
  page.evaluate(() => {
    const T = window.__theatre;
    return {
      beat: T.pieces.flow.beat,
      intent: T.pieces.flow.intent,
      readings: T.pieces.flow.readings,
      shot: T.pieces.camera.current,
      picks: T.pieces.reveal.picks?.length ?? 0,
      asking: !!T.pieces.dialogue.asking,
      caption: (document.querySelector('#dialogue .well')?.textContent ?? document.querySelector('#dialogue')?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 150),
    };
  });
const until = async (fn, ms, what) => {
  const t0 = Date.now();
  for (;;) {
    const s = await state();
    if (fn(s)) return s;
    if (Date.now() - t0 > ms) throw new Error(`timed out waiting for ${what} (beat=${s.beat} shot=${s.shot} picks=${s.picks})`);
    await page.waitForTimeout(250);
  }
};
const field = '#dialogue input.keys';
async function type(text) {
  await page.waitForSelector(field, { timeout: 90000, state: 'attached' });
  await page.waitForTimeout(250);
  await page.fill(field, text);
  await page.keyboard.press('Enter');
  say(`  visitor: "${text}"`);
}
// a laid card's centre on screen
const cardScreen = (i) =>
  page.evaluate((k) => {
    const T = window.__theatre;
    const p = T.pieces.reveal.picks?.[k];
    if (!p?.mesh) return null;
    const v = p.mesh.getWorldPosition(p.mesh.position.clone());
    v.project(T.camera);
    const r = T.renderer.domElement.getBoundingClientRect();
    return { x: ((v.x + 1) / 2) * r.width + r.left, y: ((1 - v.y) / 2) * r.height + r.top, slug: p.slug };
  }, i);

// the shot log
await page.evaluate(() => {
  window.__log = [];
  window.__int = setInterval(() => {
    const T = window.__theatre;
    const row = `${T.pieces.flow.beat}|${T.pieces.camera.current}`;
    if (window.__log[window.__log.length - 1]?.[1] !== row) window.__log.push([+T.clock.raw.toFixed(2), row]);
  }, 80);
});

try {
  await until((s) => s.asking, 90000, 'the first open field');
  say(`  he opened with: ${(await state()).caption}`);
  if (!args.nocards) {
    await type('read my cards');
    await until((s) => s.beat === 'fan' || s.picks > 0, 90000, 'the fan');
    // the visitor's three picks, taken as fast as the piece allows
    for (let k = 0; k < 3; k++) {
      await until((s) => s.picks === k, 60000, `pick ${k + 1}`);
      await page.waitForTimeout(600);
      await page.evaluate(() => window.__theatre.pieces.reveal.pickRandom());
      await page.waitForTimeout(400);
    }
    say('  three cards taken');
    await until((s) => s.readings >= 1 && s.asking, 240000, 'the reading to end');
    const s = await state();
    say(`  the reading is over: ${s.picks} cards down, shot=${s.shot}`);
    say(`  he said: ${s.caption}`);
  }
  // "show me the <name of the card that is actually on the table>": the one phrasing that has to
  // go through cardRef, and it cannot be written down in advance because the deck is shuffled.
  if (args.byname) {
    const k = Math.max(0, Math.min(2, +args.byname || 1));
    const name = await page.evaluate((i) => window.__theatre.pieces.mind.spread?.[i]?.name ?? null, k);
    if (name) {
      lines.unshift(`show me ${/^the /i.test(name) ? '' : 'the '}${name.toLowerCase()}`);
      say(`  the ${['first', 'second', 'third'][k]} card is ${name}`);
    } else say('  MIND HAS NO SPREAD: cannot ask by name');
  }
  const outs = String(args.out ?? '').split(',').filter(Boolean);
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    args.out = outs[li] ?? null;
    if (li === 1 && args.phone) {
      await page.setViewportSize({ width: 390, height: 760 });
      await page.waitForTimeout(1200);
      say('  the window is a phone now: 390x760');
    }
    await until((s) => s.asking, 120000, 'the open field');
    await type(line);
    await page.waitForTimeout(2500);
    const s = await state();
    say(`    → intent=${s.intent} beat=${s.beat} shot=${s.shot} picks=${s.picks}`);
    // the frame in the middle of the digression: the row again, with his line under it
    if (args.out && s.beat === 'recall') {
      // All three: the pass runs spread → card0 → card1 → card2 → spread, and the frame worth
      // having is the LAST one, where he is talking over the row. One card: the insert itself.
      const want = (String(args.frame ?? '').split(',')[li] ?? 'spread').trim();
      let seenCard = 0;
      for (let n = 0; n < 500; n++) {
        const q = await state();
        if (q.beat !== 'recall') break;
        if (/^card\d/.test(q.shot)) seenCard = seenCard || Date.now();
        const ready = want === 'spread' ? seenCard && q.shot === 'spread' : seenCard && Date.now() - seenCard > 1800;
        if (ready) {
          await page.waitForTimeout(q.shot === 'spread' ? 1700 : 700);
          const r = await state();
          if (r.beat === 'recall') {
            await page.screenshot({ path: args.out });
            say(`  wrote ${args.out}  (shot=${r.shot}) "${r.caption}"`);
            args.out = null;
          }
          break;
        }
        await page.waitForTimeout(150);
      }
    }
    // let the digression play out
    await until((t) => t.asking, 150000, 'the field again');
    const t = await state();
    say(`    ← back at the field: shot=${t.shot} beat=${t.beat}`);
    say(`      he said: ${t.caption}`);
  }
  if (args.tap) {
    await until((s) => s.asking, 60000, 'the open field');
    const at = await cardScreen(1);
    if (!at) throw new Error('no laid card to tap');
    say(`  a finger on the middle card (${at.slug}) at ${Math.round(at.x)},${Math.round(at.y)}`);
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(2500);
    const s = await state();
    say(`    → beat=${s.beat} shot=${s.shot} intent=${s.intent}`);
    if (args.out) {
      await page.waitForTimeout(1500);
      await page.screenshot({ path: args.out });
      say(`  wrote ${args.out}`);
    }
    await until((t) => t.asking, 120000, 'the field again');
    say(`    ← back at the field: shot=${(await state()).shot}`);
  } else if (args.out) {
    await page.screenshot({ path: args.out });
    say(`  wrote ${args.out}`);
  }
} catch (e) {
  say('  STOPPED: ' + e.message);
}
const log = await page.evaluate(() => {
  clearInterval(window.__int);
  return window.__log;
});
say('the evening, beat by shot:');
let t0 = log[0]?.[0] ?? 0;
for (const [t, row] of log) say(`   +${(t - t0).toFixed(1)}s  ${row}`);
await browser.close();
if (errors.length) say('PAGE ERRORS:\n' + errors.join('\n'));
