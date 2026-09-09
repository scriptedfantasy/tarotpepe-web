// EGG: the wine bottle on the cart. It is the second thing in this room the visitor can work, and
// unlike the radio it is not announced anywhere — the user's own words: "The wine bottle on the
// cart. Each click pours a finger; the level in the drawing drops. After three, the whole room
// should start moving a bit more", and "wine should wear off after 30 seconds".
//
// The whole affordance is the cursor. There is no glow, no outline, no line of dialogue, nothing on
// the notice: a pointer crossing the VIN bottle turns into a hand, and a visitor who never crosses
// it never learns there was anything to find. That is what makes it an egg rather than a control.
//
// WHAT A POUR IS, in three parts, and each of them is a CUT on the 12 fps clock:
//   the drawing   the bottle's own label sheet is re-struck at the new level — same recipe, same
//                 seed, same pen (props-textures.js labelTexture, `fillV`). Five fingers in it; the
//                 ink stops a step lower each time and the glass above is paper with the two glass
//                 strokes on it, which is how this set has always drawn an empty bottle.
//   the cue       one 'glug' (sound-voices.js), quiet, panned to the cart at the left.
//   the room      from the THIRD finger on, and not before.
//
// WHAT DRUNK MEANS, and why it is these two things and not a filter over the frame:
//   the pen wanders   the boil is the pen re-striking the same drawing six times a second; a
//                     drunker hand puts the sheet down further out each time. So the boil's two
//                     AMPLITUDES are multiplied — `wobble` (the sheet sliding under the hand) and
//                     `penWob` (the wander of the pen across its own stroke) — and nothing else.
//                     THE DEFAULTS AT THE HEAD OF ink.js ARE THE USER'S AND ARE NEVER WRITTEN OVER:
//                     this captures whatever is in `ink.params` at the moment the wine takes hold,
//                     multiplies that, and puts the captured numbers back, exactly, when it wears
//                     off. ink.js itself is not touched — it invites this ("other pieces may nudge
//                     these through ctx.pieces.ink.params").
//   the plate sways   ±0.6° of ROLL at 0.15 Hz, applied to the camera on top of whatever plate it
//                     is holding, stepped on the 12 fps clock so it lurches rather than glides. The
//                     composition is untouched: no shot moves, no lens changes, the picture leans.
// It comes on over 2 s (nobody is drunk on the swallow) and goes off over the last 5 s of the 30,
// and at the end everything is exactly the number it was. Each further pour restarts the 30 — but
// NOT the two seconds: a fourth finger extends the evening, it does not begin it again.
import * as THREE from 'three';
import * as T from './props-textures.js';

const FINGERS = 5; // what the bottle holds
const DRUNK_AT = 3; // the finger from which the room goes
const SPAN = 30; // seconds a pour is good for (the user's number)
const RISE = 2; // …of which the first two are it coming on
const WEAR = 5; // …and the last five are it going off
const BOIL = 2.4; // × the pen's own wander, at full
const ROLL = THREE.MathUtils.DEG2RAD * 0.6; // the plate's lean, either way
const SWAY_HZ = 0.15; // and how slowly it leans
const MIN_TAP = 44; // px: what a thumb needs, whatever the bottle measures on the glass

// WHERE THE WINE STANDS at 0, 1, 2, 3, 4, 5 fingers: how far below the top of the body, in body
// heights. Not five equal steps, and the reason is the label. VIN's paper label covers the bottom
// 0.16–0.62 of the body, so a level inside that band is hidden behind it and only shows as a
// millimetre of ink either side: spaced evenly, the drop from five to four ate the whole shoulder
// and the drops from four to three to two were invisible. So the first three fingers walk the wine
// down the CLEAR GLASS between the shoulder and the top of the label, in even steps, and the last
// two take it behind the label to the foot — which is what a bottle with a label on it does.
const DROP = [0.94, 0.6, 0.38, 0.24, 0.1, null];

// `obj` is the VIN bottle's group, straight off the cart (props.js).
export function buildWine(ctx, obj) {
  const glass = ctx.renderer?.domElement ?? null;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const v = new THREE.Vector3();
  const lastQ = new THREE.Quaternion();

  let fingers = FINGERS;
  let since = -1e9; // the stepped second the last finger was poured — the 30 s runs from here
  // …and the second the room WENT UNDER, which is a different thing. A fourth finger restarts the
  // thirty seconds; it does not put the visitor back at the beginning of the two it took to feel
  // the third. Pouring more wine has never once made anybody more sober.
  let began = -1e9;
  let forced = null; // the judging state: full drunkenness with no clock behind it
  let hover = false, cursorMine = false;
  let base = null; // the pen's own numbers, held while they are being multiplied
  let rolled = 0; // the roll this piece last put on the camera, in radians
  const sheets = new Map(); // level → the drawing of the bottle at it

  // ---- the drawing ---------------------------------------------------------------------------
  // Re-struck on the pour and never on the clock: five sheets at 128 x 256 over an evening, drawn
  // the first time each level is reached and kept. The full bottle keeps the texture it was built
  // with, so a room nobody has touched is the room as it has always been drawn, to the byte.
  function restrike() {
    const L = obj?.userData?.label;
    if (!L) return;
    let tex = sheets.get(fingers);
    if (!tex) {
      const [v0, v1] = L.recipe.bodyV;
      const d = DROP[Math.max(0, Math.min(FINGERS, fingers))];
      tex = d == null ? L.tex : T.labelTexture({ ...L.recipe, fillV: v1 - (v1 - v0) * d });
      sheets.set(fingers, tex);
    }
    L.mesh.material.map = tex;
    L.mesh.material.needsUpdate = true;
  }

  // ---- where it is on the glass --------------------------------------------------------------
  // The bottle's own eight corners, projected: it stands at its foot, so the box runs from its
  // base to `height` and is `width` across.
  function hitBox() {
    if (!obj) return null;
    obj.updateMatrixWorld(true);
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const hw = (obj.userData.width ?? 0.07) / 2, ht = obj.userData.height ?? 0.3;
    const xs = [], ys = [];
    for (const dx of [-hw, hw]) for (const dy of [0, ht]) for (const dz of [-hw, hw]) {
      v.set(dx, dy, dz);
      obj.localToWorld(v).project(ctx.camera);
      xs.push(((v.x + 1) / 2) * W);
      ys.push(((1 - v.y) / 2) * H);
    }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  // …grown about its centre to at least a thumb. A bottle is a tall thin thing — it measures about
  // 15 x 50 px in the wide shot — so the growth is nearly all sideways, and it falls on bare cloth
  // on the cart's top board with the headset a finger's width away. The same caveat the radio
  // carries applies here: a portrait window crops the cart out of the picture altogether, and an
  // affordance nobody can see is not one. On a phone this is a bottle and nothing else.
  function tapBox() {
    const b = hitBox();
    if (!b) return null;
    const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
  }
  function onBottle(ev) {
    if (!glass || !obj) return false;
    const r = glass.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const px = ev.clientX - r.left, py = ev.clientY - r.top;
    ndc.set((px / r.width) * 2 - 1, -(py / r.height) * 2 + 1);
    ray.setFromCamera(ndc, ctx.camera);
    if (ray.intersectObject(obj, true).length) return true;
    const b = tapBox();
    return !!b && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
  }
  function setHover(on) {
    // an empty bottle is not a control any more, and saying so with the cursor is the only thing
    // in this feature that ever tells the visitor anything
    on = on && fingers > 0;
    if (hover === on) return;
    hover = on;
    if (!glass) return;
    if (on) {
      glass.style.cursor = 'pointer';
      cursorMine = true;
    } else if (cursorMine) {
      // only ever put back what this piece put there: the radio, reveal-fan.js and help.js share it
      glass.style.cursor = '';
      cursorMine = false;
    }
  }

  // ---- a finger ------------------------------------------------------------------------------
  function pour() {
    if (fingers <= 0) return false;
    const under = amount() > 0; // is it already working? then this finger only extends it
    fingers--;
    forced = null;
    since = ctx.clock.t;
    if (!under) began = since;
    restrike();
    // the cart stands stage left, so the pour is heard over there
    ctx.pieces.sound?.play?.('glug', { pan: -0.32 });
    if (fingers === 0) setHover(false);
    // `drunk` on the EVENT is whether this finger is one the room feels — it is true from the third
    // on, at the moment it is poured. The api's `drunk` is whether the room is under it right now,
    // which is false for the two seconds the wine takes to arrive.
    ctx.emit?.('props:wine', { fingers, drunk: poured() >= DRUNK_AT });
    return true;
  }
  const poured = () => FINGERS - fingers;
  const age = () => ctx.clock.t - since;

  // 0 sober · 1 as drunk as this room gets. Rises over RISE from the finger that did it, holds,
  // falls through the last WEAR seconds of the SPAN, and is 0 again on the far side of it. A pure
  // function of the clock and two marks on it: no state to drift, and a still is a still.
  function amount() {
    if (forced != null) return forced;
    if (poured() < DRUNK_AT) return 0;
    const a = age();
    if (a < 0 || a >= SPAN) return 0;
    return Math.max(0, Math.min(1, Math.min((ctx.clock.t - began) / RISE, (SPAN - a) / WEAR)));
  }

  // ---- what it does to the room --------------------------------------------------------------
  function pen(k) {
    const p = ctx.pieces.ink?.params;
    if (!p) return;
    if (k > 0 && !base) base = { wobble: p.wobble, penWob: p.penWob }; // whatever the pen is TODAY
    if (!base) return;
    if (k > 0) {
      const m = 1 + (BOIL - 1) * k;
      p.wobble = base.wobble * m;
      p.penWob = base.penWob * m;
    } else {
      p.wobble = base.wobble;
      p.penWob = base.penWob;
      base = null;
    }
  }
  function sway(k, t) {
    const cam = ctx.camera;
    if (!cam) return;
    // The camera piece owns the plate and re-poses it on a cut, a move or a resize; this runs
    // before it in the frame and leans whatever pose is standing. If the quaternion is not the one
    // this piece left behind, the camera has re-posed under us and there is no lean to take off.
    if (!cam.quaternion.equals(lastQ)) rolled = 0;
    if (rolled) cam.rotateZ(-rolled);
    const a = k > 0 ? ROLL * k * api.sway * Math.sin(2 * Math.PI * SWAY_HZ * t) : 0;
    if (a) cam.rotateZ(a);
    rolled = a;
    lastQ.copy(cam.quaternion);
  }

  const api = {
    // the plate's lean, as a multiplier. 1 always, except under tools/_egg-wine-proof.mjs, which
    // holds the picture still so the pen can be measured with none of the lean in the numbers.
    sway: 1,
    get fingers() {
      return fingers;
    },
    get drunk() {
      return amount() > 0;
    },
    // for the proof tool: the pen's multiplier and the plate's lean, as they stand this frame
    get boil() {
      return 1 + (BOIL - 1) * amount();
    },
    get roll() {
      return rolled;
    },
    get age() {
      return poured() >= DRUNK_AT ? age() : 0;
    },
    // …and the seam it drives the 30 seconds through, so nothing has to be waited for: the room
    // is put where it would be `s` seconds after the finger that made it drunk.
    setAge(s) {
      forced = null;
      since = began = ctx.clock.t - s;
    },
    hitBox,
    tapBox,
    pour,
    // `wine-drunk` is the room at full drunkenness with no clock behind it: three fingers gone and
    // the pen at its widest, so a still of it is the same still every time. Any other name empties
    // the glass and puts the bottle back — the judging shot of the room is the room untouched.
    setState(name) {
      if (name === 'wine-drunk') {
        fingers = FINGERS - DRUNK_AT;
        forced = 1;
        restrike();
      } else if (forced != null || fingers !== FINGERS) {
        fingers = FINGERS;
        forced = null;
        since = began = -1e9;
        restrike();
      }
    },
    update(c) {
      const k = amount();
      if (k > 0 || base) pen(k);
      if (k > 0 || rolled) sway(k, c.clock.t);
    },
  };

  glass?.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'touch') return;
    setHover(onBottle(ev));
  });
  glass?.addEventListener('pointerleave', (ev) => {
    if (ev.pointerType !== 'touch') setHover(false);
  });
  glass?.addEventListener('pointerdown', (ev) => {
    if (!onBottle(ev)) return;
    // flow.js reads any pointerdown on the window as the visitor skipping ahead through Pepe's
    // line, which a visitor reaching for the bottle did not mean (props.js, THE RADIO)
    ctx.pieces.sound?.start?.();
    ev.stopPropagation();
    pour();
  });

  return api;
}
