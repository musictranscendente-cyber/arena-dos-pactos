// Decks montados: 30 cartas escolhidas entre 1 ou 2 signos do jogador (1 signo = os dois iguais).
// Cópias da mesma carta: comum até 4, rara até 3, épica até 2, lendária 1.
import { baseCid, CARDS, cardsOfSign } from '../data/cards';
import type { Raridade, Signo } from '../data/schema';
import { Rng, shuffleWith } from './rng';
import { DECK_SIZE } from './types';

export interface DeckMontado {
  /** Os signos escolhidos (o primeiro dá a cor e o símbolo do herói); deck de 1 signo repete o mesmo. */
  signos: [Signo, Signo];
  /** As 30 cartas (ids; a mesma carta aparece uma vez para cada cópia). */
  cartas: string[];
  /** Nome que o jogador deu ao deck. */
  nome?: string;
}

/** Máximo de cópias da mesma carta num deck, pela raridade. */
export const COPIAS: Record<Raridade, number> = { c: 4, r: 3, e: 2, l: 1 };

export const maxCopias = (cid: string): number => COPIAS[CARDS[baseCid(cid)].r];

/** Quantas cópias de cada carta há na lista. */
export function contarCopias(cartas: readonly string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of cartas) m.set(c, (m.get(c) ?? 0) + 1);
  return m;
}

/** Cartas que podem entrar num deck desses 2 signos. */
export function cartasDisponiveis(a: Signo, b: Signo): string[] {
  return a === b ? cardsOfSign(a) : [...cardsOfSign(a), ...cardsOfSign(b)];
}

/** Deck de um signo só? */
export const umSigno = (d: { signos: readonly Signo[] }): boolean => d.signos[0] === d.signos[1];

/** Motivo do deck não valer, ou null se estiver tudo certo. */
export function validarDeck(d: DeckMontado): string | null {
  const [a, b] = d.signos;
  if (d.cartas.length !== DECK_SIZE) return 'tamanho';
  const ok = new Set(cartasDisponiveis(a, b));
  if (d.cartas.some(c => !ok.has(c))) return 'signo';
  for (const [c, n] of contarCopias(d.cartas)) if (n > maxCopias(c)) return 'copias';
  return null;
}

/**
 * Deck combinado aleatório (bots e "completar"): mantém as cartas de `base` e completa com cartas diferentes,
 * com a curva de mana parecida com a de um deck de um signo só (sorteia dentro de cada faixa de custo).
 */
export function deckAleatorio(rng: Rng, a: Signo, b: Signo, base: string[] = []): string[] {
  const ok = new Set(cartasDisponiveis(a, b));
  const deck = base.filter(c => ok.has(c)).slice(0, DECK_SIZE);
  const usadas = new Set(deck);
  const resto = shuffleWith(cartasDisponiveis(a, b).filter(c => !usadas.has(c)), n => rng.int(n));
  // faixas de custo, na proporção de um deck normal
  const faixa = (c: string) => Math.min(4, Math.floor(CARDS[c].cost / 2));
  const alvo = [0, 0, 0, 0, 0];
  for (const c of cardsOfSign(a)) alvo[faixa(c)]++;
  const tem = [0, 0, 0, 0, 0];
  for (const c of deck) tem[faixa(c)]++;
  for (const c of resto) {
    if (deck.length >= DECK_SIZE) break;
    if (tem[faixa(c)] < alvo[faixa(c)]) { deck.push(c); tem[faixa(c)]++; usadas.add(c); }
  }
  for (const c of resto) { if (deck.length >= DECK_SIZE) break; if (!usadas.has(c)) { deck.push(c); usadas.add(c); } }
  return deck;
}

/** Dois signos diferentes sorteados. */
export function doisSignos(rng: Rng, todos: readonly Signo[]): [Signo, Signo] {
  const a = todos[rng.int(todos.length)];
  const outros = todos.filter(s => s !== a);
  return [a, outros[rng.int(outros.length)]];
}
