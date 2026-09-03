// throwaway: crop a region of a shot and blow it up, to look at the lettering close.
//   node tools/_crop.mjs <png> <xFrac> <yFrac> <wFrac> <hFrac> <out.png>
import sharp from 'sharp';
const [file, x, y, w, h, out] = process.argv.slice(2);
const img = sharp(file);
const { width, height } = await img.metadata();
const left = Math.round(+x * width), top = Math.round(+y * height);
const cw = Math.round(+w * width), ch = Math.round(+h * height);
await img.extract({ left, top, width: cw, height: ch }).resize(Math.min(1400, cw * 2)).png().toFile(out);
console.log('wrote', out, cw + 'x' + ch);
