import raw from './cartas.json';
import { CardDbSchema, type Card, type Signo } from './schema';

/** Todas as cartas do jogo, validadas pelo schema ao carregar. Um erro aqui = cartas.json quebrado. */
export const CARDS: Readonly<Record<string, Card>> = CardDbSchema.parse(raw);

export const ECO_ID = 'eco';

export function card(cid: string): Card {
  const c = CARDS[cid];
  if (!c) throw new Error(`Carta desconhecida: ${cid}`);
  return c;
}

/** As 30 cartas de um signo (sem o token Eco). */
export function cardsOfSign(sign: Signo): string[] {
  return Object.keys(CARDS).filter(k => k !== ECO_ID && CARDS[k].race === sign);
}
