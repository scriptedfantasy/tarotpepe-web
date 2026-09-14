// AN EGG, inside props: THE PICTURE OF THIS ROOM. The right frame on the back wall holds a picture
// of the parlour as the home camera sees it — so the picture contains the frame, and the frame
// contains the picture, and it goes down as far as the paper can hold it.
//
// The user: "i should have a picture of tarotpepe's room and we should be able to scroll into it.
// basically have infinity scroll that always scrolls into the picture which is the room which is
// the picture which is the room etc etc".
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
// on the wall that lands is NOT this file's business. props.js lays the row (§THE ROW, there): it
// measures the clear plaster, sizes the picture and the gaps for the window in front of it, and
// calls setSlot() with the frame's finished outer size and the nail to hang it on. This file draws
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

export function eggDroste(ctx, { group, slot }) {
  const M = O.materials();
  const { z, hookY } = slot;
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

  // the cords go back to the same picture rail every other frame on this wall hangs from, and they
  // are rebuilt with the frame because the frame's top edge moves when the window changes shape
  let cordGroup = null;
  let sheet = null;
  const size = { w: 0, h: 0, frameW: 0, frameH: 0, aspect: 0 };

  function clear() {
    for (const c of [...g.children]) {
      g.remove(c);
      c.geometry?.dispose?.();
    }
    if (cordGroup) {
      group.remove(cordGroup);
      cordGroup.traverse((o) => o.geometry?.dispose?.());
      cordGroup = null;
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
    cordGroup = new THREE.Group();
    group.add(cordGroup);
    O.hangCords(cordGroup, x, y + frameH / 2, Math.max(0.03, frameW / 2 - 0.02), hookY, z - 0.003);
    size.w = w;
    size.h = h;
    size.frameW = frameW;
    size.frameH = frameH;
    size.aspect = w / h;
    return true;
  }
  rebuild();

  return {
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
    rebuild,
  };
}
