// ROUND 5: IT IS NOT ON THE WALL ANY MORE. The user: "we should keep the clock centered on the wall
// over pepe - the room image instead should be in a photo frame where the cat now stands." So this
// is a small framed photograph STANDING on the top of the right-hand low bookcase, on a strut,
// where the cat sat: 0.259 x 0.178 of frame instead of 0.805 x 0.519 of picture, and the cat has
// gone across the room into the tall case. NOTHING IN THE TRICK CHANGED. The sheet is still square
// to the back wall - it has to be, because camera.js's zoom walks up its own normal and assumes
// that normal is the room's +z - it is still cut to the window's aspect, ink.js still binds the
// same finished buffer to it, and the wrap at the top of the walk is still the same frame. What
// changed is that the walk now ends 0.250 m from a photograph on a bookcase instead of 0.886 m from
// a picture on plaster, and that it swings sideways to x 0.817 on the way, which is measured in
// tools/_droste-where.mjs and reported as what the visitor sees.
//
// AN EGG, inside props: THE PICTURE OF THIS ROOM. The frame in the middle of the back wall, behind
// his head, holds a picture of the parlour as the home camera sees it — so the picture contains the
// frame, and the frame contains the picture, and it goes down as far as the paper can hold it.
// (It was "the right frame" and it hung at x 0.510, sharing a band of plaster with the clock between
// a shutter leaf at x -0.49 and the door architrave at 1.03. The user had the window taken out and
// said where this goes: "place the room drawing in the middle behind pepe and the clock off to the
// left." Its nail is x 0 now and the clock hangs out at -0.705, on the plaster the window had.)
//
// The user: "i should have a picture of tarotpepe's room and we should be able to scroll into it.
// basically have infinity scroll that always scrolls into the picture which is the room which is
// the picture which is the room etc etc".
//
// AND THE SCROLL IS GONE; THE PICTURE IS A SWITCH. The user again, once the room had places in it to
// walk to: "now that we're making it a point and click game where we can move around the room, the
// scroll is suboptimal. So remove the scroll and just zoom into the room if the user clicks on the
// photo. Just click on the photo." So the photograph is registered with the room's own pointer
// arbiter like everything else a visitor can work — the cursor over it is a pointer and that is the
// whole affordance, exactly as it is for the radio, the cat and the grate — and a click on it calls
// camera.dive(): three seconds of walking into the picture at a constant rate, the wrap at the top,
// and the room standing where it was left. Not one number of the walk changed; only the hand on it.
// The frame the visitor clicks is the MOULDING and not the sheet, because the moulding is what a
// hand reaches for and because the sheet is 121 px across at the home plate on a laptop and 46 on a
// phone — under a thumb's 44 in one direction and barely over it in the other, so the box the
// arbiter is given is the whole frame, grown to 44 where it has to be.
//
// IT IS NOT A DRAWING OF THE ROOM. It is the room's own composed frame, fed back into itself: ink.js
// ping-pongs two render targets, the picture's map is the one that was finished last, and the one
// being written has this picture in it showing the one before. That is the whole of the recursion —
// nothing is painted, nothing is faked, and the nesting goes as deep as the pixels do (at the home
// plate on a 1280x800 window the sheet is 121 px across, the picture inside it 11 px, the third
// one, and the fourth a tenth of one — scroll in and the same four come back at every size).
//
// AND IT IS NOT RE-INKED. The sheet passes through the composite verbatim (ink-shaders.js, the
// `verbatim` branch): no contour of its own, no hatch, no tone from the lamp, no paper grain. It
// has all of those already — they were drawn when that frame was drawn. Drawing them again would
// print a second set of lines a hair beside the first, and at the top of a zoom, where the sheet
// fills the window, the seam between the drawing and the drawing it is a picture of would be the
// one thing in the room that gave the trick away. The frame's own moulding is geometry and is inked
// like any other frame's.
//
// WHY THE FRAME CHANGES SHAPE WITH THE WINDOW. The zoom works because at the top of it the picture
// EXACTLY fills the viewport, and a rectangle can only fill a viewport if it has the viewport's
// aspect. So the sheet is cut to the drawing buffer's w/h and the moulding put round it — and where
// on the wall that lands is NOT this file's business. props.js lays the row (§THE ROW, there): the
// nail is fixed at x 0 and what it still solves for the window in front of it is this picture's
// SIZE — and, from the size, where the clock goes. It calls setSlot() with the frame's finished
// outer size and the nail to hang it on. This file draws
// the moulding, the sheet and the cords, and publishes where the sheet ended up.
//
// NOTHING ANNOUNCES IT. No label, no tag, no hover, no cursor: it is not registered with the switch
// arbiter at all, because there is nothing to click. A visitor finds it by scrolling, or does not.
import * as THREE from 'three';
import * as O from './props-objects.js';
import { inkMaterial } from '../core/strokes.js';

// the same rim and the same depth every frame on this wall has been built with; if O.pictureFrame's
// numbers move, these move with them
const RIM = 0.022;
const DEPTH = 0.028;
// how far in front of the moulding's mid-plane the sheet sits, in metres: the depth every sheet in
// a frame on this wall has sat at in its rebate.
const SHEET_Z = DEPTH / 2 - 0.008;

export function eggDroste(ctx, { group, slot, switches = null }) {
  const M = O.materials();
  // `z` and `stand` are taken ONCE and are not re-laid: `setSlot` takes x, y, w and h, which are the
  // window's business, and the depth of a thing standing on a shelf is not. `stand` is the height of
  // the board it stands on, or 0 for a frame on a wall — it is what the strut is drawn down to.
  const { z, stand = 0 } = slot;
  // the nail and the frame's OUTER size, in metres. props.js owns all four and re-lays them on
  // every resize; nothing in this file decides any of them.
  let x = slot.x, y = slot.y, frameW = slot.w, frameH = slot.h;

  // THE SHEET'S MATERIAL, and it is the only one in the set flagged `verbatim`. White, because the
  // map is a finished frame and a material colour would tint it; lineWeight 0, because the sheet's
  // own silhouette is already drawn by the rebate it sits in and a second line round it would be a
  // line inside a line; hatch 0, because nothing about the lamp reaches a picture that was lit when
  // it was drawn. ink.js swaps `map` for whichever of its two buffers was finished last.
  const mat = inkMaterial({ color: '#ffffff', hatch: 0, lineWeight: 0 });
  mat.userData.ink.verbatim = true;

  const g = new THREE.Group();
  g.name = 'droste-frame';
  g.position.set(x, y, z);
  group.add(g);

  // NO CORDS. Every other frame on this wall goes back to the picture rail on a pair of them, and
  // this one did too until the user saw the corner: "lets remove the angular hanging line." At
  // 0.80 m wide the frame's top corners are a long way out from the rail's hook, so the two cords
  // came down as a wide V — a pair of hard diagonals across bare plaster, the longest straight
  // lines anywhere on that wall and the only ones not drawing anything. The clock keeps its cords,
  // which are short and hang straight; this picture is on a nail nobody can see.
  let sheet = null;
  const size = { w: 0, h: 0, frameW: 0, frameH: 0, aspect: 0 };

  function clear() {
    for (const c of [...g.children]) {
      g.remove(c);
      c.geometry?.dispose?.();
    }
  }

  // Build the moulding round the sheet. The sheet is whatever is left of the frame once the rim is
  // taken off both ways; props.js has already cut the frame to the window's aspect.
  function rebuild() {
    const w = frameW - RIM * 2, h = frameH - RIM * 2;
    if (!(w > 0.01 && h > 0.01)) return false;
    if (Math.abs(w - size.w) < 1e-6 && Math.abs(h - size.h) < 1e-6 && Math.abs(x - g.position.x) < 1e-6 && Math.abs(y - g.position.y) < 1e-6) return false;
    clear();
    g.position.set(x, y, z);
    const fm = M.frame;
    const top = O.box(frameW, RIM, DEPTH, fm);
    top.position.set(0, frameH / 2 - RIM / 2, 0);
    const bot = O.box(frameW, RIM, DEPTH, fm);
    bot.position.set(0, -frameH / 2 + RIM / 2, 0);
    const left = O.box(RIM, frameH - RIM * 2, DEPTH, fm);
    left.position.set(-frameW / 2 + RIM / 2, 0, 0);
    const right = O.box(RIM, frameH - RIM * 2, DEPTH, fm);
    right.position.set(frameW / 2 - RIM / 2, 0, 0);
    g.add(top, bot, left, right);
    for (const [cx, cy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const c = O.box(RIM * 1.7, RIM * 1.7, DEPTH * 1.2, fm);
      c.position.set(cx * (frameW / 2 - RIM / 2), cy * (frameH / 2 - RIM / 2), 0);
      g.add(c);
    }
    sheet = O.plane(w, h, mat);
    // no shadow either way: a picture that was lit when it was drawn does not take the lamp again,
    // and the lit pass is the one thing verbatim cannot switch off from inside the shader
    sheet.receiveShadow = false;
    sheet.castShadow = false;
    sheet.position.z = SHEET_Z;
    g.add(sheet);
    // ---- THE STRUT, which is what makes this a photograph and not a picture -------------------
    // The user: "the room image instead should be in a photo frame where the cat now stands." A
    // frame on a bookcase top is not hung, it is PROPPED, and the two lines that say so are the leg
    // raked back from the bottom rail and the shadow line where it meets the board. Without them
    // the thing reads as a rectangle floating over a shelf, which is the one thing a picture of this
    // room must not look like — it is already a rectangle doing something odd.
    //
    // It is drawn BEHIND the sheet and below its own bottom rail, so no part of it is inside the
    // rectangle the camera's zoom walks into: the leg's top is at -frameH/2 + RIM and it rakes back
    // to the board. At the frame's own 0.178 m it is a 0.10 m leg at about 25 degrees, which is what
    // a photo frame's strut is. It takes the room's ink like any other joinery and casts nothing:
    // a cast shadow off a 6 mm batten is a smudge at this size.
    if (stand > 0) {
      const foot = stand - (g.position.y - frameH / 2); // the board, in the frame's own y
      const leg = O.box(RIM * 0.5, Math.abs(foot) + RIM, DEPTH * 0.35, M.frame);
      leg.position.set(0, -frameH / 2 + RIM * 0.5 + foot / 2, -DEPTH * 0.9);
      leg.rotation.x = -0.42;
      leg.castShadow = false;
      g.add(leg);
      // …and the bottom rail is thickened at the back into a foot, which is the line that puts the
      // whole thing ON the board rather than a millimetre over it
      const heel = O.box(frameW * 0.55, RIM * 0.6, DEPTH * 0.5, M.frame);
      heel.position.set(0, -frameH / 2 + RIM * 0.3, -DEPTH * 0.45);
      heel.castShadow = false;
      g.add(heel);
    }
    size.w = w;
    size.h = h;
    size.frameW = frameW;
    size.frameH = frameH;
    size.aspect = w / h;
    return true;
  }
  rebuild();

  // ---- THE SWITCH, and it is the moulding ------------------------------------------------------
  // `hitBox` below is the frame's four corners projected from the live camera; the thumb's box is
  // that grown about its own centre to 44 px, which it needs on every window this film ships at.
  // The nearest other switch on this wall is the CLOCK (the vortex's), and props.js lays the row out
  // with a measured gap between this frame's corner blocks and that dial, so the two never meet.
  const MIN_TAP = 44;
  let last = null;
  function tapBox() {
    const b = api.hitBox();
    if (!b) return null;
    const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
  }

  const api = {
    // WHERE THE ROW PUTS IT. props.js calls this at build and on every resize with the nail and the
    // frame's outer size it has just solved; nothing is rebuilt unless one of the four moved.
    setSlot(next) {
      x = next.x ?? x;
      y = next.y ?? y;
      frameW = next.w ?? frameW;
      frameH = next.h ?? frameH;
      return rebuild();
    },
    // what ink.js binds its finished buffer to
    material: mat,
    get mesh() {
      return sheet;
    },
    // WHERE THE SHEET IS, in world metres, which is everything the camera's zoom has to solve from:
    // the centre of the picture, its half-extents, and the plane it lies in. The back wall is square
    // to the home camera, so the picture's normal is the room's +z and the end of a zoom is simply
    // the camera standing on that normal at the distance where halfH fills the vertical field.
    get geometry() {
      return {
        centre: [x, y, z + SHEET_Z],
        halfW: size.w / 2,
        halfH: size.h / 2,
        w: size.w,
        h: size.h,
        // the sheet's own shape, which on an upright window is NOT the window's: ink.js draws the
        // plate at this aspect and camera.js's end pose lets its width overflow
        aspect: size.h > 0 ? size.w / size.h : 1,
      };
    },
    // the whole frame, for a tool that wants to crop it off the glass
    get frame() {
      return { x, y, z, w: size.frameW, h: size.frameH, rim: RIM, depth: DEPTH, aspect: size.aspect };
    },
    // the gap either side of it, for a tool that wants to check the row is even
    get nail() {
      return [x, y, z];
    },
    // the moulding's box on the glass, projected from the LIVE camera — a proof crops this
    hitBox() {
      if (!sheet) return null;
      const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
      const xs = [], ys = [];
      const v = new THREE.Vector3();
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          v.set((sx * size.frameW) / 2, (sy * size.frameH) / 2, 0);
          g.localToWorld(v).project(ctx.camera);
          xs.push(((v.x + 1) / 2) * W);
          ys.push(((1 - v.y) / 2) * H);
        }
      }
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    },
    // …and the box a thumb is actually given, for the arbiter and for a proof
    tapBox,
    // THE CLICK. `camera.dive()` answers with what it did — 'diving', 'pan' (the room was turned and
    // the click squared it up instead) or 'refused' — and this file passes that back and acts on
    // none of it. `dive` is the last thing it said, for a proof that wants to ask without clicking.
    get dive() {
      return last;
    },
    click() {
      last = ctx.pieces?.camera?.dive?.() ?? 'no camera';
      return last;
    },
    rebuild,
  };
  switches?.add?.({
    name: 'droste',
    object: () => g,
    tapBox,
    // A DIVE IS ONLY EVER ASKED FOR FROM THE CHAIR. The camera piece refuses it from anywhere else
    // (camera.js, `zoomAllowed`), and the switch stands down with it rather than answering a click
    // it is going to throw away — except while the room is PANNED, where the click has work to do:
    // it squares the room up so the picture can be clicked again.
    enabled: () => !!(ctx.pieces?.camera?.zoomable || ctx.pieces?.camera?.pan),
    onDown: () => api.click(),
  });
  return api;
}
