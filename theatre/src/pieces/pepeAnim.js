// PIECE: pepeAnim — how Pepe moves. Limited animation on twos, the way a stop-motion animator
// works from an exposure sheet: a pose is held for seconds, then changes in two or three stepped
// frames, then holds again. Nothing eases. Blinks are two frames. The mouth is replacement
// animation: three mouths (closed, a small "o", an "ah") swapped in time with the typed line.
//
// Everything is a function of the 12 fps frame count since the current mode began, so a state is
// deterministic and a frozen clock shows a definite frame. Modes: idle, talk, gesture, consider.
// One-shots (a gesture, a reaction, the deal flick) overlay the mode for their length.
//
// api: play(mode), say(text, seconds), gesture(side), consider(seconds), react(kind), deal(i),
//      setState(name), update(ctx)
import * as THREE from 'three';
import { hash } from '../core/rng.js';
import { buildRig, armPose, cloneArm, lerpArm } from './pepeAnim-rig.js';

export const meta = {
  name: 'pepeAnim',
  judge: { shot: 'pepe', states: ['idle', 'talk', 'gesture', 'consider'], motion: true },
  files: ['src/pieces/pepeAnim.js', 'src/pieces/pepeAnim-rig.js'],
};

const FPS = 12;
const deg = THREE.MathUtils.degToRad;
const clamp = THREE.MathUtils.clamp;
// 0..1 hash of an event index and a channel salt
const h01 = (i, salt) => (hash(i * 13.37 + salt * 101.7 + 0.5) + 1) / 2;
// stepped in-between: 0 before frame f0, then 1/n, 2/n … 1 over the n frames from f0, then 1
const stepIn = (F, f0, n) => (F < f0 ? 0 : Math.min(1, (F - f0 + 1) / n));
// a move there and back: up over `n` frames at f0, held, down over `m` frames at f1
const pulse = (F, f0, n, f1, m) => stepIn(F, f0, n) - stepIn(F, f1, m);

// Gaze targets (radians): up, side. The rest gaze already looks a hair right and down.
const GAZE = {
  rest: [0, 0],
  visitor: [0.28, -0.3],
  upLeft: [0.34, -0.55],
  upRight: [0.32, 0.18],
  left: [0.12, -0.6],
  right: [0.08, 0.3],
  cards: [-0.22, -0.1],
  up: [0.4, -0.2],
};
const GLANCES = ['visitor', 'left', 'cards', 'upLeft', 'right', 'visitor', 'up', 'cards', 'upRight'];
const TILTS = [-4, -2, 0, 2.5, 4];
const TURNS = [-3, 0, 3, 0];

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
function buildSheet(text, seconds) {
  const frames = Math.max(4, Math.round(seconds * FPS));
  const pairs = Math.ceil(frames / 2);
  const cpf = text.length / frames;
  const mouths = [];
  let open = 0;
  for (let k = 0; k < pairs; k++) {
    const c0 = Math.floor(k * 2 * cpf), c1 = Math.max(c0 + 1, Math.floor((k + 1) * 2 * cpf));
    const chunk = text.slice(c0, c1).toLowerCase();
    let m = 'rest';
    if (c0 < text.length && !/[\s.,;:!?—-]/.test(chunk)) {
      if (/[ouw]/.test(chunk)) m = 'o';
      else if (/[aeiy]/.test(chunk)) m = 'ah';
    }
    if (m !== 'rest' && ++open > 3) {
      m = 'rest';
      open = 0;
    } else if (m === 'rest') open = 0;
    mouths.push(m);
  }
  // the last three pairs are silent: the line is typed before Pepe stops moving
  for (let k = Math.max(0, pairs - 2); k < pairs; k++) mouths[k] = 'rest';

  // stresses: long words and clause ends get a nod; clauses get a hand
  const nods = [];
  const hands = [];
  const re = /[A-Za-z'’]+[.,;:!?]?/g;
  let match, lastNod = -20, clause = 0, clauseStart = 0, sideIdx = 0;
  while ((match = re.exec(text))) {
    const w = match[0];
    const f = Math.floor(match.index / cpf);
    const ends = /[.,;:!?]$/.test(w);
    if ((w.replace(/[^A-Za-z]/g, '').length >= 5 || ends) && f - lastNod >= 10) {
      nods.push(f);
      lastNod = f;
    }
    if (ends) {
      const f1 = Math.floor((match.index + w.length) / cpf);
      if (f1 - clauseStart >= 14 && f1 <= frames - 4) hands.push({ side: sideIdx % 2 ? 'L' : 'R', f0: clauseStart + 2, f1: f1 - 2 });
      sideIdx++;
      clause++;
      clauseStart = f1;
    }
  }
  if (hands.length === 0 && frames >= 18) hands.push({ side: 'R', f0: 2, f1: frames - 5 });
  return { frames, mouths, nods, hands };
}

export async function build(ctx) {
  const pepe = ctx.pieces.pepe;
  const rig = pepe?.group && pepe?.parts ? buildRig(ctx, pepe) : null;
  const armL = rig?.arms.L?.rest, armR = rig?.arms.R?.rest;

  // ---- named arm poses (Pepe's group space: origin on the floor under him, +z toward the visitor)
  const poses = {};
  for (const side of ['L', 'R']) {
    const rest = rig?.arms[side]?.rest;
    if (!rest) continue;
    const s = side === 'L' ? -1 : 1;
    const W = rest.W;
    poses[side] = {
      rest,
      // the hand lifts off the cloth, fingertips up 30°, palm still open: "so."
      offer: armPose([W.x, W.y + 0.04, W.z - 0.01], [s, -0.5, 0.35], [s * 0.3, 0.5, 0.87], [0, 0.87, -0.5]),
      // fingers drum: the hand pitches up at the wrist, heel still on the cloth
      drum: armPose([W.x, W.y + 0.006, W.z - 0.01], [s, -0.7, 0.3], [s * 0.3, 0.36, 0.93], [0, 0.93, -0.36]),
      // the reveal gesture: the hand up beside the shoulder, fingers splayed, palm to the visitor
      raised: armPose([s * 0.29, 1.03, 0.27], [s, -0.35, 0.25], [s * 0.28, 1, 0.12], [0, 0.1, 1]),
      // chin in hand: the fingers lie along the cheek, the heel of the hand under the jaw
      lip: armPose([s * 0.15, 1.005, 0.2], [s, -0.5, 0.3], [s * 0.12, 0.93, -0.34], [-s, 0.15, -0.2]),
      // the deal: the near hand up, palm down, fingers toward the deck
      deal: armPose([W.x + s * 0.04, W.y + 0.07, W.z + 0.03], [s, -0.4, 0.35], [s * 0.6, -0.15, 0.8], [0, -1, 0.15]),
      flick: armPose([W.x + s * 0.05, W.y + 0.05, W.z + 0.05], [s, -0.4, 0.35], [s * 0.8, -0.45, 0.45], [-s * 0.2, -0.9, 0.35]),
    };
  }

  // ---- background business, on the absolute frame count (breathing and blinking never stop)
  const blinks = sequence({ first: 30, gapMin: 50, gapMax: 84, salt: 1 });
  const breaths = sequence({ first: 10, gapMin: 40, gapMax: 54, salt: 2 });
  // glances away while he talks, on the frame count since the line began
  const glances = sequence({ first: 20, gapMin: 30, gapMax: 60, salt: 3 });

  let mode = 'idle';
  let since = 0; // clock.t when the mode began
  let talk = null; // { sheet, since }
  let shot = null; // one-shot: { kind, since, side, frames }
  let considerUntil = 0;
  let loopGesture = false;
  let forceMouth = null; // ?animMouth=o|ah|rest — a builder's check of the replacement mouths

  const pose = {
    head: { tilt: 0, nod: 0, turn: 0, lift: 0 },
    eyes: { up: 0, side: 0 },
    lids: { close: 0, wide: 0 },
    mouth: 'rest',
    breath: 0,
    arms: { L: armL ? cloneArm(armL) : null, R: armR ? cloneArm(armR) : null },
  };
  const setGaze = (name, k = 1) => {
    const g = GAZE[name] ?? GAZE.rest;
    pose.eyes.up = g[0] * k;
    pose.eyes.side = g[1] * k;
  };
  const setArm = (side, name, k) => {
    const p = poses[side];
    if (!p || !pose.arms[side]) return;
    lerpArm(pose.arms[side], p.rest, p[name] ?? p.rest, clamp(k, 0, 1));
  };
  const framesSince = (t0) => Math.round((ctx.clock.t - t0) * FPS);

  // ---- the modes
  // Idle is an exposure sheet six seconds long, repeated with hashed variations: which way he
  // glances, how far the head tilts, which hand drums. Every beat is a snap and a hold.
  function idle(F) {
    const P = 72, n = Math.floor(F / P), d = F - n * P;
    const pick = (arr, salt, k) => arr[Math.floor(h01(k, salt) * arr.length)];
    // glances: one at 10, another at 44; the second never repeats the first
    const g1 = pick(GLANCES, 31, n), g2raw = pick(GLANCES, 32, n);
    const g2 = g2raw === g1 ? GLANCES[(GLANCES.indexOf(g2raw) + 3) % GLANCES.length] : g2raw;
    if (d >= 44) setGaze(g2);
    else if (d >= 10) setGaze(g1);
    else if (n > 0) setGaze(g2); // still holding the previous loop's last glance
    // head: a tilt at 24 (3 frames) held to the loop's end, where the next loop's value takes over
    const tiltOf = (k) => (k < 0 ? [0, 0] : [pick(TILTS, 41, k), pick(TURNS, 43, k)]);
    const [t1, u1] = tiltOf(n), [t0, u0] = tiltOf(n - 1);
    const k = stepIn(d, 24, 3);
    pose.head.tilt = deg(t0 + (t1 - t0) * k);
    pose.head.turn = deg(u0 + (u1 - u0) * k);
    // a small second adjustment late in the loop: the chin lifts a hair, or drops
    if (d >= 60) pose.head.nod = deg(h01(n, 45) < 0.5 ? -1.5 : 1.5);
    // one hand drums (odd loops) or the fingers of the other spread flatter (even loops)
    const side = n % 2 ? 'L' : 'R';
    setArm(side, 'drum', pulse(d, 54, 2, 66, 2));
  }

  function talking(F) {
    const sh = talk.sheet;
    if (F >= sh.frames) return false;
    pose.mouth = sh.mouths[Math.floor(F / 2)] ?? 'rest';
    for (const n of sh.nods) {
      const d = F - n;
      if (d < 0 || d >= 7) continue;
      pose.head.nod = 0.05 * (d < 2 ? (d + 1) / 2 : d < 5 ? 1 : (7 - d) / 3);
    }
    for (const h of sh.hands) setArm(h.side, 'offer', pulse(F, h.f0, 2, h.f1, 2));
    // he looks at the visitor while he speaks; a glance away on the long holds
    const g = glances.at(F);
    setGaze(g && g.i % 3 === 2 ? 'cards' : 'visitor');
    return true;
  }

  // the reveal gesture: one hand up beside the shoulder, fingers splayed, held, snapped back
  function gestureLoop(F) {
    const P = 54, n = Math.floor(F / P), d = F - n * P;
    const side = n % 2 ? 'L' : 'R';
    setArm(side, 'raised', pulse(d, 4, 3, 28, 2));
    if (d >= 7 && d < 30) setGaze('visitor');
    if (d >= 31 && d < 33) pose.lids.close = 1;
    if (d >= 4 && d < 30) pose.head.turn = deg(side === 'L' ? 2 : -2) * stepIn(d, 4, 3);
  }

  // consideration: head tilts, eyes go up and away, a finger comes to the lip, a long hold
  function considerLoop(F) {
    const P = 48, d = F % P;
    const k = pulse(d, 4, 3, 36, 2);
    pose.head.tilt = deg(-7) * k;
    pose.head.turn = deg(3) * k;
    if (d >= 5 && d < 26) setGaze('upLeft');
    else if (d >= 26 && d < 37) setGaze('upRight');
    setArm('R', 'lip', pulse(d, 6, 3, 36, 2));
    if ((d >= 20 && d < 22) || (d >= 40 && d < 42)) pose.lids.close = 1;
  }

  // one-shots on top of the mode
  function oneShot(F) {
    const sh = shot;
    if (F >= sh.frames) {
      shot = null;
      return;
    }
    if (sh.kind === 'gesture') {
      setArm(sh.side, 'raised', pulse(F, 0, 3, sh.frames - 3, 2));
      if (F >= 3 && F < sh.frames - 2) setGaze('visitor');
    } else if (sh.kind === 'react') {
      pose.lids.wide = F < 12 ? 1 : 0;
      pose.lids.close = F >= 13 && F < 15 ? 1 : 0;
      pose.mouth = F < 12 ? 'ah' : 'rest';
      pose.head.nod = deg(-4) * pulse(F, 0, 1, 12, 2);
      pose.head.lift = 0.006 * pulse(F, 0, 1, 12, 2);
      setGaze('visitor');
    } else if (sh.kind === 'deal') {
      const flick = F >= 7 && F < 10;
      setArm(sh.side, flick ? 'flick' : 'deal', F < 7 ? stepIn(F, 0, 2) : F < 10 ? 1 : 1 - stepIn(F, 10, 3));
      setGaze('cards');
    }
  }

  const api = {
    poses,
    rig,
    play(name) {
      const m = name === 'default' ? 'idle' : name;
      if (m === mode) return;
      mode = m;
      since = ctx.clock.t;
      loopGesture = m === 'gesture';
    },
    // Called by dialogue for every line: the mouth follows the typed characters for `seconds`.
    say(text, seconds = Math.max(1.2, text.length / 28)) {
      talk = { sheet: buildSheet(String(text), seconds), since: ctx.clock.t };
      if (mode !== 'talk') {
        mode = 'talk';
        since = ctx.clock.t;
      }
    },
    gesture(side = 'R', hold = 1.6) {
      shot = { kind: 'gesture', side: side === 'L' ? 'L' : 'R', since: ctx.clock.t, frames: Math.round(hold * FPS) + 5 };
      return shot.frames / FPS;
    },
    consider(seconds = 3) {
      mode = 'consider';
      since = ctx.clock.t;
      considerUntil = ctx.clock.t + seconds;
    },
    react(kind = 'surprise') {
      shot = { kind: 'react', since: ctx.clock.t, frames: 16 };
      return shot.frames / FPS;
    },
    // the near hand rises over the cloth, flicks toward the deck, returns (the deck itself is out of
    // reach of the seated pose, so this is the dealer's flick, not a grab)
    deal(i = 0) {
      shot = { kind: 'deal', side: 'R', since: ctx.clock.t, frames: 14 };
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
      if (!rig?.ok || !ctx.clock.stepped) return;
      const t = ctx.clock.t;
      const Fabs = ctx.clock.frame;

      // reset to the rest pose, then layer the mode, then the one-shot
      pose.head.tilt = pose.head.nod = pose.head.turn = pose.head.lift = 0;
      pose.eyes.up = pose.eyes.side = 0;
      pose.lids.close = pose.lids.wide = 0;
      pose.mouth = 'rest';
      pose.breath = 0;
      if (armL) lerpArm(pose.arms.L, armL, armL, 0);
      if (armR) lerpArm(pose.arms.R, armR, armR, 0);

      // breathing: the shoulders lift in two frames, hold, and settle in two
      const br = breaths.at(Fabs);
      if (br) pose.breath = pulse(Fabs, br.start, 2, br.start + 10, 2);
      // blinks: two frames closed, now and then twice
      const bl = blinks.at(Fabs);
      if (bl) {
        const d = Fabs - bl.start;
        if (d < 2 || (h01(bl.i, 7) < 0.22 && d >= 4 && d < 6)) pose.lids.close = 1;
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

      rig.apply(pose);
    },
  };
  return api;
}
