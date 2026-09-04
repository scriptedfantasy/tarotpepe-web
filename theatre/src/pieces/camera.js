// PIECE: camera — the staging. A view camera on a rail: every shot is square to the back wall
// (the lens axis at 90° to it, verticals vertical, the far wall a flat elevation) and framed by a
// rise or fall of the lens (`shift`) rather than a tilt, the way the drawn frames keep the wall
// flat while the floor and the tabletop read from above. Long lenses, pulled back, so the side
// walls are slivers and nothing converges hard. The camera cuts; when it moves it moves on a rail:
// a lateral track at constant speed, a straight push down the axis, or a whip — three frames of
// big displacement and a hard stop, no blur (stop-motion has no blur). Tracks and pushes run in
// ctx.clock.raw (the camera is not a puppet); the whip runs on the 12fps frame count.
//
// API: shots (the named shots; every layout name is kept, others added), current, cut(shot),
//      move(shot, {kind: 'cut'|'push'|'track'|'whip', duration}), sequence([{shot, kind, duration, hold}]),
//      stop(), setState(name).
// A shot is {pos, look, fov, up?, shift?: [x, y]} — shift in fractions of the frame, +y = the frame
// drops (shows more floor) while the camera keeps looking straight ahead.
import * as THREE from 'three';

export const meta = {
  name: 'camera',
  judge: { shot: 'home', states: ['home', 'wide', 'pepe', 'table', 'spread', 'fan', 'turn', 'riffle', 'card1', 'door', 'track', 'whip'] },
  files: ['src/pieces/camera.js'],
};

// Motor speeds of the rail: a lateral track, a push. Metres per second.
const TRACK_SPEED = 0.62;
const PUSH_SPEED = 0.55;
// The whip: the fraction of the way travelled at each 12fps frame after the start frame, then a hard stop.
const WHIP_FRAMES = [0.34, 0.74, 1];

export async function build(ctx) {
  const cam = ctx.camera;
  const L = ctx.layout;
  const zb = -L.room.depth / 2; // back wall
  const spreadY = L.spread.y;
  const [sx0, , sz0] = L.spread.slots[1];
  const winX = -1.5, doorX = 1.5; // the openings on the back wall (room.js: window x -1.95..-1.05, door 1.05..1.95)

  // Square to the back wall: the look point is dead ahead at the camera's own height.
  const ahead = (pos) => [pos[0], pos[1], zb];
  const flat = (pos, fov, shift, extra = {}) => ({ pos, look: ahead(pos), fov, shift, ...extra });
  // Straight down: the lens axis vertical, the frame's up towards Pepe (-z), so the cards read upright.
  const down = (x, y, z, fov) => ({ pos: [x, y, z], look: [x, spreadY, z], fov, up: [0, 0, -1] });
  // Down at an angle, on the table's own axis — the one kind of shot that is neither square to the
  // wall nor square to the cloth, and it exists for one reason: a card standing on its edge. The
  // reveal piece holds a turning card at 78° and riffles the deck in profile, and from directly
  // overhead both of those are a hairline. `deg` is the lens's height above the cloth, `dist` its
  // distance from the point it looks at, and the frame's up stays world-up so the row reads level.
  const rake = (target, deg, dist, fov) => {
    const a = (deg * Math.PI) / 180;
    return { pos: [target[0], target[1] + dist * Math.sin(a), target[2] + dist * Math.cos(a)], look: [...target], fov };
  };

  // Every name from the layout survives (other pieces cut to them); the values are ours.
  //
  // ROUND 4 — the rule the frames are cut to: an object is either wholly in the frame or wholly
  // out of it; the TOP edge never bisects one. In a room this crowded that is a real constraint,
  // and it is what decides the three frontal shots. The back wall carries its furniture between
  // y = 1.0 and y = 2.59 (window and door heads at 2.45, the VOYANTE board 2.21–2.41, the pictures
  // and the clock to 2.27, the TAROT board 2.41–2.59), then bare plaster to the cornice at 2.98
  // and the ceiling at 3.10; the pendant hangs over the table's own centre from 3.10 down to 2.45.
  // So a frontal shot may put its top edge in exactly two places: ABOVE the pendant's rose (3.10 at
  // z = 0 — which is `wide` and `home`, the box closed), or in the bare plaster between 2.59 and
  // 2.98 at the back wall with the pendant wholly above the frame (which is `pepe`). Anywhere
  // between slices the door head, the shutters and the sign, which is what round 3 did.
  //
  // The arithmetic, since it is not obvious: closing the box over the pendant means the frame must
  // hold 0.76 m (the cards) to 3.10 m (the rose) at almost the same depth, so it cannot be a close
  // frame — the tightest lens that does it is a long one from the back of the room. That is why
  // `home` is not a medium: there is no medium that closes this box. The close work is `pepe`
  // (the plaster band) and the overheads.
  const shots = {
    ...L.shots,
    // the parlour, and the visitor is in it: ceiling, cornice, the whole pendant dead centre, both
    // side walls, the coat stand, the umbrella, the tiles and both rugs. The lens sits at a seated
    // visitor's eye height so the floor reads; Pepe is small, the way the film keeps a figure small
    // in a big frame. The rose stands 3.5% of the frame height below the top edge.
    wide: flat([0, 1.45, 6.4], 31, [0, 0]),
    // the same box a size closer and a head higher, so the cloth reads from above and the table
    // cuts the bottom edge: the frame the conversation is played in. Still closed at the top — the
    // pendant whole, the cornice whole, the cards 10% of the frame height above the bottom edge.
    // 1.28× tighter than `wide`, which is as tight as the pendant allows (see above).
    home: flat([0, 1.80, 6.4], 24.5, [0, 0]),
    // Pepe: head, shoulders, the open hands on the cloth, and the whole of the wall he sits
    // against — window, door, board, clock, pictures — with the top edge in the bare plaster at
    // 2.70 and the pendant wholly out of frame. 1.82× tighter than `home`: a cut, not a nudge.
    pepe: flat([0, 1.30, 2.9], 30, [0, 0]),
    // the table: frontal, the lens dropped so the cloth is seen from above and Pepe's hands come in
    // from the top. The one frame here whose top edge crosses the wall (it must: a frontal lens low
    // enough to see the cloth cannot also clear the door head) — so the film does not use it; it is
    // kept because other pieces are judged from it. The cards are read from `turn` instead.
    table: flat([0, 1.86, 2.55], 28, [0, 0.64]),
    // the spread: exactly 90° down, the three cards in a row across the middle of the cloth with an
    // even hand's breadth of cloth above and below them. The planimetric plate of the row; the film
    // turns the cards in `turn`, where a card on its edge is not a hairline.
    spread: down(sx0, 2.12, sz0, 30),
    card0: down(L.spread.slots[0][0], 1.32, L.spread.slots[0][2], 30),
    card1: down(L.spread.slots[1][0], 1.32, L.spread.slots[1][2], 30),
    card2: down(L.spread.slots[2][0], 1.32, L.spread.slots[2][2], 30),
    // the deck: square on, close, the lens dropped onto the stack
    deck: flat([L.deck.pos[0], 1.06, L.deck.pos[2] + 0.86], 24, [0, 0.5]),
    // the riffle: the deck filling the frame while it is cut, parted and interleaved, from 58°
    // above the cloth — the angle the reveal piece's own shuffle lens uses, squared onto the deck's
    // axis so the halves read in profile. The shuffle is an event and not a rumour; round 3 played
    // it in a wide of the parlour where the deck is nine millimetres of the picture behind a bottle.
    riffle: rake([...L.deck.pos], 58, 0.6, 32),
    // the turn: the same cloth from 46°, because a card standing on its edge — which is how the
    // reveal piece turns one, held at 78° — is a hairline seen from straight down, and that is the
    // money frame of the whole evening. The reveal piece asks for 40–55°; its drawn hand withdraws
    // below 37°, so this band keeps the hand in the picture as well.
    turn: rake([0, spreadY, sz0], 46, 1.15, 32),
    // the fan, and the row the picked cards go to: 90° down, both wholly inside the frame with an
    // even margin. The old frame was cropped at both ends at once — the fan's bottom row ran off
    // the foot and the three slots were off the head — and this is the one frame in the evening
    // that has to show everything at once. It holds the reveal piece's whole footprint (z −0.05 to
    // 0.64, x ±0.45) and the deck beside it (z −0.18 to 0.06), which is what keeps the slot row at
    // 0.40 of the height rather than a third: with the deck where the layout puts it, a top edge at
    // z = −0.06 would cut the deck in half, and no edge in this film cuts an object in half. See
    // the contract note: move the deck upstage and this frame tightens onto the fan alone.
    fan: down(0, 2.32, 0.23, 33),
    // the door: the doormat to the VOYANTE board, the door on the axis. The lens stands 8 cm inboard
    // of the door's centre and is a little wider than it was: at 19° on the door's own axis the left
    // edge fell at x = -0.39 in Pepe's plane and sliced him and his table down the middle, which is
    // the one thing a frame must never do to a figure. At 20° from x = 1.42 the edge falls at -0.57:
    // he sits whole, small, at the left, the table runs off the frame the way a foreground table
    // should, and the door still stands within 1.5% of the middle of the picture. Any wider or any
    // further back and the frame overruns the front edge of the stage-right wall.
    door: flat([doorX - 0.08, 1.45, 6.0], 20, [0, 0.09]),
    // the window: the same frame slid across to the window (the track runs between these two)
    window: flat([winX + 0.08, 1.45, 6.0], 20, [0, 0.09]),
    // from the threshold: the visitor's first look into the parlour, before the wide
    threshold: flat([0, 1.55, 6.2], 22, [0, 0.05]),
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
  ctx.on?.('resize', () => {
    applyShift(shift[0], shift[1]);
    cam.updateProjectionMatrix();
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
