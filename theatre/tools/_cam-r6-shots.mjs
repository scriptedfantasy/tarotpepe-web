// throwaway (camera round 6): several shot.mjs captures in sequence, at a given window size,
// frozen at a time so the takes are deterministic.
//   node tools/_cam-r6-shots.mjs 1600x900 3 reveal:fan reveal:turn camera:spread
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const ROOT = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre';
const OUT = '/private/tmp/claude-501/-Users-workbook2024-Development-tarotpepe/cc57e9bc-ec5d-43c5-990a-77e7f38339a7/scratchpad/r6';
mkdirSync(OUT, { recursive: true });
const [size, t, ...jobs] = process.argv.slice(2);
const [W, H] = size.split('x');
for (const j of jobs) {
  const [view, state] = j.split(':');
  const out = `${OUT}/${view}-${state}-${W}x${H}.png`;
  const args = ['tools/shot.mjs', '--view', view, '--state', state, '--width', W, '--height', H, '--out', out];
  if (t && t !== '-') args.push('--t', t);
  const r = spawnSync('node', args, { cwd: ROOT, encoding: 'utf8' });
  const lines = (r.stdout + r.stderr).trim().split('\n').filter((l) => !/^ready in|^builds:/.test(l));
  console.log(`== ${j} ${W}x${H} -> ${out}${r.status ? ` (exit ${r.status})` : ''}`);
  const bad = lines.filter((l) => /error|ERROR|PAGE/.test(l));
  if (bad.length) console.log(bad.slice(0, 6).join('\n'));
}
