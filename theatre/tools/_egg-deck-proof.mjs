#!/usr/bin/env node
// Proof for the deck laid out face up (src/pieces/egg-deck.js).
//
//   BASE=http://127.0.0.1:8725 node tools/_egg-deck-proof.mjs [--part click|frames|look|deck|busy|phone|geom]
//
// click   a real mouse click on the squared deck, on a live page: does it open, on which plate,
//         and does the cursor say so before the click does
// frames  the lay-out at 1 s, 2.5 s and complete, with the 78 counted off their own meshes
// look    the hover pop, a tap bringing a card to the lens with its name on the placard, and the
//         second tap putting it back
// deck    a real run at 12 fps with every mesh, pose, scale, material and texture window of the
//         deck compared before and after, and the home plate pixel-compared
// busy    the click refused mid-reading; a draw intent raking the lay-out home on its own; and a
//         reading's three cards face up, untouched, while the deck is out and after it is home
// phone   390x760: the lay-out, the plan it chose, and what a card measures on the glass
// geom    the arrangement measured — every corner against the rim, the reading row and the frame,
//         and how much of a card its neighbour actually covers
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
const OUT = args.out ?? '/tmp/egg-deck';
const part = args.part ?? 'all';
const has = (p) => part === 'all' || part === p;
mkdirSync(OUT, { recursive: true });

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
  await page.goto(`${BASE}/?${q}&shot=1`, { waitUntil: 'load', timeout: 180000 });
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
const E = (errors) => (errors.length ? '  ERRORS: ' + errors.slice(0, 3).join(' | ') : '');

// how many of the seventy-eight are drawn, and how many of them are face up (the printed side
// toward the lens): taken off the meshes' own world matrices, never off a counter
// the headless browser draws at a few frames a second, so nothing here sleeps for a beat and hopes:
// every wait is on the piece's own state
const settle = (page, fn, arg = null) => page.waitForFunction(fn, arg, { timeout: 120000, polling: 150 }).catch(() => {});
const OPEN = () => window.__theatre.pieces.props.deck.mode === 'open';
const AT_LENS = (slug) => {
  const g = window.__theatre.scene.getObjectByName('deck-out');
  const m = g?.children.find((c) => c.userData.slug === slug);
  return !!m && m.scale.x > 0.98;
};
const AT_REST = (slug) => {
  const D = window.__theatre.pieces.props.deck;
  const g = window.__theatre.scene.getObjectByName('deck-out');
  const m = g?.children.find((c) => c.userData.slug === slug);
  return !!m && D.card == null && Math.abs(m.scale.x - D.plan.scale) < 0.01;
};
const SHUT = () => window.__theatre.pieces.props.deck.out === false;

const COUNT = () => {
  const ctx = window.__theatre;
  const g = ctx.scene.getObjectByName('deck-out');
  if (!g) return { drawn: 0, faceUp: 0 };
  const up = new ctx.THREE.Vector3(0, 1, 0);
  const n = new ctx.THREE.Vector3();
  let drawn = 0, faceUp = 0, slugs = [];
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

// ── a real click on the squared deck ──────────────────────────────────────────────────────────
if (has('click') || has('frames') || has('look')) {
  const { page, errors } = await open(1600, 900, 'now=10:10&seed=1');
  await page.waitForTimeout(900);
  const box = await page.evaluate(() => {
    const d = window.__theatre.pieces.props.deck;
    return { hit: d.hitBox(), tap: d.tapBox(), idle: d.idle, out: d.out, shot: window.__theatre.pieces.camera.current };
  });
  // the cursor first: the affordance is that and nothing else
  await page.mouse.move(box.tap.x + box.tap.w / 2, box.tap.y + box.tap.h / 2);
  await page.waitForTimeout(320);
  const hovered = await page.evaluate(() => ({ sw: window.__theatre.pieces.props.switches.hovered, cursor: window.__theatre.renderer.domElement.style.cursor }));
  await page.mouse.click(box.tap.x + box.tap.w / 2, box.tap.y + box.tap.h / 2);
  await page.waitForTimeout(250);
  const opened = await page.evaluate(() => {
    const d = window.__theatre.pieces.props.deck;
    return { out: d.out, mode: d.mode, phase: d.phase, shot: window.__theatre.pieces.camera.current, plan: d.plan?.plan, scale: +(d.plan?.scale ?? 0).toFixed(3) };
  });
  say(
    `click: the deck's own square is ${box.hit.w.toFixed(0)}x${box.hit.h.toFixed(0)} px on the home plate, a thumb is given ${box.tap.w.toFixed(0)}x${box.tap.h.toFixed(0)} · idle=${box.idle} · the pointer over it: switch "${hovered.sw}", cursor "${hovered.cursor}"`,
  );
  say(`click: opened=${opened.out} (${opened.mode}, phase ${opened.phase}) · the camera cut ${box.shot} → ${opened.shot} · plan "${opened.plan}", card at ${opened.scale} of its size${E(errors)}`);

  if (has('frames')) {
    for (const [name, t] of [['1s', 1.0], ['2.5s', 2.5], ['done', 3.0]]) {
      const st = await page.evaluate((tt) => {
        window.__theatre.pieces.props.deck.at(tt);
        return window.__theatre.pieces.props.deck.t;
      }, t);
      await page.waitForTimeout(900);
      const c = await page.evaluate(COUNT);
      await page.screenshot({ path: `${OUT}/lay-${name}.png`, timeout: 120000 });
      say(`frames: t=${st.toFixed(2)} (${name}) — ${c.drawn} cards drawn, ${c.faceUp} of them face up, ${c.unique} different  → ${OUT}/lay-${name}.png`);
    }
    // …and the rake, held at nine tenths of a second so a still can be taken of a thing that is
    // over in two (the props piece's own `deck-gather` state)
    await page.evaluate(() => window.__theatre.pieces.props.deck.setState('deck-gather'));
    await page.waitForTimeout(900);
    const g = await page.evaluate(COUNT);
    await page.screenshot({ path: `${OUT}/rake-mid.png`, timeout: 120000 });
    say(`frames: the rake held at 0.9 s — ${g.drawn} cards still on the cloth of 78  → ${OUT}/rake-mid.png`);
    await page.evaluate(() => window.__theatre.pieces.props.deck.at(null));
  }

  if (has('look')) {
    // put it back on the live clock and let it finish the lay-out
    await page.evaluate(() => {
      window.__theatre.pieces.props.deck.at(null);
      window.__theatre.pieces.props.deck.open();
    });
    await settle(page, OPEN);
    // THE HOVER. A card in the middle of the majors' arc: where it is on the glass, then the
    // pointer on it, then where it is after two drawings.
    const where = await page.evaluate(() => {
      const ctx = window.__theatre;
      const D = ctx.pieces.props.deck;
      const p = D.poses[10]; // X, the middle of the majors' arc
      const g = ctx.scene.getObjectByName('deck-out');
      const m = g.children[10];
      m.updateMatrixWorld(true);
      const v = m.getWorldPosition(new ctx.THREE.Vector3());
      const before = { z: +v.z.toFixed(4), y: +v.y.toFixed(4) };
      const s = v.clone().project(ctx.camera);
      return { slug: p.slug, before, px: ((s.x + 1) / 2) * window.innerWidth, py: ((1 - s.y) / 2) * window.innerHeight };
    });
    await page.mouse.move(where.px, where.py);
    await page.waitForTimeout(400);
    const popped = await page.evaluate(() => {
      const ctx = window.__theatre;
      const m = ctx.scene.getObjectByName('deck-out').children[10];
      m.updateMatrixWorld(true);
      const v = m.getWorldPosition(new ctx.THREE.Vector3());
      return { z: +v.z.toFixed(4), y: +v.y.toFixed(4), cursor: ctx.renderer.domElement.style.cursor };
    });
    await page.screenshot({ path: `${OUT}/hover.png`, timeout: 120000 });
    say(
      `look: the pointer on ${where.slug} — it comes UP the frame ${((where.before.z - popped.z) * 1000).toFixed(1)} mm and off the cloth ${((popped.y - where.before.y) * 1000).toFixed(1)} mm, cursor "${popped.cursor}"  → ${OUT}/hover.png`,
    );
    // THE TAP. It goes to the lens, and the placard names it.
    await page.mouse.click(where.px, where.py);
    await settle(page, AT_LENS, where.slug);
    const up = await page.evaluate(() => {
      const ctx = window.__theatre;
      const D = ctx.pieces.props.deck;
      const m = ctx.scene.getObjectByName('deck-out').children.find((c) => c.userData.slug === D.card);
      m.updateMatrixWorld(true);
      const v = m.getWorldPosition(new ctx.THREE.Vector3());
      const box = new ctx.THREE.Box3().setFromObject(m);
      const pts = [];
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const p = new ctx.THREE.Vector3(x, y, z).project(ctx.camera);
        pts.push([((p.x + 1) / 2) * window.innerWidth, ((1 - p.y) / 2) * window.innerHeight]);
      }
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const card = document.querySelector('#dialogue .card, #dialogue .placard, #dialogue');
      return {
        card: D.card,
        phase: D.phase,
        scale: +m.scale.x.toFixed(3),
        toLens: +v.distanceTo(ctx.camera.position).toFixed(3),
        w: Math.max(...xs) - Math.min(...xs),
        h: Math.max(...ys) - Math.min(...ys),
        placard: (card?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 90),
      };
    });
    await page.screenshot({ path: `${OUT}/insert.png`, timeout: 120000 });
    say(
      `look: the tap brings ${up.card} to the lens — ${up.toLens} m from it, at ${up.scale} (full size), ${up.w.toFixed(0)}x${up.h.toFixed(0)} px of a 1600x900 frame (${((up.h / 900) * 100).toFixed(0)}% of the short axis) · the placard reads "${up.placard}"  → ${OUT}/insert.png`,
    );
    // …and a second tap puts it back
    await page.mouse.click(where.px, where.py);
    await settle(page, AT_REST, where.slug);
    const back = await page.evaluate(() => {
      const ctx = window.__theatre;
      const m = ctx.scene.getObjectByName('deck-out').children[10];
      m.updateMatrixWorld(true);
      const v = m.getWorldPosition(new ctx.THREE.Vector3());
      return { card: ctx.pieces.props.deck.card, phase: ctx.pieces.props.deck.phase, z: +v.z.toFixed(4), scale: +m.scale.x.toFixed(3) };
    });
    say(`look: a second tap puts it back — card=${back.card}, phase ${back.phase}, at z ${back.z} and ${back.scale} of its size again${E(errors)}`);
  }
  await page.close();
}

// ── the geometry, measured ────────────────────────────────────────────────────────────────────
if (has('geom')) {
  for (const [w, h] of [[1600, 900], [390, 760]]) {
    const { page, errors } = await open(w, h, 'now=10:10&seed=1');
    await page.waitForTimeout(700);
    const g = await page.evaluate(() => {
      const ctx = window.__theatre;
      const D = ctx.pieces.props.deck;
      D.at(3.0);
      const P = D.poses, C = D.plan.card;
      const corners = (p) => {
        const s = Math.sin(p.phi), c = Math.cos(p.phi);
        const out = [];
        for (const a of [-1, 1]) for (const b of [-1, 1]) out.push([(p.r + (a * C.h) / 2) * s + ((b * C.w) / 2) * c, (p.r + (a * C.h) / 2) * c - ((b * C.w) / 2) * s]);
        return out;
      };
      let rim = 0, near = 9, far = -9, wide = 0;
      for (const p of P) for (const [x, z] of corners(p)) {
        rim = Math.max(rim, Math.hypot(x, z));
        near = Math.min(near, z);
        far = Math.max(far, z);
        wide = Math.max(wide, Math.abs(x));
      }
      // how much of a card its neighbour along the bow actually covers, and the bow behind it
      let worstAlong = 0, worstBow = 0;
      let i = 0;
      for (const n of D.plan.bows) {
        for (let j = 0; j + 1 < n; j++) {
          const d = Math.hypot(P[i + j + 1].x - P[i + j].x, P[i + j + 1].z - P[i + j].z);
          worstAlong = Math.max(worstAlong, 1 - Math.min(1, d / C.w));
        }
        i += n;
      }
      for (let k = 1; k < D.plan.radii.length; k++) worstBow = Math.max(worstBow, 1 - Math.min(1, (D.plan.radii[k] - D.plan.radii[k - 1]) / C.h));
      // …and what a card measures on the glass. The one on the frame's own axis, half way along
      // the first bow: a card at the end of a bow is turned 50 degrees and its projected box is a
      // diamond's, which says nothing about how big the picture on it is.
      const m = ctx.scene.getObjectByName('deck-out').children[Math.floor(D.plan.bows[0] / 2)];
      m.updateMatrixWorld(true);
      const box = new ctx.THREE.Box3().setFromObject(m);
      const pts = [];
      for (const x of [box.min.x, box.max.x]) for (const z of [box.min.z, box.max.z]) {
        const v = new ctx.THREE.Vector3(x, box.max.y, z).project(ctx.camera);
        pts.push([((v.x + 1) / 2) * window.innerWidth, ((1 - v.y) / 2) * window.innerHeight]);
      }
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      return {
        plan: D.plan.plan,
        bows: D.plan.bows,
        scale: +D.plan.scale.toFixed(3),
        card: [+(C.w * 1000).toFixed(1), +(C.h * 1000).toFixed(1)],
        rim: +rim.toFixed(4),
        z: [+near.toFixed(4), +far.toFixed(4)],
        wide: +wide.toFixed(4),
        along: +worstAlong.toFixed(3),
        bow: +worstBow.toFixed(3),
        px: [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)],
        count: D.poses.length,
      };
    });
    say(
      `geom ${w}x${h}: plan "${g.plan}" [${g.bows.join('+')}] = ${g.count} cards at ${g.scale} of size (${g.card[0]}x${g.card[1]} mm) · furthest corner r=${g.rim} (rim 0.620, limit 0.585) · z ${g.z[0]}..${g.z[1]} (the still life ends at −0.040) · |x| ≤ ${g.wide}`,
    );
    say(`geom ${w}x${h}: a card is covered by its neighbour along the bow by at most ${(g.along * 100).toFixed(0)}%, and by the bow in front of it by ${(g.bow * 100).toFixed(0)}% — the rule is a third · one card measures ${g.px[0].toFixed(0)}x${g.px[1].toFixed(0)} px${E(errors)}`);
    await page.close();
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

if (has('deck')) {
  const { page, errors } = await open(1600, 900, 'now=10:10&seed=1');
  await page.waitForTimeout(900);
  const before = await page.evaluate(SNAP);
  const homeBefore = await page.screenshot({ timeout: 120000 });
  writeFileSync(`${OUT}/home-before.png`, homeBefore);
  // THE CONTROL. The line is re-struck on every 12 fps drawing (BRIEF.md: "the line boils"), so two
  // frames of a room in which NOTHING happened do not match either. This is that pair, taken the
  // same way and about the same distance apart, and it is what the after/before number is read
  // against.
  await page.waitForTimeout(6000);
  const homeControl = await page.screenshot({ timeout: 120000 });
  const box = await page.evaluate(() => window.__theatre.pieces.props.deck.tapBox());
  await page.mouse.click(box.x + box.w / 2, box.y + box.h / 2);
  await settle(page, OPEN);
  await page.waitForTimeout(400);
  const out = await page.evaluate(COUNT);
  await page.screenshot({ path: `${OUT}/out.png`, timeout: 120000 });
  const during = await page.evaluate(SNAP);
  // the rake, from a click on the bare cloth at the top of the frame
  await page.mouse.click(800, 40);
  await settle(page, () => window.__theatre.pieces.props.deck.t > 0.55 || !window.__theatre.pieces.props.deck.out);
  const mid = { ...(await page.evaluate(() => ({ mode: window.__theatre.pieces.props.deck.mode, t: +window.__theatre.pieces.props.deck.t.toFixed(2) }))), ...(await page.evaluate(COUNT)) };
  await page.screenshot({ path: `${OUT}/gather-mid.png`, timeout: 120000 });
  await settle(page, SHUT);
  await page.waitForTimeout(500);
  const after = await page.evaluate(SNAP);
  const shut = { ...(await page.evaluate(() => ({ out: window.__theatre.pieces.props.deck.out, phase: window.__theatre.pieces.props.deck.phase, shot: window.__theatre.pieces.camera.current }))), ...(await page.evaluate(COUNT)) };
  await page.waitForTimeout(600);
  const homeAfter = await page.screenshot({ timeout: 120000 });
  writeFileSync(`${OUT}/home-after.png`, homeAfter);
  await page.close();

  say(`deck: laid out — ${out.drawn} cards drawn, ${out.faceUp} face up, ${out.unique} different  → ${OUT}/out.png`);
  say(`deck: the rake, read at ${mid.t}s (${mid.mode}) — ${mid.drawn} still on the cloth  → ${OUT}/gather-mid.png`);
  say(`deck: home again — out=${shut.out}, phase ${shut.phase}, camera on ${shut.shot}, ${shut.drawn} of this piece's cards left drawn`);
  const same = JSON.stringify(before) === JSON.stringify(after);
  say(`deck: every mesh, pose, scale, material and texture window of the deck identical before and after: ${same ? 'YES' : 'NO'} (${before.n} children before, ${after.n} after; ${during.n} while it was out)`);
  if (!same) {
    const a = before.children, b = after.children;
    for (let i = 0; i < Math.max(a.length, b.length); i++) if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) say(`  differs: ${JSON.stringify(a[i])}\n       vs: ${JSON.stringify(b[i])}`);
  }
  const raw = (b) => sharp(b).raw().toBuffer();
  const cmp = async (x, y) => {
    const a = await raw(x), b = await raw(y);
    let diff = 0, worst = 0;
    for (let i = 0; i < a.length; i++) {
      const d = Math.abs(a[i] - b[i]);
      if (d > 2) diff++;
      if (d > worst) worst = d;
    }
    return { pct: (diff / a.length) * 100, worst, n: a.length };
  };
  const ctrl = await cmp(homeBefore, homeControl);
  const run = await cmp(homeBefore, homeAfter);
  say(
    `deck: the home plate — after vs before ${run.pct.toFixed(3)}% of subpixels differ by more than 2/255 (worst ${run.worst}); the CONTROL pair, six seconds apart with nothing happening, differs by ${ctrl.pct.toFixed(3)}% (worst ${ctrl.worst}). The line boils: that is the whole of the difference${E(errors)}`,
  );
}

// ── the film's business wins ──────────────────────────────────────────────────────────────────
if (has('busy')) {
  const { page, errors } = await open(1600, 900, 'now=10:10&seed=1');
  await page.waitForTimeout(900);
  // a reading on the table: three cards face up, and they are not part of any of this
  await page.evaluate(async () => {
    await window.__theatre.pieces.reveal.setState('revealed');
    window.__theatre.pieces.flow.beat = 'reading';
  });
  await page.waitForTimeout(700);
  const READ = () => {
    const ctx = window.__theatre;
    return ctx.pieces.cards.drawn.children.map((m) => {
      m.updateMatrixWorld(true);
      return { name: m.name, p: m.position.toArray().map((v) => +v.toFixed(7)), q: m.quaternion.toArray().map((v) => +v.toFixed(7)), v: m.visible };
    });
  };
  const readBefore = await page.evaluate(READ);
  const refused = await page.evaluate(() => ({ idle: window.__theatre.pieces.props.deck.idle, opened: window.__theatre.pieces.props.deck.open(), out: window.__theatre.pieces.props.deck.out }));
  say(`busy: mid-reading (beat "reading", three cards face up) — idle=${refused.idle}, open() returned ${refused.opened}, out=${refused.out}`);
  // the beat lets go, and it opens
  await page.evaluate(() => (window.__theatre.pieces.flow.beat = 'talk'));
  await page.waitForTimeout(300);
  const now = await page.evaluate(() => ({ idle: window.__theatre.pieces.props.deck.idle, opened: window.__theatre.pieces.props.deck.open() }));
  await settle(page, OPEN);
  await page.waitForTimeout(400);
  const withRow = await page.evaluate(() => {
    const ctx = window.__theatre;
    const D = ctx.pieces.props.deck;
    const C = D.plan.card;
    // THE REAL CLEARANCE, and not a comparison of two z's: the bows curve round the reading, so a
    // laid card can lie further UP the frame than the row's furthest edge and still be a hand's
    // breadth to the side of it. Every laid card's footprint is separated from every reading card's
    // by the separating-axis test, and the smallest separation of all 234 pairs is the answer.
    const laid = D.poses.map((p) => {
      const s = Math.sin(p.phi), c = Math.cos(p.phi);
      const out = [];
      for (const [a, b] of [[-1, -1], [-1, 1], [1, 1], [1, -1]]) out.push([(p.r + (a * C.h) / 2) * s + ((b * C.w) / 2) * c, (p.r + (a * C.h) / 2) * c - ((b * C.w) / 2) * s]);
      return out;
    });
    const row = [];
    for (const m of ctx.pieces.cards.drawn.children) {
      m.updateMatrixWorld(true);
      m.geometry.computeBoundingBox();
      const bb = m.geometry.boundingBox;
      const q = [];
      for (const [sx, sz] of [[bb.min.x, bb.min.z], [bb.min.x, bb.max.z], [bb.max.x, bb.max.z], [bb.max.x, bb.min.z]]) {
        const v = new ctx.THREE.Vector3(sx, 0, sz);
        m.localToWorld(v);
        q.push([v.x, v.z]);
      }
      row.push(q);
    }
    // separation along the axes of both rectangles; negative means they overlap
    const sep = (A, B) => {
      let best = -1e9;
      for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
        const e = [P[(i + 1) % P.length][0] - P[i][0], P[(i + 1) % P.length][1] - P[i][1]];
        const n = [-e[1], e[0]];
        const L = Math.hypot(n[0], n[1]) || 1;
        const pa = A.map((p) => (p[0] * n[0] + p[1] * n[1]) / L), pb = B.map((p) => (p[0] * n[0] + p[1] * n[1]) / L);
        const d = Math.max(Math.min(...pb) - Math.max(...pa), Math.min(...pa) - Math.max(...pb));
        best = Math.max(best, d);
      }
      return best;
    };
    let gap = 9, pairs = 0, hit = 0;
    for (const a of laid) for (const b of row) {
      pairs++;
      const d = sep(a, b);
      if (d < 0) hit++;
      gap = Math.min(gap, d);
    }
    // and what a laid card measures on the glass, next to one of the reading's own
    const m0 = ctx.scene.getObjectByName('deck-out').children[Math.floor(D.plan.bows[0] / 2)];
    m0.updateMatrixWorld(true);
    const bx = new ctx.THREE.Box3().setFromObject(m0);
    const pts = [];
    for (const x of [bx.min.x, bx.max.x]) for (const z of [bx.min.z, bx.max.z]) {
      const v = new ctx.THREE.Vector3(x, bx.max.y, z).project(ctx.camera);
      pts.push([((v.x + 1) / 2) * window.innerWidth, ((1 - v.y) / 2) * window.innerHeight]);
    }
    return {
      plan: D.plan.plan,
      scale: +D.plan.scale.toFixed(3),
      pairs,
      hit,
      gap: +(gap * 1000).toFixed(1),
      px: [Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1]))],
    };
  });
  Object.assign(withRow, await page.evaluate(COUNT));
  await page.screenshot({ path: `${OUT}/with-reading.png`, timeout: 120000 });
  say(
    `busy: the beat lets go — idle=${now.idle}, open() ${now.opened} · plan "${withRow.plan}" at ${withRow.scale} (a laid card is ${withRow.px[0].toFixed(0)}x${withRow.px[1].toFixed(0)} px beside the reading's full-size three), ${withRow.faceUp} face up · of ${withRow.pairs} laid-card/reading-card pairs, ${withRow.hit} overlap and the closest approach is ${withRow.gap} mm  → ${OUT}/with-reading.png`,
  );
  // THE DRAW INTENT. flow reports it before it touches the deck; the rake starts on it.
  await page.evaluate(() => (window.__theatre.pieces.flow.intent = 'draw'));
  await settle(page, () => window.__theatre.pieces.props.deck.mode !== 'open');
  const raking = await page.evaluate(() => ({ mode: window.__theatre.pieces.props.deck.mode, phase: window.__theatre.pieces.props.deck.phase }));
  await settle(page, SHUT);
  await page.waitForTimeout(400);
  const done = { ...(await page.evaluate(() => ({ out: window.__theatre.pieces.props.deck.out }))), ...(await page.evaluate(COUNT)) };
  const readAfter = await page.evaluate(READ);
  const untouched = JSON.stringify(readBefore) === JSON.stringify(readAfter);
  say(`busy: a draw intent — the deck went to "${raking.mode}" (${raking.phase}) at once and was home ${done.out ? 'NO' : 'YES'} (${done.drawn} cards left drawn) before the wash could want the table`);
  say(`busy: the reading's three cards — ${readBefore.length} face up, not one of them moved while the deck was out and raked home: ${untouched ? 'YES' : 'NO'}${E(errors)}`);
  await page.close();
}

// ── a phone ───────────────────────────────────────────────────────────────────────────────────
if (has('phone')) {
  const { page, errors } = await open(390, 760, 'now=10:10&seed=1');
  await page.waitForTimeout(900);
  const box = await page.evaluate(() => window.__theatre.pieces.props.deck.tapBox());
  const on = box && box.x > -10 && box.x + box.w < 400;
  if (on) await page.mouse.click(box.x + box.w / 2, box.y + box.h / 2);
  else await page.evaluate(() => window.__theatre.pieces.props.deck.open());
  await settle(page, OPEN);
  await page.waitForTimeout(400);
  const st = await page.evaluate(() => {
    const ctx = window.__theatre;
    const D = ctx.pieces.props.deck;
    const g = ctx.scene.getObjectByName('deck-out');
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const m of g.children) {
      if (!m.visible) continue;
      const b = new ctx.THREE.Box3().setFromObject(m);
      for (const x of [b.min.x, b.max.x]) for (const z of [b.min.z, b.max.z]) {
        const v = new ctx.THREE.Vector3(x, b.max.y, z).project(ctx.camera);
        const px = ((v.x + 1) / 2) * window.innerWidth, py = ((1 - v.y) / 2) * window.innerHeight;
        x0 = Math.min(x0, px);
        x1 = Math.max(x1, px);
        y0 = Math.min(y0, py);
        y1 = Math.max(y1, py);
      }
    }
    const m0 = g.children[Math.floor(D.plan.bows[0] / 2)]; // on the frame's axis, not turned
    const b0 = new ctx.THREE.Box3().setFromObject(m0);
    const p = [];
    for (const x of [b0.min.x, b0.max.x]) for (const z of [b0.min.z, b0.max.z]) {
      const v = new ctx.THREE.Vector3(x, b0.max.y, z).project(ctx.camera);
      p.push([((v.x + 1) / 2) * window.innerWidth, ((1 - v.y) / 2) * window.innerHeight]);
    }
    return {
      plan: D.plan.plan,
      bows: D.plan.bows,
      scale: +D.plan.scale.toFixed(3),
      box: [x0, y0, x1 - x0, y1 - y0],
      card: [Math.max(...p.map((q) => q[0])) - Math.min(...p.map((q) => q[0])), Math.max(...p.map((q) => q[1])) - Math.min(...p.map((q) => q[1]))],
    };
  });
  Object.assign(st, await page.evaluate(COUNT));
  await page.screenshot({ path: `${OUT}/phone.png`, timeout: 120000 });
  say(
    `phone 390x760: the deck's square ${on ? 'is on the glass and was clicked' : 'is outside the frame; open() was called'} · plan "${st.plan}" [${st.bows.join('+')}] at ${st.scale} · ${st.faceUp} face up`,
  );
  say(
    `phone 390x760: the lay-out fills ${st.box[2].toFixed(0)}x${st.box[3].toFixed(0)} px at (${st.box[0].toFixed(0)}, ${st.box[1].toFixed(0)}) — ${((st.box[2] / 390) * 100).toFixed(0)}% of the width and ${((st.box[3] / 760) * 100).toFixed(0)}% of the height, nothing clipped=${st.box[0] > -1 && st.box[0] + st.box[2] < 391 && st.box[1] > -1 && st.box[1] + st.box[3] < 761} · one card is ${st.card[0].toFixed(0)}x${st.card[1].toFixed(0)} px  → ${OUT}/phone.png`,
  );
  // and a tap on one still brings it to the lens at full size, which is where a card is read
  const tap = await page.evaluate(() => {
    const ctx = window.__theatre;
    const m = ctx.scene.getObjectByName('deck-out').children[13]; // Death
    const v = m.getWorldPosition(new ctx.THREE.Vector3()).project(ctx.camera);
    return { px: ((v.x + 1) / 2) * window.innerWidth, py: ((1 - v.y) / 2) * window.innerHeight };
  });
  await page.mouse.click(tap.px, tap.py);
  await settle(page, AT_LENS, 'death');
  const ins = await page.evaluate(() => {
    const ctx = window.__theatre;
    const m = ctx.scene.getObjectByName('deck-out').children[13];
    const b = new ctx.THREE.Box3().setFromObject(m);
    const p = [];
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
      const v = new ctx.THREE.Vector3(x, y, z).project(ctx.camera);
      p.push([((v.x + 1) / 2) * window.innerWidth, ((1 - v.y) / 2) * window.innerHeight]);
    }
    return {
      card: ctx.pieces.props.deck.card,
      w: Math.max(...p.map((q) => q[0])) - Math.min(...p.map((q) => q[0])),
      h: Math.max(...p.map((q) => q[1])) - Math.min(...p.map((q) => q[1])),
      placard: (document.querySelector('#dialogue')?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
    };
  });
  await page.screenshot({ path: `${OUT}/phone-insert.png`, timeout: 120000 });
  say(
    `phone 390x760: a tap brings ${ins.card} to the lens at ${ins.w.toFixed(0)}x${ins.h.toFixed(0)} px — ${((ins.w / 390) * 100).toFixed(0)}% of the short axis · the placard reads "${ins.placard}"  → ${OUT}/phone-insert.png${E(errors)}`,
  );
  await page.close();
}

await browser.close();
writeFileSync(`${OUT}/proof.txt`, log.join('\n') + '\n');
console.log(`\n${OUT}/proof.txt`);
