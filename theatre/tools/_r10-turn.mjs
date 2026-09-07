// ONE TYPED TURN, END TO END, with no voice anywhere in the build: he says the question, the
// field opens under it, the visitor types and presses Return, their register empties and stays
// reserved, the thinking dots take his register, and his answer replaces the question. Also counts
// pepeAnim.say — once per sentence, which is the contract removing the voice must not have moved.
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await page.route('**/@vite/client', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: `export function createHotContext(){return{accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){},data:{}};} export function updateStyle(){} export function removeStyle(){} export function injectQuery(u){return u;} export class ErrorOverlay{}` }),
);
await page.goto('http://127.0.0.1:5173/?view=dialogue&state=greeting', { waitUntil: 'load', timeout: 180000 });
for (let i = 0; i < 600; i++) {
  if (await page.evaluate(() => window.__theatreReady === true).catch(() => false)) break;
  await page.waitForTimeout(200);
}

// spy on the mouth
await page.evaluate(() => {
  const A = window.__theatre.pieces.pepeAnim;
  window.__mouth = [];
  const orig = A.say.bind(A);
  A.say = (text, seconds) => { window.__mouth.push({ text: String(text).slice(0, 40), seconds: Math.round(seconds * 100) / 100 }); return orig(text, seconds); };
});

const step1 = await page.evaluate(async () => {
  const D = window.__theatre.pieces.dialogue;
  const cap = document.querySelector('#dialogue .cap');
  const txt = (s) => (cap.querySelector(s)?.textContent ?? '').replace(/\s+/g, ' ').trim();
  D.clear();
  window.__mouth.length = 0;
  const pending = D.ask('What did you come in for?', { hold: 0.3 });
  window.__pending = pending;
  for (let i = 0; i < 300 && !cap.querySelector('input.keys'); i++) await new Promise((r) => setTimeout(r, 60));
  const input = cap.querySelector('input.keys');
  return {
    mouth: [...window.__mouth],
    hisQuestion: txt('.well'),
    fieldOpen: !!input,
    theirRegisterEmpty: txt('.reply') === '',
    replyBox: (() => { const r = cap.querySelector('.reply')?.getBoundingClientRect(); return r ? `${r.width.toFixed(1)}x${r.height.toFixed(1)}` : null; })(),
    cardBox: (() => { const r = cap.getBoundingClientRect(); return `${r.x.toFixed(1)},${r.y.toFixed(1)} ${r.width.toFixed(1)}x${r.height.toFixed(1)}`; })(),
    micInDom: document.querySelectorAll('#dialogue .mic').length,
  };
});

// the visitor types, for real, into the hidden input
await page.click('#dialogue input.keys');
await page.type('#dialogue input.keys', 'I keep starting things and not finishing them.', { delay: 12 });
const mid = await page.evaluate(() => {
  const cap = document.querySelector('#dialogue .cap');
  return {
    theirWordsDrawn: (cap.querySelector('.reply')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
    caretUp: !!cap.querySelector('.caret'),
    cardBox: (() => { const r = cap.getBoundingClientRect(); return `${r.x.toFixed(1)},${r.y.toFixed(1)} ${r.width.toFixed(1)}x${r.height.toFixed(1)}`; })(),
  };
});
await page.press('#dialogue input.keys', 'Enter');

const step2 = await page.evaluate(async () => {
  const D = window.__theatre.pieces.dialogue;
  const cap = document.querySelector('#dialogue .cap');
  const txt = (s) => (cap.querySelector(s)?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const answer = await window.__pending;
  const afterReturn = { theirRegister: txt('.reply'), hisLineStillUp: txt('.well'), fieldGone: !cap.querySelector('input.keys') };
  // his turn: the dots, then the reply
  D.thinking(true);
  await new Promise((r) => setTimeout(r, 700));
  const dots = !!cap.querySelector('.dots') || !!cap.querySelector('svg.dots') || txt('.well') === '';
  D.thinking(false);
  window.__mouth.length = 0;
  await D.say(D.reply(answer), { hold: 0.4 });
  return {
    answer,
    afterReturn,
    dotsStruck: dots,
    hisReply: txt('.well'),
    mouth: [...window.__mouth],
    theirRegisterStillEmpty: txt('.reply') === '',
    cardBox: (() => { const r = cap.getBoundingClientRect(); return `${r.x.toFixed(1)},${r.y.toFixed(1)} ${r.width.toFixed(1)}x${r.height.toFixed(1)}`; })(),
    micInDom: document.querySelectorAll('#dialogue .mic').length,
  };
});

console.log('--- he asks -----------------------------------------------------------');
console.log(`  his question   "${step1.hisQuestion}"`);
console.log(`  pepeAnim.say   ${JSON.stringify(step1.mouth)}`);
console.log(`  field open     ${step1.fieldOpen}     their register empty & reserved ${step1.theirRegisterEmpty} (${step1.replyBox})`);
console.log(`  mic in the dom ${step1.micInDom}`);
console.log('--- they type ---------------------------------------------------------');
console.log(`  drawn in ink   "${mid.theirWordsDrawn}"`);
console.log(`  caret up       ${mid.caretUp}`);
console.log('--- they press Return -------------------------------------------------');
console.log(`  ask resolved   "${step2.answer}"`);
console.log(`  their register "${step2.afterReturn.theirRegister}"  field gone ${step2.afterReturn.fieldGone}  his line still up "${step2.afterReturn.hisLineStillUp.slice(0, 40)}"`);
console.log(`  thinking mark  ${step2.dotsStruck}`);
console.log('--- he answers --------------------------------------------------------');
console.log(`  his reply      "${step2.hisReply}"`);
console.log(`  pepeAnim.say   ${JSON.stringify(step2.mouth)}`);
console.log(`  their register still empty ${step2.theirRegisterStillEmpty}   mic in the dom ${step2.micInDom}`);
console.log('--- the card never moved ----------------------------------------------');
console.log(`  ${step1.cardBox}  →  ${mid.cardBox}  →  ${step2.cardBox}`);
console.log(step1.cardBox === mid.cardBox && mid.cardBox === step2.cardBox ? '  one size, one place, all through the turn' : '  << THE CARD MOVED');
console.log(errs.length ? '\nPAGE ERRORS:\n' + errs.map((e) => ' - ' + e).join('\n') : '\nno page errors');
await browser.close();
process.exit(errs.length ? 1 : 0);
