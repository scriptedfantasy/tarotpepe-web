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
// plate on a 1280x800 window the sheet is 83 px across, the picture inside it 5 px, and the third
// is a third of a pixel and is simply grey — scroll in and the same three come back at every size).
//
// AND IT IS NOT RE-INKED. The sheet passes through the composite verbatim (ink-shaders.js, the
// `verbatim` branch): no contour of its own, no hatch, no tone from the lamp, no paper grain. It
// has all of those already — they were drawn when that frame was drawn. Drawing them again would
// print a second set of lines a hair beside the first, and at the top of a zoom, where the sheet
// fills the window, the seam between the drawing and the drawing it is a picture of would be the
// one thing in the room that gave the trick away. The frame's own moulding is geometry and is inked
// exactly as the Nakamoto card's moulding is.
//
// WHY THE FRAME CHANGES SHAPE WITH THE WINDOW. The zoom works because at the top of it the picture
// EXACTLY fills the viewport, and a rectangle can only fill a viewport if it has the viewport's
// aspect. So the sheet is cut to the drawing buffer's w/h and the moulding is put round it, bounded
// by the box props.js hangs it in: landscape windows get a wide, short picture on the nail, a phone
// gets a tall, narrow one. That box is 0.5 x 0.46 m, measured off the wall rather than chosen —
// props.js says at length which object decides each of its four edges, and tools/_droste-where.mjs
// prints every world box on that stretch of plaster. With a 0.022 m rim:
//   1280x800   sheet 0.456 x 0.285  frame 0.500 x 0.329   (83 x 52 px of sheet at the home plate)
//   1600x900   sheet 0.456 x 0.257  frame 0.500 x 0.301
//   390x844    sheet 0.192 x 0.416  frame 0.236 x 0.460
// The nail is at x +0.51, y 2.04, and the frame never grows past that box, so the row against the
// clock keeps the 67 mm of plaster either side of it that it has always had.
//
// NOTHING ANNOUNCES IT. No label, no tag, no hover, no cursor: it is not registered with the switch
// arbiter at all, because there is nothing to click. A visitor finds it by scrolling, or does not.
import * as THREE from 'three';
import * as O from './props-objects.js';
import { inkMaterial } from '../core/strokes.js';

// the same rim and the same depth every other frame in this row is built with (egg-nakamoto.js
// says the same thing about its own; if O.pictureFrame's numbers move, these move with them)
const RIM = 0.022;
const DEPTH = 0.028;
// how far in front of the moulding's mid-plane the sheet sits, in metres. The Nakamoto card's
// number, so the two sheets in the row stand at the same depth in their rebates.
const SHEET_Z = DEPTH / 2 - 0.008;

export function eggDroste(ctx, { group, slot }) {
  const M = O.materials();
  const { x, y, w: MAXW, h: MAXH, z, hookY } = slot;

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

  const drawingAspect = () => {
    const v = new THREE.Vector2();
    ctx.renderer?.getDrawingBufferSize?.(v);
    if (v.x > 0 && v.y > 0) return v.x / v.y;
    const w = ctx.size?.w || window.innerWidth || 1600, h = ctx.size?.h || window.innerHeight || 900;
    return w / h;
  };

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

  // Build the moulding round a sheet of the window's own shape. The sheet is as large as the
  // 0.4 x 0.46 box allows once the rim is taken off both ways, so one of the two dimensions is
  // always at its stop and the other follows the aspect.
  function rebuild() {
    const A = Math.max(0.05, drawingAspect());
    let w = MAXW - RIM * 2;
    let h = w / A;
    if (h > MAXH - RIM * 2) {
      h = MAXH - RIM * 2;
      w = h * A;
    }
    if (Math.abs(w - size.w) < 1e-6 && Math.abs(h - size.h) < 1e-6) return false;
    clear();
    const frameW = w + RIM * 2, frameH = h + RIM * 2;
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
    size.aspect = A;
    return true;
  }
  rebuild();
  ctx.on?.('resize', () => rebuild());

  return {
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
