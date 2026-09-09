#!/usr/bin/env node
// THE SWITCHBOARD ON THE LEFT-HAND WALL, PROVED (src/pieces/egg-switchboard.js).
//
//   BASE=http://127.0.0.1:8703 node tools/_egg-switchboard-proof.mjs            # everything
//   ... --frames    the pictures only        --taps   the pointer only
//   ... --sound     the cues, rendered       --phone  the beat, against PEPE_FAKE
//
// What it does, in order:
//   1. FRAMES. The wall at the home plate and at the wide, 1280x800, with the board and without it
//      (?noswitchboard=1 is not a thing — the "before" frame is taken by hiding the group), a 2x
//      crop of the board with one cord in and with both, and the frame the bell rings in.
//   2. FRAMING. Where the board and every one of its six jacks lands on the glass, in px, at
//      1280x800, 1600x900 and 390x844 — the phone included, because the answer there is that the
//      wall is not in the picture at all and that has to be said with a number.
//   3. TAPS. Real pointer events on two jacks, through the page's own listeners: a cord goes in,
//      the timeline gets a plug and a dialtone, the dialtone is routed through the SET, the second
//      tap on the pair rings the bell, `props:switchboard` fires with rang:true, and the cords
//      fall out again on their own.
//   4. SOUND. plug / dialtone / bell rendered offline through the very code the page runs, with
//      the trims that would make each rendered peak match its LEVEL — paste them into
//      sound-voices.js TRIM.
//   5. THE PHONE BEAT. With PEPE_FAKE the mind is live, so the ring must put a POST to /api/pepe
//      on the wire with beat "phone" in its body. fetch is wrapped in the page and the body read.
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = process.env.OUT ?? '/tmp/egg-switchboard';
const args = process.argv.slice(2);
const only = (name) => !args.length || args.includes('--' + name);
mkdirSync(OUT, { recursive: true });

const VITE_STUB =
  'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});' +
  'export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}';

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const errors = [];
async function open(url, { w = 1280, h = 800 } = {}) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: VITE_STUB }));
  await page.goto(`${BASE}${url}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  return page;
}
const crop = (src, out, box, scale = 2) =>
  sharp(src).extract(box).resize(box.width * scale, box.height * scale, { kernel: 'nearest' }).toFile(out);

// ---- 1 + 2. the pictures, and where the board lands on the glass --------------------------------
if (only('frames')) {
  console.log('\n=== FRAMES (1280x800) ===');
  const page = await open('/?view=camera&state=home&shot=1&pair=1,4');
  const shoot = async (name) => {
    const f = `${OUT}/${name}.png`;
    await page.screenshot({ path: f, timeout: 120000 });
    return f;
  };
  const setShot = (shot) => page.evaluate((s) => window.__theatre.pieces.camera.cut(s), shot);
  const board = () => page.evaluate(() => window.__theatre.pieces.props.switchboard.hitBox());

  // BEFORE: the room as it was — the board hidden, the barometer back where it hung, and the jack
  // strip back on the rear of the operator's position where the user found it too hidden
  await page.evaluate(() => {
    const P = window.__theatre.pieces.props;
    P.group.getObjectByName('switchboard').visible = false;
    P.group.getObjectByName('barometer').position.z = -1.75;
    if (P.switchboard.positionStrip) P.switchboard.positionStrip.visible = true;
  });
  await page.waitForTimeout(500);
  console.log('before/home  ', await shoot('before-home'));
  await setShot('wide');
  await page.waitForTimeout(400);
  console.log('before/wide  ', await shoot('before-wide'));

  // AFTER
  await page.evaluate(() => {
    const P = window.__theatre.pieces.props;
    P.group.getObjectByName('switchboard').visible = true;
    P.group.getObjectByName('barometer').position.z = 0.3;
    if (P.switchboard.positionStrip) P.switchboard.positionStrip.visible = false;
  });
  await setShot('home');
  await page.waitForTimeout(500);
  console.log('after/home   ', await shoot('after-home'));
  const b = await board();
  await crop(`${OUT}/after-home.png`, `${OUT}/after-home-2x.png`, {
    left: Math.max(0, Math.round(b.x) - 12),
    top: Math.max(0, Math.round(b.y) - 12),
    width: Math.min(1280, Math.round(b.w) + 24),
    height: Math.min(800, Math.round(b.h) + 24),
  });
  console.log('after/home 2x', `${OUT}/after-home-2x.png`);
  await setShot('wide');
  await page.waitForTimeout(400);
  console.log('after/wide   ', await shoot('after-wide'));

  // one cord in, then both — the pair, so this is also the frame the bell rings in
  await setShot('home');
  await page.evaluate(() => window.__theatre.pieces.props.switchboard.set([1]));
  await page.waitForTimeout(400);
  await shoot('one-cord');
  await crop(`${OUT}/one-cord.png`, `${OUT}/one-cord-2x.png`, { left: Math.max(0, Math.round(b.x) - 12), top: Math.max(0, Math.round(b.y) - 12), width: Math.round(b.w) + 24, height: Math.round(b.h) + 24 });
  console.log('one cord  2x ', `${OUT}/one-cord-2x.png`);
  await page.evaluate(() => window.__theatre.pieces.props.switchboard.set(window.__theatre.pieces.props.switchboard._pair));
  await page.waitForTimeout(400);
  await shoot('both-cords');
  await crop(`${OUT}/both-cords.png`, `${OUT}/both-cords-2x.png`, { left: Math.max(0, Math.round(b.x) - 12), top: Math.max(0, Math.round(b.y) - 12), width: Math.round(b.w) + 24, height: Math.round(b.h) + 24 });
  console.log('both cords 2x', `${OUT}/both-cords-2x.png`);
  await page.close();

  console.log('\n=== WHERE IT LANDS ON THE GLASS ===');
  console.log('window      shot   board box (px)                 jack boxes: drawn -> a thumb\'s');
  for (const [w, h] of [[1280, 800], [1600, 900], [390, 844]]) {
    const p = await open('/?view=camera&state=home&shot=1', { w, h });
    for (const shot of ['home', 'wide']) {
      const row = await p.evaluate((s) => {
        const ctx = window.__theatre;
        ctx.pieces.camera.cut(s);
        ctx.camera.updateMatrixWorld(true);
        const B = ctx.pieces.props.switchboard;
        const jacks = B.jacks.map((_, i) => ({ hit: B.hitBox(i), tap: B.tapBox(i) }));
        return { board: B.hitBox(), jacks, W: window.innerWidth, H: window.innerHeight };
      }, shot);
      const f = (n) => (n == null ? '—' : n.toFixed(0).padStart(5));
      const inFrame = row.board.x + row.board.w > 0 && row.board.x < row.W;
      const pitch = row.jacks[1].hit.x - row.jacks[0].hit.x;
      console.log(
        `${String(w + 'x' + h).padEnd(11)} ${shot.padEnd(6)} x${f(row.board.x)} y${f(row.board.y)} ${f(row.board.w)}x${f(row.board.h)}` +
          `  ${inFrame ? 'IN FRAME ' : 'OFF FRAME'}  jack ${row.jacks[0].hit.w.toFixed(0)}x${row.jacks[0].hit.h.toFixed(0)} -> ` +
          `${row.jacks[0].tap.w.toFixed(0)}x${row.jacks[0].tap.h.toFixed(0)}  column pitch ${pitch.toFixed(0)}px`,
      );
    }
    await p.close();
  }
}

// ---- 3. the pointer, for real -------------------------------------------------------------------
if (only('taps')) {
  console.log('\n=== TAPS (real pointer events, 1280x800) ===');
  // NO ?shot=1 HERE, and that is the point of this section: under shot mode the sound piece is a
  // stub with an empty timeline and the flow never starts, so neither the tone nor the beat could
  // be proved. This is the evening as a visitor gets it — the door, a click to come in, and then
  // the board on the wall.
  const page = await open('/?pair=1,4');
  const heard = [];
  await page.exposeFunction('__egg', (d) => heard.push(d));
  await page.evaluate(() => window.__theatre.on('props:switchboard', (d) => window.__egg(JSON.parse(JSON.stringify(d)))));
  await page.mouse.click(640, 700); // the visitor's knock: the door swings and the room is behind it
  // ...and then WAIT FOR THE FIELD. The camera moves inside every turn of his (the flow cuts to
  // his face on the second sentence and back out for the third), so a tap box measured a moment
  // before the click can be a whole column out by the time the click lands. At the open field
  // nothing is moving, which is also the state the phone has to interrupt.
  const settle = async () => {
    await page.waitForFunction('window.__theatre.pieces.dialogue.asking === true', null, { timeout: 120000 });
    await page.waitForTimeout(400);
  };
  await settle();
  const at = async (i) => page.evaluate((k) => {
    const b = window.__theatre.pieces.props.switchboard.tapBox(k);
    return [Math.round(b.x + b.w / 2), Math.round(b.y + b.h / 2)];
  }, i);
  const state = () => page.evaluate(() => ({
    plugged: window.__theatre.pieces.props.switchboard.plugged,
    pair: window.__theatre.pieces.props.switchboard._pair,
    // the board's own cues only, and all of them: the escapement, the pen and the door would
    // otherwise push the bell out of any window small enough to read
    cues: window.__theatre.pieces.sound.timeline.filter((c) => ['plug', 'dialtone', 'bell'].includes(c.name)),
    beat: window.__theatre.pieces.flow?.beat ?? null,
  }));
  const pair = (await state()).pair;
  console.log('the pair tonight (never shown in the room):', pair.join(' + '));

  // a jack that is NOT one of the pair: a cord goes in, the tone hums, nothing rings
  const lone = [0, 1, 2, 3, 4, 5].find((i) => !pair.includes(i));
  let p = await at(lone);
  await page.mouse.move(p[0], p[1]);
  await page.waitForTimeout(250);
  console.log('hover jack', lone, '→ cursor', await page.evaluate(() => getComputedStyle(document.querySelector('#stage canvas')).cursor));
  await page.mouse.click(p[0], p[1]);
  await page.waitForTimeout(600);
  let s = await state();
  console.log(`tap jack ${lone} (not the pair) → plugged [${s.plugged}]  cues ${s.cues.map((c) => c.name + (c.through ? '/' + c.through : '')).join(' ')}`);

  // pull it out again
  await page.mouse.click(p[0], p[1]);
  await page.waitForTimeout(500);
  s = await state();
  console.log(`tap it again        → plugged [${s.plugged}]  (the cord came out)`);

  // now the pair
  for (const i of pair) {
    p = await at(i);
    await page.mouse.click(p[0], p[1]);
    await page.waitForTimeout(500);
  }
  s = await state();
  console.log(`tap ${pair.join(' then ')}          → plugged [${s.plugged}]  cues ${s.cues.map((c) => c.name + (c.through ? '/' + c.through : '')).join(' ')}`);
  // the tone finishes, the bell rings, he picks up: sample what beat the room thinks it is on, so
  // that `phone` can be shown to have been entered even keyless, where he says nothing in it
  const beats = [];
  for (let k = 0; k < 24; k++) {
    const b = await page.evaluate(() => window.__theatre.pieces.flow?.beat ?? null);
    if (b !== beats[beats.length - 1]) beats.push(b);
    await page.waitForTimeout(200);
  }
  s = await state();
  console.log(`after the ring      → beats ${beats.join(' → ')}  cues ${s.cues.map((c) => c.name).join(' ')}`);
  console.log('events:', heard.map((h) => `[${h.plugged}]${h.rang ? ' RANG' : ''}`).join(' → '));
  await page.waitForTimeout(4500); // ...and the cords fall out on their own
  s = await state();
  console.log(`and afterwards      → plugged [${s.plugged}]  (empty = the cords fell out)`);
  await page.close();
}

// ---- 4. the cues, rendered through the page's own code ------------------------------------------
if (only('sound')) {
  console.log('\n=== SOUND (rendered offline, the same code the page runs) ===');
  // no ?shot=1: under shot mode the sound piece is a stub and render() hands back null
  const page = await open('/?view=sound&state=default');
  const rows = await page.evaluate(async (names) => {
    const s = window.__theatre.pieces.sound;
    const out = [];
    for (const name of names) {
      const r = await s.render(name, Math.max(1.4, (s.lengths[name] ?? 1) + 0.4));
      if (!r) continue;
      let peak = 0, last = 0;
      for (let i = 0; i < r.l.length; i++) {
        const v = Math.max(Math.abs(r.l[i]), Math.abs(r.r[i]));
        if (v > peak) peak = v;
        if (v > 1e-4) last = i;
      }
      out.push({ name, peak, dur: (last - Math.round(0.02 * r.sampleRate)) / r.sampleRate, level: s.levels[name], length: s.lengths[name], trim: s.trims[name] ?? 1 });
    }
    return out;
  }, ['plug', 'dialtone', 'bell', 'switch', 'latch']);
  console.log('cue        peak     LEVEL    off by    length   LENGTH   trim now   trim measured');
  for (const r of rows) {
    const off = ((r.peak / r.level - 1) * 100).toFixed(1);
    const want = +(r.trim * (r.level / r.peak)).toFixed(3);
    console.log(
      `${r.name.padEnd(10)} ${r.peak.toFixed(4)}  ${String(r.level).padEnd(8)} ${(off + '%').padStart(7)}   ` +
        `${r.dur.toFixed(3)}s   ${String(r.length).padEnd(7)}  ${String(r.trim).padEnd(9)}  ${want}` +
        (r.dur > r.length + 0.02 ? '   OVER ITS LENGTH' : ''),
    );
  }
  await page.close();
}

// ---- 5. the phone beat, on the wire -------------------------------------------------------------
if (only('phone')) {
  console.log('\n=== THE PHONE BEAT (needs PEPE_FAKE on the dev server) ===');
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: VITE_STUB }));
  const bodies = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/pepe') && r.method() === 'POST') {
      try {
        bodies.push(JSON.parse(r.postData() ?? '{}'));
      } catch {
        /* not ours */
      }
    }
  });
  // the live evening again, for the same reason as the taps: the ring has to interrupt an OPEN
  // FIELD, and there is no open field under ?shot=1
  await page.goto(`${BASE}/?pair=1,4`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  const live = await page.evaluate(async () => {
    const M = window.__theatre.pieces.mind;
    await M.ready;
    return { available: M.available, model: M.model };
  });
  console.log('the mind:', live.available ? `live (${live.model})` : 'keyless — the beat stays silent and the bell is the whole event');
  await page.mouse.click(640, 700);
  await page.waitForFunction('window.__theatre.pieces.dialogue.asking === true', null, { timeout: 120000 });
  await page.waitForTimeout(400);
  const said0 = await page.evaluate(() => document.querySelector('#dialogue .reply')?.textContent ?? '');
  await page.evaluate(() => {
    const B = window.__theatre.pieces.props.switchboard;
    B.set([]);
    for (const i of B._pair) B.plug(i);
  });
  const beats = [];
  let shot = false;
  for (let k = 0; k < 60; k++) {
    const b = await page.evaluate(() => window.__theatre.pieces.flow?.beat ?? null);
    if (b !== beats[beats.length - 1]) beats.push(b);
    if (b === 'phone' && !shot) {
      shot = true;
      await page.waitForTimeout(2600); // his first sentence is up on the placard by now
      await page.screenshot({ path: `${OUT}/phone.png`, timeout: 120000 });
    }
    await page.waitForTimeout(250);
  }
  const asked = bodies.filter((b) => b.beat === 'phone');
  console.log(`POSTs to /api/pepe: ${bodies.length} (beats: ${bodies.map((b) => b.beat).join(', ') || 'none'})`);
  console.log(asked.length ? '✓ the `phone` beat was requested' : '✗ no phone beat on the wire');
  console.log('flow beats through the ring:', beats.join(' → '));
  console.log('the visitor had typed:', JSON.stringify(said0.slice(0, 60)));
  // and the evening picks up where it was: the field opens again under whatever he was left holding
  let back = false;
  try {
    await page.waitForFunction('window.__theatre.pieces.dialogue.asking === true', null, { timeout: 60000 });
    back = true;
  } catch {
    /* said below */
  }
  console.log(back ? '✓ the field is open again after the call' : '✗ the field never came back');
  console.log('the frame he answers in:', `${OUT}/phone.png`);
  await page.close();
}

await browser.close();
if (errors.length) {
  console.log('\nPAGE ERRORS:');
  for (const e of [...new Set(errors)]) console.log(' -', e);
  process.exit(2);
}
console.log('\nno page errors.');
