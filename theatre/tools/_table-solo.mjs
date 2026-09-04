#!/usr/bin/env node
// throwaway: render JUST the table piece, from a named layout shot, with flat white light and no
// ink pass — so the cloth's drawing can be judged in perspective while another builder's file is
// mid-edit and the whole page will not boot.
//   node tools/_table-solo.mjs [shot=table] [out=/tmp/solo.png]
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const shot = process.argv[2] ?? 'table';
const out = process.argv[3] ?? '/tmp/solo.png';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 675 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => console.log('[page]', m.text()));
await page.route('http://127.0.0.1:5173/_solo', (route) =>
  route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset=utf-8><style>html,body{margin:0}canvas{display:block}</style><body></body>' }),
);
await page.goto('http://127.0.0.1:5173/_solo' + (process.env.CARDS ? '#cards' : ''));
const dataUrl = await page.evaluate(async (shotName) => {
  const THREE = await import('/node_modules/three/build/three.module.js');
  const { LAYOUT } = await import('/src/core/layout.js');
  const table = await import('/src/pieces/table.js');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f8f9f4');
  const t0 = performance.now();
  await table.build({ scene, layout: LAYOUT, clock: { t: 0, frame: 0 }, pieces: {}, assets: { texture: () => null } });
  const ms = Math.round(performance.now() - t0);
  if (location.hash === '#cards') {
    // stand-ins for the three slot cards and the 21-card fan, to check the cloth stays quiet under
    // them (geometry copied from layout.spread and reveal-fan.js FAN)
    const mat = new THREE.MeshBasicMaterial({ color: 0xd8d8d8 });
    const c = LAYOUT.spread.card;
    const geo = new THREE.PlaneGeometry(c.w, c.h);
    const put = (x, z, ry) => {
      const m = new THREE.Mesh(geo, mat);
      m.rotation.set(-Math.PI / 2, 0, 0);
      m.rotation.order = 'YXZ';
      m.rotation.y = ry;
      m.position.set(x, LAYOUT.spread.y + 0.004, z);
      scene.add(m);
    };
    for (const s of LAYOUT.spread.slots) put(s[0], s[2], 0);
    const FAN = { n: 21, zMid: 0.425, R: 0.94, A: 0.25, rake: 2.1 };
    for (let i = 0; i < FAN.n; i++) {
      const u = -1 + (2 * i) / (FAN.n - 1), th = u * FAN.A;
      put(FAN.R * Math.sin(th), FAN.zMid - FAN.R + FAN.R * Math.cos(th), -th * FAN.rake);
    }
  }
  scene.add(new THREE.AmbientLight(0xffffff, 2.0));
  const d = new THREE.DirectionalLight(0xffffff, 1.2);
  d.position.set(0.6, 2, 1.4);
  scene.add(d);
  const s = LAYOUT.shots[shotName];
  const cam = new THREE.PerspectiveCamera(s.fov, 1200 / 675, 0.05, 40);
  cam.position.set(...s.pos);
  if (s.up) cam.up.set(...s.up);
  cam.lookAt(...s.look);
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 675;
  document.body.appendChild(canvas);
  const r = new THREE.WebGLRenderer({ canvas, antialias: true });
  r.setSize(1200, 675, false);
  r.render(scene, cam);
  console.log('build', ms);
  return canvas.toDataURL('image/png');
}, shot);
writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
console.log('wrote', out);
if (errors.length) console.log('ERRORS', errors);
await browser.close();
