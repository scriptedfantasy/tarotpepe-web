// throwaway (round 5): several shot.mjs captures in sequence, at a given window size.
//   node tools/_r5-shots.mjs 1600x900 camera:home camera:wide flow:talk
// writes /tmp/claude-501/.../r5/<view>-<state>-<w>x<h>.png (path printed)
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const ROOT = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre';
const OUT = '/private/tmp/claude-501/-Users-workbook2024-Development-tarotpepe/cc57e9bc-ec5d-43c5-990a-77e7f38339a7/scratchpad/r5';
mkdirSync(OUT, { recursive: true });
const [size, ...jobs] = process.argv.slice(2);
const [W, H] = size.split('x');
for (const j of jobs) {
  const [view, state] = j.split(':');
  const out = `${OUT}/${view}-${state}-${W}x${H}.png`;
  const args = ['tools/shot.mjs', '--view', view, '--state', state, '--width', W, '--height', H, '--out', out];
  const r = spawnSync('node', args, { cwd: ROOT, encoding: 'utf8' });
  const lines = (r.stdout + r.stderr).trim().split('\n').filter((l) => !/^ready in|^builds:/.test(l));
  console.log(`== ${j} ${W}x${H} -> ${out}${r.status ? ` (exit ${r.status})` : ''}`);
  const bad = lines.filter((l) => /error|ERROR|PAGE/.test(l));
  if (bad.length) console.log(bad.slice(0, 6).join('\n'));
}
