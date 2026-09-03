// node tools/_crop.mjs <in> <out> x,y,w,h [scale]
import sharp from 'sharp';
const [inp, out, box, scale] = process.argv.slice(2);
const [x, y, w, h] = box.split(',').map(Number);
const k = +(scale ?? 1);
let img = sharp(inp).extract({ left: x, top: y, width: w, height: h });
if (k !== 1) img = img.resize(Math.round(w * k), Math.round(h * k), { kernel: k > 1 ? 'nearest' : 'lanczos3' });
await img.png().toFile(out);
console.log('wrote', out);
