// throwaway (camera round 9): the picking beat, stage by stage. Lays the fan, then puts k cards in
// the reading row the way a pick does, waits for the camera to answer, and writes the frame.
//   node tools/_cam-r9-beat.mjs <w> <h> <k> <out.png> [frames] [interval-ms]
// With `frames` it shoots a contact sheet ACROSS the move: the cards are laid the moment the first
// frame is taken, so the sheet is the reframe itself.
import { chromium } from 'playwright';
import sharp from 'sharp';

const W = +(process.argv[2] ?? 1600), H = +(process.argv[3] ?? 900), K = +(process.argv[4] ?? 0);
const OUT = process.argv[5] ?? `/tmp/c9-${W}x${H}-k${K}.png`;
const FRAMES = +(process.argv[6] ?? 1), IVAL = +(process.argv[7] ?? 90);
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto(`http://127.0.0.1:5173/?view=${process.env.VIEW || 'reveal'}&state=fan&shot=1`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
await page.waitForTimeout(1500);

const pose = () => page.evaluate(() => {
  const T = window.__theatre, c = T.camera, r3 = (v) => +v.toFixed(3);
  return `pos ${c.position.toArray().map(r3)} fov ${r3(c.fov)} current=${T.pieces.camera.current} picks=${T.pieces.reveal.picks.length}`;
});
const lay = (n) => page.evaluate((k) => {
  const R = window.__theatre.pieces.reveal, f = R._fan;
  const idx = [f.keystoneIndex, f.keystoneIndex + 7, f.keystoneIndex - 7].slice(0, k);
  f.fakePicks(idx);
  for (let i = R.picks.length; i < k; i++) R.picks.push({ index: idx[i], ordinal: i + 1, slug: 'x', slot: i, mesh: null });
}, n);

console.log('before  ', await pose());
if (FRAMES <= 1) {
  if (K) await lay(K);
  await page.waitForTimeout(15000);
  console.log('after   ', await pose());
  await page.screenshot({ path: OUT, timeout: 120000 });
} else {
  const bufs = [];
  for (let i = 0; i < FRAMES; i++) {
    if (i === 1 && K) await lay(K); // the card lands between the first frame and the second
    bufs.push(await page.screenshot({ timeout: 120000 }));
    if (i === 0) console.log('  f0    ', await pose());
    await page.waitForTimeout(IVAL);
  }
  console.log('after   ', await pose());
  const cols = Math.ceil(FRAMES / 2), rows = 2;
  const cw = Math.round(W / 2), ch = Math.round(H / 2);
  const tiles = await Promise.all(bufs.map((b) => sharp(b).resize(cw, ch).png().toBuffer()));
  await sharp({ create: { width: cw * cols, height: ch * rows, channels: 3, background: '#111' } })
    .composite(tiles.map((input, i) => ({ input, left: (i % cols) * cw, top: Math.floor(i / cols) * ch })))
    .png().toFile(OUT);
}
console.log('wrote', OUT, errs.length ? 'PAGE ERRORS: ' + errs.join(' | ') : '');
await browser.close();
