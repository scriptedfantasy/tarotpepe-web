// PIECE: pepe — Tarot Pepe himself, built to match public/pepe/pepe-meditation.webp: green skin
// (face, hands, feet — the only coloured skin in the drawing), calm half-lidded eyes, red lips, a
// plain white long-sleeved robe, cross-legged on a low bench upstage of the table, palms open on
// the table, facing the visitor. The supplied head GLB is mounted and dressed in pepe-head.js;
// the robe, limbs, hands, feet and bench are in pepe-body.js.
//
// api: { group, head, torso, hands, parts, setState }
//   parts = { head, face, skull, eyes:[l,r], pupils:[l,r], lids:[l,r], mouth, lips, handL, handR,
//             arms:{L:{shoulder,elbow,wrist,hand},R:{...}}, torso, neck, legs, feet, bench }
import * as THREE from 'three';
import { inkMaterial, INK, PAPER } from '../core/strokes.js';
import { buildHead } from './pepe-head.js';
import { buildBody } from './pepe-body.js';

export const meta = {
  name: 'pepe',
  judge: { shot: 'pepe', states: ['default'] },
  files: ['src/pieces/pepe.js', 'src/pieces/pepe-head.js', 'src/pieces/pepe-body.js'],
};

export const SKIN = '#5dbb63';
export const LIPS = '#d24b3e';

export async function build(ctx) {
  const { pos, headY } = ctx.layout.pepe;
  const g = new THREE.Group();
  g.name = 'pepe';
  g.position.set(...pos);

  const mats = {
    skin: inkMaterial({ color: SKIN, colorful: true, hatch: 0.35 }),
    lips: inkMaterial({ color: LIPS, colorful: true, hatch: 0.3 }),
    ink: inkMaterial({ color: INK, colorful: true, hatch: 0, roughness: 1 }),
    white: inkMaterial({ color: '#faf8f3', colorful: false, hatch: 0.1 }),
    robe: inkMaterial({ color: PAPER, colorful: false, hatch: 0.64 }),
    wood: inkMaterial({ color: PAPER, colorful: false, hatch: 0.6, lineWeight: 1.1 }),
    cushion: inkMaterial({ color: PAPER, colorful: false, hatch: 0.4 }),
    collar: inkMaterial({ color: PAPER, colorful: false, hatch: 0.12 }),
  };

  // body first (it does not depend on the head loading)
  const body = buildBody(ctx, mats, { headY });
  g.add(body.group);

  // the head: a Group at headY that pepeAnim moves; the dressed skull hangs inside it
  let head, headParts = null;
  try {
    headParts = await buildHead(ctx, mats);
    head = headParts.head;
  } catch (e) {
    console.error('[pepe] head failed to load, using a placeholder', e);
    head = new THREE.Group();
    head.name = 'head';
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 20), mats.skin);
    ball.scale.set(1.25, 1, 1);
    ball.castShadow = true;
    head.add(ball);
  }
  head.position.y = headY;
  g.add(head);

  ctx.scene.add(g);

  const parts = {
    head,
    face: headParts?.face ?? null,
    skull: headParts?.skull ?? null,
    eyes: headParts?.eyes ?? [],
    pupils: headParts?.pupils ?? [],
    lids: headParts?.lids ?? [],
    mouth: headParts?.mouth ?? null,
    lips: headParts?.lips ?? null,
    ...body.parts,
  };

  const api = {
    group: g,
    head,
    torso: body.parts.torso,
    hands: [body.parts.handL, body.parts.handR],
    parts,
    mats,
    setState(name, ctx2) {
      // one judged state: the reading pose. Deterministic. The others are builder debug views.
      head.rotation.set(0, 0, 0);
      head.position.set(0, headY, 0);
      const pieces = ctx2?.pieces ?? ctx.pieces;
      const words = name.split('-');
      if (words.includes('close')) pieces.camera?.cut?.({ pos: [0, 1.2, 1.5], look: [0, 1.04, -0.82], fov: 27 }); // the head at a third of the frame
      const dressing = [...parts.eyes, ...parts.lids, parts.mouth].filter(Boolean);
      for (const o of dressing) o.visible = !words.includes('raw');
      const modes = { lines: 'lines-only', tone: 'tone-only', normals: 'debug-normal', edges: 'debug-edge', albedo: 'debug-albedo', lit: 'debug-lit' };
      for (const w of words) if (modes[w]) pieces.ink?.setMode?.(modes[w]);
    },
  };
  return api;
}
