#!/usr/bin/env node
// THE LESSON, PROVED. The user, on the whole deck lying face up on the cloth: "maybe this could be
// the teaching - in this whole laid out view, whenever a user clicks a card, pepe could explain the
// suit and the individual cards."
//
// So the ? card's third face is a lesson: the visitor picks a card up off the table, it goes on the
// paper (src/pieces/help-cards.js), and the room asks him for a `lesson` beat on it (flow.js →
// mind.js → server/pepe.mjs). His lines stand on the placard while the picture stands beside it.
//
// AND THE LESSON IS NEVER CUT OFF HALF-WRITTEN. The user, on the lettered sheet: "switching the
// card before the explainer happens kind of seems to break the chat window. It then comes back
// afterwards, but it's not clean." The stepping is gone — the card viewer has no arrows, no BACK,
// no keys and no swipe — so the only thing that can end a lesson early is the visitor putting the
// paper down, and this proves that when they do, the placard is left STANDING and CLEAN: the same
// pixels, within the boil, as the same line put up by the ordinary road.
//
// Nothing here is set by hand. The deck is laid out by a REAL click on the stack on the table, the
// card is opened by a REAL tap on one of the seventy-eight, the paper is put down by a REAL tap off
// it, and every request the page makes to /api/pepe is read off the wire as it goes past — which is
// the only way to say whether one card asked for exactly one lesson.
//
// THE PLATE IS WAITED FOR BY ITS PIXELS. `load` means the bytes arrived, not that the picture is on
// the paper, and the first judged frame of this face was the sheet with a white hole in it
// (public/progress/card-viewer/viewer-1280x800.png). So every frame here is taken only once a clip
// of the plate's own box comes back with a picture in it — measured, not waited out.
//
//   lesson   1280x800 and 390x844: the lay-out with the placard measured against every card on the
//            cloth, a tap, the viewer with the plate rendered, the `lesson` beat on the wire with
//            its slug and its facts, HIS FIRST LINE NAMING THE CARD (there is no name on the paper
//            any more, so his note is the only place it is said), the geometry of the two sheets at
//            either dock, a close mid-lesson with the placard compared pixel for pixel against the
//            same line standing normally, Escape, the history, and a keyless evening
//   keep     an evening that is nothing but a lesson: the sheet still exports
//
//   BASE=http://127.0.0.1:8727 node tools/_lesson-proof.mjs
//   BASE=… node tools/_lesson-proof.mjs --part lesson
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const ROOT = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre';
const OUT = args.out ?? `${ROOT}/public/progress/lesson`;
const part = args.part ?? 'all';
const has = (p) => part === 'all' || part === p;
mkdirSync(OUT, { recursive: true });

const log = [];
const say = (s) => {
  log.push(s);
  console.log(s);
};
let bad = 0;
const must = (ok, what) => {
  if (!ok) {
    bad++;
    say(`  FAIL — ${what}`);
  }
  return ok;
};

// ── the canned voice ────────────────────────────────────────────────────────────────────────────
// PEPE_FAKE, and nothing else: a lesson has to be asked for, answered and interrupted, and none of
// that can be driven against a provider. BASE is used when it is already the fake; otherwise this
// stands one up of its own.
const WANT = process.env.BASE ?? 'http://127.0.0.1:8727';
const PORT = 8729;
let spawned = null;
const provider = async (base) => {
  try {
    const r = await fetch(`${base}/api/pepe/health`, { signal: AbortSignal.timeout(1500) });
    return (await r.json()).provider ?? null;
  } catch {
    return null;
  }
};
let BASE = WANT;
if ((await provider(WANT)) !== 'fake') {
  BASE = `http://127.0.0.1:${PORT}`;
  if ((await provider(BASE)) !== 'fake') {
    spawned = spawn('node', ['node_modules/.bin/vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
      cwd: ROOT,
      env: { ...process.env, PEPE_FAKE: '1' },
      stdio: 'ignore',
    });
    const t0 = Date.now();
    while (Date.now() - t0 < 60000 && (await provider(BASE)) !== 'fake') await new Promise((r) => setTimeout(r, 400));
  }
}
if ((await provider(BASE)) !== 'fake') {
  say(`FAIL — no PEPE_FAKE server (tried ${WANT} and ${BASE})`);
  process.exit(1);
}
say(`the voice is the canned one, on ${BASE}`);

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

// ONE PIXEL TO ONE PIXEL. This machine's headless browser rasters through SwiftShader and a
// 1024x1792 webp laid out at a device pixel ratio of 2 comes back blank from it (the same page at
// dpr 1 draws the plate, and so does a real browser at dpr 2). So the frames are taken at 1; the 2x
// crop of the placard is taken separately, where no plate is in the clip.
async function open({ width, height, phone = false, dsf = 1, q = 'mute=1' }) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf, hasTouch: phone, isMobile: phone });
  const page = await context.newPage();
  const errors = [];
  const wire = []; // every request the page makes to the voice, as it goes past
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('request', (r) => {
    if (!r.url().endsWith('/api/pepe')) return;
    try {
      wire.push(JSON.parse(r.postData() ?? '{}'));
    } catch {
      wire.push({ beat: '(unreadable)' });
    }
  });
  await page.route('**/@vite/client', viteStub);
  await page.goto(`${BASE}/?${q}`, { waitUntil: 'load', timeout: 180000 });
  const t0 = Date.now();
  while (Date.now() - t0 < 180000) {
    if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
    await page.waitForTimeout(200);
  }
  return { page, context, errors, wire };
}

const until = async (page, fn, ms, what) => {
  const t0 = Date.now();
  for (;;) {
    const v = await page.evaluate(fn).catch(() => null);
    if (v) return v;
    if (Date.now() - t0 > ms) throw new Error(`timed out waiting for ${what}`);
    await page.waitForTimeout(150);
  }
};

// ── the state a proof reads ─────────────────────────────────────────────────────────────────────
const STATE = () => {
  const T = window.__theatre;
  const V = T.pieces.help.cards;
  const cap = document.querySelector('#dialogue .cap');
  const r = cap && !cap.hidden ? cap.getBoundingClientRect() : null;
  const well = document.querySelector('#dialogue .cap .well');
  const wr = well && !cap?.hidden ? well.getBoundingClientRect() : null;
  return {
    beat: T.pieces.flow.beat,
    asking: !!T.pieces.dialogue.asking,
    shot: T.pieces.camera.current,
    deck: T.pieces.props.deck.mode,
    viewer: V.showing,
    slug: V.slug,
    name: V.card?.name ?? null,
    L: V.layout(),
    sheet: V.showing ? V.sheetBox() : null,
    room: V.band(),
    plate: V.plateBox(),
    band: T.pieces.dialogue.band(),
    cap: r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null,
    wellBox: wr ? { x: wr.x, y: wr.y, w: wr.width, h: wr.height } : null,
    well: document.querySelector('#dialogue .cap .well .sr')?.textContent ?? '',
    history: (T.pieces.mind.history ?? []).map((h) => `${h.role}: ${h.text}`),
  };
};
const state = (page) => page.evaluate(STATE);

// WHERE A FINGER CAN ACTUALLY REACH ONE OF THE SEVENTY-EIGHT. The nth visible card whose centre is
// clear of the placard — which on a laptop stands at the foot and covers a fifth of the lay-out, so
// a card chosen by its index alone is sometimes a card under the caption and the tap goes to the
// caption instead. Which card gets taught is not what any of this is about; that it is a real tap
// on a real card in the drawing is.
const CARD_AT = (nth) => {
  const T = window.__theatre;
  const g = T.scene.getObjectByName('deck-out');
  const r = T.renderer.domElement.getBoundingClientRect();
  const b = T.pieces.dialogue.band();
  const W = T.size?.w || window.innerWidth;
  const pad = 14; // a finger's slop round the caption's edge
  const p = { x0: (W - b.w) / 2 - pad, x1: (W + b.w) / 2 + pad, y0: b.top - pad, y1: b.bottom + pad };
  const v = new T.THREE.Vector3();
  let k = 0;
  for (const m of g?.children ?? []) {
    if (!m.visible) continue;
    m.getWorldPosition(v).project(T.camera);
    if (v.z > 1) continue;
    const x = ((v.x + 1) / 2) * r.width + r.left, y = ((1 - v.y) / 2) * r.height + r.top;
    if (x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1) continue;
    if (x < 8 || y < 8 || x > r.width - 8 || y > r.height - 8) continue;
    if (k++ < nth) continue;
    return { x, y, slug: m.userData.slug };
  }
  return null;
};
// every laid card's box on the glass, for measuring the placard against the lay-out
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

// ── THE PLATE'S OWN PIXELS ──────────────────────────────────────────────────────────────────────
// A clip of the plate's box, read for whether there is a picture in it. A blank sheet comes back
// flat (the paper, one value); a Marseille plate is black ink on cream over its whole height.
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
// Wait for the plate to actually be ON the paper. `help.cards.ready()` already promises the picture
// is decoded and two frames have gone by; this is the pixels saying so, which is the thing the
// blank frame taught us to ask for.
async function waitPlate(page, ms = 20000) {
  await page.evaluate(() => window.__theatre.pieces.help.cards.ready());
  const t0 = Date.now();
  let ink = null;
  for (;;) {
    const box = await page.evaluate(() => window.__theatre.pieces.help.cards.plateBox());
    ink = await plateInk(page, box);
    if (ink.spread > 60) return ink;
    if (Date.now() - t0 > ms) return ink;
    await page.waitForTimeout(200);
  }
}

// ── HIS REGISTER, AS PIXELS ─────────────────────────────────────────────────────────────────────
// The top block of the placard — his two lines, and nothing of the visitor's block or their caret,
// which is why the clip is `.well` and not the whole card. What is counted is INK: how much of the
// clip is darker than the paper. Two strikes of the same sentence differ by the boil (a stroke
// jitters a pixel), so the pixels are never identical and the honest measure is how much pen is on
// the paper and where it sits.
async function wellInk(page, box, path = null) {
  const clip = { x: Math.round(box.x + 2), y: Math.round(box.y + 1), width: Math.max(8, Math.round(box.w - 4)), height: Math.max(8, Math.round(box.h - 2)) };
  const buf = await page.screenshot({ clip, scale: 'css', timeout: 120000 });
  if (path) writeFileSync(path, buf);
  const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
  let ink = 0, x0 = info.width, x1 = -1, y0 = info.height, y1 = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i] >= 150) continue;
    ink++;
    const x = i % info.width, y = (i / info.width) | 0;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return { ink, frac: ink / data.length, w: info.width, h: info.height, box: x1 < 0 ? null : { x0, y0, x1, y1 } };
}
const near = (a, b, tol) => (Math.max(a, b) === 0 ? true : Math.abs(a - b) / Math.max(a, b) <= tol);

const lessons = (wire) => wire.filter((b) => b.beat === 'lesson');

// A REAL TAP THAT ACTUALLY LANDS. The rows shingle and a card's centre is sometimes under its
// neighbour's corner, so a tap meant for one of them lands on whichever is on top there — and
// occasionally on the bare cloth between two bows, which rakes the lay-out home instead. Which card
// gets taught is not what any of this is about, so the finger tries the next one along until the
// paper comes up, and the lay-out is put back if a miss took it down.
async function tapACard(page, tap, from = 0) {
  for (let k = from; k < from + 6; k++) {
    const at = await page.evaluate(CARD_AT, k);
    if (!at) continue;
    await tap(at.x, at.y);
    await page.waitForTimeout(500);
    const s = await page.evaluate(() => ({ up: window.__theatre.pieces.help.cards.showing, deck: window.__theatre.pieces.props.deck.mode }));
    if (s.up) return { ...at, tries: k - from + 1 };
    if (s.deck !== 'open') {
      await page.evaluate(() => window.__theatre.pieces.props.deck.open());
      await page.waitForFunction(() => window.__theatre.pieces.props.deck.mode === 'open', null, { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(700);
    }
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────────────────────────
// A CARD PICKED UP OFF THE TABLE, AND THE LESSON UNDER IT
// ────────────────────────────────────────────────────────────────────────────────────────────────
async function lessonPass({ width, height, phone, tag }, held = {}) {
  const { page, context, errors, wire } = await open({ width, height, phone });
  held.context = context;
  const tap = async (x, y) => (phone ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));

  // 1. into the room, and the first open field
  await page.waitForFunction("window.__theatre?.pieces?.entrance?.mode === 'closed'", null, { timeout: 120000 });
  await tap(width / 2, height / 2);
  await until(page, () => window.__theatre.pieces.dialogue.asking, 180000, 'the first open field');
  say(`${tag}: the visitor is in the room and the field is open`);

  // 2. a real click on the squared deck: the seventy-eight go out face up, and THE PLACARD GETS OUT
  // OF THEIR WAY ON A PHONE. The user: "on mobile we'll need to move the chatbox to the top, as it
  // currently covers some of the cards."
  const box = await page.evaluate(() => window.__theatre.pieces.props.deck.tapBox());
  if (!box) {
    say(`${tag}: FAIL — the deck is not on the table`);
    bad++;
    await context.close();
    return;
  }
  await tap(box.x + box.w / 2, box.y + box.h / 2);
  await until(page, () => window.__theatre.pieces.props.deck.mode === 'open', 60000, 'the lay-out');
  await page.waitForTimeout(700);
  const laid = await state(page);
  const boxes = await page.evaluate(DECK_BOXES);
  const W = width;
  const bandBox = { x0: (W - laid.band.w) / 2, y0: laid.band.top, x1: (W + laid.band.w) / 2, y1: laid.band.bottom };
  const on = collide(boxes, bandBox);
  must(laid.deck === 'open', `${tag}: the deck did not lay out`);
  must(laid.band.at === (phone ? 'head' : 'foot'), `${tag}: the placard is at the ${laid.band.at} over the lay-out, not the ${phone ? 'head' : 'foot'}`);
  say(
    `${tag}: a click on the stack lays the deck out — shot ${laid.shot}, the rows run y ` +
      `${Math.min(...boxes.map((b) => b.y0)).toFixed(0)}–${Math.max(...boxes.map((b) => b.y1)).toFixed(0)} of ${height}, ` +
      `and the placard stands at the ${laid.band.at.toUpperCase()} (y ${laid.band.top.toFixed(0)}–${laid.band.bottom.toFixed(0)}), covering ${on.hit} of the ${boxes.length} cards` +
      `${on.hit ? ` — worst ${on.who} at ${(on.deepest * 100).toFixed(0)}%` : ''}`,
  );
  if (phone) must(on.hit === 0, `${tag}: the placard covers ${on.hit} laid card(s), worst ${on.who} at ${(on.deepest * 100).toFixed(0)}%`);

  // 3. A REAL TAP ON ONE OF THEM: the paper goes up and he starts teaching that card.
  //
  // What is waited for is HIS LINE NAMING THE CARD, and it is waited for before anything expensive
  // is measured. Two reasons, both learnt the hard way: his last conversational sentence is still
  // standing on the placard when the paper goes up (a line stands until another replaces it), so
  // "the placard has words on it" is true before the lesson has begun; and reading the plate's
  // pixels costs a screenshot, which this browser takes in seconds, by which time the first
  // sentence has been read and replaced.
  //
  // AND THE NAME IS NOW ONLY EVER SAID BY HIM. The sheet used to letter it under the plate; the
  // user had that taken off ("we can also remove the explanation, because we have the explanation
  // afterwards in the chat box"), so if his note does not name the card, nothing names it.
  const standing = (await state(page)).well;
  const spent = lessons(wire).length;
  const at = await tapACard(page, tap, 12);
  if (!at) throw new Error('no tap on the lay-out opened the viewer');
  // …and WHICH card came up is the paper's answer, not the tool's guess: the rows shingle, so a
  // finger aimed at one lands on whichever of them is on top there. Everything below is measured
  // against the card that is actually on the paper.
  const up = await page.evaluate(() => window.__theatre.pieces.help.cards.slug);
  const named = () => {
    const t = document.querySelector('#dialogue .cap .well .sr')?.textContent ?? '';
    const n = window.__theatre.pieces.help.cards.card?.name ?? '';
    return n && t.toUpperCase().includes(n.toUpperCase()) ? t : null;
  };
  const first = await until(page, named, 40000, 'his first line of the lesson');
  const name1 = await page.evaluate(() => window.__theatre.pieces.help.cards.card?.name ?? '');

  // the beat, on the wire
  const asked = lessons(wire).slice(spent);
  must(asked.length === 1, `${tag}: the tap asked for ${asked.length} lessons, not one`);
  const note = asked[0] ?? {};
  must(note.slug === up, `${tag}: the lesson went out for ${note.slug} and the paper has ${up}`);
  must(!!note.facts && note.facts.length > 40, `${tag}: the lesson carried no facts from the bank`);
  must(!!note.cardName, `${tag}: the lesson carried no card name, so the gate cannot let him say it`);
  say(
    `${tag}: a tap on the cloth (${at.tries} finger${at.tries > 1 ? 's' : ''}) puts ${up} on the paper — the wire carries beat "${note.beat}" slug "${note.slug}" name "${note.cardName}" ` +
      `suit ${note.suit === null ? 'null (a trump)' : `"${note.suit}"`} numeral ${note.numeral ?? 'null'} · facts ${note.facts?.length ?? 0} chars: "${(note.facts ?? '').slice(0, 90)}…"`,
  );
  say(`${tag}: the placard was standing on "${standing}" and now says "${first}"`);
  must(first.toUpperCase().includes(name1.toUpperCase()), `${tag}: his first line does not name the card ("${first}")`);
  say(`${tag}: nothing on the paper names it, and his own first line does — "${name1}" is in "${first}"`);

  // …and the card that is up is the one he is naming, with the picture actually in the frame
  const seenNow = await page.evaluate(() => window.__theatre.pieces.help.cards.slug);
  must(seenNow === up, `${tag}: the paper drifted from ${up} to ${seenNow}`);

  // 4. ONE TAP, ONE LESSON, AND NO WAY TO STEP IT. The arrows, BACK and the swipe are gone; the api
  // still walks the deck for a tool and says nothing when it does, so a lesson cannot be cut off by
  // anything but the visitor putting the paper down.
  const before = lessons(wire).length;
  const quiet = await page.evaluate(async () => {
    const V = window.__theatre.pieces.help.cards;
    const seen = [];
    window.__theatre.on?.('help:cards', (d) => seen.push(d?.slug));
    const was = V.slug;
    return { was, seen };
  });
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(600);
  const stillOn = await page.evaluate(() => window.__theatre.pieces.help.cards.slug);
  must(stillOn === quiet.was, `${tag}: an arrow key stepped the card (${quiet.was} → ${stillOn})`);
  must(lessons(wire).length === before, `${tag}: ${lessons(wire).length - before} more lesson(s) went out with nothing touched`);
  say(`${tag}: the keys do not step it (${quiet.was} is still up) and no second lesson went out on the wire`);

  // 5. THE PLATE, AND THE TWO SHEETS. The picture is measured by its own pixels — `load` is not
  // paint, and the first judged frame of this face was the sheet with a white hole in it.
  const ink = await waitPlate(page);
  must(ink.spread > 60, `${tag}: the plate is blank (spread ${ink.spread}, mean ${ink.mean.toFixed(0)})`);
  const s3 = await state(page);
  const paperTop = s3.sheet.y, paperBottom = s3.sheet.y + s3.sheet.h;
  const clear = s3.band.at === 'head' ? paperTop - s3.band.bottom : s3.band.top - paperBottom;
  must(!!s3.cap, `${tag}: nothing is standing on the placard`);
  must(clear > 0, `${tag}: the paper (${paperTop.toFixed(0)}–${paperBottom.toFixed(0)}) runs into the placard's band (${s3.band.top.toFixed(0)}–${s3.band.bottom.toFixed(0)})`);
  if (s3.cap) {
    const capClear = s3.band.at === 'head' ? paperTop - (s3.cap.y + s3.cap.h) : s3.cap.y - paperBottom;
    must(capClear > 0, `${tag}: the paper covers the placard itself (${capClear.toFixed(0)} px)`);
    must(Math.abs(s3.band.top + 15 - s3.cap.y) < 3, `${tag}: dialogue.band() says ${s3.band.top.toFixed(1)} and the card is at ${s3.cap.y.toFixed(1)}`);
  }
  say(`${tag}: the plate is on the paper — ${s3.plate.w.toFixed(0)}x${s3.plate.h.toFixed(0)} css px off a ${s3.plate.natural.join('x')} face, ink spread ${ink.spread}, mean ${ink.mean.toFixed(0)}`);
  say(
    `${tag}: the paper is ${s3.L.card.w}x${s3.L.card.h} px at y ${paperTop.toFixed(0)}–${paperBottom.toFixed(0)} in a free band of ${s3.room.free} ` +
      `(the placard has taken ${s3.room.top} off the head and ${s3.room.bottom} off the foot); ` +
      `the placard's own band is ${s3.band.top.toFixed(0)}–${s3.band.bottom.toFixed(0)} (${s3.band.h.toFixed(0)} px, at the ${s3.band.at}), ` +
      `the card itself at ${s3.cap?.y.toFixed(0)}–${(s3.cap?.y + s3.cap?.h).toFixed(0)} · ${clear.toFixed(0)} px of paper between them`,
  );
  say(`${tag}: on the placard in the frame — "${s3.well}"`);
  // …and the visitor's own block is NOT open under it. A caret blinking under a card he is teaching
  // is an invitation to stop reading; a question can wait.
  must(!s3.asking, `${tag}: the field is open under the lesson`);
  say(`${tag}: the field is shut while the paper is up (asking=${s3.asking}), so the lesson has the card to itself`);
  await page.screenshot({ path: `${OUT}/lesson-${width}x${height}.png`, scale: 'css', timeout: 120000 });

  // the placard, at twice the pixels, which is the only way to see whether the hand is holding
  await cropPass({ width, height, phone, slug: s3.slug });

  // 6. THE CLOSE, MID-LESSON, AND THE PLACARD LEFT CLEAN ────────────────────────────────────────
  // This is the user's complaint, measured: "switching the card before the explainer happens kind
  // of seems to break the chat window. It then comes back afterwards, but it's not clean." Nothing
  // can switch the card any more, so the one thing that can end a lesson early is the tap that puts
  // the paper down — and it is taken HERE, while a take of his is still being typed out.
  //
  // What is measured is the placard's own pixels: his register clipped a second after the close,
  // again a second after that (nothing may be drawn or wiped in between), and then against the SAME
  // LINE put up by the ordinary road on the same page — same window, same dock, same hand. Two
  // strikes are never identical (the line boils), so what is compared is how much ink is on the
  // paper and where its box sits.
  // ESCAPE puts the first paper down, so the cloth is the visitor's again and the second card can
  // be taken by a real tap rather than through the api
  await page.keyboard.press('Escape');
  await until(page, () => !window.__theatre.pieces.help.cards.showing, 10000, 'Escape putting the paper down');
  await page.waitForTimeout(400);
  const esc = await state(page);
  must(!esc.viewer, `${tag}: Escape did not put the paper down`);
  must(esc.deck === 'open', `${tag}: Escape disturbed the lay-out (deck ${esc.deck})`);
  say(`${tag}: Escape — the paper is down and the deck is still ${esc.deck}`);
  await until(page, () => window.__theatre.pieces.dialogue.asking, 60000, 'the field after Escape').catch(() => {});

  // a fresh card, so a fresh lesson is in flight when the finger lands
  const spent2 = lessons(wire).length;
  const at2 = await tapACard(page, tap, 24);
  if (!at2) throw new Error('no tap on the lay-out opened the viewer a second time');
  await until(page, named, 40000, 'the second lesson starting');
  const cutAt = await state(page);
  // WHERE THE ROOM IS, measured off the sheet that is actually up: the deepest of the four margins
  // round it. On a phone the paper is 362 px of a 390 px frame, so the only real room off it is the
  // band the placard has taken — which is exactly where a thumb goes, and which falls through the
  // caption to the drawing (help.js puts the paper down from there).
  const outside = await page.evaluate(() => {
    const T = window.__theatre;
    const s = T.pieces.help.cards.sheetBox();
    const W = T.size?.w || window.innerWidth, H = T.size?.h || window.innerHeight;
    return [
      { d: s.x, x: s.x / 2, y: s.y + s.h / 2, where: 'the left margin' },
      { d: W - (s.x + s.w), x: (W + s.x + s.w) / 2, y: s.y + s.h / 2, where: 'the right margin' },
      { d: s.y, x: W / 2, y: s.y / 2, where: 'above the paper' },
      { d: H - (s.y + s.h), x: W / 2, y: (H + s.y + s.h) / 2, where: 'below the paper' },
    ].sort((a, b) => b.d - a.d)[0];
  });
  await tap(outside.x, outside.y);
  await until(page, () => !window.__theatre.pieces.help.cards.showing, 10000, 'the paper going down');
  const shut = await state(page);
  must(shut.deck === 'open', `${tag}: the tap outside disturbed the lay-out (deck ${shut.deck})`);
  say(
    `${tag}: the finger goes down on ${outside.where} (${outside.d.toFixed(0)} px of room) while he is mid-lesson on ${cutAt.slug} — ` +
      `the paper is down, the deck is still ${shut.deck}, and ${lessons(wire).length - spent2} lesson went out for it`,
  );
  // …the field comes back, on the line they were answering
  const backBeat = await until(page, () => (window.__theatre.pieces.dialogue.asking ? window.__theatre.pieces.flow.beat : null), 60000, 'the field again').catch(() => null);
  await page.waitForTimeout(1000);
  const A = await state(page);
  must(!!A.wellBox && !!A.well, `${tag}: the placard is bare a second after the close`);
  const a1 = await wellInk(page, A.wellBox, `${OUT}/placard-after-close-${width}x${height}.png`);
  await page.waitForTimeout(1000);
  const A2 = await state(page);
  const a2 = await wellInk(page, A.wellBox);
  must(A2.well === A.well, `${tag}: the placard changed by itself after the close ("${A.well}" → "${A2.well}")`);
  must(near(a1.ink, a2.ink, 0.1), `${tag}: the placard was still being drawn a second later (${a1.ink} → ${a2.ink} px of ink)`);
  say(
    `${tag}: a second after the close the placard says "${A.well}" over an open field (beat "${backBeat ?? A.beat}"), ` +
      `${a1.ink} px of ink in his register (${(a1.frac * 100).toFixed(1)}% of a ${a1.w}x${a1.h} clip); a second later, ${a2.ink} px — it is standing still`,
  );

  // …and the same line, put up the ordinary way, on the same page
  let B = null, b1 = null;
  for (let attempt = 0; attempt < 2 && !b1; attempt++) {
    await page.evaluate((t) => {
      const D = window.__theatre.pieces.dialogue;
      D.say(t, { hold: 90 });
      D.skip();
    }, A.well);
    await page.waitForTimeout(900);
    const s = await state(page);
    if (s.well !== A.well || !s.wellBox) continue;
    B = s;
    b1 = await wellInk(page, s.wellBox, `${OUT}/placard-standing-${width}x${height}.png`);
  }
  if (must(!!b1, `${tag}: the same line would not stand still long enough to be compared`)) {
    const sameBox = Math.abs(B.wellBox.y - A.wellBox.y) < 1.5 && Math.abs(B.wellBox.h - A.wellBox.h) < 1.5;
    must(sameBox, `${tag}: the two placards are not the same block (${JSON.stringify(A.wellBox)} vs ${JSON.stringify(B.wellBox)})`);
    must(near(a1.ink, b1.ink, 0.15), `${tag}: the placard after the close carries ${a1.ink} px of ink and the same line standing carries ${b1.ink}`);
    const dx = a1.box && b1.box ? Math.abs(a1.box.x0 - b1.box.x0) + Math.abs(a1.box.x1 - b1.box.x1) : 999;
    const dy = a1.box && b1.box ? Math.abs(a1.box.y0 - b1.box.y0) + Math.abs(a1.box.y1 - b1.box.y1) : 999;
    must(dx < 8 && dy < 8, `${tag}: the words sit in a different place (${dx} px across, ${dy} px down)`);
    say(
      `${tag}: against the same line standing normally — ${a1.ink} px of ink against ${b1.ink} ` +
        `(${((Math.abs(a1.ink - b1.ink) / Math.max(a1.ink, b1.ink)) * 100).toFixed(1)}% apart, which is the boil), ` +
        `the ink's own box within ${dx} px across and ${dy} px down. The close leaves the placard as if nothing had been interrupted.`,
    );
  }
  await page.screenshot({ path: `${OUT}/back-${width}x${height}.png`, scale: 'css', timeout: 120000 });

  // 7. THE RECORD. Both lessons are turns of his and the transcript has them.
  const end = await state(page);
  const his = end.history.filter((h) => h.startsWith('pepe:'));
  const taught = his.filter((h) => h.toUpperCase().includes(name1.toUpperCase()) || h.toUpperCase().includes(String(cutAt.name).toUpperCase()));
  must(taught.length >= 2, `${tag}: the history carries ${taught.length} of the two lessons`);
  must(!end.history.some((h) => h.endsWith(': ')), `${tag}: the history carries an empty turn`);
  say(`${tag}: the history carries ${end.history.length} turns, ${taught.length} of them lessons — ${taught.map((t) => `"${t.slice(6, 60)}…"`).join(' · ')}`);

  // 8. THE PLACARD COMES HOME. On a phone it hangs from the head for as long as the rows are out;
  // once the deck is squared it is back at the foot, where it stands all evening.
  await page.evaluate(() => window.__theatre.pieces.props.deck.close());
  await until(page, () => window.__theatre.pieces.props.deck.mode === 'shut', 60000, 'the rake home');
  await page.waitForTimeout(700);
  const home = await state(page);
  must(home.band.at === 'foot', `${tag}: the placard did not come back to the foot after the gather (${home.band.at})`);
  say(`${tag}: the deck is gathered and the placard is back at the ${home.band.at}, y ${home.band.top.toFixed(0)}–${home.band.bottom.toFixed(0)}`);
  await page.screenshot({ path: `${OUT}/gathered-${width}x${height}.png`, scale: 'css', timeout: 120000 });

  // 9. AND A KEYLESS EVENING. With no live voice nothing is asked for and nothing is said: the
  // viewer shows the card and the placard is left exactly as it was. (The room's own switch is
  // `mind.available`, which is what a missing key sets; there is no other door into the lesson.)
  await page.evaluate(() => window.__theatre.pieces.props.deck.open());
  await until(page, () => window.__theatre.pieces.props.deck.mode === 'open', 60000, 'the lay-out again');
  await page.waitForTimeout(600);
  await page.evaluate(() => (window.__theatre.pieces.mind.available = false));
  const quiet0 = lessons(wire).length;
  const wasStanding = (await state(page)).well;
  const at3 = await tapACard(page, tap, 33);
  if (!at3) throw new Error('no tap on the lay-out opened the keyless viewer');
  await page.waitForTimeout(3500);
  const mute = await state(page);
  must(lessons(wire).length === quiet0, `${tag}: a keyless evening still asked for ${lessons(wire).length - quiet0} lesson(s)`);
  must(mute.well === wasStanding, `${tag}: a keyless evening put something on the placard ("${wasStanding}" → "${mute.well}")`);
  // (which card is not the point and cannot be insisted on: the rows shingle, so a tap on the
  // visible corner of one lands on whichever of them is actually on top there)
  must(mute.viewer && !!mute.slug, `${tag}: the keyless viewer put no card on the paper`);
  say(`${tag}: keyless — the paper shows ${mute.slug} and the placard still says "${mute.well || '(nothing)'}"; nothing went out on the wire`);
  await page.screenshot({ path: `${OUT}/keyless-${width}x${height}.png`, scale: 'css', timeout: 120000 });

  say(`${tag}: ${errors.length ? 'PAGE ERRORS: ' + errors.slice(0, 3).join(' | ') : 'no page errors'}`);
  if (errors.length) bad++;
  await context.close();
}

// THE PLACARD AT 2x, with the paper beside it — the only way to see whether a hand-cut letter is
// holding at a 14 px cap. The clip is the placard's own band and a little air, wherever it is
// standing: at the foot on a laptop, at the head on a phone with the deck out.
async function cropPass({ width, height, phone, slug }) {
  const { page, context } = await open({ width, height, phone, dsf: 2, q: 'now=10:10&shot=1&mute=1' });
  try {
    const geo = await page.evaluate(async (s) => {
      const T = window.__theatre;
      T.pieces.help.cards.open(s);
      await T.pieces.help.cards.ready();
      T.pieces.dialogue.say('IT IS THE PICTURE BEFORE THE MEANING, ANON.', { hold: 60 });
      return { band: T.pieces.dialogue.band(), L: T.pieces.help.cards.layout(), sheet: T.pieces.help.cards.sheetBox() };
    }, slug);
    // the take, typed out in full rather than waited out: the visitor's own key does this
    await page.waitForTimeout(600);
    await page.evaluate(() => window.__theatre.pieces.dialogue.skip());
    await page.waitForTimeout(600);
    const top = Math.max(0, Math.round(geo.band.top - 8));
    await page.screenshot({
      path: `${OUT}/placard-${width}x${height}.png`,
      scale: 'device',
      timeout: 120000,
      clip: { x: 0, y: top, width, height: Math.min(height - top, Math.round(geo.band.bottom - top + 8)) },
    });
  } finally {
    await context.close().catch(() => {});
  }
}

// ────────────────────────────────────────────────────────────────────────────────────────────────
// AN EVENING THAT IS NOTHING BUT A LESSON
// ────────────────────────────────────────────────────────────────────────────────────────────────
// Nothing was shuffled and nothing is on the cloth, so the sheet has a transcript and no cards. It
// has to come out anyway: the notice's «KEEP THIS READING» is live the moment anybody has said
// anything, and a lesson is something he said.
async function keepPass() {
  const { page, context, errors } = await open({ width: 1280, height: 800 });
  try {
    await page.waitForFunction("window.__theatre?.pieces?.entrance?.mode === 'closed'", null, { timeout: 120000 });
    await page.mouse.click(640, 400);
    await until(page, () => window.__theatre.pieces.dialogue.asking, 180000, 'the first open field');
    // the room, cleared of everything he said on the way in: what is left is the lesson alone
    await page.evaluate(() => window.__theatre.pieces.mind.history.splice(0));
    const box = await page.evaluate(() => window.__theatre.pieces.props.deck.tapBox());
    await page.mouse.click(box.x + box.w / 2, box.y + box.h / 2);
    await until(page, () => window.__theatre.pieces.props.deck.mode === 'open', 60000, 'the lay-out');
    await page.waitForTimeout(500); // the rows have come to rest; now one of them can be pointed at
    // …and the one pointed at is whichever the finger can actually reach: the rows shingle and the
    // placard stands over one end of the frame, so a card's centre is not always the visitor's to
    // touch. Which card gets taught is not what this pass is about.
    const opened = await tapACard(page, (x, y) => page.mouse.click(x, y), 12);
    if (!opened) throw new Error('no tap on the lay-out opened the viewer');
    await until(page, () => {
      const t = document.querySelector('#dialogue .cap .well .sr')?.textContent ?? '';
      const n = window.__theatre.pieces.help.cards.card?.name ?? '';
      return n && t.toUpperCase().includes(n.toUpperCase());
    }, 40000, 'the lesson on the placard');
    // …and then WAIT FOR THE TURN TO END, not for a stopwatch: a turn is written into the record
    // when it is over (mind.js, `finish`), and the record is what the sheet is made of.
    await until(page, () => (window.__theatre.pieces.mind.history ?? []).some((h) => h.role === 'pepe' && h.text), 90000, 'the whole lesson in the record');
    await page.waitForTimeout(300);

    const sheet = await page.evaluate(async () => {
      const T = window.__theatre;
      const K = T.pieces.help.keep;
      const reading = K.readingNow(T);
      const pages = await K.renderPages(reading, { scale: 1 });
      const blob = await K.pdfFrom(pages, { when: reading.when });
      return {
        has: K.hasReading(T),
        cards: reading.cards.length,
        turns: reading.transcript.length,
        pages: pages.length,
        bytes: blob.size,
        first: reading.transcript[0]?.text ?? '',
        png: pages[0].toDataURL('image/png'),
      };
    });
    must(sheet.has, 'keep: a lesson-only evening has nothing to keep');
    must(sheet.cards === 0, `keep: ${sheet.cards} cards on the cloth — this evening was to have none`);
    must(sheet.turns > 0, 'keep: the transcript is empty');
    must(sheet.pages >= 1 && sheet.bytes > 2000, `keep: the sheet came out as ${sheet.pages} page(s), ${sheet.bytes} bytes`);
    writeFileSync(`${OUT}/keep-lesson-only.png`, Buffer.from(sheet.png.split(',')[1], 'base64'));
    say(`keep: an evening of one lesson and nothing else — ${sheet.cards} cards, ${sheet.turns} turns, ${sheet.pages} page(s), ${sheet.bytes} bytes of PDF`);
    say(`keep: the first line on it — "${sheet.first.slice(0, 90)}"`);
    say(`keep: ${errors.length ? 'PAGE ERRORS: ' + errors.slice(0, 3).join(' | ') : 'no page errors'}`);
    if (errors.length) bad++;
  } catch (e) {
    say(`keep: FAIL — ${e.message.split('\n')[0]}`);
    bad++;
  } finally {
    await context.close().catch(() => {});
  }
}

// ────────────────────────────────────────────────────────────────────────────────────────────────
if (has('lesson')) {
  for (const size of [
    { width: 1280, height: 800, phone: false, tag: 'laptop 1280x800' },
    { width: 390, height: 844, phone: true, tag: 'phone 390x844' },
  ]) {
    const held = { context: null };
    try {
      await lessonPass(size, held);
    } catch (e) {
      say(`${size.tag}: FAIL — ${e.message.split('\n')[0]}`);
      bad++;
    } finally {
      await held.context?.close().catch(() => {});
    }
  }
}
if (has('keep')) await keepPass();

await browser.close();
spawned?.kill('SIGTERM');
say(bad ? `\n${bad} FAILURE(S)` : '\nall of it holds');
process.exit(bad ? 1 : 0);
