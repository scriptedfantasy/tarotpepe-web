// PIECE: camera — the staging. A view camera on a rail: every shot is square to the back wall
// (the lens axis at 90° to it, verticals vertical, the far wall a flat elevation) and framed by a
// rise or fall of the lens (`shift`) rather than a tilt, the way the drawn frames keep the wall
// flat while the floor and the tabletop read from above. Long lenses, pulled back, so the side
// walls are slivers and nothing converges hard. The camera cuts; when it moves it moves on a rail:
// a lateral track at constant speed, a straight push down the axis, or a whip — three frames of
// big displacement and a hard stop, no blur (stop-motion has no blur). Tracks and pushes run in
// ctx.clock.raw (the camera is not a puppet); the whip runs on the 12fps frame count.
//
// ROUND 5 — the shots are no longer written here as lenses. A shot is a position and a list of
// things that must be IN THE PICTURE, and the lens is solved for the window the film is being shown
// in: see camera-shots.js (what each frame must contain, and why) and camera-frame.js (the
// arithmetic). Two things follow that this file has to do: the table is rebuilt on every resize,
// and the camera goes back onto its current shot when it is, so a window dragged from 16:9 to a
// phone re-frames instead of cropping.
//
// ROUND 6 — the shots over the TABLE are solved by a second solver, camera-plan.js, which frames
// them the opposite way round: no lens rise at all, the camera standing on the room's axis of
// symmetry, and the point it looks at IS the centre of the frame. That is what makes a plan read
// as a plan — the row of three parallel to the frame's top edge, the cards square to it, the rim a
// true circle — rather than as the casual three-quarter a shifted lens over a table produces. This
// file does not care which solver made a shot: both return {pos, look, up, fov, shift}.
//
// API: shots (the named shots; every layout name is kept, others added), current, cut(shot),
//      move(shot, {kind: 'cut'|'push'|'track'|'whip', duration}), sequence([{shot, kind, duration, hold}]),
//      stop(), setState(name).
// A shot is {pos, look, fov, up?, shift?: [x, y]} — shift in fractions of the frame, +y = the frame
// drops (shows more floor) while the camera keeps looking straight ahead.
import * as THREE from 'three';
import { buildShots } from './camera-shots.js';

export const meta = {
  name: 'camera',
  judge: { shot: 'home', states: ['home', 'wide', 'pepe', 'table', 'spread', 'fan', 'turn', 'riffle', 'card1', 'door', 'track', 'whip'] },
  files: ['src/pieces/camera.js', 'src/pieces/camera-shots.js', 'src/pieces/camera-frame.js'],
};

// Motor speeds of the rail: a lateral track, a push. Metres per second.
const TRACK_SPEED = 0.62;
const PUSH_SPEED = 0.55;
// The whip: the fraction of the way travelled at each 12fps frame after the start frame, then a hard stop.
const WHIP_FRAMES = [0.34, 0.74, 1];

export async function build(ctx) {
  const cam = ctx.camera;
  const L = ctx.layout;
  const aspect = () => {
    const w = ctx.size?.w || window.innerWidth || 1600, h = ctx.size?.h || window.innerHeight || 900;
    return w / h;
  };

  // Every name from the layout survives (other pieces cut to them); the values are solved in
  // camera-shots.js for the window we are in, and solved again when it changes shape.
  //
  // ROUND 7 — and the plates take their SUBJECT from the reveal piece, not from a constant. The row
  // of three is where reveal lays it (`reveal.slots`) and the spread is the bows it actually built,
  // so the tabletop frames follow the cards instead of a number that stopped describing them two
  // rounds ago. Read fresh on every reframe: the piece is built before the camera, but it re-lays
  // the cloth between beats and a window dragged to another shape re-reads it.
  const revealPiece = () => ctx.pieces?.reveal ?? null;
  const shots = buildShots(L, aspect(), revealPiece());
  const reframe = () => {
    const next = buildShots(L, aspect(), revealPiece());
    for (const k of Object.keys(shots)) delete shots[k];
    Object.assign(shots, next);
  };

  // ---- poses ----
  const _m = new THREE.Matrix4();
  const resolve = (s) => (typeof s === 'string' ? shots[s] : s) ?? shots.home;
  function poseOf(shot) {
    const pos = new THREE.Vector3().fromArray(shot.pos);
    const look = new THREE.Vector3().fromArray(shot.look);
    const up = new THREE.Vector3().fromArray(shot.up ?? [0, 1, 0]);
    _m.lookAt(pos, look, up);
    return { pos, q: new THREE.Quaternion().setFromRotationMatrix(_m), fov: shot.fov ?? 30, shift: [...(shot.shift ?? [0, 0])] };
  }
  const shift = [0, 0];
  function applyShift(x, y) {
    shift[0] = x;
    shift[1] = y;
    const w = ctx.size?.w || window.innerWidth || 1600, h = ctx.size?.h || window.innerHeight || 900;
    if (!x && !y) {
      if (cam.view?.enabled) cam.clearViewOffset();
      cam.aspect = w / h;
    } else cam.setViewOffset(w, h, x * w, y * h, w, h);
  }
  function applyPose(p) {
    cam.position.copy(p.pos);
    cam.quaternion.copy(p.q);
    cam.up.set(0, 1, 0).applyQuaternion(p.q);
    cam.fov = p.fov;
    applyShift(p.shift[0], p.shift[1]);
    cam.updateProjectionMatrix();
  }
  function currentPose() {
    return { pos: cam.position.clone(), q: cam.quaternion.clone(), fov: cam.fov, shift: [...shift] };
  }
  // A new window shape is a new set of frames. Rebuild them, and put the camera back on the one it
  // is holding — unless it is mid-move, where the two poses it is blending were solved for the old
  // window and the move finishes in the shape it started in.
  ctx.on?.('resize', () => {
    reframe();
    if (!move && api.current && shots[api.current]) applyPose(poseOf(shots[api.current]));
    else {
      applyShift(shift[0], shift[1]);
      cam.updateProjectionMatrix();
    }
  });

  // ---- moves ----
  let move = null; // { from, to, kind, t0, f0, duration, done }
  let seq = 0; // token: a new cut/move/sequence cancels the running sequence
  const _p = new THREE.Vector3(), _q = new THREE.Quaternion();
  const blend = (from, to, u) => {
    _p.lerpVectors(from.pos, to.pos, u);
    _q.slerpQuaternions(from.q, to.q, u);
    applyPose({ pos: _p, q: _q, fov: from.fov + (to.fov - from.fov) * u, shift: [from.shift[0] + (to.shift[0] - from.shift[0]) * u, from.shift[1] + (to.shift[1] - from.shift[1]) * u] });
  };
  // the motor: constant speed with a short ramp at each end (a dolly does not ease like a tween)
  const motor = (u, ramp) => {
    if (ramp <= 0) return u;
    const a = ramp; // fraction of the run spent accelerating / braking
    const v = 1 / (1 - a); // cruise speed so that the area is 1
    if (u < a) return (v * u * u) / (2 * a);
    if (u > 1 - a) return 1 - (v * (1 - u) * (1 - u)) / (2 * a);
    return v * (u - a / 2);
  };
  const finish = () => {
    const m = move;
    move = null;
    m?.done?.();
  };

  // internal: no token bookkeeping (sequences and loops own their token)
  function jump(shot) {
    finish();
    api.current = typeof shot === 'string' ? shot : 'custom';
    applyPose(poseOf(resolve(shot)));
  }
  function startMove(shot, kind, duration) {
    finish();
    const to = poseOf(resolve(shot));
    api.current = typeof shot === 'string' ? shot : 'custom';
    if (kind === 'cut') {
      applyPose(to);
      return Promise.resolve();
    }
    const from = currentPose();
    const dist = from.pos.distanceTo(to.pos);
    if (duration == null) duration = kind === 'whip' ? WHIP_FRAMES.length / ctx.clock.fps : Math.max(0.4, dist / (kind === 'track' ? TRACK_SPEED : PUSH_SPEED));
    move = { from, to, kind, t0: ctx.clock.raw, f0: ctx.clock.frame, duration };
    return new Promise((res) => (move.done = res));
  }

  const api = {
    shots,
    current: 'home',
    cut(shot) {
      seq++;
      jump(shot);
    },
    // kind: 'cut' | 'push' (straight dolly down the axis) | 'track' (constant-speed lateral dolly) | 'whip' (3 frames, hard stop)
    move(shot, { kind = 'push', duration = null } = {}) {
      seq++;
      return startMove(shot, kind, duration);
    },
    // steps: [{shot, kind = 'cut', duration, hold = 0}] — plays in order; resolves true when the last hold ends,
    // false if another cut/move/sequence took the camera first
    async sequence(steps) {
      const token = ++seq;
      for (const { shot, kind = 'cut', duration, hold = 0 } of steps) {
        if (token !== seq) return false;
        if (kind === 'cut') jump(shot);
        else await startMove(shot, kind, duration);
        if (hold > 0 && token === seq) await wait(ctx, hold);
      }
      return token === seq;
    },
    stop() {
      seq++;
      finish();
    },
    // judging states: the six stills, plus the two moves running from t=0
    setState(name) {
      if (name === 'track') {
        // a lateral track across the back wall, window to door; loops so a contact sheet always catches it moving
        const token = ++seq;
        (async () => {
          while (token === seq) {
            jump('window');
            await startMove('door', 'track');
            if (token === seq) await wait(ctx, 1.2);
          }
        })();
      } else if (name === 'whip') {
        // a whip from Pepe to the spread and back: hold, three frames, hold
        const token = ++seq;
        jump('pepe');
        (async () => {
          while (token === seq) {
            await wait(ctx, 1.8);
            if (token !== seq) return;
            await startMove('spread', 'whip');
            await wait(ctx, 1.8);
            if (token !== seq) return;
            await startMove('pepe', 'whip');
          }
        })();
      } else api.cut(name in shots ? name : 'home');
    },
    update(ctx) {
      if (!move) return;
      const m = move;
      let u;
      if (m.kind === 'whip') {
        // on the animation clock: one big step per frame, then it is simply there
        const k = ctx.clock.frame - m.f0;
        if (k <= 0) return;
        u = WHIP_FRAMES[Math.min(k, WHIP_FRAMES.length) - 1];
      } else {
        const raw = Math.min(1, (ctx.clock.raw - m.t0) / m.duration);
        u = m.kind === 'track' ? motor(raw, 0.06) : motor(raw, 0.22);
      }
      blend(m.from, m.to, u);
      if (u >= 1) finish();
    },
  };
  applyPose(poseOf(shots.home));
  return api;
}

const wait = (ctx, seconds) =>
  new Promise((res) => {
    const end = ctx.clock.raw + seconds;
    const tick = () => (ctx.clock.raw >= end ? res() : requestAnimationFrame(tick));
    tick();
  });
