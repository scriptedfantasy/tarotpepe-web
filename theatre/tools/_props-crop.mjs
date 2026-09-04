// node tools/_props-crop.mjs <src.png> <out.png> x y w h   (fractions 0..1), upscaled 2x
import sharp from 'sharp';
const [src, out, x, y, w, h, up = '2'] = process.argv.slice(2);
const im = sharp(src);
const { width: W, height: H } = await im.metadata();
const L = Math.round(+x * W), T = Math.round(+y * H), CW = Math.round(+w * W), CH = Math.round(+h * H);
await im.extract({ left: L, top: T, width: CW, height: CH }).resize(Math.round(CW * +up)).toFile(out);
console.log(out, CW, CH);
