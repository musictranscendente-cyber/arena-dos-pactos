import { card, cardsOfSign } from '../data/cards';
import type { Signo } from '../data/schema';
import type { Ctx } from './ctx';
import { shuffleWith } from './rng';
import { DECK_EMPTY_DMG, HAND_MAX, HERO_HP, type Board, type PlayerState, type Side, type Unit } from './types';

export const emptyBoard = (): Board => [[null, null, null], [null, null, null], [null, null, null]];

export function mkPlayer(sign: Signo, deck: string[]): PlayerState {
  return { sign, hp: HERO_HP, max: 0, mana: 0, deck, hand: [], board: emptyBoard(), recharged: false, queue: [] };
}

export function buildDeck(ctx: Ctx, sign: Signo): string[] {
  return shuffleWith(cardsOfSign(sign), n => ctx.randInt(n));
}

export function mkUnit(ctx: Ctx, cid: string, ghost = false): Unit {
  const c = card(cid);
  if (c.type !== 'unit') throw new Error(`${cid} não é criatura`);
  return {
    uid: ctx.nextId(), cid, atk: c.atk, hp: c.hp, max: c.hp,
    shield: c.kw.includes('escudo'), kw: [...c.kw], on: c.on,
    entered: ctx.s.round, poison: false, noReturn: ghost, pending: false, hidden: false,
  };
}

/** Compra 1 carta (deck vazio = -2 no herói; mão cheia = descarta a comprada). */
export function draw(ctx: Ctx, side: Side): void {
  const P = ctx.s[side];
  const cid = P.deck.pop();
  if (cid === undefined) {
    ctx.emit({ t: 'DeckEmpty', side });
    hitHero(ctx, side, DECK_EMPTY_DMG);
    return;
  }
  if (P.hand.length >= HAND_MAX) {
    ctx.emit({ t: 'DrawDiscarded', side, cid });
    return;
  }
  P.hand.push({ hid: ctx.nextId(), cid });
  ctx.emit({ t: 'CardDrawn', side, cid });
}

export function hitHero(ctx: Ctx, side: Side, amount: number): void {
  ctx.s[side].hp -= amount;
  ctx.emit({ t: 'HeroDamaged', side, amount });
}

export function healHero(ctx: Ctx, side: Side, amount: number): void {
  const P = ctx.s[side];
  P.hp = Math.min(P.hpMax ?? HERO_HP, P.hp + amount);
  ctx.emit({ t: 'HeroHealed', side, amount });
}

/** Lista as criaturas do lado em ordem de leitura: fileira de cima para baixo, frente para o fundo. */
export function unitsInOrder(board: Board): { l: number; d: number; u: Unit }[] {
  const list: { l: number; d: number; u: Unit }[] = [];
  for (let l = 0; l < 3; l++) for (let d = 0; d < 3; d++) {
    const u = board[l][d];
    if (u) list.push({ l, d, u });
  }
  return list;
}

export function findUnit(board: Board, u: Unit): { l: number; d: number } | null {
  for (let l = 0; l < 3; l++) for (let d = 0; d < 3; d++) if (board[l][d] === u) return { l, d };
  return null;
}

/** Custo real de uma carta (Corrente em campo: magias custam 1 a menos, não acumula). */
export function costOf(P: PlayerState, cid: string): number {
  const c = card(cid);
  if (c.type !== 'spell') return c.cost;
  const hasCorrente = unitsInOrder(P.board).some(x => x.u.kw.includes('corrente'));
  return hasCorrente ? Math.max(0, c.cost - 1) : c.cost;
}

/** Vê se alguém zerou; marca o fim de jogo. */
export function checkOver(ctx: Ctx): boolean {
  const s = ctx.s;
  if (s.phase === 'over') return true;
  if (s.p.hp <= 0 || s.e.hp <= 0) {
    s.phase = 'over';
    s.result = s.p.hp <= 0 && s.e.hp <= 0 ? 'draw' : s.e.hp <= 0 ? 'p' : 'e';
    ctx.emit({ t: 'GameOver', result: s.result });
    return true;
  }
  return false;
}
