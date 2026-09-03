// Crop Pepe's head+hands region out of each tile of a pepeAnim contact sheet into one strip so the
// mouth, eyes and hands can be checked at full resolution.  node tools/_crop-pepe-heads.mjs in.png out.png [x y w h]
import sharp from 'sharp';

const [inp, out, X = '260', Y = '90', W = '280', H = '340'] = process.argv.slice(2);
const x0 = +X, y0 = +Y, w = +W, h = +H;
const meta = await sharp(inp).metadata();
const cols = 4, rows = 2;
const cw = meta.width / cols, ch = meta.height / rows;
const tiles = [];
for (let i = 0; i < 8; i++) {
  const left = Math.round((i % cols) * cw + x0), top = Math.round(Math.floor(i / cols) * ch + y0);
  tiles.push(await sharp(inp).extract({ left, top, width: w, height: h }).resize(w * 2, h * 2, { kernel: 'nearest' }).png().toBuffer());
}
await sharp({ create: { width: w * 2 * 4, height: h * 2 * 2, channels: 3, background: '#222' } })
  .composite(tiles.map((input, i) => ({ input, left: (i % 4) * w * 2, top: Math.floor(i / 4) * h * 2 })))
  .png()
  .toFile(out);
console.log('wrote', out);
