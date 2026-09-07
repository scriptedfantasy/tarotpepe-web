#!/usr/bin/env node
// scratch: prove the wall clock's hands point at the browser's own time.
// Reads the two hand meshes out of the live scene and turns their rotation.z back into a time,
// then compares that against the page's own `new Date()` (or the ?now= pin).
//   node tools/_props-r7-time.mjs [HH:MM ...]
import { chromium } from 'playwright';

const pins = process.argv.slice(2);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e)));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERROR', m.text()); });

const read = async (now) => {
  const u = new URL('http://127.0.0.1:5173/');
  u.searchParams.set('view', 'camera');
  u.searchParams.set('state', 'home');
  u.searchParams.set('shot', '1');
  if (now) u.searchParams.set('now', now);
  await page.goto(u.toString(), { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 60000 });
  await page.waitForTimeout(600);
  return page.evaluate(() => {
    const props = window.__theatre.scene.getObjectByName('props');
    // the clock is the group carrying the pendulum; its hands are the two thin boxes
    let clock = null;
    props.traverse((o) => { if (o.userData && o.userData.setTime) clock = o; });
    const boxes = [];
    clock.traverse((o) => {
      const p = o.geometry && o.geometry.parameters;
      if (p && p.width !== undefined && p.width < 0.02 && p.height > 0.05) boxes.push({ h: p.height, rz: o.rotation.z });
    });
    boxes.sort((a, b) => a.h - b.h); // hour hand is the shorter one
    const d = new Date();
    return { hour: boxes[0], minute: boxes[1], pageTime: `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`, worldTime: d.toString() };
  });
};

const norm = (a) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
for (const now of pins.length ? pins : [null]) {
  const r = await read(now);
  // rotation.z is the anti-clockwise angle from XII, so the dial angle is its negative
  const mAng = norm(-r.minute.rz), hAng = norm(-r.hour.rz);
  const mins = (mAng / (Math.PI * 2)) * 60;
  const hrs = (hAng / (Math.PI * 2)) * 12;
  const shown = `${String(Math.round(Math.floor(hrs + 1e-6)) || 12).padStart(2, '0')}:${String(Math.round(mins)).padStart(2, '0')}`;
  const expect = now ?? r.pageTime;
  const [eh, em] = expect.split(':').map(Number);
  const okM = Math.abs(mins - em) < 0.2;
  const okH = Math.abs(hrs - ((eh % 12) + em / 60)) < 0.02;
  console.log(
    `${now ? `pinned ${now}` : `live   ${r.pageTime}`}  ->  hands read ${shown}` +
      `   (minute rz=${r.minute.rz.toFixed(4)} = ${mins.toFixed(2)} min, hour rz=${r.hour.rz.toFixed(4)} = ${hrs.toFixed(3)} h)  ${okM && okH ? 'MATCH' : 'MISMATCH'}`,
  );
}
await browser.close();
