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

export default defineConfig({
  plugins: [pepeApi(), progressIndex()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { target: 'es2022' },
});
