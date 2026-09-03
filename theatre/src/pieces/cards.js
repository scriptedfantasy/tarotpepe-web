// PIECE: cards — the physical card: front art (the only full-colour objects in the world besides
// Pepe), an ink-drawn back, paper edges, a hint of curl. Also the deck as an object.
//
// The card is a real slab: a rounded-rect sheet with thickness, bent a millimetre or two, one corner
// lifted a hair (a used deck). The front is the supplied plate printed on card stock with an ink
// frame; the back is drawn here in pure ink (see cards-art.js); the cut edge is paper. The deck is
// a stack in three slightly untidy blocks whose sides show every card as a hairline, with one loose
// card on top.
//
// API: makeCard(slug) → Mesh (rotation.x = 0 face up, Math.PI face down; art top points to -z),
//      place(slugs, faceUp), deck, drawn, DECK, setState(name).
import * as THREE from 'three';
import { DECK, bySlug } from '../core/deck.js';
import { inkMaterial, makeCanvas, canvasTexture } from '../core/strokes.js';
import { mulberry32 } from '../core/rng.js';
import { cardGeometry } from './cards-geometry.js';
import { drawBack, drawFront, drawDeckSide, FRONT } from './cards-art.js';

export const meta = {
  name: 'cards',
  judge: { shot: 'card1', states: ['default', 'back', 'deck', 'three'] },
  files: ['src/pieces/cards.js', 'src/pieces/cards-geometry.js', 'src/pieces/cards-art.js', 'src/core/deck.js'],
};

const hashSlug = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export async function build(ctx) {
  const { card } = ctx.layout.spread;
  const W = card.w, H = card.h, T = card.t;
  const R = 0.005; // corner radius, 5 mm
  const g = new THREE.Group();
  g.name = 'cards';

  // ---- shared drawn surfaces ----
  try {
    await Promise.all([document.fonts.load('700 38px Jost'), document.fonts.load('600 17px Jost')]);
  } catch {}

  const backCanvas = makeCanvas(1024, 1792);
  drawBack(backCanvas.getContext('2d'), 1024, 1792, mulberry32(21));
  const backTex = canvasTexture(backCanvas, { anisotropy: 16 });
  const backMat = inkMaterial({ map: backTex, colorful: true, hatch: 0.1, lineWeight: 1 });

  const edgeMat = inkMaterial({ color: '#e1d8c2', hatch: 0.3, lineWeight: 0.6 });
  const stockMat = inkMaterial({ color: '#efe8d7', hatch: 0.2, lineWeight: 0.8 });

  // ---- the card ----
  const frontCache = new Map();
  async function frontMaterial(slug) {
    if (frontCache.has(slug)) return frontCache.get(slug);
    const p = (async () => {
      const tex = await ctx.assets.texture(ctx.assets.cardUrl(slug));
      const img = tex.image;
      const M = FRONT.M;
      const cw = (img?.naturalWidth || img?.width || 1024) + 2 * M;
      const ch = (img?.naturalHeight || img?.height || 1792) + 2 * M;
      const c = makeCanvas(cw, ch);
      drawFront(c.getContext('2d'), cw, ch, img, mulberry32(hashSlug(slug)));
      const t = canvasTexture(c, { anisotropy: 16 });
      return inkMaterial({ map: t, colorful: true, hatch: 0, lineWeight: 1 });
    })();
    frontCache.set(slug, p);
    return p;
  }

  // Each card bends its own way (seeded by its name): a cup along the length, a whisper of twist,
  // one corner lifted.
  function bendFor(seed) {
    const rng = mulberry32(seed);
    return {
      curl: 0.0009 + rng() * 0.0006,
      curlX: 0.0001 + rng() * 0.0002,
      twist: (rng() - 0.5) * 0.0006,
      dogEar: { sx: rng() < 0.5 ? -1 : 1, sy: rng() < 0.5 ? -1 : 1, amount: 0.0004 + rng() * 0.0005, radius: 0.016 + rng() * 0.012 },
    };
  }

  function cardMesh(front, seed) {
    const geo = cardGeometry({ w: W, h: H, t: T, r: R, nx: 10, ny: 18, arcN: 8, ...bendFor(seed) });
    const mesh = new THREE.Mesh(geo, [front, backMat, edgeMat]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  async function makeCard(slug) {
    const front = await frontMaterial(slug);
    const mesh = cardMesh(front, hashSlug(slug));
    mesh.name = `card:${slug}`;
    mesh.userData.card = bySlug[slug];
    mesh.rotation.x = Math.PI; // face down by default (back up)
    return mesh;
  }

  // ---- the deck ----
  const deck = new THREE.Group();
  deck.name = 'deck';
  const blocks = [26, 11, 6]; // cards per block, bottom to top; plus one loose card
  const nTotal = blocks.reduce((a, b) => a + b, 0);
  const sideCanvas = makeCanvas(1024, nTotal * 14);
  drawDeckSide(sideCanvas.getContext('2d'), 1024, nTotal * 14, nTotal, mulberry32(31));
  const perimeter = 2 * (W + H) - 8 * R + 2 * Math.PI * R;
  let y = 0, start = 0;
  const untidy = [
    { dx: 0, dz: 0, ry: 0 },
    { dx: 0.0014, dz: -0.0009, ry: 0.028 },
    { dx: -0.0009, dz: 0.0013, ry: -0.022 },
  ];
  blocks.forEach((n, i) => {
    const h = n * T;
    const tex = canvasTexture(sideCanvas, { anisotropy: 8 });
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(perimeter / 0.12, n / nTotal);
    tex.offset.set(0, start / nTotal);
    const sideMat = inkMaterial({ map: tex, colorful: true, hatch: 0.25, lineWeight: 0.6 });
    const geo = cardGeometry({ w: W, h: H, t: h, r: R, nx: 4, ny: 6, arcN: 8 });
    const m = new THREE.Mesh(geo, [backMat, stockMat, sideMat]);
    m.castShadow = true;
    m.receiveShadow = true;
    const u = untidy[i];
    m.position.set(u.dx, y + h / 2, u.dz);
    m.rotation.y = u.ry;
    m.name = `deck-block-${i}`;
    deck.add(m);
    y += h;
    start += n;
  });
  // the loose top card: a real card, face down, pushed a little off square
  const top = cardMesh(stockMat, 99);
  top.name = 'deck-top';
  top.rotation.x = Math.PI;
  top.position.set(0.0032, y + T / 2 + 0.0012, 0.0018);
  top.rotation.y = 0.055;
  deck.add(top);
  deck.userData.height = y + T + 0.0012;
  deck.position.set(...ctx.layout.deck.pos);
  deck.rotation.y = ctx.layout.deck.rotY;
  g.add(deck);

  const drawn = new THREE.Group();
  drawn.name = 'drawn';
  g.add(drawn);
  ctx.scene.add(g);

  const clearDrawn = () => {
    for (const m of drawn.children) m.geometry?.dispose?.();
    drawn.clear();
  };

  const api = {
    group: g,
    deck,
    drawn,
    makeCard,
    DECK,
    async place(slugs, faceUp = true) {
      clearDrawn();
      const out = [];
      const rng = mulberry32(1013 + ctx.seed);
      for (let i = 0; i < slugs.length; i++) {
        const m = await makeCard(slugs[i]);
        const slot = ctx.layout.spread.slots[Math.min(i, ctx.layout.spread.slots.length - 1)];
        // laid by hand: a millimetre off, a degree off
        m.position.set(slot[0] + (rng() - 0.5) * 0.002, slot[1], slot[2] + (rng() - 0.5) * 0.002);
        m.rotation.set(faceUp ? 0 : Math.PI, (rng() - 0.5) * 0.02, 0);
        drawn.add(m);
        out.push(m);
      }
      return out;
    },
    async setState(name) {
      const cam = ctx.pieces.camera;
      if (name === 'three') {
        await api.place(['the-fool', 'the-star', 'the-house-of-god'], true);
        cam?.cut?.('spread');
      } else if (name === 'back') {
        const [c] = await api.place(['the-fool'], false);
        c.position.set(...ctx.layout.spread.slots[1]);
        cam?.cut?.('card1');
      } else if (name === 'deck') {
        clearDrawn();
        cam?.cut?.('deck');
      } else {
        const [c] = await api.place(['the-star'], true);
        c.position.set(...ctx.layout.spread.slots[1]);
        cam?.cut?.('card1');
      }
    },
  };
  return api;
}
