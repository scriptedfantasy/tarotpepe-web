#!/usr/bin/env node
// round 11: the visitor's field, on a phone, driven by a thumb.
//
// WHAT IT MEASURES. iOS Safari and Android Chrome raise the keyboard for input.focus() only while
// the gesture that asked for it is still in force — and only if the field still HAS the focus once
// the rest of that gesture (the compatibility mouse events, ~15 ms later) has been delivered. Both
// halves are measured directly: HTMLElement.prototype.focus is patched to record whether a gesture
// flag is up, and the flag is raised in the capture phase of every gesture event and lowered on the
// next macrotask. navigator.userActivation.isActive is NOT used: it read true 33 s after the last
// tap in this build.
//
//   node tools/_dlg-r11-touch.mjs [runs] [patient|impatient|hurried] [--head]   PAR=n  TAP_MS=n
//
// patient    the visitor waits and reads: no taps after the door
// impatient  the visitor taps the picture to read on, every 1.4 s
// hurried    the same, every 0.35 s — often enough to be the thing that finishes his last take
import { chromium, devices } from 'playwright';

// The dev server to drive. A builder running a server of their own passes BASE; the default is the
// user's own on 5173, so nothing that ran before this line runs differently.
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';

const RUNS = +(process.argv[2] ?? 3);
const MODE = process.argv.includes('patient') ? 'patient' : process.argv.includes('hurried') ? 'hurried' : 'impatient';
const TAP_MS = +(process.env.TAP_MS ?? (MODE === 'hurried' ? 350 : 1400));
const PAR = +(process.env.PAR ?? 3);
const iPhone = devices['iPhone 14'];

const INSTRUMENT = () => {
  window.__log = [];
  const stamp = () => +(performance.now() / 1000).toFixed(3);
  const desc = (el) => {
    if (!el) return 'null';
    if (el === document.body) return 'body';
    return `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ').join('.') : ''}`;
  };
  // THE METRIC. WebKit and Blink raise the on-screen keyboard for focus() only while the gesture
  // that caused it is still in force. navigator.userActivation.isActive is useless here (it read
  // true 33 s after the last tap in this build), so the flag is measured directly: set in a
  // capture-phase listener on every gesture event, cleared on the next MACROtask. A promise
  // continuation of something the gesture resolved runs as a microtask and still sees it — which is
  // exactly the case a phone raises a keyboard for; anything the clock did runs later and does not.
  window.__inGesture = null;
  for (const g of ['pointerdown', 'pointerup', 'touchend', 'mousedown', 'click'])
    window.addEventListener(g, () => {
      window.__inGesture = g;
      setTimeout(() => { window.__inGesture = null; }, 0);
    }, true);
  const F = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (...a) {
    if (this.classList?.contains('keys')) {
      const el = this;
      window.__log.push({
        t: stamp(),
        ev: 'focus()',
        gesture: window.__inGesture ?? false,
        // where the call came from, trimmed to the frames that matter
        from: (new Error().stack || '').split('\n').slice(1, 5).map((s) => s.trim().replace(/https?:\/\/[^ )]+\//, '')).join(' | '),
      });
      // and did it SURVIVE the rest of the gesture (the compatibility mouse events land ~15 ms on)?
      setTimeout(() => window.__log.push({ t: stamp(), ev: 'after-150ms', active: desc(document.activeElement), held: document.activeElement === el }), 150);
    }
    return F.apply(this, a);
  };
  document.addEventListener('focusin', (e) => {
    if (e.target?.classList?.contains('keys')) window.__log.push({ t: stamp(), ev: 'focusin', target: desc(e.target) });
  }, true);
  document.addEventListener('focusout', (e) => {
    if (e.target?.classList?.contains('keys')) window.__log.push({ t: stamp(), ev: 'focusout', to: desc(e.relatedTarget), active: desc(document.activeElement) });
  }, true);
  for (const name of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'click'])
    window.addEventListener(name, (e) => {
      window.__log.push({ t: stamp(), ev: name, target: desc(e.target), defaultPrevented: e.defaultPrevented, active: desc(document.activeElement) });
    }, true);
  const B = HTMLElement.prototype.blur;
  HTMLElement.prototype.blur = function (...a) {
    if (this.classList?.contains('keys')) window.__log.push({ t: stamp(), ev: 'blur()', from: (new Error().stack || '').split('\n').slice(1, 4).map((s) => s.trim().replace(/https?:\/\/[^ )]+\//, '')).join(' | ') });
    return B.apply(this, a);
  };
  const R = Element.prototype.remove;
  Element.prototype.remove = function (...a) {
    if (this.classList?.contains('keys')) window.__log.push({ t: stamp(), ev: 'input.remove()', from: (new Error().stack || '').split('\n').slice(1, 4).map((s) => s.trim().replace(/https?:\/\/[^ )]+\//, '')).join(' | ') });
    return R.apply(this, a);
  };
  // the field standing up, and the field going away
  const seen = new MutationObserver(() => {
    const has = !!document.querySelector('#dialogue input.keys');
    if (has !== seen.__had) {
      seen.__had = has;
      window.__log.push({ t: stamp(), ev: has ? 'field-open' : 'field-close', active: desc(document.activeElement) });
    }
  });
  seen.__had = false;
  addEventListener('DOMContentLoaded', () => seen.observe(document.getElementById('overlay') ?? document.body, { childList: true, subtree: true }));
};

const NO_HMR =
  'export const createHotContext=()=>({on(){},send(){},accept(){},dispose(){},prune(){},invalidate(){},decline(){}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;';

async function one(browser, n) {
  const ctxOpts = { ...iPhone, deviceScaleFactor: 1 };
  const context = await browser.newContext(ctxOpts);
  await context.addInitScript(INSTRUMENT);
  const page = await context.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.route('**/@vite/client', (r) => r.fulfill({ contentType: 'application/javascript', body: NO_HMR }));
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 120000 });
  const W = iPhone.viewport.width, H = iPhone.viewport.height;

  // 1. the door: the visitor's knock
  await page.waitForTimeout(900);
  await page.touchscreen.tap(W / 2, H / 2);

  // 2. wait for the field, tapping to read on if this visitor is the tapping kind
  const t0 = Date.now();
  let opened = false;
  while (Date.now() - t0 < 70000) {
    const s = await page.evaluate(() => {
      const T = window.__theatre;
      const D = T?.pieces?.dialogue;
      const cap = document.querySelector('#dialogue .cap');
      const input = document.querySelector('#dialogue input.keys');
      const r = cap && !cap.hidden ? cap.getBoundingClientRect() : null;
      return {
        asking: !!D?.asking,
        beat: T?.pieces?.flow?.beat,
        arrow: !!document.querySelector('#dialogue .next:not([hidden])'),
        card: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
        input: !!input,
        active: document.activeElement?.className ?? document.activeElement?.tagName,
      };
    });
    if (s.asking && s.input) {
      opened = true;
      await page.waitForTimeout(300); // let the gesture's compatibility mouse events land
      break;
    }
    if (MODE !== 'patient' && s.card) {
      // a thumb on the picture, the way a visitor hurries a caption along: above the card,
      // clear of it, so it is flow's own pointer handler that sees it
      const y = Math.max(80, s.card.y - 60);
      await page.touchscreen.tap(W / 2, y);
    }
    await page.waitForTimeout(MODE === 'patient' ? 500 : TAP_MS);
  }

  // 3. what the field looked like the moment it opened
  const atOpen = await page.evaluate(() => {
    const input = document.querySelector('#dialogue input.keys');
    const cap = document.querySelector('#dialogue .cap');
    const r = cap ? cap.getBoundingClientRect() : null;
    return {
      focused: document.activeElement === input,
      active: document.activeElement?.className || document.activeElement?.tagName,
      card: r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) } : null,
      innerH: window.innerHeight,
      vvH: Math.round(window.visualViewport?.height ?? -1),
      log: window.__log,
    };
  });

  // 4a. THE VISITOR'S NEXT TAP, wherever it naturally lands — on the picture, above the card.
  //     A phone raises a keyboard for it only if it focuses the field inside that gesture.
  const mark = () => page.evaluate(() => (window.__mark = window.__log.length));
  const since = () =>
    page.evaluate(() => {
      const l = window.__log.slice(window.__mark ?? 0);
      const f = l.filter((e) => e.ev === 'focus()');
      const input = document.querySelector('#dialogue input.keys');
      return { focusCalls: f, inGesture: f.some((e) => e.gesture), focused: document.activeElement === input, present: !!input };
    });
  let firstTap = null, cardTap = null;
  if (opened && atOpen.card) {
    await mark();
    await page.touchscreen.tap(W / 2, Math.max(80, atOpen.card.top - 60));
    await page.waitForTimeout(300);
    firstTap = await since();
    // 4b. and a thumb on the card itself, which is what the card is FOR
    await mark();
    await page.touchscreen.tap(W / 2, atOpen.card.top + Math.round(atOpen.card.h / 2));
    await page.waitForTimeout(300);
    cardTap = await since();
  }
  const recovered = cardTap;

  // 5. and does typing actually land on the card?
  let typed = null;
  if (opened) {
    await page.keyboard.type('hello pepe', { delay: 40 });
    await page.waitForTimeout(200);
    typed = await page.evaluate(() => {
      const input = document.querySelector('#dialogue input.keys');
      const answer = document.querySelector('#dialogue .reply .answer');
      return { value: input?.value ?? null, drawn: (answer?.textContent ?? '').trim() };
    });
  }

  const focusCalls = (atOpen.log ?? []).filter((e) => e.ev === 'focus()');
  const held = (atOpen.log ?? []).filter((e) => e.ev === 'after-150ms');
  const out = {
    run: n,
    mode: MODE,
    opened,
    focusCalls,
    // a real phone raises the keyboard only if focus() ran inside the gesture's own task AND the
    // field still has the focus once the rest of that gesture has been delivered
    keyboard: focusCalls.some((e) => e.gesture) && held.some((e) => e.held),
    inGesture: focusCalls.some((e) => e.gesture),
    survived: held.length ? held[held.length - 1].held : null,
    // and after the visitor's own next tap — on the picture, then on the card. `focused` is read
    // 300 ms later, so it is also the answer to "did the rest of that gesture take it away again".
    tapAnywhere: firstTap ? !!firstTap.focused : null,
    tapAnywhereInGesture: firstTap ? !!firstTap.inGesture : null,
    tapOnCard: cardTap ? !!cardTap.focused : null,
    focused: atOpen.focused,
    card: atOpen.card,
    innerH: atOpen.innerH,
    recovered,
    typed,
    errs: errs.slice(0, 2),
    // only the gesture that actually opened the field, and everything after it
    log: (() => {
      const l = atOpen.log ?? [];
      const i = l.findIndex((e) => e.ev === 'focus()');
      return i < 0 ? l.slice(-16) : l.slice(Math.max(0, i - 10));
    })(),
  };
  await context.close();
  return out;
}

const browser = await chromium.launch({
  headless: !process.argv.includes('--head'),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const results = [];
for (let i = 0; i < RUNS; i += PAR) {
  const batch = [];
  for (let k = i; k < Math.min(RUNS, i + PAR); k++) batch.push(one(browser, k + 1));
  results.push(...(await Promise.all(batch)));
  console.log(`… ${results.length}/${RUNS}`);
}
await browser.close();

console.log(`\n=== ${MODE} visitor, ${iPhone.viewport.width}x${iPhone.viewport.height}, ${RUNS} runs ===`);
for (const r of results) {
  console.log(
    `run ${String(r.run).padStart(2)}  field ${r.opened ? 'open ' : 'NEVER'}  KEYBOARD-ON-OPEN ${r.keyboard ? 'YES' : 'no '}  (inGesture ${String(r.inGesture).padEnd(5)} survived ${String(r.survived).padEnd(5)})` +
      `  tapAnywhere ${String(r.tapAnywhere).padEnd(5)}(inGesture ${String(r.tapAnywhereInGesture).padEnd(5)})  tapOnCard ${String(r.tapOnCard).padEnd(5)}  typed "${r.typed?.value ?? ''}"  card ${r.card ? `${r.card.top}-${r.card.bottom} of ${r.innerH}` : '-'}`,
  );
  for (const f of r.focusCalls) console.log(`        focus() at ${f.t}s  gesture=${f.gesture}  from ${f.from}`);
  if (r.errs.length) console.log('        ERR', r.errs.join(' | '));
}
const n = (f) => results.filter(f).length;
console.log(`\nfield opened at all                      ${n((r) => r.opened)} of ${RUNS}`);
console.log(`keyboard on open, no tap needed          ${n((r) => r.keyboard)} of ${RUNS}`);
console.log(`... or after ONE tap on the picture      ${n((r) => r.keyboard || r.tapAnywhere)} of ${RUNS}`);
console.log(`... or after ONE tap on the card         ${n((r) => r.keyboard || r.tapAnywhere || r.tapOnCard)} of ${RUNS}`);
console.log(`typing reached the input                 ${n((r) => r.typed?.value)} of ${RUNS}`);
if (process.env.DUMP)
  for (const r of results) {
    console.log(`\n--- run ${r.run} ---`);
    for (const e of r.log) console.log(`  ${String(e.t).padStart(8)}  ${e.ev.padEnd(14)} ${e.target ?? ''} ${e.active ? 'active=' + e.active : ''} ${e.activation !== undefined ? 'activation=' + e.activation : ''} ${e.from ? '\n              ' + e.from : ''}`);
  }
