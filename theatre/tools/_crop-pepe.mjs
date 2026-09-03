// Crop a region of a shot and scale it up, for a close look. node tools/_crop-pepe.mjs in.png out.png x y w h [scale]
import sharp from 'sharp';
const [inp, out, x, y, w, h, scale = '2'] = process.argv.slice(2);
await sharp(inp)
  .extract({ left: +x, top: +y, width: +w, height: +h })
  .resize(Math.round(+w * +scale), Math.round(+h * +scale), { kernel: 'lanczos3' })
  .png()
  .toFile(out);
console.log('wrote', out);
