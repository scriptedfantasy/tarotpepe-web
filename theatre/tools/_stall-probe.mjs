#!/usr/bin/env node
// Is the ~3 s stall a property of the first network request an idle page makes?
import { chromium } from 'playwright';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto('http://127.0.0.1:5173/baked/manifest.json', { waitUntil: 'load' });
const r = await page.evaluate(async () => {
  const t = async (u) => { const a = performance.now(); await fetch(u, { cache: 'no-store' }); return Math.round(performance.now() - a); };
  const out = [];
  out.push(['immediate', await t('/baked/manifest.json?a=1')]);
  await new Promise((r) => setTimeout(r, 1500));
  out.push(['after 1.5 s idle', await t('/baked/manifest.json?b=1')]);
  out.push(['again', await t('/baked/manifest.json?c=1')]);
  await new Promise((r) => setTimeout(r, 3000));
  out.push(['after 3 s idle', await t('/baked/manifest.json?d=1')]);
  return out;
});
console.log(r);
await browser.close();
