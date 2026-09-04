import sharp from 'sharp';
const dir = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre/public/cards/';
const slugs = ['the-juggler', 'the-popess', 'the-pope', 'the-house-of-god', 'the-fool', 'judgement'];
const parts = [];
for (const s of slugs) {
  const meta = await sharp(dir + s + '.webp').metadata();
  const buf = await sharp(dir + s + '.webp')
    .extract({ left: 0, top: Math.round(meta.height * 0.9), width: meta.width, height: Math.round(meta.height * 0.09) })
    .resize(520)
    .png()
    .toBuffer();
  parts.push(buf);
}
const metas = await Promise.all(parts.map((b) => sharp(b).metadata()));
const H = metas.reduce((a, m) => a + m.height, 0);
await sharp({ create: { width: 520, height: H, channels: 3, background: '#fff' } })
  .composite(parts.map((b, i) => ({ input: b, top: metas.slice(0, i).reduce((a, m) => a + m.height, 0), left: 0 })))
  .png()
  .toFile('/private/tmp/claude-501/-Users-workbook2024-Development-tarotpepe/cc57e9bc-ec5d-43c5-990a-77e7f38339a7/scratchpad/plates.png');
console.log('ok', slugs.join(', '));
