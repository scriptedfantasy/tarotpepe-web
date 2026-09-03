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
  gMisc = vec4(dHi / 255.0, dLo / 255.0, 0.0, 1.0);
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
// Output: r = seed (0/1), g = thickness multiplier by type, b = tangent angle / PI, a = 1
export const EDGE_FRAG = /* glsl */ `
precision highp float;
precision highp int;
uniform sampler2D tDepth, tNorm, tMisc;
uniform vec2 uRes;
uniform float uNear, uFar, uSeed, uDpr, uWobble;
uniform float uDepthThr, uCreaseThr;
in vec2 vUv;
layout(location = 0) out vec4 outColor;
${NOISE}
${OCT}
float linD(vec2 uv) {
  float z = texture(tDepth, uv).x * 2.0 - 1.0;
  return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
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
  bool crease = dot(c.n, xp.n) < uCreaseThr || dot(c.n, yp.n) < uCreaseThr;
  bool idE = abs(c.id - xp.id) > 0.5 || abs(c.id - yp.id) > 0.5 || abs(c.m - xp.m) > 0.002 || abs(c.m - yp.m) > 0.002;
  float seed = 0.0, type = 0.0;
  if (crease) { seed = 1.0; type = 0.78; }
  if (idE) { seed = 1.0; type = 0.95; }
  if (sil) { seed = 1.0; type = 1.0; }
  // tangent: perpendicular to the gradient of a scalar that jumps at every kind of edge
  float gx = feat(xp) - feat(xm);
  float gy = feat(yp) - feat(ym);
  vec2 tg = vec2(-gy, gx);
  float th = atan(tg.y, tg.x);
  if (th < 0.0) th += 3.14159265;
  if (th >= 3.14159265) th -= 3.14159265;
  outColor = vec4(seed, type, th / 3.14159265, 1.0);
}
`;

// Overshoot: a pen runs a little past the end of a line. For a pixel just beyond the end of a
// line (found by marching back along one of 8 directions), copy the seed forward.
export const EXTEND_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tEdge;
uniform vec2 uRes;
uniform float uDpr, uSeed, uOvershoot;
in vec2 vUv;
layout(location = 0) out vec4 outColor;
${NOISE}
void main() {
  vec4 e = texture(tEdge, vUv);
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
uniform int uMode;          // 0 all, 1 lines only, 2 tone only
uniform mat4 uInvVP;
uniform vec3 uInk, uPaper;
uniform vec4 uLevels;       // darkness thresholds for tone levels 1..4
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
  if (uMode >= 3) {
    vec3 dbg = vec3(0.0);
    if (uMode == 3) dbg = alb.rgb;
    else if (uMode == 4) dbg = octDecode(texture(tNorm, vUv).rg) * 0.5 + 0.5;
    else if (uMode == 5) dbg = vec3(fract(linD(texture(tDepth, vUv).x) / 8.0));
    else if (uMode == 6) dbg = texture(tLit, vUv).rgb;
    else if (uMode == 7) { vec4 e = texture(tEdge, vUv); dbg = vec3(1.0 - e.r, 1.0 - e.r * e.g, 1.0 - e.r * (1.0 - e.b)); }
    else if (uMode == 8 || uMode == 9) {
      // the tiles at true scale: four levels left→right, wall set top, floor set bottom
      vec2 tuv = cssPx / 512.0;
      int lv = int(floor(cssPx.x / (uRes.x / uDpr / 4.0)));
      vec4 h = (cssPx.y < uRes.y / uDpr * 0.5) ? texture(tWall, tuv) : texture(tFloor, tuv);
      float cov = lv == 0 ? h.r : lv == 1 ? h.g : lv == 2 ? h.b : h.a;
      dbg = mix(uPaper, uInk, smoothstep(0.3, 0.7, cov)) * paperGrain;
    }
    outColor = vec4(dbg, 1.0);
    return;
  }
  int packed = int(alb.a * 255.0 + 0.5);
  bool colorful = packed >= 128;
  float hatchW = float((packed >> 3) & 15) / 14.0;
  float zc = texture(tDepth, vUv).x;
  bool bg = zc >= 0.99999;

  // ── lines: dilate the seed map with a pressure-varying radius ──
  float line = 0.0;
  if (uMode != 2) {
    float pressure = 0.72 + 0.68 * vnoise(cssPx / 120.0 + uSeed * 3.3);
    for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
      vec2 off = vec2(float(i), float(j));
      float r = length(off);
      if (r > 2.1) continue;
      vec2 q = vUv + off * uDpr / uRes;
      vec4 e = texture(tEdge, q);
      if (e.r < 0.5) continue;
      int pk = int(texture(tAlbedo, q).a * 255.0 + 0.5);
      float lw = 0.5 + float(pk & 7) * 0.25;
      float w = uLineBase * pressure * e.g * lw;
      line = max(line, e.r * (1.0 - smoothstep(w - 0.6, w + 0.6, r)));
    }
    // a pen that skips now and then
    float brk = vnoise(cssPx / 19.0 + uSeed * 5.1 + 40.0);
    line *= 1.0 - step(brk, uBreak) * 0.85;
  }

  // ── tone: the lit pass quantised into strokes ──
  float hatchInk = 0.0;
  if (uMode != 1 && !bg) {
    vec3 lit = texture(tLit, vUv).rgb;
    float L = lum(lit);
    float d = 1.0 - clamp(L / uLref, 0.0, 1.0);
    d *= hatchW * 2.0;
    float level = step(uLevels.x, d) + step(uLevels.y, d) + step(uLevels.z, d) + step(uLevels.w, d);
    // world position + normal → anchored stroke coordinates
    vec4 wp4 = uInvVP * vec4(vUv * 2.0 - 1.0, zc * 2.0 - 1.0, 1.0);
    vec3 wp = wp4.xyz / wp4.w;
    vec3 n = octDecode(texture(tNorm, vUv).rg);
    vec4 misc = texture(tMisc, vUv);
    float dl = misc.r + misc.g / 255.0;
    float dObj = 0.25 * exp2(dl * 8.0);
    vec3 an = abs(n);
    bool up = an.y > max(an.x, an.z);
    vec2 wuv = up ? wp.xz : (an.x > an.z ? wp.zy : wp.xy);
    if (!up && an.x > an.z && n.x < 0.0) wuv.x = -wuv.x; // keep handedness so strokes lean the same way
    if (!up && an.x <= an.z && n.z < 0.0) wuv.x = -wuv.x;
    vec2 huv = wuv * (uHatchK / dObj);
    huv += (vec2(hash21(vec2(uSeed, 1.0)), hash21(vec2(2.0, uSeed))) - 0.5) * uHatchBoil;
    vec4 hw = texture(tWall, huv);
    vec4 hf = texture(tFloor, huv);
    vec4 h = up ? hf : hw;
    float cov = level < 0.5 ? 0.0 : level < 1.5 ? h.r : level < 2.5 ? h.g : level < 3.5 ? h.b : h.a;
    hatchInk = smoothstep(0.3, 0.7, cov);
  }

  // ── ink that lives in a texture (a wallpaper motif, a card back) ──
  float texInk = 0.0;
  vec3 base = uPaper;
  if (uMode == 0 && !bg) {
    if (colorful) base = alb.rgb;
    else texInk = smoothstep(0.06, 0.5, 0.95 - lum(alb.rgb));
  }

  float ink = max(line, max(hatchInk, texInk));
  vec3 col = mix(base, uInk, ink);
  col *= paperGrain;
  outColor = vec4(col, 1.0);
}
`;
