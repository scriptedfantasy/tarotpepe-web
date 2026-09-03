// PIECE: lighting — the tone design. In an ink world "light" means where the hatching goes:
// one warm key from the window side, a soft fill, practicals (lamp, candle) that glow.
// The ink pass reads scene lighting to decide hatch density, so this piece shapes the drawing.
import * as THREE from 'three';

export const meta = {
  name: 'lighting',
  judge: { shot: 'home', states: ['default', 'evening', 'lamp'] },
  files: ['src/pieces/lighting.js'],
};

export async function build(ctx) {
  const g = new THREE.Group();
  g.name = 'lighting';
  const key = new THREE.DirectionalLight('#fff4e0', 2.2);
  key.position.set(-2.2, 2.8, 1.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -3.5;
  key.shadow.camera.right = 3.5;
  key.shadow.camera.top = 3.5;
  key.shadow.camera.bottom = -3.5;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 12;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  g.add(key);
  const fill = new THREE.HemisphereLight('#f7f1e6', '#c9bda6', 0.9);
  g.add(fill);
  const lamp = new THREE.PointLight('#ffd9a0', 0.8, 4, 1.5);
  lamp.position.set(1.6, 1.6, -1.6);
  g.add(lamp);
  ctx.scene.add(g);
  return {
    group: g,
    key,
    fill,
    lamp,
    setState(name) {
      if (name === 'evening') {
        key.intensity = 1.2;
        lamp.intensity = 2.5;
      } else if (name === 'lamp') {
        key.intensity = 0.4;
        lamp.intensity = 4;
      } else {
        key.intensity = 2.2;
        lamp.intensity = 0.8;
      }
    },
  };
}
