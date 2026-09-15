// AN EGG, inside props: THE ROOM GOES OUT, AND WHAT IS LEFT IS HIS FACE.
//
// The user: "clicking the light behind Pepe should lead to the whole room turning black — the only
// thing the user should see is Pepe's eyes and his mouth."
//
// So: click the mushroom lamp on the operator's position and the room is painted out — the paper
// itself, the walls, the cards, the cloth, the case, the window, the fire laid in the grate, him —
// leaving two eyes and a mouth on a black field. It ends on the next click anywhere on the glass,
// or after twenty seconds, whichever comes first, and the room comes back exactly as it was.
//
// THE LAMP IS FREE BECAUSE THE FIRE LEFT IT. It was the fire's switch for two rounds — a hover,
// then a click — and the user moved that egg onto the fireplace in the same breath as asking for
// this one ("the fire easter egg should not originate from the light behind Pepe, but from the
// fireplace"). So the lamp is not being shared: it has one switch on it and always has.
//
// IT IS DONE IN THE INK PASS AND NOT BY HIDING ANYTHING, and that is the whole of the craft in it.
// Every mesh stays in the scene, every light stays on, the G-buffer, the lit pass and the edge pass
// run exactly as they run on any other drawing. What changes is one branch in the composite
// (src/pieces/ink-shaders.js, THE DARK): a pixel whose neighbourhood carries no `keep` flag is
// painted solid ink and returns before a single mark is fitted. Hiding the room instead would have
// been a different room — no contact shadows, no occlusion, the pen finding silhouettes against
// nothing — and it would have cost more, not less.
//
// WHAT CARRIES THE FLAG, and it is eight materials in the whole set: his two pupils, the ink round
// his eyes, his two closed lids and his three mouths (src/pieces/pepe.js, `cutMat`). They are
// MARKS and not areas — a pupil is a black disc, an eyeline is a stroke — so the mask is DILATED a
// few pixels off them in the composite, which closes it over the white of the eye on the head's own
// sheet. Without that the dark left two black discs on a black field, which is nothing at all; with
// it the eye comes back whole and unaltered: paper white, black pupil, black lid line, the room's
// own pen. NOTHING IS RE-DRAWN. What the visitor sees is the same drawing of his face that was
// there a drawing earlier, with ink where the parlour was.
//
// WHERE THE MASK IS LOOKED FOR. His head's box on the glass, grown by a third, solved every drawing
// off the two eye anchors and the mouth anchor (pepe.js `parts`) — he breathes, he leans, the lens
// moves, and a box measured once at boot would have clipped an eye the first time he did. Outside
// that box the branch is one texture fetch and a return, which is why a dark room costs about what
// a lit one does.
//
// IT IS A CUT, BOTH WAYS. The click is answered on the next 12 fps drawing and the change lands
// whole — the cat's lamp's manners, the mains lever's manners. A fade here would be the only
// continuous thing in the film. A short dry click goes with it ('switch', sound-voices.js, the
// same cue the cat's lamp throws), fired on the pointer and not on the drawing, because the
// visitor's thumb is on the switch NOW. That is a mechanism and not an announcement.
//
// NOTHING IS SAID AND NOTHING ANNOUNCES IT. No label, no glow, no tag, no line on the placard, no
// beat, no camera move, no reaction from him. `props:dark` goes on the bus and NOTHING IN THE ROOM
// LISTENS TO IT — flow.js has no hook for it and is not getting one; it is there for the tools.
// THE PLACARD AND THE FIELD STAY UP AND STAY USABLE: they are DOM over the canvas and this pass
// never touches them, which matters because a visitor may be mid-sentence when they try the lamp.
//
// HOW IT ENDS, and there are two ways and they are both the visitor's:
//   THE NEXT CLICK, anywhere on the glass. The listener is on `window` at the CAPTURE phase and it
//     stops the event there, so a click that lands on the cat, the clock or the grate puts the room
//     back and does not also throw that switch — you cannot work a room you cannot see. It is armed
//     on the first drawing AFTER the dark goes on, so the click that started it is not the click
//     that ends it.
//   TWENTY SECONDS, counted in drawings like everything else in this film: 240 of them on the
//     twelves. Long enough to be a held breath, short enough that a visitor who has wandered off
//     comes back to a room.
//
// api (published as props.dark):
//   on            true while the room is out
//   toggle()      put it out or bring it back, as a click does (cue, event and all)
//   set(on)       for a still: there or not, with no cue and nothing to wait for
//   held          how many drawings the room has been out, and the seconds those are worth
//   box           the mask's box on the glass in uv, for a proof that wants to name it
//   grow          the dilation in css px, likewise
//   hitBox()      the lamp's box on the glass, in px
//   tapBox()      the box a thumb is actually given (>= 44 px, grown about the same centre)
//   setState(n)   `dark` is the room out for a still; every other name is a room with the lights on
//   update(ctx)   called from props.update on the stepped clock
// events:
//   props:dark { on }   nothing listens
import * as THREE from 'three';

// THE LAMP'S OWN BOX, in its own frame, off props-objects.js `mushroomLamp`: a lathed base under a
// hemisphere of radius 0.115 whose centre is at y 0.19, so the whole fitting is 0.23 across and
// 0.305 tall. Read, never written: if that lamp is ever redrawn these move with it. (It is the
// same pair of numbers egg-fine.js read while the fire hung off this lamp.)
const LAMP = { r: 0.115, top: 0.305 };
const MIN_TAP = 44; // px: what a thumb needs, whatever the lamp measures on the glass
const LIFE_F = 240; // drawings the room stays out if nobody touches it: twenty seconds on the twelves

export function eggDark(ctx, { switches, lamp }) {
  let on = false, want = false;
  let drawn = 0; // drawings this piece has been given, ever
  let since = 0; // …and how many of them the room has been out for
  let armed = false; // the click-anywhere listener is on the window
  const box = [0, 0, 1, 1];
  let grow = 3;

  // ---- the lamp on the glass ---------------------------------------------------------------------
  function hitBox() {
    if (!lamp) return null;
    lamp.updateMatrixWorld(true);
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const xs = [], ys = [];
    const v = new THREE.Vector3();
    for (const x of [-LAMP.r, LAMP.r]) for (const y of [0, LAMP.top]) for (const z of [-LAMP.r, LAMP.r]) {
      v.set(x, y, z);
      lamp.localToWorld(v).project(ctx.camera);
      xs.push(((v.x + 1) / 2) * W);
      ys.push(((1 - v.y) / 2) * H);
    }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  // …grown about its centre to a thumb's 44 px. The lamp stands at the far end of the operator's
  // position with the doily under it and bare plaster over it, and the nearest other switch (the
  // globe on the left bookcase) is 0.4 m away, so the margin costs nothing.
  function tapBox() {
    const b = hitBox();
    if (!b) return null;
    const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
  }

  // ---- WHERE HIS FACE IS ON THE GLASS ------------------------------------------------------------
  // The two eye anchors and the mouth anchor, projected and boxed, then grown by 1.4 of the eye
  // separation across and 1.8 up: that is the head, with the ears of it. The DILATION is solved off
  // the same separation — 0.09 of it, which on the home plate at 1280x800 is about 3 px and is the
  // width of the sclera crescent between the pupil's disc and the ink round the eye. Both are
  // measured every drawing because he breathes and leans and the lens moves, and because a phone's
  // plate puts his head at a different size again.
  // If the puppet is not in the set at all — a page built with ?only=props — there is no face to
  // keep and the room simply goes entirely black, which is the honest answer and is not a throw.
  const _v = new THREE.Vector3();
  function solve() {
    const P = ctx.pieces?.pepe?.parts;
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    if (!P?.eyes?.length || !P.mouth || !W || !H) {
      box[0] = box[1] = 1;
      box[2] = box[3] = 0; // an empty box: nothing is kept
      return;
    }
    const pts = [];
    for (const o of [P.eyes[0], P.eyes[1], P.mouth]) {
      o.updateWorldMatrix(true, false);
      o.getWorldPosition(_v).project(ctx.camera);
      pts.push([((_v.x + 1) / 2) * W, ((1 - _v.y) / 2) * H]);
    }
    const sep = Math.max(6, Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]));
    const x0 = Math.min(...pts.map((p) => p[0])) - sep * 1.4;
    const x1 = Math.max(...pts.map((p) => p[0])) + sep * 1.4;
    const y0 = Math.min(...pts.map((p) => p[1])) - sep * 1.8;
    const y1 = Math.max(...pts.map((p) => p[1])) + sep * 1.8;
    // uv, y UP: the composite's own convention
    box[0] = Math.max(0, Math.min(1, x0 / W));
    box[2] = Math.max(0, Math.min(1, x1 / W));
    box[1] = Math.max(0, Math.min(1, 1 - y1 / H));
    box[3] = Math.max(0, Math.min(1, 1 - y0 / H));
    grow = Math.max(1.5, Math.min(14, sep * 0.09));
  }

  // ---- the switch --------------------------------------------------------------------------------
  // A CLICK ANYWHERE PUTS IT BACK. On `window`, at the capture phase, so it is the first listener in
  // the room to see the event and `stopPropagation` keeps it from reaching the arbiter on the glass
  // or the flow's own skip-ahead on the window: a visitor groping at a black room does not also
  // spin the globe. It is added on the first drawing after the room goes out, so the click that
  // started this is not the click that ends it.
  const anywhere = (ev) => {
    ev.stopPropagation();
    if (want) toggle();
  };
  function arm(yes) {
    if (yes === armed) return;
    armed = yes;
    if (yes) window.addEventListener('pointerdown', anywhere, true);
    else window.removeEventListener('pointerdown', anywhere, true);
  }

  function toggle(next = !want) {
    want = !!next;
    since = 0;
    if (!want) arm(false);
    ctx.pieces.sound?.play?.('switch');
    ctx.emit?.('props:dark', { on: want });
  }

  switches?.add?.({
    name: 'dark',
    object: () => lamp,
    tapBox,
    onDown: () => toggle(),
  });

  const api = {
    get on() {
      return on;
    },
    // how long the room has been out, in drawings and in the seconds those are worth at 12 fps
    get held() {
      return since / (ctx.clock.fps || 12);
    },
    get steps() {
      return since;
    },
    get drawn() {
      return drawn;
    },
    get box() {
      return [...box];
    },
    get grow() {
      return grow;
    },
    life: LIFE_F,
    hitBox,
    tapBox,
    toggle,
    // for the tools and for setState: the room out, or back, with no cue and nothing to wait for
    set(next = true) {
      want = on = !!next;
      since = 0;
      arm(false);
      solve();
      const I = ctx.pieces.ink;
      if (I?.dark) {
        I.dark.on = on;
        I.dark.box = [...box];
        I.dark.grow = grow;
      }
    },
    // `dark` is the room out for a still; every other name is a room with the lights on
    setState(name = 'default') {
      api.set(name === 'dark');
    },
    // Called from props.update, which only calls anything on a stepped frame — so the cut, the
    // twenty seconds and the mask's own arithmetic are all on the same 12 fps grid as the pendulum.
    update() {
      drawn++;
      // THE CUT LANDS HERE, a drawing after the click: `want` is what the visitor has asked for and
      // `on` is what is DRAWN, which is the cat's lamp's arrangement exactly.
      if (want !== on) {
        on = want;
        since = 0;
        arm(on);
      } else if (on) {
        since++;
        if (since >= LIFE_F) {
          want = on = false;
          since = 0;
          arm(false);
          ctx.emit?.('props:dark', { on: false });
        }
      }
      if (on) solve();
      const I = ctx.pieces.ink;
      if (!I?.dark) return;
      I.dark.on = on;
      if (on) {
        I.dark.box = [...box];
        I.dark.grow = grow;
      }
    },
  };

  // `?dark=1` holds the room out from the first drawing, for a still that is not a judging state
  if (ctx.params?.get?.('dark') === '1') api.set(true);
  return api;
}
