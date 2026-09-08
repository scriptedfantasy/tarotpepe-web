// PIECE: help — the notice under the shop's own sign.
//
// The user: "we need instructions somewhere - i think the tarot sign over pepe is the perfect
// place. make it clickable so it reveals how the game works and offers a leave button so the
// player can walk out of the door again."
//
// So there is no help button and no tooltip anywhere in this film. There is a board on the wall
// over Pepe's head — props.js `signBoard`, TAROT — READINGS — 3 CARDS — and a card the size of one
// of his own tarot cards laid crooked over its right end, with a question mark on it, the way a
// shop tacks a card over its own sign. Touch the board and the shop hands you its printed notice.
//
// HOW IT SAYS IT MAY BE TOUCHED, in the world's own language and nobody else's:
//   · THE CARD. A hand-cut «?» at a 23 px cap on a phone in the resting shot and 31 in the close
//     one — twice the cap the board's own first line gets there, and the only question mark in the
//     room.
//   · THE NOD. Until the notice has been read once, the board tips forward on its hooks and comes
//     back, four drawings on twos, every nine seconds. It is the one thing in the parlour that
//     moves AT the visitor, and it is how somebody who was told nothing finds it — a phone has no
//     hover and no cursor, so an affordance that waits to be pointed at is no affordance at all.
//   · THE SHIVER. Under a pointer the board tips and holds there, on twos, and the card lifts with
//     it. (The cursor turns, too — reveal-fan.js already does that for the spread.)
// Nothing glows, nothing outlines itself, nothing grows a badge.
//
// WHAT IT REVEALS is a piece of paper: help-bill.js cuts a handbill, hand-lettered throughout in
// the sign hand, and it is laid over the frame in four stepped drawings and taken away in three.
// It is a DOM canvas rather than an object in the room because the notice must be READ — the rule
// of the world is a 13 px cap on a 390 px phone, and a sheet hung on the back wall would arrive at
// four. dialogue.js puts its placard over the frame for the same reason.
//
// LEAVING is not this piece's business. The second control on the notice emits `help:leave` and
// stops; the entrance piece owns the door.
//
// THE NOTICE HAS TWO FACES. «KEEP THIS READING» used to hand a PDF over from behind the notice; the
// user: "rather than going direct to pdf download, can we show the reading in the ? card and have a
// download button there?" So the card turns over and the reading is on the other side of it —
// help-read.js, the same page plates the PDF is written from, on the same paper with the same
// border and the same boil, scrolling inside the card and nowhere else. «DOWNLOAD» at its foot is
// the tap that used to happen at once (share sheet on a phone, a file on a laptop, inside the
// gesture either way) and «BACK» puts the notice up as it was.
//
// API: open() · close() · toggle() · showing · reading · hitBox() (the board's box on screen, in px)
//      states: closed · hover (the board under a pointer) · open
import * as THREE from 'three';
import { PAPER, drawTexture, inkMaterial, inkLine } from '../core/strokes.js';
import { signCaps } from './titles-sign.js';
import { cutBill } from './help-bill.js';
import { makeReader } from './help-read.js';
import * as keep from './help-keep.js';

export const meta = {
  name: 'help',
  judge: { shot: 'home', states: ['closed', 'hover', 'open'] },
  files: ['src/pieces/help.js', 'src/pieces/help-bill.js', 'src/pieces/help-keep.js', 'src/pieces/help-read.js'],
};

const HOLD = 2 / 12; // every drawing is on twos
// The notice comes up off the bottom of the frame and settles: four drawings, then it is there.
// It leaves in three, which is how a hand takes a thing away — quicker than it put it down.
const UP = [
  { dy: 0.72, rot: -0.062, s: 0.965 },
  { dy: 0.3, rot: -0.03, s: 0.985 },
  { dy: 0.075, rot: 0.009, s: 1.004 },
  { dy: 0, rot: 0, s: 1 },
];
const DOWN = [
  { dy: 0.06, rot: 0.012, s: 1.002 },
  { dy: 0.4, rot: -0.036, s: 0.98 },
  { dy: 1.05, rot: -0.075, s: 0.95 },
];
// the board on its hooks: at rest, under a pointer, and the nod it makes while nobody has read it
const TIP_HOVER = 0.07;
const NOD = [0.016, 0.058, 0.04, 0.012];
const NOD_EVERY = 9; // seconds
// …and it asks four times. A visitor who has not looked up at the board by then is not going to,
// and a sign that keeps twitching all evening is a sign nobody can stop looking at.
const NOD_TIMES = 4;

export async function build(ctx) {
  const sign = ctx.pieces.props?.sign ?? null;
  const cue = (n) => ctx.pieces.sound?.play?.(n);

  // ---------------------------------------------------------------------------------------------
  // 1. THE CARD PINNED TO THE BOARD
  // ---------------------------------------------------------------------------------------------
  // WHERE IT GOES was measured, not guessed. Everything under the board is spoken for (the clock's
  // top edge is 2 cm below it, the two pictures either side of that), and nothing may hang off its
  // ends either: in the `pepe` shot the board spans 21 → 368 px of a 390 px phone, so a card
  // outboard of it is cut in half by the frame. So it goes ON the board — and the board has room,
  // because its two lines measure only 1.11 m and 1.00 m on a 1.32 m board. A card from x 0.535 to
  // 0.665 takes the last letter of TAROT — READINGS — 3 CARDS and none of the second line at all,
  // and its outer edge rides 5 mm past the board, which is what stops it reading as more signage.
  //
  // WHAT IT IS: a card the size of one of his own — 0.13 x 0.2275, the deck's exact measure from
  // layout.js — slipped over the end of the sign with a question mark on it. In a shop that reads
  // cards, the thing you may pick up is a card.
  const CARD = { w: 0.13, h: 0.2275, x: 0.6, tilt: -0.075 };
  let tag = null;
  if (sign?.pivot) {
    const tex = drawTexture(260, 455, drawQuestionCard, { seed: 5 });
    tag = new THREE.Mesh(
      new THREE.BoxGeometry(CARD.w, CARD.h, 0.006),
      inkMaterial({ map: tex, hatch: 0.1, lineWeight: 1.15 }),
    );
    tag.name = 'help-card';
    tag.castShadow = true;
    tag.userData.w = CARD.w;
    tag.userData.h = CARD.h;
    // the board hangs below its hook line (props.js): its middle is 0.165 m down
    tag.position.set(CARD.x, -0.165, 0.016);
    tag.rotation.z = CARD.tilt;
    sign.pivot.add(tag);
  }

  // ---------------------------------------------------------------------------------------------
  // 2. THE NOTICE, OVER THE FRAME
  // ---------------------------------------------------------------------------------------------
  const style = document.createElement('style');
  style.textContent = `
    #help { z-index: 2; display: none; pointer-events: none; }
    #help.up { display: block; pointer-events: auto; cursor: default; }
    /* on its way back down it is still drawn, but the room is the visitor's again */
    #help.going { pointer-events: none; }
    /* the notice's own plate, and only it: the reading's card hangs its own canvases inside #help */
    #help > canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    /* while the card is turned over, the notice is not drawn at all */
    #help.reading > canvas { display: none; }
  `;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'help';
  const canvas = document.createElement('canvas');
  root.appendChild(canvas);
  ctx.dom.overlay.appendChild(root);
  const g = canvas.getContext('2d');

  // ---------------------------------------------------------------------------------------------
  // 2b. THE OTHER FACE OF THE CARD — the reading (help-read.js), mounted inside the notice
  // ---------------------------------------------------------------------------------------------
  const reader = makeReader({
    onControl(key, phase) {
      gesture();
      if (key === 'back') {
        if (phase === 'click') toNotice();
        return;
      }
      // «DOWNLOAD». A thumb coming down warms the sheet if it is somehow not made yet; the click
      // itself hands it over with nothing awaited in front of it, because a share sheet will not
      // open for a page that asks a second after the tap. This is the tap «KEEP THIS READING» used
      // to be, moved and otherwise untouched.
      if (phase === 'down') {
        if (keep.hasReading(ctx)) keep.prepare(ctx).catch(() => {});
        return;
      }
      keep.hand(ctx).catch((e) => console.warn('[help] keep', e));
      ctx.emit?.('help:keep');
    },
  });
  root.appendChild(reader.el);

  let bill = null; // the cut notice: sheet box, control boxes, two plates
  let cutAt = '';
  // «KEEP THIS READING» has nothing to keep until something has been said or drawn, and until then
  // it is struck set back and does nothing. The state is part of the cut, so the notice is re-set
  // when it changes rather than repainted over.
  const inactive = () => (keep.hasReading(ctx) ? [] : ['keep']);
  function cut() {
    const w = ctx.size?.w || window.innerWidth, h = ctx.size?.h || window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const off = inactive();
    const key = `${Math.round(w)}x${Math.round(h)}@${dpr}/${off.join('+')}`;
    if (key === cutAt && bill) return bill;
    cutAt = key;
    bill = cutBill(w, h, dpr, { inactive: off });
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    painted = '';
    return bill;
  }

  let painted = '';
  function paint(pose, parity) {
    const b = cut();
    const w = ctx.size?.w || window.innerWidth, h = ctx.size?.h || window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const key = `${pose.dy.toFixed(3)}|${pose.rot.toFixed(4)}|${pose.s.toFixed(3)}|${parity}|${cutAt}`;
    if (key === painted) return;
    painted = key;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const cx = b.sheet.x + b.sheet.w / 2;
    const cy = b.sheet.y + b.sheet.h / 2 + pose.dy * (b.sheet.h + h * 0.22);
    g.save();
    g.translate(cx, cy);
    g.rotate(pose.rot);
    g.scale(pose.s, pose.s);
    const plate = b.plates[parity ? 1 : 0];
    g.drawImage(plate, -b.sheet.w / 2 - b.bleed, -b.sheet.h / 2 - b.bleed, b.sheet.w + 2 * b.bleed, b.sheet.h + 2 * b.bleed);
    g.restore();
  }

  // ---------------------------------------------------------------------------------------------
  // 3. THE STATE OF THE THING
  // ---------------------------------------------------------------------------------------------
  let showing = false;
  let mode = 'notice'; // which face of the card is up: 'notice' | 'reading'
  let anim = null; // { steps, frame0, then }
  let pose = DOWN[DOWN.length - 1];
  let hover = false;
  let read = false; // the notice has been opened once: the board stops nodding
  let nodAt = -1e9, nods = 0;
  let tip = 0, tipTarget = 0;

  function poseNow(ctx2) {
    if (!anim) return pose;
    const k = Math.floor((ctx2.clock.frame - anim.frame0) / 2);
    if (k >= anim.steps.length) {
      pose = anim.steps[anim.steps.length - 1];
      const done = anim.then;
      anim = null;
      done?.();
      return pose;
    }
    return anim.steps[Math.max(0, k)];
  }

  function open() {
    if (showing) return;
    showing = true;
    read = true;
    cut(); // the notice is set before it is shown, not on the first frame that shows it
    root.classList.add('up');
    anim = { steps: UP, frame0: ctx.clock.frame, then: null };
    pose = UP[0];
    setHover(false);
    cue('flip');
    // …and the sheet is cut before it is asked for. A share sheet will not open for a page that
    // asks a second after the tap, so the PDF is built while the notice is coming up and the tap
    // finds it already made. See help-keep.js, HANDING IT OVER.
    if (keep.hasReading(ctx)) keep.prepare(ctx).catch((e) => console.warn('[help] keep', e));
    ctx.emit?.('help:open');
  }
  // ---- the card turns over, and back ------------------------------------------------------------
  // Nothing here animates. The notice comes UP off the bottom of the frame because a hand is laying
  // it down in front of you; this is the same piece of paper turned over, and a turn in this film is
  // a cut, not a tween.
  function dropReading() {
    if (mode !== 'reading') return false;
    mode = 'notice';
    root.classList.remove('reading');
    painted = ''; // the notice's plate has not been blitted since the card turned over
    return true;
  }
  function toReading() {
    if (!showing || mode === 'reading') return;
    mode = 'reading';
    root.classList.add('reading');
    layoutReader();
    reader.top();
    // the pages are the ones already rastered for the PDF; if the notice's own opening has not
    // finished making them, they arrive a moment later and the card fills in
    const made = keep.pagesNow(ctx);
    if (made) reader.pages(made);
    else
      keep
        .prepare(ctx)
        .then((v) => {
          if (mode !== 'reading') return;
          reader.pages(v.pages);
          reader.top();
        })
        .catch((e) => console.warn('[help] keep', e));
    cue('flip');
    ctx.emit?.('help:reading');
  }
  function toNotice() {
    if (!dropReading()) return;
    if (!anim) paint(pose, Math.floor(ctx.clock.frame / 2) % 2);
    cue('flip');
    ctx.emit?.('help:notice');
  }
  function layoutReader() {
    const w = ctx.size?.w || window.innerWidth, h = ctx.size?.h || window.innerHeight;
    reader.place(w, h, Math.min(2, window.devicePixelRatio || 1));
  }

  function close() {
    if (!showing) return;
    dropReading();
    showing = false;
    root.classList.add('going');
    anim = { steps: DOWN, frame0: ctx.clock.frame, then: () => root.classList.remove('up', 'going') };
    pose = DOWN[0];
    cue('settle');
    ctx.emit?.('help:close');
  }
  function jump(open_) {
    anim = null;
    dropReading();
    showing = open_;
    read = read || open_;
    pose = open_ ? UP[UP.length - 1] : DOWN[DOWN.length - 1];
    root.classList.toggle('up', open_);
    root.classList.remove('going');
  }

  // ---------------------------------------------------------------------------------------------
  // 4. THE POINTER
  // ---------------------------------------------------------------------------------------------
  const glass = ctx.renderer?.domElement ?? null;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const targets = [];
  if (sign?.mesh) targets.push(sign.mesh);
  if (tag) targets.push(tag);

  function onBoard(ev) {
    if (!glass || !targets.length) return false;
    const r = glass.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, ctx.camera);
    return ray.intersectObjects(targets, false).length > 0;
  }
  // The cursor is shared with reveal-fan.js, which turns it over the spread. Only ever put back
  // what this piece itself put there, or a pointer wandering off the board would clear the one the
  // fan had just set over a card.
  let cursorMine = false;
  function setHover(on) {
    if (hover === on) return;
    hover = on;
    tipTarget = on ? TIP_HOVER : 0;
    if (!glass || showing) return;
    if (on) {
      glass.style.cursor = 'pointer';
      cursorMine = true;
    } else if (cursorMine) {
      glass.style.cursor = '';
      cursorMine = false;
    }
  }
  glass?.addEventListener('pointermove', (ev) => {
    if (showing || ev.pointerType === 'touch') return;
    setHover(onBoard(ev));
  });
  glass?.addEventListener('pointerleave', (ev) => {
    if (ev.pointerType !== 'touch') setHover(false);
  });
  // A touch on the board, or a click on it, opens the notice — and the pointer stops there.
  // flow.js reads any pointerdown outside #dialogue as the visitor skipping ahead through Pepe's
  // line, which a visitor reaching for the sign did not mean; so the event is stopped, and sound's
  // "first gesture" unlock, which lives on the same window, is called by hand instead of lost.
  const gesture = () => ctx.pieces.sound?.start?.();
  glass?.addEventListener('pointerdown', (ev) => {
    if (showing) return;
    if (onBoard(ev)) {
      gesture();
      ev.stopPropagation();
      open();
    }
  });

  // the notice's own controls, and the paper around them
  root.addEventListener('pointerdown', (e) => {
    gesture();
    e.stopPropagation();
    if (mode === 'reading') return; // the card's own controls answer for themselves
    // a thumb coming down on «KEEP THIS READING» starts the sheet if the notice's own opening did
    // not — the reading it turns to then has its pages already drawn
    try {
      if (showing && bill && hit(e) === 'keep' && keep.hasReading(ctx)) keep.prepare(ctx).catch(() => {});
    } catch {}
  });
  // A pointer on the sheet, put back where it would be with the sheet at rest — the notice may
  // still be coming up when it is clicked (and in the judging browser, which renders at under a
  // frame a second, it always is), so the controls are hit through the pose, not around it.
  function toRest(px, py, p) {
    const b = bill;
    const h = ctx.size?.h || window.innerHeight;
    const cx = b.sheet.x + b.sheet.w / 2;
    const cy = b.sheet.y + b.sheet.h / 2 + p.dy * (b.sheet.h + h * 0.22);
    const dx = (px - cx) / p.s, dy = (py - cy) / p.s;
    const c = Math.cos(-p.rot), s = Math.sin(-p.rot);
    return { x: cx + dx * c - dy * s, y: b.sheet.y + b.sheet.h / 2 + dx * s + dy * c };
  }
  // which control an event lands on, with the sheet put back at rest — or null
  function hit(ev) {
    if (!bill) return null;
    const r = root.getBoundingClientRect();
    const p = toRest(ev.clientX - r.left, ev.clientY - r.top, pose);
    for (const c of bill.controls) {
      if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) return c.key;
    }
    return null;
  }
  root.addEventListener('click', (ev) => {
    if (!showing) return;
    // THE READING'S FACE. Its two controls are the card's own and have already answered (they stop
    // the click); everything left is either the paper of the reading, which does nothing, or the
    // room around it, which turns the card back over — the same manners the notice keeps.
    if (mode === 'reading') {
      const L = reader.layout;
      if (!L) return;
      const r = root.getBoundingClientRect();
      const x = ev.clientX - r.left, y = ev.clientY - r.top;
      if (x < L.card.x || x > L.card.x + L.card.w || y < L.card.y || y > L.card.y + L.card.h) toNotice();
      return;
    }
    const b = bill;
    if (!b) return;
    if (anim) poseNow(ctx); // it may already be over; let it end
    if (anim) {
      // still on its way up. The click is spent bringing it the rest of the way — a notice caught
      // in mid-air must not read a control, and must certainly not read the click as one landing
      // off the paper and put itself straight back down.
      anim = null;
      pose = UP[UP.length - 1];
      painted = '';
      return;
    }
    const r = root.getBoundingClientRect();
    const p = toRest(ev.clientX - r.left, ev.clientY - r.top, pose);
    const x = p.x, y = p.y;
    for (const c of b.controls) {
      if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
        // A control that is struck set back is not a control yet: it eats the click and does
        // nothing, and the notice stays exactly where it is.
        if (c.inactive) return;
        // THE SHEET. It is not handed over here any more: the card turns over and the reading is
        // on the other side of it, with «DOWNLOAD» at its foot (help-read.js). The pages it shows
        // are the ones prepare() started making when the notice came up.
        if (c.key === 'keep') {
          toReading();
          return;
        }
        close();
        // The door is another builder's: this piece says the visitor is going and stops there.
        if (c.key === 'leave') ctx.emit?.('help:leave');
        return;
      }
    }
    // the signature at the foot. It leads out of the film, so it opens a second window and leaves
    // the notice standing: a visitor who touches it has not said they are done reading.
    const cr = b.credit;
    if (cr && x >= cr.x && x <= cr.x + cr.w && y >= cr.y && y <= cr.y + cr.h) {
      window.open(cr.href, '_blank', 'noopener');
      ctx.emit?.('help:credit');
      return;
    }
    // a click on the paper does nothing; a click off it puts the notice down
    if (x < b.sheet.x || x > b.sheet.x + b.sheet.w || y < b.sheet.y || y > b.sheet.y + b.sheet.h) close();
  });
  // Escape puts the notice down, and means only that: flow.js takes Escape as the visitor skipping
  // Pepe's line, and this piece is built before it, so stopping it here is enough.
  window.addEventListener('keydown', (ev) => {
    const tag_ = ev.target?.tagName;
    if (tag_ === 'INPUT' || tag_ === 'TEXTAREA') return; // he is being written to
    if (ev.key === 'Escape' && showing) {
      ev.stopImmediatePropagation();
      // one step back at a time: the reading gives the notice back, the notice gives the room back
      mode === 'reading' ? toNotice() : close();
    } else if (ev.key === '?' && !ev.metaKey && !ev.ctrlKey && !ev.altKey) {
      ev.stopImmediatePropagation();
      showing ? close() : open();
    }
  });
  ctx.on?.('resize', () => {
    cutAt = '';
    if (showing || anim) cut();
    if (mode === 'reading') layoutReader(); // the card is re-cut and the pages re-scaled to it
  });

  // ---------------------------------------------------------------------------------------------
  // ?view=keep — page one of the sheet, in the DOM, so the views checker can look at it. It is not
  // a piece (main.js's list is the contract and this is not on it): it is what the notice DOES, so
  // it is drawn here, and it is awaited so the frame is up before the page says it is ready. A dev
  // view is the one place the 1500 ms build budget is not the point — nothing ships this path.
  if (ctx.view === 'keep') await keep.mountView(ctx);

  return {
    tag,
    // the sheet the visitor takes away (help-keep.js), for the notice's own control and for tools
    keep: keep.api,
    get showing() {
      return showing;
    },
    open,
    close,
    toggle: () => (showing ? close() : open()),
    // the reading, on the other side of the card
    get reading() {
      return mode === 'reading';
    },
    showReading: toReading,
    hideReading: toNotice,
    // one of the reading's own controls as a box on screen in px («DOWNLOAD», «BACK»), or null
    // while it is scrolled out of the card
    readControlBox: (k) => reader.box(k),
    // the element that scrolls, its measure, and whether there is anything to scroll — a tool
    // drives the real roll of paper rather than a number this piece keeps
    readRoll: () => reader.roll,
    readLayout: () => reader.layout,
    get readScrollable() {
      return reader.scrollable;
    },
    // one of the notice's own controls, as a box on screen in px — what a thumb has to hit, and
    // how a tool finds the control it means to press
    controlBox(key) {
      const b = cut();
      const c = b.controls.find((x) => x.key === key);
      return c ? { x: c.x, y: c.y, w: c.w, h: c.h, inactive: c.inactive } : null;
    },
    // the board's box on screen, in px — what a thumb has to hit
    hitBox() {
      if (!sign?.mesh) return null;
      sign.mesh.updateMatrixWorld(true);
      const w = ctx.size?.w || window.innerWidth, h = ctx.size?.h || window.innerHeight;
      const xs = [], ys = [];
      const v = new THREE.Vector3();
      for (const dx of [-sign.w / 2, sign.w / 2]) for (const dy of [-sign.h / 2, sign.h / 2]) {
        v.set(dx, dy, 0.01);
        sign.mesh.localToWorld(v).project(ctx.camera);
        xs.push(((v.x + 1) / 2) * w);
        ys.push(((1 - v.y) / 2) * h);
      }
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    },

    setState(name) {
      if (name === 'open') {
        jump(true);
        cut();
        paint(UP[UP.length - 1], 0);
        setHover(false);
        tip = tipTarget = 0;
      } else if (name === 'hover') {
        jump(false);
        hover = true;
        tip = tipTarget = TIP_HOVER;
      } else {
        jump(false);
        hover = false;
        tip = tipTarget = 0;
      }
      if (sign?.pivot) sign.pivot.rotation.x = tip;
      nodAt = 1e9; // a judged frame is a still: no nod in it
    },

    update(ctx2) {
      if (!ctx2.clock.stepped) return;
      const parity = Math.floor(ctx2.clock.frame / 2) % 2;

      // the board on its hooks
      if (sign?.pivot) {
        if (tip !== tipTarget) tip += Math.sign(tipTarget - tip) * Math.min(Math.abs(tipTarget - tip), TIP_HOVER / 2);
        let a = tip;
        if (!read && !hover && !showing && nods < NOD_TIMES) {
          if (ctx2.clock.raw - nodAt > NOD_EVERY) {
            nodAt = ctx2.clock.raw;
            nods++;
          }
          const k = Math.floor(((ctx2.clock.raw - nodAt) / HOLD) + 1e-6);
          if (k >= 0 && k < NOD.length) a = NOD[k];
        }
        sign.pivot.rotation.x = a;
      }

      // the notice, or the reading on the other side of it — either way, on twos
      if (mode === 'reading') reader.step(parity);
      else if (showing || anim) paint(poseNow(ctx2), parity);
    },
  };
}

// ---------------------------------------------------------------------------------------------
// The card: one question mark on a sheet the size of one of his own, ruled with the same double
// rule the board is ruled with. The «?» is cut in the sign hand, so it is the same hand that cut
// TAROT — READINGS — 3 CARDS a hand's breadth to its left.
function drawQuestionCard(g, W, H, rng) {
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  const pen = Math.max(2.6, W * 0.016);
  const in1 = W * 0.06, in2 = in1 + pen * 2.4;
  const box = (i, wd) => {
    inkLine(g, i, i, W - i, i, { width: wd, wobble: 1.5, rng });
    inkLine(g, W - i, i, W - i, H - i, { width: wd, wobble: 1.5, rng });
    inkLine(g, W - i, H - i, i, H - i, { width: wd, wobble: 1.5, rng });
    inkLine(g, i, H - i, i, i, { width: wd, wobble: 1.5, rng });
  };
  box(in1, pen);
  box(in2, pen * 0.55);
  // the question. No pin is drawn: at the size this card lands — 62 px across on a phone — a pin's
  // head is a pixel and a half, which the ink pass rightly throws away as speckle. The tilt and the
  // overlap say it is tacked to the board; a mark that cannot survive the frame is not drawn.
  signCaps(g, '?', W * 0.5, H * 0.53, { capH: H * 0.52, tracking: 0, pen: Math.max(4, H * 0.062), seed: 3 });
}
