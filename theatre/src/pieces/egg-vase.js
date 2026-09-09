// AN EGG, inside props: THE VASE OF DRIED STEMS, and the one thing in this room that comes back.
//
// The user, on Pepe's funeral comic of 2017 and his coming back: "The vase of dried stems on the
// shelf: click it and the stems wilt to nothing, a beat of empty vase, then they come back in leaf."
//
// The vase is already there and has been since round 3 — `O.vase({ rng, spread: 0.78 })` on the
// stage-right end of the operator's position, between him and the cat, the joke the set is built
// on (a vase of dead flowers on a dead switchboard). Nothing here moves it, re-pots it or re-draws
// its pot. What this file adds is what happens to the seven stems standing in it.
//
// WHERE THE DRAWINGS COME FROM. The seven stems were drawn once, from a seeded rng, inside
// props-objects.js, and this file never re-rolls them: it reads the seven heads' own positions
// back off the meshes and works from those. So every wilting drawing is a drawing of THESE stems
// bending — the same seven azimuths, the same seven lengths — and the drawing the vase comes home
// to is not a copy of the original, it IS the original, untouched, hidden and shown again. That is
// why a second click can be pixel-compared to the frame before the first one and come back equal.
//
// NINE DRAWINGS, AND EVERY CHANGE IS A CUT. There is no tween anywhere in this file. Each drawing
// is a whole set of geometry, built once at load, and the vase shows exactly one of them; a change
// is the next one appearing on a 12 fps step. The wilt:
//     0.0  DROOPING     all seven, heads on, the tips already past 75° off vertical
//     0.5  DROPPING     over past horizontal; four heads have gone and three stems are broken short
//     1.0  A LAST STEM  one stem, hung right over the rim with its head on it; two bare stubs
//     1.5  BARE         the pot, and nothing in it
// The wilt is over at 2.0 s. Then the vase STANDS EMPTY for a full second — 2.0 to 3.0, the beat
// the user asked for, on top of the half second the bare drawing has already had. Then it comes
// back, and it comes back ALIVE:
//     3.0  three shoots with a leaf apiece, barely clearing the rim
//     3.5  four shoots, the first proper leaves
//     4.0  six, leaves open
//     4.5  seven green stems in full leaf, taller than the dried ones ever stood
// and there it stays until a reload.
//
// THE ONE TIME THAT VASE HAS COLOUR. The leaf is #69b964 — pepe.js's SKIN, HIS green, the room's
// only green — on a `colorful` material, so the ink pass keeps the pigment and draws contour and
// tone over it exactly as it does over him. Nothing else in this room but Pepe and the faces of
// the cards is allowed colour, and this is the whole point of the egg: for two seconds the room's
// one dead thing is the same green as the one living thing in it.
//
// CLICKED AGAIN, IT PUTS ITSELF BACK. Four drawings — the leaves thinning, thinning, bare green
// stems, bare pot — and at 2.0 s the dried stems are back as they were. Brisk, and with no held
// beat: coming back is a miracle, going back is just tidying.
//
// NOTHING ANNOUNCES IT. No label, no glow, no outline before it is touched. The cursor over the
// vase is the entire affordance, as it is for the cat, the radio and the lever. And while the nine
// drawings are running the vase is not a switch at all (`enabled` below), so a second click cannot
// land in the middle of the wilt and start it over.
//
// THE CUE. A dry rustle (sound-voices.js `rustle`: husk grains over a thin paper band, no body at
// the bottom of it — dead flowers have no weight), fired on the pointer and then on each of the
// three cuts after it, at 0.5 s apart. LENGTH.rustle is 0.62 s so each one runs a fifth of a
// second into the next and two seconds of wilting is two seconds of rustling, not four events.
// Nothing is played over the coming back. That is meant to be quiet.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { inkMaterial } from '../core/strokes.js';
import * as O from './props-objects.js';

// pepe.js's SKIN, quoted rather than imported so this file does not pull the puppet in to draw a
// leaf. If that constant ever moves, this moves with it: it is HIS green and no other.
const GREEN = '#69b964';
// where every stem is planted, in the vase's own frame: the neck of the pot, 4 cm under its lip
// (props-objects.js `vase` — its profile ends at 0.24 and the stems all start at 0.2)
const FOOT = 0.2;
const MIN_TAP = 44; // px: what a thumb needs, whatever the vase measures on the glass

// The clock, in seconds from the click. Every number here is a multiple of 1/12 so a cut lands on
// a drawing and never between two.
const WILT = [0, 0.5, 1.0, 1.5]; // drooping · dropping · a last stem · bare
const EMPTY_UNTIL = 3.0; // the wilt is done at 2.0; the vase then stands empty for a full second
const LEAF = [0, 0.5, 1.0, 1.5].map((s) => EMPTY_UNTIL + s); // and it comes back in four
const SHED = [0, 0.5, 1.0, 1.5]; // going back: thinning · thinner · bare stems · bare pot
const SHED_HOME = 2.0; // …and the dried stems are back

// ---- geometry, built once ------------------------------------------------------------------------
// One integrator draws every stem in this file, dead or alive: an arc of a given length rising out
// of the pot at azimuth `az`, whose tangent starts `th0` off vertical and turns a further `turn`
// radians by the tip (quadratically, so the bend is all at the far end — which is where a stem
// bends, because that is the thin part of it). turn = 0 gives back the straight stem exactly.
function arc(az, len, th0, turn, n = 5) {
  const ox = Math.cos(az), oz = Math.sin(az);
  const pts = [[0, FOOT, 0]];
  let x = 0, y = FOOT, z = 0;
  const ds = len / n;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const th = th0 + turn * u * u;
    x += Math.sin(th) * ox * ds;
    y = Math.max(0.075, y + Math.cos(th) * ds); // nothing hangs below the pot's belly
    z += Math.sin(th) * oz * ds;
    pts.push([x, y, z]);
  }
  return pts;
}
function rodGeo(a, b, r, seg = 5) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  if (!(len > 1e-5)) return null;
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1);
  g.rotateX(Math.PI / 2);
  const o = new THREE.Object3D();
  o.position.copy(A).add(B).multiplyScalar(0.5);
  o.lookAt(B);
  o.updateMatrix();
  return g.applyMatrix4(o.matrix);
}
function stalkGeo(pts, r) {
  const out = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const g = rodGeo(pts[i], pts[i + 1], r * (1 - 0.35 * (i / pts.length)), 5);
    if (g) out.push(g);
  }
  return out;
}
// a dried flower head, the same 0.022 sphere stretched 1.5 in y that props-objects.js draws
function headGeo(p) {
  const g = new THREE.SphereGeometry(0.022, 8, 6);
  const o = new THREE.Object3D();
  o.position.set(...p);
  o.scale.set(1, 1.5, 1);
  o.updateMatrix();
  return g.applyMatrix4(o.matrix);
}
// A LEAF: an ellipse, long along its own +z, thin in y, aimed by lookAt. Four of them per stem at
// full growth and no more — from across the room a leaf is four pixels, and four big ones read as
// a plant where a dozen small ones read as fur.
function leafGeo(at, aim, len, wide) {
  const g = new THREE.SphereGeometry(0.5, 7, 5);
  const o = new THREE.Object3D();
  o.position.set(...at);
  o.lookAt(at[0] + aim.x, at[1] + aim.y, at[2] + aim.z);
  o.scale.set(wide, wide * 0.22, len);
  o.updateMatrix();
  // the blade is grown forward off its attachment, not centred on it
  g.translate(0, 0, 0.5);
  return g.applyMatrix4(o.matrix);
}
// where a leaf leaves the stem, and which way it points: off the local tangent, thrown 55° away
// from the stem and spiralled round it so no two sit on the same side
function leavesOn(pts, count, len, wide, phase = 0) {
  const out = [];
  const up = new THREE.Vector3(0, 1, 0);
  const A = new THREE.Vector3(), B = new THREE.Vector3(), T = new THREE.Vector3(), S = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const u = 0.34 + (0.62 * i) / Math.max(1, count - 1); // up the stem, none at the soil
    const f = u * (pts.length - 1);
    const j = Math.min(pts.length - 2, Math.floor(f));
    A.set(...pts[j]);
    B.set(...pts[j + 1]);
    T.copy(B).sub(A).normalize();
    const at = A.clone().lerp(B, f - j);
    S.crossVectors(T, up);
    if (S.lengthSq() < 1e-6) S.set(1, 0, 0);
    S.normalize().applyAxisAngle(T, phase + i * 2.4); // 2.4 rad apart: a real leaf spiral
    const aim = T.clone().multiplyScalar(Math.cos(0.96)).addScaledVector(S, Math.sin(0.96)).normalize();
    out.push(leafGeo(at.toArray(), aim, len, wide));
  }
  return out;
}

export function eggVase(ctx, { object, switches } = {}) {
  const obj = object;
  if (!obj) return null;
  const M = O.materials();
  // the leaf's own material, and the only colourful thing in this room that is not Pepe or a card
  const leafMat = inkMaterial({ color: GREEN, colorful: true, hatch: 0.42, lineWeight: 1.1 });

  // ---- read the drawing that is already there -----------------------------------------------------
  // props-objects.js `vase` adds the pot, then (rod, head) for each of seven stems. The heads carry
  // the geometry: a head's position IS the stem's tip. Nothing is re-rolled and nothing is assumed
  // about the rng — if that drawing changes, this reads the change.
  const DRIED = []; // every mesh of the original arrangement: hidden and shown, never edited
  const STEM = []; // { az, len, th0 } for each of the seven, recovered off the tips
  for (let i = 1; i + 1 < obj.children.length; i += 2) {
    const rod = obj.children[i], head = obj.children[i + 1];
    if (!rod || !head || !head.isMesh) break;
    const p = head.position;
    const dy = p.y - FOOT;
    const len = Math.hypot(p.x, dy, p.z);
    if (!(len > 0.05)) break;
    DRIED.push(rod, head);
    STEM.push({ az: Math.atan2(p.z, p.x), len, th0: Math.acos(Math.max(-1, Math.min(1, dy / len))) });
  }
  const N = STEM.length;

  // ---- the nine drawings ---------------------------------------------------------------------------
  // A drawing is a bucket of geometry per material, merged into at most three meshes. They are all
  // built at load — a cut cannot wait for a lathe — and all but one are hidden at any moment.
  const holder = new THREE.Group();
  holder.name = 'vase-drawings';
  obj.add(holder);
  function drawing(name, parts) {
    const g = new THREE.Group();
    g.name = `vase-${name}`;
    for (const [mat, geos] of [[M.solid, parts.solid], [M.paperStack, parts.pale], [leafMat, parts.leaf]]) {
      const list = (geos ?? []).filter(Boolean);
      if (!list.length) continue;
      const merged = list.length === 1 ? list[0] : mergeGeometries(list, false);
      if (!merged) continue;
      const m = new THREE.Mesh(merged, mat);
      m.castShadow = true;
      g.add(m);
    }
    g.visible = false;
    holder.add(g);
    return g;
  }

  // THE WILT. `k` is how far over the stems have gone; `keep` which of the seven are still there,
  // `heads` which of those still have a head on, `cut` which have snapped short.
  function wilting(k, { keep, heads, cut = {} }) {
    const solid = [], pale = [];
    for (const i of keep) {
      const s = STEM[i];
      const len = s.len * (cut[i] ?? 1);
      // no two stems give at the same rate — a row of heads all at one height is a rack, not a
      // bunch of dead flowers. ±15%, off the stem's own index so it is the same every time.
      const own = k * (0.85 + 0.3 * (((i * 3) % 5) / 4));
      const pts = arc(s.az, len, s.th0, 2.35 * own, 5);
      solid.push(...stalkGeo(pts, 0.003));
      if (heads.includes(i)) (i % 2 ? pale : solid).push(headGeo(pts[pts.length - 1]));
    }
    return { solid, pale };
  }
  // ALIVE. Shoots on the same seven azimuths, standing straighter than the dried ones ever did
  // (a living stem holds itself up; that is most of what makes the drawing read as alive), with
  // `leaves` blades each. Everything is the leaf material: green stems, green leaves.
  function leafy(count, len, leaves, { lean = 0, leaf = 0.045, wide = 0.021, droop = 0 } = {}) {
    const out = [];
    for (let i = 0; i < Math.min(count, N); i++) {
      const s = STEM[i];
      const th0 = 0.09 + 0.055 * (i % 3) + lean;
      const L = len * (0.86 + 0.28 * (((i * 5) % 7) / 6));
      const pts = arc(s.az, L, th0, 0.34 + droop, 4);
      out.push(...stalkGeo(pts, 0.0035));
      if (leaves > 0) out.push(...leavesOn(pts, leaves, leaf, wide, i * 1.1));
    }
    return { leaf: out };
  }

  const DRAW = {
    // THE WILT: drooping, dropping, a last stem, bare — and the three numbers are what it takes to
    // read as DYING and not as OPENING OUT, which is what the first pass drew. `turn` is added
    // to the tip's tangent, so k = 0.34 put the tips 57° off vertical — sideways, which draws a
    // wider bouquet and not a sick one. A stem has to go PAST horizontal before the eye calls it
    // drooping: 0.52 is 75°, 0.82 is 118° and 1.05 is 148°, straight down over the rim.
    w1: drawing('w1', wilting(0.52, { keep: [0, 1, 2, 3, 4, 5, 6], heads: [0, 1, 2, 3, 4, 5, 6] })),
    w2: drawing('w2', wilting(0.82, { keep: [0, 1, 2, 3, 4, 5, 6], heads: [0, 2, 4], cut: { 1: 0.55, 5: 0.62, 6: 0.8 } })),
    w3: drawing('w3', wilting(1.05, { keep: [2, 0, 5], heads: [2], cut: { 0: 0.3, 5: 0.26 } })),
    bare: drawing('bare', {}), // the pot, and nothing in it
    // …and back, in leaf
    // l1 is three shoots and not two, 9 cm and not 5.5, and each has a leaf on it. At 5.5 cm with
    // bare stems this drawing was INVISIBLE on the home plate — the vase is 55 px tall there and a
    // 3 mm stem is a third of a pixel — so the coming back began with a drawing nobody could see.
    l1: drawing('l1', leafy(3, 0.09, 1, { lean: 0.02, leaf: 0.02, wide: 0.011 })),
    l2: drawing('l2', leafy(4, 0.145, 2, { lean: 0.01, leaf: 0.028, wide: 0.014 })),
    l3: drawing('l3', leafy(6, 0.21, 3, { leaf: 0.036, wide: 0.017 })),
    l4: drawing('l4', leafy(7, 0.3, 4, {})),
    // …the leaves dropping again, which is the same plant with less on it: four, two, one, none.
    // s1 was three and three does not read — at this size one leaf in four is a pixel, and the
    // first drawing of the way back has to say plainly that something is leaving.
    s1: drawing('s1', leafy(7, 0.3, 2, { droop: 0.16 })),
    s2: drawing('s2', leafy(7, 0.29, 1, { droop: 0.34, leaf: 0.04 })),
    s3: drawing('s3', leafy(7, 0.27, 0, { droop: 0.55 })),
  };

  // ---- what is on the glass -----------------------------------------------------------------------
  // The vase's box is the UNION of every drawing — the dried arrangement and the full leaf, which
  // stands taller than it — taken off the geometry rather than written down, and computed once
  // while everything is momentarily visible. So the target never shrinks when the pot is empty:
  // a visitor whose pointer was on the vase still has it on the vase, whatever is in it.
  const BOX = (() => {
    const was = holder.children.map((c) => c.visible);
    for (const c of holder.children) c.visible = true;
    obj.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(obj);
    holder.children.forEach((c, i) => (c.visible = was[i]));
    // back into the vase's own frame, so it travels with the object
    const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert();
    return b.applyMatrix4(inv);
  })();
  const v = new THREE.Vector3();
  function hitBox() {
    obj.updateMatrixWorld(true);
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const xs = [], ys = [];
    for (const x of [BOX.min.x, BOX.max.x]) for (const y of [BOX.min.y, BOX.max.y]) for (const z of [BOX.min.z, BOX.max.z]) {
      v.set(x, y, z);
      obj.localToWorld(v).project(ctx.camera);
      xs.push(((v.x + 1) / 2) * W);
      ys.push(((1 - v.y) / 2) * H);
    }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  // …grown about its centre to a thumb's 44 px. What the margin falls on is the sideboard top and
  // the candlestick's bare stretch of plaster, where there is nothing else to hit; the cat, the
  // next switch along, is 40 cm to the right and a whole bookcase higher.
  //
  // AND THE RAY AGREES WITH THE BOX, which is worth writing down because it is not obvious: three
  // r170 does not skip invisible objects when it raycasts, so the arbiter's ray finds the hidden
  // drawings as well as the shown one. The volume a pointer can strike is therefore the union of
  // all nine, exactly as this box is — the vase does not become harder to hit while it stands
  // empty, and a visitor whose pointer was on it still has it on it.
  function tapBox() {
    const b = hitBox();
    if (!b) return null;
    const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
  }

  // ---- the nine drawings, in time ------------------------------------------------------------------
  let showing = null; // which drawing is on, or null for the dried arrangement
  let state = 'dried';
  let run = null; // { cues, i, t0 } while the thing is moving
  function show(key) {
    if (showing === key) return;
    showing = key;
    for (const c of holder.children) c.visible = false;
    if (key) DRAW[key].visible = true;
    for (const m of DRIED) m.visible = !key;
  }
  function rustle() {
    ctx.pieces.sound?.play?.('rustle', { pan: 0.22 }); // the vase sits stage right of centre
  }
  function say(next) {
    if (state === next) return;
    state = next;
    ctx.emit?.('props:vase', { state });
  }

  // A cue is [seconds, drawing, state or null, rustle?]. The list is walked once, in order, on
  // 12 fps steps only — so every change in this file is a cut between two drawings.
  const TO_LEAF = [
    [WILT[0], 'w1', 'wilting', 0],
    [WILT[1], 'w2', null, 1],
    [WILT[2], 'w3', null, 1],
    [WILT[3], 'bare', 'empty', 1],
    [LEAF[0], 'l1', 'leaf', 0],
    [LEAF[1], 'l2', null, 0],
    [LEAF[2], 'l3', null, 0],
    [LEAF[3], 'l4', null, 0],
  ];
  const TO_DRIED = [
    [SHED[0], 's1', 'wilting', 0],
    [SHED[1], 's2', null, 1],
    [SHED[2], 's3', null, 1],
    [SHED[3], 'bare', 'empty', 1],
    [SHED_HOME, null, 'dried', 0],
  ];

  function start(cues) {
    run = { cues, i: 0, t0: ctx.clock?.t ?? 0 };
    rustle(); // on the pointer, not on the drawing: the hand is on the vase now
  }
  function click() {
    if (run) return; // busy: a click in the middle of the wilt is not a second wilt
    if (state === 'dried') start(TO_LEAF);
    else if (state === 'leaf') start(TO_DRIED);
  }

  const api = {
    get state() {
      return state;
    },
    get busy() {
      return !!run;
    },
    click,
    // for the tools and for a still: put it there with no cue, no event and no clock
    set(next = 'dried') {
      run = null;
      if (next === 'leaf') {
        show('l4');
        state = 'leaf';
      } else if (next === 'empty') {
        show('bare');
        state = 'empty';
      } else if (next === 'wilting') {
        show('w2');
        state = 'wilting';
      } else {
        show(null);
        state = 'dried';
      }
      return state;
    },
    setState(name = 'default') {
      api.set(name === 'vase-leaf' ? 'leaf' : name === 'vase-empty' ? 'empty' : name === 'vase-wilting' ? 'wilting' : 'dried');
    },
    hitBox,
    tapBox,
    update(ctx2) {
      if (!ctx2.clock.stepped || !run) return;
      const u = ctx2.clock.t - run.t0;
      // AT MOST ONE RUSTLE PER DRAWING. A frame that arrives late catches the timeline up through
      // two or three cues at once — which is exactly what happens in the headless judging browser,
      // where the loop runs at two or three frames a second — and firing a cue for each of them
      // lays two rustles on the same millisecond, which is a crack and not a rustle.
      let heard = false;
      while (run.i < run.cues.length && u >= run.cues[run.i][0] - 1e-6) {
        const [, key, next, cue] = run.cues[run.i++];
        show(key);
        if (cue && !heard) {
          rustle();
          heard = true;
        }
        if (next) say(next);
      }
      if (run.i >= run.cues.length) run = null;
    },
  };
  // the arbiter in props.js raycasts the object first and falls back to the thumb's box. While the
  // nine drawings run the vase is not a switch at all: no cursor, no click, nothing to interrupt.
  switches?.add?.({
    name: 'vase',
    object: () => obj,
    tapBox,
    enabled: () => !run,
    onDown: () => click(),
  });
  return api;
}
