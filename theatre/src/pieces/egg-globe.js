// THE GLOBE ON THE CABINET — the room's second working object, and the only one that asks him a
// question instead of answering one.
//
// The user's brief, whole: "Spin it with a drag; where it stops, he tells a story about an affair
// he had during a vacation in that specific country."
//
// So: a drag across the sphere turns it on its axis, fast and then slowing over about four seconds,
// rocking a little in its cradle, and stops. The meridian standing under the small ink pointer on
// its northern front is read off as a longitude; the drag's vertical component tilts the reading a
// latitude either way; the pair picks a country out of a fixed table of fifty. Then the room asks
// him for a `globe` beat with that country in it, and he says three sentences about an affair he
// had there. Nothing announces any of this. The cursor over the sphere is the whole affordance,
// exactly as it is on the radio.
//
// WHY A TABLE AND NOT A MAP LOOKUP. The map drawn below is a drawing: its coastlines are twenty
// hand-set points a continent and they are wrong by a hundred kilometres in places, which is
// correct for a pen and useless for a point-in-polygon test. Worse, two thirds of a sphere is
// ocean, and "the globe stopped on the South Atlantic" is not a story. The table is therefore the
// arbiter and the drawing is the illustration: every spin lands on a real country, coasts included,
// and never on water, because water is not in the table. What the drag actually chooses is a
// longitude band; the latitude tilt chooses within it. Fifty anchors is enough that no band of the
// world is empty and few enough that the answer is always a country a person has heard of.
//
// WHAT WAITS FOR WHAT. The sphere always turns — it is an object on a shelf and a finger on it must
// move it, whatever else is happening. The STORY waits: if he is mid-line when the globe comes to
// rest, the country is held and handed over the moment the field opens again. So a visitor who
// spins it twice gets two stories in order and never two men talking at once.
//
// WITH NO KEY there is no story at all. The globe spins, it stops, the event is emitted for
// anything that wants it, and the room says nothing — which is better than a canned affair.
//
// api: spin(v, tilt) · country · spinning · hitBox() · tapBox() · showSpinning() · update(ctx)
// events: props:globe { country, lon, lat, turns }
import * as THREE from 'three';
import { INK, drawTexture, paper, inkLine } from '../core/strokes.js';
import * as O from './props-objects.js';

// ---- THE SWITCHBOARD ---------------------------------------------------------------------------
// One set of pointer listeners on the glass for every prop the visitor is allowed to work, so that
// two of them never fight over the cursor and a drag that starts on one is never stolen by another.
// A switch is {name, hit(px, py, ev) → bool} plus whatever of enter/leave/down/move/up it wants.
// `claim(name, hit)` registers a hit test WITHOUT a switch behind it: props.js hands the radio's own
// test in that way, so the radio keeps the listeners it has had since round 8 and the globe simply
// declines any pointer the radio would take. First registered wins a contested pixel.
export function switchboard(ctx) {
  const glass = ctx.renderer?.domElement ?? null;
  const claims = []; // {name, hit}
  const list = []; // full switches, in registration order
  let over = null; // the switch the pointer is on
  let held = null; // the switch that took the pointerdown and owns the drag
  let cursorMine = false;

  function setCursor(want) {
    if (!glass) return;
    if (want) {
      glass.style.cursor = want;
      cursorMine = true;
    } else if (cursorMine) {
      // only ever put back what this arbiter put there: reveal, help and props share the cursor
      glass.style.cursor = '';
      cursorMine = false;
    }
  }
  function local(ev) {
    const r = glass?.getBoundingClientRect();
    if (!r?.width || !r?.height) return null;
    return [ev.clientX - r.left, ev.clientY - r.top];
  }
  // a claim is prior to every switch by definition: props.js hands in the radio's own test, so a
  // pointer the radio would take is never offered to anything registered here
  function claimed(px, py, ev) {
    for (const c of claims) {
      try {
        if (c.hit(px, py, ev)) return true;
      } catch {}
    }
    return false;
  }
  function under(px, py, ev) {
    if (claimed(px, py, ev)) return null;
    for (const sw of list) if (sw.hit(px, py, ev)) return sw;
    return null;
  }

  glass?.addEventListener('pointermove', (ev) => {
    const p = local(ev);
    if (!p) return;
    if (held) {
      held.move?.(p[0], p[1], ev);
      return;
    }
    if (ev.pointerType === 'touch') return; // a phone has no hover; the tap is the whole gesture
    const sw = under(p[0], p[1], ev);
    if (sw !== over) {
      over?.leave?.();
      over = sw;
      over?.enter?.();
    }
    setCursor(over?.cursor ?? (over ? 'pointer' : null));
  });
  glass?.addEventListener('pointerleave', (ev) => {
    if (held || ev.pointerType === 'touch') return;
    over?.leave?.();
    over = null;
    setCursor(null);
  });
  glass?.addEventListener('pointerdown', (ev) => {
    const p = local(ev);
    if (!p) return;
    const sw = under(p[0], p[1], ev);
    if (!sw) return;
    // flow.js reads any pointerdown on the window as the visitor skipping ahead through his line,
    // which a visitor reaching for a prop did not mean. The event stops here, and sound's own
    // first-gesture unlock — which lives on that same window — is called by hand.
    ctx.pieces.sound?.start?.();
    ev.stopPropagation();
    held = sw;
    sw.down?.(p[0], p[1], ev);
    if (sw.grab) setCursor(sw.grab);
  });
  const release = (ev) => {
    if (!held) return;
    const p = local(ev) ?? [0, 0];
    const sw = held;
    held = null;
    sw.up?.(p[0], p[1], ev);
    if (ev.pointerType === 'touch') {
      over?.leave?.();
      over = null;
      setCursor(null);
    } else setCursor(sw.cursor ?? 'pointer');
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  return {
    add(sw) {
      list.push(sw);
      return sw;
    },
    // a prior hit test with no switch behind it (props.js hands in the radio's)
    claim(name, hit) {
      claims.push({ name, hit });
    },
    get over() {
      return over?.name ?? null;
    },
    get held() {
      return held?.name ?? null;
    },
  };
}

// ---- THE MAP -----------------------------------------------------------------------------------
// The room's pen, on a globe. Sparse and un-named: a graticule of twelve meridians and five
// parallels with the equator drawn heavier, and the continents as solid ink masses with a drawn
// coast round them. That is the prop rule from round 1 — one solid black area, one bare white area
// — and it is also what a cheap paper globe from 1950 looks like from a metre away.
//
// The coastlines are hand-set in degrees, twenty to sixty points a landmass. They are a drawing and
// not a dataset: Norway has one fjord, the Gulf of Guinea is one curve, and nothing is labelled.
// The country is never read off this picture (see the head of this file); the table is.
const LAND = {
  eurasia: [
    [-9, 37], [-9, 43], [-1, 44], [-4, 48], [2, 51], [8, 54], [10, 57], [13, 55], [20, 55], [28, 60],
    [30, 66], [33, 69], [45, 68], [55, 72], [70, 72], [80, 74], [95, 78], [105, 77], [113, 74], [130, 72],
    [140, 73], [160, 70], [170, 68], [180, 66], [178, 62], [165, 60], [160, 58], [155, 52], [143, 46],
    [140, 42], [130, 43], [122, 39], [120, 36], [122, 31], [118, 24], [110, 21], [108, 10], [103, 1],
    [100, 6], [98, 14], [94, 16], [90, 22], [88, 21], [80, 15], [77, 8], [73, 15], [70, 22], [68, 24],
    [62, 25], [58, 23], [54, 17], [45, 12], [43, 13], [40, 20], [35, 28], [34, 31], [36, 36], [30, 36],
    [26, 40], [23, 38], [19, 40], [16, 42], [12, 45], [7, 44], [3, 43], [3, 42], [-2, 36],
  ],
  africa: [
    [-6, 36], [10, 37], [11, 33], [20, 32], [25, 32], [33, 31], [35, 28], [39, 18], [43, 12], [51, 12],
    [48, 4], [41, -2], [40, -10], [35, -17], [33, -26], [28, -33], [20, -35], [15, -27], [13, -18],
    [12, -8], [9, -1], [9, 4], [3, 6], [-5, 5], [-8, 4], [-13, 9], [-17, 15], [-17, 21], [-13, 28], [-10, 31],
  ],
  namerica: [
    [-168, 66], [-160, 71], [-140, 70], [-125, 70], [-110, 68], [-95, 68], [-85, 70], [-80, 73],
    [-70, 73], [-64, 60], [-56, 52], [-66, 45], [-70, 42], [-74, 39], [-76, 35], [-81, 31], [-80, 25],
    [-85, 30], [-90, 29], [-95, 29], [-97, 26], [-95, 19], [-91, 19], [-88, 21], [-87, 15], [-83, 9],
    [-79, 9], [-83, 15], [-92, 16], [-96, 16], [-105, 20], [-110, 24], [-114, 31], [-118, 34], [-122, 37],
    [-124, 43], [-124, 48], [-131, 53], [-137, 58], [-150, 60], [-158, 56], [-162, 60], [-165, 63],
  ],
  samerica: [
    [-79, 9], [-72, 12], [-64, 11], [-60, 8], [-52, 5], [-50, 0], [-44, -2], [-38, -5], [-35, -8],
    [-39, -14], [-41, -22], [-48, -25], [-53, -33], [-57, -38], [-62, -40], [-63, -45], [-68, -50],
    [-69, -54], [-74, -52], [-73, -45], [-73, -38], [-71, -30], [-70, -22], [-71, -18], [-76, -14],
    [-81, -6], [-80, -2], [-78, 1], [-77, 7],
  ],
  australia: [
    [113, -22], [114, -26], [116, -32], [121, -34], [129, -32], [135, -35], [138, -35], [141, -38],
    [147, -38], [150, -37], [153, -28], [146, -19], [142, -11], [137, -12], [136, -15], [131, -12],
    [126, -14], [122, -17],
  ],
  greenland: [[-45, 60], [-52, 64], [-53, 68], [-58, 72], [-62, 76], [-58, 80], [-45, 83], [-30, 82], [-22, 76], [-25, 70], [-38, 66]],
  britain: [[-5, 50], [-5, 53], [-3, 55], [-6, 58], [-3, 58], [0, 54], [1, 52]],
  ireland: [[-10, 52], [-10, 55], [-6, 55], [-6, 52]],
  iceland: [[-24, 65], [-14, 66], [-14, 64], [-22, 63]],
  madagascar: [[44, -12], [50, -15], [50, -22], [45, -25], [43, -20]],
  japan: [[130, 32], [135, 34], [140, 36], [142, 42], [145, 44], [141, 45], [138, 37], [132, 34]],
  borneo: [[109, 2], [117, 7], [119, 1], [116, -4], [110, -3]],
  sumatra: [[95, 5], [100, 3], [106, -6], [102, -5]],
  newguinea: [[131, -1], [141, -3], [150, -9], [145, -8], [138, -8], [132, -4]],
  newzealand: [[173, -35], [178, -38], [177, -40], [174, -41], [172, -44], [168, -47], [166, -45], [172, -41]],
};

// WHY 512 x 256 AND NOT 1024. The map is drawn at the size the room actually uses it, because the
// ink pass measures that and acts on it. It writes TEXELS OF A SURFACE'S OWN DRAWING PER SCREEN
// PIXEL into the g-buffer, and past nine of them it stops copying a drawing out and states the tone
// instead — a hand faced with lettering it cannot write leaves the plate blank. Measured with
// tools/_tmp probes at the home plate, the globe is 46 px across and a 1024-wide map lands at 15
// texels a pixel: three quarters of every coastline was being dropped and Africa arrived as the
// palest hatch level, which is to say as a blank white ball. At 512 the same sphere reads 7.5 and
// the pen draws the coasts at full ink. There is no shot in the film that wants more: the globe is
// 37 px in the wide, 46 in the home and 45 on a phone.
export function worldMapTexture(seed = 23) {
  return drawTexture(
    512,
    256,
    (g, W, H, rng) => {
      paper(g, W, H, '#f8f5ee', { grain: 0, seed });
      const x = (lon) => ((lon + 180) / 360) * W;
      const y = (lat) => ((90 - lat) / 180) * H;
      const o = { width: 1.6, wobble: 0.7, rng };
      // the graticule, under the land: twelve meridians and five parallels, the equator heaviest
      for (let i = 0; i <= 12; i++) inkLine(g, (i / 12) * W, 0, (i / 12) * W, H, { ...o, width: 1.2, alpha: 0.5 });
      for (const lat of [66, 40, 0, -40, -66]) {
        const yy = y(lat);
        inkLine(g, 0, yy, W, yy, { ...o, width: lat === 0 ? 2.0 : 1.2, alpha: lat === 0 ? 0.85 : 0.5 });
      }
      // the land: a jittered fill, then the coast struck over it with the pen. Each mass is drawn
      // three times, a world's width apart, so nothing is cut in half at the seam behind the arc.
      for (const key of Object.keys(LAND)) {
        const deg = LAND[key];
        for (const shift of [-W, 0, W]) {
          const pts = deg.map(([lon, lat]) => [x(lon) + shift + (rng() - 0.5) * 1.5, y(lat) + (rng() - 0.5) * 1.5]);
          if (pts.length < 3) continue;
          g.save();
          g.fillStyle = INK;
          g.beginPath();
          pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
          g.closePath();
          g.fill();
          g.restore();
          const ring = [...pts, pts[0]];
          for (let i = 0; i < ring.length - 1; i++)
            inkLine(g, ring[i][0], ring[i][1], ring[i + 1][0], ring[i + 1][1], { width: 1.8, wobble: 0.6, rng, alpha: 0.95 });
        }
      }
    },
    { seed },
  );
}

// ---- THE TABLE ---------------------------------------------------------------------------------
// Fifty anchors, [name, longitude, latitude]. Every longitude band of the world has one within
// about twenty degrees, so a spin that stops over the middle of the Pacific is answered with the
// nearest land and never with the sea. Two thirds of these he could plausibly have been to on a
// holiday; the rest are the joke of a globe you spin without looking.
const COUNTRIES = [
  ['Iceland', -19, 65], ['Ireland', -8, 53], ['Portugal', -8, 39], ['Spain', -4, 40], ['Morocco', -6, 32],
  ['Senegal', -15, 14], ['France', 2, 47], ['Nigeria', 8, 10], ['Norway', 9, 61], ['Italy', 12, 43],
  ['Namibia', 17, -22], ['Poland', 20, 52], ['Congo', 22, -3], ['Greece', 22, 39], ['South Africa', 25, -30],
  ['Finland', 26, 64], ['Egypt', 30, 27], ['Turkey', 33, 39], ['Kenya', 38, 0], ['Russia', 40, 56],
  ['Ethiopia', 40, 9], ['Madagascar', 47, -19], ['Iran', 53, 32], ['Oman', 56, 21], ['Kazakhstan', 68, 48],
  ['India', 78, 21], ['Sri Lanka', 81, 7], ['Nepal', 84, 28], ['Thailand', 101, 15], ['Mongolia', 103, 47],
  ['China', 110, 32], ['Indonesia', 118, -3], ['the Philippines', 122, 12], ['Australia', 134, -25],
  ['Japan', 138, 37], ['Papua New Guinea', 145, -6], ['New Zealand', 173, -41], ['Fiji', 178, -18],
  ['Canada', -110, 56], ['Mexico', -102, 23], ['the United States', -100, 39], ['Guatemala', -90, 15],
  ['Cuba', -79, 22], ['Peru', -75, -10], ['Colombia', -74, 4], ['Chile', -71, -33], ['Venezuela', -66, 7],
  ['Argentina', -64, -35], ['Uruguay', -56, -33], ['Brazil', -50, -12],
];
// how far the drag's vertical carries: full up is the Arctic circle, full down is the Cape
const LAT_SPAN = 55, LAT_BIAS = 10;
// what a degree of latitude is worth against a degree of longitude. Under 1 the longitude the spin
// chose keeps the last word, which is the point of spinning it; the tilt decides within the band.
const LAT_WEIGHT = 0.75;

function wrap180(d) {
  return ((((d + 180) % 360) + 360) % 360) - 180;
}
export function countryAt(lon, tilt = 0) {
  const latTarget = LAT_BIAS + Math.max(-1, Math.min(1, tilt)) * LAT_SPAN;
  let best = COUNTRIES[0], bestScore = Infinity;
  for (const c of COUNTRIES) {
    const s = Math.abs(wrap180(c[1] - lon)) + LAT_WEIGHT * Math.abs(c[2] - latTarget);
    if (s < bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return { country: best[0], lon: best[1], lat: best[2] };
}

// ---- THE OBJECT --------------------------------------------------------------------------------
const TILT = 0.4; // the axis, as props-objects drew it
const SPHERE_R = 0.08;
const CENTRE_Y = 0.13;
const MIN_TAP = 44; // px: what a thumb needs, whatever the sphere measures on the glass
const MIN_V = 0.18; // the feeblest flick that still counts as a spin
const TAP_PX = 7; // a pointer that moved less than this and let go quickly is a tap

// Where the sphere's own texture meets the pointer. Derived once in the head of this file, and the
// tilt drops out of it: rotating about Z leaves a point's z alone, so the meridian standing nearest
// the camera is the one at u = (pi/2 - a) / 2pi whatever the axis is leaning at.
export function lonUnderPointer(a) {
  return wrap180(-90 - (a * 180) / Math.PI);
}

export function eggGlobe(ctx, { object = null, switches = null } = {}) {
  const glass = ctx.renderer?.domElement ?? null;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const sphere = object?.children?.find((c) => c.isMesh && c.geometry?.type === 'SphereGeometry') ?? null;

  // THE MAP, on this sphere alone. props-objects' `materials()` is a shared cache and its `globe`
  // material is also on a pair of 3.5 cm jars in a shelf row; a clone keeps the map here.
  if (sphere) {
    sphere.material = sphere.material.clone();
    sphere.material.map = worldMapTexture(23);
    sphere.material.needsUpdate = true;
    sphere.rotation.order = 'ZYX'; // spin about its own axis FIRST, then lean the axis over
    sphere.rotation.set(0, 0, TILT);
  }
  // THE POINTER: a small needle standing off the northern front of the sphere, on the meridian that
  // is read, aimed at the middle of the earth. It does not turn with the sphere — that is the whole
  // of its job.
  //
  // It is PAPER with the pen's contour round it (`metal`, the same material the room's small
  // fittings are), and that is a correction and not a preference: struck in solid ink it disappeared
  // the moment a continent came round under it, and a pointer you can only see over the sea is not
  // one. White with a line round it reads against the land and against the water both.
  //
  // Where it can stand is decided by the mounting arc, which is a half-ring in the plane of the
  // frame and therefore covers the whole left of the sphere and its two poles. The meridian being
  // read projects to a straight line between those poles, so everything on it is inside the disc,
  // foreshortened; 42 degrees north puts the needle at about three quarters of the way out toward
  // the upper left, over the face, clear of the arc. At 41 px of globe in `home` it is two pixels
  // and the reading point is simply the middle of the disc; the needle is for anyone who comes
  // close enough to ask which meridian it means.
  if (object) {
    const lat = (42 * Math.PI) / 180;
    const d = new THREE.Vector3(0, Math.sin(lat), Math.cos(lat)).applyAxisAngle(new THREE.Vector3(0, 0, 1), TILT);
    const pin = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.026, 3), O.materials().metal);
    pin.position.copy(d).multiplyScalar(0.094).add(new THREE.Vector3(0, CENTRE_Y, 0));
    pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().negate());
    pin.name = 'globe-pointer';
    object.add(pin);
    object.name = 'globe';
  }

  // the seeded rng for a tap, which has no direction of its own to take one from
  let taps = 0;
  const tapRng = () => {
    const n = Math.sin((ctx.seed ?? 1) * 12.9898 + ++taps * 78.233) * 43758.5453;
    return n - Math.floor(n);
  };

  let angle = 0; // where the sphere stands, radians
  let from = 0, delta = 0, steps = 0; // the throw in progress
  // WHICH STEP OF THE THROW WE ARE ON IS READ OFF THE CLOCK, NOT COUNTED. The judging browser runs
  // software WebGL at four or five frames a second, so `update` is called once for every three or
  // four steps of the 12 fps clock; a counter incremented per call ran the spin at a third speed
  // and, on a very slow frame, straight past its own last step and never landed. `clock.frame` is
  // the film's own frame number and it is the only honest clock here — the same arithmetic the
  // radio's needle throw is on.
  let frame0 = -1e9; // clock.frame when the throw began; -1e9 is 'not turning'
  let pinned = -1; // a judging still holds one step for ever
  let tilt = 0; // the drag's vertical, -1..1, carried to the landing
  let landed = null; // the country, waiting for a gap in his talking
  let out = null; // the country last handed over
  let drag = null; // the pointer that has hold of it

  function box() {
    if (!sphere) return null;
    sphere.updateMatrixWorld(true);
    const W = ctx.size?.w || window.innerWidth, H = ctx.size?.h || window.innerHeight;
    const xs = [], ys = [];
    const v = new THREE.Vector3();
    for (const dx of [-SPHERE_R, SPHERE_R]) for (const dy of [-SPHERE_R, SPHERE_R]) for (const dz of [-SPHERE_R, SPHERE_R]) {
      v.set(dx, dy, dz);
      sphere.localToWorld(v).project(ctx.camera);
      xs.push(((v.x + 1) / 2) * W);
      ys.push(((1 - v.y) / 2) * H);
    }
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  // the sphere's own box grown about its centre to at least a thumb's width, the extra falling on
  // the bare top of the bookcase where nothing else is clickable
  function tapBox() {
    const b = box();
    if (!b) return null;
    const w = Math.max(b.w, MIN_TAP), h = Math.max(b.h, MIN_TAP);
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, grown: w > b.w || h > b.h };
  }
  function onGlobe(px, py) {
    if (!glass || !sphere) return false;
    const r = glass.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    ndc.set((px / r.width) * 2 - 1, -(py / r.height) * 2 + 1);
    ray.setFromCamera(ndc, ctx.camera);
    if (ray.intersectObject(object, true).length) return true;
    const b = tapBox();
    return !!b && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
  }

  // He is talking when the field is shut. With no evening running — a judging view, a tool — there
  // is nobody to interrupt and the country goes out at once.
  function roomIsListening() {
    const F = ctx.pieces.flow;
    if (!F || F.beat === 'idle') return true;
    return ctx.pieces.dialogue?.asking === true;
  }
  function hand() {
    if (!landed) return;
    const it = landed;
    landed = null;
    out = it.country;
    ctx.pieces.pepeAnim?.react?.();
    ctx.emit?.('props:globe', it);
  }

  function pose(step) {
    if (!sphere) return;
    const u = steps > 0 ? Math.max(0, Math.min(1, step / steps)) : 1;
    const eased = 1 - Math.pow(1 - u, 2.6); // fast, then long and slow, then nothing
    sphere.rotation.y = angle = from + delta * eased;
    // and a little rock in the cradle, dying with the spin: the one thing on the shelf that moves
    sphere.rotation.z = TILT + 0.05 * Math.sin(step * 0.8) * Math.pow(1 - u, 2);
  }

  const api = {
    hitBox: box,
    tapBox,
    get spinning() {
      if (pinned >= 0) return true; // a judging still is a frame of a spin, held
      return frame0 > -1e8 && ctx.clock.frame - frame0 < steps;
    },
    get country() {
      return out;
    },
    // the pending one, held back because he is still speaking
    get held() {
      return landed?.country ?? null;
    },
    // v: how hard, -1..1 (the sign is the direction; 0 or nothing means a tap's own throw).
    // t: the drag's vertical, -1..1, which tilts the reading north or south.
    spin(v = 0, t = 0) {
      if (v && typeof v === 'object') {
        const o = v;
        v = o.v ?? 0;
        t = o.tilt ?? t;
      }
      let mag = Math.abs(+v || 0), dir = (+v || 0) < 0 ? -1 : 1;
      if (mag < 1e-3) {
        mag = 0.35 + tapRng() * 0.6;
        dir = tapRng() < 0.5 ? -1 : 1;
        t = t || (tapRng() - 0.5) * 1.4;
      }
      mag = Math.max(MIN_V, Math.min(1, mag));
      tilt = Math.max(-1, Math.min(1, +t || 0));
      from = angle;
      delta = dir * (2 + mag * 9) * Math.PI * 2;
      steps = Math.round(30 + mag * 26); // 12 fps: two and a half to nearly five seconds
      frame0 = ctx.clock.frame;
      pinned = -1;
      landed = null;
      ctx.pieces.sound?.play?.('creak');
      pose(0);
      return api;
    },
    // THE JUDGING STILL: a definite step of a definite throw, held for ever, and aimed so that the
    // meridian under the pointer has LAND on it. A spin is a real rotation and two thirds of the
    // world is water, so an un-aimed still is as likely as not to be a frame of the middle of the
    // Pacific — a bare white ball, which says nothing about the drawing. The throw is unchanged;
    // the sphere simply started a little further round.
    showSpinning(lon = 12) {
      api.spin(0.62, 0);
      pinned = 12;
      const eased = 1 - Math.pow(1 - pinned / steps, 2.6);
      from = (-(lon + 90) * Math.PI) / 180 - delta * eased; // lonUnderPointer(a) = -90 - deg(a)
      pose(pinned);
    },
    reset() {
      frame0 = -1e9;
      pinned = -1;
      steps = 0;
      delta = 0;
      landed = null;
      out = null;
      if (sphere) sphere.rotation.set(0, (angle = from = 0), TILT);
    },
    update() {
      if (pinned >= 0) {
        pose(pinned);
        return;
      }
      if (frame0 > -1e8) {
        const k = ctx.clock.frame - frame0;
        pose(Math.min(k, steps));
        if (k >= steps) {
          frame0 = -1e9;
          ctx.pieces.sound?.play?.('latch');
          const lon = lonUnderPointer(angle);
          const hit = countryAt(lon, tilt);
          landed = { ...hit, at: +lon.toFixed(1), tilt: +tilt.toFixed(3), turns: +Math.abs(delta / (Math.PI * 2)).toFixed(2) };
        }
      }
      if (landed && roomIsListening()) hand();
    },
  };

  // ---- the visitor's hand ----------------------------------------------------------------------
  // A drag across the sphere spins it: how far it went sideways is how hard, how far it went up or
  // down is the latitude. A tap — anything under seven pixels and under a third of a second — is a
  // flick with no direction in it, so the seeded rng gives it one. That is the phone's whole gesture
  // and it is also what a person does to a globe they are not really looking at.
  switches?.add({
    name: 'globe',
    object: () => object,
    cursor: 'grab',
    grab: 'grabbing',
    hit: (px, py) => onGlobe(px, py),
    down(px, py) {
      drag = { x0: px, y0: py, x: px, y: py, t0: performance.now(), far: 0 };
    },
    move(px, py) {
      if (!drag) return;
      drag.far = Math.max(drag.far, Math.hypot(px - drag.x0, py - drag.y0));
      drag.x = px;
      drag.y = py;
    },
    up(px, py) {
      const d = drag;
      drag = null;
      // A hand may catch a turning globe and throw it again; the throw simply starts over from
      // where the sphere stands, and the country that was waiting to be told is given up with it.
      if (!d) return;
      const span = Math.max(120, Math.min(ctx.size?.w || 1280, ctx.size?.h || 800) * 0.35);
      const dx = px - d.x0, dy = py - d.y0;
      const ms = performance.now() - d.t0;
      if (d.far < TAP_PX && ms < 320) api.spin(0);
      else api.spin(Math.max(-1, Math.min(1, dx / span)), Math.max(-1, Math.min(1, -dy / span)));
    },
  });

  return api;
}
