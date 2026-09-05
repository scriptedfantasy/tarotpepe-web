// throwaway (props round 5): shoot every portrait plate at every phone shape and measure the ink
// in the bottom band of each, so "the plate lands on plain ground" is a number per window.
//   node tools/_props-r5-sweep.mjs [states] [sizes] [outdir]
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const states = (process.argv[2] ?? 'fan,turn').split(',');
const sizes = (process.argv[3] ?? '390x760,360x800,320x800,375x812').split(',').map((s) => s.split('x').map(Number));
const dir = process.argv[4] ?? '/private/tmp/claude-501/-Users-workbook2024-Development-tarotpepe/cc57e9bc-ec5d-43c5-990a-77e7f38339a7/scratchpad/sweep';
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const ink = async (file, frac) => {
  const img = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = img.info;
  const y0 = Math.round(H * (1 - frac));
  const th = [0, Math.round(W / 3), Math.round((2 * W) / 3), W];
  const out = [];
  for (let t = 0; t < 3; t++) {
    let dark = 0, n = 0;
    for (let y = y0; y < H; y++) for (let x = th[t]; x < th[t + 1]; x++) {
      const i = (y * W + x) * 4;
      n++;
      if ((img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3 < 128) dark++;
    }
    out.push(((dark / n) * 100).toFixed(2) + '%');
  }
  return out.join(' / ');
};
for (const [W, H] of sizes) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
  for (const st of states) {
    await page.goto(`http://127.0.0.1:5173/?view=camera&state=${st}&shot=1&t=3`, { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
    await page.waitForTimeout(1200);
    const f = `${dir}/${st}-${W}x${H}.png`;
    await page.screenshot({ path: f });
    console.log(`${st} ${W}x${H}  bottom 6% ink L/C/R: ${await ink(f, 0.06)}   bottom 12%: ${await ink(f, 0.12)}`);
  }
  if (errs.length) console.log('  PAGE ERRORS', errs.slice(0, 3).join(' | '));
  await page.close();
}
await browser.close();
