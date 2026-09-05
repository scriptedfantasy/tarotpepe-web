// throwaway (camera round 9): how tall is the caption's placard when it docks to the TOP for the
// picking beat, and what does it land on? Prints the card's box as a fraction of the frame.
//   node tools/_cam-r9-cap.mjs [w] [h] [picks]
import { chromium } from 'playwright';

const W = +(process.argv[2] ?? 390), H = +(process.argv[3] ?? 760), PICKS = +(process.argv[4] ?? 0);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=reveal&state=fan&shot=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
await page.waitForTimeout(1200);
if (PICKS) {
  await page.evaluate((n) => {
    const R = window.__theatre.pieces.reveal, f = R._fan;
    const idx = [f.keystoneIndex, f.keystoneIndex + 6, f.keystoneIndex - 6].slice(0, n);
    f.fakePicks(idx);
    for (let i = R.picks.length; i < n; i++) R.picks.push({ index: idx[i], ordinal: i + 1, slug: 'x', slot: i, mesh: null });
  }, PICKS);
  await page.waitForTimeout(1200);
}
await page.evaluate(() => window.__theatre.pieces.dialogue.say('Take one. Do not think about it too long; the deck is patient but the evening is not.', { hold: 60, keep: true }));
await page.waitForTimeout(2500);
const out = await page.evaluate(() => {
  const cap = document.querySelector('#dialogue .cap');
  if (!cap || cap.hidden) return { none: true };
  const r = cap.getBoundingClientRect();
  const H = window.innerHeight, W = window.innerWidth;
  return {
    top: +(r.top / H).toFixed(4), bottom: +(r.bottom / H).toFixed(4), h: +(r.height / H).toFixed(4),
    left: +(r.left / W).toFixed(4), right: +(r.right / W).toFixed(4),
    px: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`,
    current: window.__theatre.pieces.camera.current,
    picks: window.__theatre.pieces.reveal.picks.length,
  };
});
console.log(`${W}x${H} picks=${PICKS}`, JSON.stringify(out));
await browser.close();
