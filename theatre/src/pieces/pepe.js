// PIECE: pepe — Tarot Pepe himself, a PAPER CUT-OUT PUPPET made from the user's drawing
// (public/pepe/pepe-meditation.webp): a flat figure standing on a small bench upstage of the
// table, facing the visitor, hinged the way a paper-theatre puppet is. The layers are cut from
// the drawing at print resolution by tools/pepe-cutout.mjs (run once; the PNGs and the manifest
// public/pepe/cutout.json are committed):
//
//   body (robe, legs, feet, sleeves with their cuff lines)     z 0
//   handL / handR, hinged at the wrist, tucked UNDER the sleeve  z -0.5 mm
//   head, from the chin line up, hinged at the neck              z +1 mm
//     with its overlays as material groups of the same mesh (no seam lines from the ink pass):
//     pupils (moved by uv offset), the eye ink over them, closed lids, three mouths (rest / o / flat)
//
// api: { group, root, head, headPivot, body, hands, parts, anchors, scale, setState,
//        setMouth(name), setLids(closed), setGaze(dx, dy),
//        reach(side) → putBack(), handOff(side), handOn(side), handIsOff(side) }
//   parts = { head, headPivot, headMesh, body, handL, handR, bench, lids:[L,R], pupils:[L,R],
//             eyelines, mouths:{rest,o,flat}, eyes:[L,R] }     (lids/pupils/mouths: { mat, show() })
import * as THREE from 'three';
import { inkMaterial, PAPER } from '../core/strokes.js';
// The cut-out manifest is imported, not fetched. In the headless judging browser nothing a page
// requests is served for the first few seconds of its life, so a single await on a file inside
// build() costs the whole page four seconds that have nothing to do with this piece's work.
// tools/pepe-cutout.mjs writes this same file; the layer PNGs still load in the background and are
// hung on their materials when they arrive.
import MANIFEST from '../../public/pepe/cutout.json';

export const meta = {
  name: 'pepe',
  judge: { shot: 'pepe', states: ['default'] },
  files: ['src/pieces/pepe.js', 'tools/pepe-cutout.mjs', 'public/pepe/cutout.json'],
};

export const SKIN = '#69b964';
export const LIPS = '#d37a6c';

// the drawing's scale on the stage: one source pixel (474 across) is 1.8 mm → the figure is
// 0.85 m across the hands, the head 0.27 m tall, the crossed legs on a bench behind the table
const M_PER_SRC_PX = 0.0018;
const Z_STEP = 0.0005;

// The drawing is a big head on a short wide body; the bible wants a small head on a long thin one
// (STYLE.md §1.6, and every figure in fd-anim-metro-carriage). The cut-out is not redrawn — it is
// RE-PROPORTIONED, the way a puppet maker trims a paper figure before he hinges it: the robe is
// pinched in and stretched down about the neck, and the head is cut a little smaller about the same
// point, so the chin stays where it was and the jowls come in. Three numbers, nothing else.
// The head may not go below ~0.86: the body's collar band (GEO.collarD in tools/pepe-cutout.mjs)
// has to stay wider than the shrunken jaw or the room shows through at the shoulder.
// BODY_Y is capped by the table: the drawing's left wrist is 172 px below the neck, and stretching
// it much past 1.06 drops that hand behind the tabletop, where it reads as amputated.
// BODY_X is capped by the table too: pinch him in much past 0.93 and the open hands come inboard
// over the round tabletop, where its far edge cuts them in half.
const BODY_X = 0.93, BODY_Y = 1.06, HEAD_S = 0.88;

// geometry for a layer: one quad per occupied cell of the manifest's grid (tight to the alpha, so
// the lit pass sees a silhouette not a card), or a single quad for the small overlays
function layerGeometry(L, pivot, z, m, geo = null) {
  const [bx, by, bw, bh] = L.box;
  const quads = [];
  if (L.quad || !L.cells) quads.push([bx, by, bx + bw, by + bh]);
  else
    for (let k = 0; k < L.cells.length; k += 2) {
      const x0 = bx + L.cells[k] * L.cell, y0 = by + L.cells[k + 1] * L.cell;
      quads.push([x0, y0, Math.min(x0 + L.cell, bx + bw), Math.min(y0 + L.cell, by + bh)]);
    }
  const g = geo ?? { pos: [], uv: [], nrm: [], idx: [], groups: [] };
  const start = g.idx.length;
  for (const [x0, y0, x1, y1] of quads) {
    const base = g.pos.length / 3;
    for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) {
      g.pos.push((x - pivot[0]) * m, -(y - pivot[1]) * m, z);
      g.uv.push((x - bx) / bw, 1 - (y - by) / bh);
      g.nrm.push(0, 0, 1);
    }
    g.idx.push(base, base + 3, base + 2, base, base + 2, base + 1);
  }
  g.groups.push({ start, count: g.idx.length - start });
  return g;
}
function toBuffer(g) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.nrm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uv, 2));
  geo.setIndex(g.idx);
  g.groups.forEach((gr, i) => geo.addGroup(gr.start, gr.count, i));
  geo.computeBoundingSphere();
  return geo;
}

export async function build(ctx) {
  const { pos, headY } = ctx.layout.pepe;
  const man = MANIFEST; // imported, not fetched: see the note at the import
  const m = M_PER_SRC_PX / man.K; // metres per manifest (hi-res) pixel
  const A = man.anchors;
  const L = man.layers;
  // the figure hangs from the neck anchor; the head's centre sits at layout.pepe.headY
  const neckY = headY - (A.neck[1] - A.headCentre[1]) * m * HEAD_S;
  const rowY = (y) => neckY - (y - A.neck[1]) * m * BODY_Y; // world y (in the root) of an image row
  const colX = (x) => (x - A.neck[0]) * m * BODY_X; // world x of an image column
  const feetY = rowY(man.hiSize[1]);

  const root = new THREE.Group();
  root.name = 'pepe';
  root.position.set(...pos);

  // ── materials: the drawing's own colour, alpha-cut, a light hand for the ink pass ──
  const textures = [];
  const cutMat = (layer, { hatch = 0.35, lineWeight = 0.4 } = {}) => {
    const mat = inkMaterial({ color: '#ffffff', colorful: true, hatch, lineWeight, roughness: 1 });
    mat.alphaTest = 0.5;
    mat.name = layer;
    const p = ctx.assets.texture(`/pepe/${L[layer].file}`).then((t) => {
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      mat.map = t;
      mat.needsUpdate = true;
      return t;
    });
    textures.push(p);
    return mat;
  };

  // ── body: hangs from the neck, standing on the bench ──
  const bodyMat = cutMat('body');
  const body = new THREE.Mesh(toBuffer(layerGeometry(L.body, A.neck, 0, m)), bodyMat);
  body.name = 'body';
  body.scale.set(BODY_X, BODY_Y, 1);
  body.position.set(0, neckY, 0);
  body.castShadow = body.receiveShadow = true;
  root.add(body);

  // ── hands: hinged at the wrist, behind the body so the seam hides under the cuff line ──
  const hands = {};
  for (const side of ['L', 'R']) {
    const wrist = A['wrist' + side];
    const grp = new THREE.Group();
    grp.name = 'hand' + side;
    grp.position.set(colX(wrist[0]), rowY(wrist[1]), -Z_STEP);
    const mesh = new THREE.Mesh(toBuffer(layerGeometry(L['hand' + side], wrist, 0, m)), cutMat('hand' + side));
    // the drawing is trimmed exactly as the robe is, so the cuff and the hand keep their join; the
    // scale rides UNDER the wrist's rotation, so a turned wrist stretches nothing
    mesh.scale.set(BODY_X, BODY_Y, 1);
    mesh.castShadow = mesh.receiveShadow = true;
    grp.add(mesh);
    grp.userData.rest = { x: grp.position.x, y: grp.position.y };
    root.add(grp);
    hands[side] = grp;
  }

  // ── head: a Group at headY (lifts), a pivot at the neck (turns), the mesh with its overlays ──
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, headY, 2 * Z_STEP);
  const headPivot = new THREE.Group();
  headPivot.name = 'headPivot';
  headPivot.position.set(0, neckY - headY, 0);
  head.add(headPivot);
  root.add(head);

  const overlayOrder = [
    ['head', 0],
    ['pupilL', 0.6 * Z_STEP],
    ['pupilR', 0.6 * Z_STEP],
    ['eyelines', 1.2 * Z_STEP],
    ['lidL', 1.8 * Z_STEP],
    ['lidR', 1.8 * Z_STEP],
    ['mouthRest', 1.8 * Z_STEP],
    ['mouthO', 1.8 * Z_STEP],
    ['mouthFlat', 1.8 * Z_STEP],
  ];
  let hg = null;
  const headMats = [];
  for (const [name, z] of overlayOrder) {
    hg = layerGeometry(L[name], A.neck, z, m, hg);
    headMats.push(cutMat(name, name === 'head' ? {} : { hatch: 0.35, lineWeight: 0.4 }));
  }
  const headMesh = new THREE.Mesh(toBuffer(hg), headMats);
  headMesh.name = 'headMesh';
  headMesh.scale.setScalar(HEAD_S); // cut smaller about the neck: the chin stays put, the jowls come in
  headMesh.castShadow = headMesh.receiveShadow = true;
  headPivot.add(headMesh);
  const matOf = (name) => headMats[overlayOrder.findIndex(([n]) => n === name)];
  const overlay = (name) => {
    const mat = matOf(name);
    return {
      mat,
      show(v = true) {
        mat.visible = !!v;
      },
      get visible() {
        return mat.visible;
      },
    };
  };
  const lids = [overlay('lidL'), overlay('lidR')];
  const mouths = { rest: overlay('mouthRest'), o: overlay('mouthO'), flat: overlay('mouthFlat') };
  const eyelines = overlay('eyelines');
  const pupils = ['L', 'R'].map((side) => {
    const o = overlay('pupil' + side);
    const [, , bw, bh] = L['pupil' + side].box;
    // dx, dy in metres: the disc slides on its field by a uv offset (right / up = positive)
    o.offset = (dx, dy) => {
      if (!o.mat.map) return;
      o.mat.map.offset.set(-dx / (bw * m), -dy / (bh * m));
    };
    return o;
  });
  for (const l of lids) l.show(false);
  mouths.o.show(false);
  mouths.flat.show(false);

  // eye anchors (for a look-at or a caption), parented to the pivot so they ride the head
  const eyes = ['L', 'R'].map((side) => {
    const e = new THREE.Object3D();
    e.name = 'eye' + side;
    const c = A['eye' + side];
    e.position.set((c[0] - A.neck[0]) * m * HEAD_S, -(c[1] - A.neck[1]) * m * HEAD_S, 3 * Z_STEP);
    headPivot.add(e);
    return e;
  });
  const mouthAnchor = new THREE.Object3D();
  mouthAnchor.name = 'mouth';
  mouthAnchor.position.set((A.mouth[0] - A.neck[0]) * m * HEAD_S, -(A.mouth[1] - A.neck[1]) * m * HEAD_S, 3 * Z_STEP);
  headPivot.add(mouthAnchor);

  // ── the bench: a plain paper-white block he sits on; the table hides it in the home shot ──
  const benchW = 0.94 * BODY_X, benchD = 0.36;
  const bench = new THREE.Mesh(new THREE.BoxGeometry(benchW, feetY, benchD), inkMaterial({ color: PAPER, hatch: 0.55, lineWeight: 1 }));
  bench.name = 'bench';
  bench.position.set(0, feetY / 2, 0);
  bench.castShadow = bench.receiveShadow = true;
  root.add(bench);

  ctx.scene.add(root);

  const parts = { head, headPivot, headMesh, body, handL: hands.L, handR: hands.R, bench, lids, pupils, eyelines, mouths, eyes, mouth: mouthAnchor };

  // ── lending a hand ──────────────────────────────────────────────────────────────────────────
  // The green hand that reaches onto the tablecloth (reveal-hand.js) is HIS hand, so while it is
  // out there the cut-out hand on that side has to step out of the drawing or he has three. That
  // is his business, not the reveal's, so it is asked for here instead of reached for:
  //     const back = pepe.reach('R');   … back();     one shot, and the same hand comes back
  //     pepe.handOff('R') / pepe.handOn('R')          the two halves, if you need them apart
  //     pepe.handOff() / pepe.handOn()                both hands
  //     pepe.handIsOff('R')                           → boolean; pepeAnim leaves an absent hand
  //                                                     alone, so the shoulder holds still and the
  //                                                     hand comes back exactly where it left
  const lent = { L: false, R: false };
  const bothIf = (side) => (side === 'L' || side === 'R' ? [side] : ['L', 'R']);
  const setHand = (side, on) => {
    const h = hands[side];
    if (!h) return;
    lent[side] = !on;
    h.visible = on;
    if (!on) rest(side); // it leaves at rest and comes back at rest: the shoulder never twitches
  };
  const rest = (side) => {
    const h = hands[side];
    h.rotation.set(0, 0, 0);
    h.position.set(h.userData.rest.x, h.userData.rest.y, -Z_STEP);
  };

  const api = {
    group: root,
    root,
    head,
    headPivot,
    body,
    hands: [hands.L, hands.R],
    parts,
    anchors: A,
    scale: m, // metres per manifest pixel, BEFORE the re-proportioning below
    bodyScale: [BODY_X, BODY_Y],
    headScale: HEAD_S,
    headY,
    neckY,
    feetY,
    textures: Promise.all(textures),
    setMouth(name = 'rest') {
      for (const k in mouths) mouths[k].show(k === name);
    },
    setLids(closed = false) {
      for (const l of lids) l.show(closed);
    },
    setGaze(dx = 0, dy = 0) {
      for (const p of pupils) p.offset(dx / HEAD_S, dy / HEAD_S); // world metres, on a head cut smaller
    },
    // the cut-out hand on that side steps out of the drawing (see "lending a hand" above)
    handOff(side) {
      for (const s of bothIf(side)) setHand(s, false);
    },
    handOn(side) {
      for (const s of bothIf(side)) setHand(s, true);
    },
    handIsOff(side = 'R') {
      return !!lent[side];
    },
    // one shot: takes the hand away and hands back the way to put it back
    reach(side = 'R') {
      api.handOff(side);
      return () => api.handOn(side);
    },
    // the rest pose, deterministic; extra words are builder checks: raw (no overlays), lines, tone, albedo, edges
    setState(name = 'default', ctx2) {
      const words = String(name).split('-');
      head.position.set(0, headY, 2 * Z_STEP);
      headPivot.rotation.set(0, 0, 0);
      for (const side of ['L', 'R']) {
        setHand(side, true);
        rest(side);
      }
      api.setMouth(words.includes('o') ? 'o' : words.includes('flat') ? 'flat' : 'rest');
      api.setLids(words.includes('blink'));
      api.setGaze(0, 0);
      if (words.includes('raw')) {
        api.setMouth('none');
        eyelines.show(false);
        for (const p of pupils) p.show(false);
      }
      const pieces = ctx2?.pieces ?? ctx.pieces;
      const modes = { lines: 'lines-only', tone: 'tone-only', normals: 'debug-normal', edges: 'debug-edge', albedo: 'debug-albedo', lit: 'debug-lit' };
      for (const w of words) if (modes[w]) pieces.ink?.setMode?.(modes[w]);
    },
  };
  return api;
}
