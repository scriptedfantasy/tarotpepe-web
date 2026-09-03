// throwaway: run several shot.mjs captures in sequence.
//   node tools/_shots.mjs dialogue:greeting dialogue:question flow:fan ...
// writes public/progress/shots/<view>-r3-<state>-wip.png
import { spawnSync } from 'node:child_process';
const ROOT = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre';
const jobs = process.argv.slice(2);
for (const j of jobs) {
  const [view, state, tag] = j.split(':');
  const out = `${ROOT}/public/progress/shots/${view}-r3-${tag ?? state}-wip.png`;
  const args = ['tools/shot.mjs', '--view', view, '--state', state, '--out', out];
  const r = spawnSync('node', args, { cwd: ROOT, encoding: 'utf8' });
  const lines = (r.stdout + r.stderr).trim().split('\n');
  console.log(`== ${j} -> ${out}\n` + lines.filter((l) => !/^ready in|^SLOW/.test(l)).join('\n'));
  if (r.status !== 0) console.log('  (exit ' + r.status + ')');
}
