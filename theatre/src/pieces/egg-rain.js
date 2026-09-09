// AN EGG, inside props: THE WEATHER. Click the window and it rains outside it.
//
// The user: "Click the window: rain starts outside in ink, the room dims a shade… Click again, it
// clears." And, about the puppet: "no need to change pepe during it." He does not change. Nothing
// about him, the cloth, the deck or the reading knows this happened.
//
// WHERE RAIN CAN BE DRAWN AT ALL, WHICH IS NOT WHERE ANYONE WOULD GUESS. room.js draws a window
// the way the film draws one: the back of the reveal is an opaque sheet of paper (the daylight) and
// each pane is another opaque sheet in front of it. There is no outside behind that glass — the
// outside IS the paper. So a stroke drawn BEHIND the pane does not exist, and the room already
// answered this question once, for the telephone lead-in: "the only depth in which a thing can be
// OUTSIDE and still be seen is the 17 mm between the pane and the front of the casement: draw a
// cable there and the meeting stiles and the glazing bar pass in front of it, which is exactly what
// puts it on the far side of the window." The rain is drawn in that same slot, 10.5 mm off the
// glass, and every stile, rail and glazing bar of the casement crosses in front of it.
//
// AND IT CANNOT SPILL. Each sheet of rain is cut to ONE PANE — four sheets, two leaves of two
// lights — so the drawing is bounded by the glass itself and not by a z test. There is no frame,
// no camera, no aspect at which a stroke can land on a shutter, on the architrave or in the room:
// the geometry will not carry it there. (That is worth more than it sounds. The shutters fold flat
// over the plaster to x -0.50 and a rain field ruled across the window opening would print on them
// at every angle the room is ever shot from.)
//
// HOW IT IS DRAWN. A rain stroke is a rain stroke: one straight dash at 17° off the vertical, a
// pen's width, a hand's wobble, no head, no splash, no ellipse. Sixteen drawings are cut into ONE
// canvas — four STRIKES across, four LAYERS down:
//
//   the strike   which throw of rain this drawing is. It changes on every 12 fps step, and the
//                four are independent throws, not one throw slid down the glass: hand-drawn rain
//                is re-struck each frame, which is why it flickers and why it is alive. The left
//                leaf and the right leaf are never on the same strike (they run two apart), so the
//                two panes side by side are never the same drawing twice.
//   the layer    a quarter of the rain each, dealt off one stratified grid so that any one, two,
//                three or four of them together cover the pane evenly. Density is HOW MANY LAYERS
//                ARE SHOWING, and nothing else: sparse rain becomes full rain because more rain
//                arrived, not because a different drawing replaced it. One layer at the first
//                step, four at two seconds, exactly as asked.
//
// Sixteen drawings, sixteen meshes, ONE canvas and ONE texture: each mesh keeps its own four UVs
// and they are re-pointed at the step's column. (Sixteen canvases would have cost about half a
// second of props' 1500 ms build budget — a canvas is ~30 ms in the headless browser, which is the
// measurement egg-insects.js paid for.)
//
// WHAT THE ROOM DOES. A `rain` state is injected into lighting.js's own table (it publishes
// `states`, so this costs that file nothing): the key dropped and cooled to an overcast sky, the
// corners a little deeper, the ramp opened one notch. It sits between `default` and `evening` and
// it is NOT evening — no lamps come on, the panes do not go solid, it is still the afternoon. THE
// PEN IS NOT TOUCHED: lineWeight, the contour, the crease and silhouette thresholds are all the
// pass's own. Only the tone moves. The cut lands on the same 12 fps drawing as the first stroke of
// rain, because a cloud arriving is a cut and this film does not dissolve.
//
// WHAT IT SOUNDS LIKE. `rainBed` in sound-voices.js: filtered noise, cut in at level, under the
// room tone, running as long as there is rain on the glass and cut dead when the last stroke goes.
// It hangs on the audio context's destination through a fader of its own, because the sound piece
// publishes its context and not its master; the fader follows `sound.muted` so the visitor's mute
// key still works.
//
// WHAT ANNOUNCES IT: nothing. No label, no glow, no tag. The cursor over the panes is the whole
// affordance, as it is for the radio, the cat, the lever and the insects.
//
// api (published as props.rain):
//   on            is there rain in the drawing (true from the first stroke to the last)
//   layers        0..4, what is showing now
//   toggle()      work it as a click does — cue, event and all
//   set(on)       for a still: full rain or none, with no ramp, no cue and nothing to wait for
//   hitBox()      the glazed area of the casement on the glass, in px
//   tapBox()      the box a thumb is actually given (>= 44 px, grown about the same centre)
//   update(ctx)   called from props.update on the stepped clock
import * as THREE from 'three';
import { INK, makeCanvas, canvasTexture, inkLine } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { rainBed, LEVEL as SOUND_LEVEL } from './sound-voices.js';

// room.js's own numbers for buildWindow(), and the window's own rectangle if the room piece is not
// there to be asked. These are READ, never written: if the joinery ever changes, these change with
// it and nothing else in this file does.
const WIN = { x0: -1.95, x1: -1.05, y0: 1.04, y1: 2.45, depth: 0.21 };
const J = {
  f: 0.05, // the frame ring in the reveal
  s: 0.042, // a leaf's stile
  rt: 0.05, // its top rail
  rb: 0.075, // its bottom rail
  bar: 0.013, // half the glazing bar
  barAt: 0.34, // where the bar cuts the top light off, down from the head
  meet: 0.004, // half the gap between the meeting stiles
  zf0: 0.03,
  zf1: 0.08,
  leafIn: 0.008,
};
// How far off the pane's own sheet the rain stands. The glass is at zr + 0.055, lighting.js's night
// pane at zr + 0.059, and the front of the casement leaves at zr + 0.072 — so 10.5 mm is outside
// the glass, outside the night pane, and still under every stile and bar the room draws.
const OFF_GLASS = 0.0105;
const INSET = 0.002; // the rain stops 2 mm inside the glass, which at 181 px/m is a third of a pixel
const MIN_TAP = 44; // px: what a thumb needs, whatever the window measures on the glass

// ---- the drawing ---------------------------------------------------------------------------------
// THE ARITHMETIC THE STROKE COMES OUT OF, and it is the wall's, not the drawing's. The back wall
// runs 181 px to the metre at the home plate (1280x800) and 203 at 1600x900, so a pane 0.312 m wide
// is 55 px of glass. The room's own contour on that wall is 0.013 m — the width at which the ink
// pass stops throwing a mark away as a stray dark pixel (room-textures.js measured it for the
// wallpaper's ghost sprigs) — which is 2.4 px. A rain stroke is drawn one notch under a contour and
// no finer, or the pass simply deletes the weather.
const PPM = 360; // canvas px per metre: about 2x what the coarsest judged frame asks of it
const COLS = 4; // strikes
const ROWS = 4; // layers
const GRID = [4, 10]; // the stratified field a strike's rain is dealt off: 4 across, 10 down
const PEN = 0.0115; // metres — one notch under the wall's contour
const SLANT = 0.3; // radians off the vertical, leaning downstage-right. Every stroke, one wind.
const LEN = [0.055, 0.115]; // metres: a dash, not a streak

// One strike of rain, dealt into `ROWS` layers, drawn into the atlas at column `col`.
//
// HOW THE FIELD IS DEALT, AND THE OBVIOUS WAY IS WRONG. Generate the whole field on a grid and hand
// every fourth drop to a layer and you have not divided the rain, you have divided the PANE: with
// four cells across and four layers, "every fourth" is congruent with the grid and each layer comes
// out as one vertical stripe of drops. (It did. The first layer of the left leaf was a column of
// rain a fifth of the way across the glass and the rest of the pane was dry, which is a curtain and
// not a shower.) The deal is diagonal instead — layer (i + j) mod 4 — which is a Latin square: every
// layer takes exactly one cell in each row of the grid and walks across the columns as it goes down.
// One layer alone is then thin rain over the whole pane, and any two, three or four of them stack
// into an even field.
function strikeInto(g, col, TW, TH) {
  const rng = mulberry32(col * 7919 + 104729);
  const [gx, gy] = GRID;
  const cw = TW / gx, ch = TH / (gy - 1);
  const pen = PEN * PPM;
  const drops = [];
  for (let j = 0; j < gy; j++) {
    for (let i = 0; i < gx; i++) {
      // …the first row starts ABOVE the tile, so rain crosses the top edge of the pane instead of
      // beginning at it. A pane whose rain starts tidily at its head is a pattern, not weather.
      const x = (i + 0.5) * cw + (rng() - 0.5) * cw * 0.9;
      const y = (j - 1 + 0.5) * ch + (rng() - 0.5) * ch * 0.8;
      const len = (LEN[0] + rng() * (LEN[1] - LEN[0])) * PPM;
      const a = SLANT + (rng() - 0.5) * 0.09;
      drops.push({ x, y, len, a, w: pen * (0.82 + rng() * 0.36), row: (i + j) % ROWS });
    }
  }
  for (let k = 0; k < drops.length; k++) {
    const d = drops[k];
    const row = d.row;
    // the tile's own rect, clipped — and that clip IS the edge of the pane cutting the rain
    g.save();
    g.beginPath();
    g.rect(col * TW, row * TH, TW, TH);
    g.clip();
    const x0 = col * TW + d.x, y0 = row * TH + d.y;
    inkLine(g, x0, y0, x0 + Math.sin(d.a) * d.len, y0 + Math.cos(d.a) * d.len, {
      width: d.w,
      wobble: pen * 0.16,
      rng,
      color: INK,
      segments: 2,
    });
    g.restore();
  }
}

// ---- what the room does without the sun ------------------------------------------------------------
// One shade between `default` and `evening`, and it is still the afternoon: no lamp is lit, the key
// is not gone, the panes do not go solid (`night` stays false, or lighting.js would draw a
// cross-hatched sheet over the very glass the rain is behind).
//
// WHERE THE SHADE ACTUALLY LANDS, WHICH IS NOT WHERE IT WAS AIMED. Dropping the key alone does
// nothing to this room: swept from 3.3 down to 0.6 with the ramp untouched, the papered field behind
// Pepe holds at 4.92 % ink at every step and only breaks over when the key reaches ZERO, which is
// evening. The big flats are far above the first stroke threshold and there is no dimmer between
// paper and rain-strokes. What DOES move is the modelling — the shutters, the door's fielded panels,
// the reveals, the mouldings, the raked side walls — and it moves on the ramp, not on the key. So
// the shade is spent there: the key down and cooled by a third (the sun goes in), the corners a
// notch deeper, and the ink ramp opened one stop so a face that was one level of strokes takes two.
// THE PEN IS NOT IN IT: `ink` carries tone and levels and nothing else, and lineWeight, the contour
// and the crease and silhouette thresholds are all the pass's own numbers, untouched.
//
// AND THE POOL UNDER THE TABLE IS HELD BACK ON PURPOSE. `pools` is what darkens the cloth's hem and
// the ground the table stands on, and the ground it stands on is the RUG, which the user has said is
// already right. At the room's own -0.3 the rain state widened the shadow under the table by two
// points of ink; at -0.18 the rug sits where it sat and the rest of the room still goes over.
const RAIN_LIGHT = {
  key: 1.7,
  keyColor: '#e8eef7',
  fill: { sky: '#ffffff', ground: '#544f45', intensity: 0.33 },
  bounce: 0.11,
  floorBounce: 0.085,
  corners: -1.05,
  pools: -0.18,
  pendant: 0,
  table: 0,
  floor: 0,
  catLamp: 1.3,
  night: false,
  ink: { tone: [0.02, 0.62, 1.05, 0.26], levels: [0.5, 0.78, 0.94, 0.18] },
};

// ---- the ramp, in drawings ------------------------------------------------------------------------
const GROW = 2 / (ROWS - 1); // 0.667 s a layer: one at the first step, four at two seconds
const THIN = 1 / ROWS; // 0.25 s a layer: four down to none over the second the user asked for

export function eggRain(ctx, { group, switches, window: win = null }) {
  // …and the DEPTH is defaulted separately, because props.js's own fallback rectangle for the window
  // (used when the room piece failed to build) carries x0/x1/y0/y1 and no depth, and a NaN reveal
  // would put four sheets of rain at the origin, in the middle of the room, on the one frame where
  // everything else has already gone wrong.
  const w = { ...WIN, ...(win ?? ctx.pieces.room?.window ?? WIN) };
  if (!Number.isFinite(w.depth)) w.depth = WIN.depth;
  const zb = -ctx.layout.room.depth / 2;
  const zr = zb - w.depth;
  const zl1 = zr + J.zf1 - J.leafIn; // the front of the casement leaves
  const gz = (zr + J.zf0 + J.leafIn + zl1) / 2; // the pane's own sheet
  const rz = gz + OFF_GLASS; // …and the slot the rain is drawn in
  const xm = (w.x0 + w.x1) / 2;
  const yt = w.y1 - J.f - (w.y1 - w.y0 - 2 * J.f) * J.barAt; // the glazing bar
  const FY0 = w.y0 + J.f + J.rb, FY1 = w.y1 - J.f - J.rt; // a leaf's glazed height, rail to rail
  const leaves = [[w.x0 + J.f, xm - J.meet], [xm + J.meet, w.x1 - J.f]].map(([a, b]) => [a + J.s, b - J.s]);
  const lights = [[yt + J.bar, FY1], [FY0, yt - J.bar]]; // the small upper light, the tall one
  const PW = leaves[0][1] - leaves[0][0]; // a pane's width; both leaves are the same
  const FH = FY1 - FY0;

  // ---- the atlas: sixteen drawings on one canvas -----------------------------------------------
  const TW = Math.round(PW * PPM), TH = Math.round(FH * PPM);
  const canvas = makeCanvas(TW * COLS, TH * ROWS);
  const g2 = canvas.getContext('2d');
  for (let c = 0; c < COLS; c++) strikeInto(g2, c, TW, TH);
  const tex = canvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = Math.max(tex.anisotropy || 1, ctx.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1);
  // pepe.js's three numbers, for pepe.js's reason: `colorful` so the pass shows the drawing verbatim
  // and re-states its achromatic marks at the room's own pen, `lineWeight` 0 so no second contour is
  // drawn round a sheet, `hatch` 0.02 so a flat card facing the visitor takes no wash. alphaTest
  // rather than transparency: a rain stroke is ink or it is nothing, and a sorted transparent sheet
  // inside a window is a sorting bug waiting for a camera move.
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0 });
  mat.userData.ink = { hatch: 0.02, lineWeight: 0, colorful: true };
  mat.map = tex;
  mat.alphaTest = 0.5;
  mat.transparent = false;
  mat.name = 'rain-sheet';

  const root = new THREE.Group();
  root.name = 'rain';
  root.userData.noShadow = true;
  root.position.set((w.x0 + w.x1) / 2, (FY0 + FY1) / 2, rz);
  root.visible = false;
  group.add(root);

  // Sixteen sheets: one per pane per layer, each cut to its pane and each keeping its own UVs. The
  // v range is the pane's slice of the leaf's glazed height, so the rain runs on THROUGH the
  // glazing bar — a drop does not restart at a piece of joinery — and the bar simply covers it.
  const sheets = []; // { mesh, uv, leaf, v0, v1 }
  for (let l = 0; l < leaves.length; l++) {
    const [lx0, lx1] = leaves[l];
    for (const [ly0, ly1] of lights) {
      const x0 = lx0 + INSET, x1 = lx1 - INSET, y0 = ly0 + INSET, y1 = ly1 - INSET;
      const v0 = (y0 - FY0) / FH, v1 = (y1 - FY0) / FH;
      const uu0 = (x0 - lx0) / PW, uu1 = (x1 - lx0) / PW;
      for (let row = 0; row < ROWS; row++) {
        const geo = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
        const m = new THREE.Mesh(geo, mat);
        m.castShadow = m.receiveShadow = false;
        m.visible = false;
        m.position.set((x0 + x1) / 2 - root.position.x, (y0 + y1) / 2 - root.position.y, 0);
        m.name = `rain-${l}-${row}`;
        root.add(m);
        sheets.push({ mesh: m, uv: geo.attributes.uv, leaf: l, row, uu0, uu1, v0, v1 });
      }
    }
  }
  // point every sheet at the strike its leaf is on. The two leaves run two columns apart, so the
  // pair side by side is never the same throw of rain.
  function strikeAt(frame) {
    for (const s of sheets) {
      const col = (frame + s.leaf * 2) % COLS;
      const u0 = (col + s.uu0) / COLS, u1 = (col + s.uu1) / COLS;
      const v0 = (s.row + s.v0) / ROWS, v1 = (s.row + s.v1) / ROWS;
      const a = s.uv.array;
      a[0] = u0; a[1] = v1;
      a[2] = u1; a[3] = v1;
      a[4] = u0; a[5] = v0;
      a[6] = u1; a[7] = v0;
      s.uv.needsUpdate = true;
    }
  }
  strikeAt(0);
  function show(n) {
    for (const s of sheets) s.mesh.visible = s.row < n;
    root.visible = n > 0;
  }

  // ---- the light --------------------------------------------------------------------------------
  let was = null; // the lighting state the room was in before the cloud came over
  function lights_(on) {
    const L = ctx.pieces.lighting;
    if (!L?.states) return;
    // …and the ramp is `default`'s own, plus the one notch above. Injected once, and only if some
    // other hand has not already put a `rain` there.
    if (!L.states.rain) L.states.rain = RAIN_LIGHT;
    if (on) {
      if (was == null) was = L.state ?? 'default';
      L.setState('rain');
    } else {
      // never rained: leave the lighting exactly as whoever set it left it (?light=, a judging
      // state, the flow's own evening). This piece only ever puts back what it took.
      if (was == null) return;
      L.setState(was);
      was = null;
    }
  }

  // ---- the sound --------------------------------------------------------------------------------
  // The sound piece publishes its context but not its master, so the bed hangs on the destination
  // through a fader of this piece's own, and that fader follows the visitor's mute key. It is cut
  // in at level (nothing in this film fades in) and cut dead when the last stroke goes.
  let bed = null, fader = null;
  function sound(on) {
    const S = ctx.pieces.sound;
    const ac = S?.context ?? null;
    if (!on) {
      try {
        bed?.stop();
      } catch {
        /* already stopped */
      }
      fader?.disconnect?.();
      bed = fader = null;
      return;
    }
    // …and a muted room still gets its bed, held at zero by the fader. Building it only when the
    // sound is up would mean that unmuting during a shower brought back everything except the rain.
    if (bed || !ac) return;
    try {
      fader = ac.createGain();
      fader.gain.value = S?.muted ? 0 : 1;
      fader.connect(ac.destination);
      bed = rainBed(ac, fader);
    } catch (e) {
      console.warn('[rain] the weather is silent:', e?.message ?? e);
      bed = fader = null;
    }
  }
  function mind_the_mute() {
    if (!fader) return;
    const want = ctx.pieces.sound?.muted ? 0 : 1;
    if (fader.gain.value !== want) fader.gain.value = want;
  }

  // ---- the box on the glass ---------------------------------------------------------------------
  // The casement's whole glazed area, both leaves together: the visitor is pointing at THE WINDOW,
  // and the meeting stiles and the glazing bars between the panes are part of it. Null when the
  // window is behind the lens (the overhead inserts), which is the only way this can be asked a
  // question it has no answer to.
  const v = new THREE.Vector3();
  function hitBox() {
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const xs = [], ys = [];
    for (const [lx0, lx1] of leaves)
      for (const x of [lx0, lx1])
        for (const y of [FY0, FY1]) {
          v.set(x, y, gz).project(ctx.camera);
          if (v.z > 1) return null; // behind the camera: there is no window on this glass
          xs.push(((v.x + 1) / 2) * W);
          ys.push(((1 - v.y) / 2) * H);
        }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  // …grown about its centre to 44 px each way, which is what a thumb has. The window is 127 x 210 px
  // at the home plate and needs none of it; the margin is there for the frames where it does.
  function tapBox() {
    const b = hitBox();
    if (!b) return null;
    const w2 = Math.max(b.w, MIN_TAP), h2 = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w2 / 2, y: b.y + b.h / 2 - h2 / 2, w: w2, h: h2, grown: w2 > b.w || h2 > b.h };
  }
  function over(px, py) {
    const b = tapBox();
    return !!b && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
  }

  // ---- the weather ------------------------------------------------------------------------------
  let want = false; // what the visitor asked for
  let on = false; // whether there is rain in the drawing
  let layers = 0;
  let t0 = 0; // when the current ramp started, on the 12 fps clock
  let held = 0; // how many layers were showing when the visitor called it off

  function toggle(next = !want) {
    want = !!next;
    if (!want) held = layers;
  }

  const api = {
    get on() {
      return on;
    },
    get layers() {
      return layers;
    },
    get raining() {
      return want;
    },
    steps: ROWS,
    // seconds since the ramp began, on the 12 fps clock: what a tool needs to say whether a layer
    // arrived on the drawing it was due on, rather than when a stalling render loop noticed
    get since() {
      return +((ctx.clock?.t ?? 0) - t0).toFixed(3);
    },
    schedule: { grow: GROW, thin: THIN },
    toggle,
    // for the tools and for setState: full rain or none, at once, with no cue and no waiting. The
    // ramp is BACK-DATED rather than skipped — put the start of the fall a full ramp in the past and
    // the next stepped frame agrees it is already full, instead of finding t == t0 and beginning the
    // fall over again on the drawing after the still was asked for.
    set(next, level = ROWS) {
      want = on = !!next;
      layers = on ? Math.max(1, Math.min(ROWS, level | 0)) : 0;
      held = layers;
      t0 = (ctx.clock?.t ?? 0) - GROW * (layers - 1) - GROW / 2;
      show(layers);
      lights_(on);
      if (!on) sound(false);
    },
    hitBox,
    tapBox,
    over,
    // the bed, rendered through an OfflineAudioContext by the very code the page runs — what
    // tools/_egg-rain-proof.mjs measures its peak and its colour from (sound.js's own `render` walks
    // a list of named cues and a looped bed is not one of them)
    async render(seconds = 1.5, sampleRate = 22050) {
      const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OC) return null;
      const oc = new OC(2, Math.max(64, Math.ceil(seconds * sampleRate)), sampleRate);
      const bus = oc.createGain();
      bus.gain.value = 1;
      bus.connect(oc.destination);
      rainBed(oc, bus);
      const buf = await oc.startRendering();
      return { sampleRate: buf.sampleRate, l: Array.from(buf.getChannelData(0)), level: SOUND_LEVEL.rain };
    },
    // what the tools ask about the noise itself, since it is not on the sound piece's timeline
    get audible() {
      return { running: !!bed, muted: !!ctx.pieces.sound?.muted, gain: fader ? fader.gain.value : 0 };
    },
    update(ctx2) {
      mind_the_mute();
      if (!ctx2.clock.stepped) return;
      if (on) strikeAt(ctx2.clock.frame); // the boil: a new throw of rain on every drawing
      const t = ctx2.clock.t;
      if (want && !on) {
        // the first drawing of the fall, and the room goes over on the same one
        on = true;
        t0 = t;
        layers = 1;
        strikeAt(ctx2.clock.frame);
        show(layers);
        lights_(true);
        sound(true);
        ctx.emit?.('props:rain', { on: true });
      } else if (want && on) {
        const n = Math.min(ROWS, 1 + Math.floor((t - t0) / GROW));
        if (n !== layers) {
          layers = n;
          show(layers);
        }
        held = layers;
      } else if (!want && on) {
        // it thins over the second, a layer at a time, and stops
        const n = Math.max(0, held - Math.floor((t - t0) / THIN));
        if (n !== layers) {
          layers = n;
          show(layers);
        }
        if (layers === 0) {
          on = false;
          lights_(false);
          sound(false);
          ctx.emit?.('props:rain', { on: false });
        }
      }
    },
  };
  // The visitor's own call. `ctx.clock.t` is the STEPPED clock, so the ramp is dated from the
  // drawing the click landed on and not from the millisecond it happened — the fall is counted in
  // drawings, like everything else in this room.
  const pull = () => {
    toggle();
    t0 = ctx.clock?.t ?? 0;
  };
  // The arbiter raycasts an object first and falls back to a thumb's box; this switch answers with
  // a box of its own instead (as the globe does), because the thing being pointed at is the GLASS
  // and the glass belongs to room.js. `object()` is only asked how far away it is, which decides
  // who wins when the radio's grown box on the cart below overlaps this one: the radio is nearer
  // the lens, so the radio takes it, which is right.
  switches?.add?.({ name: 'rain', object: () => root, hit: over, tapBox, onDown: pull });

  if ((ctx.params ?? new URLSearchParams(location.search)).get('rain') === '1') api.set(true);
  return api;
}

// what the props piece's setState hands over: the one name this egg answers to
export function rainState(api, name) {
  api?.set?.(name === 'rain');
}
