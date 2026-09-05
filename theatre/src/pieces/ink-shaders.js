// ink-shaders — GLSL for the pen pipeline. All GLSL3 (WebGL2). See ink.js for the pass order.

// ───────────────────────────── shared helpers ─────────────────────────────
const NOISE = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i), b = hash21(i + vec2(1, 0)), c = hash21(i + vec2(0, 1)), d = hash21(i + vec2(1, 1));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
// the hand: a slow drift, re-seeded on twos (uSeed)
vec2 wobble(vec2 px, float seed, float amp) {
  float s = seed * 17.31;
  vec2 q = px / 88.0;
  float nx = vnoise(q + vec2(s, 3.1)) * 0.8 + vnoise(q * 2.7 + vec2(s * 1.7, 9.2)) * 0.2;
  float ny = vnoise(q + vec2(7.7, s * 1.3)) * 0.8 + vnoise(q * 2.7 + vec2(1.9, s * 2.1)) * 0.2;
  return (vec2(nx, ny) - 0.5) * 2.0 * amp;
}
`;

const OCT = /* glsl */ `
vec2 octWrap(vec2 v) { return (1.0 - abs(v.yx)) * vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0); }
vec2 octEncode(vec3 n) {
  n /= (abs(n.x) + abs(n.y) + abs(n.z));
  vec2 p = n.z >= 0.0 ? n.xy : octWrap(n.xy);
  return p * 0.5 + 0.5;
}
vec3 octDecode(vec2 f) {
  f = f * 2.0 - 1.0;
  vec3 n = vec3(f.xy, 1.0 - abs(f.x) - abs(f.y));
  float t = clamp(-n.z, 0.0, 1.0);
  n.xy += vec2(n.x >= 0.0 ? -t : t, n.y >= 0.0 ? -t : t);
  return normalize(n);
}
`;

// ───────────────────────────── G-buffer (scene override) ─────────────────────────────
export const GBUF_VERT = /* glsl */ `
#include <common>
#include <batching_pars_vertex>
#include <skinning_pars_vertex>
#include <morphtarget_pars_vertex>
uniform mat3 uUvTransform;
uniform mat3 uCamRot;
out vec2 vUv;
out vec3 vNormalW;
void main() {
  vUv = (uUvTransform * vec3(uv, 1.0)).xy;
  #include <batching_vertex>
  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  vNormalW = normalize(uCamRot * transformedNormal);
  #include <begin_vertex>
  #include <morphtarget_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
}
`;

export const GBUF_FRAG = /* glsl */ `
precision highp float;
precision highp int;
uniform sampler2D uMap;
uniform float uHasMap;
uniform vec3 uColor;
uniform float uAlphaTest;
uniform float uLodBias;  // how much sharper than the hardware would the pen looks at a drawing
uniform float uPacked;   // colorful*128 + hatchIdx*8, already /255
uniform float uLineW;    // the material's own lineWeight, 0..2 — see gMisc.a below
uniform float uId;       // 0..65535
uniform float uDist;     // object distance to camera, metres
in vec2 vUv;
in vec3 vNormalW;
layout(location = 0) out vec4 gAlbedo;
layout(location = 1) out vec4 gNorm;
layout(location = 2) out vec4 gMisc;
${OCT}
vec3 toSRGB(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(12.92 * c, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
void main() {
  // A mip filter is an averaging machine and the pen is not: every level it climbs turns ink and
  // paper into a grey that no pen made, and a hand-lettered label two shelves back arrives as a
  // dirty rectangle. So the pass looks at a drawing a level SHARPER than the hardware would choose
  // — it keeps the marks' contrast where the mip would have dissolved it, and the composite's
  // one-pen rule then puts each surviving mark down at full ink or not at all. Aliasing is the
  // price, and it is the right price here: an aliased mark is still a mark, a mip-grey is not.
  vec4 tex = uHasMap > 0.5 ? texture(uMap, vUv, uLodBias) : vec4(1.0);
  if (tex.a < uAlphaTest) discard;
  vec3 n = normalize(gl_FrontFacing ? vNormalW : -vNormalW);
  gAlbedo = vec4(toSRGB(uColor * tex.rgb), uPacked);
  float idLo = mod(uId, 256.0), idHi = floor(uId / 256.0);
  gNorm = vec4(octEncode(n), idLo / 255.0, idHi / 255.0);
  float dl = clamp(log2(max(uDist, 0.25) / 0.25) / 8.0, 0.0, 1.0); // 0.25..64 m, 16 bit
  float dHi = floor(dl * 255.0), dLo = floor(fract(dl * 255.0) * 255.0);
  // How far the frame has shrunk the surface's own drawing: TEXELS of its texture per screen pixel.
  // This is the projected size of a drawn mark, measured rather than guessed — the number that says
  // whether a label's lettering, a shutter's louvre or a board's seam is still something a pen
  // could draw here, or has already fallen below the width of the nib. Encoded log2, 0.25..64.
  float texels = 0.25;
  if (uHasMap > 0.5) {
    vec2 duv = fwidth(vUv) * vec2(textureSize(uMap, 0));
    texels = max(max(duv.x, duv.y), 0.25);
  }
  // …and the material's own lineWeight, at the full eight bits of this channel. It used to be
  // packed into the bottom THREE bits of gAlbedo.a as round(lineWeight * 4) — quarter steps,
  // clamped at 1.75 — which quietly rounded Pepe's 1.15 UP to 1.25, a quarter of a pixel wider than
  // every surface in the room at 1.1. A silent quarter-pixel is exactly the thick-and-thin STYLE
  // §1.2 forbids, and nobody asked for it: this channel was sitting here writing a constant 1.0.
  gMisc = vec4(dHi / 255.0, dLo / 255.0, clamp(log2(texels) / 8.0 + 0.25, 0.0, 1.0), clamp(uLineW * 0.5, 0.0, 1.0));
}
`;

// ───────────────────────────── fullscreen passes ─────────────────────────────
export const QUAD_VERT = /* glsl */ `
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Edge seeds: silhouettes (depth), creases (normal), object boundaries (id / distance).
// Output: r = seed (0/1), g = pen weight (type × the material's lineWeight; where two things meet,
// the nearer one's — a cut-out with its own drawn outline asks for a light line and gets it on
// every side), b = tangent angle / PI, a = 1
export const EDGE_FRAG = /* glsl */ `
precision highp float;
precision highp int;
uniform sampler2D tDepth, tNorm, tMisc, tAlbedo;
uniform vec2 uRes;
uniform float uNear, uFar, uSeed, uDpr, uWobble;
uniform float uDepthThr, uCreaseThr, uCreaseWide;
in vec2 vUv;
layout(location = 0) out vec4 outColor;
${NOISE}
${OCT}
float linD(vec2 uv) {
  float z = texture(tDepth, uv).x * 2.0 - 1.0;
  return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
}
// the material's own lineWeight, no longer quantised — see GBUF_FRAG's gMisc.a
float lwAt(vec2 uv) { return texture(tMisc, uv).a * 2.0; }
struct S { float d; vec3 n; float id; float m; };
S tap(vec2 uv) {
  S s;
  s.d = linD(uv);
  vec4 nn = texture(tNorm, uv);
  s.n = octDecode(nn.rg);
  s.id = nn.b * 255.0 + nn.a * 65280.0;
  vec4 mm = texture(tMisc, uv);
  s.m = mm.r + mm.g / 255.0;
  return s;
}
float feat(S s) { return log(s.d) * 3.0 + fract(s.id * 0.618034) * 5.0 + s.m * 40.0 + dot(s.n, vec3(0.8, 0.6, 0.4)); }
void main() {
  vec2 px = vUv * uRes;
  vec2 uv = vUv + wobble(px / uDpr, uSeed, uWobble) * uDpr / uRes;
  vec2 o = uDpr / uRes;
  S c = tap(uv);
  S xp = tap(uv + vec2(o.x, 0.0)), xm = tap(uv - vec2(o.x, 0.0));
  S yp = tap(uv + vec2(0.0, o.y)), ym = tap(uv - vec2(0.0, o.y));
  float thr = uDepthThr * c.d + 0.0015;
  float ax = xp.d - c.d, bx = xm.d - c.d, ay = yp.d - c.d, by = ym.d - c.d;
  bool sil = (max(ax, bx) > thr && abs(ax + bx) > thr) || (max(ay, by) > thr && abs(ay + by) > thr);
  float dotMin = min(dot(c.n, xp.n), dot(c.n, yp.n));
  // A fold earns a line only if it is still a CORNER at the scale of the pen. Measured across one
  // pixel a bead of moulding, a lathed rim, a shutter's louvre across the room and a crease of
  // cloth all read as sharp; measured across three, a real corner still has its two flats either
  // side while a bead has already turned back on itself. The film inks the corner and lets the
  // bead go: a line that cannot be a stroke arrives as a grey smudge, and there are no greys. This
  // is the projected-size rule for the pen — a moulding four pixels wide stops being three lines
  // and becomes one, which is what a draughtsman draws at that distance.
  vec3 wx = octDecode(texture(tNorm, uv + vec2(o.x * 3.0, 0.0)).rg);
  vec3 wxm = octDecode(texture(tNorm, uv - vec2(o.x * 3.0, 0.0)).rg);
  vec3 wy = octDecode(texture(tNorm, uv + vec2(0.0, o.y * 3.0)).rg);
  vec3 wym = octDecode(texture(tNorm, uv - vec2(0.0, o.y * 3.0)).rg);
  float wide = min(dot(wx, wxm), dot(wy, wym));
  bool crease = dotMin < uCreaseThr && wide < uCreaseWide;
  bool idE = abs(c.id - xp.id) > 0.5 || abs(c.id - yp.id) > 0.5 || abs(c.m - xp.m) > 0.002 || abs(c.m - yp.m) > 0.002;
  // ONE PEN, ONE PRESSURE (STYLE §1.2: "there is no thick-and-thin calligraphy; line weight does
  // not change between foreground and background"). A crease used to be inked at 0.72 to 0.95 of
  // the pen and an object boundary at 0.95, which is thick-and-thin by the back door — and worse,
  // it made the weight a CONTINUOUS function of the fold angle, so along a single crease the
  // strength drifted from pixel to pixel. The doubled-line merge below compares those strengths to
  // decide which of two parallel lines survives, so a drifting strength meant the decision flipped
  // along the line and BOTH came out as trails of dashes: the field of dirt the round-4 critic
  // found strewn beside every vertical in the room. A line is drawn or it is not. The material's
  // own lineWeight still speaks — 0 means "draw no line round this", 0.25 means "the contour is
  // already in my map, add a whisper" — but the pen itself has one weight.
  float seed = 0.0, type = 0.0;
  if (crease || idE || sil) { seed = 1.0; type = 1.0; }
  // the pen weight: the material's own, unless the line is the boundary with something nearer
  float lw = lwAt(uv);
  if (abs(c.id - xp.id) > 0.5 || abs(c.m - xp.m) > 0.002 || abs(ax) > thr) lw = min(lw, xp.d < c.d ? lwAt(uv + vec2(o.x, 0.0)) : lw);
  if (abs(c.id - yp.id) > 0.5 || abs(c.m - yp.m) > 0.002 || abs(ay) > thr) lw = min(lw, yp.d < c.d ? lwAt(uv + vec2(0.0, o.y)) : lw);
  if (lw <= 0.0) seed = 0.0;
  // tangent: perpendicular to the gradient of a scalar that jumps at every kind of edge
  float gx = feat(xp) - feat(xm);
  float gy = feat(yp) - feat(ym);
  vec2 tg = vec2(-gy, gx);
  float th = atan(tg.y, tg.x);
  if (th < 0.0) th += 3.14159265;
  if (th >= 3.14159265) th -= 3.14159265;
  outColor = vec4(seed, type * lw, th / 3.14159265, 1.0);
}
`;

// Overshoot: a pen runs a little past the end of a line. For a pixel just beyond the end of a
// line (found by marching back along one of 8 directions), copy the seed forward.
export const EXTEND_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tEdge;
uniform vec2 uRes;
uniform float uDpr, uSeed, uOvershoot, uMerge, uThin, uStub, uStub2;
in vec2 vUv;
layout(location = 0) out vec4 outColor;
${NOISE}
void main() {
  vec4 e = texture(tEdge, vUv);
  // A PEN DOES NOT MAKE DOTS. A seed with no line running through it is not a contour: it is the
  // edge detector firing on one pixel of a pattern the frame has minified — a baluster across the
  // room, a wallpaper sprig, a seam in a door leaf at four texels a pixel — and at a nib's width
  // it lands on the paper as a black speck. Round 4 shipped a field of them strewn along and
  // beside every vertical in the room; measured, 0.5–0.8% of our dark pixels were isolated where
  // every folio measures 0.00%. So a seed must have a line to be part of: uStub pixels along its
  // own tangent, either way, within a pixel of the tangent, the line must carry on. A stroke runs;
  // an outline round a two-pixel object does not, and the film does not draw what it cannot draw —
  // it leaves the paper. The last pixels of a real line are trimmed by this and handed straight
  // back by the overshoot below, which is what a pen does at a line's end anyway.
  if (e.r > 0.5 && uStub > 0.5) {
    float th0 = e.b * 3.14159265;
    vec2 tg = vec2(cos(th0), sin(th0));
    vec2 nn = vec2(-tg.y, tg.x);
    vec2 px1 = uDpr / uRes;
    float run = 0.0;
    for (int k = 0; k < 2; k++) {
      vec2 d = tg * (k == 0 ? uStub : -uStub) * px1;
      float hit = max(texture(tEdge, vUv + d).r,
                      max(texture(tEdge, vUv + d + nn * 0.9 * px1).r,
                          texture(tEdge, vUv + d - nn * 0.9 * px1).r));
      run += step(0.5, hit);
    }
    // …in BOTH directions, not one, once uStub2 is on. ROUND 7: a one-sided test cannot tell a
    // stroke's END from a BARB — a lone seed sticking sideways out of a contour, which the edge
    // detector drops every few pixels along any near-vertical silhouette. Looking one way from a
    // barb's tip lands on the parent line, so it passed, and round 6's distance field simply
    // absorbed it into the parent's width. The line fit does not: an off-tangent seed becomes a
    // stroke of its own and gets inked as a 2 px tick standing out of the contour. At 3x beside
    // the door those ticks are the room's remaining tell. Two-sided, a barb keeps at most its base
    // pixel; a real line loses uStub px at each end and the overshoot below hands them back, which
    // is what a pen does at the end of a stroke anyway.
    if (run < (uStub2 > 0.5 ? 1.5 : 0.5)) { outColor = vec4(0.0); return; }
  }
  // Two lines a nib's width apart are a black bar, not two strokes. The set is full of pairs that
  // describe one thing twice: an object's silhouette against the edge of its own drawn texture, a
  // moulding inked by its geometry and again by its map, the top and bottom of a louvre once the
  // slat is a few pixels deep. The film draws one stroke there. So where a second seed runs
  // PARALLEL to this one within uMerge pixels, only one survives — the stronger line, and on a tie
  // the one the search reaches from its own -normal, which is a fixed choice for a given pair and
  // so does not flicker between frames.
  if (e.r > 0.5 && uMerge > 0.5) {
    float th = e.b * 3.14159265;
    vec2 nrm = vec2(-sin(th), cos(th));
    for (int s = 1; s <= 4; s++) {
      if (float(s) > uMerge) break;
      for (int k = 0; k < 2; k++) {
        vec2 d = nrm * (k == 0 ? 1.0 : -1.0) * float(s) * uDpr / uRes;
        vec4 q = texture(tEdge, vUv + d);
        if (q.r < 0.5) continue;
        float dth = abs(q.b - e.b);
        dth = min(dth, 1.0 - dth);
        if (dth > 0.11) continue;                       // not parallel: a crossing, not a double
        // Only a WEAKER line merges into a stronger one. Two equals a few pixels apart are the two
        // sides of something thin — a coin, a rail, a slat seen edge-on — and both are real; taking
        // one of those left the small props on the table drawn in a broken scratch. What does get
        // merged is a crease under a silhouette, or a moulding the map draws again under the
        // geometry's own line: one thing described twice, at two strengths.
        // Only a WEAKER line merges into a stronger one at a distance. Two equals a few pixels
        // apart are the two sides of something thin — a coin, a rail, a slat seen edge-on — and
        // both are real; taking one of those left the small props on the table drawn in a broken
        // scratch. What does get merged at a distance is a crease running under a silhouette, or a
        // moulding the map draws again beneath the geometry's own line: one thing described twice.
        // Equals that are CLOSER THAN THE NIB CAN SEPARATE are a different matter again. A door's
        // architrave, a panel's bolection, a picture frame's rebate, the slats of a gallery across
        // the room: every one of them is two real edges three or four pixels apart, and the pen
        // drawing both leaves a sliver of paper thinner than a stroke between them — which is not
        // two lines, it is a black bar with a scratch in it. A draughtsman draws one line there and
        // moves on (STYLE §1.2: depth is carried by hatch density and overlap, never by weight, and
        // "a moulding four pixels wide stops being three lines and becomes one"). uThin is that
        // distance in pixels; beyond it two equals are two sides of something the frame can still
        // hold apart — a coin, a rail, a slat seen edge-on — and both are drawn.
        // ROUND 5, and this was the other half of the speckle. "The one the search reaches from its
        // own -normal" is NOT a fixed choice: the tangent comes from the gradient of a feature
        // scalar and its sign flips freely along a line, so k==0 pointed left on one pixel and
        // right on the next, and of two parallel lines each surrendered alternate pixels to the
        // other. Both then arrived on the paper as a trail of dashes — the field of dirt strewn
        // beside every vertical in the room. Which of a pair survives must be decided by something
        // that cannot flip: the one that lies toward +x+y in the frame keeps the stroke, the other
        // gives way, for every pixel of both lines and every frame.
        bool ahead = d.x * uRes.x + d.y * uRes.y * 0.9 > 0.0;
        if (q.g > e.g + 0.06 || (float(s) <= uThin && q.g > e.g - 0.02 && ahead)) { outColor = vec4(0.0); return; }
      }
    }
  }
  if (e.r > 0.5 || uOvershoot < 0.05) { outColor = e; return; }
  // A CORNER IS FOUR STROKES THAT MISS EACH OTHER, not a mitred vertex. The door draws every quad
  // as four independent lines, each run a hair past the one it meets — sometimes crossing it,
  // sometimes stopping short of it by the width of the wobble — and that overshoot is the single
  // cheapest tell that a hand drew the thing. A shader contour ends exactly where the geometry
  // ends, so every rectangle in the room (and this set is nothing but rectangles: panels, picture
  // frames, shelf boards, the sideboard, the window) arrived with four ruled, perfectly closed
  // corners. Nothing else in the frame says "drawn by a machine" so plainly.
  //
  // ROUND 7 rewrote how the end of a line is found. The old pass marched back along one of eight
  // fixed directions and demanded the stroke's tangent lie within 13° of it, so only lines within
  // 13° of an axis or a diagonal ever ran on at all — which in a frontal set is the horizontals
  // and verticals and nothing else, and it is the OBLIQUE lines (a table's ellipse, a lampshade,
  // the rug's border in perspective) whose ruled ends give the game away first. Now: find the
  // nearest seed in a 7x7 disc, take ITS tangent, and ask whether this pixel lies off the END of
  // that stroke rather than beside it. Every angle, one rule.
  // The seed that is nearest AND POINTING AT US. Nearest alone is not enough, and this is why the
  // first cut of this pass put no ink at a single corner: the pixel a hair outside the corner of a
  // rectangle is nearest to the corner seed itself, whose tangent — the gradient of a feature that
  // turns ninety degrees there — comes out diagonal and belongs to neither arm. Skip it and take
  // the first seed one further along whose tangent actually runs through this pixel, and the
  // horizontal arm's end is found where the corner's own ambiguity is not.
  float bd = 99.0; vec2 bo = vec2(0.0); vec4 bq = vec4(0.0); vec2 btg = vec2(1.0, 0.0);
  for (int j = -3; j <= 3; j++) for (int i = -3; i <= 3; i++) {
    vec2 off = vec2(float(i), float(j));
    float dd = dot(off, off);
    if (dd > 10.5 || dd < 0.5 || dd >= bd) continue;
    vec4 q = texture(tEdge, vUv + off * uDpr / uRes);
    if (q.r < 0.5) continue;
    float qth = q.b * 3.14159265;
    vec2 qtg = vec2(cos(qth), sin(qth));
    // ON THE STROKE'S OWN AXIS, off its end — not beside it. A pixel a pixel to the SIDE of a long
    // line is not a place a pen ran on to, and the first cut of this test measured the angle
    // rather than the offset, which let everything within a pixel and a half of every contour in
    // the room count as an overshoot: 57% of the drawing's ink, and strokes 279 px long doubled.
    if (abs(dot(off, vec2(-qtg.y, qtg.x))) > 0.9) continue;
    // …and the seed AT a corner is skipped, which is the whole point of searching rather than
    // taking the nearest. Its tangent is the gradient of a feature that turns ninety degrees
    // there, so it comes out diagonal and belongs to neither arm; a pixel off the end of the
    // horizontal arm would find it, follow its diagonal into the middle of the rectangle, see no
    // line running on and give up — which is exactly why the room's rectangles had four ruled
    // corners. Skipping it lets the search reach the first seed with a tangent worth having.
    if (abs(dot(off, qtg)) < 0.86 * sqrt(dd)) continue;
    bd = dd; bo = off; bq = q; btg = qtg;
  }
  if (bd > 10.0) { outColor = vec4(0.0); return; }
  vec2 tg = btg;
  vec2 tgs = tg * (dot(tg, bo) < 0.0 ? -1.0 : 1.0);   // on along the stroke, away from us
  vec2 pxs = uDpr / uRes;
  // …and the stroke must really RUN on behind that seed, or this is a speck's halo, not a line end
  float on = min(texture(tEdge, vUv + (bo + tgs * 2.0) * pxs).r,
                 texture(tEdge, vUv + (bo + tgs * 4.0) * pxs).r);
  if (on < 0.5) { outColor = vec4(0.0); return; }
  // Where the stroke really ENDS. The seed found above is often one past it, because the seed AT a
  // corner was skipped for having no tangent of its own; walk back down the tangent to the last
  // mark there actually is, and measure the run-on from there. If the line carries on past that,
  // this pixel is not off the end at all and nothing is drawn.
  vec2 endOff = bo;
  if (texture(tEdge, vUv + (bo - tgs) * pxs).r > 0.5) {
    endOff = bo - tgs;
    if (texture(tEdge, vUv + (bo - tgs * 2.0) * pxs).r > 0.5) endOff = bo - tgs * 2.0;
  }
  if (texture(tEdge, vUv + (endOff - tgs) * pxs).r > 0.5) { outColor = vec4(0.0); return; }
  float d0 = length(endOff);
  // How far THIS stroke runs past its end, in px. Keyed to where the stroke stands (so the four
  // sides of one rectangle overshoot by four different amounts) and re-rolled on twos with the
  // rest of the pen, so a held corner is never the same corner twice.
  float side = dot(vUv * uRes / uDpr, vec2(-tg.y, tg.x));
  float run = uOvershoot * (0.3 + 0.7 * hash21(vec2(floor(side / 7.0) + bq.b * 51.0, uSeed * 0.37)));
  if (d0 > run) { outColor = vec4(0.0); return; }
  outColor = vec4(0.9, bq.g, bq.b, 1.0);
}
`;

export const COMPOSITE_FRAG = /* glsl */ `
precision highp float;
precision highp int;
uniform sampler2D tAlbedo, tNorm, tMisc, tDepth, tLit, tEdge, tWall, tFloor, tPaper;
uniform vec2 uRes;
uniform float uDpr, uSeed, uNear, uFar, uHatchK, uLref, uLineBase, uLineSoft, uBreak, uPaperAmt, uHatchBoil;
uniform float uPenWob;      // px the pen wanders ACROSS its own stroke, at ~8 px of wavelength
uniform float uPenJit;      // ± fraction of the nib's radius, per stroke — no two the same weight
uniform float uPlaced;      // the number the MARKS were placed with: fixed, so tone does not crawl
uniform float uPocket;      // how much a fold in the set darkens: under a ledge, into a corner
uniform float uColorInk;    // 1 = the drawn marks inside a coloured surface get the room's own pen
uniform vec4 uTex;          // the wash a drawn pattern must reach for tone 1/2/3, then for a fill
uniform vec4 uTexPen;       // texels/px where a drawn mark stops being drawable (lo, hi), then the
                            // darkness a mark must reach to be ink at all (lo, hi)
uniform float uTexBias;     // where the paper ends and a drawn mark begins, as a fraction of the
                            // way from the middle of the nib-wide field up to its darkest point
uniform int uMode;          // 0 all, 1 lines only, 2 tone only
uniform mat4 uInvVP;
uniform vec3 uInk, uPaper;
uniform vec4 uLevels;       // darkness thresholds for tone levels 1..3, then the ragged-edge amount
uniform vec4 uTone;         // lit luminance that is fully dark, fully lit; max darkness from light; grazing amount
uniform vec3 uCamPos;
uniform vec2 uLetterbox;    // fraction of height covered by each bar (top, bottom)
in vec2 vUv;
layout(location = 0) out vec4 outColor;
${NOISE}
${OCT}
float linD(float z01) {
  float z = z01 * 2.0 - 1.0;
  return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
}
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
// The hand does not hatch a shadow-map's speckle: read the lit pass over a small disc so tone
// arrives in coherent patches with one boundary, not as a scatter of fragments.
float litL(sampler2D t, vec2 uv) { return lum(texture(t, uv).rgb); }
float softLit(vec2 uv, vec2 r) {
  float c = litL(tLit, uv) * 0.28;
  c += (litL(tLit, uv + vec2(r.x, 0.0)) + litL(tLit, uv - vec2(r.x, 0.0))
      + litL(tLit, uv + vec2(0.0, r.y)) + litL(tLit, uv - vec2(0.0, r.y))) * 0.12;
  c += (litL(tLit, uv + r) + litL(tLit, uv - r)
      + litL(tLit, uv + vec2(r.x, -r.y)) + litL(tLit, uv + vec2(-r.x, r.y))) * 0.06;
  return c;
}
void main() {
  vec2 px = vUv * uRes;
  vec2 cssPx = px / uDpr;
  vec3 paperGrain = mix(vec3(1.0), texture(tPaper, cssPx / 512.0).rgb, uPaperAmt);

  // letterbox: flat paper, nothing drawn
  if (vUv.y > 1.0 - uLetterbox.x || vUv.y < uLetterbox.y) {
    outColor = vec4(uPaper * paperGrain, 1.0);
    return;
  }

  vec4 alb = texture(tAlbedo, vUv);
  // debug views: 3 albedo, 4 normal, 5 depth, 6 lit, 7 edge seeds
  if ((uMode >= 3 && uMode <= 8) || uMode == 11) {
    vec3 dbg = vec3(0.0);
    if (uMode == 11) {
      // texels of a surface's own drawing per screen pixel: white = drawn at or above pen size,
      // red = 1..4 texels a pixel (marks closing up), black = past 8 (nothing left to draw)
      // the stored channel, raw, so tools/_ink-minif.mjs can decode it: texels = 2^((v-0.25)*8)
      outColor = vec4(vec3(texture(tMisc, vUv).b), 1.0);
      return;
    }
    if (uMode == 3) dbg = alb.rgb;
    else if (uMode == 4) dbg = octDecode(texture(tNorm, vUv).rg) * 0.5 + 0.5;
    else if (uMode == 5) dbg = vec3(fract(linD(texture(tDepth, vUv).x) / 8.0));
    else if (uMode == 6) dbg = texture(tLit, vUv).rgb;
    else if (uMode == 7) { vec4 e = texture(tEdge, vUv); dbg = vec3(1.0 - e.r, 1.0 - e.r * e.g, 1.0 - e.r * (1.0 - e.b)); }
    else if (uMode == 8) {
      // the tiles at true scale: four levels left→right, wall set top, floor set bottom
      vec2 tuv = cssPx / 512.0;
      int lv = int(floor(cssPx.x / (uRes.x / uDpr / 4.0)));
      vec4 h = (cssPx.y < uRes.y / uDpr * 0.5) ? texture(tWall, tuv) : texture(tFloor, tuv);
      float cov = lv == 0 ? h.r : lv == 1 ? h.g : lv == 2 ? h.b : 1.0;
      dbg = mix(uPaper, uInk, smoothstep(0.3, 0.7, cov)) * paperGrain;
    }
    outColor = vec4(dbg, 1.0);
    return;
  }
  // 9 = the pen's contours alone, 10 = the ink that comes from the surfaces' own drawn marks alone.
  // Everything below runs as in lines-only; only the last mix is masked.
  int drawMode = uMode >= 9 ? 1 : uMode;
  int packed = int(alb.a * 255.0 + 0.5);
  bool colorful = packed >= 128;
  float hatchW = float((packed >> 3) & 15) / 14.0;
  float zc = texture(tDepth, vUv).x;
  bool bg = zc >= 0.99999;

  // ── what the surface's own drawing says here ────────────────────────────────────────────────
  // Read the albedo over two rings, at radii too far apart for a regular pattern (louvres, a weave,
  // floorboards) to line up with both.
  //   wash     what the drawing averages to over a pen's width. 0 on a bare wall; on a pattern the
  //            frame is too small to resolve, the grey the mip filter made of it; 1 inside a black
  //            shape. This is the number that decides whether the pen draws the pattern or states
  //            the tone instead.
  // A ring a pen's width across is the whole test: a 2 px contour, a louvre bar, a hand-lettered
  // cap and a wallpaper sprig all sit in a clear field and score low, so they are left exactly as
  // drawn; a wainscot minified until its seams touch scores mid; the inside of a coat, a cat, a
  // shelf carcass or a doorway scores one.
  float wash = 0.0, ringLo = 1.0, ringHi = 0.0;
  // …and the same reading taken ONE NIB away instead of five. This is the field a single mark
  // stands in: the paper immediately either side of a letter's stem, of a louvre bar, of a
  // floorboard seam. It is the only neighbourhood small enough to still separate a mark from its
  // own background once the frame has minified the drawing, and it is what lets the pen re-state
  // a word at full ink instead of copying out the grey the mip filter made of it.
  float tightLo = 1.0, tightHi = 0.0;
  // …and the darkest of those eight NEIGHBOURS on its own, without this pixel. A stroke has a
  // neighbour: a nib is wider than a pixel, so every mark it makes runs on into the paper beside
  // it. A single dark pixel with light on every side is not a mark at all — it is what the
  // minifier made of a drawing it could no longer hold, and 2.1% of the dark pixels this pass laid
  // down were exactly that, against 0.0% in every folio.
  float tightNbr = 0.0;
  float tHere = 1.0 - lum(alb.rgb);
  {
    const float D = 0.7071;
    vec2 dirs[8] = vec2[8](vec2(1, 0), vec2(-1, 0), vec2(0, 1), vec2(0, -1),
                           vec2(D, D), vec2(-D, -D), vec2(D, -D), vec2(-D, D));
    vec2 r0 = 5.5 * uDpr / uRes;
    vec2 r1 = 1.8 * uDpr / uRes;
    for (int i = 0; i < 8; i++) {
      float dk = 1.0 - lum(texture(tAlbedo, vUv + dirs[i] * r0).rgb);
      wash += dk;
      ringLo = min(ringLo, dk);
      ringHi = max(ringHi, dk);
      float dt = 1.0 - lum(texture(tAlbedo, vUv + dirs[i] * r1).rgb);
      tightLo = min(tightLo, dt);
      tightHi = max(tightHi, dt);
      tightNbr = max(tightNbr, dt);
    }
    wash = (wash + tHere) / 9.0;
    tightLo = min(tightLo, tHere);
    tightHi = max(tightHi, tHere);
  }
  // Is the drawing still DRAWABLE here, or has the frame shrunk it below the pen? If the ring
  // holds both paper and ink the marks are still separate and the pen draws them; if the ring is
  // one flat value the minifier has already averaged them away and there is nothing left to draw,
  // only a tone to state. This is the difference between a shutter a metre off — every louvre a
  // stroke — and the same shutter across the room, which a draughtsman would give two or three
  // strokes and a lot of paper, not sixty grey ones.
  float resolved = smoothstep(0.26, 0.56, ringHi - ringLo);
  // …and the second half of the same question, which contrast alone cannot answer: is the mark
  // still BIG ENOUGH to be a stroke? A shelf's stencilled label, a bottle's small type, a coat's
  // stripes across the room all keep their contrast right down to the last pixel — the ring test
  // says "still resolved" and the pen dutifully inks them, which is how a word the size of a
  // fingernail arrives as a black smudge and a striped coat as a bar code. The G-buffer measures
  // it exactly: texels of the surface's own drawing per screen pixel. One pen, one width — at two
  // texels a pixel the drawn stroke is already thinner than the nib, and past four there is
  // nothing a nib could put down. The film's answer at that size is a couple of marks and a lot
  // of paper, or a flat tone, never a smaller pen.
  float minif = exp2((texture(tMisc, vUv).b - 0.25) * 8.0);
  float drawable = 1.0 - smoothstep(uTexPen.x, uTexPen.y, minif);

  // ── the stroke grid, anchored to the surface in world space ──────────────────────────────
  // The scale snaps to octaves of the object's distance, so strokes stay the same size on the
  // paper without swimming when the camera moves, and the whole object shares one scale so the
  // pattern never crawls across it. Both the tone levels and the hatching of black masses ride
  // on this grid, which is why a mass and the tone beside it agree.
  vec2 huv = vec2(0.0);
  bool up = false;
  float facing = 1.0;
  vec3 wp = vec3(0.0), n = vec3(0.0, 0.0, 1.0);
  if (!bg) {
    vec4 wp4 = uInvVP * vec4(vUv * 2.0 - 1.0, zc * 2.0 - 1.0, 1.0);
    wp = wp4.xyz / wp4.w;
    n = octDecode(texture(tNorm, vUv).rg);
    facing = abs(dot(n, normalize(uCamPos - wp)));
    vec4 misc = texture(tMisc, vUv);
    float dObj = 0.25 * exp2((misc.r + misc.g / 255.0) * 8.0);
    vec3 an = abs(n);
    up = an.y > max(an.x, an.z);
    vec2 wuv = up ? wp.xz : (an.x > an.z ? wp.zy : wp.xy);
    if (!up && an.x > an.z && n.x < 0.0) wuv.x = -wuv.x; // keep handedness so strokes lean the same way
    if (!up && an.x <= an.z && n.z < 0.0) wuv.x = -wuv.x;
    // a surface turned away foreshortens, which would crowd its strokes together on the paper;
    // draw them larger to compensate, snapped to the same octaves so nothing slides
    float fore = clamp(facing, 0.5, 1.0);
    huv = wuv * exp2(floor(log2(uHatchK / (dObj * fore)) + 0.5));
    // …on the number the MARKS were placed with, not on the strike. THE LINE BOILS AND THE TONE
    // DOES NOT (the door does exactly this: its pen re-rolls six times a second while its
    // rain-strokes and its bristles stay where they were put). Everything downstream of huv
    // decides WHERE a mark goes — which run of a receding pattern survives, where a patch of
    // hatch ends raggedly — and moving any of it on the clock is not a boil, it is crawling
    // noise. Measured on a static crop of the shutters before this changed: 18.6% of the pixels
    // moved by more than 24 greys between one strike and the next, four fifths of it hatching.
    huv += (vec2(hash21(vec2(uPlaced, 1.0)), hash21(vec2(2.0, uPlaced))) - 0.5) * uHatchBoil;
  }
  vec4 hTile = bg ? vec4(0.0) : (up ? texture(tFloor, huv) : texture(tWall, huv));

  // ── lines: a soft field from the seed map, thresholded by pen pressure → one pen, one weight ──
  // ONE NIB. The mark is every pixel within a nib's radius of a seed — a distance, not a blur.
  // What this replaced summed the seeds under a gaussian and thresholded the sum, which makes the
  // width depend on how much seed happens to be nearby: a lone contour on the back wall came out a
  // hair, and a moulding whose geometry and whose texture both ask for a line came out as a bar.
  // Measured against the folio at a matched scale, that gave us a stroke whose median was 5–6 px
  // where the film's is 4 and whose distribution had a long tail at 6–10 px that the film simply
  // does not have — thick-and-thin, the one thing STYLE §1.2 forbids outright. Raising the old
  // threshold could not fix it either: it took the width off the strong lines and rubbed the weak
  // ones out altogether, so the cornice arrived as a dotted line. A radius sets the width once and
  // every line gets it, however its seeds fell.
  // ROUND 5, and this is the whole round. "No grey" is a rule about TONE — a mark is ink or it is
  // paper, there is no grey wash — and round 4 applied it to the RASTER as well: the distance field was the
  // distance from one pixel centre to another, so it could only ever be 0, 1, 1.41, 2…, the mark's
  // boundary could only ever land on the lattice, and the ramp across it collapsed onto two fixed
  // greys. Measured: our contour pass put 4.4% of the frame at grey 96–127 and 3.5% at 128–159 and
  // NOTHING anywhere else in the mid range, against a folio that spreads 2.7–3.2% evenly across
  // every band from 64 to 224. That is not a pen on paper; it is a 1 px stair-stepped raster of a
  // vector, which is what the round-4 critic saw and ranked the film's worst fault.
  //
  // A pen does not sit on the pixel lattice. the sub-pixel offset is where the nib actually is inside the pixel —
  // a smooth sub-pixel drift, half a pixel either way over about thirty — so the distance to it is
  // a CONTINUOUS number, the boundary lands at a different fraction of a pixel along the line's
  // length, and the coverage that comes out of it is a real anti-aliased edge. It is the same hand
  // wobble the edge pass already applies at 90 px; this is its last half pixel.
  //
  // And the mark itself is now stated as COVERAGE of the pixel by a nib of radius R, not as a
  // threshold on a distance: clamp(R + 0.5 - d) is the exact area a disc of radius R covers of a
  // pixel whose centre is d away, so the stroke carries 2R pixels of ink per unit length however
  // its seeds fell, with a soft pixel at each shoulder and nothing quantised anywhere.
  float line = 0.0, halo = 0.0;
  if (drawMode != 2) {
    // ROUND 7 cut this from 1.15 px to a third of that. It was round 5's answer to a mark whose
    // boundary could only land on the pixel lattice: shift the nib about inside the pixel and the
    // boundary lands at a different fraction of a pixel along the line's length, which is a real
    // anti-aliased edge. Step 2 below now gives the line a genuine sub-pixel position of its own,
    // so that job is done properly and what is left of this is a POSITION ERROR — half a pixel of
    // wander at a 31 px wavelength that the hand did not ask for. Measured against the door, whose
    // line stands 0.43 px off straight, ours stood 1.0 px off with the pen's own wander switched
    // off entirely; this was most of the difference. A whisper of it stays, because the nib really
    // does sit somewhere inside the pixel.
    vec2 sub = (vec2(vnoise(cssPx / 31.0 + uSeed * 2.7),
                     vnoise(cssPx / 31.0 + vec2(37.0, 11.0) + uSeed * 2.7)) - 0.5) * 0.38;
    // 1. WHICH STROKE IS THIS PIXEL NEAREST TO, and what does the edge pass know about it.
    float nearest = 9.0, bestTh = 0.0, bestW = 1.0;
    vec2 bestOff = vec2(0.0);
    for (int j = -3; j <= 3; j++) for (int i = -3; i <= 3; i++) {
      vec2 off = vec2(float(i), float(j));
      if (dot(off, off) > 9.5) continue;
      vec4 e = texture(tEdge, vUv + off * uDpr / uRes);
      if (e.r < 0.05) continue;
      // e.g carries the line's own weight (type × the material's lineWeight): a cut-out that asks
      // for a quarter-weight outline gets a quarter of the radius, and nothing else varies.
      float d = length(off - sub);
      if (d < nearest) { nearest = d; bestOff = off; bestTh = e.b; bestW = max(e.g, 0.12); }
    }
    if (nearest < 3.4) {
    // 2. AND WHERE DOES IT ACTUALLY RUN, to a fraction of a pixel.
    //
    // ROUND 7, and this is the round. The seed map is BINARY AND ON THE PIXEL LATTICE: an edge at
    // y = 100.3 lights the pixels at y = 100 and the mark comes out centred at 100.0, and an edge
    // at a shallow angle lights a staircase of runs — twelve pixels at y = 100, then twelve at
    // y = 101. The distance to that set is itself a staircase, so every near-horizontal and
    // near-vertical contour in the room arrived with 1 px jogs in it every few pixels. Cropped at
    // 3x beside the entrance door — which is drawn with real polylines and has none — that jog is
    // the single loudest difference between the two hands, louder than the width. It is what
    // "the room looks like a raster of a vector and the door looks drawn" actually means.
    //
    // A pen does not sit on the lattice, so stop asking the lattice where the line is. Every seed
    // within reach that belongs to THIS stroke — same tangent, same standing-off — votes on where
    // its line lies, weighted by how far along the stroke it sits, and the mark is laid about the
    // average. Seven or eight votes from a staircase of runs average their ±0.5 px lattice errors
    // down to about ±0.12 px, and — this is the point — the answer moves CONTINUOUSLY as the pixel
    // moves. The jog does not shrink; it stops existing.
    float th = bestTh * 3.14159265;
    vec2 tg = vec2(cos(th), sin(th));
    vec2 nrm = vec2(-tg.y, tg.x);
    float p0 = dot(sub - bestOff, nrm);
    float psum = 0.0, wsum = 0.0;
    for (int j = -3; j <= 3; j++) for (int i = -3; i <= 3; i++) {
      vec2 off = vec2(float(i), float(j));
      if (dot(off, off) > 9.5) continue;
      vec4 e = texture(tEdge, vUv + off * uDpr / uRes);
      if (e.r < 0.05) continue;
      float dth = abs(e.b - bestTh);
      dth = min(dth, 1.0 - dth);
      if (dth > 0.13) continue;            // a line CROSSING this one does not vote on where it is
      vec2 v = sub - off;
      float p = dot(v, nrm);
      if (abs(p - p0) > 1.4) continue;     // nor does a parallel neighbour: that is another stroke
      float a = dot(v, tg);
      float g = exp(-a * a * 0.16);
      psum += p * g; wsum += g;
    }
    float perp = wsum > 0.0001 ? psum / wsum : p0;
    // THE FOOT OF THE STROKE: the point on the fitted line that this pixel stands square to. It is
    // the same point for every pixel across the stroke, it slides along the stroke as the pixel
    // does, and — this is the part that matters — it does not care which way round the tangent came
    // out. A contour's tangent is a DIRECTION WITHOUT A SIGN: the edge pass hands back an angle in
    // [0, PI), so tg and nrm turn over freely from one pixel to the next along a single line, and
    // anything keyed to them directly turns over with them. The first cut of the wander below was
    // keyed to the angle and to a signed standing-off, and it left a nub on every contour at every
    // pixel where the sign flipped. Keyed to the foot, there is nothing to flip.
    vec2 foot = cssPx - perp * nrm;
    // 3. THE HAND'S WANDER. The door's pen wanders ±0.6 line-widths at mid-span with a control
    // point every ~4 line-widths — a slow, long-wavelength wander, not high-frequency noise
    // (anything with a period near the line's own width reads as fur). What this pass had instead
    // was a wobble applied to the LOOKUP in the edge pass, at an 88 px scale: it slid whole regions
    // of the drawing about and left every contour exactly as straight — and exactly as staircased —
    // as it found it. Here the whole stroke drifts a little in the plane of the paper, and only the
    // part of that drift across its own line can be seen, which is what a hand's wander IS.
    vec2 wv = (vec2(vnoise(foot / 8.0 + uSeed * 4.3),
                    vnoise(foot / 8.0 + vec2(19.0, 7.0) + uSeed * 4.3)) - 0.5) * 2.0 * uPenWob;
    float wob = -dot(wv, nrm);
    // 4. AND NO TWO STROKES THE SAME WEIGHT. The door jitters each stroke's width by ×0.85–1.15
    // and that is most of why a drawing of it looks handmade: the three parallel lines of a
    // moulding are three different lines. This pass had ±7% over a SCREEN-SPACE drift, which is a
    // different thing entirely — it varies along a single stroke and gives two neighbours the same
    // weight, the opposite arrangement to a pen's. On the foot it varies where the door's varies:
    // a fresh weight every 14 px of stroke, and two contours 4 px apart never the same.
    float R = uLineBase * bestW * (1.0 - uPenJit + 2.0 * uPenJit
            * vnoise(foot / 14.0 + uSeed * 1.9 + 31.0));
    // …and the width of the shoulder, in pixels. A nib is not a cookie cutter: ink runs into the
    // paper's fibre and the scan of it softens further, so the folio's contour is a narrow core
    // with a full pixel of shoulder either side. Measured on the kitchen folio at 1600 px: 8.1% of
    // the frame below grey 32 and 4.0% between 32 and 63 — a THIRD of its ink is in the shoulder.
    // The ramp is symmetric about R, so widening it moves ink from the core into the shoulder and
    // leaves the stroke's total mass (2R px per unit length) exactly where it was.
    float w = max(uLineSoft, 0.2) * bestW;
    // The mark is bounded ALONG the stroke as well as across it. A fitted line is infinite and the
    // thing it describes is not: without this the pen would run on past the end of a table leg for
    // as long as the tangent held. 0.8 px past the last seed and no further — what a pen genuinely
    // does at the end of a stroke is the overshoot pass's business, and it says so in seeds.
    float aEnd = max(abs(dot(sub - bestOff, tg)) - 0.8, 0.0);
    float dist = length(vec2(aEnd, perp + wob));
    line = clamp((R + w * 0.5 - dist) / w, 0.0, 1.0);
    // a hair of bare paper either side of every contour: the tone strokes stop short of the line
    halo = 1.0 - smoothstep(R + 0.7, R + 2.2, dist);
    // a pen that skips now and then
    float brk = vnoise(cssPx / 19.0 + uSeed * 5.1 + 40.0);
    line *= 1.0 - step(brk, uBreak) * 0.85;
    }
  }

  // ── ONE tone scale, four levels, and the darkest claim on a pixel wins ──────────────────────
  // The discipline of the folios is not "a little tone everywhere"; it is a few decisions. Most of
  // every surface is bare paper, three or four things in the frame are near-solid, and there is
  // almost nothing in between. Three parties may ask a pixel for tone:
  //   the LIGHT     a cast shadow, a pocket the broad lights cannot see, a form turning away
  //   the MATERIAL  a thing that is black in itself — a coat, a hole, an iron ornament
  //   the DRAWING   a pattern the frame has become too small to draw, which states the tone it
  //                 averages to instead of being smeared out as a mip-grey
  // They are combined with a MAX, never a product. A cloth with drawn folds still darkens where
  // the table's shadow falls across it; a shadow on a papered wall is not doubled by the motif.

  // The material's own darkness, in levels: 0.5 is plain paper, 0.625 → 1, 0.75 → 2, 0.875 → 3,
  // 0.95+ → solid. Materials have always declared this; the pass used to add it as a hundredth of
  // a threshold and so never heard it, which is why nothing in the set was ever black.
  float matLevel = floor(clamp((hatchW - 0.5) * 8.0, 0.0, 4.0));

  float lightLevel = 0.0;
  if (drawMode != 1 && !bg) {
    float L = softLit(vUv, 2.6 * uDpr / uRes);
    float shade = 1.0 - smoothstep(uTone.x, uTone.y, L);
    // where the set folds in on itself — under every shelf board, into the top corners, beside the
    // door architrave. Broad lights cannot see these pockets; a draughtsman hatches them every
    // time. Only a NEAR fold counts, so a figure standing well clear of a wall casts no ring.
    float pocket = 0.0;
    {
      float dc = linD(zc);
      vec2 r = 26.0 * uDpr / uRes;
      const float D = 0.7071;
      vec2 dirs[8] = vec2[8](vec2(1, 0), vec2(-1, 0), vec2(0, 1), vec2(0, -1),
                             vec2(D, D), vec2(-D, -D), vec2(D, -D), vec2(-D, D));
      for (int i = 0; i < 8; i++) {
        float rel = (dc - linD(texture(tDepth, vUv + dirs[i] * r).x)) / max(dc, 0.001);
        pocket += smoothstep(0.006, 0.030, rel) * (1.0 - smoothstep(0.10, 0.26, rel));
      }
      pocket = pocket * 0.125 * uPocket;
    }
    // A WALL seen almost edge-on is left bare and the contour does the work — the folios' frontal
    // interiors do exactly that with their side walls and the ceiling, and opening this up filled
    // both side walls with rain. But a surface that faces UP is a floor or a table top, and the
    // dense patch of shadow lying under a table is one of the few cast shadows the film does draw.
    // In a frontal set the floor is edge-on everywhere past a metre, so this test used to make a
    // shadow on the boards invisible and put the folios' dash-stroke floors out of reach.
    float edgeOn = up ? 1.0 : smoothstep(0.22, 0.58, facing);
    // How readily the material takes tone from the light. A curve, not a gate: 'hatch / 0.45'
    // clipped put plaster (0.12) and the ceiling (0.08) out of reach of ANY shadow however black —
    // precisely the surfaces a draughtsman hatches under a cornice or a picture rail — while a
    // shadow is a shadow whatever it falls on. So the low end is lifted (0.08 → 0.30, 0.12 → 0.53,
    // the wainscot 0.24 → 0.72) and only what genuinely refuses tone — glass at 0.04, a lit
    // lampshade, a flame — is cut away below 0.11. Plain paper (0.5) is still exactly 1.0, and
    // Pepe's cut-out asks for 0.02, which is BELOW the cut: he takes no tone from this pass at all,
    // deliberately (see pepe.js — he is a flat card facing the visitor, and one even density of
    // hatch edge to edge would be a grey wash). Plaster at 0.12 reads 0.42: a black shadow reaches
    // the first stroke level, a half
    // one does not, which is the difference between hatching under the cornice and greying a wall.
    float soak = smoothstep(0.03, 0.11, hatchW) * pow(clamp(hatchW / 0.5, 0.0, 1.0), 0.72);
    // The form turning away: a rim of strokes down the side of a round thing. It sits OUTSIDE
    // edgeOn — it is about the shape, not about the light — where multiplying it by edgeOn (which
    // is what 'soak' used to carry) meant it could never fire on the surfaces it is written for.
    float d = ((shade * uTone.z + pocket) * edgeOn + pow(1.0 - facing, 3.0) * uTone.w) * soak;
    // a hand does not follow a shadow's edge: break the boundary between levels on the stroke
    // grid so a patch of hatch ends raggedly, the way strokes of unequal length do
    float rag = vnoise(huv * 2.0 + uPlaced * 0.13) * 0.78 + vnoise(huv * 5.0 + 11.0) * 0.22;
    d += (rag - 0.5) * uLevels.w;
    lightLevel = step(uLevels.x, d) + step(uLevels.y, d) + step(uLevels.z, d);
  }

  // ── the drawing: its strokes where they can still be drawn, its tone where they cannot ──────
  // One pen, one pressure: a texture's stroke is ink or it is paper, never a grey. Two things used
  // to break that. A pattern minified below the pen — a wainscot's seams, a shutter's louvres, a
  // rug's border seen across the room — arrived as a flat mid-grey and was inked as a flat mid-
  // grey, which is how an even engraving gets laid over every square inch of the frame. And a
  // MASS (a coat, a cat, a hole) cannot be a pen-stroke at all. So: where the drawing is still
  // coarse enough to draw, its strokes are drawn at full ink; where it has closed up below the
  // pen, the pen stops and states the tone; where it is a mass, it is re-drawn on the stroke grid,
  // crowding to near-solid at the core and opening to cross-hatch at the rim so the silhouette
  // breaks into separate strokes instead of ending on a vector edge.
  // A black thing in the film is FILLED, not hatched: the man in the black suit at the card table,
  // the coats in the metro carriage — flat ink with a drawn edge, and the paper lines inside the
  // coat (its folds, its lapels) left as paper. Only a large dark AREA (the arch behind La Brique
  // Rouge) is built from crossing strokes. So above the fourth threshold the pen stops hatching
  // and fills, following the drawing's own shape at the pixel so those paper lines survive.
  float texLevel = 0.0, stroke = 0.0, blackArea = 0.0;
  if (!bg && !colorful) {
    // Only a drawing that is black AT THE SCALE IT IS DRAWN is filled. Once the frame has minified
    // a surface its albedo is an average of ink and paper, and the average of a well-drawn object
    // — a bottle with its outline and its label, a book with its spine type — passes 0.64 long
    // before the object is anywhere near black. That is how a whole shelf across the room arrived
    // as one solid blot with its lettering swallowed. So the bar for a flat fill rises with the
    // minification: close to, a coat at 0.64 is a coat; across the room only what is still ink at
    // 0.93 is filled, and everything between is hatched like the mass it is.
    // ROUND 6, and this was the blot the user saw. The wash is an AVERAGE over 5.5 px, and an
    // average cannot tell a black mass from a drawing of stripes: a radio's louvred grille, a shelf
    // label's block of type, a book's spine, the ticks on a dial all average past the bar and were
    // FILLED — which is why the sideboard arrived with its lettering gone and its grille as five
    // black bars. A pen tells them apart by looking at the paper, not at the average: in a black
    // mass there is no paper within reach of the nib, and in a drawing there always is. tightLo is
    // the lightest thing within 1.8 px — a nib's reach — so this asks the question. A fold or
    // a lapel drawn in paper INSIDE a black coat still stops the fill, which is what it should do:
    // the film leaves those lines as paper (STYLE §1.3, the coats in the metro carriage).
    float noPaperNear = smoothstep(0.30, 0.52, tightLo);
    blackArea = step(mix(uTex.w, 0.93, smoothstep(1.0, 5.0, minif)), wash) * noPaperNear;
    // A stroke is drawn when it still stands clear of its field and is still dark enough to be a
    // stroke. As the drawing recedes the pen does not draw the same marks fainter — it draws
    // FEWER of them, at the same weight, and leaves the paper between: so what a receding pattern
    // loses is whole runs of strokes, chosen on the same world-anchored grid the hatching uses.
    // One pen, one pressure, all the way to the back wall.
    // Neither gate is allowed to FADE a mark — a half-drawn stroke is a grey, and there are no
    // greys. Both drop whole marks instead, dithered on the same world-anchored grid the hatching
    // uses, so what recedes loses runs of strokes at full weight and keeps the paper between.
    // …and when the drawing has closed up completely the pen stops ENTIRELY. At 0.92 one mark in
    // twelve survived a pattern that was no longer a pattern, and a dozen unconnected dashes left
    // on an otherwise bare cloth do not read as a weave, they read as flecks of dirt — which is
    // what the round-4 critic found in the card inserts. Fewer marks at full weight is the rule;
    // stragglers are not marks.
    float keep = step(1.0 - resolved, vnoise(huv * 2.4 + 17.0));
    float draw = step(1.0 - drawable, vnoise(huv * 3.7 + 41.0));
    // ONE PEN, ONE PRESSURE — and this is where that was being broken. A mark whose ink the frame
    // has averaged half-way into its paper (a bottle's VIN, a book's PROVERBES, a doormat's
    // BIENVENUE — every letter in the set is 3–5 px tall from the door) came through this line as
    // a ramp and was laid down as a MID GREY. That is the smudge: not a missing mark, a mark drawn
    // at half pressure, which the world's rules forbid outright and which reads at a glance as a
    // dirty rectangle where a word should be.
    // A hand does not do that. It looks at the label, sees which marks are darker than the paper
    // AROUND THEM, and inks those at full weight — the letters lose their shapes long before they
    // lose their order, which is why the film's small signage is a row of black ticks in a white
    // plaque (the CADAZIO door plate, ~10 px) and never a grey box. So: a mark is ink if it is
    // darker than the midpoint of its own nib-wide field, or dark in absolute terms; otherwise it
    // is paper. Never anything between.
    float con = tightHi - tightLo;                      // is there a mark here at all, or one flat field?
    // …and where the paper ends and the mark begins. ROUND 6: at the MIDDLE of that field, which is
    // what round 5 used, exactly half of every plaque is darker than the threshold and is inked —
    // and on a label whose letters cover a third of it, "half the plaque" is a black rectangle with
    // the letters lost inside. A drawn mark is not half its neighbourhood; it is the dark core of
    // it. Sliding the threshold a fraction of the way toward the darkest thing within a nib keeps
    // every real stroke (its own core is that darkest thing, so it always passes) and gives the
    // halo of nearly-paper around it back to the paper. This is what lets VIN read as VIN.
    float mid = mix((tightHi + tightLo) * 0.5, tightHi, uTexBias);
    // ROUND 5. The decision above is right and stays; what was wrong was the RASTER of it. a hard step
    // is a hard threshold, so this pass laid down 6.2% of the frame as pure black with 0.01% of a
    // shoulder anywhere — a bitmap of a drawing, not a drawing. The mark in the map is already a
    // rasterised pen stroke with its own soft pixel at the edge; the pass's job is to restate it at
    // full pressure, not to re-quantise it. So the threshold becomes a CONTRAST STRETCH about the
    // same midpoint: the mark's core goes to full ink, the paper beside it goes to full paper, and
    // only the half pixel where the stroke's own edge falls stays between. That is the anti-alias
    // the film's line has and the "grey wash" the world's rules forbid is still gone, because a
    // flat mid field never passes the contrast gate at all.
    // The ramp is the mark's OWN soft pixel restated, and no wider. Round 5 spread it over 0.29 of
    // the darkness range at full contrast, which is most of the range: every louvre and every
    // letter stem then carried a grey skirt a pixel and a half out, and a grey skirt on a mark two
    // pixels wide IS the blur. It rides on uLineSoft so the drawn marks and the pen's own contour
    // keep the same edge; both narrowed this round.
    float aa = max(0.042 * uLineSoft, con * 0.15 * uLineSoft);
    float lo = min(mid, uTexPen.w);
    // How much contrast a drawing must still have HERE before the pen will copy it out. This is the
    // measurement that says whether there is a mark left at all: a drawn line the frame has shrunk
    // to a quarter of a pixel does not arrive as a thin line, it arrives as the average of itself
    // and the paper either side, and the average wobbles from pixel to pixel with the mip filter —
    // which is the field of dirt strewn beside every contour on the door leaf, the flecks in the
    // cloth's weave and the smudge on a card seen from across the room. Measured at home: the door
    // leaf runs at 4.3 texels a pixel, the cloth and the rug at 3.8–4.0, so their one-texel marks
    // are a fifth of a pixel wide and there is nothing there a nib could put down. Below this the
    // pen stops copying and leaves the paper bare — the wash path below still states the TONE the
    // pattern averages to, which is the choice a draughtsman makes at that distance.
    float local = step(uTexPen.z, con) * smoothstep(lo - aa, lo + aa, tHere);
    // and every mark must have a neighbour — see tightNbr above. A letter's stem, a louvre bar, a
    // floorboard seam all run on into the next pixel; a filter artefact does not.
    float support = smoothstep(lo - 0.02, lo + 0.07, tightNbr);
    stroke = max(local, smoothstep(uTexPen.w - aa, uTexPen.w + aa, tHere)) * support * keep * draw;
    // …and what the pen can no longer draw — because the marks have closed up OR because they have
    // shrunk under the nib — states its tone instead of being smeared out as a grey. Below the
    // first threshold it states nothing: the pen would not have made a mark that small, and the
    // paper stays bare. That is what strips the upper wall, the wainscot, the boards, the middle of
    // the cloth, and now the far shelves' labels — a pale label averages to nothing and goes blank,
    // a striped coat averages to a tone and is hatched, which is the choice a draughtsman makes.
    float washLevel = step(uTex.x, wash) + step(uTex.y, wash) + step(uTex.z, wash);
    // A pattern that has CLOSED UP states everything it averages to. A drawing that has merely got
    // too SMALL states only what is genuinely dark, one level lower: a hand faced with type it
    // cannot write leaves the plate blank, but still darkens a striped coat across the room.
    texLevel = (1.0 - blackArea) * max((1.0 - resolved) * washLevel, (1.0 - drawable) * max(washLevel - 1.0, 0.0));
  } else if (!bg && colorful && uColorInk > 0.5) {
    // THE COLOURED THINGS ARE DRAWN WITH THE SAME PEN. STYLE §1.4: the Aline frames are ink
    // drawings with flat colour laid UNDER the line and the hatch drawn over the fill — the line
    // is never a coloured line. Everything above ran only on the paper-white set, so a coloured
    // cut-out's own drawn contour came through as raw albedo: a soft two-pixel mid-grey-to-olive
    // line against the room's black, which is precisely why the puppet reads as a sticker laid on
    // the drawing rather than as part of it. So the drawn marks INSIDE a coloured surface get the
    // same treatment its neighbours get — restated at the pen's own value where they are still
    // marks, left alone where they are colour.
    // Two gates keep the COLOUR out of it. A mark must be achromatic: a fill, however dark, has
    // chroma and stays exactly as painted, so a card's red robe or a green face is never inked
    // over. And a mark must stand clear of its own field, so a flat area of colour — which has no
    // contrast at a nib's width — is left alone whatever its value.
    // …with the same nib and the same threshold as the paper-white set: one pen everywhere.
    float con = tightHi - tightLo;
    float mid = mix((tightHi + tightLo) * 0.5, tightHi, uTexBias);
    float aa = max(0.042 * uLineSoft, con * 0.15 * uLineSoft);
    float sat = max(max(alb.r, alb.g), alb.b) - min(min(alb.r, alb.g), alb.b);
    float achromatic = 1.0 - smoothstep(0.20, 0.42, sat);
    float support = smoothstep(mid - 0.02, mid + 0.07, tightNbr);
    stroke = step(uTexPen.z, con) * smoothstep(mid - aa, mid + aa, tHere)
           * achromatic * support * drawable;
  }
  if (drawMode == 1) { texLevel = 0.0; matLevel = 0.0; blackArea = 0.0; } // lines-only: no tone
  if (drawMode == 2) stroke = 0.0;                                        // tone-only: no line work

  float solid = max(step(0.84, hatchW),                          // the MATERIAL is a black thing
                    blackArea * smoothstep(0.22, 0.48, tHere));   // the DRAWING is black here

  float level = max(max(lightLevel, texLevel), matLevel);
  if (solid > 0.5) level = 4.0;
  float cov = level > 3.5 ? hTile.a : level < 1.5 ? hTile.r : level < 2.5 ? hTile.g : hTile.b;
  // A HATCH STROKE IS A DRAWN LINE AND KEEPS ITS OWN SOFT PIXEL — the same rule the contour lives
  // by, applied to the tone. The tile already holds strokes the pen drew with anti-aliased edges;
  // re-thresholding them over a 0.30-wide window threw that edge away and laid the tone down as a
  // bitmap. Measured, our hatching put 2.2% of the frame at pure black and 1.3% anywhere in the
  // mid range, where the folio spreads 14.7% across it and gets there almost entirely from strokes.
  // Widening the window hands each stroke its shoulder back; it does not make a grey wash, because
  // the tile between strokes is bare paper and stays bare.
  float tone = level > 0.5 ? smoothstep(0.24, 0.72, cov) * (level > 3.5 ? 1.0 : 1.0 - halo) : 0.0;
  if (level > 3.5) tone = max(tone, solid * (1.0 - halo));

  vec3 base = (drawMode == 0 && !bg && colorful) ? alb.rgb : uPaper;
  if (uMode == 9) stroke = 0.0;              // probe: the pen's contours alone
  if (uMode == 10) line = 0.0;               // probe: the surfaces' own drawn marks alone
  float ink = max(line, max(tone, stroke));
  vec3 col = mix(base, uInk, ink);
  col *= paperGrain;
  outColor = vec4(col, 1.0);
}
`;

// ── despeckle: the last thing before the paper leaves the press ──────────────────────────────
// A pen cannot make a single dark pixel with paper on all four sides. It has a nib; every mark it
// puts down runs on into the pixel beside it. The folios measure 0.00% of their dark pixels
// isolated that way; round 4's frame measured 0.5–0.8%, and at full size that is a fine grit of
// black strewn along and beside every contour — a large part of what made the room read as a raster
// of a vector rather than as a drawing. The two passes above no longer manufacture it (the contour
// is coverage now, and a drawn mark must have a neighbour), but a minified map, a shadow boundary
// and a hatch tile can still each drop one, so this catches what is left: a dark pixel whose four
// orthogonal neighbours are all paper is given back to the paper it sits on. Nothing else is
// touched — a stroke, however short, has a dark neighbour and passes straight through.
export const DESPECKLE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tSrc;
uniform vec2 uRes;
uniform float uDpr;
in vec2 vUv;
layout(location = 0) out vec4 outColor;
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
void main() {
  vec3 c = texture(tSrc, vUv).rgb;
  vec2 o = uDpr / uRes;
  vec3 l = texture(tSrc, vUv - vec2(o.x, 0.0)).rgb;
  vec3 r = texture(tSrc, vUv + vec2(o.x, 0.0)).rgb;
  vec3 d = texture(tSrc, vUv - vec2(0.0, o.y)).rgb;
  vec3 u = texture(tSrc, vUv + vec2(0.0, o.y)).rgb;
  float g = lum(c);
  float m = min(min(lum(l), lum(r)), min(lum(d), lum(u)));
  // the window is cut where the measurement is: "dark" is grey 128 and below, "paper" is 224 and
  // above, so a pixel this pass leaves half-caught still counts against us
  float lone = (1.0 - smoothstep(0.30, 0.50, g)) * smoothstep(0.74, 0.87, m);
  outColor = vec4(mix(c, (l + r + d + u) * 0.25, lone), 1.0);
}
`;
