// pepeAnim-rig.js — the puppet's strings. Wraps the posable parts pepe.js exposes (head group,
// eye groups, lid groups, the mouth lens, the shoulder → elbow → wrist → hand chains) behind one
// `apply(pose)` call. Arms are posed by a two-bone solve on the wrist target plus a hand
// orientation (fingers direction, palm direction) in Pepe's group space, exactly the way
// pepe-body.js posed the rest pose, so the rest pose is reproduced bit for bit.
//
// Pose shape (all numbers, all snapped by the caller — this file never eases anything):
//   { head: {tilt, nod, turn, lift}, eyes: {up, side}, lids: {close, wide}, mouth: 'rest'|'o'|'ah',
//     breath: 0..1, arms: { L: armPose, R: armPose } }
//   armPose = { W: Vector3 (wrist target), pole: Vector3 (elbow hint), fingers: Vector3, palm: Vector3 }
import * as THREE from 'three';

export const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);
const deg = THREE.MathUtils.degToRad;
const clamp = THREE.MathUtils.clamp;

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();

// Quaternion whose local +z is zDir and local +y is (as near as possible) yDir. Same maths as the
// `orient` helper in pepe-body.js.
export function orientQ(out, zDir, yDir = UP) {
  const z = _a.copy(zDir).normalize();
  const x = _b.crossVectors(yDir, z);
  if (x.lengthSq() < 1e-8) x.crossVectors(Math.abs(z.x) < 0.9 ? _e.set(1, 0, 0) : _e.set(0, 0, 1), z);
  x.normalize();
  const y = _c.crossVectors(z, x).normalize();
  _m.makeBasis(x, y, z);
  return out.setFromRotationMatrix(_m);
}

export const armPose = (W, pole, fingers, palm) => ({
  W: new THREE.Vector3(...W),
  pole: new THREE.Vector3(...pole).normalize(),
  fingers: new THREE.Vector3(...fingers).normalize(),
  palm: new THREE.Vector3(...palm).normalize(),
});

export const cloneArm = (p) => ({ W: p.W.clone(), pole: p.pole.clone(), fingers: p.fingers.clone(), palm: p.palm.clone() });

// out = a → b at k (0..1). Directions are nlerped: fine for the swings a hand makes.
export function lerpArm(out, a, b, k) {
  out.W.lerpVectors(a.W, b.W, k);
  out.pole.lerpVectors(a.pole, b.pole, k).normalize();
  out.fingers.lerpVectors(a.fingers, b.fingers, k).normalize();
  out.palm.lerpVectors(a.palm, b.palm, k).normalize();
  return out;
}

export function buildRig(ctx, pepe) {
  const P = pepe.parts ?? {};
  const g = pepe.group;
  g.updateMatrixWorld(true);
  const headY = ctx.layout.pepe.headY;
  const rig = { ok: !!P.head, head: P.head, arms: {}, headY };

  // ---- arms
  for (const side of ['L', 'R']) {
    const a = P.arms?.[side];
    if (!a) continue;
    const s = side === 'L' ? -1 : 1;
    const S = a.shoulder.position.clone();
    const E = g.worldToLocal(a.elbow.getWorldPosition(new THREE.Vector3()));
    const W = g.worldToLocal(a.wrist.getWorldPosition(new THREE.Vector3()));
    rig.arms[side] = {
      ...a,
      s,
      S,
      S0: S.clone(),
      len1: S.distanceTo(E),
      len2: E.distanceTo(W),
      rest: {
        W: W.clone(),
        pole: E.clone().sub(S).normalize(),
        fingers: new THREE.Vector3(s * 0.3, 0.04, 1).normalize(),
        palm: UP.clone(),
      },
    };
  }

  // ---- eyes and lids
  rig.eyes = P.eyes ?? [];
  rig.lids = (P.lids ?? []).map((lid) => ({ lid, x0: lid.rotation.x, z0: lid.rotation.z }));

  // ---- mouth: the red lens scales about its own centre into a pucker; an ink hole sits inside it
  rig.mouth = P.mouth ?? null;
  rig.mouthLine = P.mouthLine ?? null;
  rig.hole = null;
  rig.mouthC = new THREE.Vector3();
  rig.mouthFront = 0;
  if (P.lips && P.face) {
    P.lips.geometry.computeBoundingBox();
    const box = P.lips.geometry.boundingBox;
    box.getCenter(rig.mouthC);
    rig.mouthFront = box.max.z;
    const holeMat = pepe.mats?.ink ?? new THREE.MeshStandardMaterial({ color: '#1c1a17' });
    const hole = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), holeMat);
    hole.name = 'mouthHole';
    hole.castShadow = false;
    hole.receiveShadow = false;
    hole.visible = false;
    P.face.add(hole);
    rig.hole = hole;
  }
  rig.neck = P.neck ?? null;
  rig.neckY0 = rig.neck ? rig.neck.position.y : 0;

  // ---- solve one arm chain for an arm pose
  function solveArm(arm, pose) {
    const { S, len1, len2 } = arm;
    const d = _a.subVectors(pose.W, S);
    let dist = d.length();
    if (dist < 1e-6) dist = 1e-6;
    d.divideScalar(dist);
    dist = clamp(dist, Math.abs(len1 - len2) + 0.01, (len1 + len2) * 0.995);
    const cosA = clamp((len1 * len1 + dist * dist - len2 * len2) / (2 * len1 * dist), -1, 1);
    const ang = Math.acos(cosA);
    // the elbow bends toward the pole, in the plane of shoulder → wrist and pole
    const perp = _b.copy(pose.pole).addScaledVector(d, -pose.pole.dot(d));
    if (perp.lengthSq() < 1e-6) perp.set(arm.s, -0.6, 0.2).addScaledVector(d, -_c.set(arm.s, -0.6, 0.2).dot(d));
    perp.normalize();
    const E = _c.copy(S).addScaledVector(d, Math.cos(ang) * len1).addScaledVector(perp, Math.sin(ang) * len1);
    const dSE = _d.subVectors(E, S).normalize();
    arm.shoulder.quaternion.setFromUnitVectors(DOWN, dSE);
    const dEW = _e.subVectors(pose.W, E).normalize().applyQuaternion(_q.copy(arm.shoulder.quaternion).invert());
    arm.elbow.quaternion.setFromUnitVectors(DOWN, dEW);
    arm.shoulder.updateMatrixWorld(true);
    arm.wrist.getWorldQuaternion(_q);
    orientQ(_q2, pose.fingers, pose.palm);
    arm.hand.quaternion.copy(_q.invert().multiply(_q2));
  }

  rig.apply = (pose) => {
    if (!rig.ok) return;
    const head = rig.head;
    head.rotation.set(pose.head.nod, pose.head.turn, pose.head.tilt);
    head.position.y = headY + pose.head.lift + pose.breath * 0.004;
    if (rig.neck) rig.neck.position.y = rig.neckY0 + pose.breath * 0.003;
    for (const e of rig.eyes) e.rotation.set(-pose.eyes.up, pose.eyes.side, 0);
    for (const { lid, x0, z0 } of rig.lids) {
      lid.rotation.x = x0 + pose.lids.close * deg(72) - pose.lids.wide * deg(18);
      lid.rotation.z = z0;
    }
    if (rig.mouth) {
      const m = rig.mouth, c = rig.mouthC;
      let sx = 1, sy = 1, sz = 1, push = 0;
      if (pose.mouth === 'o') {
        sx = 0.42;
        sy = 1.75;
        sz = 1.25;
        push = 0.012;
      } else if (pose.mouth === 'ah') {
        sx = 0.8;
        sy = 1.6;
        sz = 1.15;
        push = 0.008;
      }
      m.scale.set(sx, sy, sz);
      m.position.set(c.x - c.x * sx, c.y - c.y * sy, c.z - c.z * sz + push);
      m.visible = pose.mouth !== 'none';
      if (rig.mouthLine) rig.mouthLine.visible = pose.mouth === 'rest';
      if (rig.hole) {
        rig.hole.visible = pose.mouth !== 'rest';
        if (pose.mouth === 'o') rig.hole.scale.set(0.016, 0.02, 0.008);
        else rig.hole.scale.set(0.04, 0.019, 0.008);
        rig.hole.position.set(c.x, c.y - (pose.mouth === 'o' ? 0.002 : 0.004), rig.mouthFront + push + 0.003);
      }
    }
    for (const side in rig.arms) {
      const arm = rig.arms[side];
      arm.shoulder.position.y = arm.S0.y + pose.breath * 0.006;
      arm.S.copy(arm.shoulder.position);
      solveArm(arm, pose.arms[side] ?? arm.rest);
    }
  };

  return rig;
}
