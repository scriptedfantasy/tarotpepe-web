#!/usr/bin/env node
// THE LESSON, PROVED. The user, on the whole deck lying face up on the cloth: "maybe this could be
// the teaching - in this whole laid out view, whenever a user clicks a card, pepe could explain the
// suit and the individual cards."
//
// So the ? card's third face is a lesson: the visitor picks a card up off the table, it goes on the
// paper (src/pieces/help-cards.js), and the room asks him for a `lesson` beat on it (flow.js →
// mind.js → server/pepe.mjs). His lines stand on the placard at the foot of the frame, under the
// picture, while the paper stays up.
//
// Nothing here is set by hand. The deck is laid out by a REAL click on the stack on the table, the
// card is opened by a REAL tap on one of the seventy-eight, the arrows are CLICKED, BACK is
// CLICKED, and every request the page makes to /api/pepe is read off the wire as it goes past —
// which is the only way to say whether a step started a new lesson and stopped the old one.
//
// THE PLATE IS WAITED FOR BY ITS PIXELS. `load` means the bytes arrived, not that the picture is on
// the paper, and the first judged frame of this face was the sheet with a white hole in it
// (public/progress/card-viewer/viewer-1280x800.png). So every frame here is taken only once a clip
// of the plate's own box comes back with a picture in it — measured, not waited out.
//
//   lesson   1280x800 and 390x844: the lay-out, a tap, the viewer with the plate rendered, the
//            `lesson` beat on the wire with its slug and its facts, his lines on the placard
//            beneath the paper, the geometry of the two sheets, ‹ › stepping, BACK, the history
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
  return {
    beat: T.pieces.flow.beat,
    asking: !!T.pieces.dialogue.asking,
    shot: T.pieces.camera.current,
    deck: T.pieces.props.deck.mode,
    viewer: V.showing,
    slug: V.slug,
    name: V.card?.name ?? null,
    L: V.layout(),
    plate: V.plateBox(),
    band: T.pieces.dialogue.band(),
    cap: r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null,
    well: document.querySelector('#dialogue .cap .well .sr')?.textContent ?? '',
    history: (T.pieces.mind.history ?? []).map((h) => `${h.role}: ${h.text}`),
  };
};
const state = (page) => page.evaluate(STATE);

// where one of the seventy-eight is on the glass
const CARD_AT = (i) => {
  const T = window.__theatre;
  const g = T.scene.getObjectByName('deck-out');
  const m = g?.children.filter((c) => c.visible)[i];
  if (!m) return null;
  const v = m.getWorldPosition(new T.THREE.Vector3()).project(T.camera);
  const r = T.renderer.domElement.getBoundingClientRect();
  return { x: ((v.x + 1) / 2) * r.width + r.left, y: ((1 - v.y) / 2) * r.height + r.top, slug: m.userData.slug };
};

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

const lessons = (wire) => wire.filter((b) => b.beat === 'lesson');

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

  // 2. a real click on the squared deck: the seventy-eight go out face up
  const box = await page.evaluate(() => window.__theatre.pieces.props.deck.tapBox());
  if (!box) {
    say(`${tag}: FAIL — the deck is not on the table`);
    bad++;
    await context.close();
    return;
  }
  await tap(box.x + box.w / 2, box.y + box.h / 2);
  await until(page, () => window.__theatre.pieces.props.deck.mode === 'open', 60000, 'the lay-out');
  await page.waitForTimeout(400);
  const laid = await state(page);
  must(laid.deck === 'open', `${tag}: the deck did not lay out`);
  must(laid.band.at === 'foot', `${tag}: the placard docked to the head over the lay-out (${laid.band.at})`);
  say(`${tag}: a click on the stack lays the deck out — shot ${laid.shot}, the placard stands at the ${laid.band.at}`);

  // 3. A REAL TAP ON ONE OF THEM: the paper goes up and he starts teaching that card.
  //
  // What is waited for is HIS LINE NAMING THE CARD, and it is waited for before anything expensive
  // is measured. Two reasons, both learnt the hard way: his last conversational sentence is still
  // standing on the placard when the paper goes up (a line stands until another replaces it), so
  // "the placard has words on it" is true before the lesson has begun; and reading the plate's
  // pixels costs a screenshot, which this browser takes in seconds, by which time the first
  // sentence has been read and replaced.
  const standing = (await state(page)).well;
  const spent = lessons(wire).length;
  const at = await page.evaluate(CARD_AT, 30);
  await tap(at.x, at.y);
  await until(page, () => window.__theatre.pieces.help.cards.showing, 30000, 'the viewer');
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
  must(note.slug === at.slug, `${tag}: the lesson went out for ${note.slug}, not ${at.slug}`);
  must(!!note.facts && note.facts.length > 40, `${tag}: the lesson carried no facts from the bank`);
  must(!!note.cardName, `${tag}: the lesson carried no card name, so the gate cannot let him say it`);
  say(
    `${tag}: a tap on ${at.slug} — the wire carries beat "${note.beat}" slug "${note.slug}" name "${note.cardName}" ` +
      `suit ${note.suit === null ? 'null (a trump)' : `"${note.suit}"`} numeral ${note.numeral ?? 'null'} · facts ${note.facts?.length ?? 0} chars: "${(note.facts ?? '').slice(0, 90)}…"`,
  );
  say(`${tag}: the placard was standing on "${standing}" and now says "${first}"`);
  must(first.toUpperCase().includes(name1.toUpperCase()), `${tag}: his first line does not name the card ("${first}")`);
  say(`${tag}: the gate let him name it — "${name1}" is in his own line, so nothing was struck`);

  // 4. THE STEP, TAKEN AT ONCE. His first sentence is on the card and the canned voice has two more
  // behind it, so a lesson that is stopped is a lesson with fewer than three sentences in the
  // record. Everything slow is measured after this, on the card the step arrives at.
  const before = lessons(wire).length;
  const sentences = (s) => s.split(/[.!?…]+/).filter((x) => x.trim()).length;
  const b = await page.evaluate(() => window.__theatre.pieces.help.cards.controlBox('next'));
  await tap(b.x + b.w / 2, b.y + b.h / 2);
  const firstNext = await until(page, named, 40000, "the next card's lesson");
  const cut = (await state(page)).history.filter((h) => h.toUpperCase().includes(name1.toUpperCase())).pop() ?? '';
  await page.waitForTimeout(3000); // …long enough for the old lesson to have carried on, if it had
  const s2 = await state(page);
  const after = lessons(wire).slice(before);
  must(after.length === 1, `${tag}: the step asked for ${after.length} lessons, not one`);
  must(after[0]?.slug === s2.slug, `${tag}: the step asked about ${after[0]?.slug}, not ${s2.slug}`);
  const stopped = s2.history.filter((h) => h.toUpperCase().includes(name1.toUpperCase())).pop() ?? '';
  must(stopped === cut, `${tag}: the old lesson carried on after the step ("${cut}" → "${stopped}")`);
  must(sentences(stopped) < 3, `${tag}: the old lesson ran to the end anyway (${sentences(stopped)} of 3 sentences)`);
  say(
    `${tag}: › — NEXT goes ${at.slug} → ${s2.slug}, one new request for it and no more; ` +
      `the ${name1} lesson stopped at ${sentences(stopped)} of the canned voice's 3 sentences and did not grow in the 3 s after`,
  );
  say(`${tag}: what is left of it in the record — "${stopped.slice(6)}"`);
  say(`${tag}: the new card's first line — "${firstNext}"`);

  // …and the other arrow, which is the same event by another hand
  const back1 = lessons(wire).length;
  const bp = await page.evaluate(() => window.__theatre.pieces.help.cards.controlBox('prev'));
  await tap(bp.x + bp.w / 2, bp.y + bp.h / 2);
  const firstPrev = await until(page, named, 40000, "the previous card's lesson");
  const s2b = await state(page);
  const back = lessons(wire).slice(back1);
  must(back.length === 1 && back[0]?.slug === s2b.slug, `${tag}: ‹ asked for ${back.length} lessons about ${back[0]?.slug} (the card is ${s2b.slug})`);
  say(`${tag}: ‹ — PREVIOUS goes ${s2.slug} → ${s2b.slug}, again one request and one lesson: "${firstPrev}"`);

  // 5. THE PLATE, AND THE TWO SHEETS. The picture is measured by its own pixels — `load` is not
  // paint, and the first judged frame of this face was the sheet with a white hole in it.
  const ink = await waitPlate(page);
  must(ink.spread > 60, `${tag}: the plate is blank (spread ${ink.spread}, mean ${ink.mean.toFixed(0)})`);
  const s3 = await state(page);
  const paperBottom = s3.L.card.y + s3.L.card.h;
  must(!!s3.cap, `${tag}: nothing is standing on the placard`);
  must(paperBottom < s3.band.top, `${tag}: the paper (to ${paperBottom}) runs into the placard's band (from ${s3.band.top.toFixed(0)})`);
  if (s3.cap) {
    must(paperBottom < s3.cap.y, `${tag}: the paper (to ${paperBottom}) covers the placard itself (from ${s3.cap.y.toFixed(0)})`);
    must(Math.abs(s3.band.top + 15 - s3.cap.y) < 3, `${tag}: dialogue.band() says ${s3.band.top.toFixed(1)} and the card is at ${s3.cap.y.toFixed(1)}`);
  }
  say(`${tag}: the plate is on the paper — ${s3.plate.w.toFixed(0)}x${s3.plate.h.toFixed(0)} css px off a ${s3.plate.natural.join('x')} face, ink spread ${ink.spread}, mean ${ink.mean.toFixed(0)}`);
  say(
    `${tag}: the paper is ${s3.L.card.w}x${s3.L.card.h} px at y ${s3.L.card.y}–${paperBottom} in a free band of ${s3.L.free.toFixed(0)}; ` +
      `the placard's own band is ${s3.band.top.toFixed(0)}–${s3.band.bottom.toFixed(0)} (${s3.band.h.toFixed(0)} px, at the ${s3.band.at}), ` +
      `the card itself at ${s3.cap?.y.toFixed(0)}–${(s3.cap?.y + s3.cap?.h).toFixed(0)} · ${(s3.band.top - paperBottom).toFixed(0)} px of paper between them`,
  );
  say(`${tag}: on the placard in the frame — "${s3.well}"`);
  // …and the visitor's own block is NOT open under it. A caret blinking under a card he is teaching
  // is an invitation to stop reading; a question can wait for BACK.
  must(!s3.asking, `${tag}: the field is open under the lesson`);
  say(`${tag}: the field is shut while the paper is up (asking=${s3.asking}), so the lesson has the card to itself`);
  await page.screenshot({ path: `${OUT}/lesson-${width}x${height}.png`, scale: 'css', timeout: 120000 });

  // the placard, at twice the pixels, which is the only way to see whether the hand is holding
  await cropPass({ width, height, phone, slug: s3.slug });

  // 6. BACK: the paper goes down, the deck is untouched, the field comes back
  const b2 = await page.evaluate(() => window.__theatre.pieces.help.cards.controlBox('back'));
  await tap(b2.x + b2.w / 2, b2.y + b2.h / 2);
  await until(page, () => !window.__theatre.pieces.help.cards.showing, 10000, 'the paper going down');
  const backBeat = await until(page, () => (window.__theatre.pieces.dialogue.asking ? window.__theatre.pieces.flow.beat : null), 60000, 'the field again').catch(() => null);
  const end = await state(page);
  must(!end.viewer, `${tag}: BACK did not put the paper down`);
  must(end.asking, `${tag}: the field did not come back after BACK`);
  must(end.deck === 'open', `${tag}: BACK disturbed the lay-out (deck ${end.deck})`);
  say(`${tag}: BACK — the paper is down, the deck is still ${end.deck}, the field is open again on beat "${backBeat ?? end.beat}"`);
  await page.screenshot({ path: `${OUT}/back-${width}x${height}.png`, scale: 'css', timeout: 120000 });

  // 7. THE RECORD. Both lessons are turns of his and the transcript has them.
  const his = end.history.filter((h) => h.startsWith('pepe:'));
  const taught = his.filter((h) => h.toUpperCase().includes(name1.toUpperCase()) || h.toUpperCase().includes(String(s2.name).toUpperCase()) || h.toUpperCase().includes(String(s2b.name).toUpperCase()));
  must(taught.length >= 3, `${tag}: the history carries ${taught.length} of the three lessons`);
  must(!end.history.some((h) => h.endsWith(': ')), `${tag}: the history carries an empty turn`);
  say(`${tag}: the history carries ${end.history.length} turns, ${taught.length} of them lessons — ${taught.map((t) => `"${t.slice(6, 60)}…"`).join(' · ')}`);

  // 8. AND A KEYLESS EVENING. With no live voice nothing is asked for and nothing is said: the
  // viewer shows the card and the placard is left exactly as it was. (The room's own switch is
  // `mind.available`, which is what a missing key sets; there is no other door into the lesson.)
  await page.evaluate(() => (window.__theatre.pieces.mind.available = false));
  const quiet0 = lessons(wire).length;
  const wasStanding = (await state(page)).well;
  const at2 = await page.evaluate(CARD_AT, 44);
  await tap(at2.x, at2.y);
  await until(page, () => window.__theatre.pieces.help.cards.showing, 30000, 'the viewer, keyless');
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

// THE PLACARD AT 2x, with the paper above it — the only way to see whether a hand-cut letter is
// holding at a 14 px cap. The clip starts under the paper, so no plate is in it.
async function cropPass({ width, height, phone, slug }) {
  const { page, context } = await open({ width, height, phone, dsf: 2, q: 'now=10:10&shot=1&mute=1' });
  try {
    const geo = await page.evaluate(async (s) => {
      const T = window.__theatre;
      T.pieces.help.cards.open(s);
      await T.pieces.help.cards.ready();
      T.pieces.dialogue.say('IT IS THE PICTURE BEFORE THE MEANING, ANON.', { hold: 60 });
      return { band: T.pieces.dialogue.band(), L: T.pieces.help.cards.layout() };
    }, slug);
    // the take, typed out in full rather than waited out: the visitor's own key does this
    await page.waitForTimeout(600);
    await page.evaluate(() => window.__theatre.pieces.dialogue.skip());
    await page.waitForTimeout(600);
    const top = Math.max(0, Math.round(geo.L.card.y + geo.L.card.h - 6));
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
    // placard stands over the foot of the frame, so a card's centre is not always the visitor's to
    // touch. Which card gets taught is not what this pass is about.
    let opened = false;
    for (const i of [30, 20, 40, 10, 50, 60]) {
      const at = await page.evaluate(CARD_AT, i);
      if (!at) continue;
      await page.mouse.click(at.x, at.y);
      await page.waitForTimeout(700);
      opened = await page.evaluate(() => window.__theatre.pieces.help.cards.showing);
      if (opened) break;
    }
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
