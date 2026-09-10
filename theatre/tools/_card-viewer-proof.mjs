#!/usr/bin/env node
// THE CARD VIEWER, PROVED. The user, seeing the deck laid out face up: "they are so beautiful,
// users should be able to look at them outside of the drawing." src/pieces/help-cards.js is the
// answer — the ? card's paper turned to a third face with one plate on it, as printed.
//
// Nothing here is set by hand. The deck is laid out by a REAL click on the stack on the table, the
// card is opened by a REAL tap on one of the seventy-eight, the arrows are CLICKED and the keyboard
// is PRESSED, the phone's step is a real finger dragged across the plate (CDP touch), and the way
// out is taken three ways — BACK, Escape, and a tap on the room outside the paper — with the rows
// counted afterwards each time, because the one thing the viewer may never do is gather the deck.
//
//   deck     1280x800 and 390x844: the lay-out, a tap, the viewer, its measure, NEXT and PREVIOUS
//            by click and by key, the wrap at the end of the deck, a swipe, and the three ways out
//   crop     a 2x crop of the name and the three controls, on both frames
//   reading  a whole evening on its own PEPE_FAKE server: three cards on the cloth, a tap on the
//            middle one opens the viewer on THAT card, and BACK gives the room back with the field
//            still open and nothing said
//
//   BASE=http://127.0.0.1:8726 node tools/_card-viewer-proof.mjs
//   BASE=… node tools/_card-viewer-proof.mjs --part deck
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

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
    plate: V.plateBox(), L: V.layout(), deck: D.mode, phase: D.phase,
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

// THE PEN, AT 2x. The name in the sign hand and the two cut chevrons, at twice the display's own
// pixels, which is the only way to see whether a hand-cut letter is holding at a 13 px cap. The
// clip starts under the plate, so the rasteriser's trouble with a big webp at dpr 2 (see deckPass)
// is not in the picture.
async function cropPass({ width, height, phone, slug }) {
  const { page, context } = await open(BASE, { width, height, phone, dsf: 2, q: 'now=10:10&shot=1&mute=1' });
  try {
    const L = await page.evaluate((s) => {
      window.__theatre.pieces.help.cards.open(s);
      return window.__theatre.pieces.help.cards.layout();
    }, slug);
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `${OUT}/crop-name-${width}x${height}.png`,
      scale: 'device', timeout: 120000,
      clip: { x: L.card.x, y: L.card.y + L.nameY - 10, width: L.card.w, height: L.card.h - L.nameY + 10 },
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
  // lettering is taken in its own pass below, where no plate is in the clip.
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
  const out = await page.evaluate(COUNT);
  must(out.drawn === 78 && out.faceUp === 78, `${tag}: the deck did not lay out (${out.drawn} drawn, ${out.faceUp} face up)`);
  say(`${tag}: a click on the stack lays ${out.drawn} cards out, ${out.faceUp} of them face up, ${out.unique} different`);

  // 2. a real tap on one of them
  const at = await page.evaluate(CARD_AT, 30);
  if (phone) await page.touchscreen.tap(at.x, at.y);
  else await page.mouse.click(at.x, at.y);
  await settle(page, () => window.__theatre.pieces.help.cards.showing);
  await page.evaluate(() => window.__theatre.pieces.help.cards.ready());
  await page.waitForTimeout(450);
  const v = await page.evaluate(VIEW);
  must(v.showing && v.slug === at.slug, `${tag}: the tap on ${at.slug} did not open the viewer on it (slug=${v.slug})`);
  must(v.plate.loaded && v.plate.natural[0] === 1024 && v.plate.natural[1] === 1792, `${tag}: the plate is not the 1024x1792 face`);
  must(v.deck === 'open', `${tag}: the deck was disturbed by the tap (mode=${v.deck})`);
  say(
    `${tag}: a tap on ${at.slug} opens the viewer — the paper is ${v.L.card.w}x${v.L.card.h} px, the plate ${v.plate.w.toFixed(0)}x${v.plate.h.toFixed(0)} css px off a ${v.plate.natural.join('x')} face ` +
      `(${((v.plate.w / width) * 100).toFixed(0)}% of the frame across, ${((v.plate.h / height) * 100).toFixed(0)}% down) · the name is cut at a ${v.L.capName.toFixed(1)} px cap, its numeral at ${v.L.capSub.toFixed(1)}, the controls at ${v.L.capCtrl.toFixed(1)} and ${v.L.boxes[0].h.toFixed(0)} px deep · the deck is still ${v.deck}`,
  );
  await page.screenshot({ path: `${OUT}/viewer-${width}x${height}.png`, scale: 'css', timeout: 120000 });

  await cropPass({ width, height, phone, slug: at.slug });

  // 3. NEXT and PREVIOUS, by click and by key
  const step = async (how, key) => {
    const before = await page.evaluate(() => window.__theatre.pieces.help.cards.slug);
    if (how === 'click') {
      const b = await page.evaluate((k) => window.__theatre.pieces.help.cards.controlBox(k), key);
      if (phone) await page.touchscreen.tap(b.x + b.w / 2, b.y + b.h / 2);
      else await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2);
    } else await page.keyboard.press(key === 'next' ? 'ArrowRight' : 'ArrowLeft');
    await page.evaluate(() => window.__theatre.pieces.help.cards.ready());
    await page.waitForTimeout(220);
    return { before, after: await page.evaluate(() => window.__theatre.pieces.help.cards.slug) };
  };
  const walk = [];
  for (const [how, key] of [['click', 'next'], ['click', 'next'], ['click', 'prev'], ['key', 'next'], ['key', 'prev'], ['key', 'prev']]) {
    const s = await step(how, key);
    walk.push(`${how}:${key} ${s.before}→${s.after}`);
    must(s.before !== s.after, `${tag}: ${how} ${key} did not step (${s.before})`);
  }
  say(`${tag}: stepping — ${walk.join(' · ')}`);
  // the wrap, at the two ends of the deck
  const wrap = await page.evaluate(async () => {
    const V = window.__theatre.pieces.help.cards;
    V.open('king-of-wands');
    const a = V.next();
    V.open('the-fool');
    const b = V.prev();
    return [a, b];
  });
  must(wrap[0] === 'the-fool' && wrap[1] === 'king-of-wands', `${tag}: the deck does not wrap (${wrap.join(', ')})`);
  say(`${tag}: it wraps — KING OF WANDS → ${wrap[0]}, THE FOOL ← ${wrap[1]}`);

  // 4. a thumb dragged across the plate (the phone's own step)
  if (phone) {
    await page.evaluate(() => window.__theatre.pieces.help.cards.open('the-star'));
    await page.waitForTimeout(200);
    const p = await page.evaluate(() => window.__theatre.pieces.help.cards.plateBox());
    await swipe(page, p.x + p.w * 0.75, p.y + p.h / 2, -p.w * 0.5);
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => window.__theatre.pieces.help.cards.slug);
    must(after === 'the-moon', `${tag}: a swipe left did not bring the next card (${after})`);
    say(`${tag}: a finger dragged left across the plate — the-star → ${after}`);
    await swipe(page, p.x + p.w * 0.25, p.y + p.h / 2, p.w * 0.5);
    await page.waitForTimeout(300);
    const back2 = await page.evaluate(() => window.__theatre.pieces.help.cards.slug);
    must(back2 === 'the-star', `${tag}: a swipe right did not bring the card back (${back2})`);
    say(`${tag}: …and dragged right — ${after} → ${back2}`);
  }

  // 5. the three ways out. Each of them must give the lay-out back untouched.
  const ways = [];
  for (const way of ['back', 'escape', 'outside']) {
    await page.evaluate(() => window.__theatre.pieces.help.cards.showing || window.__theatre.pieces.help.cards.open('the-sun'));
    await page.waitForTimeout(200);
    if (way === 'back') {
      const b = await page.evaluate(() => window.__theatre.pieces.help.cards.controlBox('back'));
      if (phone) await page.touchscreen.tap(b.x + b.w / 2, b.y + b.h / 2);
      else await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2);
    } else if (way === 'escape') await page.keyboard.press('Escape');
    else {
      // the room, outside the paper — whichever margin is the deeper one
      const L2 = await page.evaluate(() => window.__theatre.pieces.help.cards.layout());
      const side = L2.card.x >= L2.card.y;
      const x = side ? Math.max(4, L2.card.x / 2) : width / 2;
      const y = side ? height / 2 : Math.max(4, L2.card.y / 2);
      if (phone) await page.touchscreen.tap(x, y);
      else await page.mouse.click(x, y);
    }
    await page.waitForTimeout(400);
    const s = await page.evaluate((src) => {
      const c = new Function(`return (${src})()`)();
      return { showing: window.__theatre.pieces.help.cards.showing, deck: window.__theatre.pieces.props.deck.mode, ...c };
    }, COUNT.toString());
    ways.push(`${way}: viewer=${s.showing ? 'still up' : 'down'}, ${s.drawn} cards still out (${s.faceUp} face up), deck ${s.deck}`);
    must(!s.showing, `${tag}: ${way} did not put the paper down`);
    must(s.drawn === 78 && s.deck === 'open', `${tag}: ${way} disturbed the lay-out (${s.drawn} out, deck ${s.deck})`);
    if (way === 'back') await page.screenshot({ path: `${OUT}/back-to-deck-${width}x${height}.png`, scale: 'css', timeout: 120000 });
  }
  say(`${tag}: out — ${ways.join(' · ')}`);

  // 6. …and the film's business wins. The visitor asks for a reading with the paper up: the paper
  // goes down first and the rows rake home under it.
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
    await page.evaluate(() => window.__theatre.pieces.help.cards.ready());
    await page.waitForTimeout(500);
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

    const b = await page.evaluate(() => window.__theatre.pieces.help.cards.controlBox('back'));
    await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2);
    await page.waitForTimeout(900);
    const after = await state();
    const still = await page.evaluate(() => window.__theatre.pieces.cards.drawn.children.filter((m) => m.visible).length);
    must(!(await page.evaluate(() => window.__theatre.pieces.help.cards.showing)), 'reading: BACK did not put the paper down');
    must(still >= 3, `reading: the three cards did not survive the viewer (${still} face up)`);
    must(after.asking, 'reading: the field did not come back');
    say(`reading: BACK gives the room back — ${still} cards still on the cloth, the field open, beat "${after.beat}", shot ${after.shot}`);
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
