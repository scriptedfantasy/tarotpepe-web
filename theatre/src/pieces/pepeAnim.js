// PIECE: pepeAnim — how the cut-out moves. Paper-theatre animation on twos, the way a stop-motion
// animator works from an exposure sheet: a pose is held for seconds, then changes in two or three
// stepped frames, then holds again. Nothing eases. The puppet has a head hinged at the neck, two
// hands hinged at the wrists, pupils that slide, lids that close for two frames, and three
// replacement mouths (the drawing's own lips, a small "o", a thin closed line).
//
// Everything is a function of the 12 fps frame count since the current mode began, so a state is
// deterministic and a frozen clock shows a definite frame. Modes: idle, talk, gesture, consider.
// One-shots (a gesture, a reaction, the deal, a shuffle, a turn) overlay the mode for their length.
//
// api: play(mode), say(text, seconds), gesture(side, hold), consider(seconds), react(kind),
//      deal(i, side), shuffle(), turn(i, side), setState(name), update(ctx)
// deal and turn take the side of the hand that does it, so his body agrees with whichever drawn
// hand the reveal has on the cloth; left out it is his right, as before. A hand lent away with
// pepe.reach(side) is left alone here, so it comes back exactly where it left.
import * as THREE from 'three';
import { hash } from '../core/rng.js';

export const meta = {
  name: 'pepeAnim',
  judge: { shot: 'pepe', states: ['idle', 'talk', 'gesture', 'consider'], motion: true },
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

// The exposure sheet for a spoken line: per frame pair (twos) a mouth, plus nod and hand beats.
// The mouths chatter o / flat / o / flat through the letters and rest at every gap.
function buildSheet(text, seconds) {
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

  // stresses: long words and clause ends get a nod; clauses get a hand
  const nods = [];
  const hands = [];
  const re = /[A-Za-z'’]+[.,;:!?]?/g;
  let match, lastNod = -20, clauseStart = 0, sideIdx = 0;
  while ((match = re.exec(text))) {
    const w = match[0];
    const f = Math.floor(match.index / cpf);
    const ends = /[.,;:!?]$/.test(w);
    if ((w.replace(/[^A-Za-z]/g, '').length >= 6 || ends) && f - lastNod >= 12) {
      nods.push(f);
      lastNod = f;
    }
    if (ends) {
      const f1 = Math.floor((match.index + w.length) / cpf);
      if (f1 - clauseStart >= 14 && f1 <= frames - 4) hands.push({ side: sideIdx % 2 ? 'L' : 'R', f0: clauseStart + 2, f1: f1 - 2 });
      sideIdx++;
      clauseStart = f1;
    }
  }
  if (hands.length === 0 && frames >= 18) hands.push({ side: 'R', f0: 2, f1: frames - 5 });
  return { frames, mouths, nods, hands };
}

export async function build(ctx) {
  const pepe = ctx.pieces.pepe;
  const ok = !!(pepe?.parts?.head && pepe.parts.handL && pepe.parts.handR);
  const P = pepe?.parts ?? {};
  const headY = pepe?.headY ?? ctx.layout.pepe.headY;
  const Z_HEAD = P.head?.position.z ?? 0;

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
  let loopGesture = false;
  let forceMouth = null; // ?animMouth=o|flat|rest — a builder's check of the replacement mouths

  const pose = {
    head: { tilt: 0, lift: 0, drop: 0 },
    hands: { L: { up: 0, lift: 0, dx: 0, dy: 0 }, R: { up: 0, lift: 0, dx: 0, dy: 0 } },
    gaze: [0, 0],
    lids: 0,
    mouth: 'rest',
  };
  const setGaze = (name, k = 1) => {
    const g = GAZE[name] ?? GAZE.rest;
    pose.gaze[0] = g[0] * k;
    pose.gaze[1] = g[1] * k;
  };
  const framesSince = (t0) => Math.round((ctx.clock.t - t0) * FPS);

  // ---- the modes
  // Idle is an exposure sheet six seconds long, repeated with hashed variations: which way he
  // glances, how far the head tilts, which hand stirs. Every beat is a snap and a hold.
  function idle(F) {
    const Pd = 72, n = Math.floor(F / Pd), d = F - n * Pd;
    const pick = (arr, salt, k) => arr[Math.floor(h01(k, salt) * arr.length)];
    // glances: one at 10, another at 44; the second never repeats the first
    const g1 = pick(GLANCES, 31, n), g2raw = pick(GLANCES, 32, n);
    const g2 = g2raw === g1 ? GLANCES[(GLANCES.indexOf(g2raw) + 3) % GLANCES.length] : g2raw;
    if (d >= 44) setGaze(g2);
    else if (d >= 10) setGaze(g1);
    else if (n > 0) setGaze(g2); // still holding the previous loop's last glance
    // head: a tilt at 24 (3 frames) held to the loop's end, where the next loop's value takes over
    const tiltOf = (k) => (k < 0 ? 0 : pick(TILTS, 41, k));
    const t1 = tiltOf(n), t0 = tiltOf(n - 1);
    pose.head.tilt = deg(t0 + (t1 - t0) * stepIn(d, 24, 3));
    // one hand stirs: a 6° lift at the wrist (2 frames), held a second, set down (2 frames)
    const side = n % 2 ? 'L' : 'R';
    pose.hands[side].up = deg(6) * pulse(d, 54, 2, 66, 2);
  }

  function talking(F) {
    const sh = talk.sheet;
    if (F >= sh.frames) return false;
    pose.mouth = sh.mouths[Math.floor(F / 2)] ?? 'rest';
    for (const n of sh.nods) {
      const d = F - n;
      if (d < 0 || d >= 6) continue;
      // the nod: the head dips 3 mm and tilts 2° toward the visitor's right for four frames
      const k = d < 2 ? (d + 1) / 2 : d < 4 ? 1 : (6 - d) / 3;
      pose.head.drop = 3 * MM * k;
      pose.head.tilt += deg(-2) * k;
    }
    for (const h of sh.hands) pose.hands[h.side].up += deg(10) * pulse(F, h.f0, 2, h.f1, 2);
    // he looks at the visitor while he speaks; a glance away on the long holds
    const g = glances.at(F);
    setGaze(g && g.i % 3 === 2 ? 'cards' : 'visitor');
    return true;
  }

  // the reveal gesture: one hand up 20° at the wrist in three frames, held, snapped back
  function gestureLoop(F) {
    const Pd = 54, n = Math.floor(F / Pd), d = F - n * Pd;
    const side = n % 2 ? 'L' : 'R';
    pose.hands[side].up = deg(20) * pulse(d, 4, 3, 28, 2);
    if (d >= 7 && d < 30) setGaze('visitor');
    if (d >= 31 && d < 33) pose.lids = 1;
    if (d >= 4 && d < 30) pose.head.tilt = deg(side === 'L' ? 2 : -2) * stepIn(d, 4, 3);
  }

  // consideration: the head tilts 4°, the eyes go up and away, a long hold
  function considerLoop(F) {
    const Pd = 48, d = F % Pd;
    const k = pulse(d, 4, 3, 36, 2);
    pose.head.tilt = deg(4) * k;
    if (d >= 5 && d < 26) setGaze('upLeft');
    else if (d >= 26 && d < 37) setGaze('upRight');
    pose.hands.R.up = deg(5) * pulse(d, 6, 2, 36, 2);
    if ((d >= 20 && d < 22) || (d >= 40 && d < 42)) pose.lids = 1;
  }

  // one-shots on top of the mode
  function oneShot(F) {
    const sh = shot;
    if (F >= sh.frames) {
      shot = null;
      return;
    }
    if (sh.kind === 'gesture') {
      pose.hands[sh.side].up = deg(20) * pulse(F, 0, 3, sh.frames - 3, 2);
      if (F >= 3 && F < sh.frames - 2) setGaze('visitor');
    } else if (sh.kind === 'react') {
      // a start: the head lifts 6 mm and the mouth opens, then a blink, then back
      const k = pulse(F, 0, 1, 10, 2);
      pose.head.lift += 6 * MM * k;
      pose.mouth = F < 10 ? 'o' : 'rest';
      pose.lids = F >= 11 && F < 13 ? 1 : 0;
      setGaze('visitor');
    } else if (sh.kind === 'deal') {
      // the near hand (his left, the visitor's right, beside the deck) goes to the deck in three
      // frames, holds, and comes back in three
      const k = pulse(F, 0, 3, 8, 3);
      const h = pose.hands.R;
      h.up += deg(24) * k;
      h.dx += 0.05 * k;
      h.dy += 0.04 * k;
      setGaze('cards');
    } else if (sh.kind === 'shuffle') {
      // the hands take turns lifting 8° at the wrist, a riffle
      const beat = Math.floor(F / 3) % 2;
      pose.hands.L.up += deg(8) * (beat === 0 && F < sh.frames - 3 ? 1 : 0);
      pose.hands.R.up += deg(8) * (beat === 1 && F < sh.frames - 3 ? 1 : 0);
      setGaze('cards');
    } else if (sh.kind === 'turn') {
      pose.hands[sh.side].up += deg(15) * pulse(F, 0, 2, 6, 2);
      setGaze('cards');
    }
  }

  function apply() {
    if (!ok) return;
    const H = pose.head;
    P.head.position.set(0, headY + H.lift - H.drop, Z_HEAD);
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
    // Called by dialogue for every line: the mouths follow the typed characters for `seconds`.
    say(text, seconds = Math.max(1.2, String(text).length / 28)) {
      talk = { sheet: buildSheet(String(text), seconds), since: ctx.clock.t };
      if (mode !== 'talk') {
        mode = 'talk';
        since = ctx.clock.t;
      }
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
      ctx.pieces.sound?.play?.('creak');
      shot = { kind: 'react', since: ctx.clock.t, frames: 14 };
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
      mode = m;
      // a frozen clock (?t=) counts from zero so `?t=1.5` shows frame 18 of the state
      since = ctx.clock.frozen ? 0 : ctx.clock.t;
      talk = null;
      shot = null;
      loopGesture = m === 'gesture';
      considerUntil = Infinity;
      if (m === 'talk') {
        const line = 'The cards do not care what you want. That is their charm. Sit up, please, and say nothing yet; the first card is already unhappy with you.';
        talk = { sheet: buildSheet(line, line.length / 28 + 0.2), since, loop: true };
      }
      if (ctx.params?.has('animMouth')) forceMouth = ctx.params.get('animMouth');
    },
    update(ctx) {
      if (!ok || !ctx.clock.stepped) return;
      const t = ctx.clock.t;
      const Fabs = ctx.clock.frame;

      // reset to the rest pose, then layer the mode, then the one-shot
      pose.head.tilt = pose.head.lift = pose.head.drop = 0;
      for (const side of ['L', 'R']) pose.hands[side].up = pose.hands[side].lift = pose.hands[side].dx = pose.hands[side].dy = 0;
      pose.gaze[0] = pose.gaze[1] = 0;
      pose.lids = 0;
      pose.mouth = 'rest';

      // breathing: the head and hands lift 4 mm in two frames, hold, and settle in two
      const br = breaths.at(Fabs);
      if (br) {
        const k = pulse(Fabs, br.start, 2, br.start + 12, 2);
        pose.head.lift = 4 * MM * k;
        pose.hands.L.lift = pose.hands.R.lift = 4 * MM * k;
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
      if (shot) oneShot(framesSince(shot.since));
      if (forceMouth) pose.mouth = forceMouth;

      apply();
    },
  };
  return api;
}
