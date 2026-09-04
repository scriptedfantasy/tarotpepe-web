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
//   5. Composite lines (a nib's coverage of the pixel, occasional skips), tone quantised to 4
//                stroke levels drawn with world-anchored hatch tiles, selective colour, paper grain.
//   6. Despeckle a dark pixel with paper on all four sides is not a mark a pen could make.
//
// HOW TO MEASURE THIS PASS AGAINST THE FOLIO, because round 6 spent a cycle being misled by it.
// tools/_ink-r5.mjs resizes both images to 1600 px wide before it counts, and the folio is a
// 2361 px scan: lanczos puts every one of its edges through a resampling filter that spreads ink
// across the mid bands, while our 1600 px frame is measured native and never goes through one. So
// a native frame ALWAYS reads short of mid-tone against a downsampled folio, and chasing that gap
// by widening the pen is chasing an artefact of the ruler. Shoot the frame at the folio's own
// 2362 px and let the probe downsample it the same way and the two agree: 14.2% mid-tone against
// its 14.7%, spread 3.2 / 3.0 / 2.8 / 2.8 / 2.7 / 2.9 across the bands against its
// 4.0 / 3.1 / 2.8 / 2.7 / 2.9 / 3.2. Quote both numbers or neither.
//
// THE ONE RULE THIS PASS EXISTS TO KEEP, and the one round 4 broke: "no grey" is about TONE, not
// about rasterisation. There is no grey WASH — tone is strokes over paper, a mark is ink or it is
// paper — but a drawn line, rasterised, HAS a soft edge, and the folio's has more than a pixel of
// it. Round 4 thresholded the raster as well and shipped 1 px stair-stepped contours with a grit of
// isolated black beside them. So: the TONE buffer is thresholded, the LINE buffer keeps its
// anti-aliasing, and nothing anywhere is allowed to leave a single dark pixel alone on the paper.
import * as THREE from 'three';

// What the pen and the sheet actually are, sampled off the folios (STYLE.md §1.1 and §3): the
// paper is a cool, faintly green off-white, not a cream; the ink is a neutral near-black, not a
// warm brown-black. src/core/strokes.js now exports exactly these two (round 3 asked for it and it
// was done), so the canvases the other pieces draw on and the values this pass composites with
// agree; keep them in step if either moves.
const PAPER = '#f8f9f4';
const INK = '#0d0e0d';
import { makeTiles, makePaperGrain } from './ink-tiles.js';
import { GBUF_VERT, GBUF_FRAG, QUAD_VERT, EDGE_FRAG, EXTEND_FRAG, COMPOSITE_FRAG, DESPECKLE_FRAG } from './ink-shaders.js';

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
    // THE NIB, as a radius in css px. The mark is the COVERAGE of the pixel by a nib of this radius
    // rolled along the seeds, so the stroke carries exactly 2 × lineBase pixels of ink per unit of
    // its length whatever the seeds did, and this is the half-width of every contour in the frame.
    // Nothing else changes it: one pen, one pressure (STYLE §1.2 — no thick-and-thin, and no change
    // of weight between foreground and background).
    //
    // ROUND 6, and this is the round. Round 5 sized this nib to the FOLIO'S OWN stroke — 1.1 px of
    // core and 2.8 px at half coverage, measured on the kitchen folio resampled to our 1600. That
    // reasoning is the error. The film draws FEW things BIG: a table, three cards, two figures. We
    // draw a parlour — a sideboard, five bottles with labels, a radio with two dials, a shelf of
    // books, a clock, a coat, a rug border — so every object in our frame is a third the size of
    // anything in the folio's. Matching the film's ABSOLUTE stroke width while drawing three times
    // the content per frame is what turned a labelled bottle into a blot, the panel's stripes into
    // bars, and two edges 3 px apart into one. Our pen must be narrower in PIXELS than the film's
    // because our objects are smaller in pixels; "one pen, one weight" is a rule about consistency
    // across the frame, not about a particular width.
    //
    // With lineSoft 1.3 below this draws a stroke 3.3 px across at its widest reach against round
    // 5's 4.2: 0.7 px of solid core, half coverage at 2.0 px, and bare paper 1.65 px either side of
    // the centre — so a pair of edges 3 px apart (a glazing bar, a bottle's shoulder against its
    // neighbour, two balusters of the sideboard's panel) has clean paper between them, which at
    // round 5's reach it did not: there the two shoulders met at a third of full ink and the pair
    // arrived as one bar with a smear down it.
    lineBase: 1.00,
    // THE SHOULDER, in css px: how wide the ramp from full ink to bare paper is at the edge of
    // every mark. Round 4 had no ramp worth the name — the mark's boundary could only land on the
    // pixel lattice, so the contour came out as a 1 px stair-stepped raster of a vector with two
    // fixed greys beside it, and the round-4 critic ranked that the film's worst fault. "No grey"
    // is a rule about TONE (there is no grey WASH, no soft shading) and never was a rule about
    // rasterisation: a drawn line HAS a soft pixel at its edge, and the folio's has more than one.
    // Measured on the kitchen folio at 1600 px wide: 8.1% of the frame below grey 32, 4.0% between
    // 32 and 63, and 14.7% spread evenly from 64 to 224 — a third of its ink lives in the shoulder
    // and half as much again beyond it. Widening this moves ink out of the core and into that
    // shoulder without changing the stroke's total mass (2 × lineBase px per unit length).
    //
    // ROUND 6 narrowed it, because the shoulder is what "blurry" actually means. Measured on the
    // round-5 frame and on the folio resampled to the same 1600 px, our stroke was DARKER-CENTRED
    // and GREYER-EDGED than the film's at once: our core reached 0.84 px against the folio's 1.15,
    // while 2 px out from the centre we sat at grey 177 against its 190 and 3 px out at 212 against
    // its 227. Less black in the middle and more grey around it is the definition of a soft line. A
    // narrower ramp about a slightly smaller radius puts the ink back in the core and gives the
    // paper 2 px out back to the paper.
    //
    // Two settings were tried and thrown away on the way here, and both are worth knowing about.
    // 1.5 with a 0.90 radius matched the folio's share of solid black almost exactly (8.5% against
    // 8.1%) but left the door's panel mouldings as broken grey hairlines: the ramp is symmetric, so
    // a wide one about a small radius leaves a core only 0.15 px across and the peak coverage of a
    // typical stroke falls to 0.77. 1.1 with 0.95 went the other way and gave 11.7% solid black — a
    // photocopy. 1.3 about 1.00 puts the peak back at 0.88, and it is the peak, not the width, that
    // decides whether a line reads as drawn or as smudged.
    lineSoft: 1.3,
    wobble: 0.9, // css px of hand drift
    breakAmt: 0.03, // how often the pen skips (0 = never)
    overshoot: 1, // 0/1 line ends run past corners
    // px within which two PARALLEL contours are one contour and only the stronger is drawn.
    // 0 turns the merge off. See the note in EXTEND_FRAG: this is the doubled-line rule.
    merge: 4,
    // px within which two EQUAL parallel contours are one contour, because the paper between them
    // is thinner than a stroke: the two edges of a moulding, of a glazing bar, of a slat across the
    // room. Above this both are drawn. Bounded by `merge`, which is how far the search looks.
    //
    // OFF as of round 5, and it should stay off unless someone can make the choice stable. Deciding
    // which of two EQUAL lines survives is a coin toss that has to come out the same way at every
    // pixel of both lines, and it does not: the parallel test, the strength comparison and the
    // tangent all wobble by a hair from pixel to pixel, so each line surrendered alternate pixels
    // to the other and BOTH arrived as trails of dashes. Cropped and read at 1:1 against the folio,
    // that trail is the field of dirt the round-4 critic found strewn beside every vertical in the
    // room — a far worse fault than the doubled line it was written to cure, which at the pen's
    // present width barely shows. Measured at home: thin 3 gives ink 11.1% and dashes; thin 0 gives
    // 12.5% against the folio's 12.1% and continuous strokes.
    //
    // Retested in round 6 against the narrower pen, in case the narrower pen had made the choice
    // stable: it has not. thin 2 does what it says on the measurement — the slivers of paper
    // pinched between two contours fall from 39% of the paper runs at the shelf to 32%, and solid
    // black from 10.6% of the frame to 9.7% — and the door's stiles come back as dashes, plainly
    // visible at 3x. The wobble is ±0.9 px, so a nominal 3 px pair is 2.2 px apart at one pixel of
    // its length and 3.8 px at the next; the survivor test fires on one and not the other, and the
    // line that gives way gives way in patches. The doubled line is cured by the nib being too
    // narrow to bridge the gap, not by deleting one of the pair. Leave this at 0.
    thin: 0,
    // A stroke RUNS. How far along its own tangent, in px, a contour must continue for the pen to
    // draw it at all; 0 turns the test off. A crowded set projects hundreds of things two pixels
    // across — a baluster, a bottle stopper, a sprig of the wallpaper — and the edge pass dutifully
    // put a closed outline round every one of them, which at a nib width lands as a black speck.
    // The film does not outline what it cannot draw; it leaves the paper.
    stub: 3,
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
    // 1 = the marks DRAWN INSIDE a coloured surface are inked with the room pen (STYLE 1.4: flat
    // colour under the line, never a coloured line). 0 leaves a coloured cut-out exactly as painted,
    // which is what round 4 did and why the puppet reads as a sticker: his contour arrived as a soft
    // mid-grey line against the set black.
    colorInk: 1,
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
    //
    // ROUND 6 raised that floor from 0.5 to 0.8, and it was half the blot. 0.5 is not "black"; it
    // is the average a WELL DRAWN object reaches once the frame has minified it — a bottle's label,
    // a radio's louvred grille, a book's spine type all pass 0.5 as soon as their marks are a
    // couple of texels a pixel. Everything above the floor is inked "whatever its surroundings",
    // so every one of them arrived as a solid black rectangle with its lettering inside it. The
    // floor is for a mark that is genuinely ink — a solid tick, a filled ornament — and at 0.8
    // (albedo 0.2) that is what it catches; the local test below decides everything else.
    texPen: [9, 20, 0.3, 0.8],
    // WHERE THE PAPER ENDS AND THE MARK BEGINS, as a fraction of the way from the middle of the
    // nib-wide field up to the darkest thing inside it. 0 is round 5's rule — ink everything darker
    // than the local average — and that is the other half of the blot: a label whose letters cover
    // a third of it has an average that sits well INSIDE the paper, so half the plaque was inked
    // and six letters arrived as one mass. A hand inks the stem and leaves the paper beside it. At
    // 0.3 the pen still takes every mark's core at full pressure (a stroke's core IS the darkest
    // thing within a nib of itself, so it always passes) and hands back the halo of nearly-paper
    // that was fattening every letter, every louvre and every rule in the set.
    texBias: 0.3,
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
    // the composite lands here, not on the canvas, so the despeckle pass can read it back
    const comp = new THREE.WebGLRenderTarget(w, h, { depthBuffer: false, stencilBuffer: false });
    comp.texture.minFilter = comp.texture.magFilter = THREE.NearestFilter;
    comp.texture.generateMipmaps = false;
    rt = { gbuf, lit, edge: mk(), ext: mk(), comp };
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
      uStub: { value: params.stub },
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
      uLineSoft: { value: params.lineSoft },
      uBreak: { value: params.breakAmt },
      uPaperAmt: { value: params.paper },
      uHatchBoil: { value: params.hatchBoil },
      uPocket: { value: params.pocket },
      uColorInk: { value: params.colorInk },
      uTex: { value: new THREE.Vector4(...params.texLevels) },
      uTexPen: { value: new THREE.Vector4(...params.texPen) },
      uTexBias: { value: params.texBias },
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
  const despeckleMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: QUAD_VERT,
    fragmentShader: DESPECKLE_FRAG,
    uniforms: { tSrc: { value: null }, uRes: { value: new THREE.Vector2() }, uDpr: { value: 1 } },
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
    xu.uStub.value = params.stub;
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
    cu.uLineSoft.value = params.lineSoft;
    cu.uBreak.value = params.breakAmt;
    cu.uPaperAmt.value = params.paper;
    cu.uHatchBoil.value = params.hatchBoil;
    cu.uPocket.value = params.pocket;
    cu.uColorInk.value = params.colorInk;
    cu.uTex.value.set(...params.texLevels);
    cu.uTexPen.value.set(...params.texPen);
    cu.uTexBias.value = params.texBias;
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
    // 6. despeckle. The probe buffers (3..8, 11) are raw readouts and are shown untouched; the
    // three judged states and the two halves that add up to lines-only all go through the sieve,
    // so what is measured is what is shown.
    const sieve = mode < 3 || mode === 9 || mode === 10;
    if (sieve) {
      fullscreen(compMat, rt.comp);
      const du = despeckleMat.uniforms;
      du.tSrc.value = rt.comp.texture;
      du.uRes.value.copy(size);
      du.uDpr.value = dpr;
      fullscreen(despeckleMat, null);
    } else fullscreen(compMat, null);

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
