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
import { drawBack, drawFront, drawDeckSide, BAND, FRONT, frogGlyph, starGlyph, moonGlyph, lozenge, qbez, ellArc, hatchPoly, inkPath } from './cards-art.js';
import { bakedTexture, BAKING } from '../core/bake.js';
import { inkFilter } from './cards-mips.js';

export const meta = {
  name: 'cards',
  judge: { shot: 'card1', states: ['default', 'back', 'deck', 'three'] },
  files: ['src/pieces/cards.js', 'src/pieces/cards-geometry.js', 'src/pieces/cards-art.js', 'src/core/deck.js'],
};

const hashSlug = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

// The baked drawings are fetched but NOT waited for inside build(). In the headless judging browser
// nothing the theatre page asks the dev server for is delivered for the first ~4 s of its life,
// however early it is asked for: logging every request of a boot showed one issued at t=100 ms and
// one issued at t=1.4 s both landing at t≈4.4 s, while the server answers the same URLs in ~1 ms to
// curl. So whichever piece AWAITS a file inside its build wears four seconds that have nothing to
// do with its own work — cards' own drawing and geometry is 12 ms of it. The materials are made
// first and the maps are hung on them when the files arrive; `api.ready` is awaited by setState and
// place, which main.js awaits, so a judging frame never renders a card without its back.
const attach = (p, mat) =>
  p.then((tex) => {
    mat.map = tex;
    mat.needsUpdate = true;
    return tex;
  });

export async function build(ctx) {
  const { card } = ctx.layout.spread;
  const W = card.w, H = card.h, T = card.t;
  const R = 0.005; // corner radius, 5 mm
  const g = new THREE.Group();
  g.name = 'cards';

  // ---- shared drawn surfaces ----
  // The webfont is only needed to DRAW the back's lettering, and the back is baked, so waiting for
  // it costs the whole build 3.5 s in the headless browser for nothing. Ask for it, then get on
  // with the build; only the bake run itself has to have the real letterforms.
  if (BAKING) await Promise.all([document.fonts.load('700 44px Jost'), document.fonts.load('600 21px Jost')]).catch(() => {});

  // the back and the deck's cut edge are pen drawings: baked (src/core/bake.js), drawn live only
  // when the drawing code changed and `node tools/bake.mjs` has not been run yet.
  //
  // Two things keep the back's ink BLACK when the card is small or turned away, and both are
  // needed:
  //   * colorful:false — a colourful material is composited exactly as its texture stands, so a
  //     grey texel stays grey. With the flag off the ink pass reads the texture as strokes and
  //     lays them down at one pressure: ink on paper is a threshold, not a colour.
  //   * inkFilter (cards-mips.js) — that threshold still needs something to bite on, and the mip
  //     chain the GPU generates by averaging turns a lattice covering a tenth of the paper into a
  //     ten-per-cent grey. Our own chain keeps a stroke a stroke at every level, and takes all the
  //     anisotropy the machine has. This is what stopped the lattice thinning out in the deck
  //     close-up, where the back is seen almost edge-on.
  const backMat = inkMaterial({ colorful: false, hatch: 0.2, lineWeight: 1 });
  const backReady = attach(
    bakedTexture('card-back', 1024, 1792, (g, w, h) => drawBack(g, w, h, mulberry32(21)), { anisotropy: 16, deps: [drawBack, frogGlyph, starGlyph, moonGlyph, lozenge, qbez, ellArc, hatchPoly, inkPath, JSON.stringify(BAND)] }).then((t) => inkFilter(t, ctx.renderer)),
    backMat,
  );

  // paper, all of it: the cut edge of a card is paper with one ink contour, never a grey slab
  const edgeMat = inkMaterial({ hatch: 0.25, lineWeight: 0.7 });
  const stockMat = inkMaterial({ hatch: 0.2, lineWeight: 0.8 });

  // ---- the card ----
  const frontCache = new Map();
  async function frontMaterial(slug) {
    if (frontCache.has(slug)) return frontCache.get(slug);
    const p = (async () => {
      const tex = await ctx.assets.texture(ctx.assets.cardUrl(slug));
      const img = tex.image;
      // The canvas is cut to the CARD's aspect, not the plate's, so the geometry's uv does not
      // stretch the drawing and the paper margin is the same width on every side. The plate is
      // then laid into it a hair off centre.
      const cw = (img?.naturalWidth || img?.width || 1024) + 2 * FRONT.M;
      const ch = Math.round((cw * H) / W);
      const c = makeCanvas(cw, ch);
      drawFront(c.getContext('2d'), cw, ch, img, mulberry32(hashSlug(slug)));
      const t = canvasTexture(c, { anisotropy: 16 });
      t.anisotropy = Math.max(16, ctx.renderer?.capabilities?.getMaxAnisotropy?.() ?? 16);
      return inkMaterial({ map: t, colorful: true, hatch: 0, lineWeight: 1 });
    })();
    frontCache.set(slug, p);
    return p;
  }

  // Each card bends its own way (seeded by its name): a cup along the length, a whisper of twist,
  // one corner lifted.
  function bendFor(seed) {
    const rng = mulberry32(seed);
    // a deck that has been shuffled a thousand times: two or three millimetres of cup along the
    // length, a whisper across it, one corner turned. Small enough that the cards still stack;
    // large enough that a card lying on the cloth is not a rectangle painted on it.
    return {
      curl: 0.0016 + rng() * 0.0012,
      curlX: 0.0003 + rng() * 0.0005,
      twist: (rng() - 0.5) * 0.0009,
      dogEar: { sx: rng() < 0.5 ? -1 : 1, sy: rng() < 0.5 ? -1 : 1, amount: 0.0007 + rng() * 0.0008, radius: 0.018 + rng() * 0.014 },
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
  const sideTexP = bakedTexture('deck-side', 1024, nTotal * 14, (g, w, h) => drawDeckSide(g, w, h, nTotal, mulberry32(31)), { anisotropy: 8, deps: [drawDeckSide, inkPath] }).then((t) => inkFilter(t, ctx.renderer));
  const perimeter = 2 * (W + H) - 8 * R + 2 * Math.PI * R;
  let y = 0, start = 0;
  const untidy = [
    { dx: 0, dz: 0, ry: 0 },
    { dx: 0.0014, dz: -0.0009, ry: 0.028 },
    { dx: -0.0009, dz: 0.0013, ry: -0.022 },
  ];
  const sideReady = [];
  blocks.forEach((n, i) => {
    const h = n * T;
    // each block shows its own slice of the one drawn stack of lines
    const sideMat = inkMaterial({ colorful: false, hatch: 0.25, lineWeight: 0.7 });
    const from = start;
    sideReady.push(
      attach(
        sideTexP.then((base) => {
          const tex = base.clone();
          tex.needsUpdate = true;
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.repeat.set(perimeter / 0.12, n / nTotal);
          tex.offset.set(0, from / nTotal);
          return tex;
        }),
        sideMat,
      ),
    );
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
  const ready = Promise.all([backReady, ...sideReady]).catch((e) => console.warn('[cards] a baked drawing failed to load', e));

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
    ready, // resolves when the baked back and cut edge are on their materials
    async place(slugs, faceUp = true) {
      await ready;
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
      await ready;
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
