// PIECE: egg-deck — THE WHOLE DECK, FACE UP ON THE CLOTH. The room's switch that is the deck
// itself. The user's words, which are the spec: "something should also happen to the cards if the
// user clicks on the full stack on the table. that may be a good place to reveal all the tarot
// cards."
//
// WHAT HAPPENS, and it is four seconds:
//   0.00  the click lands on the squared deck. The camera cuts to the plan view over the cloth and
//         the pile starts giving its cards up — one after another on the 12 fps clock, a riffle
//         under them — each card climbing off the top of the pile, turning over in the air and
//         coming down FACE UP in its place. The pile shrinks under them until there is nothing on
//         the table but the deck, laid out.
//   3.00  seventy-eight cards in five bows: the twenty-two majors in one arc across the top, then
//         cups, pentacles, swords and wands, ace to king, left to right, in four arcs under it.
//         A `deal` as each arc lands.
//   —     and then it holds. The pointer stands a card UP out of the rows exactly as the wash does;
//         a tap on the standing card brings it to the lens at its full size with its name on the
//         placard, and a second tap puts it back.
//   close a tap on the bare cloth, on the deck's own square, or anywhere else in the frame rakes
//         them home: the rows slide back into the pile in the order they were laid, in reverse,
//         over two seconds, `settle`, and the camera cuts home.
//
// AND THE DECK IS GIVEN BACK EXACTLY. The cards that fly are this piece's own meshes (the same
// borrowing egg-konami.js and reveal-pick.js do); the pile that shrinks and grows is a temporary
// stack of the deck's own blocks (reveal-shuffle.js → deckStacks), disposed at the end; and the
// deck's real blocks are only ever hidden and shown, with their visibility recorded before and put
// back after. tools/_egg-deck-proof.mjs compares every mesh, pose, scale and material of the deck
// before and after and requires them identical, and pixel-compares the home plate.
//
// ── THE ONE COMPROMISE, STATED PLAINLY ────────────────────────────────────────────────────────
// A DECK DOES NOT FIT ON THIS TABLE FACE UP. Seventy-eight cards of 0.13 x 0.2275 are 2.31 m² of
// card; the cloth is a disc of 0.62 m — 1.21 m² — of which the still life takes the far half and
// a reading's three cards take a bar across the middle of the near one. Laid at their own size the
// cards would have to cover three quarters of each other and the picture would be seventy-eight
// slivers. So the lay-out is drawn SMALLER: the card is eased down to about a third of its size as
// it turns over in the air, and eased back up as it comes home. That is a lie the film tells for
// four seconds, and it is paid for at once — a tap on any card brings it to the lens at its FULL
// size, which is where a card is actually read. The alternative was 78 unreadable strips.
//
// ── WHAT THE ARRANGEMENT IS SOLVED AGAINST ────────────────────────────────────────────────────
// Nothing here is written down as a coordinate. At the moment of the click the piece projects the
// four corners of the plate onto the cloth and solves the largest card it can lay inside what the
// LENS actually frames — so the arrangement follows the window's shape the way reveal-wash.js's
// band does, without either file having to know the other's numbers. Inside that it obeys the
// cloth's own three limits, which are reveal-wash.js's and are not this file's to change:
//   · no corner past r = 0.585 (the rim is at 0.62);
//   · nothing lying on the three reading slots — a reading's cards stay exactly where they are and
//     are not part of this, so the bows are held off the box they actually occupy;
//   · nothing in the far band, which is a still life.
// and its own two: the bows are pitched at two thirds of a card's height and the cards along a bow
// at no less than two thirds of its width, so no card is covered by more than a third either way.
import * as THREE from 'three';
import { DECK } from '../core/deck.js';
import { inkMaterial } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { cardGeometry } from './cards-geometry.js';
import { deckStacks } from './reveal-shuffle.js';

const N = 78;
const CARD = { w: 0.13, h: 0.2275, t: 0.0008 };
const RIM = 0.585; // no corner past this (the table's rim is 0.62)
const STILL = -0.04; // the far band is a still life: nothing upstage of this
const ATLAS = { url: '/cards/deck-atlas.webp', cols: 8, rows: 10 };

// the shape of the four seconds, and of the two it takes to come home
export const T = { laid: 3.0, done: 3.6 };
const FLY = 0.62; // a card's climb, turn and descent
const SLIDE = 0.5; // …and its slide home
const GATHER = { back: 1.45, done: 2.0 };
const DEEP = 0.0002; // how much a card rides over the one it is laid on

// The two arrangements, chosen by which one solves the bigger card in the window that is up. The
// first is the brief's own — the majors in one arc, the four suits in four — and it wins on any
// window wide enough to draw twenty-two cards across. The second is for a portrait frame, where a
// row of twenty-two is 18 px a card: the majors go in two arcs and each suit in two of seven.
const PLANS = [
  { name: 'five', bows: [22, 14, 14, 14, 14] },
  { name: 'ten', bows: [11, 11, 7, 7, 7, 7, 7, 7, 7, 7] },
];

// ── the geometry ──────────────────────────────────────────────────────────────────────────────
// A card lies on a bow with its long axis RADIAL and its printed top pointing inward, up the
// frame: a card centred at (r, φ) is at (r sinφ, r cosφ) and is yawed by φ, which is the yaw that
// takes the mesh's own art-top (−z when the card is face up) to (−sinφ, −cosφ).
const cornersOf = (r, phi, w, h) => {
  const s = Math.sin(phi), c = Math.cos(phi);
  const out = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) out.push([(r + (a * h) / 2) * s + ((b * w) / 2) * c, (r + (a * h) / 2) * c - ((b * w) / 2) * s]);
  return out;
};

// Is a card at (r, φ) allowed to lie there? `win` is what the lens frames on the cloth, `keep` the
// boxes already occupied (a reading's three cards).
function legal(r, phi, w, h, win, keep) {
  for (const [x, z] of cornersOf(r, phi, w, h)) {
    if (Math.hypot(x, z) > RIM) return false;
    if (z < STILL) return false;
    if (Math.abs(x) > win.x || z < win.z0 || z > win.z1) return false;
    for (const b of keep) if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return false;
  }
  return true;
}
// How far round a bow a card may go before one of those limits bites. Walked outward two degrees
// at a time and then refined, and STOPPED at the first refusal — a bow never jumps a forbidden
// patch to find open cloth on the far side of it.
function spanOf(r, w, h, win, keep) {
  const ok = (p) => legal(r, p, w, h, win, keep) && legal(r, -p, w, h, win, keep);
  if (!ok(0)) return -1;
  const COARSE = Math.PI / 90, FINE = COARSE / 8;
  let phi = 0;
  while (phi < 1.5 && ok(phi + COARSE)) phi += COARSE;
  while (phi < 1.5 && ok(phi + FINE)) phi += FINE;
  return phi;
}

// The largest card this plan can be laid at in this window, and where each of its 78 go. Two
// numbers are free — how big a card is and how far out the innermost bow stands — and they pull
// against each other: the frame's TOP edge cuts a bow off the nearer it is to the table's middle
// (a bow of radius r is only in the picture for |φ| < acos(z0/r)), while the rim and the frame's
// bottom edge cap the outermost one. So the card is found by bisection and, at each size, the
// whole set of bows is slid in and out to find the placing whose TIGHTEST bow is longest. Returns
// null when the plan will not fit at any size worth drawing.
function solve(plan, win, keep) {
  const B = plan.bows.length;
  const inner = keep.length ? Math.max(...keep.flatMap((b) => [Math.hypot(b.x0, b.z0), Math.hypot(b.x1, b.z0), Math.hypot(b.x0, b.z1), Math.hypot(b.x1, b.z1)])) + 0.006 : 0.10;
  const rOut = Math.min(RIM, win.z1);
  const need = (L, w) => plan.bows.every((n) => (n > 1 ? (L - w) / (n - 1) >= (2 / 3) * w : L >= w));
  const at = (r0, w, h, q) => {
    const radii = [], spans = [];
    for (let k = 0; k < B; k++) {
      const r = r0 + k * q;
      const sp = spanOf(r, w, h, win, keep);
      if (sp <= 0) return null;
      radii.push(r);
      spans.push(sp);
    }
    // every bow is drawn the same width across the picture — the arc the tightest of them allows —
    // so the set reads as one block and not as a staircase
    return { radii, spans, L: Math.min(...radii.map((r, k) => 2 * spans[k] * r)) };
  };
  const fits = (s) => {
    const w = CARD.w * s, h = CARD.h * s, q = (2 / 3) * h;
    const lo = Math.max(inner, win.z0 + 0.004) + h / 2;
    const hi = rOut - h / 2 - (B - 1) * q;
    if (hi < lo) return null;
    let best = null;
    const STEPS = 20;
    for (let g = 0; g <= STEPS; g++) {
      const f = at(lo + ((hi - lo) * g) / STEPS, w, h, q);
      if (f && (!best || f.L > best.L)) best = f;
    }
    return best && need(best.L, w) ? { s, w, h, ...best } : null;
  };
  let lo = 0.08, hi = 1.0, best = fits(lo);
  if (!best) return null;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    const f = fits(mid);
    if (f) {
      best = f;
      lo = mid;
    } else hi = mid;
  }
  return best;
}

// …and the seventy-eight poses that come out of it, in the DECK's own order: the majors first, then
// cups, pentacles, swords and wands, ace to king, left to right along their bow.
export function layoutFor(win, keep = []) {
  let best = null, bestPlan = null;
  for (const p of PLANS) {
    const f = solve(p, win, keep);
    if (f && (!best || f.s > best.s)) {
      best = f;
      bestPlan = p;
    }
  }
  if (!best) return null;
  const { s, w, h, radii, L } = best;
  const poses = [];
  let i = 0;
  bestPlan.bows.forEach((n, k) => {
    const r = radii[k];
    const p = n > 1 ? Math.min((L - w) / (n - 1), 1.6 * w) : 0;
    const half = ((n - 1) * p) / 2;
    for (let j = 0; j < n; j++) {
      const phi = (j * p - half) / r;
      poses.push({ i, bow: k, r, phi, x: r * Math.sin(phi), z: r * Math.cos(phi), yaw: phi });
      i++;
    }
  });
  return { plan: bestPlan.name, scale: s, card: { w, h }, bows: bestPlan.bows.slice(), radii, poses };
}

// ── the egg ───────────────────────────────────────────────────────────────────────────────────
export function eggDeck(ctx, { switches, konami = null } = {}) {
  const Y = ctx.layout.spread.y;
  const cards = () => ctx.pieces.cards; // built after props: never cached at build time
  const sound = () => ctx.pieces.sound;
  const canvas = ctx.renderer?.domElement ?? null;

  const group = new THREE.Group();
  group.name = 'deck-out';
  group.visible = false;
  ctx.scene.add(group);

  let plan = null; // the solved arrangement
  let mesh = null, geos = null, mats = null, atlas = null;
  let S = null, TMP = null, wasVisible = null;
  let mode = 'shut'; // shut · lay · open · gather
  let frame0 = -1, hold = null, phase = null;
  let order = null, rank = null, place = null; // the order the cards leave in, and where each goes
  let hover = null, insert = null, said = new Set();

  const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
  const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3();

  const deckOf = () => cards()?.deck ?? null;
  const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const clamp01 = (u) => (u < 0 ? 0 : u > 1 ? 1 : u);
  const lerp = (a, b, u) => a + (b - a) * u;

  // ── what the lens frames on the cloth ────────────────────────────────────────────────────────
  // The four corners of the frame, unprojected onto the plane the cards lie in. This is measured
  // at the moment of the click, so a phone, a laptop and a window being dragged all get an
  // arrangement solved for the picture they are actually in.
  function window_() {
    const cam = ctx.camera;
    cam.updateMatrixWorld(true);
    let x = 0, z0 = Infinity, z1 = -Infinity;
    for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      _p.set(u, v, 0.5).unproject(cam);
      _v.copy(_p).sub(cam.position).normalize();
      if (Math.abs(_v.y) < 1e-6) return null;
      const t = (Y - cam.position.y) / _v.y;
      if (!(t > 0)) return null;
      const px = cam.position.x + _v.x * t, pz = cam.position.z + _v.z * t;
      x = Math.max(x, Math.abs(px));
      z0 = Math.min(z0, pz);
      z1 = Math.max(z1, pz);
    }
    const pad = 0.006;
    return { x: x - pad, z0: z0 + pad, z1: z1 - pad };
  }
  // the boxes a reading's cards already occupy: they stay exactly where they are, and nothing is
  // laid on them. Taken off the meshes themselves rather than off the layout's slots.
  function occupied() {
    const drawn = cards()?.drawn;
    if (!drawn) return [];
    const out = [];
    for (const m of drawn.children) {
      if (!m.visible) continue;
      const c = Math.abs(Math.cos(m.rotation.y)), s = Math.abs(Math.sin(m.rotation.y));
      const ex = (CARD.w * c + CARD.h * s) / 2 + 0.008, ez = (CARD.h * c + CARD.w * s) / 2 + 0.008;
      out.push({ x0: m.position.x - ex, x1: m.position.x + ex, z0: m.position.z - ez, z1: m.position.z + ez });
    }
    return out;
  }

  // ── the meshes: this piece's own seventy-eight, on one sheet ─────────────────────────────────
  function ensure() {
    if (mesh) return true;
    const deck = deckOf();
    if (!deck) return false;
    // the deck's own two paper materials, off one of its blocks: [0] is the drawn back — the
    // user's room-in-perspective plate — and [1] the stock a cut edge is made of. A card of ours
    // is that back with a face printed on the other side of it.
    const block = deck.children.find((c) => c.isMesh && c.name.startsWith('deck-block'));
    const back = Array.isArray(block?.material) ? block.material[0] : null;
    const edge = Array.isArray(block?.material) ? block.material[1] : back;
    // ONE SHEET FOR THE WHOLE DECK (tools/deck-atlas.mjs). Every card's front is a clone of the
    // same texture with its own cell on it, so there is one request and one upload to the GPU
    // rather than 44 MB of plates — BRIEF.md rule 4, kept.
    atlas = new THREE.TextureLoader().load(ATLAS.url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = Math.max(8, ctx.renderer?.capabilities?.getMaxAnisotropy?.() ?? 8);
      t.needsUpdate = true;
      for (const m of mats ?? []) {
        m.map.needsUpdate = true;
        m.needsUpdate = true;
      }
    });
    atlas.colorSpace = THREE.SRGBColorSpace;
    // three bent sheets, each its own hair's breadth, so a card lying on a card does not pass
    // through it (the same three reveal-pick.js builds its wash from)
    geos = [0, 1, 2].map((j) => {
      const r = mulberry32(6210 + j);
      return cardGeometry({ w: CARD.w, h: CARD.h, t: CARD.t, r: 0.005, nx: 6, ny: 10, arcN: 6, curl: 0.00012 + r() * 0.00008, curlX: 0.00003, twist: (r() - 0.5) * 0.0001 });
    });
    mats = [];
    mesh = [];
    for (let i = 0; i < N; i++) {
      const map = atlas.clone(); // the clone shares the image: one texture on the card
      map.colorSpace = THREE.SRGBColorSpace;
      map.repeat.set(1 / ATLAS.cols, 1 / ATLAS.rows);
      map.offset.set((i % ATLAS.cols) / ATLAS.cols, 1 - (Math.floor(i / ATLAS.cols) + 1) / ATLAS.rows);
      map.needsUpdate = true;
      const front = inkMaterial({ map, colorful: true, hatch: 0, lineWeight: 1 });
      mats.push(front);
      const m = new THREE.Mesh(geos[i % 3], [front, back ?? front, edge ?? front]);
      m.name = `deck-card-${i}`;
      m.userData.deckCard = i;
      m.userData.slug = DECK[i].slug;
      // NO CAST SHADOW, and it is the same call reveal makes about the cloth: a card's tone on the
      // table is DRAWN (reveal-ground.js), never a shadow map. Seventy-eight near-coplanar cards
      // an inch off the cloth under one key put three black hatched wedges across the plan view —
      // measured, in the first cut of the rake — and a soft blurry shadow is the one thing BRIEF.md
      // says the drawing may never have. They still receive.
      m.castShadow = false;
      m.receiveShadow = true;
      m.visible = false;
      group.add(m);
      mesh.push(m);
    }
    return true;
  }

  // the pile that shrinks as they leave and grows as they come home
  function stacks() {
    const deck = deckOf();
    if (!S && deck) {
      S = deckStacks(deck, CARD.t);
      if (S) TMP = S.stack('deck-pile');
    }
    return S;
  }
  const units = (n) => (S ? (n * S.nTotal) / N : n);
  // THE PILE SHRINKS WITH THEM, and that is the whole of how the lay-out's smaller card is paid
  // for on screen: the deck condenses as it deals itself out, so no two card sizes are ever in the
  // picture at once. It starts at the size the visitor clicked on and ends at nothing; the rake
  // runs the same numbers backwards and hands back a full-sized deck.
  function pile(left, ps = 1) {
    const s = stacks();
    if (!s || !TMP) return;
    if (wasVisible == null) wasVisible = s.real.map((m) => m.visible);
    s.showReal(false);
    const u = Math.round(units(left));
    if (u > 0) {
      s.cards(TMP, u, 0);
      s.flat(TMP, 0, 0, 0);
      TMP.scale.x = TMP.scale.z = ps;
    } else TMP.visible = false;
  }
  const pileScale = (goneOrBack) => lerp(1, plan ? plan.scale : 1, goneOrBack / N);
  // somebody else's temporary stack, up and drawing: the reading has taken the deck over
  function takenOver() {
    const deck = deckOf();
    return !!deck?.children.some((c) => c !== TMP && c.name.startsWith('tmp:') && c.visible);
  }
  function restore() {
    if (S) {
      if (TMP) S.dispose([TMP]);
      if (takenOver()) {
        // leave the visibility exactly as the piece that has the deck wants it
      } else if (wasVisible) S.real.forEach((m, i) => (m.visible = wasVisible[i] ?? true));
      else S.showReal(true);
    }
    S = null;
    TMP = null;
    wasVisible = null;
    if (mesh) for (const m of mesh) {
      m.visible = false;
      m.scale.setScalar(1);
    }
    group.visible = false;
    hover = null;
    insert = null;
    if (canvas && cursorMine) {
      canvas.style.cursor = '';
      cursorMine = false;
    }
    unname();
  }
  // THE PLACARD IS ONLY TAKEN DOWN IF THIS PIECE PUT IT UP. His last sentence may still be standing
  // when the visitor clicks the deck, and clearing the paper on the way out would wipe a line
  // nobody had finished reading.
  let named = false;
  function unname() {
    if (!named) return;
    named = false;
    ctx.pieces.dialogue?.clear?.();
  }

  // ── where a card is at second t ──────────────────────────────────────────────────────────────
  const deckPos = () => {
    const d = deckOf();
    return d ? [d.position.x, d.position.z, d.rotation.y] : [ctx.layout.deck.pos[0], ctx.layout.deck.pos[2], ctx.layout.deck.rotY];
  };
  const depart = (k) => (k / N) * (T.laid - FLY);
  const goHome = (k) => (k / N) * (GATHER.back - SLIDE);

  // the pose a card comes to rest in, in world metres
  function restOf(i) {
    const p = place[i];
    return { x: p.x, y: Y + CARD.t / 2 + p.rank * DEEP, z: p.z, yaw: p.yaw };
  }
  function liftedY() {
    return Y + CARD.t / 2 + N * DEEP + 0.004;
  }
  // the card under the pointer stands UP THE FRAME, never down (the user's rule), and rides clear
  // of everything it was lying under
  function applyRest(i, m, lift = 0) {
    const r = restOf(i);
    m.visible = true;
    m.scale.setScalar(plan.scale);
    m.position.set(r.x, lerp(r.y, liftedY(), lift), r.z - lift * plan.card.h * 0.42);
    m.quaternion.setFromAxisAngle(AY, r.yaw);
  }

  function poseLay(i, t, m) {
    const k = rank[i];
    const d = depart(k), r = restOf(i);
    const [dx, dz, dyaw] = deckPos();
    if (t < d) {
      m.visible = false;
      return;
    }
    m.visible = true;
    if (t >= d + FLY) {
      applyRest(i, m, hover === i ? 1 : 0);
      return;
    }
    // off the top of the pile, over the cloth, turning face up as it goes — and easing down to the
    // size the lay-out is drawn at, which is folded into the turn (see the note at the head)
    const u = ease(clamp01((t - d) / FLY));
    const y0 = Y + units(N - k) * CARD.t;
    // it keeps LOW — three centimetres at the top of its arc. A card thrown high over an overhead
    // plate drags a hatched shadow across the cloth the whole way, and seventy-eight of those at
    // once is a black cloud over the drawing.
    m.position.set(lerp(dx, r.x, u), lerp(y0, r.y, u) + 0.03 * Math.sin(Math.PI * u), lerp(dz, r.z, u));
    _q.setFromAxisAngle(AX, Math.PI * (1 - u));
    _q2.setFromAxisAngle(AY, lerp(dyaw, r.yaw, u));
    m.quaternion.copy(_q).multiply(_q2);
    // and the size goes with the TURN, early, not with the travel: it leaves at the size the pile
    // is at that moment and is the lay-out's size by the time its face has come round
    m.scale.setScalar(lerp(pileScale(k), plan.scale, ease(clamp01(u * 1.6))));
  }
  function poseHome(i, t, m) {
    const k = N - 1 - rank[i]; // the last card laid is the first one raked up
    const d = goHome(k), r = restOf(i);
    const [dx, dz, dyaw] = deckPos();
    if (t < d) {
      applyRest(i, m, 0);
      return;
    }
    if (t >= d + SLIDE) {
      m.visible = false;
      return;
    }
    const u = ease(clamp01((t - d) / SLIDE));
    const y1 = Y + Math.max(1, units(k + 1)) * CARD.t;
    m.visible = true;
    m.position.set(lerp(r.x, dx, u), lerp(r.y, y1, u) + 0.018 * Math.sin(Math.PI * u), lerp(r.z, dz, u));
    _q.setFromAxisAngle(AX, Math.PI * u);
    _q2.setFromAxisAngle(AY, lerp(r.yaw, dyaw, u));
    m.quaternion.copy(_q).multiply(_q2);
    m.scale.setScalar(lerp(plan.scale, pileScale(N - k - 1), ease(clamp01(u * 1.6))));
  }

  // ── the insert: a card brought to the lens ───────────────────────────────────────────────────
  // The camera does not move for it — the CARD comes forward, out of the rows and up onto the lens
  // axis at its full size, which is the reading's own insert done as a piece of business rather
  // than as a cut. It is also the answer to the small lay-out: this is where a card is read.
  const INSERT_FRAMES = 4;
  function insertPose(m, u) {
    const cam = ctx.camera;
    cam.updateMatrixWorld(true);
    const fov = (cam.fov * Math.PI) / 180;
    const tan = Math.tan(fov / 2);
    const d = Math.max(CARD.h / (0.76 * 2 * tan), CARD.w / (0.8 * 2 * tan * Math.max(0.2, cam.aspect)));
    const fwd = _v.set(0, 0, -1).applyQuaternion(cam.quaternion).normalize();
    const to = fwd.clone().multiplyScalar(d).add(cam.position);
    // the card's face to the lens, its printed top to the top of the frame
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion).normalize();
    const ey = fwd.clone().negate();
    const ez = up.clone().negate().addScaledVector(ey, -up.clone().negate().dot(ey)).normalize();
    const ex = new THREE.Vector3().crossVectors(ey, ez);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(ex, ey, ez));
    const from = insert.from;
    const e = ease(u);
    m.position.lerpVectors(from.p, to, e);
    m.quaternion.copy(from.q).slerp(q, e);
    m.scale.setScalar(lerp(plan.scale, 1, e));
    m.visible = true;
  }

  // ── the frame ────────────────────────────────────────────────────────────────────────────────
  const now = () => (hold != null ? hold : frame0 < 0 ? 0 : (ctx.clock.frame - frame0) / ctx.clock.fps);
  function say(next) {
    if (phase === next) return;
    phase = next;
    ctx.emit?.('props:deck', { phase: next });
  }
  const CUE_LAY = [[0.0, 'riffle', 1], [0.5, 'riffle', 0.8], [1.0, 'riffle', 0.65], [1.5, 'riffle', 0.5]];

  function step() {
    if (mode === 'shut') return;
    // THE FILM'S BUSINESS WINS. A visitor may ask for a reading while the deck is out, and the deck
    // cannot be in two places: the moment the room goes busy the rows go home at once and whatever
    // took the deck over is left holding it. The lay-out never blocks the evening.
    if (hold == null && (busyBeat() || takenOver())) {
      mode = 'shut';
      frame0 = -1;
      restore();
      say('shut');
      return;
    }
    // …and it does not wait to be told twice. The mind reports the visitor's intent before flow
    // touches the deck (flow.js: `api.intent = intent` and then `drawing()`), so the rake starts on
    // the intent and the snap above is only ever the backstop.
    if (hold == null && mode !== 'gather' && ctx.pieces.flow?.intent === 'draw') api.close();
    if (!mesh && !ensure()) return;
    const t = now();
    group.visible = true;

    if (mode === 'lay') {
      for (let i = 0; i < N; i++) poseLay(i, t, mesh[i]);
      pile(N - gone(t), pileScale(gone(t)));
      if (hold == null) {
        for (const [when, name, gain] of CUE_LAY) if (t + 1e-6 >= when && !said.has('l' + when)) {
          said.add('l' + when);
          sound()?.play?.(name, { gain });
        }
        // a small `deal` as each bow lands: the drawing on which the LAST of that bow's cards
        // touches the cloth, which is not the last to leave — they go furthest-first (see open())
        let base = 0;
        plan.bows.forEach((n, k) => {
          let last = 0;
          for (let i = base; i < base + n; i++) last = Math.max(last, rank[i]);
          base += n;
          if (t + 1e-6 >= depart(last) + FLY && !said.has('b' + k)) {
            said.add('b' + k);
            sound()?.play?.('deal', { gain: 0.5 });
          }
        });
      }
      say('laying');
      if (t >= T.laid) {
        mode = 'open';
        frame0 = ctx.clock.frame;
        hold = null;
        say('out');
      }
      return;
    }

    if (mode === 'open') {
      for (let i = 0; i < N; i++) if (i !== insert?.i) applyRest(i, mesh[i], hover === i ? 1 : 0);
      pile(0);
      if (insert) {
        const u = clamp01((ctx.clock.frame - insert.frame0) / INSERT_FRAMES);
        insertPose(mesh[insert.i], insert.back ? 1 - u : u);
        if (insert.back && u >= 1) {
          const i = insert.i;
          insert = null;
          applyRest(i, mesh[i], hover === i ? 1 : 0);
          say('out');
        } else if (!insert?.back) say('card');
      }
      return;
    }

    // gather
    for (let i = 0; i < N; i++) poseHome(i, t, mesh[i]);
    pile(back(t), pileScale(N - back(t)));
    if (hold == null) {
      if (t + 1e-6 >= 0.05 && !said.has('g0')) {
        said.add('g0');
        sound()?.play?.('rake');
      }
      if (t + 1e-6 >= GATHER.back && !said.has('g1')) {
        said.add('g1');
        sound()?.play?.('settle');
      }
    }
    say('gathering');
    if (t >= GATHER.done) {
      mode = 'shut';
      frame0 = -1;
      restore();
      ctx.pieces.camera?.cut?.('home');
      say('shut');
    }
  }
  const gone = (t) => {
    let n = 0;
    for (let k = 0; k < N; k++) if (t >= depart(k) + FLY * 0.25) n++;
    return n;
  };
  const back = (t) => {
    let n = 0;
    for (let k = 0; k < N; k++) if (t >= goHome(k) + SLIDE) n++;
    return n;
  };

  // ── when the room will have it ───────────────────────────────────────────────────────────────
  // The same test egg-konami.js makes, and for the same reason: a reading is the film's business.
  // flow's beat says whether one is running, the wash says whether the seventy-eight are already
  // out on the cloth, the house of cards says whether the deck is standing up somewhere, and the
  // deck's own blocks say whether there is a deck there to lay at all.
  const BUSY = new Set(['shuffle', 'fan', 'dealt', 'reading', 'recall', 'flip']);
  const busyBeat = () => BUSY.has(ctx.pieces.flow?.beat) || !!konami?.active;
  function idle() {
    if (mode !== 'shut') return false;
    if (busyBeat()) return false;
    const R = ctx.pieces.reveal;
    if (R && R.fanCount > 0) return false;
    const deck = deckOf();
    if (!deck) return false;
    const real = deck.children.filter((c) => c.isMesh && !c.name.startsWith('tmp:'));
    return real.length > 0 && real.some((m) => m.visible);
  }

  // ── the deck's own square on the glass ───────────────────────────────────────────────────────
  const MIN_TAP = 44;
  function hitBox() {
    const deck = deckOf();
    if (!deck) return null;
    deck.updateMatrixWorld(true);
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const xs = [], ys = [];
    const h = deck.userData.height ?? 0.04;
    for (const dx of [-CARD.w / 2, CARD.w / 2]) for (const dy of [0, h]) for (const dz of [-CARD.h / 2, CARD.h / 2]) {
      _p.set(dx, dy, dz);
      deck.localToWorld(_p).project(ctx.camera);
      xs.push(((_p.x + 1) / 2) * W);
      ys.push(((1 - _p.y) / 2) * H);
    }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  function tapBox() {
    const b = hitBox();
    if (!b) return null;
    const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
  }

  // ── the pointer, while the deck is out ───────────────────────────────────────────────────────
  // The arbiter (props.js → SWITCHES) owns the click that OPENS it: the deck is an object like the
  // cat and the radio, and the cursor over it is the whole affordance. Once it is out the cloth is
  // this piece's — the visitor is looking at seventy-eight cards, one of which is under the pointer
  // — so the hover and the tap are handled here, in the capture phase, and nothing else in the room
  // answers a click until the rows are home.
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let cursorMine = false;
  function cardAt(ev) {
    if (!canvas || !mesh) return null;
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, ctx.camera);
    const hit = ray.intersectObjects(group.children, false)[0];
    return hit ? (hit.object.userData.deckCard ?? null) : null;
  }
  function setHover(i) {
    if (hover === i) return;
    hover = i;
    if (!canvas) return;
    if (i != null) {
      canvas.style.cursor = 'pointer';
      cursorMine = true;
    } else if (cursorMine) {
      canvas.style.cursor = '';
      cursorMine = false;
    }
  }
  canvas?.addEventListener(
    'pointermove',
    (ev) => {
      if (mode !== 'open' || insert || ev.pointerType === 'touch') return;
      setHover(cardAt(ev));
    },
    true,
  );
  canvas?.addEventListener(
    'pointerdown',
    (ev) => {
      if (mode === 'shut') return;
      ev.stopPropagation();
      if (mode !== 'open') {
        if (mode === 'lay') api.close(); // a tap during the lay-out takes it back at once
        return;
      }
      if (insert) {
        api.hide();
        return;
      }
      const i = cardAt(ev);
      if (i == null) api.close();
      else api.show(DECK[i].slug);
    },
    true,
  );

  // ── the arrangement, solved for the picture that is actually up ──────────────────────────────
  // The plate is cut FIRST and the window measured off it, so the bows are laid inside what this
  // window's lens frames and not inside a number written down for some other window.
  function arrange() {
    ctx.pieces.camera?.cut?.('fan');
    const win = window_();
    if (!win) return false;
    const solved = layoutFor(win, occupied());
    if (!solved) return false;
    plan = solved;
    // the ranks: a card laid later lies over the one before it, so the bows shingle downstage and
    // each bow's cards shingle left to right
    plan.poses.forEach((p, i) => (p.rank = i));
    place = plan.poses;
    // WHO GOES FIRST. The deck's own order — the majors' arc first and the wands last, so the
    // display builds itself in the order it is read — EXCEPT for the handful whose place is the
    // square the pile is standing on: those wait until the pile has gone, so no card is ever laid
    // through it. (The deck stands at [0, 0.44] and the bows run straight over that ground.)
    const [dx, dz] = deckPos();
    const onPile = (p) => (Math.hypot(p.x - dx, p.z - dz) < 0.10 ? 1 : 0);
    order = plan.poses.map((p) => p.i).sort((a, b) => onPile(place[a]) - onPile(place[b]) || a - b);
    rank = [];
    order.forEach((i, k) => (rank[i] = k));
    return true;
  }

  // ── the api ──────────────────────────────────────────────────────────────────────────────────
  const api = {
    get out() {
      return mode !== 'shut';
    },
    get phase() {
      return phase;
    },
    get mode() {
      return mode;
    },
    get idle() {
      return idle();
    },
    get plan() {
      return plan;
    },
    get card() {
      return insert ? DECK[insert.i].slug : null;
    },
    get t() {
      return now();
    },
    hitBox,
    tapBox,
    // where the seventy-eight lie, in world metres, for a tool that wants to measure the lay-out
    get poses() {
      return plan ? plan.poses.map((p, i) => ({ i, slug: DECK[i].slug, ...p })) : null;
    },
    // THE LAY-OUT. Returns false when the room is busy or the arrangement will not solve.
    open() {
      if (!idle()) return false;
      if (!ensure() || !arrange()) return false;
      mode = 'lay';
      frame0 = ctx.clock.frame;
      hold = null;
      said.clear();
      hover = null;
      insert = null;
      group.visible = true;
      sound()?.start?.();
      step();
      return true;
    },
    // THE RAKE. The rows slide home in the order they were laid, in reverse.
    close() {
      if (mode === 'shut' || mode === 'gather') return false;
      if (insert) {
        mesh[insert.i] && applyRest(insert.i, mesh[insert.i], 0);
        insert = null;
        unname();
      }
      setHover(null);
      mode = 'gather';
      frame0 = ctx.clock.frame;
      hold = null;
      said.clear();
      step();
      return true;
    },
    // one card brought to the lens, with its name on the placard
    show(slug) {
      if (mode !== 'open') return false;
      const i = DECK.findIndex((c) => c.slug === slug);
      if (i < 0 || !mesh) return false;
      if (insert?.i === i && !insert.back) return true;
      setHover(null);
      const m = mesh[i];
      applyRest(i, m, 0);
      insert = { i, frame0: ctx.clock.frame, back: false, from: { p: m.position.clone(), q: m.quaternion.clone() } };
      sound()?.play?.('pick');
      // `false` for the position, not a number: this card was not drawn for anybody and the
      // placard's bottom register stays empty (dialogue.js → interLines)
      named = true;
      ctx.pieces.dialogue?.intertitle?.(slug, false, { hold: Infinity })?.catch?.(() => {});
      say('card');
      step();
      return true;
    },
    // …and put back where it was lying
    hide() {
      if (!insert || insert.back) return false;
      insert = { ...insert, frame0: ctx.clock.frame, back: true, from: insert.from };
      unname();
      sound()?.play?.('settle');
      step();
      return true;
    },
    // FOR A STILL: sit at one second of the lay-out and draw that instant now. `at(null)` lets go
    // and puts the room back — how `?deck=<t>` and the judging state take a frame of a thing that
    // is over in four seconds without racing it.
    at(t = null) {
      if (t == null || !Number.isFinite(+t)) {
        if (mode !== 'shut') {
          mode = 'shut';
          frame0 = -1;
          hold = null;
          restore();
          say('shut');
        }
        return null;
      }
      if (!ensure() || !arrange()) return null;
      hold = Math.max(0, +t);
      frame0 = -1;
      mode = hold >= T.laid ? 'open' : 'lay';
      group.visible = true;
      step();
      return hold;
    },
    // `deck-out` is the whole deck laid out on the cloth; every other name puts the deck back
    // exactly as it was.
    setState(name = 'default') {
      const m = /^deck-(out|laying|gather)$/.exec(name ?? '');
      if (!m) return api.at(null);
      if (m[1] === 'gather') {
        api.at(T.laid);
        api.close();
        hold = 0.9;
        frame0 = -1;
        step();
        return hold;
      }
      return api.at(m[1] === 'laying' ? 1.4 : T.laid);
    },
    update: step,
  };

  // ?deck=<t> holds a frame of the lay-out
  const asked = ctx.params?.get?.('deck');
  if (asked != null && asked !== '' && Number.isFinite(+asked)) queueMicrotask(() => api.at(+asked));

  // THE SWITCH. The deck is an object like the cat and the radio: nothing announces it, the cursor
  // over the stack is the whole affordance, and the arbiter decides between it and anything else
  // the pointer could have meant.
  switches?.add?.({
    name: 'deck',
    object: () => (mode === 'shut' ? deckOf() : group),
    tapBox: () => (mode === 'shut' ? tapBox() : null),
    enabled: () => (mode === 'shut' ? idle() : false), // once it is out, the capture listener has it
    // the sheet of 78 faces is fetched while the pointer is still on the stack, so the lay-out does
    // not start with a bow of blank cards on a cold cache
    onHover: (on) => {
      if (on) ensure();
    },
    onDown: () => api.open(),
  });

  return api;
}
