// walk-marks — THE RINGS ON THE FLOOR THAT SAY WHERE A VISITOR MAY STAND.
//
// The user, first: "choosing the fireplace, piano and book section on mobile is quite hard to do …
// it's actually where to tap on the phone. I think a drawn mark would be good."
// The user, correcting the first cut of it: "Only use marks in the room to specify where users can
// go, preferably on the floor. The individual objects that can be clicked should not be marked
// because users should discover them by themselves."
//
// So this file draws ONE KIND OF THING and nothing else: a ring chalked on the floorboards at the
// spot a visitor would stand to be at a place. Five of them, one per place. Nothing is ever drawn on
// an object — not the grate, not the keys, not the book, not the door leaf, and not on any egg. The
// first cut marked the thing to act on at each place and the user was right to take it off: a room
// that points at its own contents has nothing left to find, and the whole of this film's manner is
// that the cursor over the radio IS the affordance. What a phone lacks is not a list of what can be
// touched — it is the floor plan. A ring on the boards is a floor plan and nothing more.
//
// ---- WHICH WINDOWS GET THEM --------------------------------------------------------------------
// A WINDOW WITH NO FINE POINTER AT ALL — `matchMedia('(any-pointer: fine)')` false — and not
// `(pointer: coarse)`, which is the obvious test and the wrong one. A touchscreen laptop and an iPad
// with a trackpad both report a coarse PRIMARY pointer at times and both have a cursor on the glass;
// marking the room for them would be drawing over a picture to say what the picture already says.
// `any-pointer` asks the question the user actually asked: is there a cursor in this room or is
// there not. Measured on the live page (tools/_walk-marks-proof.mjs, CURSOR, which reads the four
// queries off each window rather than taking this piece's word for it): a 1280x800 mouse window
// answers any-pointer:fine true / pointer:coarse false, and a 390x844 touch window answers false /
// true. The query is LISTENED to, not read once, because a keyboard folio can be clipped to a tablet
// halfway through an evening.
//
// `?marks=1` overrides that test and only that test — a tool on a laptop can see them. `?marks=0`
// refuses them on any window, which is what tools/_walk-proof.mjs needs: every page that proof opens
// is opened WITH TOUCH, so it now walks a marked room, and a claim that comes out differently there
// than it did last round has to be askable which of the two it was looking at.
//
// ---- WHY IT IS PROJECTED AND NOT A SHEET IN THE SCENE ------------------------------------------
// Two ways to put a ring on a floor. A flat mesh lying on the boards, passing the ink pass with
// everything else; or the ring's own circle taken through the live camera and struck on the DOM
// layer over the frame. This is the second, and the reason is that the second IS the first's
// arithmetic without the first's risks:
//
//   · IT IS A TRUE CIRCLE, NOT AN ELLIPSE ANYBODY GUESSED. 48 points are laid round a 0.34 m circle
//     in the floor plane at y = 0 and every one of them is put through `camera.project`. What lands
//     on the glass is the perspective image of a circle on the floor — exactly what a mesh would
//     have rendered, to the pixel, at every pan and every window shape, with no second copy of the
//     projection maths to keep in step. And it is PROVED by inverting itself: the proof takes every
//     drawn pixel of the ring, casts the ray from the lens through it, meets that ray with the plane
//     y = 0, and asks whether what comes back is a 0.17 m radius about the place's standing spot. It
//     is, to under a millimetre. An ellipse somebody drew to look right would not survive that.
//   · IT IS A CONTROL, AND CONTROLS IN THIS ROOM ARE NOT IN THE ROOM. The chevrons are drawn on this
//     same layer for this same reason (camera-pan.js). A mesh in the scene would cast the key's
//     shadow, take the lighting's evening, appear in every tool's judged frame of `room` and `ink`,
//     and have to be hidden from six pieces that do not know it exists. A drawn overlay is hidden by
//     one class.
//   · AND THE INK PASS IS NOT ITS PEN ANYWAY. What makes a line in this film is `inkLine` and a
//     shaking nib, which is what draws the ring here, on the twelves, off two seeds. The pass over
//     the scene is contour and tone for three-dimensional things; a chalk ring has no tone.
//
// THE ONE THING A SHEET WOULD HAVE DONE BETTER is occlusion: a mesh behind the table would be hidden
// by the table, and a drawn ring is not. Looked at, at 390x844, one tap either way and from the
// chair — the five standing spots are the open floor IN FRONT of the five things, and the only
// furniture near the middle of the room is the round table, whose rim is 0.62 m from the room's axis
// while the nearest of these spots passes 1.34 m from it. Nothing stands between a visitor and the
// floor they are being shown. It is written down because it is a thing that could stop being true if
// a chair moved.
//
// ---- THE RING ----------------------------------------------------------------------------------
// 0.34 m across the boards, which is a shoe and a little: struck in a bed of paper and then twice in
// ink, with a gap at four o'clock and the hand going round again over the near half, the way anybody
// draws a circle on the ground. Three short scuff ticks inside the near rim. No dot, no arrow, no
// lettering — an arrow is a direction and this room's chevrons already mean «there is more of the
// room this way», and a small circle with an arrowhead in it is the DOWNLOAD button on every page
// anybody has ever used, both of which the first cut of this file learnt by drawing them and
// looking. What the ring says is the one thing it should: somebody may stand here.
//
// IT FORESHORTENS, AND THAT IS THE POINT. Measured at 390x844, one chevron tap off square, the three
// spots on the stage-left side come out 73 to 90 px across their major axis and 15 to 22 across their
// minor — aspects of 0.20 to 0.25, which is what a floor looks like from an eye at 1.62 m. A mark
// that stayed round would be a sticker on the lens. What keeps it reachable is not the drawing: THE
// TAP TARGET IS THE RING'S BOX GROWN TO 44 PX (walk.js, `markTap`), so a ring 15 px tall is still a
// thumb's worth of room, which is what every switch in this room is given.
import { INK, PAPER, inkLine } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';

// metres. A ring a shoe across: big enough to read at the far end of a 390 px frame, small enough
// that two of them never touch — the nearest pair of standing spots is the piano's and the case's at
// 0.68 m, so two 0.34 m rings leave a third of a metre of bare board between their edges.
export const RING_R = 0.17;
const SEGMENTS = 48;
const MIN_PEN = 2.0;

// The pen this window draws with, and the least the mark may measure on the glass before it is not
// worth drawing at all. A ring under 10 px is a smudge; the place keeps its own hotspot regardless.
export function markSize(h) {
  const s = Math.max(1, Math.min(1.12, (h || 844) / 844));
  return { pen: Math.max(MIN_PEN, 2.6 * s), least: 10 };
}

/**
 * A circle of radius `r` metres laid flat on the floor at world (x, 0, z), taken through the live
 * camera. Returns the screen points in css px, or null when any part of it is behind the lens —
 * which is the same rule walk.js's `box` keeps, and for the same reason: `project()` on a point
 * behind the camera divides by a negative w and lands it on the far side of the frame.
 */
export function floorRing(ctx, x, z, r = RING_R, n = SEGMENTS) {
  const cam = ctx.camera;
  if (!cam) return null;
  const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
  const v = new ctx.THREE.Vector3();
  cam.updateMatrixWorld();
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    v.set(px, 0, pz).applyMatrix4(cam.matrixWorldInverse);
    if (v.z > -cam.near) return null; // behind the lens: there is no ring
    v.set(px, 0, pz).project(cam);
    pts.push([((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H]);
  }
  return pts;
}

// The box a set of screen points sits in.
export function bboxOf(pts) {
  if (!pts || !pts.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * Strike the ring into `g`, in the canvas's own coordinates (the caller has already translated so
 * that the box's top-left is the origin). `parity` picks the nib, which is the whole of the boil.
 */
export function strike(g, pts, pen, parity, ox, oy) {
  const at = (i) => [pts[(i + pts.length) % pts.length][0] - ox, pts[(i + pts.length) % pts.length][1] - oy];
  const n = pts.length;
  // THE GAP, at four o'clock: a quarter of the way round from the bottom, seven segments of it, so
  // the ring is a thing a hand drew and not a thing a compass did.
  const gapAt = Math.round(n * 0.12), gapLen = Math.max(2, Math.round(n * 0.09));
  // One stroke of the hand: the same jittered path can be laid twice — once in paper, once in ink —
  // because the nib is re-seeded per pass rather than shared. A halo that wandered off its own line
  // would be a second ring, not a bed for the first.
  const pass = (from, count, width, alpha, drift, seed, color = INK) => {
    const rng = mulberry32(seed);
    g.save();
    g.strokeStyle = color;
    g.globalAlpha = alpha;
    g.lineWidth = width;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    for (let k = 0; k <= count; k++) {
      const [x, y] = at(from + k);
      const jx = x + (rng() - 0.5) * 2 * drift, jy = y + (rng() - 0.5) * 2 * drift;
      k ? g.lineTo(jx, jy) : g.moveTo(jx, jy);
    }
    g.stroke();
    g.restore();
  };
  const s1 = parity ? 0x5c17 : 0xa20b, s2 = parity ? 0x2d41 : 0x8ef3;
  // THE PAPER UNDER IT FIRST, on the ink pass's own path. A 2.6 px ink line on floorboards is one
  // more line among the boards' grain, their seams and the rug's border — looked at, at 390x844, and
  // the first cut of this read as a scratch in the drawing rather than as a mark on the floor. So
  // the ring is laid down once in PAPER at two and a half times the nib, which is what an inked cel
  // does where one line crosses another: it cuts a clean bed for the stroke and puts the boards back
  // either side of it. The ink goes over that, and the ring reads at the far end of a phone frame.
  pass(gapAt + gapLen, n - gapLen, pen * 2.5, 0.92, pen * 0.4, s1, PAPER);
  // once round, all but the gap…
  pass(gapAt + gapLen, n - gapLen, pen * 1.05, 1, pen * 0.4, s1);
  // …and the hand going round again over the near half, which is what a chalked ring looks like
  pass(Math.round(n * 0.45), Math.round(n * 0.42), pen * 0.8, 0.75, pen * 0.5, s2);

  // THREE SHORT SCUFFS AT THE NEAR EDGE, and they are at the edge rather than across the middle for
  // a reason the first cut of this found by looking: a ring on a floor is an ellipse a fifth as tall
  // as it is wide, so ANY chord drawn through its centre lies along the major axis and reads as a
  // bar — a ring with a line through it, which in every language means «not here». The scuffs are
  // therefore short radial ticks just inside the rim nearest the viewer, where a shoe would actually
  // leave them, and they say the boards have been stood on without saying anything else.
  const put = mulberry32(parity ? 0x31f7 : 0x7b02);
  let near = 0, maxY = -Infinity, cx = 0, cy = 0;
  for (let i = 0; i < n; i++) {
    const [x, y] = at(i);
    cx += x / n;
    cy += y / n;
    if (y > maxY) {
      maxY = y;
      near = i;
    }
  }
  for (let s = -1; s <= 1; s++) {
    const [px, py] = at(near + s * Math.round(n * 0.07));
    const t = 0.20 + put() * 0.14; // how far in from the rim the tick runs
    inkLine(g, px, py, px + (cx - px) * t, py + (cy - py) * t, { width: pen * 0.5, wobble: 0.5, rng: put, alpha: 0.45 });
  }
}

/**
 * Mount the mark layer in the overlay. `update({ show, parity, marks })` — `marks` is
 * [{ key, pts }], the projected rings that are in the picture this drawing.
 *
 * The layer takes NO pointer events. That is the room's one-arbiter rule: a mark with a listener of
 * its own would be a second control that can answer the same tap as the place under it. The mark is
 * a DRAWING of a target; walk.js's hotspot is the target.
 */
export function mountMarks(ctx) {
  const style = document.createElement('style');
  style.textContent = `
    #marks { z-index: 1; display: none; pointer-events: none; }
    #marks.on { display: block; }
    #marks > canvas { position: absolute; display: block; pointer-events: none; }
  `;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'marks';
  ctx.dom.overlay.appendChild(root);

  const els = new Map();
  const boxes = new Map();
  const rings = new Map();

  function elFor(key) {
    let c = els.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.dataset.key = key;
    root.appendChild(c);
    els.set(key, c);
    return c;
  }

  return {
    root,
    update({ show, parity, marks = [] }) {
      root.classList.toggle('on', !!show && marks.length > 0);
      if (!show || !marks.length) {
        boxes.clear();
        rings.clear();
        for (const c of els.values()) c.style.display = 'none';
        return;
      }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const { pen } = markSize(ctx.size?.h || window.innerHeight);
      const m = Math.ceil(pen * 3); // the margin the nib's drift and the round caps need
      const seen = new Set();
      for (const mk of marks) {
        const b = bboxOf(mk.pts);
        if (!b) continue;
        seen.add(mk.key);
        const c = elFor(mk.key);
        const w = Math.ceil(b.w) + m * 2, h = Math.ceil(b.h) + m * 2;
        const ox = b.x - m, oy = b.y - m;
        if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
          c.width = Math.round(w * dpr);
          c.height = Math.round(h * dpr);
        }
        c.style.width = `${w}px`;
        c.style.height = `${h}px`;
        c.style.left = `${Math.round(ox)}px`;
        c.style.top = `${Math.round(oy)}px`;
        c.style.display = 'block';
        const g = c.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, h);
        strike(g, mk.pts, pen, parity, ox, oy);
        boxes.set(mk.key, { ...b });
        rings.set(mk.key, mk.pts);
      }
      for (const [key, c] of els) {
        if (seen.has(key)) continue;
        c.style.display = 'none';
        boxes.delete(key);
        rings.delete(key);
      }
    },
    // the ring's own box on the glass this drawing, for the tap target and for a proof
    boxOf(key) {
      return boxes.has(key) ? { ...boxes.get(key) } : null;
    },
    // the projected ring itself, so a proof can measure its axes rather than trust its box
    ringOf(key) {
      return rings.has(key) ? rings.get(key).map(([x, y]) => [x, y]) : null;
    },
    keys() {
      return [...boxes.keys()];
    },
    resize() {
      for (const c of els.values()) {
        c.width = 0;
        c.height = 0;
      }
    },
  };
}

// Whether this window has a cursor in it. Listened to rather than read once: a folio keyboard can be
// clipped to a tablet halfway through an evening, and the room should stop drawing over itself the
// moment there is a pointer to do the telling.
export function watchPointer(onChange) {
  const mql = window.matchMedia?.('(any-pointer: fine)') ?? null;
  const read = () => !(mql ? mql.matches : true);
  if (mql?.addEventListener) mql.addEventListener('change', () => onChange?.(read()));
  return read;
}
