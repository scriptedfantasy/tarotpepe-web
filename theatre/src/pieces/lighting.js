// PIECE: lighting — the tone design. In an ink world light is where the hatching is NOT: the ink
// pass renders the set as white paper under these lights (with shadows), reads that luminance and
// lays strokes wherever the light did not reach. So this piece decides where the paper stays bare
// and where the pen goes. Three tiers, and nothing in between:
//
//   BARE     a front face the key can see — the back wall, the fronts of the shelves, the cloth,
//            Pepe's robe. Most of the frame. The film's discipline: do not be afraid of paper.
//   RAIN     a cast shadow on a front face, and the right-hand side of every form: one level of
//            vertical strokes. This is what says "the light comes from the window, stage left".
//   CROSS    undersides, the insides of the window reveal, the two upper corners, the ceiling
//            line: the densest lattice. A draughtsman hatches a pocket every time.
//
// How the tiers are made (the numbers are the lit luminance the ink pass reads; with its default
// thresholds a plain-paper surface is BARE above L≈0.22, RAIN from 0.22 down to 0.115, denser
// below, cross-hatch under ≈0.03):
//   - KEY        one directional light on the window's axis (stage left, 39° up, leaning a little
//                downstage) so every front face is lit and every shadow falls down-and-right,
//                short. Crisp: tight bias, a 2048 map fitted to the room, radius 1 — the ink pass
//                wants an edge to tear, not a gradient.
//   - SKY FILL   a hemisphere, white over a dark ground, so undersides go darker than sides and no
//                wall ever goes black from want of light.
//   - RIGHT BOUNCE  a weak directional off the stage-right wall: it lifts the shadow side just far
//                enough to be ONE level of rain instead of a black mass.
//   - FLOOR BOUNCE  a weak directional from below, so the undersides of ledges read as strokes
//                rather than solid ink.
//   - CORNERS    negative point lights tucked where the walls meet and under the cornice: strokes
//                gather in the corners the way a pen does, with no cast shadow to give it away.
//   - PRACTICALS point lights at the drawn lamps (ctx.pieces.props.lamps). Never a glow, never a
//                halo: the lamp is drawn as an object; its light is only where the strokes stop.
//   - NIGHT      a cross-hatched pane inside every window, so at night the glass goes solid the
//                way the arch of La Brique Rouge does.
//
// States: default (afternoon through the shutters), evening (the lamps carry it, the window dark,
// more cross-hatch in the corners), lamp (only the table lamp and the pendant; the rest of the
// room falls away). evening/lamp nudge the ink piece's tone thresholds through
// ctx.pieces.ink.params and restore them on the way back.
import * as THREE from 'three';
import { inkMaterial } from '../core/strokes.js';

export const meta = {
  name: 'lighting',
  judge: { shot: 'home', states: ['default', 'evening', 'lamp'] },
  files: ['src/pieces/lighting.js'],
};

// Where the drawn lamps are until props says (these are props' own numbers).
const LAMPS_FALLBACK = {
  floor: new THREE.Vector3(-2.1, 1.45, -0.2),
  table: new THREE.Vector3(-0.36, 1.02, -2.29),
  pendant: new THREE.Vector3(0, 2.5, 0),
};
const WIN_FALLBACK = { x0: -1.95, x1: -1.05, y0: 1.04, y1: 2.45, depth: 0.16 };

// The key's direction (towards the light). Stage left, 39° up, leaning a little downstage so the
// back wall and every front face keeps a good NdotL and stays bare paper. Shadows therefore run
// DOWN and to the RIGHT, and they are short: a shelf 10 cm off the wall lays a band a finger wide
// under its board, and Pepe — a cut-out standing 1.7 m off the wall — drops his silhouette below
// the skirting instead of pasting it across the door.
const KEY_DIR = new THREE.Vector3(-0.48, 0.56, 0.68).normalize();
// Light bounced back off the stage-right wall: it does not cast, it only lifts the shadow side of
// a form out of solid black into one level of strokes.
const BOUNCE_DIR = new THREE.Vector3(0.78, 0.3, 0.55).normalize();
// Light bounced off the boards: the same service for undersides.
const FLOOR_DIR = new THREE.Vector3(0.1, -1, 0.22).normalize();

// One design per state. Intensities are three's physical units (a white lambert surface square to
// a directional light of intensity PI renders as 1.0).
const STATES = {
  // Afternoon through the shutters. Measured on a flat front face: lit 0.90, cast shadow 0.19
  // (one level of rain), a right-hand side 0.22 (rain), an underside 0.09 (dense), a corner 0.03.
  default: {
    key: 3.3,
    keyColor: '#fffaf2',
    fill: { sky: '#ffffff', ground: '#565046', intensity: 0.36 },
    bounce: 0.14,
    floorBounce: 0.1,
    corners: -0.62,
    pools: -0.3,
    pendant: 0,
    table: 0,
    floor: 0,
    night: false,
    // The one nudge to the ink pass's own numbers. Its default ramp (fully lit at L=0.5, light
    // term weighted 1.0) never crosses the first stroke threshold on the room's own materials —
    // plaster asks for 0.12 of hatch, the wainscot 0.24 — so a cast shadow on the back wall came
    // out as bare paper and the whole tone design was invisible. Widening the ramp (0.60) and
    // weighting the light term (1.22) makes the SAME shadows land one level of strokes on the
    // papered field and the wainscot, two under a ledge, three inside the window reveal, and
    // still leaves the frieze and the ceiling bare — the drawings' big rest.
    ink: { tone: [0.02, 0.62, 1.4, 0.22], levels: [0.55, 0.82, 0.96, 0.15] },
  },
  // Night is not a darker paper. The key is gone; the open room sits just inside the ink pass's
  // rain band, so plaster carries a sparse vertical shower; the three lamps lift their own pools
  // back to bare paper; the corner lights push the corners the rest of the way into cross-hatch.
  // Only the window panes are solid.
  evening: {
    key: 0,
    keyColor: '#c8d2e4',
    fill: { sky: '#ffffff', ground: '#5b564c', intensity: 0.42 },
    bounce: 0.1,
    floorBounce: 0.08,
    corners: -1.25,
    pools: -0.3,
    pendant: 4.6,
    pendantAngle: 0.88,
    pendantDistance: 4.6,
    table: 1.5,
    floor: 2.6,
    night: true,
    ink: { tone: [0.0, 0.34, 1.05, 0.5], levels: [0.24, 0.46, 0.68, 0.95] },
  },
  // The table lamp and the pendant only: the reading is lit, the room recedes into strokes.
  lamp: {
    key: 0,
    keyColor: '#c8d2e4',
    fill: { sky: '#ffffff', ground: '#5b564c', intensity: 0.24 },
    bounce: 0.04,
    floorBounce: 0.03,
    corners: -1.15,
    pools: -0.32,
    pendant: 4.4,

    pendantDistance: 4.2,
    pendantAngle: 0.78,
    table: 1.7,
    floor: 0,
    night: true,
    ink: { tone: [0.0, 0.34, 0.95, 0.5], levels: [0.24, 0.46, 0.68, 1.05] },
  },
};

// Fit a directional light's orthographic shadow box to a world-space box (the room). A tight box
// is the whole game: the same 2048 map over half the volume is twice the texel density, and the
// ink pass turns a dense shadow edge into a torn line and a loose one into a smear.
function fitShadow(light, min, max, pad = 0.1) {
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

export async function build(ctx) {
  const { width: W, depth: D, height: H } = ctx.layout.room;
  const hx = W / 2, zb = -D / 2;
  const g = new THREE.Group();
  g.name = 'lighting';

  // Nothing in this film fades. A hard PCF kernel over a tightly-fitted map gives the ink pass a
  // shadow with an edge; the pass then tears that edge on its own stroke grid. (Set before any
  // other piece builds, so no material has been compiled against the old type.)
  if (ctx.renderer) ctx.renderer.shadowMap.type = THREE.PCFShadowMap;

  // ── the key: the window, stage left ──
  const key = new THREE.DirectionalLight(STATES.default.keyColor, STATES.default.key);
  key.position.copy(KEY_DIR).multiplyScalar(9);
  key.target.position.set(0, 0.9, -0.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.00018;
  key.shadow.normalBias = 0.01;
  key.shadow.radius = 1;
  fitShadow(key, new THREE.Vector3(-hx, 0, zb), new THREE.Vector3(hx, H, zb + D + 0.3));
  g.add(key, key.target);

  // ── the fill: sky over a dark ground, so undersides go darker than sides ──
  const fill = new THREE.HemisphereLight(STATES.default.fill.sky, STATES.default.fill.ground, STATES.default.fill.intensity);
  g.add(fill);

  // ── the two bounces: they cast nothing, they only keep a shadow from going solid ──
  const bounce = new THREE.DirectionalLight('#f4f2ea', STATES.default.bounce);
  bounce.position.copy(BOUNCE_DIR).multiplyScalar(8);
  bounce.target.position.set(0, 1.0, -0.6);
  g.add(bounce, bounce.target);
  const floorBounce = new THREE.DirectionalLight('#fffaf0', STATES.default.floorBounce);
  floorBounce.position.copy(FLOOR_DIR).multiplyScalar(6);
  floorBounce.target.position.set(0, 1.2, -0.6);
  g.add(floorBounce, floorBounce.target);

  // ── dark corners: where the back wall meets the side walls and the ceiling ──
  const corners = [];
  const corner = (x, y, z, k, dist) => {
    const l = new THREE.PointLight('#ffffff', 0, dist, 2);
    l.position.set(x, y, z);
    l.userData.k = k;
    corners.push(l);
    g.add(l);
    return l;
  };
  const inset = 0.24;
  for (const sx of [-1, 1]) {
    // the two vertical corners of the back wall, and the cornice above them
    for (const y of [0.7, 1.7, 2.72]) corner(sx * (hx - inset), y, zb + inset, y > 2.5 ? 1.2 : 1, 1.9);
    // the ceiling's long edge over each side wall
    for (const z of [-1.2, 0.3, 1.8]) corner(sx * (hx - inset), H - inset, z, 0.85, 1.4);
  }
  // the ceiling's edge over the back wall, and the skirting line under it
  for (const x of [-1.9, -0.65, 0.65, 1.9]) corner(x, H - inset, zb + inset, 0.85, 1.4);
  for (const x of [-2.0, 2.0]) corner(x, 0.18, zb + inset, 0.55, 1.2);

  // ── the pools: the dark a piece of furniture stands in ──
  // The ink pass will not hatch a surface it sees edge-on, and at the camera's height the floor is
  // edge-on everywhere past a metre — so a shadow cast ONTO the boards is invisible and the pool
  // has to be put where it can be seen: on the bottom of the cloth, on the skirting, on the sides
  // of the plinths. These sit at ankle height and pull those faces down into strokes.
  const pools = [];
  const pool = (x, y, z, dist, k = 1) => {
    const l = new THREE.PointLight('#ffffff', 0, dist, 2);
    l.position.set(x, y, z);
    l.userData.k = k;
    pools.push(l);
    g.add(l);
  };
  pool(0.22, 0.1, 0.1, 1.5, 1); // under the table, offset the way the key throws it
  pool(0.15, 0.12, -0.92, 1.1, 0.8); // under the bench Pepe sits on
  pool(-1.5, 0.1, -1.5, 1.2, 0.7); // under the trolley, stage left
  pool(1.6, 0.1, -1.7, 1.2, 0.7); // under the shelf unit, stage right
  pool(0.62, 0.26, 0.72, 1.15, 0.9); // the hem of the cloth, stage right: the bottom of the frame
  pool(-0.66, 0.24, 0.68, 0.9, 0.5); // and a lighter one on the near side

  // ── practicals: a point light at each drawn lamp. A bulb is a point; a shade is drawn, not
  //    simulated — and the small negative above the pendant is what keeps its light off the
  //    ceiling, in place of a shadow-casting cube map we cannot afford. ──
  // The pendant is the one practical that casts. It is a SpotLight rather than a bare point for
  // one reason only: a three-petal shade IS a cone, and the key is off at night, so the shadow
  // budget it spends is free — and it is the only light that will draw Pepe's silhouette, a flat
  // paper edge, down the console behind him. Never a halo: nothing is drawn where the light is,
  // only where it stops.
  const pendant = new THREE.SpotLight('#ffe6b8', 0, 5.0, 1.24, 0.22, 2);
  pendant.castShadow = true;
  pendant.shadow.mapSize.set(1024, 1024);
  pendant.shadow.bias = -0.0004;
  pendant.shadow.normalBias = 0.012;
  pendant.shadow.radius = 1;
  pendant.shadow.camera.near = 0.15;
  pendant.shadow.camera.far = 5.0;
  const tableLamp = new THREE.PointLight('#ffe0a8', 0, 1.55, 2);
  const floorLamp = new THREE.PointLight('#ffe6b8', 0, 3.4, 2);
  for (const l of [pendant, tableLamp, floorLamp]) g.add(l);
  g.add(pendant.target);
  let lampsPlaced = false;
  function placeLamps(L) {
    pendant.position.set(L.pendant.x, L.pendant.y - 0.24, L.pendant.z);
    pendant.target.position.set(L.pendant.x, 0, L.pendant.z);
    tableLamp.position.set(L.table.x, L.table.y - 0.02, L.table.z);
    floorLamp.position.set(L.floor.x, L.floor.y, L.floor.z);
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
    bounce.intensity = S.bounce;
    bounce.visible = S.bounce > 0;
    floorBounce.intensity = S.floorBounce;
    floorBounce.visible = S.floorBounce > 0;
    for (const l of corners) l.intensity = S.corners * l.userData.k;
    for (const l of pools) l.intensity = (S.pools ?? 0) * l.userData.k;
    pendant.intensity = S.pendant;
    pendant.distance = S.pendantDistance ?? 5.0;
    pendant.angle = S.pendantAngle ?? 1.24;
    pendant.visible = S.pendant > 0;
    tableLamp.intensity = S.table;
    tableLamp.visible = S.table > 0;
    floorLamp.intensity = S.floor;
    floorLamp.visible = S.floor > 0;
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
    bounce,
    floorBounce,
    corners,
    pools,
    practicals: { pendant, table: tableLamp, floor: floorLamp },
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
