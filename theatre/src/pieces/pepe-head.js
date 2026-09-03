// pepe-head.js — the supplied head (public/pepe/head-lowpoly.glb), mounted and dressed to match the
// meditation drawing: flat green skin (no photo texture); the model's grin buried under a smooth
// skin shell merged into the skull so the ink pass finds no line there; a small closed mouth low
// on the muzzle — two red lips, the lower one fuller, one thin parting line between them; the
// wild eyes replaced by paper-white balls that rise above the crown as two domes, each under a
// heavy green half-lid whose lower edge is the one thick curved line of the face, with a small
// pupil tucked just under it. The head is a squashed bun, wider than tall, tilted a little toward
// the visitor so the muzzle reads as a snout.
import * as THREE from 'three';
import { inkMaterial } from '../core/strokes.js';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { bakedJSON } from '../core/bake.js';

export const HEAD_H = 0.33; // metres, crown to jaw
export const WIDEN = 1.18; // x-stretch of the whole face, drawing proportion
export const TILT = 8; // degrees the face dips toward the visitor

const clamp = THREE.MathUtils.clamp;
const rad = THREE.MathUtils.degToRad;

// Load the head GLB with its photo textures stripped out of the JSON before parsing: we paint the
// skin flat, so decoding two 4096² PNGs would only cost seconds of build time for nothing.
async function loadFlatGlb(url) {
  const buf = await (await fetch(url)).arrayBuffer();
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('not a GLB');
  const jsonLen = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
  delete json.images;
  delete json.textures;
  delete json.samplers;
  for (const m of json.materials ?? []) {
    if (m.pbrMetallicRoughness) {
      delete m.pbrMetallicRoughness.baseColorTexture;
      delete m.pbrMetallicRoughness.metallicRoughnessTexture;
    }
    delete m.normalTexture;
    delete m.occlusionTexture;
    delete m.emissiveTexture;
  }
  let js = new TextEncoder().encode(JSON.stringify(json));
  const pad = (4 - (js.length % 4)) % 4;
  if (pad) {
    const p = new Uint8Array(js.length + pad);
    p.set(js);
    p.fill(0x20, js.length);
    js = p;
  }
  const rest = new Uint8Array(buf, 20 + jsonLen);
  const out = new ArrayBuffer(20 + js.length + rest.length);
  const odv = new DataView(out);
  odv.setUint32(0, 0x46546c67, true);
  odv.setUint32(4, 2, true);
  odv.setUint32(8, out.byteLength, true);
  odv.setUint32(12, js.length, true);
  odv.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(out, 20).set(js);
  new Uint8Array(out, 20 + js.length).set(rest);
  return new Promise((res, rej) => new GLTFLoader().parse(out, '', res, rej));
}

function flag(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// The muzzle. Sample points on a muzzle ellipsoid, cast a ray in along its normal to find the real
// skin, bridge across the model's grin; that skin-offset field carries (a) a smooth green shell
// that buries the grin (merged into the skull mesh, so no object boundary is drawn around it) and
// (b) the small red mouth sitting on the shell: lower lip, upper lip, and the parting line.
async function buildMouth({ skull, face, lipsMat, inkMat }) {
  const K = HEAD_H / 0.36;
  const A = 0.19 * K, B = 0.14 * K, C = 0.182 * K, cy = -0.05 * K, cz = -0.002; // muzzle ellipsoid (face-local, pre-widen)
  // the sheet: u runs around the muzzle (±70°), v up it; y = yc0 + smile·u² + v·h(u)
  const yc0 = -0.086, smile = 0.036, H = 0.062, alphaMax = rad(70);
  const hOf = (u) => H * Math.sqrt(Math.max(0, 1 - u * u)) + 0.006;
  const base = (u, v) => {
    const alpha = u * alphaMax;
    const y = yc0 + smile * u * u + v * hOf(u);
    const yy = clamp((y - cy) / B, -0.985, 0.985);
    const rho = Math.sqrt(1 - yy * yy);
    const P = new THREE.Vector3(A * rho * Math.sin(alpha), y, cz + C * rho * Math.cos(alpha));
    const N = new THREE.Vector3(P.x / (A * A), (P.y - cy) / (B * B), (P.z - cz) / (C * C)).normalize();
    return { P, N };
  };

  // skin-offset field, raycast against the skull in pre-widen, untilted face space
  const savedScale = face.scale.clone(), savedRot = face.rotation.clone();
  face.scale.set(1, 1, 1);
  face.rotation.set(0, 0, 0);
  face.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  ray.near = 0;
  ray.far = 0.3;
  const surf = (P, N) => {
    ray.set(P.clone().addScaledVector(N, 0.12), N.clone().negate());
    const hits = ray.intersectObject(skull, false);
    return hits.length ? 0.12 - hits[0].distance : null;
  };
  const NU = 48, NV = 12;
  // ~640 raycasts against the skull: seconds in the judging browser, so the field is baked
  const D = await bakedJSON(
    'pepe-mouth-field',
    () => {
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
      return D;
    },
    { deps: [buildMouth, HEAD_H, WIDEN] },
  );
  const skullInv = skull.matrixWorld.clone().invert();
  face.scale.copy(savedScale);
  face.rotation.copy(savedRot);
  face.updateMatrixWorld(true);
  const field = (u, v) => {
    const fi = ((u + 1) / 2) * NU, fj = ((v + 1) / 2) * NV;
    const i0 = clamp(Math.floor(fi), 0, NU - 1), j0 = clamp(Math.floor(fj), 0, NV - 1);
    const tu = clamp(fi - i0, 0, 1), tv = clamp(fj - j0, 0, 1);
    return D[i0][j0] * (1 - tu) * (1 - tv) + D[i0 + 1][j0] * tu * (1 - tv) + D[i0][j0 + 1] * (1 - tu) * tv + D[i0 + 1][j0 + 1] * tu * tv;
  };
  // the shell's height above the skull: a gentle puff, tucked under the skin at the sheet's edges
  const shellOff = (u, v) => {
    const edge = Math.max(0, Math.abs(v) - 0.6) / 0.4;
    return 0.005 * (1 - v * v) * (0.3 + 0.7 * (1 - u * u)) - 0.004 * edge * edge + 0.0015;
  };

  // a strip of the sheet between vLo(u) and vHi(u), lifted off the skin by off(u, t, v), t ∈ [-1,1] across
  const sheet = ({ vLo, vHi, off, uMax = 1, segsU = 64, segsV = 16 }) => {
    const pos = [], idx = [];
    for (let i = 0; i <= segsU; i++) {
      const u = (-1 + (2 * i) / segsU) * uMax;
      const lo = vLo(u), hi = vHi(u);
      for (let j = 0; j <= segsV; j++) {
        const t = -1 + (2 * j) / segsV;
        const v = lo + ((t + 1) / 2) * (hi - lo);
        const { P, N } = base(u, v);
        const o = field(u, v) + off(u, t, v);
        pos.push(P.x + N.x * o, P.y + N.y * o, P.z + N.z * o);
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

  // (a) the shell over the whole grin, in the skull's own coordinates so it can be merged
  const shell = sheet({ vLo: () => -1, vHi: () => 1, off: (u, t, v) => shellOff(u, v), uMax: 1, segsU: 72, segsV: 18 });
  shell.applyMatrix4(skullInv);

  // (b) the mouth: a band 60% of the head wide, low on the muzzle, corners a little up
  const uL = 0.5, ym0 = -0.081, smileL = 0.05, HB = 0.0275;
  const hb = (u) => {
    const q = clamp(Math.abs(u) / uL, 0, 1);
    return HB * Math.sqrt(Math.max(0, 1 - q ** 6)) * (1 - 0.25 * q * q);
  };
  const ym = (u) => ym0 + smileL * u * u;
  const vOf = (u, y) => (y - yc0 - smile * u * u) / hOf(u);
  const part = 0.28; // the parting sits above centre: the lower lip is the fuller one
  const bulge = (u, amp) => amp * Math.pow(hb(u) / HB, 0.7);
  const lipOff = (amp) => (u, t, v) => shellOff(u, v) + 0.0005 + bulge(u, amp) * Math.pow(Math.max(0, 1 - t * t), 0.55);
  const lower = flag(new THREE.Mesh(sheet({ vLo: (u) => vOf(u, ym(u) - hb(u)), vHi: (u) => vOf(u, ym(u) + (part - 0.05) * hb(u)), off: lipOff(0.0095), uMax: uL, segsU: 56, segsV: 14 }), lipsMat));
  lower.name = 'lips';
  const upper = flag(new THREE.Mesh(sheet({ vLo: (u) => vOf(u, ym(u) + (part + 0.05) * hb(u)), vHi: (u) => vOf(u, ym(u) + hb(u)), off: lipOff(0.0065), uMax: uL, segsU: 56, segsV: 10 }), lipsMat));
  upper.name = 'lipUpper';
  const line = new THREE.Mesh(sheet({ vLo: (u) => vOf(u, ym(u) + (part - 0.025) * hb(u)), vHi: (u) => vOf(u, ym(u) + (part + 0.025) * hb(u)), off: (u, t, v) => shellOff(u, v) + 0.0012, uMax: uL * 0.97, segsU: 40, segsV: 2 }), inkMat);
  line.name = 'mouthLine';

  const mouth = new THREE.Group();
  mouth.name = 'mouth';
  mouth.add(lower, upper, line);
  return { shell, mouth, lips: lower, upper, line };
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

  let gltf;
  try {
    gltf = await loadFlatGlb('/pepe/head-lowpoly.glb');
  } catch (e) {
    console.warn('[pepe] flat GLB load failed, falling back to the tracked loader', e);
    gltf = await ctx.assets.gltf('/pepe/head-lowpoly.glb');
  }
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
    for (const k of Object.keys(geo.attributes)) if (k !== 'position') geo.deleteAttribute(k);
    const merged = mergeVertices(geo, 1e-4);
    merged.computeVertexNormals();
    skull.geometry = merged;
  } catch (e) {
    console.warn('[pepe] skull smoothing skipped', e);
  }
  // the skull: flat green, drawn by the ink pass. Keep both sides: the grin cavity is open-backed.
  const skinColor = skin.color.getStyle();
  skull.material = inkMaterial({ color: skinColor, colorful: true, hatch: 0.35, side: THREE.DoubleSide });
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
    eyeSpec.push({ c: new THREE.Vector3(-0.07, 0.045, 0.09), r: 0.062 }, { c: new THREE.Vector3(0.07, 0.045, 0.09), r: 0.062 });
  }

  // eyes: two domes on the crown. A paper-white ball pushed up and forward out of the model's
  // socket, a small black pupil sunk into it just under the lid line, a heavy green half-lid
  // (a sphere cap, its lower edge the one thick line of the face; no rolled rim: the rim drew as
  // a second bar). The lid's material asks the ink pass for a heavier pen.
  const lidMat = inkMaterial({ color: skinColor, colorful: true, hatch: 0.35, lineWeight: 1.75 });
  eyeSpec.forEach(({ c, r: r0 }, i) => {
    const side = i === 0 ? -1 : 1;
    const r = r0 * 1.16;
    const eye = new THREE.Group();
    eye.name = 'eye' + (side < 0 ? 'L' : 'R');
    eye.position.copy(c).add(new THREE.Vector3(0, 0.03, 0.012));
    const ball = flag(new THREE.Mesh(new THREE.SphereGeometry(r, 32, 22), white));
    eye.add(ball);
    const gaze = new THREE.Vector3(-side * 0.1, -0.2, 0.97).normalize();
    const pupil = flag(new THREE.Mesh(new THREE.SphereGeometry(r * 0.36, 20, 14), ink));
    pupil.scale.set(0.82 / WIDEN, 1, 0.5);
    pupil.position.copy(gaze).multiplyScalar(r * 0.9);
    pupil.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), gaze);
    eye.add(pupil);
    face.add(eye);

    const lid = new THREE.Group();
    lid.name = 'lid' + (side < 0 ? 'L' : 'R');
    lid.position.copy(eye.position);
    const R = r * 1.05;
    const cap = flag(new THREE.Mesh(new THREE.SphereGeometry(R, 32, 18, 0, Math.PI * 2, 0, rad(66)), lidMat));
    lid.add(cap);
    lid.rotation.z = side * rad(-5);
    lid.rotation.x = rad(14);
    face.add(lid);

    parts.eyes.push(eye);
    parts.pupils.push(pupil);
    parts.lids.push(lid);
  });

  const m = await buildMouth({ skull, face, lipsMat: lips, inkMat: ink });
  // bury the model's grin: the shell joins the skull mesh so no boundary is drawn around it
  try {
    const merged = mergeGeometries([skull.geometry, m.shell], false);
    if (merged) skull.geometry = merged;
    else console.warn('[pepe] muzzle shell not merged (attribute mismatch)');
  } catch (e) {
    console.warn('[pepe] muzzle shell merge failed', e);
  }
  face.add(m.mouth);
  parts.mouth = m.mouth;
  parts.lips = m.lips;
  parts.lipUpper = m.upper;
  parts.mouthLine = m.line;

  // the snout: the whole face dips a little toward the visitor
  face.rotation.x = rad(TILT);

  return parts;
}
