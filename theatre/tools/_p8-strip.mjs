// r8: the exposure sheet, one drawing a tile, EXACTLY. A contact sheet taken with the clock
// running is at the mercy of how long a software-WebGL frame takes; a frozen clock is not, so this
// shoots one frame per clock step (?t=) and lays them out in order. That is the only way to see
// whether the walk is a held drawing snapping forward or a drawing sliding across a room.
//   node tools/_p8-strip.mjs <state> <first step> <count> <step gap> <out.png> [w] [h] [crop]
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const [state = 'cross', first = '0', count = '6', gapS = '3', out = '/tmp/strip.png', W = '1600', H = '900', crop = '1'] = process.argv.slice(2);
const TMP = '/private/tmp/claude-501/-Users-workbook2024-Development-tarotpepe/cc57e9bc-ec5d-43c5-990a-77e7f38339a7/scratchpad/strip';
mkdirSync(TMP, { recursive: true });
const files = [];
for (let i = 0; i < +count; i++) {
  const step = +first + i * +gapS;
  const t = (step / 12).toFixed(4);
  const f = `${TMP}/${state}-${step}.png`;
  const r = spawnSync('node', ['tools/shot.mjs', '--view', 'pepe', '--state', state, '--t', t, '--width', W, '--height', H, '--out', f, '--wait', '700'], { encoding: 'utf8' });
  const err = (r.stdout + r.stderr).split('\n').filter((l) => /PAGE ERROR|Error/.test(l));
  console.log(`step ${String(step).padStart(3)}  t=${t}${err.length ? '  ' + err.join(' ') : ''}`);
  files.push(f);
}
const md = await sharp(files[0]).metadata();
const cw = crop === '1' ? Math.round(md.width * 0.55) : md.width;
const ch = crop === '1' ? Math.round(md.height * 0.75) : md.height;
const cx = crop === '1' ? Math.round(md.width * 0.06) : 0;
const cy = crop === '1' ? Math.round(md.height * 0.14) : 0;
const TW = 460, TH = Math.round((ch / cw) * TW);
const cols = Math.min(files.length, 3);
const rows = Math.ceil(files.length / cols);
const tiles = [];
for (let i = 0; i < files.length; i++) {
  tiles.push({
    input: await sharp(files[i]).extract({ left: cx, top: cy, width: cw, height: ch }).resize(TW, TH).png().toBuffer(),
    left: (i % cols) * (TW + 6),
    top: Math.floor(i / cols) * (TH + 6),
  });
}
await sharp({ create: { width: cols * (TW + 6), height: rows * (TH + 6), channels: 3, background: '#ffffff' } }).composite(tiles).png().toFile(out);
console.log('wrote', out);
