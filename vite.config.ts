import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Caminhos relativos: o mesmo build funciona no GitHub Pages (/arena-dos-pactos/) e depois no Capacitor.
  base: './',
  server: { host: true },
  test: { include: ['tests/**/*.test.ts'] },
});
