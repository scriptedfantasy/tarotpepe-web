// r8: does he walk through anything? Every beat of the arrival, against every object in the room.
//
// The figure is a flat card, so its swept volume is a slab: the plate's own world extents in x and
// y at the station the exposure sheet puts it, and 4 cm of thickness about the walking plane. Every
// prop, room part, table part and the bench is taken as its world AABB. For each pair the tool
// prints the SIGNED GAP — the smallest distance you would have to move them apart, or (negative)
// the depth they overlap by — and the axis it is measured on. Anything at or below zero is the
// figure standing inside the furniture.
//
//   node tools/_p8-sweep.mjs [w] [h]
import { chromium } from 'playwright';

const W = +(process.argv[2] ?? 1600), H = +(process.argv[3] ?? 900);
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=pepe&state=cross&shot=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });

const out = await page.evaluate(() => {
  const T = window.__theatre;
  const THREE = T.THREE;
  const A = T.pieces.pepe.arrival;
  const M = A.plates;
  // the plate's own world box, from the mesh's geometry (it is built about the station pin)
  const plateBox = {};
  for (const [name, mesh] of Object.entries(M)) {
    mesh.geometry.computeBoundingBox();
    const b = mesh.geometry.boundingBox;
    plateBox[name] = { x0: b.min.x, x1: b.max.x, y0: b.min.y, y1: b.max.y };
  }
  // everything in the room that is not him
  const boxes = [];
  const add = (label, obj) => {
    const b = new THREE.Box3();
    obj.updateMatrixWorld(true);
    b.setFromObject(obj);
    if (!b.isEmpty()) boxes.push({ label, mn: b.min.toArray(), mx: b.max.toArray() });
  };
  for (const gname of ['props', 'room', 'table']) {
    const g = T.scene.getObjectByName(gname);
    if (!g) continue;
    g.children.forEach((c, i) => add(`${gname}#${i} ${c.name || c.type}`, c));
  }
  const bench = T.scene.getObjectByName('bench') ?? T.pieces.pepe.parts.bench;
  if (bench) add('bench', bench);
  // the operator's position (the visitor's side of the table) is not an object: it is the camera's
  // own station in `wide`, and he must not walk through where the visitor is standing either
  const seats = [
    { label: 'visitor (wide camera station)', mn: [-0.3, 0, 3.4], mx: [0.3, 1.8, 4.0] },
    { label: 'seated station (layout.pepe)', mn: [-0.46, 0, -0.99], mx: [0.46, 1.4, -0.65] },
  ];
  return {
    plateBox,
    boxes,
    seats,
    beats: A.beats.map((b) => ({ plate: b.plate, x: b.x, z: b.z, at: b.at, hold: b.hold, mirror: !!b.mirror })),
    canFloor: A.canFloor,
    frames: A.frames,
  };
});
await browser.close();

// HE IS A FLAT CARD, so "walks through" has one meaning and only one: his z-plane lies inside an
// object's depth band AND his drawing overlaps that object in x and y. A prop whose depth band he
// never enters is behind him or in front of him — he passes it, which is what a stage is for. So
// each object gets the smaller of two numbers: how far his plane stayed out of its depth band, or,
// if it went in, how much of him is inside its x/y footprint (negative, in metres of overlap).
const TH = 0.02; // half the thickness given to a flat card
const SHELL = /room:(floor|ceiling|wall|sidewall|plaster|wainscot|trim|reveal|iron|metal|wood|dark|glass|shutter|cast)/;
const worst = new Map();
for (const b of out.beats) {
  const p = out.plateBox[b.plate];
  const sx = b.mirror ? -1 : 1;
  const x0 = b.x + Math.min(p.x0 * sx, p.x1 * sx), x1 = b.x + Math.max(p.x0 * sx, p.x1 * sx);
  for (const o of [...out.boxes, ...out.seats]) {
    if (SHELL.test(o.label)) continue; // the room's own shell: he is standing inside it by design
    if (o.mx[1] - o.mn[1] < 0.05 && o.mx[1] < 0.06) continue; // rugs and mats: he walks ON them
    const dz = Math.max(o.mn[2] - (b.z + TH), b.z - TH - o.mx[2]); // out of its depth band?
    let d, how;
    if (dz > 0) {
      d = dz;
      how = 'clear in z';
    } else {
      const ox = Math.min(x1, o.mx[0]) - Math.max(x0, o.mn[0]);
      const oy = Math.min(p.y1, o.mx[1]) - Math.max(Math.min(0, p.y0), o.mn[1]);
      d = ox > 0 && oy > 0 ? -Math.min(ox, oy) : Math.max(-ox, -oy);
      how = d < 0 ? `INSIDE, ${(-d).toFixed(3)} m of him` : 'clear in x/y';
    }
    const cur = worst.get(o.label);
    if (!cur || d < cur.d) worst.set(o.label, { d, how, beat: `${b.plate}@x=${b.x.toFixed(2)}` });
  }
}
const rows = [...worst.entries()].sort((a, b) => a[1].d - b[1].d);
console.log(`# the arrival is ${out.frames} clock steps (${(out.frames / 12).toFixed(2)} s), ${out.beats.length} held drawings`);
console.log(`# the can ends at x ${out.canFloor.x.toFixed(3)}  z ${out.canFloor.z.toFixed(3)}`);
console.log('\n# every object in the room against every beat of the walk (m; negative = he is in it)');
for (const [label, g] of rows) console.log(`${g.d >= 0 ? ' ' : '!'} ${g.d.toFixed(3)}  ${label.padEnd(28)} ${g.how.padEnd(24)} worst at ${g.beat}`);
const bad = rows.filter(([, g]) => g.d < 0);
console.log(bad.length ? `\n!! ${bad.length} object(s) he is inside` : '\nhe is inside nothing');
