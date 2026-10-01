import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'prototipo', 'ferramentas'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    // O motor de regras não pode usar sorteio nem relógio diretamente.
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-properties': ['error',
        { object: 'Math', property: 'random', message: 'Use o RNG com semente (engine/rng.ts).' },
        { object: 'Date', property: 'now', message: 'O motor não pode ler o relógio.' }],
      'no-restricted-globals': ['error', 'document', 'window', 'localStorage'],
    },
  },
);
