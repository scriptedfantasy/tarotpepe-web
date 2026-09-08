#!/usr/bin/env node
// keep, round 1 — the proof: a real reading, exported by a real tap, on a laptop and on a phone.
//
// It runs its own dev server (PEPE_FAKE=1, port 8711) so the canned visit is deterministic and the
// dev server on 5173 is left alone. Then, twice:
//
//   1. ?view=mind&state=transcript runs the mind's own canned visit against the route, so
//      mind.history holds real lines rather than lines a tool typed in;
//   2. cards.place() lays the visit's three cards on the cloth, which is where help-keep reads them
//      from (P.cards.drawn.children[i].userData.card);
//   3. the notice is opened and «KEEP THIS READING» is CLICKED — a real mouse/touch event at the
//      control's own box, not a function call — and the sheet is built and handed over.
//
// The laptop pass saves the page canvases (the same pixels that go into the PDF) and the PDF.
// The phone pass (390x844, touch, navigator.share stubbed) proves the share call happens INSIDE
// the tap: a capturing click listener on window sets __inGesture and clears it on the next task, so
// a share called after any await lands with __inGesture false.
//
//   node tools/_keep-r1-proof.mjs           ROUND=r2  names the frames it saves (default r1)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const ROOT = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre';
const OUT = `${ROOT}/public/progress`;
const R = process.env.ROUND ?? 'r1'; // which round's frames these are
const PORT = 8711;
const BASE = `http://127.0.0.1:${PORT}`;
const CARDS = ['the-fool', 'the-house-of-god', 'the-star']; // the mind's own canned spread
mkdirSync(OUT, { recursive: true });

const VITE_STUB = `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){ return u; } export class ErrorOverlay {}`;

// ---- the server ------------------------------------------------------------------------------
const alive = async () => {
  try {
    return (await fetch(BASE + '/', { signal: AbortSignal.timeout(700) })).ok;
  } catch {
    return false;
  }
};
let server = null;
if (!(await alive())) {
  server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    env: { ...process.env, PEPE_FAKE: '1' },
    stdio: 'ignore',
  });
  const t0 = Date.now();
  while (Date.now() - t0 < 60000 && !(await alive())) await new Promise((r) => setTimeout(r, 400));
  if (!(await alive())) {
    console.error(`FAIL — no dev server on ${PORT}`);
    process.exit(1);
  }
  console.log(`dev server on ${PORT} (PEPE_FAKE=1)`);
} else console.log(`dev server on ${PORT} already up`);
const stop = () => server?.kill('SIGTERM');
process.on('exit', stop);

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});

// ---- one pass ----------------------------------------------------------------------------------
async function pass({ label, viewport, phone }) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    hasTouch: !!phone,
    isMobile: !!phone,
  });
  // the gesture watch, and (on a phone) the stubbed share sheet
  await context.addInitScript(() => {
    window.__inGesture = false;
    window.addEventListener(
      'click',
      () => {
        window.__inGesture = true;
        setTimeout(() => {
          window.__inGesture = false;
        }, 0);
      },
      true,
    );
  });
  if (phone) {
    await context.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'canShare', {
        configurable: true,
        value: (d) => !!(d && Array.isArray(d.files) && d.files.length && d.files.every((f) => f instanceof File)),
      });
      Object.defineProperty(Navigator.prototype, 'share', {
        configurable: true,
        value: async (d) => {
          window.__shared = {
            inGesture: window.__inGesture === true,
            userActivation: navigator.userActivation ? navigator.userActivation.isActive === true : null,
            files: (d.files ?? []).map((f) => ({ name: f.name, type: f.type, size: f.size })),
          };
        },
      });
    });
  }
  const page = await context.newPage();
  const errors = [];
  const notes = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
    else if (m.type() === 'warning' && /keep/i.test(m.text())) notes.push(m.text());
  });
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: VITE_STUB }));

  await page.goto(`${BASE}/?view=mind&state=transcript`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  await page.waitForFunction('window.__mindDone === true', null, { timeout: 180000 });

  // the three cards the visit drew, laid on the cloth, and the mind's transcript block out of the way
  await page.evaluate(async (slugs) => {
    document.querySelector('#transcript')?.remove();
    await window.__theatre.pieces.cards.place(slugs, true);
  }, CARDS);
  await page.waitForTimeout(500);

  const reading = await page.evaluate(() => {
    const r = window.__theatre.pieces.help.keep.readingNow(window.__theatre);
    return { cards: r.cards, turns: r.transcript.length, chars: r.transcript.reduce((a, t) => a + t.text.length, 0) };
  });

  // the control, before the notice is up: is it live?
  const before = await page.evaluate(() => window.__theatre.pieces.help.controlBox('keep'));

  // open() is the real thing — it is what starts the sheet building — and then setState('open')
  // puts the notice down at rest. The judging browser renders at well under a frame a second, so
  // the four stepped drawings of the notice coming up can still be running a second later, and
  // help.js quite correctly spends a click caught in mid-air on landing the sheet rather than on a
  // control. Settling it first is what makes the tap under test the tap and not the landing.
  await page.evaluate(() => window.__theatre.pieces.help.open());
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__theatre.pieces.help.setState('open'));
  await page.waitForTimeout(400);
  const box = await page.evaluate(() => window.__theatre.pieces.help.controlBox('keep'));
  if (!box) throw new Error('no KEEP THIS READING control on the notice');
  await page.screenshot({ path: `${OUT}/keep-${R}-notice-${label}.png` });

  // The sheet is built while the notice comes up. Wait for it, because THAT IS THE DESIGN under
  // test: a tap that finds the blob already made is a tap that can hand it to the share sheet with
  // nothing awaited in between. (A software-rendered page takes a second or two over it; a phone
  // does not, and either way the visitor has a notice to read while it happens.)
  const built0 = Date.now();
  await page.waitForFunction(() => window.__theatre.pieces.help.keep.ready(window.__theatre), null, { timeout: 120000 });
  const builtMs = Date.now() - built0;

  // THE TAP. One real event at the control's own box.
  const cx = Math.round(box.x + box.w / 2), cy = Math.round(box.y + box.h / 2);
  if (phone) await page.touchscreen.tap(cx, cy);
  else await page.mouse.click(cx, cy);
  await page.waitForFunction(() => !!window.__theatre.pieces.help.keep.last, null, { timeout: 30000 }).catch(() => {});
  const last = await page.evaluate(() => {
    const l = window.__theatre.pieces.help.keep.last;
    return l ? { path: l.path, ms: l.ms, pages: l.pages?.length ?? 0, bytes: l.blob?.size ?? 0 } : null;
  });
  const shared = phone ? await page.evaluate(() => window.__shared ?? null) : null;
  const where = await page.evaluate(
    ([x, y]) => {
      const e = document.elementFromPoint(x, y);
      return { at: e ? `${e.tagName}<${e.parentElement?.id || '?'}>` : null, showing: window.__theatre.pieces.help.showing };
    },
    [cx, cy],
  );

  return { page, context, errors, notes, reading, before, box, last, shared, where, builtMs };
}

// ---- 1. the laptop -----------------------------------------------------------------------------
console.log('\n— LAPTOP 1600x900 —');
const desk = await pass({ label: 'desk', viewport: { width: 1600, height: 900 }, phone: false });
console.log('reading on the cloth :', desk.reading.cards.map((c) => c.name).join(' · '));
console.log('transcript           :', `${desk.reading.turns} turns, ${desk.reading.chars} characters`);
console.log('control before/after :', `inactive=${desk.before?.inactive} → box ${Math.round(desk.box.w)}x${Math.round(desk.box.h)} at ${Math.round(desk.box.x)},${Math.round(desk.box.y)}, inactive=${desk.box.inactive}`);
console.log('sheet ready after    :', desk.builtMs + ' ms of the notice being up');
console.log('the tap did          :', JSON.stringify(desk.last));

if (!desk.last) {
  console.error('FAIL — the tap produced nothing');
  console.error('  where the tap landed:', JSON.stringify(desk.where));
  for (const e of desk.errors) console.error('  ERR', e);
  for (const w of desk.notes) console.error('  WARN', w);
  await browser.close();
  process.exit(1);
}

// the page canvases — the same pixels that go into the PDF — and the PDF itself
const pngs = await desk.page.evaluate(() =>
  window.__theatre.pieces.help.keep.last.pages.map((c) => c.toDataURL('image/png')),
);
pngs.forEach((d, i) => writeFileSync(`${OUT}/keep-${R}-page-${i + 1}.png`, Buffer.from(d.split(',')[1], 'base64')));
const pdfB64 = await desk.page.evaluate(async () => {
  const buf = new Uint8Array(await window.__theatre.pieces.help.keep.last.blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(s);
});
const pdf = Buffer.from(pdfB64, 'base64');
writeFileSync(`${OUT}/keep-${R}.pdf`, pdf);
console.log('wrote                :', pngs.map((_, i) => `keep-${R}-page-${i + 1}.png`).join(', '), `and keep-${R}.pdf (${(pdf.length / 1024).toFixed(0)} KB)`);

// ---- 2. the phone ------------------------------------------------------------------------------
console.log('\n— PHONE 390x844, touch, share stubbed —');
const ph = await pass({ label: 'phone', viewport: { width: 390, height: 844 }, phone: true });
console.log('control box          :', `${Math.round(ph.box.w)}x${Math.round(ph.box.h)} at ${Math.round(ph.box.x)},${Math.round(ph.box.y)}`);
console.log('sheet ready after    :', ph.builtMs + ' ms of the notice being up');
console.log('the tap did          :', JSON.stringify(ph.last));
console.log('navigator.share got  :', JSON.stringify(ph.shared));

// ---- 3. nothing said, nothing drawn ------------------------------------------------------------
// The control is present and struck set back before the evening has begun, and a click on it does
// nothing at all — it does not close the notice either.
console.log('\n— A ROOM WHERE NOTHING HAS HAPPENED YET —');
const cold = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const coldPage = await cold.newPage();
const coldErrors = [];
coldPage.on('pageerror', (e) => coldErrors.push(String(e)));
coldPage.on('console', (m) => m.type() === 'error' && coldErrors.push(m.text()));
await coldPage.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: VITE_STUB }));
await coldPage.goto(`${BASE}/?shot=1`, { waitUntil: 'load', timeout: 180000 });
await coldPage.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
await coldPage.evaluate(() => window.__theatre.pieces.help.open());
await coldPage.waitForTimeout(400);
await coldPage.evaluate(() => window.__theatre.pieces.help.setState('open'));
await coldPage.waitForTimeout(400);
const coldBox = await coldPage.evaluate(() => window.__theatre.pieces.help.controlBox('keep'));
await coldPage.screenshot({ path: `${OUT}/keep-${R}-notice-cold.png` });
await coldPage.mouse.click(Math.round(coldBox.x + coldBox.w / 2), Math.round(coldBox.y + coldBox.h / 2));
await coldPage.waitForTimeout(600);
const coldAfter = await coldPage.evaluate(() => ({
  showing: window.__theatre.pieces.help.showing,
  last: window.__theatre.pieces.help.keep.last,
  reading: window.__theatre.pieces.help.keep.hasReading(window.__theatre),
}));
console.log('control              :', JSON.stringify(coldBox));
console.log('after a click on it  :', JSON.stringify(coldAfter));

// ---- 4. is it a PDF? ---------------------------------------------------------------------------
console.log('\n— THE FILE —');
let rendered = 0;
try {
  // a fresh directory every run: a leftover page from a longer reading would be counted as this one's
  const dir = mkdtempSync(`${tmpdir()}/keep-${R}-`);
  execFileSync('pdftoppm', ['-r', '72', '-png', `${OUT}/keep-${R}.pdf`, `${dir}/p`], { stdio: 'pipe' });
  rendered = readdirSync(dir).filter((f) => f.endsWith('.png')).length;
  rmSync(dir, { recursive: true, force: true });
  console.log(`poppler rendered ${rendered} page(s)`);
} catch (e) {
  console.log('poppler could not render it:', String(e).split('\n')[0]);
}

// ---- the verdict -------------------------------------------------------------------------------
const checks = [
  ['the reading has three cards on the cloth', desk.reading.cards.length === 3],
  ['the reading has a transcript', desk.reading.turns >= 6],
  ['the control is live once there is a reading', desk.box.inactive === false],
  ['…and set back before there is one', coldBox?.inactive === true],
  ['…where a click on it does nothing, and does not close the notice', coldAfter.last === null && coldAfter.showing === true && coldAfter.reading === false],
  ['the laptop tap downloaded the sheet', desk.last?.path === 'download'],
  ['the sheet is more than one page', (desk.last?.pages ?? 0) >= 2],
  ['the file is a PDF', pdf.subarray(0, 5).toString() === '%PDF-'],
  ['poppler reads every page of it', rendered === desk.last.pages],
  ['the phone tap opened the share sheet', ph.last?.path === 'share'],
  ['…with the PDF as a file on it', ph.shared?.files?.[0]?.type === 'application/pdf' && ph.shared.files[0].name === 'tarot-pepe-reading.pdf'],
  ['…called INSIDE the tap (same task as the click)', ph.shared?.inGesture === true],
  ['…with the gesture still live (userActivation)', ph.shared?.userActivation === true],
  ['no page errors, laptop', desk.errors.length === 0],
  ['no page errors, phone', ph.errors.length === 0],
  ['no page errors, cold room', coldErrors.length === 0],
];
console.log('');
for (const [what, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`);
for (const e of [...desk.errors, ...ph.errors, ...coldErrors]) console.log('  ERR', e);

await browser.close();
stop();
process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
