// PIECE: flow — the whole evening, beat by beat, with the visitor in it.
//
//   title card · Chapter One, The Question · Pepe greets · asks · the visitor answers (typed, or
//   spoken) · Pepe folds it back · Chapter Two, The Cards · the shuffle · the fan · the visitor
//   picks three (a click, or "the third from the left") · the gather · Chapter Three, The Reading ·
//   each card turned, an insert of its face with its title placard, Pepe reads it · one follow-up
//   question · the farewell · Epilogue, The Door · the closing card · a click starts again.
//
// Every beat is stepped, held, cut: a card is up, then it is not; the camera cuts, or rides a rail
// once (the push in to the table for the shuffle). Pepe's words come from the mind (the LLM, or the
// script when it is silent) one sentence at a time through dialogue.say. Nothing waits for ever:
// the mind's sentences, the visitor's answers and every animation have a timeout or a way out.
//
// The visitor's keys: space / Return show the line whole (again: cut it); Escape drops the rest of
// the beat's lines; a click on the picture does what space does, or picks a card at the fan, or
// starts the evening again from the closing card.
//
// API: start(), restart(), beat, setState(name)
//   states: title · greeting · question · shuffle · fan · dealt · reading · farewell (stills)
import { PROMPTS, SAMPLE_ANSWER, scriptedLines, parsePick } from './flow-lines.js';

export const meta = {
  name: 'flow',
  judge: { shot: 'home', states: ['title', 'greeting', 'question', 'shuffle', 'fan', 'dealt', 'reading', 'farewell'], dom: true },
  files: ['src/pieces/flow.js', 'src/pieces/flow-lines.js'],
};

const TIMEOUT = Symbol('timeout');
const FIRST_SENTENCE_S = 14; // the mind's first sentence of a turn; after this the script speaks
const NEXT_SENTENCE_S = 9; // ... each further sentence
const ANSWER_S = 120; // the visitor's silence at the question: taken as nothing said
const PICK_S = 75; // ... at the fan: Pepe chooses
const FOLLOWUP_S = 75; // ... at the follow-up: straight to the farewell
const TITLE_S = 4.2;
const CHAPTER_S = 2.8;
const DOOR_S = 3.4;

// Where the lettering stands, per shot: x is the centre, y the TOP of the block, w its width, all
// fractions of the frame. Not one of these is a taste: each is the barest caption-sized block of
// paper in a real frame of that beat, found with tools/_bare.mjs and then measured exactly
// (tools/_bare-at.mjs) with the ink percentage under the block noted below. The props piece cleared
// the plaster over his head for exactly this, so the mediums put the words up there, on the wall,
// beside the speaker the way the film sets a name beside a figure — not down on the tablecloth,
// where the same block of words sits on 18% ink and every hatch stroke fights the letters.
const ANCHORS = {
  // the wall above his head, under the clock and clear of his crown at y=0.40. 1.9% ink
  // (the same block over the cloth at the foot of the picture: 18.1%).
  pepe: { x: 0.52, y: 0.235, w: 0.32 },
  // the same passage of plaster, seen smaller: 3.8% (against 9.4% at the foot).
  home: { x: 0.5, y: 0.235, w: 0.28 },
  // straight down at the table there is no wall, so the words lie on the cloth between the spread
  // and the table's front edge: 2.7%, the barest block in that frame.
  table: { x: 0.5, y: 0.81, w: 0.34 },
  // the fan fills the bottom and the picked cards land in the slots at y=0.16..0.46; the only clear
  // cloth is the far edge of the table above them. 0.5%.
  fan: { x: 0.5, y: 0.035, w: 0.34 },
  // the insert: the card stands in the middle of the frame and the label stands beside it, on the
  // bare cloth to its right — 0.0% (card 0 and 1), 1.2% (card 2, one seam of the cloth).
  card0: { x: 0.78, y: 0.3, w: 0.3 },
  card1: { x: 0.78, y: 0.3, w: 0.3 },
  card2: { x: 0.78, y: 0.3, w: 0.3 },
};

export async function build(ctx) {
  const P = ctx.pieces;
  const D = P.dialogue, R = P.reveal, C = P.camera, T = P.titles, M = P.mind, S = P.sound, K = P.cards;
  if (D?.anchors) Object.assign(D.anchors, ANCHORS);

  let run = 0; // the visit's token: a restart bumps it and every wait in the old visit lets go
  let skips = 0; // skip gestures (a key, a click) so far; a skippable hold ends when it changes
  let skipBeat = false; // Escape: the rest of this beat's lines are dropped
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

  // ---- Pepe's turn: the mind's sentences, one placard each; the script when the mind is silent ---
  // keepLast: the last sentence is returned unsaid (it becomes the prompt over the field).
  // each(k, sentence): called before sentence k is said (a cut mid-turn).
  async function speak(args, { hold = 1.2, keepLast = false, each = null } = {}) {
    const token = run;
    skipBeat = false;
    let count = 0, last = null;
    const emit = async (s) => {
      const k = count++;
      if (keepLast) {
        const prev = last;
        last = s;
        if (prev == null) return;
        each?.(k - 1, prev);
        await say(prev, { hold });
        return;
      }
      each?.(k, s);
      await say(s, { hold });
    };
    const gen = M?.reply ? M.reply(args) : null;
    if (gen) {
      let n = 0;
      if (M.available) P.pepeAnim?.consider?.(3); // he thinks while the first sentence comes
      try {
        for (;;) {
          if (!alive(token) || skipBeat) {
            gen.return?.();
            break;
          }
          const r = await timeout(gen.next(), n ? NEXT_SENTENCE_S : FIRST_SENTENCE_S);
          if (r === TIMEOUT) {
            M.abort?.();
            gen.return?.();
            break;
          }
          if (r.done) break;
          n++;
          if (!alive(token) || skipBeat) break;
          await emit(r.value);
        }
      } catch (e) {
        console.warn('[flow] the mind stumbled; the script continues:', e?.message ?? e);
      }
    }
    if (!count && alive(token) && !skipBeat && D?.script) {
      for (const s of scriptedLines(D.script, args)) {
        if (!alive(token) || skipBeat) break;
        await emit(s);
      }
    }
    return keepLast ? last : null;
  }

  // ---- a chapter card: cut in, typed, held, cut out (a key or a click ends the hold) ----------------
  async function chapter(n, behind = null) {
    T?.chapter?.(n, undefined, { type: true });
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
        // The cut is to `home`, not to the closer `pepe`. His drawn hand waits on the cloth all
        // through the picking (reveal's ribbon hand, a flat drawing lying in the plane of the
        // table). Seen from the table's own height it foreshortens into a green blade lying across
        // the cloth; from `home`, which looks down on the table, it reads as what it is — his arm
        // out, his fingers on the cloth beside the deck — and covers his own right hand rather than
        // doubling it. See the note to reveal in the round's return: with a way to take that hand
        // off the cloth for two seconds this cut belongs on `pepe`, where the start would read.
        if (k < 2) {
          await wait(0.35);
          cut('home');
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
      cut('table');
      await wait(0.9);
    }
  }

  // ---- the evening ----------------------------------------------------------------------------------
  async function evening(token) {
    // the clock only runs once the loop does: two frames, so the first hold is a whole one
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    if (!alive(token)) return;
    // 1. the title, then Chapter One
    api.beat = 'title';
    cut('home');
    T?.title?.({ type: true });
    cue('snap');
    await wait(TITLE_S, { skippable: true });
    if (!alive(token)) return;
    T?.hide?.();
    await wait(0.5);
    await chapter(0, () => C?.cut?.('pepe'));

    // 2. the greeting and the question
    api.beat = 'greeting';
    D.folio?.('greeting');
    await wait(0.5);
    await speak({ beat: 'greeting' });
    if (!alive(token)) return;
    api.beat = 'question';
    D.folio?.('question');
    const prompt = await speak({ beat: 'question' }, { keepLast: true, hold: 1.0 });
    const answer = await D.ask(prompt ?? D.script.question[0], { timeout: ANSWER_S, hold: 0.3 });
    if (!alive(token)) return;
    api.beat = 'answer';
    D.folio?.('answer');
    await speak({ beat: 'answer', user: answer ?? '' }, { hold: 1.4 });
    if (!alive(token)) return;

    // 3. Chapter Two: the shuffle, the fan, the picks
    await chapter(1, () => C?.cut?.('home'));
    api.beat = 'shuffle';
    D.folio?.('shuffle');
    const shuffling = R?.shuffle?.() ?? Promise.resolve();
    C?.move?.('table', { kind: 'push' });
    await speak({ beat: 'shuffle' }, { hold: 1.2 });
    await timeout(shuffling, 12);
    if (!alive(token)) return;
    await wait(0.5);
    api.beat = 'fan';
    D.folio?.('fan');
    cut('fan');
    const fanning = R?.fan?.() ?? Promise.resolve();
    await speak({ beat: 'fan' }, { hold: 1.2 });
    await timeout(fanning, 15);
    if (!alive(token)) return;
    await wait(0.4);
    await pickThree(token);
    if (!alive(token)) return;
    await wait(0.5);
    await timeout(R?.gather?.() ?? Promise.resolve(), 10);
    api.beat = 'dealt';
    cut('table');
    await wait(0.9);

    // 4. Chapter Three: the reading
    await chapter(2);
    await readings(token);
    if (!alive(token)) return;

    // 5. one question, the farewell, the door
    api.beat = 'followup';
    D.folio?.('followup');
    cut('pepe');
    await wait(0.5);
    const q = await D.ask(PROMPTS.followup, { timeout: FOLLOWUP_S, hold: 0.4 });
    if (!alive(token)) return;
    if (q) await speak({ beat: 'followup', question: q }, { hold: 1.4 });
    else if (q === '') await say(PROMPTS.followupNone, { hold: 1.2 });
    if (!alive(token)) return;
    api.beat = 'farewell';
    D.folio?.('farewell');
    await speak({ beat: 'farewell' }, { hold: 1.6 });
    if (!alive(token)) return;
    await wait(0.6);
    await chapter(3, () => C?.cut?.('door'));
    await wait(DOOR_S, { skippable: true });
    if (!alive(token)) return;
    api.beat = 'closing';
    T?.closing?.();
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
    start() {
      const token = ++run;
      skipBeat = false;
      picking = false;
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
      if (name === 'title') {
        cam('home');
        T?.title?.();
      } else if (name === 'greeting') {
        cam('pepe');
        D.folio?.('greeting');
        D.setState('greeting');
      } else if (name === 'question') {
        cam('pepe');
        D.folio?.('question');
        D.ask(D.script.question[0], { instant: true, value: SAMPLE_ANSWER });
      } else if (name === 'shuffle') {
        cam('table');
        await R?.setState?.('shuffle');
        D.folio?.('shuffle');
        D.setState('shuffle');
      } else if (name === 'fan') {
        cam('fan');
        await R?.setState?.('fan');
        D.folio?.('fan');
        D.ask(PROMPTS.pick[0], { instant: true });
      } else if (name === 'dealt') {
        cam('table');
        await R?.setState?.('dealt');
        D.folio?.('draw');
        D.setState('draw');
      } else if (name === 'reading') {
        cam('table');
        await R?.setState?.('revealed');
        // the caption reads the card that is on the table (reveal's still lays the-fool, the-star, the-house-of-god)
        if (!ctx.params.has('card')) ctx.params.set('card', 'the-star');
        if (!ctx.params.has('pos')) ctx.params.set('pos', '1');
        D.folio?.('reading');
        D.setState('reading');
      } else if (name === 'farewell') {
        cam('pepe');
        await R?.setState?.('revealed');
        D.folio?.('farewell');
        D.setState('farewell');
      } else {
        cam('home');
      }
    },
  };
  return api;
}
