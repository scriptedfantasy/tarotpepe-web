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
uniform float uPacked;   // colorful*128 + hatchIdx*8 + lineIdx, already /255
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
  vec4 tex = uHasMap > 0.5 ? texture(uMap, vUv) : vec4(1.0);
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
  gMisc = vec4(dHi / 255.0, dLo / 255.0, clamp(log2(texels) / 8.0 + 0.25, 0.0, 1.0), 1.0);
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
float lwAt(vec2 uv) {
  int pk = int(texture(tAlbedo, uv).a * 255.0 + 0.5);
  return float(pk & 7) * 0.25;
}
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
  float seed = 0.0, type = 0.0;
  if (crease) { seed = 1.0; type = mix(0.72, 0.95, clamp((1.0 - dotMin) / 0.7, 0.0, 1.0)); }
  if (idE) { seed = 1.0; type = 0.95; }
  if (sil) { seed = 1.0; type = 1.0; }
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
uniform float uDpr, uSeed, uOvershoot, uMerge;
in vec2 vUv;
layout(location = 0) out vec4 outColor;
${NOISE}
void main() {
  vec4 e = texture(tEdge, vUv);
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
        // Touching equals are a different matter — that is one seed two pixels thick, where a
        // shallow diagonal staircases — and thinning it to one is what keeps the nib's width the
        // nib's, so at s == 1 an equal is merged as well.
        if (q.g > e.g + 0.06 || (s == 1 && q.g > e.g - 0.02 && k == 0)) { outColor = vec4(0.0); return; }
      }
    }
  }
  if (e.r > 0.5 || uOvershoot < 0.5) { outColor = e; return; }
  vec2 dirs[8];
  dirs[0] = vec2(1, 0); dirs[1] = vec2(0, 1); dirs[2] = vec2(-1, 0); dirs[3] = vec2(0, -1);
  dirs[4] = vec2(0.7071, 0.7071); dirs[5] = vec2(-0.7071, 0.7071); dirs[6] = vec2(-0.7071, -0.7071); dirs[7] = vec2(0.7071, -0.7071);
  vec4 best = vec4(0.0);
  vec2 stepPx = 1.4 * uDpr / uRes;
  for (int k = 0; k < 8; k++) {
    vec2 d = dirs[k];
    for (int s = 1; s <= 4; s++) {
      vec2 p = vUv - d * stepPx * float(s);
      vec4 q = texture(tEdge, p);
      if (q.r > 0.5) {
        float th = q.b * 3.14159265;
        vec2 tg = vec2(cos(th), sin(th));
        if (abs(dot(tg, d)) > 0.975) {
          vec2 pp = vec2(-d.y, d.x);
          // a pixel beside a line is not past its end; the line must run on behind the hit
          bool beside = texture(tEdge, vUv + pp * stepPx).r > 0.5 || texture(tEdge, vUv - pp * stepPx).r > 0.5;
          bool runs = texture(tEdge, p - d * stepPx).r > 0.5 && texture(tEdge, p - d * stepPx * 2.0).r > 0.5;
          float run = 1.0 + floor(hash21(floor(p * uRes / (6.0 * uDpr)) + uSeed * 0.37) * 4.0);
          if (!beside && runs && float(s) <= run) { best = q; best.r = 0.9; }
        }
        break;
      }
    }
  }
  outColor = best;
}
`;

export const COMPOSITE_FRAG = /* glsl */ `
precision highp float;
precision highp int;
uniform sampler2D tAlbedo, tNorm, tMisc, tDepth, tLit, tEdge, tWall, tFloor, tPaper;
uniform vec2 uRes;
uniform float uDpr, uSeed, uNear, uFar, uHatchK, uLref, uLineBase, uBreak, uPaperAmt, uHatchBoil;
uniform float uPocket;      // how much a fold in the set darkens: under a ledge, into a corner
uniform vec4 uTex;          // the wash a drawn pattern must reach for tone 1/2/3, then for a fill
uniform vec4 uTexPen;       // texels/px where a drawn mark stops being drawable (lo, hi), then the
                            // darkness a mark must reach to be ink at all (lo, hi)
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
  float tHere = 1.0 - lum(alb.rgb);
  {
    const float D = 0.7071;
    vec2 dirs[8] = vec2[8](vec2(1, 0), vec2(-1, 0), vec2(0, 1), vec2(0, -1),
                           vec2(D, D), vec2(-D, -D), vec2(D, -D), vec2(-D, D));
    vec2 r0 = 5.5 * uDpr / uRes;
    for (int i = 0; i < 8; i++) {
      float dk = 1.0 - lum(texture(tAlbedo, vUv + dirs[i] * r0).rgb);
      wash += dk;
      ringLo = min(ringLo, dk);
      ringHi = max(ringHi, dk);
    }
    wash = (wash + tHere) / 9.0;
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
    huv += (vec2(hash21(vec2(uSeed, 1.0)), hash21(vec2(2.0, uSeed))) - 0.5) * uHatchBoil;
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
  float line = 0.0, halo = 0.0;
  if (drawMode != 2) {
    float nearest = 9.0;
    for (int j = -3; j <= 3; j++) for (int i = -3; i <= 3; i++) {
      vec2 off = vec2(float(i), float(j));
      float d2 = dot(off, off);
      if (d2 > 9.0) continue;
      vec4 e = texture(tEdge, vUv + off * uDpr / uRes);
      if (e.r < 0.05) continue;
      // e.g carries the line's own weight (type × the material's lineWeight): a cut-out that asks
      // for a quarter-weight outline gets a quarter of the radius, and nothing else varies.
      nearest = min(nearest, sqrt(d2) / max(e.g, 0.12));
    }
    // the hand's pressure: ±8% over a slow drift, not the ±40% a real threshold noise gives
    float R = uLineBase * (0.93 + 0.14 * vnoise(cssPx / 120.0 + uSeed * 3.3));
    // The edge of the mark is a pixel of irregularity, not a blur (STYLE §3, "post"): the ramp is
    // biased inward so the nib's own width is solid ink and only the last half pixel is soft.
    line = 1.0 - smoothstep(R - 0.55, R + 0.35, nearest);
    // a hair of bare paper either side of every contour: the tone strokes stop short of the line
    halo = 1.0 - smoothstep(R + 0.7, R + 2.2, nearest);
    // a pen that skips now and then
    float brk = vnoise(cssPx / 19.0 + uSeed * 5.1 + 40.0);
    line *= 1.0 - step(brk, uBreak) * 0.85;
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
    float rag = vnoise(huv * 2.0 + uSeed * 0.13) * 0.78 + vnoise(huv * 5.0 + 11.0) * 0.22;
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
    blackArea = step(mix(uTex.w, 0.93, smoothstep(1.0, 5.0, minif)), wash);
    // A stroke is drawn when it still stands clear of its field and is still dark enough to be a
    // stroke. As the drawing recedes the pen does not draw the same marks fainter — it draws
    // FEWER of them, at the same weight, and leaves the paper between: so what a receding pattern
    // loses is whole runs of strokes, chosen on the same world-anchored grid the hatching uses.
    // One pen, one pressure, all the way to the back wall.
    // Neither gate is allowed to FADE a mark — a half-drawn stroke is a grey, and there are no
    // greys. Both drop whole marks instead, dithered on the same world-anchored grid the hatching
    // uses, so what recedes loses runs of strokes at full weight and keeps the paper between.
    float keep = step((1.0 - resolved) * 0.92, vnoise(huv * 2.4 + 17.0));
    float draw = step(1.0 - drawable, vnoise(huv * 3.7 + 41.0));
    stroke = smoothstep(uTexPen.z, uTexPen.w, tHere) * keep * draw;
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
  }
  if (drawMode == 1) { texLevel = 0.0; matLevel = 0.0; blackArea = 0.0; } // lines-only: no tone
  if (drawMode == 2) stroke = 0.0;                                        // tone-only: no line work

  float solid = max(step(0.84, hatchW),                          // the MATERIAL is a black thing
                    blackArea * smoothstep(0.22, 0.48, tHere));   // the DRAWING is black here

  float level = max(max(lightLevel, texLevel), matLevel);
  if (solid > 0.5) level = 4.0;
  float cov = level > 3.5 ? hTile.a : level < 1.5 ? hTile.r : level < 2.5 ? hTile.g : hTile.b;
  float tone = level > 0.5 ? smoothstep(0.32, 0.62, cov) * (level > 3.5 ? 1.0 : 1.0 - halo) : 0.0;
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
