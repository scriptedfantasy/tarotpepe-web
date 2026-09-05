// throwaway (camera round 8): shoot the same named shot with and without ?shot=1 and diff.
//   node tools/_cam-r8-same.mjs [tag]
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const tag = process.argv[2] ?? 'a';
const DIR = '/private/tmp/claude-501/-Users-workbook2024-Development-tarotpepe/cc57e9bc-ec5d-43c5-990a-77e7f38339a7/scratchpad/r8';
mkdirSync(DIR, { recursive: true });
const SIZES = [[390, 760], [1600, 900]];
const SHOTS = ['fan', 'turn', 'home', 'wide'];
const root = '/Users/workbook2024/Development/tarotpepe/.claude/worktrees/wes-tarot-theatre/theatre';
const run = (args) => execFileSync('node', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

for (const [w, h] of SIZES) {
  for (const s of SHOTS) {
    const a = `${DIR}/${tag}-${s}-${w}-shot1.png`;
    const b = `${DIR}/${tag}-${s}-${w}-live.png`;
    try {
      run(['tools/shot.mjs', '--view', 'camera', '--state', s, '--t', '2', '--seed', '1', '--width', String(w), '--height', String(h), '--out', a, '--allow-errors']);
      run(['tools/shot.mjs', '--url', `http://127.0.0.1:5173/?view=camera&state=${s}&t=2&seed=1`, '--width', String(w), '--height', String(h), '--out', b, '--allow-errors']);
      const d = run(['tools/_same.mjs', a, b]).trim();
      console.log(`${w}x${h} ${s.padEnd(5)} ${d}`);
    } catch (e) {
      console.log(`${w}x${h} ${s.padEnd(5)} FAILED ${String(e).slice(0, 300)}`);
    }
  }
}
