#!/usr/bin/env node
// Is Pepe in the ink pass's LIT buffer? Move him downstage over the table and watch the pixel.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 800, height: 450 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(150000);
page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));
await page.goto('http://127.0.0.1:5173/?view=ink&state=debug-lit&shot=1', { waitUntil: 'load' });
await page.waitForFunction('window.__theatreReady === true', { timeout: 90000 });
await page.waitForTimeout(1200);

const read = () => page.evaluate(() => {
  const c = document.querySelector('canvas');
  const g = document.createElement('canvas');
  g.width = c.width; g.height = c.height;
  const x = g.getContext('2d');
  x.drawImage(c, 0, 0);
  const px = (a, b) => { const d = x.getImageData(Math.round(a * c.width / 800), Math.round(b * c.height / 450), 1, 1).data; return +((d[0] * 0.2126 + d[1] * 0.7152 + d[2] * 0.0722) / 255).toFixed(3); };
  return { chest: px(400, 280), table: px(400, 360), wall: px(430, 150) };
});
console.log('base      ', JSON.stringify(await read()));
console.log('found pepe', await page.evaluate(() => {
  const p = window.__theatre.scene.getObjectByName('pepe');
  if (!p) return 'NO';
  p.position.z = 1.6; p.position.y = 0.5;
  p.traverse((o) => { o.frustumCulled = false; });
  return 'yes';
}));
await page.waitForTimeout(900);
console.log('moved     ', JSON.stringify(await read()));
await page.evaluate(() => {
  const p = window.__theatre.scene.getObjectByName('pepe');
  p.traverse((o) => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { m.side = 2; m.needsUpdate = true; }); } });
});
await page.waitForTimeout(900);
console.log('doubleside', JSON.stringify(await read()));
await browser.close();
