#!/usr/bin/env node
// A real visit, not a judging state: load the page as a visitor does, click the door, and log what
// the lens does every 100 ms — which shot the camera piece thinks it is holding, where it stands
// and how wide it is — so the arrival can be read as a timeline instead of guessed at.
//   node tools/_ent-visit.mjs [--width 1600 --height 900] [--seconds 10] [--leave 12]
import { chromium } from 'playwright';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const width = +(args.width ?? 1600), height = +(args.height ?? 900);
const seconds = +(args.seconds ?? 10);
const leaveAt = args.leave ? +args.leave : null;
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
// other builders are editing files: a full reload mid-visit would wipe the log
await page.route('**/@vite/client', (route) =>
  route.fulfill({ contentType: 'application/javascript', body: 'export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }\nexport function updateStyle(){}\nexport function removeStyle(){}\nexport function injectQuery(u){ return u; }\nexport class ErrorOverlay {}' }),
);
await page.goto('http://127.0.0.1:5173/?mute=1', { waitUntil: 'load', timeout: 60000 });
const t0 = Date.now();
while (Date.now() - t0 < 150000) {
  let ok = false;
  try { ok = await page.evaluate(() => window.__theatreReady === true); } catch {}
  if (ok) break;
  await page.waitForTimeout(200);
}
// the door goes up when flow's evening reaches it (after cards.place settles); wait for it
const tDoor = Date.now();
while (Date.now() - tDoor < 60000) {
  let m = '';
  try { m = await page.evaluate(() => window.__theatre.pieces.entrance.mode); } catch {}
  if (m === 'closed') break;
  await page.waitForTimeout(200);
}
console.log(`the door is up ${((Date.now() - tDoor) / 1000).toFixed(1)}s after the page was ready; entrance.mode = ` + (await page.evaluate(() => window.__theatre.pieces.entrance.mode)));
await page.evaluate(() => {
  window.__log = [];
  const T = window.__theatre;
  const tick = () => {
    const c = T.camera, C = T.pieces.camera;
    window.__log.push([+T.clock.raw.toFixed(2), C.current, +c.position.z.toFixed(3), +c.position.y.toFixed(3), +c.fov.toFixed(2), T.pieces.entrance.mode, !!document.querySelector('#entrance.up')]);
  };
  window.__int = setInterval(tick, 100);
});
await page.mouse.click(width / 2, height / 2);
if (leaveAt) {
  await page.waitForTimeout(leaveAt * 1000);
  await page.evaluate(() => window.__theatre.emit('help:leave', {}));
  await page.waitForTimeout(6000);
} else await page.waitForTimeout(seconds * 1000);
const log = await page.evaluate(() => { clearInterval(window.__int); return window.__log; });
const end = await page.evaluate(() => {
  const T = window.__theatre;
  return { entrance: T.pieces.entrance.mode, flowBeat: T.pieces.flow.beat, readings: T.pieces.flow.readings, shot: T.pieces.camera.current, sheet: !!document.querySelector('#entrance.up') };
});
console.log('at the end: ' + JSON.stringify(end));
await browser.close();
const t00 = log[0][0];
let prev = null;
for (const row of log) {
  const key = `${row[1]}|${row[2]}|${row[3]}|${row[4]}|${row[5]}|${row[6]}`;
  if (key === prev) continue;
  prev = key;
  console.log(`  +${(row[0] - t00).toFixed(2)}s  shot=${row[1].padEnd(7)} z=${row[2]} y=${row[3]} fov=${row[4]}  entrance=${row[5]}${row[6] ? ' (sheet up)' : ''}`);
}
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
