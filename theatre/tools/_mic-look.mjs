// throwaway: look at the microphone prop in its three states (off / voice on / listening).
import { chromium } from 'playwright';
import sharp from 'sharp';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://127.0.0.1:5173/?view=dialogue&state=question&shot=1', { waitUntil: 'load', timeout: 60000 });
const t0 = Date.now();
while (Date.now() - t0 < 150000) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(250);
}
await page.waitForTimeout(2500);
const box = await page.evaluate(() => {
  const m = document.querySelector('#dialogue .mic');
  const r = m.getBoundingClientRect();
  return { x: Math.round(r.left - 40), y: Math.round(r.top - 20), width: Math.round(r.width + 80), height: Math.round(r.height + 60) };
});
const shots = [];
for (const cls of ['', 'on', 'on listening']) {
  await page.evaluate((c) => {
    const m = document.querySelector('#dialogue .mic');
    m.className = 'mic' + (c ? ' ' + c : '');
  }, cls);
  await page.waitForTimeout(300);
  shots.push(await page.screenshot({ clip: box }));
}
const tiles = await Promise.all(shots.map((b) => sharp(b).resize(box.width * 3).png().toBuffer()));
const meta = await sharp(tiles[0]).metadata();
await sharp({ create: { width: meta.width * 3, height: meta.height, channels: 3, background: '#fff' } })
  .composite(tiles.map((input, i) => ({ input, left: i * meta.width, top: 0 })))
  .png()
  .toFile('/tmp/mic-states.png');
console.log('wrote /tmp/mic-states.png', box, errors);
await browser.close();
