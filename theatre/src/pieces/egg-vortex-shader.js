// The vortex's one fullscreen pass, kept here so ink.js takes a single import and nothing else.
// It runs LAST — after the composite and the despeckle — so what it twists is the finished drawing:
// contours, hatching, colour, paper grain and all. It is off unless egg-vortex.js says otherwise,
// and when it is off ink.js never compiles, allocates or draws any of it.
//
// THE ONE RULE THIS PASS HAS TO KEEP. A warp of a raster is a resampling, and a resampling of a pen
// drawing is a smear: bilinear taps hand back the average of ink and paper, which is a grey, which
// is the one thing this world does not have (BRIEF.md, "no grey" is a rule about TONE). So:
//   · the source is sampled NEAREST — a mark is moved, never mixed;
//   · where the swirl COMPRESSES the drawing (and it compresses hard: by nine seconds one pixel of
//     the frame stands for four or five of the room, and by ten there is no room left to stand
//     for) the pass takes the DARKEST tap in the footprint, not the
//     mean. A pen dragged over a shrinking drawing keeps every line it had at full pressure and
//     lets them crowd; an averaging filter would turn the same lines into a wash. Darkest-of-N is
//     the drawn answer and it is what keeps a line a line at t = 8.
//   · nothing here is blurred, feathered or bloomed. The only softness in the frame is the
//     anti-aliasing the composite already put on the edge of each stroke, and it travels with it.
//
// The spiral arms are DRAWN, not filtered: four strokes in the room's ink, wobbled and skipping,
// re-cut on the same strike as the boil (uSeed = frame/2). Without them the effect is a filter over
// a drawing; with them the vortex is another thing the pen did.
//
// EVERYTHING TURNS THE WAY THE HANDS DO, and the mapping's sign is the whole of that: `ang = th +`
// hands this pixel a mark from ANTICLOCKWISE of it, which puts the mark down clockwise of where it
// was. It matters twice over. It is the clock's own direction, and it is the direction the drawn
// arms below are cut in (r = A·θ climbs with θ, so an arm leaves the boss anticlockwise) — which
// means a straight line of the room's, wound by the whirl, lies ALONG an arm instead of across it.
// The room's lines and the vortex's lines are the same lines.
export const VORTEX_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tSrc;
uniform vec2 uRes;        // drawing-buffer px
uniform float uDpr;
uniform float uSeed;      // the strike: floor(frame / 2), the same one the pen boils on
uniform vec2 uCentre;     // the clock's face, in drawing-buffer px
uniform vec4 uSwirl;      // reach px | twist rad | pull | gather cap px
uniform vec2 uFall;       // twist falloff exponent | pull falloff exponent
uniform vec4 uDrain;      // hole px | whirl rad per e-fold | core px | the sheet's far corner px
uniform vec4 uArms;       // count | turns | reach px | phase rad
uniform float uArmInk;    // 0..1: how present the drawn spiral is
uniform vec2 uLetterbox;
uniform vec3 uPaper;
uniform vec3 uInk;
in vec2 vUv;
layout(location = 0) out vec4 outColor;

const float TAU = 6.28318530718;
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float hash1(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453); }
// one hand, one wobble: the same value noise strokes.js wobbles a polyline with, in one dimension
float vnoise(float x) {
  float i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(hash1(i), hash1(i + 1.0), f);
}
vec3 src(vec2 px) {
  vec2 uv = px / uRes;
  // past the edge of the sheet there is no drawing, and there never was: paper
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return uPaper;
  return texture(tSrc, uv).rgb;
}

void main() {
  vec2 p = vUv * uRes;
  vec2 q = p - uCentre;
  float d = length(q);
  float th = atan(q.y, q.x);

  // The reach grows out of the clock's face. Inside it the drawing is turned and drawn inward;
  // outside it nothing has happened yet, which is why the far corners of the room come in last.
  float R = max(uSwirl.x, 1.0);
  float x = clamp(d / R, 0.0, 1.0);
  float fT = pow(1.0 - x, uFall.x);
  float fP = pow(1.0 - x, uFall.y);
  float mag = 1.0 + uSwirl.z * fP;        // the pull: this pixel shows what stood further out
  float s0 = d * mag;

  // ── THE DRAIN, which is the last four seconds ──
  // Two numbers, and between them the room stops being a room.
  //
  // uDrain.x, THE HOLE. The wind-up alone leaves the drawing a rectangle: near the middle its
  // falloffs are flat, so the map there is one rotation and one scale — the room shrank and turned
  // and stayed square, which is exactly what the user saw and did not want. The hole is a total
  // pull: every pixel now shows what stood a further uDrain.x out AGAIN, without any falloff at
  // all, so as it opens past the far corner of the sheet every last pixel asks for drawing that
  // was never there and is handed paper. The room does not fade and is not covered: it goes down
  // the middle, innermost first, and the far corners — which have the furthest to travel — are the
  // last four things left, four wound tails, and then nothing.
  float s = s0 + uDrain.x;
  // uDrain.y, THE WHIRL: this many radians for every e-fold of radius, at every radius. A twist
  // that falls off over a fixed reach has almost no shear left once the drawing is small, so it
  // turns the room as a body; this one has the same shear at every scale, and so it keeps winding
  // the drawing into arms right down to the last twelfth of a second. A straight line of the
  // room's comes out a logarithmic spiral. The four drawn arms below are Archimedean, which over
  // the turn or two ever on the sheet is the same sweep to the eye, and — this is the part that
  // matters — the same HAND: both climb anticlockwise out of the boss, so the walls' edges and the
  // picture's own edge arrive lying ALONG the arms and not across them. Inside uDrain.z the hub
  // turns rigidly: a pen cannot draw what spins faster than a pixel, and past that limit the mark
  // is noise and not a line.
  float ang = th + uSwirl.y * fT + uDrain.y * log(max(uDrain.w, 1.0) / (d + max(uDrain.z, 1.0)));
  vec2 dir = vec2(cos(ang), sin(ang));
  vec2 sp = uCentre + dir * s;

  vec3 c = src(sp);
  // THE DARKEST TAP, NOT THE MEAN (see the note at the head of this file). The footprint is how
  // much drawing this one pixel now has to speak for; below half a pixel there is nothing to
  // gather and the single nearest tap is the honest answer.
  //
  // AND IT IS NOT A DISC. Along the radius the drawing is squeezed by ds/dd and across it by s/d
  // and by the whirl's shear, and by the last second those two differ by ten to one: a line laid
  // across the pull is thinned to a thread and drops into single pixels, while the same line laid
  // along it is dragged out into an arc. So the footprint is an ellipse with the map's own axes —
  // long where the squeeze is, short where it is not — and the darkest tap in it keeps every line
  // at the width of the nib that drew it while the vortex stretches it along its tangent. A round
  // footprint big enough to hold the first would blacken the second.
  float dm = -uSwirl.z * uFall.y * x * pow(max(1.0 - x, 0.0), max(uFall.y - 1.0, 0.0));
  float dsdd = max(mag + dm, 0.05);                      // px of drawing per px of frame, radially
  float tang = max(s / max(d, 1.0), uDrain.y * s / (d + max(uDrain.z, 1.0)));  // …and tangentially
  // …and how far either is allowed to reach. With no drain running these are the gather cap and
  // half of it, which is the wind-up's own footprint to the pixel.
  float capR = uSwirl.w * (1.0 + 0.60 * uDrain.y);
  float capT = uSwirl.w * (0.5 + 0.35 * uDrain.y);
  float footR = clamp((dsdd - 1.0) * 0.5, 0.0, capR);
  float footT = clamp((tang - 1.0) * 0.5, 0.0, capT);
  float foot = max(footR, footT);
  if (foot > 0.45) {
    vec2 t1 = dir * footR;                    // along the pull
    vec2 t2 = vec2(-dir.y, dir.x) * footT;    // across it
    // four taps until the footprint is wider than a nib; eight only where the drawing is being
    // squeezed by more than three to one, which is the last second and a half of the ten
    float n = foot > 1.3 ? 8.0 : 4.0;
    float best = lum(c);
    for (int i = 0; i < 8; i++) {
      if (float(i) >= n) break;
      float a = float(i) * (TAU / n);
      vec3 cc = src(sp + t1 * cos(a) + t2 * sin(a));
      float l = lum(cc);
      if (l < best) { best = l; c = cc; }
    }
  }

  // ── the spiral, drawn ──
  // Four arms of an Archimedean spiral about the boss, each a stroke of the room's pen: a nib of
  // the same width, a wander of a couple of pixels on a slow noise, and gaps where the pen lifted.
  // The wander and the gaps are keyed to uSeed, so they are re-cut every second frame like every
  // other line in the room; the arms' PLACE is keyed to the phase, so they turn and do not crawl.
  float ink = 0.0;
  // …and outside the arms' own reach there is nothing to draw, which is most of the frame for most
  // of the ten seconds: the twenty-odd hashes below are never evaluated there
  if (uArmInk > 0.001 && d < uArms.z * 1.06) {
    float A = max(uArms.z, 1.0) / max(uArms.y * TAU, 0.001);  // px of radius per radian
    float pen = max(1.0, 1.15 * uDpr);  // the room's own contour measures ~2 px at half coverage
    for (int k = 0; k < 4; k++) {
      if (float(k) >= uArms.x) break;
      float phi = uArms.w + float(k) * TAU / max(uArms.x, 1.0);
      float u = d / A - th - phi;
      float m = floor(u / TAU + 0.5);          // the branch this pixel is nearest to
      float thTot = th + phi + TAU * m;
      float r0 = A * thTot;                    // where the arm runs, before the hand
      // THE WOBBLE IS KEYED TO THE STROKE'S OWN ARC LENGTH — A·θ²/2 — AND NOT TO THE RADIUS OR THE
      // ANGLE. Keyed to either of those, one wobble stretches over eighty pixels of a wide winding
      // and twenty of a tight one, and the first two tunings drew clean vector arcs. The pen's
      // control points are ~30 px apart wherever it is on the sheet, which is what inkLine does
      // with a polyline (strokes.js). It is evaluated at r0 and not at d, so the whole width of the
      // stroke wobbles together instead of coming apart into dots.
      float arc = 0.5 * r0 * thTot;
      float lane = float(k) * 11.0 + m * 5.3;
      float rT = r0 + (vnoise(arc / (15.0 * uDpr) + lane + uSeed * 0.37) - 0.5) * 6.0 * uDpr;
      float pitch = A / max(d, A);
      float dist = abs(d - rT) / sqrt(1.0 + pitch * pitch);
      float cov = 1.0 - smoothstep(pen * 0.45, pen * 1.15, dist);
      // …and it skips, the way the composite's own pen skips (ink.js breakAmt)
      cov *= smoothstep(0.22, 0.36, vnoise(arc / (8.0 * uDpr) + lane * 1.7 + uSeed * 0.91));
      // It comes off the boss, and it stops where the hand stopped: each arm runs out at its own
      // radius and each strike stops it somewhere else, so the three do not share one clean rim.
      float end = uArms.z * (0.74 + 0.30 * vnoise(float(k) * 3.3 + th * 0.8 + uSeed * 0.23));
      cov *= smoothstep(3.0 * uDpr, 16.0 * uDpr, d) * (1.0 - smoothstep(end * 0.80, end, d));
      ink = max(ink, cov);
    }
    ink *= uArmInk;
  }

  vec3 outc = mix(c, uInk, ink);
  // the bars are paper and stay paper: the sheet does not swirl, the drawing on it does
  if (uLetterbox.x > 0.0 && (vUv.y < uLetterbox.x || vUv.y > 1.0 - uLetterbox.y)) outc = uPaper;
  outColor = vec4(outc, 1.0);
}
`;
