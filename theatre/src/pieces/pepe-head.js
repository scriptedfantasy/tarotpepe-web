// pepe-head.js — the supplied head (public/pepe/head-lowpoly.glb), mounted and dressed to match the
// meditation drawing: flat green skin (no photo texture), the grin closed behind a wide lens of red
// lips with an ink line between them, the wild eyes replaced by paper-white eyeballs under heavy
// green half-lids, the pupils looking a hair to the side. The skull is widened a little: Pepe's
// head in the drawing is a squashed bun, wider than it is tall.
import * as THREE from 'three';
import { inkMaterial } from '../core/strokes.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const HEAD_H = 0.36; // metres, crown to jaw
export const WIDEN = 1.22; // x-stretch of the whole face, drawing proportion

const clamp = THREE.MathUtils.clamp;

function flag(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// The mouth. A lens of lips that hugs the real skull: sample points on a muzzle ellipsoid, cast a
// ray in along its normal to find the skin, bridge across the open grin, then puff the lips out
// from that surface. Rows near the lens edge tuck under the skin so nothing floats.
function buildMouth({ skull, face, lipsMat, inkMat }) {
  const A = 0.19, B = 0.14, C = 0.182, cy = -0.05, cz = -0.002; // muzzle ellipsoid (face-local, pre-widen)
  const yc0 = -0.094, smile = 0.046, H = 0.046, alphaMax = THREE.MathUtils.degToRad(70);
  const base = (u, v) => {
    const alpha = u * alphaMax;
    const h = H * Math.pow(Math.max(0, 1 - u * u), 0.5) + 0.006;
    const y = yc0 + smile * u * u + v * h;
    const yy = clamp((y - cy) / B, -0.985, 0.985);
    const rho = Math.sqrt(1 - yy * yy);
    const P = new THREE.Vector3(A * rho * Math.sin(alpha), y, cz + C * rho * Math.cos(alpha));
    const N = new THREE.Vector3(P.x / (A * A), (P.y - cy) / (B * B), (P.z - cz) / (C * C)).normalize();
    return { P, N };
  };

  // skin-offset field, raycast against the skull in pre-widen face space
  const savedScale = face.scale.clone();
  face.scale.set(1, 1, 1);
  face.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  ray.near = 0;
  ray.far = 0.3;
  const surf = (P, N) => {
    ray.set(P.clone().addScaledVector(N, 0.12), N.clone().negate());
    const hits = ray.intersectObject(skull, false);
    return hits.length ? 0.12 - hits[0].distance : null;
  };
  const NU = 44, NV = 11;
  const D = [];
  for (let i = 0; i <= NU; i++) {
    const u = -1 + (2 * i) / NU;
    const col = [];
    for (let j = 0; j <= NV; j++) {
      const v = -1 + (2 * j) / NV;
      const { P, N } = base(u, v);
      col.push(surf(P, N));
    }
    const valid = col.map((d) => d != null && d > -0.03 && d < 0.04);
    for (let j = 0; j <= NV; j++) {
      if (valid[j]) continue;
      let a = j - 1;
      while (a >= 0 && !valid[a]) a--;
      let b = j + 1;
      while (b <= NV && !valid[b]) b++;
      const da = a >= 0 ? col[a] : null, db = b <= NV ? col[b] : null;
      col[j] = da != null && db != null ? da + ((db - da) * (j - a)) / (b - a) : (da ?? db ?? 0);
    }
    D.push(col);
  }
  face.scale.copy(savedScale);
  face.updateMatrixWorld(true);
  const field = (u, v) => {
    const fi = ((u + 1) / 2) * NU, fj = ((v + 1) / 2) * NV;
    const i0 = clamp(Math.floor(fi), 0, NU - 1), j0 = clamp(Math.floor(fj), 0, NV - 1);
    const tu = clamp(fi - i0, 0, 1), tv = clamp(fj - j0, 0, 1);
    return D[i0][j0] * (1 - tu) * (1 - tv) + D[i0 + 1][j0] * tu * (1 - tv) + D[i0][j0 + 1] * (1 - tu) * tv + D[i0 + 1][j0 + 1] * tu * tv;
  };

  const sheet = ({ vMin, vMax, puff, sink, lift, segsU = 64, segsV = 16, uMax = 1 }) => {
    const pos = [], idx = [];
    for (let i = 0; i <= segsU; i++) {
      const u = (-1 + (2 * i) / segsU) * uMax;
      for (let j = 0; j <= segsV; j++) {
        const vv = -1 + (2 * j) / segsV;
        const v = vMin + ((vv + 1) / 2) * (vMax - vMin);
        const { P, N } = base(u, v);
        const edge = Math.max(0, Math.abs(vv) - 0.7) / 0.3;
        const off = field(u, v) + puff * (1 - vv * vv) * (0.35 + 0.65 * (1 - u * u)) - sink * edge * edge + lift;
        pos.push(P.x + N.x * off, P.y + N.y * off, P.z + N.z * off);
      }
    }
    for (let i = 0; i < segsU; i++) {
      for (let j = 0; j < segsV; j++) {
        const a = i * (segsV + 1) + j, b = a + segsV + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };

  const mouth = new THREE.Group();
  mouth.name = 'mouth';
  const lips = flag(new THREE.Mesh(sheet({ vMin: -1, vMax: 1, puff: 0.012, sink: 0.014, lift: 0.0 }), lipsMat));
  lips.name = 'lips';
  mouth.add(lips);
  // the line between the lips sits a little above centre (the lower lip is the fuller one)
  const line = new THREE.Mesh(sheet({ vMin: 0.12, vMax: 0.36, puff: 0.012, sink: 0, lift: 0.0025, segsV: 4, uMax: 0.985 }), inkMat);
  line.name = 'mouthLine';
  mouth.add(line);
  return { mouth, lips, line };
}

export async function buildHead(ctx, mats) {
  const { skin, lips, ink, white } = mats;
  const head = new THREE.Group();
  head.name = 'head';
  const face = new THREE.Group();
  face.name = 'face';
  face.scale.set(WIDEN, 1, 1);
  head.add(face);
  const parts = { head, face, eyes: [], lids: [], pupils: [], mouth: null, skull: null };

  const gltf = await ctx.assets.gltf('/pepe/head-lowpoly.glb');
  const model = gltf.scene;
  let skull = null, tongue = null, eyesMesh = null;
  model.traverse((o) => {
    if (!o.isMesh) return;
    const n = (o.name || '').toLowerCase();
    if (n.includes('tongue')) tongue = o;
    else if (n.includes('eyes')) eyesMesh = o;
    else if (!skull) skull = o;
  });
  if (!skull) throw new Error('head-lowpoly.glb has no skull mesh');
  model.updateMatrixWorld(true);

  // fit: skull height → HEAD_H, skull centre → origin of the face group
  const box = new THREE.Box3().setFromObject(skull);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const s = HEAD_H / size.y;
  model.scale.setScalar(s);
  model.position.copy(centre).multiplyScalar(-s);
  face.add(model);
  parts.skull = skull;
  parts.bounds = { w: size.x * s * WIDEN, h: size.y * s, d: size.z * s };

  // smooth the skull: drop the photo UVs, merge the split vertices, recompute normals — the ink
  // pass then draws its silhouette and real creases, not every polygon seam of the low-poly mesh
  try {
    const geo = skull.geometry.clone();
    geo.deleteAttribute('uv');
    geo.deleteAttribute('normal');
    const merged = mergeVertices(geo, 1e-4);
    merged.computeVertexNormals();
    skull.geometry = merged;
  } catch (e) {
    console.warn('[pepe] skull smoothing skipped', e);
  }
  // the skull: flat green, drawn by the ink pass. Keep both sides: the grin cavity is open-backed.
  skull.material = inkMaterial({ color: skin.color.getStyle(), colorful: true, hatch: 0.35, side: THREE.DoubleSide });
  flag(skull);
  if (tongue) tongue.visible = false;

  // eye centres from the supplied eyeballs (then we replace them with our own)
  const eyeSpec = [];
  if (eyesMesh) {
    const p = eyesMesh.geometry.attributes.position;
    const v = new THREE.Vector3();
    const boxes = [new THREE.Box3(), new THREE.Box3()];
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(eyesMesh.matrixWorld);
      boxes[v.x < 0 ? 0 : 1].expandByPoint(v);
    }
    for (const b of boxes) {
      const c = b.getCenter(new THREE.Vector3()).multiplyScalar(s).add(model.position);
      const sz = b.getSize(new THREE.Vector3()).multiplyScalar(s);
      eyeSpec.push({ c, r: sz.y / 2 });
    }
    eyesMesh.visible = false;
  } else {
    eyeSpec.push({ c: new THREE.Vector3(-0.075, 0.05, 0.1), r: 0.068 }, { c: new THREE.Vector3(0.075, 0.05, 0.1), r: 0.068 });
  }

  // eyes: paper-white balls, a black pupil dome, a heavy green lid with a rolled rim
  const gaze = new THREE.Vector3(0.2, -0.30, 1).normalize();
  eyeSpec.forEach(({ c, r }, i) => {
    const side = i === 0 ? -1 : 1;
    const eye = new THREE.Group();
    eye.name = 'eye' + (side < 0 ? 'L' : 'R');
    eye.position.copy(c);
    const ball = flag(new THREE.Mesh(new THREE.SphereGeometry(r * 1.02, 28, 20), white));
    eye.add(ball);
    const pupil = flag(new THREE.Mesh(new THREE.SphereGeometry(r * 0.43, 20, 14), ink));
    pupil.scale.set(0.92 / WIDEN, 1, 0.32);
    pupil.position.copy(gaze).multiplyScalar(r * 1.0);
    pupil.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), gaze);
    eye.add(pupil);
    face.add(eye);

    const lid = new THREE.Group();
    lid.name = 'lid' + (side < 0 ? 'L' : 'R');
    lid.position.copy(c);
    const R = r * 1.075;
    const theta = THREE.MathUtils.degToRad(95);
    const cap = flag(new THREE.Mesh(new THREE.SphereGeometry(R, 30, 18, 0, Math.PI * 2, 0, theta), skin));
    lid.add(cap);
    const rim = flag(new THREE.Mesh(new THREE.TorusGeometry(R * Math.sin(theta), 0.0042, 8, 40), skin));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = R * Math.cos(theta);
    lid.add(rim);
    lid.rotation.z = side * THREE.MathUtils.degToRad(-7);
    lid.rotation.x = THREE.MathUtils.degToRad(9);
    face.add(lid);

    parts.eyes.push(eye);
    parts.pupils.push(pupil);
    parts.lids.push(lid);
  });

  const m = buildMouth({ skull, face, lipsMat: lips, inkMat: ink });
  face.add(m.mouth);
  parts.mouth = m.mouth;
  parts.lips = m.lips;
  parts.mouthLine = m.line;

  return parts;
}
