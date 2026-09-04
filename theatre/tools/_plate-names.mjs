// Read the name off every plate. The deck's names were Marseille by assumption; The Pope's plate
// turned out to be lettered THE HIEROPHANT, so the rule is now the user's: whatever the card itself
// says, the room says. This crops the caption band off all 78 and lays them out in numbered sheets
// so they can be read in a few looks; the band is not at the same height on every plate, so the
// slice is tall.
//
//   node tools/_plate-names.mjs            → sheets of all 78, in deck order, to the scratchpad
//   node tools/_plate-names.mjs The_Pope   → just those, one sheet
import sharp from 'sharp';
import { readdirSync } from 'node:fs';

const DIR = '/Users/workbook2024/Development/tarotpepe/Tarotcards/';
const OUT = '/private/tmp/claude-501/-Users-workbook2024-Development-tarotpepe/cc57e9bc-ec5d-43c5-990a-77e7f38339a7/scratchpad/';

const MAJORS = ['The_Fool', 'The_Juggler', 'The_Popess', 'The_Empress', 'The_Emperor', 'The_Pope', 'The_Lovers', 'The_Chariot', 'Justice', 'The_Hermit', 'Wheel_of_Fortune', 'Strength', 'The_Hanged_Man', 'Death', 'Temperance', 'The_Devil', 'The_House_Of_God', 'The_Star', 'The_Moon', 'The_Sun', 'Judgement', 'The_World'];
const RANKS = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'];
const SUITS = ['Cups', 'Pentacles', 'Swords', 'Wands'];
const ALL = [...MAJORS, ...SUITS.flatMap((s) => RANKS.map((r) => `${r}_of_${s}`))];

const want = process.argv.slice(2);
const list = want.length ? want : ALL;
const have = readdirSync(DIR).filter((n) => n.toLowerCase().endsWith('.png'));
const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');

const W = 430; // one caption, resized
const H = 92;
const COLS = 2;
const PER = 24; // 12 rows x 2 columns per sheet

let sheet = 0;
let tiles = [];
let n = 0;
const flush = async () => {
  if (!tiles.length) return;
  const rows = Math.ceil(tiles.length / COLS);
  await sharp({ create: { width: W * COLS, height: H * rows, channels: 3, background: '#ffffff' } })
    .composite(tiles)
    .png()
    .toFile(`${OUT}names-${sheet}.png`);
  console.log(`  → names-${sheet}.png (${tiles.length} plates)`);
  tiles = [];
  sheet += 1;
};

for (const m of list) {
  const f = have.find((x) => norm(x.replace(/\.png$/i, '')) === norm(m));
  if (!f) {
    console.log('MISSING PLATE:', m);
    continue;
  }
  const md = await sharp(DIR + f).metadata();
  const buf = await sharp(DIR + f)
    .extract({
      left: Math.round(md.width * 0.05),
      top: Math.round(md.height * 0.855),
      width: Math.round(md.width * 0.9),
      height: Math.round(md.height * 0.135),
    })
    .resize(W, H, { fit: 'fill' })
    .toBuffer();
  const i = tiles.length;
  tiles.push({ input: buf, left: (i % COLS) * W, top: Math.floor(i / COLS) * H });
  n += 1;
  console.log(String(n).padStart(3), m.padEnd(22), '->', f);
  if (tiles.length === PER) await flush();
}
await flush();
console.log(`${n} plates, ${sheet} sheet(s), reading order is left-to-right then down`);
