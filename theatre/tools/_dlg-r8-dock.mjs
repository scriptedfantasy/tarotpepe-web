#!/usr/bin/env node
// THE DOCK, with a card that now STANDS between lines. The user's one exception to the
// bottom-centred rule: while the spread is out and the visitor is choosing, the same card hangs
// from the head of the frame; the moment the third is taken it is back at the foot. Round 8 leaves
// a caption standing far longer than round 7 did, so this checks the card still travels.
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 760 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.route('**/@vite/client', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}};} export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay{}` }),
);
await page.goto('http://127.0.0.1:5173/?view=dialogue&state=greeting', { waitUntil: 'load', timeout: 180000 });
for (let i = 0; i < 400; i++) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(200);
}
const out = await page.evaluate(async () => {
  const T = window.__theatre;
  const D = T.pieces.dialogue, R = T.pieces.reveal, C = T.pieces.camera;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const cap = () => document.querySelector('#dialogue .cap');
  const at = (what) => {
    const r = cap().getBoundingClientRect();
    return { what, shot: C.current, picks: R.picks?.length ?? 0, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), of: window.innerHeight };
  };
  const rows = [];
  D.clear();
  C.cut('home');
  await sleep(400);
  D.say('The room is small, and the table has to do most of the work.', { hold: 30 });
  await sleep(300);
  rows.push(at('a line at home'));
  // the spread comes out and the visitor is choosing: the same card, at the head of the frame
  await R.setState('fan');
  C.cut('fan');
  await sleep(900); // the re-lay walks three drawings on the twos
  rows.push(at('the same line, spread out (docked)'));
  D.say('Choose a card. Click one, or name it.', { hold: 30 });
  await sleep(300);
  rows.push(at('the pick prompt, standing'));
  await sleep(2500);
  rows.push(at('the pick prompt 2.5 s later — it holds'));
  // the third card lands
  R.picks.push({ slug: 'a' }, { slug: 'b' }, { slug: 'c' });
  await sleep(900);
  rows.push(at('the third card taken (back at the foot)'));
  R.picks.length = 0;
  D.clear();
  return rows;
});
for (const r of out) console.log(`  ${r.what.padEnd(38)} shot=${r.shot.padEnd(5)} picks=${r.picks} top=${r.top} bottom=${r.bottom} of ${r.of}`);
console.log('page errors:', errs.length, errs.slice(0, 3).join(' | '));
await browser.close();
