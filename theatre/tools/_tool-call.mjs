// tools/_tool-call.mjs — the lever, end to end, with no provider on the machine.
//
// There is no way to call a model from here (the key in .env.local returns 401), so the plumbing is
// tested against a canned upstream instead. Four layers, each on its own:
//
//   1. THE ACCUMULATOR    OpenAI-shaped `tool_calls` deltas, one call cut across three or four
//                         chunks, the name split in half, the arguments cut mid-key, the array
//                         keyed by `index` and arriving out of order. This is the thing a naive
//                         accumulator gets wrong and it is tested on its own, first.
//   2. THE ROUTE          the real vite middleware, with a fake req/res, PEPE_FAKE replaying bytes
//                         through the real parser: what comes out has to be the SSE contract —
//                         data:{"t":…} … data:{"tool":…} … data:{"done":true}.
//   3. THE GUARD          a reading written out in prose, with a bare table. The sentence naming a
//                         card that is not there is struck, and the rest of the turn with it.
//   4. THE MIND           the real client piece against the same middleware: turn() → intent, and
//                         the room deals because he pulled the lever, not because a regex read the
//                         visitor's sentence.
//
//   node tools/_tool-call.mjs
import { Readable } from 'node:stream';
import { toolAccumulator, pepeApi, toolsFor, cardGate, FAKES } from '../server/pepe.mjs';

let bad = 0;
const fail = (m) => {
  bad++;
  console.log('  ✗ ' + m);
};
const ok = (m) => console.log('  ✓ ' + m);
const is = (got, want, what) => (got === want ? ok(`${what}: ${JSON.stringify(got)}`) : fail(`${what}: ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`));

// ---- 1. the accumulator --------------------------------------------------------------------------
console.log('\n1. TOOL_CALLS DELTAS, ACCUMULATED');
{
  // the shape a provider actually sends: id and name in the first delta, arguments in pieces
  const a = toolAccumulator();
  a.delta([{ index: 0, id: 'call_1', type: 'function', function: { name: 'deal_cards', arguments: '' } }]);
  a.delta([{ index: 0, function: { arguments: '{"ab' } }]);
  a.delta([{ index: 0, function: { arguments: 'out":"the ' } }]);
  a.delta([{ index: 0, function: { arguments: 'shed"}' } }]);
  const out = a.done();
  is(out.length, 1, 'one call out of four deltas');
  is(out[0]?.name, 'deal_cards', 'name');
  is(out[0]?.args?.about, 'the shed', 'arguments, cut mid-key and mid-word');
}
{
  // the name itself split, which some providers do
  const a = toolAccumulator();
  a.delta([{ index: 0, id: 'c', function: { name: 'show_' } }]);
  a.delta([{ index: 0, function: { name: 'cards', arguments: '{"card":' } }]);
  a.delta([{ index: 0, function: { arguments: '2}' } }]);
  const out = a.done();
  is(out[0]?.name, 'show_cards', 'a name split across two deltas');
  is(out[0]?.args?.card, 2, 'an argument split at the colon');
}
{
  // index is the key, not the position: a second call arriving first must not overwrite the first
  const a = toolAccumulator();
  a.delta([{ index: 1, id: 'b', function: { name: 'show_cards', arguments: '{}' } }]);
  a.delta([{ index: 0, id: 'a', function: { name: 'deal_cards', arguments: '{}' } }]);
  const out = a.done();
  is(out.map((c) => c.name).join(','), 'deal_cards,show_cards', 'two calls, keyed by index, back in order');
}
{
  const a = toolAccumulator();
  a.delta([{ index: 0, id: 'x', function: { name: 'deal_cards', arguments: '{"about":"unfinis' } }]);
  is(a.done()[0]?.name, 'deal_cards', 'a truncated argument still leaves a usable call');
  const b = toolAccumulator();
  b.delta([{ index: 0, id: 'y', function: { name: 'burn_the_room', arguments: '{}' } }]);
  is(b.done().length, 0, 'a name the room does not know is dropped');
}
{
  is(toolsFor({ tools: ['deal_cards', 'show_cards'], spread: [] }).join(','), 'deal_cards', 'no cards down: show_cards is not offered');
  is(toolsFor({ tools: ['deal_cards', 'show_cards'], spread: [{ name: 'The Fool' }] }).join(','), 'deal_cards,show_cards', 'cards down: both');
  is(toolsFor({ tools: ['deal_cards', 'rm_rf'], spread: [] }).join(','), 'deal_cards', 'a name the client made up is dropped');
  is(toolsFor({ spread: [] }).length, 0, 'a body that asks for nothing gets no tools at all');
}

// ---- the route, driven with a fake req/res --------------------------------------------------------
// The real middleware, off the real plugin. Nothing is stubbed but the upstream bytes.
function middleware() {
  const plugin = pepeApi();
  let fn = null;
  plugin.configureServer({
    config: { root: process.cwd(), logger: { info: () => {}, warn: (m) => logs.push(m) } },
    middlewares: { use: (f) => (fn = f) },
  });
  return fn;
}
const logs = [];

async function post(body) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.url = '/api/pepe';
  req.method = 'POST';
  req.socket = { remoteAddress: '127.0.0.1' };
  const chunks = [];
  const res = {
    statusCode: 0,
    headers: {},
    writableEnded: false,
    setHeader(k, v) {
      this.headers[k] = v;
    },
    flushHeaders() {},
    write(s) {
      chunks.push(s);
    },
    end(s) {
      if (s) chunks.push(s);
      this.writableEnded = true;
      this.done?.();
    },
  };
  const finished = new Promise((r) => (res.done = r));
  await mw(req, res, () => res.end());
  await finished;
  // → the events, in order
  return chunks
    .join('')
    .split('\n\n')
    .filter((l) => l.startsWith('data:'))
    .map((l) => JSON.parse(l.slice(5)));
}
const textOf = (evs) => evs.filter((e) => e.t).map((e) => e.t).join('');
const toolOf = (evs) => evs.find((e) => e.tool)?.tool ?? null;

process.env.OPENROUTER_API_KEY = '';
process.env.ANTHROPIC_API_KEY = '';
const mw = middleware();

// ---- 2. the route --------------------------------------------------------------------------------
console.log('\n2. THE ROUTE, PROVIDER FAKED');
{
  process.env.PEPE_FAKE = 'talk';
  const evs = await post({ beat: 'talk', user: 'i keep starting things', tools: ['deal_cards'] });
  is(toolOf(evs), null, 'a talking turn calls nothing');
  is(evs[evs.length - 1]?.done, true, 'the stream ends with done');
  is(/Since when\?$/.test(textOf(evs).trim()), true, `the text arrives whole: "${textOf(evs).trim().slice(-24)}"`);
}
{
  process.env.PEPE_FAKE = 'deal';
  const evs = await post({ beat: 'talk', user: 'all right, read my cards', tools: ['deal_cards'] });
  const tool = toolOf(evs);
  is(tool?.name, 'deal_cards', 'the lever comes through as an event of its own');
  is(tool?.args?.about, 'the shed', 'its arguments survive being cut across three chunks and the SSE frames');
  is(textOf(evs).trim(), 'Very well.', 'and the sentence he said with it is still text');
  is(evs.findIndex((e) => e.tool) < evs.findIndex((e) => e.done), true, 'the tool event lands before done');
}
{
  process.env.PEPE_FAKE = 'deal-silent';
  const evs = await post({ beat: 'talk', user: 'go on then', tools: ['deal_cards'] });
  is(toolOf(evs)?.name, 'deal_cards', 'a lever with not one word of text');
  is(textOf(evs), '', 'and no text');
  is(evs[evs.length - 1]?.done, true, 'still a finished stream, not an empty reply');
}
{
  process.env.PEPE_FAKE = 'show';
  const spread = [{ position: 0, name: 'The Fool' }, { position: 1, name: 'The Star' }, { position: 2, name: 'The House of God' }];
  const evs = await post({ beat: 'followup', user: 'what was the middle one', tools: ['deal_cards', 'show_cards'], spread });
  is(toolOf(evs)?.name, 'show_cards', 'show_cards, with cards on the table');
  is(toolOf(evs)?.args?.card, 2, 'and which one they meant');
}
{
  process.env.PEPE_FAKE = 'show';
  const evs = await post({ beat: 'talk', user: 'show me my cards', tools: ['deal_cards', 'show_cards'], spread: [] });
  is(toolOf(evs), null, 'with a bare table show_cards is never on the call, so it cannot be pulled');
}

// ---- 3. the guard --------------------------------------------------------------------------------
console.log('\n3. A READING WRITTEN OUT IN PROSE');
{
  process.env.PEPE_FAKE = 'prose';
  const evs = await post({ beat: 'talk', user: 'read my cards', tools: ['deal_cards'], spread: [] });
  const text = textOf(evs).trim();
  is(text, 'Very well.', `struck at the first card named: "${text}"`);
  is(/The Moon/.test(text), false, 'and everything behind it went too');
}
{
  process.env.PEPE_FAKE = 'fourth';
  const spread = [{ position: 0, name: 'The House of God' }];
  const evs = await post({ beat: 'reading', cardName: 'The House of God', position: 0, spread });
  const text = textOf(evs).trim();
  is(/tower/.test(text), true, 'the card he is actually reading is his to describe');
  is(/The Star/.test(text), false, 'a card that is not on the table is not');
}
{
  process.env.PEPE_FAKE = 'prose-only';
  const evs = await post({ beat: 'talk', user: 'read my cards', spread: [] });
  is(textOf(evs), '', 'a turn that was nothing but a fabricated reading reaches the visitor as nothing');
  is(evs.some((e) => e.error === 'struck'), true, 'and is reported as struck, so the client falls back to the script');
}
{
  // the guard must not eat ordinary sentences: only the printed name is a card
  const g = cardGate({ spread: [] });
  const keep = ['The sun will be up by then. ', 'You said "just", which is a word people put in front of the thing that is not just. ', 'Death is not the subject; the shed is. '];
  const out = keep.flatMap((s) => g.push(s)).join('');
  is(g.struck, null, 'lower case suns, justs and deaths are English and are left alone');
  is(out.length > 60, true, 'and they all came through');
}
{
  const g = cardGate({ spread: [] });
  g.push('You brought the hanged man, upside down and patient. ');
  is(g.struck, 'the hanged man', 'a name nobody says by accident counts in any case at all');
  const h = cardGate({ spread: [] });
  h.push('That is the three of swords, and it is not a good one. ');
  is(h.struck?.toLowerCase(), 'three of swords', 'so does a minor arcana');
  const i = cardGate({ spread: [{ name: 'The Star' }] });
  i.push('The Star is the one to look at. ');
  is(i.struck, null, 'a card that IS on the table may be named');
}
{
  process.env.PEPE_GUARD = '0';
  process.env.PEPE_FAKE = 'prose';
  const evs = await post({ beat: 'talk', user: 'read my cards', tools: ['deal_cards'], spread: [] });
  is(/The Moon/.test(textOf(evs)), true, 'PEPE_GUARD=0 turns it off, for a round that wants to see what he really wrote');
  delete process.env.PEPE_GUARD;
}

// ---- 4. the mind, against the same middleware ----------------------------------------------------
console.log('\n4. THE MIND: HE DECIDES, AND THE ROOM DEALS');
globalThis.window = globalThis.window ?? {};
globalThis.fetch = async (url, init) => {
  if (String(url).includes('/health')) return { ok: true, json: async () => ({ ok: true, provider: 'fake', model: `fake/${process.env.PEPE_FAKE}` }) };
  const evs = await post(JSON.parse(init.body));
  const body = evs.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
  return {
    ok: true,
    body: {
      getReader() {
        let sent = false;
        return {
          read: async () => (sent ? { done: true } : ((sent = true), { done: false, value: new TextEncoder().encode(body) })),
        };
      },
    },
  };
};
const { build } = await import('../src/pieces/mind.js');
const mind = await build({ dom: { ui: null }, params: new Map(), log: () => {} });
await mind.ready;

async function turn(text) {
  const t = await mind.turn(text);
  const lines = [];
  for await (const s of t.sentences) lines.push(s);
  console.log(`     [${t.intent.padEnd(8)}] ${text}`);
  console.log(`                ${lines.join(' ') || '(not a word; his hand is on the deck)'}`);
  return { ...t, line: lines.join(' ') };
}
{
  process.env.PEPE_FAKE = 'talk';
  const t = await turn('my grandmother used to read the cards');
  is(t.intent, 'talk', 'a sentence with "read the cards" in it, and he did not deal');
}
{
  process.env.PEPE_FAKE = 'deal';
  const t = await turn('what do the cards say about my brother');
  is(t.intent, 'draw', 'an indirect ask no pattern was ever going to catch');
  is(t.tool?.name, 'deal_cards', 'and the reason is a lever, not a regex');
  is(t.line, 'Very well.', 'the sentence he said with it becomes the shuffle line');
  // what he said the reading was for comes back to him on the shuffle beat, once
  const seen = [];
  const spy = globalThis.fetch;
  globalThis.fetch = async (u, init) => (String(u).includes('/health') ? spy(u, init) : (seen.push(JSON.parse(init.body)), spy(u, init)));
  for await (const _ of mind.reply({ beat: 'shuffle' }));
  for await (const _ of mind.reply({ beat: 'shuffle' }));
  globalThis.fetch = spy;
  is(seen[0]?.about, 'the shed', 'the shuffle direction is told what he took it to be about');
  is(seen[1]?.about, undefined, 'and it is spent: the next shuffle is not still about the shed');
}
{
  process.env.PEPE_FAKE = 'deal-silent';
  const t = await turn('go on then');
  is(t.intent, 'draw', 'the lever alone deals');
  is(t.sentences.length, 0, 'and flow is handed no sentences, so it asks him for the shuffle beat');
}
{
  // three cards down, and he is asked to look at one again
  for (const [i, slug] of ['the-fool', 'the-star', 'the-house-of-god'].entries()) {
    process.env.PEPE_FAKE = 'talk';
    for await (const _ of mind.reply({ beat: 'reading', slug, position: i }));
  }
  is(mind.spread.filter(Boolean).length, 3, 'three cards on the table');
  process.env.PEPE_FAKE = 'show';
  const t = await turn('which one was the middle');
  is(t.intent, 'recall', 'show_cards is a recall');
  is(t.focus, 1, 'and the card he named is the one the camera goes to');
}
{
  // he answered in words and did not pull show_cards. Showing what is already on the cloth costs
  // nothing and reverses nothing, so the anchored recall patterns still move the camera. Dealing
  // gets no such net, and the case below is the proof of it.
  process.env.PEPE_FAKE = 'talk';
  const t = await turn('show me my cards again');
  is(t.intent, 'recall', 'a missed show_cards still gets the camera to the cards, because that is free');
}
{
  process.env.PEPE_FAKE = 'talk';
  const t = await turn('read my cards');
  is(t.intent, 'talk', 'a plain ask he did NOT act on stays talk: nothing but the lever deals');
}
{
  process.env.PEPE_FAKE = 'talk';
  const t = await turn('thank you, I should go');
  is(t.intent, 'farewell', 'the farewell is the visitor’s own word and is still read by the regex');
}
{
  // the electricity goes off mid-visit: the written brain reads the line, exactly as before
  const live = globalThis.fetch;
  globalThis.fetch = async (url, init) => (String(url).includes('/health') ? live(url, init) : { ok: false, status: 503, json: async () => ({ error: 'no provider' }) });
  const t = await turn('all right, read my cards');
  is(t.intent, 'draw', 'a dead call falls back to the regex, and the shuffle line is the script’s');
  is(t.line.length > 0, true, 'and he still says something');
  globalThis.fetch = live;
}

console.log(`\n${bad ? `${bad} WRONG` : 'all correct'}`);
process.exit(bad ? 1 : 0);
