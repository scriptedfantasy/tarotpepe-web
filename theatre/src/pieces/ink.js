// PIECE: ink — the look. Turns the 3D scene into a pen drawing on paper: outlines with a
// hand's wobble, tone built from hatching strokes (never gradients), flat selective colour
// (materials flagged userData.ink.colorful keep their colour; everything else is paper white),
// a paper ground, a gentle line "boil" on the 12fps clock, letterbox. Owns the final render.
// API: render(ctx), setState(name) for judging states.
//
// STUB: plain render. The real pipeline replaces this file entirely.
import * as THREE from 'three';

export const meta = {
  name: 'ink',
  judge: { shot: 'home', states: ['default', 'lines-only', 'tone-only'] },
  files: ['src/pieces/ink.js'],
};

export async function build(ctx) {
  ctx.scene.background = new THREE.Color('#f6f2ea');
  return {
    render(ctx) {
      ctx.renderer.render(ctx.scene, ctx.camera);
    },
    setState() {},
  };
}
