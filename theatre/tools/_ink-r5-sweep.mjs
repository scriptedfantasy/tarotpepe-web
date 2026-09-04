#!/usr/bin/env node
// Sweep one ink param over the home shot and print the round-5 numbers for each value.
//   node tools/_ink-r5-sweep.mjs lineBase 1.15 1.3 1.45
import { execFileSync } from 'node:child_process';
const DIR = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre';
const OUT = '/private/tmp/claude-501/-Users-workbook2024-Development-tarotpepe/cc57e9bc-ec5d-43c5-990a-77e7f38339a7/scratchpad';
const [name, ...vals] = process.argv.slice(2);
const files = [];
for (const v of vals) {
  const f = `${OUT}/sweep-${name}-${v}.png`;
  const url = `http://127.0.0.1:5173/?view=camera&state=home&shot=1&ink.${name}=${v}`;
  try {
    execFileSync('node', [`${DIR}/tools/shot.mjs`, '--url', url, '--out', f], { cwd: DIR, stdio: ['ignore', 'pipe', 'pipe'], timeout: 180000 });
    files.push(f);
    console.log(`shot ${name}=${v}`);
  } catch (e) {
    console.log(`ERR ${name}=${v}: ${String(e.stdout ?? e).slice(0, 600)}`);
  }
}
console.log(execFileSync('node', [`${DIR}/tools/_ink-r5.mjs`, ...files, `${DIR}/reference/fd-anim-kitchen-table-cards-hires.jpg`], { cwd: DIR }).toString());
