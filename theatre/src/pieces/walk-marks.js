// walk-marks — THE ONE THING IN THIS ROOM THAT TELLS A THUMB WHERE TO PUT ITSELF.
//
// The user: "choosing the fireplace, piano and book section on mobile is quite hard to do … it's
// actually where to tap on the phone. I think a drawn mark would be good."
//
// Every other affordance in this film is the thing itself. The cursor over the radio turns into a
// pointer and that is the whole announcement; src/pieces/walk.js says so in its own first
// paragraph, and it was right for a laptop. A PHONE HAS NO CURSOR. It has a frame holding 2.0 m of
// a 5.2 m wall, two chevrons to look round the room with (camera-pan.js), and then nothing at all
// to say that the chimney breast it has just panned to is a place a visitor can stand. The five
// places were reachable and unfindable, which on a phone is the same as absent.
//
// So this file draws the room's second control, and it is kept to the same size as the idea: one
// small mark, in the room's own pen, on each walkable place whose object is in the frame — and at
// a place, on the ONE thing there is to do there. Nothing lettered, nothing coloured, no panel and
// no shadow. Laptops get none of it: a cursor is a better mark than a mark.
//
// ---- WHICH WINDOWS GET THEM --------------------------------------------------------------------
// A WINDOW WITH NO FINE POINTER AT ALL — `matchMedia('(any-pointer: fine)')` false — and not
// `(pointer: coarse)`, which is the obvious test and the wrong one. A touchscreen laptop and an
// iPad with a trackpad both report a coarse PRIMARY pointer at times and both have a cursor on the
// glass; marking the room for them would be drawing over a picture to say a thing the picture is
// already saying. `any-pointer` asks the question the user actually asked: is there a cursor in
// this room or is there not. Measured on the live page (tools/_walk-marks-proof.mjs, CURSOR, which
// reads the four queries off each window rather than taking this piece's word for the answer): a
// 1280x800 mouse window answers any-pointer:fine true / pointer:coarse false, and a 390x844 touch
// window answers false / true. The query is LISTENED to, not read once, because a keyboard folio
// can be clipped to a tablet halfway through an evening.
//
// `?marks=1` overrides that test and only that test — a tool on a laptop can see them; a tool
// cannot see them while the room is busy, because that would be a different room.
//
// ---- WHAT THE MARK IS, AND THE TWO THAT WERE NOT CHOSEN ----------------------------------------
// Three were drawn at 32 px and LOOKED AT on two frames at 390x844 (`?mark=ring|caret|bare`,
// tools/_walk-marks-proof.mjs VARIANTS, /tmp/marks/variants-fireplace.png and variants-case.png).
// Two frames, because on one of them the three are indistinguishable: over the chimney breast, which
// is white plaster, a paper pip on paper is no pip at all and all three read the same. The TALL CASE
// panned one tap left is the busiest drawing in the room — forty spines, the bottles on the middle
// board, their shadows — and it decided the question.
//
//   caret  a paper pip with an arrowhead in it, pointing down at the thing. REJECTED ON SIGHT, and
//          for worse than the reason it was drawn for: a 32 px circle with a down-arrow inside it is
//          the DOWNLOAD button, on every page anybody has ever used. It was meant to be read as «the
//          thing under me» and it is read as «save this». Second and independently: an arrow is a
//          DIRECTION, and this room already has two of them at the frame's edges meaning «there is
//          more of the room this way» — a third arrow in the middle of the picture is read as a
//          third way to pan before it is read as a target.
//   bare   the ring and its pip struck straight onto the room with a paper halo under the ink and no
//          sheet. REJECTED, and camera-pan.js had already learnt exactly this the hard way for its
//          chevrons. Over plaster it is the chosen mark's equal; over the case's middle board the
//          halo is not enough — the ring goes thin against the bottles standing behind it and reads
//          as a washer, a lens, a knot in the drawing. It is one more line among forty.
//   ring   a paper pip, a pen ring gone round it with a gap and a second shorter pass over the left
//          of it, and an ink dot in the middle. CHOSEN. Over the case it is the only one of the
//          three that stays separate from what is behind it, and it is not a UI icon by either
//          test: it has no direction and no state, so it cannot be read as a control that does
//          something; it is a thing a HAND did to a picture — the pen-ring somebody puts round a
//          face in a photograph — and the dot in it is the one place a finger is being asked to
//          land. The paper under it is the sheet the notice, the book and the chevrons are all drawn
//          on, so it is this film's own material and not a plate. 25.6 of the 32 px are the pip; the
//          ring is struck at 2.0 px with a 34-degree gap, the dot is 6.2 px across, and the whole of
//          it is a hundredth of a 390x844 frame — a fifth of the area of one chevron.
//
// 32 CSS PX, which is the middle of the 28–36 a thumb is comfortable with, growing to 36 on a tall
// window and never past it. The mark is NOT the tap target: the target is walk.js's, and it is the
// mark's box grown to the same 44 px every switch in this room is given (walk.js, `markTap`).
//
// ---- AND IT BOILS ------------------------------------------------------------------------------
// Two plates per mark, struck from two nibs, swapped on `clock.frame % 2` — the twelves everything
// else in the film is drawn on. A control that held perfectly still over a room that does not would
// be the only dead thing in the picture, which is the argument the chevrons settled.
//
// ---- WHERE IT SITS -----------------------------------------------------------------------------
// At a point INSIDE the place's own projected box, recomputed from the live camera on every drawing
// so it follows a pan and stays put on the object, and never merely at that box's centre: at
// 1280x800 the fireplace's box is mostly off the left of the frame and its middle lands inside the
// GRATE's, which is the snugger box and rightly takes the click. So `spotIn` searches the part of
// the box that is on the frame for a point the ROOM'S OWN ARBITER would give to this place, nearest
// the middle, and puts the mark there — or draws nothing, which is the honest answer when a place
// has no reachable pixel. A mark that lies about what is under it is worse than no mark.
import { INK, PAPER, inkLine } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';

export const KINDS = ['ring', 'caret', 'bare'];
export const KIND = 'ring'; // see the note above: looked at, at 390x844, over three walls

// 32 x 32 css px on a phone, up to 36 on a tall window. The pen is the chevrons' own 2.2 scaled to
// this smaller figure, floored at 1.7 so the ring never thins to a hairline on a 1x screen.
export function markSize(h) {
  const s = Math.max(1, Math.min(1.12, (h || 844) / 844));
  return { d: Math.round(32 * s), pen: Math.max(1.7, 2.0 * s) };
}

// A pen going round, once: a polyline of short chords with the radius shaking by a share of the
// nib's own width. `from`/`to` in radians, 0 at three o'clock, running clockwise on a canvas.
function arc(g, cx, cy, r, from, to, { width = 2, rng = Math.random, color = INK, alpha = 1 } = {}) {
  const steps = Math.max(6, Math.round((Math.abs(to - from) / (Math.PI * 2)) * 44));
  g.save();
  g.strokeStyle = color;
  g.globalAlpha = alpha;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    const rr = r + (rng() - 0.5) * width * 0.75;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke();
  g.restore();
}

// A blot: a filled polygon that is round to within a fifth of its radius. Nothing in this film is a
// perfect circle, and a 6 px `arc()` fill is the most obviously machine-made shape there is.
function blot(g, cx, cy, r, { rng = Math.random, color = INK, alpha = 1, rough = 0.18, sides = 13 } = {}) {
  g.save();
  g.fillStyle = color;
  g.globalAlpha = alpha;
  g.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const rr = r * (1 - rough + rng() * rough * 2);
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
  g.fill();
  g.restore();
}

/**
 * One mark, struck onto its own canvas of d x d css px. `parity` picks the nib, which is the whole
 * of the boil; `kind` is one of KINDS.
 */
export function strike(kind, d, pen, parity, dpr) {
  const c = document.createElement('canvas');
  c.width = Math.round(d * dpr);
  c.height = Math.round(d * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const nib = mulberry32(parity ? 0x5c17 : 0xa20b);
  const put = mulberry32(0x77b3);
  const cx = d / 2, cy = d / 2;
  const r = d / 2 - pen * 1.6; // 12.8 px of pip inside a 32 px box, with the drop-hatch's band left over

  if (kind === 'bare') {
    // NO SHEET: the figure alone, struck twice — once fat in paper as a halo, once in ink over it.
    // This is the variant that loses itself over the case's spines; it is kept so the choice can be
    // looked at again rather than taken on trust.
    for (const [color, w, alpha] of [[PAPER, pen * 3.0, 0.92], [INK, pen * 1.1, 1]]) {
      const n = mulberry32(parity ? 0x5c17 : 0xa20b);
      arc(g, cx, cy, r * 0.86, -0.3, Math.PI * 2 - 0.9, { width: w, rng: n, color, alpha });
      arc(g, cx, cy, r * 0.86, Math.PI * 0.55, Math.PI * 1.5, { width: w * 0.85, rng: n, color, alpha: alpha * 0.9 });
      blot(g, cx, cy, d * 0.1, { rng: n, color, alpha });
    }
    return c;
  }

  // THE SHEET, and the marks that say it is lying ON the room rather than floating over it: a tight
  // band of strokes off the lower-right of the rim, which is the quarter away from the light this
  // film has always been lit from. The notice, the book and the chevrons all carry the same band.
  const m = pen * 1.5;
  for (let i = 0; i < 22; i++) {
    if (put() < 0.3) continue;
    const a = 0.15 + put() * (Math.PI * 0.72); // four o'clock round to eight
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    inkLine(g, x, y, x + Math.cos(a) * m * (0.35 + 0.65 * put()), y + Math.sin(a) * m * (0.35 + 0.65 * put()), { width: pen * 0.42, wobble: 0.3, rng: put, alpha: 0.45 });
  }
  // the paper itself, cut round by a hand and not by a compass
  blot(g, cx, cy, r, { rng: mulberry32(parity ? 0x1bd3 : 0x4e91), color: PAPER, rough: 0.035, sides: 26 });

  if (kind === 'caret') {
    // the rejected one: an arrowhead pointing down, with a short tail over it. It is a DIRECTION,
    // and this room's other two drawn controls are directions that mean something else entirely.
    arc(g, cx, cy, r, -0.55, Math.PI * 2 - 1.15, { width: pen * 0.95, rng: nib, alpha: 0.95 });
    const w2 = d * 0.17, h2 = d * 0.11;
    const wob = pen * 0.35;
    g.save();
    g.strokeStyle = INK;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.lineWidth = pen * 1.15;
    g.beginPath();
    [[cx - w2, cy - h2], [cx, cy + h2 * 1.15], [cx + w2, cy - h2]].forEach(([px, py], i) => {
      const jx = px + (nib() - 0.5) * 2 * wob, jy = py + (nib() - 0.5) * 2 * wob;
      i ? g.lineTo(jx, jy) : g.moveTo(jx, jy);
    });
    g.stroke();
    g.beginPath();
    g.moveTo(cx + (nib() - 0.5) * wob, cy - h2 * 1.9);
    g.lineTo(cx + (nib() - 0.5) * wob, cy - h2 * 0.35);
    g.lineWidth = pen * 0.9;
    g.stroke();
    g.restore();
    return c;
  }

  // THE CHOSEN MARK. A pen ring gone round once with a 34-degree gap at two o'clock, a second
  // shorter pass over the left of it the way a hand goes round a second time to make sure, and the
  // ink dot in the middle that is the thing being pointed at.
  const gap = 0.6; // radians: 34 degrees, left open where the hand lifted
  arc(g, cx, cy, r, -Math.PI * 0.35 + gap, Math.PI * 1.65, { width: pen * 1.0, rng: nib, alpha: 1 });
  arc(g, cx, cy, r * 0.97, Math.PI * 0.62, Math.PI * 1.46, { width: pen * 0.8, rng: nib, alpha: 0.85 });
  blot(g, cx, cy, d * 0.097, { rng: nib, color: INK });
  return c;
}

/**
 * WHERE THE MARK GOES INSIDE A BOX. `b` is the thing's box on the glass; `W`/`H` the window; `d`
 * the mark's own size; `pass(x, y)` is the test that says a point on the glass really belongs to
 * this thing (walk.js hands over the room's own arbitration, minus the mark itself).
 *
 * The mark's centre must be INSIDE the box — it is on the object or it is a lie — and the whole
 * mark must be ON the frame, so the centre is clamped into [d/2 + 2, W − d/2 − 2] and likewise
 * down. Then a 9 x 9 grid over what is left is sorted by distance from the box's own middle and
 * the first point `pass` accepts wins, tested at its centre AND at its four cardinal edges so a
 * thumb landing on the rim of the mark lands on the same thing the middle of it would. Null when
 * nothing passes, which is the honest answer and is drawn as nothing at all.
 */
export function spotIn(b, W, H, d, pass) {
  if (!b || !(b.w > 0) || !(b.h > 0)) return null;
  const m = d / 2 + 2;
  const lo = (v0, v1, a, z) => [Math.max(v0, a), Math.min(v1, z)];
  const [x0, x1] = lo(b.x, b.x + b.w, m, W - m);
  const [y0, y1] = lo(b.y, b.y + b.h, m, H - m);
  if (x1 < x0 || y1 < y0) return null;
  const mx = Math.min(x1, Math.max(x0, b.x + b.w / 2));
  const my = Math.min(y1, Math.max(y0, b.y + b.h / 2));
  const N = 9;
  const pts = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x = N === 1 ? mx : x0 + ((x1 - x0) * i) / (N - 1);
      const y = N === 1 ? my : y0 + ((y1 - y0) * j) / (N - 1);
      pts.push([x, y, (x - mx) ** 2 + (y - my) ** 2]);
    }
  }
  pts.sort((p, q) => p[2] - q[2]);
  const e = d * 0.4;
  for (const [x, y] of pts) {
    if (!pass(x, y)) continue;
    if (!pass(x - e, y) || !pass(x + e, y) || !pass(x, y - e) || !pass(x, y + e)) continue;
    return { x: Math.round(x), y: Math.round(y) };
  }
  return null;
}

/**
 * Mount the mark layer in the overlay. `update({ show, parity, spots })` — `spots` is
 * [{ key, x, y }] in css px, the centres of the marks that are in the picture this drawing.
 *
 * The layer takes NO pointer events. That is the whole of the "one arbiter" rule this room settled
 * long ago: a mark with a listener of its own would be a second control that can answer the same
 * tap as the place under it. The mark is a DRAWING of a target; walk.js's hotspot is the target.
 */
export function mountMarks(ctx, { kind = KIND } = {}) {
  const style = document.createElement('style');
  style.textContent = `
    #marks { z-index: 1; display: none; pointer-events: none; }
    #marks.on { display: block; }
    #marks > canvas { position: absolute; display: block; pointer-events: none; will-change: left, top; }
  `;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'marks';
  ctx.dom.overlay.appendChild(root);

  const els = new Map(); // key -> canvas
  const boxes = new Map(); // key -> the box it is drawn at, for walk.js's tap target
  let cutAt = '';
  let plates = null;
  let S = markSize(ctx.size?.h);

  function cut() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    S = markSize(ctx.size?.h || window.innerHeight);
    const key = `${kind}|${S.d}@${dpr}`;
    if (key === cutAt && plates) return;
    cutAt = key;
    plates = [strike(kind, S.d, S.pen, 0, dpr), strike(kind, S.d, S.pen, 1, dpr)];
    for (const c of els.values()) {
      c.width = Math.round(S.d * dpr);
      c.height = Math.round(S.d * dpr);
      c.style.width = `${S.d}px`;
      c.style.height = `${S.d}px`;
      c.dataset.parity = '';
    }
  }

  function elFor(key) {
    let c = els.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(S.d * dpr);
    c.height = Math.round(S.d * dpr);
    c.style.width = `${S.d}px`;
    c.style.height = `${S.d}px`;
    c.dataset.key = key;
    root.appendChild(c);
    els.set(key, c);
    return c;
  }

  return {
    root,
    get size() {
      return { ...S };
    },
    get kind() {
      return kind;
    },
    update({ show, parity, spots = [] }) {
      root.classList.toggle('on', !!show && spots.length > 0);
      if (!show || !spots.length) {
        boxes.clear();
        for (const c of els.values()) c.style.display = 'none';
        return;
      }
      cut();
      const seen = new Set();
      for (const s of spots) {
        if (!s || !Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
        seen.add(s.key);
        const c = elFor(s.key);
        c.style.display = 'block';
        c.style.left = `${Math.round(s.x - S.d / 2)}px`;
        c.style.top = `${Math.round(s.y - S.d / 2)}px`;
        const p = String(parity ? 1 : 0);
        if (c.dataset.parity !== p) {
          c.dataset.parity = p;
          const g = c.getContext('2d');
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.clearRect(0, 0, c.width, c.height);
          g.drawImage(plates[parity ? 1 : 0], 0, 0);
        }
        boxes.set(s.key, { x: s.x - S.d / 2, y: s.y - S.d / 2, w: S.d, h: S.d });
      }
      for (const [key, c] of els) {
        if (seen.has(key)) continue;
        c.style.display = 'none';
        boxes.delete(key);
      }
    },
    // the box a mark is DRAWN at this drawing, for the tap target and for a proof. Null when it is
    // not in the picture — which is the only reason walk.js ever grows a target.
    boxOf(key) {
      return boxes.has(key) ? { ...boxes.get(key) } : null;
    },
    keys() {
      return [...boxes.keys()];
    },
    resize() {
      cutAt = '';
      for (const c of els.values()) c.dataset.parity = '';
    },
  };
}

// Whether this window has a cursor in it. Listened to rather than read once: a folio keyboard can
// be clipped to a tablet halfway through an evening, and the room should stop drawing over itself
// the moment there is a pointer to do the telling.
export function watchPointer(onChange) {
  const mql = window.matchMedia?.('(any-pointer: fine)') ?? null;
  const read = () => !(mql ? mql.matches : true);
  if (mql?.addEventListener) mql.addEventListener('change', () => onChange?.(read()));
  return read;
}
