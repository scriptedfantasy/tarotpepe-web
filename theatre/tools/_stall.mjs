// throwaway: sit at the question beat and dump what the dialogue is doing every 3 s.
import { chromium } from 'playwright';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e).slice(0, 300)));
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && !/GL Driver/.test(m.text()) && console.log(m.type().toUpperCase(), m.text().slice(0, 300)));
await page.route('**/@vite/client', (route) => route.fulfill({ contentType: 'application/javascript', body: 'export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data:{} }; }\nexport function updateStyle(){}\nexport function removeStyle(){}\nexport function injectQuery(u){return u;}\nexport class ErrorOverlay {}' }));
const t0 = Date.now();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load', timeout: 60000 });
for (;;) {
  const ok = await page.evaluate(() => window.__theatreReady === true).catch(() => false);
  if (ok || Date.now() - t0 > 120000) break;
  await page.waitForTimeout(200);
}
console.log('ready');
await page.keyboard.press('Enter');
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(3000);
  const s = await page.evaluate(() => {
    const T = window.__theatre, D = T.pieces.dialogue;
    const cap = document.querySelector('#dialogue .cap');
    return {
      t: +T.clock.t.toFixed(2),
      f: T.clock.frame,
      beat: T.pieces.flow?.beat,
      asking: D?.asking,
      capHidden: cap ? cap.hidden : null,
      text: cap && !cap.hidden ? cap.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) : null,
      input: !!document.querySelector('#dialogue input.keys'),
      you: !!document.querySelector('#dialogue .you'),
      hidWords: cap ? cap.querySelectorAll('.layer.ink .w.hid').length : -1,
      words: cap ? cap.querySelectorAll('.layer.ink .w').length : -1,
    };
  });
  console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, JSON.stringify(s));
  if (s.input) break;
}
await browser.close();
