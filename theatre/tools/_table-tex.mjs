#!/usr/bin/env node
// throwaway: draw the cloth textures on their own, without booting the theatre, so the weave can be
// iterated on while other builders are mid-edit in their own files.
//   node tools/_table-tex.mjs            → /tmp/tex-top.png, /tmp/tex-skirt.png
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
await page.route('http://127.0.0.1:5173/_tex', (route) =>
  route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset=utf-8><body></body>' }),
);
await page.goto('http://127.0.0.1:5173/_tex');
const out = await page.evaluate(async () => {
  const m = await import('/src/pieces/table-textures.js');
  const top = m.clothTopTexture(0.608, {
    rings: [
      [0.55, -0.12, 0.034],
      [-0.52, -0.22, 0.03],
      [0.28, -0.02, 0.031],
    ],
    crumbs: [[-0.43, -0.11]],
    burns: [[-0.05, -0.2]],
  });
  const skirt = m.skirtTexture(0.78, 0.608);
  return { top: top.image.toDataURL('image/png'), skirt: skirt.image.toDataURL('image/png') };
});
for (const [k, v] of Object.entries(out)) {
  writeFileSync(`/tmp/tex-${k}.png`, Buffer.from(v.split(',')[1], 'base64'));
  console.log(`/tmp/tex-${k}.png`);
}
if (errors.length) console.log('ERRORS', errors);
await browser.close();
