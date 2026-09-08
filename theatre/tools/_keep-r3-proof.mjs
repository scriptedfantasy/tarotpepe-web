#!/usr/bin/env node
// keep, round 3 — THE READING ON THE CARD. The user: "rather than going direct to pdf download,
// can we show the reading in the ? card and have a download button there?"
//
// Same harness as _keep-r1-proof.mjs: its own dev server (PEPE_FAKE=1, port 8712) so the canned
// visit is deterministic and the one on 5173 is left alone; ?view=mind&state=transcript fills
// mind.history with real lines; cards.place() lays the three cards on the cloth. Then, twice — on a
// laptop and on a phone:
//
//   1. the notice is opened and «KEEP THIS READING» is CLICKED. It must NOT download anything: it
//      must turn the card over and show the reading;
//   2. a frame of the reading at the top of the roll, and the roll is scrolled to its foot — by the
//      wheel on a laptop, by a real dragged finger on the phone (CDP touch events), never by the
//      page behind it — and a frame with «DOWNLOAD» and «BACK» in it;
//   3. «DOWNLOAD» is CLICKED, and the share/download call must happen INSIDE that click, exactly as
//      the r1 proof proves it: a capturing click listener sets __inGesture and clears it on the
//      next task, so a share called after any await lands with __inGesture false;
//   4. «BACK» is CLICKED, and the notice must be up again, as it was, with its three controls.
//
//   node tools/_keep-r3-proof.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const ROOT = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre';
const OUT = `${ROOT}/public/progress`;
const PORT = 8712;
const BASE = `http://127.0.0.1:${PORT}`;
const CARDS = ['the-fool', 'the-house-of-god', 'the-star'];
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

// a real finger, dragged: CDP touch events, so touch-action and the roll's own scrolling are what
// answer — not a scrollTop somebody set
async function drag(page, x, y, dy, steps = 12) {
  const cdp = await page.context().newCDPSession(page);
  const pt = (yy) => [{ x, y: yy, radiusX: 6, radiusY: 6, force: 1, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(y) });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(y - (dy * i) / steps) });
    await new Promise((r) => setTimeout(r, 16));
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

// ---- one pass ----------------------------------------------------------------------------------
async function pass({ label, viewport, phone }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: !!phone, isMobile: !!phone });
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
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: VITE_STUB }));

  await page.goto(`${BASE}/?view=mind&state=transcript`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  await page.waitForFunction('window.__mindDone === true', null, { timeout: 180000 });
  await page.evaluate(async (slugs) => {
    document.querySelector('#transcript')?.remove();
    await window.__theatre.pieces.cards.place(slugs, true);
  }, CARDS);
  await page.waitForTimeout(400);

  // the notice, settled (the judging browser renders at well under a frame a second, so a click
  // caught in mid-air would be spent landing the sheet rather than on a control — r1 says so)
  await page.evaluate(() => window.__theatre.pieces.help.open());
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__theatre.pieces.help.setState('open'));
  await page.waitForTimeout(300);
  await page.waitForFunction(() => window.__theatre.pieces.help.keep.ready(window.__theatre), null, { timeout: 120000 });

  // ---- 1. THE TAP ON «KEEP THIS READING» -------------------------------------------------------
  const keepBox = await page.evaluate(() => window.__theatre.pieces.help.controlBox('keep'));
  if (!keepBox) throw new Error('no KEEP THIS READING control on the notice');
  const kx = Math.round(keepBox.x + keepBox.w / 2), ky = Math.round(keepBox.y + keepBox.h / 2);
  if (phone) await page.touchscreen.tap(kx, ky);
  else await page.mouse.click(kx, ky);
  await page.waitForTimeout(500);
  const afterKeep = await page.evaluate(() => ({
    reading: window.__theatre.pieces.help.reading,
    showing: window.__theatre.pieces.help.showing,
    handedOver: window.__theatre.pieces.help.keep.last, // must still be null: nothing downloaded yet
    pages: document.querySelectorAll('#help-read .col > canvas').length,
    scrollable: window.__theatre.pieces.help.readScrollable,
    // the two controls belong to the card, not to the paper: they are there before a finger has
    // moved anything, which is the whole point of putting them at its foot
    atTop: ['download', 'back'].map((k) => window.__theatre.pieces.help.readControlBox(k)),
  }));
  await page.screenshot({ path: `${OUT}/keep-r3-reading-${label}-top.png`, timeout: 120000 });

  // ---- 2. THE MEASURE --------------------------------------------------------------------------
  // The page is A5 in points (420 wide) and it is shown at the roll's own width, so every cap on
  // the sheet lands at cap × colW / 420 CSS px. These are help-keep's own cap heights.
  const L = await page.evaluate(() => {
    const l = window.__theatre.pieces.help.readLayout();
    const roll = window.__theatre.pieces.help.readRoll();
    return { colW: l.colW, cardW: l.card.w, cardH: l.card.h, cardX: l.card.x, cardY: l.card.y, roll: { h: roll.clientHeight, scroll: roll.scrollHeight } };
  });
  const k = L.colW / 420;
  const print = {
    head: 26 * k,
    body: 11 * k, // the transcript — the smallest print anybody is asked to READ
    date: 8.4 * k,
    cardName: 7.4 * k,
    credit: 6.6 * k, // the signature at the foot. Not an instruction; the notice sets it small too
  };

  // ---- 3. SCROLLING, INSIDE THE CARD -----------------------------------------------------------
  const before = await page.evaluate(() => ({
    top: window.__theatre.pieces.help.readRoll().scrollTop,
    winY: window.scrollY,
    docY: document.documentElement.scrollTop,
  }));
  const cx = Math.round(L.cardX + L.cardW / 2), cy = Math.round(viewport.height / 2);
  if (phone) {
    for (let i = 0; i < 14; i++) await drag(page, cx, Math.round(viewport.height * 0.72), Math.round(viewport.height * 0.5));
  } else {
    await page.mouse.move(cx, cy);
    for (let i = 0; i < 14; i++) await page.mouse.wheel(0, 900);
  }
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => {
    const roll = window.__theatre.pieces.help.readRoll();
    return { top: roll.scrollTop, max: roll.scrollHeight - roll.clientHeight, winY: window.scrollY, docY: document.documentElement.scrollTop };
  });
  // and the last of it, however the gesture landed, so the frame at the foot is the foot
  await page.evaluate(() => {
    const roll = window.__theatre.pieces.help.readRoll();
    roll.scrollTop = roll.scrollHeight;
  });
  await page.waitForTimeout(400);
  const dlBox = await page.evaluate(() => window.__theatre.pieces.help.readControlBox('download'));
  const backBox = await page.evaluate(() => window.__theatre.pieces.help.readControlBox('back'));
  await page.screenshot({ path: `${OUT}/keep-r3-reading-${label}-foot.png`, timeout: 120000 });

  // ---- 4. «DOWNLOAD» ---------------------------------------------------------------------------
  const dx = Math.round(dlBox.x + dlBox.w / 2), dy = Math.round(dlBox.y + dlBox.h / 2);
  if (phone) await page.touchscreen.tap(dx, dy);
  else await page.mouse.click(dx, dy);
  await page.waitForFunction(() => !!window.__theatre.pieces.help.keep.last, null, { timeout: 30000 }).catch(() => {});
  const last = await page.evaluate(() => {
    const l = window.__theatre.pieces.help.keep.last;
    return l ? { path: l.path, ms: l.ms, pages: l.pages?.length ?? 0, bytes: l.blob?.size ?? 0 } : null;
  });
  const shared = phone ? await page.evaluate(() => window.__shared ?? null) : null;
  const stillReading = await page.evaluate(() => window.__theatre.pieces.help.reading);

  // ---- 5. «BACK» -------------------------------------------------------------------------------
  const bx = Math.round(backBox.x + backBox.w / 2), by = Math.round(backBox.y + backBox.h / 2);
  if (phone) await page.touchscreen.tap(bx, by);
  else await page.mouse.click(bx, by);
  await page.waitForTimeout(600);
  const back = await page.evaluate(() => ({
    reading: window.__theatre.pieces.help.reading,
    showing: window.__theatre.pieces.help.showing,
    controls: ['close', 'leave', 'keep'].map((k2) => !!window.__theatre.pieces.help.controlBox(k2)),
    readVisible: getComputedStyle(document.querySelector('#help-read')).display,
  }));
  await page.screenshot({ path: `${OUT}/keep-r3-back-${label}.png`, timeout: 120000 });

  // the room is given back before the next pass opens its own: a software-rendered theatre left
  // running in another context starves the one being measured
  await context.close();
  return { errors, afterKeep, L, print, before, after, dlBox, backBox, last, shared, stillReading, back };
}

const say = (o) => JSON.stringify(o);
const px = (n) => `${n.toFixed(1)} px`;

console.log('\n— LAPTOP 1280x800 —');
const desk = await pass({ label: 'desk', viewport: { width: 1280, height: 800 }, phone: false });
console.log('the tap on KEEP did  :', say(desk.afterKeep));
console.log('card / roll          :', `${desk.L.cardW}x${desk.L.cardH}, roll ${desk.L.colW} wide, ${desk.L.roll.scroll} px of paper in a ${desk.L.roll.h} px window`);
console.log('the wheel over it    :', `roll ${desk.before.top} → ${desk.after.top} of ${desk.after.max}; the page behind it stayed at ${desk.after.winY}/${desk.after.docY}`);
console.log('DOWNLOAD did         :', say(desk.last));
console.log('BACK did             :', say(desk.back));
console.log('print on the page    :', `head ${px(desk.print.head)} · transcript ${px(desk.print.body)} · date ${px(desk.print.date)} · card names ${px(desk.print.cardName)} · signature ${px(desk.print.credit)}`);

console.log('\n— PHONE 390x844, touch, share stubbed —');
const ph = await pass({ label: 'phone', viewport: { width: 390, height: 844 }, phone: true });
console.log('the tap on KEEP did  :', say(ph.afterKeep));
console.log('card / roll          :', `${ph.L.cardW}x${ph.L.cardH}, roll ${ph.L.colW} wide, ${ph.L.roll.scroll} px of paper in a ${ph.L.roll.h} px window`);
console.log('a dragged finger     :', `roll ${ph.before.top} → ${ph.after.top} of ${ph.after.max}; the page behind it stayed at ${ph.after.winY}/${ph.after.docY}`);
console.log('DOWNLOAD did         :', say(ph.last));
console.log('navigator.share got  :', say(ph.shared));
console.log('BACK did             :', say(ph.back));
console.log('print on the page    :', `head ${px(ph.print.head)} · transcript ${px(ph.print.body)} · date ${px(ph.print.date)} · card names ${px(ph.print.cardName)} · signature ${px(ph.print.credit)}`);

// ---- 6. THE MANNERS ------------------------------------------------------------------------
// The card is re-cut when the window changes shape, and there are three ways out of the reading:
// «BACK» (proved above), Escape, and a click on the room around it. None of them may take the
// notice down with them — one step back at a time.
console.log('\n— THE MANNERS —');
const manners = await (async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: VITE_STUB }));
  await page.goto(`${BASE}/?view=mind&state=transcript`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  await page.waitForFunction('window.__mindDone === true', null, { timeout: 180000 });
  await page.evaluate(async (slugs) => {
    document.querySelector('#transcript')?.remove();
    await window.__theatre.pieces.cards.place(slugs, true);
  }, CARDS);
  await page.evaluate(() => window.__theatre.pieces.help.open());
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__theatre.pieces.help.setState('open'));
  await page.waitForFunction(() => window.__theatre.pieces.help.keep.ready(window.__theatre), null, { timeout: 120000 });
  const kb = await page.evaluate(() => window.__theatre.pieces.help.controlBox('keep'));
  await page.mouse.click(Math.round(kb.x + kb.w / 2), Math.round(kb.y + kb.h / 2));
  await page.waitForTimeout(400);

  const wide = await page.evaluate(() => window.__theatre.pieces.help.readLayout().card.w);
  await page.setViewportSize({ width: 900, height: 600 });
  await page.waitForTimeout(900);
  const resized = await page.evaluate(() => {
    const l = window.__theatre.pieces.help.readLayout();
    const c = document.querySelector('#help-read .col > canvas');
    return { cardW: l.card.w, cardH: l.card.h, pages: document.querySelectorAll('#help-read .col > canvas').length, pageW: c ? Math.round(c.getBoundingClientRect().width) : 0, colW: l.colW, reading: window.__theatre.pieces.help.reading };
  });

  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const esc1 = await page.evaluate(() => ({ reading: window.__theatre.pieces.help.reading, showing: window.__theatre.pieces.help.showing }));
  const kb2 = await page.evaluate(() => window.__theatre.pieces.help.controlBox('keep'));
  await page.mouse.click(Math.round(kb2.x + kb2.w / 2), Math.round(kb2.y + kb2.h / 2));
  await page.waitForTimeout(400);
  const again = await page.evaluate(() => window.__theatre.pieces.help.reading);
  await page.mouse.click(6, 6); // the room, well off the card
  await page.waitForTimeout(400);
  const offCard = await page.evaluate(() => ({ reading: window.__theatre.pieces.help.reading, showing: window.__theatre.pieces.help.showing }));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  const esc2 = await page.evaluate(() => window.__theatre.pieces.help.showing);
  await context.close();
  return { wide, resized, esc1, again, offCard, esc2, errors };
})();
console.log('1280 → 900 wide       :', `card ${manners.wide} → ${manners.resized.cardW}x${manners.resized.cardH}, ${manners.resized.pages} pages re-scaled to ${manners.resized.pageW} px`);
console.log('Escape, KEEP, off-card:', say({ esc1: manners.esc1, keepAgain: manners.again, offCard: manners.offCard, escapeAgain: manners.esc2 }));

const checks = [
  ['KEEP shows the reading on the card', desk.afterKeep.reading === true && ph.afterKeep.reading === true],
  ['…and hands nothing over on its own', desk.afterKeep.handedOver === null && ph.afterKeep.handedOver === null],
  ['every page of the sheet is on the card', desk.afterKeep.pages >= 3 && ph.afterKeep.pages >= 3],
  ['the reading is longer than the card, and scrolls', desk.afterKeep.scrollable === true && ph.afterKeep.scrollable === true],
  ['the wheel scrolls the card, not the page', desk.after.top > 0 && desk.after.winY === 0 && desk.after.docY === 0],
  ['a dragged finger scrolls the card, not the page', ph.after.top > 0 && ph.after.winY === 0 && ph.after.docY === 0],
  ['DOWNLOAD and BACK are both at the foot', !!desk.dlBox && !!desk.backBox && !!ph.dlBox && !!ph.backBox],
  [
    '…in the frame from the first, before anything is scrolled',
    [desk, ph].every((p) =>
      p.afterKeep.atTop.every((b) => b && b.y >= p.L.cardY && b.y + b.h <= p.L.cardY + p.L.cardH),
    ),
  ],
  [
    '…and they do not move when the paper does',
    Math.abs(desk.afterKeep.atTop[0].y - desk.dlBox.y) < 0.5 && Math.abs(ph.afterKeep.atTop[0].y - ph.dlBox.y) < 0.5,
  ],
  ['a thumb can hit them (44 px)', Math.min(desk.dlBox.h, desk.backBox.h, ph.dlBox.h, ph.backBox.h) >= 44],
  ['the laptop DOWNLOAD downloaded the sheet', desk.last?.path === 'download'],
  ['…and the reading is still standing', desk.stillReading === true],
  ['the phone DOWNLOAD opened the share sheet', ph.last?.path === 'share'],
  ['…with the PDF as a file on it', ph.shared?.files?.[0]?.type === 'application/pdf' && ph.shared.files[0].name === 'tarot-pepe-reading.pdf'],
  ['…called INSIDE the tap (same task as the click)', ph.shared?.inGesture === true],
  ['…with the gesture still live (userActivation)', ph.shared?.userActivation === true],
  ['BACK puts the notice up, as it was', desk.back.reading === false && desk.back.showing === true && ph.back.reading === false && ph.back.showing === true],
  ['…with its three controls back on it', desk.back.controls.every(Boolean) && ph.back.controls.every(Boolean)],
  ['…and the reading put away', desk.back.readVisible === 'none' && ph.back.readVisible === 'none'],
  ['the transcript is at least 9 px on a 390 px phone', ph.print.body >= 8.95],
  // 900 px still takes the card's full 620 (it stops there on any laptop), so what a resize has to
  // prove here is that the card is re-cut to the new height and every page re-scaled to the measure
  ['a smaller window re-cuts the card and re-scales the pages', manners.resized.reading === true && manners.resized.cardH < 700 && manners.resized.pages === 3 && Math.abs(manners.resized.pageW - manners.resized.colW) <= 1],
  ['Escape gives the notice back, not the room', manners.esc1.reading === false && manners.esc1.showing === true],
  ['…and KEEP THIS READING still works after it', manners.again === true],
  ['a click on the room around the card gives the notice back', manners.offCard.reading === false && manners.offCard.showing === true],
  ['…and the next Escape puts the notice down', manners.esc2 === false],
  ['no page errors, laptop', desk.errors.length === 0],
  ['no page errors, phone', ph.errors.length === 0],
  ['no page errors, the manners', manners.errors.length === 0],
];
console.log('');
for (const [what, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`);
for (const e of [...desk.errors, ...ph.errors, ...manners.errors]) console.log('  ERR', e);
console.log('\nframes: keep-r3-reading-{desk,phone}-{top,foot}.png · keep-r3-back-{desk,phone}.png');

await browser.close();
stop();
process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
