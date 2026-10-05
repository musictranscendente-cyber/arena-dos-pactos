// Decks montados: 30 cartas escolhidas entre os 2 signos do jogador (1 cópia de cada).
import { CARDS, cardsOfSign } from '../data/cards';
import type { Signo } from '../data/schema';
import { Rng, shuffleWith } from './rng';
import { DECK_SIZE } from './types';

export interface DeckMontado {
  /** Os 2 signos escolhidos (o primeiro dá a cor e o símbolo do herói). */
  signos: [Signo, Signo];
  /** As 30 cartas (ids). */
  cartas: string[];
}

/** Cartas que podem entrar num deck desses 2 signos. */
export function cartasDisponiveis(a: Signo, b: Signo): string[] {
  return [...cardsOfSign(a), ...cardsOfSign(b)];
}

/** Motivo do deck não valer, ou null se estiver tudo certo. */
export function validarDeck(d: DeckMontado): string | null {
  const [a, b] = d.signos;
  if (a === b) return 'signos';
  if (d.cartas.length !== DECK_SIZE) return 'tamanho';
  if (new Set(d.cartas).size !== d.cartas.length) return 'repetida';
  const ok = new Set(cartasDisponiveis(a, b));
  if (d.cartas.some(c => !ok.has(c))) return 'signo';
  return null;
}

/**
 * Deck combinado aleatório (bots e "completar"): parte das cartas de cada signo, com a curva de mana parecida
 * com a de um deck de um signo só (sorteia dentro de cada faixa de custo).
 */
export function deckAleatorio(rng: Rng, a: Signo, b: Signo, base: string[] = []): string[] {
  const escolhidas = new Set(base.filter(c => cartasDisponiveis(a, b).includes(c)));
  const resto = shuffleWith(cartasDisponiveis(a, b).filter(c => !escolhidas.has(c)), n => rng.int(n));
  // faixas de custo, na proporção de um deck normal (metade de cada signo)
  const faixa = (c: string) => Math.min(4, Math.floor(CARDS[c].cost / 2));
  const alvo = [0, 0, 0, 0, 0];
  for (const c of cardsOfSign(a)) alvo[faixa(c)]++;
  const tem = [0, 0, 0, 0, 0];
  for (const c of escolhidas) tem[faixa(c)]++;
  for (const c of resto) {
    if (escolhidas.size >= DECK_SIZE) break;
    if (tem[faixa(c)] < alvo[faixa(c)]) { escolhidas.add(c); tem[faixa(c)]++; }
  }
  for (const c of resto) { if (escolhidas.size >= DECK_SIZE) break; escolhidas.add(c); }
  return [...escolhidas].slice(0, DECK_SIZE);
}

/** Dois signos diferentes sorteados. */
export function doisSignos(rng: Rng, todos: readonly Signo[]): [Signo, Signo] {
  const a = todos[rng.int(todos.length)];
  const outros = todos.filter(s => s !== a);
  return [a, outros[rng.int(outros.length)]];
}
