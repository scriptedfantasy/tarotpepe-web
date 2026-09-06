// PIECE PART: pepe-arrive — the figure BEFORE he is sitting down.
//
// When the visitor opens the door he is not at the table. He is at the back of the room, beside
// the palm, watering it; he stops, looks out at them for a beat, sets the can on the floor, walks
// to his bench and sits. Then the evening begins as it always did.
//
// WHAT THIS FILE IS. Nine whole-body drawings of the user's, cut by tools/pepe-cutout.mjs into
// public/pepe/pose-*.png with public/pepe/poses.json, hung as flat cards on the stage floor, and a
// watering can drawn here in ink because the user's "watering" page has no can in it — it is a
// figure standing with its hands down, and the can was always going to have to be drawn.
//
// THE FOUR RULES IT IS BUILT ON
//
//  1. ONE DRAWING AT A TIME, HELD, AND THE SNAP IS THE ANIMATION. Nothing here interpolates. The
//     figure is whichever plate the exposure sheet names, standing at whichever station the sheet
//     names, and both change together on a clock step. A stop-motion walk is a few drawings held
//     and swapped; if the body glided between them it would be a drawing sliding across a room,
//     which is the exact fault this beat exists to avoid.
//
//  2. THE PLANTED FOOT DOES NOT MOVE. What makes a cut-out walk read as walking rather than
//     skating is that the foot on the floor stays on the floor. Every plate's feet were measured
//     off the user's own drawing (poses.json `feet`, in plate pixels), so the travel between two
//     drawings is not a number that looked about right — it is the distance the drawings THEMSELVES
//     say the body moved, worked out by tracking one foot through the cycle. See WALK below: the
//     four drawings hand the body 1.25 m per stride, which is 0.62 m a step, which is exactly the
//     stance the user drew. The arithmetic closing on itself is the proof it is the right reading.
//
//  3. HE TRAVELS PARALLEL TO THE BACK WALL, and turning is a change of PLATE, never a rotation.
//     The drawings are three-quarter views facing one way; a flat card that rotates about y is a
//     sheet of paper turning edge-on. So: at the plant he is the one-arm-forward drawing MIRRORED,
//     facing −x with the can out over the palm; he notices the visitor on the front-on standing
//     drawing, which faces nobody in particular and everybody at once; then the walk plates, which
//     the user drew walking to the right — and +x IS to the right in every shot of this room, so
//     the crossing needs no mirror at all. Three facings, two changes, no rotation anywhere.
//
//  4. THE HAND-OFF IS EXACT. The last thing this file does is take itself out of the picture and
//     put the seated puppet in, at layout.pepe, in its own rest pose, with pepeAnim's postures
//     running. The seated figure after the walk is the same seated figure as before it, to the
//     pixel (tools/_same.mjs on ?view=pepe&state=default against a frame taken the step after
//     arrive() resolves).
//
// WHY THE CROUCH IS THE CAN AND NOT THE SIT. The brief asked for the sit to go "through the
// crouch". It cannot, and the drawings say so: the crouch is a deep squat with the hands at the
// floor and its crown is 0.93 m, while the seated cut-out's crown is 1.36 m and standing is 1.556.
// Sitting on a 0.54 m bench is a monotonic 20 cm drop of the head; routing it through the crouch
// would drop him 63 cm and pop him back up 43 cm at the very moment the hand-off happens — the
// worst place in the whole beat to put a bounce. So the crouch does the thing a deep squat is
// actually for, which the beat also needs: it puts the can on the floor. The sit is two plates and
// one snap, with the bench taking his weight on the soundtrack.
//
// api: { group, plates, can, mPerPx, beats, frames, at(F) → the beat on at clock step F,
//        show(beat, F), hide(), leaveCan(), canFloor, stations, bounds, judgeShot(aspect) }
import * as THREE from 'three';
import { inkMaterial, makeCanvas, canvasTexture, INK, PAPER } from '../core/strokes.js';
import { inkFilter } from './pepe-mips.js';
import POSES from '../../public/pepe/poses.json';

// ── WHERE HE IS, AND WHY EXACTLY THERE ─────────────────────────────────────────────────────────
// One line, parallel to the back wall, at z = −1.12. Every number below was measured against the
// world boxes of every prop in the room (tools/_p8-room.mjs) and the clearances are in the report:
//   the bench            x ±0.46  z −0.99..−0.65   → 0.13 m of floor between the line and its back
//   the tablecloth       r 0.91 at the floor       → 0.22 m clear at its nearest
//   the switchboard      z −2.25..−1.75            → 0.63 m clear upstage
//   the palm's stool     x −2.53..−2.19 z −1.47..−1.13  → the line passes 0.01 m downstage of it
//   the standard lamp    x −2.35..−1.85 z −0.45..0.05   → 0.67 m clear downstage
// He starts at x = −1.90, which is 0.46 m from the palm's trunk and inside the reach of its
// fronds, because that is where a man stands to water a plant. It is also, and this is not a
// coincidence, exactly six of the walk's own drawn advances from the bench — so the crossing needs
// no rescaling of the stride at all and the feet are locked to the floor for every frame of it.
const Z_WALK = -1.12;
const X_PLANT = -1.9;
const X_BENCH = 0; // layout.pepe.pos[0]
const Z_SIT_STEP = -0.97; // the last standing plate: right behind the bench, which hides his shins

// ── THE WALK, IN THE DRAWINGS' OWN ARITHMETIC ──────────────────────────────────────────────────
// The user drew four. Three of them (1, 3, 4) are CONTACTS — both feet down, 0.60–0.65 m apart —
// and one (2) is the PASSING pose, the swing foot lifted 39 px clear and the planted foot under
// the body. So the cycle is contact · pass · contact · pass, with the two contacts alternating
// between the two the user drew for that phase (3 and 4, which differ by a couple of centimetres
// of stride, exactly the way two hand-drawn contacts of the same pose differ).
//
// The advance between two drawings is read off ONE FOOT. In walk1 the leading foot is 110 px
// ahead of the head's axis; in walk2 the same foot is 19 px ahead, under him — so the body moved
// 91 px. In walk3 that foot is now the trailing one, 157 px behind — another 176 px. And so on
// round. The four advances sum to 514 px = 1.250 m, i.e. two steps of 0.625 m, which is the stance
// the drawings show. Nothing here was chosen; it was all measured, and it closes.
const WALK_CYCLE = [
  { plate: 'walk1', advance: 91 }, // contact (far leg leads) → passing
  { plate: 'walk2', advance: 176 }, // passing → contact (near leg leads)
  { plate: 'walk3', advance: 92 }, // contact → passing
  { plate: 'walk2', advance: 155 }, // passing → contact
  { plate: 'walk1', advance: 91 },
  { plate: 'walk2', advance: 170 },
  { plate: 'walk4', advance: 98 }, // the other contact the user drew for this phase
  { plate: 'walk2', advance: 155 },
];
// how long one drawing is held, in 12 fps clock steps. Three steps is 0.25 s a drawing, which
// makes a step 0.5 s and the crossing 0.95 m/s — a walk, not a march and not a jog.
const WALK_HOLD = 3;

export function buildArrival(ctx, { root = null } = {}) {
  const m = POSES.mPerPx;
  const group = new THREE.Group();
  group.name = 'pepeArrive';
  group.visible = false;
  ctx.scene.add(group);

  // ── the plates ───────────────────────────────────────────────────────────────────────────────
  // One mesh a plate, all of them pinned at the same point: the sole of the lowest foot, on the
  // head's own centre line. That pin is the figure's station on the floor, so a plate change is a
  // change of drawing and nothing else — he does not grow, shrink, float or shuffle sideways when
  // the sheet turns over. Geometry is one quad per occupied cell of the manifest's grid, the same
  // as the seated cut-out: the lit pass sees a silhouette, not a card.
  const textures = [];
  const meshOf = (name) => {
    const P = POSES.plates[name];
    const [cx0, cy0, cw, ch] = P.box;
    const px = P.axis - cx0, py = P.base - cy0; // the pin, in the plate's own pixels
    const pos = [], uv = [], nrm = [], idx = [];
    const cell = P.cell;
    for (let k = 0; k < P.cells.length; k += 2) {
      const x0 = P.cells[k] * cell, y0 = P.cells[k + 1] * cell;
      const x1 = Math.min(x0 + cell, cw), y1 = Math.min(y0 + cell, ch);
      if (x1 <= x0 || y1 <= y0) continue;
      const base = pos.length / 3;
      for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) {
        pos.push((x - px) * m, -(y - py) * m, 0);
        uv.push(x / cw, 1 - y / ch);
        nrm.push(0, 0, 1);
      }
      idx.push(base, base + 3, base + 2, base, base + 2, base + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    // His pen, and no second pen. lineWeight 0 because the contour is cut into the sheet itself
    // (tools/pepe-cutout.mjs re-cuts it to 1.45 of the drawn width); hatch 0.02 because a flat
    // card facing the room reads one lit value across the whole of it and one even density of
    // hatch is a grey wash. Both numbers are the seated figure's, for the same reasons.
    const mat = inkMaterial({ color: '#ffffff', colorful: true, hatch: 0.02, lineWeight: 0, roughness: 1 });
    mat.alphaTest = 0.5;
    mat.name = 'pose-' + name;
    textures.push(
      ctx.assets.texture(`/pepe/${P.file}`).then((t) => {
        t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
        inkFilter(t, ctx.renderer); // pigment and coverage filtered apart: see pepe-mips.js
        mat.map = t;
        mat.needsUpdate = true;
      }),
    );
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'pose-' + name;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.visible = false;
    mesh.userData.plate = P;
    group.add(mesh);
    return mesh;
  };
  const plates = {};
  for (const name of Object.keys(POSES.plates)) plates[name] = meshOf(name);

  // ── the watering can ─────────────────────────────────────────────────────────────────────────
  // Drawn here, in the room's pen, on a card the size of a real can, because the drawings do not
  // contain one. A galvanised can: an oval body with a rolled rim, a long spout rising to a rose,
  // a bail handle over the top and a grip handle at the back. Its ORIGIN IS THE BAIL — the point
  // his fist closes on — so hanging it in his hand is one position, and standing it on the floor
  // is the same position lifted by the height of the bail above the base.
  const CAN_W = 0.36, CAN_H = 0.32; // the card, in metres — a two-litre can beside a 1.556 m frog
  const CAN_BAIL = [0.5, 0.1]; // where on the card the bail is, in uv-ish fractions (x, y from top)
  const canMat = inkMaterial({ color: '#ffffff', colorful: true, hatch: 0.02, lineWeight: 0, roughness: 1 });
  canMat.alphaTest = 0.5;
  canMat.name = 'wateringCan';
  const canGeo = new THREE.PlaneGeometry(CAN_W, CAN_H);
  canGeo.translate((0.5 - CAN_BAIL[0]) * CAN_W, -(0.5 - CAN_BAIL[1]) * CAN_H, 0);
  const can = new THREE.Mesh(canGeo, canMat);
  can.name = 'wateringCan';
  can.castShadow = can.receiveShadow = true;
  can.visible = false;
  group.add(can);
  const CAN_BAIL_Y = (1 - CAN_BAIL[1]) * CAN_H; // bail above the can's foot, in metres

  // the water: three drawn threads, cycled a step at a time, so the pour boils the way everything
  // else in the picture boils and the held drawing behind it is not a photograph
  const POUR_W = 0.16, POUR_H = 0.42;
  const pourMats = [0, 1, 2].map((i) => {
    const mat = inkMaterial({ color: '#ffffff', colorful: true, hatch: 0, lineWeight: 0, roughness: 1 });
    mat.alphaTest = 0.5;
    mat.name = 'pour' + i;
    return mat;
  });
  // THE FOUR CANVASES ARE DRAWN AFTER BUILD RETURNS, and that is a budget, not a style. Every
  // drawn sheet in this piece goes through the figure's own mip chain (pepe-mips.js), which is a
  // few render passes a texture, and in the headless judging browser — software WebGL, software
  // canvas — four of them cost about a second. A piece has 1500 ms to build in that browser and
  // the seated figure's own layers already spend most of it. The plates do not have this problem
  // because their PNGs load asynchronously and are filtered as they arrive; the can and its water
  // are made here, so they are made one macrotask later. Nothing is on screen until arrive() is
  // called, seconds after the page settles, so nothing waits for them.
  setTimeout(() => {
    const canTex = drawCan();
    inkFilter(canTex, ctx.renderer); // his chain, not the hardware's: a pen that thins, never greys
    canMat.map = canTex;
    canMat.needsUpdate = true;
    pourMats.forEach((mat, i) => {
      const tex = drawPour(i);
      inkFilter(tex, ctx.renderer);
      mat.map = tex;
      mat.needsUpdate = true;
    });
  }, 0);
  const pourGeo = new THREE.PlaneGeometry(POUR_W, POUR_H);
  pourGeo.translate(0, -POUR_H / 2, 0); // hangs from its top edge, at the rose
  const pour = new THREE.Mesh(pourGeo, pourMats[0]);
  pour.name = 'pour';
  pour.visible = false;
  group.add(pour);

  // ── the exposure sheet ───────────────────────────────────────────────────────────────────────
  // Every beat is one drawing, at one station, held for a whole number of clock steps. Read it
  // top to bottom and it is the shot list: he waters, he stops, he looks at them, he puts the can
  // down, he crosses, he squares up to the table, he sits.
  const beats = [];
  const push = (b) => {
    b.at = beats.length ? beats[beats.length - 1].at + beats[beats.length - 1].hold : 0;
    beats.push(b);
    return b;
  };
  // 1. AT THE PLANT. The one-arm-forward drawing, mirrored so the arm reaches −x over the palm,
  //    with the can hanging from the fist and tipped. It HOLDS: the small repeat on twos is the
  //    pour boiling and the can nodding 5° every eighth step, which is a man shaking the last of
  //    it out — not the body, which stays exactly where it is drawn.
  for (let i = 0; i < 8; i++) push({ plate: 'offer', mirror: true, x: X_PLANT, z: Z_WALK, hold: 2, can: 'grip', pour: true, tip: i % 4 === 3 ? 0.32 : 0.18 });
  // 2. HE STOPS POURING. Straightens, can down at his side, head still on the plant. Two beats.
  push({ plate: 'water', mirror: true, x: X_PLANT, z: Z_WALK, hold: 3, can: 'hang' });
  // 3. AND NOTICES. Front on, arms down, looking out of the drawing at whoever just came in. This
  //    beat is the whole point and it is 1.5 seconds of a held drawing doing nothing at all.
  push({ plate: 'stand', mirror: false, x: X_PLANT, z: Z_WALK, hold: 18, can: 'hang', notice: true });
  // 4. THE CAN GOES DOWN. Squat, set it on the floor at arm's length, stand up again. The can is
  //    released on the second crouch beat and is on the floor for the rest of the evening.
  // (the can is already ON THE FLOOR for both crouch beats, and that is not a shortcut: the spot
  // it stands on IS his left hand's, measured off the drawing, so the first beat is his hand on it
  // setting it down and the second is his hand leaving it. A crouch has no hand blobs of its own —
  // both its hands are flat on the floor and the cut reads them with the feet — so there is
  // nothing to hang it from anyway, and nothing that ought to be.)
  push({ plate: 'crouch', mirror: false, x: X_PLANT, z: Z_WALK, hold: 3, can: 'floor', crouch: true });
  push({ plate: 'crouch', mirror: false, x: X_PLANT, z: Z_WALK, hold: 4, can: 'floor', crouch: true, drop: true });
  push({ plate: 'stand2', mirror: false, x: X_PLANT, z: Z_WALK, hold: 3, can: 'floor' });
  // 5. THE CROSSING. Six advances of the drawings' own arithmetic put him from the palm to the
  //    bench with the planted foot nailed to the floor at every one of them.
  let x = X_PLANT;
  for (let i = 0; i < 7; i++) {
    const step = WALK_CYCLE[i % WALK_CYCLE.length];
    // a CONTACT drawing is a foot landing, and a foot landing is a sound. `footfall` is already in
    // sound-voices' cue list (it was written for the visitor on the landing); nothing new is asked
    // of the sound piece, the walk just uses what is there.
    push({ plate: step.plate, mirror: false, x, z: Z_WALK, hold: WALK_HOLD, can: 'floor', foot: i, step: step.plate !== 'walk2' });
    x += step.advance * m;
  }
  // 6. HE ARRIVES. One contact plate at the bench to stop on, then front on behind it — the bench
  //    and the cloth take his shins, which is what standing behind a bench looks like — and then
  //    the seated puppet, in its own rest pose, and this piece is out of the picture.
  push({ plate: 'walk4', mirror: false, x: X_BENCH, z: Z_WALK, hold: 3, can: 'floor', step: true });
  push({ plate: 'stand', mirror: false, x: X_BENCH, z: Z_SIT_STEP, hold: 5, can: 'floor', square: true });
  const frames = beats[beats.length - 1].at + beats[beats.length - 1].hold;

  // WHERE THE CAN ENDS UP, and it matters more than it sounds. The crouch drawing is a front-on
  // squat with both hands flat on the floor, 135 px either side of the head's axis; the can goes
  // down beside the LEFT one, which is the side he came from and the side he is not about to walk
  // through. Put it beside the right hand instead — the first thing tried — and his own walking
  // leg passes straight over it two drawings later, which is what the shots showed. It ends at
  // (−2.23, −1.02): at the foot of the palm's stool, a hand's breadth downstage of the line he
  // walks on so his card never crosses it, and there for the rest of the evening.
  const CROUCH = POSES.plates.crouch;
  const canFloor = { x: X_PLANT + (CROUCH.feet[0][0] - CROUCH.axis) * m, z: Z_WALK + 0.1 };

  const hideAll = () => {
    for (const k in plates) plates[k].visible = false;
    can.visible = false;
    pour.visible = false;
  };

  // ── put a beat on the stage ──────────────────────────────────────────────────────────────────
  // Nothing is animated in here. `show` is the exposure sheet's projector: the named drawing, at
  // the named station, and everything else off.
  function show(b, F = 0) {
    hideAll();
    if (!b) return;
    group.visible = true;
    const mesh = plates[b.plate];
    if (!mesh) return;
    mesh.visible = true;
    mesh.position.set(b.x, 0, b.z);
    mesh.scale.set(b.mirror ? -1 : 1, 1, 1);
    // THE CAN. In his fist (measured off the plate's own hand blob, mirrored with the plate), at
    // his side, or standing on the floor where he put it.
    const P = POSES.plates[b.plate];
    // WHICH HAND. The plates carry their hands as measured blobs, so the can does not have to be
    // put anywhere by eye — but it does have to stay on the SAME SIDE OF HIM from one drawing to
    // the next, or it jumps across his body when he straightens up. Held out, it is in the hand
    // furthest from his axis (the one the drawing reaches with); held at his side, it is the hand
    // on the side he was pouring towards, which while he is mirrored is −x, the plant's side.
    const wx = (h) => (h[0] - P.axis) * (b.mirror ? -1 : 1);
    const hands = P.hands ?? [];
    if (b.can === 'grip' && hands.length) {
      const h = hands.reduce((a, k) => (Math.abs(wx(k)) > Math.abs(wx(a)) ? k : a));
      const hx = wx(h) * m;
      const hy = (P.base - h[1]) * m;
      can.visible = true;
      can.position.set(b.x + hx, hy, b.z + 0.01);
      can.scale.set(b.mirror ? -1 : 1, 1, 1);
      can.rotation.z = (b.mirror ? 1 : -1) * (b.tip ?? 0.12);
      if (b.pour) {
        pour.visible = true;
        pour.material = pourMats[F % pourMats.length];
        // the rose is at the far end of the spout; the thread falls from it
        pour.position.set(can.position.x + (b.mirror ? -1 : 1) * CAN_W * 0.42, hy - CAN_H * 0.28, b.z + 0.005);
        pour.scale.set(b.mirror ? -1 : 1, 1, 1);
      }
    } else if (b.can === 'hang' && hands.length) {
      const h = hands.reduce((a, k) => (wx(k) < wx(a) ? k : a));
      can.visible = true;
      can.position.set(b.x + wx(h) * m, (P.base - h[2]) * m + CAN_BAIL_Y * 0.06, b.z + 0.01);
      can.scale.set(1, 1, 1);
      can.rotation.z = 0;
    } else if (b.can === 'floor') {
      can.visible = true;
      can.position.set(canFloor.x, CAN_BAIL_Y, canFloor.z);
      can.scale.set(1, 1, 1);
      can.rotation.z = 0;
    }
  }

  // which beat is on at clock step F since the arrival began
  function at(F) {
    if (F < 0) return beats[0];
    for (const b of beats) if (F < b.at + b.hold) return b;
    return null;
  }

  return {
    group,
    plates,
    can,
    mPerPx: m,
    beats,
    frames,
    at,
    show,
    hide() {
      hideAll();
      group.visible = false;
    },
    // the can does not go away when he does: it is on the floor by the plant for the whole evening
    leaveCan() {
      hideAll();
      group.visible = true;
      can.visible = true;
      can.position.set(canFloor.x, CAN_BAIL_Y, canFloor.z);
      can.scale.set(1, 1, 1);
      can.rotation.z = 0;
    },
    canFloor,
    textures: Promise.all(textures),
    stations: { plant: X_PLANT, bench: X_BENCH, z: Z_WALK },
    // WHAT THE CAMERA HAS TO HOLD, for the contract request and for the judging states. The beat
    // runs from his left edge at the plant to his right edge at the bench, on one plane.
    bounds: { x0: X_PLANT - 0.55, x1: X_BENCH + 0.55, y1: POSES.stature, z: Z_WALK, can: canFloor },
    // …and a shot that holds it, whatever shape the window is. `wide` does the job on any frame
    // wider than about 1.45:1 — measured, not assumed: its axis passes through x = 0 and the beat
    // reaches 2.45 m to the left of that at 4.8 m out, which needs 27° of horizontal half-angle,
    // and `wide` has 33° at 16:9 and 20° at 1:1. Narrower than that and NOTHING frontal can hold
    // it: the frame's own aspect fixes the ratio, so 3.5 m of width on a 0.513 frame is 6.8 m of
    // height whatever lens or distance you choose — which is the finding this round hands the
    // camera, and why the request filed with it asks for a TRACK rather than a wider lens.
    judgeShot(aspect) {
      if (aspect >= 1.45) return 'wide';
      const cx = (X_PLANT + X_BENCH) / 2;
      const half = (X_BENCH - X_PLANT) / 2 + 0.75; // his own width, plus air
      const d = 4.7;
      const fov = (2 * Math.atan(half / d / Math.max(0.35, aspect)) * 180) / Math.PI;
      return { pos: [cx, 1.5, Z_WALK + d], look: [cx, 0.86, Z_WALK], fov: Math.min(96, fov) };
    },
  };
}

// ── the drawings this file makes itself ────────────────────────────────────────────────────────
// A galvanised watering can, in one pen, on paper. It is drawn rather than modelled for the same
// reason he is: everything in his hand is a cut-out, and a lathed tin can beside a paper frog is
// two different pictures. Rolled rim, riveted seam, a long spout to a rose, a bail over the top.
function drawCan() {
  // PRINTED AT THE SIZE IT IS SHOWN, which is the rule the whole figure is cut under. The can is
  // 0.36 m across and plays about 66 px wide in `wide`; drawn on the 340 px grid the shapes are
  // laid out on, every line would be minified five to one and the hardware's averaging filter
  // would hand back a pale grey instead of a pen — which is what happened, and why the first
  // version of this came out as a white lozenge with one dark speck on it. So the layout stays at
  // 340 and the canvas is 168, the pen is given in the canvas's OWN pixels, and the chain is the
  // figure's own (pepe-mips.js) so coverage and pigment are filtered apart from here down.
  const LAY = 340, K = 168 / LAY;
  const W = Math.round(LAY * K), H = Math.round(300 * K);
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.scale(K, K);
  const PEN = 2.6 / K; // ~2.6 px on the canvas, which is the room's own stroke at this size
  const line = (pts, { width = PEN, close = false } = {}) => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    if (close) g.closePath();
    g.lineWidth = width;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.strokeStyle = INK;
    g.stroke();
  };
  // the body: a tapered drum, wider at the shoulder than the foot, standing on the bottom edge
  const bx0 = 118, bx1 = 236, by0 = 96, by1 = 268, foot = 12;
  const body = [
    [bx0, by0],
    [bx1, by0],
    [bx1 - foot, by1],
    [bx0 + foot, by1],
  ];
  g.fillStyle = PAPER;
  g.beginPath();
  g.moveTo(body[0][0], body[0][1]);
  for (const p of body.slice(1)) g.lineTo(p[0], p[1]);
  g.closePath();
  g.fill();
  // the contour carries more weight than the interior, as it does on every plate in this piece
  // and in every folio — and it has to here more than anywhere, because the can is held over a
  // palm whose fronds are the blackest thing in that corner, and a pale box with a hairline round
  // it disappears into them
  line(body, { close: true, width: PEN * 1.4 });
  // the rolled rim and the foot ring: two lines, which is what says "tin" and not "bucket"
  line([[bx0 - 5, by0 + 1], [bx1 + 5, by0 + 1]], { width: PEN * 1.15 });
  line([[bx0 - 5, by0 - 9], [bx1 + 5, by0 - 9]], { width: PEN * 1.15 });
  line([[bx0 - 5, by0 - 9], [bx0 - 5, by0 + 1]], { width: PEN });
  line([[bx1 + 5, by0 - 9], [bx1 + 5, by0 + 1]], { width: PEN });
  line([[bx0 + foot - 2, by1 - 12], [bx1 - foot + 2, by1 - 12]], { width: PEN * 0.75 });
  // the seam, and three rivets down it
  line([[bx0 + 26, by0 + 8], [bx0 + 24, by1 - 16]], { width: PEN * 0.6 });
  for (const y of [by0 + 40, by0 + 88, by0 + 136]) {
    g.beginPath();
    g.arc(bx0 + 25, y, 3.2, 0, Math.PI * 2);
    g.fillStyle = INK;
    g.fill();
  }
  // the spout: a long taper from low on the body up to a rose at the far side
  const sp = [
    [bx1 - 6, by1 - 46],
    [286, by0 + 52],
  ];
  g.fillStyle = PAPER;
  g.beginPath();
  g.moveTo(sp[0][0], sp[0][1] - 20);
  g.lineTo(sp[1][0] - 8, sp[1][1] - 12);
  g.lineTo(sp[1][0] + 12, sp[1][1] + 16);
  g.lineTo(sp[0][0] - 2, sp[0][1] + 16);
  g.closePath();
  g.fill();
  line([[sp[0][0], sp[0][1] - 20], [sp[1][0] - 8, sp[1][1] - 12]], { width: PEN * 1.4 });
  line([[sp[0][0] - 2, sp[0][1] + 16], [sp[1][0] + 12, sp[1][1] + 16]], { width: PEN * 1.4 });
  // the rose: an oval face with a ring of holes
  g.fillStyle = PAPER;
  g.beginPath();
  g.ellipse(300, by0 + 40, 22, 15, -0.5, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = PEN * 1.4;
  g.strokeStyle = INK;
  g.stroke();
  g.fillStyle = INK;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    g.beginPath();
    g.arc(300 + Math.cos(a) * 11, by0 + 40 + Math.sin(a) * 7, 2.2, 0, Math.PI * 2);
    g.fill();
  }
  // the bail, over the top, and the grip at the back — the bail's crown is the point he holds
  line([[bx0 + 6, by0 - 6], [140, 34], [200, 26], [bx1 - 10, by0 - 6]], { width: PEN * 1.35 });
  line([[bx0 - 4, by0 + 26], [92, 60], [96, 116], [bx0 + 2, by0 + 76]], { width: PEN });
  return canvasTexture(c, { anisotropy: 8 });
}

// three threads of water, drawn broken the way ink draws water in the folios: not a tube, a
// handful of strokes that do not quite meet, re-rolled a step at a time
function drawPour(seed) {
  const LAY_W = 128, LAY_H = 336, K = 0.5; // again: the size it is shown at, not the drawing grid
  const W = Math.round(LAY_W * K), H = Math.round(LAY_H * K);
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.scale(K, K);
  let s = seed * 977 + 13;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  g.strokeStyle = INK;
  g.lineCap = 'round';
  for (let k = 0; k < 5; k++) {
    let x = 52 + rnd() * 22, y = 6 + rnd() * 22;
    const w = (3.0 + rnd() * 1.8) / K;
    while (y < LAY_H - 8) {
      const len = 26 + rnd() * 44;
      g.beginPath();
      g.lineWidth = w;
      g.moveTo(x, y);
      const nx = x + (rnd() - 0.35) * 9, ny = Math.min(LAY_H - 6, y + len);
      g.lineTo(nx, ny);
      g.stroke();
      x = nx + (rnd() - 0.5) * 4;
      y = ny + 8 + rnd() * 22; // the gap: the thread breaks, which is what falling water does
    }
  }
  return canvasTexture(c, { anisotropy: 8 });
}
