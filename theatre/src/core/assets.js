import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Tracked loaders so a screenshot can wait for everything (`await ctx.assets.settle()`).
export function createAssets(renderer) {
  const tl = new THREE.TextureLoader();
  const gl = new GLTFLoader();
  const pending = new Set();
  const cache = new Map();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const track = (p) => {
    pending.add(p);
    p.catch(() => {}).finally(() => pending.delete(p));
    return p;
  };
  return {
    texture(url, { srgb = true, repeat = null, anisotropy = true } = {}) {
      const key = url + (srgb ? ':s' : ':l');
      if (cache.has(key)) return cache.get(key);
      const p = track(
        new Promise((res, rej) =>
          tl.load(
            url,
            (t) => {
              t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
              if (anisotropy) t.anisotropy = maxAniso;
              if (repeat) {
                t.wrapS = t.wrapT = THREE.RepeatWrapping;
                t.repeat.set(repeat[0], repeat[1]);
              }
              res(t);
            },
            undefined,
            rej,
          ),
        ),
      );
      cache.set(key, p);
      return p;
    },
    gltf(url) {
      if (cache.has(url)) return cache.get(url);
      const p = track(new Promise((res, rej) => gl.load(url, res, undefined, rej)));
      cache.set(url, p);
      return p;
    },
    cardUrl: (slug) => `/cards/${slug}.webp`,
    cardBackUrl: () => `/cards/tarotcard-backside.webp`,
    async settle() {
      let guard = 0;
      while (pending.size && guard++ < 50) await Promise.allSettled([...pending]);
    },
    get pendingCount() {
      return pending.size;
    },
  };
}
