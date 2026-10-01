// Utilitários dos testes: monta uma mesa vazia e coloca criaturas com as habilidades que quisermos.
import { card } from '../src/data/cards';
import type { Keyword } from '../src/data/schema';
import { Ctx } from '../src/engine/ctx';
import { newGame } from '../src/engine/round';
import { emptyBoard } from '../src/engine/state';
import type { GameEvent, GameState, Side, Unit } from '../src/engine/types';

/** Rodada 2, mãos e tabuleiros vazios, 9 de mana, 30 de vida. Criaturas de `put` entraram na rodada 1. */
export function blank(seed = 1): GameState {
  const s = newGame({ pSign: 'aries', eSign: 'touro', seed, record: false }).state;
  s.round = 2;
  for (const side of ['p', 'e'] as const) {
    const P = s[side];
    P.board = emptyBoard();
    P.hand = [];
    P.queue = [];
    P.mana = 9;
    P.max = 9;
    P.hp = 30;
  }
  return s;
}

export interface UnitOpts { atk?: number; hp?: number; kw?: Keyword[]; cid?: string; entered?: number; shield?: boolean; on?: Unit['on'] }

let nextUid = 1000;
export function put(s: GameState, side: Side, l: number, d: number, o: UnitOpts = {}): Unit {
  const kw = o.kw ?? [];
  const u: Unit = {
    uid: nextUid++, cid: o.cid ?? 'aries01', atk: o.atk ?? 1, hp: o.hp ?? 1, max: o.hp ?? 1,
    shield: o.shield ?? kw.includes('escudo'), kw, on: o.on ?? null,
    entered: o.entered ?? 1, poison: false, noReturn: false, pending: false, hidden: false,
  };
  s[side].board[l][d] = u;
  return u;
}

export function ctxOf(s: GameState): Ctx {
  return new Ctx(s, false);
}

/** Coloca a carta na mão do lado e devolve o índice dela. */
export function give(s: GameState, side: Side, cid: string): number {
  card(cid); // garante que existe
  s[side].hand.push({ hid: nextUid++, cid });
  return s[side].hand.length - 1;
}

export const ofType = <T extends GameEvent['t']>(ev: GameEvent[], t: T) =>
  ev.filter((e): e is Extract<GameEvent, { t: T }> => e.t === t);
