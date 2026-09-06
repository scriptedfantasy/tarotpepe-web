import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 620 }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
const t0 = Date.now();
for (let i = 0; i < 24; i++) {
  const s = await page.evaluate(() => {
    const T = window.__theatre;
    return { beat: T.pieces.flow?.beat, title: !!document.querySelector('#titles .card'), fan: T.pieces.reveal?.fanCount ?? 0, picks: T.pieces.reveal?.picks?.length ?? 0 };
  });
  console.log(`${((Date.now() - t0) / 1000).toFixed(0)}s  beat=${s.beat}  title=${s.title}  cards on the cloth=${s.fan}  picks=${s.picks}`);
  if (s.title && s.beat === 'title') { console.log('the title card came up'); break; }
  await page.waitForTimeout(5000);
}
console.log(errs.length ? `PAGE ERRORS: ${errs.slice(0, 3).join(' | ')}` : 'no page errors');
await browser.close();
