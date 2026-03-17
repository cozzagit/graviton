import { defineConfig } from 'vite';

export default defineConfig({
  base: '/graviton/',
  root: '.',
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  server: {
    open: true,
  },
});
