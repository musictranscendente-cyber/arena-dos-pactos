// Mede a dificuldade da campanha: um jogador "normal" com o deck inicial (30 cartas do próprio signo, Nv1)
// enfrenta cada fase de cada mundo. Mostra a taxa de vitória do jogador por fase.
// npx tsx src/sim/campanha.ts [partidas]   (JOGADOR=dificil para um jogador experiente)
import { cardsOfSign } from '../data/cards';
import { ORDER } from '../data/signos';
import { newGame, planTurnNivel, resolveBattle, Rng } from '../engine';
import { deckDaFase, fase, FASES } from '../meta/campanha';

const N = Number(process.argv[2]) || 12;
const linhas: string[] = [];
const porFase = Array.from({ length: FASES }, () => 0);
for (const mundo of ORDER) {
  const taxas: number[] = [];
  for (let n = 1; n <= FASES; n++) {
    const f = fase(mundo, n);
    let v = 0;
    for (let i = 0; i < N; i++) {
      const seed = 7000 + i * 31 + n, rng = new Rng(seed);
      const meu = ORDER[(ORDER.indexOf(mundo) + 1 + (i % 11)) % 12]; // jogador com outro signo
      let { state } = newGame({ pSign: meu, pDeck: cardsOfSign(meu), eSign: mundo, eDeck: deckDaFase(f, rng), eHp: f.vidaRival, seed, record: false });
      const rp = new Rng(seed ^ 1), re = new Rng(seed ^ 2);
      while (state.phase === 'plan' && state.round < 80) {
        state = planTurnNivel(state, 'e', re, f.nivelIA).state;
        state = planTurnNivel(state, 'p', rp, (process.env.JOGADOR ?? 'normal') as 'normal').state;
        state = resolveBattle(state, { record: false }).state;
      }
      if (state.result === 'p') v++;
    }
    taxas.push(Math.round((v / N) * 100));
    porFase[n - 1] += v / N / ORDER.length;
  }
  linhas.push(`${mundo.padEnd(12)} ${taxas.map(t => String(t).padStart(4)).join('')}`);
}
console.log(`fase        ${Array.from({ length: FASES }, (_, i) => String(i + 1).padStart(4)).join('')}`);
console.log(linhas.join('\n'));
console.log(`média       ${porFase.map(t => String(Math.round(t * 100)).padStart(4)).join('')}`);
