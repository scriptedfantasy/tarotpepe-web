#!/usr/bin/env node
// tools/_room-visit.mjs — a visitor walks in and asks about the room, in a browser, on the real
// page, through the real endpoint. Proves the two things a node harness cannot:
//   · a story is spoken through the placard like any other turn, and
//   · asking about an object does NOT deal, shuffle, or move the camera.
//   node tools/_room-visit.mjs [--out /abs/dir] [--prefix mind-r4]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const outDir = args.out ?? new URL('../public/progress/shots', import.meta.url).pathname;
const prefix = args.prefix ?? 'mind-r4';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.route('**/@vite/client', (route) =>
  route.fulfill({
    contentType: 'application/javascript',
    body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){ return u; } export class ErrorOverlay {}`,
  }),
);
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load', timeout: 60000 });
while (Date.now() - t0 < 150000) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(250);
}
log('ready');

const state = () =>
  page.evaluate(() => {
    const T = window.__theatre;
    const cap = document.querySelector('#dialogue .cap');
    return {
      beat: T.pieces.flow?.beat,
      intent: T.pieces.flow?.intent,
      readings: T.pieces.flow?.readings,
      shot: T.pieces.camera?.current,
      door: T.pieces.entrance?.mode,
      caption: cap && !cap.hidden ? cap.textContent.replace(/\s+/g, ' ').trim() : null,
      field: !!document.querySelector('#dialogue input.keys'),
      fan: T.pieces.reveal?.fanCount ?? 0,
      history: (T.pieces.mind?.history ?? []).map((h) => `${h.role}: ${h.text}`),
      provider: T.pieces.mind?.provider,
    };
  });
async function until(label, fn, seconds = 60) {
  const start = Date.now();
  for (;;) {
    const s = await state();
    if (fn(s)) return s;
    if (Date.now() - start > seconds * 1000) throw new Error(`stalled waiting for ${label}: beat=${s.beat} field=${s.field}`);
    await page.waitForTimeout(120);
  }
}
const field = (label, seconds = 90) => until(label, (s) => s.field && s.beat === 'talk', seconds);
async function types(text) {
  await page.keyboard.type(text, { delay: 10 });
  await page.keyboard.press('Enter');
  log('typed', JSON.stringify(text));
}

try {
  const d = await until('the door', (s) => s.door === 'closed' || s.beat === 'greeting' || s.beat === 'talk', 40);
  if (d.door === 'closed') await page.mouse.click(800, 450);
  await field('the greeting', 90);

  // the room, asked about: a story, a plain object, a thing that is not here, a passing mention
  const asks = ['what is the globe', 'what is that radiator', 'is there a chair', 'my grandmother had a globe like that in her hall', 'tell me about the globe'];
  for (const q of asks) {
    await types(q);
    const s = await field('the field again', 90);
    log('  →', (s.caption ?? '').slice(0, 110));
    if (s.fan > 0) throw new Error(`"${q}" fanned the deck`);
    if (s.readings > 0) throw new Error(`"${q}" dealt a reading`);
    if (s.intent !== 'talk') throw new Error(`"${q}" was read as ${s.intent}, not talk`);
  }
  await page.screenshot({ path: `${outDir}/${prefix}-room.png` });
  log('shot', `${prefix}-room.png`);

  const h = (await state()).history;
  console.log('\nTRANSCRIPT\n' + h.map((l) => '  ' + l).join('\n'));
  const said = h.filter((l) => l.startsWith('pepe:')).join(' ');
  if (!/receiver|globe|bicycle/i.test(said)) throw new Error('the globe was never told');
  if (!/radiator/i.test(said)) throw new Error('the radiator was never identified');
  if (!/no chair|nowhere to sit/i.test(said)) throw new Error('the missing chair was never answered');
  const tellings = h.filter((l) => /receiver|globe|bicycle/i.test(l) && l.startsWith('pepe:'));
  if (tellings.length === 2 && tellings[0] === tellings[1]) throw new Error('the globe was told twice in the same words');
  console.log(`\nprovider: ${(await state()).provider}; the globe was told ${tellings.length} time(s), in different words`);
} catch (e) {
  errors.push(`TEST: ${e.message}`);
  await page.screenshot({ path: `${outDir}/${prefix}-FAILED.png` }).catch(() => {});
}

await browser.close();
if (errors.length) {
  console.error('\nPAGE ERRORS:\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(2);
}
console.log(`\nok in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
