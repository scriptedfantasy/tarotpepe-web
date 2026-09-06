// PIECE: pepeAnim — how the cut-out moves. Paper-theatre animation on twos, the way a stop-motion
// animator works from an exposure sheet: a pose is held for seconds, then changes in two or three
// stepped frames, then holds again. Nothing eases. The puppet has a torso pinned at the hip, a head
// hinged at the neck, two hands hinged at the wrists, pupils that slide, lids that close for two
// frames, and three replacement mouths (the drawing's own lips, a small "o", a thin closed line).
//
// ROUND 6 — HE HAS A BODY NOW. The note was exact: "he never moves while he talks. Across eight
// frames of one speech only the mouth changes — no breath, no lean, no hand, no head tilt. The
// film's puppets shift weight on every hold." Round 5 animated a head on a static drawing: the
// breath lifted the head and the hands 4 mm while the shoulders it is supposed to come from stood
// still, and the only thing a sentence changed was the lips. So:
//
//   · pepe.js pins the figure at the HIP (anchors.hip, in the middle of the crossed legs) and hangs
//     the robe, both hands and the head off that pin. Everything below is written in terms of it.
//   · BREATH is a scale about the pin, not a lift: the shoulders rise ~3 mm, the head ~4 mm, the
//     crossed legs stay on the bench. Two frames up, a long hold, two frames down.
//   · A LEAN is the pin turning 1–2°, which swings the head 12–20 mm and the feet less than one.
//     He leans INTO a sentence and comes back out of it at the full stop.
//   · A WEIGHT SHIFT is that lean changing sign at a clause, once in a line, and staying there.
//     "The film's puppets shift weight on every hold" — this is that, and it is what a body does
//     while a mouth is busy.
//   · A HAND comes up at the wrist for a clause he means and goes down at the end of it — a hold,
//     not a blip. It never leaves the sleeve: the cut-out's green tab is 15 drawing-pixels long.
//   · A HEAD TILT changes at clause boundaries and NEVER per word, and a question is a posture
//     (the head over, the pin back) held for the whole sentence, not a mannerism.
//
// The two rules that shape all of it, from the brief: motion is STEPPED — every channel is a snap
// over two or three frames and then a hold, and no channel is ever a curve — and STILLNESS IS THE
// DEFAULT. A body beat lands about once a second while he talks and about once every one and a
// half while he does not; between them nothing changes but the breath, which itself holds for a
// second at a time. A puppet that fidgets is as wrong as one that never moves.
//
// Everything is a function of the 12 fps frame count since the current mode began, so a state is
// deterministic and a frozen clock shows a definite frame. Modes: idle, listen, talk, gesture,
// consider. One-shots (a gesture, a reaction, the deal, a shuffle, a turn) overlay the mode.
//
// api: play(mode), say(text, seconds), listen(seconds), gesture(side, hold), consider(seconds),
//      react(kind), deal(i, side), shuffle(), turn(i, side), setState(name), update(ctx)
// deal and turn take the side of the hand that does it, so his body agrees with whichever drawn
// hand the reveal has on the cloth; left out it is his right, as before. A hand lent away with
// pepe.reach(side) is left alone here, so it comes back exactly where it left.
import * as THREE from 'three';
import { hash } from '../core/rng.js';

export const meta = {
  name: 'pepeAnim',
  judge: { shot: 'pepe', states: ['idle', 'listen', 'talk', 'gesture', 'consider', 'deal'], motion: true },
  files: ['src/pieces/pepeAnim.js'],
};

const FPS = 12;
const deg = THREE.MathUtils.degToRad;
const clamp = THREE.MathUtils.clamp;
const MM = 0.001;
// 0..1 hash of an event index and a channel salt
const h01 = (i, salt) => (hash(i * 13.37 + salt * 101.7 + 0.5) + 1) / 2;
// stepped in-between: 0 before frame f0, then 1/n, 2/n … 1 over the n frames from f0, then 1
const stepIn = (F, f0, n) => (F < f0 ? 0 : Math.min(1, (F - f0 + 1) / n));
// a move there and back: up over `n` frames at f0, held, down over `m` frames at f1
const pulse = (F, f0, n, f1, m) => stepIn(F, f0, n) - stepIn(F, f1, m);

// ── the puppet's channels, in the units a puppet maker would use ────────────────────────────────
// A lean is read at the head: 1° about the hip pin moves the head about 10 mm and the crossed legs
// about 0.7. Past ~2.5° the drawing starts to read as a fall rather than a shift of weight.
const LEAN = deg(1.15); // into a sentence
const LEAN_BACK = deg(0.8); // away, for a question
const SHIFT = deg(0.9); // the weight going onto the other haunch
const SLIDE = 3.5 * MM; // and the few millimetres of bench that goes with it
const BREATH_Y = 0.009; // the scale about the pin: the shoulders up ~3 mm, the head ~4
const BREATH_X = 0.003;
const HAND_UP = deg(19); // a hand meaning something, held for a clause
const TURN = 2.2 * MM; // the head sliding on its pin when he looks away

// where the pupils slide to (mm, right / up). The drawing's rest gaze already looks a hair to
// the visitor's right and down, so "visitor" is nearly rest.
const GAZE = {
  rest: [0, 0],
  visitor: [0.4, 0.3],
  left: [-1.6, 0.3],
  right: [1.5, 0.2],
  up: [0.2, 1.5],
  upLeft: [-1.2, 1.3],
  upRight: [1.1, 1.2],
  cards: [0.6, -1.4],
  down: [0, -1.5],
};
// which way the head slides on its pin for each gaze: a cut-out turns by moving, not by rotating
const TURN_OF = { left: -1, upLeft: -1, right: 1, upRight: 1, cards: 0, up: 0, down: 0, visitor: 0, rest: 0 };
const GLANCES = ['visitor', 'left', 'cards', 'upLeft', 'right', 'visitor', 'up', 'cards', 'upRight'];
const TILTS = [-3, -2, 0, 2, 3];

// A channel of events: event i starts at frame start_i, start_0 = first, gaps hashed in [gapMin, gapMax].
// at(F) → { i, start, prev } for the last event that began at or before F, or null before the first.
function sequence({ first, gapMin, gapMax, salt }) {
  let i = 0, start = first, prev = -Infinity;
  const gap = (k) => Math.round(gapMin + (gapMax - gapMin) * h01(k, salt));
  return {
    at(F) {
      if (F < start) {
        if (i === 0) return null;
        i = 0;
        start = first;
        prev = -Infinity;
        if (F < start) return null;
      }
      while (start + gap(i) <= F) {
        prev = start;
        start += gap(i);
        i++;
      }
      return { i, start, prev };
    },
  };
}

// a question, with or without the mark: the same test the mind uses on the visitor's line
const QUESTION = /^(what|why|how|who|whom|whose|which|when|where|do|does|did|can|could|will|would|is|are|was|were|have|has|had|shall|should|may|might|am)\b/i;
const isQuestion = (t) => /\?\s*$/.test(t) || QUESTION.test(t.trim());

// ── the exposure sheet for one spoken line ─────────────────────────────────────────────────────
// Two sheets, really: the MOUTHS, which chatter through the letters, and the BODY, which does not.
// The body is a short list of held beats — a posture for the line, one shift of weight in the
// middle of it, a tilt per clause, a hand per clause he means — laid out so that a beat lands
// about every ten frames and nothing at all happens in between.
function buildSheet(text, seconds, salt = 0) {
  const frames = Math.max(4, Math.round(seconds * FPS));
  const pairs = Math.ceil(frames / 2);
  const cpf = text.length / frames;
  const mouths = [];
  let prev = 'rest';
  for (let k = 0; k < pairs; k++) {
    const c0 = Math.floor(k * 2 * cpf), c1 = Math.max(c0 + 1, Math.floor((k + 1) * 2 * cpf));
    const chunk = text.slice(c0, c1).toLowerCase();
    let m = 'rest';
    if (c0 < text.length && /[a-z0-9'’]/.test(chunk) && !/[\s.,;:!?—-]$/.test(chunk)) {
      // an open vowel opens the mouth; otherwise the lips press to a line; never the same twice
      const open = /[aeiouwy]/.test(chunk);
      m = prev === 'o' ? 'flat' : prev === 'flat' ? (open ? 'o' : 'rest') : open ? 'o' : 'flat';
    }
    mouths.push(m);
    prev = m;
  }
  // the last two pairs are silent: the line is typed before Pepe stops moving
  for (let k = Math.max(0, pairs - 2); k < pairs; k++) mouths[k] = 'rest';

  // ---- the clauses, in frames. A clause is what he says between two breaths of punctuation, and
  // it is the unit every body beat is hung on: a puppet changes its pose at a comma, not at a word.
  const clauses = [];
  {
    let start = 0;
    const re = /[.,;:!?—]/g;
    let match;
    while ((match = re.exec(text))) {
      const f = Math.min(frames, Math.round((match.index + 1) / cpf));
      if (f - start >= 8) {
        clauses.push([start, f]);
        start = f;
      }
    }
    if (frames - start >= 8) clauses.push([start, frames]);
    if (!clauses.length) clauses.push([0, frames]);
  }

  // ---- stresses: the long words, for a nod. At most two in a line — a nod on every long word is
  // a bobbing head, and the film gives a figure one.
  const nods = [];
  {
    const re = /[A-Za-z'’]+/g;
    let match, last = -24;
    while ((match = re.exec(text))) {
      const f = Math.floor(match.index / cpf);
      if (match[0].length >= 7 && f - last >= 20 && f < frames - 8) {
        nods.push(f);
        last = f;
      }
      if (nods.length >= 2) break;
    }
  }

  // ---- the body sheet. Every entry is a HOLD: it snaps on over `n` frames at f0, stays, and snaps
  // off over `m` at f1. Nothing here is a curve and nothing here repeats inside a line.
  const body = [];
  const push = (ch, v, f0, f1, n = 2, m = 2) => {
    if (f1 - f0 < 3) return;
    body.push({ ch, v, f0, f1: Math.min(f1, frames + 2), n, m });
  };
  const q = isQuestion(text);
  const way = h01(salt, 5) < 0.5 ? -1 : 1; // which haunch he starts on; it alternates by line
  const short = frames < 22;

  if (q) {
    // a question is a POSTURE, held for the whole sentence: the pin goes back, the head goes over.
    push('lean', -LEAN_BACK * way, 1, frames - 3, 2, 3);
    push('slide', SLIDE * 0.6 * way, 1, frames - 3, 2, 3);
    push('tilt', deg(5.5) * way, 2, frames - 3, 2, 3);
  } else if (!short) {
    // a statement: he leans in on the first clause and comes back out at the full stop
    push('lean', LEAN * way, 1, frames - 3, 2, 3);
    push('slide', -SLIDE * way, 1, frames - 3, 2, 3);
  }
  // THE WEIGHT SHIFT. Once per line, at the clause boundary nearest the middle, and it stays: from
  // there to the end of the sentence he is standing on the other side of himself.
  if (clauses.length >= 2 && frames >= 26) {
    const mid = clauses[Math.max(1, Math.round(clauses.length / 2)) - 1][1];
    push('lean', -SHIFT * way * (q ? -1 : 1) * 2, mid, frames - 3, 2, 3);
    push('slide', SLIDE * way * (q ? -1 : 1) * 1.6, mid, frames - 3, 2, 3);
  }
  // A head tilt per clause, from the second one on (the first clause already has the posture's),
  // and never two the same running. TWO AT MOST in a line, and only for a clause that lasts more
  // than a second: a tilt on every comma is a nodding dog, and a puppet's head is the last thing
  // that moves, not the first.
  let tIdx = Math.floor(h01(salt, 9) * TILTS.length);
  let tilts = 0;
  for (let c = q ? 1 : 0; c < clauses.length && tilts < 2; c++) {
    const [f0, f1] = clauses[c];
    if (f1 - f0 < 14) continue;
    tIdx = (tIdx + 2 + Math.floor(h01(salt + c, 11) * 2)) % TILTS.length;
    const v = TILTS[tIdx];
    if (!v) continue;
    push('tilt', deg(v), f0 + 2, Math.min(f1, frames - 3), 2, 2);
    tilts++;
  }
  // A HAND for a clause he means: up at the wrist, HELD, and down at the full stop. Alternating
  // sides down the line, at most one at a time, and never in the last few frames — a hand still
  // in the air when the caption is gone reads as a freeze.
  let side = h01(salt, 13) < 0.5 ? 'L' : 'R';
  let hands = 0;
  for (let c = 0; c < clauses.length && hands < 2; c++) {
    const [f0, f1] = clauses[c];
    if (f1 - f0 < 16) continue;
    push('hand' + side, HAND_UP, f0 + 3, Math.min(f1 - 2, frames - 4), 2, 2);
    side = side === 'L' ? 'R' : 'L';
    hands++;
  }
  return { frames, mouths, nods, clauses, body, question: q };
}

export async function build(ctx) {
  const pepe = ctx.pieces.pepe;
  const ok = !!(pepe?.parts?.head && pepe.parts.handL && pepe.parts.handR);
  const P = pepe?.parts ?? {};
  const TORSO = P.torso ?? null;
  const HIP = TORSO ? { x: TORSO.position.x, y: TORSO.position.y } : { x: 0, y: 0 };
  const HEAD_REST = pepe?.headRest ?? { x: 0, y: pepe?.headY ?? ctx.layout.pepe.headY, z: P.head?.position.z ?? 0 };

  // ---- background business, on the absolute frame count (breathing and blinking never stop)
  const blinks = sequence({ first: 30, gapMin: 48, gapMax: 84, salt: 1 });
  const breaths = sequence({ first: 10, gapMin: 40, gapMax: 54, salt: 2 });
  // glances away while he talks, on the frame count since the line began
  const glances = sequence({ first: 20, gapMin: 30, gapMax: 60, salt: 3 });

  let mode = 'idle';
  let since = 0; // clock.t when the mode began
  let talk = null; // { sheet, since, loop }
  let shot = null; // one-shot: { kind, since, side, frames }
  let considerUntil = 0;
  let listenUntil = 0;
  let loopGesture = false;
  let lineNo = 0; // which line of the evening this is: the postures alternate off it
  let forceMouth = null; // ?animMouth=o|flat|rest — a builder's check of the replacement mouths

  const pose = {
    torso: { lean: 0, slide: 0, breath: 0 },
    head: { tilt: 0, lift: 0, drop: 0, turn: 0 },
    hands: { L: { up: 0, lift: 0, dx: 0, dy: 0 }, R: { up: 0, lift: 0, dx: 0, dy: 0 } },
    gaze: [0, 0],
    lids: 0,
    mouth: 'rest',
  };
  const setGaze = (name, k = 1) => {
    const g = GAZE[name] ?? GAZE.rest;
    pose.gaze[0] = g[0] * k;
    pose.gaze[1] = g[1] * k;
    pose.head.turn = (TURN_OF[name] ?? 0) * TURN * k;
  };
  const framesSince = (t0) => Math.round((ctx.clock.t - t0) * FPS);

  // one entry of a body sheet, laid on the pose
  function layBeat(b, F) {
    const k = pulse(F, b.f0, b.n, b.f1, b.m);
    if (k <= 0.0001) return;
    if (b.ch === 'lean') pose.torso.lean += b.v * k;
    else if (b.ch === 'slide') pose.torso.slide += b.v * k;
    else if (b.ch === 'tilt') pose.head.tilt += b.v * k;
    else if (b.ch === 'handL') pose.hands.L.up += b.v * k;
    else if (b.ch === 'handR') pose.hands.R.up += b.v * k;
  }

  // ---- the modes
  // Idle is an exposure sheet 5.5 seconds long, repeated with hashed variations: which way he
  // glances, how far the head tilts, which haunch his weight is on, which hand stirs. Five beats
  // in sixty-six frames — a beat about every second — and a snap and a hold at every one of them.
  function idle(F) {
    const Pd = 66, n = Math.floor(F / Pd), d = F - n * Pd;
    const pick = (arr, salt, k) => arr[Math.floor(h01(k, salt) * arr.length)];
    // glances: one at 8, another at 40; the second never repeats the first
    const g1 = pick(GLANCES, 31, n), g2raw = pick(GLANCES, 32, n);
    const g2 = g2raw === g1 ? GLANCES[(GLANCES.indexOf(g2raw) + 3) % GLANCES.length] : g2raw;
    if (d >= 40) setGaze(g2);
    else if (d >= 8) setGaze(g1);
    else if (n > 0) setGaze(g2); // still holding the previous loop's last glance
    // head: a tilt at 20 (3 frames) held to the loop's end, where the next loop's value takes over
    const tiltOf = (k) => (k < 0 ? 0 : pick(TILTS, 41, k));
    const t1 = tiltOf(n), t0 = tiltOf(n - 1);
    pose.head.tilt += deg(t0 + (t1 - t0) * stepIn(d, 20, 3));
    // THE WEIGHT. He is not standing square: every loop he is on one haunch or the other, and it
    // changes ONCE, in three frames, half way through. Nothing else on the body moves until then.
    const wayOf = (k) => (k < 0 ? 0 : h01(k, 47) < 0.5 ? -1 : 1);
    const w1 = wayOf(n), w0 = wayOf(n - 1);
    const w = w0 + (w1 - w0) * stepIn(d, 30, 3);
    pose.torso.lean += SHIFT * 0.8 * w;
    pose.torso.slide += SLIDE * 0.7 * w;
    // one hand stirs: a lift at the wrist (2 frames), held a second and a half, set down (2 frames)
    const side = n % 2 ? 'L' : 'R';
    pose.hands[side].up += deg(6) * pulse(d, 50, 2, 62, 2);
  }

  // Listening. The hardest thing a puppet does and the one the film is best at: he leans IN, a
  // hair, and then does almost nothing at all for as long as it takes — a slow blink, one small
  // tilt held for two seconds. The stillness is the performance; it is what makes the next snap
  // read as a decision.
  function listenLoop(F) {
    pose.torso.lean += LEAN * 0.7 * stepIn(F, 1, 2);
    pose.torso.slide += -SLIDE * 0.5 * stepIn(F, 1, 2);
    const Pd = 84, n = Math.floor(F / Pd), d = F - n * Pd;
    pose.head.tilt += deg(n % 2 ? 2.5 : -2) * pulse(d, 14, 2, 48, 2);
    setGaze('visitor');
    if (d >= 60 && d < 63) pose.lids = 1; // a long blink: three frames, not the usual two
  }

  function talking(F) {
    const sh = talk.sheet;
    if (F >= sh.frames) return false;
    pose.mouth = sh.mouths[Math.floor(F / 2)] ?? 'rest';
    for (const b of sh.body) layBeat(b, F);
    for (const n of sh.nods) {
      const d = F - n;
      if (d < 0 || d >= 6) continue;
      // the nod: the head dips 3 mm and tilts 2° toward the visitor's right for four frames
      const k = d < 2 ? (d + 1) / 2 : d < 4 ? 1 : (6 - d) / 3;
      pose.head.drop += 3 * MM * k;
      pose.head.tilt += deg(-2) * k;
    }
    // he looks at the visitor while he speaks; a glance away on the long holds
    const g = glances.at(F);
    setGaze(g && g.i % 3 === 2 ? 'cards' : 'visitor');
    return true;
  }

  // the reveal gesture: one hand up 20° at the wrist in three frames, held, snapped back
  function gestureLoop(F) {
    const Pd = 54, n = Math.floor(F / Pd), d = F - n * Pd;
    const side = n % 2 ? 'L' : 'R';
    pose.hands[side].up += deg(20) * pulse(d, 4, 3, 28, 2);
    pose.torso.lean += LEAN * (side === 'L' ? -1 : 1) * pulse(d, 4, 3, 30, 2);
    if (d >= 7 && d < 30) setGaze('visitor');
    if (d >= 31 && d < 33) pose.lids = 1;
    if (d >= 4 && d < 30) pose.head.tilt += deg(side === 'L' ? 2 : -2) * stepIn(d, 4, 3);
  }

  // consideration: the pin goes back, the head tilts, the eyes go up and away, a long hold
  function considerLoop(F) {
    const Pd = 48, d = F % Pd;
    const k = pulse(d, 4, 3, 36, 2);
    pose.head.tilt += deg(4) * k;
    pose.torso.lean += -LEAN_BACK * k;
    pose.torso.slide += SLIDE * 0.5 * k;
    if (d >= 5 && d < 26) setGaze('upLeft');
    else if (d >= 26 && d < 37) setGaze('upRight');
    pose.hands.R.up += deg(5) * pulse(d, 6, 2, 36, 2);
    if ((d >= 20 && d < 22) || (d >= 40 && d < 42)) pose.lids = 1;
  }

  // one-shots on top of the mode
  function oneShot(F) {
    const sh = shot;
    if (F >= sh.frames) {
      if (!sh.loop) shot = null; // a judging state repeats the shot; the show plays it once
      return;
    }
    if (sh.kind === 'gesture') {
      pose.hands[sh.side].up += deg(20) * pulse(F, 0, 3, sh.frames - 3, 2);
      pose.torso.lean += LEAN * (sh.side === 'L' ? -1 : 1) * pulse(F, 0, 3, sh.frames - 2, 2);
      if (F >= 3 && F < sh.frames - 2) setGaze('visitor');
    } else if (sh.kind === 'react') {
      // a start: the whole of him straightens 3 mm and the mouth opens, then a blink, then back
      const k = pulse(F, 0, 1, 10, 2);
      pose.head.lift += 4 * MM * k;
      pose.torso.breath = Math.max(pose.torso.breath, k);
      pose.torso.lean -= LEAN_BACK * 0.8 * k;
      pose.mouth = F < 10 ? 'o' : 'rest';
      pose.lids = F >= 11 && F < 13 ? 1 : 0;
      setGaze('visitor');
    } else if (sh.kind === 'nod') {
      // he has heard the visitor: one dip of the head and a hair of the shoulders, four frames
      const k = pulse(F, 0, 2, 5, 2);
      pose.head.drop += 4 * MM * k;
      pose.head.tilt += deg(-2.5) * k;
      pose.torso.lean += LEAN * 0.5 * k;
      setGaze('visitor');
    } else if (sh.kind === 'deal') {
      // the near hand goes to the deck in three frames, holds, and comes back in three; the pin
      // turns with it, because a puppet reaches with its shoulder and not with its wrist
      const k = pulse(F, 0, 3, 8, 3);
      const h = pose.hands[sh.side];
      h.up += deg(28) * k;
      // 18 mm, not 50. The cut-out hand is tucked under the sleeve on a green tab 15 drawing-pixels
      // long (tools/pepe-cutout.mjs, the `tab` mask); slide it further than the tab and the joint
      // opens — a strip of paper between the cuff and the hand, which on a paper puppet is the
      // limb coming off. So the reach is mostly the WRIST turning and the hip leaning into it, and
      // the translation stays inside the lap of the sleeve.
      h.dx += 0.018 * k * (sh.side === 'L' ? -1 : 1);
      h.dy += 0.014 * k;
      pose.torso.lean += LEAN * 1.3 * (sh.side === 'L' ? -1 : 1) * k;
      pose.torso.slide += SLIDE * (sh.side === 'L' ? -1 : 1) * k;
      pose.head.tilt += deg(2) * (sh.side === 'L' ? 1 : -1) * k;
      setGaze('cards');
    } else if (sh.kind === 'shuffle') {
      // the hands take turns lifting 8° at the wrist, a riffle; he stoops to it and stays stooped
      const beat = Math.floor(F / 3) % 2;
      pose.hands.L.up += deg(8) * (beat === 0 && F < sh.frames - 3 ? 1 : 0);
      pose.hands.R.up += deg(8) * (beat === 1 && F < sh.frames - 3 ? 1 : 0);
      pose.torso.lean += LEAN * 0.7 * pulse(F, 0, 2, sh.frames - 3, 2);
      pose.head.drop += 3 * MM * pulse(F, 0, 2, sh.frames - 3, 2);
      setGaze('cards');
    } else if (sh.kind === 'turn') {
      pose.hands[sh.side].up += deg(15) * pulse(F, 0, 2, 6, 2);
      pose.torso.lean += LEAN * 0.9 * (sh.side === 'L' ? -1 : 1) * pulse(F, 0, 2, 7, 2);
      setGaze('cards');
    }
  }

  function apply() {
    if (!ok) return;
    const T = pose.torso;
    if (TORSO) {
      // THE PIN. A lean is a rotation about it and a breath is a scale about it — so the shoulders
      // and the head move together, the way they do on a body, and the crossed legs stay where the
      // bench holds them (the feet are 44 drawing-pixels from the pin, the head 320).
      TORSO.rotation.set(0, 0, T.lean);
      TORSO.position.set(HIP.x + T.slide, HIP.y, 0);
      TORSO.scale.set(1 + BREATH_X * T.breath, 1 + BREATH_Y * T.breath, 1);
    }
    const H = pose.head;
    P.head.position.set(HEAD_REST.x + H.turn, HEAD_REST.y + H.lift - H.drop, HEAD_REST.z);
    P.headPivot.rotation.set(0, 0, H.tilt);
    for (const side of ['L', 'R']) {
      // a hand lent to the cloth (pepe.reach) is not posed at all: the shoulder holds still and it
      // comes back exactly where it left, the way a puppet's limb waits in the tray
      if (pepe.handIsOff?.(side)) continue;
      const g = P['hand' + side], h = pose.hands[side];
      const rest = g.userData.rest;
      g.rotation.set(0, 0, (side === 'L' ? -1 : 1) * h.up);
      g.position.set(rest.x + h.dx, rest.y + h.lift + h.dy, g.position.z);
    }
    pepe.setGaze(pose.gaze[0] * MM, pose.gaze[1] * MM);
    pepe.setLids(pose.lids > 0.5);
    pepe.setMouth(pose.mouth);
  }

  const api = {
    play(name) {
      const m = name === 'default' ? 'idle' : name;
      if (m === mode) return;
      mode = m;
      since = ctx.clock.t;
      loopGesture = m === 'gesture';
    },
    // Called by dialogue for every line: the mouths follow the typed characters for `seconds`, and
    // the body takes the line's posture — which way he leans, where the weight goes, which hand
    // means it. `lineNo` alternates the posture so two sentences running are never the same shape.
    say(text, seconds = Math.max(1.2, String(text).length / 28)) {
      talk = { sheet: buildSheet(String(text), seconds, lineNo++), since: ctx.clock.t };
      if (mode !== 'talk') {
        mode = 'talk';
        since = ctx.clock.t;
      }
    },
    // The visitor has the floor. He leans in and holds still until somebody says otherwise.
    listen(seconds = 60) {
      mode = 'listen';
      since = ctx.clock.t;
      listenUntil = ctx.clock.t + seconds;
      talk = null;
    },
    gesture(side = 'R', hold = 1.6) {
      ctx.pieces.sound?.play?.('creak'); // the bench takes his weight when he shifts it
      shot = { kind: 'gesture', side: side === 'L' ? 'L' : 'R', since: ctx.clock.t, frames: Math.round(hold * FPS) + 5 };
      return shot.frames / FPS;
    },
    consider(seconds = 3) {
      mode = 'consider';
      since = ctx.clock.t;
      considerUntil = ctx.clock.t + seconds;
    },
    react(kind = 'surprise') {
      // the bench takes his weight when he throws it about; a nod of the head is silent
      if (kind !== 'nod') ctx.pieces.sound?.play?.('creak');
      shot = { kind: kind === 'nod' ? 'nod' : 'react', since: ctx.clock.t, frames: kind === 'nod' ? 9 : 14 };
      return shot.frames / FPS;
    },
    // `side` says which hand does it, so his puppet body agrees with whichever drawn hand the
    // reveal has on the cloth. Left out, it is the one beside the deck, as it always was.
    deal(i = 0, side = 'R') {
      shot = { kind: 'deal', side: side === 'L' ? 'L' : 'R', since: ctx.clock.t, frames: 11 };
      return shot.frames / FPS;
    },
    shuffle(seconds = 1.5) {
      shot = { kind: 'shuffle', since: ctx.clock.t, frames: Math.round(seconds * FPS) };
      return shot.frames / FPS;
    },
    turn(i = 0, side = 'R') {
      shot = { kind: 'turn', side: side === 'L' ? 'L' : 'R', since: ctx.clock.t, frames: 9 };
      return shot.frames / FPS;
    },
    setState(name) {
      const m = name === 'default' ? 'idle' : name;
      mode = ['deal', 'shuffle', 'turn', 'react'].includes(m) ? 'idle' : m;
      // a frozen clock (?t=) counts from zero so `?t=1.5` shows frame 18 of the state
      since = ctx.clock.frozen ? 0 : ctx.clock.t;
      talk = null;
      shot = null;
      lineNo = 0;
      loopGesture = m === 'gesture';
      considerUntil = Infinity;
      listenUntil = Infinity;
      if (m === 'talk') {
        const line = 'The cards do not care what you want. That is their charm. Sit up, please, and say nothing yet; the first card is already unhappy with you.';
        talk = { sheet: buildSheet(line, line.length / 28 + 0.2, 0), since, loop: true };
      }
      // the one-shot states repeat on a loop with a hold between, so a sheet catches the whole move
      if (m === 'deal') shot = { kind: 'deal', side: 'R', since, frames: 11, loop: 26 };
      if (m === 'shuffle') shot = { kind: 'shuffle', since, frames: 18, loop: 32 };
      if (m === 'turn') shot = { kind: 'turn', side: 'R', since, frames: 9, loop: 24 };
      if (m === 'react') shot = { kind: 'react', since, frames: 14, loop: 30 };
      if (ctx.params?.has('animMouth')) forceMouth = ctx.params.get('animMouth');
    },
    update(ctx) {
      if (!ok || !ctx.clock.stepped) return;
      const t = ctx.clock.t;
      const Fabs = ctx.clock.frame;

      // reset to the rest pose, then layer the mode, then the one-shot
      pose.torso.lean = pose.torso.slide = pose.torso.breath = 0;
      pose.head.tilt = pose.head.lift = pose.head.drop = pose.head.turn = 0;
      for (const side of ['L', 'R']) pose.hands[side].up = pose.hands[side].lift = pose.hands[side].dx = pose.hands[side].dy = 0;
      pose.gaze[0] = pose.gaze[1] = 0;
      pose.lids = 0;
      pose.mouth = 'rest';

      // BREATH. Two frames in, a second's hold, two frames out — and it is a scale about the hip
      // pin, so what rises is the chest and the shoulders and the head on top of them. Round 5
      // lifted the head and the hands and left the body they hang off standing still.
      const br = breaths.at(Fabs);
      if (br) {
        const k = pulse(Fabs, br.start, 2, br.start + 12, 2);
        pose.torso.breath = k;
        pose.hands.L.lift = pose.hands.R.lift = 1.5 * MM * k;
      }
      // blinks: two frames closed, now and then twice
      const bl = blinks.at(Fabs);
      if (bl) {
        const d = Fabs - bl.start;
        if (d < 2 || (h01(bl.i, 7) < 0.22 && d >= 4 && d < 6)) pose.lids = 1;
      }

      if (mode === 'talk') {
        const F = talk ? framesSince(talk.since) : Infinity;
        const alive = talk && talking(F);
        if (!alive) {
          if (talk?.loop) {
            // the judging state: the line repeats after a short hold
            if (F >= talk.sheet.frames + 10) talk.since = t;
            idle(framesSince(since));
            setGaze('visitor');
          } else {
            mode = 'idle';
            since = t;
            talk = null;
          }
        }
      }
      if (mode === 'listen') {
        if (t > listenUntil) {
          mode = 'idle';
          since = t;
        } else listenLoop(framesSince(since));
      }
      if (mode === 'consider') {
        if (t > considerUntil) {
          mode = 'idle';
          since = t;
        } else considerLoop(framesSince(since));
      }
      if (mode === 'gesture') {
        if (loopGesture) gestureLoop(framesSince(since));
        else {
          mode = 'idle';
          since = t;
        }
      }
      if (mode === 'idle') idle(framesSince(since));
      if (shot) {
        const F = framesSince(shot.since);
        oneShot(shot.loop ? F % shot.loop : F);
      }
      if (forceMouth) pose.mouth = forceMouth;

      apply();
    },
  };
  // The visitor has answered: he takes it in with one dip of the head before he replies. Hung on
  // the event rather than asked of flow, so no other piece has to know about it.
  ctx.on?.('dialogue:answer', () => {
    if (!shot) api.react('nod');
  });
  return api;
}
