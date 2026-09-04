#!/usr/bin/env node
// scratch: take the dialogue round-4 sheet — every judging state, desktop and phone.
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const OUT = process.argv[2] || '/tmp/dlg';
mkdirSync(OUT, { recursive: true });
const jobs = [];
for (const s of ['greeting', 'question', 'reading', 'farewell']) jobs.push(['dialogue', s, '']);
for (const s of ['talk', 'reading', 'fan']) jobs.push(['flow', s, '']);
const sizes = [[1600, 900, 'w'], [390, 760, 'p']];
for (const [view, state, extra] of jobs) {
  for (const [w, h, tag] of sizes) {
    const out = `${OUT}/${view}-${state}-${tag}.png`;
    const args = ['tools/shot.mjs', '--view', view, '--state', state, '--width', String(w), '--height', String(h), '--out', out];
    if (extra) args.push(...extra.split(' '));
    try {
      const o = execFileSync('node', args, { cwd: process.cwd(), encoding: 'utf8' });
      const err = o.split('\n').filter((l) => /ERROR|SLOW/.test(l));
      console.log(`${view}/${state} ${tag} ok${err.length ? ' ' + err.join(' | ') : ''}`);
    } catch (e) {
      console.log(`${view}/${state} ${tag} FAILED\n${(e.stdout || '') + (e.stderr || '')}`);
    }
  }
}
