// r8 scratch: is the watering can in the scene at all, and where? Dumps the arrival group's
// children with their visibility, world position and material state, plus any page error.
import { chromium } from 'playwright';

const STATE = process.argv[2] ?? 'water';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e)));
page.on('console', (m) => {
  const t = m.text();
  if (/error|failed|warn/i.test(t)) console.log('LOG', t);
});
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }));
await page.goto(`http://127.0.0.1:5173/?view=pepe&state=${STATE}&shot=1`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });

const out = await page.evaluate(() => {
  const T = window.__theatre;
  const g = T.scene.getObjectByName('pepeArrive');
  const pepe = T.pieces.pepe;
  const rows = [];
  if (g)
    g.children.forEach((c) => {
      const p = c.getWorldPosition(new T.THREE.Vector3());
      rows.push({
        n: c.name,
        vis: c.visible,
        pos: p.toArray().map((v) => +v.toFixed(3)),
        sx: c.scale.x,
        rz: +c.rotation.z.toFixed(3),
        map: !!c.material?.map,
        mapImg: c.material?.map?.image ? `${c.material.map.image.width}x${c.material.map.image.height}` : null,
        tris: c.geometry?.index ? c.geometry.index.count / 3 : 0,
      });
    });
  const A = pepe?.arrival;
  return {
    hasGroup: !!g,
    groupVisible: g?.visible,
    rows,
    beats: A ? A.beats.map((b) => ({ p: b.plate, at: b.at, hold: b.hold, x: +b.x.toFixed(3), can: b.can })) : null,
    frames: A?.frames,
    canFloor: A?.canFloor,
    plateNames: A ? Object.keys(A.plates) : null,
    handsOffer: A ? null : null,
    seatedVisible: pepe?.parts?.torso?.visible,
    phases: T.pieces.pepeAnim?.arrivePhases,
    seconds: T.pieces.pepeAnim?.arriveSeconds,
    canProbe: (() => {
      const c = T.scene.getObjectByName('pepeArrive')?.children.find((k) => k.name === 'wateringCan');
      if (!c) return null;
      const img = c.material.map?.image;
      if (!img) return 'no image';
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
      const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, img.width, img.height).data;
      let a0 = 0, aHi = 0, dark = 0;
      for (let i = 0; i < d.length; i += 4) { if (d[i+3] > 128) { aHi++; if (d[i] < 80) dark++; } else a0++; }
      return { aHi, a0, dark, w: img.width, h: img.height, url: cv.toDataURL('image/png') };
    })(),
  };
});
const fsx = await import('node:fs');
if (out.canProbe?.url) { fsx.writeFileSync('/private/tmp/claude-501/-Users-workbook2024-Development-tarotpepe/cc57e9bc-ec5d-43c5-990a-77e7f38339a7/scratchpad/canvas-can.png', Buffer.from(out.canProbe.url.split(',')[1], 'base64')); delete out.canProbe.url; }
console.log(JSON.stringify(out.canProbe, null, 1));
await browser.close();
