// PIECE: ink — the look. Turns the 3D scene into a pen drawing on paper: outlines with a hand's
// wobble, tone built from hatching strokes (never gradients), flat selective colour (materials
// flagged userData.ink.colorful keep their colour; everything else is paper white), a paper
// ground, a gentle line "boil" on the 12fps clock, an optional paper-white letterbox.
// Owns the final render. API: render(ctx), setState(name), params, setLetterbox(ratio|null).
//
// Passes per frame (all WebGL2, no EffectComposer):
//   1. G-buffer  scene with an override ShaderMaterial (per-object uniforms via onBeforeRender):
//                albedo (sRGB) + packed flags | octahedral world normal + 16-bit object id |
//                object→camera distance. Depth via the target's depthTexture.
//   2. Lit       scene with a white MeshStandardMaterial override, real lights + shadows → tone.
//   3. Edge      seeds from depth (silhouettes), normals (creases), id/distance (boundaries),
//                sampled through a low-frequency wobble re-seeded on twos. Also a tangent.
//   4. Extend    the pen overshoots a little past line ends (corners cross).
//   5. Composite lines (pressure-varied dilation, occasional skips), tone quantised to 4 stroke
//                levels drawn with world-anchored hatch tiles, selective colour, paper grain.
import * as THREE from 'three';

// What the pen and the sheet actually are, sampled off the folios (STYLE.md §1.1 and §3): the
// paper is a cool, faintly green off-white, not a cream; the ink is a neutral near-black, not a
// warm brown-black. src/core/strokes.js now exports exactly these two (round 3 asked for it and it
// was done), so the canvases the other pieces draw on and the values this pass composites with
// agree; keep them in step if either moves.
const PAPER = '#f8f9f4';
const INK = '#0d0e0d';
import { makeTiles, makePaperGrain } from './ink-tiles.js';
import { GBUF_VERT, GBUF_FRAG, QUAD_VERT, EDGE_FRAG, EXTEND_FRAG, COMPOSITE_FRAG } from './ink-shaders.js';

export const meta = {
  name: 'ink',
  judge: { shot: 'home', states: ['default', 'lines-only', 'tone-only'] },
  files: ['src/pieces/ink.js', 'src/pieces/ink-tiles.js', 'src/pieces/ink-shaders.js'],
};

// The three judged states are default / lines-only / tone-only. The rest are probes: 3..8 show a
// buffer, 9 draws ONLY the pen's contours and 10 ONLY the ink that comes from the surfaces' own
// drawn marks — the two halves that "lines-only" adds together, and the pair a coverage
// measurement has to separate before it can say which half is overdrawing.
const MODES = { default: 0, 'lines-only': 1, 'tone-only': 2, 'debug-albedo': 3, 'debug-normal': 4, 'debug-depth': 5, 'debug-lit': 6, 'debug-edge': 7, 'debug-tiles': 8, 'debug-contour': 9, 'debug-texink': 10, 'debug-minif': 11 };

export async function build(ctx) {
  const { renderer, scene, camera } = ctx;
  scene.background = new THREE.Color(PAPER);

  // ── tunables (other pieces may nudge these through ctx.pieces.ink.params) ──
  const params = {
    // THE NIB, as a radius in css px: the mark is every pixel within it of a seed, so this IS the
    // half-width of every contour in the frame and nothing else changes it. STYLE §1.2 puts the
    // film's contour at ≈2 px at 1080p and near-constant.
    // Measured (tools/_ink-pen.mjs, every image resampled to 1600 px wide, min-run thickness over
    // every ink pixel) against the kitchen folio: the film's stroke is mode 3 px, median 4, with
    // only 6% of its ink one pixel wide. At 1.05 ours was mode 1 with THIRTY-THREE per cent of the
    // ink one pixel wide — a hairline with a grey shoulder, which is thick-and-thin by another
    // route and reads as a scratch. The width is quantised (a seed pixel plus whatever the radius
    // reaches), so 1.05 draws 1 px and 1.15 draws 3; there is no 2. At 1.15 the whole distribution
    // lands on the film's: mode 3, 6% at one pixel, ink 21.7% of the frame against its 19.9%, and
    // solid ink (below 70) 12.6% against its 12.7%. It costs 2.5 points of clean paper and it is
    // the correct pen; the paper is bought back by drawing FEWER lines (see `thin`), never thinner.
    lineBase: 1.15,
    wobble: 0.9, // css px of hand drift
    breakAmt: 0.03, // how often the pen skips (0 = never)
    overshoot: 1, // 0/1 line ends run past corners
    // px within which two PARALLEL contours are one contour and only the stronger is drawn.
    // 0 turns the merge off. See the note in EXTEND_FRAG: this is the doubled-line rule.
    merge: 4,
    // px within which two EQUAL parallel contours are one contour, because the paper between them
    // is thinner than a stroke: the two edges of a moulding, of a glazing bar, of a slat across the
    // room. Above this both are drawn. Bounded by `merge`, which is how far the search looks.
    thin: 3,
    depthThr: 0.012, // silhouette sensitivity (relative to depth)
    // cos of the fold angle that gets a line. A draughtsman inks a corner, not a soft bend: only
    // folds sharper than ≈53° are drawn, so lathed curves and cloth do not fill up with creases.
    creaseThr: 0.6,
    // …and the same fold measured across three pixels instead of one. Only a fold still sharper
    // than ≈60° at the pen's scale is a corner; anything softer is a bead or a rim the frame has
    // shrunk below a stroke, and it is left to the silhouette.
    creaseWide: 0.5,
    lref: 0.5, // (unused now; kept for other pieces that may read it)
    // lit luminance: fully dark, fully lit; max darkness from light; grazing amount. With the
    // levels below a plain-paper material (hatch 0.5) is BARE above L≈0.10 — most of the room —
    // takes clumped rain to L≈0.055, dense strokes to L≈0.022, cross-hatch below. Nothing turns
    // solid black from want of light: solid ink is reserved for materials flagged hatch ≈ 1.
    tone: [0.0, 0.5, 1.0, 0.18],
    levels: [0.55, 0.82, 0.96, 0.14], // thresholds → tone levels 1..3; w = ragged level boundary
    // How much a fold in the set (under a ledge, into a corner) asks for strokes. In a set this
    // crowded a pocket sits behind every prop, so at 0.6 the pass put a ring of tone round each of
    // thirty objects and the tone stopped being a decision. Halved: the pen still hatches the
    // corners of the room and the underside of a shelf, and leaves the rest to the contour.
    pocket: 0.32,
    // A drawn pattern the frame has become too small to draw (a wainscot's seams across the room,
    // a shutter's louvres, a rug's border) is not smeared out as a mip-grey: below the first number
    // the pen simply stops drawing it and the paper stays bare — which is what strips the upper
    // wall, the wainscot and the middle of the cloth. Between the first and the last it states the
    // tone it averages to, on the same stroke grid as the light. Above the last it is a black AREA
    // (a coat, a cat, a doorway) and is filled flat, the way the film fills a black coat.
    texLevels: [0.34, 0.48, 0.58, 0.64],
    // The projected-size rule for a surface's OWN drawing, in texels of that drawing per screen
    // pixel (the G-buffer measures it) and then in how dark a mark must be to be ink at all.
    // Round 3 taught the pass to stop drawing a PATTERN it could no longer resolve, and the same
    // rule then swallowed the room's hand lettering, which is the one thing in the set that must
    // survive at any size. Measured on the props shot: the VOYANTE plate reads at 5.6 texels a
    // pixel, the TAROT placard at 8.3, the bottle labels at 3.5–13 and the book spines at 5.6–7.6
    // — so ANY gate that starts before ~9 deletes VIN, PROVERBES and BIENVENUE. It is a safety net
    // against a shutter's louvres smearing at fifty texels a pixel, not a way to buy clean paper.
    // The last pair is the pressure: one pen, so a mark is ink or it is paper. The lower number is
    // no longer a ramp's foot — the composite makes the call against the mark's OWN field — and
    // the upper one is the absolute floor above which anything is ink whatever its surroundings.
    texPen: [9, 20, 0.3, 0.5],
    // How much sharper than the hardware would the G-buffer looks at a surface's own drawing, in
    // mip levels. 0 is the trilinear average, which is where the lettering went: at the door's
    // distance VIN, PROVERBES and BIENVENUE are 3–5 px tall, the mip chain hands the pass a grey
    // rectangle, and a grey is the one thing the pen cannot draw. -1.25 halves the footprint, so
    // the marks come back as marks and the composite lays them down at full ink.
    texSharp: -1.25,
    paper: 0.55, // paper grain amount (the grain itself is already a whisper)
    hatchBoil: 0.003, // tile-units of hatch shiver on twos
    letterbox: null, // e.g. 1.85 → paper-white bars; null → none
  };

  // Tuning hook: any of the numbers above may be overridden from the URL as `ink.<name>=v` (a
  // vector as `a,b,c,d`), so a parameter can be swept with tools/shot.mjs without an edit-and-
  // reload per value. Nothing else reads these; the defaults above are what ships.
  for (const [k, v] of ctx.params ?? []) {
    if (!k.startsWith('ink.')) continue;
    const name = k.slice(4);
    if (!(name in params)) continue;
    params[name] = Array.isArray(params[name]) ? v.split(',').map(Number) : +v;
  }
  // …and `ink.debug=<mode>` shows one of the probe buffers under ANOTHER piece's camera, which is
  // how a measurement of what the pass sees at the shelves is taken from the props shot rather than
  // from ink's own home shot.
  const debugMode = ctx.params?.get?.('ink.debug');

  // ── textures drawn once ──
  // Nothing here is awaited. The hatch tiles come off the bake through ctx.assets, which is TRACKED
  // — main.js's `await ctx.assets.settle()` waits for them before the first judged frame — so the
  // tone is always there when a screenshot is taken, while ink's build no longer sits on a file
  // request. It used to: ink was the first piece in the build order to await one, and the dev
  // server's first static request costs 7 s on an idle machine and 41 s on a loaded one, which is
  // the whole of the "ink builds in 2.9–5.5 s" the critic measured. The real work is ~60 ms.
  const t0 = performance.now();
  const paperGrain = makePaperGrain(512);
  const { wall: wallTiles, floor: floorTiles, ready: tilesReady } = makeTiles(ctx);
  tilesReady.then(() => ctx.log(`ink tiles ready ${(performance.now() - t0).toFixed(0)}ms after the build started`));
  const white1x1 = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
  white1x1.needsUpdate = true;

  // ── render targets ──
  const size = new THREE.Vector2();
  let rt = null;
  function makeTargets(w, h) {
    if (rt) for (const t of Object.values(rt)) t.dispose?.();
    const depthTexture = new THREE.DepthTexture(w, h, THREE.UnsignedIntType);
    depthTexture.format = THREE.DepthFormat;
    const gbuf = new THREE.WebGLRenderTarget(w, h, { count: 3, depthTexture, depthBuffer: true, stencilBuffer: false });
    for (const t of gbuf.textures) {
      t.minFilter = t.magFilter = THREE.NearestFilter;
      t.generateMipmaps = false;
    }
    const lit = new THREE.WebGLRenderTarget(w, h, { depthBuffer: true, stencilBuffer: false });
    lit.texture.minFilter = lit.texture.magFilter = THREE.LinearFilter;
    lit.texture.generateMipmaps = false;
    const mk = () => {
      const t = new THREE.WebGLRenderTarget(w, h, { depthBuffer: false, stencilBuffer: false });
      t.texture.minFilter = t.texture.magFilter = THREE.NearestFilter;
      t.texture.generateMipmaps = false;
      return t;
    };
    rt = { gbuf, lit, edge: mk(), ext: mk() };
    size.set(w, h);
  }

  // ── G-buffer override material ──
  const gMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: GBUF_VERT,
    fragmentShader: GBUF_FRAG,
    uniforms: {
      uMap: { value: white1x1 },
      uHasMap: { value: 0 },
      uColor: { value: new THREE.Color(1, 1, 1) },
      uAlphaTest: { value: 0 },
      uLodBias: { value: params.texSharp },
      uPacked: { value: 0 },
      uId: { value: 0 },
      uDist: { value: 1 },
      uUvTransform: { value: new THREE.Matrix3() },
      uCamRot: { value: new THREE.Matrix3() },
    },
    side: THREE.DoubleSide,
  });
  const _v = new THREE.Vector3(), _c = new THREE.Vector3();
  const resolveMat = (object, group) => {
    const m = object.material;
    return Array.isArray(m) ? m[group ? group.materialIndex : 0] : m;
  };
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  gMat.onBeforeRender = (r, s, cam, geometry, object, group) => {
    const m = resolveMat(object, group);
    const u = gMat.uniforms;
    const ink = (m && m.userData && m.userData.ink) || {};
    const colorful = ink.colorful ? 1 : 0;
    const hatchIdx = Math.round(clamp(ink.hatch ?? 0.5, 0, 1) * 14);
    // lineWeight in quarter steps 0..1.75 (0 = no line of its own; a cut-out with a drawn outline wants ~0.25)
    const lineIdx = clamp(Math.round((ink.lineWeight ?? 1) * 4), 0, 7);
    u.uPacked.value = (colorful * 128 + hatchIdx * 8 + lineIdx) / 255;
    const map = m && m.map && m.map.isTexture ? m.map : null;
    u.uHasMap.value = map ? 1 : 0;
    u.uMap.value = map || white1x1;
    if (map) {
      if (map.matrixAutoUpdate) map.updateMatrix();
      u.uUvTransform.value.copy(map.matrix);
    } else u.uUvTransform.value.identity();
    if (m && m.color && m.color.isColor) u.uColor.value.copy(m.color);
    else u.uColor.value.setRGB(1, 1, 1);
    u.uAlphaTest.value = m && (m.alphaTest > 0 || (m.transparent && map)) ? Math.max(m.alphaTest || 0, 0.5) : 0;
    u.uId.value = object.id & 65535;
    _v.setFromMatrixPosition(object.matrixWorld);
    _c.setFromMatrixPosition(cam.matrixWorld);
    u.uDist.value = _v.distanceTo(_c);
    gMat.side = m && m.side != null ? m.side : THREE.FrontSide;
    gMat.uniformsNeedUpdate = true;
  };

  // ── lit override: white paper under the real lights ──
  const litMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  litMat.onBeforeRender = (r, s, cam, geometry, object, group) => {
    const m = resolveMat(object, group);
    litMat.side = m && m.side != null ? m.side : THREE.FrontSide;
  };

  // ── fullscreen passes ──
  const quadGeo = new THREE.BufferGeometry();
  quadGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const quad = new THREE.Mesh(quadGeo, null);
  quad.frustumCulled = false;
  const quadScene = new THREE.Scene();
  quadScene.add(quad);
  const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const edgeMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: QUAD_VERT,
    fragmentShader: EDGE_FRAG,
    uniforms: {
      tDepth: { value: null },
      tNorm: { value: null },
      tMisc: { value: null },
      tAlbedo: { value: null },
      uRes: { value: new THREE.Vector2() },
      uNear: { value: 0.03 },
      uFar: { value: 60 },
      uSeed: { value: 0 },
      uDpr: { value: 1 },
      uWobble: { value: params.wobble },
      uDepthThr: { value: params.depthThr },
      uCreaseThr: { value: params.creaseThr },
      uCreaseWide: { value: params.creaseWide },
    },
    depthTest: false,
    depthWrite: false,
  });
  const extMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: QUAD_VERT,
    fragmentShader: EXTEND_FRAG,
    uniforms: {
      tEdge: { value: null },
      uRes: { value: new THREE.Vector2() },
      uDpr: { value: 1 },
      uSeed: { value: 0 },
      uOvershoot: { value: params.overshoot },
      uMerge: { value: params.merge },
      uThin: { value: params.thin },
    },
    depthTest: false,
    depthWrite: false,
  });
  const compMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: QUAD_VERT,
    fragmentShader: COMPOSITE_FRAG,
    uniforms: {
      tAlbedo: { value: null },
      tNorm: { value: null },
      tMisc: { value: null },
      tDepth: { value: null },
      tLit: { value: null },
      tEdge: { value: null },
      tWall: { value: wallTiles },
      tFloor: { value: floorTiles },
      tPaper: { value: paperGrain },
      uRes: { value: new THREE.Vector2() },
      uDpr: { value: 1 },
      uSeed: { value: 0 },
      uNear: { value: 0.03 },
      uFar: { value: 60 },
      uHatchK: { value: 3 },
      uLref: { value: params.lref },
      uLineBase: { value: params.lineBase },
      uBreak: { value: params.breakAmt },
      uPaperAmt: { value: params.paper },
      uHatchBoil: { value: params.hatchBoil },
      uPocket: { value: params.pocket },
      uTex: { value: new THREE.Vector4(...params.texLevels) },
      uTexPen: { value: new THREE.Vector4(...params.texPen) },
      uMode: { value: 0 },
      uInvVP: { value: new THREE.Matrix4() },
      uInk: { value: new THREE.Color(INK) },
      uPaper: { value: new THREE.Color(PAPER) },
      uLevels: { value: new THREE.Vector4(...params.levels) },
      uTone: { value: new THREE.Vector4(...params.tone) },
      uCamPos: { value: new THREE.Vector3() },
      uLetterbox: { value: new THREE.Vector2(0, 0) },
    },
    depthTest: false,
    depthWrite: false,
  });
  // colours are given as sRGB hex and written straight to the canvas: keep them as typed
  compMat.uniforms.uInk.value.setHex(parseInt(INK.slice(1), 16), THREE.NoColorSpace);
  compMat.uniforms.uPaper.value.setHex(parseInt(PAPER.slice(1), 16), THREE.NoColorSpace);

  function fullscreen(material, target) {
    quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(quadScene, orthoCam);
  }

  const _size = new THREE.Vector2();
  const _clear = new THREE.Color();
  let mode = MODES[debugMode] ?? 0;

  function render(ctx) {
    const cam = ctx.camera;
    renderer.getDrawingBufferSize(_size);
    if (!rt || _size.x !== size.x || _size.y !== size.y) makeTargets(_size.x, _size.y);
    const dpr = renderer.getPixelRatio();
    const seed = Math.floor(ctx.clock.frame / 2) + ctx.seed * 101;

    const prevRT = renderer.getRenderTarget();
    renderer.getClearColor(_clear);
    const prevAlpha = renderer.getClearAlpha();
    const prevOverride = scene.overrideMaterial;
    const prevBg = scene.background;
    const prevAutoUpdate = renderer.shadowMap.autoUpdate;

    // shadows once per frame, not once per pass
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    scene.background = null;

    // 1. G-buffer
    gMat.uniforms.uCamRot.value.setFromMatrix4(cam.matrixWorld);
    gMat.uniforms.uLodBias.value = params.texSharp;
    scene.overrideMaterial = gMat;
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(rt.gbuf);
    renderer.render(scene, cam);

    // 2. lit
    scene.overrideMaterial = litMat;
    renderer.setClearColor(0xffffff, 1);
    renderer.setRenderTarget(rt.lit);
    renderer.render(scene, cam);
    scene.overrideMaterial = prevOverride;
    scene.background = prevBg;

    // 3. edges
    const eu = edgeMat.uniforms;
    eu.tDepth.value = rt.gbuf.depthTexture;
    eu.tNorm.value = rt.gbuf.textures[1];
    eu.tMisc.value = rt.gbuf.textures[2];
    eu.tAlbedo.value = rt.gbuf.textures[0];
    eu.uRes.value.copy(size);
    eu.uNear.value = cam.near;
    eu.uFar.value = cam.far;
    eu.uSeed.value = seed;
    eu.uDpr.value = dpr;
    eu.uWobble.value = params.wobble;
    eu.uDepthThr.value = params.depthThr;
    eu.uCreaseThr.value = params.creaseThr;
    eu.uCreaseWide.value = params.creaseWide;
    renderer.setClearColor(0x000000, 0);
    fullscreen(edgeMat, rt.edge);

    // 4. overshoot
    const xu = extMat.uniforms;
    xu.tEdge.value = rt.edge.texture;
    xu.uRes.value.copy(size);
    xu.uDpr.value = dpr;
    xu.uSeed.value = seed;
    xu.uOvershoot.value = params.overshoot;
    xu.uMerge.value = params.merge;
    xu.uThin.value = params.thin;
    fullscreen(extMat, rt.ext);

    // 5. composite to the canvas
    const cu = compMat.uniforms;
    cu.tAlbedo.value = rt.gbuf.textures[0];
    cu.tNorm.value = rt.gbuf.textures[1];
    cu.tMisc.value = rt.gbuf.textures[2];
    cu.tDepth.value = rt.gbuf.depthTexture;
    cu.tLit.value = rt.lit.texture;
    cu.tEdge.value = rt.ext.texture;
    cu.uRes.value.copy(size);
    cu.uDpr.value = dpr;
    cu.uSeed.value = seed;
    cu.uNear.value = cam.near;
    cu.uFar.value = cam.far;
    const cssH = size.y / dpr;
    cu.uHatchK.value = cssH / (1024 * Math.tan(THREE.MathUtils.DEG2RAD * cam.fov * 0.5));
    cu.uLref.value = params.lref;
    cu.uLineBase.value = params.lineBase;
    cu.uBreak.value = params.breakAmt;
    cu.uPaperAmt.value = params.paper;
    cu.uHatchBoil.value = params.hatchBoil;
    cu.uPocket.value = params.pocket;
    cu.uTex.value.set(...params.texLevels);
    cu.uTexPen.value.set(...params.texPen);
    cu.uMode.value = mode;
    cu.uInvVP.value.multiplyMatrices(cam.matrixWorld, cam.projectionMatrixInverse);
    cu.uLevels.value.set(...params.levels);
    cu.uTone.value.set(...params.tone);
    cu.uCamPos.value.setFromMatrixPosition(cam.matrixWorld);
    if (params.letterbox) {
      const frameAspect = size.x / size.y;
      const bar = Math.max(0, (1 - frameAspect / params.letterbox) / 2);
      cu.uLetterbox.value.set(bar, bar);
    } else cu.uLetterbox.value.set(0, 0);
    fullscreen(compMat, null);

    renderer.setRenderTarget(prevRT);
    renderer.setClearColor(_clear, prevAlpha);
    renderer.shadowMap.autoUpdate = prevAutoUpdate;
  }

  const api = {
    params,
    render,
    tiles: { wall: wallTiles, floor: floorTiles, paper: paperGrain },
    setLetterbox(ratio) {
      params.letterbox = ratio || null;
    },
    setMode(name) {
      mode = MODES[name] ?? 0;
    },
    setState(name) {
      api.setMode(name);
    },
  };
  return api;
}
