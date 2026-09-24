// walk-crossing — HE GOES TO THE FIRE (AND TO THE READING TABLE), AND NOBODY IS SEEN GOING.
//
// The owner, 2026-09-24, over sixteen versions of a mockup (claude.ai/artifact/A4QfYDquTYgsPaDo63YNrw):
// Pepe is supernatural, so he does not walk. When the visitor asks for the fireplace, he comes
// apart where he sits. His ink hangs in the air in his shape. Then wet frog prints cross the
// floor with nobody in them, and the ink drains into them one print at a time. The room goes dark
// in pen AFTER he has gone ("the dimming may be better if it happend after pepe disappeared"),
// except where his body would be and along the road he has walked. Once the last print is down,
// the camera follows them into the fireplace shot, and there is nobody there ("lets not reappear
// pepe — lets just do the steps and then the camera follow"). The dark lifts as the camera
// settles. When the visitor leaves, the camera goes home at once and the prints come back on their
// own. Each print gives its ink up, and he re-forms at his table: line first, then his green laid
// a hair out of register, then home.
//
// Rules the owner set on the way, and why things are as they are here:
//   · the prints walk through LIGHT, never through the room's hatched shadows — the road goes round
//     the lit side of the table and across the bare rug (measured off the rendered floor: 225–248
//     of 255 along it, against 112–155 for the first road behind the table)
//   · the dark is DRAWN: hatching in three passes, never a grey veil (a grey veil was rejected)
//   · his road is BRIGHTER than the room: white pen strokes lift the room's own ink there
//   · the fire itself is not part of the design; this file never draws it
//
// HOW IT IS DRAWN. Everything here is a 2D canvas laid over the WebGL one. Every point is a point
// of the SET (metres, layout.js), projected through the live camera on each drawing. So the prints
// sit on the floor in perspective while the camera dollies. The table hides the prints behind it
// by a plain line-of-sight test against its drum.
// The seated Pepe is taken off the rendered frame itself on the drawing he goes: the frame is drawn
// once with him and once without, on the same tick (so the room's boil is identical), and the
// difference is him. That picture is then held as a flat card on his own plane — he IS a flat card
// (pepe.js) — so it can be put back through any later camera.
//
// Numbers are the owner's own, off the DialKit panel on the mockup (P, below).

const P = {
  dim: { ramp: 4, during: 0.45, flicker: 0, pool: 0.3, ink: 0.49, weight: 0.65, spacing: 4.2 },
  figure: { width: 0.22, height: 0.47, core: 0.53, soft: 0.79, lift: 1.9, paper: 0.77, paperWeight: 1.4 },
  road: { on: true, strength: 0.58, radius: 0.95 },
};
const INK = '#1c1c18';
const PAPER = '#f8f9f4';

// ---- the set ----------------------------------------------------------------------------------
const SEAT = [0, 0, -0.82]; // his bench (layout.js pepe.pos)
const LAMP = [0, 1.9, -0.9];
const PERSON_H = 1.56;
// WHERE HE GOES, AND BY WHICH ROAD. Each road is measured off the rendered floor of the home shot
// (1280x800, the mean of a 7 px patch at each set point, 0 black to 255 paper): it keeps to what
// reads as paper and out of the table's own hatched shadow, which falls behind it and to the right.
//   fireplace  round the lit side of the table and across the bare rug to the hearth step
//              (225–248 along it, against 112–155 for the first road behind the table)
//   table      the mirror of it: round the front of the table on the right, across the rug and
//              up to the chair pulled to the reading table (226–247 along it; the shadow it
//              skirts is 122–168)
// `look` is where a phone turns to while the prints cross, so its narrow frame holds them.
const ROUTES = {
  fireplace: { road: [[-0.8, 0, -0.2], [-1.05, 0, 0.25], [-1.35, 0, 0.55], [-1.75, 0, 0.6], [-2.08, 0, 0.35]], look: [-1.75, 0.95, 0.05] },
  table: { road: [[0.8, 0, -0.2], [1.02, 0, 0.22], [1.28, 0, 0.42], [1.5, 0, 0.26], [1.46, 0, -0.18]], look: [1.3, 0.95, 0.02] },
};
let ROAD = ROUTES.fireplace.road;
let END = ROAD[ROAD.length - 1];
let LOOK = ROUTES.fireplace.look;
// his card, for taking him off the frame: a box round the seated figure
const SEAT_BOX = { x: [-0.55, 0.55], y: [0.28, 1.58], z: [-0.95, -0.7] };

// ---- the exposure sheets (drawings at 12 a second, from the tap) --------------------------------
// there: a beat, then he is gone; the prints; the camera follows once the last one is down
const THERE = { gone: 3, carry: 9, step: 3, n: 8, dir: 1 };
THERE.land = THERE.carry + THERE.step * (THERE.n - 1) + 1;
const FOLLOW = 32; // drawings the camera takes from the chair to the fireplace shot
export const CROSS_SECONDS = FOLLOW / 12;
// back: he is already nobody, so the dark starts at once and the prints set off quicker
const BACK = { gone: 0, carry: 4, step: 2, n: 6, dir: -1 };
BACK.land = BACK.carry + BACK.step * (BACK.n - 1) + 1;
// his ink flies from the prints to his bench and he is drawn back in there, line first, over the
// better part of a second: long enough to be SEEN forming, which on a phone (still turning home)
// the first cut of this was not — the owner: "pepe still appears out of no where"
BACK.arrive = BACK.land + 5;
BACK.plate = BACK.arrive + 8;
BACK.home = BACK.plate + 1;
BACK.turn = BACK.land - 6; // a phone turns home from here, so his bench is in frame before he forms

// ---- small arithmetic ---------------------------------------------------------------------------
const hash = (a, b = 0, s = 0) => {
  let h = (a * 374761393 + b * 668265263 + s * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k));
const within = (f, a, b) => clamp((f - a + 1) / (b - a + 1));

function road() {
  const len = [0];
  for (let i = 1; i < ROAD.length; i++) len.push(len[i - 1] + Math.hypot(ROAD[i][0] - ROAD[i - 1][0], ROAD[i][2] - ROAD[i - 1][2]));
  return (u) => {
    const d = clamp(u) * len[len.length - 1];
    let i = 1;
    while (i < len.length - 1 && len[i] < d) i++;
    const t = (d - len[i - 1]) / (len[i] - len[i - 1]);
    return [lerp(ROAD[i - 1][0], ROAD[i][0], t), 0, lerp(ROAD[i - 1][2], ROAD[i][2], t), Math.atan2(ROAD[i][2] - ROAD[i - 1][2], ROAD[i][0] - ROAD[i - 1][0])];
  };
}
// lay both legs' prints along the road to one place
function route(name) {
  const r = ROUTES[name] ?? ROUTES.fireplace;
  ROAD = r.road;
  END = ROAD[ROAD.length - 1];
  LOOK = r.look;
  const along = road();
  for (const g of [THERE, BACK]) {
    g.at = (u) => {
      const q = along(g.dir > 0 ? u : 1 - u);
      if (g.dir < 0) q[3] += Math.PI;
      return q;
    };
    g.prints = Array.from({ length: g.n }, (_, j) => {
      const [x, , z, h] = g.at(j / (g.n - 1)), side = j % 2 ? 1 : -1;
      return { x: x - Math.sin(h) * 0.1 * side, z: z + Math.cos(h) * 0.1 * side, h, side, t: g.carry + g.step * j };
    });
    g.from = g.dir > 0 ? SEAT : END;
    g.to = g.dir > 0 ? END : SEAT;
  }
}
route('fireplace');

// the table's drum hides what is behind it (a cloth to the floor, the top at 0.76)
function hidden(cam, p) {
  for (let i = 1; i < 24; i++) {
    const t = i / 24, x = lerp(cam[0], p[0], t), y = lerp(cam[1], p[1], t), z = lerp(cam[2], p[2], t);
    if (y < 0.78 && Math.hypot(x, z) < 0.66) return true;
  }
  return false;
}
// the drawing without its green, and the green without its drawing
function split(src, keepGreen) {
  const cv = document.createElement('canvas');
  cv.width = src.width;
  cv.height = src.height;
  const g = cv.getContext('2d');
  g.drawImage(src, 0, 0);
  const im = g.getImageData(0, 0, cv.width, cv.height), d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], gg = d[i + 1], b = d[i + 2], green = gg > r + 25 && gg > b + 10, lips = r > gg + 30 && r > 150;
    if (keepGreen) {
      if (!(green || lips) || d[i + 3] < 128) d[i + 3] = 0;
      else if (green) { d[i] = 105; d[i + 1] = 185; d[i + 2] = 100; }
    } else if (green || lips) d[i] = d[i + 1] = d[i + 2] = 244;
  }
  g.putImageData(im, 0, 0);
  return cv;
}

export function createCrossing(ctx) {
  const THREE = ctx.THREE;
  const cam = ctx.camera, renderer = ctx.renderer, glass = renderer.domElement;
  const pepe = () => ctx.pieces.pepe ?? null;

  // ---- the sheet laid over the glass ----------------------------------------------------------
  const cv = document.createElement('canvas');
  cv.className = 'crossing';
  Object.assign(cv.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', pointerEvents: 'none' });
  glass.parentElement?.appendChild(cv);
  const c = cv.getContext('2d');
  let W = 0, H = 0, u = 1;
  let DARK = [];
  function fit() {
    const pr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = Math.round((ctx.size?.w || window.innerWidth) * pr);
    H = Math.round((ctx.size?.h || window.innerHeight) * pr);
    cv.width = W;
    cv.height = H;
    u = Math.max(1, W / 1152);
    buildDark();
  }
  // the pen's own hatching laid over the whole sheet, three passes at three angles
  function buildDark() {
    const passes = [{ a: -1.05, off: 0.2 }, { a: 0.62, off: 0.44 }, { a: -0.18, off: 0.68 }];
    DARK = [];
    passes.forEach((ps, li) => {
      const ca = Math.cos(ps.a), sa = Math.sin(ps.a), nx = -sa, ny = ca, gap = P.dim.spacing * u, R = Math.hypot(W, H);
      for (let o = -R, row = 0; o < R; o += gap, row++) {
        let t = -R + hash(row, li, 1) * 20;
        while (t < R) {
          const len = (16 + hash(row, t | 0, li + 3) * 18) * u, mx = W / 2 + nx * o + ca * (t + len / 2), my = H / 2 + ny * o + sa * (t + len / 2);
          if (mx > -20 && mx < W + 20 && my > -20 && my < H + 20) {
            DARK.push({ li, mx, my, hx: (ca * len) / 2, hy: (sa * len) / 2, n: (hash(row, t | 0, li + 7) - 0.5) * 0.2, off: ps.off, j: [hash(row, t | 0, 11) - 0.5, hash(row, t | 0, 12) - 0.5, hash(row, t | 0, 13) - 0.5, hash(row, t | 0, 14) - 0.5] });
          }
          t += len + 2 + hash(row, t | 0, li + 5) * 5;
        }
      }
    });
  }
  fit();
  ctx.on?.('resize', fit);

  const debugOn = ctx.params?.get?.('xdebug') === '1';
  let readout = null;
  if (debugOn) {
    readout = document.createElement('pre');
    Object.assign(readout.style, { position: 'fixed', left: '6px', top: '6px', zIndex: '99', margin: '0', padding: '6px 8px', maxWidth: 'calc(100vw - 12px)', whiteSpace: 'pre-wrap', font: '11px/1.35 ui-monospace,Menlo,monospace', color: '#0d0e0d', background: 'rgba(248,249,244,.92)', border: '1px solid #0d0e0d', pointerEvents: 'none' });
    document.body.appendChild(readout);
  }
  function showDebug() {
    if (!readout) return;
    const T = ctx.pieces;
    readout.textContent = [
      `crossing ${leg === THERE ? 'OUT' : leg === BACK ? 'BACK' : '-'} f=${leg ? rel() : '-'} away=${away} busy=${leg ? (leg === THERE ? hold == null : rel() < BACK.home) : false}`,
      `phone=${T.camera?.phonePan} dpr=${window.devicePixelRatio} glass=${glass.width}x${glass.height} sheet=${W}x${H} u=${u.toFixed(2)}`,
      `card: ${dbg.taken}`,
      dbg.box ? `box ${dbg.box}` : '',
      dbg.A ? `with him: ${dbg.A}` : '',
      dbg.B ? `without:  ${dbg.B}` : '',
      dbg.diff ? `${dbg.diff}` : '',
      dbg.ctx ? `${dbg.ctx} glErr=${dbg.glError}` : '',
      `inks now ${inks.length} · camera ${typeof T.camera?.current === 'string' ? T.camera.current : 'pose'}${T.camera?.moving ? ' moving' : ''} · pepe shown ${T.pepe?.parts?.torso?.visible}`,
    ].filter(Boolean).join('\n');
  }

  // ---- the live camera, as a projection onto the sheet ----------------------------------------
  const M = new THREE.Matrix4(), MI = new THREE.Matrix4();
  const m = () => M.elements;
  const refreshCamera = () => {
    cam.updateMatrixWorld();
    M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  };
  const proj = ([x, y, z], w = W, h = H) => {
    const e = m(), ww = e[3] * x + e[7] * y + e[11] * z + e[15];
    return [((e[0] * x + e[4] * y + e[8] * z + e[12]) / ww + 1) / 2 * w, (1 - (e[1] * x + e[5] * y + e[9] * z + e[13]) / ww) / 2 * h, ww];
  };
  // a point of the glass back onto the plane z = zp
  const unproject = (sx, sy, zp, w, h) => {
    MI.copy(M).invert();
    const a = new THREE.Vector3(sx / w * 2 - 1, 1 - sy / h * 2, -1).applyMatrix4(MI);
    const b = new THREE.Vector3(sx / w * 2 - 1, 1 - sy / h * 2, 1).applyMatrix4(MI);
    const t = (zp - a.z) / (b.z - a.z);
    return [lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t)];
  };

  // ---- state ----------------------------------------------------------------------------------
  let leg = null; // THERE or BACK while it runs
  let f0 = 0; // the clock frame the leg started on
  let hold = null; // the frame the dark starts to lift (the camera has settled)
  let away = false; // he is at the fire, and nobody
  let card = null; // him, taken off the frame: { img, line, plate, quad: [TL, TR, BL] in 3D }
  let inks = [];
  let waits = []; // [{frame, resolve}]
  let pan = null; // the pose a phone turned to on the way out, so the way back can turn to it too
  let heard = -1; // the last drawing whose sounds have been fired
  let gate = true; // on the way back, he does not form until the camera is home to see it
  let drawn = false;
  let place = null; // where he went
  const rel = () => ctx.clock.frame - f0;

  function wait(r) {
    return new Promise((resolve) => waits.push({ r, resolve }));
  }

  // ---- him, off the frame ---------------------------------------------------------------------
  // ---- ?xdebug=1: what the capture saw, on the glass, for a phone that cannot open devtools ----
  const dbg = { taken: 'not yet' };
  // HE IS TAKEN OFF THE FRAME FROM THE CHAIR, WHEREVER THE VISITOR IS LOOKING. On a laptop the
  // wide shot holds both him and the fireplace, so the frame on the glass had him in it. A phone
  // held upright does not: to tap the fireplace at all the visitor has turned the view to it, and
  // he is then off the right edge — the capture box came back as 1094,182 −290×696 on the owner's
  // iPhone, "box too small", no card, no ink, and he came home out of nowhere. So for the two
  // drawings the lens is put on the resting shot, he is drawn, read, drawn again without him, and
  // the lens goes back to where the visitor had it; the card lives on his own plane in the set, so
  // which camera took it does not matter to anything after.
  function takeCard() {
    const P0 = pepe(), C = ctx.pieces.camera;
    if (!P0?.parts?.torso) return null;
    const draw = () => (ctx.pieces.ink?.render ? ctx.pieces.ink.render(ctx) : renderer.render(ctx.scene, cam));
    const saved = { pos: cam.position.clone(), q: cam.quaternion.clone(), up: cam.up.clone(), fov: cam.fov, aspect: cam.aspect, view: cam.view?.enabled ? { ...cam.view } : null };
    try {
      if (C?.place) {
        C.place(C.restingShot ?? 'home', cam, cam.aspect);
        P0.parts.torso.visible = true;
        draw();
      }
      return takeCardHere();
    } finally {
      cam.position.copy(saved.pos);
      cam.quaternion.copy(saved.q);
      cam.up.copy(saved.up);
      cam.fov = saved.fov;
      cam.aspect = saved.aspect;
      if (saved.view) cam.setViewOffset(saved.view.fullWidth, saved.view.fullHeight, saved.view.offsetX, saved.view.offsetY, saved.view.width, saved.view.height);
      else if (cam.view?.enabled) cam.clearViewOffset();
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
      P0.parts.torso.visible = false;
      draw(); // the visitor's own frame again, and he is not in it
    }
  }
  function takeCardHere() {
    const P0 = pepe();
    refreshCamera();
    const gw = glass.width, gh = glass.height, xs = [], ys = [];
    for (const x of SEAT_BOX.x) for (const y of SEAT_BOX.y) for (const z of SEAT_BOX.z) { const p = proj([x, y, z], gw, gh); xs.push(p[0]); ys.push(p[1]); }
    const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(gw, Math.ceil(Math.max(...xs)));
    const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(gh, Math.ceil(Math.max(...ys)));
    const w = x1 - x0, h = y1 - y0;
    dbg.box = `${x0},${y0} ${w}x${h} of ${gw}x${gh}`;
    if (w < 8 || h < 8) { dbg.taken = 'box too small'; return null; }
    // READ OFF THE GL BUFFER, NOT OFF THE CANVAS: readPixels reads the buffer just drawn, whether or
    // not the context preserves it, where a 2D drawImage of the canvas depends on the browser.
    const gl = renderer.getContext();
    const grab = () => {
      renderer.setRenderTarget(null);
      const buf = new Uint8Array(w * h * 4);
      gl.readPixels(x0, gh - y1, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      const im = new ImageData(w, h);
      for (let y = 0; y < h; y++) im.data.set(buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
      return im;
    };
    const A = grab();
    P0.parts.torso.visible = false;
    ctx.pieces.ink?.render ? ctx.pieces.ink.render(ctx) : renderer.render(ctx.scene, cam); // the same tick again, without him
    const B = grab();
    const lit = (im) => { let n = 0, sum = 0; for (let i = 0; i < im.data.length; i += 4) { if (im.data[i + 3]) n++; sum += im.data[i] + im.data[i + 1] + im.data[i + 2]; } return `${((100 * n) / (w * h)).toFixed(0)}% opaque, mean ${(sum / (3 * w * h)).toFixed(0)}`; };
    dbg.A = lit(A);
    dbg.B = lit(B);
    dbg.glError = gl.getError();
    const ca = gl.getContextAttributes?.() ?? {};
    dbg.ctx = `preserve=${ca.preserveDrawingBuffer} aa=${ca.antialias} alpha=${ca.alpha} webgl${renderer.capabilities?.isWebGL2 ? 2 : 1}`;
    const mk = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) { const p = i * 4; if (Math.abs(A.data[p] - B.data[p]) + Math.abs(A.data[p + 1] - B.data[p + 1]) + Math.abs(A.data[p + 2] - B.data[p + 2]) > 50) mk[i] = 1; }
    const R = 2, dl = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let on = 0; for (let dy = -R; dy <= R && !on; dy++) for (let dx = -R; dx <= R; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h && mk[yy * w + xx]) { on = 1; break; } } dl[y * w + x] = on; }
    const outside = new Uint8Array(w * h), st = [];
    const push = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const i = y * w + x; if (outside[i] || dl[i]) return; outside[i] = 1; st.push(i); };
    for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
    while (st.length) { const i = st.pop(), x = i % w, y = (i / w) | 0; push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1); }
    const out = new ImageData(w, h);
    for (let i = 0; i < w * h; i++) if (!outside[i]) { const p = i * 4; out.data[p] = A.data[p]; out.data[p + 1] = A.data[p + 1]; out.data[p + 2] = A.data[p + 2]; out.data[p + 3] = 255; }
    const img = document.createElement('canvas');
    img.width = w;
    img.height = h;
    img.getContext('2d').putImageData(out, 0, 0);
    const z = SEAT[2];
    const quad = [unproject(x0, y0, z, gw, gh), unproject(x1, y0, z, gw, gh), unproject(x0, y1, z, gw, gh)];
    // his ink: strokes sampled off his own drawing, put back on his plane in the set
    const pts = [];
    for (let t = 0; pts.length < 460 && t < 40000; t++) {
      const x = Math.floor(hash(t, 1, 1) * w), y = Math.floor(hash(t, 1, 2) * h), p = (y * w + x) * 4;
      if (out.data[p + 3] > 128) pts.push([...unproject(x0 + x, y0 + y, z, gw, gh), (out.data[p] + out.data[p + 1] + out.data[p + 2]) / 3]);
    }
    let diff = 0;
    for (let i = 0; i < w * h; i++) diff += mk[i];
    dbg.diff = `${((100 * diff) / (w * h)).toFixed(1)}% of the box differs`;
    dbg.taken = `yes, ${pts.length} ink strokes`;
    return { img, line: split(img, false), plate: split(img, true), quad, pts };
  }
  // the card through the live camera: a flat thing on a flat plane, so three corners place it
  function drawCard(image, { alpha = 1, dx = 0, dy = 0, dots = 0 } = {}) {
    if (!card) return;
    const [a, b, d] = card.quad.map((q) => proj(q));
    if (a[2] <= 0) return;
    let src = image;
    if (dots > 0) {
      src = document.createElement('canvas');
      src.width = image.width;
      src.height = image.height;
      const g = src.getContext('2d');
      g.drawImage(image, 0, 0);
      eat(g, image.width, image.height, dots, 5, image.width / 260);
    }
    c.save();
    c.globalAlpha = alpha;
    c.setTransform((b[0] - a[0]) / image.width, (b[1] - a[1]) / image.width, (d[0] - a[0]) / image.height, (d[1] - a[1]) / image.height, a[0] + dx * u, a[1] + dy * u);
    c.drawImage(src, 0, 0);
    c.restore();
  }
  function eat(g, w, h, k, seed, scale) {
    g.save();
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = '#000';
    const n = Math.round(1100 * k);
    for (let i = 0; i < n; i++) { const x = hash(i, seed, 1) * w, y = hash(i, seed, 2) * h, r = (2.5 + hash(i, seed, 3) * 6) * scale; g.beginPath(); g.ellipse(x, y, r * 1.5, r, hash(i, seed, 4) * 3, 0, 7); g.fill(); }
    g.restore();
  }

  // ---- the dark, and the light where he walks -------------------------------------------------
  function level(g, f) {
    if (f < g.gone) return 0;
    const r = Math.max(1, Math.round(P.dim.ramp));
    if (f < g.gone + r) return (P.dim.during * (f - g.gone + 1)) / r;
    if (hold == null || f < hold) return P.dim.during + (hash(Math.floor(f / 4), 41) - 0.5) * P.dim.flicker;
    if (f < hold + 8) return P.dim.during * (1 - Math.floor(within(f, hold, hold + 7) * 5) / 5);
    return 0;
  }
  function walker(g, f) {
    if (f < g.carry - 3) return g.from;
    const [x0, , z0] = g.at(0);
    if (f < g.carry) { const k = within(f, g.carry - 3, g.carry - 1); return [lerp(g.from[0], x0, k), 0, lerp(g.from[2], z0, k)]; }
    const [x, , z] = g.at(clamp((f - g.carry) / (g.step * (g.n - 1))));
    return [x, 0, z];
  }
  function dark(g, f) {
    const lv = level(g, f);
    if (lv <= 0) return;
    const par = Math.floor(f / 4) % 2;
    const L = proj(LAMP), rx = W * 0.75 * P.dim.pool, ry = H * 0.8 * P.dim.pool;
    let Wk = null;
    const lane = [];
    if (f >= g.gone) {
      const p = walker(g, f), a = proj(p), b = proj([p[0], PERSON_H, p[2]]);
      if (a[2] > 0) { const h = Math.max(20, a[1] - b[1]); Wk = { x: a[0], y: (a[1] + b[1]) / 2, rx: h * P.figure.width, ry: h * P.figure.height }; }
      if (P.road.on) for (const pr of g.prints) if (f >= pr.t) { const q = proj([pr.x, 0, pr.z]), q2 = proj([pr.x, 0.45, pr.z]); if (q[2] > 0) lane.push({ x: q[0], y: q[1] - (q[1] - q2[1]) * 0.3, r: Math.max(14, (q[1] - q2[1]) * P.road.radius) }); }
    }
    const light = (d) => {
      let k = 0;
      if (Wk) k = Math.max(k, 1 - clamp((Math.hypot((d.mx - Wk.x) / Wk.rx, (d.my - Wk.y) / Wk.ry) - P.figure.core) / Math.max(0.01, P.figure.soft)));
      for (const q of lane) k = Math.max(k, P.road.strength * (1 - clamp((Math.hypot(d.mx - q.x, (d.my - q.y) * 1.6) / q.r - 0.5) / 0.8)));
      return k;
    };
    const ink = [new Path2D(), new Path2D(), new Path2D()], paper = [new Path2D(), new Path2D(), new Path2D()];
    for (const d of DARK) {
      const k = light(d), jx = d.j[par * 2] * u, jy = d.j[par * 2 + 1] * u;
      const D = lv * (0.22 + 0.98 * clamp(Math.hypot((d.mx - L[0]) / rx, (d.my - L[1]) / ry))) * (1 - k);
      if (D > d.off + d.n) { const p = ink[d.li]; p.moveTo(d.mx - d.hx + jx, d.my - d.hy + jy); p.lineTo(d.mx + d.hx + jx, d.my + d.hy + jy); }
      if (k * lv * P.figure.lift > d.off + d.n) { const p = paper[d.li]; p.moveTo(d.mx - d.hx * 1.1 + jx, d.my - d.hy * 1.1 + jy); p.lineTo(d.mx + d.hx * 1.1 + jx, d.my + d.hy * 1.1 + jy); }
    }
    c.save();
    c.lineCap = 'butt';
    c.strokeStyle = INK;
    for (let li = 0; li < 3; li++) { c.lineWidth = P.dim.weight * (li ? 0.86 : 1) * u; c.globalAlpha = Math.min(1, P.dim.ink * (li === 2 ? 0.76 : 1)); c.stroke(ink[li]); }
    c.lineCap = 'round';
    c.strokeStyle = PAPER;
    for (let li = 0; li < 3; li++) { c.lineWidth = P.figure.paperWeight * (li ? 0.83 : 1) * u; c.globalAlpha = Math.min(1, P.figure.paper * [1, 0.91, 0.83][li]); c.stroke(paper[li]); }
    c.restore();
  }

  // ---- the prints ------------------------------------------------------------------------------
  function frogPrint(pr, f, alpha) {
    const s = 1.7, cos = Math.cos(pr.h + pr.side * 0.12), sin = Math.sin(pr.h + pr.side * 0.12);
    const W3 = (lx, lz) => proj([pr.x + lx * cos - lz * sin, 0.002, pr.z + lx * sin + lz * cos]);
    const poly = (pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); };
    const disc = (cx, cz, rx, rz, n = 12) => poly(Array.from({ length: n }, (_, k) => W3(cx + Math.cos((k / n) * 6.283) * rx, cz + Math.sin((k / n) * 6.283) * rz)));
    c.save();
    c.fillStyle = INK;
    c.strokeStyle = INK;
    c.globalAlpha = alpha;
    c.lineCap = 'round';
    const jit = (hash(Math.floor(f / 2), pr.t, 71) - 0.5) * 0.004;
    disc(-0.012 * s, jit, 0.045 * s, 0.036 * s);
    const unit = Math.abs(W3(0, 0)[0] - W3(0, 0.01)[0]) + Math.abs(W3(0, 0)[1] - W3(0.01, 0)[1]);
    for (let k = 0; k < 4; k++) {
      const a = -0.62 + k * 0.41 + (hash(k, pr.t, 72) - 0.5) * 0.12, Lm = (0.078 + (k === 1 || k === 2 ? 0.016 : 0)) * s;
      const p0 = W3(Math.cos(a) * 0.02, Math.sin(a) * 0.02), p1 = W3(Math.cos(a) * Lm, Math.sin(a) * Lm);
      c.lineWidth = Math.max(1, unit * 1.4);
      c.beginPath();
      c.moveTo(p0[0], p0[1]);
      c.lineTo(p1[0], p1[1]);
      c.stroke();
      disc(Math.cos(a) * Lm, Math.sin(a) * Lm, 0.016 * s, 0.016 * s, 8);
    }
    c.globalAlpha = alpha * 0.5;
    poly([W3(0, 0), ...[-0.62, -0.415, -0.21, -0.005, 0.2, 0.405, 0.61].map((a, i) => W3(Math.cos(a) * (i % 2 ? 0.04 : 0.062) * s, Math.sin(a) * (i % 2 ? 0.04 : 0.062) * s))]);
    c.globalAlpha = alpha * 0.55;
    c.fillStyle = PAPER;
    disc(-0.022 * s, -0.01 * s, 0.015 * s, 0.008 * s, 8);
    c.restore();
  }
  function splash(pr, age) {
    c.save();
    c.fillStyle = INK;
    c.strokeStyle = INK;
    for (let k = 0; k < 7; k++) {
      const a = hash(k, pr.t, 81) * 6.28, d = (0.07 + hash(k, pr.t, 82) * 0.08) * 1.6 * (age ? 1.25 : 1);
      const p = proj([pr.x + Math.cos(a) * d, 0.002, pr.z + Math.sin(a) * d]), q = proj([pr.x + Math.cos(a) * d + 0.01, 0.002, pr.z + Math.sin(a) * d]);
      const r = Math.max(0.8, Math.hypot(q[0] - p[0], q[1] - p[1]) * (1 + hash(k, pr.t, 83) * 1.4) * (age ? 0.8 : 1));
      c.globalAlpha = age ? 0.6 : 1;
      c.beginPath();
      c.arc(p[0], p[1], r, 0, 7);
      c.fill();
    }
    const R = age ? 0.27 : 0.16;
    c.globalAlpha = age ? 0.35 : 0.8;
    c.lineWidth = (age ? 1 : 1.5) * u;
    c.beginPath();
    for (let k = 0; k <= 24; k++) { const p = proj([pr.x + Math.cos((k / 24) * 6.283) * R, 0.002, pr.z + Math.sin((k / 24) * 6.283) * R]); k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }
    c.stroke();
    c.restore();
  }
  function prints(g, f, camPos) {
    for (const pr of g.prints) {
      if (f < pr.t) continue;
      let a = 1;
      if (hold != null && f > hold + 8) a = 1 - Math.floor((f - hold - 9) / 2) / 6;
      if (a <= 0) continue;
      if (proj([pr.x, 0, pr.z])[2] <= 0 || hidden(camPos, [pr.x, 0, pr.z])) continue;
      frogPrint(pr, f, a);
      if (f === pr.t || f === pr.t + 1) splash(pr, f - pr.t);
    }
  }

  // ---- his ink ---------------------------------------------------------------------------------
  function strokesOf(g, f) {
    const end = g === THERE ? THERE.land + 1 : BACK.arrive + 8;
    if (f < g.gone || f >= end) return;
    c.save();
    c.strokeStyle = INK;
    c.lineCap = 'round';
    c.globalAlpha = 0.9;
    const hang = (p, t) => { const d = Math.max(0, t - g.gone); return [p.x + Math.sin(d * 0.35 + p.ph) * 0.004, p.y + d * p.drift + Math.min(d, 3) * 0.006, p.z]; };
    const draw = (Pt, a, len, w, Q) => {
      const s = proj(Pt);
      if (s[2] <= 0) return;
      c.lineWidth = w;
      c.beginPath();
      if (Q) { const e = proj(Q); c.moveTo(e[0], e[1]); c.lineTo(s[0], s[1]); c.stroke(); return; }
      const up = proj([Pt[0], Pt[1] + 0.01, Pt[2]]), L = Math.max(2, len * Math.abs(up[1] - s[1]) * 100);
      c.moveTo(s[0] - (Math.cos(a) * L) / 2, s[1] - (Math.sin(a) * L) / 2);
      c.lineTo(s[0] + (Math.cos(a) * L) / 2, s[1] + (Math.sin(a) * L) / 2);
      c.stroke();
    };
    for (const p of inks) {
      const w = p.w * u, pr = g.prints[p.group % g.n];
      if (g.dir > 0) { // his body hangs, then drains print by print into the floor
        const t0 = pr.t - 5;
        if (f < t0) draw(hang(p, f), p.a + Math.sin(f * 0.3 + p.ph) * 0.15, p.len, w);
        else if (f < pr.t) { const k = (f - t0) / 5, s = hang(p, t0), at = (q) => [lerp(s[0], pr.x + p.jx, q), lerp(s[1], 0, q * q), lerp(s[2], pr.z + p.jz, q)]; draw(at(k), 0, 0, w, at(Math.max(0, k - 0.2))); }
      } else if (f >= pr.t) { // coming home, each print gives its ink up and it gathers into him
        const k = ease(within(f, pr.t, BACK.arrive + 7)), s = [pr.x + p.jx, 0, pr.z + p.jz], mid = [(s[0] + p.x) / 2, Math.max(s[1], p.y) + 0.35, (s[2] + p.z) / 2];
        const q = (v) => [0, 1, 2].map((i) => (1 - v) * (1 - v) * s[i] + 2 * v * (1 - v) * mid[i] + v * v * [p.x, p.y, p.z][i]);
        // a streak along its flight: the black lines that carry him back to his bench
        draw(q(k), 0, 0, w * 0.85, q(Math.max(0, k - 0.1)));
      }

    }
    c.restore();
  }

  // ---- one drawing of the sheet ------------------------------------------------------------------
  function paint(f) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W, H);
    if (!leg) return;
    refreshCamera();
    const g = leg, camPos = cam.position.toArray();
    // the room slips out of register while the rule is broken
    if (f >= g.gone && (hold == null || f < hold)) {
      const k = (f < g.gone + 3 ? 4 : 2.2 + hash(f, 51) * 1.4) * u;
      c.save();
      c.globalAlpha = 0.22;
      c.globalCompositeOperation = 'multiply';
      c.drawImage(glass, k, -k * 0.6, W, H);
      c.restore();
    }
    dark(g, f);
    // motes of ink rise out of the floor
    const moteEnd = hold ?? f + 1;
    if (f >= g.gone && f <= moteEnd + 6) {
      const k = f > moteEnd ? 1 - (f - moteEnd) / 7 : 1;
      c.save();
      c.fillStyle = INK;
      for (let i = 0; i < 90; i++) {
        const x = hash(i, 61) * W, y0 = H * (0.55 + hash(i, 62) * 0.45), y = y0 - ((f - g.gone) * (1 + hash(i, 63) * 2.5) * H / 844) % (H * 0.5);
        c.globalAlpha = 0.55 * k;
        c.beginPath();
        c.arc(x + Math.sin(f * 0.4 + i) * 2, y, (0.7 + hash(i, 64) * 1.3) * u + 0.3, 0, 7);
        c.fill();
      }
      c.restore();
    }
    if (g === THERE && card && (f === THERE.gone || f === THERE.gone + 1)) drawCard(card.plate, { alpha: f === THERE.gone ? 1 : 0.45, dx: 8, dy: -6 });
    if (g === BACK && card && f >= BACK.arrive && f < BACK.home) {
      const dots = f < BACK.arrive + 8 ? 1 - within(f, BACK.arrive, BACK.arrive + 7) : 0;
      drawCard(card.line, { dots });
      if (f === BACK.plate) drawCard(card.plate, { dx: 6, dy: -4 });
    }
    prints(g, f, camPos);
    strokesOf(g, f);
  }

  // ---- what it sounds like (sound-voices.js: unmake, gutter, print, reform) ----------------------
  // Fired on the drawing they belong to, each panned to where it happens on the glass: he comes
  // apart where he sits, the lamp fails a step at a time, every print is put down where it lands.
  const panAt = (p) => { refreshCamera(); const q = proj(p); return q[2] > 0 ? clamp((q[0] / W) * 2 - 1, -1, 1) * 0.8 : 0; };
  const cue = (name, opts) => ctx.pieces.sound?.play?.(name, opts);
  function sounds(g, f) {
    for (let e = heard + 1; e <= f; e++) {
      const r = Math.max(1, Math.round(P.dim.ramp));
      if (g === THERE && e === THERE.gone) cue('unmake', { pan: panAt([SEAT[0], 0.9, SEAT[2]]) });
      if (e >= g.gone && e < g.gone + r) cue('gutter', { gain: (g === THERE ? 1 : 0.7) * (1 - (0.5 * (e - g.gone)) / r) });
      for (const pr of g.prints) if (e === pr.t) cue('print', { pan: panAt([pr.x, 0, pr.z]), gain: 0.85 + hash(pr.t, 5) * 0.3 });
      if (g === BACK && e === BACK.arrive) cue('reform', { pan: panAt([SEAT[0], 0.9, SEAT[2]]) });
      if (g === BACK && e === BACK.plate) cue('tap', { gain: 0.35, pan: panAt([SEAT[0], 0.9, SEAT[2]]) });
    }
    heard = Math.max(heard, f);
  }

  // ---- the frame loop's two ends -------------------------------------------------------------------
  function update() {
    if (!leg) return;
    // THE CAMERA COMES FIRST. The crossing runs on the clock and the camera on the drawings it is
    // actually given, and on a phone that renders slower than twelve a second the two part company:
    // he would be drawn back in at a bench the camera is still turning towards. So the leg waits
    // at the edge of forming, his ink hanging round the bench, until the camera is home.
    if (leg === BACK && !gate && rel() >= BACK.arrive) f0 = ctx.clock.frame - (BACK.arrive - 1);
    const f = rel();
    sounds(leg, f);
    for (const w of waits.filter((x) => f >= x.r)) { waits.splice(waits.indexOf(w), 1); w.resolve(); }
    if (leg === BACK && f >= BACK.home && pepe()?.parts?.torso) pepe().parts.torso.visible = true;
    // done: the dark has lifted and the prints have dried
    const done = hold != null && f > hold + 8 + 14;
    if (done) {
      if (leg === BACK) { away = false; card = null; place = null; }
      leg = null;
      hold = null;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, W, H);
    }
  }
  function afterRender() {
    showDebug();
    if (!leg) {
      if (drawn) { c.clearRect(0, 0, W, H); drawn = false; }
      return;
    }
    const f = rel();
    if (leg === THERE && f >= THERE.gone && !card) {
      try {
        card = takeCard();
      } catch (e) {
        card = null;
        dbg.taken = `threw: ${e?.message ?? e}`;
      }
      inks = (card?.pts ?? []).map(([x, y, z, lum], i) => ({ x, y, z, a: 1.02 + (hash(i, 3) - 0.5) * 0.3, len: 0.016 + hash(i, 4) * 0.02, w: lum < 120 ? 1.6 : 1.1, drift: 0.0007 + hash(i, 5) * 0.0025, ph: hash(i, 6) * 6.28, group: Math.floor(hash(i, 8) * 8), jx: (hash(i, 9) - 0.5) * 0.06, jz: (hash(i, 10) - 0.5) * 0.06 }));
      if (!card && pepe()?.parts?.torso) pepe().parts.torso.visible = false;
    }
    if (ctx.clock.stepped || !drawn) { paint(f); drawn = true; }
  }

  return {
    CROSS_SECONDS,
    // a crossing in progress refuses every other walk: out, until the camera has settled at the
    // fire; back, until he is sitting at his table again
    get busy() {
      if (!leg) return false;
      return leg === THERE ? hold == null : rel() < BACK.home;
    },
    get away() {
      return away;
    },
    get active() {
      return leg != null;
    },
    // where a phone turns to while the prints cross, as a pose the camera can walk to
    panPose() {
      const v = cam.view && cam.view.enabled ? [cam.view.offsetX / cam.view.fullWidth, cam.view.offsetY / cam.view.fullHeight] : [0, 0];
      pan = { pos: cam.position.toArray(), look: LOOK, fov: cam.fov, shift: v };
      return pan;
    },
    // the way back on a phone turns to the same place, so the prints can be seen coming home
    get pan() {
      return pan;
    },
    backPanSeconds: BACK.carry / 12 + 0.25,
    homeSeconds: (BACK.arrive - BACK.turn) / 12,
    panSeconds: (THERE.land - THERE.carry) / 12,
    // the places he crosses to rather than staying put
    goes: (name) => name in ROUTES,
    get place() {
      return place;
    },
    // he goes: resolves `carry` when the first print lands and `landed` when the last one has
    there(name = 'fireplace') {
      route(name);
      place = name;
      leg = THERE;
      f0 = ctx.clock.frame;
      heard = -1;
      pan = null;
      hold = null;
      card = null;
      inks = [];
      away = true;
      return { carry: wait(THERE.carry), landed: wait(THERE.land + 1) };
    },
    // the camera has arrived at the fire: the dark lifts from here
    settled() {
      if (leg === THERE) hold = rel();
    },
    // he comes home, alongside the camera's own walk
    // the camera is home: he may form
    open() {
      gate = true;
    },
    back() {
      if (!away) return { turn: Promise.resolve(), landed: Promise.resolve(), home: Promise.resolve() };
      gate = false;
      leg = BACK;
      f0 = ctx.clock.frame;
      heard = -1;
      hold = BACK.arrive + 4;
      // his ink, bound for where he sat: the card's own points
      inks = (card?.pts ?? []).map(([x, y, z, lum], i) => ({ x, y, z, w: lum < 120 ? 1.6 : 1.1, len: 0.016 + hash(i, 4) * 0.02, group: Math.floor(hash(i, 8) * BACK.n), jx: (hash(i, 9) - 0.5) * 0.06, jz: (hash(i, 10) - 0.5) * 0.06 }));
      return { turn: wait(BACK.turn), landed: wait(BACK.land), home: wait(BACK.home) };
    },
    // anything that takes the visitor away by another road: he is simply back
    reset() {
      gate = true;
      leg = null;
      hold = null;
      away = false;
      card = null;
      place = null;
      waits.splice(0).forEach((w) => w.resolve());
      if (pepe()?.parts?.torso) pepe().parts.torso.visible = true;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, W, H);
    },
    update,
    afterRender,
    params: P,
    // for the tools: what was taken off the frame when he went
    get card() {
      if (!card) return null;
      const d = card.img.getContext('2d').getImageData(0, 0, card.img.width, card.img.height).data;
      let on = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i]) on++;
      return { w: card.img.width, h: card.img.height, fill: +(on / (card.img.width * card.img.height)).toFixed(3), inks: inks.length, quad: card.quad.map((q) => q.map((x) => +x.toFixed(3))) };
    },
  };
}
