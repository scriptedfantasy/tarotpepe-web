import { readFileSync, writeFileSync } from 'node:fs';
const p = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre/src/pieces/room-textures.js';
const src = readFileSync(p, 'utf8');
const start = src.indexOf('// Frieze: a Greek key meander');
const end = src.indexOf('// Wainscot: tongue-and-groove boards');
if (start < 0 || end < 0) {
  console.error('markers not found', start, end);
  process.exit(1);
}
const note = `// (The Greek-key frieze that used to live here is gone. The band between the picture rail and the
// cornice is now bare plaster all round the room — the one big empty area the drawings always keep,
// as in fd-anim-kitchen-table-cards-hires. room.js paints it with plainTexture: nothing to draw.)

`;
writeFileSync(p, src.slice(0, start) + note + src.slice(end));
console.log('removed', end - start, 'chars');
