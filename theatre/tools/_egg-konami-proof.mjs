#!/usr/bin/env node
// Proof for the house of cards (src/pieces/egg-konami.js).
//
//   BASE=http://127.0.0.1:8712 node tools/_egg-konami-proof.mjs [--part keys|field|busy|frames|deck|live|strip]
//
// keys    the code typed with real key events on the window: does it open, in what phases, and is
//         a near miss (↑↑↓↓←→←→AB) refused
// field   the same code typed while the visitor's own field has focus: the egg opens AND the field
//         keeps every keystroke — nothing is preventDefault'ed, and 'b' and 'a' land in the input
// busy    the code typed mid-reading: refused, and accepted again the moment the beat is idle
// frames  the home and table plates at the leap (t = 1), the house standing, mid-collapse, and
//         after — the last pixel-compared against the room before anything happened
// deck    a real run at 12 fps, with every mesh, pose, material and texture window of the deck
//         compared before and after
// live    the same run in a running evening: the before/after frames of a LIVE page against a
//         control pair taken the same distance apart with nothing happening (the boil's own noise)
// strip   a contact sheet of the whole eight seconds
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const OUT = args.out ?? '/tmp/egg-konami';
const part = args.part ?? 'all';
const has = (p) => part === 'all' || part === p;
mkdirSync(OUT, { recursive: true });

// every still is taken with the scene clock frozen and the dial pinned, so two frames differ only
// where the house made them differ
const FREEZE = 't=2&now=10:10&seed=1';
const url = (q) => `${BASE}/?${q}&shot=1`;
const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

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

async function open(width, height, q) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.route('**/@vite/client', viteStub);
  await page.goto(url(q), { waitUntil: 'load', timeout: 180000 });
  const t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
    await page.waitForTimeout(200);
  }
  return { page, errors };
}

const log = [];
const say = (s) => {
  log.push(s);
  console.log(s);
};

// what the page watches while the code is typed: the phases, and whether anything ate a keystroke
const WATCH = () => {
  window.__k = { phases: [], keys: [] };
  window.__theatre.on('props:konami', (d) => window.__k.phases.push(d.phase));
  // CAPTURE, on the document: the drawn field stops propagation on its own keydown, so a bubble
  // listener never hears the keys it took — which is the very thing being measured here
  document.addEventListener(
    'keydown',
    (e) => window.__k.keys.push({ key: e.key, prevented: e.defaultPrevented, target: e.target?.tagName ?? '-', cls: e.target?.className ?? '' }),
    true,
  );
};
async function type(page, keys = CODE, gap = 40) {
  for (const k of keys) {
    await page.keyboard.press(k);
    await page.waitForTimeout(gap);
  }
}

// ── the code, on the window ───────────────────────────────────────────────────────────────────
if (has('keys')) {
  const { page, errors } = await open(1280, 800, 'now=10:10');
  await page.waitForTimeout(600);
  await page.evaluate(WATCH);
  const idle = await page.evaluate(() => ({ idle: window.__theatre.pieces.props.konami.idle, beat: window.__theatre.pieces.flow?.beat }));
  // a near miss first: the same eight arrows, then A then B
  await type(page, [...CODE.slice(0, 8), 'a', 'b']);
  const miss = await page.evaluate(() => window.__theatre.pieces.props.konami.active);
  await type(page);
  const hit = await page.evaluate(() => ({ active: window.__theatre.pieces.props.konami.active, t: window.__theatre.pieces.props.konami.t, phases: window.__k.phases.slice() }));
  await page.waitForTimeout(3400);
  const mid = await page.evaluate(() => ({ t: window.__theatre.pieces.props.konami.t, phases: window.__k.phases.slice() }));
  await page.waitForTimeout(5200);
  const end = await page.evaluate(() => ({ active: window.__theatre.pieces.props.konami.active, phases: window.__k.phases.slice(), keys: window.__k.keys.length }));
  say(`keys: room idle=${idle.idle} (beat ${idle.beat}) · near miss ↑↑↓↓←→←→AB → active=${miss} · the code → active=${hit.active} at t=${hit.t.toFixed(2)}`);
  say(`keys: phases ${end.phases.join(' → ')} · standing at ${mid.t.toFixed(1)}s · over and idle again: active=${end.active} · ${end.keys} keydowns seen${errors.length ? '  ERRORS: ' + errors.join(' | ') : ''}`);
  await page.close();
}

// ── the code, with the visitor's field open and focused ───────────────────────────────────────
if (has('field')) {
  const { page, errors } = await open(1280, 800, 'now=10:10');
  await page.waitForTimeout(600);
  await page.evaluate(WATCH);
  // the real drawn field, the one flow asks with
  page.evaluate(() => window.__theatre.pieces.dialogue.ask('Say something.', { timeout: 120 })).catch(() => {});
  await page.waitForSelector('input.keys', { timeout: 30000 });
  await page.evaluate(() => document.querySelector('input.keys')?.focus());
  const focused = await page.evaluate(() => document.activeElement?.className ?? '-');
  await type(page);
  const r = await page.evaluate(() => ({
    active: window.__theatre.pieces.props.konami.active,
    value: document.querySelector('input.keys')?.value ?? null,
    prevented: window.__k.keys.filter((k) => k.prevented).map((k) => k.key),
    onInput: window.__k.keys.filter((k) => k.target === 'INPUT').length,
  }));
  say(`field: focus on <input class="${focused}"> · the code → active=${r.active} · the field kept "${r.value}" · ${r.onInput}/10 keydowns reached the input · preventDefault on: ${r.prevented.length ? r.prevented.join(',') : 'none'}${errors.length ? '  ERRORS: ' + errors.join(' | ') : ''}`);
  await page.close();
}

// ── mid-reading, the code does nothing ────────────────────────────────────────────────────────
if (has('busy')) {
  const { page, errors } = await open(1280, 800, 'now=10:10');
  await page.waitForTimeout(600);
  await page.evaluate(WATCH);
  const out = [];
  for (const beat of ['shuffle', 'fan', 'dealt', 'reading', 'recall', 'talk', 'greeting']) {
    await page.evaluate((b) => {
      window.__theatre.pieces.flow.beat = b;
      window.__k.phases.length = 0;
    }, beat);
    const allowed = await page.evaluate(() => window.__theatre.pieces.props.konami.idle);
    const started = await page.evaluate(() => window.__theatre.pieces.props.konami.start());
    if (started) {
      await page.evaluate(() => {
        // put it straight back: this part is about the gate, not the run
        window.__theatre.pieces.props.konami.setState('default');
      });
    }
    out.push(`${beat}=${started ? 'RUNS' : 'refused'}${allowed === started ? '' : '(!)'}`);
  }
  // …and with the wash out on the cloth, whatever the beat says
  await page.evaluate(async () => {
    window.__theatre.pieces.flow.beat = 'talk';
    await window.__theatre.pieces.reveal.setState('fan');
  });
  await page.waitForTimeout(1200);
  const washed = await page.evaluate(() => ({ fan: window.__theatre.pieces.reveal.fanCount, started: window.__theatre.pieces.props.konami.start() }));
  say(`busy: ${out.join(' · ')} · with ${washed.fan} cards washed out on the cloth: ${washed.started ? 'RUNS (!)' : 'refused'}${errors.length ? '  ERRORS: ' + errors.join(' | ') : ''}`);
  await page.close();
}

// ── three cards face up from a reading: they stay exactly where they are ──────────────────────
if (has('reading')) {
  const { page, errors } = await open(1280, 800, `view=camera&state=table&${FREEZE}`);
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__theatre.pieces.reveal.setState('revealed'));
  await page.waitForTimeout(1500);
  const READ = () =>
    window.__theatre.pieces.cards.drawn.children.map((m) => ({
      name: m.name,
      p: m.position.toArray().map((v) => +v.toFixed(9)),
      q: m.quaternion.toArray().map((v) => +v.toFixed(9)),
    }));
  const before = await page.evaluate(READ);
  // the house standing, over the same cloth
  await page.evaluate(() => window.__theatre.pieces.props.konami.setState('konami-house'));
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/reading-house.png`, timeout: 120000 });
  const during = await page.evaluate(READ);
  // …and the nearest approach: the house's own nearest card edge against the row's furthest
  const gap = await page.evaluate(() => {
    const b = window.__theatre.pieces.props.konami.bounds;
    let far = -9;
    for (const m of window.__theatre.pieces.cards.drawn.children) {
      m.geometry.computeBoundingBox();
      const bb = m.geometry.boundingBox;
      for (const sx of [bb.min.x, bb.max.x]) for (const sz of [bb.min.z, bb.max.z]) {
        const v = new (Object.getPrototypeOf(m.position).constructor)(sx, 0, sz);
        m.localToWorld(v);
        far = Math.max(far, v.z);
      }
    }
    return { rowFurthest: far, houseNearest: b.z[0] };
  });
  await page.evaluate(() => window.__theatre.pieces.props.konami.setState('default'));
  await page.waitForTimeout(600);
  const after = await page.evaluate(READ);
  const same = JSON.stringify(before) === JSON.stringify(during) && JSON.stringify(before) === JSON.stringify(after);
  say(`reading: ${before.length} cards face up (${before.map((c) => c.name.replace('card:', '')).join(', ')}) — not one of them moved while the house stood and fell: ${same ? 'YES' : 'NO'}`);
  say(`reading: the row's furthest edge is at z ${gap.rowFurthest.toFixed(3)}, the house's nearest card edge at z ${gap.houseNearest.toFixed(3)} — ${((gap.houseNearest - gap.rowFurthest) * 1000).toFixed(0)} mm of clear cloth between them${errors.length ? '  ERRORS: ' + errors.join(' | ') : ''}`);
  await page.close();
}

// ── the plates ────────────────────────────────────────────────────────────────────────────────
const TS = [['leap', 1.0], ['aloft', 0.95], ['house', 4.2], ['collapse', 5.75], ['after', 8.6]];
if (has('frames') || has('strip')) {
  const shots = new Map();
  // ONE PAGE PER PLATE, and the still is asked for by `konami.at(t)`. The scene clock is frozen at
  // t = 2, so the boil is the same drawing in every frame of the set and two of them differ only
  // where the house made them differ — while the page itself, its seed, its dial and its textures
  // are literally the same page.
  // COUNT THE PAGE'S OWN FRAMES, not the scene clock's: these stills are taken with `?t=2`, which
  // freezes the clock at frame 24 for ever, so `clock.frame` is not a heartbeat here. A rAF
  // callback installed after main.js's loop runs after it in the same frame, so three of them is
  // three whole update-and-render cycles since the hold was moved.
  const ticker = (page) =>
    page.evaluate(() => {
      if (window.__ticks != null) return;
      window.__ticks = 0;
      const l = () => {
        window.__ticks++;
        requestAnimationFrame(l);
      };
      requestAnimationFrame(l);
    });
  const settle = async (page) => {
    const f0 = await page.evaluate(() => window.__ticks ?? 0);
    await page.waitForFunction((f) => (window.__ticks ?? 0) > f + 2, f0, { timeout: 120000, polling: 200 }).catch(() => {});
    await page.waitForTimeout(400);
  };
  for (const plate of args.plate ? [args.plate] : ['home', 'table']) {
    const { page, errors } = await open(1280, 800, `view=camera&state=${plate}&${FREEZE}`);
    await ticker(page);
    await settle(page);
    const before = await page.screenshot({ timeout: 120000 });
    writeFileSync(`${OUT}/${plate}-before.png`, before);
    for (const [name, t] of TS) {
      const st = await page.evaluate((tt) => {
        const k = window.__theatre.pieces.props.konami;
        k.at(tt);
        const g = window.__theatre.scene.getObjectByName('konami');
        return { t: k.t, active: k.active, up: g ? g.children.filter((c) => c.visible).length : 0, b: k.bounds };
      }, t);
      await settle(page);
      const buf = await page.screenshot({ timeout: 120000 });
      shots.set(`${plate}:${name}`, buf);
      writeFileSync(`${OUT}/${plate}-${name}.png`, buf);
      if (plate === 'table' && name === 'house')
        say(`house: ${st.b.cards} cards, ${st.b.storeys} storeys, ${(st.b.w * 100).toFixed(1)} cm across, ${(st.b.h * 100).toFixed(1)} cm tall, z ${st.b.z.map((v) => v.toFixed(3)).join('..')}`);
      say(`${plate} t=${t} (${name}): active=${st.active} · ${st.up} of 78 cards drawn${errors.length ? '  ERRORS: ' + errors.join(' | ') : ''}`);
    }
    await page.close();
    // after == untouched?
    const a = await sharp(before).raw().toBuffer();
    const b = await sharp(shots.get(`${plate}:after`)).raw().toBuffer();
    let diff = 0, worst = 0;
    for (let i = 0; i < a.length; i++) {
      const d = Math.abs(a[i] - b[i]);
      if (d > 2) diff++;
      if (d > worst) worst = d;
    }
    say(`${plate}: after (t=8.6) vs before — ${diff} of ${a.length} subpixels differ by more than 2/255 (${((diff / a.length) * 100).toFixed(4)}%), worst ${worst}/255`);
  }
  if (has('strip')) {
    const w = 320, h = 200;
    const names = TS.map(([n]) => n);
    const tiles = await Promise.all(names.map((n) => sharp(shots.get(`table:${n}`)).resize(w, h).png().toBuffer()));
    await sharp({ create: { width: w * names.length, height: h, channels: 3, background: '#888' } })
      .composite(tiles.map((input, i) => ({ input, left: i * w, top: 0 })))
      .png()
      .toFile(`${OUT}/strip.png`);
    say(`strip: ${OUT}/strip.png (${names.join(', ')})`);
  }
}

// ── the deck, before and after a real run ─────────────────────────────────────────────────────
const SNAP = () => {
  const d = window.__theatre.pieces.cards.deck;
  d.updateMatrixWorld(true);
  const one = (c) => ({
    name: c.name,
    uuid: c.uuid,
    visible: c.visible,
    p: c.position.toArray().map((v) => +v.toFixed(9)),
    q: c.quaternion.toArray().map((v) => +v.toFixed(9)),
    s: c.scale.toArray().map((v) => +v.toFixed(9)),
    geo: c.geometry?.uuid ?? null,
    mat: (Array.isArray(c.material) ? c.material : [c.material]).map((m) => m?.uuid ?? null),
    map: (Array.isArray(c.material) ? c.material : [c.material]).map((m) => m?.map?.uuid ?? null),
    win: (Array.isArray(c.material) ? c.material : [c.material]).map((m) => (m?.map ? [m.map.repeat.x, m.map.repeat.y, m.map.offset.x, m.map.offset.y] : null)),
  });
  return {
    group: { p: d.position.toArray(), q: d.quaternion.toArray(), s: d.scale.toArray(), visible: d.visible },
    n: d.children.length,
    children: d.children.map(one),
  };
};
if (has('deck') || has('live')) {
  const { page, errors } = await open(1280, 800, 'now=10:10');
  await page.waitForTimeout(800);
  await page.evaluate(WATCH);
  const before = await page.evaluate(SNAP);
  const beforeShot = await page.screenshot({ timeout: 120000 });
  const started = await page.evaluate(() => window.__theatre.pieces.props.konami.start());
  await page.waitForTimeout(1500);
  const during = await page.evaluate(SNAP);
  // THE HEADLESS BROWSER DRAWS THIS PAGE ABOUT ONCE EVERY THREE SECONDS on software WebGL, so the
  // eight seconds are eight seconds of wall clock but only two or three drawings: waiting eight
  // seconds and looking can catch the run between two of them. Wait for the piece to have actually
  // put the deck back — no temporary stack left in it — rather than for a stopwatch.
  await page.waitForFunction(
    () => {
      const d = window.__theatre.pieces.cards.deck;
      return !window.__theatre.pieces.props.konami.active && d.children.every((c) => !c.name.startsWith('tmp:'));
    },
    null,
    { timeout: 90000, polling: 300 },
  );
  const after = await page.evaluate(SNAP);
  const afterShot = await page.screenshot({ timeout: 120000 });
  // …and a control pair the same distance apart with nothing happening at all
  await page.waitForTimeout(400);
  const c0 = await page.screenshot({ timeout: 120000 });
  await page.waitForTimeout(9500);
  const c1 = await page.screenshot({ timeout: 120000 });
  const state = await page.evaluate(() => ({ active: window.__theatre.pieces.props.konami.active, phases: window.__k.phases.slice() }));
  await page.close();

  if (has('deck')) {
    const A = JSON.stringify(before), B = JSON.stringify(after);
    const same = A === B;
    const notes = [];
    if (!same) {
      if (before.n !== after.n) notes.push(`children ${before.n} → ${after.n}`);
      for (let i = 0; i < Math.max(before.children.length, after.children.length); i++) {
        const x = before.children[i], y = after.children[i];
        if (JSON.stringify(x) !== JSON.stringify(y)) notes.push(`[${i}] ${x?.name ?? '-'} → ${y?.name ?? '-'}: ${JSON.stringify(y)}`);
      }
    }
    say(`deck: started=${started} · before ${before.n} meshes (${before.children.map((c) => c.name).join(', ')})`);
    say(`deck: during the leap ${during.n} meshes (${during.children.map((c) => `${c.name}${c.visible ? '' : ' hidden'}`).join(', ')})`);
    say(`deck: after ${after.n} meshes — every mesh, pose, scale, material and texture window IDENTICAL: ${same ? 'YES' : 'NO — ' + notes.join(' | ')}`);
    say(`deck: phases ${state.phases.join(' → ')} · active now ${state.active}${errors.length ? '  ERRORS: ' + errors.join(' | ') : ''}`);
    writeFileSync(`${OUT}/live-before.png`, beforeShot);
    writeFileSync(`${OUT}/live-after.png`, afterShot);
  }
  if (has('live')) {
    const count = async (x, y) => {
      const a = await sharp(x).raw().toBuffer(), b = await sharp(y).raw().toBuffer();
      let diff = 0, worst = 0;
      for (let i = 0; i < a.length; i++) {
        const d = Math.abs(a[i] - b[i]);
        if (d > 2) diff++;
        if (d > worst) worst = d;
      }
      return { pct: (diff / a.length) * 100, worst };
    };
    const run = await count(beforeShot, afterShot);
    const ctl = await count(c0, c1);
    say(`live: the room before the code vs the room after the eight seconds — ${run.pct.toFixed(4)}% of subpixels differ, worst ${run.worst}/255`);
    say(`live: control, two frames 9.5 s apart with nothing happening — ${ctl.pct.toFixed(4)}%, worst ${ctl.worst}/255 (this is the boil)`);
    say(`live: the run's own difference is ${(run.pct / Math.max(ctl.pct, 1e-9)).toFixed(2)}x the boil's`);
  }
}

writeFileSync(`${OUT}/report.txt`, log.join('\n') + '\n');
console.log(`\n${OUT}/report.txt`);
await browser.close();
