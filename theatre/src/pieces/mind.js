// PIECE: mind — what Tarot Pepe says, thought up live. Talks to POST /api/pepe (server/pepe.mjs,
// a streaming proxy to Anthropic or OpenRouter) with the beat, the conversation so far, what the
// visitor just said and the scripted line for the card as a hint of his voice; falls back to the
// scripted lines in script.js when there is no key or the call fails, so the show never stops.
//
// API (ctx.pieces.mind):
//   available            bool, true once health() has answered with a provider
//   provider, model      'anthropic' | 'openrouter' | 'none', and the model id
//   ready                Promise → available (health, never longer than 3 s)
//   health()             → Promise<bool>; refreshes available/provider/model
//   reply({beat, user, slug, position, question}) → async generator of SENTENCES
//                        beat: greeting | question | answer | shuffle | fan | reading | followup | farewell
//                        user: what the visitor said (answer / followup); question: alias for followup
//                        slug + position (0..2 | 'brought'|'going'|'do' | label) for a reading
//   history              [{role:'visitor'|'pepe', text}] the conversation so far (also `transcript`)
//   spread               [{position, label, slug, name, numeral}] the cards on the table so far
//   reset()              forgets the conversation and the spread
//   abort()              stops the current reply mid-stream (the generator ends)
//   setState(name)       greeting | question | reading | transcript (judging; see below)
//
// Judging: ?view=mind&state=transcript runs a canned visit against the real endpoint and prints every
// line into #transcript (appended to #ui); window.__mindDone flips true when it is finished. The
// other states fetch that one beat live and show it in the same block. Nothing here blocks the page
// on the network: setState returns at once and the conversation fills in.
import { SCRIPT, lineFor, linesFor, reply as scriptReply, POSITIONS, POSITION_KEYS, positionKey } from './script.js';
import { bySlug } from '../core/deck.js';

export const meta = {
  name: 'mind',
  judge: { shot: 'pepe', states: ['greeting', 'question', 'reading', 'transcript'], dom: true },
  files: ['src/pieces/mind.js', 'server/pepe.mjs', 'vite.config.js'],
};

const HEALTH_MS = 5000; // the page may be busy building when this is asked; a timeout is retried once
const MAX_SENTENCES = 6; // the show's safety net: after this many the stream is cut

// --- sentences -------------------------------------------------------------------------------
// A sentence ends at . ! ? … (optionally followed by closing quotes/brackets) and whitespace, or at
// a line break. The last fragment is flushed at the end of the stream.
const END = /[.!?…]+["”’')\]]*(?=\s)|\n+/g;
const splitSentences = (text) => {
  const out = [];
  let rest = String(text ?? '');
  for (;;) {
    END.lastIndex = 0;
    const m = END.exec(rest);
    if (!m) break;
    const cut = m.index + m[0].length;
    const s = rest.slice(0, cut).trim();
    if (s) out.push(s);
    rest = rest.slice(cut);
  }
  const tail = rest.trim();
  if (tail) out.push(tail);
  return out;
};

// The model's text, tidied for a caption: no markdown, no labels, no brackets, no exclamations.
function tidy(s) {
  return String(s)
    .replace(/^\s*(tarot\s+pepe|pepe)\s*[:—-]\s*/i, '')
    .replace(/[*_`#]+/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/!+/g, '.')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

// --- the scripted fallback -------------------------------------------------------------------
// The one beat where the visitor asks something of their own. Without a live voice he still has to
// answer it, and the only honest material is the three cards that are lying there.
function followupAnswer(said, spread = []) {
  const drawn = spread.filter(Boolean);
  const mid = drawn[1] ?? drawn[0];
  const last = drawn[2] ?? drawn[drawn.length - 1];
  if (!mid) return said ? scriptReply(/\?\s*$/.test(said) ? said : said + '?') : SCRIPT.interjections.question[1].replace('“{answer}” ', '');
  const q = said ? `“${said}” ` : '';
  const options = [
    `${q}The middle one. ${mid.name} is what is actually going on, and it is the one you did not choose to bring.`,
    `${q}${mid.name}, in the middle. The first card is what you carried in; that one you already knew.`,
    `${q}Look at ${mid.name} again, then at ${last?.name ?? 'the last card'}. The second names it, the third tells you what to do on Tuesday.`,
  ];
  return options[(said.length + drawn.length) % options.length];
}

function scripted({ beat, user, slug, position, question, spread = [] }) {
  const said = (user ?? question ?? '').trim();
  switch (beat) {
    case 'reading':
      return slug ? lineFor(slug, position ?? 0) : SCRIPT.turn[Number(position) || 0];
    case 'answer':
      return scriptReply(said);
    case 'followup':
      // He answers with the cards on the table, not with a dodge: the middle card is the one that
      // matters, and it is named. `spread` is filled in as the cards are read.
      return followupAnswer(said, spread);
    case 'fan':
      return SCRIPT.draw[0];
    default:
      return (SCRIPT[beat] ?? SCRIPT.greeting)[0];
  }
}

export async function build(ctx) {
  const history = [];
  const spread = [];
  let controller = null;
  let retriedHealth = false;
  let latchedAt = 0; // when the live voice last failed fatally (0 = not latched)
  const RELATCH_MS = 60000;

  const cardFacts = (slug, position) => {
    const key = positionKey(position);
    return POSITION_KEYS.filter((k) => k !== key)
      .flatMap((k) => linesFor(slug, k))
      .join(' ');
  };

  // POST /api/pepe → async generator of text deltas. Throws on any failure before or during.
  async function* stream(body, signal) {
    const res = await fetch('/api/pepe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      let msg = `${res.status}`;
      try {
        msg = (await res.json()).error ?? msg;
      } catch {}
      throw new Error(msg);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0, i);
        buf = buf.slice(i + 2);
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data:')) continue;
          let ev;
          try {
            ev = JSON.parse(line.slice(5));
          } catch {
            continue;
          }
          if (ev.t) yield ev.t;
          if (ev.done) return;
          if (ev.error) {
            const err = new Error(ev.error);
            err.fatal = !!ev.fatal; // key or credit trouble upstream: the script for the rest of the visit
            throw err;
          }
        }
      }
    }
  }

  const api = {
    available: false,
    provider: 'none',
    model: null,
    history,
    transcript: history,
    spread,
    ready: null,

    healthError: null, // 'timeout' | 'error' | null after health()

    async health(attempt = 0) {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort('timeout'), HEALTH_MS);
      try {
        const res = await fetch('/api/pepe/health', { signal: ac.signal, cache: 'no-store' });
        const j = await res.json();
        api.available = !!j.ok;
        api.provider = j.provider ?? 'none';
        api.model = j.model ?? null;
        api.credit = j.credit ?? null;
        api.healthError = null;
        if (!j.ok && j.reason) console.warn('[mind] no live voice:', j.reason);
      } catch (e) {
        clearTimeout(timer);
        // a timeout while the page is busy building is the main thread, not the server: ask again
        if (ac.signal.aborted && attempt < 1) return api.health(attempt + 1);
        api.available = false;
        api.provider = 'none';
        api.model = null;
        api.healthError = ac.signal.aborted ? 'timeout' : 'error';
        console.warn('[mind] health check failed:', api.healthError, e?.message ?? '');
      } finally {
        clearTimeout(timer);
      }
      return api.available;
    },

    // One turn of Pepe's, as sentences. Records the visitor's line and his reply in history.
    async *reply({ beat = 'greeting', user = '', slug = null, position = 0, question = '' } = {}) {
      const said = String(user || question || '').trim();
      const args = { beat, user: said, slug, position, question: said };
      const card = slug ? bySlug[slug] : null;
      const posIndex = POSITION_KEYS.indexOf(positionKey(position));
      const body = {
        beat,
        history: history.map((h) => ({ role: h.role, text: h.text })),
        user: said,
        question: beat === 'followup' ? said : '',
        slug,
        position: posIndex,
        cardName: card?.name ?? null,
        numeral: card?.numeral ?? null,
        positionLabel: POSITIONS[posIndex] ?? null,
        hint: beat === 'reading' && slug ? lineFor(slug, position) : null,
        facts: beat === 'reading' && slug ? cardFacts(slug, position) : null,
        spread: spread.map((c) => ({ position: c.position, label: c.label, name: c.name, numeral: c.numeral })),
      };
      if (beat === 'reading' && slug && card) {
        spread[posIndex] = { position: posIndex, label: POSITIONS[posIndex], slug, name: card.name, numeral: card.numeral };
        body.spread = spread.filter(Boolean).map((c) => ({ position: c.position, label: c.label, name: c.name, numeral: c.numeral }));
      }
      if (said) history.push({ role: 'visitor', text: said });
      const entry = { role: 'pepe', text: '' };
      history.push(entry);

      if (api.ready) await api.ready;
      if (!api.available && api.healthError === 'timeout' && !retriedHealth) {
        retriedHealth = true;
        await api.health();
      }
      // the live voice went off earlier: ask again once a minute has passed
      if (!api.available && latchedAt && Date.now() - latchedAt > RELATCH_MS) {
        latchedAt = 0;
        await api.health();
      }
      let count = 0;
      const yielded = [];
      const finish = () => {
        entry.text = yielded.join(' ');
      };

      if (api.available) {
        api.abort();
        const ac = (controller = new AbortController());
        let buf = '';
        try {
          for await (const delta of stream(body, ac.signal)) {
            buf += delta;
            // emit every complete sentence, keep the tail
            for (;;) {
              END.lastIndex = 0;
              const m = END.exec(buf);
              if (!m) break;
              const cut = m.index + m[0].length;
              const s = tidy(buf.slice(0, cut));
              buf = buf.slice(cut);
              if (!s) continue;
              yielded.push(s);
              count++;
              yield s;
              if (count >= MAX_SENTENCES) {
                ac.abort();
                buf = '';
                break;
              }
            }
            if (ac.signal.aborted) break;
          }
          const tail = tidy(buf);
          if (tail && count < MAX_SENTENCES) {
            yielded.push(tail);
            yield tail;
          }
        } catch (e) {
          if (!ac.signal.aborted) console.warn('[mind] live reply failed, using the script:', e?.message ?? e);
          if (e?.fatal) {
            // Key or credit trouble upstream. Fall back to the script now, but do not latch for
            // ever: a topped-up account or a fixed key should come back on its own, so the next
            // turn after a minute asks the health endpoint again.
            api.available = false;
            latchedAt = Date.now();
            console.warn('[mind] the live voice is off; asking again in a minute');
          }
        } finally {
          if (controller === ac) controller = null;
        }
        if (yielded.length) {
          finish();
          return;
        }
        if (ac.signal.aborted && ac.signal.reason === 'abort') {
          history.pop();
          return;
        }
      }

      // the script
      for (const s of splitSentences(scripted({ ...args, spread }))) {
        yielded.push(s);
        yield s;
      }
      finish();
    },

    reset() {
      api.abort();
      history.length = 0;
      spread.length = 0;
      // a new visitor deserves a fresh look at the endpoint: a key may have arrived meanwhile
      latchedAt = 0;
      retriedHealth = false;
      api.ready = api.health();
    },

    abort() {
      if (controller) {
        controller.abort('abort');
        controller = null;
      }
    },

    // ---- judging ------------------------------------------------------------------------------
    setState(name) {
      if (!['greeting', 'question', 'reading', 'transcript'].includes(name)) return;
      const block = ensureBlock(ctx);
      window.__mindDone = false;
      const run = name === 'transcript' ? cannedVisit(api, block, ctx) : oneBeat(api, block, ctx, name);
      run.catch((e) => console.warn('[mind] judging run failed:', e)).finally(() => {
        fit(block);
        window.__mindDone = true;
      });
    },
  };

  api.ready = api.health().finally(() => {
    api.ready = null;
    ctx.log?.(`mind: provider ${api.provider}${api.model ? ' / ' + api.model : ''}`);
  });
  return api;
}

// --- the transcript block ---------------------------------------------------------------------
function ensureBlock(ctx) {
  let el = ctx.dom.ui.querySelector('#transcript');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'transcript';
  Object.assign(el.style, {
    position: 'absolute',
    top: '6%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '60%',
    boxSizing: 'border-box',
    fontFamily: 'var(--futura)',
    fontSize: '22px',
    lineHeight: '1.35',
    color: '#0d0e0d',
    background: '#f8f9f4',
    padding: '24px 32px',
    whiteSpace: 'pre-wrap',
    border: '2px solid #0d0e0d',
  });
  ctx.dom.ui.appendChild(el);
  return el;
}

function addLine(block, who, text = '') {
  const p = document.createElement('div');
  p.style.margin = '0 0 0.55em';
  const w = document.createElement('span');
  w.textContent = `${who} — `;
  w.style.fontWeight = '700';
  w.style.letterSpacing = '0.06em';
  const t = document.createElement('span');
  t.textContent = text;
  p.append(w, t);
  block.appendChild(p);
  return {
    add(s) {
      t.textContent = t.textContent ? `${t.textContent} ${s}` : s;
    },
    set(s) {
      t.textContent = s;
    },
  };
}

// Shrink the type until the block fits the frame, so a screenshot shows the whole conversation.
function fit(block) {
  let size = 22;
  block.style.fontSize = `${size}px`;
  const limit = () => window.innerHeight * 0.94;
  while (size > 13 && block.getBoundingClientRect().bottom > limit()) {
    size -= 1;
    block.style.fontSize = `${size}px`;
  }
}

async function speak(mind, block, args) {
  const line = addLine(block, 'TAROT PEPE');
  for await (const s of mind.reply(args)) line.add(s);
}

const VISIT = {
  answer: 'I keep starting things and not finishing them.',
  cards: ['the-fool', 'the-house-of-god', 'the-star'],
  question: 'Which one is the important one?',
};

async function cannedVisit(mind, block, ctx) {
  mind.reset();
  block.innerHTML = '';
  await speak(mind, block, { beat: 'greeting' });
  await speak(mind, block, { beat: 'question' });
  addLine(block, 'VISITOR', VISIT.answer);
  await speak(mind, block, { beat: 'answer', user: VISIT.answer });
  for (let i = 0; i < 3; i++) await speak(mind, block, { beat: 'reading', slug: VISIT.cards[i], position: i });
  addLine(block, 'VISITOR', VISIT.question);
  await speak(mind, block, { beat: 'followup', question: VISIT.question });
  await speak(mind, block, { beat: 'farewell' });
  fit(block);
}

async function oneBeat(mind, block, ctx, name) {
  mind.reset();
  block.innerHTML = '';
  if (name === 'reading') {
    const slug = ctx.params.get('card') ?? 'the-moon';
    const pos = +(ctx.params.get('pos') ?? 1);
    const answer = ctx.params.get('answer') ?? VISIT.answer;
    // the reading is only specific with something to be specific about
    mind.history.push({ role: 'visitor', text: answer });
    addLine(block, 'VISITOR', answer);
    await speak(mind, block, { beat: 'reading', slug, position: pos });
  } else {
    await speak(mind, block, { beat: name });
  }
  fit(block);
}
