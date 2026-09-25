// piano-prints — THE PIANO PLAYS ITSELF, AND EVERY KEY IT STRIKES TAKES A WET GREEN PRINT.
//
// The owner, 2026-09-25, on the ghost at the piano: "What if the hatch version of Pepe is not actually
// touching the piano, but the notes that are played turn green. No hands, no arms. Pepe is just
// sitting at the piano and the piano is playing itself." And then: "Maybe in a similar animation as
// the feet on the floor when Pepe moves from A to B — Something truly magical. Maybe we don't even
// need the hatch." Seven versions of a mockup later (the "Invisible player", approved as v7: "its
// good, leave as is. build it"), this is what is left of him at the piano: nobody. His prints cross
// the room to the stool (walk-crossing.js, ROUTES.piano), the camera follows them, and the piano
// starts on its own. Every key it strikes is struck by a frog's finger that is not there.
//
// WHAT IS DRAWN, on a sheet laid over the glass like the crossing's (every point a point of the SET,
// in metres, put through the live camera on every drawing, so it sits on the keys in either framing):
//   · THE PRINTS. On the drawing a key goes down, a frog's toe print lands on it: the round pad off
//     the crossing's own footprint, the finger's first joint behind it, Pepe's green laid a hair off
//     an ink edge, a paper shine while it is wet, and a splash — green drops and a thin ring — on the
//     drawing it lands and the one after. It stays wet while the key is held, and dries in steps
//     over DRY drawings after it comes up, fading as one shape. Green motes lift off a fresh one.
//   · THE ROOM, dimmed while the song plays: ONE open pass of the room's own hatching, half its
//     strokes left out ("the cross-hatching competes with the keys" — three passes were too busy),
//     and two pools of light, the keyboard and the jar. Drawn with the pen, never a grey veil.
//   · THE JAR OF FLIES on the lid, his snacks (the owner's pick for the empty lid): a preserving jar,
//     a punched tin lid, a narrow paper label in the room's sign hand, MOUCHES. The flies hear the
//     piano — every note jolts some of them into the glass, a big chord more of them — and settle
//     between phrases; when the music stops they drop or cling, and one twitches. At the piano shot
//     the jar is drawn here; everywhere else the room has a plain ink jar in its place
//     (props-piano.js), which this sheet takes out of the scene while it draws its own.
//
// THE OWNER'S NUMBERS, off the mockup's dials (v5), are the constants below (P).
//
// PERFORMANCE: the dim is the one expensive thing (a field of dashes over the whole sheet), and it
// only changes with the boil's parity and its level, so it is drawn once per (parity, level) into a
// cached sheet of its own and put down with one drawImage. The prints, the jar and the flies are a
// few hundred path operations a drawing.

export const P = {
  flies: { count: 8, agitation: 1.15, reaction: 0.4 },
  prints: { dry: 18, splash: 0.8, motes: 0.8 },
  room: { dark: 0.45, pool: 0.75 },
  line: { weight: 2.3, ink: 0.92, boil: 1 },
};
const INK = '#1c1c18';
const PAPER = '#f8f9f4';
const GREEN = '#69b964'; // pepe.js SKIN

// ---- small arithmetic ----------------------------------------------------------------------------
const hash = (a, b = 0, s = 0) => {
  let h = (a * 374761393 + b * 668265263 + s * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mulberry32 = (seed) => {
  let a = seed >>> 0 || 1;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ---- the keys, in the set's metres (props-piano.js) ----------------------------------------------
let PIANO = null, keyZ = null, isBlack = null, UNIT = 0;

// A KEY'S PLAYING SURFACE, as (x, z) round its top: a black key is a slip; a white key is its full
// width at the front and narrows between its black neighbours at the back. `y` is the top, and
// (cx, cy) is where the key's own box pivots when it goes down (props-piano.js: 6 mm down, and
// tilted 0.056 rad so the front dips and the back stays) — so a print on a key that is down lies on
// the key where it is, not where it was.
function keyShape(m) {
  const z = keyZ(m);
  if (isBlack(m)) { const x0 = PIANO.front + .012, x1 = x0 + .089, h = UNIT * .29; return { m, black: true, pts: [[x1, z - h], [x1, z + h], [x0, z + h], [x0, z - h]], y: PIANO.keyY + .025, cx: (x0 + x1) / 2, cy: PIANO.keyY + .018, z }; }
  const x0 = PIANO.front + .005, x1 = x0 + .14, xb = PIANO.front + .101, h = UNIT * .43;
  const lo = isBlack(m + 1) ? z - UNIT * .21 : z - h, hi = isBlack(m - 1) ? z + UNIT * .21 : z + h;
  return { m, black: false, pts: [[x1, z - h], [x1, z + h], [xb, z + h], [xb, hi], [x0, hi], [x0, lo], [xb, lo], [xb, z - h]], y: PIANO.keyY + .011, cx: (x0 + x1) / 2, cy: PIANO.keyY, z };
}
const DIP = -.056;
const keyPt = (k, x, z, down, dy = 0) => {
  const y = k.y + dy;
  if (!down) return [x, y, z];
  const ax = x - k.cx, ay = y - k.cy, c = Math.cos(DIP), s = Math.sin(DIP);
  return [k.cx + ax * c - ay * s, k.cy + ax * s + ay * c - .006, z];
};
// how wet a print is: 1 while its key is held, then down in steps, a notch every second drawing;
// a key struck again takes a fresh print and the old one is gone under it
function wetness(s, f) {
  if (f < s.f0 || s.gone) return 0;
  if (s.f1 == null || f < s.f1) return 1;
  return Math.max(0, 1 - Math.floor((f - s.f1) / 2) / Math.max(1, P.prints.dry / 2));
}
// where on its key the finger lands: a white key is 23.5 mm across and the pad all but fills it; on
// a black key (13.6) it spills a little over both edges, the way a wet toe does
function padOf(s) {
  const k = s.key, j = (a) => (hash(s.i, a, 3) - .5);
  return k.black ? { x: PIANO.front + .05 + j(1) * .008, z: k.z + j(2) * UNIT * .04, r: .0082 } : { x: PIANO.front + .105 + j(1) * .006, z: k.z + j(2) * UNIT * .05, r: .0118 };
}
function drawPrints(v, f, list) {
  const c = v.c, S = v.S;
  c.save(); c.lineJoin = 'round';
  // the prints, oldest first
  for (const s of list) {
    const w = wetness(s, f); if (w <= 0) continue;
    const k = s.key, isDown = s.f1 == null || f < s.f1, pd = padOf(s), g = (lx, lz) => v.proj(keyPt(k, pd.x + lx, pd.z + lz, isDown, .0004));
    // A FROG'S TOE PAD: the disc at the end of each toe of the crossing's footprint, seen close — a
    // round pad, and the finger running back from it toward the player, thinner, ending in the
    // first swell of the knuckle. One silhouette: its ink edge, the paper, and his green laid a
    // hair off the line. Drawn whole on a scratch sheet and put down at the print's wetness, so a
    // drying print fades as one thing and never shows its own seams.
    const sh = new Path2D(), ring = (cx, cz, r, n) => { for (let q = 0; q <= n; q++) { const a = (q / n) * 6.283, rr = r * (1 + (hash(s.i, q + n, 5) - .5) * .08), p = g(cx + Math.cos(a) * rr, cz + Math.sin(a) * rr); q ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]); } sh.closePath(); };
    ring(0, 0, pd.r, 22);
    // …and behind it, toward the player, the finger's first joint: a smaller pad pressed into the
    // same wet, joined to the tip by a short neck — a frog's toe print, not a drop
    const bend = (hash(s.i, 7, 9) - .5) * pd.r * .35, jx = pd.r * 1.55, jr = pd.r * .52;
    const nk = [g(pd.r * .5, -pd.r * .42), g(jx, -jr * .7 + bend), g(jx, jr * .7 + bend), g(pd.r * .5, pd.r * .42)];
    sh.moveTo(nk[0][0], nk[0][1]); for (const p of nk.slice(1)) sh.lineTo(p[0], p[1]); sh.closePath();
    ring(jx, bend, jr, 14);
    const o = g(0, 0), ex = g(pd.r, 0), ez = g(0, pd.r), rpx = Math.max(Math.hypot(ex[0] - o[0], ex[1] - o[1]), Math.hypot(ez[0] - o[0], ez[1] - o[1]));
    const pad = 4 * S + rpx * 1.2, bx0 = Math.floor(o[0] - pad - rpx * 3), by0 = Math.floor(o[1] - pad - rpx * 3), bw = Math.ceil(2 * (pad + rpx * 3)), bh = bw;
    const sc = v.scratch || (v.scratch = document.createElement('canvas'));
    if (sc.width < bw || sc.height < bh) { sc.width = Math.max(sc.width, bw); sc.height = Math.max(sc.height, bh); }
    const t = sc.getContext('2d'); t.setTransform(1, 0, 0, 1, 0, 0); t.clearRect(0, 0, bw, bh); t.translate(-bx0, -by0); t.lineJoin = 'round';
    const cw = Math.max(1.2 * S, rpx * .14);
    t.strokeStyle = INK; t.lineWidth = 2 * cw; t.stroke(sh);
    t.fillStyle = PAPER; t.fill(sh);
    t.save(); t.clip(sh); t.translate(cw * .9, -cw * .7); t.fillStyle = GREEN; t.fill(sh); t.restore();
    // the wet shine, while it is wet
    if (w >= 1) { const a = g(-pd.r * .45, -pd.r * .35), b = g(-pd.r * .05, -pd.r * .6); t.strokeStyle = PAPER; t.lineCap = 'round'; t.lineWidth = Math.max(1, cw * .9); t.beginPath(); t.moveTo(a[0], a[1]); t.lineTo(b[0], b[1]); t.stroke(); }
    c.globalAlpha = w; c.drawImage(sc, 0, 0, bw, bh, bx0, by0, bw, bh); c.globalAlpha = 1;
    // THE SPLASH, on the drawing it lands and the one after: splice() at a footprint, scaled to a
    // key — seven drops thrown clear of the pad and a thin ring that opens out
    const age = f - s.f0;
    if (age <= 1 && P.prints.splash > 0) {
      const sz = P.prints.splash * (k.black ? .7 : 1);
      for (let q = 0; q < 8; q++) {
        const a = hash(q, s.i, 81) * 6.28, d = (.016 + hash(q, s.i, 82) * .022) * sz * (age ? 1.35 : 1);
        const p = v.proj(keyPt(k, pd.x + Math.cos(a) * d, pd.z + Math.sin(a) * d, isDown, .0005)), p2 = v.proj(keyPt(k, pd.x + Math.cos(a) * d + .004, pd.z + Math.sin(a) * d, isDown, .0005));
        const r = Math.max(1.1 * S, Math.hypot(p2[0] - p[0], p2[1] - p[1]) * (.55 + hash(q, s.i, 83) * .8) * (age ? .7 : 1));
        c.globalAlpha = age ? .6 : 1;
        c.fillStyle = INK; c.beginPath(); c.arc(p[0], p[1], r + .6 * S, 0, 7); c.fill();
        c.fillStyle = GREEN; c.beginPath(); c.arc(p[0], p[1], r, 0, 7); c.fill();
      }
      const R = (age ? .05 : .03) * sz;
      c.strokeStyle = INK; c.globalAlpha = age ? .4 : .85; c.lineWidth = (age ? .8 : 1.2) * S; c.beginPath();
      for (let q = 0; q <= 32; q++) { const p = v.proj(keyPt(k, pd.x + Math.cos((q / 32) * 6.283) * R, pd.z + Math.sin((q / 32) * 6.283) * R, isDown, .0005)); q ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }
      c.stroke(); c.globalAlpha = 1;
    }
  }

  c.restore();
}
function keyMotes(v, f, list) {
  if (P.prints.motes <= 0) return;
  const c = v.c, S = v.S;
  c.save(); c.fillStyle = GREEN; c.strokeStyle = GREEN; c.lineCap = 'round';
  for (const s of list) {
    const n = Math.round(5 * P.prints.motes);
    for (let q = 0; q < n; q++) {
      const life = 14 + Math.floor(hash(s.i, q, 1) * 12), a = f - s.f0 - 1 - Math.floor(hash(s.i, q, 2) * 5);
      if (a < 0 || a >= life) continue;
      const pd = padOf(s), sw = Math.sin(a * .45 + q + s.i) * .006;
      const base = keyPt(s.key, pd.x + (hash(s.i, q, 3) - .5) * .03, pd.z + (hash(s.i, q, 4) - .5) * .03 + sw, false);
      const rise = a * .0065 * (.6 + hash(s.i, q, 5)) + a * a * .00009, p = v.proj([base[0], base[1] + rise, base[2]]);
      c.globalAlpha = Math.ceil((1 - a / life) * 4) / 4;
      if (hash(s.i, q, 6) < .3) { const p2 = v.proj([base[0], base[1] + rise + .016, base[2]]); c.lineWidth = 1.3 * S; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p2[0], p2[1]); c.stroke(); }
      else { c.beginPath(); c.arc(p[0], p[1], (1 + hash(s.i, q, 7) * 1.6) * S, 0, 7); c.fill(); }
    }
  }
  c.restore();
}

// ---- THE JAR OF FLIES, on the piano's lid ------------------------------------------------------
// WHERE IT STANDS, and it stands ON the lid, judged on the glass and not in metres (the owner, on
// the mockup: "the jar is half off the piano", "still right on the edge!"). From the piano shot the
// music desk (its top at y 1.055) hides the lid's front strip, so a jar 6 cm in from the case's
// front still stood on the visible edge of the top face. At x −2.33 the foot has a quarter of the
// visible face's depth clear in front of it and behind it in both framings (measured: laptop 122 /
// 202 px of a 422 px face at 2560×1600, phone 77 / 81 of 220 at 780×1688). The phone's turned frame
// loses the far rim of the lid at this depth, and the owner took that: "its good, leave as is".
export const JAR = { x: -2.33, z: -1.86, y: .98 };
// the glass, as [height, radius] up from the base: the foot, the body, the shoulder, the neck
const JPROF = [[0, .039], [.005, .0425], [.084, .0425], [.096, .039], [.102, .0345], [.107, .0345]];
const LID = { h0: .105, h1: .119, r: .0372 };
const GLASS = .0035; // the wall's own thickness, drawn as a second, finer line inside the first
const LIDTOP = { x0: -2.564 };
const jarR = (h) => { for (let i = 1; i < JPROF.length; i++) if (h <= JPROF[i][0]) { const [h0, r0] = JPROF[i - 1], [h1, r1] = JPROF[i]; return r0 + (r1 - r0) * (h - h0) / (h1 - h0); } return JPROF[JPROF.length - 1][1]; };
const jarPt = (th, h, r) => [JAR.x + Math.cos(th) * r, JAR.y + h, JAR.z + Math.sin(th) * r];
// where a fly may be: inside the glass, clear of the wall by its own size, under the shoulder
const FLY_R = (h) => jarR(h) - GLASS - .0055;
const FLY_H = [.007, .088];
// the sign hand's capitals (titles-sign.js GLYPHS), the seven this label needs, cap height 100, y down
const SIGN = {
  M: [79, [[[6, 99], [6, 3], [39, 68], [72, 3], [72, 99]]]],
  O: [74, [{ ring: [37, 50, 33, 48] }]],
  U: [65, [[[6, 1], ...Array.from({ length: 13 }, (_, i) => [31 + 25 * Math.cos(Math.PI - (Math.PI * i) / 12), 66 + 32 * Math.sin(Math.PI - (Math.PI * i) / 12)]), [57, 1]]]],
  C: [68, [Array.from({ length: 19 }, (_, i) => { const a = -0.34 * Math.PI + (-1.32 * Math.PI * i) / 18; return [35 + 30 * Math.cos(a), 50 + 48 * Math.sin(a)]; })]],
  H: [63, [[[7, 1], [7, 99]], [[56, 1], [56, 99]], [[7, 50], [56, 50]]]],
  E: [57, [[[7, 1], [7, 99]], [[7, 2], [53, 2]], [[7, 50], [45, 50]], [[7, 98], [55, 98]]]],
  S: [59, [[[53, 19], [47, 7], [31, 2], [15, 8], [11, 21], [17, 32], [31, 41], [45, 53], [51, 65], [49, 83], [37, 96], [19, 98], [8, 89], [5, 78]]]],
};

// ---- THE FLIES, one drawing at a time --------------------------------------------------------
// What they hear is the weight of every note struck on this drawing — the melody louder than the
// accompaniment, as in the game's own mix (0.8 against 0.5) — so a four-note chord lands harder than
// one note; `sm` is that, remembered and fading, so a phrase keeps them up and a held note lets them
// settle. A note jolts a share of them into a new heading; between notes each one's heading wanders
// and its speed eases to what the music has left in it; one that reaches the glass bounces off it
// (and the drawing marks the hit), and, calm and against the wall, sometimes walks up it instead.
// When the music stops, what is in the air drops to the floor and what is on the wall stays; some
// while after, one of them twitches.
function makeFlies() {
  return Array.from({ length: P.flies.count }, (_, i) => {
    const th = hash(i, 1, 91) * 6.283, rr = FLY_R(.02) * Math.sqrt(hash(i, 2, 91));
    return { p: [Math.cos(th) * rr, FLY_H[0], Math.sin(th) * rr], v: [0, 0, 0], mode: 'rest', walk: 0 };
  });
}
function stepFlies(flies, f, playing, e, sm, twitch) {
  return flies.map((F, i) => {
    let hit = null;
    if (!playing) {
      if (F.mode === 'fly') { F.v[0] *= .55; F.v[2] *= .55; F.v[1] = Math.min(F.v[1], 0) - .005; }
      else F.v = [0, 0, 0];
      if (F.mode === 'walk') F.mode = 'cling';
    } else {
      const share = P.flies.reaction * Math.min(1, e / 1.6);
      if (e > 0 && hash(i, f, 93) < share * .9 + (e > 1.5 ? .15 : 0)) {
        const th = hash(i, f, 94) * 6.283, up = (hash(i, f, 95) - .35) * .9, sp = (.008 + .014 * P.flies.agitation * Math.min(1, e / 1.3)) * (.8 + hash(i, f, 96) * .4);
        F.v = [Math.cos(th) * sp, up * sp, Math.sin(th) * sp];
        F.mode = 'fly';
      } else if (F.mode === 'rest' || F.mode === 'cling') {
        if (sm > .3 && hash(i, f, 97) < .08 * P.flies.agitation) { F.mode = 'fly'; F.v = [(hash(i, f, 98) - .5) * .008, .004, (hash(i, f, 99) - .5) * .008]; }
      } else if (F.mode === 'walk') {
        F.walk--;
        const th = Math.atan2(F.p[2], F.p[0]) + (hash(i, f, 100) - .5) * .12;
        F.p[1] = Math.min(FLY_H[1], F.p[1] + .0032);
        const rr = FLY_R(F.p[1]); F.p[0] = Math.cos(th) * rr; F.p[2] = Math.sin(th) * rr;
        F.v = [0, .0032, 0];
        if (F.walk <= 0 || F.p[1] >= FLY_H[1]) { F.mode = 'fly'; F.v = [-Math.cos(th) * .006, -.002, -Math.sin(th) * .006]; }
      }
      if (F.mode === 'fly') {
        const target = .0025 + .0075 * P.flies.agitation * Math.min(1, sm / 2);
        const sp = Math.hypot(...F.v) || 1e-6, k = lerp(sp, target, .22) / sp, turn = (hash(i, f, 101) - .5) * .9;
        const c = Math.cos(turn), s = Math.sin(turn);
        F.v = [(F.v[0] * c - F.v[2] * s) * k, (F.v[1] + (hash(i, f, 102) - .5) * .002) * k, (F.v[0] * s + F.v[2] * c) * k];
      }
    }
    if (F.mode === 'fly' || (!playing && F.mode !== 'rest' && F.mode !== 'cling')) {
      F.p = [F.p[0] + F.v[0], F.p[1] + F.v[1], F.p[2] + F.v[2]];
      const rr = Math.hypot(F.p[0], F.p[2]), lim = FLY_R(clamp(F.p[1], FLY_H[0], FLY_H[1]));
      if (rr > lim) {
        const nx = F.p[0] / rr, nz = F.p[2] / rr, dv = F.v[0] * nx + F.v[2] * nz;
        F.p[0] = nx * lim; F.p[2] = nz * lim;
        if (dv > 0) { F.v[0] -= 1.8 * dv * nx; F.v[2] -= 1.8 * dv * nz; }
        hit = { th: Math.atan2(nz, nx), h: F.p[1], hard: Math.min(1, Math.abs(dv) / .01) };
        if (playing && sm < .9 && hash(i, f, 103) < .22) { F.mode = 'walk'; F.walk = 8 + Math.floor(hash(i, f, 104) * 14); hit = null; }
        if (!playing) F.mode = hash(i, 7, 105) < .4 ? 'cling' : F.mode;
      }
      if (F.p[1] < FLY_H[0]) { F.p[1] = FLY_H[0]; if (!playing) { F.mode = 'rest'; F.v = [0, 0, 0]; } else F.v[1] = Math.abs(F.v[1]) * .8; }
      if (F.p[1] > FLY_H[1]) { F.p[1] = FLY_H[1]; F.v[1] = -Math.abs(F.v[1]) * .8; hit = hit ?? { th: Math.atan2(F.p[2], F.p[0]), h: FLY_H[1] + .004, hard: .4, top: 1 }; }
    }
    const tw = twitch && i === twitch.i ? twitch.d : 0;
    return { p: [F.p[0] + tw * .002, F.p[1], F.p[2] + tw * .0015], v: F.v.slice(), mode: F.mode, hit, sp: Math.hypot(...F.v), tw };
  });
}

// ---- the jar on the glass (worked out once per camera) ----------------------------------------
function jarGeom(v) {
  const a = v.proj([JAR.x, JAR.y, JAR.z]), b = v.proj([JAR.x, JAR.y + .1, JAR.z]);
  const dl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ax = [(b[0] - a[0]) / dl, (b[1] - a[1]) / dl], nx = [-ax[1], ax[0]];
  const ringAt = (h, r, n = 40) => Array.from({ length: n }, (_, k) => { const th = (k / n) * 6.283; return { th, p: v.proj(jarPt(th, h, r)) }; });
  // each height's two extremes across the jar's own axis on the glass: the silhouette's two sides
  const side = (h, r) => { const R = ringAt(h, r, 72); let lo = R[0], hi = R[0]; for (const q of R) { const d = q.p[0] * nx[0] + q.p[1] * nx[1]; if (d < lo.p[0] * nx[0] + lo.p[1] * nx[1]) lo = q; if (d > hi.p[0] * nx[0] + hi.p[1] * nx[1]) hi = q; } return [lo, hi]; };
  const hs = []; for (let h = 0; h <= .107 + 1e-9; h += .004) hs.push(Math.min(.107, h)); for (const [h] of JPROF) hs.push(h); hs.sort((p, q) => p - q);
  const sides = hs.map((h) => side(h, jarR(h)));
  // the near half of a ring: the arc of it that lies away from the top of the jar on the glass
  const arcOf = (h, r, near, n = 48) => { const c = v.proj([JAR.x, JAR.y + h, JAR.z]); return ringAt(h, r, n).filter((q) => ((q.p[0] - c[0]) * ax[0] + (q.p[1] - c[1]) * ax[1] <= 0) === near); };
  const sortAlong = (pts) => pts.sort((p, q) => (p.p[0] * nx[0] + p.p[1] * nx[1]) - (q.p[0] * nx[0] + q.p[1] * nx[1])).map((q) => q.p);
  const baseNear = sortAlong(arcOf(0, jarR(0), true));
  const lidTop = ringAt(LID.h1, LID.r, 48).map((q) => q.p), lidBandNear = sortAlong(arcOf(LID.h0, LID.r, true)), lidTopNear = sortAlong(arcOf(LID.h1, LID.r, true)), lidTopFar = sortAlong(arcOf(LID.h1, LID.r, false));
  const lidSide = [side(LID.h0, LID.r), side(LID.h1, LID.r)];
  // the whole silhouette, glass and lid: up one side, over the far edge of the lid, down the other,
  // round the near edge of the foot
  const Ls = sides.map((s) => s[0].p), Rs = sides.map((s) => s[1].p);
  const outline = [...baseNear, ...Rs, lidSide[0][1].p, lidSide[1][1].p, ...lidTopFar.slice().reverse(), lidSide[1][0].p, lidSide[0][0].p, ...Ls.slice().reverse()];
  // pixels to the metre ACROSS the jar at its middle (up it, the lens foreshortens)
  const mi = Math.floor(sides.length / 2), pxm = Math.hypot(sides[mi][1].p[0] - sides[mi][0].p[0], sides[mi][1].p[1] - sides[mi][0].p[1]) / (2 * jarR(hs[mi]));
  // the camera's side of the jar: where the label goes
  const cz = v.cam[2] - JAR.z, cx = v.cam[0] - JAR.x, thC = Math.atan2(cz, cx);
  const dir = Math.sign((v.proj(jarPt(thC + .1, .05, .043))[0] - v.proj(jarPt(thC - .1, .05, .043))[0]) * nx[0] + (v.proj(jarPt(thC + .1, .05, .043))[1] - v.proj(jarPt(thC - .1, .05, .043))[1]) * nx[1]) || 1;
  return { a, b, ax, nx, hs, sides, Ls, Rs, baseNear, lidTop, lidBandNear, lidTopNear, lidSide, outline, pxm, thC, dir };
}
function jarShadow(v, f, J) {
  // the jar's shadow on the lid, away from the pendant at (0, 1.9, −0.9): a patch of hatching
  const c = v.c, S = v.S, lamp = [0, 1.9, -.9], top = [JAR.x, JAR.y + LID.h1, JAR.z];
  const t = (lamp[1] - JAR.y) / (lamp[1] - top[1]), sx = lamp[0] + (top[0] - lamp[0]) * t, sz = lamp[2] + (top[2] - lamp[2]) * t;
  const off = [(Math.max(sx, LIDTOP.x0 + .02) - JAR.x) * .45, (sz - JAR.z) * .45]; // …and it stays on the lid
  const pts = [];
  for (let k = 0; k < 36; k++) { const th = (k / 36) * 6.283, u = Math.max(0, Math.cos(th - Math.atan2(off[1], off[0]))); pts.push(v.proj([JAR.x + Math.cos(th) * .044 + off[0] * u * .9, JAR.y + .0005, JAR.z + Math.sin(th) * .044 + off[1] * u * .9])); }
  c.save(); c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.clip();
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  c.strokeStyle = INK; c.lineCap = 'round'; c.globalAlpha = .75; c.lineWidth = .8 * S;
  const gap = 3.4 * S, par = (f >> 2) % 2;
  c.beginPath();
  for (let q = -(y1 - y0); q < x1 - x0 + (y1 - y0); q += gap) { const j = (hash(q | 0, par, 7) - .5) * S; c.moveTo(x0 + q + j, y0); c.lineTo(x0 + q - (y1 - y0) * .6 + j, y1); }
  c.stroke(); c.restore();
}
const boilPt = (p, id, k, f, amt) => [p[0] + (hash(id, k, f >> 1) - .5) * amt, p[1] + (hash(id + 7, k, f >> 1) - .5) * amt];
function drawJar(v, f) {
  const J = v.jar || (v.jar = jarGeom(v)), c = v.c, S = v.S, w0 = 1.05 * P.line.weight * S / 2.3 * 1.6;
  const line = (pts, w, a = 1, id = 1) => { if (pts.length < 2) return; c.globalAlpha = a; c.fillStyle = INK; penStroke(c, pts.map((p, k) => boilPt(p, id, k, f, .7 * S)), w); c.globalAlpha = 1; };
  jarShadow(v, f, J);
  // 1. THE GLASS IS BARE PAPER inside its contour, the room's rule for a bottle
  c.save(); c.beginPath(); J.outline.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fillStyle = PAPER; c.fill(); c.restore();
  // the far wall through the glass: the back of the foot's thick base, fine
  const baseFar = []; for (let k = 0; k <= 24; k++) { const th = J.thC + Math.PI * (.5 + k / 24); baseFar.push(v.proj(jarPt(th, .006, jarR(.006) - GLASS))); }
  line(baseFar, .45 * S, .55, 11);
  // 2. THE FLIES, inside the glass
  flies(v, f, J);
  // 3. the glass over them: a paper glint down one side, two glass strokes, and the wall's thickness
  const gl = [.018, .078].map((h) => v.proj(jarPt(J.thC - .95 * J.dir, h, jarR(h) + .0003)));
  c.save(); c.strokeStyle = PAPER; c.lineCap = 'round'; c.lineWidth = Math.max(2 * S, .0035 * J.pxm); c.globalAlpha = .92; c.beginPath(); c.moveTo(gl[0][0], gl[0][1]); c.lineTo(gl[1][0], gl[1][1]); c.stroke(); c.restore();
  const gs = (h0, h1, th) => [h0, (h0 + h1) / 2, h1].map((h, k) => v.proj(jarPt(th + k * .05 * J.dir, h, jarR(h) + .0003)));
  line(gs(.03, .07, J.thC + .55 * J.dir), .7 * S, .85, 21);
  line(gs(.045, .066, J.thC + .72 * J.dir), .6 * S, .7, 22);
  const inset = (E, s) => E.slice(1, -3).map((p, k) => { const q = J.sides[k + 1][s === 0 ? 0 : 1]; return v.proj(jarPt(q.th, J.hs[k + 1], jarR(J.hs[k + 1]) - GLASS)); });
  line(inset(J.Ls, 0).slice(2, -2), .45 * S, .6, 31);
  line(inset(J.Rs, 1).slice(2, -2), .45 * S, .6, 32);
  // 4. THE LABEL, in the sign hand: MOUCHES
  label(v, f, J);
  // 5. THE CONTOUR: two sides, the near edge of the foot, the shoulder and the thread
  line(J.Ls, w0, 1, 41); line(J.Rs, w0, 1, 42); line(J.baseNear, w0, 1, 43);
  const thread = []; for (const h of [.1035, .106]) { const q = []; for (let k = 0; k <= 24; k++) { const th = J.thC + (k / 24 - .5) * 3.1; q.push(v.proj(jarPt(th, h, jarR(h) + .0002))); } thread.push(q); }
  line(thread[0], .5 * S, .7, 44);
  // 6. THE LID, punched tin: an ink band round it, the top in paper with its holes punched through
  c.save();
  const band = [...J.lidBandNear, J.lidSide[0][1].p, J.lidSide[1][1].p, ...J.lidTopNear.slice().reverse(), J.lidSide[1][0].p, J.lidSide[0][0].p];
  c.beginPath(); band.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fillStyle = INK; c.fill();
  c.beginPath(); J.lidTop.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fillStyle = PAPER; c.fill();
  c.restore();
  line([...J.lidTop, J.lidTop[0]], w0 * .9, 1, 45);
  // a glint along the band, left in paper
  const bg = []; for (let k = 0; k <= 8; k++) { const th = J.thC - .9 * J.dir + (k / 8) * .5 * J.dir; bg.push(v.proj(jarPt(th, (LID.h0 + LID.h1) / 2, LID.r + .0004))); }
  c.save(); c.strokeStyle = PAPER; c.lineCap = 'round'; c.lineWidth = Math.max(1.2 * S, .0022 * J.pxm); c.beginPath(); bg.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke(); c.restore();
  // the holes: one in the middle and two rings round it, each a hole punched with a nail
  c.save(); c.fillStyle = INK;
  const holes = [[0, 0]]; for (let k = 0; k < 6; k++) holes.push([Math.cos(k * 1.047 + .3) * .013, Math.sin(k * 1.047 + .3) * .013]); for (let k = 0; k < 10; k++) holes.push([Math.cos(k * .628) * .026, Math.sin(k * .628) * .026]);
  for (const [hx, hz] of holes) { const p = v.proj([JAR.x + hx, JAR.y + LID.h1 + .0003, JAR.z + hz]), q = v.proj([JAR.x + hx + .0017, JAR.y + LID.h1 + .0003, JAR.z + hz]); c.beginPath(); c.arc(p[0], p[1], Math.max(.9 * S, Math.hypot(q[0] - p[0], q[1] - p[1])), 0, 7); c.fill(); }
  c.restore();
}
function label(v, f, J) {
  const c = v.c, S = v.S, R = jarR(.05) + .0006, span = .95, h0 = .039, h1 = .055; // a narrow band: the flies show above and below it
  const at = (u, h) => v.proj(jarPt(J.thC + (u - .5) * span * 2 * J.dir, h, R)); // u 0..1 across, h up
  const edge = [];
  for (let k = 0; k <= 12; k++) edge.push(at(k / 12, h0 + (hash(k, 3, 5) - .5) * .0008));
  for (let k = 0; k <= 4; k++) edge.push(at(1, h0 + (h1 - h0) * k / 4));
  for (let k = 12; k >= 0; k--) edge.push(at(k / 12, h1 + (hash(k, 4, 5) - .5) * .0008));
  for (let k = 4; k >= 0; k--) edge.push(at(0, h0 + (h1 - h0) * k / 4));
  c.save(); c.beginPath(); edge.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fillStyle = PAPER; c.fill();
  c.strokeStyle = INK; c.lineWidth = .7 * S; c.lineJoin = 'round'; c.stroke();
  // the word, in the sign hand, laid round the glass
  const word = 'MOUCHES', trk = 13; let W = 0; for (const ch of word) W += SIGN[ch][0] + trk; W -= trk;
  const capH = .0104, uw = (W / 100) * capH / (R * span * 2), u0 = .5 - uw / 2, rng = mulberry32(417 + (f >> 1));
  const toS = (gx, gy) => at(u0 + (gx / W) * uw, h0 + (h1 - h0) / 2 + capH / 2 - (gy / 100) * capH);
  c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = INK; c.lineWidth = Math.max(.9 * S, capH * .13 * J.pxm);
  let x = 0;
  for (const ch of word) {
    const [adv, strokes] = SIGN[ch];
    for (const st of strokes) {
      let pts = st.ring ? Array.from({ length: 21 }, (_, i) => [st.ring[0] + st.ring[2] * Math.cos((i / 20) * 6.283), st.ring[1] + st.ring[3] * Math.sin((i / 20) * 6.283)]) : st;
      pts = pts.map(([gx, gy]) => { const q = toS(x + gx + (rng() - .5) * 4, gy + (rng() - .5) * 4); return q; });
      c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
    }
    x += adv + trk;
  }
  c.restore();
}
function flies(v, f, J) {
  const row = v.rows.get(f); if (!row) return;
  const c = v.c, S = v.S, mm = J.pxm / 1000;
  const list = row.map((F) => ({ F, q: v.proj([JAR.x + F.p[0], JAR.y + F.p[1], JAR.z + F.p[2]]) })).sort((a, b) => b.q[2] - a.q[2]);
  c.save(); c.lineCap = 'round';
  for (const [i, { F, q }] of list.entries()) {
    // which way it is heading on the glass
    const ahead = v.proj([JAR.x + F.p[0] + F.v[0] * 2, JAR.y + F.p[1] + F.v[1] * 2, JAR.z + F.p[2] + F.v[2] * 2]);
    let hx = ahead[0] - q[0], hy = ahead[1] - q[1]; const hl = Math.hypot(hx, hy);
    if (hl < .5) { const a = hash(i, 3, 111) * 6.283; hx = Math.cos(a); hy = Math.sin(a); } else { hx /= hl; hy /= hl; }
    const px = -hy, py = hx, flying = F.mode === 'fly' && F.sp > .0008, L2 = 6.5 * mm, W2 = 3.6 * mm;
    // the motion: two short strokes trailing it when it is going fast
    if (flying && F.sp > .006) {
      c.strokeStyle = INK; c.globalAlpha = .55; c.lineWidth = .6 * S;
      for (const o of [-2.2, 2.2]) { c.beginPath(); c.moveTo(q[0] - hx * L2 * 1.8 + px * o * mm, q[1] - hy * L2 * 1.8 + py * o * mm); c.lineTo(q[0] - hx * L2 * (1.8 + 3.5 * Math.min(1, F.sp / .014)) + px * o * mm, q[1] - hy * L2 * (1.8 + 3.5 * Math.min(1, F.sp / .014)) + py * o * mm); c.stroke(); }
      c.globalAlpha = 1;
    }
    // the wings: a blurred flick, a fan of fine strokes at a new angle each drawing, while it flies;
    // folded back along its body when it is still
    if (flying) {
      const beat = (f + i) % 2 ? .95 : .45;
      c.strokeStyle = INK; c.lineWidth = .5 * S;
      for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) {
        const a = sd * (beat + k * .22), wx = -hx * Math.cos(a) + px * Math.sin(a) * sd * sd, wy = -hy * Math.cos(a) + py * Math.sin(a);
        const ex = Math.cos(a) * -hx - Math.sin(a) * px, ey = Math.cos(a) * -hy - Math.sin(a) * py;
        c.globalAlpha = .45 - k * .12; c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(q[0] + ex * 8 * mm, q[1] + ey * 8 * mm); c.stroke(); void wx; void wy;
      }
      c.globalAlpha = 1;
    } else {
      c.fillStyle = PAPER; c.strokeStyle = INK; c.lineWidth = .5 * S;
      for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(q[0] - hx * 3.6 * mm + px * sd * 1.4 * mm, q[1] - hy * 3.6 * mm + py * sd * 1.4 * mm, 4 * mm, 1.8 * mm, Math.atan2(hy, hx) + sd * .25, 0, 7); c.fill(); c.stroke(); }
    }
    // the body: a speck of ink with a head on it
    c.fillStyle = INK;
    c.beginPath(); c.ellipse(q[0], q[1], Math.max(1.3 * S, L2 * .55), Math.max(.9 * S, W2 * .5), Math.atan2(hy, hx), 0, 7); c.fill();
    c.beginPath(); c.arc(q[0] + hx * L2 * .7, q[1] + hy * L2 * .7, Math.max(.8 * S, W2 * .38), 0, 7); c.fill();
    // a twitch: its legs, for the drawing it moves
    if (F.tw) { c.strokeStyle = INK; c.lineWidth = .5 * S; for (const sd of [-1, 1]) for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(q[0] + hx * k * mm, q[1] + hy * k * mm); c.lineTo(q[0] + hx * k * 1.6 * mm + px * sd * 2.4 * mm, q[1] + hy * k * 1.6 * mm + py * sd * 2.4 * mm); c.stroke(); } }
    // IT HITS THE GLASS: three short marks off the point it struck, this drawing and the next
    for (const back of [0, 1]) {
      const hit = v.rows.get(f - back)?.[row.indexOf(F)]?.hit; if (!hit) continue;
      const g = hit.top ? v.proj([JAR.x + F.p[0], JAR.y + FLY_H[1] + .006, JAR.z + F.p[2]]) : v.proj(jarPt(hit.th, hit.h, jarR(hit.h)));
      const r0 = (2 + 1.5 * back) * mm, r1 = r0 + (2.4 + 2 * hit.hard) * mm;
      c.strokeStyle = INK; c.lineWidth = (back ? .5 : .75) * S; c.globalAlpha = back ? .45 : .9;
      for (let k = -1; k <= 1; k++) { const a = Math.atan2(g[1] - q[1], g[0] - q[0]) + k * .7; c.beginPath(); c.moveTo(g[0] + Math.cos(a) * r0 * .4, g[1] + Math.sin(a) * r0 * .4); c.lineTo(g[0] + Math.cos(a) * r1 * .7, g[1] + Math.sin(a) * r1 * .7); c.stroke(); }
      c.globalAlpha = 1;
    }
  }
  c.restore();
}

// ---- the pen ----
function noise1(a, b, t) { const i = Math.floor(t), u = t - i, s = u * u * (3 - 2 * u); return lerp(hash(a, i, b), hash(a, i + 1, b), s) * 2 - 1; }
function penStroke(c, pts, w) {
  if (pts.length < 2) return;
  const sm = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < 4; k++) { const t = k / 4, t2 = t * t, t3 = t2 * t; sm.push([.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3), .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); }
  }
  sm.push(pts[pts.length - 1]);
  const n = sm.length, left = [], right = [];
  for (let i = 0; i < n; i++) {
    const a = sm[Math.max(0, i - 1)], b = sm[Math.min(n - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const u = n > 1 ? i / (n - 1) : .5, taper = Math.max(.28, Math.pow(Math.sin(Math.PI * u), .45)), hw = w * taper / 2;
    left.push([sm[i][0] - ty * hw, sm[i][1] + tx * hw]); right.push([sm[i][0] + ty * hw, sm[i][1] - tx * hw]);
  }
  c.beginPath(); c.moveTo(left[0][0], left[0][1]); for (let i = 1; i < n; i++) c.lineTo(left[i][0], left[i][1]);
  for (let i = n - 1; i >= 0; i--) c.lineTo(right[i][0], right[i][1]); c.closePath(); c.fill();
}


// ---- THE ROOM, DIMMED: one open pass of the room's own hatching, lit over the keys and the jar ----
// The crossing's first pass (walk-crossing.js, buildDark), and half of its strokes simply left out.
function buildDashes(v) {
  const sc = v.S * .9, a = -1.05, ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca, gap = 4.2 * sc, R = Math.hypot(v.W, v.H) / 2 + 40, list = [];
  for (let o = -R, row = 0; o < R; o += gap, row++) {
    let t = -R + hash(row, 0, 1) * 20;
    while (t < R) {
      const len = (16 + hash(row, t | 0, 3) * 18) * sc * .7, mx = v.W / 2 + nx * o + ca * (t + len / 2), my = v.H / 2 + ny * o + sa * (t + len / 2);
      if (mx > -20 && mx < v.W + 20 && my > -20 && my < v.H + 20 && hash(mx | 0, my | 0, 17) < .5) list.push({ mx, my, hx: ca * len / 2, hy: sa * len / 2, n: (hash(row, t | 0, 7) - .5) * .2, j: [(hash(row, t | 0, 11) - .5) * sc, (hash(row, t | 0, 12) - .5) * sc, (hash(row, t | 0, 13) - .5) * sc, (hash(row, t | 0, 14) - .5) * sc] });
      t += len + (2 + hash(row, t | 0, 5) * 5) * sc;
    }
  }
  v.dashes = list;
}
function drawDim(v, g, lv, par) {
  const S = v.S;
  const a = v.proj([-2.07, .67, PIANO.kz0]), b = v.proj([-2.07, .67, PIANO.kz1]), Lc = v.proj([-2.07, .67, (PIANO.kz0 + PIANO.kz1) / 2]);
  // the pool runs the length of the keyboard and not much above or below it
  const rx = Math.max(Math.abs(a[0] - b[0]) * .62, v.W * .18) * P.room.pool, ry = Math.max(Math.abs(a[1] - b[1]) * .62, v.H * .13) * P.room.pool;
  // …and a second, round the jar of flies on the lid: the second thing to look at
  const J0 = v.proj([JAR.x, JAR.y + .06, JAR.z]), J1 = v.proj([JAR.x, JAR.y + .12, JAR.z]), Jr = Math.max(40 * S, Math.hypot(J1[0] - J0[0], J1[1] - J0[1]) * 2.6);
  const ink = new Path2D();
  for (const d of v.dashes) {
    const e = Math.min(clamp(Math.hypot((d.mx - Lc[0]) / rx, (d.my - Lc[1]) / ry)), clamp(Math.hypot(d.mx - J0[0], (d.my - J0[1]) * 1.1) / Jr));
    if (lv * (.08 + 1.15 * Math.pow(e, 1.5)) <= .2 + d.n) continue;
    const jx = d.j[par * 2], jy = d.j[par * 2 + 1];
    ink.moveTo(d.mx - d.hx + jx, d.my - d.hy + jy); ink.lineTo(d.mx + d.hx + jx, d.my + d.hy + jy);
  }
  g.save(); g.lineCap = 'butt'; g.strokeStyle = INK; g.lineWidth = .75 * S * .9; g.globalAlpha = .5; g.stroke(ink); g.restore();
}

// ---- the piece --------------------------------------------------------------------------------
// `piano` is props-piano.js's PIANO (the joinery), with `keyZ` and `isBlack` from the same file.
// `jarMesh` is the room's own ink jar, which this sheet stands in for at the piano shot.
export function buildPianoPrints(ctx, { piano, keyZ: kz, isBlack: ib, whites, jarMesh = null }) {
  PIANO = piano;
  keyZ = kz;
  isBlack = ib;
  UNIT = (PIANO.kz1 - PIANO.kz0) / whites;
  const THREE = ctx.THREE, cam = ctx.camera, glass = ctx.renderer?.domElement;
  // the sheet, laid over the glass the way the crossing's is
  const cv = document.createElement('canvas');
  cv.className = 'piano-sheet';
  Object.assign(cv.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', pointerEvents: 'none' });
  glass?.parentElement?.appendChild(cv);
  const c = cv.getContext('2d');
  const M = new THREE.Matrix4();
  const v = { c, W: 0, H: 0, S: 1, cam: [0, 0, 0], jar: null, scratch: null, dashes: [], rows: new Map() };
  v.proj = ([x, y, z]) => {
    const e = M.elements, w = e[3] * x + e[7] * y + e[11] * z + e[15];
    return [((e[0] * x + e[4] * y + e[8] * z + e[12]) / w + 1) / 2 * v.W, (1 - (e[1] * x + e[5] * y + e[9] * z + e[13]) / w) / 2 * v.H, w];
  };
  const dim = new Map(); // (camera, parity, level) → a sheet of the dim, drawn once
  let camKey = '';
  function fit() {
    const pr = Math.min(window.devicePixelRatio || 1, 1.5);
    v.W = cv.width = Math.round((ctx.size?.w || window.innerWidth) * pr);
    v.H = cv.height = Math.round((ctx.size?.h || window.innerHeight) * pr);
    v.S = pr;
    buildDashes(v);
    dim.clear();
    v.jar = null;
    camKey = '';
  }
  fit();
  ctx.on?.('resize', fit);
  function refreshCamera() {
    cam.updateMatrixWorld();
    M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    v.cam = cam.position.toArray();
    const k = M.elements.map((x) => x.toFixed(5)).join(',');
    if (k !== camKey) { camKey = k; dim.clear(); v.jar = null; }
  }

  // ---- state ----
  const prints = [];
  let n = 0, eFrame = -1, eNow = 0, sm = 0, songOn = false, level = 0, twitchAt = null, stepped = -1, drawn = false;
  let flies = makeFlies();
  const here = () => ctx.pieces?.walk?.at === 'piano';
  const C = () => ctx.pieces?.camera ?? null;
  // AT THE PIANO SHOT: the visitor is standing there and the camera has come to rest on it
  const atShot = () => here() && C()?.current === 'piano' && !C()?.moving;

  function paint(f) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, v.W, v.H);
    refreshCamera();
    // the dim, from its cache: one drawImage
    const lv = Math.round(level * 4) / 4 * P.room.dark;
    if (lv > 0) {
      const par = Math.floor(f / 4) % 2, key = `${par}|${lv}`;
      let sheet = dim.get(key);
      if (!sheet) {
        sheet = document.createElement('canvas');
        sheet.width = v.W;
        sheet.height = v.H;
        drawDim(v, sheet.getContext('2d'), lv, par);
        dim.set(key, sheet);
      }
      c.drawImage(sheet, 0, 0);
    }
    if (atShot()) drawJar(v, f);
    drawPrints(v, f, prints);
    keyMotes(v, f, prints);
  }

  const api = {
    P,
    JAR,
    /** a key goes down on this drawing, under a finger of the left or right hand */
    strike(m, hand) {
      const f = ctx.clock.frame;
      for (const s of prints) if (s.m === m && !s.gone) s.gone = true;
      prints.push({ i: n++, m, key: keyShape(m), f0: f, f1: null, h: hand === 'R' ? 1 : 0 });
      if (eFrame !== f) { eFrame = f; eNow = 0; }
      eNow += hand === 'R' ? .8 : .5;
    },
    /** …and comes up: its print starts to dry */
    release(m) {
      const f = ctx.clock.frame;
      for (const s of prints) if (s.m === m && s.f1 == null && !s.gone) s.f1 = f;
    },
    releaseAll() {
      for (const s of prints) if (s.f1 == null) s.f1 = ctx.clock.frame;
    },
    /** the song has started or stopped */
    playing(on) {
      if (on === songOn) return;
      songOn = on;
      if (!on) twitchAt = ctx.clock.frame + 14;
    },
    /** ONE DRAWING: the dim's level, the flies, the buzz. Called on every stepped frame. */
    update() {
      const f = ctx.clock.frame;
      if (!ctx.clock.stepped || f === stepped) return;
      stepped = f;
      const shot = atShot();
      // the room goes down in four drawings when the song starts at the piano, and comes back in five
      level = songOn && here() ? Math.min(1, level + .25) : Math.max(0, level - .2);
      if (jarMesh) jarMesh.visible = !shot;
      const e = eFrame === f ? eNow : 0;
      sm = sm * .86 + e;
      // away from the piano shot the flies are simply at rest on the floor of the jar
      if (flies.length !== P.flies.count || (!shot && !songOn && flies.some((F) => F.mode !== 'rest'))) flies = makeFlies();
      if (shot || songOn) {
        const tw = twitchAt != null && (f === twitchAt || f === twitchAt + 1) ? { i: 2, d: f === twitchAt ? 1 : -1 } : null;
        const row = stepFlies(flies, f, songOn && here(), e, sm, tw);
        v.rows.set(f, row);
        v.rows.delete(f - 3);
        // THE BUZZ: a very quiet one, only while they are up, re-fired every sixth of a second
        // (sound-metal.js, LENGTH.buzz: consecutive buzzes join up) and well under the piano
        if (shot && songOn && f % 2 === 0) {
          const act = row.reduce((s, F) => s + (F.mode === 'fly' ? Math.min(1, F.sp / .012) : 0), 0) / Math.max(1, row.length);
          if (act > .12) {
            refreshCamera();
            const q = v.proj([JAR.x, JAR.y + .06, JAR.z]);
            ctx.pieces?.sound?.play?.('buzz', { gain: .1 + .25 * act, pan: q[2] > 0 ? clamp((q[0] / v.W) * 2 - 1, -1, 1) * .7 : 0 });
          }
        }
      }
      // a print that has dried is gone
      for (let i = prints.length - 1; i >= 0; i--) if (prints[i].gone || (prints[i].f1 != null && wetness(prints[i], f) <= 0)) prints.splice(i, 1);
    },
    afterRender() {
      const active = atShot() || level > 0 || prints.length > 0;
      if (!active) {
        if (drawn) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, v.W, v.H); drawn = false; }
        return;
      }
      if (ctx.clock.stepped || !drawn) { paint(ctx.clock.frame); drawn = true; }
    },
    // for the tools
    get state() {
      return { prints: prints.length, wet: prints.filter((s) => s.f1 == null).length, level, songOn, atShot: atShot(), flies: flies.map((F) => F.mode).join(''), sheet: `${v.W}x${v.H}` };
    },
    jarOnGlass: () => { refreshCamera(); return v.jar ?? jarGeom(v); },
  };
  return api;
}
