// PIECE: mind — Tarot Pepe's side of a conversation. Talks to POST /api/pepe (server/pepe.mjs, a
// streaming proxy to Anthropic or OpenRouter) with the conversation so far and what the visitor
// just said; falls back to the written brain in mind-talk.js / mind-voice.js / script.js when there
// is no key or the call fails, so the show never stops.
//
// THE VISITOR TALKS TO HIM. There is no march of beats any more: the evening is a conversation, and
// the cards only come out when the visitor asks for them.
//
//   const t = await mind.turn(text);        // text is whatever they typed or said, possibly ''
//   t.intent                                 // 'talk' | 'draw' | 'recall' | 'farewell'
//   t.focus                                  // for a recall: which card they meant, or null
//   t.tool                                   // the lever he pulled, if he pulled one
//   for await (const s of t.sentences) …     // his reply, one placard-sized sentence at a time
//
// HE DECIDES TO DEAL (round 5). The intent used to be a regex over the visitor's sentence, run
// before the model had seen the line — which dealt at people who had only mentioned cards and
// missed the ones who asked sideways. Now the model is handed two levers, `deal_cards` and
// `show_cards`, they are the only hands it has, and the room moves when one fires. So `turn` is a
// PROMISE: the intent is known when he has finished his two or three sentences, not before them.
// The regex (intentOf, mind-talk.js) is still the whole brain when there is no provider, and still
// the fallback when a live call dies before he has said a word.
//
//   'talk'      keep the conversation going: ask him again when he has finished speaking.
//   'draw'      the visitor asked for a reading, in their own words, or said yes to his offer.
//               His sentences ARE the shuffle line, so start the shuffle and say them over it;
//               then the fan and the picks, then mind.reply({beat:'reading', slug, position}) for
//               each card, then back to mind.turn() — the conversation simply continues.
//   'recall'    they asked to LOOK at cards that are already down ("show me my cards again", "what
//               did I draw", "can I see the second one"). NOTHING IS DEALT. Put the camera on the
//               reading — all three, or `t.focus` when they named one — play his sentences there,
//               and go back to the frame the conversation was in. With no cards down it still
//               fires for the memory forms, and he says plainly that nothing has been drawn.
//   'farewell'  they are leaving. His sentences are the goodbye; play them and close the evening.
//
// Nothing else in the piece decides to deal. mind.offered says whether his last turn put a reading
// on offer (so that a bare "yes" means yes); mind.hasSpread whether cards are down.
//
// API (ctx.pieces.mind):
//   turn(text)           → Promise<{intent, focus, sentences, text, tool}>  the conversation loop
//   intentOf(text)       → 'talk' | 'draw' | 'recall' | 'farewell' without speaking (the regex)
//   offered, hasSpread   bool
//   available            bool, true once health() has answered with a provider
//   provider, model      'anthropic' | 'openrouter' | 'none', and the model id
//   ready                Promise → available (health, never longer than 3 s)
//   health()             → Promise<bool>; refreshes available/provider/model
//   reply({beat, user, slug, position, question, focus}) → async generator of SENTENCES
//                        beat: greeting | talk | object | reading | recall | followup | farewell |
//                              question | answer | shuffle | fan
//                        slug + position (0..2 | 'brought'|'going'|'do' | label) for a reading
//                        'object' is set for you: a line that asks about a thing in the room is
//                        read by mind-room.js and answered with that thing. It is still a 'talk'
//                        turn — nothing is dealt, nothing moves — so no caller has to know.
//   history              [{role:'visitor'|'pepe', text}] the conversation so far (also `transcript`)
//   spread               [{position, label, slug, name, numeral}] the cards on the table so far
//   newSpread()          clears the cards, keeps the conversation (a second reading)
//   reset()              forgets the conversation and the spread
//   abort()              stops the current reply mid-stream (the generator ends)
//   setState(name)       greeting | question | reading | transcript (judging; see below)
//
// Judging: ?view=mind&state=transcript runs a canned visit against the real endpoint and prints every
// line into #transcript (appended to #ui); window.__mindDone flips true when it is finished. The
// other states fetch that one beat live and show it in the same block. Nothing here blocks the page
// on the network: setState returns at once and the conversation fills in.
import { SCRIPT, lineFor, linesFor, POSITIONS, POSITION_KEYS, positionKey } from './script.js';
import { stanceOf, readingScript, followupScript, answerScript, beatText, aboutTheSpread, recallScript, cardRef } from './mind-voice.js';
import { intentOf, talkScript, farewellScript, looksLikeOffer } from './mind-talk.js';
import { objectAsk, objectScript, objectBody, noteTold } from './mind-room.js';
import { bySlug } from '../core/deck.js';

export const meta = {
  name: 'mind',
  judge: { shot: 'pepe', states: ['greeting', 'question', 'reading', 'transcript'], dom: true },
  files: ['src/pieces/mind.js', 'src/pieces/mind-talk.js', 'src/pieces/mind-voice.js', 'src/pieces/mind-room.js', 'server/pepe.mjs', 'vite.config.js'],
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
// Everything he says when there is no live voice. `talk` is the conversation's own state (turns
// taken, lines already spent, whether a reading is on offer, the stance he has made of the
// visitor) and lives in build(); the writing is in mind-talk.js and mind-voice.js.
// Returns {text, offered}: `offered` is true when this turn put a reading on the table to be
// accepted, so that the visitor's next "yes" means yes.
function scripted({ beat, user, slug, position, question, spread = [], focus = null, object = null }, talk) {
  const said = (user ?? question ?? '').trim();
  switch (beat) {
    case 'talk':
      return talkScript(said, talk);
    // They asked about something in the room. A story if it is one of the ten, a plain
    // identification if it is not, and never an invented biography.
    case 'object':
      return { text: objectScript(said, object, talk) ?? talkScript(said, talk).text, offered: false };
    case 'recall':
      return { text: recallScript(said, spread, talk.stance, focus), offered: false };
    case 'reading':
      return { text: slug ? readingScript(slug, position ?? 0, talk.stance) : SCRIPT.turn[Number(position) || 0], offered: false };
    case 'answer':
      return { text: answerScript(said, stanceOf(said)), offered: false };
    case 'followup':
      return { text: followupScript(said, spread, talk.stance), offered: false };
    case 'farewell':
      return { text: farewellScript(talk), offered: false };
    default:
      return { text: beatText(beat), offered: false };
  }
}

export async function build(ctx) {
  const history = [];
  const spread = [];
  // the conversation's own memory: how many turns the visitor has taken, every line he has already
  // spent (so he never recites), whether a reading is on offer, and what he has made of them.
  // `told` counts how many times each object in the room has been asked about tonight, so the
  // second telling of a story is not the first one again — in the script and in the live voice.
  const talk = { turns: 0, used: new Set(), offered: false, stance: null, spread, told: Object.create(null), about: null };
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
  // `onTool` is called at most once, with {name, args}, when he pulls one of the levers the body
  // offered him: a `data: {"tool":…}` event of its own, never text with a shape to it.
  async function* stream(body, signal, onTool = null) {
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
          if (ev.tool?.name) onTool?.(ev.tool);
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
    //
    // `tools`, `fallback` and `report` are turn()'s, and nothing else passes them:
    //   tools     the levers offered to the live voice this turn (server/pepe.mjs decides which of
    //             them the table actually allows). No tools = no tools on the call.
    //   fallback  the args the SCRIPT is to answer with if the live voice says nothing at all —
    //             which is how the written brain keeps the beat the regex chose for it when the
    //             electricity goes off mid-turn, without the visitor's line being recorded twice.
    //   report    filled in for the caller: {live, tool}. `live` is true when these sentences came
    //             from the model; `tool` is the lever he pulled, if he pulled one.
    async *reply({ beat = 'greeting', user = '', slug = null, position = 0, question = '', intent = null, focus = null, object = null, tools = null, fallback = null, report = null } = {}) {
      const said = String(user || question || '').trim();
      if (report) {
        report.live = false;
        report.tool = null;
      }
      // Did they ask about something in the room? turn() has usually decided this already; a
      // caller that asks for the 'talk' beat straight out gets the same reading, so the answer to
      // "why do you keep a barometer" is the barometer whichever door the line came in by.
      let obj = object;
      if (!obj && said && (beat === 'talk' || beat === 'object')) obj = objectAsk(said, { spread: spread.filter(Boolean), cardRef });
      if (obj) beat = 'object';
      const args = { beat, user: said, slug, position, question: said, focus, object: obj };
      const card = slug ? bySlug[slug] : null;
      const posIndex = POSITION_KEYS.indexOf(positionKey(position));
      if (beat === 'talk' || beat === 'object') talk.turns++;
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
        // For a recall the hint is deliberately left off: it is the very line the reading was
        // written from, and he must not say it twice. The facts — everything in the picture the
        // reading did NOT spend — are exactly what a second look at a card is for.
        facts: (beat === 'reading' || beat === 'recall') && slug ? cardFacts(slug, position) : null,
        // The thing in the room they asked about: its canon fact, and ONE written line as a hint
        // of voice — the same arrangement a card gets, and for the same reason. The lines are
        // nowhere in the persona, so there is no set speech for him to recite.
        object: objectBody(obj, talk),
        // the conversation's own facts, so the live voice knows what the room knows
        intent: intent ?? null,
        offered: talk.offered,
        dealt: spread.filter(Boolean).length,
        turns: talk.turns,
        spread: spread.map((c) => ({ position: c.position, label: c.label, name: c.name, numeral: c.numeral })),
        // the levers, proposed. The server keeps the ones this table allows and no others.
        tools: Array.isArray(tools) && tools.length ? tools : undefined,
        // what he said the reading was for when he pulled deal_cards, spent on the shuffle line
        about: beat === 'shuffle' && talk.about ? talk.about : undefined,
      };
      if (beat === 'shuffle') talk.about = null;
      // counted once, whether the answer comes from the model or from the script
      if (obj) noteTold(obj, talk);
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
      let offeredOut = null; // the script knows; the live voice is read for it
      const yielded = [];
      const finish = () => {
        entry.text = yielded.join(' ');
        // A turn that was nothing but a lever — he pulled deal_cards and said not one word, which
        // is the commonest shape of all — leaves no line in the transcript to remember him by, and
        // an empty turn in the history reads to him next time as a silence he kept.
        if (!entry.text) {
          const i = history.indexOf(entry);
          if (i >= 0) history.splice(i, 1);
        }
        if (beat === 'talk' || beat === 'greeting' || beat === 'question') {
          talk.offered = offeredOut ?? looksLikeOffer(entry.text);
          api.offered = talk.offered;
        }
      };

      if (api.available) {
        api.abort();
        const ac = (controller = new AbortController());
        let buf = '';
        const onTool = (t) => {
          if (report) report.tool = t;
        };
        try {
          for await (const delta of stream(body, ac.signal, onTool)) {
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
        // He answered — in words, or by putting his hand on the deck, or both. Either way this
        // turn is his and the script does not speak over it.
        if (yielded.length || report?.tool) {
          if (report) report.live = true;
          finish();
          return;
        }
        if (ac.signal.aborted && ac.signal.reason === 'abort') {
          const i = history.indexOf(entry);
          if (i >= 0) history.splice(i, 1);
          return;
        }
      }

      // the script. `fallback` is turn()'s way of saying which beat the written brain should
      // answer with when the live voice has failed: the live call was made for the beat he TALKS
      // in, and the script may need to answer the beat the regex read instead.
      const written = scripted({ ...args, ...(fallback ?? {}), user: said, question: said, spread }, talk);
      offeredOut = !!written.offered;
      for (const s of splitSentences(written.text)) {
        yielded.push(s);
        yield s;
      }
      finish();
    },

    // ---- the conversation ------------------------------------------------------------------------
    // Whatever the visitor said, and what he does with it. A PROMISE now, and that is the round:
    //
    //   HE decides to deal, by calling deal_cards, and the room deals when the lever fires. It was
    //   a regex on the visitor's sentence, read before the model had seen the line at all, and a
    //   pattern cannot tell "read my cards" from "my grandmother used to read the cards" without
    //   somebody thinking of that sentence first. So the intent is no longer known before he opens
    //   his mouth: it is known when he has finished, which is what `await` is for. The reply is
    //   two or three sentences, so the wait is the length of two or three sentences.
    //
    // What the regex still decides, and it is the honest division: the beats that change what he
    // SAYS (a question about the room, a question about a card already on the cloth, the visitor
    // taking their leave) stay with the pattern, because a wrong guess there costs a paragraph.
    // The beats that change what the ROOM DOES are his, because a wrong guess there costs the
    // visitor their reading.
    //
    // With no live voice, none of this happens: the written brain reads the line exactly as it did
    // before, and so does a live turn whose call fails before he has said a word.
    async turn(text = '') {
      const said = String(text ?? '').trim();
      const dealt = spread.filter(Boolean);
      // The written brain's reading of the line — the fallback, and the whole decision when there
      // is no model to ask.
      const guess = intentOf(said, { offered: talk.offered, spread: dealt });
      // A question about a thing in the room is a 'talk' turn: nothing is dealt, nothing is
      // shuffled and the camera does not move. It is read before aboutTheSpread, because with
      // cards on the cloth "what is the barometer" has the shape of a question about a card and is
      // not one. Anything that DOES point at a card wins: objectAsk stands down on it.
      const object = guess === 'talk' && said ? objectAsk(said, { spread: dealt, cardRef }) : null;
      // Which card they meant, when they meant one: an index into the cards on the table, or null
      // for all of them. cardRef reads a name, an alias, a place ("the middle one"), a suit or a
      // pointing word, so "the tower" and "the second one" arrive here as the same number, and the
      // caller can put the camera on that card without parsing the sentence a second time.
      const ref = guess === 'recall' && dealt.length ? cardRef(said, dealt) : null;
      const at = (i) => {
        const card = i == null ? null : dealt[i];
        return { slug: card?.slug ?? null, position: card ? card.position : 0 };
      };
      // the beat the SCRIPT would answer this line with, and the intent that goes with it
      const guessFocus = ref && ref.index >= 0 ? ref.index : null;
      const written = {
        beat:
          guess === 'farewell' ? 'farewell' : guess === 'draw' ? 'shuffle' : guess === 'recall' ? 'recall' : object ? 'object' : dealt.length && aboutTheSpread(said, dealt) ? 'followup' : 'talk',
        focus: guessFocus,
        ...at(guessFocus),
      };

      if (api.ready) await api.ready;

      if (!api.available) {
        if (guess === 'draw') talk.offered = false;
        return { intent: guess, text: said, focus: guessFocus, sentences: api.reply({ ...written, user: said, intent: guess, object }) };
      }

      // The live turn. He is asked for a beat he can only TALK in, and given the levers instead:
      // deal_cards always, show_cards only with something on the cloth to show (the server drops
      // it otherwise, whatever this asks for).
      //
      // The object beat keeps them, so "the globe is lovely, now read my cards" is not a miss —
      // but server/pepe.mjs deliberately does NOT restate them in that direction, because a turn
      // whose whole job is a barometer does not need a paragraph nudging him toward the deck.
      const beat = guess === 'farewell' ? 'farewell' : object ? 'object' : dealt.length && aboutTheSpread(said, dealt) ? 'followup' : 'talk';
      const tools = guess === 'farewell' ? null : dealt.length ? ['deal_cards', 'show_cards'] : ['deal_cards'];
      const report = {};
      const lines = [];
      try {
        for await (const s of api.reply({ beat, user: said, intent: null, object, tools, report, fallback: guess === 'talk' ? null : { ...written, object } })) lines.push(s);
      } catch (e) {
        console.warn('[mind] the turn failed:', e?.message ?? e);
      }

      // He said nothing at all and pulled nothing: the call died before the script could be
      // reached, so the written reading of the line stands, exactly as it did before this round.
      if (!report.live) {
        if (guess === 'draw') talk.offered = false;
        return { intent: guess, text: said, focus: guessFocus, sentences: lines };
      }

      const tool = report.tool;
      if (tool?.name === 'deal_cards') {
        talk.offered = false;
        // what he heard them ask for, in their words. It rides into the shuffle direction and is
        // spent there, so the line over his working hands is about this visitor's shed and not
        // about shuffling in general.
        talk.about = String(tool.args?.about ?? '').trim().slice(0, 80) || null;
        // his line, if he wrote one, is the shuffle line; if he wrote none, flow asks for the
        // shuffle beat itself and he speaks over his own hands, which is the better line anyway
        return { intent: 'draw', text: said, focus: null, sentences: lines, tool };
      }
      if (tool?.name === 'show_cards') {
        const n = Number(tool.args?.card); // a model may write it as a string; the room does not mind
        const focus = Number.isFinite(n) && n >= 1 && n <= dealt.length ? Math.round(n) - 1 : null;
        return { intent: 'recall', text: said, focus, sentences: lines, tool };
      }
      // He talked, and did not put his hand on the deck. That is the answer, whatever the regex
      // thought of the sentence — with ONE exception, and the exception is the asymmetry this
      // whole round turns on. Showing the cards that are already lying there costs nothing and
      // reverses nothing: if he misses "show me my cards again", the visitor asked to look at
      // something and was answered in words. So the anchored recall patterns still get the camera
      // moved when there is something on the cloth to move it to. Dealing gets no such net and
      // never will: a deal the visitor did not ask for takes their reading away from them.
      if (guess === 'recall' && dealt.length) return { intent: 'recall', text: said, focus: guessFocus, sentences: lines };
      return { intent: guess === 'farewell' ? 'farewell' : 'talk', text: said, focus: null, sentences: lines };
    },

    // the same reading of their words, without speaking: for a caller that wants to peek.
    intentOf(text = '') {
      return intentOf(String(text ?? '').trim(), { offered: talk.offered, spread: spread.filter(Boolean) });
    },

    offered: false,
    get hasSpread() {
      return spread.filter(Boolean).length > 0;
    },

    // a second reading in the same evening: the cards go, the conversation stays
    newSpread() {
      spread.length = 0;
      talk.offered = false;
      api.offered = false;
    },

    reset() {
      api.abort();
      history.length = 0;
      spread.length = 0;
      talk.turns = 0;
      talk.used.clear();
      talk.offered = false;
      talk.stance = null;
      talk.told = Object.create(null);
      talk.about = null;
      api.offered = false;
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
    // wide enough that a visit with the room's stories in it still fits the frame at 13 px
    width: '68%',
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
  w.textContent = who ? `${who} — ` : '';
  w.style.fontWeight = '700';
  w.style.letterSpacing = '0.06em';
  if (!who) p.style.opacity = '0.55';
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

// The visitor's half of the canned visit: whatever they say, and the intent it carries. The block
// prints the intent beside each line so the critic can see where the cards were asked for.
async function visitorSays(mind, block, text) {
  addLine(block, 'VISITOR', text === '' ? '(says nothing)' : text);
  const t = await mind.turn(text);
  const line = addLine(block, 'TAROT PEPE');
  for await (const s of t.sentences) line.add(s);
  // The lever, if he pulled one, said in the transcript as the stage direction it is — a critic
  // reading this has to be able to see WHERE he decided, and that it was him and not a pattern.
  if (t.tool) addLine(block, '', `[ he puts his hand on the deck: ${t.tool.name}${t.tool.args?.about ? ` — "${t.tool.args.about}"` : ''} ]`);
  return t.intent;
}

// The canned visit is a conversation, and it is the one thing a critic reads. It shows the offer
// being made, refused, and then asked for: the cards come out at the visitor's word and not before.
// Two of the visitor's lines are questions with no question mark on them, because that is how
// people type: one about him, one about a card. Neither may be mistaken for the visitor reporting
// on themselves, and the second must be answered with the card it points at.
// Two of them ask about the room. One object has a story behind it and one has none, and the
// difference between the two answers is the whole of that round: he does not volunteer either, he
// does not invent the second one, and neither question touches the deck.
const VISIT = {
  said: [
    'I keep starting things and not finishing them.',
    'Four or five. There is a shed I began in March.',
    'Not yet. I would rather talk.',
    'do you ever get tired of being asked about the future',
    'what is the globe',
    'what is that radiator',
    'All right. Read my cards.',
  ],
  cards: ['the-fool', 'the-house-of-god', 'the-star'],
  questions: ['Which one is the important one?', 'what does the middle one mean', 'why do you keep a barometer'],
  bye: 'Thank you. I should go.',
};

async function cannedVisit(mind, block, ctx) {
  mind.reset();
  block.innerHTML = '';
  await speak(mind, block, { beat: 'greeting' });
  await speak(mind, block, { beat: 'question' });
  let intent = 'talk';
  for (const said of VISIT.said) {
    intent = await visitorSays(mind, block, said);
    if (intent === 'draw') break;
  }
  if (intent === 'draw') {
    addLine(block, '', '[ the fan; the visitor picks three ]');
    for (let i = 0; i < 3; i++) await speak(mind, block, { beat: 'reading', slug: VISIT.cards[i], position: i });
  }
  for (const q of VISIT.questions) await visitorSays(mind, block, q);
  await visitorSays(mind, block, VISIT.bye);
  fit(block);
}

async function oneBeat(mind, block, ctx, name) {
  mind.reset();
  block.innerHTML = '';
  if (name === 'reading') {
    const slug = ctx.params.get('card') ?? 'the-moon';
    const pos = +(ctx.params.get('pos') ?? 1);
    const answer = ctx.params.get('answer') ?? VISIT.said[0];
    // the reading is only specific with something to be specific about
    await visitorSays(mind, block, answer);
    await speak(mind, block, { beat: 'reading', slug, position: pos });
  } else {
    await speak(mind, block, { beat: name });
  }
  fit(block);
}
