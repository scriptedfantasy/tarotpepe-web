#!/usr/bin/env node
// round 11: the card, with a keyboard standing in front of it.
//
// A phone's on-screen keyboard does not change window.innerHeight — it covers the bottom of the
// picture and leaves the layout alone — so a card on the floor line stands behind it. Chromium
// cannot be made to raise a real keyboard, so window.visualViewport is stubbed to the shape an
// iPhone 14's keyboard gives it (664 → 373 px of visible frame) and the card is measured against
// the visible floor before and after.
//
//   node tools/_dlg-r11-keyboard.mjs
import { chromium, devices } from 'playwright';

// The dev server to drive. A builder running a server of their own passes BASE; the default is the
// user's own on 5173, so nothing that ran before this line runs differently.
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';

const iPhone = devices['iPhone 14'];
const KB = 291; // px an iPhone 14's keyboard takes, with its accessory bar

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const context = await browser.newContext({ ...iPhone, deviceScaleFactor: 1 });
// the stub: a visualViewport whose height we own, and which fires resize when we change it
await context.addInitScript((kb) => {
  let covered = 0;
  const vv = window.visualViewport;
  const realH = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(vv), 'height').get;
  Object.defineProperty(vv, 'height', { get: () => realH.call(vv) - covered, configurable: true });
  Object.defineProperty(vv, 'offsetTop', { get: () => 0, configurable: true });
  window.__keyboard = (up) => {
    covered = up ? kb : 0;
    vv.dispatchEvent(new Event('resize'));
  };
}, KB);
const page = await context.newPage();
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.route('**/@vite/client', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }),
);
await page.goto(`${BASE}/?view=dialogue&state=question`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
await page.waitForTimeout(1200);

const read = () =>
  page.evaluate((kb) => {
    const cap = document.querySelector('#dialogue .cap:not(.ruler)');
    const r = cap.getBoundingClientRect();
    const visible = window.innerHeight - (window.innerHeight - window.visualViewport.height);
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      w: Math.round(r.width),
      h: Math.round(r.height),
      innerH: window.innerHeight,
      visibleFloor: Math.round(window.visualViewport.height),
      clear: Math.round(window.visualViewport.height) - Math.round(r.bottom),
      asking: !!window.__theatre.pieces.dialogue.asking,
    };
  }, KB);

console.log('field open, no keyboard  ', JSON.stringify(await read()));
await page.evaluate(() => window.__keyboard(true));
await page.waitForTimeout(400);
const up = await read();
console.log('keyboard up (291 px)     ', JSON.stringify(up));
await page.evaluate(() => window.__keyboard(false));
await page.waitForTimeout(400);
console.log('keyboard away again      ', JSON.stringify(await read()));

console.log('');
console.log(up.clear >= 0 ? `PASS — the card stands ${up.clear} px clear of the keyboard` : `FAIL — ${-up.clear} px of the card is behind the keyboard`);
await browser.close();
