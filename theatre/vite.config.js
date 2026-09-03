import { defineConfig } from 'vite';
import { pepeApi } from './server/pepe.mjs';

export default defineConfig({
  plugins: [pepeApi()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { target: 'es2022' },
});
