#!/usr/bin/env node
// tools/_flow-lever.mjs — the last mile: a tool call, from the provider to the room.
//
// The other probe (_tool-call.mjs) proves the deltas, the route and the mind. This one proves the
// only thing left: that a `deal_cards` event actually moves the furniture, and that a turn he
// talked through does not. It drives a real evening in a real browser against a dev server whose
// upstream is canned, so no key is needed and nothing is guessed:
//
//   PEPE_FAKE=1 npx vite --host 127.0.0.1 --port 5199 --strictPort
//   node tools/_flow-lever.mjs [--port 5199] [--out /abs/shot.png]
//
// It says a line that mentions cards and must NOT deal, then a line that asks for them and must.
// The upstream at the other end is a keyword stub, so this proves the WIRING and not the judgement:
// that a tool event reaches reveal and a talking turn leaves the table alone. What a model would
// actually decide is _tool-call.mjs's job, where the streams are written by hand.
import { chromium } from 'playwright';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const port = +(args.port ?? 5199);
const width = 1600, height = 900;
let bad = 0;
const fail = (m) => {
  bad++;
  console.log('  ✗ ' + m);
};
const ok = (m) => console.log('  ✓ ' + m);

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e?.stack ?? e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.route('**/@vite/client', (r) =>
  r.fulfill({
    contentType: 'application/javascript',
    body: 'export const createHotContext=()=>({on(){},send(){},accept(){},acceptExports(){},dispose(){},prune(){},invalidate(){},decline(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}',
  }),
);

const state = () =>
  page.evaluate(() => {
    const T = window.__theatre;
    return {
      provider: T.pieces.mind.provider,
      beat: T.pieces.flow.beat,
      intent: T.pieces.flow.intent,
      readings: T.pieces.flow.readings,
      shot: T.pieces.camera.current,
      picks: T.pieces.reveal.picks?.filter(Boolean).length ?? 0,
      asking: !!T.pieces.dialogue.asking,
      caption: (document.querySelector('#dialogue')?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120),
    };
  });
const until = async (fn, ms, what) => {
  const t0 = Date.now();
  for (;;) {
    const s = await state();
    if (fn(s)) return s;
    if (Date.now() - t0 > ms) throw new Error(`timed out waiting for ${what} (beat=${s.beat} intent=${s.intent} shot=${s.shot})`);
    await page.waitForTimeout(250);
  }
};
const field = '#dialogue input.keys';
async function type(text) {
  await page.waitForSelector(field, { timeout: 90000, state: 'attached' });
  await page.waitForTimeout(250);
  await page.fill(field, text);
  await page.keyboard.press('Enter');
  console.log(`     visitor: "${text}"`);
}

try {
  await page.goto(`http://127.0.0.1:${port}/?mute=1`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction('window.__theatreReady === true', null, { timeout: 180000 });
  await page.waitForFunction("window.__theatre?.pieces?.entrance?.mode === 'closed'", null, { timeout: 120000 });
  await page.mouse.click(width / 2, height / 2);
  const first = await until((s) => s.asking, 120000, 'the first open field');
  console.log(`\n  provider: ${first.provider}`);
  if (first.provider === 'none') fail('the dev server on this port has no provider: start it with PEPE_FAKE=1');

  // 1. a sentence with the deck all over it, and no ask in it. The room must not move.
  await type('my grandmother used to read the cards after supper');
  await page.waitForTimeout(4000);
  const after = await until((s) => s.asking, 90000, 'the field again');
  if (after.intent === 'draw' || after.picks > 0) fail(`the room dealt at a sentence nobody asked with (intent=${after.intent})`);
  else ok(`he talked and nothing moved (intent=${after.intent}, shot=${after.shot})`);

  // 2. the ask. The lever fires, and the whole chapter follows from it.
  await type('all right, read my cards');
  const dealt = await until((s) => s.intent === 'draw' || s.beat === 'shuffle' || s.beat === 'fan', 90000, 'the shuffle');
  ok(`the lever moved the room: intent=${dealt.intent}, beat=${dealt.beat}`);
  const fan = await until((s) => s.beat === 'fan' || s.picks > 0, 120000, 'the fan');
  ok(`the deck is fanned (shot=${fan.shot})`);
  for (let k = 0; k < 3; k++) {
    await until((s) => s.picks === k, 90000, `pick ${k + 1}`);
    await page.waitForTimeout(600);
    await page.evaluate(() => window.__theatre.pieces.reveal.pickRandom());
    await page.waitForTimeout(400);
  }
  const read = await until((s) => s.readings >= 1 && s.asking, 300000, 'the reading to end');
  ok(`three cards read: ${read.picks} on the cloth, and the conversation is open again`);
  const names = await page.evaluate(() => (window.__theatre.pieces.mind.spread ?? []).filter(Boolean).map((c) => c.name));
  ok(`on the table: ${names.join(', ')}`);
  if (names.length !== 3) fail(`the mind remembers ${names.length} cards, not three`);

  if (args.out) {
    await page.screenshot({ path: args.out });
    console.log(`  wrote ${args.out}`);
  }
} catch (e) {
  fail(String(e?.message ?? e));
}
if (errors.length) {
  bad += errors.length;
  console.log('\nPAGE ERRORS');
  for (const e of errors.slice(0, 6)) console.log('  ' + e.split('\n')[0]);
}
await browser.close();
console.log(`\n${bad ? `${bad} WRONG` : 'the room deals when he pulls the lever, and only then'}`);
process.exit(bad ? 1 : 0);
