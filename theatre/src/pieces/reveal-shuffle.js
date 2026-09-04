// reveal-shuffle.js — the riffle, drawn on twos; and the deck as temporary stacks.
//
// The deck piece builds the deck as a few rigid blocks with a hairline per card on their cut
// sides. A riffle needs the deck in two halves that thin out while a third pile grows between
// them, and the fan needs a packet cut off the top that thins as cards leave it, so `deckStacks`
// borrows the deck's own block geometry and materials (the ink flags come with them) to make
// temporary stacks whose thickness is a y-scale and whose side texture window follows the number
// of cards in them. The real deck is hidden while they play and comes back, squared, at the end.
//
// Riffle drawings (deck-local metres, the table top at y = 0):
//   hold · the top half lifts (the cut) · the halves part · both bend up on their outer edges,
//   inner corners touching · six frames of interleaving, the middle pile growing · the pile
//   pushed together · lifted and stood on its long edge · tapped square · set down.
import * as THREE from 'three';
import { hold, compose, handFrames } from './reveal-takes.js';

const _v = new THREE.Vector3();
const _e = new THREE.Euler();

// The deck's blocks as a set of temporary stacks. Temp meshes are named 'tmp:*' so a later call
// (the fan's, the shuffle's) never mistakes one for a real block.
export function deckStacks(deck, T) {
  const real = deck.children.filter((c) => c.isMesh && !c.name.startsWith('tmp:'));
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
  const nBase = Math.max(1, Math.round(heightOf(template) / T)); // the big bottom block
  if (!template.geometry.boundingBox) template.geometry.computeBoundingBox();
  const bb = template.geometry.boundingBox;
  const W = bb.max.x - bb.min.x, H = bb.max.z - bb.min.z;
  const side = template.material[2];

  // a temporary stack of n cards, drawn with the deck's own faces and its cut-side hairlines
  function stack(name) {
    const sideMat = side.clone();
    if (side.map) {
      sideMat.map = side.map.clone();
      sideMat.map.needsUpdate = true;
    }
    const m = new THREE.Mesh(template.geometry, [template.material[0], template.material[1], sideMat]);
    m.name = `tmp:${name}`;
    m.castShadow = true;
    m.receiveShadow = true;
    m.visible = false;
    m.userData.n = 1;
    deck.add(m);
    return m;
  }
  // show `n` cards of the strip starting at card `start` (0 = bottom of the deck)
  function cards(m, n, start) {
    m.visible = n > 0;
    m.scale.y = (Math.max(n, 0.5) * T) / hTemplate;
    const map = m.material[2].map;
    if (map) {
      map.repeat.y = Math.max(n, 0.5) / nTotal;
      map.offset.y = start / nTotal;
    }
    m.userData.n = n;
  }
  // place a stack so that its local point (px, py, pz) (py in units of the stack's own height:
  // -0.5 bottom, +0.5 top) sits at `target`, with the stack rotated by e
  function pivot(m, target, e, px, py, pz) {
    const h = (m.userData.n ?? 1) * T;
    m.rotation.copy(e);
    _v.set(px, py * h, pz).applyEuler(e);
    m.position.copy(target).sub(_v);
  }
  // flat on the table (or on top of something y0 high), squared to ry
  const flat = (m, x, z, ry, y0 = 0) => {
    const h = (m.userData.n ?? 1) * T;
    m.rotation.set(0, ry, 0);
    m.position.set(x, y0 + h / 2, z);
  };
  const showReal = (on) => {
    for (const r of real) r.visible = on;
  };
  const hide = (list) => {
    for (const t of list) t.visible = false;
  };
  const dispose = (list) => {
    for (const t of list) {
      t.material[2].map?.dispose?.();
      t.material[2].dispose?.();
      deck.remove(t);
    }
  };
  return { real, nTotal, nBase, W, H, T, hTemplate, stack, cards, pivot, flat, showReal, hide, dispose };
}

// The whole shuffle. It used to be eighteen drawings — a second and a half — which the flow then
// sat on for nine seconds, so what a visitor actually saw was a small stack not moving. It is now
// three riffles and a square-up, about four and a half seconds of continuous motion, with HIS
// HAND on the deck for every drawing of it: on the packet as it is cut, over the bridge as the
// halves go into each other, pressing the pile flat, on the stood packet as it is tapped square.
// (The drawn hand only lies on the cloth for a lens above the table — reveal-hand.js — so this
// beat has to be cut to an overhead; reveal.js stages the judging state that way.)
export function buildShuffle(ctx, deck, T, { cues = {}, hand = null, rounds = 3 } = {}) {
  const S = deckStacks(deck, T);
  if (!S) return null;
  const { nTotal, W, H, cards, pivot, flat, showReal } = S;
  const nB = S.nBase; // the bottom half: the big block
  const nA = Math.max(1, nTotal - nB); // everything above it: the cut

  const A = S.stack('cut'), B = S.stack('base'), C = S.stack('pile'), D = S.stack('loose');
  const temps = [A, B, C, D];
  const hideTemps = () => S.hide(temps);

  // deck-local → world, for putting his hand on what the drawing is doing
  const toWorld = (x, y, z) => {
    deck.updateMatrixWorld(true);
    const p = _v.clone().set(x, y, z);
    deck.localToWorld(p);
    return p;
  };
  const yaw = () => -(deck.rotation?.y ?? 0);
  // a hand spec on the deck: `y` is metres above the CLOTH, which is where the deck sits
  // `yw` turns the hand across the deck. At nought his hand comes straight down the frame and its
  // palm ends up BEHIND the raised half of the bridge, so all that shows of him is two fingertips;
  // turned three quarters of a radian the wrist swings out to the left of the deck, where his
  // shoulder is anyway, and the whole hand is in the picture with its fingers coming down onto
  // the cards.
  const on = (x, z, y, pose = 'splay', yw = 0.16) => {
    const p = toWorld(x, 0, z);
    return { x: p.x, y: Math.max(0.003, y), z: p.z, yaw: yaw() + yw, pose, side: 'R' };
  };
  const handSpecs = [];
  const H2 = (s) => handSpecs.push(s); // one spec per drawing, in step with `frames`

  const frames = [];
  const F = (fn, spec) => {
    frames.push(fn);
    H2(spec ?? { off: true });
  };

  // 0-1: the deck as it is, his hand coming in from the top of the frame
  const top = () => nTotal * T;
  F(
    () => {
      showReal(true);
      hideTemps();
    },
    { ...on(-0.03, -0.24, 0.075), pose: 'splay' },
  );
  F(() => {
    showReal(true);
    hideTemps();
  }, on(-0.02, -0.10, 0.03));

  // ---- one riffle: the cut, the halves parted, the bridge, the interleave, the pile ------------
  const bent = (u, k) => {
    const rA = Math.round(nA * (1 - u)), rB = Math.round(nB * (1 - u)), rC = nTotal - rA - rB;
    showReal(false);
    hideTemps();
    if (rC > 0) {
      cards(C, rC, 0);
      flat(C, 0.002 * (u > 0.5 ? -1 : 1), 0.008, 0.05 * (k % 2 ? -1 : 1));
    }
    const t0 = rC * T;
    // the halves are bent up hard on their outer edges and their inner corners meet over the pile:
    // the bridge. The steeper they stand, the more of each half's cut side the lens sees, which is
    // the only place the interleave can be read from.
    if (rA > 0) {
      cards(A, rA, nB + nA - rA);
      pivot(A, _v.clone().set(0.026, t0 + 0.002, 0.012), _e.set(0, 0.34, 0.58), -W / 2, -0.5, 0);
    }
    if (rB > 0) {
      cards(B, rB, 0);
      pivot(B, _v.clone().set(-0.026, t0 + 0.002, 0.012), _e.set(0, -0.34, -0.58), W / 2, -0.5, 0);
    }
  };
  const loose = 5;
  const RIFFLE = 8; // drawings of interleave: long enough to see the cards go into each other
  function riffle() {
    // the cut: the top half lifted clear, tilted by the thumb
    F(() => {
      showReal(false);
      hideTemps();
      cards(B, nB, 0);
      flat(B, 0, 0, 0);
      cards(A, nA, nB);
      pivot(A, _v.clone().set(-0.024, nB * T + 0.03, 0.006), _e.set(0, 0.1, 0.16), -W / 2, -0.5, 0);
      cues.cut?.();
    }, on(-0.03, 0.004, nB * T + 0.036, 'pinch'));
    // the halves part, flat, a hand's width apart
    F(() => {
      showReal(false);
      hideTemps();
      cards(B, nB, 0);
      flat(B, -0.095, 0.014, -0.3);
      cards(A, nA, nB);
      flat(A, 0.095, 0.014, 0.3);
    }, on(0.082, 0.02, nA * T + 0.012, 'splay', 0.42));
    // the bridge, then the interleave
    F(() => {
      bent(0, 0);
      cues.riffle?.();
    }, on(0.016, -0.03, 0.132, 'splay', 0.42));
    for (let j = 1; j <= RIFFLE; j++) {
      const u = j / RIFFLE;
      // the hand rides the bridge down as the pile grows under it
      F(() => bent(u, j), on(0.016 - 0.014 * u, -0.03, 0.128 - 0.036 * u, 'splay', 0.42));
    }
    // the pile, untidy: a few cards sit crooked on top
    F(() => {
      showReal(false);
      hideTemps();
      cards(C, nTotal - loose, 0);
      flat(C, 0.004, 0.006, 0.08);
      cards(D, loose, nTotal - loose);
      flat(D, 0.011, 0.003, -0.17);
      D.position.y = (nTotal - loose) * T + (loose * T) / 2 + 0.0004;
    }, on(0.006, 0.012, top() + 0.014, 'splay'));
    // pushed together under the flat of his hand
    F(() => {
      showReal(false);
      hideTemps();
      cards(C, nTotal - loose, 0);
      flat(C, 0.001, 0.003, 0.02);
      cards(D, loose, nTotal - loose);
      flat(D, 0.003, 0.002, -0.05);
      D.position.y = (nTotal - loose) * T + (loose * T) / 2 + 0.0003;
    }, on(0.002, 0.008, top() + 0.004, 'splay'));
  }
  for (let r = 0; r < Math.max(1, rounds); r++) riffle();

  // ---- the square-up: the packet stood on its long edge and tapped -----------------------------
  const stood = (yLow, tilt, cue) => () => {
    showReal(false);
    hideTemps();
    cards(C, nTotal, 0);
    pivot(C, _v.clone().set(-0.028, yLow, 0.004), _e.set(0, 0.02, tilt), -W / 2, -0.5, 0);
    cue?.();
  };
  const grip = (y) => on(-0.028, 0.004, y, 'pinch');
  F(stood(0.022, 0.62), grip(0.03));
  F(stood(0.0, 0.62, cues.tap), grip(0.012));
  F(stood(0.012, 0.6), grip(0.022));
  F(stood(0.0, 0.62, cues.tap), grip(0.012));
  F(stood(0.008, 0.62), grip(0.018));
  F(stood(0.0, 0.62, cues.tap), grip(0.012));
  // set down, square: the real deck again, and his hand off the top of the frame
  F(() => {
    hideTemps();
    showReal(true);
    cues.done?.();
  }, on(-0.01, -0.03, 0.03));
  F(() => {
    hideTemps();
    showReal(true);
  }, on(-0.02, -0.22, 0.08));
  F(() => {
    hideTemps();
    showReal(true);
  });
  hold(frames, 2);
  H2(null);
  H2(null);

  if (!hand) return { frames, temps, W, H, stacks: S };
  return { frames: compose([{ offset: 0, frames }, { offset: 0, frames: handFrames(hand, handSpecs) }]), temps, W, H, stacks: S };
}
