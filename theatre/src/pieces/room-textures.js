// room-textures — the PATTERNS the parlour is made of, drawn with a pen on paper: a sparse
// wallpaper motif in loose rows, a Greek-key frieze, tongue-and-groove wainscot, floorboards,
// wood grain. Pattern only: no shading, no object outlines (the ink pass draws tone and edges
// where the geometry has them). Every texture is drawn at a fixed physical size (metres per
// tile) so surfaces can share one hand: meshes map their UVs in world metres and the texture
// repeats. The pen here is deliberately fat (5–7 px at 1000 ppm ≈ 6 mm): at the wide shot the
// back wall is ~200 px/m, so a 6 mm stroke lands at ~1.2 px — the same weight the ink pass
// draws its outlines with. A finer pen mip-blends into a grey screen.
import * as THREE from 'three';
import { INK, PAPER, drawTexture, paper, inkLine, letter } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';

const px = (m, ppm) => m * ppm;

// A small pen stroke path with wobble (for motifs). pts in px, drawn in the current transform.
function penPath(g, pts, { width = 3, wobble = 1.2, rng = Math.random, alpha = 0.8, color = INK, close = false } = {}) {
  g.save();
  g.strokeStyle = color;
  g.globalAlpha = alpha;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = width * (0.85 + rng() * 0.3);
  g.beginPath();
  pts.forEach(([x, y], i) => {
    const jx = x + (rng() - 0.5) * 2 * wobble, jy = y + (rng() - 0.5) * 2 * wobble;
    if (i === 0) g.moveTo(jx, jy);
    else g.lineTo(jx, jy);
  });
  if (close) g.closePath();
  g.stroke();
  g.restore();
}

// A smooth pen curve through points (Catmull-Rom → bezier), with a little wobble per knot.
function penCurve(g, pts, { width = 3, wobble = 1.2, rng = Math.random, alpha = 0.8, color = INK } = {}) {
  const p = pts.map(([x, y]) => [x + (rng() - 0.5) * 2 * wobble, y + (rng() - 0.5) * 2 * wobble]);
  g.save();
  g.strokeStyle = color;
  g.globalAlpha = alpha;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = width * (0.85 + rng() * 0.3);
  g.beginPath();
  g.moveTo(p[0][0], p[0][1]);
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    g.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
  }
  g.stroke();
  g.restore();
}

function ring(g, x, y, r, { rng = Math.random, alpha = 0.85, color = INK, width = 3 } = {}) {
  g.save();
  g.strokeStyle = color;
  g.globalAlpha = alpha;
  g.lineWidth = width * (0.85 + rng() * 0.3);
  g.lineCap = 'round';
  g.beginPath();
  // an open circle, the way a pen draws one: starts and ends a few degrees apart
  const a0 = rng() * Math.PI * 2, span = Math.PI * 2 * (0.9 + rng() * 0.12);
  const rx = r * (0.92 + rng() * 0.16), ry = r * (0.92 + rng() * 0.16);
  g.ellipse(x + (rng() - 0.5), y + (rng() - 0.5), rx, ry, rng() * Math.PI, a0, a0 + span);
  g.stroke();
  g.restore();
}

function dot(g, x, y, r, { rng = Math.random, alpha = 0.85, color = INK } = {}) {
  g.save();
  g.fillStyle = color;
  g.globalAlpha = alpha;
  g.beginPath();
  g.ellipse(x + (rng() - 0.5), y + (rng() - 0.5), r * (0.9 + rng() * 0.2), r * (0.9 + rng() * 0.2), rng() * Math.PI, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// The wallpaper motif: a sprig — a bent stem, two pairs of leaves each a single closed stroke (a
// pointed ellipse), a cluster of three berries at the tip. Drawn in local coords, stem base at
// (0, +s/2), tip at (0, -s/2). Each call is a fresh hand: the leaf angles, the stem bend and the
// pen weight all vary. Kept OPEN — big leaves, no midribs — so that from across the room it still
// reads as a drawn sprig and not a dark fleck.
function sprig(g, s, rng, { alpha = 0.8, width = 5 } = {}) {
  const w = width * (0.85 + rng() * 0.3);
  const o = { width: w, wobble: s * 0.012, rng, alpha };
  const bend = (rng() - 0.5) * s * 0.24;
  // stem: a gentle S, base at the bottom, tip near the top
  const stem = (t) => [bend * Math.sin(t * Math.PI), s * (0.5 - t * 0.88)]; // t 0..1 → base..tip
  penCurve(g, [stem(0), stem(0.3), stem(0.6), stem(1)], o);
  // leaves: four, alternating sides, each a closed loop drawn as one stroke
  const n = 4;
  for (let i = 0; i < n; i++) {
    const t = 0.14 + (i / n) * 0.66;
    const side = i % 2 ? 1 : -1;
    const [bx, by] = stem(t);
    const tilt = -Math.PI / 2 + side * (1.0 + (rng() - 0.5) * 0.45) - (1 - t) * 0.25 * side; // lower leaves droop more
    const L = s * (0.36 + rng() * 0.08) * (1 - t * 0.3);
    const tx = bx + Math.cos(tilt) * L, ty = by + Math.sin(tilt) * L;
    const nx = -Math.sin(tilt) * L * 0.34, ny = Math.cos(tilt) * L * 0.34;
    const mx = (bx + tx) / 2, my = (by + ty) / 2;
    penCurve(g, [[bx, by], [mx + nx * 0.95, my + ny * 0.95], [tx, ty], [mx - nx * 0.95, my - ny * 0.95], [bx, by]], { ...o, width: w * 0.9 });
  }
  // a cluster of three berries at the tip, one filled
  const [tipx, tipy] = stem(1);
  const r = s * 0.055;
  ring(g, tipx - r * 1.6, tipy - r * 0.4, r, { rng, alpha, width: w * 0.9 });
  ring(g, tipx + r * 1.6, tipy - r * 0.3, r, { rng, alpha, width: w * 0.9 });
  ring(g, tipx, tipy - r * 2.2, r, { rng, alpha, width: w * 0.9 });
  const which = Math.floor(rng() * 3);
  const bx = [tipx - r * 1.6, tipx + r * 1.6, tipx][which], by = [tipy - r * 0.4, tipy - r * 0.3, tipy - r * 2.2][which];
  dot(g, bx, by, r * 0.6, { rng, alpha });
}

// THE LATTICE THE SPRIG SITS ON, WRITTEN IN WORLD METRES.
//
// It used to live inside the tile — two motifs across a 1.02 m square, two rows up, the odd row
// shifted half a pitch — and that is still exactly what it draws. But the room now has to draw the
// SAME rows twice: once as the tiling paper that covers the whole back wall, and once, at full
// strength, inside the rectangle where the tall multiple stood (see `ghostTexture`). Two drawings
// only land on top of each other if they agree about where a sprig is in the ROOM, not about where
// it is in a tile — hence rows at world y ≡ 0.255 and 0.765, columns every 0.51 m, and a hand per
// (row parity, column parity) so the wrap copies keep coming out of the same wrist.
// `visit` is handed world coordinates; the caller turns them into canvas pixels.
const PITCH = 0.51; // motif pitch, both axes (the tile is two pitches square)
const MOTIF = 0.21; // motif height, metres
function eachSprig(x0, x1, y0, y1, seed, visit) {
  const rng0 = mulberry32(seed);
  const n0 = Math.floor((y0 - 0.255) / PITCH), n1 = Math.ceil((y1 - 0.255) / PITCH);
  for (let n = n0; n <= n1; n++) {
    // rows at y ≡ 0.255 (mod 1.02) are the shifted ones; the hand is chosen by parity, so the
    // pattern repeats every 1.02 m in both axes however far it is drawn
    const shifted = (((n % 2) + 2) % 2) === 0;
    const jj = shifted ? 1 : 0;
    const rowY = 0.255 + n * PITCH;
    const off = shifted ? PITCH / 2 : 0;
    const m0 = Math.floor((x0 - 0.255 - off) / PITCH), m1 = Math.ceil((x1 - 0.255 - off) / PITCH);
    for (let m = m0; m <= m1; m++) {
      const ii = ((m % 2) + 2) % 2;
      const rng = rng0.fork(1000 + jj * 17 + ii * 3);
      // the draw order is the hand's: its fate, its drift, its tilt, its size, then the sprig
      const fate = rng();
      const cx = 0.255 + off + m * PITCH + (rng() - 0.5) * 0.016;
      const cy = rowY - (rng() - 0.5) * 0.016;
      const rot = (rng() - 0.5) * 0.24; // ±7°
      const size = MOTIF * (0.9 + rng() * 0.2);
      visit({ cx, cy, rot, size, fate, rng });
    }
  }
}

// Wallpaper: one motif in loose offset rows on bare paper. Tile 1.02 m; two motifs across
// (pitch 0.51 m), two rows up, every second row shifted half a pitch; each instance is drawn
// separately with its own drift, tilt and pen weight. Everything between motifs is untouched
// paper — well over four fifths of it.
//
// This is the FLAT's paper, hung before the exchange was ever put in the room, and it has had
// forty years of window on it: `drop` and `fade` are what is left of the print. They used to be
// one in ten missing or faded; they are one in four now, because the rectangle the tall multiple
// covered is drawn separately (`ghostTexture`) and kept at full strength. The paper is the
// control; the ghost is the sample that was never exposed.
export function wallpaperTexture({ tile = 1.02, ppm = 1000, seed = 21, drop = 0.12, fade = 0.32, pen = 0.005, alpha = 0.8 } = {}) {
  const size = Math.round(tile * ppm);
  const tex = drawTexture(
    size,
    size,
    (g, w, h) => {
      paper(g, w, h, PAPER, { grain: 0, seed });
      eachSprig(0, tile, 0, tile, seed, ({ cx, cy, rot, size: s, fate, rng }) => {
        if (fate < drop) return; // the paper-hanger's blank, and what the light took
        g.save();
        g.translate(px(cx, ppm), px(tile - cy, ppm)); // canvas y runs down; world y runs up
        g.rotate(rot);
        sprig(g, px(s, ppm), rng, { alpha: fate < fade ? alpha * 0.56 : alpha, width: px(pen, ppm) });
        g.restore();
      });
    },
    { seed },
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.userData.tile = tile;
  return tex;
}

// THE GHOST. One sheet of paper for one place on the wall: the rectangle the tall multiple stood
// against, unbolted and taken for scrap when the automatic exchange came in. It is not a mark
// added to the wall — it is the wall with nothing taken off it. Inside the rectangle every sprig
// is present and drawn at full pen weight, because the paper here never saw the window; outside it
// the same rows are the faded ones `wallpaperTexture` draws. Same lattice, same hands, same phase,
// so the boundary cuts THROUGH the pattern instead of framing it, and there is no line round it:
// what states the rectangle is four bolt holes and two cut cable ends, and the rest is tone.
//
// The pen is fatter here — 13 mm against the paper's 5 — and it was measured, not chosen. The back
// wall runs about 200 px to the metre in the home frame, so the paper's 5 mm stroke lands at one
// pixel; the ink pass throws away any mark with no dark neighbour a nib away, on the grounds that
// a lone dark pixel is not a stroke but what the minifier made of one, and it is right. That rule
// is why the wallpaper has been an invisible drawing on a blank wall for four rounds. At 13 mm the
// stroke lands at two and a half pixels, which is the weight the pass draws its own contours at,
// and the sprigs inside the rectangle survive being looked at from a chair across the room. The
// paper outside stays where it was: it faded, and a faded print is a mark that does not quite
// arrive, which is exactly what one pixel of pen does here.
export function ghostTexture({ x0, x1, y0, y1, ppm = 640, seed = 21, pen = 0.013 } = {}) {
  const w = Math.round((x1 - x0) * ppm), h = Math.round((y1 - y0) * ppm);
  const X = (mx) => px(mx - x0, ppm);
  const Y = (my) => px(y1 - my, ppm);
  const tex = drawTexture(
    w,
    h,
    (g, cw, ch, rng0) => {
      paper(g, cw, ch, PAPER, { grain: 0, seed });
      eachSprig(x0 - 0.3, x1 + 0.3, y0 - 0.3, y1 + 0.3, seed, ({ cx, cy, rot, size: s, rng }) => {
        g.save();
        g.translate(X(cx), Y(cy));
        g.rotate(rot);
        sprig(g, px(s, ppm), rng, { alpha: 0.85, width: px(pen, ppm) });
        g.restore();
      });
      // FOUR BOLT HOLES, in a rectangle, where the frame was through-bolted into the brick. A hole
      // is solid: a filled disc, a burst of plaster round it where the bolt was pulled rather than
      // undone, and nothing else. They are what tells the eye the rectangle is a rectangle.
      // (1.14, not 1.02: below that the chest's lamp and its vase of dried stems stand in front of
      // the wall and a hole drawn behind them is a hole nobody sees)
      const r = px(0.019, ppm);
      for (const bx of [-0.4, 0.4])
        for (const by of [1.14, 1.7]) {
          const rng = rng0.fork(Math.round((bx + 2) * 100 + by * 10));
          const hx = X(bx), hy = Y(by);
          dot(g, hx, hy, r, { rng, alpha: 0.98 });
          for (let k = 0; k < 5; k++) {
            const a = rng() * Math.PI * 2, l = r * (1.5 + rng() * 1.3);
            inkLine(g, hx + Math.cos(a) * r * 1.1, hy + Math.sin(a) * r * 1.1, hx + Math.cos(a) * l, hy + Math.sin(a) * l, { width: px(0.008, ppm), wobble: 1.2, rng, alpha: 0.7, segments: 2 });
          }
        }
      // TWO CUT CABLE ENDS coming out of the plaster at the top, where the multiple's tails were
      // cut off flush rather than drawn back. Each is a short black stub with a kink in it and a
      // frayed end: three strands, splayed.
      for (const [cx, len, lean] of [
        [-0.1, 0.1, 0.22],
        [0.07, 0.075, -0.3],
      ]) {
        const rng = rng0.fork(Math.round((cx + 2) * 977));
        const sx = X(cx), sy = Y(y1 - 0.012);
        const kx = sx + Math.sin(lean) * px(len * 0.6, ppm), ky = sy + Math.cos(lean) * px(len * 0.6, ppm);
        const ex = kx + Math.sin(lean * -1.6) * px(len * 0.5, ppm), ey = ky + Math.cos(lean * -1.6) * px(len * 0.5, ppm);
        penPath(g, [[sx, sy], [kx, ky], [ex, ey]], { width: px(0.019, ppm), wobble: 1.4, rng, alpha: 0.98 });
        for (let k = -1; k <= 1; k++) {
          const a = Math.atan2(ey - ky, ex - kx) + k * 0.55;
          inkLine(g, ex, ey, ex + Math.cos(a) * px(0.026, ppm), ey + Math.sin(a) * px(0.026, ppm), { width: px(0.009, ppm), wobble: 1, rng, alpha: 0.95, segments: 2 });
        }
      }
    },
    { seed: seed + 7 },
  );
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// (The Greek-key frieze that used to live here is gone. The band between the picture rail and the
// cornice is now bare plaster all round the room — the one big empty area the drawings always keep,
// as in fd-anim-kitchen-table-cards-hires. room.js paints it with plainTexture: nothing to draw.)

// Wainscot: broad boarded panelling. FOUR boards to the metre, not ten.
//
// This band was the blackest cell in the frame (47–51% ink) and it was a texture, not a decision:
// eight boards to 0.8 m put a full-height stroke every 0.1 m, which on the raked side walls of the
// wide shot lands at ELEVEN screen pixels — a picket fence that mip-blends to grey, exactly the
// "mechanically spaced hatch" STYLE.md §1.3 forbids. The film draws boarded panelling (Bean's hall,
// the doors on the Cadazio street) with a handful of confident seams a hand's breadth apart and
// bare paper between them, and the grain inside a board is a *broken* stroke or nothing at all.
//
// So: 0.25 m boards — 45 px on the back wall, 34 px on the raked side wall — one seam each, drawn
// in two or three long strokes with the pen lifted between them, an occasional companion bead where
// the hand went twice, and grain on only two boards in five, faint and never the board's full height.
export function wainscotTexture({ tile = 1.0, ppm = 700, seed = 41 } = {}) {
  const size = Math.round(tile * ppm);
  const tex = drawTexture(
    size,
    size,
    (g, w, h, rng) => {
      paper(g, w, h, PAPER, { grain: 0, seed });
      const boards = 4;
      const widths = [];
      for (let i = 0; i < boards; i++) widths.push(0.86 + rng() * 0.28);
      const sum = widths.reduce((p, q) => p + q, 0);
      let x = 0;
      for (let i = 0; i < boards; i++) {
        const bw = (w * widths[i]) / sum;
        const lean = (rng() - 0.5) * 7;
        // the seam, in two or three long strokes with the pen lifted a few mm between them
        const cuts = rng() < 0.55 ? [0.44 + rng() * 0.14] : [0.3 + rng() * 0.1, 0.66 + rng() * 0.1];
        const stops = [-0.02, ...cuts, 1.02];
        for (let k = 0; k < stops.length - 1; k++) {
          const t0 = stops[k] + (k ? 0.012 + rng() * 0.014 : 0); // the lift
          const t1 = stops[k + 1];
          inkLine(g, x + lean * t0, t0 * h, x + lean * t1, t1 * h, { width: 5.5, wobble: 2.2, rng, alpha: 0.92, segments: Math.max(4, Math.round((t1 - t0) * 22)) });
        }
        // a companion bead a finger's width off the seam, on one board in three
        if (rng() < 0.34) inkLine(g, x + 14, -3, x + 14 + lean, h + 3, { width: 3.4, wobble: 2.2, rng, alpha: 0.42, segments: 20 });
        // grain: two boards in five get ONE broken stroke over part of their height, well clear of
        // both seams — a mark on the wood, not a second seam
        if (rng() < 0.42) {
          const gx = x + bw * (0.3 + rng() * 0.42);
          const ga = h * (0.06 + rng() * 0.3), gb = ga + h * (0.28 + rng() * 0.34);
          inkLine(g, gx, ga, gx + (rng() - 0.5) * 5, gb, { width: 2.6, wobble: 2.6, rng, alpha: 0.16, segments: 12 });
        }
        x += bw;
      }
    },
    { seed },
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.userData.tile = tile;
  return tex;
}

// Floorboards running left–right (parallel to the back wall), drawn the way the folio draws a
// board floor (fd-anim-staircase-guitar-room, bottom third): LONG WANDERING SEAMS AND ALMOST
// NOTHING ELSE. Look at that frame — there is not one grain line inside a board, not one end
// joint, and the boards are a hand's breadth apart. Ours had a seam every 0.2 m, an end joint
// every 1.2 m, three grain lines per board and three knots a tile; at the front of the wide shot
// the floor is seen at ten degrees, all of that collapses into the same two screen pixels, and the
// near floor turned to noise. Now: 0.26 m boards, one confident seam each, an end joint only where
// a board actually ends (every 2.4–4 m, so most rows have none in frame), grain on one board in
// four and faint, and a single knot in the tile. Everything that crosses the tile edge is drawn
// again one tile over so the floor is seamless.
export function floorTexture({ tile = 2.6, ppm = 500, seed = 51, board = 0.26 } = {}) {
  const size = Math.round(tile * ppm);
  const tex = drawTexture(
    size,
    size,
    (g, w, h, rng) => {
      paper(g, w, h, PAPER, { grain: 0, seed });
      const rows = Math.round(h / px(board, ppm));
      // No two boards the same width: a floor laid out of what came off the pile. Widths are
      // normalised so the last seam still lands on the tile edge and the floor stays seamless.
      const widths = [];
      for (let r = 0; r < rows; r++) widths.push(0.78 + ((r * 7919) % 100) / 100 * 0.44);
      const wsum = widths.reduce((p, q) => p + q, 0);
      const edge = [0];
      for (let r = 0; r < rows; r++) edge.push(edge[r] + (h * widths[r]) / wsum);
      const wrapX = (fn) => {
        for (const dx of [-w, 0, w]) {
          g.save();
          g.translate(dx, 0);
          fn();
          g.restore();
        }
      };
      for (let r = 0; r < rows; r++) {
        const y = edge[r];
        const rowH = edge[r + 1] - y;
        // seam: one long stroke that wanders a whole board's thickness over the width of the room
        const seamRng = rng.fork(300 + r);
        wrapX(() => inkLine(g, -6, y, w + 6, y + (seamRng() - 0.5) * 5, { width: 5, wobble: 2.6, rng: seamRng.fork(1), alpha: 0.95, segments: 60 }));
        // end joints: boards are 2.4–4 m long and staggered, so a given row has one or none
        let x = -rng() * px(3.2, ppm);
        while (x < w) {
          x += px(2.4 + rng() * 1.6, ppm);
          if (x > 0 && x < w) {
            const jr = rng.fork(500 + r * 31 + Math.round(x));
            const jx = x;
            wrapX(() => inkLine(g, jx, y + 2, jx + (jr() - 0.5) * 4, y + rowH - 2, { width: 4.5, wobble: 1.4, rng: jr.fork(2), alpha: 0.9, segments: 6 }));
          }
        }
        // grain: one board in four gets ONE broken stroke down part of its length
        if (rng() < 0.26) {
          const gy = y + rowH * (0.3 + rng() * 0.4);
          const gx = rng() * w * 0.7;
          const len = px(0.7 + rng() * 1.3, ppm);
          const gr = rng.fork(700 + r);
          wrapX(() => inkLine(g, gx, gy, gx + len, gy + (gr() - 0.5) * 5, { width: 2.4, wobble: 2, rng: gr.fork(3), alpha: 0.2, segments: Math.max(4, Math.round(len / 60)) }));
        }
      }
      // one knot in the tile: a loop inside a loop, the grain swelling round it
      {
        const kx = rng() * w, r = Math.floor(rng() * rows);
        const ky = edge[r] + (edge[r + 1] - edge[r]) * (0.35 + rng() * 0.3);
        const kr = rng.fork(900);
        const rx = px(0.03, ppm), ry = px(0.015, ppm);
        wrapX(() => {
          ring(g, kx, ky, rx, { rng: kr.fork(1), alpha: 0.85, width: 4 });
          g.save();
          g.scale(1, ry / rx);
          ring(g, kx, (ky * rx) / ry, rx * 0.45, { rng: kr.fork(2), alpha: 0.85, width: 3.4 });
          g.restore();
          for (const sgn of [-1, 1]) {
            penCurve(g, [[kx - rx * 2.6, ky + sgn * ry * 1.9], [kx - rx * 1.2, ky + sgn * ry * 2.4], [kx, ky + sgn * ry * 2.7], [kx + rx * 1.2, ky + sgn * ry * 2.4], [kx + rx * 2.6, ky + sgn * ry * 1.9]], { width: 2.6, wobble: 1.2, rng: kr.fork(3 + sgn), alpha: 0.4 });
          }
        });
      }
    },
    { seed },
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.userData.tile = tile;
  return tex;
}

// Wood grain for the door leaves: a few long broken vertical strokes, the way the film draws a
// panelled door (fd-anim-kitchen-table-cards-hires, the door at stage right of that kitchen — eight
// strokes down a 0.8 m leaf, no more). Strokes 110 and 220 mm apart, so on the back-wall door they
// land 22 px apart at the wide shot and on a side door seen raking they are still 12 px apart and
// separate lines. At 55 mm they were a dotted grey haze on any raked leaf.
// Drawn stroke by stroke rather than with hatch(): hatch() breaks a run into short pieces and
// subdivides every piece every 6 px, so at the size a door plays at square-on each "grain line" was
// a wiggling caterpillar. Grain in the folios is a LONG, nearly straight line with one slow bend in
// it. So: four strokes to the tile, each running most of its height in five segments, plus a few
// half-length ones between them.
export function grainTexture({ tile = 0.44, ppm = 800, seed = 61, alpha = 0.5 } = {}) {
  const size = Math.round(tile * ppm);
  const tex = drawTexture(
    size,
    size,
    (g, w, h, rng) => {
      paper(g, w, h, PAPER, { grain: 0, seed });
      const stroke = (x, y0, y1, width, a) => {
        const bend = (rng() - 0.5) * 7;
        // wrap in x so the tile joins: the same stroke drawn one tile either side
        for (const dx of [-w, 0, w]) inkLine(g, x + dx, y0, x + dx + bend, y1, { width, wobble: 1.6, rng, alpha: a, segments: 5 });
      };
      const n = 4; // 0.11 m apart
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * (w / n) + (rng() - 0.5) * (w / n) * 0.5;
        // a long stroke, occasionally lifted for a moment near one end
        if (rng() < 0.3) {
          const c = 0.2 + rng() * 0.5;
          stroke(x, -6, c * h, 4.2, alpha * 0.95);
          stroke(x + (rng() - 0.5) * 3, c * h + h * 0.05, h + 6, 4.2, alpha * 0.95);
        } else stroke(x, -6, h + 6, 4.2, alpha * 0.95);
        // a fainter half-length companion, a third of the way to the next stroke
        if (rng() < 0.6) {
          const y0 = h * (rng() * 0.4), y1 = y0 + h * (0.35 + rng() * 0.4);
          stroke(x + (w / n) * (0.3 + rng() * 0.3), y0, y1, 2.6, alpha * 0.45);
        }
      }
    },
    { seed },
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.userData.tile = tile;
  return tex;
}

// The enamel plate screwed to the door's middle rail. Vitreous enamel, PTT issue: the ground is
// the ink and the letters are the paper, which is the one place in the room where that is true and
// the reason it is worth having — it puts a small black rectangle with white writing in it on a
// door that is otherwise all white joinery. A hairline rule inside the edge, two lines, and four
// screws through the corners. It reads as a black plate at the wide shot and as writing at the
// door, which is exactly the joke's timing: you find out what it says only once you are at it.
export function enamelTexture({ w = 0.3, h = 0.078, ppm = 2000, seed = 83, lines = ['P.T.T.', 'ENTRÉE INTERDITE'], sizes = [0.026, 0.02] } = {}) {
  const W = Math.round(w * ppm), H = Math.round(h * ppm);
  return drawTexture(
    W,
    H,
    (g, cw, ch, rng) => {
      g.fillStyle = INK;
      g.fillRect(0, 0, cw, ch);
      // the rule inside the edge: a plate is struck with one, and it is the mark that survives
      const i = px(0.006, ppm);
      g.strokeStyle = PAPER;
      g.lineWidth = px(0.0022, ppm);
      g.strokeRect(i, i, cw - 2 * i, ch - 2 * i);
      lines.forEach((t, k) => {
        const y = ch * (k === 0 ? 0.31 : 0.71);
        letter(g, t, cw / 2, y, { size: px(sizes[k], ppm), color: PAPER, rng, tracking: 0.14, jitter: px(0.0006, ppm), weight: 700 });
      });
      // four screws: a paper disc with an ink slot, at the corners
      for (const sx of [i * 1.9, cw - i * 1.9])
        for (const sy of [i * 1.9, ch - i * 1.9]) {
          g.fillStyle = PAPER;
          g.beginPath();
          g.ellipse(sx, sy, px(0.0035, ppm), px(0.0035, ppm), 0, 0, Math.PI * 2);
          g.fill();
          inkLine(g, sx - px(0.003, ppm), sy, sx + px(0.003, ppm), sy, { width: px(0.0012, ppm), wobble: 0.4, rng, alpha: 1, segments: 2 });
        }
    },
    { seed },
  );
}

// His visiting card, pinned to the panel under the plate. Paper, a rule round it, his name and
// his trade. Nobody in the room says anything about a card pinned under a notice forbidding entry.
export function cardTexture({ w = 0.13, h = 0.078, ppm = 2200, seed = 89, lines = ['T. PEPE', 'TAROT'] } = {}) {
  const W = Math.round(w * ppm), H = Math.round(h * ppm);
  return drawTexture(
    W,
    H,
    (g, cw, ch, rng) => {
      paper(g, cw, ch, PAPER, { grain: 0, seed });
      const i = px(0.006, ppm);
      const box = [
        [i, i],
        [cw - i, i],
        [cw - i, ch - i],
        [i, ch - i],
      ];
      penPath(g, [...box, box[0]], { width: px(0.0026, ppm), wobble: px(0.0004, ppm), rng, alpha: 0.9 });
      // one line big enough to be a mark and one under it: at the door the name lands at nine
      // pixels and the trade at five, which is a card you can see is a card and read when you are at it
      letter(g, lines[0], cw / 2, ch * 0.4, { size: px(0.026, ppm), rng, tracking: 0.1, jitter: px(0.0005, ppm), weight: 700 });
      letter(g, lines[1], cw / 2, ch * 0.73, { size: px(0.014, ppm), rng, tracking: 0.3, jitter: px(0.0005, ppm), weight: 600 });
    },
    { seed },
  );
}

// Plain paper (ceiling, glass, painted trim).
//
// No fibre grain: at the amplitude that was here it was ±1.5 of 255 — invisible in the frame, and
// the ink pass lays its own paper grain over everything at the end anyway — but it cost a full
// per-pixel pass over every canvas the room draws (about four megapixels of getImageData between
// the wallpaper, the wainscot, the floor and nine copies of this one). And with no noise in it,
// every plain sheet is byte-for-byte the same sheet, so the room now draws ONE and hands it to the
// ceiling, the trim, the reveals, the shutters, the metal and the iron. Room build: ~210 ms → ~85.
const _plain = new Map();
export function plainTexture({ tint = PAPER } = {}) {
  let tex = _plain.get(tint);
  if (!tex) {
    tex = drawTexture(256, 256, (g, w, h) => paper(g, w, h, tint, { grain: 0 }));
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.userData.tile = 0.5;
    _plain.set(tint, tex);
  }
  return tex;
}
