// room-build — small geometry helpers for a set built from boxes and planes. Every part is
// pushed into a per-material bucket and merged into one mesh per material at the end (one draw
// call per material), with UVs mapped in world metres so a texture drawn at a physical size
// (userData.tile) repeats consistently across every surface that wears it.
//
// The hand: geometry is subdivided (a vertex every ~10 cm) and, at build, every vertex is
// pushed through a smooth low-frequency warp field, so no edge in the set is ruler-straight and
// no two mouldings are parallel — the ink pass then draws lines that bend the way a pen does.
// The field is a pure function of world position, so parts that meet keep meeting; it is masked
// to stay in-plane at the walls, the floor and the ceiling, so nothing hung on a wall or stood on
// the floor by another piece is pushed through.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);

const SEG = 0.1; // metres between vertices along an edge, so the warp can bend it
const MAX_SEGS = 64;
const segs = (len) => Math.min(MAX_SEGS, Math.max(1, Math.round(len / SEG)));

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

// A ONE-OFF sheet instead of a repeating pattern: the texture is stretched over a named rectangle
// of world space (u across [u0,u1], v across [v0,v1]) in the same two in-plane axes worldUV picks.
// A material carrying `userData.uvRect` is therefore good for one part in one place — which is the
// point: a drawing that belongs somewhere (the ghost of the multiple on the back wall, the enamel
// plate on the door's middle rail) cannot be a tile, because a tile repeats and a scar does not.
export function worldRectUV(geo, { u0, u1, v0, v1 }, { swap = false } = {}) {
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
    uv.setXY(i, (u - u0) / (u1 - u0), (v - v0) / (v1 - v0));
  }
  uv.needsUpdate = true;
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// The warp field: three components, each a few sines at incommensurate wavelengths over the
// other two axes (a vertical line bends as you move along it; a horizontal one likewise).
// amp in metres. Masks keep the field in-plane at the room's bounding surfaces.
export function makeWarp({ amp = 0.014, hx = 2.6, zb = -2.5, H = 3.1, seed = 0 } = {}) {
  const k1 = (2 * Math.PI) / 1.3, k2 = (2 * Math.PI) / 0.52;
  const ph = (n) => seed * 0.73 + n * 1.9;
  return (x, y, z) => {
    let dx = 0.6 * Math.sin(y * k1 + 0.4 * x + ph(1)) + 0.2 * Math.sin(y * k2 + 0.9 * z + ph(2)) + 0.3 * Math.sin(z * k1 * 0.8 + 0.6 * x + ph(3));
    let dy = 0.6 * Math.sin(x * k1 + 0.3 * y + ph(4)) + 0.2 * Math.sin(x * k2 + 0.7 * z + ph(5)) + 0.3 * Math.sin(z * k1 * 0.9 + 0.5 * y + ph(6));
    let dz = 0.6 * Math.sin(x * k1 * 1.1 + 0.5 * y + ph(7)) + 0.2 * Math.sin(y * k2 * 0.8 + 0.6 * x + ph(8)) + 0.3 * Math.sin(x * k2 + 0.4 * z + ph(9));
    dx *= smooth(0, 0.5, hx - Math.abs(x)); // flat at the side walls
    dy *= (0.3 + 0.7 * smooth(0, 0.5, y)) * smooth(0, 0.3, H - y); // nearly flat at the floor, flat at the ceiling
    dz *= smooth(0, 0.5, z - zb); // flat at the back wall
    return [dx * amp, dy * amp, dz * amp];
  };
}

export class Parts {
  constructor({ warp = null } = {}) {
    this.buckets = new Map(); // key (material + shadow flags) → { mat, geos, cast, receive }
    this.frame = null; // optional parent transform for parts built in a local frame
    this.warp = warp; // (x, y, z) → [dx, dy, dz], applied to every vertex at build
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
    if (mat.userData.uvRect) worldRectUV(geo, mat.userData.uvRect, { swap: uvSwap });
    else worldUV(geo, mat.userData.tile ?? 1, { swap: uvSwap });
    this._bucket(mat, { cast, receive }).geos.push(geo);
    return geo;
  }
  // An axis-aligned box centred at (x,y,z) of size (w,h,d), optionally rotated. Subdivided along
  // its long axes so the warp can bend it.
  box(w, h, d, x, y, z, mat, opts = {}) {
    return this.add(new THREE.BoxGeometry(w, h, d, segs(w), segs(h), segs(d)), mat, { x, y, z, ...opts });
  }
  // A box given by its extents.
  boxFrom(x0, x1, y0, y1, z0, z1, mat, opts = {}) {
    return this.box(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, mat, opts);
  }
  // A plane of size (w,h) facing +z before rotation.
  plane(w, h, x, y, z, mat, opts = {}) {
    return this.add(new THREE.PlaneGeometry(w, h, segs(w), segs(h)), mat, { x, y, z, ...opts });
  }
  cylinder(rt, rb, h, x, y, z, mat, opts = {}) {
    return this.add(new THREE.CylinderGeometry(rt, rb, h, opts.segments ?? 14, segs(h)), mat, { x, y, z, ...opts });
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
      if (this.warp) {
        const pos = merged.attributes.position;
        const arr = pos.array;
        for (let i = 0; i < arr.length; i += 3) {
          const [dx, dy, dz] = this.warp(arr[i], arr[i + 1], arr[i + 2]);
          arr[i] += dx;
          arr[i + 1] += dy;
          arr[i + 2] += dz;
        }
        pos.needsUpdate = true;
        merged.computeBoundingSphere();
        merged.computeBoundingBox();
      }
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
