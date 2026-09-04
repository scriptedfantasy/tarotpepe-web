// throwaway (round 5): play the visit and MEASURE THE CAPTION at every beat — where the drawn
// placard stands in the frame (centre x, its top and bottom as fractions of the window) and which
// shot it stands in. The round's rule is that it is the same band at the foot of the picture in
// every shot, so a table of these numbers is the proof.
//   node tools/_r5-visit.mjs [--width 1600 --height 900] [--out /abs/dir]
// It also waits properly at the door (the shared _talk-test polls before the flow has set its beat
// and skips the knock, then stalls) and fails on any page error.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const W = +(args.width ?? 1600), H = +(args.height ?? 900);
const outDir = args.out ?? '/tmp';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.route('**/@vite/client', (route) =>
  route.fulfill({ contentType: 'application/javascript', body: 'export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }\nexport function updateStyle(){}\nexport function removeStyle(){}\nexport function injectQuery(u){ return u; }\nexport class ErrorOverlay {}' }),
);
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load', timeout: 60000 });
while (Date.now() - t0 < 150000) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(250);
}
log('ready');

const state = () =>
  page.evaluate(() => {
    const T = window.__theatre;
    const cap = document.querySelector('#dialogue .cap');
    const r = cap && !cap.hidden ? cap.getBoundingClientRect() : null;
    return {
      beat: T.pieces.flow?.beat,
      shot: T.pieces.camera?.current,
      door: T.pieces.entrance?.mode,
      field: !!document.querySelector('#dialogue input.keys'),
      fan: T.pieces.reveal?.fanCount ?? 0,
      picks: (T.pieces.reveal?.picks ?? []).length,
      text: cap && !cap.hidden ? cap.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) : null,
      box: r ? { cx: (r.left + r.width / 2) / innerWidth, top: r.top / innerHeight, bottom: r.bottom / innerHeight, w: r.width / innerWidth } : null,
    };
  });
async function until(label, fn, seconds = 60) {
  const start = Date.now();
  for (;;) {
    const s = await state();
    if (fn(s)) return s;
    if (Date.now() - start > seconds * 1000) throw new Error(`stalled waiting for ${label}: ${JSON.stringify(s)}`);
    await page.waitForTimeout(120);
  }
}
const seen = [];
async function note(tag) {
  const s = await state();
  if (s.box) seen.push({ tag, shot: s.shot, ...s.box, text: s.text });
  return s;
}
// watch continuously: every distinct (shot, caption) the evening puts up
let watching = true;
(async () => {
  let last = '';
  while (watching) {
    const s = await state().catch(() => null);
    if (s?.box && `${s.shot}|${s.text}` !== last) {
      last = `${s.shot}|${s.text}`;
      seen.push({ tag: s.beat, shot: s.shot, ...s.box, text: s.text });
    }
    await page.waitForTimeout(200);
  }
})();

try {
  // 1. the door: wait for it to be there, then knock
  await until('the door', (s) => s.door === 'closed', 40);
  await page.screenshot({ path: `${outDir}/visit-door.png` });
  await page.mouse.click(W / 2, H / 2);
  log('knocked');
  // 2. the greeting and the open field
  await until('the greeting', (s) => s.field && s.beat === 'talk', 90);
  log('field open');
  await page.screenshot({ path: `${outDir}/visit-talk.png` });
  await page.keyboard.type('i keep starting things and not finishing them', { delay: 8 });
  await page.keyboard.press('Enter');
  await until('his answer', (s) => s.field && s.beat === 'talk', 90);
  log('answered, field open again');
  // 3. ask for the cards
  await page.keyboard.type('can you read my cards', { delay: 8 });
  await page.keyboard.press('Enter');
  await until('the fan', (s) => s.fan > 0, 90);
  log('the fan is out');
  await page.screenshot({ path: `${outDir}/visit-fan.png` });
  // 4. pick three by naming them
  for (let k = 0; k < 3; k++) {
    const s = await until(`the pick prompt ${k + 1}`, (x) => x.field, 60);
    if (!s.field) break;
    await page.keyboard.type(['the third from the left', 'the seventh from the left', 'the last one'][k], { delay: 8 });
    await page.keyboard.press('Enter');
    await until(`pick ${k + 1} landed`, (x) => x.picks > k, 60);
    log('picked', k + 1);
  }
  await until('the readings', (s) => s.beat === 'reading' || s.beat === 'talk', 120);
  await page.screenshot({ path: `${outDir}/visit-reading.png` });
  log('reading');
  await until('the field after the reading', (s) => s.field && s.beat === 'talk', 180);
  await page.screenshot({ path: `${outDir}/visit-after.png` });
  // 5. good night
  await page.keyboard.type('thank you, good night', { delay: 8 });
  await page.keyboard.press('Enter');
  await until('the farewell', (s) => s.beat === 'farewell' || s.beat === 'closing', 90);
  log('good night');
} catch (e) {
  errors.push(`TEST: ${e.message}`);
}
watching = false;
await page.waitForTimeout(300);

console.log('\ncaption, beat by beat  (fractions of the window; the band should be the same everywhere)');
console.log('  beat        shot        cx      top     bottom   w      line');
for (const s of seen) {
  console.log(
    `  ${String(s.tag).padEnd(11)} ${String(s.shot).padEnd(11)} ${s.cx.toFixed(3)}  ${s.top.toFixed(3)}  ${s.bottom.toFixed(3)}  ${s.w.toFixed(3)}  ${String(s.text ?? '').slice(0, 34)}`,
  );
}
const bad = seen.filter((s) => Math.abs(s.cx - 0.5) > 0.01 || Math.abs(s.bottom - 0.945) > 0.02);
console.log(bad.length ? `\nOFF THE BAND: ${bad.length} of ${seen.length}` : `\nall ${seen.length} captions on the same band`);
if (errors.length) {
  console.log('\nPAGE ERRORS:');
  for (const e of errors.slice(0, 6)) console.log(' -', e.split('\n')[0]);
}
await browser.close();
process.exit(errors.length ? 2 : 0);
