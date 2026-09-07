// Which model is fast enough to talk to? The user: "most importantly i want a fast model, latency
// was too slow on what we used yesterday." This measures the two numbers that decide that, against
// the REAL persona and a real turn:
//
//   TTFT   time to the first token — how long the visitor stares at a still frame
//   FIRST  time to the first complete SENTENCE — what actually reaches the placard, because flow
//          yields by sentence, not by token
//   TOTAL  the whole turn
//
// It reads the key out of theatre/.env.local and never prints it.
//   node tools/_llm-latency.mjs                  the default field
//   node tools/_llm-latency.mjs <model> [<model>…]
import { readFileSync } from 'node:fs';

const T = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre/';
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

// the persona, lifted out of the server so the measurement is of the real prompt
const SYSTEM = readFileSync(T + 'server/pepe.mjs', 'utf8').match(/const SYSTEM = `([\s\S]*?)`;/)[1];
const USER =
  'My brother has not called since March.\n\n[Beat: talk. The deck is face down and nothing is on the table. Answer what they said. Two or three sentences.]';

const MODELS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['openai/gpt-5.6-luna', 'mistralai/mistral-nemo', 'google/gemini-3.8-flash', 'qwen/qwen3.8-flash', 'anthropic/claude-sonnet-5'];

const SENT = /[.!?]["»]?(\s|$)/;

async function once(model) {
  const t0 = Date.now();
  let ttft = null;
  let firstSentence = null;
  let text = '';
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}`, 'x-title': 'Tarot Pepe latency' },
    body: JSON.stringify({
      model,
      stream: true,
      max_tokens: 400,
      temperature: 0.8,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: USER },
      ],
    }),
  });
  if (!res.ok) return { model, error: `${res.status} ${(await res.text()).slice(0, 90)}` };
  const dec = new TextDecoder();
  for await (const chunk of res.body) {
    for (const line of dec.decode(chunk, { stream: true }).split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const body = line.slice(6).trim();
      if (body === '[DONE]') continue;
      let j;
      try {
        j = JSON.parse(body);
      } catch {
        continue;
      }
      const d = j.choices?.[0]?.delta?.content;
      if (!d) continue;
      if (ttft == null) ttft = Date.now() - t0;
      text += d;
      if (firstSentence == null && SENT.test(text)) firstSentence = Date.now() - t0;
    }
  }
  return { model, ttft, firstSentence, total: Date.now() - t0, chars: text.length, text: text.trim() };
}

console.log(`persona ${SYSTEM.length} chars (~${Math.round(SYSTEM.length / 3.8)} tokens), re-sent every turn\n`);
for (const m of MODELS) {
  const r = await once(m).catch((e) => ({ model: m, error: e.message }));
  if (r.error) {
    console.log(`${m.padEnd(30)} ERROR ${r.error}`);
    continue;
  }
  console.log(`${m.padEnd(30)} ttft ${String(r.ttft).padStart(5)}ms · 1st sentence ${String(r.firstSentence).padStart(5)}ms · total ${String(r.total).padStart(5)}ms · ${r.chars} chars`);
  console.log(`${' '.repeat(30)} “${r.text.replace(/\n/g, ' ').slice(0, 150)}”\n`);
}
