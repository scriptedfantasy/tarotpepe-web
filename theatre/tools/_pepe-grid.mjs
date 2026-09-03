// Enlarge the drawing 3x with a labelled 25 px grid (source pixels) so regions can be read off.
import sharp from 'sharp';
const SRC = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre/public/pepe/pepe-meditation.webp';
const OUT = process.argv[2] ?? '/tmp/pepe-grid.png';
const crop = process.argv[3] ? process.argv[3].split(',').map(Number) : null; // x,y,w,h in source px
const K = +(process.argv[4] ?? 3);
const meta = await sharp(SRC).metadata();
const [cx, cy, cw, ch] = crop ?? [0, 0, meta.width, meta.height];
const W = cw * K, H = ch * K;
let svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;
for (let x = Math.ceil(cx / 25) * 25; x <= cx + cw; x += 25) {
  const X = (x - cx) * K;
  svg += `<line x1="${X}" y1="0" x2="${X}" y2="${H}" stroke="${x % 100 ? '#f0f' : '#00f'}" stroke-width="${x % 100 ? 0.6 : 1.4}" opacity="0.6"/>`;
  svg += `<text x="${X + 2}" y="10" font-size="10" fill="#00f">${x}</text>`;
}
for (let y = Math.ceil(cy / 25) * 25; y <= cy + ch; y += 25) {
  const Y = (y - cy) * K;
  svg += `<line x1="0" y1="${Y}" x2="${W}" y2="${Y}" stroke="${y % 100 ? '#f0f' : '#00f'}" stroke-width="${y % 100 ? 0.6 : 1.4}" opacity="0.6"/>`;
  svg += `<text x="2" y="${Y - 2}" font-size="10" fill="#00f">${y}</text>`;
}
svg += '</svg>';
const img = sharp(SRC).extract({ left: cx, top: cy, width: cw, height: ch }).resize(W, H, { kernel: 'nearest' }).flatten({ background: '#cfcfcf' });
await img.composite([{ input: Buffer.from(svg), left: 0, top: 0 }]).png().toFile(OUT);
console.log('wrote', OUT, W, H);
