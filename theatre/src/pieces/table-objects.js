// table-objects — the still life on the far half of the table (z < -0.12; the strip z < -0.44 at
// the far edge is left for Pepe's hands). Paper-white with drawn patterns; the ink pass draws the
// outlines and the tone. Things, left to right: a folded newspaper with a saucer, an espresso cup,
// a spoon and a sugar cube on it, a pencil across it; a plate with a crumpled napkin, olive stones
// and a knife; an ashtray with two stubbed cigarettes and a heap of ash; a matchbox; coins; a
// pair of folded spectacles; a wine glass; a tumbler of water; a candle stuck in a wine bottle.
import * as THREE from 'three';
import { inkMaterial } from '../core/strokes.js';
import { lathe, surface, smooth } from './table-geo.js';
import { bottleLabelTexture, newspaperTexture, matchboxTexture, coinTexture, chinaTexture, glassMaskTexture, wrapRepeat } from './table-textures.js';

const DARK = '#2a2622';

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
      const n = 1 + 0.16 * Math.sin(5 * th + seed) * Math.sin(3 * ph + 0.5) + 0.12 * Math.sin(9 * th + 2 * seed) * Math.sin(6 * ph) + 0.08 * Math.sin(13 * th + ph * 4);
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
    grp.position.set(0.44, top, -0.1);
    g.add(grp);
  }

  // ---------- a tumbler of water ----------
  {
    const prof = [
      [0.0, 0.0],
      [0.026, 0.0],
      [0.027, 0.004],
      [0.03, 0.075],
      [0.0285, 0.075],
      [0.0255, 0.006],
      [0.0, 0.005],
    ];
    const grp = new THREE.Group();
    // profile indices: 0..2 base, 2..3 wall outside, 3..4 rim, 4..6 inside
    grp.add(mesh(lathe(prof, 28), glassMat([[0, 2 / 6], [3 / 6, 4 / 6]]), { shadow: false }));
    // the water: a flat disc whose edge the pen draws as the level
    grp.add(mesh(lathe([[0, 0.005], [0.0265, 0.005], [0.0275, 0.04], [0, 0.04]], 28), inkMaterial({ hatch: 0.25 }), { shadow: false }));
    grp.position.set(0.42, top, -0.31);
    g.add(grp);
  }

  // ---------- ashtray with two stubs, a heap of ash ----------
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
    const heap = mesh(lump(0.013, 1.3, 0.35, 1, 3), dark, { x: 0.008, y: 0.005, z: -0.01 });
    grp.add(heap);
    grp.position.set(-0.1, top, -0.36);
    g.add(grp);
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
    mb.position.set(0.04, top, -0.28);
    mb.rotation.y = -0.55;
    g.add(mb);
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
    grp.position.set(0.5, top, -0.21);
    grp.rotation.y = 0.25;
    g.add(grp);
  }

  // ---------- the folded newspaper, with the saucer set and a pencil on it ----------
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
    // a pencil across the near half of the paper: hexagonal, sharpened, a dark lead
    const pencil = new THREE.Group();
    pencil.add(mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.11, 6), whiteThin, { rz: Math.PI / 2 }));
    pencil.add(mesh(new THREE.ConeGeometry(0.0035, 0.012, 6), whiteThin, { rz: -Math.PI / 2, x: 0.061 }));
    pencil.add(mesh(new THREE.ConeGeometry(0.0012, 0.004, 6), dark, { rz: -Math.PI / 2, x: 0.069 }));
    pencil.add(mesh(new THREE.CylinderGeometry(0.0036, 0.0036, 0.008, 8), dark, { rz: Math.PI / 2, x: -0.053 }));
    pencil.position.set(-0.02, top + 0.0035, -0.475);
    pencil.rotation.y = 0.12;
    g.add(pencil);
    np.position.set(-0.47, top, -0.18);
    np.rotation.y = 0.15;
    g.add(np);

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
    set.position.set(-0.465, top + paperTh, -0.175);
    set.rotation.y = 0.15;
    g.add(set);
    g.add(mesh(new THREE.BoxGeometry(0.017, 0.012, 0.017), white, { x: -0.4, y: top + 0.006, z: -0.11, ry: -0.3 }));
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
    const napkin = mesh(lump(0.03, 1.15, 0.55, 0.9, 7), inkMaterial({ hatch: 0.18, lineWeight: 0.9 }), { x: -0.012, y: 0.019, z: -0.008, ry: 0.7 });
    grp.add(napkin);
    for (const [x, z, r] of [
      [0.035, 0.02, 0.2],
      [0.042, -0.012, 1.1],
      [0.02, 0.04, 2.3],
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
    grp.position.set(-0.5, top, -0.03);
    grp.rotation.y = 0.3;
    g.add(grp);
  }

  // ---------- coins and a pair of folded spectacles ----------
  {
    const face = inkMaterial({ map: coinTexture(), hatch: 0.3 });
    const rimM = inkMaterial({ hatch: 0.5 });
    const coin = (x, z, ry, y = top) => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.0018, 24), [rimM, face, face]);
      c.position.set(x, y + 0.0009, z);
      c.rotation.y = ry;
      c.castShadow = true;
      c.receiveShadow = true;
      return c;
    };
    g.add(coin(0.12, -0.35, 0.3));
    g.add(coin(0.135, -0.338, 1.4, top + 0.0018));
    g.add(coin(0.155, -0.375, 2.2));
    g.add(coin(-0.02, -0.2, 0.9));

    const spec = new THREE.Group();
    const wire = inkMaterial({ hatch: 0.6, lineWeight: 0.7 });
    for (const s of [-1, 1]) {
      const ring = mesh(new THREE.TorusGeometry(0.017, 0.0013, 6, 24), wire, { x: s * 0.02, rx: Math.PI / 2 });
      spec.add(ring);
    }
    spec.add(mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.008, 6), wire, { rz: Math.PI / 2, y: 0.002 }));
    // arms folded back across the lenses
    spec.add(mesh(new THREE.BoxGeometry(0.06, 0.0016, 0.0025), wire, { x: 0.006, y: 0.0035, z: 0.006, ry: 0.22 }));
    spec.add(mesh(new THREE.BoxGeometry(0.06, 0.0016, 0.0025), wire, { x: -0.006, y: 0.0055, z: 0.009, ry: -0.22 }));
    spec.position.set(0.06, top + 0.0015, -0.44);
    spec.rotation.y = -0.2;
    g.add(spec);
  }

  return g;
}
