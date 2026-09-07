import { defineConfig } from 'vite';
import { pepeApi } from './server/pepe.mjs';

// /progress/ is a plain page in public/, not part of the app. Vite's SPA fallback answers a
// directory request with the app's index.html, so without this the progress board and the scene
// are the same page and only /progress/index.html works.
function progressIndex() {
  return {
    name: 'progress-index',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/progress' || req.url.startsWith('/progress?')) req.url = '/progress/index.html' + req.url.slice(9);
        else if (req.url === '/progress/' || req.url.startsWith('/progress/?')) req.url = '/progress/index.html' + req.url.slice(10);
        next();
      });
    },
  };
}

// What ships. Vite copies all of public/ into dist/, and most of public/ is not for a visitor: the
// progress board and its hundreds of screenshots (754 MB), and the source drawings — the user's
// pose and hand pages, which tools/pepe-cutout.mjs and hand-cutout.mjs read and cut into public/pepe/
// at build time. The app fetches the cuts, never the sources. tarotpepe_backside.png stays: the card
// back offers it under ?back=orig.
function shipOnlyWhatIsAsked() {
  return {
    name: 'ship-only-what-is-asked',
    apply: 'build',
    async closeBundle() {
      const { rm, readdir } = await import('node:fs/promises');
      const dist = new URL('./dist/', import.meta.url);
      await rm(new URL('progress/', dist), { recursive: true, force: true });
      for (const name of await readdir(dist)) {
        if (/^(pepe-[a-z0-9-]+|hand-(full|pinch))\.png$/.test(name)) await rm(new URL(name, dist), { force: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [pepeApi(), progressIndex(), shipOnlyWhatIsAsked()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { target: 'es2022' },
});
