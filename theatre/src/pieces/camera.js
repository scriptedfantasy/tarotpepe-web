// PIECE: camera — the staging. Frontal, planimetric, dead-centre; cuts rather than drifts;
// when it moves it moves on a rail (lateral tracks, straight push-ins, whip pans), smooth in
// raw time (the camera is not a puppet). Named shots come from layout.shots; this piece may
// add more. API: cut(shot), move(shot, {duration, kind}), shots.
import * as THREE from 'three';

export const meta = {
  name: 'camera',
  judge: { shot: 'home', states: ['home', 'wide', 'pepe', 'table', 'spread', 'door'] },
  files: ['src/pieces/camera.js'],
};

export async function build(ctx) {
  const cam = ctx.camera;
  const shots = { ...ctx.layout.shots };
  let move = null;
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  const resolve = (s) => (typeof s === 'string' ? shots[s] : s) ?? shots.home;
  function apply(shot) {
    cam.position.set(...shot.pos);
    cam.up.set(...(shot.up ?? [0, 1, 0]));
    cam.lookAt(...shot.look);
    cam.fov = shot.fov ?? 30;
    cam.updateProjectionMatrix();
  }
  const api = {
    shots,
    current: 'home',
    cut(shot) {
      move = null;
      api.current = typeof shot === 'string' ? shot : 'custom';
      apply(resolve(shot));
    },
    move(shot, { duration = 1.2, kind = 'push' } = {}) {
      const to = resolve(shot);
      const from = { pos: cam.position.toArray(), look: api._look ?? to.look, fov: cam.fov, up: cam.up.toArray() };
      move = { from, to, t0: ctx.clock.raw, duration, kind };
      api.current = typeof shot === 'string' ? shot : 'custom';
      return new Promise((res) => (move.done = res));
    },
    setState(name) {
      api.cut(name in shots ? name : 'home');
    },
    update(ctx) {
      if (!move) return;
      let u = Math.min(1, (ctx.clock.raw - move.t0) / move.duration);
      const e = move.kind === 'whip' ? (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2) : 1 - Math.pow(1 - u, 3);
      cam.position.lerpVectors(tmpA.fromArray(move.from.pos), tmpB.fromArray(move.to.pos), e);
      const look = tmpA.fromArray(move.from.look).lerp(tmpB.fromArray(move.to.look), e);
      cam.up.set(...(move.to.up ?? [0, 1, 0]));
      cam.lookAt(look);
      api._look = look.toArray();
      cam.fov = move.from.fov + ((move.to.fov ?? 30) - move.from.fov) * e;
      cam.updateProjectionMatrix();
      if (u >= 1) {
        move.done?.();
        move = null;
      }
    },
  };
  api._look = shots.home.look;
  apply(shots.home);
  return api;
}
