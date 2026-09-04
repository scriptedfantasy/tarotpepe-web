#!/usr/bin/env node
// throwaway (flow round 2): play the evening as a visitor as far as the first pick, then TRACE the
// shot the camera is on every 100 ms and screenshot the reaction the moment the film cuts to him.
//   node tools/_flow-react.mjs [--out /abs/file.png]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const out = args.out ?? '/tmp/camr2/flow-r2.png';
mkdirSync(dirname(out), { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.route('**/@vite/client', (route) =>
  route.fulfill({ contentType: 'application/javascript', body: 'export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data:{} }; }\nexport function updateStyle(){}\nexport function removeStyle(){}\nexport function injectQuery(u){return u;}\nexport class ErrorOverlay {}' }),
);
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load', timeout: 60000 });
for (;;) {
  const ok = await page.evaluate(() => window.__theatreReady === true).catch(() => false);
  if (ok || Date.now() - t0 > 150000) break;
  await page.waitForTimeout(200);
}
log('ready');
const state = () =>
  page.evaluate(() => ({
    beat: window.__theatre.pieces.flow?.beat,
    shot: window.__theatre.pieces.camera?.current,
    picks: (window.__theatre.pieces.reveal?.picks ?? []).length,
    fan: window.__theatre.pieces.reveal?.fanCount ?? 0,
    field: !!document.querySelector('#dialogue input.keys'),
    raw: +window.__theatre.clock.raw.toFixed(2),
    frame: window.__theatre.clock.frame,
    cap: (() => {
      const c = document.querySelector('#dialogue .cap');
      return c && !c.hidden ? c.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) : null;
    })(),
  }));
async function until(label, fn, seconds = 90) {
  const start = Date.now();
  for (;;) {
    const s = await state();
    if (fn(s)) return s;
    if (Date.now() - start > seconds * 1000) {
      const again = await state();
      throw new Error(`stalled at ${label}: ${JSON.stringify(s)}\n  and a moment later: ${JSON.stringify(again)}`);
    }
    await page.waitForTimeout(100);
  }
}
try {
  await until('title', (s) => s.beat === 'title', 40);
  await page.keyboard.press('Enter');
  await until('the question field', (s) => s.beat === 'question' && s.field, 90);
  await page.keyboard.type('I keep starting things and not finishing them.', { delay: 10 });
  await page.keyboard.press('Enter');
  await until('the fan laid', (s) => s.beat === 'fan' && s.fan >= 21, 200);
  await until('the pick prompt', (s) => s.field, 90);
  const pos = await page.evaluate(() => window.__theatre.pieces.reveal.fanScreenPositions());
  await page.mouse.move(pos[6].x, pos[6].y, { steps: 4 });
  await page.waitForTimeout(300);
  await page.mouse.down();
  await page.mouse.up();
  const tPick = Date.now();
  log('clicked the seventh card');
  // trace every 100 ms: which shot, how long since the pick
  let shot = null, shotAt = tPick, shots = [];
  let taken = false;
  for (;;) {
    const s = await state();
    if (s.shot !== shot) {
      if (shot) shots.push([shot, ((Date.now() - shotAt) / 1000).toFixed(2)]);
      shot = s.shot;
      shotAt = Date.now();
      log(`cut to ${shot}  (+${((Date.now() - tPick) / 1000).toFixed(2)}s from the click)`);
    }
    if (shot === 'pepe' && !taken) {
      taken = true;
      await page.screenshot({ path: out });
      log('shot the reaction ->', out);
    }
    if (Date.now() - tPick > 12000) break;
    await page.waitForTimeout(100);
  }
  shots.push([shot, ((Date.now() - shotAt) / 1000).toFixed(2)]);
  console.log('held:', shots.map(([n, s]) => `${n} ${s}s`).join(' · '));
} catch (e) {
  errors.push('TEST: ' + e.message);
}
await browser.close();
if (errors.length) {
  console.error('PAGE ERRORS:\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(2);
}
