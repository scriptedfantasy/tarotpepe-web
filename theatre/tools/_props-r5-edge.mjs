// throwaway (props round 5): reads the RUG'S OWN SHEET in the page and reports, in metres and in
// room z, where the first printed mark is on the visitor's side — so "the field is plain out to
// here" is a measurement of the drawing and not of the arithmetic that made it.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto('http://127.0.0.1:5173/?view=props&state=default&shot=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 150000 });
const out = await page.evaluate(() => {
  const T = window.__theatre;
  let mesh = null;
  T.scene.traverse((o) => {
    if (mesh || !o.isMesh || !Array.isArray(o.material)) return;
    if (o.geometry?.parameters?.height === 0.012) mesh = o;
  });
  if (!mesh) return { err: 'no rug mesh' };
  const p = mesh.geometry.parameters;
  const map = mesh.material.find((m) => m.map)?.map;
  const img = map?.image;
  if (!img) return { err: 'no map' };
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  const dark = (x, y) => {
    const i = (y * c.width + x) * 4;
    return (d[i] + d[i + 1] + d[i + 2]) / 3 < 150;
  };
  // scan in from each edge along the middle of the sheet: the first row/column with any ink
  const rowInk = (y, x0 = 4, x1 = c.width - 4) => { for (let x = x0; x < x1; x += 2) if (dark(x, y)) return true; return false; };
  // the middle third only, so the SIDE borders do not make every row look inked
  const rowInkMid = (y) => rowInk(y, Math.floor(c.width / 3), Math.floor((2 * c.width) / 3));
  const colInk = (x) => { for (let y = 4; y < c.height - 4; y += 2) if (dark(x, y)) return true; return false; };
  let top = 0, bottom = 0, left = 0, right = 0;
  while (top < c.height / 2 && !rowInk(top)) top++;
  while (bottom < c.height / 2 && !rowInk(c.height - 1 - bottom)) bottom++;
  while (left < c.width / 2 && !colInk(left)) left++;
  while (right < c.width / 2 && !colInk(c.width - 1 - right)) right++;
  // walking IN from the near edge: the innermost printed row of the border — where the plain
  // field begins. Stops after 120 clear rows in a row (the field), so the medallion is not it.
  let lastInk = 0, run = 0;
  for (let k = 0; k < c.height / 2; k++) {
    if (rowInkMid(c.height - 1 - k)) { lastInk = k; run = 0; } else if (++run > 60) break;
  }
  const fieldFromEdge = lastInk;
  const world = mesh.getWorldPosition(new T.THREE.Vector3());
  const mPerPxZ = p.depth / c.height, mPerPxX = p.width / c.width;
  return {
    sheet: `${c.width}x${c.height}`, size: `${p.width} x ${p.depth}`,
    ppm: (c.width / p.width).toFixed(1),
    edgeToFirstMark_m: { near: (bottom * mPerPxZ).toFixed(3), far: (top * mPerPxZ).toFixed(3), side: (left * mPerPxX).toFixed(3) },
    rugZ: [(world.z - p.depth / 2).toFixed(3), (world.z + p.depth / 2).toFixed(3)],
    firstMarkZ: (world.z + p.depth / 2 - bottom * mPerPxZ).toFixed(3),
    borderDepth_m: (fieldFromEdge * mPerPxZ).toFixed(3),
    fieldBeginsZ: (world.z + p.depth / 2 - fieldFromEdge * mPerPxZ).toFixed(3),
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
