#!/usr/bin/env node
// scratch (props r9): how far does the cat lamp's cast actually reach? Renders the evening plate
// three times — lamp off, lamp off again (so the boil's own frame-to-frame difference is on the
// record), lamp on — and reports ink coverage per 160 px tile. A cast that only clears plaster
// behind the cat shows one tile moving and the boil noise everywhere else.
import { chromium } from 'playwright';
import sharp from 'sharp';
const W = 1280, H = 800, T = 160;
const LIGHT = process.env.LIGHT ?? 'evening';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}' }));
await page.goto('http://127.0.0.1:5173/?view=props&state=default&shot=1&light=' + LIGHT, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
await page.waitForTimeout(600);

// The cat is LIT in every pass; the only thing that moves is the practical's intensity. Comparing
// a black cat with a white one would measure the drawing, not the light.
async function coverage(on) {
  await page.evaluate((v) => {
    const t = window.__theatre;
    t.pieces.lighting.states[t.pieces.lighting.state].catLamp = v ? 1.7 : 0;
    t.pieces.props.cat.set(true);
  }, on);
  await page.waitForTimeout(600);
  const buf = await page.locator('#stage').screenshot();
  const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
  const cols = Math.floor(info.width / T), rows = Math.floor(info.height / T);
  const out = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      let ink = 0;
      for (let y = r * T; y < (r + 1) * T; y++) for (let x = c * T; x < (c + 1) * T; x++) if (data[y * info.width + x] < 128) ink++;
      row.push(ink / (T * T));
    }
    out.push(row);
  }
  return out;
}
const a = await coverage(false);
const b = await coverage(false); // the boil, twice, with nothing changed
const c = await coverage(true);
console.log('ink coverage change per 160px tile, in percentage points (row 0 = top of frame)');
console.log('the cat stands in the tile at col 4-5, row 1-2 (x 781, y 326)\n');
for (let r = 0; r < a.length; r++) {
  const boil = a[r].map((v, i) => ((b[r][i] - v) * 100).toFixed(1).padStart(6));
  const cast = a[r].map((v, i) => ((c[r][i] - v) * 100).toFixed(1).padStart(6));
  console.log(`row ${r}  boil ${boil.join('')}   |  lamp ${cast.join('')}`);
}
await browser.close();
