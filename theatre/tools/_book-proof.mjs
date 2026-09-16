#!/usr/bin/env node
// THE FOUR BOOKS ON THE TALL CASE, OPENED LIKE A VISITOR (src/pieces/walk-book.js).
//
//   the SPINES    which four the room found, what each read before it was re-lettered, where it
//                 stands, and how far its thumb box is from the bottle's, the radio's and the cat's
//   a real CLICK  page.mouse.click on the spine, through the arbiter, standing at the case
//   the PAGES     every leaf turned through and counted, and the text of each read back out of the
//                 piece in the hand's own folded case — so the proof reads the page rather than
//                 looking at a picture of it
//   the WAY OUT   a click off the paper, and Escape
//   the DRAWING   /tmp/walk/book-*.png at 1280x800 and 390x844
//
//   BASE=http://127.0.0.1:8739 node tools/_book-proof.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = args.out ?? '/tmp/walk';
mkdirSync(OUT, { recursive: true });
const PLATE = [1280, 800];
const PHONE = [390, 844];
const TITLES = ['TAROT', 'MARSEILLE', 'CHIROMANCIE', 'LE DESTIN'];

const LAUNCH = { headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] };
const stub = (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}' });
let bad = 0;
const claim = (b, text) => {
  if (!b) bad++;
  console.log(`   ${b ? '✓' : '✗'} ${text}`);
};
const frames = (p, n = 2) => p.evaluate((k) => new Promise((res) => { let i = k; const go = () => (i-- <= 0 ? res() : requestAnimationFrame(go)); go(); }), n);
const settle = async (p) => {
  await p.waitForFunction(() => !window.__theatre.pieces.camera.moving, null, { timeout: 300000, polling: 250 });
  await frames(p, 2);
};
const state = (p) => p.evaluate(() => {
  const B = window.__theatre.pieces.walk.books;
  return { showing: B.showing, title: B.title, leaf: B.leaf, leaves: B.leaves, cap: B.cap, spread: B.spread, box: B.box, at: window.__theatre.pieces.walk.at };
});

const browser = await chromium.launch(LAUNCH);
for (const [w, h] of [PLATE, PHONE]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  await page.route('**/@vite/client', stub);
  await page.goto(`${BASE}/?shot=1`, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 300000 });
  console.log(`\n=== ${w}x${h}`);

  // ---- the spines, as the room found them ------------------------------------------------------
  const spines = await page.evaluate(() => window.__theatre.pieces.walk.books.spines);
  for (const s of spines) console.log(`   ${s.title.padEnd(12)} was ${String(s.was).padEnd(12)} at ${s.at[0].toFixed(3)}, ${s.at[1].toFixed(3)}  (${(s.off * 1000).toFixed(0)} mm off the place it was looked for)`);
  claim(spines.length === 4 && TITLES.every((t) => spines.some((s) => s.title === t)), `all four spines were found (${spines.map((s) => s.title).join(', ')})`);

  await page.evaluate(() => window.__theatre.pieces.walk.go('case'));
  await settle(page);

  // ---- how far each spine's thumb box is from the switches already in the case -------------------
  const gaps = await page.evaluate((titles) => {
    const W = window.__theatre.pieces.walk, P = window.__theatre.pieces.props;
    const mid = (b) => (b ? [b.x + b.w / 2, b.y + b.h / 2] : null);
    const others = { bottle: mid(P.wine.tapBox()), radio: mid(P.radio.tapBox()), cat: mid(P.cat.tapBox()) };
    const out = {};
    for (const t of titles) {
      const m = mid(W.books.tapBox(t));
      if (!m) continue;
      out[t] = Object.fromEntries(Object.entries(others).map(([k, o]) => [k, o ? Math.round(Math.hypot(m[0] - o[0], m[1] - o[1])) : null]));
    }
    return out;
  }, TITLES);
  for (const [t, d] of Object.entries(gaps)) console.log(`   ${t.padEnd(12)} thumb box is ${d.bottle} px from the bottle's, ${d.radio} from the radio's, ${d.cat} from the cat's`);
  claim(Object.values(gaps).every((d) => Math.min(d.bottle ?? 1e9, d.radio ?? 1e9, d.cat ?? 1e9) > 44), 'every one of the four is more than a thumb clear of the bottle, the radio and the cat');

  // ---- a real click on the TAROT spine ----------------------------------------------------------
  const tb = await page.evaluate(() => window.__theatre.pieces.walk.books.tapBox('TAROT'));
  const who = await page.evaluate(([x, y]) => window.__theatre.pieces.props.switches.at(x, y), [tb.x + tb.w / 2, tb.y + tb.h / 2]);
  claim(who === 'book-TAROT', `the arbiter gives the middle of the TAROT spine to ${who}`);
  await page.mouse.click(tb.x + tb.w / 2, tb.y + tb.h / 2);
  await frames(page, 3);
  const open = await state(page);
  claim(open.showing && open.title === 'TAROT', `a click on the spine opens TAROT BY PEPE (${open.title})`);
  console.log(`   the book is ${open.leaves} leaves, set at a ${open.cap} px cap, ${open.spread ? 'as a spread' : 'one page at a time'}; the sheet is ${open.box.w}x${open.box.h} px`);
  await page.screenshot({ path: `${OUT}/book-title-${w}x${h}.png` });

  // ---- every leaf turned through and counted -----------------------------------------------------
  const seen = new Set();
  const texts = [];
  let guard = 0;
  let major = null;
  while (guard++ < 200) {
    const s = await state(page);
    seen.add(s.leaf);
    const t = await page.evaluate(() => window.__theatre.pieces.walk.books.text());
    texts.push(t ?? '');
    if (!major && /THE HANGED MAN/.test(t ?? '')) {
      major = s.leaf;
      await page.screenshot({ path: `${OUT}/book-major-${w}x${h}.png` });
    }
    const b = s.box;
    await page.mouse.click(b.x + b.w * 0.75, b.y + b.h * 0.5); // the right page: forward
    await frames(page, 2);
    const n = await state(page);
    if (n.leaf === s.leaf) break; // the last leaf
  }
  const end = await state(page);
  claim(end.leaf === end.leaves - 1, `every leaf was turned through by clicking the right page: ${seen.size} stops, ending on leaf ${end.leaf + 1} of ${end.leaves}`);
  claim(major != null, `a trump's own page is in it (THE HANGED MAN, leaf ${major != null ? major + 1 : '—'})`);
  const all = texts.join(' ');
  for (const want of ['THE FOOL', 'THE WORLD', 'CUPS', 'PENTACLES', 'SWORDS', 'WANDS', 'JODOROWSKY', 'MARSEILLE']) {
    claim(all.includes(want), `«${want}» is printed in it`);
  }
  claim(!/�/.test(all), 'and there is no sort in it the signwriter does not own');

  // ---- back the other way, then out --------------------------------------------------------------
  const bb = (await state(page)).box;
  await page.mouse.click(bb.x + bb.w * 0.25, bb.y + bb.h * 0.5);
  await frames(page, 2);
  const back = await state(page);
  claim(back.leaf < end.leaf, `a click on the left page turns back (${end.leaf + 1} → ${back.leaf + 1})`);
  await page.mouse.click(4, 4);
  await frames(page, 2);
  const shut = await state(page);
  claim(!shut.showing && shut.at === 'case', `a click off the paper puts the book down and leaves the visitor at the case (${shut.at})`);

  // ---- the three others, and Escape --------------------------------------------------------------
  for (const t of ['MARSEILLE', 'CHIROMANCIE', 'LE DESTIN']) {
    const box = await page.evaluate((k) => window.__theatre.pieces.walk.books.tapBox(k), t);
    await page.mouse.click(box.x + box.w / 2, box.y + box.h / 2);
    await frames(page, 3);
    const s = await state(page);
    const text = await page.evaluate(() => window.__theatre.pieces.walk.books.text());
    claim(s.showing && s.title === t, `${t} opens from its own spine (${s.leaves} leaf${s.leaves === 1 ? '' : 'ves'}): «${(text ?? '').slice(0, 64)}…»`);
    await page.keyboard.press('Escape');
    await frames(page, 2);
    const after = await state(page);
    claim(!after.showing && after.at === 'case', `${t}: Escape puts it down and does NOT walk the visitor home (${after.at})`);
  }
  console.log(`   errors: ${errors.length ? errors.join(' | ') : 'none'}`);
  if (errors.length) bad++;
  await page.close();
}
console.log(bad ? `\n${bad} claim(s) failed` : '\nevery claim holds');
await browser.close();
process.exit(bad ? 1 : 0);
