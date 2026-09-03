// PIECE: cards — the physical card: front art (the only full-colour objects in the world besides
// Pepe), an ink-drawn back, paper edges, a hint of curl. Also the deck as an object.
import * as THREE from 'three';
import { DECK, BACK_SLUG, bySlug } from '../core/deck.js';
import { inkMaterial } from '../core/strokes.js';

export const meta = {
  name: 'cards',
  judge: { shot: 'card1', states: ['default', 'back', 'deck', 'three'] },
  files: ['src/pieces/cards.js', 'src/core/deck.js'],
};

export async function build(ctx) {
  const { card } = ctx.layout.spread;
  const g = new THREE.Group();
  g.name = 'cards';
  const backTex = await ctx.assets.texture(ctx.assets.cardUrl(BACK_SLUG));
  const edgeMat = inkMaterial({ color: '#efe6d2', hatch: 0.2 });
  const geo = new THREE.BoxGeometry(card.w, card.t, card.h);

  async function makeCard(slug) {
    const frontTex = await ctx.assets.texture(ctx.assets.cardUrl(slug));
    const front = inkMaterial({ map: frontTex, colorful: true, hatch: 0 });
    const back = inkMaterial({ map: backTex, colorful: false, hatch: 0.2 });
    // box faces: +x, -x, +y (top = front when face up), -y, +z, -z
    const mesh = new THREE.Mesh(geo, [edgeMat, edgeMat, front, back, edgeMat, edgeMat]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.card = bySlug[slug];
    mesh.rotation.x = Math.PI; // face down by default (back up)
    return mesh;
  }

  // the deck: a stack of backs
  const deck = new THREE.Group();
  deck.name = 'deck';
  const backOnly = inkMaterial({ map: backTex, hatch: 0.2 });
  const stack = new THREE.Mesh(new THREE.BoxGeometry(card.w, card.t * 60, card.h), [edgeMat, edgeMat, backOnly, backOnly, edgeMat, edgeMat]);
  stack.position.y = (card.t * 60) / 2;
  stack.castShadow = true;
  deck.add(stack);
  deck.position.set(...ctx.layout.deck.pos);
  deck.rotation.y = ctx.layout.deck.rotY;
  g.add(deck);

  const drawn = new THREE.Group();
  drawn.name = 'drawn';
  g.add(drawn);
  ctx.scene.add(g);

  const api = {
    group: g,
    deck,
    drawn,
    makeCard,
    DECK,
    async place(slugs, faceUp = true) {
      drawn.clear();
      const out = [];
      for (let i = 0; i < slugs.length; i++) {
        const m = await makeCard(slugs[i]);
        m.position.set(...ctx.layout.spread.slots[i]);
        m.rotation.x = faceUp ? 0 : Math.PI;
        drawn.add(m);
        out.push(m);
      }
      return out;
    },
    async setState(name) {
      if (name === 'three') await api.place(['the-fool', 'the-star', 'the-house-of-god'], true);
      else if (name === 'back') await api.place(['the-fool'], false).then((c) => c[0].position.set(...ctx.layout.spread.slots[1]));
      else if (name === 'deck') drawn.clear();
      else await api.place(['the-star'], true).then((c) => c[0].position.set(...ctx.layout.spread.slots[1]));
    },
  };
  return api;
}
