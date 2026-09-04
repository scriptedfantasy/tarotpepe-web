#!/usr/bin/env node
// Take the round-5 ink shot set in one process.  node tools/_ink-r5-shots.mjs <tag> [set]
import { execFileSync } from 'node:child_process';
const tag = process.argv[2] ?? 'wip';
const which = process.argv[3] ?? 'core';
const DIR = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre';
const OUT = `${DIR}/public/progress/shots`;
const sets = {
  core: [
    ['camera', 'home', `_r5-${tag}-home.png`],
    ['ink', 'default', `_r5-${tag}-default.png`],
    ['ink', 'lines-only', `_r5-${tag}-lines.png`],
    ['ink', 'tone-only', `_r5-${tag}-tone.png`],
  ],
  probe: [
    ['ink', 'debug-contour', `_r5-${tag}-contour.png`],
    ['ink', 'debug-texink', `_r5-${tag}-texink.png`],
  ],
  wide: [
    ['camera', 'wide', `_r5-${tag}-wide.png`],
    ['camera', 'table', `_r5-${tag}-table.png`],
  ],
  home: [['camera', 'home', `_r5-${tag}-home.png`]],
  all: [],
};
sets.all = [...sets.core, ...sets.probe, ...sets.wide];
for (const [view, state, file] of sets[which]) {
  const t = Date.now();
  try {
    execFileSync('node', [`${DIR}/tools/shot.mjs`, '--view', view, '--state', state, '--out', `${OUT}/${file}`], {
      cwd: DIR, stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000,
    });
    console.log(`ok  ${view}/${state} -> ${file}  ${Date.now() - t}ms`);
  } catch (e) {
    console.log(`ERR ${view}/${state}\n${String(e.stdout ?? '')}\n${String(e.stderr ?? '')}`.slice(0, 2500));
  }
}
