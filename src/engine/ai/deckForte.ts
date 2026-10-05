// Deck do bot difícil: em vez de cartas sorteadas, pega as cartas mais fortes de cada faixa de custo
// (força medida pelo simulador em forca.json), com as cópias que a raridade permite.
import { CARDS, cardsOfSign } from '../../data/cards';
import type { Signo } from '../../data/schema';
import { cartasDisponiveis, maxCopias } from '../deck';
import type { Rng } from '../rng';
import { DECK_SIZE } from '../types';
import forca from './forca.json';

const F = forca as Record<string, number>;
const faixa = (c: string) => Math.min(4, Math.floor(CARDS[c].cost / 2));

export function deckForte(rng: Rng, a: Signo, b: Signo): string[] {
  // um pouco de sorteio na nota para o bot não montar sempre o mesmo deck
  const nota = new Map(cartasDisponiveis(a, b).map(c => [c, (F[c] ?? 0.5) + rng.float() * 0.012]));
  const ordem = [...nota.keys()].sort((x, y) => nota.get(y)! - nota.get(x)!);
  const alvo = [0, 0, 0, 0, 0];
  for (const c of cardsOfSign(a)) alvo[faixa(c)]++;
  const deck: string[] = [];
  const tem = [0, 0, 0, 0, 0];
  const usadas = new Map<string, number>();
  const por = (c: string) => {
    const n = usadas.get(c) ?? 0;
    if (n >= maxCopias(c)) return false;
    usadas.set(c, n + 1); deck.push(c); tem[faixa(c)]++;
    return true;
  };
  for (const c of ordem) {
    while (deck.length < DECK_SIZE && tem[faixa(c)] < alvo[faixa(c)] && por(c));
  }
  for (const c of ordem) while (deck.length < DECK_SIZE && por(c));
  return deck;
}
