import sharp from 'sharp';
await sharp('/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre/public/pepe/pepe-meditation.webp')
  .png()
  .toFile('/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre/public/progress/shots/_pepe-meditation-ref.png');
console.log('ok');
