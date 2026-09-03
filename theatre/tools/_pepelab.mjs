// Lab: open the pepe view, report the head's mesh bounds, and shoot custom camera angles.
//   node tools/_pepelab.mjs --out /abs/dir --cam front|side|top|three --dist 0.9 --headonly 1 --state default
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const outDir = args.out ?? '/tmp/pepelab';
mkdirSync(outDir, { recursive: true });
const cams = (args.cam ?? 'front').split(',');
const dist = +(args.dist ?? 1.0);
const headonly = args.headonly === '1';
const state = args.state ?? 'default';
const url = `http://127.0.0.1:5173/?view=pepe&state=${state}&shot=1&t=0.5`;

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
  else console.log('[page]', m.text());
});
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
const tStart = Date.now();
try {
  await page.waitForFunction(() => window.__theatreReady === true, { timeout: 90000 });
} catch (e) { console.log('not ready after', Date.now() - tStart, 'ms'); }
console.log('ready after', Date.now() - tStart, 'ms');

const info = await page.evaluate((headonly) => {
  const ctx = window.__theatre;
  const THREE = ctx.THREE;
  const pepe = ctx.pieces.pepe;
  const out = { meshes: [] };
  pepe.group.updateMatrixWorld(true);
  pepe.group.traverse((o) => {
    if (o.isMesh) {
      const b = new THREE.Box3().setFromObject(o);
      out.meshes.push({ name: o.name || o.parent?.name, min: b.min.toArray().map((v) => +v.toFixed(3)), max: b.max.toArray().map((v) => +v.toFixed(3)), verts: o.geometry.attributes.position.count });
    }
  });
  if (headonly) {
    for (const o of ctx.scene.children) if (o !== pepe.group) o.visible = o.name === 'lighting';
    pepe.group.children.forEach((c) => (c.visible = c === pepe.head));
  }
  return out;
}, headonly);
console.log(JSON.stringify(info, null, 1));

for (const c of cams) {
  try { await page.waitForFunction(() => window.__theatreReady === true, { timeout: 90000 }); } catch {}
  await page.evaluate(
    ({ c, dist }) => {
      const ctx = window.__theatre;
      const cam = ctx.camera;
      const p = ctx.layout.pepe;
      const cy = c.startsWith('body') ? 0.85 : p.headY;
      const cx = 0, cz = p.pos[2];
      if (c.startsWith('shot:')) { ctx.pieces.camera.cut(c.slice(5)); return; }
      const kind = c.replace('body', '') || 'front';
      if (kind === 'front') cam.position.set(cx, cy, cz + dist);
      else if (kind === 'side') cam.position.set(cx + dist, cy, cz);
      else if (kind === 'top') cam.position.set(cx, cy + dist, cz + 0.001);
      else if (kind === 'three') cam.position.set(cx + dist * 0.7, cy + dist * 0.25, cz + dist * 0.7);
      else if (kind === 'low') cam.position.set(cx, cy - dist * 0.3, cz + dist);
      cam.up.set(0, 1, 0);
      cam.lookAt(cx, cy, cz);
      cam.fov = 30;
      cam.updateProjectionMatrix();
      if (ctx.pieces.camera) ctx.pieces.camera.cut({ pos: cam.position.toArray(), look: [cx, cy, cz], fov: 30 });
    },
    { c, dist },
  );
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/${c}.png` });
  console.log('wrote', `${outDir}/${c}.png`);
}
await browser.close();
if (errors.length) console.error('PAGE ERRORS:\n' + errors.map((e) => ' - ' + e).join('\n'));
