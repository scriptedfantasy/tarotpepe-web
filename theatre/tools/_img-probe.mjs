#!/usr/bin/env node
// Time fetching + decoding the baked card back inside the judging browser.
import { chromium } from 'playwright';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:5173/baked/manifest.json', { waitUntil: 'load' });
const r = await page.evaluate(async () => {
  const out = {};
  let t = performance.now();
  const m = await (await fetch('/baked/manifest.json')).json();
  out.manifest = performance.now() - t;
  const file = Object.values(m).find((e) => e.file.startsWith('card-back')).file;
  t = performance.now();
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = '/baked/' + file; });
  out.image = performance.now() - t;
  t = performance.now();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  c.getContext('2d').drawImage(img, 0, 0);
  out.draw = performance.now() - t;
  out.size = [img.width, img.height];
  return out;
});
console.log(r);
await browser.close();
