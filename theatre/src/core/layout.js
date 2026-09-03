// The single source of truth for where things are on the stage.
// Units are metres. Origin: centre of the floor. +z is towards the camera / visitor, -z is upstage.
// The visitor (camera) sits across the table from Tarot Pepe, who sits upstage facing +z.
export const LAYOUT = Object.freeze({
  room: { width: 5.2, depth: 5.0, height: 3.1 }, // walls at x = ±2.6, back wall at z = -2.5, ceiling at y = 3.1
  floorY: 0,
  table: { pos: [0, 0, 0], top: 0.76, radius: 0.62 },
  pepe: { pos: [0, 0, -0.82], headY: 1.24 }, // seated upstage of the table, facing +z
  spread: {
    y: 0.7625,
    slots: [
      [-0.36, 0.7625, 0.14],
      [0, 0.7625, 0.14],
      [0.36, 0.7625, 0.14],
    ],
    card: { w: 0.13, h: 0.2275, t: 0.0008 }, // 1024x1792 art → 0.13 x 0.2275 (same aspect)
    labels: ['What you brought', 'What is actually going on', 'What to do about it'],
  },
  deck: { pos: [0.5, 0.7625, 0.26], rotY: -0.06 },
  // Named camera shots. `up` optional. The camera piece may add its own; these are the contract.
  shots: {
    home: { pos: [0, 1.2, 2.55], look: [0, 0.98, -0.45], fov: 30 },
    wide: { pos: [0, 1.35, 3.7], look: [0, 1.15, -0.6], fov: 40 },
    pepe: { pos: [0, 1.14, 1.25], look: [0, 1.0, -0.82], fov: 25 }, // head, shoulders, hands on the table (the puppet fills the frame)
    table: { pos: [0, 1.45, 1.35], look: [0, 0.76, 0.05], fov: 34 },
    spread: { pos: [0, 2.05, 0.1401], look: [0, 0.7625, 0.14], fov: 30, up: [0, 0, -1] }, // planimetric overhead
    card0: { pos: [-0.36, 1.25, 0.1401], look: [-0.36, 0.7625, 0.14], fov: 30, up: [0, 0, -1] },
    card1: { pos: [0, 1.25, 0.1401], look: [0, 0.7625, 0.14], fov: 30, up: [0, 0, -1] },
    card2: { pos: [0.36, 1.25, 0.1401], look: [0.36, 0.7625, 0.14], fov: 30, up: [0, 0, -1] },
    deck: { pos: [0.5, 1.15, 0.85], look: [0.5, 0.76, 0.26], fov: 30 },
    fan: { pos: [0, 1.78, 0.62], look: [0, 0.76, 0.28], fov: 34 }, // the three slots and the fanned deck, for picking
    door: { pos: [0, 1.4, 4.2], look: [0, 1.2, -2.5], fov: 45 },
  },
});
