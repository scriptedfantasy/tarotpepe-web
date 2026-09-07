#!/usr/bin/env node
// HOW MUCH OF THE SECOND LINE A TAKE ACTUALLY USES.
//
// The card's well is two lines. A line longer than that is cut into takes. The user's note: the
// second line is not being filled — the cut comes early, so a take stands there with a third of its
// second line bare and the card moves on before the sentence has earned the room it took.
//
// This measures it, on the REAL card, at the REAL measure, with the REAL face: the ruler here is a
// copy of dialogue's own (same classes, same padding, same width), and the fill of a line is taken
// from the client rects of the set words, not guessed from character counts.
//
//   node tools/_dlg-r9-fill.mjs [--corpus /abs/lines.json]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') ? [...a, [x.slice(2), arr[i + 1] ?? 'true']] : a), []),
);
const LINES = JSON.parse(readFileSync(args.corpus, 'utf8'));
console.log('corpus:', LINES.length, 'lines');

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];

async function run(w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.route('**/@vite/client', (r) =>
    r.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}};} export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay{}` }),
  );
  await page.goto('http://127.0.0.1:5173/?view=dialogue&state=greeting', { waitUntil: 'load', timeout: 180000 });
  for (let i = 0; i < 500; i++) {
    if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
    await page.waitForTimeout(200);
  }
  const out = await page.evaluate(async (LINES) => {
    const D = window.__theatre.pieces.dialogue;
    const cap = document.querySelector('#dialogue .cap');
    D.say('X'); // stand the card so its measure is the running one
    await new Promise((r) => setTimeout(r, 120));
    const cardW = cap.offsetWidth;
    const narrow = cap.classList.contains('narrow');
    D.clear();

    // dialogue's own ruler, rebuilt here: same classes, same measure, same face
    const ruler = document.createElement('div');
    ruler.className = 'cap ruler' + (narrow ? ' narrow' : '');
    ruler.style.width = `${cardW}px`;
    const inner = document.createElement('div');
    ruler.appendChild(inner);
    document.querySelector('#dialogue').appendChild(ruler);
    const fontPx = parseFloat(getComputedStyle(ruler).fontSize) || 14;
    const lineHeightPx = fontPx * 1.5;

    const markup = (t) =>
      `<div class="line">` +
      t
        .split(' ')
        .map((w) => `<span class="w">${[...w].map((c) => `<span class="g">${c.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`).join('')}</span>`)
        .join(' ') +
      `</div>`;

    function set(t) {
      inner.innerHTML = markup(t);
      return inner.querySelector('.line');
    }
    const linesOf = (t) => {
      set(t);
      return Math.max(1, Math.round(inner.offsetHeight / lineHeightPx));
    };
    // the width each rendered line of a take actually occupies, as a fraction of the measure
    function lineWidths(t) {
      const el = set(t);
      const rng = document.createRange();
      rng.selectNodeContents(el);
      const rects = [...rng.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
      const rows = new Map();
      for (const r of rects) {
        const k = Math.round(r.top / 4);
        const cur = rows.get(k) ?? { l: Infinity, r: -Infinity, top: r.top };
        cur.l = Math.min(cur.l, r.left);
        cur.r = Math.max(cur.r, r.right);
        rows.set(k, cur);
      }
      const content = inner.clientWidth;
      return [...rows.values()].sort((a, b) => a.top - b.top).map((v) => (v.r - v.l) / content);
    }

    const BREAKS = [/[.?!…]["'”’)]?$/, /[;:]$/, /,$/];
    function split(text, { back, widow }) {
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
          const least = back === 'half' ? i + Math.max(1, Math.ceil((max - i) * 0.55)) : Math.max(i + 1, max - back);
          for (const re of BREAKS) {
            for (let j = max; j >= least; j--)
              if (re.test(words[j - 1])) {
                cut = j;
                break;
              }
            if (cut !== max) break;
          }
          const left = words.length - cut;
          if (widow === 'three') {
            if (left > 0 && left < 3 && cut - i > 3 && fits(cut, words.length)) cut -= 3 - left;
          } else if (left === 1 && cut - i > 2) cut -= 1;
        }
        takes.push(words.slice(i, cut).join(' '));
        i = cut;
      }
      return takes;
    }

    const VARIANTS = {
      'OLD (walk back to 55%, widow<3)': { back: 'half', widow: 'three' },
      'NEW reach 4 words': { back: 4, widow: 'one' },
      'NEW reach 3 words': { back: 3, widow: 'one' },
      'NEW reach 2 words': { back: 2, widow: 'one' },
      'greedy (no clause walk-back)': { back: 0, widow: 'one' },
    };
    const res = {};
    for (const [name, opt] of Object.entries(VARIANTS)) {
      let takes = 0, multi = 0, fills = [], twoLine = 0, nonFinal = 0, oneLiners = 0, samples = [];
      for (const text of LINES) {
        const t = split(text, opt);
        takes += t.length;
        if (t.length > 1) {
          multi++;
          if (samples.length < 3) samples.push(t);
        }
        for (let k = 0; k < t.length; k++) {
          const ws = lineWidths(t[k]);
          if (k < t.length - 1) {
            nonFinal++;
            if (ws.length >= 2) {
              twoLine++;
              fills.push(ws[1]);
            } else {
              oneLiners++;
              fills.push(0);
            }
          }
        }
      }
      const mean = fills.length ? fills.reduce((a, b) => a + b, 0) / fills.length : 0;
      const meanWhenTwo = twoLine ? fills.filter((f) => f > 0).reduce((a, b) => a + b, 0) / twoLine : 0;
      res[name] = {
        takes,
        linesCut: multi,
        nonFinal,
        lineTwoFill: +(mean * 100).toFixed(1),
        lineTwoFillWhenPresent: +(meanWhenTwo * 100).toFixed(1),
        takesEndingOnOneLine: oneLiners,
        samples,
      };
    }
    ruler.remove();
    return { cardW, fontPx, res };
  }, LINES);
  await page.close();
  return out;
}

for (const [w, h] of [
  [1600, 900],
  [390, 760],
]) {
  const o = await run(w, h);
  console.log(`\n=== ${w}x${h} — card ${o.cardW}px, type ${o.fontPx}px ===`);
  for (const [name, r] of Object.entries(o.res)) {
    console.log(
      `${name.padEnd(32)} takes ${String(r.takes).padStart(3)}  lines cut ${String(r.linesCut).padStart(2)}  ` +
        `LINE-TWO FILL ${String(r.lineTwoFill).padStart(5)}%  (when a 2nd line exists ${r.lineTwoFillWhenPresent}%)  takes that never reached line 2: ${r.takesEndingOnOneLine}/${r.nonFinal}`,
    );
  }
  const key = Object.entries(o.res)[0];
  console.log('\n  a cut line, OLD:', JSON.stringify(key[1].samples[0]));
  console.log('  the same,   NEW3:', JSON.stringify(o.res['NEW reach 3 words'].samples[0]));
}
console.log('\npage errors:', errs.length, errs.slice(0, 2).join(' | '));
await browser.close();
