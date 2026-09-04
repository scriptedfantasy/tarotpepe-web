// table-weave — how the cloth's weave is drawn. Nothing here knows about three.js; it draws on a
// 2D canvas with the pen from strokes.js.
//
// The fault this replaces: the check was RULED. Threads ran dead straight the whole width of the
// table in two directions, with short scratches scattered between them, so the cloth read as graph
// paper and ran on behind the cards unchanged.
//
// The folios never draw cloth that way. The sweeper's checked coat in
// fd-anim-courtyard-sweeper-hires is a field of SHORT DASHES laid in rows that bend with the
// garment — the rows read, no single line does. The kitchen tabletop in
// fd-anim-kitchen-table-cards-hires is short broken strokes crowding under the far rim and dying
// out to bare paper across the near half; not one stroke crosses the whole top.
//
// So, three rules, and every function here obeys them:
//   1. A thread is a RUN OF DASHES. The longest a pen ever goes without lifting is a fifth of the
//      table, and the usual dash is a twentieth of it.
//   2. Every thread BENDS WITH THE DRAPE. `drapeWarp` turns the drawing with the rim, so a thread
//      that starts square to the room finishes running round the edge; on the skirt `skirtWarp`
//      swings it with the fall of the pleats.
//   3. Where the cloth is drawn at all is a DENSITY FIELD: full at the rim and along the fold
//      creases, thinning to bare paper through the quiet middle where the cards lie.
import { inkLine } from '../core/strokes.js';
import { smooth } from './table-geo.js';

// ---------- the drape: what bends the threads ----------

// A warp for the round top: points turn about the table's centre by an angle that grows towards
// the rim, plus a slow three-lobed ripple so the turn is not mechanical. A straight thread comes
// out of it curving, and hardest where the cloth is pulled over the edge.
export function drapeWarp(RR, { amp = 0.42, r0 = 0.22, r1 = 1.15, ripple = 0.1 } = {}) {
  return (x, y) => {
    const r = Math.hypot(x, y) / RR;
    if (r < 1e-3) return [x, y];
    const a = amp * smooth(r0, r1, r) + ripple * Math.sin(3 * Math.atan2(y, x) + 1.1) * smooth(0.15, 0.95, r);
    const c = Math.cos(a), s = Math.sin(a);
    return [x * c - y * s, x * s + y * c];
  };
}

// A warp for the hanging skirt: the fall swings with the pleats, so horizontal threads dip between
// the creases and vertical ones lean. `period` is one pleat in px.
export function skirtWarp(period, amp = 7) {
  return (x, y) => [x + amp * 0.55 * Math.sin(y / 130 + x / (period * 1.7)), y + amp * Math.sin((x / period) * Math.PI * 2 + 0.6)];
}

// ---------- the threads ----------

// The offsets of the threads of one direction: a walk in gaps of pitch ±40 %, dropping one now and
// then, doubling one now and then. Each carries its own wander, weight and phase, so no two are
// parallel and no interval repeats.
export function threads(lo, hi, pitch, rng) {
  const out = [];
  let p = lo - pitch * (0.4 + rng());
  while (p < hi + pitch) {
    p += pitch * (0.6 + rng() * 0.8);
    if (rng() < 0.14) continue; // the weaver dropped one
    out.push({
      pos: p,
      amp: 1.6 + rng() * 2.4,
      freq: 1 / (130 + rng() * 260),
      phase: rng() * Math.PI * 2,
      w: 0.9 + rng() * 0.4,
      twin: rng() < 0.3 ? (rng() < 0.5 ? -1 : 1) * (3.2 + rng() * 4.5) : 0,
    });
  }
  return out;
}

const wander = (s, t, off) => off + s.amp * Math.sin(t * s.freq + s.phase) + s.amp * 0.4 * Math.sin(t * s.freq * 2.6 + s.phase * 1.9);

// One thread: a run of dashes along `path(t)` (t in px along the thread, path → [x, y] in canvas
// px, already warped). Each dash is kept or dropped by the local density, and the pen never runs
// further than `maxLen` without lifting.
export function dashRun(g, path, from, to, rng, o) {
  const { density, width = 1.5, alpha = 0.88, maxLen = 60, minDash = 9, span = 20, inside = null } = o;
  let t = from;
  while (t < to) {
    const p = path(t);
    if (inside && !inside(p[0], p[1])) {
      t += 26 + rng() * 52;
      continue;
    }
    const d = Math.max(0, Math.min(1, density(p[0], p[1])));
    // below this the pen is off the paper altogether. A lone dash out on the quiet cloth reads as
    // a scratch, not as weave — the basin under the cards has to be BARE, not lightly speckled.
    if (d < 0.13) {
      t += 22 + rng() * 44;
      continue;
    }
    let len = (minDash + rng() * span) * (0.6 + 0.85 * d);
    if (rng() < 0.06) len *= 1.9; // now and then the pen runs on
    const e = Math.min(to, t + Math.min(len, maxLen));
    if (rng() < 0.3 + 0.8 * d) {
      const q = path(e);
      // One pen, one pressure (STYLE.md §1.2): every stroke is INK, never a grey. A thin weave is
      // FEWER strokes, not fainter ones — a half-alpha hairline comes back off the texture as a
      // grey line, which is the thing this whole rewrite exists to get rid of.
      const w = width * (0.9 + 0.22 * d), a = alpha;
      const opt = { width: w, wobble: 0.55, rng, alpha: a, segments: 2 };
      if (e - t > 26) {
        const m = path((t + e) / 2); // long enough that the drape's curve shows in the dash itself
        inkLine(g, p[0], p[1], m[0], m[1], opt);
        inkLine(g, m[0], m[1], q[0], q[1], opt);
      } else inkLine(g, p[0], p[1], q[0], q[1], opt);
    }
    t = e + (4 + rng() * 9) * (1.5 - 0.8 * d);
    if (rng() < 0.13) t += 14 + rng() * 52; // the weave opens
  }
}

// Both directions of the weave over `rect` = [x0, y0, x1, y1], drawn through `warp`.
export function weaveField(g, rect, rng, o) {
  const { pitch, density, warp, width = 1.5, alpha = 0.88, maxLen = 60, minDash = 9, span = 20, inside = null } = o;
  const [x0, y0, x1, y1] = rect;
  const common = { density, alpha, maxLen, minDash, span, inside };
  for (const s of threads(x0, x1, pitch, rng)) {
    const run = (off, wd, al) => dashRun(g, (t) => warp(s.pos + wander(s, t, off), t), y0, y1, rng, { ...common, width: wd, alpha: al });
    run(0, width * s.w, alpha);
    if (s.twin) run(s.twin, width * s.w * 0.9, alpha);
  }
  for (const s of threads(y0, y1, pitch, rng)) {
    const run = (off, wd, al) => dashRun(g, (t) => warp(t, s.pos + wander(s, t, off)), x0, x1, rng, { ...common, width: wd, alpha: al });
    run(0, width * s.w, alpha);
    if (s.twin) run(s.twin, width * s.w * 0.9, alpha);
  }
}

// ---------- the roll over the table's edge ----------
// The one band of real tone the cloth has. Where a cloth is pulled down over a round rim the weave
// crowds and the threads there run WITH the edge — which is what the kitchen tabletop in
// fd-anim-kitchen-table-cards-hires does: short strokes packed under the far rim, thinning to bare
// paper across the middle. Rows of short arcs in the last few centimetres, each kept or dropped by
// the same density field as the weave, so it never closes into a ruled ring.
export function rimRoll(g, RR, rng, { rows = 3, inset = 0.03, density, width = 1.6, alpha = 0.95, lift = 0.4 }) {
  for (let k = 0; k < rows; k++) {
    // no row is a circle: each drifts in and out by a few millimetres over its length
    const base = RR * (0.992 - k * inset), p1 = rng() * 6.3, p2 = rng() * 6.3;
    const rad = (a) => base * (1 + 0.014 * Math.sin(3 * a + p1) + 0.008 * Math.sin(7 * a + p2));
    const arcPt = (a) => [Math.cos(a) * rad(a), Math.sin(a) * rad(a)];
    const rr = base;
    let a = rng() * Math.PI * 2;
    const end = a + Math.PI * 2;
    while (a < end) {
      const len = (7 + rng() * 20) / rr; // in radians
      const e = Math.min(end, a + len);
      const m = arcPt((a + e) / 2);
      const d = Math.max(0, Math.min(1, lift + (1 - lift) * density(m[0], m[1])));
      if (rng() < 0.34 + 0.72 * d) {
        const p = arcPt(a), q = arcPt(e);
        const opt = { width: width * (0.86 + 0.24 * d) * (k === 0 ? 1 : 0.9), wobble: 0.5, rng, alpha, segments: 2 };
        inkLine(g, p[0], p[1], m[0], m[1], opt);
        inkLine(g, m[0], m[1], q[0], q[1], opt);
      }
      a = e + ((3 + rng() * 8) / rr) * (1.5 - 0.8 * d);
      if (rng() < 0.14) a += (26 + rng() * 90) / rr; // and the row simply stops for a while
    }
  }
}

// ---------- the creases a cloth keeps from the drawer ----------
// Two or three of them, no more: a fold crease is the one line the pen leaves on bare cloth, so it
// has to be deliberate. Broken, thin, bending with the same drape as the weave, dying out before
// the rim; `crowd` lays a few threads alongside it, because the cloth gathers on a fold.
export function drapeCrease(g, path, from, to, rng, o = {}) {
  const { width = 1.8, density = null, inside = null, crowd = 0, ticks = 0, side = 1, gap = 1 } = o;
  let t = from;
  while (t < to) {
    // longer and more continuous than a weave dash, so the three creases read as the deliberate
    // lines they are and not as more weave
    const len = 70 + rng() * 120;
    const e = Math.min(to, t + len);
    const p = path(t), q = path(e), m = path((t + e) / 2);
    const ok = !inside || inside(m[0], m[1]);
    const d = density ? 0.55 + 0.45 * Math.max(0, Math.min(1, density(m[0], m[1]))) : 1;
    if (ok && rng() < d + 0.2) {
      const opt = { width: width * (0.86 + 0.22 * d), wobble: 1.0, rng, alpha: 1, segments: 3 };
      inkLine(g, p[0], p[1], m[0], m[1], opt);
      inkLine(g, m[0], m[1], q[0], q[1], opt);
      if (crowd > 0 && rng() < crowd) {
        // the cloth gathers on the fold: one or two short threads lying alongside it
        const nx = -(q[1] - p[1]), ny = q[0] - p[0], L = Math.hypot(nx, ny) || 1;
        for (let k = 0; k < 1 + (rng() < 0.4 ? 1 : 0); k++) {
          const o2 = (2.5 + rng() * 7) * (rng() < 0.5 ? -1 : 1);
          const u0 = 0.1 + rng() * 0.4, u1 = u0 + 0.2 + rng() * 0.35;
          const a0 = [p[0] + (q[0] - p[0]) * u0 + (nx / L) * o2, p[1] + (q[1] - p[1]) * u0 + (ny / L) * o2];
          const a1 = [p[0] + (q[0] - p[0]) * u1 + (nx / L) * o2, p[1] + (q[1] - p[1]) * u1 + (ny / L) * o2];
          inkLine(g, a0[0], a0[1], a1[0], a1[1], { width: width * 0.72, wobble: 0.6, rng, alpha: 1, segments: 2 });
        }
      }
    }
    t = e + (12 + rng() * 34) * gap;
  }
  if (ticks <= 0) return;
  for (let s = from + 30 + rng() * 60; s < to; s += 60 + rng() * 130) {
    const p = path(s), q = path(s + 12);
    if (inside && !inside(p[0], p[1])) continue;
    if (density && rng() > density(p[0], p[1]) * ticks) continue;
    const nx = -(q[1] - p[1]), ny = q[0] - p[0], L = Math.hypot(nx, ny) || 1;
    const R0 = 3, R1 = 3 + 5 + rng() * 8;
    inkLine(g, p[0] + (nx / L) * side * R0, p[1] + (ny / L) * side * R0, p[0] + (nx / L) * side * R1, p[1] + (ny / L) * side * R1, {
      width: 1.4,
      wobble: 0.4,
      rng,
      alpha: 1,
      segments: 2,
    });
  }
}
