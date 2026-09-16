// camera-pan — THE TWO CHEVRONS A NARROW WINDOW LOOKS ROUND THE ROOM WITH.
//
// The pan itself is camera.js's (THE PAN); this file is only the control, and it exists because a
// gesture nobody can see is not a control. Everything else in this room is worked by the thing
// itself — the cursor over the radio is the whole affordance — but a phone's frame holds 2.0 m of
// a 5.2 m wall and the two ends of the room are not IN it to be pointed at. So the room draws the
// one thing it has never drawn: a mark that says there is more this way.
//
// It is kept as small as that idea. Two chevrons, one at each edge, on a slip of the room's own
// paper — see the note over `strike` for why the mark alone would not do — struck twice so they
// boil on the twelves like every other line in the film. No circle, no label, no shadow, no colour,
// and nothing at all on a window wide enough to hold the room, which is every laptop at 16:9 and
// 16:10 (the arithmetic is in camera.js's `panNeeded`: a 1280x800 frame reaches 3.57 m either side
// of the room's axis at the back wall against a room 2.6 m wide, and a 390x844 one reaches 1.00).
// 30 x 50 px on a phone, which is a hundredth of the frame.
//
// AND A CHEVRON AT ITS OWN LIMIT IS STRUCK SET BACK — a third of the ink — which is the language
// the notice already uses for a control with nothing to do (help-bill.js, SET_BACK). Not hidden,
// not greyed: a printer with one colour of ink and a light hand.
import { INK, PAPER, inkLine } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';

const SET_BACK = 0.32;
// 30 x 50 px on a phone: a thumb's own 44 in the direction that matters and a little over half of
// it in the direction that does not, with the slip's own margin taken off. It grows a little on a
// big window and never past 39 x 65.
const size = (h) => {
  const s = Math.max(1, Math.min(1.3, h / 844));
  return { w: Math.round(30 * s), h: Math.round(50 * s), pen: Math.max(1.6, 2.2 * s) };
};

// ONE CHEVRON, AND IT IS ON A SLIP OF PAPER. The first cut of this struck the mark straight onto the
// room and it could not be read: a 2 px ink chevron standing over the tall case's spines, the
// window's glazing bars or the rug's border is one more line among forty, and at the frame's edge —
// which is where the room's drawing is busiest — it disappeared entirely. Looked at, at 390x844,
// panned hard over both ways.
//
// The room already owns the answer and it is the notice's and the book's: a SHEET LYING ON TOP,
// which is paper, a drawn cut edge, and a tight band of strokes outside the edges that are nearest
// the viewer. That is not a UI panel; it is the scrap of paper an animator tapes at the edge of a
// pan with an arrow on it, which is the most literally correct object this control could be.
function strike(w, h, pen, dir, parity, alpha, dpr) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const nib = mulberry32(parity ? 0x3f21 : 0x91ae);
  const put = mulberry32(0x6b20d);
  const wob = pen * 0.45;
  const m = pen * 1.6; // the band the drop-hatch runs in, outside the sheet
  const x0 = m, y0 = m, x1 = w - m, y1 = h - m;
  // the marks that say the slip is lying on the room: a few strokes off the bottom and the INNER
  // edge — the two the light in this film has always come from
  for (let i = 0; i < 16; i++) {
    const x = x0 + put() * (x1 - x0);
    if (put() < 0.35) continue;
    inkLine(g, x, y1 + 0.4, x + (put() - 0.5) * 1.2, y1 + m * (0.3 + 0.7 * put()), { width: pen * 0.45, wobble: 0.3, rng: put, alpha: 0.45 });
  }
  const inner = dir < 0 ? x1 : x0, sign = dir < 0 ? 1 : -1;
  for (let i = 0; i < 18; i++) {
    const y = y0 + put() * (y1 - y0);
    if (put() < 0.35) continue;
    inkLine(g, inner + sign * 0.4, y, inner + sign * m * (0.3 + 0.7 * put()), y + (put() - 0.5) * 1.2, { width: pen * 0.45, wobble: 0.3, rng: put, alpha: 0.45 });
  }
  // the paper, and its own cut edge
  g.fillStyle = PAPER;
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  const edge = (ax, ay, bx, by) => inkLine(g, ax, ay, bx, by, { width: pen * 0.6, wobble: 0.8, rng: nib, color: INK, alpha });
  edge(x0, y0, x1, y0);
  edge(x1, y0, x1, y1);
  edge(x1, y1, x0, y1);
  edge(x0, y1, x0, y0);
  // …and the mark itself, three points and a pen that shakes
  const ax = dir < 0 ? w * 0.68 : w * 0.32;
  const bx = dir < 0 ? w * 0.34 : w * 0.66;
  const pts = [[ax, h * 0.26], [bx, h * 0.5], [ax, h * 0.74]];
  g.save();
  g.strokeStyle = INK;
  g.globalAlpha = alpha;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  pts.forEach(([px, py], i) => {
    const jx = px + (nib() - 0.5) * 2 * wob, jy = py + (nib() - 0.5) * 2 * wob;
    i ? g.lineTo(jx, jy) : g.moveTo(jx, jy);
  });
  g.lineWidth = pen * (1.15 + nib() * 0.2);
  g.stroke();
  g.restore();
  return c;
}

/**
 * Mount the two chevrons in the overlay. `onPan(dir)` is called with −1 for the left one and +1 for
 * the right. `update({ show, left, right, parity })` says whether they are in the picture at all and
 * whether each still has anywhere to go.
 */
export function mountChevrons(ctx, onPan) {
  const style = document.createElement('style');
  style.textContent = `
    #pan { z-index: 1; display: none; pointer-events: none; }
    #pan.on { display: block; }
    #pan > button {
      position: absolute; top: 50%; transform: translateY(-50%);
      margin: 0; padding: 0; border: 0; background: none; cursor: pointer;
      pointer-events: auto; -webkit-tap-highlight-color: transparent;
      display: block; line-height: 0;
    }
    #pan > button.l { left: 10px; }
    #pan > button.r { right: 10px; }
    #pan > button > canvas { display: block; }
  `;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'pan';
  const els = {};
  for (const side of ['l', 'r']) {
    const b = document.createElement('button');
    b.className = side;
    b.type = 'button';
    b.setAttribute('aria-label', side === 'l' ? 'look left' : 'look right');
    const c = document.createElement('canvas');
    b.appendChild(c);
    b.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation();
      ctx.pieces?.sound?.start?.();
      onPan(side === 'l' ? -1 : 1);
    });
    root.appendChild(b);
    els[side] = { b, c };
  }
  ctx.dom.overlay.appendChild(root);

  let cutAt = '';
  let plates = null;
  function cut() {
    const h = ctx.size?.h || window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const S = size(h);
    const key = `${S.w}x${S.h}@${dpr}`;
    if (key === cutAt && plates) return { S, plates };
    cutAt = key;
    plates = {};
    for (const dir of [-1, 1]) {
      for (const live of [0, 1]) {
        for (const parity of [0, 1]) {
          plates[`${dir}|${live}|${parity}`] = strike(S.w, S.h, S.pen, dir, parity, live ? 1 : SET_BACK, dpr);
        }
      }
    }
    for (const side of ['l', 'r']) {
      els[side].c.width = Math.round(S.w * dpr);
      els[side].c.height = Math.round(S.h * dpr);
      els[side].c.style.width = `${S.w}px`;
      els[side].c.style.height = `${S.h}px`;
    }
    return { S, plates };
  }

  let painted = '';
  return {
    root,
    update({ show, left, right, parity }) {
      root.classList.toggle('on', !!show);
      if (!show) return;
      const { S, plates: P } = cut();
      const key = `${cutAt}|${left ? 1 : 0}${right ? 1 : 0}|${parity ? 1 : 0}`;
      if (key === painted) return;
      painted = key;
      for (const [side, dir, live] of [['l', -1, left], ['r', 1, right]]) {
        const g = els[side].c.getContext('2d');
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, els[side].c.width, els[side].c.height);
        g.drawImage(P[`${dir}|${live ? 1 : 0}|${parity ? 1 : 0}`], 0, 0);
        void S;
        void dpr;
      }
    },
    // for a proof: where the two marks are on the glass
    boxes() {
      if (!root.classList.contains('on')) return null;
      const r = ctx.renderer?.domElement?.getBoundingClientRect();
      const out = {};
      for (const side of ['l', 'r']) {
        const b = els[side].b.getBoundingClientRect();
        out[side] = { x: b.left - (r?.left ?? 0), y: b.top - (r?.top ?? 0), w: b.width, h: b.height };
      }
      return out;
    },
    resize() {
      cutAt = '';
      painted = '';
    },
  };
}
