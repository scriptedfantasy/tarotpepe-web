// throwaway (camera round 9): how tall does the docked placard get with a LONG line in it? The
// camera reserves a band at the top of the fan plate for it, and the band has to hold the worst
// case, not the measured one.
//   node tools/_cam-r9-cap3.mjs [w] [h]
import { chromium } from 'playwright';
const W = +(process.argv[2] ?? 1600), H = +(process.argv[3] ?? 900);
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=flow&state=fan&shot=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
await page.waitForTimeout(3000);
const box = () => page.evaluate(() => {
  const cap = document.querySelector('#dialogue .cap');
  const svg = document.querySelector('#dialogue .cap svg') || cap?.previousElementSibling;
  const r = cap.getBoundingClientRect();
  const s = svg?.getBoundingClientRect?.() ?? r;
  const H = window.innerHeight;
  return { capBottom: +(r.bottom / H).toFixed(4), placardBottom: +(Math.max(r.bottom, s.bottom) / H).toFixed(4), text: cap.textContent.slice(0, 40) };
});
console.log('as flow set it:', JSON.stringify(await box()));
for (const line of [
  'Take one.',
  'Choose a card. Click one, or name it: the third from the left.',
  'Take your time. The cards are in no hurry, the evening is long, and the one you are looking for is already looking back at you from somewhere in that arc.',
]) {
  await page.evaluate((t) => window.__theatre.pieces.dialogue.say(t, { hold: 60, keep: true }), line);
  await page.waitForTimeout(4000);
  console.log(`${String(line.length).padStart(4)} chars →`, JSON.stringify(await box()));
}
await browser.close();
