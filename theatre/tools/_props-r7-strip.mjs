import sharp from 'sharp';
const S = '/private/tmp/claude-501/-Users-workbook2024-Development-tarotpepe/cc57e9bc-ec5d-43c5-990a-77e7f38339a7/scratchpad';
// the clock in the `home` frame, 1600x900: dial centre (804,200), 100 px box round it
const BOX = { left: 758, top: 154, width: 96, height: 96 };
const K = 4;
const files = ['home-1504.png', 'home-0630.png', 'home-0947.png'];
const tiles = [];
for (const f of files) {
  tiles.push(await sharp(`${S}/${f}`).extract(BOX).resize(BOX.width * K, BOX.height * K, { kernel: 'nearest' }).png().toBuffer());
}
const w = BOX.width * K, h = BOX.height * K, gap = 12;
await sharp({ create: { width: w * 3 + gap * 2, height: h, channels: 3, background: '#f7f4ed' } })
  .composite(tiles.map((b, i) => ({ input: b, left: i * (w + gap), top: 0 })))
  .png()
  .toFile(process.argv[2]);
console.log('wrote', process.argv[2], `${w * 3 + gap * 2}x${h}`);
