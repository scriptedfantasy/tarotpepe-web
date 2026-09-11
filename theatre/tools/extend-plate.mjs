#!/usr/bin/env node
// extend-plate — THE COUNTRY EITHER SIDE OF SOMEBODY ELSE'S PICTURE.
//
// The user, looking at the crossroads standing whole on bare paper: "can you make this actually full
// width so it fills the whole screen and is not just a square?"
//
// There are two ways to make a square picture fill a 16:9 window and only one of them is allowed
// here. CROP it — and a crop of this meme takes both castles out of the corners, the sun off the top
// and the boy off at the knee, which is the whole of what round 3 was for. Or EXTEND it: leave the
// original untouched in the middle of a wider sheet and CARRY THE DRAWING ON to the edges, so that
// the frame is full of one landscape and the original is simply the part of it somebody else drew.
//
// This file is the second half. tools/trace-plate.mjs puts the user's own copy of the meme through
// the room's pen — the outlines re-cut about their own centre lines, the dark side hatched, the sun
// keyed in the fire's yellow — and hands the result here with six measurements off its own edges.
// What comes back is one wide sheet with the traced square at its heart.
//
// WHAT MAKES A SEAM SHOW, AND WHAT THIS DOES ABOUT EACH OF THEM:
//
//   THE COMB HAS TO BE IN PHASE. The storm quadrant is hatched, and the hatch runs right off the
//     picture's right-hand edge. A second comb started at the seam, however carefully matched for
//     angle and spacing, lands between the picture's own strokes and reads as a ruled join. So the
//     continuation's hatch is `stripes()` — trace-plate.mjs's own function, the same noise, the same
//     angle, the same spacing — EVALUATED IN THE PICTURE'S OWN PIXEL COORDINATES. Stroke 118 of the
//     original's comb is stroke 119 of ours; there is no phase to match because it is the same comb.
//
//   THE NIB HAS TO BE THE SAME NIB. Every line here is laid at the picture's own re-cut weight, with
//     the same breathing half-width (a slow noise on the width, a slower one on the centre) that
//     keeps a drawn line from reading as an offset path.
//
//   THE LINES HAVE TO ARRIVE SOMEWHERE. A continuation that starts new lines at the seam is a
//     border. Every line in here leaves from a place the tool MEASURED on the original's own edge —
//     the crest of the bright hill at v 0.230, the foot of its cliff at 0.337, the road under it,
//     the crag's ridge at 0.35 on the right, the ground at 0.445, the two road banks where they
//     cross the foot of the picture — and goes on outward from it.
//
//   AND THE COUNTRY HAS TO RECEDE. The one thing that would give the game away even with all of
//     that right is a hill carried sideways at a constant height: a landscape does not do that. Every
//     band converges on the ground line as it goes out — `c(u) = exp(-|u| / RECEDE)` — so the bright
//     hill flattens into the distance on the left and the crag sinks into it on the right, and the
//     far country closes up the way far country does.
//
//   THE START IS FEATHERED UNDER THE ORIGINAL'S OWN STROKES. The continuation is drawn across the
//     whole sheet and then faded out over the first few dozen pixels INSIDE the picture, so it dies
//     underneath marks the artist made rather than stopping against them. Nothing of it survives
//     more than a fortieth of the way in.
//
// It is a module and a script. trace-plate.mjs imports `extendPlate`; run alone it says so and does
// nothing, because the thing it extends is that tool's output and not a file on disk.
const TAU = Math.PI * 2;

// ---- the hand, borrowed from trace-plate.mjs, verbatim and for its reason -----------------------
// The same noise field, sampled at the same scale in the same coordinates: a line drawn here wobbles
// off its centre by the same amounts a line drawn there does.
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ss = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const hash2 = (x, y) => {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  const ab = a + (b - a) * u, cd = c + (d - c) * u;
  return ab + (cd - ab) * v;
}
const rngOf = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export function extendPlate({
  W, H, cov: picCov, sun: picSun, tone: picTone, darker = 46,
  wing = 0.76, cap = 0.63,
  pen = 3.86, hatch = 17.6, hatchA = (34 * Math.PI) / 180, crossK = 1.7,
  land,
  feather = 0.025,
  seed = 20260911,
  log = () => {},
}) {
  // ---- the sheet ---------------------------------------------------------------------------------
  const px0 = Math.round(W * wing), py0 = Math.round(H * cap);
  const PW = W + px0 * 2, PH = H + py0 * 2;
  const N = PW * PH;
  const cov = new Float32Array(N);
  const line = new Float32Array(N); // the continuation's own line work, kept apart for the halo
  const idx = (x, y) => y * PW + x;
  // picture coordinates: u across the original, v down it. 0..1 is the original; outside it is ours.
  const U = (x) => (x - px0) / W;
  const V = (y) => (y - py0) / H;
  const PX = (u) => px0 + u * W;
  const PY = (v) => py0 + v * H;

  // ---- the country's own shape -------------------------------------------------------------------
  // Six numbers measured off the original's edges (trace-plate.mjs, `measureEdges`), and one rule
  // that turns them into a landscape: everything converges on the ground line as it goes out.
  const L = land;
  const RECEDE = 0.62; // picture widths: how fast the far country closes up
  // …AND IT NEVER CLOSES UP ALL THE WAY. A pure exponential takes the hill and the crag down onto
  // the ground line within a picture-width, and what is left at the edge of the sheet is a horizon
  // ruled across it — a straight black line a metre long, which is the one mark that gives a
  // continuation away. Two fifths of the far country's depth is kept however far out it goes, so
  // there is still a hill on the left and a crag on the right at the edges of a 21:9 frame.
  const FLOOR = 0.42;
  const cOf = (u) => {
    const d = u < 0 ? -u : u > 1 ? u - 1 : 0;
    return d === 0 ? 1 : FLOOR + (1 - FLOOR) * Math.exp(-d / RECEDE);
  };
  // TWO WOBBLES AND NOT ONE. A curve thrown by a single slow noise is a smooth curve that happens not
  // to be straight, and beside a traced line — which wanders at every scale because a person drew it
  // and a threshold cut it — it reads as machinery. The second term is six times the frequency at a
  // third of the amplitude, which is what puts the tremor back.
  const wob = (u, s, amp) => ((vnoise(u * 7.3 + s, s * 3.1) - 0.5) + (vnoise(u * 44 + s * 5, s * 2.7) - 0.5) * 0.34) * amp;
  // THE GROUND LINE, which is the far edge of the near field and the one thing that does not
  // converge: it is the horizon. It drifts down a whisker going out, the way a level horizon does
  // when the ground it stands on is not.
  // …and it is measured on BOTH edges, because a picture is under no obligation to put its horizon
  // at the same height on the left as on the right. This one is fourteen thousandths out, which is
  // twenty pixels of sheet: enough to read as a step if one number were made to serve for two.
  const gBase = (u) => L.left.ground + (L.right.ground - L.left.ground) * clamp01(u);
  const ground = (u) => (u >= 0 && u <= 1 ? gBase(u) : gBase(u) + 0.020 * (1 - cOf(u)) + wob(u, 1.7, 0.019));
  const band = (u, at) => ground(u) + (at - gBase(u)) * cOf(u);
  // …and the bright hill ROLLS. A crest thrown by one small wobble is an embankment; what makes it a
  // hill is a long wave under the tremor, at a wavelength of most of a picture-width.
  const roll = (u, s, amp) => Math.sin(u * 2.3 + s) * amp * cOf(u);
  const crest = (u) => (u < 0 ? band(u, L.left.crest) + wob(u, 3.3, 0.03) + roll(u, 0.7, 0.034) : L.left.crest);
  const cliff = (u) => (u < 0 ? band(u, L.left.cliff) + wob(u, 5.1, 0.02) + roll(u, 0.9, 0.02) : L.left.cliff);
  const bright1 = (u) => (u < 0 ? band(u, L.left.bright1) + wob(u, 6.7, 0.012) + roll(u, 1.1, 0.01) : L.left.bright1);
  // the crag, on the storm side. JAGGED where the hill is round, which is the original's own
  // difference between the two halves: a sharper, higher-frequency wander on the same curve.
  const ridge = (u) =>
    u > 1 ? band(u, L.right.ridge) + wob(u, 9.2, 0.036) + (vnoise(u * 23, 3) - 0.5) * 0.05 * cOf(u) + (vnoise(u * 71, 8) - 0.5) * 0.018 : L.right.ridge;
  const ledge = (u) => (u > 1 ? band(u, L.right.ledge) + wob(u, 11.4, 0.01) : L.right.ledge);

  // ---- the pen -----------------------------------------------------------------------------------
  // trace-plate.mjs's own half-width: a slow noise on the width and a slower one on the centre, so a
  // line breathes instead of reading as an offset path.
  const half = pen / 2;
  const hwAt = (x, y) => half * (0.84 + 0.32 * vnoise(x / 13 + 7, y / 13 + 7));
  function stamp(buf, x, y, hw, a) {
    const r = Math.ceil(hw + 1.4);
    const xi = Math.round(x), yi = Math.round(y);
    for (let dy = -r; dy <= r; dy++) {
      const py = yi + dy;
      if (py < 0 || py >= PH) continue;
      for (let dx = -r; dx <= r; dx++) {
        const px = xi + dx;
        if (px < 0 || px >= PW) continue;
        const d = Math.hypot(x - px, y - py);
        const c = ss(hw + 0.7, hw - 0.7, d) * a;
        const i = idx(px, py);
        if (c > buf[i]) buf[i] = c;
      }
    }
  }
  // A STROKE, IN THE ROOM'S HAND: walked at half a pixel, the nib breathing, the ink falling off at
  // both ends the way a nib lifts, and broken along its length on a slow noise (strokes.js does the
  // same thing to every hatch in the room).
  //
  // AND IT IS BROKEN MUCH MORE THAN A DRAWN LINE WOULD BE, because what it has to sit beside is not a
  // drawn line but a TRACED one. Every contour in the middle of this sheet came off a threshold, and
  // a threshold leaves dashes: the original's own outlines run five to twenty pixels between gaps.
  // A continuous line laid next to them is the one mark on the sheet that no pen made — the first cut
  // of this file drew one along the horizon and it read as a ruler. So `broken` runs at a third to a
  // half here, where a drawing in the parlour would be at a tenth.
  //
  // IT IS ALSO FULL BLACK. Grey is what a nib does at the end of a stroke and nowhere else; the first
  // cut carried half its line work at alpha 0.6–0.8 to keep it modest, and modest is exactly what a
  // pen is not. (BRIEF: a mark is ink or it is paper.)
  function stroke(pts, { weight = 1, alpha = 1, broken = 0, taper = pen * 1.6, salt = 0 } = {}) {
    if (pts.length < 2) return;
    let len = 0;
    const seg = [0];
    for (let i = 1; i < pts.length; i++) {
      len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      seg.push(len);
    }
    if (len < 0.6) return;
    const step = 0.5;
    let k = 1;
    for (let s = 0; s <= len; s += step) {
      while (k < seg.length - 1 && seg[k] < s) k++;
      const t = (s - seg[k - 1]) / Math.max(1e-6, seg[k] - seg[k - 1]);
      const x = pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * t;
      const y = pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * t;
      // …and the lift is a FIXED FEW PIXELS at each end and not a fraction of the stroke, which is
      // the difference between a nib coming off the paper and an airbrush. At a tenth of the length
      // a stroke a thousand pixels long faded over its last hundred, and forty-odd of those laid
      // across the storm read as smoke.
      const a = alpha * (0.85 + 0.15 * ss(0, taper, Math.min(s, len - s)));
      if (broken > 0) {
        const g = vnoise(s / 26 + salt * 5, salt * 3);
        if (g < broken) continue;
      }
      stamp(line, x, y, hwAt(x, y) * weight, a);
    }
  }
  // a curve through (u,v) samples, in picture coordinates
  const curve = (fn, u0, u1, n, opts) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = u0 + ((u1 - u0) * i) / n;
      pts.push([PX(u), PY(fn(u))]);
    }
    stroke(pts, opts);
  };

  // ---- 1. THE TONE, WHICH IS THE SAME COMB ---------------------------------------------------------
  // trace-plate.mjs's `stripes`, verbatim, called with the PICTURE'S own pixel coordinates, so the
  // storm's hatch does not restart at the seam — it goes on.
  function stripes(x, y, angle, spacing, phase) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const across = (x * s - y * c) / spacing + (vnoise(x / 41 + phase, y / 41 + phase) - 0.5) * 0.5;
    const f = Math.abs(across - Math.round(across)) * spacing;
    const along = vnoise((x * c + y * s) / 30 + phase * 3, (x * s - y * c) / 3.2 + phase * 3);
    if (along < 0.26) return 0;
    const hw = pen * 0.34 * (0.8 + 0.4 * vnoise(x / 9 + phase, y / 9 + phase));
    return ss(hw + 0.6, hw - 0.6, f);
  }

  // ---- 2. THE LINE WORK ----------------------------------------------------------------------------
  const rng = rngOf(seed);
  const wingU = wing, capV = cap;
  const CONTOUR = { broken: 0.36, salt: 0 };
  // the far country, left: the crest of the bright hill, the foot of its cliff, and the road under it
  curve(crest, -wingU - 0.02, 0.006, 320, { ...CONTOUR, salt: 2 });
  curve(cliff, -wingU - 0.02, 0.006, 320, { ...CONTOUR, salt: 3 });
  curve(bright1, -wingU - 0.02, 0.006, 300, { broken: 0.42, salt: 4 });
  // …and the fissures in its face, which is what the original puts in a cliff: short strokes down
  // the fall of the hill, thinning as the hill recedes
  for (let i = 0; i < 30; i++) {
    const u = -wingU + rng() * wingU * 0.99;
    const a = crest(u), b = cliff(u);
    if (b - a < 0.005) continue;
    const t0 = 0.08 + rng() * 0.22, t1 = 0.55 + rng() * 0.42;
    const lean = (rng() - 0.5) * 0.02;
    stroke([[PX(u), PY(a + (b - a) * t0)], [PX(u + lean), PY(a + (b - a) * t1)]], { broken: 0.3, salt: 10 + i });
  }
  // the ground line, either side: the far edge of the near field
  curve(ground, -wingU - 0.02, 0.004, 380, { ...CONTOUR, salt: 6 });
  curve(ground, 0.996, 1 + wingU + 0.02, 380, { ...CONTOUR, salt: 7 });
  // the storm, right: the crag's ridge and the lit ledge under it
  curve(ridge, 0.994, 1 + wingU + 0.02, 460, { broken: 0.3, salt: 8 });
  curve(ledge, 0.994, 1 + wingU + 0.02, 340, { broken: 0.44, salt: 9 });
  // the crag's own fissures: long strokes down its face. There are a lot of them and that is the
  // point — under the ridge the original draws rock as LINE and not as tone, so this band is fissured
  // rather than crossed (the first cut laid a second comb across it and the crag came out as a wire
  // fence hanging in the storm).
  for (let i = 0; i < 54; i++) {
    const u = 1 + rng() * wingU * 0.99;
    const a = ledge(u), b = ground(u);
    if (b - a < 0.005) continue;
    const t1 = 0.5 + rng() * 0.5;
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const t = 0.1 + ((t1 - 0.1) * k) / 6;
      pts.push([PX(u + (vnoise(t * 9 + i * 3, i) - 0.5) * 0.03), PY(a + (b - a) * t)]);
    }
    stroke(pts, { broken: 0.28, salt: 30 + i });
  }
  // THE WEATHER'S OWN EDGE, CARRIED UP. The original is two skies with a hard join between them at
  // u 0.477 — clear on the left, storm on the right — and above the picture that join is the only
  // thing there is to continue. It goes straight up, because it is straight in the original.
  stroke([[PX(L.seam), PY(-capV - 0.02)], [PX(L.seam), PY(0.004)]], { broken: 0.08, salt: 12 });
  // THE CLOUD, which is not decoration: it is what keeps the storm from being a field of comb. The
  // original's sky is broken up every few centimetres by a contour with a halo of bare paper round
  // it, and a continuation with fourteen strokes in it came out flatter and darker than the picture
  // beside it however well the hatch matched. Forty of them, and the halo rule does the rest.
  for (let i = 0; i < 40; i++) {
    const v = -capV + rng() * (capV + 0.3);
    const u0 = (v < -0.01 ? L.seam - 0.1 + rng() * (1.1 - L.seam) : 1 + rng() * 0.3) - (rng() < 0.4 ? 0.35 : 0);
    const w = 0.25 + rng() * 0.75;
    const amp = 0.012 + rng() * 0.02;
    const pts = [];
    for (let k = 0; k <= 26; k++) {
      const u = u0 + (w * k) / 26;
      if (u > 1 + wingU + 0.02) break;
      if (u < L.seam - 0.02) continue; // the clear sky has no cloud in it
      if (v > -0.004 && u < 1.004) continue; // never over the picture
      pts.push([PX(u), PY(v + amp * Math.sin(k * 0.55 + i) + wob(u * 3.5, 20 + i, 0.022))]);
    }
    stroke(pts, { broken: 0.34, salt: 50 + i });
  }
  // ---- the near field, which is nearly all bare paper -----------------------------------------------
  // What the original puts in it: long slow contours where the ground rolls, small dashes of grass,
  // and rocks in ones and twos. COUNTED off the original's own near field rather than guessed — about
  // twenty-five rocks and two hundred and fifty dashes to a square of picture. The first cut ran at
  // eight hundred dashes and sixty rocks and the wings came out as gravel either side of a lawn.
  const inPic = (u, v) => u > -0.004 && u < 1.004 && v > -0.004 && v < 1.004;
  const fieldTop = (u) => ground(u) + 0.012;
  // the road's two banks, carried down out of the picture and splayed by the ground coming nearer
  const bankAt = (i, v) => {
    const t = Math.max(0, v - 1);
    return L.banks[i] + (i === 0 ? -1 : 1) * (0.42 * t * t + 0.3 * t) + wob(v * 5, 60 + i, 0.012);
  };
  for (const i of [0, 1]) {
    const pts = [];
    for (let k = 0; k <= 36; k++) {
      const v = 1 + (capV * k) / 36;
      pts.push([PX(bankAt(i, v)), PY(v)]);
    }
    stroke(pts, { broken: 0.22, salt: 60 + i });
  }
  // …and the road itself is BARE. Below the picture the country between those two banks is the road
  // the boy is standing on, not a field: grass and rocks are kept off it, and what it carries is the
  // handful of dashes the original strews down its own.
  const onRoad = (u, v) => v > 1 && u > bankAt(0, v) && u < bankAt(1, v);
  for (let i = 0; i < 40; i++) {
    const v = 1.01 + rng() * (capV - 0.02);
    const l = bankAt(0, v), r = bankAt(1, v);
    const u = l + 0.06 + rng() * (r - l - 0.12);
    const m = 1 + Math.floor(rng() * rng() * 3.4);
    for (let k = 0; k < m; k++) {
      const uu = u + (rng() - 0.5) * 0.07, vv = v + (rng() - 0.5) * 0.02;
      if (!onRoad(uu, vv)) continue;
      const w = (0.012 + rng() * 0.034) * (0.6 + 0.7 * (vv - 1));
      const a = (rng() - 0.5) * 0.4;
      stroke([[PX(uu), PY(vv)], [PX(uu + Math.cos(a) * w), PY(vv + Math.sin(a) * w)]], { broken: 0.26, salt: 80 + i * 3 + k });
    }
  }
  // the field's own contours: the long slow lines where the ground rolls
  for (let i = 0; i < 22; i++) {
    const v = 0.02 + rng() * 1.0;
    const u0 = -wingU + rng() * (1 + 2 * wingU - 0.3);
    const w = 0.2 + rng() * 0.5;
    const pts = [];
    for (let k = 0; k <= 20; k++) {
      const u = u0 + (w * k) / 20;
      const vv = ground(u) + 0.03 + v * (capV + 1 - ground(u) - 0.05) + 0.012 * Math.sin(k * 0.8 + i * 2);
      if (inPic(u, vv) || onRoad(u, vv) || u > 1 + wingU) continue;
      pts.push([PX(u), PY(vv)]);
    }
    stroke(pts, { broken: 0.4, salt: 100 + i });
  }
  // THE GRASS, IN DASHES, AND IN CLUMPS OF THEM. The first cut threw single marks of one length at a
  // uniform angle over the whole field and it came out as hyphens on graph paper: the eye reads an
  // even scatter of identical marks as a printed texture, which is the opposite of what a pen does.
  // The original's field has them in loose handfuls of two to five, every one a different length and
  // lying a different way, so that is what goes out either side of it.
  {
    let n = 0;
    for (let i = 0; i < 2600; i++) {
      const u = -wingU + rng() * (1 + 2 * wingU);
      const v = -0.02 + rng() * (1 + capV + 0.02);
      if (v < fieldTop(u)) continue;
      if (inPic(u, v) || onRoad(u, v)) continue;
      // thinner near the horizon, the way a field is
      const near = clamp01((v - ground(u)) / 0.5);
      if (rng() > 0.1 + 0.3 * near) continue;
      const m = 1 + Math.floor(rng() * rng() * 4.6);
      for (let k = 0; k < m; k++) {
        const uu = u + (rng() - 0.5) * 0.055, vv = v + (rng() - 0.5) * 0.022;
        if (vv < fieldTop(uu) || inPic(uu, vv) || onRoad(uu, vv)) continue;
        const l = (0.008 + rng() * 0.026) * (0.42 + 0.9 * near);
        const a = (rng() - 0.5) * 0.85; // radians off the horizontal
        const bow = (rng() - 0.5) * 0.4;
        const pts = [];
        for (let j = 0; j <= 3; j++) {
          const t = j / 3;
          const c = Math.sin(t * Math.PI) * bow * l;
          pts.push([PX(uu + Math.cos(a) * l * t), PY(vv + Math.sin(a) * l * t + c)]);
        }
        stroke(pts, { broken: 0.2, taper: pen * 0.8, salt: 200 + (n % 97) });
        n++;
      }
    }
    log(`field  ${n} dashes of grass`);
  }
  // the rocks, in ones and twos. A closed outline that does NOT taper at its ends — a rock is one
  // stroke round — with two or three of the room's own hatch strokes laid inside its lower half.
  function rock(u, v, r) {
    const pts = [];
    const n = 15;
    for (let k = 0; k <= n; k++) {
      const a = (TAU * k) / n;
      const rr = r * (0.62 + 0.5 * vnoise(Math.cos(a) * 2.4 + u * 11, Math.sin(a) * 2.4 + v * 11));
      pts.push([PX(u + Math.cos(a) * rr), PY(v + Math.sin(a) * rr * 0.66)]);
    }
    stroke(pts, { broken: 0.14, taper: pen * 0.5, salt: 300 + Math.floor(u * 97) });
    const m = 2 + Math.floor(rng() * 3);
    for (let k = 0; k < m; k++) {
      const t = -0.45 + (k + 1) / (m + 1);
      stroke(
        [
          [PX(u + t * r * 0.8 + r * 0.2), PY(v + r * 0.08)],
          [PX(u + t * r * 0.8 - r * 0.16), PY(v + r * 0.46)],
        ],
        { broken: 0.16, taper: pen * 0.5, salt: 400 + k },
      );
    }
  }
  {
    let n = 0;
    for (let i = 0; i < 260; i++) {
      const u = -wingU - 0.02 + rng() * (1 + 2 * wingU + 0.04);
      const v = -0.02 + rng() * (1 + capV + 0.02);
      if (v < fieldTop(u) + 0.02) continue;
      if (inPic(u, v) || onRoad(u, v)) continue;
      const near = clamp01((v - ground(u)) / 0.55);
      if (rng() > 0.12 + 0.2 * near) continue;
      rock(u, v, (0.007 + rng() * 0.017) * (0.5 + near));
      n++;
      if (rng() < 0.4) {
        rock(u + (rng() - 0.4) * 0.05, v + (rng() - 0.3) * 0.03, (0.004 + rng() * 0.01) * (0.5 + near));
        n++;
      }
    }
    log(`field  ${n} rocks`);
  }

  // ---- 3. THE HALO ---------------------------------------------------------------------------------
  // trace-plate.mjs's rule, and it is the whole difference between tone and a stain: nothing is
  // hatched within a nib and a half of a line. The distance is taken from BOTH drawings — ours and
  // the original's — so the comb keeps clear of the picture's own strokes where it runs up to them.
  const near = (() => {
    const d = new Float32Array(N);
    const at = (x, y) => (x < 0 || y < 0 || x >= PW || y >= PH ? 1e6 : d[x + y * PW]);
    for (let y = 0; y < PH; y++)
      for (let x = 0; x < PW; x++) {
        const i = idx(x, y);
        let mark = line[i] > 0.35;
        if (!mark) {
          const u = x - px0, v = y - py0;
          if (u >= 0 && v >= 0 && u < W && v < H) mark = picCov[v * W + u] > 0.35;
        }
        d[i] = mark ? 0 : 1e6;
      }
    for (let y = 0; y < PH; y++)
      for (let x = 0; x < PW; x++) {
        const k = idx(x, y);
        if (!d[k]) continue;
        d[k] = Math.min(d[k], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
      }
    for (let y = PH - 1; y >= 0; y--)
      for (let x = PW - 1; x >= 0; x--) {
        const k = idx(x, y);
        if (!d[k]) continue;
        d[k] = Math.min(d[k], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
      }
    return d;
  })();
  const HALO = pen * 1.5;

  // ---- 4. THE TONE, LAID -----------------------------------------------------------------------------
  // WHERE it goes is the geography above; HOW DARK it is, is the picture's own answer, asked of the
  // picture. A storm sky is not one tone: this one runs at luminance 20 along its top edge and 49
  // down where the cloud breaks, so the original crosses a second comb over the top of it and combs
  // the rest once. A continuation with one rule for the whole sky comes out as a flat mesh beside a
  // drawing that shades — measured at the right-hand seam, half again as much ink as the picture it
  // joins. So every pixel out here asks the ORIGINAL what tone it is: the point is clamped back onto
  // the picture, the sky band stretched to the sky band so the profile keeps its shape, and the
  // second comb goes on exactly where the original's own threshold would have put it.
  const skyAt1 = Math.max(1e-4, L.right.ridge);
  const toneOf = (u, v) => {
    let vv = v;
    if (u > 1) {
      const r = ridge(u);
      if (v < r && r > 1e-4) vv = (v / r) * skyAt1; // the sky band, stretched onto the picture's own
    }
    const sx = Math.min(W - 1, Math.max(0, Math.round(clamp01(u) * (W - 1))));
    const sy = Math.min(H - 1, Math.max(0, Math.round(clamp01(vv) * (H - 1))));
    return picTone[sy * W + sx];
  };
  let toneN = 0, darkN = 0;
  for (let y = 0; y < PH; y++) {
    const v = V(y);
    const py = y - py0;
    for (let x = 0; x < PW; x++) {
      const u = U(x);
      if (u > -0.001 && u < 1.001 && v > -0.001 && v < 1.001) continue; // never over the original
      const g = ground(u);
      if (v >= g) continue; // the near field is paper, as it is in the original
      let dark = false, on = false;
      if (u < L.seam) {
        // the bright half: paper above the crest, the cliff's face hatched under it
        if (v >= crest(u) && v < cliff(u)) on = true;
      } else {
        // THE STORM, hatched to the top of the sheet — and it is the SKY that takes the second comb
        // across it and not the rock, which is the way round the original has it: the night sky is
        // at luminance 22 and crossed, the crag at 29 and combed once with its fissures drawn in.
        // The first cut had it backwards and the crag came out as a lattice.
        on = true;
        if (v >= ridge(u) && v <= ledge(u)) on = false; // the lit ledge stays paper
      }
      if (!on) continue;
      dark = toneOf(u, v) < darker;
      toneN++;
      const i = idx(x, y);
      if (near[i] < HALO) continue;
      const px = x - px0;
      let c = stripes(px, py, hatchA, hatch, 0);
      if (dark) {
        darkN++;
        c = Math.max(c, stripes(px, py, hatchA + Math.PI / 2, hatch * crossK, 5.5));
      }
      if (c > cov[i]) cov[i] = c;
    }
  }
  log(`tone   ${((100 * toneN) / N).toFixed(1)}% of the continuation is hatched, ${((100 * darkN) / N).toFixed(1)}% of it twice`);

  // ---- 5. THE START, FEATHERED UNDER THE ORIGINAL'S OWN STROKES ---------------------------------------
  const fw = Math.max(2, feather * W), fh = Math.max(2, feather * H);
  for (let y = 0; y < PH; y++)
    for (let x = 0; x < PW; x++) {
      const i = idx(x, y);
      const c = line[i];
      if (c <= 0) continue;
      const u = x - px0, v = y - py0;
      let f = 1;
      if (u >= 0 && v >= 0 && u < W && v < H) {
        const d = Math.min(u, W - 1 - u) / fw;
        const e = Math.min(v, H - 1 - v) / fh;
        f = 1 - ss(0, 1, Math.min(d, e));
      }
      const a = c * f;
      if (a > cov[i]) cov[i] = a;
    }

  // ---- 6. AND THE ORIGINAL, LAID ON TOP, UNTOUCHED -----------------------------------------------------
  const sun = new Uint8Array(N);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = idx(x + px0, y + py0);
      const j = y * W + x;
      if (picCov[j] > cov[i]) cov[i] = picCov[j];
      sun[i] = picSun[j];
    }

  // ---- 7. AND THE SEAMS ARE MEASURED, not admired ------------------------------------------------
  // The one thing a person cannot judge by looking at a 3628 px sheet on a screen a third that wide
  // is whether the two sides of a join carry the same WEIGHT of ink, and that is the fault that gives
  // a continuation away — one side a shade darker than the other, over a straight line a metre long.
  // So each edge is weighed: the mean coverage of a strip a sixteenth of the picture wide just inside
  // it, against the same strip just outside. They are drawings of different things and will never be
  // equal; what matters is that neither is half again the other.
  const strip = Math.round(W * 0.06);
  const meanOf = (x0, x1, y0, y1) => {
    let s = 0, n = 0;
    for (let y = Math.max(0, y0); y < Math.min(PH, y1); y++)
      for (let x = Math.max(0, x0); x < Math.min(PW, x1); x++) {
        s += cov[idx(x, y)];
        n++;
      }
    return n ? (100 * s) / n : 0;
  };
  const seams = {
    left: [meanOf(px0, px0 + strip, py0, py0 + H), meanOf(px0 - strip, px0, py0, py0 + H)],
    right: [meanOf(px0 + W - strip, px0 + W, py0, py0 + H), meanOf(px0 + W, px0 + W + strip, py0, py0 + H)],
    top: [meanOf(px0, px0 + W, py0, py0 + strip), meanOf(px0, px0 + W, py0 - strip, py0)],
    bottom: [meanOf(px0, px0 + W, py0 + H - strip, py0 + H), meanOf(px0, px0 + W, py0 + H, py0 + H + strip)],
  };
  for (const [k, [a, b]] of Object.entries(seams))
    log(`seam   ${k.padEnd(6)} ${a.toFixed(2)}% ink inside the picture · ${b.toFixed(2)}% outside it  (${(b / Math.max(0.01, a)).toFixed(2)}x)`);

  return { PW, PH, px0, py0, cov, sun, seams };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('\n  extend-plate is the second half of tools/trace-plate.mjs and is run by it:');
  console.log('    node tools/trace-plate.mjs public/reference/crossroads.png public/reference/crossroads-ink.png\n');
  process.exit(0);
}
