// Tarot Pepe — a reading, in miniature.
// Boots the renderer, builds every piece in dependency order, and runs the stop-motion loop.
//
// URL parameters (used by tools/shot.mjs and the progress page):
//   ?view=<piece>      judge one piece: camera cuts to that piece's judging shot, piece.setState(state)
//   &state=<name>      a named state the piece knows how to show (default 'default')
//   &only=a,b          build only these pieces (rarely needed; the composite is what is judged)
//   &t=<seconds>       freeze the stop-motion clock at t (deterministic frames)
//   &seed=<n>          deterministic shuffles / boil
//   &shot=1            screenshot mode: no autoplay flow, sets window.__theatreReady when settled
import * as THREE from 'three';
import { LAYOUT } from './core/layout.js';
import { createClock } from './core/clock.js';
import { mulberry32 } from './core/rng.js';
import { createAssets } from './core/assets.js';

import * as lighting from './pieces/lighting.js';
import * as room from './pieces/room.js';
import * as props from './pieces/props.js';
import * as table from './pieces/table.js';
import * as cards from './pieces/cards.js';
import * as pepe from './pieces/pepe.js';
import * as pepeAnim from './pieces/pepeAnim.js';
import * as reveal from './pieces/reveal.js';
import * as camera from './pieces/camera.js';
import * as ink from './pieces/ink.js';
import * as titles from './pieces/titles.js';
import * as dialogue from './pieces/dialogue.js';
import * as sound from './pieces/sound.js';
import * as mind from './pieces/mind.js';
import * as flow from './pieces/flow.js';

// Build order = dependency order. Each piece receives ctx.pieces with everything built before it.
export const PIECES = [lighting, room, props, table, cards, pepe, pepeAnim, reveal, camera, ink, titles, dialogue, sound, mind, flow];

const params = new URLSearchParams(location.search);
const view = params.get('view');
const state = params.get('state') ?? 'default';
const shotMode = params.get('shot') === '1';
const seed = +(params.get('seed') ?? 1);
const freezeAt = params.has('t') ? +params.get('t') : null;
const only = params.get('only') ? params.get('only').split(',') : null;
const debugEl = document.getElementById('debug');

window.__theatreReady = false;

const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: shotMode, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#f8f9f4');
const cam = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.03, 60);
cam.position.set(...LAYOUT.shots.home.pos);
cam.lookAt(...LAYOUT.shots.home.look);

const ctx = {
  THREE,
  renderer,
  scene,
  camera: cam,
  layout: LAYOUT,
  clock: createClock({ freezeAt }),
  rng: mulberry32(seed),
  seed,
  params,
  view,
  state,
  shotMode,
  assets: createAssets(renderer),
  pieces: {},
  dom: {
    overlay: document.getElementById('overlay'),
    titles: document.getElementById('titles'),
    dialogue: document.getElementById('dialogue'),
    letterbox: document.getElementById('letterbox'),
    ui: document.getElementById('ui'),
  },
  events: new EventTarget(),
  size: { w: window.innerWidth, h: window.innerHeight, dpr: renderer.getPixelRatio() },
  emit(name, detail) {
    this.events.dispatchEvent(new CustomEvent(name, { detail }));
  },
  on(name, fn) {
    this.events.addEventListener(name, (e) => fn(e.detail));
  },
  log(...a) {
    console.log('[theatre]', ...a);
  },
};

for (const mod of PIECES) {
  const name = mod.meta.name;
  if (only && !only.includes(name)) continue;
  const t0 = performance.now();
  try {
    ctx.pieces[name] = (await mod.build(ctx)) ?? {};
    ctx.pieces[name].meta = mod.meta;
    console.log(`[theatre] built ${name} in ${(performance.now() - t0).toFixed(0)}ms`);
  } catch (e) {
    console.error(`[piece:${name}] build failed`, e);
    ctx.pieces[name] = { failed: e, meta: mod.meta };
  }
}
await ctx.assets.settle();

// Judging / autoplay
if (view) {
  const mod = PIECES.find((m) => m.meta.name === view);
  const shot = mod?.meta.judge?.shot ?? 'home';
  ctx.pieces.camera?.cut?.(shot);
  // a 3D piece is judged on its drawing alone: the DOM layers (captions, title cards) stay out
  // of the frame unless the piece being judged is one of them
  if (!mod?.meta.judge?.dom && view !== 'flow') {
    ctx.dom.titles.style.display = 'none';
    ctx.dom.dialogue.style.display = 'none';
    ctx.dom.ui.style.display = 'none';
  }
  try {
    await ctx.pieces[view]?.setState?.(state, ctx);
  } catch (e) {
    console.error(`[piece:${view}] setState(${state}) failed`, e);
  }
} else if (!shotMode) {
  ctx.pieces.flow?.start?.(ctx);
} else {
  ctx.pieces.camera?.cut?.('home');
}
await ctx.assets.settle();

const warned = new Set();
let rendered = 0;
function loop() {
  requestAnimationFrame(loop);
  ctx.clock.tick();
  for (const name in ctx.pieces) {
    const api = ctx.pieces[name];
    if (!api.update) continue;
    try {
      api.update(ctx);
    } catch (e) {
      if (!warned.has(name)) {
        warned.add(name);
        console.error(`[piece:${name}] update failed`, e);
      }
    }
  }
  cam.updateMatrixWorld();
  if (ctx.pieces.ink?.render) ctx.pieces.ink.render(ctx);
  else renderer.render(scene, cam);
  if (++rendered === 3) window.__theatreReady = true;
  if (debugEl && params.has('debug')) debugEl.textContent = `t=${ctx.clock.t.toFixed(2)} f=${ctx.clock.frame} view=${view ?? '-'} state=${state}`;
}
loop();

window.addEventListener('resize', () => {
  ctx.size = { w: window.innerWidth, h: window.innerHeight, dpr: renderer.getPixelRatio() };
  cam.aspect = ctx.size.w / ctx.size.h;
  cam.updateProjectionMatrix();
  renderer.setSize(ctx.size.w, ctx.size.h);
  ctx.emit('resize', ctx.size);
});

window.__theatre = ctx;
