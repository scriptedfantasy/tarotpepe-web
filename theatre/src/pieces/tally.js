// PIECE: tally — the visitors, counted on the wall. Every visitor who comes through the door adds
// one scratch to the bare plaster of the chimney breast, over the mantel: gates of five — four
// strokes and a fifth struck across them — in rows, each group a little crooked and slanted, the
// way a prisoner keeps count on a cell wall. The owner approved it from a mockup, as "Chimney
// breast, above the mantel", at 137 marks and at 600.
//
// WHERE. The breast's face is x −2.36 (room.js publishes it as `fireplace.face`), z −0.60 .. 0.50,
// and the plaster over the mantel is bare from the shelf's top at 1.26 to the picture rail at 2.60 —
// the half metre of paper room.js keeps empty on purpose ("the plaster over this shelf is where that
// area went"), and camera-shots.js frames the `fireplace` shot to keep it so. The patch is the
// mockup's: z +0.42 → −0.52 (reading left to right as the wall is faced), y 2.40 → 1.35. That leaves
// 80 mm of plaster to either return, 90 mm over the shelf and 200 under the rail, so no line the set
// already draws comes near a mark.
//
// HOW IT IS ON THE WALL. A sheet 3 mm proud of the plaster, one quad, with the marks drawn into a
// canvas that is its map. Four things make the ink pass take it for the wall and not for a thing
// hung on it:
//   · `lineWeight: 0`. The pass draws a contour wherever two OBJECTS meet, and the weight at a
//     boundary is the nearer one's (ink-shaders.js, EDGE_FRAG) — so 0 on the nearer one means no
//     rectangle is ruled round the sheet. room.js's ghost was built the same way for the same reason.
//   · `colorful`, the way the cross's sheets and the fire's are (egg-cross.js, egg-fine.js): the pass
//     lays the drawing down as drawn and then states its dark marks again at full ink with the room's
//     own shoulder. Taken as a plain white surface instead, the pass decides every pixel of a mark
//     against the lightest thing within a nib of it, and four strokes 1.3 px apart came out as a
//     bundle of grit with the stroke across them lost in it — measured beside the mockup, nothing
//     like the scratches the owner approved.
//   · THE PAPER IS THE PASS'S OWN. A colourful surface shows its albedo where there is no mark, so the
//     canvas is PAPER on a white material, which is exactly the sheet the pass lays under everything
//     else; the hatch is read off the side wall's own material, and the mesh stands at the world
//     origin with its geometry in world metres, as the room's merged meshes do, so the pass measures
//     the same distance for both and any tone lands on the same octave of its world-anchored grid.
//     Measured against a frame with no marks: not one pixel of the sheet's empty paper differs.
//   · the room's WARP. The breast's face is pushed up to 9 mm off its plane by room-build's field
//     (every wall in the set bends a little), which is three times the sheet's gap; a flat sheet
//     would be under the plaster in places. So the sheet goes through the same field (room.js now
//     publishes it) and stays 3 mm proud everywhere.
// The sheet stops 30 mm outside the marks and 50 mm short of the breast's returns: where it met a
// crease the pass would give that crease this sheet's zero weight.
//
// HOW THE MARKS ARE DRAWN. They are the mockup's marks: tally.mjs's generator (the gates, the rows,
// the slant and the crookedness, its sizes and its seed) and its ribbons (a tapered, wobbling
// polygon; now and then a skip where the point jumped; now and then a hairline beside it, the second
// edge of a gouge), unchanged. The mockup drew them in SCREEN space at the home plate, 1.2 px wide;
// here they are drawn in that same screen space and then laid onto the wall, which is the right way
// to keep the look: the breast is seen at a steep rake from every seat a visitor has (home 90 px to
// the metre across the wall and 249 up it at 1280x800; the phone turned left 87 and 254; wide 72 and
// 201), so a stroke of one width in metres would come out three times as heavy standing as lying
// down. Drawn in the screen space of that rake, a standing stroke and a lying one are the same width
// on the glass from the seats the room is watched from. The pass then states each one at full ink
// (see `colorful` above), which is what makes them the room's pen rather than the mockup's grey:
// at the mockup's 1.2 px they came out heavier than it, so the nib here is 1.0 and the result sits
// on the mockup's weight in black.
// …AND A SECOND HAND FOR THE ONE SHOT THAT FACES THE WALL. The visitor can walk to the fireplace
// ("the user should be able to walk in front of the fireplace and watch the fire"), and the
// `fireplace` shot looks straight at the breast: 405 px to the metre both ways. The raked hand seen
// square on is four and a half times too wide across, and 600 marks came out as rows of fat black
// crescents with the strikes running on from gate to gate. So when the picture has come to rest on a
// view of the wall that is nearly square (across/up at the patch's middle over 0.6; every seat is
// 0.36 and that shot is 1.0), the same marks — same places, same seeds — are drawn again in a square
// hand, and in the raked one again when it leaves. Two redraws a visit to the fireplace, never
// during a move.
// They do not boil. The pass's boil is the sheet shifting under the hand, and it moves contours, not
// the drawings on surfaces: the sign, the cross, the enamel plate and this are all drawn once.
//
// HOW MANY. Up to 245 marks at the size the owner saw 137 at; from there to 600 the rows close up
// and the marks shrink to the size the owner saw 600 at; past 600 they go on shrinking, rows
// tightening, like a wall running out; at 1980 the wall is full at the tightest size and every
// later visitor is scratched over the last mark. One canvas, 512 x 1024, whatever the count; it is
// redrawn when the count changes, on each of the five drawings of a new mark, and when the camera
// comes to face the wall or turns away from it again — never else.
//
// THE COUNT is the server's (server/tally.mjs, /api/tally): read once on load; a NEW visitor posts
// once, when they are first in the room — after the door, when the camera has come to rest inside —
// and the answer is their own number. That mark is left off the wall until the breast is on the
// glass (at once on a laptop; on a phone, when they turn to the left wall), and then it is scratched
// in, the point drawn down it over five drawings of the 12 fps clock, with the `scratch` cue. A
// visitor who has been before (a flag in localStorage; without storage, once per page session) sees
// the count and nothing moves. A browser driven by a tool is not counted (the posthog.js rule), and
// ?shot=1 (or ?view=tally) never touches the network: it shows ?tally=N, else 137.
//
// URL: ?tally=N shows N marks and never calls the server · &scratch=1 treats the visit as new and
//      scratches the Nth in · ?tallypost=1 lets an automated browser post (the proofs)
// API: count · mine · shown · setCount(n, {scratch}) · scratch() · setState(name)
//   states: default · scratch (the last mark, scratched in again) · full (1980) · 600 · 137
import * as THREE from 'three';
import { INK, PAPER, canvasTexture } from '../core/strokes.js';

export const meta = {
  name: 'tally',
  judge: { shot: 'wide', states: ['default', 'scratch', '137', '600', 'full'] },
  files: ['src/pieces/tally.js', 'server/tally.mjs'],
};

// the patch on the breast, in the mockup's frame: u across (towards −z), v down, metres
const PATCH = { z0: 0.42, y0: 2.4, w: 0.94, h: 1.05 };
const MARGIN = 0.03; // sheet past the marks, each way
const PROUD = 0.003;
// THE CANVAS. 512 across the rake and 1024 up it: the patch is foreshortened about three to one on
// every seat, and the pass stops drawing a surface's marks past ~9 texels to the screen pixel
// (ink.js `texPen`), so this is under 6 across and under 4 up at a dpr of 1 and well inside at 3.
const TEX = { w: 512, h: 1024 };
// THE TWO HANDS THE MARKS ARE DRAWN IN, as css px to the metre across (u) and up (v) the breast.
// RAKED is every seat a visitor sits in (measured, 1280x800: home 90 and 249, wide 72 and 201; the
// phone turned left 87 and 254); SQUARE is the `fireplace` shot and anything else that faces the
// wall (405 and 405). See HOW THE MARKS ARE DRAWN for why there are two.
const HANDS = { raked: { u: 88, v: 250 }, square: { u: 250, v: 250 } };
const SQUARE_AT = 0.6; // across/up on the glass at or above which the wall is being faced
const PEN = 1.0; // css px in that space (the mockup drew 1.2 in grey; see HOW THE MARKS ARE DRAWN)
// the mockup's sizes — `raked` (137) and `raked600` — and past them the wall running out
const SIZES = [
  { gh: 0.11, pitch: 0.125, row: 0.15, over: 0.018, sp: 0.0145, pen: 1 },
  { gh: 0.08, pitch: 0.075, row: 0.1, over: 0.012, sp: 0.0145, pen: 1 },
  { gh: 0.045, pitch: 0.042, row: 0.056, over: 0.007, sp: 0.0078, pen: 0.8 },
];
const SEED = 3; // the mockup's
// the thinnest a scratch gets at its two ends, as a fraction of its middle (the mockup's)
const TAPER = 0.25;
const FRAMES = 5; // a new mark goes on over five drawings: 0.42 s, the scratch cue's own length
const HOLD_S = 0.6; // the breast on the glass this long before the point goes in
const FIXED = 137; // what ?shot=1 shows when nobody says
const FLAG = 'tarotpepe.tally';

// ---- the mockup's generator (scratchpad tally/tally.mjs), unchanged but for the size family ----
function mulberry(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r) => (r() + r() + r() - 1.5) / 0.866; // ~N(0,1)-ish, bounded
const lerp = (a, b, t) => a + (b - a) * t;

// How big the marks are for a count: the largest size on the family's path that still holds them.
function capacity(z) {
  const perRow = Math.max(1, Math.floor((PATCH.w - 0.012) / z.pitch));
  const rows = Math.floor((PATCH.h - 0.012 - z.gh * 1.15) / z.row) + 1;
  return perRow * 5 * rows;
}
function sizeAt(s) {
  const [a, b] = s <= 1 ? [SIZES[0], SIZES[1]] : [SIZES[1], SIZES[2]];
  const t = s <= 1 ? s : s - 1;
  const z = {};
  for (const k of Object.keys(a)) z[k] = lerp(a[k], b[k], t);
  return z;
}
export const CAP = capacity(SIZES[2]);
function sizeFor(count) {
  for (let s = 0; s <= 2.0001; s += 0.01) {
    const z = sizeAt(Math.min(2, s));
    if (capacity(z) >= count) return z;
  }
  return SIZES[2];
}

// strokes in patch space (u right, v down), metres; each [[u, v], [u, v]]
function genTally(count, z, seed = SEED) {
  const r = mulberry(seed);
  const { gh, pitch, row, over, sp: sp0 } = z;
  const flat = 0.55;
  const perRow = Math.max(1, Math.floor((PATCH.w - 0.012) / pitch));
  const groups = Math.ceil(count / 5);
  const strokes = [];
  let rowSlope = 0, rowStart = 0, rowY = 0;
  for (let g = 0; g < groups; g++) {
    const ri = Math.floor(g / perRow), ci = g % perRow;
    if (ci === 0) {
      rowSlope = gauss(r) * 0.035;
      rowStart = 0.004 + r() * 0.014;
      rowY = ri * row + gauss(r) * 0.006;
    }
    const n = Math.min(5, count - g * 5);
    const H = gh * (1 + gauss(r) * 0.09);
    const sp = sp0 * (1 + gauss(r) * 0.14);
    const lean = 0.07 + gauss(r) * 0.11; // radians, positive = top leans right
    const rot = gauss(r) * 0.07;
    const cx0 = rowStart + ci * pitch + gauss(r) * 0.006;
    const cy0 = rowY + 0.012 + H / 2 + ci * pitch * rowSlope + gauss(r) * 0.006;
    const local = [];
    for (let k = 0; k < Math.min(n, 4); k++) {
      const L = H * (1 + gauss(r) * 0.12);
      const a = lean + gauss(r) * 0.075;
      const bx = k * sp + gauss(r) * 0.0022, by = H / 2 + gauss(r) * 0.006;
      local.push([[bx, by], [bx + Math.sin(a) * L, by - Math.cos(a) * L]]);
    }
    if (n === 5) {
      const up = r() < 0.85;
      const sh = Math.sin(lean) * H * 0.5;
      const x0 = -0.012 - over + gauss(r) * 0.004, x1 = 3 * sp + 0.015 + over + gauss(r) * 0.005;
      const ya = H * flat * (0.2 + gauss(r) * 0.12), yb = -H * flat * (0.22 + gauss(r) * 0.12);
      local.push(up ? [[x0 + sh * 0.3, ya], [x1 + sh * 0.7, yb]] : [[x0 + sh * 0.7, yb], [x1 + sh * 0.3, ya]]);
    }
    const c = Math.cos(rot), s = Math.sin(rot);
    const tf = ([x, y]) => [cx0 + (x - 1.5 * sp) * c - y * s, cy0 + (x - 1.5 * sp) * s + y * c];
    for (const [a, b] of local) strokes.push([tf(a), tf(b)]);
  }
  return strokes;
}

// A scratch, in the rake's screen space: one or two tapered, wobbling ribbons (the point skipped),
// sometimes a faint hairline beside it. Each sample carries `t`, how far along the whole stroke it
// is, so a stroke can be drawn only as far as the point has got. The mockup's `ribbon` and
// `strokeSVG`, with one rng per stroke so a mark is the same mark whatever else is on the wall.
function ribbon(a, b, width, r, bow, t0, t1) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const N = Math.max(4, Math.min(12, Math.round(len / 3)));
  const pts = [];
  const skew = 0.35 + r() * 0.5; // where the stroke is heaviest
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const wob = bow * Math.sin(Math.PI * t) + gauss(r) * Math.min(0.22, width * 0.12);
    const px = a[0] + dx * t + nx * wob, py = a[1] + dy * t + ny * wob;
    const d = t < skew ? t / skew : (1 - t) / (1 - skew);
    const taper = TAPER + (1 - TAPER) * Math.min(1, d * 1.8) ** 0.7;
    const hw = (width / 2) * taper * (1 + gauss(r) * 0.1);
    pts.push({ t: lerp(t0, t1, t), l: [px + nx * hw, py + ny * hw], r: [px - nx * hw, py - ny * hw] });
  }
  return pts;
}
function scratchShape([a, b], width, r) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const bow = gauss(r) * Math.min(1.2, len * 0.035);
  const at = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const parts = [];
  if (r() < 0.18 && len > 8) {
    const t = 0.35 + r() * 0.35, gap = Math.min(0.08, 1.6 / len);
    parts.push({ alpha: 1, pts: ribbon(a, at(t - gap), width, r, bow * 0.5, 0, t - gap) });
    parts.push({ alpha: 1, pts: ribbon(at(t + gap), b, width, r, bow * 0.5, t + gap, 1) });
  } else parts.push({ alpha: 1, pts: ribbon(a, b, width, r, bow, 0, 1) });
  if (r() < 0.22) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = len || 1, o = width * (0.9 + r() * 0.4) * (r() < 0.5 ? 1 : -1);
    const t0 = r() * 0.3, t1 = 0.6 + r() * 0.35;
    const p0 = at(t0), p1 = at(t1);
    parts.push({ alpha: 0.55, pts: ribbon([p0[0] - (dy / L) * o, p0[1] + (dx / L) * o], [p1[0] - (dy / L) * o, p1[1] + (dx / L) * o], width * 0.45, r, bow, t0, t1) });
  }
  return parts;
}

export async function build(ctx) {
  const { scene, params, shotMode } = ctx;
  const P = ctx.pieces;
  const fire = P.room?.fireplace;
  const face = fire?.face ?? -2.36;

  // ---- the sheet ----------------------------------------------------------------------------------
  const W = PATCH.w + 2 * MARGIN, H = PATCH.h + 2 * MARGIN;
  const canvas = document.createElement('canvas');
  canvas.width = TEX.w;
  canvas.height = TEX.h;
  const g = canvas.getContext('2d');
  const tex = canvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = Math.max(tex.anisotropy || 1, ctx.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1);
  // one quad, a vertex every 5 cm so the warp can bend it. PlaneGeometry faces +z; a quarter turn
  // about y faces it into the room (+x) and runs its own x along −z, which is the patch's u.
  const geo = new THREE.PlaneGeometry(W, H, Math.ceil(W / 0.05), Math.ceil(H / 0.05));
  geo.rotateY(Math.PI / 2);
  geo.translate(face + PROUD, PATCH.y0 + MARGIN - H / 2, PATCH.z0 + MARGIN - W / 2);
  const warp = P.room?.warp;
  if (warp) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const [dx, dy, dz] = warp(pos.getX(i), pos.getY(i), pos.getZ(i));
      pos.setXYZ(i, pos.getX(i) + dx, pos.getY(i) + dy, pos.getZ(i) + dz);
    }
    geo.computeBoundingSphere();
  }
  // the side wall's own hatch, so the tone does not change at the sheet's edge
  let hatch = 0.34;
  P.room?.group?.traverse?.((o) => {
    const m = o.material;
    if (m && !Array.isArray(m) && m.name === 'sidewall' && m.userData?.ink?.hatch != null) hatch = m.userData.ink.hatch;
  });
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: tex, roughness: 0.9, metalness: 0 });
  mat.userData.ink = { hatch, lineWeight: 0, colorful: true, keep: false };
  mat.name = 'tally';
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'tally';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // ---- drawing ------------------------------------------------------------------------------------
  // The hand's screen space onto the canvas: css px → texels, per axis, with the margin.
  const ox = MARGIN * (TEX.w / W), oy = MARGIN * (TEX.h / H);
  let hand = HANDS.raked;
  let layout = { count: -1, hand: null, strokes: [], pen: PEN };
  function layoutFor(count) {
    const n = Math.min(count, CAP);
    if (layout.count === n && layout.hand === hand) return layout;
    const z = sizeFor(n);
    const strokes = genTally(n, z).map(([a, b]) => [
      [a[0] * hand.u, a[1] * hand.v],
      [b[0] * hand.u, b[1] * hand.v],
    ]);
    return (layout = { count: n, hand, strokes, pen: PEN * z.pen, shapes: new Map() });
  }
  function shapeOf(i) {
    let s = layout.shapes.get(i);
    if (!s) {
      // a point is pulled DOWN a wall: the mockup's strokes run foot-to-head, so the upright ones
      // are turned round here, and the strike across keeps the way it was cut
      let [a, b] = layout.strokes[i];
      if (b[1] < a[1] && Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0])) [a, b] = [b, a];
      layout.shapes.set(i, (s = scratchShape([a, b], layout.pen, mulberry(SEED * 100003 + i * 7919))));
    }
    return s;
  }
  function fillPart(pts, upto) {
    const L = [], R = [];
    for (let k = 0; k < pts.length; k++) {
      const p = pts[k];
      if (p.t <= upto) {
        L.push(p.l);
        R.push(p.r);
        continue;
      }
      if (k > 0) {
        const q = pts[k - 1], f = (upto - q.t) / (p.t - q.t || 1);
        L.push([lerp(q.l[0], p.l[0], f), lerp(q.l[1], p.l[1], f)]);
        R.push([lerp(q.r[0], p.r[0], f), lerp(q.r[1], p.r[1], f)]);
      }
      break;
    }
    if (L.length < 2) return;
    g.beginPath();
    g.moveTo(L[0][0], L[0][1]);
    for (let k = 1; k < L.length; k++) g.lineTo(L[k][0], L[k][1]);
    for (let k = R.length - 1; k >= 0; k--) g.lineTo(R[k][0], R[k][1]);
    g.closePath();
    g.fill();
  }
  // `full` marks drawn whole, and mark `full` (0-based) drawn as far as `upto` of its length
  let last = [0, 0, 0];
  function paint(count, full, upto = 0) {
    last = [count, full, upto];
    layoutFor(count);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.fillStyle = PAPER;
    g.fillRect(0, 0, TEX.w, TEX.h);
    g.setTransform(TEX.w / W / hand.u, 0, 0, TEX.h / H / hand.v, ox, oy);
    g.fillStyle = INK;
    const n = Math.min(full, layout.count);
    for (let i = 0; i < n; i++) for (const part of shapeOf(i)) (g.globalAlpha = part.alpha), fillPart(part.pts, 1);
    if (upto > 0 && n < layout.count) for (const part of shapeOf(n)) (g.globalAlpha = part.alpha), fillPart(part.pts, upto);
    g.globalAlpha = 1;
    tex.needsUpdate = true;
    api.shown = n;
  }

  // ---- the count ----------------------------------------------------------------------------------
  const forced = params.has('tally') ? Math.max(0, Math.floor(+params.get('tally')) || 0) : null;
  // a screenshot, a forced count, or this piece being judged on its own (?view=tally) never asks
  const offline = shotMode || forced != null || ctx.view === 'tally';
  const automated = typeof navigator !== 'undefined' && navigator.webdriver === true && params.get('tallypost') !== '1';
  let memoryFlag = false; // no storage at all: once per page
  const store = (() => {
    for (const k of ['localStorage', 'sessionStorage']) {
      try {
        const s = window[k];
        const probe = `${FLAG}.probe`;
        s.setItem(probe, '1');
        s.removeItem(probe);
        return s;
      } catch {}
    }
    return null;
  })();
  const counted = () => {
    if (memoryFlag) return true;
    try {
      return store?.getItem(FLAG) != null;
    } catch {
      return false;
    }
  };
  const markCounted = (n) => {
    memoryFlag = true;
    try {
      store?.setItem(FLAG, String(n ?? 1));
    } catch {}
  };

  // what is pending: a mark to scratch in once the breast is on the glass
  let pending = null; // { index } — 0-based mark to scratch
  let anim = null; // { index, f0 }
  let seenAt = null; // raw clock when the breast came onto the glass, while a mark is pending
  let arrived = false, doorWasUp = false, posted = false;

  function setCount(n, { scratch = false } = {}) {
    api.count = n;
    anim = null;
    seenAt = null;
    if (scratch && n > 0) {
      pending = { index: Math.min(n, CAP) - 1 };
      paint(n, pending.index);
    } else {
      pending = null;
      paint(n, n);
    }
  }

  async function fetchCount() {
    try {
      const r = await fetch('/api/tally', { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      // a scratch already waiting keeps its own number; this is only the wall as it stands
      if (Number.isFinite(j.count) && !pending && !anim && !posted) setCount(j.count);
    } catch {}
  }
  async function post() {
    posted = true;
    try {
      const r = await fetch('/api/tally', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      const j = await r.json().catch(() => ({}));
      if (r.ok && Number.isFinite(j.count)) {
        markCounted(j.mine);
        api.mine = j.mine ?? j.count;
        setCount(j.count, { scratch: true });
      } else if (r.status === 429) {
        // this address was counted in the last twelve hours: they are on the wall already
        markCounted(null);
        if (Number.isFinite(j.count)) setCount(j.count);
      }
    } catch {
      // the server is not answering: count them next time
    }
  }

  // ---- is the visitor in the room, and is the breast on the glass? ----------------------------------
  const _v = new THREE.Vector3();
  const corners = [
    [PATCH.z0, PATCH.y0],
    [PATCH.z0 - PATCH.w, PATCH.y0],
    [PATCH.z0, PATCH.y0 - PATCH.h],
    [PATCH.z0 - PATCH.w, PATCH.y0 - PATCH.h],
    [PATCH.z0 - PATCH.w / 2, PATCH.y0 - PATCH.h / 2],
  ];
  function onGlass(cam) {
    // the middle of the patch well inside the frame and three of its four corners on it, in front of
    // the lens (at `home` on a laptop the patch's near edge is the frame's own left edge, and the
    // marks are all there)
    let inside = 0;
    for (const [z, y] of corners.slice(0, 4)) {
      _v.set(face, y, z).project(cam);
      if (_v.z < 1 && Math.abs(_v.x) <= 1 && Math.abs(_v.y) <= 1) inside++;
    }
    const [z, y] = corners[4];
    _v.set(face, y, z).project(cam);
    return inside >= 3 && _v.z < 1 && Math.abs(_v.x) < 0.9 && Math.abs(_v.y) < 0.9;
  }
  // which hand the wall is being seen in: across/up on the glass at the patch's middle, taken only
  // while the middle is in front of the lens and somewhere near the frame
  const _a = new THREE.Vector3(), _b = new THREE.Vector3();
  function handFor(cam) {
    const zc = PATCH.z0 - PATCH.w / 2, yc = PATCH.y0 - PATCH.h / 2;
    _v.set(face, yc, zc).project(cam);
    if (_v.z >= 1 || Math.abs(_v.x) > 1.5 || Math.abs(_v.y) > 1.5) return null;
    _a.set(face, yc, zc - 0.1).project(cam);
    _b.set(face, yc - 0.1, zc).project(cam);
    const across = Math.hypot((_a.x - _v.x) * cam.aspect, _a.y - _v.y);
    const up = Math.hypot((_b.x - _v.x) * cam.aspect, _b.y - _v.y) || 1e-6;
    return across / up >= SQUARE_AT ? HANDS.square : HANDS.raked;
  }
  function inRoom() {
    if (arrived) return true;
    const E = P.entrance;
    if (!E || E.failed || shotMode || ctx.view) return (arrived = true); // no door to come through
    if (E.showing) doorWasUp = true;
    else if (doorWasUp && !P.camera?.moving) arrived = true;
    return arrived;
  }

  function startScratch(c) {
    anim = { index: pending.index, f0: c.clock.frame };
    pending = null;
    P.sound?.play?.('scratch', { pan: -0.55 }); // the breast is stage left
    paint(api.count, anim.index, 1 / FRAMES);
  }

  const api = {
    count: null,
    mine: null,
    shown: 0,
    get pending() {
      return pending ? pending.index + 1 : null;
    },
    get scratching() {
      return !!anim;
    },
    mesh,
    setCount,
    // scratch the last mark in again (the judging state, and a proof)
    scratch() {
      if (!(api.count > 0)) return;
      setCount(api.count, { scratch: true });
      seenAt = -Infinity; // no hold: the point goes in on the next drawing
    },
    update(c) {
      if (!c.clock.stepped) return;
      // the wall faced, or seen along: the other hand, drawn once, when the picture has arrived
      const h = P.camera?.moving ? null : handFor(c.camera);
      if (h && h !== hand) {
        hand = h;
        paint(...last);
      }
      if (anim) {
        const k = c.clock.frame - anim.f0 + 1;
        if (k >= FRAMES) {
          anim = null;
          paint(api.count, Math.min(api.count, CAP));
        } else if (k > 0) paint(api.count, anim.index, k / FRAMES);
        return;
      }
      if (!inRoom()) return;
      if (!posted && !offline && !automated && !counted()) post();
      if (!pending) return;
      if (P.camera?.moving || !onGlass(c.camera)) {
        if (seenAt !== -Infinity) seenAt = null;
        return;
      }
      if (seenAt == null) seenAt = c.clock.raw;
      if (c.clock.raw - seenAt >= HOLD_S) startScratch(c);
    },
    setState(name) {
      if (name === 'scratch') return api.scratch();
      if (name === 'full') return setCount(CAP);
      if (/^\d+$/.test(name)) return setCount(+name);
      setCount(forced ?? FIXED);
    },
  };

  // ---- first paint --------------------------------------------------------------------------------
  if (offline) {
    setCount(forced ?? FIXED, { scratch: params.get('scratch') === '1' });
  } else {
    paint(0, 0); // bare plaster until the server has answered
    fetchCount();
  }
  return api;
}
