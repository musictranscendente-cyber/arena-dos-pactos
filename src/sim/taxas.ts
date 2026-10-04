// Usado pelo ajuste automático de balanceamento: imprime a taxa de vitória de cada signo em JSON.
// npx tsx src/sim/taxas.ts [partidas por confronto] [semente]
import { ORDER } from '../data/signos';
import { playAiGame } from './partida';

const N = Math.max(1, Number(process.argv[2]) || 20);
let seed = Number(process.argv[3]) || 777;
const v: Record<string, number> = {}, j: Record<string, number> = {};
for (const a of ORDER) for (const b of ORDER) {
  if (a === b) continue;
  for (let i = 0; i < N; i++) {
    const r = playAiGame(a, b, seed++);
    j[a] = (j[a] || 0) + 1; j[b] = (j[b] || 0) + 1;
    const ga = r.result === 'p' ? 1 : r.result === 'e' ? 0 : 0.5;
    v[a] = (v[a] || 0) + ga; v[b] = (v[b] || 0) + 1 - ga;
  }
}
console.log(JSON.stringify(Object.fromEntries(ORDER.map(s => [s, v[s] / j[s]]))));
