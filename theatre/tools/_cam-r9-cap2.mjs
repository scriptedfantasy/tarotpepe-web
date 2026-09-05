// throwaway (camera round 9): dump the caption DOM so the placard's box can be measured.
//   node tools/_cam-r9-cap2.mjs [w] [h] [view]
import { chromium } from 'playwright';
const W = +(process.argv[2] ?? 390), H = +(process.argv[3] ?? 760), VIEW = process.argv[4] ?? 'flow';
const STATE = process.argv[5] ?? 'fan';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto(`http://127.0.0.1:5173/?view=${VIEW}&state=${STATE}&shot=1`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
await page.waitForTimeout(3000);
console.log(await page.evaluate(() => {
  const d = document.querySelector('#dialogue');
  const els = [...d.querySelectorAll('*')].slice(0, 14).map((e) => {
    const r = e.getBoundingClientRect();
    return `${e.tagName}.${e.className || '-'} hidden=${e.hidden} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`;
  });
  return `camera=${window.__theatre.pieces.camera.current} picks=${window.__theatre.pieces.reveal?.picks?.length}\n` + els.join('\n');
}));
await browser.close();
