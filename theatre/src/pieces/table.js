// PIECE: table — the reading table: a round café table on a turned pedestal, dressed with a square
// fringed café cloth laid corner-forward so a point hangs towards the visitor and the hem is two
// lines dropping out of the frame. The cloth's check is a field of short dashes in rows that bend
// with the drape — never a ruled thread, never one that crosses more than a fifth of the table —
// full round the rim and across the far half, thinning to a whisper through the middle where the
// three cards and the fan lie, with an embroidered hem band round the edge and three fold creases
// the cloth kept from the drawer (see table-weave.js and table-textures.js). The still life sits in
// one row across the far band — a wine glass, an ashtray, a candle stuck in a bottle, a saucer with
// an espresso cup, a folded newspaper, coins, a pocket watch, a folded letter, a matchbox — and the
// whole near half is clear for the three card slots and the deck (ctx.layout.spread / deck).
import * as THREE from 'three';
import { inkMaterial } from '../core/strokes.js';
import { surface, lathe, merge, smooth, CLOTH_ROT, pleatFold, SKIRT_DROP } from './table-geo.js';
import { clothTopTexture, skirtTexture, fringeTexture, woodTexture, wrapRepeat } from './table-textures.js';
import { buildStillLife, PLACES } from './table-objects.js';

export const meta = {
  name: 'table',
  judge: { shot: 'table', states: ['default'] },
  files: ['src/pieces/table.js', 'src/pieces/table-geo.js', 'src/pieces/table-textures.js', 'src/pieces/table-objects.js', 'src/pieces/table-weave.js'],
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

  // ---------- the cloth: a square, W half-width, laid corner-forward on the round top ----------
  const cloth = new THREE.Group();
  cloth.name = 'cloth';
  cloth.rotation.y = CLOTH_ROT;
  g.add(cloth);
  const W = 0.78; // half-width of the square cloth
  const S = 0.012; // radius of the bend over the table edge
  const rho = (th) => W / Math.max(Math.abs(Math.cos(th)), Math.abs(Math.sin(th)));
  const corner = (th) => (rho(th) / W - 1) / (Math.SQRT2 - 1); // 0 at edge middles, 1 at corners
  const hang = (th) => rho(th) - R + 0.006 * Math.sin(9 * th + 1.3) + 0.004 * Math.sin(17 * th + 0.4) + 0.008 * Math.sin(2 * th + 0.6);
  // pleats: knife pleats — a sawtooth with a long gentle face and a short steep one, so every
  // pleat has a real crease (a dihedral the ink pass draws as one fold line). PLEATS of them, not
  // two dozen: a skirt ruled with fine folds is all line and can never take tone, and this is the
  // largest camera-facing surface at the bottom of the frame. The excess fabric of a square cloth
  // gathers towards the corners, so the amplitude follows `corner`.
  const fold = pleatFold;
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
      const grow = smooth(0.0, 0.022, dd);
      const amp = (0.016 + 0.04 * Math.pow(c, 1.4)) * grow;
      const flare = 0.006 * Math.pow(dd / 0.45, 1.3) + 0.03 * c * Math.pow(dd / 0.45, 1.6);
      r = R + 0.003 + flare + amp * fold(th);
      // the pleats lift the hem a touch where the fabric doubles back
      y = top - S - dd + 0.005 * c * grow * Math.max(0, fold(th));
    }
    return [r * Math.sin(th), y, r * Math.cos(th), (th / (Math.PI * 2)) * 2, 1 - (H - d) / SKIRT_DROP];
  }
  // 384 around: the steep face of each of the 13 pleats (≈4.4° wide) still gets three facets, and
  // flat normals keep every crease a true dihedral.
  const skirtGeo = surface((u, v) => skirtPoint(u * Math.PI * 2, v), 384, 26).toNonIndexed();
  skirtGeo.computeVertexNormals();
  const skirtMat = inkMaterial({ map: wrapRepeat(skirtTexture(W, R - S)), hatch: 0.45, side: THREE.DoubleSide });
  const skirt = new THREE.Mesh(skirtGeo, skirtMat);
  skirt.castShadow = true;
  skirt.receiveShadow = true;
  cloth.add(skirt);

  // the cloth on the top: a disc that meets the skirt at the bend. Its check is the drawing of
  // the top; the ink pass adds tone (hatch 0.6: strokes in the shadow of the hands and the things).
  const marks = {
    rings: [
      [...PLACES.wineGlass, 0.034],
      [...PLACES.tumbler, 0.03], // the tumbler has been cleared away; its ring has not
      [0.28, -0.02, 0.031], // and one out on the bare middle, where a glass stood all evening
    ],
    crumbs: [[PLACES.plate[0] + 0.1, PLACES.plate[1] - 0.06]],
    burns: [[PLACES.ashtray[0] + 0.1, PLACES.ashtray[1] - 0.05]],
  };
  const clothTop = new THREE.Mesh(new THREE.CircleGeometry(R - S + 0.0005, 128), inkMaterial({ map: clothTopTexture(R - S, marks), hatch: 0.6 }));
  clothTop.rotation.x = -Math.PI / 2;
  clothTop.position.y = top + 0.0002;
  clothTop.receiveShadow = true;
  cloth.add(clothTop);

  // ---------- fringe: a band below the hem where only the pen's ticks exist (alpha-tested) ----------
  {
    const FR = 0.04; // strand length
    const REP = 46; // texture repeats around (≈ 370 strands)
    const fringeGeo = surface(
      (u, v) => {
        const th = u * Math.PI * 2;
        const p = skirtPoint(th, 1);
        const rr = Math.hypot(p[0], p[2]) + 0.002 + v * 0.004;
        return [Math.sin(th) * rr, p[1] + 0.004 - v * FR, Math.cos(th) * rr, u * REP, 1 - v];
      },
      384,
      2,
    );
    const fringeMat = inkMaterial({ map: fringeTexture(), hatch: 0, lineWeight: 0.5, side: THREE.DoubleSide, transparent: true });
    fringeMat.alphaTest = 0.5;
    const fringe = new THREE.Mesh(fringeGeo, fringeMat);
    fringe.castShadow = false;
    fringe.receiveShadow = true;
    cloth.add(fringe);
  }

  // ---------- the still life across the middle band ----------
  const objects = buildStillLife(ctx, top + 0.0006);
  g.add(objects);

  g.position.set(...ctx.layout.table.pos);
  ctx.scene.add(g);
  return { group: g, top: topDisc, cloth: skirt, clothTop, pedestal, objects, setState() {} };
}
