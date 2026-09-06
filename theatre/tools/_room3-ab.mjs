#!/usr/bin/env node
// scratch (room round 3): the wide shot with THIS round's three files and with the three files as
// they stand at HEAD, taken a minute apart so props (which is being rebuilt in the same round by
// somebody else) is the same in both, and diffed. Restores the working copies whatever happens.
//   node tools/_room3-ab.mjs
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, writeFileSync } from 'node:fs';

const R = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre';
const S = '/private/tmp/claude-501/-Users-workbook2024-Development-tarotpepe/cc57e9bc-ec5d-43c5-990a-77e7f38339a7/scratchpad/room3';
const files = ['src/pieces/room.js', 'src/pieces/room-textures.js', 'src/pieces/room-build.js'];
const shot = (out, state = 'wide') =>
  spawnSync('node', ['tools/shot.mjs', '--view', 'camera', '--state', state, '--width', '1600', '--height', '900', '--out', out], { cwd: R, stdio: 'inherit' });

try {
  shot(`${S}/ab-after.png`);
  for (const f of files) writeFileSync(`${R}/${f}`, execFileSync('git', ['show', `HEAD:theatre/${f}`], { cwd: R, maxBuffer: 1 << 24 }));
  shot(`${S}/ab-before.png`);
} finally {
  for (const f of files) copyFileSync(`${S}/${f.split('/').pop()}`, `${R}/${f}`);
  console.log('working copies restored');
}
spawnSync('node', ['tools/_same.mjs', `${S}/ab-before.png`, `${S}/ab-after.png`], { cwd: R, stdio: 'inherit' });
