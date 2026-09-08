#!/usr/bin/env node
// hand r12 — the arms during the wash and the pick. Frames of ?view=reveal&state=shuffle|pick|gather
// at a laptop frame and a phone frame, frozen at a fixed t so before and after are the same drawing.
//
//   node tools/_hand-r12-proof.mjs --tag before
//   node tools/_hand-r12-proof.mjs --tag after
//   node tools/_hand-r12-proof.mjs --tag probe --states shuffle --ts 1,2,3,4   (scouting a good t)
//
// Writes public/progress/hand-r12-<tag>-<state>-<laptop|phone>.png
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const TAG = args.tag ?? 'probe';
const OUT = new URL('../public/progress/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:5173';

// the frozen moments: mid-wash (both palms in the raft), the pinch on a corner, the rake
const T = { shuffle: 3.0, pick: 2.6, gather: 0.8 };
const STATES = (args.states ?? 'shuffle,pick,gather').split(',');
const TS = args.ts ? args.ts.split(',').map(Number) : null;
const SIZES = [
  ['laptop', 1280, 800],
  ['phone', 390, 844],
];

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const errors = [];
for (const [label, width, height] of SIZES) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(`${label}: ${e}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${label}: ${m.text()}`);
  });
  await page.route('**/@vite/client', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){ return u; } export class ErrorOverlay {}`,
    }),
  );
  for (const state of STATES) {
    for (const t of TS ?? [T[state]]) {
      const u = new URL(BASE + '/');
      u.searchParams.set('view', 'reveal');
      u.searchParams.set('state', state);
      u.searchParams.set('t', String(t));
      u.searchParams.set('shot', '1');
      await page.goto(u.toString(), { waitUntil: 'load', timeout: 120000 });
      const t0 = Date.now();
      while (Date.now() - t0 < 120000) {
        if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
        await page.waitForTimeout(200);
      }
      await page.waitForTimeout(700);
      const suffix = TS ? `${state}-t${t}` : state;
      const out = `${OUT}hand-r12-${TAG}-${suffix}-${label}.png`;
      await page.locator('#stage').screenshot({ path: out });
      console.log('wrote', out);
    }
  }
  await page.close();
}
await browser.close();
if (errors.length) console.error('PAGE ERRORS:\n' + errors.join('\n'));
else console.log('no page errors');
