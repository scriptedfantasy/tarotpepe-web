// crop a region of a png and scale it up: node _crop.mjs in.png out.png left top width height [scale]
import sharp from 'sharp';
const [inp, out, l, t, w, h, s] = process.argv.slice(2);
const scale = +(s ?? 2);
await sharp(inp)
  .extract({ left: +l, top: +t, width: +w, height: +h })
  .resize(Math.round(+w * scale), Math.round(+h * scale), { kernel: 'lanczos3' })
  .png()
  .toFile(out);
console.log('wrote', out);
