#!/usr/bin/env node
// THE CARD VIEWER, PROVED. The user, seeing the deck laid out face up: "they are so beautiful,
// users should be able to look at them outside of the drawing." src/pieces/help-cards.js is the
// answer — the ? card's paper turned to a third face with one plate on it, as printed.
//
// AND THE PLATE IS ALL THERE IS ON IT. The user, having used the lettered sheet: "I would suggest
// we remove the switching capability when you click the card. And I think we can also remove the
// back and we can also remove the explanation, because we have the explanation afterwards in the
// chat box, right? The abort can be just clicking outside of the card. on mobile we'll need to move
// the chatbox to the top, as it currently covers some of the cards." So this proof is now about
// what is NOT there as much as what is: no name, no suit line, no arrows, no BACK, no keyboard
// step, no swipe — and on a phone, a placard at the head with no card under it.
//
// Nothing here is set by hand. The deck is laid out by a REAL click on the stack on the table, the
// card is opened by a REAL tap on one of the seventy-eight, the keys are PRESSED and the finger is
// dragged across the plate (CDP touch) to prove that neither of them steps it any more, and the two
// ways out are taken — Escape and a tap on the room outside the paper — with the rows counted
// afterwards each time, because the one thing the viewer may never do is gather the deck.
//
//   deck     1280x800 and 390x844: the lay-out, the placard's dock measured against every card on
//            the cloth, a tap, the viewer with the card alone on the paper, the four things that
//            must NOT step it, the two ways out, and the placard back at the foot after the gather
//   crop     a 2x crop of the sheet's corner and the plate's cut edge, on both frames
//   reading  a whole evening on its own PEPE_FAKE server: three cards on the cloth, a tap on the
//            middle one opens the viewer on THAT card, and a tap outside gives the room back with
//            the field still open and nothing said
//
//   BASE=http://127.0.0.1:8726 node tools/_card-viewer-proof.mjs
//   BASE=… node tools/_card-viewer-proof.mjs --part deck
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const ROOT = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre';
const BASE = process.env.BASE ?? 'http://127.0.0.1:8726';
const OUT = args.out ?? `${ROOT}/public/progress/card-viewer`;
const part = args.part ?? 'all';
const has = (p) => part === 'all' || part === p;
mkdirSync(OUT, { recursive: true });

const log = [];
const say = (s) => {
  log.push(s);
  console.log(s);
};
const E = (errors) => (errors.length ? '  ERRORS: ' + errors.slice(0, 3).join(' | ') : '');
let bad = 0;
const must = (ok, what) => {
  if (!ok) {
    bad++;
    say(`  FAIL — ${what}`);
  }
  return ok;
};

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const viteStub = (route) =>
  route.fulfill({
    contentType: 'application/javascript',
    body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){ return u; } export class ErrorOverlay {}`,
  });

async function open(base, { width, height, q = '', phone = false, dsf = 1 }) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf, hasTouch: phone, isMobile: phone });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.route('**/@vite/client', viteStub);
  await page.goto(`${base}/?${q}`, { waitUntil: 'load', timeout: 180000 });
  const t0 = Date.now();
  while (Date.now() - t0 < 180000) {
    if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
    await page.waitForTimeout(200);
  }
  return { page, context, errors };
}
const settle = (page, fn, arg = null) => page.waitForFunction(fn, arg, { timeout: 120000, polling: 120 }).catch(() => {});

// how many of the seventy-eight are drawn on the cloth, and how many face up — off the meshes
const COUNT = () => {
  const ctx = window.__theatre;
  const g = ctx.scene.getObjectByName('deck-out');
  if (!g) return { drawn: 0, faceUp: 0, unique: 0 };
  const up = new ctx.THREE.Vector3(0, 1, 0);
  const n = new ctx.THREE.Vector3();
  let drawn = 0, faceUp = 0;
  const slugs = [];
  for (const m of g.children) {
    if (!m.visible) continue;
    drawn++;
    m.updateMatrixWorld(true);
    n.set(0, 1, 0).applyQuaternion(m.quaternion);
    if (n.dot(up) > 0.6) {
      faceUp++;
      slugs.push(m.userData.slug);
    }
  }
  return { drawn, faceUp, unique: new Set(slugs).size };
};
const VIEW = () => {
  const V = window.__theatre.pieces.help.cards;
  const D = window.__theatre.pieces.props.deck;
  return {
    showing: V.showing, slug: V.slug, name: V.card?.name ?? null,
    plate: V.plateBox(), sheet: V.sheetBox(), L: V.layout(), room: V.band(),
    deck: D.mode, phase: D.phase,
  };
};
// where one of the laid seventy-eight is on the glass
const CARD_AT = (i) => {
  const ctx = window.__theatre;
  const g = ctx.scene.getObjectByName('deck-out');
  const m = g?.children.filter((c) => c.visible)[i];
  if (!m) return null;
  const v = m.getWorldPosition(new ctx.THREE.Vector3()).project(ctx.camera);
  const r = ctx.renderer.domElement.getBoundingClientRect();
  return { x: ((v.x + 1) / 2) * r.width + r.left, y: ((1 - v.y) / 2) * r.height + r.top, slug: m.userData.slug };
};

// ───────────────────────────────────────────────────────────────────────────────────────────────
// THE PLACARD AGAINST THE CARDS
// ───────────────────────────────────────────────────────────────────────────────────────────────
// Every laid card's box on the glass — the projected corners of its own bounding box, not its
// centre, because a card half under the placard is the complaint. Against it, the placard's box:
// the drawn card itself where one is up, and otherwise `dialogue.band()`, which is the strip it
// occupies whether or not there is a word on it.
const DECK_BOXES = () => {
  const T = window.__theatre;
  const g = T.scene.getObjectByName('deck-out');
  const r = T.renderer.domElement.getBoundingClientRect();
  const out = [];
  if (!g) return out;
  const box = new T.THREE.Box3(), v = new T.THREE.Vector3();
  for (const m of g.children) {
    if (!m.visible) continue;
    m.updateMatrixWorld(true);
    box.setFromObject(m);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const ax of [box.min.x, box.max.x]) for (const ay of [box.min.y, box.max.y]) for (const az of [box.min.z, box.max.z]) {
      v.set(ax, ay, az).project(T.camera);
      const px = ((v.x + 1) / 2) * r.width + r.left, py = ((1 - v.y) / 2) * r.height + r.top;
      if (px < x0) x0 = px;
      if (px > x1) x1 = px;
      if (py < y0) y0 = py;
      if (py > y1) y1 = py;
    }
    out.push({ slug: m.userData.slug, x0, y0, x1, y1 });
  }
  return out;
};
const PLACARD = () => {
  const T = window.__theatre;
  const b = T.pieces.dialogue.band();
  const cap = document.querySelector('#dialogue .cap');
  const r = cap && !cap.hidden ? cap.getBoundingClientRect() : null;
  const W = T.size?.w || window.innerWidth;
  return {
    at: b.at,
    band: { x0: (W - b.w) / 2, y0: b.top, x1: (W + b.w) / 2, y1: b.bottom },
    cap: r ? { x0: r.x, y0: r.y, x1: r.x + r.width, y1: r.y + r.height } : null,
    well: document.querySelector('#dialogue .cap .well .sr')?.textContent ?? '',
  };
};
// how many cards the placard is standing on, and how deep the worst one is under it
function collide(boxes, p) {
  let hit = 0, deepest = 0, who = null;
  for (const c of boxes) {
    const ox = Math.min(c.x1, p.x1) - Math.max(c.x0, p.x0);
    const oy = Math.min(c.y1, p.y1) - Math.max(c.y0, p.y0);
    if (ox <= 0 || oy <= 0) continue;
    hit++;
    const frac = (ox * oy) / Math.max(1, (c.x1 - c.x0) * (c.y1 - c.y0));
    if (frac > deepest) {
      deepest = frac;
      who = c.slug;
    }
  }
  return { hit, deepest, who };
}

// ───────────────────────────────────────────────────────────────────────────────────────────────
// THE PLATE'S OWN PIXELS
// ───────────────────────────────────────────────────────────────────────────────────────────────
// The first frame this tool took of the viewer at 1280x800 was the paper with A WHITE HOLE where
// the picture goes. The page was right and the plate arrived; the tool shot it too early. `load`
// says the bytes came, not that the picture is on the paper: the plate is `decoding: async` and
// half a megabyte, so the browser fires load and decodes afterwards. help-cards.js's `show()` now
// waits for decode() and two frames on top of the load, and this waits for the pixels themselves —
// a clip of the plate's own box, read for whether there is a picture in it. Blank paper comes back
// flat; a Marseille plate is black ink on cream over its whole height.
async function plateInk(page, box) {
  const clip = { x: Math.round(box.x + box.w * 0.1), y: Math.round(box.y + box.h * 0.1), width: Math.round(box.w * 0.8), height: Math.round(box.h * 0.8) };
  if (clip.width < 8 || clip.height < 8) return { lo: 255, hi: 255, spread: 0, mean: 255 };
  const buf = await page.screenshot({ clip, scale: 'css', timeout: 120000 });
  const { data } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
  let lo = 255, hi = 0, sum = 0;
  for (const v of data) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
    sum += v;
  }
  return { lo, hi, spread: hi - lo, mean: sum / data.length };
}
async function waitPlate(page, ms = 20000) {
  await page.evaluate(() => window.__theatre.pieces.help.cards.ready());
  const t0 = Date.now();
  for (;;) {
    const box = await page.evaluate(() => window.__theatre.pieces.help.cards.plateBox());
    const ink = await plateInk(page, box);
    if (ink.spread > 60 || Date.now() - t0 > ms) return ink;
    await page.waitForTimeout(200);
  }
}
const poll = async (page, fn, ms, what) => {
  const t0 = Date.now();
  for (;;) {
    const v = await page.evaluate(fn).catch(() => null);
    if (v) return v;
    if (Date.now() - t0 > ms) throw new Error(`timed out waiting for ${what}`);
    await page.waitForTimeout(150);
  }
};

// a real finger dragged across the plate: CDP touch, so touch-action answers and not a number
async function swipe(page, x, y, dx, steps = 10) {
  const cdp = await page.context().newCDPSession(page);
  const pt = (xx) => [{ x: xx, y, radiusX: 6, radiusY: 6, force: 1, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(x) });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(x + (dx * i) / steps) });
    await new Promise((r) => setTimeout(r, 16));
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

// WHAT IS ACTUALLY ON THE SHEET, read off the DOM rather than off the cut: a name plate or a hit
// box left behind would show up here whatever the layout says.
const SHEET_DOM = () => {
  const el = document.getElementById('help-cards');
  if (!el) return null;
  return {
    kids: [...el.children].map((c) => `${c.tagName.toLowerCase()}${c.className ? '.' + c.className : ''}`).join(' '),
    hits: el.querySelectorAll('.hit').length,
    names: el.querySelectorAll('.name').length,
    canvases: el.querySelectorAll('canvas').length,
    imgs: el.querySelectorAll('img').length,
  };
};

// THE PEN, AT 2x. The sheet's own corner — the cut edge, the double border and the fine rule round
// the plate — at twice the display's pixels, which is the only way to see whether a hand-struck
// rule is holding. The clip takes the top-left corner of the paper and a bite of the plate's edge;
// nothing of the big webp is in it, so the rasteriser's trouble with one at dpr 2 (see deckPass) is
// not in the picture either.
async function cropPass({ width, height, phone, slug }) {
  const { page, context } = await open(BASE, { width, height, phone, dsf: 2, q: 'now=10:10&shot=1&mute=1' });
  try {
    const L = await page.evaluate((s) => {
      window.__theatre.pieces.help.cards.open(s);
      return window.__theatre.pieces.help.cards.layout();
    }, slug);
    await page.waitForTimeout(400);
    const w = Math.min(width, Math.round(Math.min(L.card.w, 190)));
    const h = Math.min(height, Math.round(Math.min(L.card.h, 150)));
    await page.screenshot({
      path: `${OUT}/crop-corner-${width}x${height}.png`,
      scale: 'device', timeout: 120000,
      clip: { x: Math.max(0, L.card.x - 8), y: Math.max(0, L.card.y - 8), width: w, height: h },
    });
  } finally {
    await context.close().catch(() => {});
  }
}

// ───────────────────────────────────────────────────────────────────────────────────────────────
// THE DECK, LAID OUT, AND A CARD TAKEN OFF IT ONTO THE PAPER
// ───────────────────────────────────────────────────────────────────────────────────────────────
async function deckPass({ width, height, phone, tag }, held = {}) {
  // ONE PIXEL TO ONE PIXEL, and it has to be. This machine's headless browser rasters through
  // SwiftShader, and a 1024x1792 webp laid out at a device pixel ratio of 2 comes back BLANK from
  // it — the page is right (the same page at dpr 1 draws the plate, and so does a real browser at
  // dpr 2), the software rasteriser is not. So the frames are taken at 1, and the 2x crop of the
  // pen is taken in its own pass below, where no plate is in the clip.
  const { page, context, errors } = await open(BASE, { width, height, phone, dsf: 1, q: 'now=10:10&seed=1&shot=1&mute=1' });
  held.context = context;
  await page.waitForTimeout(700);

  // 1. a real click on the squared deck
  const box = await page.evaluate(() => window.__theatre.pieces.props.deck.tapBox());
  if (!box) {
    say(`${tag}: FAIL — the deck is not on the table`);
    bad++;
    await context.close();
    return;
  }
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  if (phone) await page.touchscreen.tap(cx, cy);
  else await page.mouse.click(cx, cy);
  await settle(page, () => window.__theatre.pieces.props.deck.mode === 'open');
  await page.waitForTimeout(600); // the rows come to rest before anything is measured off them
  const out = await page.evaluate(COUNT);
  must(out.drawn === 78 && out.faceUp === 78, `${tag}: the deck did not lay out (${out.drawn} drawn, ${out.faceUp} face up)`);
  say(`${tag}: a click on the stack lays ${out.drawn} cards out, ${out.faceUp} of them face up, ${out.unique} different`);

  // 2. THE PLACARD, AGAINST THE CARDS. The user: "on mobile we'll need to move the chatbox to the
  // top, as it currently covers some of the cards." So on a phone the card docks to the head for as
  // long as the rows are out, and the measure is that NO card's box meets its box. On a laptop the
  // dock is untouched and the number is only reported.
  const boxes = await page.evaluate(DECK_BOXES);
  const P = await page.evaluate(PLACARD);
  const ys = [Math.min(...boxes.map((b) => b.y0)), Math.max(...boxes.map((b) => b.y1))];
  const onBand = collide(boxes, P.band);
  const onCap = P.cap ? collide(boxes, P.cap) : null;
  say(
    `${tag}: the rows run y ${ys[0].toFixed(0)}–${ys[1].toFixed(0)} of ${height}; the placard hangs from the ${P.at.toUpperCase()} ` +
      `at y ${P.band.y0.toFixed(0)}–${P.band.y1.toFixed(0)} (${(P.band.y1 - P.band.y0).toFixed(0)} px of band, ${(P.band.x1 - P.band.x0).toFixed(0)} wide)` +
      `${P.cap ? `, the drawn card itself at ${P.cap.y0.toFixed(0)}–${P.cap.y1.toFixed(0)}` : ' (nothing on it just now)'}`,
  );
  say(`${tag}: its band stands on ${onBand.hit} of the ${boxes.length} cards${onBand.hit ? ` — worst ${onBand.who} at ${(onBand.deepest * 100).toFixed(0)}% covered` : ''}`);
  if (phone) {
    must(P.at === 'head', `${tag}: the placard did not dock to the head over the lay-out (${P.at})`);
    must(onBand.hit === 0, `${tag}: the placard's band covers ${onBand.hit} laid card(s), worst ${onBand.who} at ${(onBand.deepest * 100).toFixed(0)}%`);
    if (onCap) must(onCap.hit === 0, `${tag}: the drawn placard covers ${onCap.hit} laid card(s)`);
  }
  await page.screenshot({ path: `${OUT}/dock-out-${width}x${height}.png`, scale: 'css', timeout: 120000 });

  // 3. a real tap on one of them
  const at = await page.evaluate(CARD_AT, 30);
  if (phone) await page.touchscreen.tap(at.x, at.y);
  else await page.mouse.click(at.x, at.y);
  await settle(page, () => window.__theatre.pieces.help.cards.showing);
  const ink = await waitPlate(page);
  const v = await page.evaluate(VIEW);
  const dom = await page.evaluate(SHEET_DOM);
  must(v.showing && v.slug === at.slug, `${tag}: the tap on ${at.slug} did not open the viewer on it (slug=${v.slug})`);
  must(v.plate.loaded && v.plate.natural[0] === 1024 && v.plate.natural[1] === 1792, `${tag}: the plate is not the 1024x1792 face`);
  must(ink.spread > 60, `${tag}: the plate is on the paper but blank in the frame (spread ${ink.spread}, mean ${ink.mean.toFixed(0)})`);
  must(v.deck === 'open', `${tag}: the deck was disturbed by the tap (mode=${v.deck})`);

  // THE CARD ALONE. Nothing lettered is left in the cut and nothing pressable is left in the DOM.
  must(v.L.boxes === undefined && v.L.capName === undefined && v.L.nameH === undefined, `${tag}: the cut still carries the lettering (${Object.keys(v.L).join(',')})`);
  must(dom.hits === 0 && dom.names === 0, `${tag}: the sheet still has ${dom.hits} control(s) and ${dom.names} name plate(s) on it`);
  must(dom.canvases === 2 && dom.imgs === 1, `${tag}: the sheet holds ${dom.canvases} canvas(es) and ${dom.imgs} image(s), not two strikes and one plate`);
  const shareH = v.plate.h / v.L.card.h, shareW = v.plate.w / v.L.card.w;
  must(shareH > 0.9 && shareW > 0.85, `${tag}: the plate is only ${(shareW * 100).toFixed(0)}%x${(shareH * 100).toFixed(0)}% of the paper`);
  say(
    `${tag}: a tap on ${at.slug} opens the viewer — the paper is ${v.L.card.w}x${v.L.card.h} px and holds nothing but the plate ` +
      `(${v.plate.w.toFixed(0)}x${v.plate.h.toFixed(0)} css px off a ${v.plate.natural.join('x')} face: ${(shareW * 100).toFixed(0)}% of the sheet across and ${(shareH * 100).toFixed(0)}% down, ` +
      `${((v.plate.w / width) * 100).toFixed(0)}% of the frame across and ${((v.plate.h / height) * 100).toFixed(0)}% down) · the sheet is «${dom.kids}» · the deck is still ${v.deck}`,
  );
  say(`${tag}: the picture is IN the frame, not merely fetched — ink spread ${ink.spread}, mean ${ink.mean.toFixed(0)} over the plate's own box`);

  // …and the paper stands clear of the placard, at whichever end it is standing
  const P2 = await page.evaluate(PLACARD);
  const clear = P2.at === 'head' ? v.sheet.y - P2.band.y1 : P2.band.y0 - (v.sheet.y + v.sheet.h);
  must(clear > 0, `${tag}: the paper runs into the placard's band (${clear.toFixed(0)} px)`);
  say(
    `${tag}: the paper stands at y ${v.sheet.y.toFixed(0)}–${(v.sheet.y + v.sheet.h).toFixed(0)} with the placard at the ${P2.at} ` +
      `(${P2.band.y0.toFixed(0)}–${P2.band.y1.toFixed(0)}): ${clear.toFixed(0)} px of paper between them, in a free band of ${v.room.free}`,
  );
  await page.screenshot({ path: `${OUT}/viewer-${width}x${height}.png`, scale: 'css', timeout: 120000 });

  await cropPass({ width, height, phone, slug: at.slug });

  // 4. NOTHING STEPS IT. The user cut the stepping out, so the four hands that used to do it are
  // tried in turn and the card must be the same card after every one of them.
  const still = [];
  const held0 = await page.evaluate(() => window.__theatre.pieces.help.cards.slug);
  for (const key of ['ArrowRight', 'ArrowLeft']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(250);
    const now = await page.evaluate(() => window.__theatre.pieces.help.cards.slug);
    must(now === held0, `${tag}: ${key} stepped the card (${held0} → ${now})`);
    still.push(`${key} → ${now === held0 ? 'the same card' : now}`);
  }
  {
    const p = await page.evaluate(() => window.__theatre.pieces.help.cards.plateBox());
    if (phone) {
      await swipe(page, p.x + p.w * 0.8, p.y + p.h / 2, -p.w * 0.6);
      await page.waitForTimeout(350);
      const now = await page.evaluate(() => window.__theatre.pieces.help.cards.slug);
      must(now === held0, `${tag}: a finger dragged across the plate stepped it (${held0} → ${now})`);
      still.push(`a finger dragged left → ${now === held0 ? 'the same card' : now}`);
    }
    // a finger on the picture itself: it does nothing, and it certainly does not put the paper down
    if (phone) await page.touchscreen.tap(p.x + p.w / 2, p.y + p.h / 2);
    else await page.mouse.click(p.x + p.w / 2, p.y + p.h / 2);
    await page.waitForTimeout(300);
    const s = await page.evaluate(() => ({ up: window.__theatre.pieces.help.cards.showing, slug: window.__theatre.pieces.help.cards.slug }));
    must(s.up && s.slug === held0, `${tag}: a tap on the plate changed something (up=${s.up}, ${held0} → ${s.slug})`);
    still.push(`a tap on the plate → the same card, still up`);
  }
  say(`${tag}: nothing steps it — ${still.join(' · ')}`);
  // …and the api still walks the deck for a tool, wrap and all, without announcing anything
  const wrap = await page.evaluate(async () => {
    const V = window.__theatre.pieces.help.cards;
    const seen = [];
    window.__theatre.on?.('help:cards', (d) => seen.push(d?.slug));
    V.open('king-of-wands');
    const a = V.next();
    V.open('the-fool');
    const b = V.prev();
    return { a, b, seen };
  });
  must(wrap.a === 'the-fool' && wrap.b === 'king-of-wands', `${tag}: the api does not wrap (${wrap.a}, ${wrap.b})`);
  must(wrap.seen.length === 2, `${tag}: ${wrap.seen.length} cards were announced for two opens and two steps`);
  say(`${tag}: the api still walks it for a tool — KING OF WANDS → ${wrap.a}, THE FOOL ← ${wrap.b}; only the two opens were announced (${wrap.seen.join(', ')})`);

  // 5. the two ways out. Each of them must give the lay-out back untouched.
  const ways = [];
  for (const way of ['escape', 'outside']) {
    await page.evaluate(() => window.__theatre.pieces.help.cards.showing || window.__theatre.pieces.help.cards.open('the-sun'));
    await page.waitForTimeout(200);
    if (way === 'escape') await page.keyboard.press('Escape');
    else {
      // the room, outside the paper — the deepest of the four margins round the sheet, which on a
      // phone is the placard's own band at the head (the paper is 362 px of a 390 px frame, so the
      // side margins are fourteen and no thumb is fourteen pixels wide)
      const s = await page.evaluate(() => window.__theatre.pieces.help.cards.sheetBox());
      const spots = [
        { d: s.x, x: s.x / 2, y: s.y + s.h / 2, where: 'the left margin' },
        { d: width - (s.x + s.w), x: (width + s.x + s.w) / 2, y: s.y + s.h / 2, where: 'the right margin' },
        { d: s.y, x: width / 2, y: s.y / 2, where: 'above the paper' },
        { d: height - (s.y + s.h), x: width / 2, y: (height + s.y + s.h) / 2, where: 'below the paper' },
      ].sort((a, b) => b.d - a.d);
      const spot = spots[0];
      ways.push(`(the finger went down on ${spot.where}, ${spot.d.toFixed(0)} px of room, at ${spot.x.toFixed(0)},${spot.y.toFixed(0)})`);
      if (phone) await page.touchscreen.tap(spot.x, spot.y);
      else await page.mouse.click(spot.x, spot.y);
    }
    await page.waitForTimeout(400);
    const s = await page.evaluate((src) => {
      const c = new Function(`return (${src})()`)();
      return { showing: window.__theatre.pieces.help.cards.showing, deck: window.__theatre.pieces.props.deck.mode, ...c };
    }, COUNT.toString());
    ways.push(`${way}: viewer=${s.showing ? 'still up' : 'down'}, ${s.drawn} cards still out (${s.faceUp} face up), deck ${s.deck}`);
    must(!s.showing, `${tag}: ${way} did not put the paper down`);
    must(s.drawn === 78 && s.deck === 'open', `${tag}: ${way} disturbed the lay-out (${s.drawn} out, deck ${s.deck})`);
    if (way === 'outside') await page.screenshot({ path: `${OUT}/back-to-deck-${width}x${height}.png`, scale: 'css', timeout: 120000 });
  }
  say(`${tag}: out — ${ways.join(' · ')}`);

  // 6. THE GATHER, AND THE PLACARD COMING HOME. A phone's card hangs from the head for as long as
  // the rows are out; the moment the deck is squared it is back at the foot, where it stands all
  // evening.
  await page.evaluate(() => window.__theatre.pieces.props.deck.close());
  await settle(page, () => window.__theatre.pieces.props.deck.mode === 'shut');
  await page.waitForTimeout(700);
  const home = await page.evaluate(PLACARD);
  must(home.at === 'foot', `${tag}: the placard did not come back to the foot after the gather (${home.at})`);
  say(`${tag}: the deck is gathered and the placard is back at the ${home.at}, y ${home.band.y0.toFixed(0)}–${home.band.y1.toFixed(0)}`);
  await page.screenshot({ path: `${OUT}/dock-home-${width}x${height}.png`, scale: 'css', timeout: 120000 });

  // 7. …and the film's business wins. The visitor asks for a reading with the paper up: the paper
  // goes down first and the rows rake home under it.
  await page.evaluate(() => window.__theatre.pieces.props.deck.open());
  await settle(page, () => window.__theatre.pieces.props.deck.mode === 'open');
  await page.evaluate(() => window.__theatre.pieces.help.cards.open('the-world'));
  await page.waitForTimeout(250);
  await page.evaluate(() => (window.__theatre.pieces.flow.intent = 'draw'));
  await settle(page, () => window.__theatre.pieces.props.deck.mode !== 'open');
  await page.waitForTimeout(300);
  const asked = await page.evaluate(() => ({ showing: window.__theatre.pieces.help.cards.showing, deck: window.__theatre.pieces.props.deck.mode }));
  must(!asked.showing, `${tag}: the paper stayed up when the visitor asked for a reading`);
  say(`${tag}: the visitor asks for cards with the paper up — the paper is ${asked.showing ? 'still up' : 'down'} and the deck is ${asked.deck}`);
  say(`${tag}: ${errors.length ? 'PAGE ERRORS' : 'no page errors'}${E(errors)}`);
  if (errors.length) bad++;
  await context.close();
}

// ───────────────────────────────────────────────────────────────────────────────────────────────
// A READING'S THREE CARDS
// ───────────────────────────────────────────────────────────────────────────────────────────────
async function readingPass() {
  const PORT = 8727;
  const FAKE = `http://127.0.0.1:${PORT}`;
  const alive = async () => {
    try {
      return (await fetch(FAKE + '/', { signal: AbortSignal.timeout(700) })).ok;
    } catch {
      return false;
    }
  };
  let server = null;
  if (!(await alive())) {
    server = spawn('node', ['node_modules/.bin/vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
      cwd: ROOT,
      env: { ...process.env, PEPE_FAKE: '1' },
      stdio: 'ignore',
    });
    const t0 = Date.now();
    while (Date.now() - t0 < 60000 && !(await alive())) await new Promise((r) => setTimeout(r, 400));
    if (!(await alive())) {
      say('reading: FAIL — no dev server on 8727');
      bad++;
      return;
    }
  }
  const stop = () => server?.kill('SIGTERM');
  try {
    const { page, context, errors } = await open(FAKE, { width: 1280, height: 800, q: 'mute=1' });
    const state = () =>
      page.evaluate(() => {
        const T = window.__theatre;
        return { beat: T.pieces.flow.beat, recalls: T.pieces.flow.recalls, readings: T.pieces.flow.readings, picks: T.pieces.reveal.picks?.length ?? 0, asking: !!T.pieces.dialogue.asking, shot: T.pieces.camera.current };
      });
    const until = async (fn, ms, what) => {
      const t0 = Date.now();
      for (;;) {
        const s = await state();
        if (fn(s)) return s;
        if (Date.now() - t0 > ms) throw new Error(`timed out waiting for ${what} (beat=${s.beat} picks=${s.picks} asking=${s.asking})`);
        await page.waitForTimeout(250);
      }
    };
    await page.waitForFunction("window.__theatre?.pieces?.entrance?.mode === 'closed'", null, { timeout: 120000 });
    await page.mouse.click(640, 400); // in
    await until((s) => s.asking, 120000, 'the first open field');
    await page.waitForSelector('#dialogue input.keys', { timeout: 90000, state: 'attached' });
    await page.waitForTimeout(250);
    await page.fill('#dialogue input.keys', 'read my cards');
    await page.keyboard.press('Enter');
    await until((s) => s.beat === 'fan' || s.picks > 0, 120000, 'the fan');
    for (let k = 0; k < 3; k++) {
      await until((s) => s.picks === k, 90000, `pick ${k + 1}`);
      await page.waitForTimeout(500);
      await page.evaluate(() => window.__theatre.pieces.reveal.pickRandom());
      await page.waitForTimeout(350);
    }
    await until((s) => s.readings >= 1 && s.asking, 300000, 'the reading to end');
    const before = await state();
    say(`reading: the reading is over — ${before.picks} cards on the cloth, the field is open, beat "${before.beat}", ${before.recalls} recalls`);

    // …with the room's own traffic recorded, so a failure says which hand took the click
    await page.evaluate(() => {
      window.__ev = [];
      const T = window.__theatre;
      for (const n of ['help:cards', 'help:close', 'help:open']) T.on?.(n, (d) => window.__ev.push(`${n}(${d?.slug ?? ''})`));
      window.addEventListener(
        'pointerdown',
        (e) => {
          window.__ev.push(
            `down@${e.clientX | 0},${e.clientY | 0} on ${e.target?.id || e.target?.tagName} deck=${T.pieces.props.deck.mode} idle=${T.pieces.props.deck.idle} wouldOpen=${T.pieces.props.deck.wouldOpen?.(e.clientX, e.clientY)} asking=${!!T.pieces.dialogue.asking} picks=${T.pieces.reveal.picks?.length ?? 0} beat=${T.pieces.flow.beat}`,
          );
          setTimeout(() => window.__ev.push(`+50ms deck=${T.pieces.props.deck.mode} cards=${T.pieces.help.cards.slug}`), 50);
        },
        true,
      );
      window.addEventListener('click', (e) => window.__ev.push(`click@${e.clientX | 0},${e.clientY | 0} on ${e.target?.id || e.target?.tagName}`), true);
    });
    // a finger on the middle one
    const at = await page.evaluate(() => {
      const T = window.__theatre;
      const p = T.pieces.reveal.picks?.[1];
      const v = p.mesh.getWorldPosition(new T.THREE.Vector3()).project(T.camera);
      const r = T.renderer.domElement.getBoundingClientRect();
      return { x: ((v.x + 1) / 2) * r.width + r.left, y: ((1 - v.y) / 2) * r.height + r.top, slug: p.slug };
    });
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(600);
    await waitPlate(page);
    const v = await page.evaluate(VIEW);
    const mid = await state();
    if (!v.showing) {
      const ev = await page.evaluate(() => window.__ev ?? []);
      const why = await page.evaluate((p) => {
        const T = window.__theatre;
        return {
          wouldOpen: T.pieces.props.deck.wouldOpen?.(p.x, p.y),
          pieces: Object.keys(T.pieces).join(','),
          deck: T.pieces.props.deck.mode,
          deckTap: T.pieces.props.deck.tapBox(),
          deckIdle: T.pieces.props.deck.idle,
          hovered: T.pieces.props.switches?.hovered ?? null,
          direct: T.pieces.help.cards.open('the-fool'),
          after: T.pieces.help.cards.slug,
        };
      }, at);
      say(`  the traffic: ${ev.join(' · ')}`);
      say(`  why: ${JSON.stringify(why)}`);
      say(`  the page said: ${errors.slice(0, 3).join(' | ') || 'nothing'}`);
    }
    must(v.showing && v.slug === at.slug, `reading: the tap on ${at.slug} did not open the viewer on it (slug=${v.slug})`);
    must(mid.beat !== 'recall', `reading: the recall ran behind the paper (beat=${mid.beat})`);
    must(mid.recalls === before.recalls, `reading: a recall was spent (${before.recalls} → ${mid.recalls})`);
    say(`reading: a tap on the middle card (${at.slug}) opens the viewer on ${v.slug} — "${v.name}" · beat stays "${mid.beat}", recalls ${mid.recalls}, the plate ${v.plate.w.toFixed(0)}x${v.plate.h.toFixed(0)} px`);
    await page.screenshot({ path: `${OUT}/reading-viewer.png`, timeout: 120000 });

    // the way out is off the paper, and nothing else
    const s = await page.evaluate(() => window.__theatre.pieces.help.cards.sheetBox());
    await page.mouse.click(Math.max(4, s.x / 2), s.y + s.h / 2);
    // The field is WAITED for, not counted out. A card on the paper is a card he teaches now
    // (flow.js, THE VISITOR HAS PICKED UP A CARD), and his lesson holds the placard until the paper
    // goes down — so the visitor's block comes back a moment after rather than instantly.
    await poll(page, () => window.__theatre.pieces.dialogue.asking, 60000, 'the field coming back').catch(() => {});
    const after = await state();
    const stillUp = await page.evaluate(() => window.__theatre.pieces.cards.drawn.children.filter((m) => m.visible).length);
    must(!(await page.evaluate(() => window.__theatre.pieces.help.cards.showing)), 'reading: a tap outside did not put the paper down');
    must(stillUp >= 3, `reading: the three cards did not survive the viewer (${stillUp} face up)`);
    must(after.asking, 'reading: the field did not come back');
    say(`reading: a tap outside the paper gives the room back — ${stillUp} cards still on the cloth, the field open, beat "${after.beat}", shot ${after.shot}`);
    await page.screenshot({ path: `${OUT}/reading-back.png`, timeout: 120000 });
    say(`reading: ${errors.length ? 'PAGE ERRORS' : 'no page errors'}${E(errors)}`);
    if (errors.length) bad++;
    await context.close();
  } catch (e) {
    say(`reading: FAIL — ${e.message}`);
    bad++;
  } finally {
    stop();
  }
}

// ───────────────────────────────────────────────────────────────────────────────────────────────
if (has('deck')) {
  for (const size of [
    { width: 1280, height: 800, phone: false, tag: 'laptop 1280x800' },
    { width: 390, height: 844, phone: true, tag: 'phone 390x844' },
  ]) {
    const held = { context: null };
    try {
      await deckPass(size, held);
    } catch (e) {
      say(`${size.tag}: FAIL — ${e.message.split('\n')[0]}`);
      bad++;
    } finally {
      await held.context?.close().catch(() => {});
    }
  }
}
if (has('reading')) await readingPass();

await browser.close();
say(bad ? `\n${bad} FAILURE(S)` : '\nall of it holds');
process.exit(bad ? 1 : 0);
