#!/usr/bin/env node
// round 11, the other half of the check: a DESKTOP visitor must be exactly where they were.
// Types with a real keyboard into the drawn register, clicks the picture in the middle of it (the
// case round 11 changed: mousedown may no longer take the field away), types on, and sends.
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.route('**/@vite/client', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: 'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;' }),
);
await page.goto('http://127.0.0.1:5173/?view=dialogue&state=greeting', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
await page.waitForTimeout(800);

const state = () =>
  page.evaluate(() => {
    const cap = document.querySelector('#dialogue .cap:not(.ruler)');
    const input = cap?.querySelector('input.keys');
    const answer = cap?.querySelector('.reply .answer');
    const r = cap?.getBoundingClientRect();
    return {
      asking: !!window.__theatre.pieces.dialogue.asking,
      value: input?.value ?? null,
      drawn: (answer?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      caret: !!cap?.querySelector('.reply .caret'),
      focused: document.activeElement === input,
      card: r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width) } : null,
    };
  });

const answered = page.evaluate(() => window.__theatre.pieces.dialogue.ask('WHAT BRINGS YOU IN TONIGHT?', { hold: 0.2 }));
await page.waitForFunction('window.__theatre.pieces.dialogue.asking === true', null, { timeout: 30000 });
await page.waitForTimeout(300);
console.log('field open        ', JSON.stringify(await state()));

await page.keyboard.type('I KEEP STARTING THINGS', { delay: 12 });
await page.waitForTimeout(200);
console.log('typed             ', JSON.stringify(await state()));

// the click round 11 changed: on the picture, mid-sentence
await page.mouse.click(300, 300);
await page.waitForTimeout(200);
console.log('after a click off ', JSON.stringify(await state()));

await page.keyboard.type(' AND NOT FINISHING', { delay: 12 });
await page.waitForTimeout(200);
console.log('typed on          ', JSON.stringify(await state()));

await page.keyboard.press('Enter');
const said = await Promise.race([answered, new Promise((r) => setTimeout(() => r('TIMEOUT'), 5000))]);
console.log('Return returned   ', JSON.stringify(said));
console.log('after Return      ', JSON.stringify(await state()));
console.log('page errors:', errs.length, errs.slice(0, 2).join(' | '));
await browser.close();
