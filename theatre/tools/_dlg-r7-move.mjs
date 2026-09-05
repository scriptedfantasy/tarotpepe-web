#!/usr/bin/env node
// scratch (dialogue r7): watch the caption card move between the foot and the head of the frame.
// Stands a card up in the fan beat (docked), takes the three picks, and samples the card's top edge
// every frame so the re-lay can be counted: it should be three drawings on the twos, not a slide.
import { chromium } from 'playwright';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const width = +(args.width ?? 390), height = +(args.height ?? 760);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.route('**/@vite/client', (route) =>
  route.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){ return u; } export class ErrorOverlay {}` }),
);
const t0 = Date.now();
// --up: start in the talk beat (the card at the foot, the shot on `home`) and cut to the fan, to
// see the dock happen on the camera cut. Default: start docked and take the three picks.
await page.goto(`http://127.0.0.1:5173/?view=flow&state=${args.up ? 'talk' : 'fan'}&shot=1`, { waitUntil: 'load', timeout: 60000 });
while (Date.now() - t0 < 150000) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(250);
}
await page.waitForTimeout(3000);

await page.evaluate((up) => (window.__up = up), args.up === 'true');
const trace = await page.evaluate(async () => {
  const P = window.__theatre.pieces;
  const cap = document.querySelector('#dialogue .cap:not(.ruler)');
  const mic = document.querySelector('#dialogue .mic');
  const log = [];
  let stop = false;
  const sample = (tag) => {
    const r = cap && !cap.hidden ? cap.getBoundingClientRect() : null;
    const m = mic && !mic.hidden ? mic.getBoundingClientRect() : null;
    log.push({
      f: window.__theatre.clock.frame, tag,
      top: r ? +r.top.toFixed(1) : null, h: r ? +r.height.toFixed(1) : null, w: r ? +r.width.toFixed(1) : null,
      shot: P.camera?.current, picks: P.reveal?.picks?.length ?? 0, mic: m ? +m.top.toFixed(1) : null,
    });
  };
  const loop = () => { if (stop) return; sample(''); requestAnimationFrame(loop); };
  loop();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(500);
  if (window.__up) {
    sample('at the foot, shot=home');
    await P.reveal.fan();
    sample('the fan is out');
    P.camera.cut('fan'); // the cut flow makes when the spread comes out
    sample('cut to fan');
    await sleep(6000);
    stop = true;
    const out0 = [];
    for (const e of log) { const p = out0[out0.length - 1]; if (!p || e.tag || p.top !== e.top || p.shot !== e.shot) out0.push(e); }
    return out0;
  }
  sample('before pick 1');
  for (let k = 0; k < 3; k++) {
    await P.reveal.pickRandom();
    sample(`pick ${k + 1} landed`);
    await sleep(700);
  }
  sample('three taken');
  await sleep(6000);
  stop = true;
  // thin the trace: only the frames where something changed
  const out = [];
  for (const e of log) {
    const p = out[out.length - 1];
    if (!p || e.tag || p.top !== e.top || p.picks !== e.picks || p.shot !== e.shot) out.push(e);
  }
  return out;
});
await browser.close();
for (const e of trace) console.log(`f${String(e.f).padStart(5)}  top=${String(e.top).padStart(7)}  h=${e.h}  w=${e.w}  shot=${e.shot}  picks=${e.picks}  mic=${e.mic}  ${e.tag}`);
if (errors.length) console.error('PAGE ERRORS:\n' + errors.map((e) => ' - ' + e).join('\n'));
