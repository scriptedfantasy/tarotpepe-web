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
// AND A THIRD FACE, which is not reached from the notice at all. The user, on the deck laid out on
// the cloth: "they are so beautiful, users should be able to look at them outside of the drawing."
// So a tap on a card in the drawing — one of egg-deck's seventy-eight, or one of the three lying
// face up after a reading — turns this same piece of paper to a card viewer: help-cards.js, ONE
// PLATE as printed at the size the window allows and nothing else on the sheet. It is a CUT in and
// a cut out, and it gives the room back exactly as it was left. Nothing on the notice's own face
// mentions it and nothing announces it.
//
// AND THE THIRD FACE IS A LESSON. The user, on the whole deck lying face up: "maybe this could be
// the teaching - in this whole laid out view, whenever a user clicks a card, pepe could explain the
// suit and the individual cards." So every card this face puts up is announced — `help:cards` — and
// flow.js answers it by asking him to teach that card, on the placard, while the picture stays up.
// This piece does not speak and does not know that he does; it says which card is on the paper and
// stops there. What it owes the lesson is the BAND: the sheet is cut to end clear of the placard,
// and so is the root that catches taps, so his words have somewhere to stand and a thumb can turn
// his takes.
//
// THE VIEWER HAS NO CONTROLS, and that is the user's own instruction. Rounds up to twelve gave it
// arrows, a BACK and the card's name, and stepping mid-lesson cut his line off half-written: "I can
// only always get the explainer for one card and switching the card before the explainer happens
// kind of seems to break the chat window. […] we should remove the switching capability […] we can
// also remove the back […] The abort can be just clicking outside of the card." So `help:cards`
// goes out when a card is PUT UP and at no other time, there is nothing on the sheet to press, and
// the way out is a finger off the paper or Escape. `next`/`prev` stay on the api for tools; nothing
// a visitor can touch calls them and neither of them announces anything.
//
// API: open() · close() · toggle() · showing · reading · hitBox() (the board's box on screen, in px)
//      cards: open(slug) · close() · next() · prev() · slug
//      states: closed · hover (the board under a pointer) · open · cards
import * as THREE from 'three';
import { PAPER, drawTexture, inkMaterial, inkLine } from '../core/strokes.js';
import { signCaps } from './titles-sign.js';
import { cutBill } from './help-bill.js';
import { makeReader } from './help-read.js';
import { makeCardView } from './help-cards.js';
import * as keep from './help-keep.js';
import { DECK, bySlug } from '../core/deck.js';

export const meta = {
  name: 'help',
  judge: { shot: 'home', states: ['closed', 'hover', 'open', 'cards'] },
  files: ['src/pieces/help.js', 'src/pieces/help-bill.js', 'src/pieces/help-keep.js', 'src/pieces/help-read.js', 'src/pieces/help-cards.js'],
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
// the card the `cards` judging state is open on. A trump, and the one whose plate is darkest over
// its whole height, so a critic can see at a glance whether the picture actually arrived
const JUDGED_CARD = 'the-moon';

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
    #help.reading > canvas, #help.cards > canvas { display: none; }
    /* THE PLACARD'S BAND IS NOT THE NOTICE'S. While a card is up he is TEACHING it, and his lesson
       stands on the caption card — so the sheet leaves that band alone and so does the sheet's own
       pointer catcher, which would otherwise eat the tap that turns his next take. #overlay > *
       lays this out at inset 0; a class beats it, and the two variables are how much of the head
       and of the foot the placard has taken (layoutCards). The card stands at the foot all evening
       and at the HEAD while a phone has the deck laid out, so both ends have to give way. */
    #help.cards { top: var(--help-band-top, 0px); bottom: var(--help-band-bottom, 0px); }
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

  // ---------------------------------------------------------------------------------------------
  // 2c. THE THIRD FACE OF THE CARD — one tarot card, as printed (help-cards.js)
  // ---------------------------------------------------------------------------------------------
  // The user, on the deck laid out face up: "they are so beautiful, users should be able to look at
  // them outside of the drawing." So a tap on a card — one of the seventy-eight on the cloth, or
  // one of the three lying face up after a reading — turns the ? card to a third face with that
  // plate on it at the size the window allows, and nothing else on the sheet. Nothing on the
  // notice's own face says so, and nothing announces it.
  const view = makeCardView();
  root.appendChild(view.el);

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

  // ---- and the third face: one card, as printed ------------------------------------------------
  // It arrives as a CUT and it leaves as one. The notice comes up off the bottom of the frame
  // because a hand is laying it down in front of you; this face is not laid down, it is turned to —
  // the visitor tapped a card and the card is what they get, in the same drawing.
  let plateReady = Promise.resolve(false);
  let downFace = null; // which face of the card the pointer last came down on
  function toCards(slug) {
    if (!bySlug[slug]) return false;
    downFace = null;
    dropReading();
    const was = mode;
    mode = 'cards';
    if (!showing) {
      showing = true;
      anim = null;
      pose = UP[UP.length - 1];
      root.classList.remove('going');
      root.classList.add('up');
    }
    root.classList.add('cards');
    layoutCards();
    plateReady = view.show(slug);
    if (was !== 'cards') cue('flip');
    ctx.emit?.('help:cards', { slug });
    return true;
  }
  function dropCards() {
    if (mode !== 'cards') return false;
    mode = 'notice';
    root.classList.remove('cards');
    painted = ''; // the notice's plate has not been blitted since the card turned over
    return true;
  }
  // Escape, or a finger anywhere off the paper: the room comes back exactly as it was left — the
  // deck still laid out if it was laid out, the three cards still on the cloth if they were.
  // Nothing here touches either.
  function closeCards() {
    if (!dropCards()) return false;
    showing = false;
    anim = null;
    pose = DOWN[DOWN.length - 1];
    root.classList.remove('up', 'going');
    cue('settle');
    ctx.emit?.('help:close');
    return true;
  }
  // THE DECK, WALKED — for a tool and for nothing else. There is no arrow on the sheet, no key
  // bound to this and no gesture that reaches it: the user cut the stepping out ("remove the
  // switching capability when you click the card"), and the reason it may not come back quietly is
  // that a step announced a new card mid-lesson and cut his line off half-written. So this says
  // NOTHING — no `help:cards`, no cue — and the lesson on the placard is left exactly as it stands.
  function stepCard(d) {
    if (mode !== 'cards') return null;
    const i = DECK.findIndex((c) => c.slug === view.slug);
    if (i < 0) return null;
    const next = DECK[(i + d + DECK.length) % DECK.length].slug;
    plateReady = view.show(next);
    return next;
  }
  // THE FRAME THE SHEET MAY STAND IN. Everything on the other side of the placard from the picture —
  // his lesson is said on that card while the plate is up here, and two pieces of paper cannot have
  // the same band. The caption's own place is dialogue's to decide (it stands at the foot all
  // evening, and at the HEAD while a phone has the deck laid out, so that it never covers the cards
  // the visitor is looking at), so the sheet is the one that gives way at whichever end it is asked
  // to; help-cards.js solves the plate inside what is left (see its `free`). A dialogue piece that
  // cannot say where its card stands leaves the whole frame, which is the old behaviour exactly.
  const BAND_GAP = 10; // paper between the sheet's edge and the placard's
  const MIN_FREE = 180;
  function bandRoom(h) {
    const b = ctx.pieces.dialogue?.band?.();
    if (!b || !(b.h > 0)) return { top: 0, bottom: 0, free: h };
    if (b.at === 'head') {
      const top = Math.max(0, Math.min(h - MIN_FREE, Math.round(b.bottom + BAND_GAP)));
      return { top, bottom: 0, free: h - top };
    }
    if (!(b.top > 0)) return { top: 0, bottom: 0, free: h };
    const free = Math.max(MIN_FREE, Math.min(h, b.top - BAND_GAP));
    return { top: 0, bottom: Math.max(0, Math.round(h - free)), free };
  }
  let bandAt = '';
  function layoutCards() {
    const w = ctx.size?.w || window.innerWidth, h = ctx.size?.h || window.innerHeight;
    const R = bandRoom(h);
    bandAt = `${R.top}/${R.bottom}`;
    root.style.setProperty('--help-band-top', `${R.top}px`);
    root.style.setProperty('--help-band-bottom', `${R.bottom}px`);
    view.place(w, h, Math.min(2, window.devicePixelRatio || 1), R.free);
  }

  function close() {
    if (!showing) return;
    // the card face is not put down through the notice: it is a cut both ways (closeCards)
    if (mode === 'cards') {
      closeCards();
      return;
    }
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
    dropCards();
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
  // A FINGER ON THE DRAWING, WHILE A CARD IS UP, PUTS THE PAPER DOWN. The user: "the abort can be
  // just clicking outside of the card." Outside the card is not all inside this piece's own root:
  // the sheet is cut to stand clear of the placard, so the root is cut with it, and the band the
  // placard has taken — plus the margin either side of the paper on a phone, where the sheet is 362
  // px of a 390 px frame — falls through to the canvas instead. The placard takes its own taps when
  // it is waiting to be turned (dialogue's `.cap.waiting` is the only moment it is not transparent
  // to a pointer), so this never steals one of those; everything else that lands on the drawing is
  // a finger off the paper and means what the user said it means.
  //
  // It is on the WINDOW, in the capture phase, and it stops what is behind it — and it has to be
  // there rather than on the canvas, because the tap that OPENS the viewer is a tap on the canvas
  // too: egg-deck's own listener puts the card up inside that very event, and a second listener on
  // the same element would then find a card up and shut it again in the same gesture. Capture at
  // the window runs BEFORE any of that, so what it reads is whether a card was up when the finger
  // landed. Stopping there also keeps egg-deck from reading the tap as a finger on the bare cloth
  // and raking the whole lay-out home, and keeps flow from reading it as the visitor skipping ahead
  // through a line, which a visitor putting a card down did not mean.
  //
  // ONLY THE DRAWING. The target must be the glass itself: a tap on this piece's own root is
  // answered by its click handler below (the margin round the paper), and one on the placard while
  // it waits to be turned belongs to dialogue.
  window.addEventListener(
    'pointerdown',
    (ev) => {
      if (mode !== 'cards' || !showing || ev.target !== glass) return;
      gesture();
      ev.stopPropagation();
      closeCards();
    },
    true,
  );

  // the notice's own controls, and the paper around them
  root.addEventListener('pointerdown', (e) => {
    gesture();
    // WHICH FACE THE POINTER CAME DOWN ON. The card viewer is opened by a tap on the DRAWING, and
    // that tap's own click must not then be read as a click on the paper that has just appeared
    // under it — a card near the edge of a wide frame would open the viewer and shut it in the same
    // gesture. A click only counts against the card face if its pointer came down on the card face.
    downFace = mode;
    e.stopPropagation();
    if (mode === 'reading' || mode === 'cards') return; // the card's own controls answer for themselves
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
    // THE CARD'S FACE. There is nothing on the sheet to press: a finger on the paper does nothing,
    // and one anywhere off it gives the room back — which is the whole of the way out the user
    // asked for ("the abort can be just clicking outside of the card"), Escape aside. The same
    // manners the notice and the reading keep, except that this face has no notice behind it.
    if (mode === 'cards') {
      const L = view.layout;
      if (!L || downFace !== 'cards') return; // the tap that opened it is not a tap on it
      downFace = null;
      const r = root.getBoundingClientRect();
      const x = ev.clientX - r.left, y = ev.clientY - r.top;
      if (x < L.card.x || x > L.card.x + L.card.w || y < L.card.y || y > L.card.y + L.card.h) closeCards();
      return;
    }
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
      // one step back at a time: the reading gives the notice back, the notice gives the room back.
      // The card face has no notice behind it — it was turned to from the table — so it gives the
      // room back directly, and gives it back exactly as it was left.
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
    if (mode === 'cards') layoutCards(); // …and the plate is solved again for the window that is up
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
    // THE CARD VIEWER, on the third face of the ? card. `open(slug)` is what a tap on a card in the
    // drawing calls — egg-deck's seventy-eight, and flow's three lying face up after a reading.
    cards: {
      open: (slug) => toCards(slug),
      close: () => closeCards(),
      next: () => stepCard(1),
      prev: () => stepCard(-1),
      get showing() {
        return mode === 'cards';
      },
      get slug() {
        return mode === 'cards' ? view.slug : null;
      },
      get card() {
        return mode === 'cards' ? view.card : null;
      },
      // the plate having actually arrived — a tool, and the judging still, wait on this
      ready: () => plateReady,
      layout: () => view.layout,
      plateBox: () => view.plateBox(),
      // the sheet's box on screen, in px — what a finger has to land OFF to put the paper down
      sheetBox: () => view.sheetBox(),
      // the band the placard has taken out of the frame while the paper is up, at whichever end
      band: () => bandRoom(ctx.size?.h || window.innerHeight),
    },
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

    async setState(name) {
      if (name === 'open') {
        jump(true);
        cut();
        paint(UP[UP.length - 1], 0);
        setHover(false);
        tip = tipTarget = 0;
      } else if (name === 'cards') {
        // the viewer, open on a fixed card, at the top of the two — and the plate is AWAITED, so a
        // judged frame is never the paper with a hole where the picture goes
        jump(false);
        setHover(false);
        tip = tipTarget = 0;
        toCards(JUDGED_CARD);
        view.step(0);
        await plateReady;
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

      // the notice, or one of the two other faces of the card — either way, on twos
      if (mode === 'reading') reader.step(parity);
      else if (mode === 'cards') {
        // …AND THE PLACARD MAY HAVE MOVED UNDER IT. It walks from the foot to the head in three
        // drawings when a phone lays the deck out (dialogue.js, THE DOCK), and the sheet is cut to
        // stand clear of wherever it is standing — so the band is read on every stepped frame and
        // the paper is solved again the moment it changes. It is arithmetic, not a measurement
        // (dialogue's own note on `band`), so this costs nothing on the frames it changes nothing.
        const h = ctx2.size?.h || window.innerHeight;
        const R = bandRoom(h);
        if (`${R.top}/${R.bottom}` !== bandAt) layoutCards();
        view.step(parity);
      } else if (showing || anim) paint(poseNow(ctx2), parity);
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
