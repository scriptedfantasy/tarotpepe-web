// reveal-hand.js — Tarot Pepe's hand on the tablecloth.
//
// The tabletop beats (the fan dealt, the visitor's card carried to its slot, the ribbon gathered,
// a card turned) are shot from above, and until now nothing touched a card: the cards moved by
// themselves while the protagonist sat off the top of the frame. This is his hand, drawn for those
// beats only and owned by the reveal piece: a flat paper cut-out that lies IN the tablecloth, the
// way a paper-theatre hand is laid on a set, entering from the top edge of the frame — his side of
// the table — with a white sleeve running back off-frame toward his shoulder.
//
// It is his and not the visitor's because (a) the visitor is the camera in this film and has never
// had a body, (b) he sits upstage so the top edge is geometrically his, and (c) green is the only
// colour on the cloth, so a green hand entering IS the protagonist arriving.
//
// The drawing is made here with the pen, in the language of the supplied Pepe: a heavy ink contour
// round a flat green silhouette, a few creases, a little hatch. Three replacement drawings, the way
// the puppet has three mouths:
//   splay — five fingers apart, the hand that deals and sweeps (STYLE.md §1.6: splayed, separated)
//   point — index and middle out together, the two fingers that land on a card's near edge
//   pinch — thumb and forefinger closed, the hand that takes one card out of the ribbon
//
// Posing is by the FINGERTIP: `at(x, y, z, {yaw, pose})` puts the contact point of the drawing on
// that spot on the cloth and works the wrist and the sleeve back from it, tilting the hand up about
// the wrist when the fingertip is above the cloth (a card being reared up on its edge). While the
// hand is out, the puppet's own hand on that side is LENT to it — asked for through pepe's own api
// (`pepe.handOff(side)` / `handOn(side)`, see "lending a hand" in pepe.js), so his shoulder holds
// still and the hand comes back exactly where it left, and he never has three.
//
// THE DRAWING BELONGS TO THE OVERHEAD SHOTS. It is a flat cut-out lying IN the plane of the cloth:
// from `fan` or `spread`, whose lens is 70° or more above the table, it reads as a hand on the
// table; from `pepe` or `table`, whose lens is at the height of the table, the same drawing
// foreshortens to a fifth of its length and lies there as a green blade. So the hand watches the
// camera, and when the shot is not an overhead one it WITHDRAWS — two drawings back along its own
// arm, off the top edge of the picture, then gone, and his own cut-out hand comes back on his
// body. When an overhead shot returns the same drawings play backwards. `hide()` / `show()` let
// another piece ask for the same withdrawal directly.
import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';
import { INK, PAPER, makeCanvas, canvasTexture, inkLine, hatch, inkMaterial } from '../core/strokes.js';
import { SKIN } from './pepe.js';

const PI = Math.PI;
const rad = (d) => (d * PI) / 180;

// the drawing's scale on the cloth: the puppet's own hand is 0.154 m across, 0.192 m long
export const HAND = {
  w: 0.204, // across the splayed fingers — big hands, the way the film draws them
  l: 0.272, // wrist to fingertip
  reach: 0.238, // wrist to the contact point of the drawing (the fingertips, a little short of the tip)
  y: 0.0045, // how far the paper floats over the cloth
  sleeveW: 0.09, // a wrist, not a limb: half the hand's width across
  // The sleeve runs back to the exact spot where the puppet's own right hand sits — the one that
  // steps out while this one is on the cloth — and lifts as it goes, so the forearm passes over
  // the clutter instead of through it and meets his body where his hand was. From over the cloth
  // it simply runs off the top of the frame.
  anchor: [0.291, 0.828, -0.82],
  sleeveMax: 1.05,
};

// How far the lens must be tilted down before the drawing may lie on the cloth: the y of the
// camera's own forward vector. The named shots fall either side of it by a mile — spread and the
// card inserts are straight down (-1.0), `fan` is -0.95, while `table`, `pepe`, `home`, `wide` and
// `door` are all level (0.0) — and a shot the camera piece adds later, or the middle of a move
// between two of them, answers for itself without a list of names to keep in step.
const OVERHEAD_Y = -0.6;
// The withdrawal, one drawing per stepped frame: metres back along the hand's own arm, and metres
// up off the cloth. The frame of the cut, ONE drawing of the hand taken back and up — 0.34 m is
// half the overhead frame, and the lift tilts the cut-out up about the wrist so it reads as a
// hand leaving a table and not as a plank lying on it — and it is off the picture. Two drawings,
// because the shot it is caught in is the shot it does not belong in: any longer and the arm is
// seen lying across the cloth, any shorter and the hand goes out like a light. The return is the
// same two drawings backwards.
const RETREAT = [0, 0.34];
const LIFT = [0, 0.12];
const RAMP = RETREAT.length;

const TEX = { w: 384, h: 512 };
// The contour: stroked at OUT, then the silhouette is re-filled, so half of it shows. The drawing
// lies flat and is read at a steep angle, which halves it again on screen, so it is drawn heavier
// than the puppet's own hands (3.5% of their width) at a little under 5%.
const OUT = 38;

// ── the drawing ────────────────────────────────────────────────────────────────────────────────
// A finger is a chain of four segments from its knuckle, turning by `bend` over its length and
// tapering; the polygon is its left side, a cap round the tip, and its right side back.
function fingerPoly(base, ang, len, w, bend, rng, wob = 2.2) {
  const N = 4;
  const spine = [];
  let a = ang, x = base[0], y = base[1];
  spine.push([x, y, w / 2]);
  for (let i = 1; i <= N; i++) {
    a += bend / N;
    x += Math.cos(rad(a)) * (len / N);
    y -= Math.sin(rad(a)) * (len / N);
    spine.push([x, y, (w / 2) * (1 - 0.22 * (i / N))]);
  }
  const j = () => (rng() - 0.5) * 2 * wob;
  const left = [], right = [];
  for (let i = 0; i < spine.length; i++) {
    const [px, py, r] = spine[i];
    const p0 = spine[Math.max(0, i - 1)], p1 = spine[Math.min(spine.length - 1, i + 1)];
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    left.push([px + nx * r + j(), py + ny * r + j()]);
    right.push([px - nx * r + j(), py - ny * r + j()]);
  }
  // the tip: a half-turn round the last centre, drawn as five points so it is not a true circle
  const [tx, ty, tr] = spine[spine.length - 1];
  const tipAng = Math.atan2(ty - spine[spine.length - 2][1], tx - spine[spine.length - 2][0]);
  const cap = [];
  for (let k = 1; k <= 4; k++) {
    const th = tipAng - PI / 2 + (PI * k) / 5;
    cap.push([tx + Math.cos(th) * tr + j(), ty + Math.sin(th) * tr + j()]);
  }
  return [...left, ...cap, ...right.reverse()];
}

function wobbly(points, rng, wob = 2.6) {
  return points.map(([x, y]) => [x + (rng() - 0.5) * 2 * wob, y + (rng() - 0.5) * 2 * wob]);
}

function polyPath(g, poly) {
  g.beginPath();
  g.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) g.lineTo(poly[i][0], poly[i][1]);
  g.closePath();
}

// The five fingers of each drawing: [base, angle from +x with the canvas' y flipped, length,
// width, bend]. The palm is the same in all three; only the fingers are re-drawn.
const FINGERS = {
  splay: [
    [[120, 384], 156, 122, 46, -16], // thumb, out to the left
    [[132, 262], 111, 168, 41, 6],
    [[190, 244], 94, 188, 41, 2],
    [[248, 250], 77, 172, 39, -4],
    [[300, 278], 57, 138, 34, -10],
  ],
  point: [
    [[126, 392], 150, 62, 44, -26], // thumb tucked flat against the palm
    [[158, 256], 96, 186, 42, 2], // index and middle, out together: the two that land on the edge
    [[204, 250], 88, 194, 42, 0],
    [[258, 264], 70, 44, 39, -34], // ring and little, folded away
    [[302, 292], 54, 32, 34, -38],
  ],
  pinch: [
    [[122, 386], 108, 128, 45, 30], // thumb up to meet the forefinger
    [[156, 258], 78, 150, 40, -26], // the forefinger curls in to it
    [[200, 250], 88, 176, 41, -6],
    [[252, 258], 72, 96, 39, -34],
    [[300, 286], 56, 70, 34, -34],
  ],
};

const PALM = [
  [102, 560], [86, 452], [84, 352], [110, 272], [150, 244],
  [200, 236], [256, 244], [302, 276], [318, 372], [306, 470], [298, 560],
];

function drawHand(g, w, h, pose) {
  const rng = mulberry32(pose === 'splay' ? 91 : pose === 'point' ? 92 : 93);
  g.clearRect(0, 0, w, h);
  const polys = [wobbly(PALM, rng, 3), ...FINGERS[pose].map((f) => fingerPoly(f[0], f[1], f[2], f[3], f[4], rng))];

  // 1. the contour: every part stroked heavy and filled solid, so the union is one ink silhouette
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.strokeStyle = INK;
  g.fillStyle = INK;
  g.lineWidth = OUT;
  for (const p of polys) {
    polyPath(g, p);
    g.stroke();
    g.fill();
  }
  // 2. the flat colour, laid back inside the contour: half the stroke stays as the pen line
  g.fillStyle = SKIN;
  for (const p of polys) {
    polyPath(g, p);
    g.fill();
  }
  g.restore();

  // 3. the drawn creases. The hand is seen small and steeply foreshortened, so only a few lines
  // survive: the web between the fingers that are out, the thumb, and the knuckles.
  const F = FINGERS[pose];
  for (let i = 1; i < F.length - 1; i++) {
    if (F[i][2] < 90 || F[i + 1][2] < 90) continue; // no web between fingers that are folded away
    const a = F[i][0], b = F[i + 1][0];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    inkLine(g, mx, my + 4, mx + (rng() - 0.5) * 10, my + 52 + rng() * 16, { width: 11, wobble: 2, rng });
  }
  // the thumb's crease, curving out of the palm
  inkLine(g, F[0][0][0] + 30, F[0][0][1] - 40, F[0][0][0] + 74, F[0][0][1] + 40, { width: 10, wobble: 3, rng });
  // the knuckle line across the top of the palm
  inkLine(g, 132, 296, 292, 310, { width: 8, wobble: 4, rng, alpha: 0.95 });

  // 4. a little tone, drawn over the colour: rain-strokes down the shaded side of the palm
  g.save();
  polyPath(g, polys[0]);
  g.clip();
  hatch(g, 84, 330, 84, 230, { angle: rad(74), spacing: 20, width: 5, wobble: 1.4, broken: 0.5, rng, alpha: 0.85 });
  g.restore();
}

// The forearm, running back from the wrist (v = 0) to the sleeve of his robe at the far end
// (v = 1). It is BARE and green, not a sleeve: white robe on a white cloth is two papers with a
// line between them and reads as a plank, where the green says Pepe at a glance and is the one
// thing on the cloth allowed to carry colour. The robe's cuff is drawn across the far end, so the
// arm comes out of his sleeve where the puppet's own hand used to sit.
function drawArm(g, w, h) {
  const rng = mulberry32(77);
  g.clearRect(0, 0, w, h);
  const inset = 16;
  const side = (dir) => {
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const v = i / 8;
      // the wrist is the narrow part; the arm swells toward the elbow and the cuff closes on it
      const half = (w / 2 - inset) * (0.9 + 0.2 * v - 0.22 * v * v);
      pts.push([w / 2 + dir * half + (rng() - 0.5) * 5, 20 + v * (h - 26) + dir * v * 7]);
    }
    return pts;
  };
  const L = side(-1), R = side(1);
  const outline = () => {
    g.beginPath();
    g.moveTo(L[0][0], 0);
    for (const p of L) g.lineTo(p[0], p[1]);
    for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
    g.lineTo(R[0][0], 0);
    g.closePath();
  };
  // the same trick as the hand: a heavy stroke, then the colour laid back inside it
  g.save();
  g.lineJoin = g.lineCap = 'round';
  g.strokeStyle = INK;
  g.fillStyle = INK;
  g.lineWidth = 30;
  outline();
  g.stroke();
  g.fill();
  g.fillStyle = SKIN;
  outline();
  g.fill();
  // the robe's cuff: the last fifth of the arm is the white sleeve it comes out of
  g.beginPath();
  g.rect(0, h * 0.8, w, h * 0.2);
  g.clip();
  g.fillStyle = PAPER;
  outline();
  g.fill();
  g.restore();
  // the cuff's own rules, across the arm
  inkLine(g, L[6][0] - 6, h * 0.8, R[6][0] + 6, h * 0.8 - 6, { width: 12, wobble: 2.4, rng });
  inkLine(g, L[7][0] - 3, h * 0.86, R[7][0] + 3, h * 0.86 - 5, { width: 8, wobble: 2.6, rng });
  // rain-strokes down the shaded edge of the arm
  g.save();
  outline();
  g.clip();
  hatch(g, inset, 60, 26, h * 0.68, { angle: rad(86), spacing: 22, width: 5, wobble: 1.4, broken: 0.5, rng, alpha: 0.85 });
  g.restore();
}

// ── the object ─────────────────────────────────────────────────────────────────────────────────
function quadXZ(w, l, { z0 = 0, z1 = 1, flipV = false } = {}) {
  const g = new THREE.BufferGeometry();
  const x = w / 2;
  const za = z0, zb = z1 * l;
  const v0 = flipV ? 1 : 0, v1 = flipV ? 0 : 1;
  g.setAttribute('position', new THREE.Float32BufferAttribute([-x, 0, za, x, 0, za, x, 0, zb, -x, 0, zb], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, v0, 1, v0, 1, v1, 0, v1], 2));
  g.setIndex([0, 2, 1, 0, 3, 2]);
  g.computeBoundingSphere();
  return g;
}

export function buildHand(ctx) {
  const Y = ctx.layout.spread.y;
  const group = new THREE.Group();
  group.name = 'reveal-hand';
  group.visible = false;
  ctx.scene.add(group);

  // the puppet's own hand on that side steps out while this one is on the cloth (he never has three)
  const puppetHand = (side) => ctx.pieces.pepe?.parts?.['hand' + side] ?? null;

  const mat = (map, colorful) => {
    const m = inkMaterial({ color: '#ffffff', map, colorful, hatch: 0.35, lineWeight: 0.4, roughness: 1 });
    m.alphaTest = 0.5;
    m.side = THREE.DoubleSide;
    return m;
  };
  const tex = (w, h, draw) => {
    const c = makeCanvas(w, h);
    draw(c.getContext('2d'), w, h);
    return canvasTexture(c, { anisotropy: 8 });
  };

  // the sleeve: a yaw pivot at the wrist (it points back at his shoulder however the hand turns)
  // holding a quad that runs toward -z and lifts a little, so the forearm passes over the clutter
  // on the cloth instead of lying across it. Its length is a z-scale.
  const sleevePivot = new THREE.Group();
  sleevePivot.name = 'reveal-hand-sleeve';
  sleevePivot.position.y = 0.0012; // the cuff sits over the cut end of the hand
  group.add(sleevePivot);
  // v = 0 is the wrist, drawn at the top of the canvas; the quad's wrist end is z = +0.014
  const sleeve = new THREE.Mesh(quadXZ(HAND.sleeveW, 1, { z0: 0.014, z1: -1, flipV: true }), mat(tex(160, 512, drawArm), true));
  sleeve.castShadow = true;
  sleevePivot.add(sleeve);
  // where each arm goes: the puppet's own wrists at rest, read off him if he built
  const ANCH = { R: new THREE.Vector3(...HAND.anchor), L: new THREE.Vector3(-HAND.anchor[0], HAND.anchor[1], HAND.anchor[2]) };
  ctx.pieces.pepe?.root?.updateMatrixWorld(true);
  for (const s of ['L', 'R']) {
    const h0 = puppetHand(s);
    if (h0?.matrixWorld) h0.getWorldPosition(ANCH[s]);
  }

  // the hand, hinged at the wrist so it can tilt up off the cloth
  const wrist = new THREE.Group();
  wrist.name = 'reveal-hand-wrist';
  group.add(wrist);
  const poses = {};
  for (const name of ['splay', 'point', 'pinch']) {
    const m = new THREE.Mesh(quadXZ(HAND.w, HAND.l), mat(tex(TEX.w, TEX.h, (g, w, h) => drawHand(g, w, h, name)), true));
    m.name = 'reveal-hand-' + name;
    m.castShadow = true;
    m.visible = false;
    wrist.add(m);
    poses[name] = m;
  }

  let shown = false, sideShown = 'R';
  function setShown(v, side = sideShown) {
    if (shown === v && sideShown === side) return;
    shown = v;
    sideShown = side;
    group.visible = v;
    // his own cut-out hand on that side steps out of the drawing while this one is on the cloth,
    // and comes back the moment it leaves: his business, so it is asked for, never reached into
    for (const s of ['L', 'R']) ctx.pieces.pepe?.[v && s === side ? 'handOff' : 'handOn']?.(s);
  }

  // ── the camera watch ──────────────────────────────────────────────────────────────────────────
  // `out` is how far through the withdrawal the drawing is (0 on the cloth … RAMP off the
  // picture). It is a function of the frame count since the answer last changed, not a counter, so
  // a frozen clock (?t=) shows the settled pose and every frame of a take stays deterministic.
  const _dir = new THREE.Vector3();
  const overhead = () => ctx.camera.getWorldDirection(_dir).y <= OVERHEAD_Y;
  let forced = false; // another piece asked for the hand off the cloth (hide / show)
  let allowed = true, sinceFrame = -99, out = 0;
  let want = null, wantFrame = -99; // the last pose asked for, and when: replayed as it withdraws

  // Several tracks are composed into ONE drawing (three cards turning, a card carried while the
  // ribbon closes), and `compose` holds a finished track's last drawing for ever after. So the
  // hand is CLAIMED rather than set: the player brackets every drawing with begin()/end(), any
  // track that puts the hand somewhere in that drawing wins, and the hand only leaves the cloth
  // when no track wanted it at all.
  let claimed = false;

  // The drawing, put where `w` asks and slid back along its own arm by however far the withdrawal
  // has got. Past the last step of the withdrawal it is not drawn at all and his own hand is back.
  function place(w) {
    if (out >= RAMP) {
      setShown(false);
      return;
    }
    const m = w.side === 'L' ? -1 : 1;
    const Yaw = m * w.yaw;
    setShown(true, m < 0 ? 'L' : 'R');
    for (const k in poses) poses[k].visible = k === (poses[w.pose] ? w.pose : 'splay');
    const lift = Math.max(0, w.y) + LIFT[out];
    const pitch = Math.asin(Math.min(0.97, lift / HAND.reach));
    const run = HAND.reach * Math.cos(pitch) + RETREAT[out]; // …plus the withdrawal, straight back up the arm
    const wx = w.x - Math.sin(Yaw) * run;
    const wz = w.z - Math.cos(Yaw) * run;
    group.position.set(wx, Y + HAND.y, wz);
    group.rotation.set(0, Yaw, 0);
    group.scale.x = m;
    wrist.rotation.set(-pitch, 0, 0);
    // the arm keeps to the cloth and points back at that wrist of his, however the hand is turned
    const A = ANCH[m < 0 ? 'L' : 'R'];
    const dx = A.x - wx, dz = A.z - wz;
    const len = Math.min(HAND.sleeveMax, Math.max(0.3, Math.hypot(dx, dz)));
    sleevePivot.rotation.set(0, m < 0 ? Math.atan2(dx, -dz) + Yaw : Math.atan2(-dx, -dz) - Yaw, 0);
    sleeve.rotation.x = Math.asin(Math.max(-0.3, Math.min(0.5, (A.y - (Y + HAND.y + 0.0012)) / len)));
    sleeve.scale.z = len;
  }

  const api = {
    group,
    HAND,
    begin() {
      claimed = false;
    },
    end() {
      if (!claimed) setShown(false);
    },
    // Put the drawing's contact point (the fingertips) on (x, y, z); the wrist and the sleeve
    // follow. `y` is metres above the cloth: above zero the hand tilts up about the wrist, the way
    // a hand rears a card up on its edge. `yaw` turns the hand about the contact point; 0 points
    // straight downstage, at the visitor.
    // `side` says which of his hands this is: 'R' (default) reaches from the visitor's right,
    // 'L' is the same drawing mirrored and anchored to his other wrist, so a card on the left of
    // the spread is turned by the hand that is nearest it and no arm crosses the whole cloth.
    // `yaw` is always given as if for the right hand; the left mirrors it.
    at(x, y, z, { yaw = 0, pose = 'splay', side = 'R' } = {}) {
      claimed = true;
      want = { x, y, z, yaw, pose, side };
      wantFrame = ctx.clock.frame;
      place(want);
    },
    // this track has no use for the hand in this drawing; another one may still claim it, so
    // nothing happens here — end() decides
    off() {},
    // One drawing of the withdrawal, or of the return: reveal.update calls it on every stepped
    // frame, after the takes have drawn, so it sees what they asked for and where the camera is.
    step() {
      const a = !forced && overhead();
      const first = sinceFrame === -99;
      if (first || a !== allowed) {
        allowed = a;
        sinceFrame = first ? ctx.clock.frame - RAMP : ctx.clock.frame; // the first answer is not animated
      }
      const k = Math.max(0, ctx.clock.frame - sinceFrame);
      const o = allowed ? Math.max(0, RAMP - k) : Math.min(RAMP, k);
      if (o === out) return;
      out = o;
      if (want && wantFrame >= ctx.clock.frame) place(want); // still wanted: redraw it at its new remove
      else if (out >= RAMP) setShown(false);
    },
    // Another piece asking for the cloth to itself: the hand withdraws over the next two drawings
    // and stays off until show() is called. The camera watch does this by itself for every shot
    // that is not overhead, so a cut away needs no call at all.
    hide() {
      forced = true;
      api.step();
    },
    show() {
      forced = false;
      api.step();
    },
    // the hand off the cloth at once, whatever anyone claimed (a take stopped, the fan cleared)
    clear() {
      claimed = false;
      want = null;
      setShown(false);
    },
    get shown() {
      return shown;
    },
    // whether the hand may be on the cloth at all: the camera is overhead and nobody asked it off
    get overhead() {
      return allowed;
    },
    // how far through the withdrawal the drawing is: 0 on the cloth … RAMP off the picture (tests)
    get out() {
      return out;
    },
    dispose() {
      for (const k in poses) {
        poses[k].geometry.dispose();
        poses[k].material.map?.dispose();
        poses[k].material.dispose();
      }
      sleeve.geometry.dispose();
      sleeve.material.map?.dispose();
      sleeve.material.dispose();
    },
  };
  return api;
}
