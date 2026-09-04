// table-geo — small geometry helpers for the table piece: a parametric surface builder (cloth,
// wax drips), lathe profiles from (r, y) pairs, and a merge for many little parts (fringe).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Build a surface from fn(u, v) → [x, y, z] (optionally [x, y, z, s, t] for custom uvs).
// Winding is fixed so normals face `outward(p)` (defaults to radial from the y axis).
export function surface(fn, nu, nv, { outward = null } = {}) {
  const pos = new Float32Array((nu + 1) * (nv + 1) * 3);
  const uv = new Float32Array((nu + 1) * (nv + 1) * 2);
  let k = 0, m = 0;
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      const p = fn(i / nu, j / nv);
      pos[k++] = p[0];
      pos[k++] = p[1];
      pos[k++] = p[2];
      uv[m++] = p[3] ?? i / nu;
      uv[m++] = p[4] ?? j / nv;
    }
  }
  const idx = [];
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // orientation check at a mid vertex
  const mid = (Math.floor(nv / 2) * (nu + 1) + Math.floor(nu / 4)) * 3;
  const n = new THREE.Vector3().fromArray(g.attributes.normal.array, mid);
  const p = new THREE.Vector3().fromArray(pos, mid);
  const o = outward ? outward(p) : new THREE.Vector3(p.x, 0, p.z);
  if (n.dot(o) < 0) {
    const ix = g.index.array;
    for (let t = 0; t < ix.length; t += 3) {
      const tmp = ix[t + 1];
      ix[t + 1] = ix[t + 2];
      ix[t + 2] = tmp;
    }
    g.computeVertexNormals();
  }
  return g;
}

// Lathe from [[r, y], ...] pairs (bottom → top). Rotated so that u=0.5 faces +z (the camera).
export function lathe(profile, segments = 32, phiLength = Math.PI * 2, phiStart = Math.PI) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, segments, phiStart, phiLength);
}

export function merge(geos) {
  return mergeGeometries(geos, false);
}

export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// The square cloth is laid corner-forward (rotated CLOTH_ROT about y), so a point of the cloth
// hangs towards the visitor and the hem is two lines dropping out of the frame. World (x, z) on
// the table top → cloth-local (x, z), for drawing marks into the cloth's texture.
export const CLOTH_ROT = Math.PI / 4;
export function clothLocal(x, z) {
  const c = Math.cos(CLOTH_ROT), s = Math.sin(CLOTH_ROT);
  return [x * c - z * s, x * s + z * c];
}

// ---------- the cloth's knife pleats ----------
// Few and broad rather than many and fine: every pleat is a crease the ink pass draws as a line,
// and a skirt ruled with two dozen of them can never take tone. Shared by the geometry (table.js)
// and by the drawing (table-textures.js), so the weave crowds exactly on the folds that are drawn.
// How much cloth the skirt's texture covers from the hem upwards. The deepest corner of the square
// cloth hangs 0.513 m, so at 0.5 m the uv wrapped and printed a sliver of the hem band up under
// the table's rim at each corner.
export const SKIRT_DROP = 0.58;
export const PLEATS = 13;
const STEEP = 0.16; // the short steep face of each pleat, as a fraction of its width
const frac = (x) => x - Math.floor(x);
export function saw(x, steep = STEEP) {
  const p = frac(x / (Math.PI * 2));
  return p < 1 - steep ? -1 + (2 * p) / (1 - steep) : 1 - (2 * (p - (1 - steep))) / steep;
}
export const pleatFold = (th) => 0.8 * saw(PLEATS * th + 0.8) + 0.2 * Math.sin(9 * th + 2.0);
// how near angle `th` is to a pleat's crease, 1 on it and 0 a third of a pleat away
export function pleatCrease(th) {
  const p = frac((PLEATS * th + 0.8) / (Math.PI * 2));
  const d = Math.abs(p - (1 - STEEP));
  return 1 - smooth(0.0, 0.16, Math.min(d, 1 - d));
}
