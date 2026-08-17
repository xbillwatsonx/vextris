import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // GitHub Pages serves this repository as a project site, not at the domain root.
  base: command === 'build' ? '/vextris/' : '/',
  root: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    open: true,
  },
}));