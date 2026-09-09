// PIECE: egg-konami — the house of cards. The room's seventh switch, and the only one that is not
// an object: there is nothing to click. The user's words, which are the spec: "↑↑↓↓←→←→BA on the
// keyboard: all 78 cards leap off the table and stack into a house of cards, hold a beat, and
// collapse back into the deck."
//
// WHAT HAPPENS, and it is eight seconds:
//   0.00  the code lands. The deck gives its cards up one after another — 78 of them in 0.85 s,
//         which is the riffle's own rate — and each one climbs off the pile and hangs in the air
//         over the cloth. The pile shrinks under them, card by card, until there is nothing on the
//         table at all. Three riffles, overlapping, are the sound of it.
//   1.05  they come down in the order a person builds in: the flat foundation first, then the
//         bottom storey's leaning pairs, the floor over them, the next storey, and so on to the
//         roof. A card lands every fiftieth of a second and the small snaps are the pairs meeting.
//   3.20  four storeys standing: 6, 5, 4 and 3 leaning pairs, 0.64 m across, 0.49 m tall, every
//         one of the seventy-eight in it and none of them anywhere near the reading row.
//   5.20  it goes, from the top down: the roof first, the foundation last, each card tumbling flat
//         onto the cloth where it falls. `settle` three times.
//   6.55  and then the cloth clears itself: the cards slide back into the deck's own square and
//         sink into the pile as it grows, until the deck is standing there exactly as it was.
//   7.85  over. The temporary stacks are disposed, the deck's own blocks are visible again, and
//         nothing this piece touched is left touched.
//
// WHY THEY ALL GO UP BEFORE ANY OF THEM COMES DOWN, which is the one structural decision here. The
// deck stands at [0, 0.44] on the cloth and the house's foundation is laid across that very square:
// a card cannot be laid flat where the pile still is. So the leap is a real leap — every card is
// off the table by t = 0.85 and the first one is not laid until t = 1.55 — and the house is built
// on bare cloth. It is also the better piece of business: seventy-eight cards hanging in the air
// over the table for half a second is the beat the trick is bought with.
//
// WHERE IT MAY STAND. The near half of the cloth, which is the only clear ground there is: the
// still life is all at z ≤ -0.05 and the three reading slots are a bar across |x| ≤ 0.29, z ≤ 0.256
// (reveal-wash.js, whose measurements these are). The house is centred at z = 0.378, its nearest
// card edge at z = 0.263 and its furthest corner at r = 0.597 — inside the 0.60 the wash keeps to,
// which is itself inside the table's 0.62 rim. So if three cards are lying face up from a reading
// they are not touched, not covered and not passed through; only the deck plays.
//
// NOTHING HERE MOVES SMOOTHLY, and nothing here accumulates. Every card's pose is a closed-form
// function of the one number `t`, which only ever changes on the 12 fps step — so a frozen frame
// draws the same house every time it is asked for, `?konami=<t>` is a still of any instant of it,
// and the sequence cannot drift out of true however long the page has been open.
//
// AND THE DECK IS GIVEN BACK EXACTLY. The cards that fly are this piece's own meshes on the deck's
// own materials (the same borrowing reveal-pick.js does for the wash); the pile that shrinks and
// grows is a temporary stack of the deck's own blocks (reveal-shuffle.js → deckStacks), disposed at
// the end; and the deck's real blocks are only ever hidden and shown, with their visibility
// recorded before and put back after. tools/_egg-konami-proof.mjs compares every mesh, position,
// quaternion, scale and material of the deck before and after and requires them identical.
import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';
import { cardGeometry } from './cards-geometry.js';
import { deckStacks } from './reveal-shuffle.js';

// ── the shape of the eight seconds ────────────────────────────────────────────────────────────
export const T = {
  leap: 0.0, // the first card leaves the deck
  bare: 0.85, // …and the last one does: the table is empty
  lay: 1.05, // the first card starts down onto the cloth
  built: 3.2, // the house is standing
  fall: 5.2, // …and it is not, from the roof down
  slide: 6.55, // the cards on the cloth start back to the deck's square
  done: 7.85, // everything as it was
};
const RISE = 0.5; // a card's climb off the deck
const DROP = 0.55; // …and its descent into its place in the house
const TUMBLE = 0.6; // a storey's fall to the cloth
const SLIDE = 0.45; // a card's slide back into the square
const N = 78;

// ── the house ─────────────────────────────────────────────────────────────────────────────────
// A card standing on its long edge is 0.2275 m of bottom edge and 0.13 m of height; leaned 22° off
// vertical it is 0.0487 m out at the foot and 0.1205 m tall, and two of them nose to nose make an
// A-frame whose ridge runs upstage-downstage. Six of those across the cloth is 0.644 m — as wide as
// this table will take — and four storeys of 6, 5, 4 and 3 pairs is 0.489 m tall.
//
// THE COUNT IS NOT A COINCIDENCE AND IT IS NOT PADDED. 36 cards stand in pairs; 36 are laid flat as
// floors, two courses to a floor, which is what a hand does when it wants the next storey level;
// and the last 6 are the foundation the whole thing is built on, because a card house on cloth is
// built on a platform of cards. 36 + 36 + 6 = 78. The deck is the house and the house is the deck.
const CARD = { w: 0.13, h: 0.2275, t: 0.0008 };
const THETA = (22 * Math.PI) / 180; // the lean, off vertical
const FOOT = CARD.w * Math.sin(THETA); // 0.0487: how far out a card's foot stands from its apex
const RIDGE = CARD.w * Math.cos(THETA); // 0.1205: the height of a storey's ridge
const PITCH = 2 * FOOT + 0.012; // 0.1094: A-frame to A-frame, twelve millimetres of daylight
const PAIRS = [6, 5, 4, 3];
// The ridge line, upstage-downstage. It was at 0.378 until the three-cards-down case was measured
// rather than assumed: with a reading on the table the row's furthest card edge is at z 0.262 and
// the house's nearest foundation card was at 0.261 — a millimetre of overlap between two things
// both lying flat on the same cloth. Eight millimetres upstage puts 6 mm of bare cloth between
// them, and the floors' second course was pulled in to match so the far corner stays inside 0.60.
const ZC = 0.386;
const spanOf = (p) => (p - 1) * PITCH + 2 * FOOT;

// One pose: where a card is, and how it is turned. `kind` is what it is doing there.
//   flat  the foundation, face down on the cloth
//   lean  one half of an A-frame; `side` is which foot it stands on
//   floor a card laid across the ridges, long edge across the picture
// `tilt` is the rotation about z that stands it up, `yaw` the rotation about y that turns a flat
// card, and `flip` whether the drawn back is the face that looks outward. Every number is fixed:
// the jitter is seeded, so the house is the same house every time it is built.
export function housePoses(seed = 7811) {
  const rng = mulberry32(seed);
  const out = [];
  const T0 = CARD.t;
  // the foundation: two rows of three, shingled, laid over the deck's own square
  for (let iz = 0; iz < 2; iz++)
    for (let ix = 0; ix < 3; ix++)
      out.push({
        kind: 'flat',
        storey: -1,
        x: (ix - 1) * 0.2 + (rng() - 0.5) * 0.006,
        y: T0 / 2,
        z: ZC + (iz - 0.5) * 0.1 + (rng() - 0.5) * 0.006,
        yaw: Math.PI / 2 + (rng() - 0.5) * 0.06,
        tilt: 0,
        flip: true,
      });
  let base = T0;
  for (let s = 0; s < PAIRS.length; s++) {
    const p = PAIRS[s];
    for (let k = 0; k < p; k++) {
      const c = (k - (p - 1) / 2) * PITCH;
      for (const side of [-1, 1])
        out.push({
          kind: 'lean',
          storey: s,
          side,
          x: c + (side * FOOT) / 2 + (rng() - 0.5) * 0.002,
          y: base + RIDGE / 2,
          z: ZC + (rng() - 0.5) * 0.004,
          // the two halves splay a degree or so, the way a pair actually stands
          yaw: side * (0.012 + rng() * 0.014),
          tilt: side < 0 ? Math.PI / 2 - THETA : Math.PI / 2 + THETA,
          flip: side < 0,
        });
    }
    const top = base + RIDGE;
    const span = spanOf(PAIRS[s + 1] ?? p); // the floor is as wide as what stands on it
    const nx = Math.max(1, Math.ceil(span / (CARD.h * 0.9)));
    const courses = s + 1 < PAIRS.length ? 2 : 1; // the roof is one course; a floor is two
    const px = span / nx;
    for (let c2 = 0; c2 < courses; c2++)
      for (let iz = 0; iz < 2; iz++)
        for (let ix = 0; ix < nx; ix++)
          out.push({
            kind: 'floor',
            storey: s,
            x: (ix - (nx - 1) / 2) * px + (c2 ? px * 0.12 : 0) + (rng() - 0.5) * 0.004,
            y: top + T0 / 2 + c2 * T0,
            z: ZC + (iz - 0.5) * 0.1 + (c2 ? 0.008 : 0) + (rng() - 0.5) * 0.004,
            yaw: Math.PI / 2 + (rng() - 0.5) * 0.05,
            tilt: 0,
            flip: true,
          });
    base = top + 2 * T0;
  }
  return out;
}
// The box the finished house occupies on the cloth, measured off the poses themselves with each
// card's real extent at its real angle — not the nominal span, which is 4 mm narrower than the
// floors that overhang it. `r` is the furthest a corner gets from the table's middle: the rim is at
// 0.62 and the wash keeps inside 0.60. `near` is the near edge, which has to clear the reading row.
export const HOUSE = (() => {
  const p = housePoses();
  let top = 0, x = 0, near = 9, far = -9, r = 0;
  for (const o of p) {
    const ex = o.kind === 'lean' ? FOOT / 2 + 0.001 : CARD.h / 2;
    const ez = o.kind === 'lean' ? CARD.h / 2 : CARD.w / 2;
    top = Math.max(top, o.y + (o.kind === 'lean' ? RIDGE / 2 : CARD.t / 2));
    x = Math.max(x, Math.abs(o.x) + ex);
    near = Math.min(near, o.z - ez);
    far = Math.max(far, o.z + ez);
    r = Math.max(r, Math.hypot(Math.abs(o.x) + ex, Math.abs(o.z) + ez));
  }
  return { cards: p.length, storeys: PAIRS.length, pairs: PAIRS.slice(), w: 2 * x, h: top, near, far, r };
})();

// ── the egg ───────────────────────────────────────────────────────────────────────────────────
export function buildKonami(ctx) {
  const Y = ctx.layout.spread.y; // the plane a card lies in on the cloth
  const DECK = ctx.layout.deck.pos;
  const cards = () => ctx.pieces.cards; // built after props: never cached at build time
  const sound = () => ctx.pieces.sound;

  const group = new THREE.Group();
  group.name = 'konami';
  group.visible = false;
  ctx.scene.add(group);

  const poses = housePoses();
  const rng = mulberry32(4111);
  // where each card hangs while the table empties: a loose column over the cloth, no two at the
  // same height, turned every way. The golden angle keeps them from stacking into rows.
  // …and it stops below his chin. The column is over the near half of the cloth and its highest
  // card is at 0.47 m off the table, which is 1.23 m in the room: on the `home` plate — the shot
  // the whole conversation is played on — that is the line his jaw sits on, so seventy-eight cards
  // in the air pass in FRONT of him and never across his face. Measured on the plate, not guessed.
  const ALOFT = poses.map((_, i) => {
    const a = i * 2.399963;
    const rad = 0.075 + (0.155 * ((i * 7) % 13)) / 13;
    return {
      x: Math.cos(a) * rad,
      y: 0.11 + 0.36 * (i / N) + 0.025 * Math.sin(i * 1.7),
      z: ZC + 0.042 + Math.sin(a) * rad * 0.5,
      e: new THREE.Euler(rng.range(-1.2, 1.2), rng.range(-Math.PI, Math.PI), rng.range(-1.2, 1.2)),
    };
  });
  // …and where each one lands when its storey goes: flat on the cloth in a heap 78 ranks deep and
  // 16 mm proud (the wash's own DEEP), every corner of it clear of the three reading slots and
  // inside the rim. Those two limits are reveal-wash.js's own — a card may not LIE in the bar at
  // |x| ≤ 0.29, z ≤ 0.256, and no corner may pass r = 0.60 — and they are applied here to the
  // card's real box at its real angle, so a card pointing up the frame is given less room than one
  // lying across it, which is the only honest way to do it.
  const SCATTER = poses.map((_, i) => {
    const yaw = rng.range(-Math.PI, Math.PI);
    const s = Math.abs(Math.sin(yaw)), c = Math.abs(Math.cos(yaw));
    const ex = (CARD.h * s + CARD.w * c) / 2, ez = (CARD.h * c + CARD.w * s) / 2;
    const xr = Math.max(0.01, 0.345 - ex);
    let x = rng.range(-xr, xr);
    const zlo = 0.262 + ez;
    const rim = (xx) => Math.sqrt(Math.max(0, 0.585 * 0.585 - (Math.abs(xx) + ex) * (Math.abs(xx) + ex)));
    let zhi = Math.min(0.552, rim(x)) - ez;
    if (zhi < zlo) {
      // the corner it would put past the rim decides how far across it may lie instead
      const room = Math.sqrt(Math.max(0, 0.585 * 0.585 - (zlo + ez) * (zlo + ez))) - ex;
      x = Math.sign(x) * Math.max(0, Math.min(Math.abs(x), room));
      zhi = zlo;
    }
    return { x, z: rng.range(zlo, Math.max(zlo, zhi)), yaw, rank: i / N };
  });
  const ORDER = mulberry32(613).shuffle(poses.map((_, i) => i)); // who goes home first
  const HOME_RANK = [];
  ORDER.forEach((i, k) => (HOME_RANK[i] = k));

  // ── the meshes: this piece's own seventy-eight, on the deck's materials ──────────────────────
  let mesh = null, geos = null, S = null, TMP = null, wasVisible = null;
  const qFlat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
  const AXIS_Y = new THREE.Vector3(0, 1, 0), AXIS_Z = new THREE.Vector3(0, 0, 1);
  const QH = []; // the house's quaternions
  const QA = []; // …aloft
  const QS = []; // …and flat on the cloth after the fall

  function deckOf() {
    return cards()?.deck ?? null;
  }
  function ensure() {
    if (mesh) return true;
    const deck = deckOf();
    if (!deck) return false;
    const top = deck.getObjectByName('deck-top');
    const block = deck.children.find((c) => c.isMesh && c.name.startsWith('deck-block'));
    const mats = Array.isArray(top?.material)
      ? top.material
      : block && Array.isArray(block.material)
        ? [block.material[1], block.material[0], block.material[1]]
        : new THREE.MeshLambertMaterial({ color: '#efe8d7' });
    // three sheets, each bent its own hair's-breadth, so a card leaning on a card does not pass
    // through it (the same three reveal-pick.js builds its wash from)
    geos = [0, 1, 2].map((j) => {
      const r = mulberry32(5410 + j);
      return cardGeometry({ w: CARD.w, h: CARD.h, t: CARD.t, r: 0.005, nx: 6, ny: 10, arcN: 6, curl: 0.00012 + r() * 0.00008, curlX: 0.00003, twist: (r() - 0.5) * 0.0001 });
    });
    mesh = poses.map((p, i) => {
      const m = new THREE.Mesh(geos[i % 3], mats);
      m.name = `konami-card-${i}`;
      m.castShadow = true;
      m.receiveShadow = true;
      m.visible = false;
      group.add(m);
      QH[i] = new THREE.Quaternion()
        .setFromAxisAngle(AXIS_Y, p.yaw)
        .multiply(new THREE.Quaternion().setFromAxisAngle(AXIS_Z, p.tilt))
        .multiply(p.flip ? qFlat : new THREE.Quaternion());
      QA[i] = new THREE.Quaternion().setFromEuler(ALOFT[i].e);
      QS[i] = new THREE.Quaternion().setFromAxisAngle(AXIS_Y, SCATTER[i].yaw).multiply(qFlat);
      return m;
    });
    return true;
  }
  // the pile that shrinks as they leave and grows as they come home: a temporary stack of the
  // deck's own blocks, exactly as the wash and the gather use (reveal-shuffle.js → deckStacks)
  function stacks() {
    const deck = deckOf();
    if (!S && deck) {
      S = deckStacks(deck, CARD.t);
      if (S) TMP = S.stack('konami-pile');
    }
    return S;
  }
  const units = (n) => (S ? (n * S.nTotal) / N : n);
  function pile(left) {
    const s = stacks();
    if (!s || !TMP) return;
    if (wasVisible == null) wasVisible = s.real.map((m) => m.visible);
    s.showReal(false);
    const u = Math.round(units(left));
    if (u > 0) {
      // the stack is a child of the deck's own group, so this is the deck's own origin
      s.cards(TMP, u, 0);
      s.flat(TMP, 0, 0, 0);
    } else TMP.visible = false;
  }
  // Somebody else's temporary stack, up and drawing: the reading has taken the deck over while
  // this was running (reveal-shuffle.js/reveal-pick.js name theirs 'tmp:' too). It is their deck
  // for as long as that is true.
  function takenOver() {
    const deck = deckOf();
    return !!deck?.children.some((c) => c !== TMP && c.name.startsWith('tmp:') && c.visible);
  }
  // …and the deck put back exactly as it was found
  function restore() {
    if (S) {
      if (TMP) S.dispose([TMP]);
      // …unless the reading has it: then the blocks are hidden because THEY hid them, and putting
      // them back would stand a squared deck in the middle of somebody's smoosh
      if (takenOver()) {
        // leave the visibility exactly as the other piece wants it
      } else if (wasVisible) S.real.forEach((m, i) => (m.visible = wasVisible[i] ?? true));
      else S.showReal(true);
    }
    S = null;
    TMP = null;
    wasVisible = null;
    if (mesh) for (const m of mesh) m.visible = false;
    group.visible = false;
  }

  // ── where a card is at second t ───────────────────────────────────────────────────────────────
  const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const clamp01 = (u) => (u < 0 ? 0 : u > 1 ? 1 : u);
  const depart = (i) => T.leap + (i / N) * T.bare;
  const drop = (i) => T.lay + (i / N) * (T.built - DROP - T.lay);
  const topple = (i) => T.fall + ((N - 1 - i) / N) * 0.7; // the roof first, the foundation last
  const home = (i) => T.slide + (HOME_RANK[i] / N) * 0.8;

  const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _spin = new THREE.Quaternion(), _ax = new THREE.Vector3();
  function poseAt(i, t, m) {
    const p = poses[i], a = ALOFT[i], sc = SCATTER[i];
    const d = depart(i), dr = drop(i), tp = topple(i), hm = home(i);
    const deckY = Y + 0.02; // a card comes off the top of the pile, not off the cloth
    if (t < d) {
      m.visible = false;
      return;
    }
    m.visible = true;
    if (t < d + RISE) {
      // the climb: an arc off the pile with a half-turn in it
      const u = ease((t - d) / RISE);
      _p.set(DECK[0] + (a.x - DECK[0]) * u, deckY + (Y + a.y - deckY) * u + 0.06 * Math.sin(Math.PI * u), DECK[2] + (a.z - DECK[2]) * u);
      _q.copy(qFlat).slerp(QA[i], u);
    } else if (t < dr) {
      // hanging over the cloth, turning slowly. The turn is a function of t and of nothing else.
      _p.set(a.x, Y + a.y, a.z);
      _spin.setFromAxisAngle(AXIS_Y, 0.9 * (t - d - RISE));
      _q.copy(_spin).multiply(QA[i]);
    } else if (t < dr + DROP) {
      // down into its place, the last third of the way straight and slow: a card is LAID
      const u = ease(clamp01((t - dr) / DROP));
      _spin.setFromAxisAngle(AXIS_Y, 0.9 * (dr - d - RISE));
      _q.copy(_spin).multiply(QA[i]).slerp(QH[i], u);
      _p.set(a.x + (p.x - a.x) * u, Y + a.y + (p.y - a.y) * u, a.z + (p.z - a.z) * u);
    } else if (t < tp) {
      // standing
      _p.set(p.x, Y + p.y, p.z);
      _q.copy(QH[i]);
    } else if (t < tp + TUMBLE) {
      // the fall: gravity's own curve, a tumble about the way it topples, flat when it lands
      const u = clamp01((t - tp) / TUMBLE);
      const g = u * u;
      const yEnd = Y + CARD.t / 2 + sc.rank * 0.016;
      _p.set(p.x + (sc.x - p.x) * ease(u), Y + p.y + (yEnd - Y - p.y) * g, p.z + (sc.z - p.z) * ease(u));
      _ax.set(Math.cos(i * 1.31), 0.25, Math.sin(i * 1.31)).normalize();
      _spin.setFromAxisAngle(_ax, Math.sin(Math.PI * u) * (1.4 + (i % 5) * 0.4));
      _q.copy(QH[i]).slerp(QS[i], ease(u)).premultiply(_spin);
    } else if (t < hm) {
      _p.set(sc.x, Y + CARD.t / 2 + sc.rank * 0.016, sc.z);
      _q.copy(QS[i]);
    } else if (t < hm + SLIDE) {
      // home: it slides across the cloth and up onto the pile that is building itself
      const u = ease(clamp01((t - hm) / SLIDE));
      const yEnd = Y + Math.max(1, units(HOME_RANK[i])) * CARD.t;
      _p.set(sc.x + (DECK[0] - sc.x) * u, Y + CARD.t / 2 + sc.rank * 0.016 * (1 - u) + (yEnd - Y) * u, sc.z + (DECK[2] - sc.z) * u);
      _q.copy(QS[i]).slerp(_spin.setFromAxisAngle(AXIS_Y, ctx.layout.deck.rotY).multiply(qFlat), u);
    } else {
      m.visible = false; // it is in the pile now, and the pile is drawn
      return;
    }
    m.position.copy(_p);
    m.quaternion.copy(_q);
  }

  // how many cards are off the table at t, and how many have come home
  const gone = (t) => {
    let n = 0;
    for (let i = 0; i < N; i++) if (t >= depart(i)) n++;
    return n;
  };
  const back = (t) => {
    let n = 0;
    for (let i = 0; i < N; i++) if (t >= home(i) + SLIDE) n++;
    return n;
  };

  // ── the cues ─────────────────────────────────────────────────────────────────────────────────
  // The riffle as they leap, small snaps as the pairs lean, settle on the collapse. Each is fired
  // once, on the 12 fps step it falls on, and never while a still is being held.
  const CUES = [
    [0.0, 'riffle', 1], [0.34, 'riffle', 0.85], [0.66, 'riffle', 0.7],
    ...Array.from({ length: 10 }, (_, k) => [1.62 + k * 0.15, 'snap', 0.34]),
    [T.fall, 'settle', 0.9], [T.fall + 0.55, 'settle', 0.75], [T.fall + 1.05, 'settle', 0.6],
    [T.slide + 0.9, 'settle', 0.5],
  ];

  // ── the sequence ─────────────────────────────────────────────────────────────────────────────
  let frame0 = -1; // the 12 fps frame the code completed on
  let hold = null; // ?konami=<t> / the judging state: sit at one instant
  let phase = null;
  const fired = new Set();

  const asked = ctx.params?.get?.('konami');
  if (asked != null && asked !== '' && Number.isFinite(+asked)) hold = Math.max(0, +asked);

  // WHEN THE ROOM IS BUSY THE CODE DOES NOTHING, and this is the whole of that test. A reading is
  // the film's business: flow's beat says whether one is running, the wash says whether the
  // seventy-eight are already out on the cloth, and the deck's own blocks say whether the deck is
  // even there to leap (reveal hides them from the smoosh until the gather squares them again).
  const BUSY = new Set(['shuffle', 'fan', 'dealt', 'reading', 'recall']);
  function idle() {
    if (api.active) return false;
    const beat = ctx.pieces.flow?.beat;
    if (beat && BUSY.has(beat)) return false;
    const R = ctx.pieces.reveal;
    if (R && R.fanCount > 0) return false;
    const deck = deckOf();
    if (!deck) return false;
    const real = deck.children.filter((c) => c.isMesh && !c.name.startsWith('tmp:'));
    return real.length > 0 && real.some((m) => m.visible);
  }

  const api = {
    get t() {
      if (hold != null) return hold;
      if (frame0 < 0) return 0;
      return (ctx.clock.frame - frame0) / ctx.clock.fps;
    },
    get active() {
      const t = api.t;
      return t >= 0 && t < T.done && (hold != null || frame0 >= 0);
    },
    get idle() {
      return idle();
    },
    get code() {
      return SEQ.join(' ');
    },
    // the whole house, in world metres, for a tool that wants to measure it
    get bounds() {
      return { ...HOUSE, z: [HOUSE.near, HOUSE.far] };
    },
    start() {
      if (!idle()) return false;
      if (!ensure()) return false;
      hold = null;
      frame0 = ctx.clock.frame;
      phase = null;
      fired.clear();
      group.visible = true;
      sound()?.start?.();
      step(ctx); // the first drawing lands on the frame the code completed on, not the one after
      return true;
    },
    // FOR A STILL: sit at one second of the eight, and draw that instant now. `at(null)` lets go
    // and puts the room back. It is how a tool takes a frame of a thing that is over in eight
    // seconds without racing it, and it is what `?konami=<t>` and the judging states use.
    at(t = null) {
      if (t == null || !Number.isFinite(+t)) {
        if (hold != null || frame0 >= 0) {
          hold = null;
          frame0 = -1;
          restore();
          phase = null;
        }
        return null;
      }
      if (!ensure()) return null;
      hold = Math.max(0, +t);
      frame0 = -1;
      group.visible = true;
      step(ctx);
      return hold;
    },
    // the judging states: `konami-house` is the house standing, and the rest are the beats of it
    setState(name = 'default') {
      const m = /^konami(?:-(house|leap|aloft|lay|collapse|home))?$/.exec(name ?? '');
      if (!m) return api.at(null);
      return api.at({ house: 4.2, leap: 0.45, aloft: 0.95, lay: 2.2, collapse: 5.75, home: 7.0 }[m[1] ?? 'house']);
    },
    update: step,
  };

  // ── the frame ────────────────────────────────────────────────────────────────────────────────
  // Called from props.update, which is already inside `if (ctx.clock.stepped)`: every number below
  // is recomputed on the twelfth and held between them.
  function step() {
    if (!api.active) {
      if (frame0 >= 0 || hold != null) {
        const was = frame0 >= 0;
        frame0 = -1;
        hold = null;
        restore();
        if (was) say('done');
        phase = null;
      }
      return;
    }
    // THE FILM'S BUSINESS WINS. The code is refused while a reading is running, but a visitor may
    // type it and then ask for cards two seconds later, and the deck cannot be in two places. If
    // the room goes busy mid-run the house stops existing at once: the cards go, the pile goes,
    // and whatever took the deck over is left holding it.
    if (hold == null && (BUSY.has(ctx.pieces.flow?.beat) || takenOver())) {
      frame0 = -1;
      restore();
      say('done');
      phase = null;
      return;
    }
    if (!mesh && !ensure()) return;
    const t = api.t;
    group.visible = true;
    for (let i = 0; i < N; i++) poseAt(i, t, mesh[i]);
    // the pile: what is left of the deck on the way out, what has come back on the way home
    if (t < T.fall) pile(N - gone(t));
    else pile(back(t));

    if (hold == null) for (const [when, name, gain] of CUES) {
      if (t + 1e-6 < when || fired.has(when)) continue;
      fired.add(when);
      sound()?.play?.(name, { gain });
    }

    if (t >= T.slide) say('home');
    else if (t >= T.fall) say('collapse');
    else if (t >= T.built) say('house');
    else if (t >= T.lay) say('stack');
    else say('leap');
  }
  function say(next) {
    if (phase === next) return;
    phase = next;
    ctx.emit?.('props:konami', { phase: next, t: api.t });
  }

  // ── the code ─────────────────────────────────────────────────────────────────────────────────
  // On the WINDOW, in the CAPTURE phase, and it never calls preventDefault or stopPropagation: the
  // visitor's field is open for most of the evening and an arrow key belongs to the caret and a
  // letter belongs to the line they are typing. This listener watches the keys go past; it does not
  // take them. A held key repeats and is ignored outright, so leaning on ↑ neither advances the
  // code nor breaks it. Six seconds from the first key to the last, and a wrong key starts the
  // match again at this key — so ↑↑↑↓↓←→←→BA still opens it.
  const SEQ = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  const WINDOW_MS = 6000;
  let at = 0, first = 0;
  function onKey(ev) {
    if (ev.repeat || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const k = (ev.key ?? '').toLowerCase();
    if (!SEQ.includes(k)) {
      at = 0;
      return;
    }
    const now = ev.timeStamp || performance.now();
    if (at > 0 && now - first > WINDOW_MS) at = 0;
    if (k !== SEQ[at]) at = 0;
    if (k !== SEQ[at]) return; // wrong, and not the first key either
    if (at === 0) first = now;
    at++;
    if (at < SEQ.length) return;
    at = 0;
    api.start();
  }
  window.addEventListener('keydown', onKey, true);

  return api;
}
