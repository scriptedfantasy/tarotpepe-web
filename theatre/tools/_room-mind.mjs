// tools/_room-mind.mjs — the real mind piece, end to end, with no live voice.
//
// This is the path a visitor's line actually takes: mind.turn(text) → intent + beat → reply() →
// the script. It is run with the endpoint answering "no provider", which is the state the show is
// in today (the OpenRouter key has no credit), so what it prints is what a visitor gets tonight.
//
// The three things it proves, and they are the ones that could not be proved by a regex:
//   · an object question is a 'talk' turn. Nothing is dealt, nothing shuffled, no camera move.
//   · with three cards face up, "why do you keep a barometer" is still the barometer and not a
//     card — the object is read BEFORE aboutTheSpread, which would otherwise take it.
//   · the story is told once, and told differently the second time, out of one visit's memory.
import { build } from '../src/pieces/mind.js';

// no provider: the health endpoint says so, and every turn falls to the script
globalThis.fetch = async (url) => {
  if (String(url).includes('/health')) return { ok: true, json: async () => ({ ok: false, provider: 'none', model: null }) };
  return { ok: false, status: 503, json: async () => ({ error: 'no provider' }) };
};
globalThis.window = globalThis.window ?? {};
const ctx = { dom: { ui: null }, params: new Map(), log: () => {} };

const mind = await build(ctx);
await mind.ready;
let bad = 0;
const fail = (m) => {
  bad++;
  console.log('  ✗ ' + m);
};

async function say(text, wantIntent) {
  const t = mind.turn(text);
  const out = [];
  for await (const s of t.sentences) out.push(s);
  const line = out.join(' ');
  console.log(`  [${t.intent.padEnd(8)}] VISITOR  ${text}`);
  console.log(`             PEPE     ${line}`);
  if (wantIntent && t.intent !== wantIntent) fail(`"${text}" → intent ${t.intent}, wanted ${wantIntent}`);
  return { intent: t.intent, line };
}

console.log('provider:', mind.provider, '(the script, which is what a visitor gets tonight)\n');

console.log('BEFORE THE CARDS');
await say('I keep starting things and not finishing them.', 'talk');
const g1 = await say('what is the globe', 'talk');
await say("what's in the tin", 'talk');
await say('what is the radiator', 'talk');
await say('is there a chair', 'talk');
await say("what's that", 'talk');
await say('my grandmother had a globe like that in her hall', 'talk');
if (mind.hasSpread) fail('a story put cards on the table');

console.log('\nTHE VISITOR ASKS FOR THE CARDS');
await say('all right, read my cards', 'draw');
for (const [i, slug] of ['the-fool', 'the-house-of-god', 'the-star'].entries()) {
  const out = [];
  for await (const s of mind.reply({ beat: 'reading', slug, position: i })) out.push(s);
  console.log(`             PEPE     ${out.join(' ')}`);
}

console.log('\nWITH THREE CARDS FACE UP');
await say('what does the middle one mean', 'talk'); // a card: the follow-up, unchanged
const b = await say('why do you keep a barometer', 'talk'); // an object: still the object
if (!/CERN|physicist|barometer/i.test(b.line)) fail('the barometer became a card');
if (/House of God|The Star|The Fool/.test(b.line)) fail('a card answered a question about the barometer');
const w = await say('what is the world', 'talk'); // The World is NOT on the table → the globe
if (!/globe|receiver|bicycle/i.test(w.line)) fail('"the world" on this table should be the globe');
const g2 = await say('tell me about the globe', 'talk');
if (g2.line === g1.line) fail('the globe was told with the same sentences twice');
if (!/four|receiver|globe/i.test(g2.line)) fail('the second telling lost the fact');
await say('show me my cards again', 'recall');
await say('thank you, good night', 'farewell');

console.log(bad ? `\n${bad} FAILURES` : '\nall correct');
process.exit(bad ? 1 : 0);
