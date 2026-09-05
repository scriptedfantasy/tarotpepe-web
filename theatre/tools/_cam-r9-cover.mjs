// throwaway (camera round 9): WHAT IS IN THE PICTURE, by area. Raycasts a grid over the frame and
// buckets every hit by what it lands on — the spread, the reading row, bare cloth, his sleeve, the
// still life, the table's edge, the floor — so "two thirds of the frame is empty cloth" is a
// measurement and not an impression.
//   node tools/_cam-r9-cover.mjs [view] [state] [w] [h]
//   SHOT='{"pos":[…],"look":[…],"up":[…],"fov":n}' node tools/_cam-r9-cover.mjs …   (a candidate plate)
//   PICKS=2 …    lays that many cards in the reading row first (fakePicks + picks.length)
import { chromium } from 'playwright';

const view = process.argv[2] ?? 'reveal', state = process.argv[3] ?? 'fan';
const W = +(process.argv[4] ?? 390), H = +(process.argv[5] ?? 760);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto(`http://127.0.0.1:5173/?view=${view}&state=${state}&shot=1`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
await page.waitForTimeout(1200);

if (process.env.PICKS) {
  await page.evaluate((n) => {
    const R = window.__theatre.pieces.reveal;
    const f = R._fan;
    const idx = [f.keystoneIndex, f.keystoneIndex + 6, f.keystoneIndex - 6].slice(0, n);
    f.fakePicks(idx);
    for (let i = R.picks.length; i < n; i++) R.picks.push({ index: idx[i], ordinal: i + 1, slug: 'x', slot: i, mesh: null });
  }, +process.env.PICKS);
  await page.waitForTimeout(6000);
}
if (process.env.SHOT) {
  await page.evaluate((s) => {
    const T = window.__theatre, THREE = T.THREE, c = T.camera;
    c.position.fromArray(s.pos);
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3().fromArray(s.pos), new THREE.Vector3().fromArray(s.look), new THREE.Vector3().fromArray(s.up ?? [0, 1, 0]));
    c.quaternion.setFromRotationMatrix(m);
    c.up.set(0, 1, 0).applyQuaternion(c.quaternion);
    c.fov = s.fov;
    c.clearViewOffset?.();
    c.aspect = window.innerWidth / window.innerHeight;
    c.updateProjectionMatrix();
    c.updateMatrixWorld();
  }, JSON.parse(process.env.SHOT));
  await page.waitForTimeout(400);
}

const out = await page.evaluate(() => {
  const T = window.__theatre, THREE = T.THREE;
  const rc = new THREE.Raycaster();
  const N = 60, M = 90; // columns, rows
  const tally = {};
  const rows = [];
  const label = (o) => {
    const chain = [];
    for (let p = o; p; p = p.parent) if (p.name) chain.push(p.name);
    return chain[0] || o.type;
  };
  for (let j = 0; j < M; j++) {
    const yf = (j + 0.5) / M;
    const row = {};
    for (let i = 0; i < N; i++) {
      const xf = (i + 0.5) / N;
      rc.setFromCamera(new THREE.Vector2(xf * 2 - 1, 1 - yf * 2), T.camera);
      const hit = rc.intersectObjects(T.scene.children, true).filter((h) => h.object.visible && h.object.type === 'Mesh')[0];
      let k = hit ? label(hit.object) : 'nothing';
      if (hit && /^fan-card-/.test(k)) {
        const p = hit.object.position;
        if (Math.abs(p.x) < 0.29 && p.z > 0.02 && p.z < 0.27) k = 'row-card';
      }
      tally[k] = (tally[k] ?? 0) + 1;
      row[k] = (row[k] ?? 0) + 1;
    }
    rows.push(row);
  }
  const total = N * M;
  const bucket = (k) =>
    /^fan-card-/.test(k) ? 'SPREAD (78 cards)'
    : /^(row-card|card-)/.test(k) ? 'ROW (picked cards)'
    : /^reveal-hand/.test(k) ? 'HIS HAND + SLEEVE'
    : /cloth|table/.test(k) ? 'bare cloth / table'
    : /still-life|props|glass|ashtray|candle/.test(k) ? 'still life + props'
    : /bench|pepe/.test(k) ? 'bench / him'
    : /floor|rug|board/.test(k) ? 'FLOOR / RUG'
    : k;
  const buckets = {};
  for (const [k, v] of Object.entries(tally)) buckets[bucket(k)] = (buckets[bucket(k)] ?? 0) + v;
  const top = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
  // and where each thing's band is, in rows
  const band = (test) => {
    let lo = -1, hi = -1;
    rows.forEach((r, j) => {
      const n = Object.entries(r).reduce((s, [k, v]) => s + (test(k) ? v : 0), 0);
      if (n > 0) { if (lo < 0) lo = j; hi = j; }
    });
    return lo < 0 ? null : [lo / rows.length, (hi + 1) / rows.length];
  };
  return {
    total,
    tally: top.map(([k, v]) => [k, +((v / total) * 100).toFixed(1)]),
    bands: {
      cards: band((k) => /card|fan|spread/i.test(k)),
      sleeve: band((k) => /hand|arm|sleeve|pepe/i.test(k)),
      cloth: band((k) => /cloth|table/i.test(k)),
      floor: band((k) => /floor|rug|board/i.test(k)),
    },
  };
});
console.log(`${view}/${state} ${W}x${H}${process.env.PICKS ? ' picks=' + process.env.PICKS : ''}${process.env.SHOT ? ' (SHOT override)' : ''}`);
for (const [k, v] of out.tally) console.log(`  ${String(v).padStart(5)}%  ${k}`);
for (const [k, b] of Object.entries(out.bands)) if (b) console.log(`  band ${k}: y ${(b[0] * 100).toFixed(0)}%..${(b[1] * 100).toFixed(0)}%`);
await browser.close();
