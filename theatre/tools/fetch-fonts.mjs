// One-off: download Jost (a Futura-alike) so the title typography works off any machine.
// On macOS the real Futura is used first; Jost is the fallback.
import { writeFileSync, readFileSync } from 'node:fs';

const dir = new URL('../public/fonts/', import.meta.url).pathname;
const css = readFileSync(dir + 'jost.css', 'utf8');
const faces = [...css.matchAll(/font-style:\s*(\w+);\s*font-weight:\s*(\d+);[^}]*?src:\s*url\((https:[^)]+)\)/g)];
let out = '';
for (const [, style, weight, url] of faces) {
  const name = `jost-${weight}${style === 'italic' ? 'i' : ''}.ttf`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dir + name, buf);
  out += `@font-face{font-family:'Jost';font-style:${style};font-weight:${weight};src:url('/fonts/${name}') format('truetype');font-display:swap;}\n`;
  console.log(name, buf.length);
}
writeFileSync(dir + 'jost.css', out);
console.log('wrote', dir + 'jost.css');
