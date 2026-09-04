// PIECE FILE (pepe): the bench — the thing he actually sits on.
//
// It used to be a BoxGeometry from the boards to the soles of his feet: a paper-white slab with
// no line on it anywhere except its own four corners, showing through the gap under the cloth in
// `wide` and `door` like a packing crate someone left behind the table. Everything else in this
// parlour is a particular object — the radiator has columns, the bar cart has wheels and a lip,
// the console has turned legs and a solid apron — and his seat was the one thing in the room that
// was not drawn at all.
//
// So it is now a bench, of the parlour's own joinery, and every part of it exists because the pen
// needs an edge there:
//
//   the seat board      two boards stacked, the upper one proud of the lower by 8 mm all round:
//                       a thumb-moulded edge, which is TWO lines under the seat instead of one.
//                       The only drawn surface on the whole thing — three planks with their seams
//                       and their grain running the length, because the seat top is the one face
//                       a camera above table height actually looks down on.
//   the valance         a shaped apron front and back of DARK STAINED board, its lower edge cut
//                       into five scallops. It is the bench's one solid black area — the console
//                       standing behind him has the same note under its carcase — and it is what
//                       makes the object read as a thing rather than a wireframe: five white
//                       arches bitten out of a black band, dead under the middle of the seat.
//   the legs            four of them, turned — a pad foot, an ankle, the swell of a vase, a ring,
//                       a shaft — under a SQUARE BLOCK at the top, which is the joint: the valance
//                       and the side rails die into it, and 30 mm of it shows below the skirt.
//                       They SPLAY three degrees. Four plumb legs under a 0.92 x 0.34 board read
//                       as a second, smaller table standing behind the first; a stool's legs rake.
//   the stretcher       an H at ankle height: a rail across each end, one long rail down the
//                       middle joining them. Tried as a box stretcher first — a front rail and a
//                       back rail at one height separate, from every camera in this room, into two
//                       black bars, which is a ladder under the bench, not a stretcher.
//   the pad feet        the whole frame is up in the air on four 55 mm pads, so lighting.js's pool
//                       at (0.15, 0.08, −0.95) — buried inside the old solid box and doing nothing
//                       at all — now falls on the boards between the feet, and the bench throws the
//                       first cast shadow it has ever had: two legs and the stretcher, raked off to
//                       stage right across the rug (measured with tools/_pepe-bench-shadow.mjs).
//
// Sizes are set by the one number this piece may not change: the seat top is the bottom of Pepe's
// cut-out (`feetY`), because his hands are on the cloth and the table top is the contract. What is
// actually SEEN of all this is small and worth knowing before adding to it: in `home` the cloth
// covers the bench outright; in `wide` only the two front legs and the stretcher clear the cloth's
// hanging corners; the valance and the seat board only ever play in `door` and in a bare-stage view.
import * as THREE from 'three';
import { inkMaterial, drawTexture, inkLine, paper, INK } from '../core/strokes.js';

// a flat sheet of ink: the ink pass reads a texture this dark as a black AREA and fills it
let _solid = null;
function solidTexture() {
  return (_solid ??= drawTexture(8, 8, (g, w, h) => {
    g.fillStyle = INK;
    g.fillRect(0, 0, w, h);
  }));
}

// The seat boards, seen from above: three planks, their seams and their grain running the length
// of the bench (u across the canvas = along the bench). Long wobbly parallel lines with a knot or
// two, the way the film draws a board — STYLE.md §1.3, "wood floors / table tops".
function seatTexture() {
  return drawTexture(
    512,
    256,
    (g, w, h, rng) => {
      paper(g, w, h, '#f6f1e8', { grain: 0.025, seed: 17 });
      // two plank seams, drawn heavier than the grain
      for (const v of [0.34, 0.68]) inkLine(g, -6, h * v, w + 6, h * v + (rng() - 0.5) * 4, { width: 1.7, wobble: 1.6, rng, alpha: 0.7 });
      // grain: broken lengths, denser near the seams
      for (let y = 5; y < h; y += 7 + rng() * 11) {
        let x = -rng() * 200;
        while (x < w) {
          const len = 130 + rng() * 300;
          inkLine(g, x, y + (rng() - 0.5) * 3, x + len, y + (rng() - 0.5) * 6, { width: 0.9, wobble: 1.5, rng, alpha: 0.26 });
          x += len + 40 + rng() * 160;
        }
      }
      // three knots, each a pair of closed loops
      for (const [kx, ky] of [[0.19, 0.17], [0.62, 0.52], [0.86, 0.83]]) {
        for (let r = 0; r < 2; r++) {
          const rx = (5 + r * 4) * 1.7, ry = 3 + r * 2.6;
          g.save();
          g.strokeStyle = '#0d0e0d';
          g.globalAlpha = 0.5;
          g.lineWidth = 1;
          g.beginPath();
          for (let i = 0; i <= 18; i++) {
            const a = (i / 18) * Math.PI * 2;
            const px = kx * w + Math.cos(a) * rx * (1 + (rng() - 0.5) * 0.16);
            const py = ky * h + Math.sin(a) * ry * (1 + (rng() - 0.5) * 0.2);
            i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
          }
          g.stroke();
          g.restore();
        }
      }
    },
    { seed: 5 },
  );
}

// A shaped apron: a board of height `h` and thickness `t` whose LOWER edge is cut into `n`
// scallops of depth `amp`. Built by hand rather than with ExtrudeGeometry so the geometry stays
// un-indexed — flat per-face normals are what the ink pass reads to decide a crease, and a
// smoothed normal across the bottom bead would lose the line.
function valanceGeometry(w, h, t, amp, n) {
  const S = n * 10;
  const pos = [], uv = [];
  const yb = (u) => {
    const p = u * n;
    const f = p - Math.floor(Math.min(p, n - 1e-6));
    return amp * Math.sin(Math.PI * f);
  };
  const push = (x, y, z, u, v) => {
    pos.push(x, y, z);
    uv.push(u, v);
  };
  const quad = (a, b, c, d) => {
    for (const p of [a, b, c, a, c, d]) push(...p);
  };
  for (let i = 0; i < S; i++) {
    const u0 = i / S, u1 = (i + 1) / S;
    const x0 = (u0 - 0.5) * w, x1 = (u1 - 0.5) * w;
    const b0 = yb(u0), b1 = yb(u1);
    // front, back, the scalloped bottom edge, the top edge
    quad([x0, b0, t / 2, u0, 0], [x1, b1, t / 2, u1, 0], [x1, h, t / 2, u1, 1], [x0, h, t / 2, u0, 1]);
    quad([x1, b1, -t / 2, u1, 0], [x0, b0, -t / 2, u0, 0], [x0, h, -t / 2, u0, 1], [x1, h, -t / 2, u1, 1]);
    quad([x0, b0, -t / 2, u0, 0], [x1, b1, -t / 2, u1, 0], [x1, b1, t / 2, u1, 0], [x0, b0, t / 2, u0, 0]);
    quad([x0, h, t / 2, u0, 1], [x1, h, t / 2, u1, 1], [x1, h, -t / 2, u1, 1], [x0, h, -t / 2, u0, 1]);
  }
  for (const [x, s] of [[-w / 2, -1], [w / 2, 1]]) {
    const b = yb(s > 0 ? 1 : 0);
    const f = s > 0 ? [[x, b, t / 2, 0, 0], [x, h, t / 2, 0, 1], [x, h, -t / 2, 1, 1], [x, b, -t / 2, 1, 0]] : [[x, b, -t / 2, 0, 0], [x, h, -t / 2, 0, 1], [x, h, t / 2, 1, 1], [x, b, t / 2, 1, 0]];
    quad(...f);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals(); // un-indexed → flat faces, which is what the crease pass wants
  geo.computeBoundingSphere();
  return geo;
}

// the turned part of a leg, foot upwards: pad, ankle, the swell of a vase, a ring, the shaft
const LEG_PROFILE = [
  [0.0, 0.0],
  [0.0265, 0.0],
  [0.0275, 0.009],
  [0.0235, 0.019],
  [0.0175, 0.03],
  [0.0195, 0.044],
  [0.0262, 0.074],
  [0.0295, 0.107],
  [0.0272, 0.142],
  [0.021, 0.182],
  [0.0192, 0.216],
  [0.0242, 0.231],
  [0.0242, 0.245],
  [0.0178, 0.259],
  [0.0172, 0.318],
  [0.0215, 0.339],
  [0.0215, 0.352],
];
const TURN_TOP = 0.352; // where the square block takes over

// seatY: the world y of the seat top (= the bottom of the cut-out). Everything else hangs off it.
export function buildBench({ seatY, width = 0.92, depth = 0.34 }) {
  const g = new THREE.Group();
  g.name = 'bench';

  const woodMat = inkMaterial({ map: seatTexture(), hatch: 0.5 });
  const paperMat = inkMaterial({ hatch: 0.5 });
  // THE VALANCE IS THE BLACK NOTE. Every prop in this room shows one solid black area and one
  // bare white one from across the room (props.js's own rule), and the bench had neither: outlined
  // in white against a white wainscot it read as a wireframe, and asking the ink pass for more
  // tone (hatch 0.7) got nothing, because a vertical board facing the visitor is a LIT face and
  // the pass is right to leave it bare. So the skirt is dark the way the console's apron behind him
  // is dark — a stained board — and the five scallops are cut out of a black shape instead of
  // being drawn on a white one, which is how the film cuts a valance.
  const shadeMat = inkMaterial({ map: solidTexture(), hatch: 0.5, lineWeight: 1.1 });
  const add = (mesh, x, y, z) => {
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

  // ── the seat: two boards, the upper proud of the lower — a thumb moulding, and two lines ──
  const TOP_T = 0.026, LIP_T = 0.016;
  const under = seatY - TOP_T - LIP_T; // underside of the seat, where the frame starts
  add(box(width, TOP_T, depth, woodMat), 0, seatY - TOP_T / 2, 0);
  add(box(width - 0.018, LIP_T, depth - 0.018, woodMat), 0, under + LIP_T / 2, 0);

  // ── the frame: four legs at the corners, a scalloped valance front and back, side rails ──
  // The legs SPLAY. A stool's legs rake out from under the seat and a table's stand plumb, and
  // with four straight legs under a 0.92 x 0.34 board this read as a second, smaller table
  // standing behind the first. Three degrees is all it takes.
  const legX = width / 2 - 0.058, legZ = depth / 2 - 0.055;
  const BLOCK = 0.052;
  const SPLAY_X = 0.058, SPLAY_Z = 0.036; // radians, out from under the seat
  const legs = [];
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * legX, under, sz * legZ);
      pivot.rotation.set(sz * SPLAY_Z, 0, -sx * SPLAY_X, 'ZXY');
      g.add(pivot);
      const turn = new THREE.Mesh(new THREE.LatheGeometry(LEG_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 14), paperMat);
      turn.position.y = -under;
      turn.castShadow = turn.receiveShadow = true;
      pivot.add(turn);
      const blk = box(BLOCK, under - TURN_TOP, BLOCK, paperMat);
      blk.position.y = -(under - TURN_TOP) / 2;
      blk.castShadow = blk.receiveShadow = true;
      pivot.add(blk);
      legs.push(pivot);
    }
  // where a splayed leg's centre line stands at a given height
  const legAt = (sx, sz, y) => [sx * (legX + (under - y) * Math.tan(SPLAY_X)), sz * (legZ + (under - y) * Math.tan(SPLAY_Z))];

  const APRON_H = 0.115, APRON_T = 0.02, SCALLOP = 0.032;
  const aprW = 2 * legX - BLOCK + 0.006;
  for (const sz of [-1, 1]) {
    const v = new THREE.Mesh(valanceGeometry(aprW, APRON_H, APRON_T, SCALLOP, 5), shadeMat);
    add(v, 0, under - APRON_H, sz * (legZ + BLOCK / 2 - APRON_T / 2));
  }
  const sideW = 2 * legZ - BLOCK + 0.006;
  for (const sx of [-1, 1]) {
    const r = add(box(APRON_T, APRON_H, sideW, shadeMat), sx * (legX + BLOCK / 2 - APRON_T / 2), under - APRON_H / 2, 0);
    r.rotation.y = 0;
  }

  // ── the stretcher at ankle height. An H, not a box: a rail across each END, and ONE long rail
  //    down the middle joining them. A box stretcher put a front rail and a back rail at the same
  //    height, and from every camera in the room they separated into two black bars — a ladder
  //    under the bench. The H shows one bar, which is what a stretcher is for. ──
  const STR_Y = 0.152, STR_H = 0.026, STR_T = 0.019;
  const [sxAt, szAt] = legAt(1, 1, STR_Y);
  for (const sx of [-1, 1]) add(box(STR_T, STR_H, 2 * szAt + 0.016, paperMat), sx * sxAt, STR_Y, 0);
  add(box(2 * sxAt - 0.012, STR_H * 0.85, STR_T, paperMat), 0, STR_Y, 0);

  g.userData.top = seatY;
  return g;
}
