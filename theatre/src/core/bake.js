// Baked assets. Drawing a dense pen pattern onto a canvas at build time can take seconds (tens of
// seconds in the software-rendered judging browser). Anything deterministic is therefore baked to a
// file under public/baked/ by `node tools/bake.mjs`, and loaded from there when present.
//
//   const tex  = await bakedTexture('card-back', 1024, 1792, (g, w, h) => drawBack(g, w, h), { anisotropy: 16, deps: [drawBack] });
//   const data = await bakedLevels('ink-wall', 512, 512, () => packedRGBA);      // Uint8Array(w*h*4)
//   const json = await bakedJSON('pepe-mouth-field', () => computeField(), { deps: [buildMouth] });
//
// The file name carries a hash of the drawing function's source (plus `deps`), so editing the
// drawing code silently falls back to live drawing until `node tools/bake.mjs` is run again.
// `?bake=1` forces live drawing and registers every result on window.__bake for the tool to save;
// `?nobake=1` just forces live drawing.
import * as THREE from 'three';
import { makeCanvas, canvasTexture } from './strokes.js';

const params = new URLSearchParams(location.search);
export const BAKING = params.get('bake') === '1';
const FORCE_LIVE = BAKING || params.get('nobake') === '1';
let manifestP = null;

function manifest() {
  if (!manifestP) manifestP = fetch('/baked/manifest.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  return manifestP;
}

export function hashSource(...srcs) {
  let h = 2166136261;
  for (const s of srcs.map((x) => (typeof x === 'function' ? x.toString() : String(x)))) {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
  }
  return h.toString(16).padStart(8, '0');
}

function register(key, kind, payload) {
  (window.__bake ??= {})[key] = { kind, payload };
}

async function baked(key) {
  if (FORCE_LIVE) return null;
  const m = await manifest();
  return m[key] ?? null;
}

function loadImage(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('failed to load ' + url));
    img.src = url;
  });
}

const keyFor = (name, draw, deps = []) => `${name}-${hashSource(draw, ...deps)}`;

// A drawn texture. draw(g, w, h) paints a fresh canvas. Options: srgb, repeat, anisotropy, deps.
export async function bakedTexture(name, w, h, draw, { srgb = true, repeat = null, anisotropy = 8, deps = [] } = {}) {
  const key = keyFor(name, draw, deps);
  const entry = await baked(key);
  if (entry) {
    try {
      const img = await loadImage(`/baked/${entry.file}`);
      const t = new THREE.Texture(img);
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = anisotropy;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      if (repeat) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(repeat[0], repeat[1]);
      }
      t.needsUpdate = true;
      return t;
    } catch (e) {
      console.warn('[bake] falling back to live drawing for', key, e);
    }
  }
  const c = makeCanvas(w, h);
  draw(c.getContext('2d'), w, h);
  if (BAKING) register(key, 'png', c.toDataURL('image/png'));
  return canvasTexture(c, { srgb, repeat, anisotropy });
}

// Packed 4-channel 8-bit data (w*h*4), e.g. four tone levels in R/G/B/A. Baked as one opaque PNG
// holding the channels as four grayscale tiles in a 2x2 grid, so alpha premultiplication can never
// touch the data. compute() returns the Uint8Array.
export async function bakedLevels(name, w, h, compute, { deps = [] } = {}) {
  const key = keyFor(name, compute, deps);
  const entry = await baked(key);
  if (entry) {
    try {
      const img = await loadImage(`/baked/${entry.file}`);
      const c = makeCanvas(w * 2, h * 2);
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      const px = g.getImageData(0, 0, w * 2, h * 2).data;
      const out = new Uint8Array(w * h * 4);
      for (let ch = 0; ch < 4; ch++) {
        const ox = (ch % 2) * w, oy = Math.floor(ch / 2) * h;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[(y * w + x) * 4 + ch] = px[((y + oy) * w * 2 + x + ox) * 4];
      }
      return out;
    } catch (e) {
      console.warn('[bake] falling back to live compute for', key, e);
    }
  }
  const out = await compute();
  if (BAKING) {
    const c = makeCanvas(w * 2, h * 2);
    const g = c.getContext('2d');
    const id = g.createImageData(w * 2, h * 2);
    for (let ch = 0; ch < 4; ch++) {
      const ox = (ch % 2) * w, oy = Math.floor(ch / 2) * h;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const v = out[(y * w + x) * 4 + ch];
          const o = ((y + oy) * w * 2 + x + ox) * 4;
          id.data[o] = id.data[o + 1] = id.data[o + 2] = v;
          id.data[o + 3] = 255;
        }
    }
    g.putImageData(id, 0, 0);
    register(key, 'png', c.toDataURL('image/png'));
  }
  return out;
}

// Any JSON-serialisable result of an expensive deterministic computation.
export async function bakedJSON(name, compute, { deps = [] } = {}) {
  const key = keyFor(name, compute, deps);
  const entry = await baked(key);
  if (entry) {
    try {
      const r = await fetch(`/baked/${entry.file}`);
      if (r.ok) return await r.json();
    } catch (e) {
      console.warn('[bake] falling back to live compute for', key, e);
    }
  }
  const v = await compute();
  if (BAKING) register(key, 'json', JSON.stringify(v));
  return v;
}
