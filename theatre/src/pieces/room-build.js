// room-build — small geometry helpers for a set built from boxes and planes. Every part is
// pushed into a per-material bucket and merged into one mesh per material at the end (one draw
// call per material), with UVs mapped in world metres so a texture drawn at a physical size
// (userData.tile) repeats consistently across every surface that wears it.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);

// Map UVs from world position by dominant normal axis (triplanar, in metres / tile).
export function worldUV(geo, tile = 1, { uOffset = 0, vOffset = 0, swap = false } = {}) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    let u, v;
    if (nz >= nx && nz >= ny) (u = x), (v = y);
    else if (nx >= ny) (u = z), (v = y);
    else (u = x), (v = z);
    if (swap) [u, v] = [v, u];
    uv.setXY(i, u / tile + uOffset, v / tile + vOffset);
  }
  uv.needsUpdate = true;
}

export class Parts {
  constructor() {
    this.buckets = new Map(); // key (material + shadow flags) → { mat, geos, cast, receive }
    this.frame = null; // optional parent transform for parts built in a local frame
  }
  // Build parts inside a local frame (e.g. a window on a side wall, built as if on the back wall).
  withFrame(matrix, fn) {
    const prev = this.frame;
    this.frame = prev ? prev.clone().multiply(matrix) : matrix.clone();
    try {
      fn();
    } finally {
      this.frame = prev;
    }
  }
  // One bucket per material AND shadow flags, so a long moulding that must not cast a shadow
  // never shares a mesh with a knob that should.
  _bucket(mat, { cast = false, receive = false } = {}) {
    const key = `${mat.uuid}:${cast ? 'c' : ''}${receive ? 'r' : ''}`;
    let b = this.buckets.get(key);
    if (!b) this.buckets.set(key, (b = { mat, geos: [], cast, receive }));
    return b;
  }
  // Push a geometry positioned by (x,y,z) and rotation (rx,ry,rz).
  add(geo, mat, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, cast = false, receive = false, uvSwap = false } = {}) {
    _e.set(rx, ry, rz);
    _q.setFromEuler(_e);
    _p.set(x, y, z);
    _m.compose(_p, _q, _s);
    if (this.frame) _m.premultiply(this.frame);
    geo.applyMatrix4(_m);
    worldUV(geo, mat.userData.tile ?? 1, { swap: uvSwap });
    this._bucket(mat, { cast, receive }).geos.push(geo);
    return geo;
  }
  // An axis-aligned box centred at (x,y,z) of size (w,h,d), optionally rotated.
  box(w, h, d, x, y, z, mat, opts = {}) {
    return this.add(new THREE.BoxGeometry(w, h, d), mat, { x, y, z, ...opts });
  }
  // A box given by its extents.
  boxFrom(x0, x1, y0, y1, z0, z1, mat, opts = {}) {
    return this.box(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, mat, opts);
  }
  // A plane of size (w,h) facing +z before rotation.
  plane(w, h, x, y, z, mat, opts = {}) {
    return this.add(new THREE.PlaneGeometry(w, h), mat, { x, y, z, ...opts });
  }
  cylinder(rt, rb, h, x, y, z, mat, opts = {}) {
    return this.add(new THREE.CylinderGeometry(rt, rb, h, opts.segments ?? 14), mat, { x, y, z, ...opts });
  }
  sphere(r, x, y, z, mat, opts = {}) {
    return this.add(new THREE.SphereGeometry(r, 14, 10), mat, { x, y, z, ...opts });
  }
  // Merge every bucket into one mesh per material and add them to `group`.
  build(group, name = 'part') {
    const meshes = [];
    for (const b of this.buckets.values()) {
      if (!b.geos.length) continue;
      const merged = mergeGeometries(b.geos, false);
      const mesh = new THREE.Mesh(merged, b.mat);
      mesh.name = `${name}:${b.mat.name || 'mat'}${b.cast ? ':cast' : ''}`;
      mesh.castShadow = b.cast;
      mesh.receiveShadow = b.receive;
      group.add(mesh);
      meshes.push(mesh);
    }
    return meshes;
  }
}

// Rectangle subtraction for wall segments: rects are {x0,x1,y0,y1}; returns rects minus hole.
export function subtractRect(rects, hole) {
  const out = [];
  for (const r of rects) {
    const ix0 = Math.max(r.x0, hole.x0), ix1 = Math.min(r.x1, hole.x1);
    const iy0 = Math.max(r.y0, hole.y0), iy1 = Math.min(r.y1, hole.y1);
    if (ix0 >= ix1 || iy0 >= iy1) {
      out.push(r);
      continue;
    }
    if (r.x0 < ix0) out.push({ x0: r.x0, x1: ix0, y0: r.y0, y1: r.y1 });
    if (ix1 < r.x1) out.push({ x0: ix1, x1: r.x1, y0: r.y0, y1: r.y1 });
    if (r.y0 < iy0) out.push({ x0: ix0, x1: ix1, y0: r.y0, y1: iy0 });
    if (iy1 < r.y1) out.push({ x0: ix0, x1: ix1, y0: iy1, y1: r.y1 });
  }
  return out;
}
