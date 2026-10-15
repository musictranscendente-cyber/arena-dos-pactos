import { defineConfig } from 'vitest/config';

// Número do build: no GitHub é o número da publicação (o mesmo para o site e o APK da mesma publicação);
// no computador, 0. O app Android compara com /versao.json do site para avisar que há versão nova.
const BUILD = Number(process.env.GITHUB_RUN_NUMBER ?? 0);

export default defineConfig({
  // Caminhos relativos: o mesmo build funciona no GitHub Pages (/arena-dos-pactos/) e depois no Capacitor.
  base: './',
  // versão mostrada nas Configurações: data do build
  define: {
    __VERSAO__: JSON.stringify(new Date().toISOString().slice(0, 10).split('-').reverse().join('/')),
    __BUILD__: JSON.stringify(BUILD),
  },
  plugins: [{
    name: 'versao-json',
    generateBundle() { this.emitFile({ type: 'asset', fileName: 'versao.json', source: JSON.stringify({ build: BUILD }) }); },
  }],
  server: { host: true },
  test: { include: ['tests/**/*.test.ts'] },
});
