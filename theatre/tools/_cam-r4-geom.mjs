// throwaway (camera round 4): where the frame's edges fall, computed off the shot table with the
// same three.js maths the piece uses — no dev server, so it still answers while the page is down.
//   node tools/_cam-r4-geom.mjs
import * as THREE from 'three';
import { LAYOUT as L } from '../src/core/layout.js';

const W = 1600, H = 900;
const zb = -L.room.depth / 2;
const spreadY = L.spread.y;
const [sx0, , sz0] = L.spread.slots[1];
const ahead = (p) => [p[0], p[1], zb];
const flat = (pos, fov, shift, extra = {}) => ({ pos, look: ahead(pos), fov, shift, ...extra });
const down = (x, y, z, fov) => ({ pos: [x, y, z], look: [x, spreadY, z], fov, up: [0, 0, -1] });

const shots = {
  wide: flat([0, 1.45, 6.4], 31, [0, 0]),
  home: flat([0, 1.80, 6.4], 24.5, [0, 0]),
  pepe: flat([0, 1.30, 2.9], 30, [0, 0]),
  table: flat([0, 1.86, 2.55], 28, [0, 0.64]),
  spread: down(sx0, 2.12, sz0, 30),
  card1: down(L.spread.slots[1][0], 1.32, L.spread.slots[1][2], 30),
  riffle: flat([L.deck.pos[0], 0.98, L.deck.pos[2] + 0.52], 30, [0, 0.7]),
  fan: down(0, 2.27, 0.207, 33),
};

// The things a top edge must not cut, in the plane they live in.
const P = {
  'ceiling@back': [0, 3.1, -2.5],
  'cornice@back': [0, 2.98, -2.5],
  'rail@back': [0, 2.6, -2.5],
  'TAROT sign top': [0, 2.59, -2.455],
  'VOYANTE top': [1.5, 2.41, -2.508],
  'door head': [1.5, 2.45, -2.5],
  'window head': [-1.5, 2.45, -2.5],
  'shutter top': [-1.5, 2.46, -2.5],
  'clock top': [0, 2.245, -2.47],
  'picture top': [-0.46, 2.27, -2.485],
  'picture bottom': [-0.46, 1.81, -2.485],
  'lamp rose': [0, 3.1, 0],
  'lamp petals bottom': [0, 2.45, 0],
  'pepe crown': [0, 1.37, -0.82],
  'pepe hands': [0.31, 0.7, -0.82],
  'table far rim': [0, 0.76, -0.62],
  'table near rim': [0, 0.76, 0.62],
  'floor @z=0': [0, 0, 0],
  'floor @z=-1': [-1.5, 0, -1],
  'slot L far': [-0.425, 0.7625, 0.026],
  'slot L near': [-0.425, 0.7625, 0.254],
  'slot R near': [0.425, 0.7625, 0.254],
  'fan mid far': [0, 0.7625, 0.326],
  'fan mid near': [0, 0.7625, 0.594],
  'fan end x': [0.365, 0.7625, 0.397],
  'deck top': [0.42, 0.7625, -0.06],
  'deck far L': [0.34, 0.78, -0.18],
  'deck near R': [0.50, 0.78, 0.06],
  'riffle high': [0.42, 0.87, -0.06],
  'riffle left': [0.273, 0.7625, -0.06],
  'riffle right': [0.567, 0.7625, -0.06],
};

const cam = new THREE.PerspectiveCamera(30, W / H, 0.03, 60);
const m = new THREE.Matrix4();
function set(shot) {
  const pos = new THREE.Vector3().fromArray(shot.pos);
  const look = new THREE.Vector3().fromArray(shot.look);
  const up = new THREE.Vector3().fromArray(shot.up ?? [0, 1, 0]);
  m.lookAt(pos, look, up);
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  cam.position.copy(pos);
  cam.quaternion.copy(q);
  cam.up.set(0, 1, 0).applyQuaternion(q);
  cam.fov = shot.fov ?? 30;
  const [sx, sy] = shot.shift ?? [0, 0];
  if (!sx && !sy) {
    if (cam.view?.enabled) cam.clearViewOffset();
    cam.aspect = W / H;
  } else cam.setViewOffset(W, H, sx * W, sy * H, W, H);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
}
const v = new THREE.Vector3();
const project = (p) => {
  v.set(p[0], p[1], p[2]).project(cam);
  return [(v.x + 1) / 2, (1 - v.y) / 2];
};

const only = process.argv.slice(2);
for (const [name, shot] of Object.entries(shots)) {
  if (only.length && !only.includes(name)) continue;
  set(shot);
  console.log(`\n== ${name}  pos ${shot.pos.map((n) => n.toFixed(2)).join(',')}  fov ${shot.fov}  shift ${(shot.shift ?? [0, 0]).join(',')}`);
  for (const [k, p] of Object.entries(P)) {
    const [x, y] = project(p);
    const inx = x >= 0 && x <= 1, iny = y >= 0 && y <= 1;
    const flagY = y < 0 ? 'ABOVE frame' : y > 1 ? 'below frame' : '';
    const flagX = x < 0 ? ' left of frame' : x > 1 ? ' right of frame' : '';
    console.log(`   ${k.padEnd(20)} x=${x.toFixed(3)} y=${y.toFixed(3)} ${flagY}${flagX}${inx && iny ? '' : ''}`);
  }
}
