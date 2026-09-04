#!/usr/bin/env node
// scratch (pepe r6): draw candidate waist / hip lines over the source drawing so the joint can be
// put where the cloth actually falls off the crossed legs.
import sharp from 'sharp';
const SRC = new URL('../public/pepe/pepe-meditation.webp', import.meta.url).pathname;
const OUT = process.argv[2] ?? '/tmp/pepe-waist.png';
const m = await sharp(SRC).metadata();
const lines = (process.argv[3] ?? '340,356,370,396').split(',').map(Number);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${m.width}" height="${m.height}">
${lines.map((y, i) => `<line x1="0" y1="${y}" x2="${m.width}" y2="${y}" stroke="${['#ff0000', '#0066ff', '#ff00ff', '#00aa00'][i % 4]}" stroke-width="1.5"/><text x="4" y="${y - 3}" font-size="12" fill="${['#ff0000', '#0066ff', '#ff00ff', '#00aa00'][i % 4]}">${y}</text>`).join('')}
<line x1="244" y1="0" x2="244" y2="${m.height}" stroke="#888" stroke-width="1"/></svg>`;
await sharp(SRC).ensureAlpha().flatten({ background: '#ffffff' }).composite([{ input: Buffer.from(svg) }]).resize(m.width * 2, m.height * 2, { kernel: 'nearest' }).png().toFile(OUT);
console.log('wrote', OUT, m.width, m.height);
