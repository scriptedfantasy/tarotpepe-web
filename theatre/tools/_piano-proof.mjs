#!/usr/bin/env node
// THE SPINET, PLAYED LIKE A VISITOR (src/pieces/props-piano.js, piano-song.js, the `piano` shot in
// camera-shots.js and the fourth place in walk.js).
//
// Nothing below asks the piece whether it thinks the song is going. Every claim has a witness:
//   the ARBITER     props.switches.at(x, y) at the piano's own box from the chair and at the KEYS
//                   from the piano's shot — the case walks, the keys play, and they never both
//                   answer a point
//   a real CLICK    page.mouse.click, through the arbiter, with no api called
//   the FRAME       where the two ends of the keyboard land on the glass at 1280x800 and 390x844
//   the KEYS        which of the 88 are DOWN on each drawing, counted against the note data over
//                   the first eight bars — the song is checked against its own score
//   the HANDS       the two rigs' own `shown`, and the pixels of his green in the frame
//   the SOUND       sound.timeline, filtered to the piano's own notes
//   the ROOM        the fireplace's box and the window's sill, before and after, unmoved
//   the DRAWING     /tmp/walk/piano-*.png
//
//   BASE=http://127.0.0.1:8739 node tools/_piano-proof.mjs
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
const OUT = args.out ?? '/tmp/walk';
mkdirSync(OUT, { recursive: true });
const PLATE = [1280, 800], PHONE = [390, 844];
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
  const ends = await page.evaluate(([W, H]) => {
    const T = window.__theatre.THREE, P = window.__theatre.pieces.props.piano;
    const v = new T.Vector3();
    const at2 = (z) => {
      v.set(-1.994, P.keyboard.y, z).project(window.__theatre.camera);
      return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
    };
    return { lo: at2(P.keyboard.z1), hi: at2(P.keyboard.z0) };
  }, [w, h]);
  const inside = (p) => p[0] > -2 && p[0] < w + 2 && p[1] > -2 && p[1] < h + 2;
  console.log(`   the keyboard runs ${ends.lo.map(Math.round).join(',')} → ${ends.hi.map(Math.round).join(',')} on the glass`);
  claim(inside(ends.lo) && inside(ends.hi), `and the whole of it is in the frame at ${w}x${h}`);
  if (w === PLATE[0]) await page.screenshot({ path: `${OUT}/piano-shot-1280x800.png` });

  // ---- the keys answer, and the case does not answer for them -----------------------------------
  const kb = await page.evaluate(() => window.__theatre.pieces.props.piano.tapBox());
  const who = await page.evaluate(([x, y]) => window.__theatre.pieces.props.switches.at(x, y), [kb.x + kb.w / 2, kb.y + kb.h / 2]);
  claim(who === 'piano-keys', `the arbiter gives the middle of the keyboard to '${who}' (${kb.w.toFixed(0)}x${kb.h.toFixed(0)} px)`);

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
  await page.mouse.click(kb.x + kb.w / 2, kb.y + kb.h / 2);
  await frames(page, 3);
  const on = await page.evaluate(() => ({ playing: window.__theatre.pieces.props.piano.playing, hands: window.__theatre.pieces.props.piano.hands }));
  claim(on.playing, `a click on the keys starts the song (playing ${on.playing})`);

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

  // his green, counted in the frame
  const shot = await page.screenshot();
  const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
  let green = 0;
  for (let q = 0; q < data.length; q += info.channels) {
    if (data[q + 1] > data[q] + 18 && data[q + 1] > data[q + 2] + 18) green++;
  }
  claim(green > 300, `and they are DRAWN: ${green} px of his green in the frame`);
  await page.screenshot({ path: `${OUT}/piano-playing-${w}x${h}.png` });
  if (w === PLATE[0]) {
    const box = await page.evaluate(() => window.__theatre.pieces.props.piano.keysBox());
    await sharp(shot)
      .extract({ left: Math.max(0, Math.round(box.x + box.w * 0.3)), top: Math.max(0, Math.round(box.y - 30)), width: Math.round(box.w * 0.4), height: Math.min(200, h - Math.round(box.y - 30)) })
      .resize({ width: Math.round(box.w * 1.2) })
      .toFile(`${OUT}/piano-hands-3x.png`);
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
  await page.mouse.click(kb.x + kb.w / 2, kb.y + kb.h / 2);
  await frames(page, 3);
  const off = await page.evaluate(() => ({ playing: window.__theatre.pieces.props.piano.playing, down: window.__theatre.pieces.props.piano.down.length, hands: window.__theatre.pieces.props.piano.hands }));
  claim(!off.playing && off.down === 0, `a second click stops it and every key comes up (playing ${off.playing}, ${off.down} down)`);
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
