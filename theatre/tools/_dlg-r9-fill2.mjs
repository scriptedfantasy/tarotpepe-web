#!/usr/bin/env node
// The same measurement as _dlg-r9-fill.mjs, but of the SHIPPED card rather than of a copy of the
// algorithm: every take is put into the real well by the real say(), and line two is measured off
// the words as they are actually set. Advanced with the piece's own skip(), so the takes counted
// are the takes a visitor turns.
//   node tools/_dlg-r9-fill2.mjs --corpus /abs/lines.json
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') ? [...a, [x.slice(2), arr[i + 1] ?? 'true']] : a), []),
);
const LINES = JSON.parse(readFileSync(args.corpus, 'utf8'));
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];

async function run(W, H) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.route('**/@vite/client', (r) =>
    r.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}};} export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay{}` }),
  );
  await page.goto('http://127.0.0.1:5173/?view=dialogue&state=greeting', { waitUntil: 'load', timeout: 180000 });
  for (let i = 0; i < 500; i++) {
    if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
    await page.waitForTimeout(200);
  }
  return await page.evaluate((LINES) => {
    const D = window.__theatre.pieces.dialogue;
    const cap = document.querySelector('#dialogue .cap');
    const well = () => cap.querySelector('.well');
    const text = () => (well()?.textContent ?? '').replace(/\s+/g, ' ').trim();
    // the widths of the lines a take actually occupies, as fractions of the measure
    function widths() {
      const el = well()?.querySelector('.line');
      if (!el) return [];
      const rng = document.createRange();
      rng.selectNodeContents(el);
      const rows = new Map();
      for (const r of rng.getClientRects()) {
        if (r.width < 0.5 || r.height < 0.5) continue;
        const k = Math.round(r.top / 4);
        const cur = rows.get(k) ?? { l: Infinity, r: -Infinity, top: r.top };
        cur.l = Math.min(cur.l, r.left);
        cur.r = Math.max(cur.r, r.right);
        rows.set(k, cur);
      }
      const content = well().clientWidth;
      return [...rows.values()].sort((a, b) => a.top - b.top).map((v) => (v.r - v.l) / content);
    }
    const fills = [];
    let takes = 0, cut = 0, widows = 0, oneLine = 0, arrowSeen = 0, arrowOnLast = 0;
    const arrowUp = () => !cap.querySelector('.next')?.hidden;
    for (const line of LINES) {
      D.clear();
      D.say(line, { hold: 1.2 });
      const seen = [];
      for (let n = 0; n < 20; n++) {
        const t = text();
        seen.push({ t, w: widths() });
        D.skip(); // the take, whole
        D.skip(); // ... and on to the next
        if (text() === t) break;
      }
      takes += seen.length;
      if (seen.length > 1) cut++;
      seen.forEach((s, k) => {
        const last = k === seen.length - 1;
        if (last) {
          if (s.t.split(' ').length === 1) widows++;
        } else {
          if (s.w.length >= 2) fills.push(s.w[1]);
          else {
            fills.push(0);
            oneLine++;
          }
        }
      });
      D.clear();
    }
    const mean = fills.length ? (fills.reduce((a, b) => a + b, 0) / fills.length) * 100 : 0;
    return {
      cardW: cap.offsetWidth,
      takes,
      linesCut: cut,
      nonFinal: fills.length,
      lineTwoFill: +mean.toFixed(1),
      takesEndingOnOneLine: oneLine,
      oneWordLastTakes: widows,
    };
  }, LINES);
}

for (const [w, h] of [
  [1600, 900],
  [390, 760],
]) {
  const o = await run(w, h);
  console.log(`${w}x${h} card ${o.cardW}px :: ${JSON.stringify(o)}`);
}
console.log('page errors:', errs.length, errs.slice(0, 2).join(' | '));
await browser.close();
