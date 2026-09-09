#!/usr/bin/env node
// THE CAT'S LAMP, DRIVEN LIKE A VISITOR (props round 9).
//
// The cat on the right-hand bookcase is a lamp. Off, it is the solid ink mass it has always been;
// on, it is bare paper with its eyes, whiskers, nose and tail rule in pen. This tool does not ask
// the props piece whether it thinks it worked. It puts a real pointer on the cat's own projected
// box, clicks it, and then asks three independent witnesses:
//
//   the DRAWING   the cat's own userData.lit, and a frame, and a 2x crop of that frame
//   the EVENT     what came out of ctx.emit('props:cat', …) on the page's own bus
//   the SOUND     sound.timeline, which is what the audio graph was actually given, plus a stub
//                 laid over play() so a cue that never reached the graph is still caught
//
// It also measures whether the cat is IN THE PICTURE at all on a 390x844 phone at the home plate.
// The radio is not (round 8 measured it at x = -111), and the user knows; the cat stands on the
// other side of the room, so the question has to be asked again rather than assumed either way.
//
//   node tools/_props-r9-cat.mjs
//   node tools/_props-r9-cat.mjs --out /abs/dir
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const OUT = args.out ?? '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre/public/progress/shots';
mkdirSync(OUT, { recursive: true });

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

async function open(w, h, query = '') {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  await page.route('**/@vite/client', stub);
  await page.goto(`http://127.0.0.1:5173/?view=props&state=default${query}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  page.__errors = errors;
  return page;
}

// a 2x crop round a box on the glass, so the pen can be judged at something like 1:1
async function crop(buf, box, out, { pad = 26, scale = 2 } = {}) {
  const meta = await sharp(buf).metadata();
  const left = Math.max(0, Math.round(box.x - pad));
  const top = Math.max(0, Math.round(box.y - pad));
  const width = Math.min(meta.width - left, Math.round(box.w + pad * 2));
  const height = Math.min(meta.height - top, Math.round(box.h + pad * 2));
  await sharp(buf)
    .extract({ left, top, width, height })
    .resize({ width: width * scale, height: height * scale, kernel: 'nearest' })
    .png()
    .toFile(out);
  return { left, top, width, height };
}

const fails = [];
const ok = (cond, line) => {
  console.log(`${cond ? '  ok  ' : '  FAIL'}  ${line}`);
  if (!cond) fails.push(line);
};

// ---- 1. the cat's box on the glass, in every window the film is judged at -------------------------
console.log('\nTHE CAT ON THE GLASS  (home plate; "in frame" means the whole box is inside the picture)');
const boxes = {};
for (const [W, H] of [PLATE, [1600, 900], PHONE, [390, 760], [360, 800]]) {
  const page = await open(W, H, '&shot=1');
  const m = await page.evaluate(() => {
    window.__theatre.pieces.camera.cut('home');
    const c = window.__theatre.pieces.props.cat;
    const r = window.__theatre.pieces.props.radio;
    return { cat: c.hitBox(), tap: c.tapBox(), radio: r.hitBox() };
  });
  boxes[`${W}x${H}`] = m;
  const b = m.cat, t = m.tap;
  const inFrame = b.x >= 0 && b.y >= 0 && b.x + b.w <= W && b.y + b.h <= H;
  const anyOf = b.x + b.w > 0 && b.x < W && b.y + b.h > 0 && b.y < H;
  console.log(
    `  ${String(W + 'x' + H).padEnd(9)} cat ${b.w.toFixed(1)} x ${b.h.toFixed(1)} px at ${b.x.toFixed(0)},${b.y.toFixed(0)}` +
      `   tap ${t.w.toFixed(0)} x ${t.h.toFixed(0)}${t.grown ? ' (GROWN)' : ' (the cat itself)'}` +
      `   ${inFrame ? 'IN FRAME' : anyOf ? 'PART IN FRAME' : 'OUT OF FRAME'}` +
      `   [radio at x ${m.radio.x.toFixed(0)}]`,
  );
  await page.close();
}

// ---- 2. a real pointer on the cat: hover, click, click again --------------------------------------
console.log('\nA POINTER ON THE CAT  (1280x800, home; the sound piece is live — no ?shot=1)');
{
  const [W, H] = PLATE;
  const page = await open(W, H);
  await page.evaluate(() => {
    window.__cat = [];
    window.__theatre.on('props:cat', (d) => window.__cat.push(d));
    // a stub over play(), so a cue that never reaches the audio graph is still caught
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
      const t = window.__theatre;
      const cat = t.scene.getObjectByName('cat');
      const body = cat.children[0];
      return {
        lit: t.pieces.props.cat.lit,
        drawn: cat.userData.lit,
        // the mass's own material, which is the drawing and not anybody's opinion of it
        bodyMap: body.material.map ? 'solid-ink' : 'paper',
        bodyHatch: body.material.userData.ink.hatch,
        cursor: t.renderer.domElement.style.cursor || '(none)',
        cues: window.__cues.slice(),
        timeline: (t.pieces.sound.timeline ?? []).map((x) => x.name).slice(-4),
        events: window.__cat.slice(),
        played: t.pieces.sound.stats.played,
        catLamp: +(t.pieces.lighting?.practicals?.cat?.intensity ?? -1).toFixed(3),
      };
    });

  // The 12 fps cut lands on the next stepped frame, and this headless browser throttles its own
  // rAF hard — so nothing here waits on a stopwatch. It waits for the DRAWING to say it changed.
  const settle = (want) =>
    page.waitForFunction((w) => {
      const t = window.__theatre;
      return t.pieces.props.cat.lit === w && t.scene.getObjectByName('cat').userData.lit === w;
    }, want, { timeout: 20000 });
  const lampSettle = () =>
    page.waitForFunction(() => {
      const t = window.__theatre;
      const want = t.pieces.props.cat.lit ? 1.1 : 0;
      return Math.abs((t.pieces.lighting.practicals.cat?.intensity ?? -1) - want) < 1e-6;
    }, null, { timeout: 20000 });

  const box = await page.evaluate(() => window.__theatre.pieces.props.cat.hitBox());
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  console.log(`  the cat's own box       x ${box.x.toFixed(0)} y ${box.y.toFixed(0)}  ${box.w.toFixed(0)} x ${box.h.toFixed(0)} px  →  clicking ${cx.toFixed(0)},${cy.toFixed(0)}`);

  const before = await read();
  console.log('  before                  ', JSON.stringify(before));
  ok(before.lit === false && before.bodyMap === 'solid-ink', 'the cat starts black, and nothing announced the lamp');
  ok(before.cursor === '(none)', 'no cursor before a pointer goes near it');

  // hover, well away first, then on the cat
  await page.mouse.move(40, H - 40);
  await page.waitForTimeout(300);
  const away = await read();
  ok(away.cursor === '(none)', 'the cursor is the page\'s own away from the cat');
  await page.mouse.move(cx, cy);
  await page.waitForTimeout(400);
  const hover = await read();
  console.log('  hovering                ', JSON.stringify({ cursor: hover.cursor, hovered: await page.evaluate(() => window.__theatre.pieces.props.cat.lit) }));
  ok(hover.cursor === 'pointer', 'hover over the cat makes the cursor a pointer, and that is the whole affordance');
  const hoverShot = await page.locator('#stage').screenshot();
  await sharp(hoverShot).png().toFile(`${OUT}/props-r9-cat-hover.png`);
  await crop(hoverShot, box, `${OUT}/props-r9-cat-hover-2x.png`);

  // the frame with the lamp OFF, and its 2x crop
  const offShot = await page.locator('#stage').screenshot();
  await sharp(offShot).png().toFile(`${OUT}/props-r9-cat-off.png`);
  await crop(offShot, box, `${OUT}/props-r9-cat-off-2x.png`);

  // ---- the click ---------------------------------------------------------------------------------
  await page.mouse.click(cx, cy);
  await settle(true);
  await lampSettle();
  const on = await read();
  console.log('  after one click         ', JSON.stringify(on));
  ok(on.lit === true && on.drawn === true, 'one click on the cat switches the lamp ON');
  ok(on.bodyMap === 'paper' && on.bodyHatch < 0.2, 'the mass is now bare paper and takes almost no tone');
  ok(on.events.length === 1 && on.events[0].lit === true, "ctx.emit('props:cat', { lit: true }) fired once");
  ok(on.cues.includes('switch'), "the 'switch' cue was asked for");
  ok(on.timeline.includes('switch'), "the 'switch' cue reached the audio graph (sound.timeline)");
  ok(on.played > before.played, 'the sound piece counted it (stats.played)');

  const onShot = await page.locator('#stage').screenshot();
  await sharp(onShot).png().toFile(`${OUT}/props-r9-cat-on.png`);
  await crop(onShot, box, `${OUT}/props-r9-cat-on-2x.png`);

  // it is a switch, so it switches back
  await page.mouse.click(cx, cy);
  await settle(false);
  await lampSettle();
  const off = await read();
  console.log('  after a second click    ', JSON.stringify(off));
  ok(off.lit === false && off.bodyMap === 'solid-ink', 'a second click switches it OFF: the same cat, black again');
  ok(off.events.length === 2 && off.events[1].lit === false, "ctx.emit('props:cat', { lit: false }) fired on the way back");
  ok(off.cues.filter((c) => c === 'switch').length === 2, "the 'switch' cue fired both ways");

  // and a thumb, which is the phone
  await page.touchscreen.tap(cx, cy);
  await settle(true);
  const tapped = await read();
  console.log('  a tap (touch, no hover) ', JSON.stringify({ lit: tapped.lit, events: tapped.events.length }));
  ok(tapped.lit === true, 'a touch tap works with no hover in front of it');

  // the two switches must not fight: a click on the radio is the radio's
  const rbox = await page.evaluate(() => window.__theatre.pieces.props.radio.hitBox());
  const rx = rbox.x + rbox.w / 2, ry = rbox.y + rbox.h / 2;
  const st0 = await page.evaluate(() => window.__theatre.pieces.props.radio.station);
  await page.mouse.click(rx, ry);
  await page.waitForFunction((s0) => window.__theatre.pieces.props.radio.station !== s0, st0, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({ station: window.__theatre.pieces.props.radio.station, lit: window.__theatre.pieces.props.cat.lit }));
  console.log(`  a click on the radio    `, JSON.stringify({ station: `${st0} → ${after.station}`, cat: after.lit }));
  ok(after.station !== st0 && after.lit === tapped.lit, 'a click on the radio moves the radio and leaves the cat where it was');

  // do the boxes even overlap? (they must not, or the nearer-object rule is doing real work)
  const overlap = !(rbox.x + rbox.w < box.x || box.x + box.w < rbox.x || rbox.y + rbox.h < box.y || box.y + box.h < rbox.y);
  console.log(`  the two boxes overlap?  ${overlap ? 'YES — the nearer object takes the tap' : 'no (they are at opposite ends of the room)'}`);

  console.log('  page errors             ', page.__errors.length ? page.__errors : 'none');
  ok(page.__errors.length === 0, 'no page errors');
  await page.close();
}

// ---- 3. the phone, at the home plate, with the lamp on ---------------------------------------------
{
  const [W, H] = PHONE;
  const page = await open(W, H, '&shot=1');
  await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
  await page.waitForTimeout(600);
  await page.locator('#stage').screenshot({ path: `${OUT}/props-r9-cat-phone-off.png` });
  await page.evaluate(() => window.__theatre.pieces.props.cat.set(true));
  await page.waitForTimeout(500);
  await page.locator('#stage').screenshot({ path: `${OUT}/props-r9-cat-phone-on.png` });
  await page.close();
}

// ---- 4. the wall cast, which only has anything to do when the light goes ---------------------------
// The plaster behind the cat is bare paper in the afternoon, so a 3 W bulb has no tone there to
// remove. `evening` is the state where the question can be answered at all.
console.log('\nTHE WALL CAST  (?light=evening, 1280x800, home)');
for (const on of [false, true]) {
  const page = await open(...PLATE, '&shot=1&light=evening');
  await page.evaluate((lit) => {
    window.__theatre.pieces.camera.cut('home');
    window.__theatre.pieces.props.cat.set(lit);
  }, on);
  await page
    .waitForFunction((lit) => {
      const t = window.__theatre;
      const want = lit ? t.pieces.lighting.states.evening.catLamp : 0;
      return Math.abs((t.pieces.lighting.practicals.cat?.intensity ?? -1) - want) < 1e-6;
    }, on, { timeout: 20000 })
    .catch(() => {});
  const lamp = await page.evaluate(() => +(window.__theatre.pieces.lighting.practicals.cat?.intensity ?? -1).toFixed(3));
  await page.locator('#stage').screenshot({ path: `${OUT}/props-r9-cat-evening-${on ? 'on' : 'off'}.png` });
  console.log(`  evening, lamp ${on ? 'on ' : 'off'}   catLamp intensity ${lamp}`);
  await page.close();
}
// the same pair on the default plate, so the "it does nothing in daylight" claim is on the record
for (const on of [false, true]) {
  const page = await open(...PLATE, '&shot=1');
  await page.evaluate((lit) => {
    window.__theatre.pieces.camera.cut('home');
    window.__theatre.pieces.props.cat.set(lit);
  }, on);
  await page.waitForTimeout(600);
  await page.locator('#stage').screenshot({ path: `${OUT}/props-r9-cat-plate-${on ? 'on' : 'off'}.png` });
  await page.close();
}

await browser.close();
console.log(`\nframes in ${OUT}`);
console.log(fails.length ? `\n${fails.length} check(s) FAILED:\n  ${fails.join('\n  ')}` : '\nevery check holds');
process.exit(fails.length ? 1 : 0);
