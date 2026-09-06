#!/usr/bin/env node
// scratch (room round 3): take the round's standard set of frames in one go.
//   node tools/_room3-shots.mjs <tag>
// writes <SCRATCH>/room3/<tag>-<state>-<w>.png for camera home/wide/pepe/table at 1600x900 and 390x760.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const DIR = '/private/tmp/claude-501/-Users-workbook2024-Development-tarotpepe/cc57e9bc-ec5d-43c5-990a-77e7f38339a7/scratchpad/room3';
mkdirSync(DIR, { recursive: true });
const tag = process.argv[2] ?? 'x';
const only = process.argv[3]; // optional: a single state
const states = only ? [only] : ['home', 'wide', 'pepe', 'table'];
const sizes = [
  [1600, 900, 'w'],
  [390, 760, 'p'],
];

const run = (args) =>
  new Promise((res) => {
    const p = spawn('node', ['tools/shot.mjs', ...args], { cwd: '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre', stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => res({ code, out }));
  });

for (const st of states) {
  for (const [w, h, sfx] of sizes) {
    const out = `${DIR}/${tag}-${st}-${sfx}.png`;
    const r = await run(['--view', 'camera', '--state', st, '--width', String(w), '--height', String(h), '--out', out]);
    const err = r.code === 0 ? '' : '  !!! ' + r.out.split('\n').slice(0, 12).join(' | ');
    console.log(`${st} ${w}x${h} -> ${out} (exit ${r.code})${err}`);
  }
}
