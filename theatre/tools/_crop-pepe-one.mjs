// Crop Pepe out of one or more 1600x900 frames into a side-by-side strip at 2x.
//   node tools/_crop-pepe-one.mjs out.png in1.png in2.png ...
import sharp from 'sharp';

const [out, ...ins] = process.argv.slice(2);
const x0 = 500, y0 = 150, w = 600, h = 720;
const tiles = [];
for (const inp of ins) tiles.push(await sharp(inp).extract({ left: x0, top: y0, width: w, height: h }).resize(w, h).png().toBuffer());
await sharp({ create: { width: w * ins.length, height: h, channels: 3, background: '#222' } })
  .composite(tiles.map((input, i) => ({ input, left: i * w, top: 0 })))
  .png()
  .toFile(out);
console.log('wrote', out);
