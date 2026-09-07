// What the two trees actually put in the DOM, and what the notice measures now.
import { chromium } from 'playwright';
const HMR = (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}' });
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

for (const [tag, port] of [['before (HEAD)', 5199], ['after  (r10) ', 5173]]) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  await page.route('**/@vite/client', HMR);
  await page.goto(`http://127.0.0.1:${port}/?view=dialogue&state=question&shot=1`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__theatreReady === true, null, { timeout: 150000 });
  await page.waitForTimeout(1200);
  const m = await page.evaluate(() => ({
    micEls: document.querySelectorAll('#dialogue .mic, #dialogue button[class*=mic]').length,
    micRule: [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => /\.mic/.test(r.cssText)); } catch { return false; } }),
    hasRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    hasSynth: !!window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function',
    api: Object.keys(window.__theatre?.pieces?.dialogue ?? {}).filter((k) => /voice|Voice|speak|listen/i.test(k)),
    voiceGetter: (() => { try { return JSON.stringify(window.__theatre?.pieces?.dialogue?.voice ?? null); } catch { return 'threw'; } })(),
    field: !!document.querySelector('#dialogue .cap .keys'),
  }));
  console.log(`${tag}  .mic elements ${m.micEls}   .mic css ${m.micRule}   SpeechRecognition ${m.hasRecognition}   speechSynthesis ${m.hasSynth}   field open ${m.field}   voice keys on api [${m.api}]   api.voice ${m.voiceGetter}`);
  await page.close();
}

// the notice, after
const page = await browser.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 1 });
await page.route('**/@vite/client', HMR);
await page.goto('http://127.0.0.1:5173/?view=help&state=open&shot=0', { waitUntil: 'domcontentloaded', timeout: 120000 });
const b = await page.evaluate(async () => {
  const mod = await import('/src/pieces/help-bill.js?v=' + Date.now());
  const x = mod.cutBill(window.innerWidth, window.innerHeight, Math.min(2, devicePixelRatio || 1));
  return { sheet: x.sheet, capBody: x.capBody, items: mod.BILL.items.map((i) => i[0] + '. ' + i[1]) };
});
console.log(`\nnotice at 390x760: sheet ${b.sheet.w} x ${b.sheet.h} at ${b.sheet.x},${b.sheet.y}  (${(100 * b.sheet.h / 760).toFixed(1)}% of the frame)  body cap ${b.capBody.toFixed(1)}px`);
for (const i of b.items) console.log('   ' + i);
await page.close();
await browser.close();
