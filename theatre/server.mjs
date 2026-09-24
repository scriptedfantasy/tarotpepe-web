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
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
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
  const headers = {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    'accept-ranges': 'bytes',
    'cache-control': hashed ? 'public, max-age=31536000, immutable' : ext === '.html' ? 'no-cache' : 'public, max-age=86400',
  };
  // A byte range, answered as one: a phone's media player asks for the record in pieces and will
  // not play a file whose server cannot do that (iOS Safari: "byte-range requests required").
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  if (m && (m[1] || m[2])) {
    let start = m[1] ? Number(m[1]) : Math.max(0, st.size - Number(m[2]));
    let end = m[1] && m[2] ? Math.min(Number(m[2]), st.size - 1) : st.size - 1;
    if (!(start >= 0) || start > end || start >= st.size) {
      res.writeHead(416, { 'content-range': `bytes */${st.size}` });
      return res.end();
    }
    res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${st.size}`, 'content-length': end - start + 1 });
    if (req.method === 'HEAD') return res.end();
    return createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...headers, 'content-length': st.size });
  if (req.method === 'HEAD') return res.end();
  createReadStream(file).pipe(res);
}

// THE COUNTER'S OWN DOOR. PostHog is reached through this server at /rel/… rather than at
// posthog.com, because tracker blockers refuse any request to posthog.com and a visitor with one
// would simply not be counted (the owner's own Chrome was one of them). Same origin, a neutral path:
// /rel/static and /rel/array are PostHog's scripts, everything else is its ingestion API.
const PH_API = 'https://eu.i.posthog.com';
const PH_ASSETS = 'https://eu-assets.i.posthog.com';
async function relay(req, res) {
  try {
    const path = req.url.slice('/rel'.length) || '/';
    const up = (/^\/(static|array)\//.test(path) ? PH_ASSETS : PH_API) + path;
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const headers = {};
    for (const h of ['content-type', 'content-encoding', 'user-agent', 'accept', 'accept-language', 'origin', 'referer'])
      if (req.headers[h]) headers[h] = req.headers[h];
    const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();
    if (ip) headers['x-forwarded-for'] = ip;
    const r = await fetch(up, { method: req.method, headers, body: chunks.length && req.method !== 'GET' && req.method !== 'HEAD' ? Buffer.concat(chunks) : undefined });
    const out = {};
    for (const h of ['content-type', 'cache-control', 'access-control-allow-origin'])
      if (r.headers.get(h)) out[h] = r.headers.get(h);
    res.writeHead(r.status, out);
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch {
    res.writeHead(502);
    res.end();
  }
}

createServer((req, res) => {
  if ((req.url ?? '').startsWith('/rel/')) return relay(req, res);
  api(req, res, () => serve(req, res));
}).listen(PORT, () => {
  console.log(`tarot pepe · http://localhost:${PORT}`);
});
