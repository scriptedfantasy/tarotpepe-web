// cards-geometry — the card as a physical slab: a rounded-rect sheet with real thickness, built as
// a subdivided grid so it can bend (a card is never perfectly flat), with quarter-circle corner
// fans so the corners are truly round. Front face is material 0, back face 1, the cut edge 2.
//
// Built flat in XY (front normal +z, art top +y), then rotated so that in the mesh's local frame
// the front normal is +y, the art top points to -z (upstage) and the width runs along x. That is the
// contract used by reveal.js: rotation.x = 0 face up, Math.PI face down.
import * as THREE from 'three';

// Displacement of the sheet (metres) at flat-frame position (x, y).
function makeBend({ w, h, curl = 0, curlX = 0, twist = 0, dogEar = null }) {
  return (x, y) => {
    const u = (2 * x) / w, v = (2 * y) / h; // -1..1
    // centred on the mid-plane so a face-down card dips no further than a face-up one rises
    let z = curl * (v * v - 0.5) + curlX * (u * u - 0.5) + twist * u * v;
    if (dogEar) {
      const cx = (dogEar.sx * w) / 2, cy = (dogEar.sy * h) / 2;
      const d = Math.hypot(x - cx, y - cy) / dogEar.radius;
      if (d < 1) {
        const s = 1 - d;
        z += dogEar.amount * s * s * (3 - 2 * s);
      }
    }
    return z;
  };
}

// Ordered outline (CCW) of the rounded rect, from the bottom edge's left end.
export function roundedOutline(w, h, r, { edgeN = 8, arcN = 7 } = {}) {
  const pts = [];
  const x0 = -w / 2, x1 = w / 2, y0 = -h / 2, y1 = h / 2;
  const arc = (cx, cy, a0, a1) => {
    for (let k = 0; k <= arcN; k++) {
      const a = a0 + ((a1 - a0) * k) / arcN;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  const line = (ax, ay, bx, by) => {
    for (let k = 1; k < edgeN; k++) {
      const u = k / edgeN;
      pts.push([ax + (bx - ax) * u, ay + (by - ay) * u]);
    }
  };
  arc(x0 + r, y0 + r, Math.PI, Math.PI * 1.5);
  line(x0 + r, y0, x1 - r, y0);
  arc(x1 - r, y0 + r, Math.PI * 1.5, Math.PI * 2);
  line(x1, y0 + r, x1, y1 - r);
  arc(x1 - r, y1 - r, 0, Math.PI * 0.5);
  line(x1 - r, y1, x0 + r, y1);
  arc(x0 + r, y1 - r, Math.PI * 0.5, Math.PI);
  line(x0, y1 - r, x0, y0 + r);
  return pts;
}

// One face of the card as a bent grid. Returns {pos, uv, idx} in the flat frame at height zOff.
function faceGrid({ w, h, r, nx, ny, arcN, bend, zOff }) {
  const xs = [-w / 2], ys = [-h / 2];
  for (let i = 0; i <= nx; i++) xs.push(-w / 2 + r + ((w - 2 * r) * i) / nx);
  xs.push(w / 2);
  for (let j = 0; j <= ny; j++) ys.push(-h / 2 + r + ((h - 2 * r) * j) / ny);
  ys.push(h / 2);
  const cols = xs.length, rows = ys.length;
  const pos = [], uv = [], idx = [];
  const push = (x, y) => {
    pos.push(x, y, bend(x, y) + zOff);
    uv.push((x + w / 2) / w, (y + h / 2) / h);
    return pos.length / 3 - 1;
  };
  const vid = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) vid.push(push(xs[i], ys[j]));
  const V = (i, j) => vid[j * cols + i];
  const isCorner = (i, j) => (i === 0 || i === cols - 2) && (j === 0 || j === rows - 2);
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      if (isCorner(i, j)) continue;
      idx.push(V(i, j), V(i + 1, j), V(i + 1, j + 1));
      idx.push(V(i, j), V(i + 1, j + 1), V(i, j + 1));
    }
  }
  // quarter-circle fans in the four corner cells, centred on the inner corner vertex
  const fan = (ci, cj, a0, startV, endV) => {
    const c = V(ci, cj);
    const cx = xs[ci], cy = ys[cj];
    const ring = [startV];
    for (let k = 1; k < arcN; k++) {
      const a = a0 + ((Math.PI / 2) * k) / arcN;
      ring.push(push(cx + r * Math.cos(a), cy + r * Math.sin(a)));
    }
    ring.push(endV);
    for (let k = 0; k < ring.length - 1; k++) idx.push(c, ring[k], ring[k + 1]);
  };
  fan(1, 1, Math.PI, V(0, 1), V(1, 0)); // bottom-left
  fan(cols - 2, 1, Math.PI * 1.5, V(cols - 2, 0), V(cols - 1, 1)); // bottom-right
  fan(cols - 2, rows - 2, 0, V(cols - 1, rows - 2), V(cols - 2, rows - 1)); // top-right
  fan(1, rows - 2, Math.PI * 0.5, V(1, rows - 1), V(0, rows - 2)); // top-left
  return { pos, uv, idx };
}

// The card slab. w,h,t in metres; r corner radius; curl/curlX/twist/dogEar bend the sheet.
// uSideRepeat: how many times the side texture wraps around the perimeter (u runs 0..1 per lap).
export function cardGeometry({ w, h, t, r = 0.005, nx = 12, ny = 20, arcN = 7, curl = 0, curlX = 0, twist = 0, dogEar = null }) {
  const bend = makeBend({ w, h, curl, curlX, twist, dogEar });
  const front = faceGrid({ w, h, r, nx, ny, arcN, bend, zOff: t / 2 });
  // back: the underside of the same bent sheet (normal -z via reversed winding). Its image is
  // flipped in v so that a face-down card shows an upright back and turning it over about the
  // card's width axis (reveal.js) lands on an upright front.
  const back = { pos: [], uv: [], idx: [] };
  for (let i = 0; i < front.pos.length; i += 3) {
    const x = front.pos[i], y = front.pos[i + 1];
    back.pos.push(x, y, bend(x, y) - t / 2);
  }
  for (let i = 0; i < front.uv.length; i += 2) back.uv.push(front.uv[i], 1 - front.uv[i + 1]);
  for (let i = 0; i < front.idx.length; i += 3) back.idx.push(front.idx[i], front.idx[i + 2], front.idx[i + 1]);
  // side wall: a ribbon between z = bend - t/2 and bend + t/2 around the outline
  const ring = roundedOutline(w, h, r, { edgeN: 10, arcN });
  const side = { pos: [], uv: [], idx: [], nrm: [] };
  let total = 0;
  const lens = [0];
  for (let k = 0; k < ring.length; k++) {
    const a = ring[k], b = ring[(k + 1) % ring.length];
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
    lens.push(total);
  }
  for (let k = 0; k <= ring.length; k++) {
    const p = ring[k % ring.length];
    const prev = ring[(k - 1 + ring.length) % ring.length], next = ring[(k + 1) % ring.length];
    const dx = next[0] - prev[0], dy = next[1] - prev[1];
    const l = Math.hypot(dx, dy) || 1;
    const nx_ = dy / l, ny_ = -dx / l; // outward for CCW travel
    const z = bend(p[0], p[1]);
    const u = lens[k] / total;
    side.pos.push(p[0], p[1], z - t / 2, p[0], p[1], z + t / 2);
    side.uv.push(u, 0, u, 1);
    side.nrm.push(nx_, ny_, 0, nx_, ny_, 0);
  }
  for (let k = 0; k < ring.length; k++) {
    const b0 = 2 * k, t0 = 2 * k + 1, b1 = 2 * (k + 1), t1 = 2 * (k + 1) + 1;
    side.idx.push(b0, b1, t1, b0, t1, t0);
  }

  const geo = new THREE.BufferGeometry();
  const pos = [...front.pos, ...back.pos, ...side.pos];
  const uv = [...front.uv, ...back.uv, ...side.uv];
  const nF = front.pos.length / 3, nB = back.pos.length / 3;
  const idx = [...front.idx, ...back.idx.map((i) => i + nF), ...side.idx.map((i) => i + nF + nB)];
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.addGroup(0, front.idx.length, 0);
  geo.addGroup(front.idx.length, back.idx.length, 1);
  geo.addGroup(front.idx.length + back.idx.length, side.idx.length, 2);
  geo.computeVertexNormals();
  // the side wall keeps its analytic outward normals (computeVertexNormals is fine, but the
  // ribbon's ends share no vertices, so patch the seam by writing them explicitly)
  const nAttr = geo.getAttribute('normal');
  for (let k = 0; k < side.nrm.length / 3; k++) {
    const v = nF + nB + k;
    nAttr.setXYZ(v, side.nrm[3 * k], side.nrm[3 * k + 1], side.nrm[3 * k + 2]);
  }
  nAttr.needsUpdate = true;
  geo.rotateX(-Math.PI / 2); // front → +y, art top → -z
  geo.computeBoundingSphere();
  return geo;
}
