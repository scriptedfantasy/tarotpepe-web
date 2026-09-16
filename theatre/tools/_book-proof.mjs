#!/usr/bin/env node
// THE FOUR BOOKS ON THE TALL CASE, OPENED LIKE A VISITOR (src/pieces/walk-book.js).
//
//   the SPINE     which one the room found, what it read before it was re-lettered, where it
//                 stands, and how far its thumb box is from the bottle's, the radio's and the cat's
//   the OTHERS    MARSEILLE, CHIROMANCIE and LE DESTIN are refused: they are books on a shelf now
//                 and the arbiter does not know their names
//   a real CLICK  page.mouse.click on the spine, through the arbiter, standing at the case
//   the PAGES     every leaf turned through and counted, the text of each read back out of the
//                 piece in the hand's own folded case, and — on every leaf that carries one — THE
//                 CARD'S OWN INK COUNTED IN PIXELS inside the plate's box on the glass, so the card
//                 is proved to be ON the page rather than merely asked for
//   the DRAWING   /tmp/walk/book-*.png at 1280x800 and 390x844
//
//   BASE=http://127.0.0.1:8739 node tools/_book-proof.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
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
const TITLES = ['TAROT'];
// the three that used to open and no longer do: the proof asks the arbiter for each by name
const SHUT = ['MARSEILLE', 'CHIROMANCIE', 'LE DESTIN'];
// the twenty-two trumps and the four aces, which is every plate the book carries
const CARDS = 26;

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
  claim(spines.length === 1 && spines[0]?.title === 'TAROT', `one spine on the case opens, and it is the one with his name on it (${spines.map((s) => s.title).join(', ') || 'NONE'})`);

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
  claim(Object.values(gaps).every((d) => Math.min(d.bottle ?? 1e9, d.radio ?? 1e9, d.cat ?? 1e9) > 44), 'it is more than a thumb clear of the bottle, the radio and the cat');
  // AND THE OTHER THREE ARE NOT SWITCHES. Nothing on the case says which book opens; what says it
  // is the cursor, and these three do not have one.
  const closed = await page.evaluate((names) => {
    const B = window.__theatre.pieces.walk.books;
    return names.map((n) => ({ n, box: B.tapBox(n) ?? null, opens: B.open(n) }));
  }, SHUT);
  for (const r of closed) claim(!r.box && r.opens === false, `${r.n} is a book on a shelf: no thumb box (${r.box ? 'HAS ONE' : 'none'}), open() answers ${r.opens}`);
  const still = await state(page);
  claim(!still.showing, `…and none of them put anything up (showing ${still.showing})`);

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
  const plates = [];
  let guard = 0;
  let major = null;
  while (guard++ < 200) {
    const s = await state(page);
    seen.add(s.leaf);
    const t = await page.evaluate(() => window.__theatre.pieces.walk.books.text());
    texts.push(t ?? '');
    // THE CARD, COUNTED IN PIXELS. `card` is the plate's box on the glass; the count is of pixels
    // inside it that are NOT the room's paper — the card's own ink and colour. A plate that failed
    // to load, or one the DOM put somewhere else, counts nothing and fails here rather than in a
    // screenshot somebody has to look at.
    const card = await page.evaluate(() => window.__theatre.pieces.walk.books.card);
    if (card) {
      const shot = await page.screenshot({ clip: { x: Math.max(0, card.x), y: Math.max(0, card.y), width: Math.min(card.w, w - card.x), height: Math.min(card.h, h - card.y) } });
      const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
      let ink = 0;
      for (let q = 0; q < data.length; q += info.channels) {
        if (data[q] < 200 || data[q + 1] < 200 || data[q + 2] < 200) ink++;
      }
      plates.push({ slug: card.slug, leaf: s.leaf, w: card.w, h: card.h, frac: ink / (info.width * info.height) });
    }
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
  const thin = plates.filter((q) => q.frac < 0.25);
  console.log(`   ${plates.length} plates were on the glass; the lightest carried ${(Math.min(...plates.map((q) => q.frac)) * 100).toFixed(1)}% ink, the heaviest ${(Math.max(...plates.map((q) => q.frac)) * 100).toFixed(1)}%, each ${plates[0]?.w}x${plates[0]?.h} px`);
  claim(plates.length === CARDS, `every one of the ${CARDS} cards is on a leaf of its own (${plates.length} seen: ${plates.length === CARDS ? 'the 22 trumps and the 4 aces' : plates.map((q) => q.slug).join(' ')})`);
  claim(thin.length === 0, `and every plate is actually drawn on the page — none under a quarter ink (${thin.map((q) => `${q.slug} ${(q.frac * 100).toFixed(1)}%`).join(', ') || 'none'})`);
  const sheet = await page.evaluate(() => window.__theatre.pieces.walk.books.sheetLeaves);
  console.log(`   the leaves run: ${sheet.slice(0, 10).join(' | ')} …`);
  claim(sheet.filter((x) => String(x).startsWith('plate:')).length === CARDS, `the book's own list of leaves agrees: ${sheet.filter((x) => String(x).startsWith('plate:')).length} plates, ${sheet.filter((x) => x === 'blank').length} printer's blanks`);
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

  // ---- the way out, and Escape ------------------------------------------------------------------
  await page.evaluate(() => window.__theatre.pieces.walk.books.open('TAROT'));
  await frames(page, 3);
  await page.keyboard.press('Escape');
  await frames(page, 2);
  const esc = await state(page);
  claim(!esc.showing && esc.at === 'case', `Escape puts the book down and does NOT walk the visitor home (${esc.at})`);
  console.log(`   errors: ${errors.length ? errors.join(' | ') : 'none'}`);
  if (errors.length) bad++;
  await page.close();
}
console.log(bad ? `\n${bad} claim(s) failed` : '\nevery claim holds');
await browser.close();
process.exit(bad ? 1 : 0);
