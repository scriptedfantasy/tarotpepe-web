// PIECE: pepeAnim — how Pepe moves. Limited animation on twos: long holds, snap transitions,
// blinks, a small "o" mouth when he speaks, splayed-finger gestures, head tilts.
// Everything reads ctx.clock.t (12 fps stepped), never smooth time.
import { boil } from '../core/rng.js';

export const meta = {
  name: 'pepeAnim',
  judge: { shot: 'pepe', states: ['idle', 'talk', 'gesture', 'consider'], motion: true },
  files: ['src/pieces/pepeAnim.js'],
};

export async function build(ctx) {
  const pepe = ctx.pieces.pepe;
  let mode = 'idle';
  let talkUntil = 0;
  const api = {
    play(name) {
      mode = name;
    },
    say(text, seconds = Math.max(1.2, text.length * 0.045)) {
      mode = 'talk';
      talkUntil = ctx.clock.t + seconds;
    },
    setState(name) {
      mode = name === 'default' ? 'idle' : name;
      if (mode === 'talk') talkUntil = Infinity;
    },
    update(ctx) {
      if (!pepe?.head || !ctx.clock.stepped) return;
      const t = ctx.clock.t, f = ctx.clock.frame;
      if (mode === 'talk' && t > talkUntil) mode = 'idle';
      // breathing hold: a 2-frame bob every second, not a sine
      const bob = Math.floor((t % 1) * 12) < 2 ? 0.004 : 0;
      pepe.head.position.y = ctx.layout.pepe.headY + bob + boil(f, 1, 0.0008);
      pepe.head.rotation.z = boil(Math.floor(f / 6), 2, 0.01) + (mode === 'consider' ? 0.12 : 0);
      pepe.head.rotation.x = mode === 'talk' && f % 4 < 2 ? 0.03 : 0;
      pepe.head.rotation.y = mode === 'gesture' ? 0.15 : 0;
    },
  };
  return api;
}
