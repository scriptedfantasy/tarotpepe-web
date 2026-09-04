// throwaway (flow/camera round 2): batch shot.mjs captures into /tmp/camr2.
//   node tools/_cam-r2.mjs camera:door camera:home flow:fan ...
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const ROOT = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre';
const OUT = process.env.OUT ?? '/tmp/camr2';
mkdirSync(OUT, { recursive: true });
for (const j of process.argv.slice(2)) {
  const [view, state, tag] = j.split(':');
  const out = `${OUT}/${view}-${tag ?? state}.png`;
  const r = spawnSync('node', ['tools/shot.mjs', '--view', view, '--state', state, '--out', out, '--wait', '1200'], { cwd: ROOT, encoding: 'utf8' });
  const lines = (r.stdout + r.stderr).trim().split('\n').filter((l) => !/GL Driver/.test(l));
  console.log(`== ${j} -> ${out}` + (r.status ? ` (exit ${r.status})` : ''));
  for (const l of lines) if (!/^ready in/.test(l)) console.log('   ' + l);
}
