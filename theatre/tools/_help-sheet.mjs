#!/usr/bin/env node
// every state of the help piece at every frame we ship to, in one go
//   node tools/_help-sheet.mjs [outdir]
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? '/private/tmp/claude-501/-Users-workbook2024-Development-tarotpepe/cc57e9bc-ec5d-43c5-990a-77e7f38339a7/scratchpad';
mkdirSync(out, { recursive: true });
const SIZES = [[1600, 900], [1200, 1100], [390, 760]];
for (const state of ['closed', 'hover', 'open']) {
  for (const [w, h] of SIZES) {
    const file = `${out}/help-${state}-${w}.png`;
    const r = spawnSync('node', ['tools/shot.mjs', '--view', 'help', '--state', state, '--width', String(w), '--height', String(h), '--out', file, '--wait', '1600'], { encoding: 'utf8' });
    const line = (r.stdout + r.stderr).split('\n').find((l) => l.startsWith('wrote') || l.includes('PAGE ERROR')) ?? (r.stdout + r.stderr).slice(0, 200);
    console.log(`${state}/${w}x${h}`.padEnd(20), r.status === 0 ? 'ok' : 'FAILED', line.replace(out + '/', ''));
  }
}
