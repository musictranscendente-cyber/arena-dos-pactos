// Tira das versões leves (sites de jogos) as animações em tira que elas não usam (ver ANIM em src/data/arte.ts).
// Uso: node ferramentas/enxugar-leve.mjs dist-crazygames
import { readFileSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const arte = JSON.parse(readFileSync('src/data/arte.json', 'utf8'));
const pasta = `${process.argv[2] ?? 'dist-crazygames'}/art`;
let n = 0;
for (const signo of readdirSync(pasta)) {
  for (const f of readdirSync(join(pasta, signo))) {
    const m = f.match(/^(.+)-(idle|ataque)-anim\.webp$/);
    if (m && m[1] in arte) { rmSync(join(pasta, signo, f)); n++; }
  }
}
console.log(`versão leve: ${n} animações removidas`);
