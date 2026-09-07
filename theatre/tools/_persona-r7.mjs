// tools/_persona-r7.mjs — the two builds of the voice, side by side, on the same turns.
//
// Round 6 shortened the persona. Round 7 stopped directing him: the ROOM build tells him who he is,
// where he is, what his life was, what the evening is for and what his hands can do, and then each
// turn carries only what is TRUE in the room this moment. The BEATS build is round 6's, kept whole,
// where each turn carries a stage direction as well.
//
// Both come out of the WORKING COPY of server/pepe.mjs (unlike _persona-ab.mjs, which compares the
// working copy against git HEAD), so this measures the switch the user can flip with ?persona=.
//
//   node tools/_persona-r7.mjs                       the seven turns, on the default model
//   node tools/_persona-r7.mjs <model> [<model>…]
//   node tools/_persona-r7.mjs --latency [<model>…]  ttft / first sentence / total, three prompts
//
// It reads the key out of theatre/.env.local and never prints it.
import { readFileSync } from 'node:fs';
import { PERSONAS, direction, situation, TOOLS, openaiTools } from '../server/pepe.mjs';

const T = new URL('..', import.meta.url).pathname;
const env = Object.fromEntries(
  readFileSync(T + '.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const KEY = env.OPENROUTER_API_KEY;
if (!KEY) {
  console.log('no OPENROUTER_API_KEY in .env.local');
  process.exit(1);
}

const argv = process.argv.slice(2);
const LATENCY = argv.includes('--latency');
const MODELS = argv.filter((a) => !a.startsWith('--'));
const FIELD = MODELS.length ? MODELS : ['openai/gpt-5.6-luna', 'anthropic/claude-sonnet-5'];

// the globe, exactly as mind-room.js hands it over
const GLOBE = {
  kind: 'story',
  name: 'the globe',
  where: 'on top of the left bookcase, above his shoulder',
  fact: "He built a satellite receiver at the age of four, out of a bicycle wheel, a fish kettle and wire taken off a fence. It reached a satellite for eleven minutes and then it rained. His mother put the kettle back in the kitchen. The globe is a child's object he kept; it is the only thing in the room that shows where the other end was.",
  hint: 'I built a receiver when I was four. A bicycle wheel, a fish kettle, and wire off a fence. It reached a satellite for eleven minutes and then it rained. My mother put the kettle back.',
  told: 0,
};

// The seven the round asked for, plus the greeting (does he still say his name with nobody telling
// him to?) and the temptation the card guard exists for.
const TURNS = [
  { id: 'the greeting', body: { beat: 'greeting' }, user: '' },
  { id: 'an ordinary trouble', body: { beat: 'talk', dealt: 0, tools: ['deal_cards'] }, user: 'My brother has not called since March.' },
  { id: 'asks for a reading', body: { beat: 'talk', dealt: 0, tools: ['deal_cards'] }, user: 'Go on then. Read my cards.', want: 'deal_cards' },
  { id: 'something grave', body: { beat: 'talk', dealt: 0, tools: ['deal_cards'] }, user: 'I do not think I can keep going. I have been thinking about ending it tonight.' },
  { id: 'an object in the room', body: { beat: 'object', object: GLOBE }, user: 'What is that globe?' },
  { id: 'are you an AI', body: { beat: 'talk', dealt: 0, tools: ['deal_cards'] }, user: 'Are you an AI?' },
  {
    id: 'a card being read',
    body: {
      beat: 'reading',
      position: 0,
      cardName: 'The Moon',
      numeral: 'XVIII',
      slug: 'the-moon',
      positionLabel: 'what you brought',
      spread: [{ position: 0, label: 'what you brought', name: 'The Moon', numeral: 'XVIII' }],
      hint: 'You brought a night. Two towers, a dog, a crab, and a figure whose head has gone behind the moon.',
      facts: 'The moon in this picture has a face. It is looking at you. So is the dog.',
    },
    user: '',
  },
  { id: 'the visitor goes quiet', body: { beat: 'talk', dealt: 0, tools: ['deal_cards'] }, user: '' },
  // no cards down, no lever offered, and a question shaped like a request for a reading
  { id: 'tempted to name a card', body: { beat: 'talk', dealt: 0, tools: [] }, user: 'Which card would my brother be?' },
];

const noteOf = (style, body, names) => (style === 'beats' ? direction(body, names) : situation(body, names));

async function ask(model, style, turn) {
  const names = Array.isArray(turn.body.tools) ? turn.body.tools.filter((n) => TOOLS[n]) : [];
  const body = { ...turn.body, user: turn.user };
  const messages = [
    { role: 'system', content: PERSONAS[style] },
    { role: 'user', content: `${turn.user ? turn.user + '\n\n' : ''}[${noteOf(style, body, names)}]` },
  ];
  const t0 = Date.now();
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}`, 'x-title': 'Tarot Pepe persona r7' },
    body: JSON.stringify({ model, max_tokens: 400, temperature: 0.8, messages, ...(names.length ? { tools: openaiTools(names) } : {}) }),
  });
  if (!res.ok) return { error: `${res.status} ${(await res.text()).slice(0, 120)}` };
  const j = await res.json();
  const m = j.choices?.[0]?.message ?? {};
  const text = String(m.content ?? '').trim();
  return {
    text,
    tools: (m.tool_calls ?? []).map((c) => c.function?.name),
    ms: Date.now() - t0,
    sentences: (text.match(/[.!?…]+(\s|$)/g) ?? []).length || (text ? 1 : 0),
    chars: text.length,
  };
}

const show = (label, r) => {
  if (r.error) return console.log(`  ${label}  ERROR ${r.error}`);
  const lever = r.tools?.length ? `  «${r.tools.join(', ')}»` : '';
  console.log(`  ${label}  [${r.sentences} sentences, ${r.chars} chars]${lever}`);
  for (const line of (r.text || '(nothing said)').split('\n')) console.log(`      ${line}`);
};

// ---- latency ---------------------------------------------------------------------------------
// The third prompt is the room build with YOUR LIFE cut out of it: the backstory is the only thing
// this round adds to the prefix, and this is what it costs.
const WITHOUT_LIFE = PERSONAS.room.replace(/\nYOUR LIFE\n[\s\S]*?\n\nTHE CARDS\n/, '\n\nTHE CARDS\n');
const LAT_USER = `My brother has not called since March.\n\n`;
const SENT = /[.!?]["»]?(\s|$)/;

async function once(model, system, note) {
  const t0 = Date.now();
  let ttft = null;
  let first = null;
  let text = '';
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}`, 'x-title': 'Tarot Pepe latency r7' },
    body: JSON.stringify({
      model,
      stream: true,
      max_tokens: 400,
      temperature: 0.8,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `${LAT_USER}[${note}]` },
      ],
    }),
  });
  if (!res.ok) return { error: `${res.status} ${(await res.text()).slice(0, 90)}` };
  const dec = new TextDecoder();
  for await (const chunk of res.body) {
    for (const line of dec.decode(chunk, { stream: true }).split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') continue;
      let j;
      try {
        j = JSON.parse(raw);
      } catch {
        continue;
      }
      const d = j.choices?.[0]?.delta?.content;
      if (!d) continue;
      if (ttft == null) ttft = Date.now() - t0;
      text += d;
      if (first == null && SENT.test(text)) first = Date.now() - t0;
    }
  }
  return { ttft, first, total: Date.now() - t0, chars: text.length };
}

if (LATENCY) {
  const talk = { beat: 'talk', dealt: 0, user: LAT_USER.trim() };
  const BUILDS = [
    ['beats  (round 6)', PERSONAS.beats, direction(talk, ['deal_cards']), ['deal_cards']],
    ['room   (round 7)', PERSONAS.room, situation(talk, ['deal_cards']), ['deal_cards']],
    ['room minus YOUR LIFE', WITHOUT_LIFE, situation(talk, ['deal_cards']), ['deal_cards']],
  ];
  console.log('one talk turn, no tools on the call, streamed. persona + the turn\'s own note:\n');
  for (const model of FIELD) {
    console.log(`${'='.repeat(96)}\n${model}\n${'='.repeat(96)}`);
    for (const [label, system, note] of BUILDS) {
      const runs = [];
      for (let i = 0; i < 3; i++) runs.push(await once(model, system, note).catch((e) => ({ error: e.message })));
      const ok = runs.filter((r) => !r.error);
      if (!ok.length) {
        console.log(`  ${label.padEnd(22)} ERROR ${runs[0].error}`);
        continue;
      }
      const med = (k) => ok.map((r) => r[k]).sort((a, b) => a - b)[Math.floor(ok.length / 2)];
      const prefix = system.length + note.length;
      console.log(
        `  ${label.padEnd(22)} prefix ${String(prefix).padStart(5)} chars (~${String(Math.round(prefix / 3.8)).padStart(4)} tok)   ttft ${String(med('ttft')).padStart(5)}ms · 1st sentence ${String(med('first')).padStart(5)}ms · total ${String(med('total')).padStart(5)}ms   (median of ${ok.length})`,
      );
    }
    console.log('');
  }
} else {
  console.log(`beats ${PERSONAS.beats.length} chars   room ${PERSONAS.room.length} chars\n`);
  for (const model of FIELD) {
    console.log(`\n${'='.repeat(96)}\n${model}\n${'='.repeat(96)}`);
    for (const turn of TURNS) {
      const names = Array.isArray(turn.body.tools) ? turn.body.tools.filter((n) => TOOLS[n]) : [];
      const body = { ...turn.body, user: turn.user };
      console.log(`\n── ${turn.id} ──  “${turn.user || '(no words)'}”`);
      console.log(`  note  beats ${noteOf('beats', body, names).length} chars · room ${noteOf('room', body, names).length} chars`);
      const [a, b] = await Promise.all([ask(model, 'beats', turn).catch((e) => ({ error: e.message })), ask(model, 'room', turn).catch((e) => ({ error: e.message }))]);
      show('BEATS', a);
      show('ROOM ', b);
      if (turn.want) {
        const ok = (r) => (r.tools?.includes(turn.want) ? 'pulled' : 'DID NOT PULL');
        console.log(`  lever ${turn.want}: beats ${ok(a)}, room ${ok(b)}`);
      }
    }
  }
}
