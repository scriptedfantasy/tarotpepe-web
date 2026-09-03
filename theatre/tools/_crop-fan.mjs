// Crop a region of a shot (default: the fan on the cloth) and scale it up for reading.
//   node tools/_crop-fan.mjs <in.png> <out.png> [x,y,w,h] [scale]
import sharp from 'sharp';
const [inp, out, box = '420,620,900,280', scale = '2'] = process.argv.slice(2);
const [left, top, width, height] = box.split(',').map(Number);
await sharp(inp).extract({ left, top, width, height }).resize(Math.round(width * +scale), Math.round(height * +scale), { kernel: 'lanczos3' }).png().toFile(out);
console.log('wrote', out);
