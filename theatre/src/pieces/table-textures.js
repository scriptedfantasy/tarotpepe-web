// table-textures — the drawn PATTERNS of the things on the table (what they are made of, what is
// printed or stitched on them). No shading, no outlines: the ink pass draws those.
//
// The cloth is a woven check drawn the way the sweeper's checked coat is drawn in
// fd-anim-courtyard-sweeper-hires: NOT a ruled lattice. Every stripe is ONE pen stroke that
// wanders over its length, the spacing between stripes varies by ±40 %, a few stripes are doubled
// and a few are simply missing, and the little cross-hatch clumps at the crossings are placed by
// jitter, not on a grid. And the check is not everywhere: like the rain-hatch on a wall in the
// reference it is dense at the rim and at the far edge and thins to bare paper across the middle,
// where the three cards and the fan lie — a stroke is drawn in pieces and each piece is kept or
// dropped by the local density, so a stripe frays into dashes and then into nothing.
// Over that: the fold creases a cloth keeps from the drawer, the ring a glass left, crumbs.
import * as THREE from 'three';
import { drawTexture, paper, inkLine, inkRect, hatch, crossHatch, letter, INK, PAPER } from '../core/strokes.js';
import { clothLocal, CLOTH_ROT, smooth } from './table-geo.js';

export const PITCH = 0.1; // metres between the stripes of the check (nominal; each gap varies ±40 %)
const CLOTH_PAPER = PAPER; // the cloth is the same sheet as everything else; its centre IS bare paper

// a wobbly circle drawn as short pen segments
function inkCircle(g, cx, cy, r, { width = 1.6, wobble = 1, rng = Math.random, alpha = 1, color = INK, gaps = 0 } = {}) {
  const n = Math.max(24, Math.round(r / 5));
  let skipping = false;
  for (let i = 0; i < n; i++) {
    if (gaps > 0) {
      if (skipping) {
        skipping = rng() > 0.4;
        continue;
      }
      if (rng() < gaps) {
        skipping = true;
        continue;
      }
    }
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1.15) / n) * Math.PI * 2;
    inkLine(g, cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, { width, wobble, rng, alpha, color, segments: 2 });
  }
}

// one long pen stroke along an axis, drawn in pieces (the pen lifts now and then) with a slow
// drift so no two strokes are parallel. axis 'y': vertical stroke at x = pos; 'x': horizontal at y = pos.
function longStroke(g, axis, pos, from, to, rng, { width = 1.9, alpha = 0.95, drift = 2.2, lift = 0.35 } = {}) {
  const phase = rng() * Math.PI * 2, freq = 1 / (110 + rng() * 90);
  const off = (t) => drift * Math.sin(t * freq + phase);
  let t = from;
  while (t < to) {
    const len = 70 + rng() * 130;
    const e = Math.min(to, t + len);
    const p0 = pos + off(t), p1 = pos + off(e);
    if (axis === 'y') inkLine(g, p0, t, p1, e, { width, wobble: 0.8, rng, alpha });
    else inkLine(g, t, p0, e, p1, { width, wobble: 0.8, rng, alpha });
    t = e + (rng() < lift ? 3 + rng() * 10 : 0);
  }
}

// ---------- the check, drawn thread by thread ----------
// The threads of one direction: a walk across the cloth in gaps of pitch ±40 %, dropping one now
// and then, doubling one now and then. Each carries its own wander, weight and phase, so no two
// are parallel and no interval repeats.
function threads(lo, hi, pitch, rng) {
  const out = [];
  let p = lo - pitch * (0.4 + rng());
  while (p < hi + pitch) {
    p += pitch * (0.6 + rng() * 0.8);
    if (rng() < 0.12) continue; // the weaver dropped one
    out.push({
      pos: p,
      amp: 1.3 + rng() * 2.0, // ±3 px of wander over the length
      freq: 1 / (140 + rng() * 280),
      phase: rng() * Math.PI * 2,
      w: 0.82 + rng() * 0.5,
      twin: rng() < 0.36 ? (rng() < 0.5 ? -1 : 1) * (3.0 + rng() * 4.5) : 0,
    });
  }
  return out;
}

// One thread: drawn in pieces along its length. `density(x, y)` 0..1 decides whether each piece is
// there at all and how heavy it is, so the stripe frays into dashes and then into bare paper.
function thread(g, axis, s, from, to, rng, { width, alpha, density, off = 0 }) {
  const wander = (t) => off + s.amp * Math.sin(t * s.freq + s.phase) + s.amp * 0.4 * Math.sin(t * s.freq * 2.6 + s.phase * 1.9);
  let t = from;
  while (t < to) {
    const p = s.pos + wander(t + 34);
    const d = density(axis === 'y' ? p : t + 34, axis === 'y' ? t + 34 : p);
    // long and continuous where the weave is solid, short broken dashes where it is dying out
    const len = (30 + rng() * 90) * (0.4 + 1.6 * d);
    const e = Math.min(to, t + len);
    if (rng() < d * 1.06) {
      const a = alpha * (0.5 + 0.5 * d);
      const wd = width * s.w * (0.78 + 0.32 * d);
      const p0 = s.pos + wander(t), p1 = s.pos + wander(e);
      if (axis === 'y') inkLine(g, p0, t, p1, e, { width: wd, wobble: 0.75, rng, alpha: a });
      else inkLine(g, t, p0, e, p1, { width: wd, wobble: 0.75, rng, alpha: a });
    }
    t = e + (rng() < 0.34 * (1.3 - 0.7 * d) ? 3 + rng() * 18 : 0);
  }
}

// Where two threads cross, the weave doubles: a small clump of short diagonal strokes. Placed off
// the crossing by up to a quarter pitch and skipped more often than not, so they never fall on a
// grid; scarce in the middle of the cloth, thick at the rim.
function weaveClumps(g, xs, ys, rng, { pitch, density, width, alpha }) {
  for (const X of xs)
    for (const Y of ys) {
      const cx = X.pos + (rng() - 0.5) * pitch * 0.5, cy = Y.pos + (rng() - 0.5) * pitch * 0.5;
      const d = density(cx, cy);
      // no clumps out on the bare cloth: with no threads to sit on they read as scratches
      if (d < 0.45 || rng() > d * 0.66) continue;
      const s = pitch * (0.1 + rng() * 0.14);
      const a = Math.PI / 4 + (rng() - 0.5) * 1.0;
      const n = 2 + Math.floor(rng() * 3);
      for (let k = 0; k < n; k++) {
        const o = (k - (n - 1) / 2) * (2.1 + rng() * 2.4);
        const L = s * (0.65 + rng() * 0.85);
        const mx = cx - Math.sin(a) * o, my = cy + Math.cos(a) * o;
        inkLine(g, mx - Math.cos(a) * L, my - Math.sin(a) * L, mx + Math.cos(a) * L, my + Math.sin(a) * L, {
          width: width * (0.68 + rng() * 0.42),
          wobble: 0.5,
          rng,
          alpha: alpha * (0.45 + 0.55 * d),
          segments: 2,
        });
      }
    }
}

// rect = [x0, y0, x1, y1] in the current canvas transform. `density(x, y)` → 0..1.
function handCheck(g, rect, rng, { pitch, density, width = 1.5, alpha = 0.88 }) {
  const [x0, y0, x1, y1] = rect;
  const xs = threads(x0, x1, pitch, rng);
  const ys = threads(y0, y1, pitch, rng);
  weaveClumps(g, xs, ys, rng, { pitch, density, width, alpha });
  for (const s of xs) {
    thread(g, 'y', s, y0, y1, rng, { width, alpha, density });
    if (s.twin) thread(g, 'y', s, y0, y1, rng, { width: width * 0.78, alpha: alpha * 0.8, density, off: s.twin });
  }
  for (const s of ys) {
    thread(g, 'x', s, x0, x1, rng, { width, alpha, density });
    if (s.twin) thread(g, 'x', s, x0, x1, rng, { width: width * 0.78, alpha: alpha * 0.8, density, off: s.twin });
  }
}

// a fold crease: a broken pen line along an axis with a few short ticks on its shadow side
function crease(g, axis, pos, from, to, rng, { width = 1.7, alpha = 0.85, ticks = true, side = 1, density = null } = {}) {
  // a crease survives on bare cloth — it is the one line the pen leaves there, and on the quiet
  // middle of the cloth it is all the drawing there is
  const dens = (t) => (density ? 0.66 + 0.34 * density(axis === 'y' ? pos : t, axis === 'y' ? t : pos) : 1);
  let t = from;
  while (t < to) {
    const len = 40 + rng() * 110;
    const e = Math.min(to, t + len);
    const d = dens((t + e) / 2);
    const p0 = pos + (rng() - 0.5) * 3, p1 = pos + (rng() - 0.5) * 3;
    if (rng() < d + 0.15) {
      if (axis === 'y') inkLine(g, p0, t, p1, e, { width: width * (0.8 + 0.3 * d), wobble: 1.1, rng, alpha: alpha * d });
      else inkLine(g, t, p0, e, p1, { width: width * (0.8 + 0.3 * d), wobble: 1.1, rng, alpha: alpha * d });
    }
    t = e + 10 + rng() * 34;
  }
  if (!ticks) return;
  for (let s = from + 10 + rng() * 20; s < to; s += 20 + rng() * 34) {
    if (rng() > dens(s) - 0.25) continue;
    const L = 6 + rng() * 9, o = { width: 1.3, wobble: 0.4, rng, alpha: 0.6, segments: 2 };
    if (axis === 'y') inkLine(g, pos + side * 3, s, pos + side * (3 + L), s + (rng() - 0.5) * 4, o);
    else inkLine(g, s, pos + side * 3, s + (rng() - 0.5) * 4, pos + side * (3 + L), o);
  }
}

// small embroidered motif for the border band: a diamond with a dot, a cross, a little flower
function motif(g, x, y, s, kind, rng) {
  const o = { width: 2, wobble: 0.6, rng, segments: 2 };
  if (kind === 0) {
    inkLine(g, x, y - s, x + s, y, o);
    inkLine(g, x + s, y, x, y + s, o);
    inkLine(g, x, y + s, x - s, y, o);
    inkLine(g, x - s, y, x, y - s, o);
    g.fillStyle = INK;
    g.beginPath();
    g.arc(x, y, s * 0.25, 0, Math.PI * 2);
    g.fill();
  } else if (kind === 1) {
    inkLine(g, x - s * 0.75, y - s * 0.75, x + s * 0.75, y + s * 0.75, o);
    inkLine(g, x + s * 0.75, y - s * 0.75, x - s * 0.75, y + s * 0.75, o);
  } else {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rng() * 0.3;
      inkLine(g, x + Math.cos(a) * s * 0.25, y + Math.sin(a) * s * 0.25, x + Math.cos(a) * s, y + Math.sin(a) * s, o);
    }
    g.fillStyle = INK;
    g.beginPath();
    g.arc(x, y, s * 0.22, 0, Math.PI * 2);
    g.fill();
  }
}

// a running scallop (little arches) along a horizontal line between x0..x1 at y, arch width w
function scallop(g, x0, x1, y, w, h, rng, up = -1) {
  for (let x = x0; x < x1; x += w) {
    const n = 5;
    let px = x, py = y;
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      const nx = x + u * w, ny = y + up * Math.sin(u * Math.PI) * h;
      inkLine(g, px, py, nx, ny, { width: 1.8, wobble: 0.4, rng, segments: 2 });
      px = nx;
      py = ny;
    }
  }
}

// ---------- the cloth's top ----------
// `marks` are world (x, z) positions of the things that leave rings and crumbs; the texture is in
// cloth-local space (the cloth is laid corner-forward), so they are converted here.
export function clothTopTexture(R, marks = {}) {
  return drawTexture(
    1024,
    1024,
    (g, w, h, rng) => {
      paper(g, w, h, CLOTH_PAPER, { grain: 0, seed: 21 });
      const c = w / 2;
      const pxm = w / (2 * R); // px per metre
      // CircleGeometry's uv comes off its own XY plane and the mesh is laid down with rotation.x
      // = -PI/2, so the geometry's +y is the cloth's -z: v grows towards the visitor and the
      // canvas row is c + lz·pxm (this was the wrong way round, which put the glass rings on the
      // far side of the table from the glasses).
      const toCanvas = (x, z) => {
        const [lx, lz] = clothLocal(x, z);
        return [c + lx * pxm, c + lz * pxm];
      };
      const pitch = PITCH * pxm;
      // The check runs square to the room, so the weave is drawn with the cloth's corner-forward
      // rotation taken back out. Inside this transform the drawing space is the room's, turned a
      // quarter: px = -z·pxm, py = x·pxm. Everything below works in metres and converts.
      g.save();
      g.translate(c, c);
      g.rotate(-CLOTH_ROT);
      const E = w * 0.75;
      // Where the cloth is drawn at all. A quiet basin through the near middle — an ellipse over
      // the three slots (z ≈ +0.14, x = 0, ±0.36) and the fan's arc (z ≈ 0.28–0.56) — stays close
      // to bare paper so a card has something to read against; outside it the weave comes up,
      // full across the far half under the still life and round the whole rim.
      const density = (px, py) => {
        const x = py / pxm, z = -px / pxm; // back to the room's metres
        // the basin holds all three slot cards (x = 0, ±0.36, z ≈ 0.03–0.25) with room to spare
        const e = Math.hypot(x / 0.68, (z - 0.26) / 0.36);
        const r = Math.hypot(x, z) / R;
        // never nothing: the basin keeps a scatter of short weave dashes, the way a bare wall in
        // the reference still carries a few rain-strokes
        return Math.min(1, 0.26 + 0.74 * Math.max(smooth(0.62, 1.04, e), smooth(0.7, 0.99, r)));
      };
      handCheck(g, [-E, -E, E, E], rng, { pitch, density, width: 1.8, alpha: 0.9 });
      // the fold creases the cloth kept from the drawer: a cross, laid a little off centre because
      // the cloth is not, and a fainter line either side of it each way
      const q = 0.39 * pxm, ox = 0.045 * pxm, oy = 0.055 * pxm;
      crease(g, 'y', ox, -E, E, rng, { width: 1.6, alpha: 0.72, side: 1, density });
      crease(g, 'x', oy, -E, E, rng, { width: 1.6, alpha: 0.72, side: -1, density });
      for (const s of [-1, 1]) {
        crease(g, 'y', ox + s * q, -E, E, rng, { width: 1.35, alpha: 0.58, ticks: false, density });
        crease(g, 'x', oy + s * q, -E, E, rng, { width: 1.35, alpha: 0.58, ticks: false, density });
      }
      g.restore();
      // wear: rings left by the glasses, in two passes (a wet glass set down twice)
      for (const [x, z, r] of marks.rings ?? []) {
        const [cx, cy] = toCanvas(x, z);
        inkCircle(g, cx + 6, cy + 4, r * pxm, { width: 1.9, wobble: 1.3, rng, alpha: 0.75, gaps: 0.25 });
        inkCircle(g, cx, cy - 2, r * pxm * 0.92, { width: 1.4, wobble: 1.0, rng, alpha: 0.5, gaps: 0.4 });
      }
      // crumbs by the plate: short thick ticks and dots
      for (const [x, z] of marks.crumbs ?? []) {
        const [cx, cy] = toCanvas(x, z);
        for (let i = 0; i < 16; i++) {
          const px = cx + (rng() - 0.5) * 0.18 * pxm, py = cy + (rng() - 0.5) * 0.14 * pxm;
          if (rng() < 0.4) {
            g.fillStyle = INK;
            g.beginPath();
            g.arc(px, py, 1.6 + rng() * 1.2, 0, Math.PI * 2);
            g.fill();
          } else inkLine(g, px, py, px + 3 + rng() * 5, py + (rng() - 0.5) * 4, { width: 2, wobble: 0.3, rng, alpha: 0.9, segments: 2 });
        }
      }
      // a small burn by the ashtray: a solid dot with a scorched halo of ticks
      for (const [x, z] of marks.burns ?? []) {
        const [cx, cy] = toCanvas(x, z);
        g.fillStyle = INK;
        g.beginPath();
        g.ellipse(cx, cy, 5, 3.5, 0.5, 0, Math.PI * 2);
        g.fill();
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2 + rng() * 0.5;
          inkLine(g, cx + Math.cos(a) * 6, cy + Math.sin(a) * 5, cx + Math.cos(a) * (9 + rng() * 4), cy + Math.sin(a) * (8 + rng() * 4), { width: 1.4, wobble: 0.3, rng, alpha: 0.8, segments: 2 });
        }
      }
    },
    { seed: 31, anisotropy: 16 },
  );
}

// ---------- the hanging skirt: uv.y = 1 at the hem; 0.5 m of cloth per texture height ----------
// u runs 0..2 around (two repeats of the texture per turn: 2048 px per half turn ≈ 1050 px/m).
export function skirtTexture(W = 0.78, Rtop = 0.608) {
  return drawTexture(
    2048,
    512,
    (g, w, h, rng) => {
      paper(g, w, h, CLOTH_PAPER, { grain: 0, seed: 22 });
      const pxmY = h / 0.5; // 1024 px per metre down
      const pxmX = w / (Math.PI * Rtop); // px per metre around, at the rim
      const hem = h - 2;
      // the border band: 2 cm to 7.5 cm above the hem, bare paper with rules and a motif row
      const y1 = hem - 0.02 * pxmY, y2 = hem - 0.075 * pxmY;
      // the skirt IS the hem, so the weave is at full strength here — a shade lighter where it
      // turns over the table's rim so it meets the thinned check of the top without a jump
      handCheck(g, [0, 0, w, y2 - 10], rng, {
        pitch: PITCH * pxmX,
        density: (x, y) => 0.62 + 0.38 * smooth(0, y2, y),
        width: 1.55,
        alpha: 0.88,
      });
      g.fillStyle = CLOTH_PAPER;
      g.fillRect(0, y2 - 4, w, hem - y2 + 6);
      // stitched hem: a row of short dashes just above the edge
      for (let x = 0; x < w; x += 9) inkLine(g, x, hem - 7 + (rng() - 0.5), x + 4.5, hem - 7 + (rng() - 0.5), { width: 1.6, wobble: 0.2, rng, alpha: 0.9, segments: 2 });
      // double rules either side of the band
      for (const [y, wd] of [
        [y1, 2.2],
        [y1 - 7, 1.4],
        [y2, 2.2],
        [y2 + 7, 1.4],
      ]) {
        longStroke(g, 'x', y, -4, w + 4, rng, { width: wd, alpha: 0.95, drift: 1.6, lift: 0.2 });
      }
      const step = 0.05 * pxmX;
      const ym = (y1 + y2) / 2;
      for (let i = 0, x = step / 2; x < w; x += step, i++) motif(g, x + (rng() - 0.5) * 3, ym + (rng() - 0.5) * 2, 9.5, i % 3, rng);
      scallop(g, 0, w, y2 - 9, 0.032 * pxmX, 9, rng, -1);
    },
    { seed: 32, anisotropy: 16 },
  );
}

// ---------- the fringe: a row of pen ticks hanging from the hem (alpha: only the ticks exist) ----------
export function fringeTexture() {
  const t = drawTexture(
    192,
    96,
    (g, w, h, rng) => {
      g.clearRect(0, 0, w, h);
      const n = 4;
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * (w / n) + (rng() - 0.5) * 8;
        // the knot at the heading
        g.fillStyle = INK;
        g.beginPath();
        g.arc(x, 5, 3.2, 0, Math.PI * 2);
        g.fill();
        // the strand: one thick stroke with a lean, a few shorter loose threads
        const lean = (rng() - 0.5) * 16, len = 60 + rng() * 30;
        inkLine(g, x, 6, x + lean, len, { width: 3.2, wobble: 0.9, rng, alpha: 1, segments: 6 });
        if (rng() < 0.5) inkLine(g, x + 1, 12, x + lean * 0.6 + 7, len * (0.5 + rng() * 0.3), { width: 2, wobble: 0.7, rng, alpha: 1, segments: 4 });
      }
    },
    { seed: 39, anisotropy: 8 },
  );
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// ---------- turned wood: faint vertical grain lines ----------
export function woodTexture() {
  return drawTexture(
    256,
    1024,
    (g, w, h, rng) => {
      paper(g, w, h, '#f6f1e8', { grain: 0.03, seed: 23 });
      for (let x = 6; x < w; x += 11 + rng() * 9) {
        const n = 3 + Math.floor(rng() * 4);
        let y = rng() * 120;
        for (let k = 0; k < n && y < h; k++) {
          const len = 80 + rng() * 260;
          inkLine(g, x + (rng() - 0.5) * 3, y, x + (rng() - 0.5) * 6, y + len, { width: 0.9, wobble: 1.4, rng, alpha: 0.28 });
          y += len + 30 + rng() * 120;
        }
      }
    },
    { seed: 33, repeat: [1, 1] },
  );
}

// ---------- the wine bottle's label, wrapped: label centred at u = 0.5 ----------
export function bottleLabelTexture() {
  return drawTexture(
    512,
    512,
    (g, w, h, rng) => {
      paper(g, w, h, '#f6f1e8', { grain: 0.0 });
      // label occupies u 0.33..0.67, v 0.16..0.44 (v measured from the bottom)
      const x0 = w * 0.33, x1 = w * 0.67;
      const y0 = h * (1 - 0.44), y1 = h * (1 - 0.16);
      g.fillStyle = '#faf7f1';
      g.fillRect(x0, y0, x1 - x0, y1 - y0);
      inkRect(g, x0, y0, x1 - x0, y1 - y0, { width: 2, wobble: 1, rng });
      inkRect(g, x0 + 7, y0 + 7, x1 - x0 - 14, y1 - y0 - 14, { width: 1, wobble: 0.8, rng });
      const cx = (x0 + x1) / 2;
      letter(g, 'VIN', cx, y0 + 34, { size: 30, rng, weight: 700, tracking: 0.18 });
      letter(g, 'ORDINAIRE', cx, y0 + 62, { size: 17, rng, weight: 600, tracking: 0.16 });
      // a small crest: a wobbly shield with hatching and a star
      const sy = y0 + 96;
      inkCircle(g, cx, sy, 16, { width: 1.5, wobble: 0.9, rng });
      inkCircle(g, cx, sy, 12, { width: 1, wobble: 0.6, rng });
      g.save();
      g.beginPath();
      g.arc(cx, sy, 11.5, 0, Math.PI * 2);
      g.clip();
      hatch(g, cx - 12, sy - 12, 24, 12, { angle: Math.PI / 4, spacing: 3.5, width: 0.9, wobble: 0.3, broken: 0, rng });
      g.restore();
      letter(g, '12°', cx, y1 - 22, { size: 13, rng, weight: 500, tracking: 0.1 });
      inkLine(g, cx - 40, y1 - 36, cx + 40, y1 - 36, { width: 1, wobble: 0.5, rng });
      letter(g, 'MIS EN BOUTEILLE', cx, y1 - 11, { size: 8, rng, weight: 500, tracking: 0.12 });
      // a neck label band at v 0.86..0.9
      const ny0 = h * (1 - 0.9), ny1 = h * (1 - 0.86);
      g.fillStyle = '#faf7f1';
      g.fillRect(0, ny0, w, ny1 - ny0);
      inkLine(g, 0, ny0, w, ny0, { width: 1.5, wobble: 0.7, rng });
      inkLine(g, 0, ny1, w, ny1, { width: 1.5, wobble: 0.7, rng });
    },
    { seed: 34 },
  );
}

// ---------- the folded newspaper's top face (top half of the front page) ----------
export function newspaperTexture() {
  return drawTexture(
    768,
    512,
    (g, w, h, rng) => {
      paper(g, w, h, '#f4f0e6', { grain: 0.04, seed: 25 });
      const m = 26;
      // masthead
      inkLine(g, m, 22, w - m, 22, { width: 2.2, wobble: 0.8, rng });
      letter(g, 'LE COURRIER DU SOIR', w / 2, 58, { size: 44, rng, weight: 700, tracking: 0.1 });
      inkLine(g, m, 92, w - m, 92, { width: 2.2, wobble: 0.8, rng });
      inkLine(g, m, 97, w - m, 97, { width: 1, wobble: 0.6, rng });
      letter(g, 'ÉDITION DU SOIR  —  PRIX 40 CENTIMES  —  DIMANCHE', w / 2, 110, { size: 11, rng, weight: 500, tracking: 0.1 });
      inkLine(g, m, 124, w - m, 124, { width: 1, wobble: 0.6, rng });
      // headline across two columns
      letter(g, 'LA PLUIE CONTINUE', m, 158, { size: 30, rng, weight: 700, tracking: 0.06, align: 'left' });
      letter(g, 'Les autorités restent optimistes', m, 186, { size: 14, rng, weight: 500, tracking: 0.02, align: 'left', family: "'Jost', sans-serif" });
      // columns of text: rows of little strokes
      const cols = 4, gap = 14, cw = (w - 2 * m - gap * (cols - 1)) / cols;
      for (let c = 0; c < cols; c++) {
        const x = m + c * (cw + gap);
        const yTop = c < 2 ? 204 : 138;
        if (c === 3) {
          // a photograph: a cross-hatched box with a caption
          inkRect(g, x, yTop, cw, 120, { width: 1.5, wobble: 0.6, rng });
          crossHatch(g, x + 2, yTop + 2, cw - 4, 116, { spacing: 5, width: 0.9, wobble: 0.4, broken: 0.1, rng, alpha: 0.5 });
          hatch(g, x + 2, yTop + 60, cw - 4, 58, { angle: Math.PI / 2, spacing: 4, width: 1, wobble: 0.4, broken: 0, rng, alpha: 0.7 });
          for (let y = yTop + 134; y < h - 20; y += 9) inkLine(g, x, y, x + cw * (0.7 + rng() * 0.3), y, { width: 1.3, wobble: 0.35, rng, alpha: 0.55 });
          continue;
        }
        for (let y = yTop; y < h - 20; y += 9) {
          if (rng() < 0.06) {
            y += 6;
            inkLine(g, x, y, x + cw * 0.6, y, { width: 2.2, wobble: 0.4, rng, alpha: 0.9 });
            y += 4;
            continue;
          }
          inkLine(g, x, y, x + cw * (rng() < 0.15 ? 0.4 + rng() * 0.4 : 0.92 + rng() * 0.08), y, { width: 1.3, wobble: 0.35, rng, alpha: 0.55 });
        }
        if (c > 0) inkLine(g, x - gap / 2, c < 2 ? 204 : 138, x - gap / 2, h - 20, { width: 0.8, wobble: 0.5, rng, alpha: 0.6 });
      }
    },
    { seed: 35 },
  );
}

// ---------- a folded letter: lines of handwriting, a date, a signature ----------
export function noteTexture() {
  return drawTexture(
    384,
    256,
    (g, w, h, rng) => {
      paper(g, w, h, '#f7f4ec', { grain: 0.03, seed: 26 });
      const m = 30;
      // handwriting: a wavy stroke made of little loops, in rows
      const line = (x0, x1, y, wt = 1.5) => {
        let px = x0, py = y;
        for (let x = x0 + 6; x < x1; x += 5 + rng() * 5) {
          const ny = y + (rng() - 0.5) * 7;
          inkLine(g, px, py, x, ny, { width: wt, wobble: 0.5, rng, alpha: 0.9, segments: 2 });
          px = x;
          py = ny;
        }
      };
      line(w - 120, w - m, 34, 1.4);
      for (let y = 74; y < h - 60; y += 22) line(m, m + (w - 2 * m) * (0.8 + rng() * 0.2), y);
      line(m, m + 90, h - 58);
      // the signature: a flourish
      let px = m + 30, py = h - 30;
      for (let k = 0; k < 9; k++) {
        const nx = px + 10 + rng() * 14, ny = h - 30 + (rng() - 0.5) * 22;
        inkLine(g, px, py, nx, ny, { width: 2.2, wobble: 0.6, rng, segments: 3 });
        px = nx;
        py = ny;
      }
      inkLine(g, m + 20, h - 22, px + 14, h - 26, { width: 1.6, wobble: 1.2, rng });
    },
    { seed: 40 },
  );
}

// ---------- a pocket watch's dial ----------
export function watchTexture() {
  return drawTexture(
    256,
    256,
    (g, w, h, rng) => {
      paper(g, w, h, '#faf7f1', { grain: 0.0 });
      const c = w / 2;
      inkCircle(g, c, c, 108, { width: 2.4, wobble: 1, rng });
      inkCircle(g, c, c, 96, { width: 1.3, wobble: 0.8, rng });
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        const L = i % 5 === 0 ? 14 : 6;
        inkLine(g, c + Math.cos(a) * 94, c + Math.sin(a) * 94, c + Math.cos(a) * (94 - L), c + Math.sin(a) * (94 - L), { width: i % 5 === 0 ? 2.4 : 1.4, wobble: 0.3, rng, segments: 2 });
      }
      const nums = ['XII', 'III', 'VI', 'IX'];
      nums.forEach((t, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 2;
        letter(g, t, c + Math.cos(a) * 66, c + Math.sin(a) * 66, { size: 22, rng, weight: 600, tracking: 0.02, family: "'Times New Roman', serif" });
      });
      // small seconds dial
      inkCircle(g, c, c + 42, 20, { width: 1.4, wobble: 0.6, rng });
      // hands: ten past ten
      const hand = (a, L, wd) => inkLine(g, c - Math.cos(a) * 6, c - Math.sin(a) * 6, c + Math.cos(a) * L, c + Math.sin(a) * L, { width: wd, wobble: 0.5, rng });
      hand(-Math.PI / 2 - 0.55, 58, 4);
      hand(-Math.PI / 2 + 0.7, 84, 3);
      g.fillStyle = INK;
      g.beginPath();
      g.arc(c, c, 5, 0, Math.PI * 2);
      g.fill();
    },
    { seed: 41 },
  );
}

// ---------- a matchbox label ----------
export function matchboxTexture() {
  return drawTexture(
    256,
    160,
    (g, w, h, rng) => {
      paper(g, w, h, '#f6f1e8', { grain: 0.02 });
      inkRect(g, 8, 8, w - 16, h - 16, { width: 2, wobble: 0.8, rng });
      inkRect(g, 14, 14, w - 28, h - 28, { width: 1, wobble: 0.6, rng });
      letter(g, 'ALLUMETTES', w / 2, 42, { size: 24, rng, weight: 700, tracking: 0.12 });
      // a little drawn match with a flame
      inkLine(g, w / 2 - 30, 92, w / 2 + 22, 92, { width: 3, wobble: 0.5, rng });
      g.fillStyle = INK;
      g.beginPath();
      g.ellipse(w / 2 + 26, 92, 6, 5, 0, 0, Math.PI * 2);
      g.fill();
      inkCircle(g, w / 2 + 26, 84, 7, { width: 1.2, wobble: 0.7, rng });
      letter(g, 'DE SÛRETÉ', w / 2, 122, { size: 13, rng, weight: 500, tracking: 0.14 });
      hatch(g, 14, h - 30, w - 28, 16, { angle: 0, spacing: 3, width: 0.8, wobble: 0.3, broken: 0.1, rng, alpha: 0.5 });
    },
    { seed: 36 },
  );
}

// ---------- coin face ----------
export function coinTexture() {
  return drawTexture(
    128,
    128,
    (g, w, h, rng) => {
      paper(g, w, h, '#f6f1e8', { grain: 0.02 });
      inkCircle(g, 64, 64, 56, { width: 2.5, wobble: 0.9, rng });
      inkCircle(g, 64, 64, 47, { width: 1.3, wobble: 0.7, rng, gaps: 0.1 });
      letter(g, '1', 64, 58, { size: 48, rng, weight: 700 });
      letter(g, 'FRANC', 64, 94, { size: 14, rng, weight: 600, tracking: 0.12 });
    },
    { seed: 37 },
  );
}

// ---------- café china: a painted band near the rim (repeats around) ----------
export function chinaTexture() {
  return drawTexture(
    512,
    128,
    (g, w, h, rng) => {
      paper(g, w, h, '#faf7f1', { grain: 0.0 });
      // band lives at v 0.78..0.9 (top of the object): two lines and a row of tiny dots
      const y0 = h * (1 - 0.9), y1 = h * (1 - 0.78);
      inkLine(g, -2, y0, w + 2, y0, { width: 2, wobble: 0.5, rng });
      inkLine(g, -2, y1, w + 2, y1, { width: 1.2, wobble: 0.5, rng });
      g.fillStyle = INK;
      for (let x = 6; x < w; x += 12) {
        g.beginPath();
        g.arc(x, (y0 + y1) / 2, 1.8, 0, Math.PI * 2);
        g.fill();
      }
    },
    { seed: 38, repeat: [1, 1] },
  );
}

// ---------- glass: an alpha mask so the ink pass sees only what a pen would draw of a glass ----------
// A lathe's u runs around (u = 0.25 and 0.75 are the silhouettes for a camera on the z axis),
// v runs along the profile by point index. `solid` = [v0, v1] ranges drawn as opaque (foot, stem,
// rim); everywhere else only two hairline bands at the silhouettes survive, so what is inside the
// glass (the wine) shows through as a pen would draw it.
export function glassMaskTexture(solid, { band = 0.012 } = {}) {
  const c = makeGlassCanvas(256, 256, solid, band);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function makeGlassCanvas(w, h, solid, band) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#f8f9f4';
  for (const [v0, v1] of solid) g.fillRect(0, Math.round((1 - v1) * h), w, Math.max(1, Math.round((v1 - v0) * h)));
  for (const u of [0.25, 0.75]) g.fillRect(Math.round((u - band) * w), 0, Math.max(2, Math.round(band * 2 * w)), h);
  return c;
}

export function wrapRepeat(t) {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
