// PIECE: lighting — the tone design. In an ink world light is where the hatching is not: the ink
// pass renders the set as white paper under these lights (with shadows) and lays strokes wherever
// the light does not reach. So this piece decides where the paper stays bare and where the pen
// goes:
//   - a key from the window side (stage left, high, a little in front) that leaves the fronts of
//     things bare, hatches their right-hand sides and undersides, and drops a crisp shadow under
//     the table and under every shelf and picture (a tight bias, a small kernel: the ink pass turns
//     the shadow into hatch with an edge, never a gradient);
//   - a sky-biased fill so the walls stay mostly bare paper and undersides go darker than sides;
//   - dark corners: negative point lights tucked where the walls meet, so strokes gather in the
//     corners the way a pen does, without a cast shadow;
//   - practicals at the drawn lamps (ctx.pieces.props.lamps) as plain spot lights. Never a glow or
//     a halo: a lamp is drawn as an object, its light is only where the strokes stop;
//   - at night, a cross-hatched pane in every window (the window goes dark the way the arch of
//     La Brique Rouge does: strokes so dense they read as black).
// States: default (afternoon), evening (lamps on, window dark, more cross-hatch in the corners),
// lamp (only the table lamp and the pendant). evening/lamp nudge the ink piece's tone thresholds
// through ctx.pieces.ink.params and restore them on the way back.
import * as THREE from 'three';
import { inkMaterial } from '../core/strokes.js';

export const meta = {
  name: 'lighting',
  judge: { shot: 'home', states: ['default', 'evening', 'lamp'] },
  files: ['src/pieces/lighting.js'],
};

// Where the drawn lamps are until props says (these are props' own numbers).
const LAMPS_FALLBACK = {
  floor: new THREE.Vector3(-2.28, 1.45, -0.55),
  table: new THREE.Vector3(-0.36, 1.02, -2.29),
  pendant: new THREE.Vector3(0, 2.3, 0),
};
const WIN_FALLBACK = { x0: -1.95, x1: -1.05, y0: 1.04, y1: 2.45, depth: 0.16 };

// The key's direction: from stage left, high, a little in front of the back wall plane, so the
// back wall and every front face is bare, right-hand sides and undersides are hatched, and the
// shadow of the table falls straight under it (a pool, not a smear across the floor).
const KEY_DIR = new THREE.Vector3(-0.3, 0.8, 0.52).normalize();

// One design per state. Intensities are three's physical units (a white lambert surface facing a
// directional light of intensity PI renders as 1.0). The ink pass reads lit luminance: below
// tone.x it is fully dark, above tone.y fully lit; tone.z is how dark "dark" is.
const STATES = {
  default: {
    key: 3.1,
    keyColor: '#fff3e0',
    fill: { sky: '#ffffff', ground: '#6a635a', intensity: 0.42 },
    corners: -1.2,
    pendant: 0,
    table: 0,
    floorDown: 0,
    floorUp: 0,
    night: false,
    ink: null,
  },
  // Night is not a darker paper: the open wall sits half-way between the ink pass's dark and lit
  // thresholds (a sparse rain of strokes), the lamps lift their pools to bare paper, and the
  // corner lights push the corners the rest of the way down into cross-hatch. Only the window
  // panes are solid.
  // (The numbers are tuned against the ink pass's quantised hatch weights: an open vertical
  // surface lands at lit luminance ~0.16 → half-dark, so wallpaper reads as level 1 rain, the
  // door and shutters as level 2-3 strokes rather than solid, and only the panes and the corners
  // reach the densest cross-hatch.)
  evening: {
    key: 0,
    keyColor: '#c8d2e4',
    fill: { sky: '#ffffff', ground: '#665f55', intensity: 0.9 },
    corners: -1.2,
    pendant: 5.6,
    table: 1.05,
    floorDown: 1.5,
    floorUp: 1.2,
    night: true,
    ink: { tone: [0.0, 0.32, 0.8, 0.5], levels: [0.22, 0.42, 0.64, 0.95] },
  },
  lamp: {
    key: 0,
    keyColor: '#c8d2e4',
    fill: { sky: '#ffffff', ground: '#665f55', intensity: 0.6 },
    corners: -1.2,
    pendant: 5.2,
    pendantAngle: 1.0, // a tighter pool: the reading is lit, the room recedes into strokes
    table: 1.05,
    floorDown: 0,
    floorUp: 0,
    night: true,
    ink: { tone: [0.0, 0.32, 0.8, 0.5], levels: [0.22, 0.42, 0.64, 1.05] },
  },
};

// Fit a directional light's orthographic shadow box to a world-space box (the room).
function fitShadow(light, min, max, pad = 0.15) {
  const cam = light.shadow.camera;
  const rot = new THREE.Matrix4().lookAt(light.position, light.target.position, THREE.Object3D.DEFAULT_UP).invert();
  const v = new THREE.Vector3();
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    v.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).sub(light.position).applyMatrix4(rot);
    x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x);
    y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
    z0 = Math.min(z0, v.z); z1 = Math.max(z1, v.z);
  }
  cam.left = x0 - pad;
  cam.right = x1 + pad;
  cam.bottom = y0 - pad;
  cam.top = y1 + pad;
  cam.near = Math.max(0.1, -z1 - pad);
  cam.far = -z0 + pad;
  cam.updateProjectionMatrix();
}

function spot({ color = '#ffd9a6', angle = 1.1, penumbra = 0.35, distance = 5, decay = 2, shadow = false, mapSize = 1024 } = {}) {
  const s = new THREE.SpotLight(color, 0, distance, angle, penumbra, decay);
  if (shadow) {
    s.castShadow = true;
    s.shadow.mapSize.set(mapSize, mapSize);
    s.shadow.bias = -0.0004;
    s.shadow.normalBias = 0.015;
    s.shadow.radius = 1;
    s.shadow.camera.near = 0.12;
    s.shadow.camera.far = distance;
  }
  return s;
}

export async function build(ctx) {
  const { width: W, depth: D, height: H } = ctx.layout.room;
  const hx = W / 2, zb = -D / 2;
  const g = new THREE.Group();
  g.name = 'lighting';

  // ── the key ──
  const key = new THREE.DirectionalLight(STATES.default.keyColor, STATES.default.key);
  key.position.copy(KEY_DIR).multiplyScalar(9);
  key.target.position.set(0, 0.9, -0.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.00025;
  key.shadow.normalBias = 0.012;
  key.shadow.radius = 1;
  fitShadow(key, new THREE.Vector3(-hx, 0, zb), new THREE.Vector3(hx, H, zb + D + 0.3));
  g.add(key, key.target);

  // ── the fill: sky over ground, so undersides go darker than sides ──
  const fill = new THREE.HemisphereLight(STATES.default.fill.sky, STATES.default.fill.ground, STATES.default.fill.intensity);
  g.add(fill);

  // ── dark corners: where the back wall meets the side walls and the ceiling ──
  const corners = [];
  const inset = 0.24;
  for (const sx of [-1, 1]) {
    for (const y of [0.75, 1.75, 2.72]) {
      const l = new THREE.PointLight('#ffffff', 0, 1.8, 2);
      l.position.set(sx * (hx - inset), y, zb + inset);
      l.userData.k = y > 2.5 ? 1.15 : 1;
      corners.push(l);
      g.add(l);
    }
    // the ceiling's long edge over the side wall
    for (const z of [-1.2, 0.3]) {
      const l = new THREE.PointLight('#ffffff', 0, 1.3, 2);
      l.position.set(sx * (hx - inset), H - inset, z);
      l.userData.k = 0.8;
      corners.push(l);
      g.add(l);
    }
  }
  // the ceiling's edge over the back wall
  for (const x of [-1.3, 0, 1.3]) {
    const l = new THREE.PointLight('#ffffff', 0, 1.3, 2);
    l.position.set(x, H - inset, zb + inset);
    l.userData.k = 0.8;
    corners.push(l);
    g.add(l);
  }

  // ── practicals (positioned from props.lamps once props is built) ──
  const pendant = spot({ angle: 1.18, penumbra: 0.3, distance: 5.5, shadow: true, mapSize: 1024 });
  const table = spot({ angle: 1.35, penumbra: 0.45, distance: 2.6 });
  const floorDown = spot({ angle: 0.85, penumbra: 0.4, distance: 3.2 });
  const floorUp = spot({ angle: 0.72, penumbra: 0.35, distance: 2.6 });
  for (const s of [pendant, table, floorDown, floorUp]) g.add(s, s.target);
  let lampsPlaced = false;
  function placeLamps(L) {
    pendant.position.set(L.pendant.x, L.pendant.y - 0.1, L.pendant.z);
    pendant.target.position.set(L.pendant.x, 0, L.pendant.z);
    table.position.set(L.table.x, L.table.y - 0.006, L.table.z);
    table.target.position.set(L.table.x, 0, L.table.z);
    floorDown.position.set(L.floor.x, L.floor.y - 0.1, L.floor.z);
    floorDown.target.position.set(L.floor.x, 0, L.floor.z);
    floorUp.position.set(L.floor.x, L.floor.y + 0.19, L.floor.z);
    floorUp.target.position.set(L.floor.x, L.floor.y + 3, L.floor.z);
  }
  placeLamps(LAMPS_FALLBACK);

  // ── night panes: a cross-hatched sheet just inside each window's glass ──
  const night = new THREE.Group();
  night.name = 'night-panes';
  night.visible = false;
  g.add(night);
  let nightBuilt = false;
  function buildNight(win, sideWin) {
    const mat = inkMaterial({ hatch: 1, lineWeight: 0.8 });
    const paneGroup = (w) => {
      const grp = new THREE.Group();
      const { x0, x1, y0, y1, depth } = w;
      const zr = zb - depth;
      const zf0 = zr + 0.03, zf1 = zr + 0.08;
      const zl0 = zf0 + 0.008, zl1 = zf1 - 0.008;
      const z = (zl0 + zl1) / 2 + 0.004; // just in front of the glass, behind the glazing bars
      const f = 0.05, s = 0.042, rt = 0.05, rb = 0.075, margin = 0.025;
      const xm = (x0 + x1) / 2;
      for (const [lx0, lx1] of [[x0 + f, xm - 0.03], [xm + 0.03, x1 - f]]) {
        const px0 = lx0 + s - margin, px1 = lx1 - s + margin;
        const py0 = y0 + f + rb - margin, py1 = y1 - f - rt + margin;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(px1 - px0, py1 - py0), mat);
        m.position.set((px0 + px1) / 2, (py0 + py1) / 2, z);
        grp.add(m);
      }
      return grp;
    };
    night.add(paneGroup(win));
    // the side window is the back-wall window turned onto the stage-right wall (room.js's frame)
    const side = paneGroup(sideWin);
    side.rotation.y = -Math.PI / 2;
    side.position.x = hx - Math.abs(zb);
    night.add(side);
    nightBuilt = true;
  }

  ctx.scene.add(g);

  // ── ink nudges (evening/lamp only; default leaves the ink piece's own numbers alone) ──
  let inkDefaults = null;
  function applyInk(override) {
    const ink = ctx.pieces.ink;
    if (!ink?.params?.tone) return;
    if (!inkDefaults) inkDefaults = { tone: [...ink.params.tone], levels: [...ink.params.levels] };
    const src = override ?? inkDefaults;
    ink.params.tone.splice(0, 4, ...src.tone);
    ink.params.levels.splice(0, 4, ...src.levels);
  }

  let current = 'default';
  function apply(name) {
    const S = STATES[name] ?? STATES.default;
    current = STATES[name] ? name : 'default';
    key.intensity = S.key;
    key.color.set(S.keyColor);
    key.visible = S.key > 0;
    fill.color.set(S.fill.sky);
    fill.groundColor.set(S.fill.ground);
    fill.intensity = S.fill.intensity;
    for (const l of corners) l.intensity = S.corners * l.userData.k;
    pendant.intensity = S.pendant;
    pendant.angle = S.pendantAngle ?? 1.18;
    pendant.visible = S.pendant > 0;
    table.intensity = S.table;
    table.visible = S.table > 0;
    floorDown.intensity = S.floorDown;
    floorDown.visible = S.floorDown > 0;
    floorUp.intensity = S.floorUp;
    floorUp.visible = S.floorUp > 0;
    night.visible = !!S.night;
    applyInk(S.ink);
  }

  // Things that need the pieces built after this one (props, room, ink).
  function lazy() {
    if (!lampsPlaced && ctx.pieces.props?.lamps) {
      placeLamps(ctx.pieces.props.lamps);
      lampsPlaced = true;
    }
    if (!nightBuilt && ctx.pieces.room !== undefined) {
      const r = ctx.pieces.room;
      buildNight(r.window ?? WIN_FALLBACK, r.sideWindow ?? WIN_FALLBACK);
    }
    if (!inkDefaults && ctx.pieces.ink?.params?.tone) applyInk(STATES[current].ink);
  }
  // `?light=<state>` shows a lighting state under any other piece's judging shot (e.g.
  // ?view=camera&state=wide&light=evening); the judged piece's own setState still runs after.
  const forced = ctx.params?.get('light');
  apply(forced && STATES[forced] ? forced : 'default');

  return {
    group: g,
    key,
    fill,
    corners,
    practicals: { pendant, table, floorDown, floorUp },
    night,
    states: STATES,
    get state() {
      return current;
    },
    setState(name) {
      lazy();
      apply(name);
    },
    update() {
      if (!lampsPlaced || !nightBuilt || !inkDefaults) lazy();
    },
  };
}
