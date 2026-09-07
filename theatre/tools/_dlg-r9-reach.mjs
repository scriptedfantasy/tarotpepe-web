#!/usr/bin/env node
// How far the cut may walk back to land on a clause ending, in words — and what each choice costs
// in line-two fill. Same ruler as _dlg-r9-fill.mjs; one line printed take by take so the choice can
// be looked at rather than only averaged.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const args = Object.fromEntries(
  process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') ? [...a, [x.slice(2), arr[i + 1] ?? 'true']] : a), []),
);
const LINES = JSON.parse(readFileSync(args.corpus, 'utf8'));
const SHOW = args.show ?? LINES[0];
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
  const out = await page.evaluate(
    async ({ LINES, SHOW }) => {
      const D = window.__theatre.pieces.dialogue;
      const cap = document.querySelector('#dialogue .cap');
      D.say('X');
      await new Promise((r) => setTimeout(r, 120));
      const cardW = cap.offsetWidth, narrow = cap.classList.contains('narrow');
      D.clear();
      const ruler = document.createElement('div');
      ruler.className = 'cap ruler' + (narrow ? ' narrow' : '');
      ruler.style.width = `${cardW}px`;
      const inner = document.createElement('div');
      ruler.appendChild(inner);
      document.querySelector('#dialogue').appendChild(ruler);
      const fontPx = parseFloat(getComputedStyle(ruler).fontSize) || 14;
      const markup = (t) =>
        `<div class="line">` +
        t.split(' ').map((w) => `<span class="w">${[...w].map((c) => `<span class="g">${c}</span>`).join('')}</span>`).join(' ') +
        `</div>`;
      const set = (t) => ((inner.innerHTML = markup(t)), inner.querySelector('.line'));
      const linesOf = (t) => (set(t), Math.max(1, Math.round(inner.offsetHeight / (fontPx * 1.5))));
      function widths(t) {
        const el = set(t);
        const rng = document.createRange();
        rng.selectNodeContents(el);
        const rows = new Map();
        for (const r of rng.getClientRects()) {
          if (r.width < 0.5) continue;
          const k = Math.round(r.top / 4);
          const c = rows.get(k) ?? { l: Infinity, r: -Infinity, top: r.top };
          c.l = Math.min(c.l, r.left);
          c.r = Math.max(c.r, r.right);
          rows.set(k, c);
        }
        return [...rows.values()].sort((a, b) => a.top - b.top).map((v) => (v.r - v.l) / inner.clientWidth);
      }
      const BREAKS = [/[.?!…]["'”’)]?$/, /[;:]$/, /,$/];
      function split(text, reach) {
        const words = String(text).split(/\s+/).filter(Boolean);
        if (words.length < 2) return [String(text)];
        const fits = (a, b) => linesOf(words.slice(a, b).join(' ')) <= 2;
        if (fits(0, words.length)) return [words.join(' ')];
        const takes = [];
        let i = 0;
        while (i < words.length) {
          let lo = i + 1, hi = words.length, max = i + 1;
          while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (fits(i, mid)) {
              max = mid;
              lo = mid + 1;
            } else hi = mid - 1;
          }
          let cut = max;
          if (max < words.length) {
            const least = Math.max(i + 1, max - reach);
            for (const re of BREAKS) {
              for (let j = max; j >= least; j--)
                if (re.test(words[j - 1])) {
                  cut = j;
                  break;
                }
              if (cut !== max) break;
            }
            if (words.length - cut === 1 && cut - i > 2) cut -= 1;
          }
          takes.push(words.slice(i, cut).join(' '));
          i = cut;
        }
        return takes;
      }
      const res = {};
      for (const reach of [0, 1, 2, 3]) {
        const fills = [];
        let takes = 0, bad = 0;
        for (const text of LINES) {
          const t = split(text, reach);
          takes += t.length;
          for (let k = 0; k < t.length - 1; k++) {
            const w = widths(t[k]);
            const f = w.length >= 2 ? w[1] : 0;
            fills.push(f);
            if (f < 0.7) bad++;
          }
        }
        res[reach] = {
          takes,
          fill: +((fills.reduce((a, b) => a + b, 0) / fills.length) * 100).toFixed(1),
          under70: `${bad}/${fills.length}`,
          worst: +(Math.min(...fills) * 100).toFixed(0),
        };
      }
      const show = {};
      for (const reach of [0, 1, 2, 3])
        show[reach] = split(SHOW, reach).map((t, i, a) => `${i < a.length - 1 ? Math.round((widths(t)[1] ?? 0) * 100) + '%' : '  ·'} ${t}`);
      ruler.remove();
      return { cardW, res, show };
    },
    { LINES, SHOW },
  );
  await page.close();
  return out;
}
for (const [w, h] of [
  [1600, 900],
  [390, 760],
]) {
  const o = await run(w, h);
  console.log(`\n=== ${w}x${h} card ${o.cardW}px ===`);
  for (const [reach, r] of Object.entries(o.res))
    console.log(`  clause reach ${reach} words :: fill ${String(r.fill).padStart(5)}%  takes ${r.takes}  under 70%: ${r.under70}  worst ${r.worst}%`);
  for (const [reach, lines] of Object.entries(o.show)) {
    console.log(`  reach ${reach}:`);
    for (const l of lines) console.log('     ', l);
  }
}
console.log('\npage errors:', errs.length);
await browser.close();
