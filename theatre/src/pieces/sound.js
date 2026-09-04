// PIECE: sound — the parlour, procedurally. No files, no music bed, no beeps.
//
// Under everything: a very quiet band-limited room tone that drifts and is meant to be forgotten.
// On the back wall: the drawn clock, ticking once a second, dry, panned to where it hangs in the
// frame and quieter as the camera backs away. On the cloth: paper that behaves like paper — a card
// slides (a short filtered swish), lands (a thump with a click on it), the deck riffles (twenty
// transients in 400 ms) and is squared (a tap). Around the edges: the chair under him, the street
// through the shutters, the caption's pen. On the title card two struck notes a fifth apart; on the
// closing card the same figure inverted.
//
// Nothing fades. A voice is at its level on its first sample; the room tone is cut in and cut out.
//
// Silence: ?shot=1 makes the whole piece a no-op (no AudioContext is ever constructed), so
// screenshots and the judging views are unaffected. ?mute=1 starts muted; `m` toggles it.
// Browsers need a gesture: the context is built on the first pointerdown / key, never before.
//
// api: play(name) · start() · stop() · setState(name) · duck(on) · mute(on) · toggleMute()
//      muted · running · cues · render(name, seconds, opts)   (the last is for tools/_sound-probe.mjs)
import { LEVEL, LENGTH, TRIM, CUES, play as voice, tick as clockTick, roomTone } from './sound-voices.js';

export const meta = {
  name: 'sound',
  judge: { shot: 'home', states: ['default'], audio: true },
  files: ['src/pieces/sound.js', 'src/pieces/sound-voices.js'],
};

// where the clock hangs on the back wall, if the props piece cannot be asked
const CLOCK_FALLBACK = [-0.05, 2.45, -2.45];
const DUCK_ROOM = 0.5; // the room tone under Pepe's spoken voice
const DUCK_CLOCK = 0.55;
const CREAK_GAP = 18; // seconds between chair creaks, at the least
const STREET_AT = [42, 126]; // the street, twice a visit, at these seconds

export async function build(ctx) {
  const silent = !!ctx.shotMode;
  const params = ctx.params ?? new URLSearchParams(location.search);

  let ac = null; // built on the first gesture, never before
  let master = null;
  let room = null;
  let running = false;
  let muted = params.get('mute') === '1';
  let ducked = false;
  let typingOn = true;
  let seed = 1;
  let recent = []; // fire times, for the voice budget
  let nextTick = 0; // audio time of the next escapement
  let tickIndex = 0;
  let lastCreak = -1e9;
  let streetTimers = [];
  let typeTimer = null;
  let typeToken = 0;
  let speakPoll = 0;
  const last = Object.create(null); // per-cue dedupe

  // ---- the clock's place in the frame ------------------------------------------------------------
  const clockPos = new ctx.THREE.Vector3(...CLOCK_FALLBACK);
  let clockFound = false;
  function locateClock() {
    if (clockFound) return;
    try {
      const props = ctx.scene.getObjectByName('props');
      const pend = props?.userData?.pendulum;
      if (pend) {
        pend.getWorldPosition(clockPos);
        clockPos.y += 0.22; // the dial, above the pendulum
        clockFound = true;
      }
    } catch {
      /* the fallback stands */
    }
  }
  const _v = new ctx.THREE.Vector3();
  function clockPlace() {
    let pan = 0, gain = 1;
    try {
      _v.copy(clockPos);
      const dist = _v.distanceTo(ctx.camera.position);
      _v.project(ctx.camera);
      pan = Number.isFinite(_v.x) ? Math.max(-0.8, Math.min(0.8, _v.x * 0.62)) : 0;
      if (_v.z > 1) pan = 0; // behind the camera (the overhead inserts): it is simply in the room
      gain = Math.max(0.55, Math.min(1.15, 4.8 / Math.max(0.5, dist)));
    } catch {
      /* stage not ready */
    }
    return { pan, gain };
  }

  // ---- the graph ---------------------------------------------------------------------------------
  function ensure() {
    if (silent) return null;
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.setValueAtTime(muted ? 0 : 1, ac.currentTime);
      master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume?.();
    return ac;
  }

  function startRoom() {
    if (!ac || room) return;
    room = roomTone(ac, master, { level: LEVEL.room });
    if (ducked) room.gain.gain.setValueAtTime(room.base * DUCK_ROOM, ac.currentTime);
  }
  function stopRoom() {
    room?.stop();
    room = null;
  }

  // the escapement, aligned to the drawn pendulum: it swings sin(pi*t), so it turns over at
  // t = k + 0.5 and that is where a real one ticks.
  function armClock() {
    if (!ac) return;
    const phase = ac.currentTime - (ctx.clock?.raw ?? 0) + 0.5;
    tickIndex = Math.max(0, Math.ceil(ac.currentTime - phase));
    nextTick = phase + tickIndex;
  }
  function pumpClock() {
    if (!ac || !running || muted || state === 'silent' || state === 'room') return;
    const now = ac.currentTime;
    if (nextTick < now - 0.5) {
      // the tab was away: pick the grid up again rather than firing a hundred ticks
      const skipped = Math.ceil(now - nextTick);
      nextTick += skipped;
      tickIndex += skipped;
    }
    const { pan, gain } = clockPlace();
    while (nextTick < now + 0.6) {
      clockTick(ac, master, nextTick, {
        level: LEVEL.clock * gain * (ducked ? DUCK_CLOCK : 1),
        pan,
        tock: tickIndex % 2 === 1,
        seed: 900 + (tickIndex % 97),
      });
      nextTick += 1;
      tickIndex++;
      api.stats.ticks++;
    }
  }

  // ---- the incidentals ---------------------------------------------------------------------------
  function creak() {
    const t = ctx.clock?.raw ?? 0;
    if (t - lastCreak < CREAK_GAP) return;
    lastCreak = t;
    api.play('creak');
  }
  function armStreet() {
    for (const h of streetTimers) clearTimeout(h);
    streetTimers = STREET_AT.map((s) => setTimeout(() => api.play('street'), (s + Math.random() * 14) * 1000));
  }

  // one pen tick a word while a caption types; the quietest thing in the room after the tone
  function typeLine(text, seconds) {
    if (!typingOn || !running || muted || ducked) return;
    const words = [];
    let at = 0;
    for (const w of String(text).split(/\s+/)) {
      if (w) words.push(at / Math.max(1, text.length));
      at += w.length + 1;
      if (words.length > 40) break;
    }
    const token = ++typeToken;
    let i = 0;
    const step = () => {
      if (token !== typeToken || i >= words.length) return;
      const u = words[i++];
      api.play('type');
      const nextU = i < words.length ? words[i] : null;
      if (nextU == null) return;
      typeTimer = setTimeout(step, Math.max(40, (nextU - u) * seconds * 1000));
    };
    if (words.length) step();
  }

  // ---- the piece ---------------------------------------------------------------------------------
  let state = 'default';

  const api = {
    cues: CUES,
    levels: LEVEL,
    lengths: LENGTH,
    trims: TRIM,
    get running() {
      return running;
    },
    get muted() {
      return muted;
    },
    get context() {
      return ac;
    },
    stats: { played: 0, dropped: 0, contexts: 0, ticks: 0 },

    // The first gesture. Safe to call as often as anyone likes; safe before the stage exists.
    start() {
      if (silent || running) return;
      if (!ensure()) return;
      api.stats.contexts++;
      running = true;
      locateClock();
      startRoom();
      armClock();
      armStreet();
    },
    stop() {
      running = false;
      stopRoom();
      for (const h of streetTimers) clearTimeout(h);
      streetTimers = [];
      clearTimeout(typeTimer);
      typeToken++;
    },

    play(name) {
      if (silent || muted || !name) return 0;
      if (!running) return 0; // no gesture yet: the world has not opened
      try {
        // the rate limit runs on wall time, not the audio clock: a suspended or sinkless context
        // freezes currentTime, and a budget on a frozen clock would drop everything for ever
        const wall = performance.now() / 1000;
        // the fan deals twenty-one cards: keep the voice count sane without ducking anything
        recent = recent.filter((t) => wall - t < 0.2);
        if (recent.length > 18) {
          api.stats.dropped++;
          return 0;
        }
        // a figure fired twice in a frame (the wrapper and the caller) is one figure
        if (last[name] != null && wall - last[name] < 0.25 && (name === 'title' || name === 'closing')) return 0;
        last[name] = wall;
        recent.push(wall);
        api.stats.played++;
        const at = ac.currentTime + 0.005;
        if (name === 'clock') {
          const cp = clockPlace();
          return clockTick(ac, master, at, { level: LEVEL.clock * cp.gain, pan: cp.pan });
        }
        return voice(ac, master, name, at, { seed: ++seed });
      } catch (e) {
        console.warn('[sound]', name, e?.message ?? e);
        return 0;
      }
    },

    // Pepe's spoken voice is on and he is speaking: the room steps back a little, and cuts back.
    duck(on) {
      on = !!on;
      if (on === ducked) return;
      ducked = on;
      if (room && ac) room.gain.gain.setValueAtTime(room.base * (on ? DUCK_ROOM : 1), ac.currentTime);
    },

    mute(on) {
      muted = on == null ? !muted : !!on;
      if (ac && master) master.gain.setValueAtTime(muted ? 0 : 1, ac.currentTime);
      if (!muted && running) armClock();
      return muted;
    },
    toggleMute() {
      return api.mute();
    },
    setTyping(on) {
      typingOn = !!on;
    },

    setState(name = 'default') {
      state = name;
      if (silent) return;
      if (name === 'silent') api.stop();
      else if (running) {
        startRoom();
        armClock();
      }
    },

    update() {
      if (silent || !running) return;
      pumpClock();
      // Pepe's spoken voice, if the visitor turned it on: poll rather than reach into dialogue.js
      if (++speakPoll % 6 === 0) {
        const speaking = !!(window.speechSynthesis && window.speechSynthesis.speaking);
        if (speaking !== ducked) api.duck(speaking);
      }
    },

    // ---- the probe's hook: render one cue into an OfflineAudioContext and hand back the samples --
    // tools/_sound-probe.mjs measures peak, length and spectral centroid from this.
    async render(name, seconds = 1.4, { seed: s = 7, sampleRate = 22050, pan = 0 } = {}) {
      const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OC) return null;
      const oc = new OC(2, Math.max(64, Math.ceil(seconds * sampleRate)), sampleRate);
      const bus = oc.createGain();
      bus.gain.value = 1;
      bus.connect(oc.destination);
      if (name === 'room') roomTone(oc, bus, { level: LEVEL.room });
      else if (name === 'clock') clockTick(oc, bus, 0.02, { level: LEVEL.clock, pan });
      else if (name === 'clock-run')
        // the escapement as it actually runs: a second apart, tick and tock alternating
        for (let k = 0; k < Math.floor(seconds - 0.15); k++) clockTick(oc, bus, 0.1 + k, { level: LEVEL.clock, pan, tock: k % 2 === 1, seed: 900 + k });
      else voice(oc, bus, name, 0.02, { seed: s, pan });
      const buf = await oc.startRendering();
      return {
        name,
        sampleRate: buf.sampleRate,
        l: Array.from(buf.getChannelData(0)),
        r: Array.from(buf.getChannelData(1)),
      };
    },
  };

  if (silent) {
    // ?shot=1: no listeners, no context, no timers. The piece is a stub with the same shape.
    return { ...api, play: () => 0, start() {}, stop() {}, update() {}, render: async () => null };
  }

  // ---- the gesture, and the visitor's mute key ---------------------------------------------------
  const open = () => api.start();
  window.addEventListener('pointerdown', open, { once: true });
  window.addEventListener('keydown', open, { once: true });
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'm' || e.key === 'M') api.mute();
  });

  // ---- what the rest of the evening tells us, without anyone having to call us --------------------
  // the caption's pen; a new line cancels the last line's ticks
  ctx.on?.('dialogue:say', ({ text, seconds }) => typeLine(text, seconds ?? 1.5));
  ctx.on?.('dialogue:intertitle', () => (typeToken++, undefined));
  // he settles into a new beat: the chair
  ctx.on?.('dialogue:folio', () => {
    if (Math.random() < 0.45) creak();
  });
  ctx.on?.('dialogue:voice', ({ on }) => {
    if (!on) api.duck(false);
  });

  // The two-note figure belongs to the title card, and its inversion to the closing card; flow
  // fires one cue ('snap') for every card, so take the figures from the titles piece itself.
  // (See contractRequests: flow.js can call cue('title') / cue('closing') instead.)
  const T = ctx.pieces?.titles;
  if (T && !T.__soundFigures) {
    T.__soundFigures = true;
    for (const [fn, cue] of [
      ['title', 'title'],
      ['closing', 'closing'],
    ]) {
      const orig = T[fn];
      if (typeof orig === 'function')
        T[fn] = function (...a) {
          api.play(cue);
          if (cue === 'title' && running) armStreet(); // a new visit gets its own street
          return orig.apply(this, a);
        };
    }
  }
  // and the chair creaks when he shifts his weight, which is what a gesture is
  const A = ctx.pieces?.pepeAnim;
  if (A && !A.__soundCreak) {
    A.__soundCreak = true;
    for (const fn of ['gesture', 'react']) {
      const orig = A[fn];
      if (typeof orig === 'function')
        A[fn] = function (...a) {
          creak();
          return orig.apply(this, a);
        };
    }
  }

  return api;
}
