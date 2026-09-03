// Deterministic random so a `?seed=` screenshot is reproducible.
export function mulberry32(seed = 1) {
  let a = seed >>> 0 || 1;
  const rng = () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.range = (lo, hi) => lo + (hi - lo) * rng();
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.shuffle = (arr) => {
    const a2 = arr.slice();
    for (let i = a2.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a2[i], a2[j]] = [a2[j], a2[i]];
    }
    return a2;
  };
  rng.fork = (salt) => mulberry32((seed * 1013904223 + salt * 1664525) >>> 0);
  return rng;
}

// Cheap hash noise for per-frame "boil" (hand-drawn jitter). Returns -1..1.
export function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}
export const boil = (frame, salt = 0, amp = 1) => hash(frame * 7.13 + salt * 3.71) * amp;
