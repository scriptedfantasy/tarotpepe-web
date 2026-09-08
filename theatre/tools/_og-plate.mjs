// _og-plate — the card a link to the room shows on WhatsApp, X and the rest: the wide plate, the
// room from the door as a visitor first sees it, written to public/og.jpg at the 1200 x 630 the
// previews want (JPEG, under 300 KB so WhatsApp will show it). The user: "can you make this image
// the image we use in the preview on whatsapp, x and other social media?"
//
//   node tools/_og-plate.mjs            (dev server on 5173)
//
// The plate is composed for the window it is given, and a 1.9:1 window is a wider room than the
// user's own frame of it (a laptop, about 3:2, the far wall filling the width). So the room is shot
// in the 3:2 window and the card is cut out of the middle of that — the chandelier's stem and the
// rug's fringe go, Pepe and the sign stay their size.
//
// The capture is _p7-shot.mjs's: the Vite client stubbed out, the theatre's own ready flag waited
// for, the #stage element shot after the pen has settled.
import { chromium } from 'playwright';
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = new URL('../public/', import.meta.url).pathname;
const W = 1200, H = 630, SHOT_H = 800;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: SHOT_H } });
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.route('**/@vite/client', (route) =>
  route.fulfill({
    contentType: 'application/javascript',
    body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){ return u; } export class ErrorOverlay {}`,
  }),
);
await page.goto(`${BASE}/?view=camera&state=wide&shot=1`, { waitUntil: 'load', timeout: 60000 });
const t0 = Date.now();
while (Date.now() - t0 < 120000) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(200);
}
await page.waitForTimeout(1200);
const png = await page.locator('#stage').screenshot({ type: 'png' });
await browser.close();
let q = 88, jpg;
for (;;) {
  jpg = await sharp(png).resize(W, H, { fit: 'cover', position: 'centre' }).jpeg({ quality: q, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer();
  if (jpg.length < 290 * 1024 || q <= 60) break;
  q -= 4;
}
writeFileSync(`${OUT}og.jpg`, jpg);
writeFileSync(`${OUT}progress/og-plate.png`, png);
console.log(`og.jpg ${W}x${H} (cut from ${W}x${SHOT_H}) q${q} ${(jpg.length / 1024).toFixed(0)} KB; proof public/progress/og-plate.png`);
