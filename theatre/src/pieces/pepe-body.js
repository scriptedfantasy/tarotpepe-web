// pepe-body.js — everything below the chin: the plain white long-sleeved robe (a lathed tunic with
// a rolled neckline, wide sleeves, cuffs, a few drape ridges for the ink pass to find), the crossed
// legs under the hem, green feet with long splayed toes, green hands with five splayed fingers,
// and the low bench with its flat cushion that he sits on. Units are metres in the pepe group's
// space (origin on the floor under him; +z toward the visitor).
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);

function flag(m) {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// A capsule from a to b (world/group space), radius r.
export function capsuleBetween(a, b, r, mat, { capSegs = 5, radial = 16, taper = 1 } = {}) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = taper === 1 ? new THREE.CapsuleGeometry(r, len, capSegs, radial) : taperedCapsule(r, r * taper, len, radial);
  const m = flag(new THREE.Mesh(geo, mat));
  m.position.copy(a).lerp(b, 0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  return m;
}

// A capsule with different radii at each end (a sleeve): a lathe of two arcs and a line.
function taperedCapsule(r0, r1, len, radial = 16) {
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
  return new THREE.LatheGeometry(pts, radial);
}

// A hand: origin at the wrist, fingers along +z, palm facing +y ("palm up"). side: -1 left, +1 right.
export function buildHand(side, skin) {
  const h = new THREE.Group();
  h.name = side < 0 ? 'handL' : 'handR';
  const palm = flag(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), skin));
  palm.scale.set(0.043, 0.012, 0.055);
  palm.position.set(0, 0, 0.048);
  h.add(palm);
  const wrist = flag(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), skin));
  wrist.scale.set(0.03, 0.013, 0.03);
  wrist.position.set(0, 0, 0.012);
  h.add(wrist);
  // four long frog fingers, fanned, curling up a little; the thumb out to the side
  const fingers = [
    { x: -0.031, len: 0.060, ang: -0.62, up: 0.22 },
    { x: -0.011, len: 0.074, ang: -0.22, up: 0.18 },
    { x: 0.010, len: 0.076, ang: 0.14, up: 0.18 },
    { x: 0.029, len: 0.064, ang: 0.50, up: 0.22 },
  ];
  for (const f of fingers) {
    const base = new THREE.Vector3(f.x * (side < 0 ? 1 : -1), 0.001, 0.086);
    const dir = new THREE.Vector3(Math.sin(f.ang) * (side < 0 ? 1 : -1), f.up, Math.cos(f.ang)).normalize();
    const tip = base.clone().addScaledVector(dir, f.len);
    const fm = capsuleBetween(base, tip, 0.0105, skin, { taper: 0.8 });
    fm.name = 'finger';
    h.add(fm);
    // a knuckle bump at the base so the finger reads as jointed
    const k = flag(new THREE.Mesh(new THREE.SphereGeometry(0.0125, 10, 8), skin));
    k.position.copy(base).addScaledVector(dir, 0.004);
    h.add(k);
  }
  const tb = new THREE.Vector3(side * 0.034, 0.0, 0.040);
  const tdir = new THREE.Vector3(side * 0.82, 0.30, 0.48).normalize();
  const thumb = capsuleBetween(tb, tb.clone().addScaledVector(tdir, 0.052), 0.0115, skin, { taper: 0.85 });
  thumb.name = 'thumb';
  h.add(thumb);
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
    { x: -0.030, len: 0.052, ang: -0.55 },
    { x: -0.010, len: 0.064, ang: -0.18 },
    { x: 0.010, len: 0.066, ang: 0.12 },
    { x: 0.030, len: 0.054, ang: 0.48 },
  ];
  for (const t of toes) {
    const base = new THREE.Vector3(t.x * (side < 0 ? 1 : -1), 0.014, 0.082);
    const dir = new THREE.Vector3(Math.sin(t.ang) * (side < 0 ? 1 : -1), 0.12, Math.cos(t.ang)).normalize();
    f.add(capsuleBetween(base, base.clone().addScaledVector(dir, t.len), 0.0115, skin, { taper: 0.85 }));
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

export function buildBody(ctx, mats, { headY, shoulderY = 0.995 }) {
  const { skin, robe, wood, cushion, collar: collarMat } = mats;
  const g = new THREE.Group();
  g.name = 'body';
  const parts = {};

  // ---- the bench: a low plank on two slab ends with a stretcher, and a flat cushion
  const bench = new THREE.Group();
  bench.name = 'bench';
  const seatY = 0.30;
  const plank = flag(new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.045, 0.44), wood));
  plank.position.set(0, seatY - 0.0225, 0.0);
  bench.add(plank);
  for (const sx of [-1, 1]) {
    const end = flag(new THREE.Mesh(new THREE.BoxGeometry(0.05, seatY - 0.045, 0.36), wood));
    end.position.set(sx * 0.5, (seatY - 0.045) / 2, 0);
    bench.add(end);
    const foot = flag(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.40), wood));
    foot.position.set(sx * 0.5, 0.015, 0);
    bench.add(foot);
  }
  const stretcher = flag(new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.035, 0.035), wood));
  stretcher.position.set(0, 0.10, 0);
  bench.add(stretcher);
  const pad = flag(new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.05, 0.40, 1, 1, 1), cushion));
  pad.position.set(0, seatY + 0.025, 0.0);
  bench.add(pad);
  // piping around the cushion edge
  const pipe = flag(new THREE.Mesh(new THREE.TorusGeometry(1, 0.007, 6, 60), cushion));
  pipe.rotation.x = Math.PI / 2;
  pipe.scale.set(0.45, 0.20, 1);
  pipe.position.set(0, seatY + 0.05, 0);
  bench.add(pipe);
  g.add(bench);
  parts.bench = bench;

  // ---- the crossed legs under the hem: a low wide mound, knees at the sides, shins crossing
  const legs = new THREE.Group();
  legs.name = 'legs';
  const mound = flag(new THREE.Mesh(new THREE.SphereGeometry(1, 36, 20), robe));
  mound.scale.set(0.40, 0.18, 0.28);
  mound.position.set(0, seatY + 0.18, 0.04);
  legs.add(mound);
  for (const sx of [-1, 1]) {
    const knee = flag(new THREE.Mesh(new THREE.SphereGeometry(0.10, 24, 16), robe));
    knee.position.set(sx * 0.35, seatY + 0.17, 0.12);
    legs.add(knee);
  }
  // shins: left shin in front, crossing to the right; right shin behind it
  const kneeL = new THREE.Vector3(-0.33, seatY + 0.17, 0.15);
  const kneeR = new THREE.Vector3(0.33, seatY + 0.17, 0.15);
  const ankleL = new THREE.Vector3(0.13, seatY + 0.11, 0.31);
  const ankleR = new THREE.Vector3(-0.11, seatY + 0.105, 0.25);
  legs.add(capsuleBetween(kneeL, ankleL, 0.075, robe, { taper: 0.85 }));
  legs.add(capsuleBetween(kneeR, ankleR, 0.075, robe, { taper: 0.85 }));
  // feet poking out from under the hem, toes splayed outward
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

  // ---- the tunic: a lathe, flattened front-to-back, from the hem over the legs to the neckline
  const hemY = seatY + 0.31;
  const prof = [
    [0.0, hemY - 0.03],
    [0.285, hemY - 0.03],
    [0.29, hemY],
    [0.235, hemY + 0.07],
    [0.19, hemY + 0.15],
    [0.175, hemY + 0.22],
    [0.18, shoulderY - 0.10],
    [0.195, shoulderY - 0.03],
    [0.19, shoulderY + 0.01],
    [0.15, shoulderY + 0.04],
    [0.11, shoulderY + 0.06],
    [0.095, shoulderY + 0.075],
    [0.0, shoulderY + 0.075],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const torso = flag(new THREE.Mesh(new THREE.LatheGeometry(prof, 48), robe));
  torso.name = 'torso';
  torso.scale.set(1, 1, 0.68);
  g.add(torso);
  parts.torso = torso;
  // neckline: a rolled band
  const collar = flag(new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.012, 10, 40), collarMat ?? robe));
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, shoulderY + 0.068, 0.0);
  collar.scale.set(1, 0.82, 1);
  g.add(collar);
  // a short green neck to fill the gap under the jaw
  const neck = flag(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 20), skin));
  neck.position.set(0, shoulderY + 0.07, 0.0);
  g.add(neck);
  parts.neck = neck;

  // ---- arms: a posable chain shoulder → elbow → wrist → hand, in wide sleeves with cuffs
  const armLen1 = 0.22, armLen2 = 0.27;
  const arms = {};
  for (const side of [-1, 1]) {
    const S = new THREE.Vector3(side * 0.20, shoulderY - 0.02, 0.0);
    const E = new THREE.Vector3(side * 0.29, 0.83, 0.12);
    const W = new THREE.Vector3(side * 0.235, 0.776, 0.385);
    const shoulder = new THREE.Group();
    shoulder.name = side < 0 ? 'shoulderL' : 'shoulderR';
    shoulder.position.copy(S);
    const dSE = new THREE.Vector3().subVectors(E, S).normalize();
    shoulder.quaternion.setFromUnitVectors(DOWN, dSE);
    // upper sleeve: its rounded top is the shoulder itself (one continuous shape, no ball joint)
    const upper = flag(new THREE.Mesh(taperedCapsule(0.074, 0.064, armLen1 - 0.03, 20), robe));
    upper.position.y = -armLen1 / 2 + 0.005;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.name = side < 0 ? 'elbowL' : 'elbowR';
    elbow.position.set(0, -armLen1, 0);
    const dEW = new THREE.Vector3().subVectors(W, E).normalize().applyQuaternion(shoulder.quaternion.clone().invert());
    elbow.quaternion.setFromUnitVectors(DOWN, dEW);
    shoulder.add(elbow);
    const lower = flag(new THREE.Mesh(taperedCapsule(0.062, 0.054, armLen2 - 0.03, 20), robe));
    lower.position.y = -armLen2 / 2 + 0.01;
    elbow.add(lower);
    // cuff: a fatter ring at the end of the sleeve
    const cuff = flag(new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.011, 10, 32), robe));
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -armLen2 + 0.02;
    elbow.add(cuff);
    const wrist = new THREE.Group();
    wrist.name = side < 0 ? 'wristL' : 'wristR';
    wrist.position.set(0, -armLen2, 0);
    elbow.add(wrist);
    const hand = buildHand(side, skin);
    wrist.add(hand);
    g.add(shoulder);
    // hand orientation: palm up on the table, fingers forward and a little outward
    g.updateMatrixWorld(true);
    const wq = wrist.getWorldQuaternion(new THREE.Quaternion());
    const want = new THREE.Object3D();
    orient(want, new THREE.Vector3(side * 0.30, 0.04, 1), UP);
    hand.quaternion.copy(wq.invert().multiply(want.quaternion));
    arms[side < 0 ? 'L' : 'R'] = { shoulder, elbow, wrist, hand };
  }
  parts.arms = arms;
  parts.handL = arms.L.hand;
  parts.handR = arms.R.hand;

  return { group: g, parts };
}
