// Inspect a GLB: nodes, meshes, primitives, materials, accessor bounds.
import { readFileSync } from 'node:fs';
const file = process.argv[2];
const buf = readFileSync(file);
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
const out = {
  nodes: json.nodes?.map((n, i) => ({ i, name: n.name, mesh: n.mesh, children: n.children, t: n.translation, r: n.rotation, s: n.scale })),
  meshes: json.meshes?.map((m, i) => ({
    i,
    name: m.name,
    prims: m.primitives.map((p) => ({
      mat: p.material,
      attrs: p.attributes,
      count: json.accessors[p.attributes.POSITION].count,
      idx: p.indices != null ? json.accessors[p.indices].count : null,
      min: json.accessors[p.attributes.POSITION].min,
      max: json.accessors[p.attributes.POSITION].max,
    })),
  })),
  materials: json.materials?.map((m, i) => ({ i, name: m.name, pbr: m.pbrMetallicRoughness, alphaMode: m.alphaMode, doubleSided: m.doubleSided })),
  textures: json.textures,
  images: json.images?.map((im) => ({ name: im.name, mime: im.mimeType, uri: im.uri?.slice(0, 40) })),
  scenes: json.scenes,
};
console.log(JSON.stringify(out, null, 1));
