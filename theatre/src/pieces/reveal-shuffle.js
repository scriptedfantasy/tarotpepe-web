// reveal-shuffle.js — the riffle, drawn on twos.
//
// The deck piece builds the deck as a few rigid blocks with a hairline per card on their cut
// sides. A riffle needs the deck in two halves that thin out while a third pile grows between
// them, so this module borrows the deck's own block geometry and materials (the ink flags come
// with them) to make three temporary stacks whose thickness is a y-scale and whose side texture
// window follows the number of cards left in them. The real deck is hidden while they play and
// comes back, squared, at the end.
//
// Drawings (deck-local metres, the table top at y = 0):
//   hold · the top half lifts (the cut) · the halves part · both bend up on their outer edges,
//   inner corners touching · six frames of interleaving, the middle pile growing · the pile
//   pushed together · lifted and stood on its long edge · tapped square · set down.
import * as THREE from 'three';
import { hold } from './reveal-takes.js';

const _v = new THREE.Vector3();
const _e = new THREE.Euler();

export function buildShuffle(ctx, deck, T, { cues = {} } = {}) {
  const real = deck.children.filter((c) => c.isMesh);
  const blocks = real.filter((c) => c.geometry && Array.isArray(c.material) && c.material.length >= 3);
  if (!blocks.length) return null;
  // the template: the thickest block (its geometry is a slab centred on y = 0)
  const heightOf = (m) => {
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    const b = m.geometry.boundingBox;
    return (b.max.y - b.min.y) * m.scale.y;
  };
  const template = blocks.reduce((a, b) => (heightOf(b) > heightOf(a) ? b : a));
  const hTemplate = heightOf(template) / template.scale.y;
  // cards per mesh from its thickness (a single bent card is thicker than T: count it as one)
  const counts = real.map((m) => (heightOf(m) < 4 * T ? 1 : Math.round(heightOf(m) / T)));
  const nTotal = counts.reduce((a, b) => a + b, 0);
  const nB = Math.max(1, Math.round(heightOf(template) / T)); // the bottom half: the big block
  const nA = Math.max(1, nTotal - nB); // everything above it: the cut
  if (!template.geometry.boundingBox) template.geometry.computeBoundingBox();
  const bb = template.geometry.boundingBox;
  const W = bb.max.x - bb.min.x, H = bb.max.z - bb.min.z;

  // a temporary stack of n cards, drawn with the deck's own faces and its cut-side hairlines
  const side = template.material[2];
  function stack(name) {
    const sideMat = side.clone();
    if (side.map) {
      sideMat.map = side.map.clone();
      sideMat.map.needsUpdate = true;
    }
    const m = new THREE.Mesh(template.geometry, [template.material[0], template.material[1], sideMat]);
    m.name = `shuffle-${name}`;
    m.castShadow = true;
    m.receiveShadow = true;
    m.visible = false;
    deck.add(m);
    return m;
  }
  const A = stack('cut'), B = stack('base'), C = stack('pile'), D = stack('loose');
  const temps = [A, B, C, D];

  // show `n` cards of the strip starting at card `start` (0 = bottom of the deck)
  function cards(m, n, start) {
    m.visible = n > 0;
    m.scale.y = Math.max(n, 0.5) * T / hTemplate;
    const map = m.material[2].map;
    if (map) {
      map.repeat.y = Math.max(n, 0.5) / nTotal;
      map.offset.y = start / nTotal;
    }
    m.userData.n = n;
  }
  // place a stack so that its local point (px, py, pz) (py in card units of the stack's own height:
  // -0.5 bottom, +0.5 top) sits at `target`, with the stack rotated by e
  function pivot(m, target, e, px, py, pz) {
    const h = (m.userData.n ?? 1) * T;
    m.rotation.copy(e);
    _v.set(px, py * h, pz).applyEuler(e);
    m.position.copy(target).sub(_v);
  }
  const flat = (m, x, z, ry) => {
    const h = (m.userData.n ?? 1) * T;
    m.rotation.set(0, ry, 0);
    m.position.set(x, h / 2, z);
  };
  const showReal = (on) => {
    for (const r of real) r.visible = on;
  };
  const hideTemps = () => {
    for (const t of temps) t.visible = false;
  };

  const frames = [];
  const F = (fn) => frames.push(fn);

  // 0-1: the deck as it is
  F(() => {
    showReal(true);
    hideTemps();
  });
  hold(frames, 1);
  // 2: the cut — the top half lifted clear, tilted by the thumb
  F(() => {
    showReal(false);
    hideTemps();
    cards(B, nB, 0);
    flat(B, 0, 0, 0);
    cards(A, nA, nB);
    pivot(A, _v.clone().set(-0.02, nB * T + 0.024, 0.006), _e.set(0, 0.1, 0.14), -W / 2, -0.5, 0);
    cues.cut?.();
  });
  // 3: the halves part, flat, a hand's width apart
  F(() => {
    showReal(false);
    hideTemps();
    cards(B, nB, 0);
    flat(B, -0.082, 0.012, -0.3);
    cards(A, nA, nB);
    flat(A, 0.082, 0.012, 0.3);
  });
  // 4: both bend up on their outer edges, inner corners touching at the middle
  const bent = (u) => {
    const rA = Math.round(nA * (1 - u)), rB = Math.round(nB * (1 - u)), rC = nTotal - rA - rB;
    showReal(false);
    hideTemps();
    if (rC > 0) {
      cards(C, rC, 0);
      flat(C, 0.002 * (u > 0.5 ? -1 : 1), 0.008, 0.05 * (Math.round(u * 6) % 2 ? -1 : 1));
    }
    const top = rC * T;
    if (rA > 0) {
      cards(A, rA, nB + nA - rA);
      pivot(A, _v.clone().set(0.02, top, 0.01), _e.set(0, 0.3, 0.44), -W / 2, -0.5, 0);
    }
    if (rB > 0) {
      cards(B, rB, 0);
      pivot(B, _v.clone().set(-0.02, top, 0.01), _e.set(0, -0.3, -0.44), W / 2, -0.5, 0);
    }
  };
  F(() => {
    bent(0);
    cues.riffle?.();
  });
  // 5-10: the riffle, six drawings
  for (let j = 1; j <= 6; j++) {
    const u = j / 6;
    F(() => bent(u));
  }
  // 11: the pile, untidy: a few cards sit crooked on top
  const loose = 5;
  F(() => {
    showReal(false);
    hideTemps();
    cards(C, nTotal - loose, 0);
    flat(C, 0.004, 0.006, 0.08);
    cards(D, loose, nTotal - loose);
    flat(D, 0.011, 0.003, -0.17);
    D.position.y = (nTotal - loose) * T + (loose * T) / 2 + 0.0004;
  });
  // 12: pushed together
  F(() => {
    showReal(false);
    hideTemps();
    cards(C, nTotal - loose, 0);
    flat(C, 0.001, 0.003, 0.02);
    cards(D, loose, nTotal - loose);
    flat(D, 0.003, 0.002, -0.05);
    D.position.y = (nTotal - loose) * T + (loose * T) / 2 + 0.0003;
  });
  // 13: lifted and stood on its long edge, the low edge a finger above the table
  const stood = (yLow, tilt, cue) => () => {
    showReal(false);
    hideTemps();
    cards(C, nTotal, 0);
    pivot(C, _v.clone().set(-0.028, yLow, 0.004), _e.set(0, 0.02, tilt), -W / 2, -0.5, 0);
    cue?.();
  };
  F(stood(0.014, 0.62));
  // 14: the tap
  F(stood(0.0, 0.62, cues.tap));
  // 15: a second tap, a hair higher
  F(stood(0.006, 0.6));
  F(stood(0.0, 0.62, cues.tap));
  // 17: set down, square: the real deck again
  F(() => {
    hideTemps();
    showReal(true);
    cues.done?.();
  });
  return { frames, temps, W, H };
}
