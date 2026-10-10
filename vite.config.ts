import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Caminhos relativos: o mesmo build funciona no GitHub Pages (/arena-dos-pactos/) e depois no Capacitor.
  base: './',
  // versão mostrada nas Configurações: data do build
  define: { __VERSAO__: JSON.stringify(new Date().toISOString().slice(0, 10).split('-').reverse().join('/')) },
  server: { host: true },
  test: { include: ['tests/**/*.test.ts'] },
});
