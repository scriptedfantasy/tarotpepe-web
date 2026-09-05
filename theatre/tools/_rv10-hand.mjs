#!/usr/bin/env node
// reveal round 10: HIS HAND, THROUGH THE CHOOSING BEAT. The camera builder measured the waiting
// hand at 9.8 % of a 390x760 frame "at every stage"; round 10 takes it off the cloth while the
// visitor chooses and brings it back to carry the card. This walks the beat and reports, at each
// stage, what share of the frame the hand + sleeve cover (a raycast grid) and how far through its
// withdrawal the drawing is (0 = on the cloth, 3 = off the picture).
//   node tools/_rv10-hand.mjs [w] [h]
import { chromium } from 'playwright';

const W = +(process.argv[2] ?? 390), H = +(process.argv[3] ?? 760);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto(`http://127.0.0.1:5173/?view=reveal&state=fan`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
await page.waitForTimeout(1500);

await page.evaluate(() => {
  const T = window.__theatre, THREE = T.THREE;
  window.__handShare = () => {
    const rc = new THREE.Raycaster();
    const N = 40, M = 70;
    let hand = 0, lo = -1, hi = -1;
    for (let j = 0; j < M; j++) {
      let saw = false;
      for (let i = 0; i < N; i++) {
        rc.setFromCamera(new THREE.Vector2(((i + 0.5) / N) * 2 - 1, 1 - ((j + 0.5) / M) * 2), T.camera);
        // three.js raycasts through an invisible GROUP — only the mesh's own flag is checked — so
        // visibility is walked up the chain here, or a withdrawn hand is counted as if it were drawn
        const vis = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
        const hit = rc.intersectObjects(T.scene.children, true).filter((o) => o.object.type === 'Mesh' && vis(o.object))[0];
        if (!hit) continue;
        // his drawn hand is the reveal piece's own group, asked for by identity and not by name:
        // "arm" and "sleeve" also name parts of his puppet body, which is not what is being counted
        const G = T.pieces.reveal.hand.group;
        let mine = false;
        for (let p = hit.object; p; p = p.parent) if (p === G) { mine = true; break; }
        if (mine) { hand++; saw = true; }
      }
      if (saw) { if (lo < 0) lo = j; hi = j; }
    }
    const R = T.pieces.reveal;
    return { pct: +((100 * hand) / (N * M)).toFixed(1), band: lo < 0 ? null : [Math.round((100 * lo) / M), Math.round((100 * (hi + 1)) / M)], out: R.hand.out, shown: R.hand.shown, picks: R.picks.length };
  };
});
const say = async (tag) => {
  const r = await page.evaluate(() => window.__handShare());
  console.log(`${tag.padEnd(30)} hand+sleeve ${String(r.pct).padStart(5)}% of the frame  ${r.band ? `band y ${r.band[0]}%..${r.band[1]}%` : 'not in the picture'}   withdrawal ${r.out}/3  drawn=${r.shown}  picks ${r.picks}`);
};
await say('choosing, nothing picked');
// the take is a second and a bit; sample it right through and report the drawing that carries most
await page.evaluate(async () => { const f = window.__theatre.pieces.reveal._fan; window.__p = f.doPick(f.entries[f.keystoneIndex]); });
let best = null;
for (let k = 0; k < 12; k++) {
  const r = await page.evaluate(() => window.__handShare());
  if (!best || r.pct > best.pct) best = r;
  await page.waitForTimeout(140);
}
console.log(`${'the pick (his hand takes it)'.padEnd(30)} hand+sleeve ${String(best.pct).padStart(5)}% at its most  ${best.band ? `band y ${best.band[0]}%..${best.band[1]}%` : 'never in the picture'}`);
await page.evaluate(() => window.__p);
await page.waitForTimeout(2500);
await say('choosing again, one picked');
console.log(errs.length ? `PAGE ERRORS: ${errs.slice(0, 3).join(' | ')}` : 'no page errors');
await browser.close();
