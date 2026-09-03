// scratch: crop reference regions to look at them closer
import sharp from 'sharp';
const ref = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre/reference/fd-anim-kitchen-table-cards.png';
const out = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre/reference/_crop-';
const meta = await sharp(ref).metadata();
console.log(meta.width, meta.height);
const sx = meta.width / 1920, sy = meta.height / 1080;
const crops = {
  cart: [1120, 280, 800, 520],
  shelves: [1380, 80, 540, 380],
  stove: [420, 220, 460, 460],
};
for (const [name, [x, y, w, h]] of Object.entries(crops)) {
  await sharp(ref)
    .extract({ left: Math.round(x * sx), top: Math.round(y * sy), width: Math.round(w * sx), height: Math.round(h * sy) })
    .resize({ width: 1400 })
    .png()
    .toFile(out + name + '.png');
}
console.log('ok');
