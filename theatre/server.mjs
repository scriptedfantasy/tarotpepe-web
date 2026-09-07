// server.mjs — Tarot Pepe online. One Node process, no Vite: it serves the built site out of dist/
// and answers /api/pepe with the same handler the dev server uses (server/pepe.mjs, pepeMiddleware),
// so the key never leaves this process and what a visitor gets is what the dev server answers.
//
//   npm run build && npm start          → http://localhost:8080
//   PORT=3000 npm start                  (hosts set PORT themselves)
//
// Secrets come from the environment on a host (OPENROUTER_API_KEY, LLM_MODEL) or from .env.local
// next to this file locally; pepe.mjs reads both. Nothing else is configured.
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pepeMiddleware } from './server/pepe.mjs';

const ROOT = fileURLToPath(new URL('./', import.meta.url));
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
};

const api = pepeMiddleware(ROOT);

// A file under dist/, or index.html for anything that is not a file — the app is one page and its
// own query parameters are how a view is asked for.
function serve(req, res) {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const safe = normalize(url).replace(/^(\.\.[/\\])+/, '');
  let file = join(DIST, safe);
  let st = null;
  try {
    st = statSync(file);
    if (st.isDirectory()) {
      file = join(file, 'index.html');
      st = statSync(file);
    }
  } catch {
    file = join(DIST, 'index.html');
    try {
      st = statSync(file);
    } catch {
      res.writeHead(404);
      return res.end('not built: run npm run build');
    }
  }
  const ext = extname(file).toLowerCase();
  const hashed = /-[A-Za-z0-9_]{8,}\.(js|css)$/.test(file); // Vite's content-hashed bundles never change
  res.writeHead(200, {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    'content-length': st.size,
    'cache-control': hashed ? 'public, max-age=31536000, immutable' : ext === '.html' ? 'no-cache' : 'public, max-age=86400',
  });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  api(req, res, () => serve(req, res));
}).listen(PORT, () => {
  console.log(`tarot pepe · http://localhost:${PORT}`);
});
