// PIECE: entrance — the film opens on a door, and the way in is one move.
//
// One drawn door, dead centre on a bare sheet, with TAROT PEPE cut into the glass of its fanlight.
// Nothing else: no title card, no chapter, no picture. It is not a still: the sheet is struck again
// on every 12 fps two, so the door is alive before anything happens to it and the visitor is
// looking at a drawing rather than a picture. The visitor clicks; the latch goes, the leaf shivers
// one frame, and then it swings in eight stepped drawings on twos — and through the widening
// doorway the parlour is there, because the doorway is punched clean out of this layer and what
// shows through it is the live drawing underneath. One beat against the stop, and then the visitor
// walks in.
//
// ROUND 4 — THE WALK IN ENDS WHERE THE EVENING IS WATCHED FROM. The user, on round 3: "when walking
// through the door, we get into the room, then we get a cut with a zoom out. feels yanky. what if
// we walk into the room and directly take the far position?" He is right, and there were two
// corrections where there should have been none. Round 3 held the camera still at `threshold` for
// the whole of the door, trucked the drawn sheet at it, and CUT to `home` — a cut that moved the
// camera 20 cm BACKWARDS and lifted the frame, immediately after the picture had rushed forwards.
// Walking in and then being yanked back is exactly what he saw.
//
// So there is no cut in the arrival any more. The camera stands out on the landing at a STANDING
// eye height, a stride and a bit back from `home`, and on the visitor's first step it pushes — one
// straight dolly down the room's own axis, on `clock.raw`, decelerating into the solved `home` and
// stopping dead. It is not a move to somewhere near `home`: the pose is asked of the camera piece
// every frame and the last thing the move does is `camera.cut('home')`, so the frame it settles on
// IS the frame the camera piece solved for this window, to the pixel, and nothing has to correct
// afterwards. The eight centimetres of eye height go with it: the visitor comes in on their feet
// and sits down, in the same move rather than in a cut.
//
// AND THE SHEET LEAVES THE FRAME INSTEAD OF BEING SWITCHED OFF. Round 3's truck stopped at 7.4 —
// which is about where the doorway swallows the frame, but nowhere near where the LEAF does. Its
// free edge is pulled back towards the doorway's middle by the face's own perspective, so at the
// last drawing of the walk a third of the picture was still door, and the cut was what removed it.
// The truck now runs to the number the geometry asks for (`coverZooms`), in two parts: five
// drawings of approach, ending where the doorway is bigger than the frame, and then three even
// steps of the leaf's edge sweeping off the left — a foreground wipe, not a switch. By the time the
// sheet is taken away it is drawing nothing at all, at any window shape, and the camera is still
// gliding. Nothing pops because there is nothing left to pop.
//
// THE WAY OUT is the same move backwards, and it is the reason the door is a piece rather than a
// title card: the `help` board offers the visitor a way to leave and emits `help:leave`. The camera
// pulls back to the landing FROM WHEREVER THE EVENING LEFT IT — the good night is said in `wide`,
// a visitor who goes mid-reading is looking straight down at the cloth — so that one is asked of
// the camera piece (`move`, which blends off the pose it is actually holding) rather than driven
// from here, and there is no snap to `home` first. The sheet trucks out until the door is a drawing
// on a sheet again, the leaf swings shut in eight drawings, the latch goes — and the evening is
// restarted behind the shut door, so the parlour the next click opens on is a clean one, with the
// conversation reset.
//
// API: open() — resolves when the camera has come to rest inside · leave() · showing · mode ·
//      setState(name)
//   states: closed · opening (the whole arrival, looped, deterministic in ctx.clock.raw) · open ·
//           arrived (played once and held: the frame to measure against `camera/home`) · leaving
import { drawEntrance, cutName, placement, coverZooms } from './entrance-door.js';

export const meta = {
  name: 'entrance',
  judge: { shot: 'home', states: ['closed', 'opening', 'open'] },
  files: ['src/pieces/entrance.js', 'src/pieces/entrance-door.js'],
};

const DEG = Math.PI / 180;
// The swing, drawing by drawing. It goes over quickly, slows against its own weight, overruns the
// stop by three degrees and comes back — the last two are the bounce a puppet door makes. Round 3
// tuned this and the user singled the door's line out as the best thing in the film: it is not
// touched.
const SWING = [5, 15, 31, 48, 62, 71, 78, 75].map((d) => d * DEG);
const OPEN = SWING[SWING.length - 1];

const HOLD = 2 / 12; // every drawing is on twos
const LATCH = 1 / 12; // one frame of shiver at the latch
const SHUT_AFTER_LATCH = 2 / 12;
const SWING_AT = LATCH + SHUT_AFTER_LATCH; // the first drawing of the swing
const SWING_END = SWING_AT + SWING.length * HOLD;
const REST = 2 / 12; // it stands against its stop for one beat
const TRUCK_AT = SWING_END + REST; // the visitor's first step
const STEPS = 8; // drawings in the walk: five of approach, three of the leaf sweeping past
const SHEET_OFF = TRUCK_AT + STEPS * HOLD; // the sheet is drawing nothing by now; it goes
// How long the camera takes to come in and stop. It starts on the visitor's first step and is still
// gliding when the drawn door has gone — two fifths of the way still to run at that moment, which
// is what keeps the seam where a cut used to be in the MIDDLE of a move rather than at the end of
// one.
const WALK_S = 2.3;
const ARRIVE_AT = TRUCK_AT + WALK_S;
// Where the camera stands on the landing, as an offset from the solved `home`: a stride and a half
// further out — 27% of the table's size, which is a push you feel and not a zoom — and eight
// centimetres taller, because the visitor comes in on their feet and sits down.
const BACK = 1.7;
const RISE = 0.08;
// the judging loop: shut, the swing, the walk in, the room held, again
const LOOP = ARRIVE_AT + 0.9;

// Leaving. The same figure backwards, a little brisker — a visitor who is going does not dawdle in
// the doorway — with the camera off `home` before the sheet moves at all.
const OUT_AT = 0.25; // a beat: he stands up, and nothing else happens
const OUT_WALK_S = 1.75;
const OUT_SWING_AT = OUT_AT + STEPS * HOLD;
const OUT_SHUT = OUT_SWING_AT + SWING.length * HOLD;
const LEAVE_END = OUT_SHUT + 3 / 12;

// the rail's motor: constant speed with a short ramp at each end, and zero speed at the stop. It is
// the camera piece's own curve (camera.js `motor`, ramp 0.22 for a push), written here because the
// sheet and the lens have to agree frame by frame and a shared number is the only way they can.
const RAMP = 0.22;
function motor(u) {
  u = Math.min(1, Math.max(0, u));
  const v = 1 / (1 - RAMP);
  if (u < RAMP) return (v * u * u) / (2 * RAMP);
  if (u > 1 - RAMP) return 1 - (v * (1 - u) * (1 - u)) / (2 * RAMP);
  return v * (u - RAMP / 2);
}

export async function build(ctx) {
  const root = document.createElement('div');
  root.id = 'entrance';
  const style = document.createElement('style');
  style.textContent = `
    #entrance { z-index: 6; display: none; pointer-events: none; }
    #entrance.up { display: block; pointer-events: auto; cursor: pointer; }
    #entrance canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  `;
  document.head.appendChild(style);
  const canvas = document.createElement('canvas');
  root.appendChild(canvas);
  ctx.dom.overlay.appendChild(root);

  let name = null; // the baked lettering, re-cut when the frame changes
  let nameKey = '';
  let mode = 'hidden'; // hidden · closed · walk · open · loop · exit
  let t0 = 0; // clock.raw at the click (or at the leaving)
  let drawnAt = ''; // the number of the drawing last put on the canvas
  let token = 0; // a restart lets an older open() go
  let knocked = null; // resolve of the promise the door is waiting on
  let zoomNow = 1; // how far the sheet has trucked in
  let leaving = null; // the promise of a walk back out, which open() waits behind
  let pulled = false; // the pull back off the room has been asked for (once, on the way out)

  const cue = (n) => ctx.pieces.sound?.play?.(n);

  function size() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = ctx.size?.w || window.innerWidth, h = ctx.size?.h || window.innerHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      drawnAt = '';
    }
    const key = `${Math.round(placement(w, h).s)}`;
    if (key !== nameKey) {
      nameKey = key;
      name = cutName(placement(w, h), dpr);
      drawnAt = '';
    }
    return { w, h, dpr };
  }

  // ---- the walk, measured on the frame it is being shown in ------------------------------------------
  // The eight drawings the sheet trucks through, and they are not a taste: `coverZooms` says where
  // the doorway is bigger than the frame (`hole`) and where the swung leaf's own edge has passed
  // its left edge (`leaf`). Five drawings of APPROACH, log-spaced the way round 3 spaced them — the
  // door swells the way a door swells when you walk at it — ending at `hole`, where the picture is
  // parlour everywhere except the leaf. Then three EVEN steps of that edge across what is left of
  // the frame: a foreground wipe at a constant speed, which is what the near side of a doorway does
  // as you pass it, and which lands the last drawing outside the paper altogether.
  //
  // The two numbers move a great deal with the window — 8 and 23 in a 16:9 frame, 2.3 and 6.7 on a
  // phone, because a phone's door starts half the width of its frame — but the COUNT and the TIMING
  // do not, so the walk is the same walk and the sound cues sit on the same beats everywhere.
  const APPROACH = [1.16, 1.6, 2.5, 4.2, 7.4]; // round 3's ramp, kept as the shape of the approach
  let truck = APPROACH.slice();
  let truckKey = '';
  function walk() {
    const { w, h } = size();
    const key = `${w}x${h}`;
    if (key === truckKey) return truck;
    truckKey = key;
    const { hole, leaf } = coverZooms(w, h, OPEN);
    const swallow = hole * 1.04; // the doorway is bigger than the frame
    const clear = Math.max(leaf * 1.04, swallow * 1.03); // ... and the leaf has passed its left edge
    const p = Math.log(APPROACH[APPROACH.length - 1]);
    const up = APPROACH.map((z) => Math.pow(swallow, Math.log(z) / p));
    // The leaf's edge on the sheet is a straight multiple of the zoom, so three EVEN steps of that
    // edge across what is left of the frame are three even steps of the zoom. (It works out at the
    // same wipe in any window: the edge stands at 0.81 of the frame's half-width on the last
    // drawing that draws anything, at 1600x900 and on a phone alike.)
    const out = [1, 2, 3].map((i) => swallow + ((clear - swallow) * i) / 3);
    truck = up.concat(out);
    return truck;
  }

  // The drawing boils while it waits. A held door is not a still: the same door is struck again on
  // every second frame, so its lines are never twice the same line — which is the one thing about
  // the film everybody recognises, and it is true before the visitor does anything.
  //
  // What re-rolls is the PEN only (drawEntrance's `boil`): how far each contour wanders off its
  // ideal line, how heavily it goes down, how round a small ring comes out. The marks themselves —
  // the rain-strokes on the wall, the mat's bristles, where the tone breaks — are placed once and
  // do not move, for a field of marks re-scattering six times a second is a fizz, not a boil. The
  // door stays the same door; it only refuses to sit still. `seed` still numbers the drawing, so
  // every pose of the swing gets its own pen, and the click continues the boil instead of popping.
  let boilNow = 0;
  function paint(p) {
    zoomNow = p.zoom;
    const key = `${p.k}|${boilNow}`;
    if (key === drawnAt) return;
    drawnAt = key;
    const { w, h, dpr } = size();
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawEntrance(g, w, h, { theta: p.theta, jolt: p.jolt, zoom: p.zoom, seed: 17 + p.k * 131, boil: boilNow, name });
  }

  // What a held cel does under a rostrum camera: it sits a whisker off its pegs, differently every
  // second frame. A transform, not a re-draw — the strokes must not move relative to each other.
  let wobbleAt = -1;
  function wobble(frame) {
    const f = Math.floor(frame / 2);
    if (f === wobbleAt) return;
    wobbleAt = f;
    const r = ((Math.sin(f * 12.9898) * 43758.5453) % 1 + 1) % 1;
    const r2 = ((Math.sin(f * 78.233 + 1.7) * 12543.7261) % 1 + 1) % 1;
    canvas.style.transform = `translate(${(r - 0.5).toFixed(3)}px, ${(r2 - 0.5).toFixed(3)}px) rotate(${((r - 0.5) * 0.06).toFixed(4)}deg) scale(1.004)`;
  }

  // ---- the camera, asked of the camera piece --------------------------------------------------------
  // `home` is solved for the window the film is being shown in (a phone gets a different lens from
  // a 16:9 frame), so the landing is not a place: it is `home` a stride further out and a head
  // taller, re-derived every frame from whatever the camera piece currently says `home` is. That is
  // also what makes a window dragged to a new shape during the walk re-frame instead of crop.
  // The arrival lands on `wide`, not `home`. The user asked for the walk to END where the evening is
  // watched from — "what if we walk into the room and directly take the far position?" — and `wide`
  // is that position: it is the frame flow held the conversation in, which it used to CUT to 0.9 s
  // after this move came to rest. Landing on `home` and then cutting wider was the pull-back they
  // called yanky. Change this one name and the whole arrival follows it.
  const LANDS_ON = 'wide';
  const HOME_FALLBACK = { pos: [0, 1.62, 6.4], look: [0, 1.62, -2.5], fov: 28, shift: [0, 0] };
  const homeShot = () => ctx.pieces.camera?.shots?.[LANDS_ON] ?? ctx.pieces.camera?.shots?.home ?? HOME_FALLBACK;
  // p = 0 out on the landing, p = 1 exactly `home`
  function shotAt(p) {
    const H = homeShot();
    const back = (1 - p) * BACK, rise = (1 - p) * RISE;
    return {
      pos: [H.pos[0], H.pos[1] + rise, H.pos[2] + back],
      look: [H.look[0], H.look[1] + rise, H.look[2]],
      up: H.up,
      fov: H.fov,
      shift: H.shift,
    };
  }
  // The last thing the move does is ask for the NAMED shot, so the camera settles on the very pose
  // the camera piece solved (and knows it is holding `home`, which is what a resize reframes from).
  function land() {
    ctx.pieces.camera?.cut?.(LANDS_ON);
  }
  function stand(p) {
    ctx.pieces.camera?.cut?.(shotAt(p));
  }

  // where the drawing is, `u` seconds after the click; `k` numbers the drawings
  function poseAt(u) {
    if (u < LATCH) return { k: 1, theta: 0, jolt: 2, zoom: 1 };
    if (u < SWING_AT) return { k: 2, theta: 0, jolt: 0, zoom: 1 };
    if (u < SWING_END) {
      const i = Math.floor((u - SWING_AT) / HOLD);
      return { k: 3 + i, theta: SWING[i], jolt: 0, zoom: 1 };
    }
    if (u < TRUCK_AT) return { k: 3 + SWING.length, theta: OPEN, jolt: 0, zoom: 1 };
    const T = walk();
    const i = Math.min(Math.floor((u - TRUCK_AT) / HOLD), T.length - 1);
    return { k: 4 + SWING.length + i, theta: OPEN, jolt: 0, zoom: T[i] };
  }
  // and going the other way: the sheet trucks out, then the leaf swings shut, then the latch
  function outPoseAt(v) {
    const T = walk();
    if (v < OUT_AT) return { k: 40, theta: OPEN, jolt: 0, zoom: T[T.length - 1] };
    if (v < OUT_SWING_AT) {
      const i = Math.min(Math.floor((v - OUT_AT) / HOLD), STEPS - 1);
      return { k: 41 + i, theta: OPEN, jolt: 0, zoom: i === STEPS - 1 ? 1 : T[T.length - 1 - i] };
    }
    if (v < OUT_SHUT) {
      const i = Math.min(Math.floor((v - OUT_SWING_AT) / HOLD), SWING.length - 1);
      return { k: 50 + i, theta: SWING[SWING.length - 1 - i], jolt: 0, zoom: 1 };
    }
    if (v < OUT_SHUT + LATCH) return { k: 59, theta: 0, jolt: 2, zoom: 1 };
    return SHUT;
  }
  const SHUT = { k: 0, theta: 0, jolt: 0, zoom: 1 };
  const WIDE = { k: 3 + SWING.length, theta: OPEN, jolt: 0, zoom: 1 };

  // The cues, laid across the whole figure in one go when it begins (see update). The door's own
  // four are round 3's, on round 3's beats — the swing has not moved. What is new is the walk: a
  // board under each of the visitor's three steps through the doorway, and NO cut, because there
  // is no longer a cut to sound.
  const CUES = [
    [0, 'latch'], // the thumb-piece, then the tongue off the strike plate
    [SWING_AT + HOLD, 'hinge'], // the hinges take the weight
    [SWING_AT + 4 * HOLD, 'hinge'],
    [SWING_END, 'knock'], // the leaf comes to rest against the stop: wood on wood
    [TRUCK_AT + HOLD, 'footfall'],
    [TRUCK_AT + 4 * HOLD, 'footfall'],
    [TRUCK_AT + 7 * HOLD, 'footfall'],
  ];
  // going out: three boards, the hinges taking the weight the other way, the leaf into its frame
  // and the tongue after it
  const OUT_CUES = [
    [OUT_AT + HOLD, 'footfall'],
    [OUT_AT + 3 * HOLD, 'footfall'],
    [OUT_AT + 5 * HOLD, 'footfall'],
    [OUT_SWING_AT + HOLD, 'hinge'],
    [OUT_SWING_AT + 4 * HOLD, 'hinge'],
    [OUT_SHUT, 'knock'],
    [OUT_SHUT + LATCH, 'latch'],
  ];
  let fired = 0;

  // the sheet on the pegs, or off them. Idempotent on purpose: `update` asks for it every frame and
  // a class toggle that also threw the drawing away would re-strike the cel sixty times a second,
  // which is a fizz and not a boil.
  function sheet(on) {
    if (root.classList.contains('up') === !!on) return;
    root.classList.toggle('up', !!on);
    if (on) drawnAt = '';
  }
  function show(kind) {
    mode = kind;
    sheet(true);
    drawnAt = '';
    zoomNow = 1;
    pulled = false;
    stand(0);
  }
  function hide() {
    mode = 'hidden';
    sheet(false);
  }

  // a click on the picture, or a key: the visitor knocks
  function knock() {
    return new Promise((res) => (knocked = res));
  }
  function onDown(e) {
    if (mode !== 'closed' || !knocked) return;
    e.preventDefault?.();
    const go = knocked;
    knocked = null;
    go();
  }
  function onKey(e) {
    if (mode !== 'closed' || !knocked) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key !== ' ' && e.key !== 'Enter') return;
    onDown(e);
  }
  root.addEventListener('pointerdown', onDown);
  if (!ctx.shotMode) window.addEventListener('keydown', onKey);

  // A window dragged to a new shape while the door is standing there is a new set of frames and a
  // new truck; put the camera back on the landing and re-cut the drawing.
  ctx.on?.('resize', () => {
    truckKey = '';
    drawnAt = '';
    if (mode === 'closed' || mode === 'open') stand(0);
  });

  // run a stepped figure to its end, letting an older visit go if it is superseded
  function play(mine, seconds) {
    return new Promise((res) => {
      const tick = () => {
        if (mine !== token) return res(false);
        if (ctx.clock.raw - t0 >= seconds) return res(true);
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  const api = {
    get showing() {
      return mode !== 'hidden';
    },
    get mode() {
      return mode;
    },

    // The opening. Resolves when the camera has come to rest inside the parlour, on `home`.
    async open() {
      if (leaving) await leaving; // a visitor on their way out gets to shut the door behind them
      const mine = ++token;
      knocked?.(); // an older visit standing at the door lets go
      knocked = null;
      if (ctx.shotMode) return; // a screenshot never waits at the door
      show('closed');
      paint(SHUT);
      await knock();
      if (mine !== token) return;
      // the visitor's first gesture is also what a browser wants before any sound
      ctx.pieces.sound?.start?.();
      mode = 'walk';
      t0 = ctx.clock.raw;
      fired = 0;
      if (!(await play(mine, ARRIVE_AT))) return;
      hide();
      land();
    },

    // The way out, for the `help` board: `help:leave`. The reverse of the arrival, ending on the
    // drawn door — and then the evening is started again behind it, so the parlour the next click
    // opens on has no conversation in it. Resolves when the door is shut.
    leave() {
      if (leaving) return leaving;
      if (mode !== 'hidden') return Promise.resolve(false); // already at the door, or on the way in
      const mine = ++token;
      knocked?.();
      knocked = null;
      // his last caption goes with the room rather than hanging over the shut door
      ctx.pieces.dialogue?.clear?.();
      ctx.pieces.mind?.abort?.();
      mode = 'exit';
      sheet(true);
      t0 = ctx.clock.raw;
      fired = 0;
      pulled = false;
      paint(outPoseAt(0)); // the sheet goes up already trucked past the frame: it draws nothing yet
      leaving = (async () => {
        const done = await play(mine, LEAVE_END);
        if (mine === token) {
          mode = 'closed';
          paint(SHUT);
          stand(0);
        }
        leaving = null;
        // The evening starts over from behind a shut door: flow clears the table, resets the mind
        // and comes straight back to `open()`, which is standing here waiting for the next click.
        if (done && mine === token) ctx.pieces.flow?.restart?.();
        return done;
      })();
      return leaving;
    },

    // a restart, or a judging state, lets a waiting door go
    stop() {
      token++;
      knocked?.();
      knocked = null;
      leaving = null;
      hide();
    },

    setState(nameState) {
      token++;
      knocked?.();
      knocked = null;
      leaving = null;
      if (nameState === 'open') {
        show('open');
        paint(WIDE);
      } else if (nameState === 'opening') {
        show('loop');
      } else if (nameState === 'leaving') {
        show('outloop');
      } else if (nameState === 'arrived') {
        // the arrival, played once and held: the frame to hold against `camera/home`
        const mine = token;
        show('walk');
        t0 = ctx.clock.raw;
        fired = 0;
        play(mine, ARRIVE_AT).then((done) => {
          if (!done || mine !== token) return;
          hide();
          land();
        });
      } else {
        show('closed');
        paint(SHUT);
      }
    },

    update(c) {
      if (mode === 'hidden') return;
      // One number for the whole re-photograph: the cel is drawn again AND laid down again on the
      // same twos, so the boil and the peg-wobble are one event and not two beating against each
      // other. 12 fps, never the render clock — at 60 the boil is a fizz.
      boilNow = c.clock.frame >> 1;
      // the cel sits a whisker off its pegs, differently every second frame — but only while the
      // sheet is still: a truck-in is movement enough
      if (zoomNow < 1.05) wobble(c.clock.frame);
      else canvas.style.transform = 'scale(1.004)';
      if (mode === 'closed') return paint(SHUT);
      if (mode === 'open') return paint(WIDE);
      // the whole arrival on a loop, driven by the clock alone: frozen at ?t it is one fixed
      // drawing at one fixed pose, which is what a judging state has to be
      if (mode === 'loop' || mode === 'outloop') {
        const going = mode === 'loop';
        const u = c.clock.raw % (going ? LOOP : LEAVE_END + 0.9);
        if (going) {
          stand(u <= TRUCK_AT ? 0 : motor((u - TRUCK_AT) / WALK_S));
          if (u < SHEET_OFF) {
            sheet(true);
            paint(poseAt(u));
          } else sheet(false);
        } else {
          stand(u <= OUT_AT ? 1 : 1 - motor((u - OUT_AT) / OUT_WALK_S));
          sheet(true);
          paint(outPoseAt(u));
        }
        return;
      }
      // the real thing
      const u = c.clock.raw - t0;
      // The cues are put down together, once, on the figure's own clock: sound.at() schedules them
      // on the AudioContext timeline, which is the one clock that does not stutter, so the door
      // stays a 2.6 s figure however slowly the frames arrive. Draining them frame by frame made
      // the whole door one click on a slow machine.
      if (fired === 0) {
        const list = mode === 'exit' ? OUT_CUES : CUES;
        fired = list.length;
        const S = ctx.pieces.sound;
        for (const [when, n] of list) (S?.at ? S.at(when, n) : cue(n));
      }
      if (mode === 'exit') {
        // Going out, the camera is wherever the evening left it — `wide` for the good night, a
        // plate over the table if the visitor leaves mid-reading — so the pull back is asked of the
        // camera piece rather than driven from here: `move` blends from the pose it is actually
        // holding, lens and lens-rise included, and there is no snap to `home` first.
        if (!pulled && u >= OUT_AT) {
          pulled = true;
          ctx.pieces.camera?.move?.(shotAt(0), { kind: 'push', duration: OUT_WALK_S });
        }
        paint(outPoseAt(u));
        return;
      }
      // the walk in: the sheet on twos, the lens on the rail, and the sheet taken away at the
      // drawing on which it has stopped covering any part of the picture
      if (u > TRUCK_AT) stand(motor((u - TRUCK_AT) / WALK_S));
      if (u < SHEET_OFF) paint(poseAt(u));
      else sheet(false);
    },
  };

  ctx.on?.('help:leave', () => api.leave());
  return api;
}
