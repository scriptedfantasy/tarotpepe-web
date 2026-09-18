#!/usr/bin/env node
// EVERY DRAWING OF EVERY MOTION THE BOOK HAS, ON ONE SHEET. The user, having watched the book work:
// "the book's animations are really not done with love, you should put a lot more work into that."
// A claim cannot answer that and neither can a still: the only way to judge a move at twelve frames
// a second is to lay its drawings side by side the way an animator pins them up, so this puts the
// board's twelve, the leaf's nine, the close's eleven and four frames of a riffle onto contact
// sheets and nothing else.
//
// THE LOOP IS HELD AND STEPPED ONE DRAWING AT A TIME, which is _book-proof.mjs's own arrangement and
// is copied here rather than shared because that file is a proof and this one is a camera: a motion
// advances one drawing per rendered frame, a screenshot costs a frame, and a PNG of "drawing three"
// taken while the room is running is a PNG of drawing five. The callbacks are QUEUED and handed back
// on the way out, or the room's loop asks once, is refused, and is never asked again.
//
//   BASE=http://127.0.0.1:8739 node tools/_book-anim.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:8739';
const OUT = process.env.OUT ?? '/tmp/book-anim';
mkdirSync(OUT, { recursive: true });
const SHOT_MS = 120000;
const LAUNCH = { headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] };
const stub = (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}' });

const hold = (p) => p.evaluate(() => {
  window.__q = [];
  window.__raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => (window.__q.push(cb), 0);
});
const step = (p, n = 1) => p.evaluate(async (k) => {
  for (let i = 0; i < k; i++) {
    const q = window.__q ?? [];
    window.__q = [];
    for (const cb of q) cb(performance.now());
    await new Promise((r) => window.__raf(r));
  }
}, n);
const letGo = (p) => p.evaluate(() => {
  if (!window.__raf) return;
  window.requestAnimationFrame = window.__raf;
  window.__raf = null;
  const q = window.__q ?? [];
  window.__q = null;
  for (const cb of q) window.requestAnimationFrame(cb);
});
const frames = (p, n = 2) => p.evaluate((k) => new Promise((res) => { let i = k; const go = () => (i-- <= 0 ? res() : requestAnimationFrame(go)); go(); }), n);
const rest = (p) => p.waitForFunction(() => !window.__theatre.pieces.walk.books.busy && !window.__theatre.pieces.camera.moving, null, { timeout: 120000 }).catch(() => {});

// THE CONTACT SHEET. Every drawing at a fifth of its own size, in rows of six, with the drawing's
// number burnt into the corner of each cell the way a dope sheet numbers them — the film's own hand
// is not available to a node script, so it is a plain white block and a black bar per unit, which is
// legible at a thumbnail where lettering is not.
async function sheet(shots, file, cols = 6, scale = 0.32) {
  if (!shots.length) return;
  const first = sharp(shots[0].buf);
  const meta = await first.metadata();
  const cw = Math.round(meta.width * scale), ch = Math.round(meta.height * scale);
  const rows = Math.ceil(shots.length / cols);
  const PAD = 6;
  const W = cols * (cw + PAD) + PAD, H = rows * (ch + PAD) + PAD;
  const cells = [];
  for (let i = 0; i < shots.length; i++) {
    const x = PAD + (i % cols) * (cw + PAD), y = PAD + Math.floor(i / cols) * (ch + PAD);
    cells.push({ input: await sharp(shots[i].buf).resize(cw, ch).toBuffer(), left: x, top: y });
    const n = shots[i].n;
    const tag = `<svg width="${cw}" height="22"><rect width="${cw}" height="22" fill="#fff" opacity="0.86"/><text x="5" y="16" font-family="monospace" font-size="15" fill="#111">${n}</text></svg>`;
    cells.push({ input: Buffer.from(tag), left: x, top: y + ch - 22 });
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: { r: 34, g: 34, b: 34 } } }).composite(cells).png().toFile(file);
  console.log(`   ${file} — ${shots.length} drawings, ${cols} to a row, ${W}x${H}`);
}

const browser = await chromium.launch(LAUNCH);

async function run(w, h, tag, { turnOnly = false } = {}) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.route('**/@vite/client', stub);
  await page.goto(`${BASE}/?shot=1`, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 300000 });
  await page.evaluate(() => {
    const W = window.__theatre.pieces.walk;
    W.go('table');
    window.__theatre.pieces.camera.cut('reading');
  });
  await page.waitForFunction(() => !window.__theatre.pieces.camera.moving, null, { timeout: 120000 }).catch(() => {});
  await frames(page, 3);

  // ---- THE BOARD, every drawing of it --------------------------------------------------------
  if (!turnOnly) {
    const bb = await page.evaluate(() => window.__theatre.pieces.props.table.tapBox());
    await hold(page);
    await step(page, 1);
    const shots = [{ n: 'shut', buf: await page.screenshot({ timeout: SHOT_MS }) }];
    await page.mouse.click(bb.x + bb.w / 2, bb.y + bb.h / 2);
    for (let k = 0; k < 14; k++) {
      await step(page, 1);
      const s = await page.evaluate(() => window.__theatre.pieces.walk.books.swinging);
      shots.push({ n: s ? `${s.drawing} · ${s.angle}°` : 'open', buf: await page.screenshot({ timeout: SHOT_MS }) });
      if (!s) break;
    }
    await letGo(page);
    await rest(page);
    await frames(page, 2);
    await sheet(shots, `${OUT}/board-open-${tag}.png`);
  }

  // ---- A LEAF, every drawing of it -----------------------------------------------------------
  // from a page of his take, so the click is paper and not a line of the contents
  {
    // …and on the phone run the board has not been clicked open, so the book is put up through the
    // piece: this sheet is the LEAF's and the phone's board is the laptop's board
    if (!(await page.evaluate(() => window.__theatre.pieces.walk.books.showing))) {
      await page.evaluate(() => window.__theatre.pieces.walk.books.open('TAROT'));
      await rest(page);
      await frames(page, 3);
    }
    const idx = await page.evaluate(() => window.__theatre.pieces.walk.books.index);
    const t = idx.find((ln) => ln.label === 'THE POPE') ?? idx[3];
    await page.evaluate((n) => window.__theatre.pieces.walk.books.goLeaf(n), t.target + 1);
    await rest(page);
    await frames(page, 3);
    const spread = await page.evaluate(() => window.__theatre.pieces.walk.books.spread);
    const box = await page.evaluate(() => window.__theatre.pieces.walk.books.leafBox());
    await hold(page);
    await step(page, 1);
    const shots = [{ n: 'flat', buf: await page.screenshot({ timeout: SHOT_MS }) }];
    await page.mouse.click(box.x + box.w * (spread ? 0.96 : 0.78), box.y + box.h * 0.62);
    for (let k = 0; k < 14; k++) {
      await step(page, 1);
      const s = await page.evaluate(() => window.__theatre.pieces.walk.books.turning);
      shots.push({ n: s ? (s.lens ? 'lens' : `${s.drawing}`) : 'down', buf: await page.screenshot({ timeout: SHOT_MS }) });
      if (!s) break;
    }
    await letGo(page);
    await rest(page);
    await frames(page, 2);
    await sheet(shots, `${OUT}/leaf-turn-${tag}.png`);
  }
  if (turnOnly) {
    await page.close();
    return;
  }

  // ---- A RIFFLE, four frames of it -----------------------------------------------------------
  {
    const idx = await page.evaluate(() => window.__theatre.pieces.walk.books.index);
    await page.evaluate(() => window.__theatre.pieces.walk.books.goLeaf(window.__theatre.pieces.walk.books.indexAt));
    await rest(page);
    await frames(page, 2);
    const far = idx[idx.length - 1];
    await hold(page);
    await step(page, 1);
    await page.evaluate((n) => window.__theatre.pieces.walk.books.goLeaf(n), far.target);
    // EVERY DRAWING IS TAKEN AND FOUR ARE KEPT, because a held loop does not step the room's clock
    // once per frame: the clock is real time at twelve a second and a screenshot off a software
    // renderer costs more than a drawing, so asking for drawings 1, 8, 15 and 22 by name comes back
    // with three of them. What the run actually put on the glass is collected and thinned after.
    const all = [];
    for (let k = 0; k < 40; k++) {
      await step(page, 1);
      const s = await page.evaluate(() => window.__theatre.pieces.walk.books.turning);
      if (!s?.riffle) break;
      all.push({ n: `${s.drawing}/${s.drawings}`, buf: await page.screenshot({ timeout: SHOT_MS }) });
    }
    const shots = all.length <= 4 ? all : [0, 1, 2, 3].map((i) => all[Math.round((i * (all.length - 1)) / 3)]);
    await letGo(page);
    await rest(page);
    await frames(page, 2);
    await sheet(shots, `${OUT}/riffle-${tag}.png`, 4, 0.42);
  }

  // ---- THE CLOSE, every drawing of it --------------------------------------------------------
  {
    await hold(page);
    await step(page, 1);
    const shots = [{ n: 'open', buf: await page.screenshot({ timeout: SHOT_MS }) }];
    await page.evaluate(() => window.__theatre.pieces.walk.books.close());
    for (let k = 0; k < 14; k++) {
      await step(page, 1);
      const s = await page.evaluate(() => window.__theatre.pieces.walk.books.swinging);
      shots.push({ n: s ? `${s.drawing} · ${s.angle}°` : 'shut', buf: await page.screenshot({ timeout: SHOT_MS }) });
      if (!s) break;
    }
    await letGo(page);
    await frames(page, 4);
    await sheet(shots, `${OUT}/board-close-${tag}.png`);
  }
  await page.close();
}

await run(1280, 800, '1280x800');
await run(390, 844, '390x844', { turnOnly: true });
await browser.close();
console.log(`\n${OUT}`);
