// crop reference details for the table builder (sweeper's check coat, the kitchen tabletop)
import sharp from 'sharp';
const ref = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre/reference/';
const out = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre/public/progress/shots/';
const img = sharp(ref + 'fd-anim-courtyard-sweeper-hires.jpg');
const meta = await img.metadata();
console.log('sweeper', meta.width, meta.height);
// the sweeper stands low-left in the courtyard folio; crop a generous window
await sharp(ref + 'fd-anim-courtyard-sweeper-hires.jpg').extract({ left: 0, top: 1100, width: 1200, height: 1261 }).resize(1200).toFile(out + '_ref-sweeper.png');
await sharp(ref + 'fd-anim-kitchen-table-cards-hires.jpg').extract({ left: 380, top: 1560, width: 1700, height: 800 }).resize(1600).toFile(out + '_ref-tabletop.png');
console.log('ok');
