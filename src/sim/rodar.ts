// npm run sim [partidas por confronto] [semente]
// Roda partidas IA vs IA entre todos os pares de signos (cada par nos dois lados da mesa)
// e mostra a taxa de vitória de cada signo. Alvo de balanceamento: entre 45% e 55%.
import { ORDER, RACES } from '../data/signos';
import type { Signo } from '../data/schema';
import { playAiGame } from './partida';

const N = Math.max(1, Number(process.argv[2]) || 50);
const SEED = Number(process.argv[3]) || 12345;

interface Placar { v: number; d: number; e: number }
const placar = Object.fromEntries(ORDER.map(s => [s, { v: 0, d: 0, e: 0 }])) as Record<Signo, Placar>;
const confronto: Record<string, number> = {};
let total = 0, rodadas = 0, limites = 0, vitoriasEsquerda = 0, decididas = 0;

const t0 = performance.now();
let seed = SEED;
for (const a of ORDER) for (const b of ORDER) {
  if (a === b) continue;
  for (let i = 0; i < N; i++) {
    const r = playAiGame(a, b, seed++);
    total++;
    rodadas += r.rounds;
    if (r.result === 'p') { placar[a].v++; placar[b].d++; confronto[a + '>' + b] = (confronto[a + '>' + b] || 0) + 1; vitoriasEsquerda++; decididas++; }
    else if (r.result === 'e') { placar[b].v++; placar[a].d++; confronto[b + '>' + a] = (confronto[b + '>' + a] || 0) + 1; decididas++; }
    else { placar[a].e++; placar[b].e++; if (r.result === 'limite') limites++; }
  }
}
const ms = performance.now() - t0;

const pct = (x: number) => (x * 100).toFixed(1).padStart(5) + '%';
const linhas = ORDER.map(s => {
  const p = placar[s], jogos = p.v + p.d + p.e;
  return { s, taxa: (p.v + p.e / 2) / jogos, ...p };
}).sort((x, y) => y.taxa - x.taxa);

console.log(`\nCosmic Citadel — simulador IA vs IA`);
console.log(`${total} partidas (${N} por confronto, cada par nos dois lados), semente ${SEED}, ${(ms / 1000).toFixed(1)}s\n`);
console.log('Signo          Vitória   V    D    E   ');
console.log('-------------  -------  ---  ---  ---');
for (const l of linhas) {
  const marca = l.taxa < 0.45 ? '  ⬇ fraco' : l.taxa > 0.55 ? '  ⬆ forte' : '';
  const nome = `${RACES[l.s].g} ${RACES[l.s].n}`.padEnd(14);
  console.log(`${nome} ${pct(l.taxa)}  ${String(l.v).padStart(3)}  ${String(l.d).padStart(3)}  ${String(l.e).padStart(3)}${marca}`);
}
const fora = linhas.filter(l => l.taxa < 0.45 || l.taxa > 0.55).length;
console.log(`\nMédia de rodadas por partida: ${(rodadas / total).toFixed(1)}`);
console.log(`Vantagem de quem fica à esquerda (resolve primeiro): ${pct(vitoriasEsquerda / Math.max(1, decididas))} das partidas decididas`);
if (limites) console.log(`Partidas cortadas no limite de rodadas (contam como empate): ${limites}`);
console.log(fora ? `\n${fora} signo(s) fora da faixa 45%–55%.` : '\nTodos os signos dentro da faixa 45%–55%. ✅');

// Piores confrontos (quem mais domina quem)
const pares: { a: Signo; b: Signo; t: number }[] = [];
for (const a of ORDER) for (const b of ORDER) {
  if (a >= b) continue;
  const va = confronto[a + '>' + b] || 0, vb = confronto[b + '>' + a] || 0;
  pares.push({ a, b, t: va / (2 * N) }, { a: b, b: a, t: vb / (2 * N) });
}
pares.sort((x, y) => y.t - x.t);
console.log('\nConfrontos mais desequilibrados:');
for (const p of pares.slice(0, 5)) console.log(`  ${RACES[p.a].n} vence ${RACES[p.b].n} em ${pct(p.t)}`);
