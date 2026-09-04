// throwaway: is the page's frame loop stopping during a visit, and when?
//   node tools/_freeze.mjs [--key 1] [--seconds 90]
// polls the clock every 400 ms and prints every gap longer than 1.5 s.
import { chromium } from 'playwright';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const seconds = +(args.seconds ?? 90);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e).slice(0, 200)));
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && console.log(m.type().toUpperCase(), m.text().slice(0, 200)));
await page.route('**/@vite/client', (route) => route.fulfill({ contentType: 'application/javascript', body: 'export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data:{} }; }\nexport function updateStyle(){}\nexport function removeStyle(){}\nexport function injectQuery(u){return u;}\nexport class ErrorOverlay {}' }));
const t0 = Date.now();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load', timeout: 60000 });
for (;;) {
  const ok = await page.evaluate(() => window.__theatreReady === true).catch(() => false);
  if (ok || Date.now() - t0 > 120000) break;
  await page.waitForTimeout(200);
}
console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ready; key=${args.key ?? 'no'}`);
if (args.key) {
  await page.keyboard.press('Enter');
  console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] pressed Enter (this is what starts the sound)`);
}
let lastWall = Date.now();
const end = Date.now() + seconds * 1000;
while (Date.now() < end) {
  const before = Date.now();
  const s = await page
    .evaluate(() => ({ raw: +window.__theatre.clock.raw.toFixed(2), beat: window.__theatre.pieces.flow?.beat, shot: window.__theatre.pieces.camera?.current }))
    .catch((e) => ({ err: String(e).slice(0, 60) }));
  const gap = (Date.now() - before) / 1000;
  if (gap > 1.5) console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] the page did not answer for ${gap.toFixed(1)}s — ${JSON.stringify(s)}`);
  else if (Date.now() - lastWall > 9000) {
    lastWall = Date.now();
    console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${JSON.stringify(s)}`);
  }
  await page.waitForTimeout(400);
}
console.log('done');
await browser.close();
