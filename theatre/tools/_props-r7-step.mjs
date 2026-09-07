#!/usr/bin/env node
// scratch: prove the clock's minute hand STEPS through props.update() and does not glide.
// Watches the live page across a real minute boundary (75s), sampling the minute hand five times
// a second, and prints every distinct angle it visited with how long it was held.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e)));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERROR', m.text()); });
await page.goto('http://127.0.0.1:5173/?view=camera&state=home&shot=1', { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 60000 });
console.log('watching the dial for 75s...');
const samples = await page.evaluate(async () => {
  const props = window.__theatre.scene.getObjectByName('props');
  let clock = null;
  props.traverse((o) => { if (o.userData && o.userData.setTime) clock = o; });
  let minute = null;
  clock.traverse((o) => {
    const p = o.geometry && o.geometry.parameters;
    if (p && p.height !== undefined && p.height > 0.13 && p.width !== undefined && p.width < 0.02) minute = o;
  });
  const out = [];
  for (let i = 0; i < 375; i++) {
    const d = new Date();
    out.push([performance.now(), minute.rotation.z, `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`]);
    await new Promise((r) => setTimeout(r, 200));
  }
  return out;
});
const runs = [];
for (const [t, rz, wall] of samples) {
  const last = runs[runs.length - 1];
  if (last && Math.abs(last.rz - rz) < 1e-9) { last.until = t; last.to = wall; }
  else runs.push({ rz, from: t, until: t, wall, to: wall });
}
for (const r of runs) {
  const mins = (((-r.rz + 2 * Math.PI) % (2 * Math.PI)) / (Math.PI * 2)) * 60;
  console.log(`  rz=${r.rz.toFixed(4)} = ${mins.toFixed(2)} min   held ${((r.until - r.from) / 1000).toFixed(1)}s   wall ${r.wall} -> ${r.to}`);
}
console.log(`${runs.length} distinct positions in ${samples.length} samples — a hand that glided would show ~${samples.length}`);
await browser.close();
