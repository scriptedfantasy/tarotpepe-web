// PIECE: props — the objects. Every prop is either paper-white geometry (the ink pass draws its
// outline and a little hatch where the light is not) or a solid-ink mass (a texture filled with
// ink: a black bottle, a mat, a coat, the cat) with its pattern left in paper: a label, a fold
// line, an eye slit. The rule from the film: from across the room every prop shows one solid
// black area and one bare white area. Edges are modelled for real so the pen finds them: bottle
// necks, shelf boards, book spines as separate boxes.
import * as THREE from 'three';
import { inkMaterial, PAPER } from '../core/strokes.js';
import * as T from './props-textures.js';

// ---- shared materials -------------------------------------------------------------------------
let _M = null;
export function materials() {
  if (_M) return _M;
  const wood = T.woodTexture();
  const solid = T.solidTexture();
  _M = {
    paper: inkMaterial({ hatch: 0.4 }),
    frame: inkMaterial({ hatch: 0.3 }),
    wood: inkMaterial({ map: wood, hatch: 0.5 }),
    woodDark: inkMaterial({ map: wood, hatch: 0.7 }),
    metal: inkMaterial({ hatch: 0.6, lineWeight: 1.1 }),
    glass: inkMaterial({ hatch: 0.18 }),
    glass2: inkMaterial({ hatch: 0.18, side: THREE.DoubleSide }),
    solid: inkMaterial({ map: solid, hatch: 0.5, lineWeight: 1.1 }),
    solid2: inkMaterial({ map: solid, hatch: 0.5, lineWeight: 1.1, side: THREE.DoubleSide }),
    darkCloth: inkMaterial({ map: T.darkTexture(), hatch: 0.9, lineWeight: 1.1 }),
    cloth: inkMaterial({ map: T.clothTexture(), hatch: 0.5 }),
    stripes: inkMaterial({ map: T.stripeTexture(), hatch: 0.4 }),
    pages: inkMaterial({ map: T.pagesTexture(), hatch: 0.15 }),
    cord: inkMaterial({ hatch: 0.7, lineWeight: 0.8 }),
    cork: inkMaterial({ map: T.paperStackTexture(), hatch: 0.4 }),
    shade: inkMaterial({ map: T.shadeTexture(), hatch: 0.1, side: THREE.DoubleSide }),
    fringe: (() => {
      const m = inkMaterial({ map: T.fringeTexture(), hatch: 0.3, side: THREE.DoubleSide });
      m.alphaTest = 0.5;
      return m;
    })(),
    coat: (() => {
      const m = inkMaterial({ map: T.coatCutTexture(), hatch: 0.5, side: THREE.DoubleSide, lineWeight: 1.1 });
      m.alphaTest = 0.5;
      return m;
    })(),
    pot: inkMaterial({ map: T.potTexture(), hatch: 0.5 }),
    soil: inkMaterial({ map: solid, hatch: 0.5 }),
    newspaper: inkMaterial({ map: T.newspaperTexture(), hatch: 0.2 }),
    paperStack: inkMaterial({ map: T.paperStackTexture(), hatch: 0.2 }),
    globe: inkMaterial({ map: T.globeTexture(), hatch: 0.35 }),
  };
  return _M;
}

// ---- primitives -------------------------------------------------------------------------------
export function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
export function cyl(rt, rb, h, mat, seg = 16, open = false) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat);
  m.castShadow = true;
  return m;
}
export function sphere(r, mat, ws = 16, hs = 12) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat);
  m.castShadow = true;
  return m;
}
// a rod between two points
export function rod(a, b, r, mat, seg = 8) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const geo = new THREE.CylinderGeometry(r, r, len, seg);
  geo.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.lookAt(B);
  m.castShadow = true;
  return m;
}
// a lathe whose v runs by arc length (so a label can be placed at a known v range)
export function lathe(profile, mat, segments = 20) {
  const pts = profile.map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(pts, segments);
  const cum = [0];
  for (let j = 1; j < pts.length; j++) cum.push(cum[j - 1] + pts[j].distanceTo(pts[j - 1]));
  const total = cum[cum.length - 1] || 1;
  const uv = geo.attributes.uv;
  const n = pts.length;
  for (let i = 0; i < uv.count; i++) uv.setY(i, cum[i % n] / total);
  uv.needsUpdate = true;
  const m = new THREE.Mesh(geo, mat);
  m.rotation.y = Math.PI; // u = 0.5 faces +z (the camera)
  m.castShadow = true;
  m.userData.vAt = (j) => cum[j] / total;
  return m;
}
export function plane(w, h, mat) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.receiveShadow = true;
  return m;
}
export function alphaMat(map, hatch = 0.4) {
  const m = inkMaterial({ map, hatch, side: THREE.DoubleSide });
  m.alphaTest = 0.5;
  return m;
}

// ---- bottles, jars, glasses --------------------------------------------------------------------
// The label sits at a third of the body's height, wraps a quarter of the way round, and carries
// 3–6 pen caps. A dark bottle is a solid-ink body with the label left in paper; a glass bottle is
// paper with one diagonal stroke and a solid cap.
const LABEL_HALF_U = 0.12;
function bottleMaterial(tex, dark) {
  return inkMaterial({ map: tex, hatch: dark ? 0.5 : 0.18, lineWeight: 1 });
}
// a round bottle: 'tall' (long thin neck), 'squat' (short and wide), 'corked' (no cap, a cork)
export function bottle({ kind = 'tall', r = null, bodyH = null, neckH = null, lines = ['VIN'], shape = 'rect', dark = false, seed = 1 }) {
  const tall = kind === 'tall';
  r = r ?? (tall ? 0.032 : 0.044);
  bodyH = bodyH ?? (tall ? 0.2 : 0.12);
  const shoulder = tall ? 0.05 : 0.04;
  const neckR = tall ? 0.011 : 0.014;
  neckH = neckH ?? (tall ? 0.085 : 0.045);
  const corked = kind === 'corked';
  const top = bodyH + shoulder + neckH;
  const profile = [
    [0, 0],
    [r * 0.85, 0],
    [r, 0.012],
    [r, bodyH * 0.5],
    [r, bodyH],
    [r * 0.92, bodyH + 0.012],
    [neckR * 1.7, bodyH + shoulder * 0.55],
    [neckR, bodyH + shoulder],
    [neckR, top - 0.014],
    [neckR * (corked ? 1.15 : 1.35), top - 0.014],
    [neckR * (corked ? 1.15 : 1.35), top],
    [neckR * 0.7, top],
    [0, top],
  ];
  const tmp = lathe(profile, materials().paper, 18);
  const v0 = tmp.userData.vAt(2), v1 = tmp.userData.vAt(4);
  const tex = T.labelTexture({
    lines,
    shape,
    uRange: [0.5 - LABEL_HALF_U, 0.5 + LABEL_HALF_U],
    vRange: [v0 + (v1 - v0) * 0.2, v0 + (v1 - v0) * 0.58],
    bodyV: [v0, v1],
    lidV: corked ? null : tmp.userData.vAt(9),
    seed,
    w: 256,
    h: 512,
    dark,
  });
  tmp.material = bottleMaterial(tex, dark);
  const g = new THREE.Group();
  g.add(tmp);
  if (corked) {
    const c = cyl(neckR * 1.5, neckR * 1.25, 0.026, materials().cork, 10);
    c.position.y = top + 0.008;
    g.add(c);
  }
  g.userData.height = top + (corked ? 0.02 : 0);
  g.userData.width = r * 2;
  return g;
}
// a square gin bottle: a box body, a pyramid shoulder, a short neck, a solid cap
export function squareBottle({ r = 0.04, bodyH = 0.15, neckH = 0.04, lines = ['GIN'], dark = false, seed = 1 }) {
  const M = materials();
  const g = new THREE.Group();
  const w = r * 2, d = r * 1.7;
  const tex = T.labelTexture({ lines, uRange: [0.2, 0.8], vRange: [0.3, 0.62], bodyV: [0.06, 0.94], seed, w: 256, h: 512, dark, shape: 'rect' });
  const front = bottleMaterial(tex, dark);
  const side = dark ? M.solid : M.glass;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, bodyH, d), [side, side, side, side, front, side]);
  body.castShadow = true;
  body.position.y = bodyH / 2;
  g.add(body);
  const neckR = 0.013;
  const sh = 0.03;
  const shoulder = cyl(neckR * 1.5 * Math.SQRT2, r * 1.02 * Math.SQRT2, sh, side, 4);
  shoulder.rotation.y = Math.PI / 4;
  shoulder.scale.z = d / w;
  shoulder.position.y = bodyH + sh / 2;
  g.add(shoulder);
  const neck = cyl(neckR, neckR, neckH, side, 12);
  neck.position.y = bodyH + sh + neckH / 2;
  g.add(neck);
  const cap = cyl(neckR * 1.4, neckR * 1.4, 0.014, M.solid, 12);
  cap.position.y = bodyH + sh + neckH + 0.007;
  g.add(cap);
  g.userData.height = bodyH + sh + neckH + 0.014;
  g.userData.width = w;
  return g;
}
export function jar({ r = 0.042, h = 0.12, lines = ['SEL'], seed = 1, shape = 'band' }) {
  const profile = [
    [0, 0],
    [r * 0.9, 0],
    [r, 0.008],
    [r, h * 0.5],
    [r, h - 0.01],
    [r * 0.9, h],
    [r * 0.72, h + 0.004],
    [r * 0.72, h + 0.02],
    [r * 0.84, h + 0.022],
    [r * 0.84, h + 0.036],
    [r * 0.5, h + 0.038],
    [0, h + 0.038],
  ];
  const m = lathe(profile, materials().paper, 18);
  const v0 = m.userData.vAt(2), v1 = m.userData.vAt(4);
  const tex = T.labelTexture({ lines, shape, uRange: [0.5 - LABEL_HALF_U, 0.5 + LABEL_HALF_U], vRange: [v0 + (v1 - v0) * 0.3, v0 + (v1 - v0) * 0.72], bodyV: [v0, v1], lidV: m.userData.vAt(6), seed, w: 256, h: 256, dark: false });
  m.material = bottleMaterial(tex, false);
  m.userData.height = h + 0.038;
  m.userData.width = r * 2;
  return m;
}
export function flask({ R = 0.05, neck = 0.08, nr = 0.012, lines = ['EAU', 'DE VIE'], seed = 1, stopper = true, dark = false }) {
  const profile = [
    [0, 0],
    [R * 0.5, 0],
    [R * 0.85, R * 0.15],
    [R, R * 0.5],
    [R * 0.97, R * 0.9],
    [R * 0.72, R * 1.3],
    [R * 0.38, R * 1.5],
    [nr, R * 1.62],
    [nr, R * 1.62 + neck],
    [nr * 1.4, R * 1.62 + neck],
    [nr * 1.4, R * 1.62 + neck + 0.01],
    [0, R * 1.62 + neck + 0.01],
  ];
  const m = lathe(profile, materials().paper, 20);
  const v0 = m.userData.vAt(2), v1 = m.userData.vAt(5);
  const tex = T.labelTexture({ lines, shape: 'oval', uRange: [0.5 - LABEL_HALF_U * 1.2, 0.5 + LABEL_HALF_U * 1.2], vRange: [v0 + (v1 - v0) * 0.18, v0 + (v1 - v0) * 0.82], bodyV: [v0, v1], lidV: dark ? null : m.userData.vAt(9), seed, w: 256, h: 256, dark });
  m.material = bottleMaterial(tex, dark);
  const g = new THREE.Group();
  g.add(m);
  if (stopper) {
    const s = sphere(nr * 1.9, materials().glass, 12, 8);
    s.position.y = R * 1.62 + neck + 0.01 + nr * 1.5;
    g.add(s);
  }
  g.userData.height = R * 1.62 + neck + 0.05;
  g.userData.width = R * 2;
  return g;
}
export function tumbler(h = 0.08, r = 0.03) {
  const m = lathe([[0, 0], [r * 0.85, 0], [r * 0.9, 0.006], [r, h]], materials().glass2, 14);
  m.userData.height = h;
  m.userData.width = r * 2;
  return m;
}
export function wineGlass({ wine = true } = {}) {
  const g = new THREE.Group();
  const m = lathe([[0, 0], [0.03, 0], [0.03, 0.004], [0.005, 0.006], [0.005, 0.06], [0.02, 0.07], [0.033, 0.1], [0.03, 0.14]], materials().glass2, 14);
  g.add(m);
  if (wine) {
    // the liquid: a small solid-ink shape, as the film draws it
    const w = lathe([[0, 0.072], [0.021, 0.072], [0.031, 0.092], [0, 0.092]], materials().solid, 14);
    g.add(w);
  }
  g.userData.height = 0.14;
  g.userData.width = 0.066;
  return g;
}
export function siphon() {
  const g = new THREE.Group();
  const M = materials();
  const meshTex = T.clothTexture(31);
  const body = cyl(0.036, 0.038, 0.2, inkMaterial({ map: meshTex, hatch: 0.45 }), 16);
  body.position.y = 0.1;
  g.add(body);
  const head = cyl(0.02, 0.028, 0.05, M.solid, 12);
  head.position.y = 0.225;
  g.add(head);
  const spout = rod([0, 0.24, 0], [0.05, 0.22, 0], 0.006, M.solid);
  g.add(spout);
  const lever = rod([0, 0.25, 0], [-0.04, 0.29, 0], 0.005, M.solid);
  g.add(lever);
  g.userData.height = 0.29;
  g.userData.width = 0.08;
  return g;
}
export function iceBucket() {
  const M = materials();
  const g = new THREE.Group();
  const b = lathe([[0, 0], [0.06, 0], [0.065, 0.005], [0.075, 0.13], [0.082, 0.13], [0.082, 0.142], [0.07, 0.142], [0.07, 0.136], [0, 0.136]], M.metal, 18);
  g.add(b);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.005, 6, 16, Math.PI), M.solid);
  handle.position.y = 0.14;
  g.add(handle);
  for (let i = 0; i < 5; i++) {
    const ice = box(0.025, 0.025, 0.025, M.glass);
    ice.position.set((i % 3 - 1) * 0.03, 0.15 + (i > 2 ? 0.02 : 0), ((i / 2) | 0) * 0.02 - 0.02);
    ice.rotation.set(i * 0.5, i * 0.8, 0);
    g.add(ice);
  }
  g.userData.height = 0.18;
  g.userData.width = 0.16;
  return g;
}

// One item of a shelf row from a short spec: { kind, name|lines, dark, scale, seed }.
export function shelfItem(spec, rng) {
  const s = spec.scale ?? 1;
  const seed = spec.seed ?? Math.floor(rng() * 1000);
  const lines = spec.lines ?? (spec.name ? [spec.name] : undefined);
  switch (spec.kind) {
    case 'tall':
      return bottle({ kind: 'tall', r: 0.031 * s, bodyH: (spec.bodyH ?? 0.2) * s, neckH: (spec.neckH ?? 0.085) * s, lines, dark: !!spec.dark, seed, shape: spec.shape ?? 'rect' });
    case 'squat':
      return bottle({ kind: 'squat', r: 0.045 * s, bodyH: (spec.bodyH ?? 0.12) * s, neckH: (spec.neckH ?? 0.045) * s, lines, dark: !!spec.dark, seed, shape: spec.shape ?? 'rect' });
    case 'corked':
      return bottle({ kind: 'corked', r: 0.04 * s, bodyH: (spec.bodyH ?? 0.15) * s, neckH: (spec.neckH ?? 0.05) * s, lines, dark: !!spec.dark, seed, shape: spec.shape ?? 'oval' });
    case 'square':
      return squareBottle({ r: 0.04 * s, bodyH: (spec.bodyH ?? 0.15) * s, neckH: (spec.neckH ?? 0.04) * s, lines, dark: !!spec.dark, seed });
    case 'flask':
      return flask({ R: 0.046 * s, neck: (spec.neck ?? 0.07) * s, lines: lines ?? ['EAU', 'DE VIE'], dark: !!spec.dark, seed });
    case 'jar':
      return jar({ r: 0.04 * s, h: (spec.h ?? 0.11) * s, lines, seed, shape: spec.shape ?? 'band' });
    case 'wine':
      return wineGlass();
    case 'tumbler':
      return tumbler(0.085 * s, 0.03 * s);
    case 'siphon':
      return siphon();
    default:
      return bottle({ kind: 'squat', lines, dark: !!spec.dark, seed });
  }
}
// A row of items centred between x0..x1 (local), standing on y at z; the leftover width becomes
// uneven gaps so the row reads as placed by a hand, not by a ruler.
export function row({ x0, x1, y, z, items, rng, gap = 0.014 }) {
  const g = new THREE.Group();
  const objs = items.map((spec) => shelfItem(spec, rng));
  const widths = objs.map((o) => o.userData.width ?? 0.07);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (objs.length - 1);
  const avail = x1 - x0;
  const slack = Math.max(0, avail - total);
  const extras = objs.map(() => rng());
  const esum = extras.reduce((a, b) => a + b, 0) || 1;
  let x = x0 + slack * 0.12;
  objs.forEach((o, i) => {
    o.position.set(x + widths[i] / 2, y, z + (rng() - 0.5) * 0.012);
    o.rotation.y += (rng() - 0.5) * 0.5;
    g.add(o);
    x += widths[i] + gap + ((slack * 0.76) / esum) * extras[i];
  });
  return g;
}

// ---- books ---------------------------------------------------------------------------------------
const TITLES = ['LE TAROT', 'ASTRONOMIE', 'REVES', 'LA MAIN', 'PROVERBES', 'ATLAS', 'LA LUNE', 'MEMOIRES', 'ORACLES', 'BOTANIQUE', 'LES NOMBRES', 'HISTOIRE', 'VOL. II', 'POESIES', 'ALMANACH', 'LE DESTIN', 'GRAMMAIRE', 'MARSEILLE', 'CHIROMANCIE', 'CARTES', 'TOME I', 'TOME III', 'LES ASTRES', 'LE HASARD', 'CUISINE', 'VOYAGES', 'DICTIONNAIRE', 'ZODIAQUE', 'SILENCE', 'CHANSONS'];
let _titleIdx = 0;
export function book({ w = 0.14, h = 0.2, t = 0.03, title = null, flat = false, seed = 1, dark = false }) {
  const M = materials();
  title = title ?? TITLES[_titleIdx++ % TITLES.length];
  const cover = dark ? M.solid : M.cloth;
  let mesh;
  if (!flat) {
    const spine = inkMaterial({ map: T.spineTexture({ title, seed, vertical: true, w: 64, h: 256, dark }), hatch: 0.45 });
    mesh = new THREE.Mesh(new THREE.BoxGeometry(t, h, w), [cover, cover, M.pages, cover, spine, M.pages]);
  } else {
    const spine = inkMaterial({ map: T.spineTexture({ title, seed, vertical: false, w: 256, h: 64, dark }), hatch: 0.45 });
    mesh = new THREE.Mesh(new THREE.BoxGeometry(w, t, h), [M.pages, M.pages, cover, cover, spine, M.pages]);
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
// Books along a shelf from x0..x1 (local), standing on y, back at z (spines to +z). A third of
// the spines are solid ink, the way the film blacks in every third book on a shelf.
export function bookRow({ x0, x1, y, z, rng, maxH = 0.26, depth = 0.22, extras = true }) {
  const g = new THREE.Group();
  let x = x0 + 0.012;
  let guard = 0;
  while (x < x1 - 0.03 && guard++ < 40) {
    const r = rng();
    if (r < 0.14 && extras) {
      // a short flat stack
      const n = 2 + ((rng() * 2) | 0);
      let yy = y;
      const w = rng.range(0.13, 0.17);
      if (x + w > x1) break;
      for (let i = 0; i < n; i++) {
        const t = rng.range(0.018, 0.03);
        const b = book({ w, h: rng.range(0.16, 0.22), t, flat: true, seed: (guard + i) * 13, dark: rng() < 0.35 });
        b.position.set(x + w / 2 + (rng() - 0.5) * 0.015, yy + t / 2, z + depth / 2 + (rng() - 0.5) * 0.02);
        b.rotation.y = (rng() - 0.5) * 0.12;
        g.add(b);
        yy += t;
      }
      x += w + 0.012;
    } else if (r < 0.22 && extras) {
      // a little object between books
      const o = rng() < 0.5 ? jar({ r: 0.03, h: 0.07, lines: [rng.pick(JAR_NAMES)], seed: guard * 3 }) : sphere(0.035, materials().globe, 16, 12);
      if (o.isMesh && !o.userData.height) o.position.y = y + 0.035;
      else o.position.y = y;
      o.position.x = x + 0.04;
      o.position.z = z + depth * 0.5;
      g.add(o);
      x += 0.085;
    } else {
      const t = rng.range(0.02, 0.05);
      if (x + t > x1) break;
      const h = Math.min(maxH, rng.range(0.15, 0.25));
      const w = rng.range(0.12, Math.min(0.18, depth - 0.02));
      const b = book({ w, h, t, seed: guard * 17 + 5, dark: rng() < 0.36 });
      b.position.set(x + t / 2, y + h / 2, z + w / 2 + rng.range(0, depth - w));
      // a few lean on their neighbour
      if (rng() < 0.12 && x + t + 0.03 < x1) {
        b.rotation.z = -0.16;
        b.position.x += 0.012;
        x += 0.02;
      }
      g.add(b);
      x += t + (rng() < 0.2 ? 0.02 : 0.002);
    }
  }
  return g;
}
const JAR_NAMES = ['SEL', 'THE', 'SUCRE', 'CAFE', 'FIGUES', 'MIEL', 'RIZ', 'POIVRE', 'TILLEUL', 'SAUGE', 'CLOUS', 'ORGE'];

// ---- shelving ------------------------------------------------------------------------------------
export function shelfUnit({ w, h, d, boards, thick = 0.022, back = true, plinth = 0.06 }) {
  const M = materials();
  const g = new THREE.Group();
  const side = (x) => {
    const s = box(thick, h, d, M.wood);
    s.position.set(x, h / 2, 0);
    g.add(s);
  };
  side(-w / 2 + thick / 2);
  side(w / 2 - thick / 2);
  if (back) {
    const b = box(w, h, 0.01, M.wood);
    b.position.set(0, h / 2, -d / 2 + 0.005);
    g.add(b);
  }
  const top = box(w + 0.03, thick, d + 0.02, M.wood);
  top.position.set(0, h - thick / 2, 0.01);
  g.add(top);
  for (const y of boards) {
    const b = box(w - thick * 2, thick, d - 0.01, M.wood);
    b.position.set(0, y - thick / 2, 0);
    g.add(b);
  }
  if (plinth > 0) {
    const p = box(w - thick * 2, plinth, d - 0.02, M.wood);
    p.position.set(0, plinth / 2, 0);
    g.add(p);
  }
  g.userData.inner = { x0: -w / 2 + thick, x1: w / 2 - thick, z0: -d / 2 + 0.01 };
  return g;
}

// ---- frames, clock, signs ----------------------------------------------------------------------
// A paper-white frame around a solid-ink mat; the picture inside is one drawn subject.
export function pictureFrame({ w, h, kind, seed = 1, rim = 0.022, depth = 0.028, ornate = false }) {
  const M = materials();
  const g = new THREE.Group();
  const fm = M.frame;
  const top = box(w, rim, depth, fm);
  top.position.set(0, h / 2 - rim / 2, 0);
  const bot = box(w, rim, depth, fm);
  bot.position.set(0, -h / 2 + rim / 2, 0);
  const left = box(rim, h - rim * 2, depth, fm);
  left.position.set(-w / 2 + rim / 2, 0, 0);
  const right = box(rim, h - rim * 2, depth, fm);
  right.position.set(w / 2 - rim / 2, 0, 0);
  g.add(top, bot, left, right);
  if (ornate) {
    for (const [x, y] of [[-w / 2 + rim / 2, h / 2 - rim / 2], [w / 2 - rim / 2, h / 2 - rim / 2], [-w / 2 + rim / 2, -h / 2 + rim / 2], [w / 2 - rim / 2, -h / 2 + rim / 2]]) {
      const c = box(rim * 1.7, rim * 1.7, depth * 1.2, fm);
      c.position.set(x, y, 0);
      g.add(c);
    }
  }
  const art = plane(w - rim * 2, h - rim * 2, inkMaterial({ map: T.pictureTexture(kind, { seed }), hatch: 0.12 }));
  art.position.z = depth / 2 - 0.008;
  g.add(art);
  g.userData.size = { w, h, depth };
  return g;
}
export function roundFrame({ r, kind = null, tex = null, depth = 0.04, rim = 0.02, seed = 1 }) {
  const M = materials();
  const g = new THREE.Group();
  const ringGeo = new THREE.TorusGeometry(r - rim / 2, rim / 2, 8, 40);
  const ringM = new THREE.Mesh(ringGeo, M.frame);
  ringM.castShadow = true;
  ringM.position.z = depth / 2 - rim / 2;
  g.add(ringM);
  const body = cyl(r - rim * 0.6, r - rim * 0.6, depth - rim / 2, M.frame, 40);
  body.rotation.x = Math.PI / 2;
  body.position.z = 0;
  g.add(body);
  const face = new THREE.Mesh(new THREE.CircleGeometry(r - rim, 40), inkMaterial({ map: tex ?? T.pictureTexture(kind, { seed, round: true }), hatch: 0.1 }));
  face.position.z = depth / 2 - 0.004;
  g.add(face);
  return g;
}
export function wallClock({ r = 0.17 }) {
  const M = materials();
  const g = roundFrame({ r, tex: T.clockTexture(), depth: 0.06, rim: 0.024 });
  // hands (a fixed, deadpan time: five to midnight), solid ink
  const hour = box(0.012, r * 0.5, 0.004, M.solid);
  hour.geometry.translate(0, r * 0.2, 0);
  hour.rotation.z = 0.06;
  hour.position.z = 0.03;
  const minute = box(0.008, r * 0.78, 0.004, M.solid);
  minute.geometry.translate(0, r * 0.32, 0);
  minute.rotation.z = Math.PI / 6;
  minute.position.z = 0.034;
  const pin = cyl(0.008, 0.008, 0.01, M.solid, 10);
  pin.rotation.x = Math.PI / 2;
  pin.position.z = 0.036;
  g.add(hour, minute, pin);
  // a pendulum below, swinging on twos
  const pend = new THREE.Group();
  pend.position.set(0, -r + 0.01, 0.005);
  const rodM = rod([0, 0, 0], [0, -0.16, 0], 0.004, M.solid);
  const bob = cyl(0.028, 0.028, 0.012, M.solid, 20);
  bob.rotation.x = Math.PI / 2;
  bob.position.y = -0.17;
  pend.add(rodM, bob);
  g.add(pend);
  g.userData.pendulum = pend;
  return g;
}
export function signBoard({ w, h, depth = 0.02, lines, sizes = null, border = 'double', texW = 1024 }) {
  const M = materials();
  const tex = T.signTexture({ lines, w: texW, h: Math.round((texW * h) / w), border, sizes });
  const front = inkMaterial({ map: tex, hatch: 0.12 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), [M.wood, M.wood, M.wood, M.wood, front, M.wood]);
  m.castShadow = true;
  return m;
}
// two cords from a frame's top corners up to a hook
export function hangCords(g, cx, topY, halfW, hookY, z, r = 0.0016) {
  const M = materials();
  g.add(rod([cx - halfW, topY, z], [cx, hookY, z - 0.005], r, M.cord, 5));
  g.add(rod([cx + halfW, topY, z], [cx, hookY, z - 0.005], r, M.cord, 5));
  const hook = sphere(0.009, M.solid, 8, 6);
  hook.position.set(cx, hookY, z - 0.005);
  g.add(hook);
}

// ---- curtains -------------------------------------------------------------------------------------
export function curtainPanel({ w = 0.32, h = 1.7, pleats = 3, amp = 0.018 }) {
  const geo = new THREE.PlaneGeometry(w, h, pleats * 6, 4);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const u = (x + w / 2) / w;
    const gather = 0.65 + 0.35 * (1 - (y + h / 2) / h); // fuller at the hem than at the heading
    pos.setZ(i, Math.sin(u * Math.PI * 2 * pleats) * amp * gather);
    pos.setX(i, x * (0.9 + 0.1 * (1 - (y + h / 2) / h)));
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, inkMaterial({ map: T.curtainTexture(), hatch: 0.2, side: THREE.DoubleSide }));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
export function curtainSet({ x0, x1, rodY, panelW, dropTo, z }) {
  const M = materials();
  const g = new THREE.Group();
  const rodM = rod([x0, rodY, z], [x1, rodY, z], 0.012, M.solid, 10);
  g.add(rodM);
  for (const x of [x0, x1]) {
    const f = sphere(0.028, M.solid, 10, 8);
    f.position.set(x, rodY, z);
    g.add(f);
  }
  const h = rodY - 0.02 - dropTo;
  for (const cx of [x0 + panelW / 2 + 0.03, x1 - panelW / 2 - 0.03]) {
    const p = curtainPanel({ w: panelW, h });
    p.position.set(cx, rodY - 0.02 - h / 2, z + 0.03);
    g.add(p);
    for (let i = 0; i < 6; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 6, 12), M.solid);
      ring.position.set(cx - panelW / 2 + 0.02 + (i / 5) * (panelW - 0.04), rodY, z);
      ring.rotation.y = Math.PI / 2;
      g.add(ring);
    }
    // a tie-back band mid-way, solid
    const tie = box(panelW * 0.8, 0.035, 0.09, M.solid);
    tie.position.set(cx, rodY - h * 0.62, z + 0.03);
    g.add(tie);
  }
  return g;
}

// ---- rug ------------------------------------------------------------------------------------------
export function rug({ w = 3.2, d = 2.6 }) {
  const M = materials();
  const g = new THREE.Group();
  const top = inkMaterial({ map: T.rugTexture(), hatch: 0.6 });
  const side = inkMaterial({ hatch: 0.7 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), [side, side, top, side, side, side]);
  m.position.y = 0.006;
  m.receiveShadow = true;
  g.add(m);
  for (const s of [1, -1]) {
    const f = plane(w, 0.09, M.fringe);
    f.rotation.set(-Math.PI / 2, 0, s > 0 ? 0 : Math.PI);
    f.position.set(0, 0.004, s * (d / 2 + 0.045));
    g.add(f);
  }
  return g;
}

// ---- bar cart: two boards on four legs, wheels, one handle; nothing else in the way of the bottles
export function barCart({ w = 0.9, d = 0.42, h = 0.8 }) {
  const M = materials();
  const g = new THREE.Group();
  const legR = 0.012;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(rod([sx * (w / 2 - 0.025), 0.05, sz * (d / 2 - 0.025)], [sx * (w / 2 - 0.025), h + 0.02, sz * (d / 2 - 0.025)], legR, M.solid));
  for (const y of [0.3, h]) {
    const s = box(w, 0.022, d, M.wood);
    s.position.y = y;
    g.add(s);
  }
  // a low lip at the back of the top board so the bottles read as held
  const lip = box(w, 0.04, 0.012, M.wood);
  lip.position.set(0, h + 0.03, -d / 2 + 0.006);
  g.add(lip);
  // one push handle at the right end
  const hd = new THREE.Mesh(new THREE.TorusGeometry(d / 2 - 0.04, 0.009, 6, 20, Math.PI), M.solid);
  hd.position.set(w / 2 + 0.02, h + 0.02, 0);
  hd.rotation.y = Math.PI / 2;
  g.add(hd);
  // wheels: solid discs
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const wh = cyl(0.045, 0.045, 0.014, M.solid, 20);
    wh.rotation.z = Math.PI / 2;
    wh.position.set(sx * (w / 2 - 0.025), 0.045, sz * (d / 2 - 0.025));
    g.add(wh);
    const hub = cyl(0.012, 0.012, 0.02, M.paper, 8);
    hub.rotation.z = Math.PI / 2;
    hub.position.copy(wh.position);
    g.add(hub);
  }
  g.userData.top = h + 0.011;
  g.userData.lower = 0.311;
  return g;
}

// ---- radio: a hero prop the size of a bottle crate -------------------------------------------------
export function radio({ w = 0.44, h = 0.27, d = 0.19 }) {
  const M = materials();
  const g = new THREE.Group();
  const front = inkMaterial({ map: T.radioTexture(), hatch: 0.2 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [M.wood, M.wood, M.wood, M.wood, front, M.wood]);
  body.castShadow = true;
  body.position.y = h / 2 + 0.014;
  g.add(body);
  // two solid knobs under the dial, where the drawing has them (u 0.637 / 0.836, v 0.314)
  for (const u of [0.637, 0.836]) {
    const k = cyl(0.024, 0.024, 0.016, M.solid, 16);
    k.rotation.x = Math.PI / 2;
    k.position.set((u - 0.5) * w, (0.314 - 0.5) * h + body.position.y, d / 2 + 0.008);
    g.add(k);
    const mark = box(0.005, 0.014, 0.004, M.paper);
    mark.position.set(k.position.x, k.position.y + 0.011, d / 2 + 0.017);
    g.add(mark);
  }
  for (const sx of [-1, 1]) {
    const foot = cyl(0.014, 0.016, 0.014, M.solid, 10);
    foot.position.set(sx * (w / 2 - 0.04), 0.007, 0.03);
    g.add(foot);
  }
  const ant = rod([w / 2 - 0.04, h, -0.04], [w / 2 + 0.2, h + 0.36, -0.06], 0.004, M.solid);
  g.add(ant);
  g.userData.width = w;
  g.userData.height = h;
  return g;
}

// ---- lamps ------------------------------------------------------------------------------------------
export function floorLamp({ h = 1.62 }) {
  const M = materials();
  const g = new THREE.Group();
  const base = cyl(0.11, 0.15, 0.03, M.solid, 24);
  base.position.y = 0.015;
  g.add(base);
  const pole = cyl(0.013, 0.016, h - 0.3, M.solid, 10);
  pole.position.y = 0.03 + (h - 0.3) / 2;
  g.add(pole);
  for (const y of [0.4, h - 0.5]) {
    const knob = sphere(0.024, M.solid, 10, 8);
    knob.position.y = y;
    g.add(knob);
  }
  const shade = cyl(0.16, 0.25, 0.26, M.shade, 28, true);
  shade.position.y = h - 0.13;
  g.add(shade);
  const fr = cyl(0.252, 0.252, 0.075, M.fringe, 28, true);
  fr.position.y = h - 0.26 - 0.03;
  g.add(fr);
  const topRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.006, 6, 28), M.solid);
  topRing.rotation.x = Math.PI / 2;
  topRing.position.y = h;
  g.add(topRing);
  const fin = sphere(0.02, M.solid, 10, 8);
  fin.position.y = h + 0.03;
  g.add(fin);
  // pull chain
  g.add(rod([0.02, h - 0.28, 0.12], [0.03, h - 0.42, 0.13], 0.002, M.cord, 4));
  const pull = sphere(0.008, M.solid, 6, 5);
  pull.position.set(0.03, h - 0.43, 0.13);
  g.add(pull);
  return g;
}
export function mushroomLamp() {
  const M = materials();
  const g = new THREE.Group();
  const base = lathe([[0, 0], [0.055, 0], [0.06, 0.01], [0.035, 0.03], [0.016, 0.05], [0.016, 0.19], [0.03, 0.2], [0, 0.2]], M.solid, 20);
  g.add(base);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.shade);
  dome.position.y = 0.19;
  dome.castShadow = true;
  g.add(dome);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.005, 6, 28), M.solid);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.19;
  g.add(rim);
  const sw = rod([0.016, 0.1, 0], [0.04, 0.085, 0], 0.004, M.solid, 6);
  g.add(sw);
  return g;
}
// The hanging lamp of the kitchen frame: a rod from a ceiling rose, three curved arms, three
// petal shades pointing down.
export function pendantLamp({ ceilY, dropTo, arms = 3 }) {
  const M = materials();
  const g = new THREE.Group();
  const rose = cyl(0.05, 0.06, 0.02, M.solid, 16);
  rose.position.y = ceilY - 0.01;
  g.add(rose);
  g.add(rod([0, ceilY - 0.02, 0], [0, dropTo, 0], 0.006, M.solid, 8));
  const hub = sphere(0.028, M.solid, 12, 8);
  hub.position.y = dropTo;
  g.add(hub);
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2 + Math.PI / 2;
    // a quarter-torus arm curving out and down, then a petal shade hanging from its end
    const armR = 0.16;
    const arm = new THREE.Mesh(new THREE.TorusGeometry(armR, 0.006, 6, 14, Math.PI / 2), M.solid);
    arm.castShadow = true;
    arm.rotation.y = a;
    arm.position.set(0, dropTo - armR, 0);
    g.add(arm);
    const end = [Math.cos(a) * armR, dropTo - armR, -Math.sin(a) * armR];
    const petal = cyl(0.03, 0.075, 0.09, M.shade, 12, true);
    petal.position.set(end[0], end[1] - 0.045, end[2]);
    g.add(petal);
    const bulb = sphere(0.02, M.glass, 10, 6);
    bulb.position.set(end[0], end[1] - 0.09, end[2]);
    g.add(bulb);
  }
  return g;
}

// A cork board with pinned notes and cards in an uneven grid.
export function pinBoard({ w = 0.42, h = 0.52, rng }) {
  const M = materials();
  const g = new THREE.Group();
  const cork = inkMaterial({ map: T.corkTexture(), hatch: 0.45 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), [M.wood, M.wood, M.wood, M.wood, cork, M.wood]);
  board.castShadow = true;
  g.add(board);
  const rim = 0.02;
  for (const [x, y, ww, hh] of [[0, h / 2 - rim / 2, w, rim], [0, -h / 2 + rim / 2, w, rim], [-w / 2 + rim / 2, 0, rim, h - 2 * rim], [w / 2 - rim / 2, 0, rim, h - 2 * rim]]) {
    const b = box(ww, hh, 0.03, M.solid);
    b.position.set(x, y, 0.005);
    g.add(b);
  }
  const kinds = ['lines', 'card', 'number', 'sketch', 'lines', 'card'];
  const cols = 3, rows = 4;
  let k = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rng() < 0.15) continue;
      const nw = rng.range(0.08, 0.12), nh = rng.range(0.06, 0.1);
      const kind = kinds[k++ % kinds.length];
      const tex = T.noteTexture({ seed: 30 + k, w: 128, h: Math.round((128 * nh) / nw), kind, tint: rng() < 0.3 ? '#f2ebdd' : '#f8f5ee' });
      const note = new THREE.Mesh(new THREE.PlaneGeometry(nw, nh), inkMaterial({ map: tex, hatch: 0.1 }));
      note.position.set(-w / 2 + rim + 0.03 + (c + 0.5) * ((w - 2 * rim - 0.06) / cols) + (rng() - 0.5) * 0.02, h / 2 - rim - 0.03 - (r + 0.5) * ((h - 2 * rim - 0.06) / rows) + (rng() - 0.5) * 0.02, 0.012 + r * 0.0005);
      note.rotation.z = (rng() - 0.5) * 0.2;
      note.castShadow = true;
      g.add(note);
      const pin = sphere(0.006, M.solid, 6, 5);
      pin.position.set(note.position.x + (rng() - 0.5) * 0.02, note.position.y + nh / 2 - 0.008, 0.018);
      g.add(pin);
    }
  }
  return g;
}

// A coir doormat: a dark field with the greeting left in paper.
export function doorMat({ w = 0.7, d = 0.42 }) {
  const M = materials();
  const tex = T.matTexture({ text: 'BIENVENUE', w: 512, h: Math.round((512 * d) / w), seed: 41 });
  const top = inkMaterial({ map: tex, hatch: 0.5 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.014, d), [M.paperStack, M.paperStack, top, M.paperStack, M.paperStack, M.paperStack]);
  m.position.y = 0.007;
  m.receiveShadow = true;
  return m;
}

// A small wall shelf on two brackets.
export function wallShelf({ w = 0.5, d = 0.16 }) {
  const M = materials();
  const g = new THREE.Group();
  const b = box(w, 0.02, d, M.wood);
  b.position.set(0, 0, d / 2);
  g.add(b);
  for (const sx of [-1, 1]) {
    g.add(rod([sx * (w / 2 - 0.05), -0.01, d - 0.02], [sx * (w / 2 - 0.05), -0.13, 0.01], 0.008, M.solid));
    const back = box(0.02, 0.15, 0.02, M.solid);
    back.position.set(sx * (w / 2 - 0.05), -0.075, 0.01);
    g.add(back);
  }
  g.userData.top = 0.01;
  return g;
}

// ---- hat stand ----------------------------------------------------------------------------------------
// A turned pole with hooks; on it a solid-black bowler, a paper boater with a solid band, a solid
// black overcoat (a cut-out with three paper fold lines), a striped scarf; an umbrella and a cane
// lean on the pole.
export function hatStand({ h = 1.85, rng }) {
  const M = materials();
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    g.add(rod([0, 0.04, 0], [Math.cos(a) * 0.2, 0.012, Math.sin(a) * 0.2], 0.012, M.solid));
    const foot = sphere(0.018, M.solid, 8, 6);
    foot.position.set(Math.cos(a) * 0.2, 0.014, Math.sin(a) * 0.2);
    g.add(foot);
  }
  const pole = cyl(0.016, 0.02, h, M.wood, 12);
  pole.position.y = h / 2;
  g.add(pole);
  for (const y of [0.9, h - 0.02]) {
    const knob = sphere(0.03, M.solid, 10, 8);
    knob.position.y = y;
    g.add(knob);
  }
  const hooks = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.25;
    const tip = [Math.cos(a) * 0.15, h - 0.02 + 0.06, Math.sin(a) * 0.15];
    g.add(rod([0, h - 0.06, 0], tip, 0.008, M.solid));
    const t = sphere(0.014, M.solid, 8, 6);
    t.position.set(...tip);
    g.add(t);
    hooks.push({ pos: tip, a });
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.9;
    const tip = [Math.cos(a) * 0.12, 0.96, Math.sin(a) * 0.12];
    g.add(rod([0, 0.9, 0], tip, 0.007, M.solid));
  }
  // hats on the front-facing hooks
  const front = hooks.filter((k) => k.pos[2] > -0.05).sort((p, q) => p.pos[0] - q.pos[0]);
  const makeHat = (kind) => {
    const hg = new THREE.Group();
    if (kind === 'bowler') {
      // a solid crown on a solid brim, a paper band line between them
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.solid);
      crown.scale.y = 0.85;
      crown.castShadow = true;
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.005, 6, 28), M.paper);
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.012;
      const brim = cyl(0.125, 0.13, 0.008, M.solid, 24);
      hg.add(crown, band, brim);
    } else {
      // a paper boater with a solid black band
      const crown = cyl(0.082, 0.085, 0.07, M.paperStack, 24);
      crown.position.y = 0.035;
      const band = cyl(0.088, 0.088, 0.024, M.solid, 24);
      band.position.y = 0.028;
      const brim = cyl(0.14, 0.14, 0.006, M.paperStack, 24);
      hg.add(crown, band, brim);
    }
    return hg;
  };
  const kinds = ['bowler', 'boater'];
  front.slice(0, 2).forEach((k, i) => {
    const hat = makeHat(kinds[i]);
    hat.userData.noShadow = true;
    hat.position.set(k.pos[0] * 1.15, k.pos[1] - 0.02, k.pos[2] * 1.15);
    hat.rotation.set(0.45 * Math.sin(k.a), 0, -0.45 * Math.cos(k.a));
    g.add(hat);
  });
  // the overcoat, hanging from a hook at the back, facing the room: a solid cut-out
  const coat = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.88), M.coat);
  coat.userData.noShadow = true; // its shadow on the wall beside it would be a second coat
  coat.position.set(-0.07, h - 0.02 - 0.44, 0.02);
  coat.rotation.y = 0.12;
  g.add(coat);
  // a striped scarf over the middle hook
  const scarf = box(0.06, 0.5, 0.012, M.stripes);
  scarf.position.set(-0.14, 0.9 - 0.25, 0.14);
  scarf.rotation.z = 0.06;
  g.add(scarf);
  // an umbrella and a cane leaning on the pole
  const umb = new THREE.Group();
  const cone = cyl(0.008, 0.035, 0.62, M.solid, 10);
  cone.position.y = 0.4;
  umb.add(cone);
  umb.add(rod([0, 0, 0], [0, 0.82, 0], 0.005, M.solid));
  const crook = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.005, 6, 12, Math.PI), M.solid);
  crook.position.set(0.035, 0.82, 0);
  umb.add(crook);
  umb.position.set(0.09, 0, 0.17);
  umb.rotation.z = -0.2;
  g.add(umb);
  const cane = rod([-0.12, 0.0, 0.16], [-0.06, 0.9, 0.08], 0.008, M.solid);
  g.add(cane);
  const knobC = sphere(0.02, M.solid, 8, 6);
  knobC.position.set(-0.06, 0.9, 0.08);
  g.add(knobC);
  return g;
}

// ---- plant --------------------------------------------------------------------------------------------
export function plant({ rng, leaves = 11, kind = 'palm', scale = 1 }) {
  const M = materials();
  const g = new THREE.Group();
  const pot = lathe([[0, 0], [0.1, 0], [0.11, 0.005], [0.13, 0.24], [0.15, 0.24], [0.15, 0.3], [0.135, 0.3], [0.125, 0.29], [0.11, 0.285], [0, 0.285]], M.pot, 22);
  g.add(pot);
  const soil = cyl(0.11, 0.11, 0.01, M.soil, 22);
  soil.position.y = 0.285;
  g.add(soil);
  const leafMat = alphaMat(T.leafTexture({ kind }), 0.1);
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < leaves; i++) {
    const a = (i / leaves) * Math.PI * 2 + rng() * 0.4;
    const tilt = rng.range(0.35, 1.1); // from vertical
    const len = rng.range(0.3, 0.55) * scale;
    const dir = new THREE.Vector3(Math.sin(tilt) * Math.cos(a), Math.cos(tilt), Math.sin(tilt) * Math.sin(a)).normalize();
    const base = new THREE.Vector3((rng() - 0.5) * 0.06, 0.29, (rng() - 0.5) * 0.06);
    const end = base.clone().add(dir.clone().multiplyScalar(len));
    g.add(rod(base.toArray(), end.toArray(), 0.006, M.soil, 6));
    const lw = rng.range(0.13, 0.19) * scale, lh = rng.range(0.34, 0.5) * scale;
    const geo = new THREE.PlaneGeometry(lw, lh, 1, 6);
    geo.translate(0, lh / 2, 0);
    // droop the tip
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const yy = p.getY(k) / lh;
      p.setZ(k, -yy * yy * lh * 0.35);
    }
    geo.computeVertexNormals();
    const leaf = new THREE.Mesh(geo, leafMat);
    leaf.castShadow = true;
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
    leaf.quaternion.copy(q);
    leaf.rotateY(Math.PI / 2 + rng.range(-0.5, 0.5));
    leaf.position.copy(end).sub(dir.clone().multiplyScalar(0.03));
    g.add(leaf);
  }
  return g;
}

// ---- cat: a solid black cat sitting up, facing the room, the way the film puts a cat on a ledge:
// two paper eye slits, paper whiskers, the tail curled round the front as a solid tube with a
// paper line along it.
export function cat() {
  const M = materials();
  const g = new THREE.Group();
  const body = sphere(0.07, M.solid, 18, 14);
  body.scale.set(1.0, 1.45, 0.95);
  body.position.set(0, 0.1, 0);
  g.add(body);
  const chest = sphere(0.058, M.solid, 16, 12);
  chest.scale.set(1, 1.1, 0.9);
  chest.position.set(0, 0.11, 0.03);
  g.add(chest);
  // the head carries its eye slits and whiskers in its texture (a separate eye object would be
  // swallowed by its own outline at this size)
  const head = sphere(0.054, inkMaterial({ map: T.catHeadTexture(), hatch: 0.5, lineWeight: 1.1 }), 20, 14);
  head.scale.set(1.08, 0.95, 0.95);
  head.position.set(0, 0.235, 0.035);
  g.add(head);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.04, 6), M.solid);
    ear.position.set(s * 0.034, 0.28, 0.03);
    ear.rotation.z = -s * 0.3;
    g.add(ear);
    // front paws
    const paw = sphere(0.02, M.solid, 10, 8);
    paw.scale.set(1, 0.7, 1.3);
    paw.position.set(s * 0.028, 0.014, 0.06);
    g.add(paw);
  }
  // tail from the back, round the right side, along the front
  const pts = [new THREE.Vector3(-0.02, 0.03, -0.05), new THREE.Vector3(0.075, 0.02, -0.03), new THREE.Vector3(0.09, 0.016, 0.05), new THREE.Vector3(0.03, 0.014, 0.1), new THREE.Vector3(-0.05, 0.016, 0.1)];
  const curve = new THREE.CatmullRomCurve3(pts);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.016, 8, false), M.solid);
  g.add(tail);
  const line = new THREE.CatmullRomCurve3(pts.map((p) => p.clone().add(new THREE.Vector3(0, 0.012, 0.011))));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(line, 24, 0.0024, 5, false), M.paper));
  const tip = sphere(0.016, M.solid, 8, 6);
  tip.position.copy(pts[pts.length - 1]);
  g.add(tip);
  g.userData.noShadow = true;
  return g;
}

// ---- console / chest ----------------------------------------------------------------------------------------
export function console_({ w = 1.16, h = 0.82, d = 0.38 }) {
  const M = materials();
  const g = new THREE.Group();
  const legH = 0.12;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = lathe([[0, 0], [0.028, 0], [0.028, 0.02], [0.02, 0.03], [0.034, 0.06], [0.034, 0.09], [0.026, 0.1], [0.026, legH], [0, legH]], M.wood, 12);
    leg.position.set(sx * (w / 2 - 0.06), 0, sz * (d / 2 - 0.06));
    g.add(leg);
  }
  const body = box(w, h - legH - 0.03, d, M.wood);
  body.position.y = legH + (h - legH - 0.03) / 2;
  g.add(body);
  const top = box(w + 0.04, 0.03, d + 0.04, M.wood);
  top.position.y = h - 0.015;
  g.add(top);
  const dw = w / 2 - 0.06, dh = (h - legH - 0.03) / 2 - 0.04;
  for (const sx of [-1, 1]) for (let r = 0; r < 2; r++) {
    const f = box(dw, dh, 0.014, M.wood);
    const y = legH + 0.03 + dh / 2 + r * (dh + 0.03);
    f.position.set(sx * (dw / 2 + 0.02), y, d / 2 + 0.007);
    g.add(f);
    for (const kx of [-0.14, 0.14]) {
      const k = sphere(0.014, M.solid, 8, 6);
      k.position.set(f.position.x + kx, y, d / 2 + 0.024);
      g.add(k);
      const back = cyl(0.022, 0.022, 0.006, M.solid, 10);
      back.rotation.x = Math.PI / 2;
      back.position.set(f.position.x + kx, y, d / 2 + 0.016);
      g.add(back);
    }
  }
  g.userData.top = h;
  return g;
}

export function globe() {
  const M = materials();
  const g = new THREE.Group();
  const base = lathe([[0, 0], [0.06, 0], [0.06, 0.008], [0.02, 0.012], [0.012, 0.05], [0, 0.05]], M.solid, 16);
  g.add(base);
  const s = sphere(0.08, M.globe, 24, 16);
  s.position.y = 0.13;
  s.rotation.z = 0.4;
  g.add(s);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.005, 6, 24, Math.PI), M.solid);
  arc.position.y = 0.13;
  arc.rotation.set(0, 0, Math.PI / 2 + 0.4);
  g.add(arc);
  g.add(rod([0, 0.05, 0], [0, 0.13 - 0.088 * Math.cos(0.4), 0], 0.005, M.solid));
  return g;
}
export function vase({ rng }) {
  const M = materials();
  const g = new THREE.Group();
  const v = lathe([[0, 0], [0.04, 0], [0.05, 0.02], [0.06, 0.09], [0.04, 0.14], [0.03, 0.2], [0.04, 0.24], [0.035, 0.24], [0.025, 0.2], [0, 0.2]], M.pot, 18);
  g.add(v);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const tilt = rng.range(0.1, 0.45);
    const len = rng.range(0.22, 0.34);
    const end = [Math.sin(tilt) * Math.cos(a) * len, 0.2 + Math.cos(tilt) * len, Math.sin(tilt) * Math.sin(a) * len];
    g.add(rod([0, 0.2, 0], end, 0.003, M.solid, 5));
    // dried flower heads: solid, every other one paper
    const head = sphere(0.022, i % 2 ? M.paperStack : M.solid, 8, 6);
    head.scale.set(1, 1.5, 1);
    head.position.set(...end);
    g.add(head);
  }
  return g;
}
export function newspaperStack({ n = 5, rng }) {
  const M = materials();
  const g = new THREE.Group();
  let y = 0;
  for (let i = 0; i < n; i++) {
    const t = rng.range(0.012, 0.02);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, t, 0.22), [M.paperStack, M.paperStack, M.newspaper, M.paperStack, M.paperStack, M.paperStack]);
    m.castShadow = true;
    m.position.set((rng() - 0.5) * 0.03, y + t / 2, (rng() - 0.5) * 0.03);
    m.rotation.y = (rng() - 0.5) * 0.3;
    g.add(m);
    y += t;
  }
  g.userData.height = y;
  return g;
}
export function doily(r = 0.14) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), alphaMat(T.doilyTexture(), 0.2));
  m.rotation.x = -Math.PI / 2;
  return m;
}
export function candleStick() {
  const M = materials();
  const g = new THREE.Group();
  const s = lathe([[0, 0], [0.04, 0], [0.04, 0.01], [0.012, 0.02], [0.012, 0.1], [0.02, 0.11], [0.02, 0.13], [0.012, 0.135], [0, 0.135]], M.solid, 14);
  g.add(s);
  const c = cyl(0.01, 0.011, 0.14, M.paper, 10);
  c.position.y = 0.2;
  g.add(c);
  g.add(rod([0, 0.27, 0], [0.003, 0.29, 0], 0.0015, M.solid, 4));
  return g;
}
export { PAPER };
