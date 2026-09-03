#!/usr/bin/env node
// What the visitor's controls actually are, as CSS: the caption plate, the input field, the mic.
import { chromium } from 'playwright';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await page.route('**/@vite/client', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay {}` }),
);
await page.goto('http://127.0.0.1:5173/?view=dialogue&state=question&shot=1', { waitUntil: 'load', timeout: 60000 });
const t0 = Date.now();
for (;;) {
  const ok = await page.evaluate(() => window.__theatreReady === true).catch(() => false);
  if (ok || Date.now() - t0 > 120000) break;
  await page.waitForTimeout(200);
}
await page.waitForTimeout(3000);
const out = await page.evaluate(() => {
  const d = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      sel, tag: el.tagName, cls: el.className,
      rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
      font: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight, transform: cs.textTransform, spacing: cs.letterSpacing,
      color: cs.color, bg: cs.backgroundColor, bgImage: cs.backgroundImage.slice(0, 120), border: cs.border,
      borderRadius: cs.borderRadius, boxShadow: cs.boxShadow, outline: cs.outline, cursor: cs.cursor, caret: cs.caretColor,
      placeholder: el.placeholder ?? null, html: el.outerHTML.slice(0, 400),
    };
  };
  return {
    dialogueHTML: document.querySelector('#dialogue')?.innerHTML.slice(0, 1600),
    cap: d('#dialogue .cap'), field: d('#dialogue input.field'), mic: d('#dialogue button.mic'),
    stageCursor: getComputedStyle(document.querySelector('#stage') ?? document.body).cursor,
    overlayCursor: getComputedStyle(document.querySelector('#overlay') ?? document.body).cursor,
    css: [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules].map((r) => r.cssText); } catch { return []; } })
      .filter((t) => /\.cap|\.field|\.mic|#dialogue/.test(t)).slice(0, 60),
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
