// PIECE: flow — the whole evening, which is a conversation.
//
//   the door · Pepe greets · and then the visitor talks to him, and he answers, for as long as
//   they like · when the visitor asks for a reading — in whatever words — the story card, the
//   shuffle, the fan, three picks, the gather, three cards turned and read · and then the
//   conversation carries on, from the same field, with the cards on the table · when the visitor
//   says good night, the door, and the sign-off card · a click starts the evening again.
//
// There is no script of beats any more and no fixed number of exchanges. The loop is one line
// long: the visitor says something, the mind answers, the visitor says something. Everything else
// — the cards, the camera moves, the story card — hangs off the intent the mind reports for a
// turn ('talk' · 'draw' · 'farewell'). He never deals on his own schedule.
//
// The field is under his words, not beside them: his last sentence of a turn is held back and
// said by dialogue.ask, so the caption the visitor is answering and the block they type into are
// one drawn card, up together, and the field is open for the whole of the visitor's move. (It
// cannot stay open while he is speaking his earlier sentences: dialogue.say cuts the caption, and
// with it the field. See the round's contract note.)
//
// Nothing waits for ever and nothing ends by itself: the mind's sentences and every animation have
// a timeout, and a silence at the field is answered with a line and another open field, never with
// a farewell the visitor did not ask for.
//
// The visitor's keys: space / Return show the line whole (again: cut it); Escape drops the rest of
// his turn; a click on the picture does what space does, or picks a card at the fan, or starts the
// evening again from the sign-off card.
//
// API: start(), restart(), beat, intent, readings, setState(name)
//   states: greeting · talk · shuffle · fan · dealt · reading · farewell (stills)
import { PROMPTS, SAMPLE_ANSWER, scriptedLines, splitSentences, parsePick, detectIntent } from './flow-lines.js';

export const meta = {
  name: 'flow',
  judge: { shot: 'home', states: ['greeting', 'talk', 'shuffle', 'fan', 'dealt', 'reading', 'farewell'], dom: true },
  files: ['src/pieces/flow.js', 'src/pieces/flow-lines.js'],
};

const TIMEOUT = Symbol('timeout');
const FIRST_SENTENCE_S = 14; // the mind's first sentence of a turn; after this the script speaks
const NEXT_SENTENCE_S = 9; // ... each further sentence
// ... and, once he has said one sentence and is holding another to say over the open field, this
// much and no more. From that moment the visitor could already be typing, and the only thing
// between them and the field is a sentence the mind has not finished writing: three seconds of a
// still frame is the most that is worth waiting to hear it.
const IMPATIENT_S = 3;
const TURN_S = 22; // mind.turn(), when it answers with a finished object rather than a stream
const IDLE_S = 90; // the visitor's silence at the field: he says a line and opens it again
const PICK_S = 75; // ... at the fan: Pepe chooses
const CHAPTER_S = 4.0; // the story card, held long enough to read its four lines (round 3: 1.7 → 2.3s on screen)
const DOOR_S = 3.4;
const LANDING_S = 3.0; // the parlour, held, before anybody says anything

// A turn is three sentences: acknowledge · notice · ask one thing back. He is a fortune teller in
// a small room, not a lecturer, and a visitor who has typed a line should be typing again inside
// ten seconds. The mind is not asked to write less — it writes what it writes and the flow stops
// listening after the third sentence and drops the rest, so a long turn simply ends on time.
const MAX_SENTENCES = 3;

// WHERE THE LETTERING STANDS — round 5, and it is the user's decision, not a taste of ours:
//
//   "place the text box under pepe's table, rather than over its head … if the text box were always
//    centered at the bottom, that may look more logical — its where movies have their captions too"
//
// So there is now ONE anchor and every shot has it: centred, at the foot of the picture, in the
// frame's own bottom margin. This deliberately reverses rounds 3 and 4, which measured the barest
// block of paper in each frame and put the words there — on the plaster over his head in the
// mediums, on the cloth in the overheads. That was defensible while the caption was bare lettering
// standing on the drawing; it stopped being defensible when the caption became a drawn placard
// (BRIEF.md: the user's decision, not open to a critic), because an opaque card needs no bare paper
// under it, and because a card that lands in a different place in every shot is a card that jumps
// about the screen all evening. A film's caption does not move. Neither does this one.
//
// The contract in dialogue.js is that `y` is the TOP of the block and `floor` the lowest line its
// bottom edge may reach; a block that would cross the floor is lifted until it does not. So a `y`
// BELOW the floor pins the block by its bottom edge instead of its top — every caption, of one line
// or of five, stands on the same line of the picture and grows upwards. That is the whole trick.
//
// The camera piece keeps a band of the frame clear under the lowest thing that matters in each shot
// (camera-shots.js, `pad`) so the placard has somewhere to stand: the floorboards in front of the
// table in `home` and `wide`, the table's near edge in `pepe`, the bare cloth beyond the fan.
const CAPTION = {
  x: 0.5,
  y: 0.99, // below the floor: the block is hung by its BOTTOM edge, wherever its top ends up
  floor: 0.945, // the line its bottom edge stands on — a 5.5% margin under it, as a film has
};
// Every shot the evening cuts to. They are all the same anchor; naming them is how the table says
// so, and it keeps any shot from falling through to dialogue.js's own default.
const SHOTS = ['home', 'wide', 'pepe', 'table', 'spread', 'fan', 'turn', 'riffle', 'deck', 'card0', 'card1', 'card2', 'door', 'window', 'threshold'];

// The measure of the block, as a fraction of the frame. The caption face is clamp(9px, 1vw, 20px),
// so on a wide window the type scales with the picture and a third of the width is a comfortable
// forty-odd characters — but below 900 px the clamp holds the type at 9 px while the window keeps
// shrinking, and a third of a phone's width is four words a line. Measured in characters instead:
// ~46 of them, plus the placard's own padding, capped so it never runs to the edges of the paper.
function measure(w) {
  const fs = Math.min(20, Math.max(9, w / 100));
  return Math.min(0.86, Math.max(0.3, (34.5 * fs) / Math.max(1, w)));
}

// What the mind may report for a turn. Anything else is talk, which is the safe answer.
const INTENTS = ['talk', 'draw', 'farewell'];

export async function build(ctx) {
  const P = ctx.pieces;
  const D = P.dialogue, R = P.reveal, C = P.camera, T = P.titles, M = P.mind, S = P.sound, K = P.cards;
  // the caption's place, for every shot, remade whenever the window changes shape (the measure is
  // the only part of it that depends on the window)
  function anchors() {
    if (!D?.anchors) return;
    const w = ctx.size?.w || window.innerWidth || 1600;
    const a = { ...CAPTION, w: measure(w) };
    for (const shot of SHOTS) D.anchors[shot] = { ...a };
  }
  anchors();
  ctx.on?.('resize', anchors);

  let run = 0; // the visit's token: a restart bumps it and every wait in the old visit lets go
  let skips = 0; // skip gestures (a key, a click) so far; a skippable hold ends when it changes
  let skipBeat = false; // Escape: the rest of this turn's lines are dropped
  let picking = false; // the fan is armed: clicks belong to the cards
  const alive = (token) => token === run;

  // ---- small waits ------------------------------------------------------------------------------
  function wait(seconds, { skippable = false } = {}) {
    const token = run, s0 = skips, end = ctx.clock.raw + seconds;
    return new Promise((res) => {
      const tick = () => (!alive(token) || ctx.clock.raw >= end || (skippable && skips !== s0) ? res() : requestAnimationFrame(tick));
      tick();
    });
  }
  const untilSkip = (token) =>
    new Promise((res) => {
      const s0 = skips;
      const tick = () => (!alive(token) || skips !== s0 ? res() : requestAnimationFrame(tick));
      tick();
    });
  const timeout = (promise, seconds) => Promise.race([Promise.resolve(promise), new Promise((res) => setTimeout(() => res(TIMEOUT), seconds * 1000))]);
  const cue = (name) => S?.play?.(name);
  const say = (text, opts) => (D?.say ? D.say(text, opts) : Promise.resolve());
  function cut(shot) {
    C?.cut?.(shot);
    cue('cut');
  }
  // Inside one of his turns: the first sentence stays in the frame the visitor was answered in,
  // the second is played close on him, and the third is held back for the open field — by which
  // time the frame is out again. Two cuts to a turn, always in the same order.
  const closer = (k) => {
    if (k === 1) cut('pepe');
  };

  // ---- Pepe's sentences, one placard each ---------------------------------------------------------
  // The source may be an array, an iterator or an async generator (the mind streams, so the first
  // sentence is up while the rest is still being written).

  // Read what is left of a source to its end, off screen, so it can close itself down tidily.
  function drain(it) {
    (async () => {
      try {
        for (let n = 0; n < 24; n++) {
          const r = await timeout(it.next(), NEXT_SENTENCE_S);
          if (r === TIMEOUT || r.done) break;
        }
      } catch {
        /* a source that throws on the way out is no longer our business */
      }
    })();
  }

  function iterate(source) {
    if (!source) return null;
    if (typeof source === 'string') return splitSentences(source)[Symbol.iterator]();
    if (typeof source[Symbol.asyncIterator] === 'function') return source[Symbol.asyncIterator]();
    if (typeof source[Symbol.iterator] === 'function') return source[Symbol.iterator]();
    if (typeof source.next === 'function') return source;
    return null;
  }

  // keepLast: the last sentence is returned unsaid (it becomes the line over the open field).
  // each(k, sentence): called before sentence k is said (a cut mid-turn).
  // max: how many sentences of the source are used at all — the rest are dropped and the mind is
  //      told to stop writing. With keepLast, max counts the held one too (2 said + 1 held).
  // → { said: how many went up, held: the one kept back }
  async function render(source, { hold = 1.2, keepLast = false, each = null, max = MAX_SENTENCES } = {}) {
    const token = run;
    const it = iterate(source);
    let said = 0, held = null, taken = 0;
    if (!it) return { said, held };
    const emit = async (s) => {
      if (keepLast) {
        const prev = held;
        held = s;
        if (prev == null) return;
        each?.(said, prev);
        await say(prev, { hold });
        said++;
        return;
      }
      each?.(said, s);
      await say(s, { hold });
      said++;
    };
    try {
      for (let n = 0; ; n++) {
        if (!alive(token) || skipBeat) {
          it.return?.();
          break;
        }
        // how long we wait for the next sentence: the mind's whole thinking time for the first,
        // less for each after it, and barely any once the field could already be open
        const ready = keepLast && held != null && said >= 1;
        const r = await timeout(it.next(), ready ? IMPATIENT_S : n ? NEXT_SENTENCE_S : FIRST_SENTENCE_S);
        if (r === TIMEOUT) {
          M?.abort?.();
          if (ready) drain(it);
          else it.return?.();
          break;
        }
        if (r.done) break;
        const s = String(r.value ?? '').trim();
        if (!s) continue;
        if (!alive(token) || skipBeat) break;
        await emit(s);
        // the cap: three sentences and the turn is over, whatever else was on its way. The mind is
        // told to stop writing and then read to the end in the background — never `return()`d,
        // because the mind writes what he said into its own history when its stream ends, and a
        // turn he is not remembered to have made is worse than a fourth sentence nobody heard.
        if (max > 0 && ++taken >= max) {
          M?.abort?.();
          drain(it);
          break;
        }
      }
    } catch (e) {
      console.warn('[flow] the mind stumbled; the script continues:', e?.message ?? e);
    }
    return { said, held };
  }

  // One of the beats the mind still owns as a beat: the greeting, the shuffle, the fan, a reading,
  // the farewell. The script speaks if the mind says nothing at all.
  async function speak(args, opts = {}) {
    const token = run;
    skipBeat = false;
    if (M?.available) P.pepeAnim?.consider?.(3); // he thinks while the first sentence comes
    let r = await render(M?.reply ? M.reply(args) : null, opts);
    if (!r.said && r.held == null && alive(token) && !skipBeat && D?.script) r = await render(scriptedLines(D.script, args), opts);
    return r;
  }

  // ---- one turn of the conversation -----------------------------------------------------------------
  // THE CONTRACT WITH mind: `mind.turn(text)` → { intent, sentences }. The intent — talk · draw ·
  // farewell — is known AT ONCE, before a word of the reply is spoken, so the flow can decide what
  // the reply is played over: talk, and it is played to the visitor with the field opening under
  // the last sentence; draw, and it is played over the shuffle, because those sentences are his
  // shuffle line; farewell, and it is the good night. `sentences` is a stream (an async generator)
  // or an array; either is played the same way. A mind without turn() — or one whose call fails —
  // is asked for a beat instead, and the flow reads the intent off the visitor's own words: a
  // backstop, not the design.
  const sentencesOf = (t) => {
    if (!t || t === TIMEOUT) return null;
    if (typeof t === 'string') return t;
    return t.sentences ?? t.lines ?? t.text ?? t.reply ?? null;
  };
  const intentOf = (t) => {
    const i = t && typeof t === 'object' ? (t.intent ?? t.action ?? null) : null;
    return INTENTS.includes(i) ? i : null;
  };

  // What he makes of what the visitor said. Nothing is spoken here: the sentences are handed back
  // unplayed, because where they are played depends on the intent.
  async function listen(said) {
    skipBeat = false;
    P.pepeAnim?.consider?.(3); // he thinks; the field is closed and the frame must not be dead
    let turn = null;
    if (M?.turn) {
      try {
        turn = await timeout(M.turn(said), TURN_S);
      } catch (e) {
        console.warn('[flow] the mind stumbled on a turn; the beat speaks:', e?.message ?? e);
      }
      if (turn === TIMEOUT) {
        M.abort?.();
        turn = null;
      }
    }
    return { intent: intentOf(turn) ?? detectIntent(said), sentences: sentencesOf(turn) };
  }

  // ---- a story card: cut in, typed, held, cut out (a key or a click ends the hold) ------------------
  async function chapter(n, behind = null) {
    // the titles piece cuts the hinges it does not want; a cut one is an instant hinge, not a hold
    // on an empty frame
    if (!T?.chapter?.(n)) {
      behind?.();
      return;
    }
    cue('snap');
    await wait(CHAPTER_S, { skippable: true });
    behind?.();
    T?.hide?.();
    await wait(0.45);
  }

  // ---- the visitor's three picks --------------------------------------------------------------------
  async function pickThree(token) {
    picking = true;
    try {
      for (let k = 0; k < 3 && alive(token); k++) {
        if (!R?.awaitPick) return;
        const landed = R.awaitPick();
        let prompt = PROMPTS.pick[k], tries = 0;
        for (;;) {
          if (!alive(token)) return;
          const ac = new AbortController();
          P.pepeAnim?.listen?.();
          const typed = D.ask(prompt, { signal: ac.signal, timeout: PICK_S, hold: 0.3 });
          const result = await Promise.race([landed.then((pick) => ({ pick })), typed.then((text) => ({ text }))]);
          if ('pick' in result) {
            ac.abort(); // the click chose: the placard goes
            await typed;
            break;
          }
          const text = result.text;
          if (text == null || text === '') {
            // a silence, an Escape, an empty Return: Pepe chooses
            await say(PROMPTS.pickForYou, { hold: 0.9 });
            R.pickRandom?.();
            await timeout(landed, 10);
            break;
          }
          const cmd = parsePick(text, R.fanCount ?? 21);
          if (!cmd) {
            prompt = PROMPTS.pickAgain[Math.min(tries++, PROMPTS.pickAgain.length - 1)];
            continue;
          }
          if (cmd.kind === 'random') R.pickRandom?.();
          else R.pickByOrdinal?.(cmd.n);
          await timeout(landed, 10);
          break;
        }
        // The card is in its slot. Between the picks we cut back to him for a held beat — a start,
        // the mouth open, a blink, then the deadpan again — so the locked top-down is broken twice
        // and he is never off the screen for more than ten seconds. Not after the third: the gather
        // follows straight on.
        //
        // The cut is to `pepe`: from a frame that is nothing but cloth and card backs, the reaction
        // has to be a face, and a face at this size is the biggest change of scale in the evening.
        // His drawn hand takes itself off whenever the camera is not overhead (reveal-hand.js), so
        // his own two hands are on the cloth in this frame and there is no second one.
        if (k < 2) {
          await wait(0.35);
          cut('pepe');
          P.pepeAnim?.react?.();
          await wait(1.9);
          cut('fan');
          await wait(0.35);
        } else await wait(0.6);
      }
      // the safety net: three cards in the slots whatever happened
      let guard = 0;
      while (alive(token) && (R.picks?.length ?? 3) < 3 && (R.fanCount ?? 0) > 0 && guard++ < 3) await timeout(R.pickRandom(), 10);
    } finally {
      picking = false;
    }
  }

  // ---- the three cards, turned and read ---------------------------------------------------------------
  async function readings(token) {
    for (let i = 0; i < 3 && alive(token); i++) {
      const pick = R?.picks?.[i];
      if (!pick) break;
      api.beat = 'reading';
      D.folio?.('reading');
      await timeout(R.turn(i), 6); // his hand turns it, on the table
      await wait(0.9); // his fingers are seen leaving the card before the cut
      cut(`card${i}`); // the insert: the face, its title placard beside it
      await timeout(D.intertitle(pick.slug, i), 4);
      await speak(
        { beat: 'reading', slug: pick.slug, position: i },
        {
          hold: 1.4,
          each: (k) => {
            if (k === 1) cut('pepe'); // the second sentence: back to him
          },
        },
      );
      if (!alive(token)) return;
      cut('turn');
      await wait(0.9);
    }
  }

  // ---- the cards, because the visitor asked for them ----------------------------------------------
  // `sentences` is the turn in which he agreed to it: the mind writes that turn as the shuffle
  // line, so it is said over his working hands, not before them. Returns the line the conversation
  // picks up on afterwards (said over the open field).
  async function drawing(token, nth, sentences) {
    // the one story card in the evening, and this is where it belongs: the cards coming out. A
    // second reading does not get one — a card twice is a slideshow.
    // The camera is already on the deck behind the story card, so the card lifts on the shuffle
    // rather than on a wide of a room in which nothing is about to move.
    if (nth === 0) await chapter(1, () => C?.cut?.('riffle'));
    else {
      M?.newSpread?.(); // the cloth cleared, the conversation kept
      cut('riffle');
      await wait(0.5);
    }
    if (!alive(token)) return null;

    // The shuffle, staged: the frame is on the deck before a card moves, and the riffle plays in
    // it — the cut, the halves parted a hand's width, the six drawings of the interleave, the pile
    // stood on its edge and tapped square. Round 3 played all of that in a wide of the whole
    // parlour, where the deck is nine millimetres of the picture behind a bottle, and his line
    // went up in front of it besides.
    api.beat = 'shuffle';
    D.folio?.('shuffle');
    await wait(0.15);
    const shuffling = R?.shuffle?.() ?? Promise.resolve();
    await wait(0.7); // the cut and the parting before he says a word over them
    // his first sentence goes over the riffle; the riffle is two seconds long and his turn is not,
    // so the rest of it is played on him rather than on a deck that has stopped moving
    const over = await render(sentences, { hold: 1.2, each: closer });
    if (!over.said) await speak({ beat: 'shuffle' }, { hold: 1.2, each: closer });
    await timeout(shuffling, 12);
    if (!alive(token)) return null;
    await wait(0.4);

    api.beat = 'fan';
    D.folio?.('fan');
    cut('fan');
    const fanning = R?.fan?.() ?? Promise.resolve();
    // two sentences here, not three: the pick prompt is the third thing said and the visitor has
    // been watching cards being dealt for five seconds already
    await speak({ beat: 'fan' }, { hold: 1.2, max: 2 });
    await timeout(fanning, 15);
    if (!alive(token)) return null;
    await wait(0.4);

    await pickThree(token);
    if (!alive(token)) return null;
    await wait(0.5);
    await timeout(R?.gather?.() ?? Promise.resolve(), 10);
    api.beat = 'dealt';
    cut('turn'); // 46° over the cloth: the frame the cards are turned in
    await wait(0.9);

    await readings(token);
    if (!alive(token)) return null;

    // and back to the table talk, with three cards face up on it
    cut('home');
    await wait(0.5);
    return PROMPTS.afterReading[Math.min(nth, PROMPTS.afterReading.length - 1)];
  }

  // ---- the conversation ------------------------------------------------------------------------------
  // The whole evening between the greeting and the good night. It ends only when the visitor ends
  // it: a silence is answered with a line and the same open field, never with a farewell.
  async function conversation(token, opening) {
    let prompt = opening || PROMPTS.opening;
    let quiet = 0;
    // The frame the talking is played in. The first exchange stays in the wide the greeting was
    // said in — the visitor answers a man in a room, not a face — and from his first reply the
    // evening settles into `home`, a size closer, still with the ceiling and the pendant in it.
    // `pepe` is punctuation inside a turn, not the whole conversation.
    let frame = 'wide';
    for (;;) {
      if (!alive(token)) return { spoke: false };
      if (C?.current !== frame) cut(frame);
      api.beat = 'talk';
      // the folio stays on 'talk' for the whole conversation, so his name is not set over every
      // line he says; dialogue puts it back after a long silence, which is where it belongs
      D.folio?.('talk');
      // after the last of his waiting lines the field simply stays open, with no timer at all
      const patient = quiet >= PROMPTS.quiet.length;
      // The field is the visitor's turn, so he takes the listening posture and holds it — leaning
      // in, one long blink, a tilt — until something comes back. pepeAnim asked for this: nothing
      // else tells it who has the floor.
      P.pepeAnim?.listen?.();
      const said = await D.ask(prompt, { timeout: patient ? 0 : IDLE_S, hold: 0.35 });
      if (!alive(token)) return { spoke: false };
      if (!said) {
        // nothing typed (a silence, an Escape, an empty Return): he says one thing and waits again
        prompt = PROMPTS.quiet[Math.min(quiet++, PROMPTS.quiet.length - 1)];
        continue;
      }
      quiet = 0;
      api.beat = 'reply';
      const { intent, sentences } = await listen(said);
      if (!alive(token)) return { spoke: false };
      api.intent = intent;

      // the cards, because they were asked for. His turn is the shuffle line: it goes over the
      // deck, not in front of it, so the story card cuts in the moment he agrees.
      if (intent === 'draw') {
        const back = await drawing(token, api.readings++, sentences);
        if (!alive(token)) return { spoke: false };
        frame = 'home';
        prompt = back ?? PROMPTS.afterReading[0];
        continue;
      }
      // the good night. His turn is the goodbye, and it is said in the room he is sitting in.
      if (intent === 'farewell') {
        api.beat = 'farewell';
        D.folio?.('farewell');
        cut('wide');
        const bye = await render(sentences, { hold: 1.6 });
        return { spoke: bye.said > 0 };
      }
      // talk: the last sentence is kept back to stand over the open field. The middle sentence of
      // a turn is played close on him and the frame goes back for the one the visitor answers —
      // so a turn is: the room · his face · the room, and never four minutes of the same crop.
      let r = await render(sentences, { hold: 1.3, keepLast: true, each: closer });
      if (!r.said && r.held == null && alive(token) && !skipBeat) {
        // nothing came of the turn (no mind.turn, a dead call): his answer comes from the beat he
        // would be on — with the cards down, the beat that answers a question about them
        r = await speak({ beat: api.readings > 0 ? 'followup' : 'answer', user: said, question: said }, { hold: 1.3, keepLast: true, each: closer });
      }
      if (!alive(token)) return { spoke: false };
      frame = 'home';
      prompt = r.held ?? PROMPTS.lost;
    }
  }

  // ---- the evening ----------------------------------------------------------------------------------
  async function evening(token) {
    // the clock only runs once the loop does: two frames, so the first hold is a whole one
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    if (!alive(token)) return;

    // 1. the door. The film opens on the entrance — a drawn door on a bare sheet, with the name on
    // it — and waits there for the visitor's click; it resolves inside the parlour, at `home`.
    api.beat = 'door';
    if (P.entrance?.open) await P.entrance.open();
    else C?.cut?.('home');
    if (!alive(token)) return;
    await wait(0.9); // the parlour, seen from the doorway, before we sit down
    if (!alive(token)) return;

    // 2. the parlour, whole, and three seconds of nobody saying anything. The film has to show the
    // room it is set in before it shows a man talking in it: the ceiling, the pendant, both walls,
    // the coat stand, the tiles. Every frame of round 3's conversation was a crop of this.
    //
    // There is no cut here any more. This used to `cut('wide')` — a 23% wider lens and a 10 cm lift
    // — 0.9 s after the walk-in had come to rest on `home`, which is the pull-back the user called
    // yanky: "we get into the room, then we get a cut with a zoom out". The arrival now ENDS on
    // `wide`, so the room is already whole when the camera stops and the only thing left to do here
    // is hold still and let it be looked at.
    await wait(LANDING_S, { skippable: true });
    if (!alive(token)) return;

    // 3. good evening — said in the room, not in a crop of it — and then it is the visitor's
    // evening, not ours. Three sentences at most; the field opens under the third.
    api.beat = 'greeting';
    D.folio?.('greeting');
    const g = await speak({ beat: 'greeting' }, { keepLast: true, hold: 1.2 });
    if (!alive(token)) return;
    const out = await conversation(token, g.held);
    if (!alive(token)) return;

    // 4. the good night he asked for, in the wide again, then the door and the sign-off card
    api.beat = 'farewell';
    D.folio?.('farewell');
    if (C?.current !== 'wide') cut('wide'); // the good night was already said there if he said one
    if (!out.spoke) {
      const f = await speak({ beat: 'farewell' }, { hold: 1.6 });
      if (!f.said && f.held == null) await say(PROMPTS.farewellNone, { hold: 1.4 });
    }
    if (!alive(token)) return;
    await wait(0.6);
    await chapter(3, () => C?.cut?.('door'));
    await wait(DOOR_S, { skippable: true });
    if (!alive(token)) return;
    api.beat = 'closing';
    T?.closing?.();
    cue('closing');
    cue('snap');
    await untilSkip(token); // a click, a key: again
    if (!alive(token)) return;
    api.start();
  }

  // ---- the visitor's keys and clicks --------------------------------------------------------------------
  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
    if (e.key === 'Escape') {
      e.preventDefault();
      skipBeat = true;
      M?.abort?.();
      D?.clear?.();
      skips++;
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      S?.start?.();
      skips++;
      if (!D?.asking) D?.skip?.();
    }
  }
  function onPointer(e) {
    if (e.target?.closest?.('#dialogue')) return; // the field, the mic
    skips++;
    if (!D?.asking && !picking) D?.skip?.();
  }
  if (!ctx.shotMode) {
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
  }

  const api = {
    beat: 'idle',
    intent: null, // what the mind made of the visitor's last line
    readings: 0, // how many times the cards have come out tonight
    start() {
      const token = ++run;
      skipBeat = false;
      picking = false;
      api.intent = null;
      api.readings = 0;
      M?.abort?.();
      M?.reset?.();
      D?.clear?.();
      T?.hide?.();
      R?.stop?.();
      const ready = K?.place ? K.place([], false) : Promise.resolve(); // a bare table
      Promise.resolve(ready)
        .then(() => evening(token))
        .catch((e) => {
          console.warn('[flow] the evening stopped:', e);
          if (!alive(token)) return;
          api.beat = 'closing';
          T?.closing?.();
          cue('closing');
          untilSkip(token).then(() => alive(token) && api.start());
        });
    },
    restart() {
      api.start();
    },
    // the judging stills: deterministic, offline (the mind uses the script)
    async setState(name) {
      run++;
      T?.hide?.();
      D?.clear?.();
      api.beat = name;
      const cam = (shot) => C?.cut?.(shot);
      if (name === 'greeting') {
        cam('wide');
        D.folio?.('greeting');
        D.setState('greeting');
      } else if (name === 'talk') {
        // mid-conversation: his line above, the visitor's next one being typed underneath
        cam('home');
        D.folio?.('talk');
        D.ask(D.reply(SAMPLE_ANSWER), { instant: true, value: 'can you read my cards' });
      } else if (name === 'shuffle') {
        // reveal's own setState cuts to its judging shot; the flow's frame goes on after it
        await R?.setState?.('shuffle');
        cam('riffle');
        D.folio?.('shuffle');
        D.setState('shuffle');
      } else if (name === 'fan') {
        await R?.setState?.('fan');
        cam('fan');
        D.folio?.('fan');
        D.ask(PROMPTS.pick[0], { instant: true });
      } else if (name === 'dealt') {
        await R?.setState?.('dealt');
        cam('turn');
        D.folio?.('draw');
        D.setState('draw');
      } else if (name === 'reading') {
        await R?.setState?.('revealed');
        cam('turn');
        // the caption reads the card that is on the table (reveal's still lays the-fool, the-star, the-house-of-god)
        if (!ctx.params.has('card')) ctx.params.set('card', 'the-star');
        if (!ctx.params.has('pos')) ctx.params.set('pos', '1');
        D.folio?.('reading');
        D.setState('reading');
      } else if (name === 'farewell') {
        await R?.setState?.('revealed');
        cam('wide');
        D.folio?.('farewell');
        D.setState('farewell');
      } else {
        cam('home');
      }
    },
  };
  return api;
}
