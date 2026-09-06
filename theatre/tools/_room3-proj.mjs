#!/usr/bin/env node
// scratch (room round 3): where does a world point land in a plate?
//   node tools/_room3-proj.mjs <state> <w> <h> "x,y,z" "x,y,z" ...
// Prints pixel coordinates for each point in the live page's camera, so a crop can be aimed and a
// clearance (the ghost's top edge against the picture row) can be measured rather than guessed.
import { chromium } from 'playwright';

const [state = 'home', W = '1600', H = '900', ...pts] = process.argv.slice(2);
const points = pts.map((s) => s.split(',').map(Number));
const url = `http://127.0.0.1:5173/?view=camera&state=${state}&shot=1`;
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1 });
await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({accept(){},dispose(){},prune(){},on(){},send(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};' }));
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(1200);
const out = await page.evaluate((points) => {
  const ctx = window.__theatre;
  const cam = ctx.camera?.isCamera ? ctx.camera : ctx.pieces?.camera?.camera ?? ctx.cam ?? null;
  const c = cam || Object.values(ctx).find((v) => v && v.isPerspectiveCamera);
  if (!c) return { err: 'no camera', keys: Object.keys(ctx) };
  const el = document.querySelector('canvas');
  const w = el.clientWidth, h = el.clientHeight;
  c.updateMatrixWorld(true);
  const V = new (window.__theatre.THREE?.Vector3 ?? Object.getPrototypeOf(c.position).constructor)();
  return {
    w, h,
    pts: points.map((p) => {
      V.set(p[0], p[1], p[2]).project(c);
      return { p, x: Math.round(((V.x + 1) / 2) * w), y: Math.round(((1 - V.y) / 2) * h) };
    }),
  };
}, points);
console.log(JSON.stringify(out, null, 1));
await browser.close();
