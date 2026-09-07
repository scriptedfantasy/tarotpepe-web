#!/usr/bin/env node
// reveal round 13: WHERE HIS FINGERS LAND WHEN HE TAKES A CARD. The user, watching the picking
// hand: "right now it picks the middle of the card, which makes no sense". This measures the grip
// on the real page rather than taking the drawing's word for it:
//
//   · over ALL 78 cards of the wash — how far the nip of the pinch is from the middle of the card
//     it is taking (a corner is 131 mm out; the middle is 0), whether the corner it takes was
//     SHOWING while the mass was closed, and whether that corner is nearer his own shoulder than
//     the card's middle is (which is what says the arm never crosses the card's face);
//   · and on one card, played to the drawing where the fingers close: the chosen corner and the
//     card's middle projected to the screen, so the grip can be cropped at 4x and looked at.
//
//   node tools/_rv13-grip.mjs [width] [height] [--shot <abs.png>] [--crop <abs.png>]
import { chromium } from 'playwright';
import sharp from 'sharp';

const argv = process.argv.slice(2);
const num = argv.filter((a) => !a.startsWith('--') && Number.isFinite(Number(a)));
const W = +(num[0] ?? 1600), H = +(num[1] ?? 900);
const flag = (n) => {
  const i = argv.indexOf(n);
  return i < 0 ? null : argv[i + 1];
};
const shotPath = flag('--shot');
const cropPath = flag('--crop');

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
// `pick` and not `fan`: while the visitor is choosing, HIS HANDS ARE OFF THE CLOTH (round 10), so a
// probe that poses the hand in that state measures a drawing nobody is allowed to draw.
await page.goto(`http://127.0.0.1:5173/?view=reveal&state=pick`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
await page.waitForTimeout(1200);

const mm = (v) => `${(v * 1000).toFixed(1)} mm`;
const pct = (a, b) => `${((100 * a) / b).toFixed(1)} %`;

// ---- every card in the wash: which corner, and is it the one a person would take? -----------------
const all = await page.evaluate(() => {
  const F = window.__theatre.pieces.reveal._fan;
  const SH = 0.291, SZ = -0.82;
  // a card the looping take has already carried out of the mass is not lying in the wash any more:
  // its grip was chosen for where it LAY, and measuring it where it now flies compares two poses
  return F.entries.filter((e) => !e.flying && !e.removed).map((e) => {
    const i = e.i;
    const g = F.gripOf(i);
    const sx = g.side === 'L' ? -SH : SH;
    const d = (p) => Math.hypot(p[0] - sx, p[1] - SZ);
    // how far INTO the card the fingers are, along his own reach: 0 is the middle of the card and
    // negative is his own side of it. This is the drawing's rule, in one number.
    const mid = d(g.centre) || 1;
    const ux = (g.centre[0] - sx) / mid, uz = (g.centre[1] - SZ) / mid;
    const depth = (p) => (p[0] - g.centre[0]) * ux + (p[1] - g.centre[1]) * uz;
    return {
      depthNip: depth(g.nip),
      depthAll: g.corners.map(depth),
      i,
      side: g.side,
      buried: g.buried,
      chosenBuried: g.covered,
      // distances from the reaching shoulder, so "nearest to the hand" can be checked
      dCorner: d(g.corner),
      dCentre: d(g.centre),
      dAll: g.corners.map(d),
      // and how far out of the middle of the card the fingers actually are
      outNip: Math.hypot(g.nip[0] - g.centre[0], g.nip[1] - g.centre[1]),
      outCorner: Math.hypot(g.corner[0] - g.centre[0], g.corner[1] - g.centre[1]),
      // the take poses the hand off the ARITHMETIC (reveal-pick.js → cornerAt) and the ride off the
      // mesh's own matrix: this is the two answers compared, for a card lying where it lies
      lifted: !!e.lift,
      drift: Math.hypot(g.rest[0] - g.corner[0], g.rest[1] - g.corner[1]),
    };
  });
});

const n = all.length;
const bareAny = all.filter((c) => c.buried.some((b) => !b)).length;
const tookBare = all.filter((c) => !c.chosenBuried).length;
const tookBareWhenPossible = all.filter((c) => c.buried.some((b) => !b) && !c.chosenBuried).length;
const nearer = all.filter((c) => c.dCorner < c.dCentre).length;
const nearestOfAll = all.filter((c) => c.dCorner <= Math.min(...c.dAll) + 1e-9).length;
const outs = all.map((c) => c.outNip).sort((a, b) => a - b);

console.log(`cards                     ${n}`);
console.log(`nip out of the middle     min ${mm(outs[0])}  median ${mm(outs[n >> 1])}  max ${mm(outs[n - 1])}   (a corner is ${mm(all[0].outCorner)} out)`);
console.log(`corner nearer his shoulder than the card's middle   ${pct(nearer, n)} of cards`);
console.log(`…and it is the nearest of the four outright         ${pct(nearestOfAll, n)}`);
const depths = all.map((c) => c.depthNip).sort((a, b) => a - b);
const onHisSide = all.filter((c) => c.depthNip < 0).length;
console.log(`fingers on HIS SIDE of the card's middle line       ${pct(onHisSide, n)}   (deepest ${mm(depths[n - 1])}, median ${mm(depths[n >> 1])})`);
console.log(`corner was SHOWING while the mass was closed        ${pct(tookBare, n)}`);
console.log(`   cards with any bare corner ${pct(bareAny, n)}; of those, a bare one taken ${pct(tookBareWhenPossible, bareAny)}`);
const byCount = [0, 0, 0, 0, 0];
for (const c of all) byCount[c.buried.filter(Boolean).length]++;
console.log(`corners buried per card    ${byCount.map((v, k) => `${k}:${v}`).join('  ')}`);
const drift = Math.max(...all.filter((c) => !c.lifted).map((c) => c.drift));
console.log(`arithmetic vs the mesh's own matrix   worst ${mm(drift)} over ${all.filter((c) => !c.lifted).length} cards at rest`);

// ---- one card, played to the drawing where the fingers close --------------------------------------
const shot = await page.evaluate((k) => {
  const T = window.__theatre, R = T.pieces.reveal, F = R._fan;
  const i = F.middleIndex;
  R.stop(); // off the loop: this probe holds ONE drawing of the take
  F.liftIndex(i); // the pointer stands it up, which is the card the hand arrives at
  F.step();
  F.step();
  const e = F.entries[i];
  const frames = F.pickFrames(e, 0);
  for (let j = 0; j <= k; j++) frames[j](); // …played up to the drawing asked for
  const g = F.gripOf(i);
  const V3 = T.camera.position.constructor;
  const P = (x, z) => {
    const v = new V3(x, e.mesh.position.y, z).project(T.camera);
    return [Math.round(((v.x + 1) / 2) * window.innerWidth), Math.round(((1 - v.y) / 2) * window.innerHeight)];
  };
  const rig = T.scene.getObjectByName(g.side === 'L' ? 'reveal-hand-L' : 'reveal-hand');
  return {
    i,
    side: g.side,
    covered: g.covered,
    drawn: !!rig?.visible,
    // the drawing's own wrist, and how high the plate is riding: it must be drawn ON the card the
    // fingers are taking (which stands 20 mm proud of the cloth), never under it
    wrist: rig ? [+rig.position.x.toFixed(4), +rig.position.y.toFixed(4), +rig.position.z.toFixed(4)] : null,
    cardY: +e.mesh.position.y.toFixed(4),
    corner: P(g.corner[0], g.corner[1]),
    nip: P(g.nip[0], g.nip[1]),
    centre: P(g.centre[0], g.centre[1]),
    corners: g.corners.map((c) => P(c[0], c[1])),
  };
}, +(flag('--frame') ?? 2));
await page.waitForTimeout(400);
console.log(`\ncard ${shot.i}, ${shot.side} hand; the corner it takes was ${shot.covered ? 'BURIED' : 'showing'}; drawn ${shot.drawn}`);
console.log(`  corner on screen  ${shot.corner.join(', ')}   nip ${shot.nip.join(', ')}   middle ${shot.centre.join(', ')}`);
console.log(`  the four corners  ${shot.corners.map((c) => c.join(',')).join('   ')}`);
console.log(`  wrist ${shot.wrist?.join(', ')}   the card's own plane at y ${shot.cardY}`);

if (shotPath) {
  await page.screenshot({ path: shotPath });
  console.log('wrote', shotPath);
}
if (cropPath) {
  const buf = await page.screenshot();
  const S = 4, w = 300, h = 220;
  const cx = Math.round((shot.corner[0] + shot.centre[0]) / 2), cy = Math.round((shot.corner[1] + shot.centre[1]) / 2);
  const left = Math.max(0, Math.min(W - w, cx - w / 2)), top = Math.max(0, Math.min(H - h, cy - h / 2));
  await sharp(buf)
    .extract({ left: Math.round(left), top: Math.round(top), width: w, height: h })
    .resize(w * S, h * S, { kernel: 'nearest' })
    .png()
    .toFile(cropPath);
  console.log('wrote', cropPath, `${w}x${h} at ${S}x from ${Math.round(left)},${Math.round(top)}`);
}

await browser.close();
