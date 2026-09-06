#!/usr/bin/env node
// reveal round 11: DOES THE SMOOSH ACTUALLY MIX THE DECK, AND WHAT DO TWO ARMS COST THE FRAME?
// Nothing here is eyeballed. It drives the shuffle take one drawing at a time — the same array the
// film plays — and reads the live meshes.
//
//   the raft        its box on the cloth, its rim margin, how many of the 78 the top layer shows
//   the mixing      how far a card travels in the swirl, and what the deck's order does:
//                     · mean |Δrank| over the 78 (a uniform shuffle is 26.0)
//                     · NEIGHBOURS SURVIVING — of the 77 pairs adjacent in the old deck, how many
//                       are still adjacent in the new one. This is the test that matters: a deck
//                       merely REVERSED scores 77 here and a perfect 26.0 on |Δrank|, so |Δrank|
//                       alone cannot tell a shuffle from turning the pile over. Random ≈ 2.
//                     · where the card that started in the middle of the deck ends up
//   the arms        a 48x84 raycast grid over the frame: what share of the picture his two hands
//                   and sleeves own, at the drawing where they own the most
//
//   node tools/_rv11-mix.mjs [w] [h]
import { chromium } from 'playwright';

const W = +(process.argv[2] ?? 1600), H = +(process.argv[3] ?? 900);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=reveal&state=shuffle&shot=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
await page.waitForTimeout(1200);

const out = await page.evaluate(() => {
  const T = window.__theatre, THREE = T.THREE;
  const R = T.pieces.reveal;
  const sh = R._shuffle;
  if (!sh) return { err: 'no shuffle take' };
  const N = sh.meshes.length;
  const frames = sh.frames;
  const Y = T.layout.spread.y;
  const card = T.layout.spread.card;
  const draw = (k) => {
    R.hand.begin();
    frames[Math.min(k, frames.length - 1)]();
    R.hand.end();
  };
  const posOf = () => sh.meshes.map((m) => ({ x: m.position.x, z: m.position.z, y: m.position.y, a: -m.rotation.y, v: m.visible }));

  // ---- the raft, at the drawing the wash finishes on and again at the end of the swirl --------
  const boxAt = (k) => {
    draw(k);
    const p = posOf();
    let x = 0, z0 = 9, z1 = -9, r = 0, n = 0;
    const quads = [];
    for (const c of p) {
      if (!c.v) continue;
      n++;
      const s = Math.sin(c.a), co = Math.cos(c.a), q = [];
      for (const a of [-1, 1]) for (const b of [-1, 1]) q.push([c.x + (a * card.h * s + b * card.w * co) / 2, c.z + (a * card.h * co - b * card.w * s) / 2]);
      quads.push({ q: [q[0], q[1], q[3], q[2]], y: c.y });
      for (const g of q) {
        x = Math.max(x, Math.abs(g[0]));
        z0 = Math.min(z0, g[1]);
        z1 = Math.max(z1, g[1]);
        r = Math.max(r, Math.hypot(g[0], g[1]));
      }
    }
    // how many of the seventy-eight the top layer actually shows: sample the cloth on a 3 mm grid
    const inside = (q, px, pz) => {
      let s = false;
      for (let i = 0, k2 = q.length - 1; i < q.length; k2 = i++) if ((q[i][1] > pz) !== (q[k2][1] > pz) && px < ((q[k2][0] - q[i][0]) * (pz - q[i][1])) / (q[k2][1] - q[i][1]) + q[i][0]) s = !s;
      return s;
    };
    const seen = new Set();
    const G = 0.006;
    let cover = 0;
    for (let gx = -0.45; gx <= 0.45; gx += G)
      for (let gz = 0.0; gz <= 0.62; gz += G) {
        let top = -1, ty = -9;
        for (let i = 0; i < quads.length; i++) if (quads[i].y > ty && inside(quads[i].q, gx, gz)) { ty = quads[i].y; top = i; }
        if (top >= 0) { seen.add(top); cover++; }
      }
    return { n, x: +x.toFixed(4), z0: +z0.toFixed(4), z1: +z1.toFixed(4), rim: +((0.62 - r) * 1000).toFixed(1), showing: seen.size, area: +(cover * G * G).toFixed(4) };
  };
  const marks = sh.marks;
  const washed = boxAt(marks.washed);
  const afterWash = posOf().map((c) => ({ x: c.x, z: c.z }));
  const swirled = boxAt(marks.swirled);
  const afterSwirl = posOf().map((c) => ({ x: c.x, z: c.z }));

  // ---- how far each card travelled in the swirl ------------------------------------------------
  const moved = afterWash.map((a, i) => Math.hypot(a.x - afterSwirl[i].x, a.z - afterSwirl[i].z));
  const sorted = moved.slice().sort((a, b) => a - b);
  const mean = moved.reduce((s, v) => s + v, 0) / N;

  // ---- the permutation -------------------------------------------------------------------------
  const order = sh.order(); // the new deck, bottom to top, in terms of where each card started
  const at = new Array(N);
  order.forEach((old, nu) => { at[old] = nu; });
  const dr = at.map((nu, old) => Math.abs(nu - old));
  const meanRank = dr.reduce((s, v) => s + v, 0) / N;
  let neighbours = 0;
  for (let i = 0; i + 1 < N; i++) if (Math.abs(at[i] - at[i + 1]) === 1) neighbours++;
  const stuck = dr.filter((v) => v <= 3).length; // cards within three of where they started
  const mid = Math.floor(N / 2);
  // and the card that starts in the MIDDLE OF THE RAFT: how far it is from there at the end
  let cIdx = 0, cD = 9;
  afterWash.forEach((p, i) => {
    const d = Math.hypot(p.x, p.z - (afterWash.reduce((s, q) => s + q.z, 0) / N));
    if (d < cD) { cD = d; cIdx = i; }
  });
  const centre = { i: cIdx, moved: +(Math.hypot(afterWash[cIdx].x - afterSwirl[cIdx].x, afterWash[cIdx].z - afterSwirl[cIdx].z) * 1000).toFixed(0), rank: [cIdx, at[cIdx]] };

  // ---- what the two arms own of the picture ----------------------------------------------------
  const cam = T.camera;
  const rc = new THREE.Raycaster();
  const NX = 32, NY = 56;
  const shares = [];
  // the drawings the two hands are furthest apart on, plus a few round the beat
  const probe = [1, marks.washed, marks.washed + 3, marks.washed + 9, marks.swirled, marks.swirled + 4, marks.raked + 1];
  for (const k of probe) {
    draw(k);
    const tally = {};
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        rc.setFromCamera(new THREE.Vector2(((i + 0.5) / NX) * 2 - 1, 1 - ((j + 0.5) / NY) * 2), cam);
        const hit = rc.intersectObjects(T.scene.children, true).filter((o) => o.object.visible && o.object.type === 'Mesh')[0];
        const nm = hit ? (() => { for (let p = hit.object; p; p = p.parent) if (p.name) return p.name; return hit.object.type; })() : 'nothing';
        const key = /^reveal-hand/.test(nm) ? 'hands' : /^smoosh/.test(nm) ? 'cards' : /cloth|table/.test(nm) ? 'cloth' : /deck|card-/.test(nm) ? 'deck' : 'other';
        tally[key] = (tally[key] ?? 0) + 1;
      }
    const T2 = NX * NY;
    shares.push({ k, hands: +((100 * (tally.hands ?? 0)) / T2).toFixed(1), cards: +((100 * ((tally.cards ?? 0) + (tally.deck ?? 0))) / T2).toFixed(1), cloth: +((100 * (tally.cloth ?? 0)) / T2).toFixed(1) });
  }
  const worst = shares.reduce((a, b) => (b.hands > a.hands ? b : a));
  const meanHands = +(shares.reduce((s, v) => s + v.hands, 0) / shares.length).toFixed(1);
  draw(0);
  return {
    frames: frames.length,
    seconds: +(frames.length / 12).toFixed(2),
    marks,
    raft: { washed, swirled },
    swirl: { mean: +(mean * 1000).toFixed(1), median: +(sorted[Math.floor(N / 2)] * 1000).toFixed(1), min: +(sorted[0] * 1000).toFixed(1), max: +(sorted[N - 1] * 1000).toFixed(1), overCard: moved.filter((v) => v > card.w).length },
    perm: { meanRank: +meanRank.toFixed(1), neighbours, stuck, midWas: mid, midNow: at[mid], first: at[0], last: at[N - 1], centre },
    arms: { worst, mean: meanHands, shares },
  };
});

const j = JSON.stringify;
if (out.err) console.log('ERR', out.err);
else {
  console.log(`reveal/shuffle ${W}x${H}   ${out.frames} drawings = ${out.seconds}s   marks ${j(out.marks)}`);
  for (const [k, r] of Object.entries(out.raft))
    console.log(`  raft ${k.padEnd(8)} ${r.n} cards  |x| ${r.x}  z ${r.z0}..${r.z1}  rim margin ${r.rim} mm  covers ${r.area} m2  top layer shows ${r.showing}/78`);
  console.log(`  swirl travel: mean ${out.swirl.mean} mm, median ${out.swirl.median}, min ${out.swirl.min}, max ${out.swirl.max}; ${out.swirl.overCard}/78 moved more than a card's width`);
  console.log(`  deck order: mean |rank move| ${out.perm.meanRank} (uniform 26.0) · neighbours surviving ${out.perm.neighbours}/77 (random ~2, a reversal 77) · ${out.perm.stuck}/78 within 3 ranks of home (random ~7)`);
  console.log(`              card 39 (the deck's middle) → ${out.perm.midNow} · bottom → ${out.perm.first} · top → ${out.perm.last}`);
  console.log(`              the card lying in the MIDDLE of the raft (#${out.perm.centre.i}) travels ${out.perm.centre.moved} mm in the swirl; rank ${out.perm.centre.rank[0]} → ${out.perm.centre.rank[1]}`);
  console.log(`  his two hands + sleeves: worst ${out.arms.worst.hands}% of the frame (drawing ${out.arms.worst.k}), mean ${out.arms.mean}% over the beat`);
  console.log(`    ${out.arms.shares.map((s) => `d${s.k}:${s.hands}%`).join('  ')}`);
}
if (errs.length) console.log('PAGE ERRORS:', errs.slice(0, 4).join(' | '));
await browser.close();
