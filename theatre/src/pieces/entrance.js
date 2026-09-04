// PIECE: entrance — the film opens on a door.
//
// One drawn door, dead centre on a bare sheet, with TAROT PEPE cut into its top panel in the
// masthead's own alphabet. Nothing else: no title card, no chapter, no picture. The visitor clicks;
// the latch goes, the leaf shivers one frame, and then it swings in eight stepped drawings on twos
// — and through the widening doorway the parlour is there, because the doorway is punched clean out
// of this layer and what shows through it is the live drawing underneath (the camera waiting at
// `threshold`, out on the landing). One beat against the stop, and then the visitor walks: the
// sheet trucks in about the middle of the doorway in five more drawings while the room behind it
// does not move, the case runs off all four edges, and the film CUTS — this layer goes, the camera
// is at `home`, and Pepe says good evening. No fade, no dissolve: a hole in a sheet of paper, a
// drawing pushed at the lens, and a cut.
//
// Drawn, not built: the lettering has to be cut at pen resolution (a texture on a 3D slab at this
// size is mush), the whitespace has to be measured on the frame rather than found with a lens, and
// the parlour has no outside to shoot from. What the drawing cannot fake — the room beyond — is
// the real room, seen through the hole; and the truck-in is what makes the two scales agree, since
// by the time the doorway is wide enough to see much of the parlour it is the size of the frame.
//
// The way back: after the closing card a click restarts the evening, which begins here again, so
// the door shuts behind the visitor and can be knocked on a second time.
//
// API: open() — resolves when the film is inside · showing · setState(name)
//   states: closed · opening (the swing, looped, deterministic in ctx.clock.raw) · open
import { drawEntrance, cutName, placement } from './entrance-door.js';

export const meta = {
  name: 'entrance',
  judge: { shot: 'threshold', states: ['closed', 'opening', 'open'] },
  files: ['src/pieces/entrance.js', 'src/pieces/entrance-door.js'],
};

const DEG = Math.PI / 180;
// The swing, drawing by drawing. It goes over quickly, slows against its own weight, overruns the
// stop by three degrees and comes back — the last two are the bounce a puppet door makes.
const SWING = [5, 15, 31, 48, 62, 71, 78, 75].map((d) => d * DEG);
const OPEN = SWING[SWING.length - 1];
// Then the visitor walks through. The sheet is trucked in about the middle of the doorway, on twos,
// while the room behind it does not move an inch — which is what going through a door looks like,
// and which is also the only honest way to reconcile a small drawn door with a real room behind it:
// by the time the doorway is wide enough to see much, it is the size of the frame.
const TRUCK = [1.16, 1.6, 2.5, 4.2, 7.4];
const HOLD = 2 / 12; // every drawing is on twos
const LATCH = 1 / 12; // one frame of shiver at the latch
const SHUT_AFTER_LATCH = 2 / 12;
const SWING_AT = LATCH + SHUT_AFTER_LATCH; // the first drawing of the swing
const SWING_END = SWING_AT + SWING.length * HOLD;
const REST = 2 / 12; // it stands against its stop for one beat
const TRUCK_AT = SWING_END + REST;
const CUT_AT = TRUCK_AT + TRUCK.length * HOLD;
// the judging loop: shut, the swing, the walk through, again
const LOOP = CUT_AT + 0.45;

export async function build(ctx) {
  const root = document.createElement('div');
  root.id = 'entrance';
  const style = document.createElement('style');
  style.textContent = `
    #entrance { z-index: 6; display: none; pointer-events: none; }
    #entrance.up { display: block; pointer-events: auto; cursor: pointer; }
    #entrance canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  `;
  document.head.appendChild(style);
  const canvas = document.createElement('canvas');
  root.appendChild(canvas);
  ctx.dom.overlay.appendChild(root);

  let name = null; // the baked lettering, re-cut when the frame changes
  let nameKey = '';
  let mode = 'hidden'; // hidden · closed · swing · open · loop
  let t0 = 0; // clock.raw at the click
  let drawnAt = ''; // the number of the drawing last put on the canvas
  let token = 0; // a restart lets an older open() go
  let knocked = null; // resolve of the promise the door is waiting on
  let zoomNow = 1; // how far the sheet has trucked in

  const cue = (n) => ctx.pieces.sound?.play?.(n);

  function size() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = ctx.size?.w || window.innerWidth, h = ctx.size?.h || window.innerHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      drawnAt = '';
    }
    const key = `${Math.round(placement(w, h).s)}`;
    if (key !== nameKey) {
      nameKey = key;
      name = cutName(placement(w, h), dpr);
      drawnAt = '';
    }
    return { w, h, dpr };
  }

  // One drawing per pose, drawn once: the seed is the drawing's number, not the clock, so a held
  // door is one cel and not a field of strokes re-scattering six times a second.
  function paint(p) {
    zoomNow = p.zoom;
    const key = `${p.k}`;
    if (key === drawnAt) return;
    drawnAt = key;
    const { w, h, dpr } = size();
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawEntrance(g, w, h, { theta: p.theta, jolt: p.jolt, zoom: p.zoom, seed: 17 + p.k * 131, name });
  }

  // What a held cel does under a rostrum camera: it sits a whisker off its pegs, differently every
  // second frame. A transform, not a re-draw — the strokes must not move relative to each other.
  let wobbleAt = -1;
  function wobble(frame) {
    const f = Math.floor(frame / 2);
    if (f === wobbleAt) return;
    wobbleAt = f;
    const r = ((Math.sin(f * 12.9898) * 43758.5453) % 1 + 1) % 1;
    const r2 = ((Math.sin(f * 78.233 + 1.7) * 12543.7261) % 1 + 1) % 1;
    canvas.style.transform = `translate(${(r - 0.5).toFixed(3)}px, ${(r2 - 0.5).toFixed(3)}px) rotate(${((r - 0.5) * 0.06).toFixed(4)}deg) scale(1.004)`;
  }

  // where the drawing is, `u` seconds after the click; `k` numbers the drawings
  function poseAt(u) {
    if (u < LATCH) return { k: 1, theta: 0, jolt: 2, zoom: 1 };
    if (u < SWING_AT) return { k: 2, theta: 0, jolt: 0, zoom: 1 };
    if (u < SWING_END) {
      const i = Math.floor((u - SWING_AT) / HOLD);
      return { k: 3 + i, theta: SWING[i], jolt: 0, zoom: 1 };
    }
    if (u < TRUCK_AT) return { k: 3 + SWING.length, theta: OPEN, jolt: 0, zoom: 1 };
    const i = Math.min(Math.floor((u - TRUCK_AT) / HOLD), TRUCK.length - 1);
    return { k: 4 + SWING.length + i, theta: OPEN, jolt: 0, zoom: TRUCK[i] };
  }
  const SHUT = { k: 0, theta: 0, jolt: 0, zoom: 1 };
  const WIDE = { k: 3 + SWING.length, theta: OPEN, jolt: 0, zoom: 1 };

  // the cues, fired once each as the swing passes them
  // The sound piece has no latch, no hinge and no footfall of its own (see contractRequests): the
  // latch borrows the deck's tap, the hinges borrow the chair's creak — dry wood under load, which
  // is what a hinge is — and the stop borrows a card's settle.
  const CUES = [
    [0, 'tap'], // the latch
    [SWING_AT + HOLD, 'creak'], // the hinges take the weight
    [SWING_AT + 4 * HOLD, 'creak'],
    [SWING_END, 'settle'], // it comes to rest against the stop
    [TRUCK_AT + 2 * HOLD, 'creak'], // a board under the visitor, going in
  ];
  let fired = 0;

  function show(kind) {
    mode = kind;
    root.classList.add('up');
    drawnAt = '';
    zoomNow = 1;
    ctx.pieces.camera?.cut?.('threshold');
  }
  function hide() {
    mode = 'hidden';
    root.classList.remove('up');
  }

  // a click on the picture, or a key: the visitor knocks
  function knock() {
    return new Promise((res) => (knocked = res));
  }
  function onDown(e) {
    if (mode !== 'closed' || !knocked) return;
    e.preventDefault?.();
    const go = knocked;
    knocked = null;
    go();
  }
  function onKey(e) {
    if (mode !== 'closed' || !knocked) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key !== ' ' && e.key !== 'Enter') return;
    onDown(e);
  }
  root.addEventListener('pointerdown', onDown);
  if (!ctx.shotMode) window.addEventListener('keydown', onKey);

  const api = {
    get showing() {
      return mode !== 'hidden';
    },
    get mode() {
      return mode;
    },

    // The opening. Resolves when the film is inside the parlour, at `home`.
    async open() {
      const mine = ++token;
      knocked?.(); // an older visit standing at the door lets go
      knocked = null;
      if (ctx.shotMode) return; // a screenshot never waits at the door
      show('closed');
      paint(SHUT);
      await knock();
      if (mine !== token) return;
      // the visitor's first gesture is also what a browser wants before any sound
      ctx.pieces.sound?.start?.();
      mode = 'swing';
      t0 = ctx.clock.raw;
      fired = 0;
      await new Promise((res) => {
        const tick = () => {
          if (mine !== token) return res();
          if (mode !== 'swing' || ctx.clock.raw - t0 >= CUT_AT) return res();
          requestAnimationFrame(tick);
        };
        tick();
      });
      if (mine !== token) return;
      hide();
      ctx.pieces.camera?.cut?.('home');
      cue('cut');
    },

    // a restart, or a judging state, lets a waiting door go
    stop() {
      token++;
      knocked?.();
      knocked = null;
      hide();
    },

    setState(nameState) {
      token++;
      knocked?.();
      knocked = null;
      if (nameState === 'open') {
        show('open');
        paint(WIDE);
      } else if (nameState === 'opening') {
        show('loop');
      } else {
        show('closed');
        paint(SHUT);
      }
    },

    update(c) {
      if (mode === 'hidden') return;
      // the cel sits a whisker off its pegs, differently every second frame — but only while the
      // sheet is still: a truck-in is movement enough
      if (zoomNow < 1.05) wobble(c.clock.frame);
      else canvas.style.transform = 'scale(1.004)';
      if (mode === 'closed') return paint(SHUT);
      if (mode === 'open') return paint(WIDE);
      // the swing on a loop, driven by the clock alone: frozen at ?t it is one fixed drawing
      if (mode === 'loop') return paint(poseAt(c.clock.raw % LOOP));
      // the real thing
      const u = c.clock.raw - t0;
      while (fired < CUES.length && u >= CUES[fired][0]) cue(CUES[fired++][1]);
      paint(poseAt(u));
    },
  };
  return api;
}
