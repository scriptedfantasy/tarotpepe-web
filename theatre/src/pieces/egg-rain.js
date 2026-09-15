// NOT AN EGG ANY MORE, inside props: THE WEATHER. It rains, and the only way to know is the room and
// the sound of it.
//
// WHAT THIS WAS. The user: "Click the window: rain starts outside in ink, the room dims a shade…
// Click again, it clears." And, about the puppet: "no need to change pepe during it." He does not
// change. Nothing about him, the cloth, the deck or the reading knows this happened.
//
// WHAT TOOK IT AWAY, AND WHAT COULD NOT BE DONE ABOUT IT. The user: "i'd also like to remove the
// window in the back left". The rain was drawn in the 10.5 mm between a pane and the front of its
// casement — the one depth in this set where a stroke is OUTSIDE and can still be seen, because the
// back of a window reveal is an opaque sheet of paper and there is no outside behind it. Take the
// window out and that slot does not exist. There is no plaster the rain can be drawn on instead:
// rain on a wall is not rain.
//
// THE ONE OTHER WINDOW WAS MEASURED BEFORE THIS WAS GIVEN UP, because it is the obvious answer. The
// stage-right wall still has a casement, at world x 2.6 running z -1.95 to -1.05. Its glazed area on
// the glass, against what the back wall's used to be (both at the resting plates):
//     window       back wall            stage-right wall
//     1280x800     142 x 233 px         56.9 x 281 px, at x 1173-1230 of 1280
//     1600x900     160 x 262 px         64.0 x 316 px, at x 1400-1464 of 1600
//     390x844      off the frame        off the frame, at x 774-836 of 390
// Two things kill it. The side window is 57 px wide and holds four panes, so a light is about 13 px
// across and a rain stroke — 0.0115 m, one notch under the wall's own contour — measures 0.8 px on
// it: under the width at which the ink pass keeps a mark at all, so the pass would simply delete the
// weather. And on a phone it is off the right-hand edge of the picture exactly as the old one was
// off the left, so the click that started the rain could not be reached by a thumb either way.
// (The back wall's window was already off a phone's frame. The rain has been a laptop-only egg for
// as long as there has been a phone plate; this change finished it rather than started it.)
//
// AND THE WIDE WINDOW WAS MEASURED TOO, WHEN IT WENT IN. The user had the switchboard and the
// framed diagram taken off the stage-left wall and a wide window put there instead (room.js,
// `sideWinL`: 1.48 m in the clear, three lights, sill 1.04, head 2.45), which is a bigger opening
// than the back wall's ever was and the obvious second chance for this drawing. It fails on the
// same number, and not by much less:
//     plate                 the window   a light   px per metre ACROSS the wall   a 0.0115 m stroke
//     1280x800  home         97 px        26.5 px    66                            0.76 px
//     1600x900  home        110 px        29.9 px    74                            0.85 px
//     1280x800  wide         78 px        21.4 px    53                            0.61 px
// The pen keeps a mark at about 2.1 px and throws anything under it away, so the stroke this window
// would need is 32 mm at the home plate and 40 at the wide. That is WIDER THAN THE JOINERY IT FALLS
// IN FRONT OF — the glazing bar is 26 mm and a leaf's meeting stile 42 — and rain drawn at the width
// of a window bar is not rain, it is more bars. The back wall's window ran 158 px to the metre and
// its 0.0115 m stroke arrived at 2.08 px on its own: that window was drawn square to the lens and
// this one is on a wall seen at 67 degrees, and that is the whole of the difference. egg-silvia.js
// widened its pen on this same plaster and was right to — a card and its lettering may be any size
// the wall wants — but a raindrop may not: its width is the thing it is.
// The second reason is unchanged and on its own sufficient: at 390x844 this wall is off the frame
// at both resting plates (tools/_left-wall-where.mjs), so the click that starts the rain cannot be
// reached by a thumb here either. The drawing stays retired.
//
// SO WHAT IS LEFT IS THE WEATHER WITHOUT THE PICTURE OF IT, and it is not nothing:
//   THE ROOM GOES OVER. A `rain` state is injected into lighting.js's own table (it publishes
//     `states`, so this costs that file nothing): the key dropped and cooled to an overcast sky, the
//     corners a little deeper, the ramp opened one notch. It sits between `default` and `evening`
//     and it is NOT evening — no lamps come on, it is still the afternoon. THE PEN IS NOT TOUCHED:
//     lineWeight, the contour, the crease and silhouette thresholds are all the pass's own. Only the
//     tone moves. The cut lands on a 12 fps drawing, because a cloud arriving is a cut and this film
//     does not dissolve.
//   IT IS AUDIBLE. `rainBed` in sound-voices.js: filtered noise, cut in at level, under the room
//     tone, running as long as it is raining and cut dead when it stops. It hangs on the audio
//     context's destination through a fader of its own, because the sound piece publishes its
//     context and not its master; the fader follows `sound.muted` so the visitor's mute key works.
//   THE RAMP IS STILL COUNTED IN LAYERS. `layers` runs 0..4 on the same schedule it always did —
//     one at the first step, four at two seconds, four down to none over the second the user asked
//     for. Nothing draws them now; they are what the storm's own timing is read off, and
//     egg-cross.js's proof still asserts four of them at the height of the storm.
//
// WHAT LOST WHAT. The drawing: sixteen rain strokes-into-one-atlas cut to four panes, and the boil
// that re-struck them on every 12 fps drawing. The switch: this was the room's eighth, worked by
// clicking the panes, and it registers nothing with the arbiter now — there is no object to point
// at. THE STORM STILL CALLS IT. egg-cross.js opens the door on a crossroads in the rain and turns
// this on by its api for the length of it (`toggle`, `set`), and in that sequence the rain IS drawn,
// by egg-cross's own hand, cut to the doorway. That is where the weather is visible in this room now.
//
// api (published as props.rain):
//   on            is it raining (true from the first step of the fall to the last)
//   layers        0..4, how far up the ramp it is
//   toggle()      start it or stop it — cue, event and all
//   set(on)       for a still: full rain or none, with no ramp and nothing to wait for
//   update(ctx)   called from props.update on the stepped clock
import { rainBed, LEVEL as SOUND_LEVEL } from './sound-voices.js';

// HOW MANY LAYERS THE FALL HAS. It was four because a pane of rain was dealt off a stratified grid
// into four even layers and density was HOW MANY WERE SHOWING — sparse rain became full rain because
// more rain arrived, not because a different drawing replaced it. There are no layers to show any
// more, but the NUMBER is kept and so is its schedule: it is the shape of the fall, everything that
// reads this egg reads it in quarters, and a storm that goes to full in one step is a switch and not
// weather.
const ROWS = 4;

// ---- what the room does without the sun ------------------------------------------------------------
// One shade between `default` and `evening`, and it is still the afternoon: no lamp is lit, the key
// is not gone, the panes do not go solid (`night` stays false — it kept the cross-hatched sheet off
// the glass the rain was behind, and it is kept now because a solid pane is night and this is not).
// WITH THE RAIN OFF THE GLASS THIS IS THE WHOLE OF THE WEATHER IN THE PARLOUR, and it turns out to
// be most of what it always was: the numbers below were tuned for the room going over, not for the
// drops, and nothing in them was ever about the window.
//
// WHERE THE SHADE ACTUALLY LANDS, WHICH IS NOT WHERE IT WAS AIMED. Dropping the key alone does
// nothing to this room: swept from 3.3 down to 0.6 with the ramp untouched, the papered field behind
// Pepe holds at 4.92 % ink at every step and only breaks over when the key reaches ZERO, which is
// evening. The big flats are far above the first stroke threshold and there is no dimmer between
// paper and rain-strokes. What DOES move is the modelling — the door's fielded panels and its
// reveal, the mouldings, the raked side walls and the shutters on the one that is left — and it
// moves on the ramp, not on the key. So
// the shade is spent there: the key down and cooled by a third (the sun goes in), the corners a
// notch deeper, and the ink ramp opened one stop so a face that was one level of strokes takes two.
// THE PEN IS NOT IN IT: `ink` carries tone and levels and nothing else, and lineWeight, the contour
// and the crease and silhouette thresholds are all the pass's own numbers, untouched.
//
// AND THE POOL UNDER THE TABLE IS HELD BACK ON PURPOSE. `pools` is what darkens the cloth's hem and
// the ground the table stands on, and the ground it stands on is the RUG, which the user has said is
// already right. At the room's own -0.3 the rain state widened the shadow under the table by two
// points of ink; at -0.18 the rug sits where it sat and the rest of the room still goes over.
const RAIN_LIGHT = {
  key: 1.7,
  keyColor: '#e8eef7',
  fill: { sky: '#ffffff', ground: '#544f45', intensity: 0.33 },
  bounce: 0.11,
  floorBounce: 0.085,
  corners: -1.05,
  pools: -0.18,
  pendant: 0,
  table: 0,
  floor: 0,
  catLamp: 1.3,
  night: false,
  ink: { tone: [0.02, 0.62, 1.05, 0.26], levels: [0.5, 0.78, 0.94, 0.18] },
};

// ---- the ramp, in drawings ------------------------------------------------------------------------
const GROW = 2 / (ROWS - 1); // 0.667 s a layer: one at the first step, four at two seconds
const THIN = 1 / ROWS; // 0.25 s a layer: four down to none over the second the user asked for

export function eggRain(ctx, { group } = {}) {
  // ---- the light --------------------------------------------------------------------------------
  let was = null; // the lighting state the room was in before the cloud came over
  function lights_(on) {
    const L = ctx.pieces.lighting;
    if (!L?.states) return;
    // …and the ramp is `default`'s own, plus the one notch above. Injected once, and only if some
    // other hand has not already put a `rain` there.
    if (!L.states.rain) L.states.rain = RAIN_LIGHT;
    if (on) {
      if (was == null) was = L.state ?? 'default';
      L.setState('rain');
    } else {
      // never rained: leave the lighting exactly as whoever set it left it (?light=, a judging
      // state, the flow's own evening). This piece only ever puts back what it took.
      if (was == null) return;
      L.setState(was);
      was = null;
    }
  }

  // ---- the sound --------------------------------------------------------------------------------
  // The sound piece publishes its context but not its master, so the bed hangs on the destination
  // through a fader of this piece's own, and that fader follows the visitor's mute key. It is cut
  // in at level (nothing in this film fades in) and cut dead when the last stroke goes.
  let bed = null, fader = null;
  function sound(on) {
    const S = ctx.pieces.sound;
    const ac = S?.context ?? null;
    if (!on) {
      try {
        bed?.stop();
      } catch {
        /* already stopped */
      }
      fader?.disconnect?.();
      bed = fader = null;
      return;
    }
    // …and a muted room still gets its bed, held at zero by the fader. Building it only when the
    // sound is up would mean that unmuting during a shower brought back everything except the rain.
    if (bed || !ac) return;
    try {
      fader = ac.createGain();
      fader.gain.value = S?.muted ? 0 : 1;
      fader.connect(ac.destination);
      bed = rainBed(ac, fader);
    } catch (e) {
      console.warn('[rain] the weather is silent:', e?.message ?? e);
      bed = fader = null;
    }
  }
  function mind_the_mute() {
    if (!fader) return;
    const want = ctx.pieces.sound?.muted ? 0 : 1;
    if (fader.gain.value !== want) fader.gain.value = want;
  }

  // ---- the weather ------------------------------------------------------------------------------
  let want = false; // what was asked for — by the storm, by a still, or by ?rain=1
  let on = false; // whether it is raining
  let layers = 0;
  let t0 = 0; // when the current ramp started, on the 12 fps clock
  let held = 0; // how many layers were showing when the visitor called it off

  function toggle(next = !want) {
    want = !!next;
    if (!want) held = layers;
  }

  const api = {
    get on() {
      return on;
    },
    get layers() {
      return layers;
    },
    get raining() {
      return want;
    },
    steps: ROWS,
    // seconds since the ramp began, on the 12 fps clock: what a tool needs to say whether a layer
    // arrived on the drawing it was due on, rather than when a stalling render loop noticed
    get since() {
      return +((ctx.clock?.t ?? 0) - t0).toFixed(3);
    },
    schedule: { grow: GROW, thin: THIN },
    toggle,
    // for the tools and for setState: full rain or none, at once, with no cue and no waiting. The
    // ramp is BACK-DATED rather than skipped — put the start of the fall a full ramp in the past and
    // the next stepped frame agrees it is already full, instead of finding t == t0 and beginning the
    // fall over again on the drawing after the still was asked for.
    set(next, level = ROWS) {
      want = on = !!next;
      layers = on ? Math.max(1, Math.min(ROWS, level | 0)) : 0;
      held = layers;
      t0 = (ctx.clock?.t ?? 0) - GROW * (layers - 1) - GROW / 2;
      lights_(on);
      if (!on) sound(false);
    },
    // the bed, rendered through an OfflineAudioContext by the very code the page runs — what
    // tools/_egg-rain-proof.mjs measures its peak and its colour from (sound.js's own `render` walks
    // a list of named cues and a looped bed is not one of them)
    async render(seconds = 1.5, sampleRate = 22050) {
      const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OC) return null;
      const oc = new OC(2, Math.max(64, Math.ceil(seconds * sampleRate)), sampleRate);
      const bus = oc.createGain();
      bus.gain.value = 1;
      bus.connect(oc.destination);
      rainBed(oc, bus);
      const buf = await oc.startRendering();
      return { sampleRate: buf.sampleRate, l: Array.from(buf.getChannelData(0)), level: SOUND_LEVEL.rain };
    },
    // what the tools ask about the noise itself, since it is not on the sound piece's timeline
    get audible() {
      return { running: !!bed, muted: !!ctx.pieces.sound?.muted, gain: fader ? fader.gain.value : 0 };
    },
    update(ctx2) {
      mind_the_mute();
      if (!ctx2.clock.stepped) return;
      const t = ctx2.clock.t;
      if (want && !on) {
        // the first drawing of the fall, and the room goes over on the same one
        on = true;
        t0 = t;
        layers = 1;
          lights_(true);
        sound(true);
        ctx.emit?.('props:rain', { on: true });
      } else if (want && on) {
        const n = Math.min(ROWS, 1 + Math.floor((t - t0) / GROW));
        if (n !== layers) {
          layers = n;
            }
        held = layers;
      } else if (!want && on) {
        // it thins over the second, a layer at a time, and stops
        const n = Math.max(0, held - Math.floor((t - t0) / THIN));
        if (n !== layers) {
          layers = n;
            }
        if (layers === 0) {
          on = false;
          lights_(false);
          sound(false);
          ctx.emit?.('props:rain', { on: false });
        }
      }
    },
  };
  // NOTHING IS REGISTERED WITH THE ARBITER. This used to answer with a box of its own (as the globe
  // does) rather than with an object, because the thing being pointed at was the GLASS and the glass
  // belonged to room.js. There is no glass; there is no box; a switch whose target is a stretch of
  // bare plaster is a hidden hotspot, and this room does not have any of those — "an affordance
  // nobody can see is not one" (props.js, about the radio on a phone). So the weather is started by
  // the storm (egg-cross.js), by `?rain=1`, and by props' own `setState('rain')` for a still, and by
  // nothing a pointer can do. `group` is still taken and still unused: it is the hook a later round
  // would hang a drawn outside on, if the room ever gets one back.
  if ((ctx.params ?? new URLSearchParams(location.search)).get('rain') === '1') api.set(true);
  return api;
}

// what the props piece's setState hands over: the one name this egg answers to
export function rainState(api, name) {
  api?.set?.(name === 'rain');
}
