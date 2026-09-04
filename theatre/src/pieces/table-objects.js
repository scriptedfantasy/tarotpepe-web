// table-objects — the still life: one deliberate row across the middle band of the table, in
// front of Pepe's hands (which rest at z ≈ -0.40..-0.24, x ≈ ±0.17..0.35) and behind the three
// card slots (z > 0.02). Low things in the row, tall things at the two sides where they do not
// hide the hands. Left to right: a plate with a crumpled napkin, olive stones and a knife; a wine
// glass; a folded newspaper carrying a saucer, an espresso cup, a spoon and a sugar cube; an
// ashtray with two stubbed cigarettes and a heap of ash; a matchbox with its drawer out and a
// match beside; a scatter of coins; a pocket watch on its chain; a folded letter; a pair of folded
// spectacles; a tumbler of water; a candle stuck in a wine bottle. Paper-white with drawn
// patterns; the ink pass draws the outlines and the tone.
import * as THREE from 'three';
import { inkMaterial, INK } from '../core/strokes.js';
import { lathe, surface, smooth } from './table-geo.js';
import { bottleLabelTexture, newspaperTexture, matchboxTexture, coinTexture, chinaTexture, glassMaskTexture, noteTexture, watchTexture, wrapRepeat } from './table-textures.js';

// The still life follows the same rule as the props on the shelves: every object gets ONE solid
// black and ONE bare white area, and there are fewer of them than there were — the spectacles, the
// fountain pen, the tumbler, the watch's chain and half the coins are gone, and what is left has
// been pushed upstage off the card row so the near half of the cloth is clear.
const DARK = INK;

// where things stand on the top (world x, z), shared with the cloth texture for rings and crumbs
export const PLACES = {
  plate: [-0.53, -0.05],
  tumbler: [-0.52, -0.22], // gone; the ring it left is still drawn into the cloth
  newspaper: [-0.38, -0.15],
  ashtray: [-0.15, -0.15],
  matchbox: [-0.02, -0.15],
  watch: [0.15, -0.17],
  note: [0.31, -0.15],
  spectacles: [0.45, -0.08],
  wineGlass: [0.55, -0.12],
  bottle: [0.44, -0.34],
  coins: [
    [0.06, -0.22, 0.3],
    [0.1, -0.12, 2.2],
    [0.17, -0.25, 0.9],
    [0.22, -0.19, 2.8],
    [-0.05, -0.22, 0.5],
  ],
};

function mesh(geo, mat, { x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, shadow = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

// a lumpy blob (crumpled napkin, a heap): a sphere whose radius wobbles with angle
function lump(r, ax, ay, az, seed = 1) {
  const geo = surface(
    (u, v) => {
      const th = u * Math.PI * 2, ph = v * Math.PI;
      const n = 1 + 0.2 * Math.sin(3 * th + seed) * Math.sin(2 * ph + 0.5) + 0.1 * Math.sin(5 * th + 2 * seed) * Math.sin(3 * ph);
      const rr = r * n;
      return [ax * rr * Math.sin(ph) * Math.cos(th), ay * rr * Math.cos(ph), az * rr * Math.sin(ph) * Math.sin(th)];
    },
    48,
    24,
    { outward: (p) => p.clone() },
  );
  return geo;
}

export function buildStillLife(ctx, top) {
  const g = new THREE.Group();
  g.name = 'still-life';
  const white = inkMaterial({ hatch: 0.45 });
  const whiteThin = inkMaterial({ hatch: 0.4, lineWeight: 0.8 });
  const dark = inkMaterial({ color: DARK, hatch: 1 });
  // glass: only the foot, stem, rim and the two silhouette hairlines exist for the pen; the walls
  // are cut away by the alpha mask so the wine inside is drawn as a flat black fill.
  const glassMat = (solid) => {
    const m = inkMaterial({ map: glassMaskTexture(solid), hatch: 0.15, lineWeight: 0.9, side: THREE.DoubleSide, transparent: true });
    m.alphaTest = 0.5;
    return m;
  };
  const china = wrapRepeat(chinaTexture());
  const chinaMat = inkMaterial({ map: china, hatch: 0.35 });
  const at = (grp, key, y = top) => {
    const [x, z] = PLACES[key];
    grp.position.set(x, y, z);
    g.add(grp);
    return grp;
  };

  // ---------- wine glass ----------
  {
    const prof = [
      [0.0, 0.0],
      [0.034, 0.0],
      [0.034, 0.002],
      [0.024, 0.0045],
      [0.008, 0.008],
      [0.0045, 0.013],
      [0.0038, 0.03],
      [0.0038, 0.05],
      [0.006, 0.058],
      [0.017, 0.065],
      [0.028, 0.078],
      [0.035, 0.098],
      [0.036, 0.118],
      [0.034, 0.136],
      [0.031, 0.15],
      [0.0295, 0.15],
      [0.0325, 0.136],
      [0.0345, 0.118],
      [0.0335, 0.098],
      [0.0265, 0.079],
      [0.016, 0.067],
      [0.0, 0.0655],
    ];
    const grp = new THREE.Group();
    // profile indices: 0..9 foot and stem, 9..14 bowl outside, 14..15 rim, 15..21 bowl inside
    grp.add(mesh(lathe(prof, 36), glassMat([[0, 10 / 21], [14 / 21, 15 / 21]]), { shadow: false }));
    const wine = [
      [0.0, 0.0665],
      [0.015, 0.067],
      [0.024, 0.076],
      [0.03, 0.088],
      [0.0325, 0.1],
      [0.0, 0.1],
    ];
    grp.add(mesh(lathe(wine, 36), dark));
    at(grp, 'wineGlass');
  }

  // ---------- ashtray with two stubs, a heap of ash ----------
  // white glass dish, blackened only inside: one solid black, one bare white, like the ashtray on
  // the table in fd-anim-kitchen-table-cards-hires
  {
    const grp = new THREE.Group();
    const body = [
      [0.0, 0.0],
      [0.052, 0.0],
      [0.057, 0.004],
      [0.058, 0.012],
      [0.05, 0.012],
      [0.046, 0.008],
      [0.04, 0.005],
      [0.0, 0.004],
    ];
    grp.add(mesh(lathe(body, 40), white));
    // the well: burnt black, the one solid the pen fills in
    grp.add(mesh(lathe([[0.0, 0.0045], [0.041, 0.0055], [0.047, 0.0092], [0.0, 0.0092]], 40), dark, { shadow: false }));
    // the upper rim in three arcs: the gaps are the cigarette rests
    const rim = [
      [0.058, 0.012],
      [0.058, 0.022],
      [0.05, 0.022],
      [0.05, 0.012],
    ];
    for (let k = 0; k < 3; k++) {
      const arc = 2 * Math.PI * 0.3;
      const start = (k * 2 * Math.PI) / 3 + Math.PI * 0.05;
      grp.add(mesh(lathe(rim, 20, arc, start), white));
    }
    const stub = (len, bend, rot) => {
      const s = new THREE.Group();
      const a = mesh(new THREE.CylinderGeometry(0.0038, 0.0038, len, 10), whiteThin, { rz: Math.PI / 2 });
      a.position.x = len / 2;
      s.add(a);
      const b = mesh(new THREE.CylinderGeometry(0.0036, 0.0038, 0.014, 10), whiteThin, { rz: Math.PI / 2 - bend });
      b.position.set(len + Math.cos(bend) * 0.007, Math.sin(bend) * 0.007, 0);
      s.add(b);
      const ash = mesh(new THREE.CylinderGeometry(0.0034, 0.003, 0.006, 8), dark, { rz: Math.PI / 2 - bend });
      ash.position.set(len + Math.cos(bend) * 0.017, Math.sin(bend) * 0.017, 0);
      s.add(ash);
      s.rotation.y = rot;
      return s;
    };
    const s1 = stub(0.028, 0.5, 0.35);
    s1.position.set(-0.03, 0.006, 0.012);
    s1.rotation.z = 0.12;
    grp.add(s1);
    const s2 = stub(0.036, -0.35, -1.9);
    s2.position.set(0.025, 0.02, 0.048);
    s2.rotation.z = -0.28;
    grp.add(s2);
    const heap = mesh(lump(0.013, 1.3, 0.35, 1, 3), whiteThin, { x: 0.008, y: 0.005, z: -0.01 });
    grp.add(heap);
    grp.rotation.y = 0.4;
    at(grp, 'ashtray');
  }

  // ---------- matchbox, with the drawer pushed out and one match beside ----------
  {
    const mb = new THREE.Group();
    const lab = inkMaterial({ map: matchboxTexture(), hatch: 0.3 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.014, 0.034), [white, white, lab, white, white, white]);
    box.castShadow = true;
    box.receiveShadow = true;
    box.position.y = 0.007;
    mb.add(box);
    mb.add(mesh(new THREE.BoxGeometry(0.012, 0.011, 0.031), whiteThin, { x: 0.031, y: 0.007 }));
    mb.add(mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.04, 6), whiteThin, { rz: Math.PI / 2, ry: 0.4, x: 0.01, y: 0.0012, z: 0.03 }));
    mb.add(mesh(new THREE.SphereGeometry(0.0022, 6, 5), dark, { x: 0.01 + Math.cos(0.4) * 0.02, y: 0.0022, z: 0.03 - Math.sin(0.4) * 0.02 }));
    mb.rotation.y = -0.55;
    at(mb, 'matchbox');
  }

  // ---------- the candle in a bottle ----------
  {
    const grp = new THREE.Group();
    const bottleMat = inkMaterial({ map: bottleLabelTexture(), hatch: 0.55 });
    const prof = [
      [0.0, 0.0],
      [0.03, 0.0],
      [0.036, 0.004],
      [0.037, 0.01],
      [0.037, 0.125],
      [0.035, 0.145],
      [0.026, 0.16],
      [0.016, 0.172],
      [0.013, 0.185],
      [0.013, 0.212],
      [0.015, 0.216],
      [0.015, 0.226],
      [0.0125, 0.228],
      [0.011, 0.226],
      [0.011, 0.19],
      [0.0, 0.19],
    ];
    grp.add(mesh(lathe(prof, 40), bottleMat));
    const lipY = 0.228;
    const wax = inkMaterial({ hatch: 0.3, lineWeight: 0.9 });
    grp.add(mesh(lathe([[0.0105, lipY + 0.006], [0.014, lipY + 0.007], [0.02, lipY + 0.004], [0.021, lipY - 0.002]], 24), wax));
    const neck = (y) => (y > 0.212 ? 0.015 : y > 0.185 ? 0.013 : 0.013 + ((0.185 - y) / 0.025) * 0.008);
    const L = (th) => 0.012 + 0.05 * Math.pow(0.5 + 0.5 * Math.sin(3 * th + 0.4), 3) + 0.03 * Math.pow(0.5 + 0.5 * Math.sin(7 * th + 2.1), 4);
    const drips = surface(
      (u, v) => {
        const th = u * Math.PI * 2;
        const len = L(th);
        const y = lipY - 0.002 - v * len;
        const bead = Math.sin(Math.PI * v) * 0.0035 * (len / 0.09) + 0.004 * smooth(0.65, 0.85, v) * (1 - smooth(0.85, 1, v)) * (len / 0.09);
        const r = neck(y) + 0.0022 + 0.0035 * (1 - v) + bead;
        return [r * Math.sin(th), y, r * Math.cos(th)];
      },
      72,
      16,
    );
    grp.add(mesh(drips, wax));
    const candle = [
      [0.0, lipY + 0.006],
      [0.0105, lipY + 0.006],
      [0.0105, lipY + 0.06],
      [0.0095, lipY + 0.07],
      [0.006, lipY + 0.074],
      [0.0, lipY + 0.072],
    ];
    grp.add(mesh(lathe(candle, 24), wax));
    const cd = mesh(new THREE.SphereGeometry(0.003, 8, 6), wax, { x: 0.0095, y: lipY + 0.05, z: 0.004 });
    cd.scale.set(0.7, 2.2, 0.7);
    grp.add(cd);
    grp.add(mesh(new THREE.CylinderGeometry(0.0008, 0.0008, 0.012, 5), dark, { y: lipY + 0.077 }));
    const flame = [
      [0.0, lipY + 0.08],
      [0.004, lipY + 0.086],
      [0.0055, lipY + 0.096],
      [0.0035, lipY + 0.108],
      [0.0012, lipY + 0.118],
      [0.0, lipY + 0.121],
    ];
    grp.add(mesh(lathe(flame, 16), inkMaterial({ hatch: 0, lineWeight: 0.8 }), { shadow: false }));
    grp.rotation.y = 0.25;
    at(grp, 'bottle');
  }

  // ---------- the folded newspaper, with the saucer set on it ----------
  const paperTh = 0.011;
  {
    const np = new THREE.Group();
    const newsMat = inkMaterial({ map: newspaperTexture(), hatch: 0.3 });
    const pageMat = inkMaterial({ hatch: 0.25, lineWeight: 0.8 });
    const W = 0.19, D = 0.14;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(W, paperTh, D), [pageMat, pageMat, newsMat, pageMat, pageMat, pageMat]);
    slab.position.y = paperTh / 2;
    slab.castShadow = true;
    slab.receiveShadow = true;
    np.add(slab);
    np.add(mesh(new THREE.CylinderGeometry(paperTh / 2, paperTh / 2, W, 12), pageMat, { rz: Math.PI / 2, y: paperTh / 2, z: -D / 2 }));
    for (let i = 0; i < 4; i++) {
      np.add(mesh(new THREE.BoxGeometry(W - 0.004 * i, 0.0016, 0.012), pageMat, { x: 0.002 * i, y: paperTh - 0.0012 - i * 0.0026, z: D / 2 + 0.003 + i * 0.0022 }));
    }
    np.rotation.y = 0.12;
    at(np, 'newspaper');

    // a pencil in the far strip between Pepe's wrists: hexagonal, sharpened, a dark lead
    const pencil = new THREE.Group();
    pencil.add(mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.11, 6), whiteThin, { rz: Math.PI / 2 }));
    pencil.add(mesh(new THREE.ConeGeometry(0.0035, 0.012, 6), whiteThin, { rz: -Math.PI / 2, x: 0.061 }));
    pencil.add(mesh(new THREE.ConeGeometry(0.0012, 0.004, 6), dark, { rz: -Math.PI / 2, x: 0.069 }));
    pencil.add(mesh(new THREE.CylinderGeometry(0.0036, 0.0036, 0.008, 8), dark, { rz: Math.PI / 2, x: -0.053 }));
    pencil.position.set(-0.02, top + 0.0035, -0.475);
    pencil.rotation.y = 0.12;
    g.add(pencil);

    const saucer = [
      [0.0, 0.0],
      [0.03, 0.0],
      [0.03, 0.004],
      [0.036, 0.0045],
      [0.06, 0.012],
      [0.067, 0.016],
      [0.068, 0.018],
      [0.064, 0.018],
      [0.058, 0.013],
      [0.036, 0.0065],
      [0.0, 0.006],
    ];
    const set = new THREE.Group();
    set.add(mesh(lathe(saucer, 40), chinaMat));
    const cup = [
      [0.0, 0.006],
      [0.02, 0.006],
      [0.022, 0.009],
      [0.026, 0.012],
      [0.031, 0.03],
      [0.034, 0.05],
      [0.031, 0.05],
      [0.028, 0.03],
      [0.023, 0.012],
      [0.0, 0.01],
    ];
    set.add(mesh(lathe(cup, 36), chinaMat, { x: -0.006, z: 0.003 }));
    set.add(mesh(lathe([[0, 0.0105], [0.0245, 0.0115], [0.0255, 0.018], [0, 0.018]], 24), dark, { x: -0.006, z: 0.003 }));
    const handle = mesh(new THREE.TorusGeometry(0.012, 0.0035, 8, 14, Math.PI), white, { x: -0.006 - 0.031, y: 0.031, z: 0.003 });
    handle.rotation.set(0, Math.PI / 2, Math.PI / 2);
    set.add(handle);
    set.add(mesh(new THREE.BoxGeometry(0.017, 0.012, 0.017), white, { x: 0.041, y: 0.014, z: -0.02, ry: 0.4 }));
    const spoon = new THREE.Group();
    spoon.add(mesh(new THREE.BoxGeometry(0.048, 0.0016, 0.006), whiteThin, { x: 0.024 }));
    const bowl = mesh(new THREE.SphereGeometry(0.0085, 12, 8), whiteThin, { x: 0.054 });
    bowl.scale.set(1.25, 0.32, 0.85);
    spoon.add(bowl);
    spoon.position.set(0.012, 0.0125, 0.032);
    spoon.rotation.y = -0.45;
    spoon.rotation.z = 0.06;
    set.add(spoon);
    set.rotation.y = 0.12;
    set.position.set(PLACES.newspaper[0] + 0.005, top + paperTh, PLACES.newspaper[1] + 0.005);
    g.add(set);
  }

  // ---------- a plate with a crumpled napkin, three olive stones and a knife ----------
  {
    const grp = new THREE.Group();
    const plate = [
      [0.0, 0.0],
      [0.04, 0.0],
      [0.04, 0.005],
      [0.048, 0.0055],
      [0.064, 0.013],
      [0.07, 0.02],
      [0.066, 0.02],
      [0.06, 0.014],
      [0.046, 0.0075],
      [0.0, 0.007],
    ];
    grp.add(mesh(lathe(plate, 40), chinaMat));
    const napkin = mesh(lump(0.03, 1.15, 0.5, 0.9, 7), inkMaterial({ hatch: 0.2, lineWeight: 0.9 }), { x: -0.012, y: 0.017, z: -0.008, ry: 0.7 });
    grp.add(napkin);
    // a corner of the napkin trailing onto the plate
    grp.add(mesh(new THREE.BoxGeometry(0.03, 0.002, 0.022), inkMaterial({ hatch: 0.2, lineWeight: 0.9 }), { x: 0.012, y: 0.009, z: -0.025, ry: 0.5, rz: 0.15 }));
    for (const [x, z, r] of [
      [0.035, 0.02, 0.2],
      [0.042, -0.012, 1.1],
    ]) {
      const s = mesh(new THREE.SphereGeometry(0.0045, 8, 6), dark, { x, y: 0.011, z, ry: r });
      s.scale.set(1.5, 0.8, 1);
      grp.add(s);
    }
    const knife = new THREE.Group();
    knife.add(mesh(new THREE.BoxGeometry(0.085, 0.0016, 0.013), whiteThin, { x: 0.0425 }));
    knife.add(mesh(new THREE.BoxGeometry(0.05, 0.008, 0.011), white, { x: -0.025 }));
    knife.position.set(0.0, 0.021, 0.05);
    knife.rotation.y = -0.2;
    knife.rotation.z = -0.03;
    grp.add(knife);
    grp.rotation.y = 0.3;
    at(grp, 'plate');
  }

  // ---------- coins: a scatter and a small stack ----------
  {
    const face = inkMaterial({ map: coinTexture(), hatch: 0.3 });
    const rimM = inkMaterial({ hatch: 0.5 });
    const coin = (x, z, ry, y = top, r = 0.014) => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.002, 24), [rimM, face, face]);
      c.position.set(x, y + 0.001, z);
      c.rotation.y = ry;
      c.castShadow = true;
      c.receiveShadow = true;
      return c;
    };
    for (const [x, z, r] of PLACES.coins) g.add(coin(x, z, r));
    // one lying on the first, off square
    g.add(coin(PLACES.coins[0][0] + 0.006, PLACES.coins[0][1] - 0.004, 1.9, top + 0.002));
  }

  // ---------- a pocket watch on its chain ----------
  {
    const grp = new THREE.Group();
    const dial = inkMaterial({ map: watchTexture(), hatch: 0.25 });
    const brass = inkMaterial({ hatch: 0.55 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.009, 36), [brass, dial, brass]);
    body.position.y = 0.0045;
    body.castShadow = true;
    body.receiveShadow = true;
    grp.add(body);
    // bezel ring, crown, bow
    grp.add(mesh(new THREE.TorusGeometry(0.0235, 0.0016, 8, 40), brass, { y: 0.009, rx: Math.PI / 2 }));
    grp.add(mesh(new THREE.CylinderGeometry(0.0032, 0.0032, 0.006, 8), brass, { y: 0.0045, z: 0.027, rx: Math.PI / 2 }));
    grp.add(mesh(new THREE.TorusGeometry(0.0055, 0.0013, 6, 16), brass, { y: 0.0045, z: 0.036, rx: Math.PI / 2 }));
    // a short stub of chain off the bow — four links, no fob: the rest is in his pocket
    const link = new THREE.TorusGeometry(0.0038, 0.0009, 5, 12);
    for (let i = 0; i < 4; i++) {
      const t = i / 5;
      const x = 0.006 + t * 0.09 + 0.02 * Math.sin(t * Math.PI);
      const z = 0.042 + t * 0.03 - 0.03 * Math.sin(t * Math.PI * 1.3);
      grp.add(mesh(link, brass, { x, y: 0.001, z, rx: Math.PI / 2 + (i % 2) * 0.8, ry: t * 1.4 }));
    }
    grp.rotation.y = 2.7;
    at(grp, 'watch');
  }

  // ---------- a folded letter ----------
  {
    const grp = new THREE.Group();
    const noteMat = inkMaterial({ map: noteTexture(), hatch: 0.25, lineWeight: 0.9 });
    const pageMat = inkMaterial({ hatch: 0.25, lineWeight: 0.9 });
    const W = 0.105, D = 0.072, T = 0.0016;
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(W, T, D), [pageMat, pageMat, noteMat, pageMat, pageMat, pageMat]);
    sheet.position.y = T / 2;
    sheet.castShadow = true;
    sheet.receiveShadow = true;
    grp.add(sheet);
    // the folded-over half lies on top, not quite square, with the fold as a rounded edge
    const flap = mesh(new THREE.BoxGeometry(W * 0.5, T, D * 0.97), pageMat, { x: W * 0.26, y: T * 1.5 + 0.0004, z: 0.002, ry: 0.06, rz: 0.03 });
    grp.add(flap);
    grp.add(mesh(new THREE.CylinderGeometry(T, T, D, 8), pageMat, { x: W * 0.5 + 0.001, y: T * 1.2, rx: Math.PI / 2 }));
    grp.rotation.y = 0.35;
    at(grp, 'note');
  }

  return g;
}
