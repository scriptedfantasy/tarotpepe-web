#!/usr/bin/env node
// Round 6 work bench. One shot of the home frame with any ink.* overrides, then:
//   · the three numbers (tools/_ink-r5.mjs) against the kitchen folio resampled to the same width
//   · the stroke cross-section (tools/_ink-r5-xsect.mjs) against the same folio
//   · the three crops the round-6 brief names, at 3x, so a label can be READ
//
//   node tools/_ink-r6.mjs <tag> [ink.lineBase=0.8 ink.lineSoft=1.3 ...]
//   node tools/_ink-r6.mjs <tag> --crops-only
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const DIR = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre';
const OUT = '/private/tmp/claude-501/-Users-workbook2024-Development-tarotpepe/cc57e9bc-ec5d-43c5-990a-77e7f38339a7/scratchpad';

const CROPS = {
  shelf: [370, 380, 260, 200],
  board: [640, 80, 320, 200],
  door: [980, 90, 260, 300],
};

const [tag, ...rest] = process.argv.slice(2);
const overrides = rest.filter((a) => a.includes('='));
const u = new URL('http://127.0.0.1:5173/');
u.searchParams.set('view', 'camera');
u.searchParams.set('state', 'home');
u.searchParams.set('shot', '1');
for (const o of overrides) {
  const i = o.indexOf('=');
  u.searchParams.set(o.slice(0, i), o.slice(i + 1));
}
const frame = `${OUT}/r6-${tag}.png`;
if (!rest.includes('--crops-only')) {
  const log = execFileSync('node', [`${DIR}/tools/shot.mjs`, '--url', u.toString(), '--out', frame], {
    cwd: DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 240000,
  }).toString();
  const err = /PAGE ERROR/i.test(log);
  if (err) console.log(log);
}
console.log(`--- ${tag} ${overrides.join(' ')}`);
console.log(execFileSync('node', [`${DIR}/tools/_ink-r5.mjs`, frame, '/tmp/folio1600.png'], { cwd: DIR }).toString().trim());
console.log(execFileSync('node', [`${DIR}/tools/_ink-r5-xsect.mjs`, frame, '100', '800', '7'], { cwd: DIR }).toString().trim());
for (const [name, [x, y, w, h]] of Object.entries(CROPS)) {
  const f = `${OUT}/r6-${tag}-${name}.png`;
  await sharp(frame).extract({ left: x, top: y, width: w, height: h }).resize(w * 3, h * 3, { kernel: 'nearest' }).png().toFile(f);
  console.log(`crop ${f}`);
}
