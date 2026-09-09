#!/usr/bin/env node
// A LOOK AT THE FIRE, for the builder's own eyes: the home plate with the dozen alight, and a 2x
// crop of each of the three places they stand in (the lamp, a bookcase, the cloth's near edge).
//   BASE=http://127.0.0.1:8713/ node tools/_egg-fine-look.mjs [outdir]
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/';
const OUT = process.argv[2] ?? '/tmp/egg-fine';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const stub = (r) =>
  r.fulfill({
    contentType: 'application/javascript',
    body: 'export const createHotContext=()=>({on(){},off(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}',
  });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 300)));
await page.route('**/@vite/client', stub);
await page.goto(new URL('/?view=props&state=fine-burning&shot=1&t=2.5&now=21:12', BASE).toString(), { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
await page.evaluate(() => window.__theatre.pieces.camera.cut('home'));
await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
await page.evaluate(() => window.__theatre.camera.updateMatrixWorld(true));
await page.waitForTimeout(600);
const boxes = await page.evaluate(() => {
  const F = window.__theatre.pieces.props.fine;
  return { n: F.lit, boxes: Array.from({ length: F.count }, (_, i) => F.flameBox(i)), where: F.where, seats: F.seats, lamp: F.hitBox() };
});
console.log('lit', boxes.n, 'lamp', JSON.stringify(boxes.lamp));
boxes.boxes.forEach((b, i) => console.log(`  ${i} ${boxes.where[i].padEnd(6)} ${JSON.stringify(boxes.seats[i])} → ${b ? `${b.w.toFixed(1)} x ${b.h.toFixed(1)} px at ${b.x.toFixed(0)},${b.y.toFixed(0)}` : 'not alight'}`));
const shot = await page.locator('#stage').screenshot();
await sharp(shot).png().toFile(`${OUT}/look-home.png`);
const union = (list) => {
  const x = Math.min(...list.map((b) => b.x)), y = Math.min(...list.map((b) => b.y));
  return { x, y, w: Math.max(...list.map((b) => b.x + b.w)) - x, h: Math.max(...list.map((b) => b.y + b.h)) - y };
};
const groups = { lamp: boxes.boxes.slice(0, 3), shelf: boxes.boxes.slice(3, 9), table: boxes.boxes.slice(9) };
for (const [name, list] of Object.entries(groups)) {
  const b = union(list);
  const pad = 26, scale = name === 'lamp' ? 6 : 3;
  const left = Math.max(0, Math.round(b.x - pad)), top = Math.max(0, Math.round(b.y - pad));
  const width = Math.min(1280 - left, Math.round(b.w + pad * 2)), height = Math.min(800 - top, Math.round(b.h + pad * 2));
  await sharp(shot).extract({ left, top, width, height }).resize(width * scale, height * scale, { kernel: 'nearest' }).png().toFile(`${OUT}/look-${name}-${scale}x.png`);
}
await page.close();
await browser.close();
