// Mede a força de cada carta: muitas partidas IA normal x IA normal com decks combinados aleatórios;
// a nota da carta é a taxa de vitória dos decks que a tinham (corrigida pelo número de partidas).
// Grava src/engine/ai/forca.json (usado para montar o deck do bot difícil).
// npx tsx src/sim/forcaCartas.ts [partidas]
import { writeFileSync } from 'node:fs';
import { CARDS } from '../data/cards';
import { ORDER } from '../data/signos';
import { deckAleatorio, doisSignos, newGame, planTurnNivel, resolveBattle, Rng } from '../engine';

const N = Number(process.argv[2]) || 6000;
const vit = new Map<string, number>(), jog = new Map<string, number>();

for (let i = 0; i < N; i++) {
  const seed = 50000 + i, rng = new Rng(seed * 31 + 7);
  const [pa, pb] = doisSignos(rng, ORDER), [ea, eb] = doisSignos(rng, ORDER);
  const pDeck = deckAleatorio(rng, pa, pb), eDeck = deckAleatorio(rng, ea, eb);
  let { state } = newGame({ pSign: pa, pSign2: pb, pDeck, eSign: ea, eSign2: eb, eDeck, seed, record: false });
  const rp = new Rng(seed ^ 0x9e3779b9), re = new Rng(seed ^ 0x85ebca6b);
  while (state.phase === 'plan' && state.round < 80) {
    state = planTurnNivel(state, 'e', re, 'normal').state;
    state = planTurnNivel(state, 'p', rp, 'normal').state;
    state = resolveBattle(state, { record: false }).state;
  }
  const conta = (deck: string[], v: number) => {
    for (const c of new Set(deck)) { jog.set(c, (jog.get(c) ?? 0) + 1); vit.set(c, (vit.get(c) ?? 0) + v); }
  };
  const r = state.result;
  conta(pDeck, r === 'p' ? 1 : r === 'draw' ? 0.5 : 0);
  conta(eDeck, r === 'e' ? 1 : r === 'draw' ? 0.5 : 0);
}

const forca: Record<string, number> = {};
for (const k of Object.keys(CARDS)) {
  if (k === 'eco') continue;
  // puxa para 50% quando a carta jogou pouco (20 partidas "fantasmas" empatadas)
  forca[k] = Math.round(((vit.get(k) ?? 0) + 10) / ((jog.get(k) ?? 0) + 20) * 1000) / 1000;
}
writeFileSync(new URL('../engine/ai/forca.json', import.meta.url), JSON.stringify(forca, null, 0) + '\n');
const top = Object.entries(forca).sort((a, b) => b[1] - a[1]);
console.log('melhores', top.slice(0, 10));
console.log('piores', top.slice(-10));
