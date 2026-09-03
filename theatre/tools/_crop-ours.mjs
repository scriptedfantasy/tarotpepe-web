// scratch: crop regions of our frame at 2x to inspect detail
import sharp from 'sharp';
const src = process.argv[2];
const outBase = process.argv[3];
const crops = {
  left: [60, 120, 620, 640],
  centre: [560, 100, 500, 420],
  right: [1000, 100, 580, 640],
};
for (const [name, [x, y, w, h]] of Object.entries(crops)) {
  await sharp(src).extract({ left: x, top: y, width: w, height: h }).resize({ width: w * 2, kernel: 'nearest' }).png().toFile(`${outBase}-${name}.png`);
}
console.log('ok');
