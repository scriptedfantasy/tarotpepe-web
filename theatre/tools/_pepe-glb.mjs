// Inspect head-lowpoly.glb: mesh names, vertex counts, accessor bounds.
import { readFileSync } from 'node:fs';
const buf = readFileSync(new URL('../public/pepe/head-lowpoly.glb', import.meta.url));
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const jsonLen = dv.getUint32(12, true);
const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf.buffer, buf.byteOffset + 20, jsonLen)));
console.log('nodes', json.nodes.map((n) => ({ name: n.name, mesh: n.mesh, t: n.translation, r: n.rotation, s: n.scale })));
for (const m of json.meshes) {
  for (const p of m.primitives) {
    const acc = json.accessors[p.attributes.POSITION];
    const idx = p.indices != null ? json.accessors[p.indices] : null;
    console.log(m.name, 'verts', acc.count, 'tris', idx ? idx.count / 3 : acc.count / 3, 'min', acc.min.map((v) => v.toFixed(3)), 'max', acc.max.map((v) => v.toFixed(3)));
  }
}
