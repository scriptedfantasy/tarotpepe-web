// Stop-motion clock. Everything hand-animated (puppet, cards, props) reads `t` / `frame`, which
// only advance 12 times a second ("on twos"). Camera moves and post effects may read `raw`.
export const FPS = 12;

export function createClock({ freezeAt = null, speed = 1 } = {}) {
  const start = performance.now();
  const c = {
    raw: 0, // smooth seconds
    t: 0, // stepped seconds (multiples of 1/12)
    frame: 0, // integer frame count at 12 fps
    dt: 0, // stepped delta (0 when the 12fps clock did not advance this tick)
    stepped: false, // true on ticks where `frame` changed
    fps: FPS,
    frozen: freezeAt != null,
  };
  c.tick = () => {
    const ms = freezeAt != null ? freezeAt * 1000 : (performance.now() - start) * speed;
    c.raw = ms / 1000;
    const frame = Math.floor(c.raw * FPS + 1e-6);
    c.stepped = frame !== c.frame || c.frozen;
    c.dt = frame !== c.frame ? (frame - c.frame) / FPS : 0;
    c.frame = frame;
    c.t = frame / FPS;
  };
  return c;
}

// Quantise any smooth value to the 12fps grid, for things that must not glide.
export const step = (seconds) => Math.floor(seconds * FPS + 1e-6) / FPS;

// A hold-then-snap easing: stays put, then moves in a few stepped frames. Returns 0..1.
export function snapEase(u) {
  u = Math.min(1, Math.max(0, u));
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
}
