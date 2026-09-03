// pepe-body.js — everything below the chin: the plain white long-sleeved robe (a narrow lathed
// tunic with a rolled neckline, long draped sleeves with cuffs, and drawn folds: two down the
// chest, a crease in each armpit, creases at the elbows, long lines along the sleeves, gathers at
// the cuffs), a short green neck, the crossed legs under the hem, green feet with long splayed
// toes, green hands held open to the visitor with four long fanned fingers and a thumb, and the
// low bench with its flat cushion that he sits on. Units are metres in the pepe group's space
// (origin on the floor under him; +z toward the visitor).
//
// Folds are not separate objects (the ink pass would outline them twice): each is a low, sharp
// ridge laid on the cloth and merged into the cloth's own geometry, so the pen finds one crease
// along its peak and nothing at its feet.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);

function flag(m) {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// A capsule from a to b (group space), radius r.
export function capsuleBetween(a, b, r, mat, { capSegs = 5, radial = 16, taper = 1 } = {}) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = taper === 1 ? new THREE.CapsuleGeometry(r, len, capSegs, radial) : taperedCapsule(r, r * taper, len, radial);
  const m = flag(new THREE.Mesh(geo, mat));
  m.position.copy(a).lerp(b, 0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  return m;
}

// The profile of a capsule with different radii at each end (a sleeve): two arcs and a line.
function taperedProfile(r0, r1, len) {
  const pts = [];
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (Math.PI / 2) * (i / n);
    pts.push(new THREE.Vector2(Math.cos(a) * r0, -len / 2 + Math.sin(a) * r0));
  }
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI / 2) * (i / n);
    pts.push(new THREE.Vector2(Math.cos(a) * r1, len / 2 + Math.sin(a) * r1));
  }
  return pts;
}
function taperedCapsule(r0, r1, len, radial = 16) {
  return new THREE.LatheGeometry(taperedProfile(r0, r1, len), radial);
}

// ---- drawn folds ---------------------------------------------------------------------------

// Points and outward normals on a lathe surface (three's convention: x = r sin φ, z = r cos φ, so
// φ = 0 faces +z), optionally squashed in z.
function latheSurface(profile, zScale = 1) {
  const pts = profile.map((p) => (p.isVector2 ? [p.x, p.y] : p)).slice().sort((a, b) => a[1] - b[1]);
  const rAt = (y) => {
    if (y <= pts[0][1]) return pts[0][0];
    for (let i = 1; i < pts.length; i++) {
      if (y <= pts[i][1]) {
        const [r0, y0] = pts[i - 1], [r1, y1] = pts[i];
        return y1 === y0 ? r1 : r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
      }
    }
    return pts[pts.length - 1][0];
  };
  const P = (phi, y) => new THREE.Vector3(rAt(y) * Math.sin(phi), y, zScale * rAt(y) * Math.cos(phi));
  const N = (phi, y) => {
    const dy = P(phi, y + 0.002).sub(P(phi, y - 0.002));
    const dp = P(phi + 0.01, y).sub(P(phi - 0.01, y));
    const n = new THREE.Vector3().crossVectors(dp, dy).normalize();
    if (n.dot(new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi))) < 0) n.negate();
    return n;
  };
  return { P, N, rAt };
}

// A fold: a long low tent with a sharp ridge, fading out at both ends. pts/nrm: the path on the
// cloth and the cloth's outward normal there.
function tentStrip(pts, nrm, { halfW = 0.0055, height = 0.003, sink = 0.0008 } = {}) {
  const n = pts.length;
  const pos = [], idx = [];
  const T = new THREE.Vector3(), B = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const p = pts[i], N = nrm[i];
    T.subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
    B.crossVectors(T, N).normalize();
    const t = i / (n - 1);
    const taper = Math.pow(Math.sin(Math.PI * t), 0.45);
    const h = height * taper, w = halfW * (0.35 + 0.65 * taper);
    const bl = p.clone().addScaledVector(B, -w).addScaledVector(N, -sink);
    const pk = p.clone().addScaledVector(N, h);
    const br = p.clone().addScaledVector(B, w).addScaledVector(N, -sink);
    pos.push(bl.x, bl.y, bl.z, pk.x, pk.y, pk.z, pk.x, pk.y, pk.z, br.x, br.y, br.z);
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * 4, b = a + 4;
    idx.push(a, a + 1, b, a + 1, b + 1, b); // left flank
    idx.push(a + 2, a + 3, b + 2, a + 3, b + 3, b + 2); // right flank
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// A fold on a lathe surface through (φ, y) control points (smoothly interpolated).
function foldOnLathe(surface, ctrl, steps = 18, opts = {}) {
  const curve = new THREE.CatmullRomCurve3(ctrl.map(([phi, y]) => new THREE.Vector3(phi, y, 0)), false, 'centripetal');
  const pts = [], nrm = [];
  for (let i = 0; i <= steps; i++) {
    const q = curve.getPoint(i / steps);
    pts.push(surface.P(q.x, q.y));
    nrm.push(surface.N(q.x, q.y));
  }
  return tentStrip(pts, nrm, opts);
}

// Merge folds into a cloth geometry (same object → no boundary lines, only the ridge creases).
function withFolds(geo, folds) {
  const g = geo.clone();
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  const merged = mergeGeometries([g, ...folds], false);
  return merged ?? g;
}

// The φ on a lathe mesh that faces a given direction (expressed in the mesh's parent-chain root).
function phiToward(mesh, dir) {
  const q = mesh.getWorldQuaternion(new THREE.Quaternion()).invert();
  const d = dir.clone().normalize().applyQuaternion(q);
  return Math.atan2(d.x, d.z);
}

// ---- hands and feet -------------------------------------------------------------------------

// A hand: origin at the wrist, fingers along +z, palm facing +y. side: -1 his right (stage left),
// +1 his left. Four long thin frog fingers fanned wide (each in two jointed segments, bending a
// little toward the palm), the thumb out to the side, a knuckle at every joint.
export function buildHand(side, skin) {
  const h = new THREE.Group();
  h.name = side < 0 ? 'handL' : 'handR';
  const mirror = side < 0 ? 1 : -1;
  // the palm: a flat pad whose far end lifts toward the visitor, so the open palm is seen
  const TILT = -0.4; // rotation about x: the far end rises
  const palm = flag(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), skin));
  palm.scale.set(0.05, 0.011, 0.056);
  palm.rotation.x = TILT;
  palm.position.set(0, 0.014, 0.052);
  h.add(palm);
  const heel = flag(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), skin));
  heel.scale.set(0.034, 0.012, 0.036);
  heel.rotation.x = TILT * 0.5;
  heel.position.set(0, 0.006, 0.016);
  h.add(heel);
  // the far edge of the palm, where the fingers start
  const edgeY = 0.014 + 0.056 * Math.sin(-TILT), edgeZ = 0.052 + 0.056 * Math.cos(TILT) - 0.008;
  const RISE = 0.36; // radians above the palm plane the fingers rise: resting open, not raised
  const fingers = [
    { x: -0.04, len: 0.088, ang: -0.62 },
    { x: -0.015, len: 0.104, ang: -0.22 },
    { x: 0.012, len: 0.106, ang: 0.17 },
    { x: 0.037, len: 0.092, ang: 0.56 },
  ];
  for (const f of fingers) {
    const base = new THREE.Vector3(f.x * mirror, edgeY - 0.004 + Math.abs(f.x) * 0.1, edgeZ - Math.abs(f.x) * 0.25);
    const dir = new THREE.Vector3(Math.sin(f.ang) * Math.cos(RISE) * mirror, Math.sin(RISE), Math.cos(f.ang) * Math.cos(RISE)).normalize();
    const mid = base.clone().addScaledVector(dir, f.len * 0.55);
    const dir2 = dir.clone().add(new THREE.Vector3(0, 0.22, 0.05)).normalize(); // the last joint curls up a little more
    const tip = mid.clone().addScaledVector(dir2, f.len * 0.45);
    const prox = capsuleBetween(base, mid, 0.0086, skin, { taper: 0.9, radial: 12 });
    prox.name = 'finger';
    h.add(prox);
    const dist = capsuleBetween(mid, tip, 0.0077, skin, { taper: 0.8, radial: 12 });
    dist.name = 'fingertip';
    h.add(dist);
    const k = flag(new THREE.Mesh(new THREE.SphereGeometry(0.0095, 10, 8), skin));
    k.position.copy(base).addScaledVector(dir, 0.003);
    h.add(k);
    const k2 = flag(new THREE.Mesh(new THREE.SphereGeometry(0.0084, 10, 8), skin));
    k2.position.copy(mid);
    h.add(k2);
  }
  // the thumb, on the outer side of the palm, out to the side and up
  const tb = new THREE.Vector3(side * 0.042, 0.02, 0.05);
  const tdir = new THREE.Vector3(side * 0.82, 0.42, 0.38).normalize();
  const tmid = tb.clone().addScaledVector(tdir, 0.038);
  const tdir2 = tdir.clone().add(new THREE.Vector3(0, 0.3, 0.2)).normalize();
  const thumb = capsuleBetween(tb, tmid, 0.0092, skin, { taper: 0.9, radial: 12 });
  thumb.name = 'thumb';
  h.add(thumb);
  const thumbTip = capsuleBetween(tmid, tmid.clone().addScaledVector(tdir2, 0.036), 0.0082, skin, { taper: 0.78, radial: 12 });
  h.add(thumbTip);
  const tk = flag(new THREE.Mesh(new THREE.SphereGeometry(0.0078, 10, 8), skin));
  tk.position.copy(tmid);
  h.add(tk);
  return h;
}

// A foot: origin at the ankle, toes along +z, sole at y=0. side: -1 left, +1 right.
export function buildFoot(side, skin) {
  const f = new THREE.Group();
  f.name = side < 0 ? 'footL' : 'footR';
  const sole = flag(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), skin));
  sole.scale.set(0.042, 0.017, 0.06);
  sole.position.set(0, 0.016, 0.04);
  f.add(sole);
  const toes = [
    { x: -0.03, len: 0.052, ang: -0.55 },
    { x: -0.01, len: 0.064, ang: -0.18 },
    { x: 0.01, len: 0.066, ang: 0.12 },
    { x: 0.03, len: 0.054, ang: 0.48 },
  ];
  for (const t of toes) {
    const base = new THREE.Vector3(t.x * (side < 0 ? 1 : -1), 0.014, 0.082);
    const dir = new THREE.Vector3(Math.sin(t.ang) * (side < 0 ? 1 : -1), 0.12, Math.cos(t.ang)).normalize();
    f.add(capsuleBetween(base, base.clone().addScaledVector(dir, t.len), 0.0105, skin, { taper: 0.8 }));
  }
  return f;
}

// Orient `obj` so its local +z points along zDir and its local +y along (roughly) yDir.
function orient(obj, zDir, yDir = UP) {
  const z = zDir.clone().normalize();
  const x = new THREE.Vector3().crossVectors(yDir, z).normalize();
  const y = new THREE.Vector3().crossVectors(z, x).normalize();
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

// ---- the body ------------------------------------------------------------------------------

export function buildBody(ctx, mats, { headY, shoulderY = 0.96 }) {
  const { skin, robe, wood, cushion, collar: collarMat } = mats;
  const g = new THREE.Group();
  g.name = 'body';
  const parts = {};

  // ---- the bench: a low plank on two slab ends with a stretcher, and a flat cushion
  const bench = new THREE.Group();
  bench.name = 'bench';
  const seatY = 0.3;
  const plank = flag(new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.045, 0.44), wood));
  plank.position.set(0, seatY - 0.0225, 0.0);
  bench.add(plank);
  for (const sx of [-1, 1]) {
    const end = flag(new THREE.Mesh(new THREE.BoxGeometry(0.05, seatY - 0.045, 0.36), wood));
    end.position.set(sx * 0.5, (seatY - 0.045) / 2, 0);
    bench.add(end);
    const foot = flag(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.4), wood));
    foot.position.set(sx * 0.5, 0.015, 0);
    bench.add(foot);
  }
  const stretcher = flag(new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.035, 0.035), wood));
  stretcher.position.set(0, 0.1, 0);
  bench.add(stretcher);
  const pad = flag(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.4, 1, 1, 1), cushion));
  pad.position.set(0, seatY + 0.025, 0.0);
  bench.add(pad);
  const pipe = flag(new THREE.Mesh(new THREE.TorusGeometry(1, 0.007, 6, 60), cushion));
  pipe.rotation.x = Math.PI / 2;
  pipe.scale.set(0.45, 0.2, 1);
  pipe.position.set(0, seatY + 0.05, 0);
  bench.add(pipe);
  g.add(bench);
  parts.bench = bench;

  // ---- the crossed legs under the hem: a low wide mound, knees at the sides, shins crossing
  const legs = new THREE.Group();
  legs.name = 'legs';
  const mound = flag(new THREE.Mesh(new THREE.SphereGeometry(1, 36, 20), robe));
  mound.scale.set(0.4, 0.18, 0.28);
  mound.position.set(0, seatY + 0.18, 0.04);
  legs.add(mound);
  for (const sx of [-1, 1]) {
    const knee = flag(new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), robe));
    knee.position.set(sx * 0.35, seatY + 0.17, 0.08);
    legs.add(knee);
  }
  const kneeL = new THREE.Vector3(-0.33, seatY + 0.17, 0.15);
  const kneeR = new THREE.Vector3(0.33, seatY + 0.17, 0.15);
  const ankleL = new THREE.Vector3(0.13, seatY + 0.11, 0.31);
  const ankleR = new THREE.Vector3(-0.11, seatY + 0.105, 0.25);
  legs.add(capsuleBetween(kneeL, ankleL, 0.075, robe, { taper: 0.85 }));
  legs.add(capsuleBetween(kneeR, ankleR, 0.075, robe, { taper: 0.85 }));
  const footL = buildFoot(-1, skin);
  footL.position.set(0.16, seatY + 0.05, 0.31);
  orient(footL, new THREE.Vector3(0.9, 0.05, 0.45));
  legs.add(footL);
  const footR = buildFoot(1, skin);
  footR.position.set(-0.14, seatY + 0.05, 0.25);
  orient(footR, new THREE.Vector3(-0.9, 0.05, 0.42));
  legs.add(footR);
  g.add(legs);
  parts.legs = legs;
  parts.feet = [footL, footR];

  // ---- the tunic: a narrow lathe, flattened front-to-back, hem over the legs up to the neckline
  const hemY = seatY + 0.31;
  const prof = [
    [0.0, hemY - 0.03],
    [0.285, hemY - 0.03],
    [0.29, hemY],
    [0.235, hemY + 0.07],
    [0.185, hemY + 0.15],
    [0.16, hemY + 0.22],
    [0.152, shoulderY - 0.1],
    [0.16, shoulderY - 0.03],
    [0.155, shoulderY + 0.01],
    [0.13, shoulderY + 0.045],
    [0.108, shoulderY + 0.068],
    [0.092, shoulderY + 0.084],
    [0.0, shoulderY + 0.084],
  ];
  const ZS = 0.68;
  const torsoGeo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 56);
  torsoGeo.scale(1, 1, ZS);
  torsoGeo.deleteAttribute('uv');
  torsoGeo.computeVertexNormals();
  const torsoSurf = latheSurface(prof, ZS);
  const torsoFolds = [];
  for (const sx of [-1, 1]) {
    // two long folds down the chest from the neckline, drifting outward
    torsoFolds.push(foldOnLathe(torsoSurf, [[sx * 0.14, shoulderY + 0.035], [sx * 0.2, shoulderY - 0.1], [sx * 0.3, shoulderY - 0.3], [sx * 0.34, hemY + 0.06]], 26, { height: 0.0022 }));
    // the armpit crease
    torsoFolds.push(foldOnLathe(torsoSurf, [[sx * 1.1, shoulderY - 0.035], [sx * 0.95, shoulderY - 0.09], [sx * 0.82, shoulderY - 0.16]], 12));
    // a short drape under the collar, off to one side
    torsoFolds.push(foldOnLathe(torsoSurf, [[sx * 0.55, shoulderY + 0.02], [sx * 0.6, shoulderY - 0.05], [sx * 0.62, shoulderY - 0.11]], 10, { height: 0.0018 }));
  }
  const torso = flag(new THREE.Mesh(withFolds(torsoGeo, torsoFolds), robe));
  torso.name = 'torso';
  g.add(torso);
  parts.torso = torso;
  // neckline: a rolled band
  const collar = flag(new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.011, 10, 40), collarMat ?? robe));
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, shoulderY + 0.08, 0.0);
  collar.scale.set(1, 0.76, 1);
  g.add(collar);
  // a short green neck between the collar and the jaw
  const neck = flag(new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.086, 0.1, 22), skin));
  neck.scale.z = 0.85;
  neck.position.set(0, shoulderY + 0.12, 0.0);
  g.add(neck);
  parts.neck = neck;

  // ---- arms: a posable chain shoulder → elbow → wrist → hand, in long sleeves with cuffs.
  // The forearms rest on the table, angled outward; the hands turn open to the visitor.
  const arms = {};
  for (const side of [-1, 1]) {
    const S = new THREE.Vector3(side * 0.17, shoulderY - 0.035, 0.0);
    const E = new THREE.Vector3(side * 0.3, 0.8, 0.16);
    const W = new THREE.Vector3(side * 0.4, 0.815, 0.42);
    const armLen1 = S.distanceTo(E), armLen2 = E.distanceTo(W);
    const shoulder = new THREE.Group();
    shoulder.name = side < 0 ? 'shoulderL' : 'shoulderR';
    shoulder.position.copy(S);
    const dSE = new THREE.Vector3().subVectors(E, S).normalize();
    shoulder.quaternion.setFromUnitVectors(DOWN, dSE);
    // upper sleeve: its rounded top is the shoulder itself (one continuous shape, no ball joint)
    const upLen = armLen1 - 0.02;
    const upper = flag(new THREE.Mesh(taperedCapsule(0.054, 0.062, upLen, 22), robe));
    upper.position.y = -armLen1 / 2 + 0.005;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.name = side < 0 ? 'elbowL' : 'elbowR';
    elbow.position.set(0, -armLen1, 0);
    const dEW = new THREE.Vector3().subVectors(W, E).normalize().applyQuaternion(shoulder.quaternion.clone().invert());
    elbow.quaternion.setFromUnitVectors(DOWN, dEW);
    shoulder.add(elbow);
    const loLen = armLen2 - 0.03;
    const lower = flag(new THREE.Mesh(taperedCapsule(0.046, 0.054, loLen, 22), robe));
    lower.position.y = -armLen2 / 2 + 0.012;
    elbow.add(lower);
    // cuff: a ring at the end of the sleeve
    const cuff = flag(new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.009, 10, 32), robe));
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -armLen2 + 0.018;
    elbow.add(cuff);
    const wrist = new THREE.Group();
    wrist.name = side < 0 ? 'wristL' : 'wristR';
    wrist.position.set(0, -armLen2, 0);
    elbow.add(wrist);
    const hand = buildHand(side, skin);
    wrist.add(hand);
    g.add(shoulder);
    g.updateMatrixWorld(true);

    // sleeve folds (in each sleeve's own lathe space; φ found from the directions they should face)
    const upSurf = latheSurface(taperedProfile(0.054, 0.062, upLen));
    const pFront = phiToward(upper, new THREE.Vector3(-side * 0.35, -0.25, 0.9));
    const pOut = phiToward(upper, new THREE.Vector3(side * 0.7, 0.35, 0.6));
    const upFolds = [
      foldOnLathe(upSurf, [[pFront, upLen / 2 - 0.04], [pFront + 0.15, 0], [pFront + 0.05, -upLen / 2 + 0.03]], 16),
      foldOnLathe(upSurf, [[pFront + 0.55, upLen / 2 - 0.02], [pFront + 0.62, -0.01], [pFront + 0.5, -upLen / 2 + 0.06]], 16, { height: 0.0024 }),
      foldOnLathe(upSurf, [[pOut, upLen / 2 - 0.06], [pOut - 0.1, -upLen / 2 + 0.05]], 12, { height: 0.0024 }),
      foldOnLathe(upSurf, [[pFront - 0.5, upLen / 2 - 0.05], [pFront - 0.42, -upLen / 2 + 0.09]], 12, { height: 0.0022 }),
    ];
    upper.geometry = withFolds(upper.geometry, upFolds);
    const loSurf = latheSurface(taperedProfile(0.046, 0.054, loLen));
    const qTop = phiToward(lower, new THREE.Vector3(0, 0.75, 0.65));
    const qOut = phiToward(lower, new THREE.Vector3(side, 0.35, 0.25));
    const qIn = phiToward(lower, new THREE.Vector3(-side, 0.4, 0.3));
    const loFolds = [
      // creases at the elbow, arcs on the upper side of the bend
      foldOnLathe(loSurf, [[qTop - 0.9, loLen / 2 - 0.012], [qTop, loLen / 2 - 0.006], [qTop + 0.9, loLen / 2 - 0.014]], 14),
      foldOnLathe(loSurf, [[qTop - 0.7, loLen / 2 - 0.036], [qTop + 0.1, loLen / 2 - 0.028], [qTop + 0.75, loLen / 2 - 0.04]], 12, { height: 0.0018 }),
      // long lines from the elbow toward the cuff
      foldOnLathe(loSurf, [[qOut, loLen / 2 - 0.05], [qOut + 0.2, 0], [qOut + 0.1, -loLen / 2 + 0.05]], 16),
      foldOnLathe(loSurf, [[qIn, loLen / 2 - 0.07], [qIn - 0.15, -loLen / 2 + 0.06]], 14, { height: 0.0024 }),
      foldOnLathe(loSurf, [[qTop + 0.35, loLen / 2 - 0.06], [qTop + 0.45, -0.01], [qTop + 0.3, -loLen / 2 + 0.05]], 14, { height: 0.0024 }),
      // gathers at the cuff
      foldOnLathe(loSurf, [[qTop - 0.55, -loLen / 2 + 0.003], [qTop - 0.45, -loLen / 2 + 0.04]], 6, { height: 0.0018 }),
      foldOnLathe(loSurf, [[qTop + 0.05, -loLen / 2 + 0.003], [qTop + 0.1, -loLen / 2 + 0.046]], 6, { height: 0.0018 }),
      foldOnLathe(loSurf, [[qTop + 0.6, -loLen / 2 + 0.003], [qTop + 0.68, -loLen / 2 + 0.036]], 6, { height: 0.0018 }),
    ];
    lower.geometry = withFolds(lower.geometry, loFolds);

    // hand orientation: heel on the cloth, palm turned up and open to the visitor, fingers fanned
    // outward and a little down, the thumb up
    const wq = wrist.getWorldQuaternion(new THREE.Quaternion());
    const want = new THREE.Object3D();
    orient(want, new THREE.Vector3(side * 0.3, 0.04, 1), UP);
    hand.quaternion.copy(wq.invert().multiply(want.quaternion));
    arms[side < 0 ? 'L' : 'R'] = { shoulder, elbow, wrist, hand };
  }
  parts.arms = arms;
  parts.handL = arms.L.hand;
  parts.handR = arms.R.hand;

  return { group: g, parts };
}
