// reveal-ground.js — what a card standing on the cloth does to the cloth: a drawn patch of tone
// tucked under its down-stage and outer edges.
//
// STYLE.md §1.1 forbids a soft shadow outright and §1.3 says what this world puts there instead:
// "cast shadows are rare — usually a small dense patch directly under an object". The film's own
// hand (fd-anim-kitchen-table-cards-hires, the oven front and the cabinet face) draws that patch as
// FOUR TO SEVEN short strokes struck at a shallow angle ACROSS the edge, their ends staggered,
// each laid in one pass and simply stopping — never a band, never a wash, and never parallel and
// hard against the edge, which reads as more of the edge rather than as tone.
//
// The key is upstage-left of the set (lighting.js: "every shadow falls down-and-right"), and the
// insert is a plan view with -z up the frame, so the patch belongs on the card's +z (near) edge and
// its +x (right) edge, heaviest where the two meet. It is drawn once, at the insert's own texel
// density, and worn by every card: one alpha-tested plane per card, lying a fraction of a
// millimetre over the cloth and turning with the card it belongs to.
import * as THREE from 'three';
import { makeCanvas, canvasTexture, inkMaterial, INK } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';

// the patch reaches this far beyond the card on every side (metres). The drawing only ever uses
// the +x and +z sides of it; the rest is the margin the plane needs to carry them.
const MARGIN = 0.026;
// px per metre in the patch's own drawing. The card insert shows the cloth at ~3450 px/m in a
// 1600-wide frame, so this is very nearly 1:1 there and the pen is never magnified into a slab.
const PXM = 3000;

// ONE stroke of the pen: laid in a single pass, bowed a little, ending where it ends. Not a dash
// run and not a segmented line — a segmented line comes back off the ink pass as a row of specks,
// which is the dirt this piece is here to be the opposite of.
function toneStroke(g, x0, y0, x1, y1, rng, width) {
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = (y0 - y1) / len, ny = (x1 - x0) / len; // unit normal
  const bow = (rng() - 0.5) * Math.min(6, len * 0.05);
  g.lineWidth = width;
  g.lineCap = 'round';
  g.strokeStyle = INK;
  g.beginPath();
  g.moveTo(x0, y0);
  g.quadraticCurveTo((x0 + x1) / 2 + nx * bow, (y0 + y1) / 2 + ny * bow, x1, y1);
  g.stroke();
}

// The patch, drawn once. w/h: the card, in metres. Canvas x → +x, canvas y → +z (the plane is laid
// with rotation.x = -PI/2 and the texture's flipY, so this canvas is the picture in the insert).
//
// Seven strokes, no more: four along the near edge and three up the outer one, gathered at the
// corner where the two meet and stopping dead. Their pitch (2.6 mm) is wider than their nib
// (0.9 mm) by three to one, which is what keeps them a cluster of lines at the insert instead of a
// grey band — the same ratio the film uses on the oven front and the cabinet face.
export function patchCanvas(w, h, seed = 5) {
  const W = Math.round((w + 2 * MARGIN) * PXM), H = Math.round((h + 2 * MARGIN) * PXM);
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  const rng = mulberry32(seed);
  const m = MARGIN * PXM;
  const cw = w * PXM, ch = h * PXM;
  const L = m, R = m + cw, B = m + ch;
  const mm = (v) => v * 0.001 * PXM;
  const nib = mm(0.9); // a 0.9 mm pen: 2.7 px here, ~2.5 px in the insert — the room's own weight
  const PITCH = 3.0;
  const GAP = 2.6; // how far the first stroke stands off the card: tone, not a second contour
  const RAKE = 0.24; // ~14° off the edge it belongs to

  // ── the near edge: four strokes across its outer half, staggered, raked away from the card ──
  // The rake is the whole trick. Strokes laid parallel to an edge and hard against it are read as
  // MORE OF THE EDGE — a card with three cards under it — which is what a first pass of this drew.
  // Struck across the edge at fourteen degrees, with their ends staggered, they are tone.
  for (let i = 0; i < 4; i++) {
    const off = mm(GAP + i * PITCH + rng() * 0.4);
    const len = cw * (0.52 - i * 0.09) + mm(rng() * 2);
    const x1 = R - mm(1 + i * 3.5); // the outer end steps back from the corner
    const x0 = x1 - len;
    const y = B + off;
    toneStroke(g, x0, y - len * RAKE * 0.5, x1, y + len * RAKE * 0.5, rng, nib * (1 - i * 0.07));
  }
  // ── the outer edge: three shorter strokes up from the corner, raked the other way ──
  for (let i = 0; i < 3; i++) {
    const off = mm(GAP + i * PITCH + rng() * 0.4);
    const len = ch * (0.2 - i * 0.045) + mm(rng() * 2);
    const y0 = B - mm(1.5 + i * 4);
    const x = R + off;
    toneStroke(g, x + len * RAKE * 0.5, y0, x - len * RAKE * 0.5, y0 - len, rng, nib * (1 - i * 0.08));
  }
  return c;
}

// The group of patches: one plane per laid card, worn like a shadow and turned with it.
export function buildGround(ctx, { w, h }) {
  const group = new THREE.Group();
  group.name = 'reveal-ground';
  ctx.scene.add(group);

  let mat = null;
  const material = () => {
    if (mat) return mat;
    const tex = canvasTexture(patchCanvas(w, h), { anisotropy: 8 });
    mat = inkMaterial({ map: tex, hatch: 0, lineWeight: 1, colorful: false });
    // Alpha-tested, not blended, and left in the opaque queue: the cloth's own weave has to run
    // under it, and a blended plane over the cloth is a wash — which is the thing this file exists
    // to not be. Nothing here is a second dark copy of the card's outline: only the strokes exist.
    mat.alphaTest = 0.5;
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -1;
    mat.polygonOffsetUnits = -2;
    return mat;
  };

  const geo = new THREE.PlaneGeometry(w + 2 * MARGIN, h + 2 * MARGIN);
  const patches = []; // one per card currently on the cloth
  let watched = null, clothY = 0;

  // The patch lies ON the cloth, not under the card: it must not move up with a card being lifted,
  // and it goes out of the picture entirely while the card is off the cloth. It follows whatever
  // group holds the laid cards, so a card carried out of the fan into the row gets one too.
  function follow(obj, y) {
    watched = obj;
    clothY = y;
    step();
  }
  function make() {
    const mesh = new THREE.Mesh(geo, material());
    // 'YXZ' so rotation.y is a turn about the room's own vertical, whatever the plane's own lay-down
    mesh.rotation.order = 'YXZ';
    mesh.rotation.set(-Math.PI / 2, 0, 0);
    mesh.position.y = clothY;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);
    patches.push(mesh);
    return mesh;
  }
  function clear() {
    for (const p of patches) group.remove(p);
    patches.length = 0;
  }
  // Follow the cards. A card off the cloth, or tipped up on its edge, has no patch: a hand is
  // holding it and what it casts is the hand's business.
  const _n = new THREE.Vector3(), _x = new THREE.Vector3();
  function step() {
    const cards = watched?.children ?? [];
    while (patches.length > cards.length) group.remove(patches.pop());
    while (patches.length < cards.length) make();
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i], mesh = patches[i];
      const lift = card.position.y - clothY;
      _n.set(0, 1, 0).applyQuaternion(card.quaternion); // the card's face normal, in the room
      const flat = Math.abs(_n.y) > 0.985;
      mesh.visible = card.visible !== false && flat && lift < 0.006;
      if (!mesh.visible) continue;
      mesh.position.x = card.position.x;
      mesh.position.z = card.position.z;
      // the footprint's own turn, read off the card rather than guessed from its Euler: a card
      // lying face down is yawed the other way by the flip, and the patch belongs to the FOOTPRINT
      _x.set(1, 0, 0).applyQuaternion(card.quaternion);
      mesh.rotation.y = Math.atan2(-_x.z, _x.x);
    }
  }
  return { group, follow, clear, step, get count() { return patches.length; } };
}
