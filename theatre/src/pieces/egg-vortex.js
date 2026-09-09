// PIECE: egg-vortex — the clock's ten seconds. An easter egg, and nothing in the room announces it:
// the cursor over the dial is the whole of the affordance, as it is for the radio.
//
// The user's words, which are the spec: "the clock itself - when you click it, it should start
// swirling for about 10 seconds, stronger and stronger, creating a hand drawn vortex that sucks in
// the whole room. as it ends the room pops out of the clock again and every thing is normal again."
//
// What happens, second by second:
//   0.0   the click. The hands let go and begin to turn, and the escapement goes with them: the
//         tick is the clock's own rate and it accelerates with the hands, not on a separate curve.
//   1.6   a swirl grows OUT OF THE FACE. It is a twist of the finished ink frame about the dial's
//         centre in screen space, with a radial pull along it, and its reach is a disc that starts
//         at the size of the dial and ends past the corners of the sheet — which is why the far
//         corners of the room are the last thing to come in.
//   5.6   THE ROOM STOPS BEING A ROOM. Until here it is a rectangle being turned and squeezed; from
//         here the drain runs (see `whirl` and `hole` below) and its own lines are wound into the
//         spiral's arms — the walls' edges, the pictures' edges and the edge of the drawing itself
//         leave the vertical and the horizontal and arrive as arcs.
//   9.6   nothing of it is left outside the vortex.
//  10.0   the sheet is BARE. Not faded, not covered: every pixel of the frame is now asking for
//         drawing from beyond the edge of the sheet, and there was never any there.
//  10.0→10.25  and it stays bare. Three twelfths of nothing at all, which is the beat the pop
//         needs to be a pop.
//  10.25→10.97  it pops back out: a damped spring, e^-6.5t·cos(11t), which crosses zero at 10.39,
//         overshoots to -0.155 at about 10.53 (the room a little larger than life and counter-
//         twisted a few degrees), and is home and still by 10.97. The hands ride the same spring
//         back through the real time and settle on it.
//   after  everything is exactly as it was. props' own tellTheTime has the dial again, the tick is
//         back at one a second, and ink's final pass is switched off, which means not compiled,
//         not allocated and not drawn.
//
// NOTHING HERE MOVES SMOOTHLY. Every number below is recomputed only on the 12 fps step, so the
// twist advances in the same twelfths as the pendulum, the boil and the hands; the pass reads the
// numbers a stepped frame left behind. And the pen stays a pen: the warp displaces marks and never
// mixes them (see egg-vortex-shader.js), the boil goes on boiling underneath because the whole ink
// pipeline is untouched, and four drawn spiral arms are laid over the swirl in the room's own ink,
// re-cut on the strike like every other line. Measured: over two seconds of a real run the twist
// took 25 values in 241 rendered frames — 12.5 a second on a 120 Hz screen.
import * as THREE from 'three';

// ── the shape of the ten seconds ──────────────────────────────────────────────────────────────
export const T = {
  wind: 0.0,     // the click: the hands let go
  swirl: 1.6,    // the swirl starts out of the face
  drain: 5.6,    // the room stops being a room: its own lines start flowing into the arms
  peak: 10.0,    // the room is all the way in, and the sheet is bare
  bare: 10.25,   // …and it stays bare. Three twelfths of nothing at all, and then the pop
  pop: 10.393,   // the spring's first zero crossing: the room is back out and going past itself
  done: 10.97,   // home, still, and switched off
};
const SPRING = (tau) => Math.exp(-6.5 * tau) * Math.cos(11 * tau);
const mix25_6 = (u) => 0.55 * Math.pow(u, 2.5) + 0.45 * Math.pow(u, 6);
const sat = (u) => Math.max(0, Math.min(1, u));
// where in the wind-up the drain starts, as a fraction of it: t = 5.6 s of the 1.6 → 10.0 climb
const DRAIN0 = (T.drain - T.swirl) / (T.peak - T.swirl);

// The whole effect in one signed number k(t): 0 before the swirl, 1 at the peak, and the spring's
// small negative tail on the way home. Everything the pass is given is a function of it.
export function vortexAt(t) {
  if (t < 0 || t >= T.done) return null;
  const spin = Math.min(t, T.peak) / T.peak; // the hands and the tick run from the click, not the swirl
  // …and the quarter second of nothing sits INSIDE k, between the peak and the spring, so that
  // every number below holds at its wound-up value while the sheet is empty and the spring, when
  // it comes, starts from a room that is genuinely gone.
  const k = t < T.peak ? Math.pow(Math.max(0, (t - T.swirl) / (T.peak - T.swirl)), 1.0)
    : t < T.bare ? 1
    : SPRING(t - T.bare);
  const fwd = Math.max(0, k), back = Math.min(0, k);
  // the drain's own phase: 0 until the sixth second, 1 at the peak — and, because it is a function
  // of k and not of t, it un-drains on the spring's way home without a curve of its own.
  const drain = sat((fwd - DRAIN0) / (1 - DRAIN0));
  return {
    t,
    k,
    // the hands: 9t² minutes, so a quarter of a turn in the first second and fifteen turns by the
    // tenth, and then the spring carries them back through the real time and settles on it
    minutes: t < T.peak ? 9 * t * t : 900 * k,
    // the escapement's rate, one to eight and back. The tick is the hands' own sound.
    rate: t < T.peak ? 1 + 7 * Math.pow(spin, 1.7) : 1 + 7 * fwd,
    pendulum: 0.16 + 0.15 * (t < T.peak ? spin : fwd),
    // …and where the bob is: the integral of that rate, closed-form rather than accumulated, so a
    // frozen frame draws the same bob every time it is asked for
    swings: Math.min(t, T.peak) + (7 * Math.pow(Math.min(t, T.peak), 2.7)) / (2.7 * Math.pow(T.peak, 1.7)) + Math.max(0, t - T.peak),
    // …and the screen.
    // STRONGER AND STRONGER, and the cubes are the whole of that word. A linear twist over eight
    // seconds is a slow pan for six of them and then a shrug; cubed, the room is bent at four
    // seconds, wound at seven and gone at ten, which is the shape the user described. The first
    // tuning ran u^1.6 and had eaten the room by t = 6 with four seconds still to go.
    grow: fwd,
    // …and `back` is the spring's negative tail: a counter-twist of a few degrees and a pull
    // the wrong way, which is the room a little LARGER than life for a twelfth of a second before
    // it settles. That is the pop.
    //
    // TWO POWERS, NOT ONE, and the second one is why. The clock hangs 245 px from the TOP of a
    // 800 px frame and 555 px from the bottom, so the drawing runs out overhead long before it runs
    // out underfoot: at a pull of 2 the whole upper half of the frame is already asking for room
    // that was never inside the picture, and gets bare paper. On a single cube the room was a
    // crescent at the top edge by t = 8 with two seconds still to run. The 2.5 keeps the middle
    // seconds moving and the 6 holds the collapse back until the last second and a half, which is
    // where "and then it is gone" belongs.
    twist: 9.0 * mix25_6(fwd) + 2.0 * back,
    pull: 5.0 * mix25_6(fwd) + 1.0 * back,
    // …and how far out from the middle each reaches. High early (only the clock's own corner of the
    // room is disturbed), falling as the swirl takes the frame: the far corners come in last.
    twistFall: 2.4 - 0.8 * fwd,
    pullFall: 2.6 - 0.9 * fwd,
    // ── AND THEN THE ROOM GOES DOWN IT ───────────────────────────────────────────────────────
    // The user, on the wind-up above: "you're now keeping the room drawing square but morphing its
    // outlines. what if all the lines would actually turn into the actual vortex and the room would
    // vortex out of existence entirely? only to pop back once everything has been imploded." They
    // are describing what the falloffs cannot do. `twist` dies off over `reach`, so by the time the
    // drawing is small it sits where the falloff is flat: one angle for the whole of it, which is a
    // rotation, which is why the room stayed a rectangle to the end. These two numbers are the
    // answer and they are handed to the pass, not to the room:
    //   whirl — radians per e-fold of radius. Shear that does not care how big the thing is, so the
    //           room's own lines are wound into arms of the spiral at every scale, and go on being
    //           wound as the last of it shrinks past a nib's width.
    //   hole  — how far past the sheet's far corner the pull now reaches, 0..1 of it. It is a pull
    //           with NO falloff: at 1 every pixel of the frame asks for drawing from beyond the
    //           edge of the sheet and is given paper. That is the whole of "out of existence" —
    //           nothing dissolves, nothing fades; the lines leave by the middle, innermost first,
    //           and the corners, having furthest to go, are the last four things on the paper.
    // Both hold at full through the bare quarter second, and both are gone by the second frame of
    // the pop, because both are functions of k.
    //
    // 3.5 AND NOT MORE, AND THE LIMIT IS THE PAPER'S, NOT THE EYE'S. Shear is measured against the
    // squeeze it is added to: by nine seconds a pixel already stands for four or five of drawing,
    // and a whirl of five and a half then drags what is left more than twenty pixels of the room
    // sideways between one pixel of the frame and the next. Nothing survives that but a black
    // knot — the mark stops being a line and becomes a count of how much ink was nearby. At three
    // and a half the arcs stay arcs: the hatching on the far wall is still hatching at t = 9.
    whirl: 3.5 * Math.pow(drain, 0.9),
    hole: Math.pow(sat((drain - 0.80) / 0.20), 1.6),
    drain,
    arms: Math.max(0, Math.min(1, (fwd - 0.02) / 0.16)),
    // FEWER WINDINGS THAN LOOKS RIGHT ON PAPER. Three arms at 2.2 turns each puts six or seven
    // crossings on every radius, each winding 100 px inside the last, and the eye reads a target,
    // not a spiral. At one turn the radius doubles inside a single revolution and the three strokes
    // are plainly three strokes going round — which is what a hand draws when it draws a whirl.
    armTurns: 1.0 + 0.35 * fwd,
    armPhase: 5.0 * Math.pow(fwd, 2.2),
  };
}

// ── the switches: the arbiter for everything in the room a pointer can work ────────────────────
// One listener on the glass, one cursor, one order of precedence. A switch is { name, at(x, y),
// down(), enabled() } and the first one whose box the pointer is in gets the click; the rest never
// hear it. It exists because the radio and the clock both want the same three events and the same
// cursor, and because flow.js reads any pointerdown on the window as the visitor skipping Pepe's
// line — which someone reaching for a switch did not mean — so the event has to stop here.
export function makeSwitches(ctx) {
  const glass = ctx.renderer?.domElement ?? null;
  const list = [];
  let hovered = null, cursorMine = false;

  const pick = (ev) => {
    if (!glass) return null;
    const r = glass.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const px = ev.clientX - r.left, py = ev.clientY - r.top;
    for (const s of list) {
      if (s.enabled && !s.enabled()) continue;
      if (s.at(px, py, ev)) return s;
    }
    return null;
  };
  function setHover(s) {
    if (hovered === s) return;
    hovered = s;
    if (!glass) return;
    if (s) {
      glass.style.cursor = 'pointer';
      cursorMine = true;
    } else if (cursorMine) {
      // only ever put back what this piece put there: reveal-fan.js and help.js share the cursor
      glass.style.cursor = '';
      cursorMine = false;
    }
  }
  glass?.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'touch') return;
    setHover(pick(ev));
  });
  glass?.addEventListener('pointerleave', (ev) => {
    if (ev.pointerType !== 'touch') setHover(null);
  });
  glass?.addEventListener('pointerdown', (ev) => {
    const s = pick(ev);
    if (!s) return;
    ctx.pieces.sound?.start?.(); // sound's own "first gesture" unlock lives on the window we stop
    ev.stopPropagation();
    s.down(ev);
  });

  return {
    add(sw) {
      list.push(sw);
      return sw;
    },
    get hovered() {
      return hovered?.name ?? null;
    },
    get names() {
      return list.map((s) => s.name);
    },
  };
}

// ── the egg ────────────────────────────────────────────────────────────────────────────────────
// `clock` is the wall clock's group (props-objects.js wallClock), `switches` the arbiter above.
export function buildVortex(ctx, { clock, switches, dial = 0.185, setTime = null } = {}) {
  const MIN_TAP = 44; // px: what a thumb needs, whatever the dial measures on the glass
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const _v = new THREE.Vector3();
  const ink = () => ctx.pieces.ink; // built after props: never cached
  const sound = () => ctx.pieces.sound;

  let frame0 = -1; // the 12 fps frame the click landed on
  let hold = null; // ?vortex=<t> / the vortex-mid judging state: sit at one instant, for a frame
  let phase = null; // the last phase announced
  let told = false; // has the tick rate been pushed away from 1?

  // ?now=HH:MM pins the dial so a screenshot of the room is reproducible (props.js reads the same
  // parameter for the same reason); the hands this piece spins are spun off that same base.
  const pinned = (ctx.params ?? new URLSearchParams(location.search)).get('now');
  const pinnedAt = /^\d{1,2}:\d{2}$/.test(pinned ?? '') ? pinned.split(':').map(Number) : null;
  const now = () => {
    const d = new Date();
    if (pinnedAt) d.setHours(pinnedAt[0], pinnedAt[1], 0, 0);
    return d;
  };

  // ?vortex=<t> shows the effect at t seconds, frozen there. It is a dev parameter and it is how a
  // still of a ten-second thing is taken; it does not start the clock's hands turning on their own.
  const asked = ctx.params?.get?.('vortex');
  if (asked != null && asked !== '' && Number.isFinite(+asked)) hold = Math.max(0, +asked);

  // the dial's box on the glass, in px — the face's own eight corners, projected, the way the
  // radio's is (props.js RADIO.hitBox)
  function hitBox() {
    if (!clock) return null;
    clock.updateMatrixWorld(true);
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const xs = [], ys = [];
    for (const dx of [-dial, dial]) for (const dy of [-dial, dial]) for (const dz of [-0.03, 0.03]) {
      _v.set(dx, dy, dz);
      clock.localToWorld(_v).project(ctx.camera);
      xs.push(((_v.x + 1) / 2) * W);
      ys.push(((1 - _v.y) / 2) * H);
    }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  // …grown about its centre to at least 44 px each way. The clock hangs dead centre of the back
  // wall, which is the one place a portrait frame keeps (the radio's cart is cropped away on a
  // phone and the radio with it), so on a phone this is the room's reachable switch.
  function tapBox() {
    const b = hitBox();
    if (!b) return null;
    const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
  }
  function onClock(px, py) {
    if (!clock) return false;
    const glass = ctx.renderer?.domElement;
    const r = glass?.getBoundingClientRect();
    if (!r || !r.width) return false;
    // the drawing first: a pointer actually on the clock, wherever it is on screen
    ndc.set((px / r.width) * 2 - 1, -(py / r.height) * 2 + 1);
    ray.setFromCamera(ndc, ctx.camera);
    if (ray.intersectObject(clock, true).length) return true;
    const b = tapBox();
    return !!b && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
  }

  const api = {
    // where in the ten seconds we are, or 0
    get t() {
      if (hold != null) return hold;
      if (frame0 < 0) return 0;
      return (ctx.clock.frame - frame0) / ctx.clock.fps;
    },
    get active() {
      return vortexAt(api.t) != null && (hold != null || frame0 >= 0);
    },
    hitBox,
    tapBox,
    // A click while it runs does nothing: it is ten seconds, not a lever.
    start() {
      if (api.active) return false;
      hold = null;
      frame0 = ctx.clock.frame;
      phase = null;
      step(ctx); // the first drawing of it lands on the frame of the click, not the one after
      return true;
    },
    // …and the same thing from a tool: any instant, no reload. tools/_egg-vortex-proof.mjs takes
    // eleven frames of a ten-second thing and the headless build is the whole of the cost.
    at(v) {
      hold = v == null ? null : Math.max(0, +v);
      frame0 = -1;
      phase = null;
      step(ctx);
      // …and then the two things on the dial that this piece borrows and props owns: the hands and
      // the bob. props.update puts both back where the room's own time says every stepped frame and
      // lets this piece override them; a tool freezes the scene clock, so props.update is not
      // running, and a still taken AFTER the ten seconds would otherwise keep the hands at fifteen
      // hours past and the bob at whatever angle the last instant left. Between them they are the
      // whole of the difference between a t = 11 frame and a t = 0 one.
      if (!api.active) {
        setTime?.(now());
        const p = clock?.userData?.pendulum;
        if (p) p.rotation.z = 0.16 * Math.sin(ctx.clock.t * Math.PI);
      }
    },
    // for a still: sit at one instant of the effect (the `vortex-mid` judging state is t = 6)
    setState(name = 'default') {
      const m = /^vortex(?:-(mid|start|peak|back|out))?$/.exec(name ?? '');
      if (!m) {
        if (hold != null || frame0 >= 0) { hold = null; frame0 = -1; step(ctx); }
        return;
      }
      hold = { mid: 6, start: 2, peak: 9.5, back: 10.3, out: 6 }[m[1] ?? 'mid'];
      frame0 = -1;
      step(ctx);
    },
    update: step,
  };

  // the switch. Registered with the arbiter, which owns the cursor and stops the event.
  switches?.add({
    name: 'clock',
    object: () => clock,
    tapBox,
    // a click while it runs does nothing, and the cursor says so by not being a pointer
    enabled: () => !api.active,
    onDown: () => api.start(),
  });

  // ── the frame ────────────────────────────────────────────────────────────────────────────────
  // Called from props.update, which is already inside `if (ctx.clock.stepped)`: everything below
  // moves on the twelfth and holds between them.
  function step(c = ctx) {
    const v = api.active ? vortexAt(api.t) : null;
    const target = ink()?.vortex;

    if (!v) {
      if (target && target.active) target.active = false;
      if (told) {
        told = false;
        sound()?.setTickRate?.(1);
      }
      if (frame0 >= 0 && hold == null) {
        const at = api.t;
        frame0 = -1;
        // the dial goes back to the visitor's own time, this frame, not when the minute next turns
        setTime?.(now());
        say('done', at);
        phase = null;
      }
      return;
    }

    // the hands, and the pendulum with them
    if (setTime) {
      const d = now();
      d.setTime(d.getTime() + v.minutes * 60000);
      setTime(d);
    }
    const pend = clock?.userData?.pendulum;
    if (pend) pend.rotation.z = v.pendulum * Math.sin(v.swings * Math.PI);
    // the escapement
    if (sound()?.setTickRate) {
      sound().setTickRate(v.rate);
      told = true;
    }

    // the screen
    if (target) {
      const W = c.size?.w || window.innerWidth, H = c.size?.h || window.innerHeight;
      const diag = Math.hypot(W, H);
      const box = hitBox();
      const cx = box ? (box.x + box.w / 2) / W : 0.5;
      const cy = box ? (box.y + box.h / 2) / H : 0.42;
      const rDial = box ? Math.max(box.w, box.h) / 2 : diag * 0.04;
      target.active = true;
      target.centre[0] = cx;
      target.centre[1] = 1 - cy; // uv, y up
      target.reach = v.grow > 0 ? rDial * 1.2 + (diag * 1.45 - rDial * 1.2) * Math.pow(v.grow, 1.6) : diag * 1.0;
      target.twist = v.twist;
      target.pull = v.pull;
      target.twistFall = v.twistFall;
      target.pullFall = v.pullFall;
      target.gather = 3.2;
      target.arms = v.arms;
      target.armCount = 4; // a few: four strokes fill the sheet at ten seconds without crowding it
      target.armTurns = v.armTurns;
      // the arms live where the wound-up drawing is, not out at the reach: a clean spiral drawn
      // across a part of the room nothing has happened to yet reads as a decal over a photograph
      target.armReach = Math.min(target.reach * 0.72, diag * 0.55);
      target.armPhase = v.armPhase;

      // ── the drain ──
      // The far corner of the sheet from the dial: the furthest any pixel of the drawing is from
      // the middle, and so the distance the hole has to reach before there is nothing left to ask
      // for. Measured, not guessed — the clock hangs high on the wall and the corners below it are
      // half as far again as the ones above.
      const px = cx * W, py = cy * H;
      const rmax = Math.max(
        Math.hypot(px, py), Math.hypot(W - px, py),
        Math.hypot(px, H - py), Math.hypot(W - px, H - py),
      );
      target.norm = rmax;
      target.whirl = v.whirl;
      target.hole = rmax * 1.08 * v.hole; // 1.08: past the corner, so the last frame is bare paper
      // …and where the drawing has got to. The pass's own radial map, solved backwards for the
      // radius at which it is already asking for the far corner: outside that circle every pixel
      // reads paper, so that circle IS the drawing now. The arms are held to it (the spiral and the
      // wound-up room are one object, not a decal over one) and the hub is cut from it.
      const sAt = (r) => r * (1 + target.pull * Math.pow(Math.max(0, 1 - Math.min(1, r / Math.max(target.reach, 1))), target.pullFall)) + target.hole;
      let disc = 0;
      if (sAt(0) < rmax) {
        let lo = 0, hi = rmax;
        for (let i = 0; i < 22; i++) {
          const mid = (lo + hi) / 2;
          if (sAt(mid) < rmax) lo = mid; else hi = mid;
        }
        disc = lo;
      }
      // …and the arms come in with it. Not before: for eight of the ten seconds the four strokes
      // reach out past the wound-up drawing, which is the composition the whole effect has had
      // since it was built — a wide spiral with the room being drawn down its middle. It is only
      // when the hole opens that they contract, and they stay a little wider than what is left of
      // the room, so the vortex is always the thing swallowing it and never a decal inside it.
      target.armReach = Math.min(target.armReach, Math.max(target.armReach * Math.pow(1 - v.hole, 3), disc * 1.05));
      // the hub: inside it the whirl turns as a body. A fifth of what is left, and never less than
      // the width of a few nibs — a turn that runs faster than a pixel is not a line any more.
      target.core = Math.max(9, disc * 0.20);
    }

    // …and what it tells the rest of the evening. The phases go one way and only one way: the
    // spring's tail crosses zero twice on its way home and a phase keyed to its SIGN went
    // peak → settle → peak → done, which is not a thing that happened.
    if (v.t >= T.pop) say('settle');
    else if (v.t >= T.peak) say('peak');
    else if (v.t >= T.swirl) say('swirl');
    else say('wind');
  }
  function say(next, at = api.t) {
    if (phase === next) return;
    phase = next;
    ctx.emit?.('props:vortex', { phase: next, t: at });
  }

  return api;
}
