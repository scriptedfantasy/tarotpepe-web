// PIECE: table — the reading table: a round café table on a turned pedestal, dressed with a square
// fringed cloth that hangs in real folds (its four points hang low at the diagonals), and the small
// things that live on its far half: a wine glass, an ashtray with stubbed cigarettes, a candle stuck
// in a bottle, a saucer with an espresso cup and a sugar cube, a folded newspaper, coins.
// The near half stays clear for the three card slots and the deck (ctx.layout.spread / deck).
import * as THREE from 'three';
import { inkMaterial } from '../core/strokes.js';
import { surface, lathe, merge, smooth } from './table-geo.js';
import { clothTopTexture, skirtTexture, woodTexture, wrapRepeat } from './table-textures.js';
import { buildStillLife } from './table-objects.js';

export const meta = {
  name: 'table',
  judge: { shot: 'table', states: ['default'] },
  files: ['src/pieces/table.js', 'src/pieces/table-geo.js', 'src/pieces/table-textures.js', 'src/pieces/table-objects.js'],
};

export async function build(ctx) {
  const { top, radius: R } = ctx.layout.table;
  const g = new THREE.Group();
  g.name = 'table';

  // ---------- the wooden top and the turned pedestal ----------
  const wood = inkMaterial({ map: wrapRepeat(woodTexture()), hatch: 0.6 });
  const topDisc = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.012, R - 0.018, 0.03, 64), wood);
  topDisc.position.y = top - 0.017;
  topDisc.castShadow = true;
  topDisc.receiveShadow = true;
  g.add(topDisc);

  // pedestal profile (r, y), bottom → top: a weighted cast base, a collar, a column with a
  // turned swell, a neck ring, a flared capital, a plate under the top
  const pedestalProfile = [
    [0.0, 0.0],
    [0.27, 0.0],
    [0.275, 0.014],
    [0.268, 0.026],
    [0.25, 0.03],
    [0.245, 0.04],
    [0.215, 0.052],
    [0.17, 0.072],
    [0.125, 0.095],
    [0.09, 0.118],
    [0.072, 0.135],
    [0.066, 0.148],
    [0.078, 0.152],
    [0.08, 0.17],
    [0.068, 0.178],
    [0.05, 0.184],
    [0.044, 0.196],
    [0.042, 0.29],
    [0.052, 0.318],
    [0.07, 0.35],
    [0.08, 0.395],
    [0.078, 0.44],
    [0.064, 0.48],
    [0.05, 0.505],
    [0.044, 0.52],
    [0.058, 0.532],
    [0.06, 0.548],
    [0.046, 0.558],
    [0.042, 0.63],
    [0.05, 0.665],
    [0.072, 0.688],
    [0.105, 0.702],
    [0.14, 0.71],
    [0.16, 0.716],
    [0.16, top - 0.032],
    [0.0, top - 0.032],
  ];
  const pedestal = new THREE.Mesh(lathe(pedestalProfile, 48), wood);
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  g.add(pedestal);
  // four pad feet under the base, a beaded collar and a brace ring on the column (the pen
  // needs something to draw)
  const feet = inkMaterial({ hatch: 0.7 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.012, 16), feet);
    f.position.set(Math.sin(a) * 0.215, 0.006, Math.cos(a) * 0.215);
    g.add(f);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.006, 8, 32), feet);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.245;
  g.add(ring);
  {
    const beads = [];
    const tmp = new THREE.Object3D();
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const b = new THREE.SphereGeometry(0.0065, 8, 6);
      tmp.position.set(Math.sin(a) * 0.078, 0.161, Math.cos(a) * 0.078);
      tmp.updateMatrix();
      b.applyMatrix4(tmp.matrix);
      beads.push(b);
    }
    const bm = new THREE.Mesh(merge(beads), feet);
    bm.castShadow = true;
    g.add(bm);
  }

  // ---------- the cloth: a square, W half-width, laid on the round top ----------
  const W = 0.78; // half-width of the square cloth
  const S = 0.012; // radius of the bend over the table edge
  const rho = (th) => W / Math.max(Math.abs(Math.cos(th)), Math.abs(Math.sin(th)));
  const corner = (th) => (rho(th) / W - 1) / (Math.SQRT2 - 1); // 0 at edge middles, 1 at corners
  const hang = (th) => rho(th) - R + 0.006 * Math.sin(9 * th + 1.3) + 0.004 * Math.sin(17 * th + 0.4) + 0.008 * Math.sin(2 * th + 0.6);
  // pleats: knife pleats — a sawtooth with a long gentle face and a short steep one, so every
  // pleat has a real crease (a dihedral the ink pass draws as one fold line). The excess fabric of
  // a square cloth gathers towards the corners, so the amplitude follows `corner`.
  const saw = (x, steep = 0.14) => {
    const p = x / (Math.PI * 2) - Math.floor(x / (Math.PI * 2)); // 0..1 within the period
    return p < 1 - steep ? -1 + (2 * p) / (1 - steep) : 1 - (2 * (p - (1 - steep))) / steep;
  };
  const fold = (th) => 0.8 * saw(24 * th + 0.8) + 0.2 * Math.sin(9 * th + 2.0);
  const arc = S * (Math.PI / 2);
  // position on the skirt for angle th and drop fraction v (0 at the top edge, 1 at the hem)
  function skirtPoint(th, v) {
    const H = hang(th);
    const d = v * H;
    let r, y;
    if (d < arc) {
      const a = d / S;
      r = R - S + S * Math.sin(a);
      y = top - S + S * Math.cos(a);
    } else {
      const dd = d - arc;
      const c = corner(th);
      const grow = smooth(0.0, 0.035, dd);
      const amp = (0.016 + 0.04 * Math.pow(c, 1.4)) * grow;
      const flare = 0.006 * Math.pow(dd / 0.45, 1.3) + 0.03 * c * Math.pow(dd / 0.45, 1.6);
      r = R + 0.003 + flare + amp * fold(th);
      // the pleats lift the hem a touch where the fabric doubles back
      y = top - S - dd + 0.005 * c * grow * Math.max(0, fold(th));
    }
    return [r * Math.sin(th), y, r * Math.cos(th), (th / (Math.PI * 2)) * 2, 1 - (H - d) / 0.5];
  }
  // 720 around so the steep face of each pleat (≈2° wide) gets its own facets; flat normals so
  // the crease is a true dihedral.
  const skirtGeo = surface((u, v) => skirtPoint(u * Math.PI * 2, v), 720, 36).toNonIndexed();
  skirtGeo.computeVertexNormals();
  const skirtMat = inkMaterial({ map: skirtTexture(W, R - S), hatch: 0.55, side: THREE.DoubleSide });
  const skirt = new THREE.Mesh(skirtGeo, skirtMat);
  skirt.castShadow = true;
  skirt.receiveShadow = true;
  g.add(skirt);

  // the cloth on the top: a disc that meets the skirt at the bend
  const clothTop = new THREE.Mesh(new THREE.CircleGeometry(R - S + 0.0005, 128), inkMaterial({ map: clothTopTexture(R - S), hatch: 0.3 }));
  clothTop.rotation.x = -Math.PI / 2;
  clothTop.position.y = top + 0.0002;
  clothTop.receiveShadow = true;
  g.add(clothTop);

  // ---------- fringe: hundreds of little strands hanging from the hem ----------
  {
    const N = 420;
    const parts = [];
    const tmp = new THREE.Object3D();
    let seed = 7;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2 + (rnd() - 0.5) * 0.004;
      const p = skirtPoint(th, 1);
      const len = 0.03 + rnd() * 0.012;
      const geo = new THREE.BoxGeometry(0.0035, len, 0.0035);
      tmp.position.set(p[0] + Math.sin(th) * 0.002, p[1] - len / 2 + 0.003, p[2] + Math.cos(th) * 0.002);
      tmp.rotation.set((rnd() - 0.5) * 0.25, th, (rnd() - 0.5) * 0.25);
      tmp.updateMatrix();
      geo.applyMatrix4(tmp.matrix);
      parts.push(geo);
      // a knot at the top of every third strand
      if (i % 3 === 0) {
        const k = new THREE.SphereGeometry(0.003, 6, 5);
        tmp.rotation.set(0, 0, 0);
        tmp.position.set(p[0] + Math.sin(th) * 0.002, p[1] + 0.001, p[2] + Math.cos(th) * 0.002);
        tmp.updateMatrix();
        k.applyMatrix4(tmp.matrix);
        parts.push(k);
      }
    }
    const fringe = new THREE.Mesh(merge(parts), inkMaterial({ hatch: 0.6, lineWeight: 0.7 }));
    fringe.castShadow = true;
    g.add(fringe);
  }

  // ---------- the still life on the far half ----------
  const objects = buildStillLife(ctx, top + 0.0006);
  g.add(objects);

  g.position.set(...ctx.layout.table.pos);
  ctx.scene.add(g);
  return { group: g, top: topDisc, cloth: skirt, clothTop, pedestal, objects, setState() {} };
}
