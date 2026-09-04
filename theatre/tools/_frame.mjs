// throwaway (camera round 2): try camera framings without editing the source between renders.
// One browser, one page load, many frames.
//   node tools/_frame.mjs /abs/config.json
// config: { view, state, wait, out, variants: [{ name, shot: {pos, look, fov, shift, up}, base, cut, say }] }
//   base: a shot name whose look/fov/shift is used as the starting point ('door' by default = the variant's own name)
//   say:  a caption to show through dialogue, to judge the anchor with real text in the frame
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const cfg = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const out = cfg.out ?? '/tmp/camr2';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: cfg.width ?? 1600, height: cfg.height ?? 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack : e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.route('**/@vite/client', (route) =>
  route.fulfill({
    contentType: 'application/javascript',
    body: `export function createHotContext(){ return { accept(){}, acceptExports(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){}, data: {} }; }
export function updateStyle(id, css){ let s = document.querySelector('style[data-vite-dev-id="' + id + '"]'); if (!s) { s = document.createElement('style'); s.setAttribute('data-vite-dev-id', id); document.head.appendChild(s); } s.textContent = css; }
export function removeStyle(id){ document.querySelector('style[data-vite-dev-id="' + id + '"]')?.remove(); }
export function injectQuery(url){ return url; }
export class ErrorOverlay {}`,
  }),
);
const u = new URL('http://127.0.0.1:5173/');
if (cfg.view) u.searchParams.set('view', cfg.view);
if (cfg.state) u.searchParams.set('state', cfg.state);
u.searchParams.set('shot', '1');
await page.goto(u.toString(), { waitUntil: 'load', timeout: 60000 });
const t0 = Date.now();
for (;;) {
  const ok = await page.evaluate(() => window.__theatreReady === true).catch(() => false);
  if (ok || Date.now() - t0 > 150000) break;
  await page.waitForTimeout(250);
}
await page.waitForTimeout(cfg.wait ?? 2000);

for (const v of cfg.variants) {
  await page.evaluate(
    ({ v }) => {
      const C = window.__theatre.pieces.camera;
      const D = window.__theatre.pieces.dialogue;
      const name = v.name;
      if (v.shot) {
        const base = C.shots[v.base ?? name] ?? {};
        const s = { ...base, ...v.shot };
        if (v.shot.pos && !v.shot.look) s.look = [v.shot.pos[0], v.shot.pos[1], -window.__theatre.layout.room.depth / 2];
        C.shots[name] = s;
      }
      C.cut(v.cut ?? name);
      if (v.anchor && D?.anchors) D.anchors[v.cut ?? name] = v.anchor;
      if (v.say != null) D?.say?.(v.say, { hold: 30 });
      else D?.clear?.();
    },
    { v },
  );
  await page.waitForTimeout(v.say != null ? (cfg.sayWait ?? 2600) : (cfg.frameWait ?? 900));
  const file = `${out}/${v.name}.png`;
  await page.screenshot({ path: file });
  console.log('wrote', file);
}
await browser.close();
if (errors.length) console.error('PAGE ERRORS:\n' + errors.map((e) => ' - ' + e).join('\n'));
