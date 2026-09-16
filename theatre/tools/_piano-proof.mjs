#!/usr/bin/env node
// THE SPINET, PLAYED LIKE A VISITOR (src/pieces/props-piano.js, piano-song.js, piano-hands.js, the
// `piano` shot in camera-shots.js and the fourth place in walk.js).
//
// Nothing below asks the piece whether it thinks the song is going. Every claim has a witness:
//   the ARBITER     props.switches.at(x, y) at the piano's own box from the chair and at the KEYS
//                   from the piano's shot — the case walks, the keys play, and they never both
//                   answer a point
//   a real CLICK    page.mouse.click, through the arbiter, with no api called
//   the FRAME       where the two ends of the keyboard land on the glass at 1280x800, 1600x900
//                   and 390x844
//   the KEYS        which of the 88 are DOWN on each drawing, counted against the note data over
//                   the first eight bars — the song is checked against its own score
//   the HANDS       four separate witnesses, because the hands are what round 2 was called for:
//                     · the TIPS. Every finger that is sounding a note, projected onto the glass
//                       beside the key it is sounding, in pixels. A hand playing a chord it is not
//                       standing on is the one thing this drawing cannot get away with.
//                     · the GREEN. Its area, and how far it reaches along the keyboard measured in
//                       octaves of that keyboard's own white keys.
//                     · the BACKS. The green cut across the hand: four or five separate runs where
//                       the fingers are and one solid run where the palm is, with the fingers
//                       FARTHER INTO the keyboard than the palm — which is what the back of a hand
//                       at a keyboard is and what a sleeve, a mitten or a palm-up hand is not.
//                     · the WHITE over the keyboard, before the hands come in and while they play.
//                       The first cut of this piano brought two 0.128 m sleeve tubes across the
//                       keys with the hands; white that GROWS over a keyboard is that tube.
//                   …and the fingering: which digit takes which note, held at every note of the
//                   melody, and where the melody hand stands while it does
//   the SOUND       sound.timeline, filtered to the piano's own notes
//   the ROOM        the fireplace's box and the window's sill, before and after, unmoved
//   the DRAWING     /tmp/piano/*.png
//
//   BASE=http://127.0.0.1:8742 node tools/_piano-proof.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { NOTES, BEAT, METRE } from '../src/pieces/piano-song.js';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = args.out ?? '/tmp/piano';
mkdirSync(OUT, { recursive: true });
const PLATE = [1280, 800], WIDE = [1600, 900], PHONE = [390, 844];
const LAUNCH = { headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] };
const stub = (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}' });
let bad = 0;
const claim = (b, t) => {
  if (!b) bad++;
  console.log(`   ${b ? '✓' : '✗'} ${t}`);
};
const frames = (p, n = 2) => p.evaluate((k) => new Promise((res) => { let i = k; const go = () => (i-- <= 0 ? res() : requestAnimationFrame(go)); go(); }), n);
const settle = async (p) => {
  await p.waitForFunction(() => !window.__theatre.pieces.camera.moving, null, { timeout: 300000, polling: 250 });
  await frames(p, 2);
};

// ---- what a screenshot is asked, in pixels ------------------------------------------------------
const isGreen = (d, q, c) => d[q + 1] > d[q] + 18 && d[q + 1] > d[q + 2] + 18;
const isWhite = (d, q) => d[q] > 232 && d[q + 1] > 232 && d[q + 2] > 232;
/** every green pixel in a box, as a list of [x, y] on the glass */
async function greenIn(shot, box, W, H) {
  const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
  const x0 = Math.max(0, Math.floor(box.x)), x1 = Math.min(W - 1, Math.ceil(box.x + box.w));
  const y0 = Math.max(0, Math.floor(box.y)), y1 = Math.min(H - 1, Math.ceil(box.y + box.h));
  const pts = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const q = (y * info.width + x) * info.channels;
    if (isGreen(data, q, info.channels)) pts.push([x, y]);
  }
  return pts;
}
async function whiteIn(shot, box, W, H) {
  const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
  const x0 = Math.max(0, Math.floor(box.x)), x1 = Math.min(W - 1, Math.ceil(box.x + box.w));
  const y0 = Math.max(0, Math.floor(box.y)), y1 = Math.min(H - 1, Math.ceil(box.y + box.h));
  let n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const q = (y * info.width + x) * info.channels;
    if (isWhite(data, q)) n++;
  }
  return n;
}
/** Pearson's r, for the melody hand against the melody */
function corr(a, b) {
  const n = a.length;
  const ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return num / (Math.sqrt(da * db) || 1e-9);
}

// …and which of the three windows to open. All of them by default; SIZES=1600x900 re-runs one after
// a claim has been changed, which on a machine that draws a frame a second is the difference
// between ten minutes and forty.
const ONLY = (process.env.SIZES ?? '').split(',').filter(Boolean);
const browser = await chromium.launch(LAUNCH);
for (const [w, h] of [PLATE, WIDE, PHONE].filter(([a, b]) => !ONLY.length || ONLY.includes(`${a}x${b}`))) {
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

  // ---- the instrument, where it stands, and what it did not disturb ---------------------------
  const built = await page.evaluate(() => {
    const P = window.__theatre.pieces.props;
    return { box: P.piano.box, keyboard: P.piano.keyboard, song: P.piano.song, fire: P.fine.hitBox(), room: !!window.__theatre.scene.getObjectByName('piano') };
  });
  console.log(`   the case x ${built.box.x0} .. ${built.box.x1}, y 0 .. ${built.box.y1}, z ${built.box.z0} .. ${built.box.z1}`);
  console.log(`   ${built.keyboard.keys} keys (${built.keyboard.whites} white) over z ${built.keyboard.z0.toFixed(2)} .. ${built.keyboard.z1.toFixed(2)} at y ${built.keyboard.y}`);
  claim(built.keyboard.keys === 88 && built.keyboard.whites === 52, `it is a full keyboard: ${built.keyboard.keys} keys, ${built.keyboard.whites} of them white`);
  claim(built.box.y1 <= 1.04, `and its top stands under the window's sill: ${built.box.y1} against 1.04`);
  claim(built.box.z1 <= -0.6 && built.box.z0 >= -2.2, `between the chimney breast (−0.60) and the tall case (−2.20), with nothing overlapping either`);

  // ---- the walk, by a real click on the case ---------------------------------------------------
  const pbox = await page.evaluate(() => window.__theatre.pieces.walk.box('piano'));
  let hit = null;
  if (pbox) {
    hit = await page.evaluate(([b, W, H]) => {
      const S = window.__theatre.pieces.props.switches;
      for (let j = 1; j < 10; j++) for (let i = 1; i < 10; i++) {
        const x = b.x + (b.w * i) / 10, y = b.y + (b.h * j) / 10;
        if (x < 2 || x > W - 2 || y < 2 || y > H - 2) continue;
        if (S.at(x, y) === 'walk-piano') return [Math.round(x), Math.round(y)];
      }
      return null;
    }, [pbox, w, h]);
  }
  if (hit) {
    await page.mouse.click(hit[0], hit[1]);
    await settle(page);
  } else {
    await page.evaluate(() => window.__theatre.pieces.walk.go('piano'));
    await settle(page);
  }
  const at = await page.evaluate(() => ({ at: window.__theatre.pieces.walk.at, shot: window.__theatre.pieces.camera.current }));
  claim(at.at === 'piano' && at.shot === 'piano', `${hit ? `a real click at ${hit[0]},${hit[1]}` : 'called (the case is off this frame from the chair)'} puts the visitor at the piano (${at.at}, camera ${at.shot})`);

  // ---- the frame holds the whole keyboard -------------------------------------------------------
  // …and the keyboard's own axis ON THE GLASS, which every measurement of the hands below is made
  // along: the board runs across a laptop frame and DOWN a phone's, and an octave of it is the unit.
  const ends = await page.evaluate(([W, H]) => {
    const T = window.__theatre.THREE, P = window.__theatre.pieces.props.piano;
    const v = new T.Vector3();
    const at2 = (z) => {
      v.set(-2.046, P.keyboard.y, z).project(window.__theatre.camera);
      return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
    };
    const mz = (P.keyboard.z0 + P.keyboard.z1) / 2;
    return { lo: at2(P.keyboard.z1), hi: at2(P.keyboard.z0), oct: [at2(mz - 0.0821), at2(mz + 0.0821)] };
  }, [w, h]);
  const inside = (p) => p[0] > -2 && p[0] < w + 2 && p[1] > -2 && p[1] < h + 2;
  const OCT = Math.hypot(ends.oct[1][0] - ends.oct[0][0], ends.oct[1][1] - ends.oct[0][1]);
  const axis = [(ends.hi[0] - ends.lo[0]) / Math.hypot(ends.hi[0] - ends.lo[0], ends.hi[1] - ends.lo[1]), (ends.hi[1] - ends.lo[1]) / Math.hypot(ends.hi[0] - ends.lo[0], ends.hi[1] - ends.lo[1])];
  console.log(`   the keyboard runs ${ends.lo.map(Math.round).join(',')} → ${ends.hi.map(Math.round).join(',')} on the glass; an octave of it is ${OCT.toFixed(1)} px`);
  claim(inside(ends.lo) && inside(ends.hi), `and the whole of it is in the frame at ${w}x${h}`);

  // ---- the keys answer, and the case does not answer for them -----------------------------------
  const kb = await page.evaluate(() => window.__theatre.pieces.props.piano.tapBox());
  const who = await page.evaluate(([x, y]) => window.__theatre.pieces.props.switches.at(x, y), [kb.x + kb.w / 2, kb.y + kb.h / 2]);
  claim(who === 'piano-keys', `the arbiter gives the middle of the keyboard to '${who}' (${kb.w.toFixed(0)}x${kb.h.toFixed(0)} px)`);

  // ---- THE KEYBOARD WITH NOBODY'S HANDS ON IT, for the white to be measured against --------------
  const keysBox = await page.evaluate(() => window.__theatre.pieces.props.piano.keysBox());
  const bareShot = await page.screenshot();
  const bareWhite = await whiteIn(bareShot, keysBox, w, h);
  const bareGreen = (await greenIn(bareShot, keysBox, w, h)).length;

  // ---- A REAL CLICK STARTS THE SONG, and the keys go down on the notes ---------------------------
  // THE AUDIO'S FIRST GESTURE, and it has to be paid for before the visitor is standing anywhere: a
  // click on nothing while they are at a place IS the walk back, and a `go` asked for while that
  // walk is still running is refused as 'moving'. So it is spent here, the walk home is waited out,
  // and only then does the visitor go to the piano.
  await page.mouse.click(4, h - 4).catch(() => {});
  await settle(page);
  await page.evaluate(() => window.__theatre.pieces.walk.go('piano'));
  await settle(page);
  claim((await page.evaluate(() => window.__theatre.pieces.walk.at)) === 'piano', 'the visitor is at the piano before the keys are asked for anything');
  const before = await page.evaluate(() => window.__theatre.pieces.props.piano.hands);
  claim(!before.shown, `and his hands are not in the picture until the song is (shown ${before.shown})`);
  await page.mouse.click(kb.x + kb.w / 2, kb.y + kb.h / 2);
  await frames(page, 3);
  const on = await page.evaluate(() => ({ playing: window.__theatre.pieces.props.piano.playing, hands: window.__theatre.pieces.props.piano.hands }));
  claim(on.playing, `a click on the keys starts the song (playing ${on.playing})`);
  claim(on.hands.L.shown && on.hands.R.shown, `and BOTH hands come in with it, the right one over the F♯ it enters on four bars later (L ${on.hands.L.shown}, R ${on.hands.R.shown})`);

  // …and then it is WATCHED. The page draws about a frame a second under swiftshader and the song
  // runs on the room's own 12 fps clock, so every rendered frame is one drawing of it: the sample is
  // per drawing and what is asked is that the keys that are DOWN are the keys the score says.
  const seen = [];
  for (let i = 0; i < 26; i++) {
    await frames(page, 1);
    const s = await page.evaluate(() => {
      const P = window.__theatre.pieces.props.piano;
      return { beat: P.beat, down: P.down, hands: P.hands, playing: P.playing };
    });
    seen.push(s);
    if (s.beat > 8 * METRE) break;
  }
  const wrong = [];
  for (const s of seen) {
    const want = NOTES.filter((n) => s.beat >= n.at - 1e-6 && s.beat < n.at + n.len - 0.02).map((n) => n.m).sort((a, b) => a - b);
    const got = s.down.slice().sort((a, b) => a - b);
    if (want.join(',') !== got.join(',')) wrong.push({ beat: +s.beat.toFixed(2), want, got });
  }
  const anyDown = seen.filter((s) => s.down.length).length;
  console.log(`   ${seen.length} drawings watched to beat ${seen[seen.length - 1].beat.toFixed(2)}; keys were down on ${anyDown} of them`);
  claim(anyDown >= seen.length - 2, `the keys are down on every drawing of the song (${anyDown}/${seen.length})`);
  claim(wrong.length === 0, `and they are the keys the score asks for, drawing by drawing (${wrong.length} disagreements${wrong.length ? `: ${JSON.stringify(wrong.slice(0, 2))}` : ''})`);
  const handsOn = seen.filter((s) => s.hands.shown).length;
  claim(handsOn >= seen.length - 3, `his two hands are on the keys throughout (${handsOn}/${seen.length} drawings; L ${seen[seen.length - 1].hands.L.shown}, R ${seen[seen.length - 1].hands.R.shown})`);
  // EVERY FINGER THAT SOUNDED A NOTE WAS ON ITS OWN KEY, drawing by drawing, in pixels of glass
  // (…of the drawings where the hand has arrived. The first two or three of any playing are the
  // entrance, and a hand still on its way in from the bottom of the frame is not on anything yet.)
  const gaps = [];
  for (const s of seen) {
    for (const side of ['L', 'R']) {
      if (s.hands[side].out !== 0) continue;
      for (const f of s.hands[side].on ?? []) gaps.push({ side, ...f });
    }
  }
  const measured = await page.evaluate(([list, W, H]) => {
    const T = window.__theatre.THREE, P = window.__theatre.pieces.props.piano, cam = window.__theatre.camera;
    const v = new T.Vector3();
    const pr = (x, y, z) => {
      v.set(x, y, z).project(cam);
      return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
    };
    // ALONG THE KEYBOARD is where a wrong key shows. A finger on a black key stands 45 mm further
    // into the instrument than one on a white, and both are on their own key: what is measured is
    // the distance from the tip to the key's own centre LINE, along the board, in pixels of glass.
    return list.map((f) => {
      const a = pr(f.tip[0], f.tip[1], f.tip[2]);
      const b = pr(-2.046, P.keyboard.y, P.keyZ(f.m));
      const c = pr(-2.09, P.keyboard.y, P.keyZ(f.m));
      const ax = [c[0] - b[0], c[1] - b[1]];
      const L = Math.hypot(ax[0], ax[1]) || 1;
      const t = ((a[0] - b[0]) * ax[0] + (a[1] - b[1]) * ax[1]) / (L * L); // …down the key's own line
      return { side: f.side, d: f.d, m: f.m, gap: Math.hypot(a[0] - b[0] - ax[0] * t, a[1] - b[1] - ax[1] * t) };
    });
  }, [gaps, w, h]);
  const worst = measured.length ? measured.reduce((a, b) => (b.gap > a.gap ? b : a)) : null;
  const key = OCT / 7; // one white key, in pixels of glass
  console.log(`   ${measured.length} fingertips measured against their own keys; the worst is ${worst ? `${worst.d} on ${worst.m}, ${worst.gap.toFixed(1)} px (${(worst.gap / key).toFixed(2)} of a white key)` : 'none'}`);
  // (four is the floor on the sample and not a target: this page draws about a frame a second under
  // swiftshader, so how many drawings the watch above catches is a fact about the machine — 33 at
  // 1280×800 on a quiet one, 8 on a loaded one — while how far a fingertip is off its key is not.)
  claim(measured.length >= 4 && worst && worst.gap < key * 0.5, `every finger that is sounding a note is ON that note's key, half a key's width or better (${measured.length} of them, worst ${worst ? worst.gap.toFixed(1) : '-'} px against a white key's ${key.toFixed(1)})`);

  // ---- THE HANDS ON THE GLASS: the green, the backs, and the white that is not a sleeve ----------
  await page.evaluate(() => window.__theatre.pieces.props.piano.hold(14.5)); // bar 5: both hands on
  await frames(page, 3);
  const shot = await page.screenshot();
  const boxes = await page.evaluate(([W, H]) => {
    const T = window.__theatre.THREE, cam = window.__theatre.camera;
    const out = {};
    for (const side of ['L', 'R']) {
      const g = window.__theatre.scene.getObjectByName('piano-hand-' + side);
      if (!g?.visible) continue;
      g.updateMatrixWorld(true);
      const m = g.children[0], p = m.geometry.attributes.position, v = new T.Vector3();
      const xs = [], ys = [];
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).project(cam);
        xs.push(((v.x + 1) / 2) * W);
        ys.push(((1 - v.y) / 2) * H);
      }
      out[side] = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
    return out;
  }, [w, h]);
  claim(!!boxes.L && !!boxes.R, `both hands are in the frame at ${w}x${h}`);
  for (const side of ['L', 'R']) {
    if (!boxes[side]) continue;
    // ONE HAND AT A TIME. The two drawings' own boxes overlap on the glass — at bar 5 the melody is
    // a ninth over the chord and the frames are 226 and 214 px wide — so the other one is taken off
    // the picture while this one is measured, or the left hand comes out an octave and a quarter
    // across and the number is nonsense. (It did, at 390×844: 1.25 against the 1.09 it can reach.)
    // (the PLATE is hidden and not its group: the piece puts its own groups back on every drawing)
    await page.evaluate((s) => {
      for (const k of ['L', 'R']) window.__theatre.scene.getObjectByName('piano-hand-' + k).children[0].visible = k === s;
    }, side);
    await frames(page, 2);
    const alone = await page.screenshot();
    const pts = await greenIn(alone, boxes[side], w, h);
    // along the keyboard, and across it (the frame turns on its side for a phone, so both are taken
    // from the board's own axis and not from the screen's)
    const along = pts.map(([x, y]) => x * axis[0] + y * axis[1]);
    const across = pts.map(([x, y]) => -x * axis[1] + y * axis[0]);
    const span = Math.max(...along) - Math.min(...along);
    const depth = Math.max(...across) - Math.min(...across);
    console.log(`   the ${side} hand: ${pts.length} px of his green, ${span.toFixed(0)} px along the keyboard (${(span / OCT).toFixed(2)} of an octave) and ${depth.toFixed(0)} px into it`);
    claim(pts.length > 900 * (OCT / 142) ** 2, `${side}: it is DRAWN — ${pts.length} px of green at ${w}x${h}`);
    claim(span / OCT > 0.55 && span / OCT < 1.2, `${side}: and it is a hand's size against the keys it is playing — ${(span / OCT).toFixed(2)} of an octave (a hand spans one)`);
    // THE BACK OF A HAND: cut the green across, line by line, from the fall to the player. Where the
    // fingers are it comes in four or five separate runs; where the palm is it is one solid run; and
    // the fingers are the half FARTHER INTO the keyboard. A sleeve gives one run everywhere, and a
    // hand drawn the other way up gives the fingers on the player's side.
    const a0 = Math.min(...across);
    const rows = new Map();
    for (let i = 0; i < pts.length; i++) {
      const r = Math.round(across[i] - a0);
      if (!rows.has(r)) rows.set(r, []);
      rows.get(r).push(along[i]);
    }
    const runsAt = (r) => {
      const xs = (rows.get(r) ?? []).slice().sort((a, b) => a - b);
      let n = 0;
      for (let i = 0; i < xs.length; i++) if (i === 0 || xs[i] - xs[i - 1] > 2.5) n++;
      return n;
    };
    const keys2 = [...rows.keys()].sort((a, b) => a - b);
    const many = keys2.filter((r) => runsAt(r) >= 4);
    const one = keys2.filter((r) => runsAt(r) === 1 && (rows.get(r) ?? []).length > 8);
    const midMany = many.length ? many.reduce((s, v) => s + v, 0) / many.length : null;
    const midOne = one.length ? one.reduce((s, v) => s + v, 0) / one.length : null;
    console.log(`     cut across it: ${many.length} lines of 4+ runs (the fingers, at ${midMany?.toFixed(0)}) and ${one.length} of exactly one (the palm, at ${midOne?.toFixed(0)})`);
    claim(many.length >= 6 && one.length >= 6, `${side}: the fingers are SEPARATE and the palm is SOLID (${many.length} lines of four runs or more, ${one.length} of one)`);
    claim(midMany != null && midOne != null && midMany < midOne, `${side}: and the fingers are the end that is INTO the keyboard — the back of a hand, not the palm and not a sleeve`);
  }
  await page.evaluate(() => {
    for (const k of ['L', 'R']) window.__theatre.scene.getObjectByName('piano-hand-' + k).children[0].visible = true;
  });
  await frames(page, 2);
  const playWhite = await whiteIn(shot, keysBox, w, h);
  const playGreen = (await greenIn(shot, keysBox, w, h)).length;
  console.log(`   over the keyboard: white ${bareWhite} → ${playWhite} px, green ${bareGreen} → ${playGreen} px`);
  claim(playWhite <= bareWhite, `nothing WHITE was added over the keys — no sleeve, no tube: ${bareWhite} px of white before, ${playWhite} after`);
  claim(playGreen > bareGreen + 800, `what was added is his green: ${bareGreen} → ${playGreen} px`);

  // ---- THE DRAWINGS -------------------------------------------------------------------------------
  if (w !== WIDE[0]) {
    await page.screenshot({ path: `${OUT}/piano-playing-${w}x${h}.png` });
    await page.evaluate(() => window.__theatre.pieces.props.piano.hold(0.99)); // both hands resting
    await frames(page, 3);
    await page.screenshot({ path: `${OUT}/piano-rest-${w}x${h}.png` });
    await page.evaluate(() => window.__theatre.pieces.props.piano.hold(14.5));
    await frames(page, 3);
  }
  if (w === PLATE[0] && boxes.R) {
    const b = boxes.R, pad = 12;
    const left = Math.max(0, Math.round(b.x - pad)), top = Math.max(0, Math.round(b.y - pad));
    await sharp(shot)
      .extract({ left, top, width: Math.min(w - left, Math.round(b.w + pad * 2)), height: Math.min(h - top, Math.round(b.h + pad * 2)) })
      .resize({ width: Math.round(Math.min(w - left, b.w + pad * 2) * 3), kernel: 'nearest' })
      .toFile(`${OUT}/piano-press-3x.png`);
  }

  // ---- THE FINGERING, held at every note of the melody --------------------------------------------
  // The song is 72 seconds long and this page draws about one frame a second, so the sixteen bars of
  // the tune are not watched: they are HELD, one note at a time, and what the hands did with each is
  // read off. It is the same code path the film runs — hold() is one drawing of the piece — and it
  // is the only way to see the whole melody without waiting out the whole piece three times over.
  if (w === PLATE[0]) {
    const melody = NOTES.filter((n) => n.hand === 'R');
    const played = [];
    for (const n of melody) {
      const s = await page.evaluate((b) => {
        const P = window.__theatre.pieces.props.piano;
        P.hold(b);
        return P.hands;
      }, n.at + n.len / 2);
      const f = (s.R.on ?? [])[0];
      played.push({ m: n.m, d: f?.d ?? null, z: s.R.z, L: s.L });
    }
    const fingers = [...new Set(played.map((p) => p.d))];
    const r = corr(played.map((p) => p.m), played.map((p) => p.z));
    const travel = Math.max(...played.map((p) => p.z)) - Math.min(...played.map((p) => p.z));
    console.log(`   the melody, note by note: ${played.map((p) => `${p.m}:${p.d}`).join(' ')}`);
    console.log(`   the melody hand stood over ${travel.toFixed(3)} m of keyboard (${(travel / 0.1642).toFixed(2)} octaves); r against the pitch ${r.toFixed(3)}`);
    claim(played.every((p) => p.d), `every note of the melody is played by a named finger (${played.length} notes)`);
    claim(fingers.length >= 3, `and not always the same one: ${fingers.length} of the five carry it (${fingers.join(', ')})`);
    // (r cannot be −1 and should not be: a hand that followed the melody perfectly would be playing
    // every note with the same finger, which is the thing the claim above says it does not do. The
    // two claims are the two halves of one behaviour — the hand walks the line, the fingers take
    // what falls near them.)
    claim(r < -0.75, `the hand FOLLOWS the melody up the keyboard: r = ${r.toFixed(3)} against the pitch (the treble is −z, so it has to be negative)`);
    claim(travel > 0.06 && travel < 0.30, `and it slides rather than jumps: ${(travel * 1000).toFixed(0)} mm of travel over an octave of melody`);
    // the left hand's chord: four digits, spread to the chord's own width
    const chord = await page.evaluate(() => {
      const P = window.__theatre.pieces.props.piano;
      P.hold(13.5); // bar 5, beat 2: B3 D4 F♯4 A4
      const s = P.hands.L;
      return { on: s.on, z: s.z, keys: (s.on ?? []).map((f) => P.keyZ(f.m)) };
    });
    const ds = [...new Set((chord.on ?? []).map((f) => f.d))];
    const wide = chord.keys.length ? Math.max(...chord.keys) - Math.min(...chord.keys) : 0;
    const tips = (chord.on ?? []).map((f) => f.tip[2]);
    const spread = tips.length ? Math.max(...tips) - Math.min(...tips) : 0;
    console.log(`   the chord: ${(chord.on ?? []).map((f) => `${f.m}:${f.d}`).join(' ')} — its keys are ${(wide * 1000).toFixed(0)} mm apart and the hand is spread ${(spread * 1000).toFixed(0)} mm`);
    claim(ds.length === 4, `the four notes of the chord are taken by four different digits (${ds.join(', ')})`);
    claim(spread > wide * 0.8, `and the hand is spread to the chord's own width: ${(spread * 1000).toFixed(0)} mm against ${(wide * 1000).toFixed(0)}`);
    await page.evaluate(() => window.__theatre.pieces.props.piano.hold(14.5));
    await frames(page, 2);
  }

  // ---- the piano voice is on the bus -------------------------------------------------------------
  const audio = await page.evaluate(() => {
    const S = window.__theatre.pieces.sound;
    const t = S?.timeline ?? [];
    return { running: S?.running ?? null, notes: t.filter((c) => c.name === 'piano').length, pitches: [...new Set(t.filter((c) => c.name === 'piano').map((c) => c.m))].sort((a, b) => a - b) };
  });
  console.log(`   the tune bus took ${audio.notes} piano notes (sound running ${audio.running})${audio.notes ? `, pitches ${audio.pitches.join(' ')}` : ''}`);
  if (audio.running) claim(audio.notes > 0, `the piano voice is scheduled on the tune bus (${audio.notes} notes)`);

  // ---- a second click stops it, and so does walking away -----------------------------------------
  await page.evaluate(() => window.__theatre.pieces.props.piano.stop());
  await page.mouse.click(kb.x + kb.w / 2, kb.y + kb.h / 2);
  await frames(page, 3);
  const mid = await page.evaluate(() => window.__theatre.pieces.props.piano.hands);
  await page.mouse.click(kb.x + kb.w / 2, kb.y + kb.h / 2);
  await frames(page, 1);
  const leaving = await page.evaluate(() => ({ playing: window.__theatre.pieces.props.piano.playing, hands: window.__theatre.pieces.props.piano.hands }));
  await frames(page, 4);
  const off = await page.evaluate(() => ({ playing: window.__theatre.pieces.props.piano.playing, down: window.__theatre.pieces.props.piano.down.length, hands: window.__theatre.pieces.props.piano.hands }));
  claim(!off.playing && off.down === 0, `a second click stops it and every key comes up (playing ${off.playing}, ${off.down} down)`);
  claim(mid.shown && leaving.hands.L.out > 0 && !off.hands.shown, `and his hands GO BACK DOWN the way they came, over the drawings after it (out ${mid.L.out} → ${leaving.hands.L.out} → gone)`);
  await page.mouse.click(kb.x + kb.w / 2, kb.y + kb.h / 2);
  await frames(page, 3);
  await page.evaluate(() => window.__theatre.pieces.walk.back());
  await settle(page);
  await frames(page, 3);
  const away = await page.evaluate(() => ({ at: window.__theatre.pieces.walk.at, playing: window.__theatre.pieces.props.piano.playing, hands: window.__theatre.pieces.props.piano.hands }));
  claim(!away.playing && away.at === null && !away.hands.shown, `walking away stops it and takes his hands with it (playing ${away.playing}, hands ${away.hands.shown})`);

  // ---- the room it was squeezed into is where it was ---------------------------------------------
  const after = await page.evaluate(() => ({ fire: window.__theatre.pieces.props.fine.hitBox(), sill: window.__theatre.pieces.room?.leftWindow?.y0 ?? null }));
  const same = built.fire && after.fire && Math.abs(built.fire.x - after.fire.x) < 0.5 && Math.abs(built.fire.w - after.fire.w) < 0.5;
  claim(same && after.sill === 1.04, `the fireplace is where it was (${after.fire.w.toFixed(0)}x${after.fire.h.toFixed(0)} px at ${after.fire.x.toFixed(0)}) and the window's sill is still 1.04`);
  console.log(`   errors: ${errors.length ? errors.join(' | ') : 'none'}`);
  if (errors.length) bad++;
  await page.close();
}
console.log(`\nthe song: ${NOTES.length} notes, ${(NOTES[NOTES.length - 1].at + NOTES[NOTES.length - 1].len).toFixed(0)} beats at ${BEAT}s — ${((NOTES[NOTES.length - 1].at + NOTES[NOTES.length - 1].len) / METRE).toFixed(0)} bars of 3`);
console.log(bad ? `\n${bad} claim(s) failed` : '\nevery claim holds');
await browser.close();
process.exit(bad ? 1 : 0);
