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
export const LIPS = '#c9342e';

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
    robe: inkMaterial({ color: PAPER, colorful: false, hatch: 0.45 }),
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
    setState(name) {
      // one state for now: the reading pose. Deterministic.
      head.rotation.set(0, 0, 0);
      head.position.set(0, headY, 0);
    },
  };
  return api;
}
