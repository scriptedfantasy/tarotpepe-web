// PIECE: reveal — the card choreography: the shuffle, the deal from the deck to the three slots,
// the turn of each card (on twos, with a hold before the snap), and the settle.
import { snapEase } from '../core/clock.js';

export const meta = {
  name: 'reveal',
  judge: { shot: 'table', states: ['dealt', 'turning', 'revealed'], motion: true },
  files: ['src/pieces/reveal.js'],
};

export async function build(ctx) {
  const cards = ctx.pieces.cards;
  const anims = [];
  const api = {
    async deal(slugs) {
      const meshes = await cards.place(slugs, false);
      meshes.forEach((m, i) => {
        const target = m.position.clone();
        m.position.copy(cards.deck.position).setY(ctx.layout.deck.pos[1] + 0.05);
        anims.push({ mesh: m, from: m.position.clone(), to: target, t0: ctx.clock.t + i * 0.5, dur: 0.5, kind: 'move' });
      });
      return meshes;
    },
    turn(i, delay = 0) {
      const m = cards.drawn.children[i];
      if (!m) return;
      anims.push({ mesh: m, t0: ctx.clock.t + delay, dur: 0.5, kind: 'flip' });
    },
    async setState(name) {
      const slugs = ['the-fool', 'the-star', 'the-house-of-god'];
      if (name === 'dealt') await cards.place(slugs, false);
      else if (name === 'turning') {
        await cards.place(slugs, false);
        cards.drawn.children[0].rotation.x = 0;
        cards.drawn.children[1].rotation.x = Math.PI / 2;
        cards.drawn.children[1].position.y += 0.06;
      } else await cards.place(slugs, true);
    },
    update(ctx) {
      if (!ctx.clock.stepped) return;
      const t = ctx.clock.t;
      for (const a of anims) {
        const u = snapEase((t - a.t0) / a.dur);
        if (t < a.t0) continue;
        if (a.kind === 'move') {
          a.mesh.position.lerpVectors(a.from, a.to, u);
          a.mesh.position.y += Math.sin(u * Math.PI) * 0.08;
        } else if (a.kind === 'flip') {
          a.mesh.rotation.x = Math.PI * (1 - u);
          a.mesh.position.y = ctx.layout.spread.y + Math.sin(u * Math.PI) * 0.06;
        }
      }
      for (let i = anims.length - 1; i >= 0; i--) if (t > anims[i].t0 + anims[i].dur) anims.splice(i, 1);
    },
  };
  return api;
}
