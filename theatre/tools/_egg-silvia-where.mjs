#!/usr/bin/env node
// WHAT THE HOME PLATE CAN SEE OF THE STAGE-LEFT WALL, per window shape — which is the whole of the
// problem egg-silvia.js has on that wall and the reason this tool was rewritten when the board
// moved there off the back wall.
//
// The wall's plaster is the plane x = -2.6 and it runs in z. The camera stands inside the room, so
// the wall recedes to the LEFT EDGE of the frame as it comes downstage: past some z it is simply
// not in the picture, and where that z falls is decided by the window's ASPECT and nothing else.
// So this prints, for each shape:
//   · a map of the wall, z across and y up, with a letter for whatever stands in front of it;
//   · the CROP: the largest z still inside the frame, per height;
//   · the SCALE at a run of z: how many screen px a metre of wall is, along it and up it. Along it
//     is the foreshortened one and it is about two and a half times smaller, which is what every
//     card on that wall has to be drawn around;
//   · the boxes of the things nothing may cover: the switchboard, the shelf, the jars.
//
// AND, WITH `hinge` ON THE COMMAND LINE, THE OTHER MEASUREMENT THE EGG NEEDED: which edge of the
// frame to hinge the leaf on. It sweeps the swing for both edges and prints, per angle, the area
// of the leaf's FACE on the glass (negative when the leaf has turned far enough to show its back),
// the most upstage z of wall the open leaf stands in front of, and whether that reaches the
// switchboard. There is nothing to raycast: a leaf is a rectangle and its four corners project.
//
//   BASE=http://127.0.0.1:8734 node tools/_egg-silvia-where.mjs
//   BASE=http://127.0.0.1:8734 node tools/_egg-silvia-where.mjs hinge
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://127.0.0.1:8732';
const MODE = process.argv[2] ?? 'map';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const stub = (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}' });

const SHAPES = MODE === 'hinge' ? [[1600, 900], [1920, 1080]] : [[1280, 800], [1600, 900], [1920, 1080], [390, 844]];
const STATE = process.env.SILVIA_STATE ?? 'default';

// ---- the hinge sweep -----------------------------------------------------------------------------
if (MODE === 'hinge') {
  for (const [W, H] of SHAPES) {
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 200)));
    await page.route('**/@vite/client', stub);
    await page.goto(`${BASE}/?view=props&state=default&shot=1&bugs=0`, { waitUntil: 'load', timeout: 300000 });
    await page.waitForFunction('window.__theatreReady === true', null, { timeout: 300000 });
    const out = await page.evaluate(([W, H]) => {
      const t = window.__theatre;
      t.pieces.camera.cut('home');
      t.camera.updateMatrixWorld(true);
      t.scene.updateMatrixWorld(true);
      const THREE = t.THREE;
      const WALLX = -(t.layout?.room?.width ?? 5.2) / 2;
      const OFF = 0.035; // where the leaf's own plane stands off the plaster
      const FZ = 0.3, FY = 1.95, FW = 0.4, FH = 0.46;
      const cam = t.camera.position.clone();
      const proj = (x, y, z) => {
        const v = new THREE.Vector3(x, y, z).project(t.camera);
        return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
      };
      // the switchboard's box, and the leftmost (most downstage) screen column it occupies
      const sb = t.scene.getObjectByName('switchboard');
      const sbb = new THREE.Box3().setFromObject(sb);
      let sbX = Infinity, sbY0 = Infinity, sbY1 = -Infinity;
      for (const x of [sbb.min.x, sbb.max.x]) for (const y of [sbb.min.y, sbb.max.y]) for (const z of [sbb.min.z, sbb.max.z]) {
        const [a, b] = proj(x, y, z);
        sbX = Math.min(sbX, a); sbY0 = Math.min(sbY0, b); sbY1 = Math.max(sbY1, b);
      }
      const rows = [];
      for (const hinge of ['downstage', 'upstage']) {
        // the hinge line's z, and the sense the free edge travels in
        const zH = hinge === 'downstage' ? FZ + FW / 2 : FZ - FW / 2;
        const sgn = hinge === 'downstage' ? -1 : +1; // the free edge lies this way in z at rest
        for (const deg of [0, 18, 110, 120, 125, 130, 135, 140, 145, 148, 150, 152, 155, 158]) {
          const th = (deg * Math.PI) / 180;
          // the free edge, and the leaf's outward normal, in plan
          const ex = WALLX + OFF + FW * Math.sin(th), ez = zH + sgn * FW * Math.cos(th);
          const nx = Math.cos(th), nz = -sgn * Math.sin(th);
          // the face's area on the glass, signed: positive while the face is turned to the lens
          const c = [[WALLX + OFF, FY + FH / 2, zH], [ex, FY + FH / 2, ez], [ex, FY - FH / 2, ez], [WALLX + OFF, FY - FH / 2, zH]].map(([x, y, z]) => proj(x, y, z));
          let area = 0;
          for (let i = 0; i < 4; i++) { const a = c[i], b = c[(i + 1) % 4]; area += a[0] * b[1] - b[0] * a[1]; }
          area /= 2;
          // toward the lens or away from it: the outward normal against the line to the camera
          const toCam = new THREE.Vector3(cam.x - (WALLX + OFF + (ex - WALLX - OFF) / 2), 0, cam.z - (zH + (ez - zH) / 2)).normalize();
          const facing = nx * toCam.x + nz * toCam.z;
          // the most upstage wall z the leaf stands in front of: where the sight line through its
          // free edge meets the plaster
          const k = (WALLX - cam.x) / (ex - cam.x);
          const zw = cam.z + k * (ez - cam.z);
          const xs = c.map((p) => p[0]), ys = c.map((p) => p[1]);
          const maxX = Math.max(...xs);
          const covers = maxX > sbX && Math.max(...ys) > sbY0 && Math.min(...ys) < sbY1;
          rows.push({ hinge, deg, face: +Math.abs(area).toFixed(0), facing: +facing.toFixed(3), zw: +zw.toFixed(3), maxX: +maxX.toFixed(0), w: +(Math.max(...xs) - Math.min(...xs)).toFixed(0), covers, botY: +Math.max(...ys).toFixed(0) });
        }
      }
      // and where the leaf's bottom edge falls ON THE WALL: the leaf stands nearer the lens than
      // the plaster does, so it hangs lower on the glass than its own height on the wall would say,
      // and the board underneath has to start below THAT line, not below y 1.72.
      const wallY = [];
      for (let y = 1.80; y >= 1.58; y -= 0.02) wallY.push([+y.toFixed(2), +proj(WALLX + 0.012, y, -0.1)[1].toFixed(0)]);
      return { rows, wallY, sbX: +sbX.toFixed(0), sbY: [+sbY0.toFixed(0), +sbY1.toFixed(0)], cam: cam.toArray().map((v) => +v.toFixed(2)) };
    }, [W, H]);
    console.log(`\n===== hinge sweep, ${W}x${H} home (camera ${out.cam.join(', ')}) =====`);
    console.log(`the switchboard's leftmost screen column is x ${out.sbX}, over screen y ${out.sbY.join('..')}`);
    console.log('hinge      deg   face px2   facing   leaf px wide   max screen x   wall z it stands in front of   bottom screen y   covers the board');
    for (const r of out.rows) {
      console.log(`${r.hinge.padEnd(10)} ${String(r.deg).padStart(3)}   ${String(r.face).padStart(8)}   ${String(r.facing).padStart(6)}   ${String(r.w).padStart(12)}   ${String(r.maxX).padStart(12)}   ${String(r.zw).padStart(26)}   ${String(r.botY).padStart(15)}   ${r.covers ? 'YES' : '.'}`);
    }
    console.log('the wall at z -0.1, height -> screen y:', out.wallY.map(([y, p]) => `${y}->${p}`).join('  '));
    await page.close();
  }
  await browser.close();
  process.exit(0);
}

for (const [W, H] of SHAPES) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 200)));
  await page.route('**/@vite/client', stub);
  await page.goto(`${BASE}/?view=props&state=${STATE}&shot=1&bugs=0`, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 300000 });
  const m = await page.evaluate(([W, H]) => {
    const t = window.__theatre;
    t.pieces.camera.cut('home');
    t.camera.updateMatrixWorld(true);
    t.scene.updateMatrixWorld(true);
    const THREE = t.THREE;
    const WALLX = -(t.layout?.room?.width ?? 5.2) / 2;
    const ray = new THREE.Raycaster();
    const dir = new THREE.Vector3();
    const proj = (x, y, z) => {
      const v = new THREE.Vector3(x, y, z).project(t.camera);
      return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
    };
    const shown = (o) => { for (let q = o; q; q = q.parent) if (q.visible === false) return false; return true; };
    // what stands in front of the plaster at (y, z), if anything: the first letter of the nearest
    // named ancestor. '.' is bare wall in the picture, ' ' is wall outside the frame.
    const at = (y, z) => {
      const p = new THREE.Vector3(WALLX + 0.012, y, z);
      const [px, py] = proj(p.x, p.y, p.z);
      if (px < 0 || px > W || py < 0 || py > H) return ' ';
      dir.copy(p).sub(t.camera.position).normalize();
      ray.set(t.camera.position, dir);
      const d0 = t.camera.position.distanceTo(p);
      const hits = ray.intersectObjects(t.scene.children, true).filter((h) => h.distance < d0 - 0.004 && shown(h.object));
      if (!hits.length) return '.';
      let n = '';
      for (let q = hits[0].object; q; q = q.parent) if (q.name) { n = q.name; break; }
      return (n || hits[0].object.type).replace(/^room:/, '')[0].toUpperCase();
    };
    const zs = [];
    for (let z = -2.5; z <= 1.0001; z += 0.05) zs.push(+z.toFixed(2));
    const rows = [];
    for (let y = 2.6; y >= 0.95; y -= 0.05) {
      let line = y.toFixed(2) + ' ';
      for (const z of zs) line += at(+y.toFixed(2), z);
      rows.push(line);
    }
    // THE CROP: the largest z whose projection is still inside the frame, at a run of heights.
    const crop = [];
    for (const y of [2.5, 2.2, 1.95, 1.7, 1.4, 1.1]) {
      let last = null;
      for (let z = -2.5; z <= 1.5; z += 0.01) {
        const [px, py] = proj(WALLX + 0.012, y, z);
        if (px >= 0 && px <= W && py >= 0 && py <= H) last = +z.toFixed(2);
      }
      crop.push([y, last]);
    }
    // THE SCALE, along the wall and up it, at a run of z — measured over a 0.1 m span each way.
    const scale = [];
    for (const z of [-2.0, -1.5, -1.0, -0.6, -0.35, -0.1, 0.1, 0.3, 0.5, 0.7]) {
      const a = proj(WALLX + 0.012, 1.95, z - 0.05), b = proj(WALLX + 0.012, 1.95, z + 0.05);
      const c = proj(WALLX + 0.012, 1.9, z), d = proj(WALLX + 0.012, 2.0, z);
      scale.push({ z, along: +(Math.hypot(b[0] - a[0], b[1] - a[1]) * 10).toFixed(1), up: +(Math.hypot(d[0] - c[0], d[1] - c[1]) * 10).toFixed(1), x: +proj(WALLX + 0.012, 1.95, z)[0].toFixed(0) });
    }
    const boxOf = (obj) => {
      if (!obj) return null;
      const b = new THREE.Box3().setFromObject(obj);
      const xs = [], py = [];
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
        const [a, c] = proj(x, y, z);
        xs.push(a); py.push(c);
      }
      return { px: { x: +Math.min(...xs).toFixed(0), y: +Math.min(...py).toFixed(0), w: +(Math.max(...xs) - Math.min(...xs)).toFixed(0), h: +(Math.max(...py) - Math.min(...py)).toFixed(0) }, world: { min: b.min.toArray().map((v) => +v.toFixed(3)), max: b.max.toArray().map((v) => +v.toFixed(3)) } };
    };
    const S = t.scene.getObjectByName('props');
    const sb = t.scene.getObjectByName('switchboard');
    const shelf = sb ? null : null;
    // the shelf of jars: the wallShelf is unnamed, so it is found by where it stands
    let shelfObj = null;
    S?.traverse?.((o) => {
      if (shelfObj || !o.isMesh) return;
      const p = new THREE.Vector3();
      o.getWorldPosition(p);
      if (p.x < WALLX + 0.25 && p.z < -2.0 && p.z > -2.6 && p.y > 1.2 && p.y < 1.5) shelfObj = o.parent;
    });
    return {
      camera: t.camera.position.toArray().map((v) => +v.toFixed(3)),
      wallX: WALLX,
      zs, rows, crop, scale,
      switchboard: boxOf(sb),
      shelf: boxOf(shelfObj),
      silvia: t.pieces.props?.silvia?.hitBox?.() ?? null,
    };
  }, [W, H]);
  console.log(`\n===== ${W}x${H} home  (camera ${m.camera.join(', ')}, wall x ${m.wallX}) =====`);
  let head = '     ';
  for (const z of m.zs) head += Math.abs(z * 100) % 50 < 1 ? '|' : ' ';
  console.log(head + '   (| at every half metre of z, from -2.50 at the left to 1.00 at the right)');
  for (const r of m.rows) console.log(r);
  console.log('crop  (the largest z still in the frame, per height):', m.crop.map(([y, z]) => `${y}->${z}`).join('  '));
  console.log('scale (px per metre; `along` is the raked one, `up` is not, `x` is the screen x at y 1.95):');
  for (const s of m.scale) console.log(`   z ${String(s.z).padStart(5)}   along ${String(s.along).padStart(5)}   up ${String(s.up).padStart(5)}   x ${String(s.x).padStart(5)}`);
  console.log('switchboard', JSON.stringify(m.switchboard));
  console.log('shelf      ', JSON.stringify(m.shelf));
  console.log('silvia leaf', JSON.stringify(m.silvia));
  await page.close();
}
await browser.close();
