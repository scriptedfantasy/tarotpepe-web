// server/tally.mjs — THE COUNT ON THE CHIMNEY BREAST. Every visitor who comes through the door
// adds one scratch to the bare plaster over the mantel (src/pieces/tally.js draws them); this is
// where the number lives between visits.
//
//   GET  /api/tally   → { count }
//   POST /api/tally   → { count, mine }   one more scratch; `mine` is the visitor's own number
//
// It is ONE INTEGER IN ONE JSON FILE. The directory is TALLY_DIR, else the Railway volume's mount
// path (RAILWAY_VOLUME_MOUNT_PATH, which Railway sets on a service that has a volume attached),
// else .data/ beside server.mjs — so on a host with a volume the count survives a deploy, and on a
// host without one it survives a restart and is lost on the next deploy. TALLY_SEED is the count
// the wall starts at when there is no file yet (the mockup the owner approved showed 137).
//
// What it will not do, because a wall anyone can write on is a wall somebody will fill:
//   · count one address twice in twelve hours (in memory: a restart forgives everybody, once);
//   · read a body over 1 KB (there is nothing to say to it; the body is ignored anyway);
//   · go down over the file. A file that cannot be read is moved aside and the wall starts again
//     from the seed, with a line in the log; a write that fails is logged and the count carries on
//     in memory. The file is written to a temp name and renamed over the old one, so a crash in the
//     middle of a write leaves the last good count and never half of one.
//
// The same handler serves the dev server (a Vite plugin, `tallyApi`) and the Node server that runs
// online (`tallyMiddleware`, mounted by server.mjs), exactly as server/pepe.mjs does for /api/pepe.
import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const WINDOW_MS = 12 * 60 * 60 * 1000;
const MAX_BODY = 1024;
const FILE = 'tally.json';

function dirFor(root) {
  return process.env.TALLY_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || join(root, '.data');
}

// The visitor's address. Online the app sits behind Railway's proxy, so the socket is the proxy and
// every visitor would share one address. The proxy APPENDS the address it was reached from to
// X-Forwarded-For, so the last entry is the one a client cannot choose (the start of that header is
// whatever the client sent); X-Real-IP is the proxy's own statement of the same thing.
function addressOf(req) {
  const fwd = String(req.headers['x-forwarded-for'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (fwd.length) return fwd[fwd.length - 1];
  const real = String(req.headers['x-real-ip'] ?? '').trim();
  if (real) return real;
  return req.socket?.remoteAddress ?? 'unknown';
}

function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(obj));
}

// Drain the body without keeping it: a POST here carries nothing the count needs, but one over
// MAX_BODY is refused rather than read to the end.
function drain(req) {
  return new Promise((resolve) => {
    const declared = Number(req.headers['content-length'] ?? 0);
    if (declared > MAX_BODY) return resolve(false);
    let size = 0;
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      resolve(ok);
    };
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        finish(false);
        req.destroy();
      }
    });
    req.on('end', () => finish(true));
    req.on('error', () => finish(false));
    req.on('close', () => finish(size <= MAX_BODY));
  });
}

export function createTally(root, log = console) {
  const dir = dirFor(root);
  const file = join(dir, FILE);
  const seen = new Map(); // address → when it last scratched
  let count = null;

  const seed = () => {
    const n = Math.floor(Number(process.env.TALLY_SEED));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  function load() {
    if (count != null) return count;
    try {
      if (!existsSync(file)) return (count = seed());
      const n = Math.floor(Number(JSON.parse(readFileSync(file, 'utf8'))?.count));
      if (!Number.isFinite(n) || n < 0) throw new Error('no count in it');
      return (count = Math.min(n, Number.MAX_SAFE_INTEGER - 1));
    } catch (e) {
      // a bad file is set aside, not overwritten: somebody may want the number that was in it
      const aside = `${file}.bad-${Date.now()}`;
      try {
        renameSync(file, aside);
      } catch {}
      log.warn?.(`[tally] could not read ${file} (${e?.message ?? e}); moved to ${aside}, starting from ${seed()}`);
      return (count = seed());
    }
  }
  function save() {
    try {
      mkdirSync(dir, { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      writeFileSync(tmp, JSON.stringify({ count, at: new Date().toISOString() }) + '\n');
      renameSync(tmp, file);
    } catch (e) {
      log.warn?.(`[tally] could not write ${file}: ${e?.message ?? e}`);
    }
  }
  function limited(ip, now) {
    const at = seen.get(ip);
    if (at != null && now - at < WINDOW_MS) return true;
    seen.set(ip, now);
    if (seen.size > 5000) for (const [k, t] of seen) if (now - t >= WINDOW_MS) seen.delete(k);
    return false;
  }

  return async function tally(req, res, next) {
    const url = (req.url ?? '').split('?')[0];
    if (url !== '/api/tally') return next();
    try {
      if (req.method === 'GET' || req.method === 'HEAD') return json(res, 200, { count: load() });
      if (req.method !== 'POST') return json(res, 405, { error: 'GET or POST' });
      if (!(await drain(req))) return json(res, 413, { error: 'body too large' });
      load();
      if (limited(addressOf(req), Date.now())) return json(res, 429, { count, error: 'already counted' });
      count += 1;
      save();
      return json(res, 200, { count, mine: count });
    } catch (e) {
      log.warn?.(`[tally] ${e?.message ?? e}`);
      if (!res.headersSent) json(res, 500, { error: 'tally failed' });
    }
  };
}

// In development: a Vite plugin, like pepeApi.
export function tallyApi() {
  return {
    name: 'tally-api',
    configureServer(server) {
      server.middlewares.use(createTally(server.config.root, server.config.logger));
    },
  };
}

// Online: the same handler for server.mjs.
export function tallyMiddleware(root) {
  return createTally(root, { warn: (m) => console.warn(m) });
}
