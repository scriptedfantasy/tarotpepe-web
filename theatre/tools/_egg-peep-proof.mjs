#!/usr/bin/env node
// PEEP THE TOAD, PRESSED FIVE TIMES BY A REAL POINTER (src/pieces/egg-peep.js).
//
// The knock-off on the spares press croaks when you click it and goes over the edge on the fifth
// click. This tool does not ask the piece whether it thinks that worked. It puts a pointer on the
// figurine's own projected box, clicks it five times, and asks four independent witnesses:
//
//   the DRAWING   frames — the toad on the shelf, every drawing of the fall as a strip, and the
//                 toad on the boards — plus a 3x crop of the shelf with the label in it
//   the STATE     props.peep.clicks / .fallen, and the world box of the group, which is geometry
//                 and not an opinion
//   the EVENT     what came out of ctx.emit('props:peep', …) on the page's own bus
//   the SOUND     sound.timeline, which is what the audio graph was actually given, plus a stub
//                 laid over play() so a cue that never reached the graph is still caught
//
// THE 3x CROP IS A 3x RENDER, NOT A 3x ENLARGEMENT, and that distinction is the whole reason the
// label can be read at all. The home plate is 1280 x 800 and the toad is 24 px wide in it: his
// label is 18 px across, four and a half pixels a sort, and no enlargement puts a letter back that
// was never drawn. The ink pass is dpr-aware (`uDpr` reaches every one of its shaders, ink.js), so
// the same plate rendered at devicePixelRatio 3 is the SAME DRAWING — same framing, same pen width
// in CSS pixels, same boil — with three times the pixels under it. That is what `--big` renders and
// what the -3x frame is cut from. The plain 1x plate is shot as well, and the strip and the phone
// come off that, because those are about staging and not about a nib.
//
//   node tools/_egg-peep-proof.mjs
//   node tools/_egg-peep-proof.mjs --out /abs/dir
//   node tools/_egg-peep-proof.mjs --sound      # render 'croak' and 'thud' offline and print trims
//   node tools/_egg-peep-proof.mjs --no-big     # skip the dpr-3 plate (it is slow under swiftshader)
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const OUT = args.out ?? new URL('../public/progress/shots', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
// BASE lets a builder in their own worktree point every tool at their own port (tools/shot.mjs)
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/';

const PLATE = [1280, 800]; // the home plate the user looks at
const PHONE = [390, 844];

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const stub = (r) =>
  r.fulfill({
    contentType: 'application/javascript',
    body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}',
  });

async function open(w, h, query = '', dsf = 1) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  await page.route('**/@vite/client', stub);
  await page.goto(`${BASE}?view=props&state=default${query}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  page.__errors = errors;
  return page;
}

const fails = [];
const ok = (cond, line) => {
  console.log(`${cond ? '  ok  ' : '  FAIL'}  ${line}`);
  if (!cond) fails.push(line);
};
// a crop round a box on the glass. `scale` 1 cuts it at 1:1 out of whatever was rendered.
async function crop(buf, box, out, { pad = 20, scale = 1, src = 1 } = {}) {
  const meta = await sharp(buf).metadata();
  const left = Math.max(0, Math.round((box.x - pad) * src));
  const top = Math.max(0, Math.round((box.y - pad) * src));
  const width = Math.min(meta.width - left, Math.round((box.w + pad * 2) * src));
  const height = Math.min(meta.height - top, Math.round((box.h + pad * 2) * src));
  let im = sharp(buf).extract({ left, top, width, height });
  if (scale !== 1) im = im.resize({ width: Math.round(width * scale), height: Math.round(height * scale), kernel: 'nearest' });
  await im.png().toFile(out);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

// ---- 1. where he is, in the world and on the glass --------------------------------------------
console.log('\nWHERE PEEP STANDS  (world metres, off the geometry; and his box on the glass at every window)');
{
  const page = await open(...PLATE, '&shot=1');
  const m = await page.evaluate(() => {
    const T = window.__theatre;
    const THREE = T.THREE;
    T.pieces.camera.cut('home');
    T.camera.updateMatrixWorld();
    const B = (o) => {
      const b = new THREE.Box3().setFromObject(o);
      return { min: b.min.toArray().map((n) => +n.toFixed(3)), max: b.max.toArray().map((n) => +n.toFixed(3)) };
    };
    const g = T.scene.getObjectByName('peep');
    const jar = T.scene.getObjectByName('miel-jar');
    const press = jar.parent;
    const shelf = B(g);
    // …and where he ends up, so the landing can be checked against the room and not eyeballed
    T.pieces.props.peep.set(true);
    const floor = B(g);
    T.pieces.props.peep.set(false);
    // the six places the insects land, which he must not be in (egg-insects.js)
    T.pieces.props.setState('insects-gathered');
    const seats = T.scene.getObjectByName('insects').children.map((c) => c.position.toArray().map((n) => +n.toFixed(3)));
    T.pieces.props.setState('default');
    return { shelf, floor, jar: B(jar), press: B(press), seats, cat: B(T.scene.getObjectByName('cat')), roomHalf: T.layout.room.width / 2 };
  });
  const size = (b) => [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]].map((n) => +n.toFixed(3));
  console.log(`  on the shelf   x ${m.shelf.min[0]}..${m.shelf.max[0]}   y ${m.shelf.min[1]}..${m.shelf.max[1]}   z ${m.shelf.min[2]}..${m.shelf.max[2]}   (${size(m.shelf).join(' x ')} m)`);
  console.log(`  on the floor   x ${m.floor.min[0]}..${m.floor.max[0]}   y ${m.floor.min[1]}..${m.floor.max[1]}   z ${m.floor.min[2]}..${m.floor.max[2]}`);
  console.log(`  the MIEL jar   x ${m.jar.min[0]}..${m.jar.max[0]}   y ${m.jar.min[1]}..${m.jar.max[1]}`);
  console.log(`  the press      x ${m.press.min[0]}..${m.press.max[0]}   y ${m.press.min[1]}..${m.press.max[1]}`);
  console.log(`  the cat        ${size(m.cat).join(' x ')} m  →  Peep is ${(size(m.shelf)[1] / size(m.cat)[1]).toFixed(2)} of him by height`);
  ok(size(m.shelf)[1] / size(m.cat)[1] < 0.42, 'he is about a third the cat, not half of him');
  // the middle bay of the press, one board under the jar
  ok(m.shelf.min[1] > 0.56 && m.shelf.min[1] < 0.59, 'he stands on the press\'s middle board (y 0.575), not on the board the jar is on');
  ok(m.shelf.min[0] > m.press.min[0] && m.shelf.max[0] < m.press.max[0], 'the whole of him is over the press');
  // NOT where the insects gather
  const clash = m.seats.filter((s) => {
    const half = 0.0575; // the insects' sheets are 0.115 square
    return s[0] + half > m.shelf.min[0] && s[0] - half < m.shelf.max[0] && s[1] + half > m.shelf.min[1] && s[1] - half < m.shelf.max[1];
  });
  console.log(`  the insects' six landing places: y ${Math.min(...m.seats.map((s) => s[1])).toFixed(3)}..${Math.max(...m.seats.map((s) => s[1])).toFixed(3)}  ` + `— Peep's head is at y ${m.shelf.max[1]}`);
  ok(clash.length === 0, 'no insect lands within a sheet\'s width of him, in either axis');
  // and he is on the boards, not in the wall or in the press
  ok(m.floor.min[1] > -0.002 && m.floor.min[1] < 0.004, 'fallen, he is ON the floor: his lowest point is y 0');
  ok(m.floor.max[0] < m.roomHalf - 0.01, `fallen, he clears the right-hand wall (x ${m.roomHalf}) by ${(m.roomHalf - m.floor.max[0]).toFixed(3)} m`);
  ok(m.floor.min[2] > m.press.max[2] + 0.05, 'fallen, he is clear of the press in z — in front of its foot, not inside it');
  await page.close();
}

console.log('\nHIS BOX ON THE GLASS  ("in frame" means the whole of him is inside the picture)');
for (const [W, H] of [PLATE, [1600, 900], PHONE, [390, 760], [360, 800]]) {
  const page = await open(W, H, '&shot=1');
  const m = await page.evaluate(() => {
    const T = window.__theatre;
    T.pieces.camera.cut('home');
    T.camera.updateMatrixWorld();
    const p = T.pieces.props.peep;
    const shelf = { box: p.hitBox(), tap: p.tapBox() };
    p.set(true);
    T.camera.updateMatrixWorld();
    const floor = p.hitBox();
    p.set(false);
    return { ...shelf, floor, cat: T.pieces.props.cat.hitBox() };
  });
  const b = m.box, t = m.tap;
  const inFrame = b.x >= 0 && b.y >= 0 && b.x + b.w <= W && b.y + b.h <= H;
  const anyOf = b.x + b.w > 0 && b.x < W && b.y + b.h > 0 && b.y < H;
  console.log(
    `  ${String(W + 'x' + H).padEnd(9)} shelf ${b.w.toFixed(1)} x ${b.h.toFixed(1)} px at ${b.x.toFixed(0)},${b.y.toFixed(0)}` +
      `   tap ${t.w.toFixed(0)} x ${t.h.toFixed(0)}${t.grown ? ' (GROWN)' : ''}` +
      `   floor at ${m.floor.x.toFixed(0)},${m.floor.y.toFixed(0)}` +
      `   ${inFrame ? 'IN FRAME' : anyOf ? 'PART IN FRAME' : 'OUT OF FRAME'}   [the cat at x ${m.cat.x.toFixed(0)}]`,
  );
  await page.close();
}

// ---- 2. a real pointer: hover, five clicks, and a sixth on the floor ----------------------------
console.log('\nFIVE CLICKS  (1280x800, home; the sound piece is live — no ?shot=1)');
{
  const [W, H] = PLATE;
  const page = await open(W, H);
  await page.evaluate(() => {
    window.__peep = [];
    window.__theatre.on('props:peep', (d) => window.__peep.push(d));
    const s = window.__theatre.pieces.sound;
    window.__cues = [];
    const real = s.play.bind(s);
    s.play = (name, opts) => {
      window.__cues.push(name);
      return real(name, opts);
    };
    window.__theatre.pieces.camera.cut('home');
  });
  await page.waitForTimeout(900);

  const read = () =>
    page.evaluate(() => {
      const T = window.__theatre;
      const p = T.pieces.props.peep;
      const g = T.scene.getObjectByName('peep');
      return {
        clicks: p.clicks,
        fallen: p.fallen,
        taking: p.taking,
        y: +g.position.y.toFixed(4),
        rot: [g.rotation.x, g.rotation.y, g.rotation.z].map((n) => +n.toFixed(3)),
        cursor: T.renderer.domElement.style.cursor || '(none)',
        cues: window.__cues.slice(),
        timeline: (T.pieces.sound.timeline ?? []).map((x) => x.name),
        events: window.__peep.slice(),
        played: T.pieces.sound.stats.played,
      };
    });
  const settled = () => page.waitForFunction(() => !window.__theatre.pieces.props.peep.taking, null, { timeout: 30000 });

  const box = await page.evaluate(() => window.__theatre.pieces.props.peep.hitBox());
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  console.log(`  his own box  x ${box.x.toFixed(0)} y ${box.y.toFixed(0)}  ${box.w.toFixed(0)} x ${box.h.toFixed(0)} px  →  clicking ${cx.toFixed(0)},${cy.toFixed(0)}`);

  const before = await read();
  ok(before.clicks === 0 && before.fallen === false, 'he starts on the shelf, unpressed');
  ok(before.cursor === '(none)', 'nothing announces him before a pointer goes near him');
  await page.mouse.move(40, H - 40);
  await page.waitForTimeout(300);
  ok((await read()).cursor === '(none)', "the cursor is the page's own away from him");
  // the arbiter parks a pointermove and resolves it on the next 12 fps step, so the cursor is up to
  // a twelfth of a second behind the mouse: this waits for the drawing's clock, not a stopwatch
  await page.mouse.move(cx - 4, cy - 4);
  await page.mouse.move(cx, cy);
  await page
    .waitForFunction(() => window.__theatre.pieces.props.switches.hovered === 'peep', null, { timeout: 15000 })
    .catch(() => {});
  const hov = await page.evaluate(() => ({ cursor: window.__theatre.renderer.domElement.style.cursor, hovered: window.__theatre.pieces.props.switches.hovered }));
  ok(hov.hovered === 'peep' && hov.cursor === 'pointer', 'hover over him makes the cursor a pointer, and that is the whole affordance');

  const shelfShot = await page.locator('#stage').screenshot({ timeout: 120000 });
  await sharp(shelfShot).png().toFile(`${OUT}/egg-peep-shelf.png`);
  await crop(shelfShot, box, `${OUT}/egg-peep-shelf-3x-upscaled.png`, { scale: 3 });

  // A RECORDER, INSTALLED AND RETURNING AT ONCE. It must not be an `await page.evaluate` that runs
  // a loop: a page can only be driven one protocol call at a time, so a long evaluate and the
  // page.mouse.click that is supposed to end it deadlock on each other.
  await page.evaluate(() => {
    window.__rock = [];
    let last = -2;
    const T = window.__theatre;
    (function sample() {
      requestAnimationFrame(sample);
      const p = T.pieces.props.peep;
      if (p.taking && p.frame !== last) {
        last = p.frame;
        window.__rock.push(+T.scene.getObjectByName('peep').rotation.z.toFixed(3));
      }
    })();
  });

  // clicks one to four: a croak and a rock, and he stays where he is
  for (let i = 1; i <= 4; i++) {
    await page.evaluate(() => (window.__rock = []));
    await page.mouse.click(cx, cy);
    await page.waitForFunction((n) => window.__theatre.pieces.props.peep.clicks === n, i, { timeout: 20000 });
    await settled();
    const tilts = await page.evaluate(() => window.__rock.slice());
    const s = await read();
    console.log(`  click ${i}   clicks ${s.clicks}   the rock, drawing by drawing: rz ${tilts.join(' → ')}`);
    ok(s.clicks === i && s.fallen === false, `click ${i}: clicks = ${s.clicks}, and he is still on the shelf`);
    ok(s.cues.filter((c) => c === 'croak').length === i, `click ${i}: ${i} croak(s) asked for, and no more`);
    ok(!s.cues.includes('thud'), `click ${i}: no thud — nothing has hit the floor`);
    ok(Math.abs(s.y - before.y) < 1e-4 && Math.abs(s.rot[2]) < 1e-4, `click ${i}: the rock ends where it started, upright and level`);
    if (i === 1) ok(tilts.some((t) => t > 0.05) && tilts.some((t) => t < -0.02), 'he rocks BOTH ways and comes back — a rock, not a lean');
  }

  // the fifth
  await page.mouse.click(cx, cy);
  await page.waitForFunction(() => window.__theatre.pieces.props.peep.clicks === 5, null, { timeout: 20000 });
  await settled();
  const five = await read();
  console.log(`  after five clicks   ${JSON.stringify({ clicks: five.clicks, fallen: five.fallen })}`);
  ok(five.fallen === true, 'the fifth click puts him over the edge');
  ok(five.events.length === 5 && five.events[4].fallen === true, "ctx.emit('props:peep', …) fired five times, and the fifth carries fallen: true");
  ok(five.events.slice(0, 4).every((e) => e.fallen === false), 'the first four events say he is still standing');
  ok(five.cues.filter((c) => c === 'croak').length === 5, 'five croaks — one on every click, on the pointer');
  ok(five.cues.includes('thud'), 'a thud when he arrives');
  ok(five.timeline.filter((c) => c === 'croak').length === 5, 'all five croaks reached the audio graph (sound.timeline)');
  ok(five.timeline.includes('thud'), 'the thud reached the audio graph');
  ok(five.played >= 6, 'the sound piece counted them (stats.played)');
  console.log(`  the cues, in order  ${five.cues.join(' · ')}`);

  const floorShot = await page.locator('#stage').screenshot({ timeout: 120000 });
  await sharp(floorShot).png().toFile(`${OUT}/egg-peep-floor.png`);
  const fbox = await page.evaluate(() => window.__theatre.pieces.props.peep.hitBox());
  await crop(floorShot, fbox, `${OUT}/egg-peep-floor-3x-upscaled.png`, { scale: 3, pad: 26 });

  // and a sixth click, on the floor: a croak and nothing else
  const fx = fbox.x + fbox.w / 2, fy = fbox.y + fbox.h / 2;
  const posBefore = await page.evaluate(() => window.__theatre.scene.getObjectByName('peep').position.toArray().map((n) => +n.toFixed(4)));
  await page.mouse.click(fx, fy);
  await page.waitForFunction(() => window.__theatre.pieces.props.peep.clicks === 6, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(500);
  const six = await read();
  const posAfter = await page.evaluate(() => window.__theatre.scene.getObjectByName('peep').position.toArray().map((n) => +n.toFixed(4)));
  console.log(`  a click on the floor  ${JSON.stringify({ clicks: six.clicks, fallen: six.fallen })}`);
  ok(six.clicks === 6, 'the box follows him down: a click on the floor is a click');
  ok(six.cues.filter((c) => c === 'croak').length === 6, 'he croaks on the floor');
  ok(six.cues.filter((c) => c === 'thud').length === 1, 'and nothing else — one thud, ever');
  ok(JSON.stringify(posBefore) === JSON.stringify(posAfter), 'he does not move: a toad who has fallen stays fallen');

  // a thumb, which is the phone
  await page.touchscreen.tap(fx, fy);
  await page.waitForTimeout(600);
  ok((await read()).clicks === 7, 'a touch tap works with no hover in front of it');

  // the two switches nearest him must not fight: a click on the cat is the cat's
  const cbox = await page.evaluate(() => window.__theatre.pieces.props.cat.hitBox());
  const lit0 = await page.evaluate(() => window.__theatre.pieces.props.cat.lit);
  const cl0 = (await read()).clicks;
  await page.mouse.click(cbox.x + cbox.w / 2, cbox.y + cbox.h / 2);
  await page.waitForFunction((was) => window.__theatre.pieces.props.cat.lit !== was, lit0, { timeout: 20000 }).catch(() => {});
  const after = await page.evaluate(() => ({ lit: window.__theatre.pieces.props.cat.lit, clicks: window.__theatre.pieces.props.peep.clicks }));
  console.log(`  a click on the cat  ${JSON.stringify({ lit: `${lit0} → ${after.lit}`, peep: `${cl0} → ${after.clicks}` })}`);
  ok(after.lit !== lit0 && after.clicks === cl0, 'a click on the cat works the cat and leaves Peep alone');

  console.log(`  page errors  ${page.__errors.length ? page.__errors : 'none'}`);
  ok(page.__errors.length === 0, 'no page errors');
  await page.close();
}

// ---- 3. the strip of the fall: every drawing of it, in order ------------------------------------
console.log('\nTHE FALL, DRAWING BY DRAWING  (1280x800, home; nine of them, one a step)');
{
  const [W, H] = PLATE;
  const page = await open(W, H, '&shot=1');
  const n = await page.evaluate(() => {
    window.__theatre.pieces.camera.cut('home');
    return window.__theatre.pieces.props.peep.drawings;
  });
  // Held one at a time (props.peep.drawing(i)) rather than shot off the clock: a screenshot in
  // this browser takes seconds and the whole take is three quarters of one, so a strip photographed
  // off the running clock is a strip with most of its drawings missing.
  const tiles = [];
  const TILE = { left: 1010, top: 395, width: 200, height: 200 };
  for (let i = 0; i < n; i++) {
    const st = await page.evaluate((j) => {
      const T = window.__theatre;
      T.pieces.props.peep.drawing(j);
      T.camera.updateMatrixWorld();
      const g = T.scene.getObjectByName('peep');
      return { pos: g.position.toArray().map((v) => +v.toFixed(3)), rx: +g.rotation.x.toFixed(2), rz: +g.rotation.z.toFixed(2) };
    }, i);
    await page.waitForTimeout(220);
    const shot = await page.locator('#stage').screenshot({ timeout: 120000 });
    tiles.push(await sharp(shot).extract(TILE).toBuffer());
    console.log(`   drawing ${String(i + 1).padStart(2)}  y ${st.pos[1]}  z ${st.pos[2]}  pitch ${st.rx}  roll ${st.rz}`);
  }
  await sharp({ create: { width: TILE.width * tiles.length, height: TILE.height, channels: 3, background: '#f8f9f4' } })
    .composite(tiles.map((b, i) => ({ input: b, left: i * TILE.width, top: 0 })))
    .png()
    .toFile(`${OUT}/egg-peep-fall-strip.png`);
  ok(tiles.length >= 8, `the fall is ${tiles.length} drawings on the strip (two over the lip, seven falling)`);

  // NOTHING ON THE SET PASSES THROUGH ANYTHING ELSE (BRIEF.md, the room's rule). Checked box by
  // box against every part of the press and everything standing on one, at every drawing of the
  // take — not reasoned about in a comment.
  const clashes = await page.evaluate((n) => {
    const T = window.__theatre;
    const THREE = T.THREE;
    const g = T.scene.getObjectByName('peep');
    const press = T.scene.getObjectByName('miel-jar').parent;
    const parts = [];
    for (const c of press.children) {
      const b = new THREE.Box3().setFromObject(c);
      if (isFinite(b.min.x)) parts.push({ b, name: c.name || c.type });
    }
    const out = [];
    for (let i = 0; i < n; i++) {
      T.pieces.props.peep.drawing(i);
      g.updateMatrixWorld(true);
      // a millimetre off every face: resting ON a board is touching it, not passing through it
      const mine = new THREE.Box3().setFromObject(g).expandByScalar(-0.001);
      for (const p of parts) {
        if (!p.b.intersectsBox(mine)) continue;
        const ov = [0, 1, 2].map((k) => Math.min(p.b.max.getComponent(k), mine.max.getComponent(k)) - Math.max(p.b.min.getComponent(k), mine.min.getComponent(k)));
        out.push(`drawing ${i + 1} into ${p.name} by ${ov.map((v) => (v * 1000).toFixed(0)).join('/')} mm (x/y/z)`);
      }
    }
    T.pieces.props.peep.set(true);
    return out;
  }, n);
  ok(clashes.length === 0, `no drawing of the fall passes through the press or anything on it${clashes.length ? ' — ' + clashes.join(', ') : ''}`);
  ok(page.__errors.length === 0, 'no page errors during the fall');
  await page.close();
}

// ---- 4. the 3x plate: the same drawing, three times the pixels ------------------------------------
if (args.big !== 'false' && args['no-big'] !== 'true') {
  console.log('\nTHE 3x PLATE  (1280x800 CSS at devicePixelRatio 3 — the same drawing, 3840x2400 of it)');
  const page = await open(...PLATE, '&shot=1', 3);
  const info = await page.evaluate(() => {
    const T = window.__theatre;
    T.renderer.setPixelRatio(3);
    T.renderer.setSize(T.size.w, T.size.h);
    T.pieces.camera.cut('home');
    T.camera.updateMatrixWorld();
    return { box: T.pieces.props.peep.hitBox(), buf: `${T.renderer.domElement.width}x${T.renderer.domElement.height}` };
  });
  await page.waitForTimeout(2500);
  const buf = await page.screenshot({ timeout: 300000, clip: { x: 0, y: 0, width: PLATE[0], height: PLATE[1] } });
  const meta = await sharp(buf).metadata();
  console.log(`  drawing buffer ${info.buf}, screenshot ${meta.width}x${meta.height}`);
  const size = await crop(buf, info.box, `${OUT}/egg-peep-shelf-3x.png`, { pad: 16, src: 3 });
  console.log(`  the shelf crop  ${size.width} x ${size.height} px, cut 1:1 out of the 3x plate`);
  ok(meta.width === PLATE[0] * 3, 'the plate really was rendered at three times the plate');
  ok(page.__errors.length === 0, 'no page errors at dpr 3');
  await page.close();
}

// ---- 5. the phone ---------------------------------------------------------------------------------
// A PHONE IS A FIRST-CLASS FRAME (BRIEF.md), so the question is not "does he look all right on a
// phone" but "is he in the picture at all, on any plate the film cuts to". The radio was measured
// off the left of a portrait window in round 8 and the user knows; the press stands at the other
// end of the same wall, so the question has to be asked again rather than assumed either way.
console.log('\nA PHONE  (390x844) — every named plate, and where the press lands in it');
{
  const page = await open(...PHONE, '&shot=1');
  const shots = ['home', 'wide', 'pepe', 'table', 'spread', 'door'];
  let best = null;
  for (const s of shots) {
    const m = await page.evaluate((name) => {
      const T = window.__theatre;
      try {
        T.pieces.camera.cut(name);
      } catch (e) {
        return null;
      }
      T.camera.updateMatrixWorld();
      return { peep: T.pieces.props.peep.hitBox(), cat: T.pieces.props.cat.hitBox() };
    }, s);
    if (!m) continue;
    const b = m.peep;
    const inFrame = b.x >= 0 && b.y >= 0 && b.x + b.w <= 390 && b.y + b.h <= 844;
    console.log(`  ${s.padEnd(7)} Peep ${b.w.toFixed(0)} x ${b.h.toFixed(0)} px at ${b.x.toFixed(0)},${b.y.toFixed(0)} — ${inFrame ? 'IN FRAME' : 'OUT OF FRAME'}   [the cat at x ${m.cat.x.toFixed(0)}]`);
    if (inFrame && !best) best = s;
  }
  await page.evaluate((s) => window.__theatre.pieces.camera.cut(s), best ?? 'wide');
  await page.waitForTimeout(700);
  await page.locator('#stage').screenshot({ path: `${OUT}/egg-peep-phone.png`, timeout: 120000 });
  console.log(`  the phone frame saved is '${best ?? 'wide'}'` + (best ? '' : ' — he is off the right of every portrait plate, exactly as the radio is off the left'));
  await page.close();
}

// ---- 6. the two cues, rendered offline -------------------------------------------------------------
if (args.sound === 'true') {
  console.log('\nTHE CUES, RENDERED OFFLINE  (through sound.render — the same OfflineAudioContext tools/_sound-probe.mjs uses)');
  const page = await open(...PLATE);
  // …and 'static' with it, whose trim the probe measured long ago: if this reproduces that figure
  // the rig is the probe's rig and the two new numbers can be trusted.
  for (const name of ['static', 'croak', 'thud']) {
    const r = await page.evaluate(async (cue) => {
      const s = window.__theatre.pieces.sound;
      const b = await s.render(cue, 1.4, { seed: 7, at: 0.02 });
      let peak = 0, first = -1, last = -1;
      for (const d of [b.l, b.r]) {
        for (let i = 0; i < d.length; i++) {
          const a = Math.abs(d[i]);
          if (a > peak) peak = a;
          if (a > 1e-4) {
            if (first < 0 || i < first) first = i;
            if (i > last) last = i;
          }
        }
      }
      return { peak, length: (last - first) / b.sampleRate, want: s.levels[cue], cap: s.lengths?.[cue] ?? null };
    }, name);
    // the trim that makes the rendered peak equal LEVEL, given the trim already in the table
    const trim = await page.evaluate((c) => window.__theatre.pieces.sound.trims?.[c] ?? 1, name);
    const wants = r.peak > 0 ? (r.want / r.peak) * trim : 0;
    console.log(
      `  ${name.padEnd(7)} peak ${r.peak.toFixed(4)} (${(20 * Math.log10(r.peak)).toFixed(1)} dBFS) · audible ${r.length.toFixed(3)} s of ${r.cap} allowed` +
        ` · LEVEL ${r.want} · trim in the table ${trim} → wants ${wants.toFixed(3)}`,
    );
    if (name !== 'static') ok(r.length <= r.cap + 0.02, `${name} is inside the length it declares (${r.cap} s)`);
  }
  console.log('  (paste the wanted trims into sound-voices.js TRIM, and re-run)');
  await page.close();
}

await browser.close();
console.log(`\nframes in ${OUT}`);
console.log(fails.length ? `\n${fails.length} check(s) FAILED:\n  ${fails.join('\n  ')}` : '\nevery check holds');
process.exit(fails.length ? 1 : 0);
