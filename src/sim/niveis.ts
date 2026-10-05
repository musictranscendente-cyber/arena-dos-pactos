// Mede a força dos níveis de IA: cada par joga N partidas com decks combinados aleatórios (lados alternados).
// npx tsx src/sim/niveis.ts [partidas]
import { ORDER } from '../data/signos';
import { deckAleatorio, doisSignos, newGame, planTurnNivel, resolveBattle, Rng, type Nivel } from '../engine';

const N = Number(process.argv[2]) || 60;

function jogo(pn: Nivel, en: Nivel, seed: number): 'p' | 'e' | 'draw' {
  const rng = new Rng(seed * 7919 + 1);
  const [pa, pb] = doisSignos(rng, ORDER), [ea, eb] = doisSignos(rng, ORDER);
  let { state } = newGame({ pSign: pa, pSign2: pb, pDeck: deckAleatorio(rng, pa, pb), eSign: ea, eSign2: eb, eDeck: deckAleatorio(rng, ea, eb), seed, record: false });
  const rp = new Rng(seed ^ 0x9e3779b9), re = new Rng(seed ^ 0x85ebca6b);
  while (state.phase === 'plan' && state.round < 80) {
    // como na interface: o rival (e) planeja primeiro, depois o jogador (p)
    state = planTurnNivel(state, 'e', re, en).state;
    state = planTurnNivel(state, 'p', rp, pn).state;
    state = resolveBattle(state, { record: false }).state;
  }
  return state.result ?? 'draw';
}

function duelo(a: Nivel, b: Nivel): number {
  let va = 0;
  for (let i = 0; i < N; i++) {
    const r1 = jogo(a, b, 1000 + i); if (r1 === 'p') va++; else if (r1 === 'draw') va += 0.5;
    const r2 = jogo(b, a, 1000 + i); if (r2 === 'e') va++; else if (r2 === 'draw') va += 0.5;
  }
  return va / (2 * N);
}

const t0 = performance.now();
console.log(`normal x fácil:   normal vence ${(duelo('normal', 'facil') * 100).toFixed(1)}%`);
console.log(`difícil x normal: difícil vence ${(duelo('dificil', 'normal') * 100).toFixed(1)}%`);
console.log(`difícil x fácil:  difícil vence ${(duelo('dificil', 'facil') * 100).toFixed(1)}%`);
console.log(`${((performance.now() - t0) / 1000).toFixed(1)}s`);
