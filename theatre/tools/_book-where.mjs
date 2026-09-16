#!/usr/bin/env node
// Every spine standing in the tall case, by title, with where it stands in world metres and what it
// measures. The titles are dealt by the case's own pen (props.js, ITS OWN PEN), so nothing upstream
// can say in advance which board a title landed on — this is how walk-book.js's four were chosen.
//   BASE=http://127.0.0.1:8739 node tools/_book-where.mjs
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const b = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto(`${BASE}/?shot=1`, { waitUntil: 'load', timeout: 300000 });
await p.waitForFunction('window.__theatreReady === true', null, { timeout: 300000 });
const rows = await p.evaluate(() => {
  const T = window.__theatre.pieces.props.tallCase;
  const THREE = window.__theatre.THREE;
  const V = new THREE.Vector3();
  return T.books
    .map((m) => {
      m.getWorldPosition(V);
      return { title: m.userData.title, dark: !!m.userData.dark, x: +V.x.toFixed(3), y: +V.y.toFixed(3), z: +V.z.toFixed(3), t: m.userData.size.t, h: m.userData.size.h };
    })
    .sort((a, c) => a.y - c.y || a.x - c.x);
});
let bay = null;
for (const r of rows) {
  const foot = +(r.y - r.h / 2).toFixed(2);
  if (foot !== bay) {
    bay = foot;
    console.log(`\n-- board at ${foot} m`);
  }
  console.log(`   ${r.title.padEnd(14)} x ${r.x.toFixed(3)}  spine ${(r.t * 1000).toFixed(0)} mm  height ${(r.h * 1000).toFixed(0)} mm  ${r.dark ? 'ink' : 'paper'}`);
}
console.log(`\n${rows.length} spines standing in the case`);
await b.close();
