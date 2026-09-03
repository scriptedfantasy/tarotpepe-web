// PIECE: props — set dressing. A crowded, ordered parlour: a tall shelf of bottles and jars with
// drawn labels, two bookcases, a chest with a cat asleep on it, a bar cart with a radio under the
// window, curtains in the window, a floor lamp with a fringed shade, a hat stand, a potted palm,
// framed ink pictures around a wall clock, a pinboard of notes, hand-lettered signs, a rug with a
// scrolled border, the three-petal pendant of the kitchen frame. Everything is paper-white geometry
// with pattern textures; the ink pass draws the lines. Composed frontal and symmetrical for the
// 'wide' and 'home' shots; nothing in front of Pepe or the table.
import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';
import * as O from './props-objects.js';

export const meta = {
  name: 'props',
  judge: { shot: 'wide', states: ['default'] },
  files: ['src/pieces/props.js', 'src/pieces/props-textures.js', 'src/pieces/props-objects.js'],
};

export async function build(ctx) {
  const { width: W, depth: D, height: H } = ctx.layout.room;
  const rng = mulberry32(4242);
  const g = new THREE.Group();
  g.name = 'props';
  const M = O.materials();

  // The room's openings (from the room piece when it is there; its numbers otherwise).
  const room = ctx.pieces.room ?? {};
  const win = room.window ?? { x0: -1.95, x1: -1.05, y0: 1.04, y1: 2.45 };
  const door = room.door ?? { x0: 1.05, x1: 1.95, y0: 0, y1: 2.45, top: 2.12 };
  const railY = room.bands?.rail?.[0] ?? 2.6;

  const WALL = -D / 2; // back wall plane
  const FLUSH = WALL + 0.04; // furniture backs sit just in front of the skirting
  const HOOK_Y = railY - 0.02;

  // ---- floor ------------------------------------------------------------------------------------
  const rug = O.rug({ w: 3.2, d: 2.6 });
  rug.position.set(0, 0, -0.2);
  g.add(rug);

  // ---- the back wall's furniture row: bookcase | chest | bookcase (between shutter and door) --------
  const chestW = 1.04, caseW = 0.34;
  const chest = O.console_({ w: chestW, h: 0.82, d: 0.38 });
  chest.position.set(0, 0, FLUSH + 0.19);
  g.add(chest);
  {
    const top = 0.82;
    const d = O.doily(0.13);
    d.position.set(-0.36, top + 0.002, chest.position.z + 0.02);
    g.add(d);
    const lamp = O.mushroomLamp();
    lamp.position.set(-0.36, top, chest.position.z + 0.02);
    g.add(lamp);
    let y = top;
    for (let i = 0; i < 3; i++) {
      const t = 0.028 - i * 0.004;
      const b = O.book({ w: 0.2 - i * 0.02, h: 0.26 - i * 0.03, t, flat: true, seed: 90 + i, title: ['GRAND ALBUM', 'LE TAROT', 'ORACLES'][i] });
      b.position.set(-0.1 + i * 0.01, y + t / 2, chest.position.z + 0.02);
      b.rotation.y = (i - 1) * 0.08;
      g.add(b);
      y += t;
    }
    const cs = O.candleStick();
    cs.position.set(0.12, top, chest.position.z + 0.06);
    g.add(cs);
    const cat = O.cat({ rng });
    cat.position.set(0.33, top, chest.position.z + 0.0);
    cat.rotation.y = -0.35;
    g.add(cat);
  }
  for (const side of [-1, 1]) {
    const bc = O.shelfUnit({ w: caseW, h: 1.45, d: 0.28, boards: [0.1, 0.44, 0.78, 1.12], plinth: 0.06 });
    bc.position.set(side * (chestW / 2 + 0.02 + caseW / 2), 0, FLUSH + 0.14);
    g.add(bc);
    const { x0, x1, z0 } = bc.userData.inner;
    for (const y of [0.1, 0.44, 0.78, 1.12]) bc.add(O.bookRow({ x0, x1, y, z: z0, rng, maxH: 0.28, depth: 0.25 }));
    if (side < 0) {
      const gl = O.globe();
      gl.position.set(0, 1.45, 0.02);
      bc.add(gl);
    } else {
      const v = O.vase({ rng });
      v.position.set(0.02, 1.45, 0.02);
      bc.add(v);
    }
  }

  // ---- the window (stage left): curtains inside the architrave, the bar cart under it, the palm -----
  g.add(O.curtainSet({ x0: win.x0 - 0.03, x1: win.x1 + 0.03, rodY: win.y1 + 0.05, panelW: 0.24, dropTo: win.y0 + 0.02, z: WALL + 0.06 }));
  {
    const cart = O.barCart({ w: 0.8, d: 0.4, h: 0.8, rng });
    cart.position.set((win.x0 + win.x1) / 2, 0, WALL + 0.47);
    g.add(cart);
    const top = cart.userData.top;
    const s = O.siphon();
    s.position.set(-0.31, top, -0.06);
    cart.add(s);
    const ib = O.iceBucket();
    ib.position.set(0.29, top, -0.04);
    cart.add(ib);
    cart.add(O.lineup({ x0: -0.2, x1: 0.2, y: top, z: -0.06, rng, kinds: ['bottle', 'flask', 'bottle'], maxH: 0.32, counter: { b: 3, j: 0 } }));
    cart.add(O.lineup({ x0: -0.34, x1: 0.34, y: top, z: 0.12, rng, kinds: ['glass'], gap: 0.02 }));
    const r = O.radio({ w: 0.34, h: 0.2, d: 0.15 });
    r.position.set(-0.18, cart.userData.lower, 0.02);
    cart.add(r);
    const news = O.newspaperStack({ n: 6, rng });
    news.position.set(0.2, cart.userData.lower, 0.0);
    cart.add(news);
  }
  {
    const stool = new THREE.Group();
    const seat = O.cyl(0.17, 0.17, 0.025, M.wood, 20);
    seat.position.y = 0.3;
    stool.add(seat);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      stool.add(O.rod([Math.cos(a) * 0.1, 0.29, Math.sin(a) * 0.1], [Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15], 0.012, M.wood));
    }
    stool.position.set(-W / 2 + 0.3, 0, WALL + 0.42);
    g.add(stool);
    const p = O.plant({ rng, leaves: 12, kind: 'palm', scale: 1.15 });
    p.position.set(-W / 2 + 0.3, 0.31, WALL + 0.42);
    g.add(p);
  }

  // ---- the door (stage right): a lettered board in the transom light, the tall bottle shelf beside it
  {
    const cx = (door.x0 + door.x1) / 2;
    const ty = ((door.top ?? 2.12) + 0.05 + door.y1) / 2;
    const sign = O.signBoard({ w: door.x1 - door.x0 - 0.12, h: 0.2, depth: 0.015, lines: ['VOYANTE'], border: 'single', texW: 768 });
    sign.position.set(cx, ty, WALL - 0.05);
    g.add(sign);
    for (const sx of [-1, 1]) g.add(O.rod([cx + sx * 0.3, ty + 0.1, WALL - 0.05], [cx + sx * 0.3, door.y1 - 0.02, WALL - 0.05], 0.003, M.cord, 5));

    const unit = O.shelfUnit({ w: 0.48, h: 2.45, d: 0.24, boards: [0.08, 0.48, 0.88, 1.28, 1.68, 2.08], plinth: 0.05 });
    unit.position.set(W / 2 - 0.04 - 0.24, 0, FLUSH + 0.12);
    g.add(unit);
    const { x0, x1, z0 } = unit.userData.inner;
    const bays = [
      ['jar', 'jar', 'glass'],
      ['bottle', 'bottle', 'flask'],
      ['bottle', 'jar'],
      ['flask', 'glass', 'jar'],
      ['bottle', 'bottle'],
      ['bottle', 'flask'],
    ];
    const counter = { b: 6, j: 2 };
    [0.08, 0.48, 0.88, 1.28, 1.68, 2.08].forEach((y, i) => {
      unit.add(O.lineup({ x0, x1, y, z: z0 + 0.13, rng, kinds: bays[i], maxH: 0.36, counter }));
    });
  }

  // ---- the centre wall: a sign under the rail, pictures around the clock, a pinboard by the door ------
  {
    const sign = O.signBoard({ w: 1.0, h: 0.18, lines: ['TAROT — READINGS — 3 CARDS', 'BY APPOINTMENT · WALK-INS TOLERATED'], border: 'double', texW: 1536 });
    sign.position.set(0, railY - 0.1, WALL + 0.045);
    g.add(sign);
    for (const sx of [-1, 1]) {
      const hook = O.sphere(0.009, M.metal, 8, 6);
      hook.position.set(sx * 0.42, railY - 0.005, WALL + 0.02);
      g.add(hook);
    }

    const rowA = [
      [-0.36, 0.22, 0.28, 'bust', true],
      [0.36, 0.22, 0.28, 'hand', true],
    ];
    const rowB = [
      [-0.4, 0.17, 0.2, 'ship', false],
      [-0.13, 0.15, 0.15, 'eye', false],
      [0.13, 0.15, 0.15, 'moon', false],
      [0.4, 0.17, 0.2, 'mountains', false],
    ];
    let seed = 100;
    const hang = (list, y) => {
      for (const [x, w, h, kind, ornate] of list) {
        const f = O.pictureFrame({ w, h, kind, seed: seed++, ornate });
        f.position.set(x, y, WALL + 0.015);
        g.add(f);
        O.hangCords(g, x, y + h / 2, w / 2 - 0.02, HOOK_Y, WALL + 0.012);
      }
    };
    hang(rowA, 2.04);
    hang(rowB, 1.66);
    const clock = O.wallClock({ r: 0.17 });
    clock.position.set(0, 2.04, WALL + 0.03);
    g.add(clock);
    O.hangCords(g, 0, 2.04 + 0.17, 0.1, HOOK_Y, WALL + 0.012);
    g.userData.pendulum = clock.userData.pendulum;

    // between the pictures and the door: a cork board of pinned notes, a small round frame under it
    const pbX = (0.5 + door.x0 - 0.1) / 2;
    const pb = O.pinBoard({ w: 0.38, h: 0.5, rng });
    pb.position.set(pbX, 1.98, WALL + 0.012);
    g.add(pb);
    O.hangCords(g, pbX, 1.98 + 0.25, 0.15, HOOK_Y, WALL + 0.01);
    const rf = O.roundFrame({ r: 0.09, kind: 'sun', seed: 7, depth: 0.03, rim: 0.014 });
    rf.position.set(pbX, 1.56, WALL + 0.015);
    g.add(rf);
  }

  // ---- the stage-left wall (no window there): two frames in a row and a small shelf of jars -----------
  {
    const x = -W / 2 + 0.02;
    const rot = Math.PI / 2;
    const rf = O.roundFrame({ r: 0.15, kind: 'zodiac', seed: 7 });
    rf.position.set(x, 1.95, -1.55);
    rf.rotation.y = rot;
    g.add(rf);
    const pf = O.pictureFrame({ w: 0.26, h: 0.32, kind: 'house', seed: 9, ornate: true });
    pf.position.set(x, 1.95, -2.05);
    pf.rotation.y = rot;
    g.add(pf);
    const shelf = O.wallShelf({ w: 0.6, d: 0.16 });
    shelf.position.set(x, 1.42, -1.8);
    shelf.rotation.y = rot;
    g.add(shelf);
    shelf.add(O.lineup({ x0: -0.28, x1: 0.28, y: 0.01, z: 0.08, rng, kinds: ['jar', 'jar', 'bottle'], maxH: 0.24, counter: { b: 12, j: 6 } }));
  }

  // ---- in front of the side walls: the floor lamp (left) and the hat stand (right) ---------------------
  const lamp = O.floorLamp({ h: 1.62 });
  lamp.position.set(-W / 2 + 0.32, 0, -1.0);
  g.add(lamp);
  const stand = O.hatStand({ h: 1.85, rng });
  stand.position.set(W / 2 - 0.32, 0, -0.75);
  g.add(stand);

  // ---- overhead: the three-petal pendant over the table -------------------------------------------------
  const pendant = O.pendantLamp({ ceilY: H, dropTo: 2.5 });
  g.add(pendant);

  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  ctx.scene.add(g);

  return {
    group: g,
    // practicals, for the lighting piece: where the drawn lamps are
    lamps: {
      floor: lamp.position.clone().add(new THREE.Vector3(0, 1.45, 0)),
      table: new THREE.Vector3(-0.36, 0.82 + 0.2, chest.position.z + 0.02),
      pendant: new THREE.Vector3(0, 2.3, 0),
    },
    setState() {},
    update(ctx) {
      if (!ctx.clock.stepped) return;
      const p = g.userData.pendulum;
      if (p) p.rotation.z = 0.16 * Math.sin(ctx.clock.t * Math.PI);
    },
  };
}
