// The card's own geometry, before and after, at both shapes — the ink boils on every frame, so a
// whole-frame pixel diff cannot resolve a 40 px prop. Rectangles can.
import { chromium } from 'playwright';
import sharp from 'sharp';
const OUT = '/private/tmp/claude-501/-Users-workbook2024-Development-tarotpepe/cc57e9bc-ec5d-43c5-990a-77e7f38339a7/scratchpad/r10';
const HMR = (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}' });
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const rect = (r) => (r ? `${r.x.toFixed(1)},${r.y.toFixed(1)} ${r.width.toFixed(1)}x${r.height.toFixed(1)}` : '—');
const seen = {};

for (const [w, h] of [[1600, 900], [390, 760]]) {
  for (const state of ['question', 'answer']) {
    for (const [tag, port] of [['before', 5199], ['after', 5173]]) {
      const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      await page.route('**/@vite/client', HMR);
      await page.goto(`http://127.0.0.1:${port}/?view=dialogue&state=${state}&shot=1`, { waitUntil: 'load', timeout: 120000 });
      await page.waitForFunction(() => window.__theatreReady === true, null, { timeout: 150000 });
      await page.waitForTimeout(1200);
      const m = await page.evaluate(() => {
        const g = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
        return { card: g('#dialogue .cap'), well: g('#dialogue .well'), reply: g('#dialogue .reply'), caret: g('#dialogue .caret'), arrow: g('#dialogue .next'), mic: g('#dialogue .mic') };
      });
      const key = `${w}x${h}/${state}`;
      seen[key] = seen[key] ?? {};
      seen[key][tag] = m;
      if (tag === 'before' && m.mic) {
        // keep the prop's box so both frames can be cropped to exactly where it stood
        seen[key].micBox = m.mic;
      }
      await page.close();
    }
    const key = `${w}x${h}/${state}`;
    const A = seen[key].before, B = seen[key].after;
    console.log(`\n=== dialogue/${state} at ${w}x${h} ===`);
    for (const part of ['card', 'well', 'reply', 'caret', 'arrow', 'mic']) {
      const same = rect(A[part]) === rect(B[part]);
      console.log(`  ${part.padEnd(6)} before ${rect(A[part]).padEnd(28)} after ${rect(B[part]).padEnd(28)} ${same ? 'same' : '<< CHANGED'}`);
    }
    // crop both frames to the prop's box and diff only that
    const box = seen[key].micBox;
    if (box) {
      const pad = 14;
      const L = Math.max(0, Math.round(box.x - pad)), T = Math.max(0, Math.round(box.y - pad));
      const W = Math.min(w - L, Math.round(box.width + pad * 2)), H = Math.min(h - T, Math.round(box.height + pad * 2));
      for (const tag of ['before', 'after']) {
        await sharp(`${OUT}/${tag}-dialogue-${state}-${w}x${h}.png`).extract({ left: L, top: T, width: W, height: H }).toFile(`${OUT}/crop-${tag}-${state}-${w}x${h}.png`);
      }
      console.log(`  the prop stood at ${L},${T} ${W}x${H} — crops written for that patch alone`);
    }
  }
}
await browser.close();
