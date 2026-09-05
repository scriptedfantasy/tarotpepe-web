#!/usr/bin/env node
// THE ONLY TEST THAT MATTERS THIS ROUND: the room's pen beside the door's, same frame size, same
// zoom, one above the other. Not "does this measure 1.6" but "would anyone say these were drawn by
// the same hand". Rows are named pairs — a stile of the door against a leg of the table, the door's
// lettering against the wall board's — cropped at the same pixel size from each frame and blown up
// with nearest-neighbour so a mark is looked at as it was laid down.
//
//   node tools/_ink-r7-side.mjs <door.png> <room.png> <out.png> [scale]
import sharp from 'sharp';

const [door, room, out, S = '3'] = process.argv.slice(2);
const s = +S;
// [label, doorX, doorY, roomX, roomY, w, h]
const ROWS = [
  ['a stile and a panel corner  /  the parlour door, the same thing inside the room', 690, 220, 1000, 190, 210, 150],
  ['the case, its bead and its cornice  /  the shelf, its boards and its bottles', 650, 60, 370, 380, 210, 150],
  ['lettering in the fanlight  /  lettering on the wall board', 720, 128, 680, 84, 210, 56],
];

const pad = 10, lab = 18;
const cw = ROWS[0][5] * s;
let y = pad;
const parts = [];
const svgBits = [];
for (const [name, dx, dy, rx, ry, w, h] of ROWS) {
  svgBits.push(`<text x="${pad}" y="${y + 13}" font-family="Helvetica,Arial" font-size="12" fill="#0d0e0d">${name.replace(/&/g, '&amp;')}</text>`);
  y += lab;
  const cuts = [[door, dx, dy], [room, rx, ry]];
  for (let i = 0; i < cuts.length; i++) {
    const [f, x0, y0] = cuts[i];
    parts.push({
      input: await sharp(f).extract({ left: x0, top: y0, width: w, height: h })
        .resize(w * s, h * s, { kernel: 'nearest' }).png().toBuffer(),
      left: pad + i * (cw + pad),
      top: y,
    });
  }
  svgBits.push(
    `<text x="${pad + 4}" y="${y + 14}" font-family="Helvetica,Arial" font-size="11" fill="#b00">DOOR</text>`,
    `<text x="${pad + cw + pad + 4}" y="${y + 14}" font-family="Helvetica,Arial" font-size="11" fill="#b00">ROOM</text>`,
  );
  y += h * s + pad;
}
const W = pad * 3 + cw * 2, H = y;
await sharp({ create: { width: W, height: H, channels: 3, background: '#f8f9f4' } })
  .composite([...parts, { input: Buffer.from(`<svg width="${W}" height="${H}">${svgBits.join('')}</svg>`), top: 0, left: 0 }])
  .png()
  .toFile(out);
console.log('wrote', out, `${W}x${H}`);
