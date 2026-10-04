// Partida nova, início de rodada e as ações do planejamento secreto.
import { card } from '../data/cards';
import type { Signo } from '../data/schema';
import { Ctx } from './ctx';
import { killUnit } from './keywords';
import { spellCard, validSpellTarget } from './spells';
import { buildDeck, checkOver, costOf, draw, mkPlayer, mkUnit } from './state';
import { MAX_MANA, SIDES, START_HAND, type Action, type Frame, type GameEvent, type GameState, type Side, type Target } from './types';

export interface NewGameOptions {
  pSign: Signo;
  eSign: Signo;
  seed: number;
  /** Guarda foto do estado em cada quadro (a interface usa; o simulador desliga). */
  record?: boolean;
}

export function newGame(opts: NewGameOptions): { state: GameState; frames: Frame[] } {
  const s = {
    round: 0, phase: 'plan', result: null, rng: opts.seed | 0, uid: 0,
  } as unknown as GameState;
  const ctx = new Ctx(s, opts.record ?? true);
  s.p = mkPlayer(opts.pSign, buildDeck(ctx, opts.pSign));
  s.e = mkPlayer(opts.eSign, buildDeck(ctx, opts.eSign));
  for (let i = 0; i < START_HAND; i++) { draw(ctx, 'p'); draw(ctx, 'e'); }
  startRound(ctx);
  return { state: ctx.s, frames: ctx.frames };
}

/** Desistir: quem desiste perde na hora (só durante o planejamento). */
export function surrender(state: GameState, side: Side): ActionResult {
  if (state.phase !== 'plan') return { ok: false, reason: 'fase' };
  const s = structuredClone(state);
  const ctx = new Ctx(s, false);
  s.phase = 'over';
  s.result = side === 'p' ? 'e' : 'p';
  s.surrendered = side;
  ctx.emit({ t: 'GameOver', result: s.result, surrendered: side });
  return { ok: true, state: s, events: ctx.flush() };
}

/** Início de rodada de um lado: mana, Ascensão/Cura, Veneno, compra. */
function tickSide(ctx: Ctx, side: Side): void {
  const P = ctx.s[side];
  P.max = Math.min(MAX_MANA, P.max + 1);
  P.mana = P.max;
  P.recharged = false;
  ctx.emit({ t: 'ManaRefilled', side, max: P.max });
  for (let l = 0; l < 3; l++) for (let d = 0; d < 3; d++) {
    const u = P.board[l][d];
    if (!u) continue;
    if (u.kw.includes('ascensao')) {
      u.atk++; u.hp++; u.max++;
      ctx.emit({ t: 'Buffed', side, l, d, atk: 1, hp: 1 });
    }
    if (u.kw.includes('cura')) {
      for (let dd = 0; dd < 3; dd++) {
        const a = P.board[l][dd];
        if (a && a.hp < a.max) {
          const h = Math.min(2, a.max - a.hp);
          a.hp += h;
          ctx.emit({ t: 'UnitHealed', side, l, d: dd, amount: h });
        }
      }
    }
  }
  for (let l = 0; l < 3; l++) for (let d = 0; d < 3; d++) {
    const u = P.board[l][d];
    if (u && u.poison) {
      u.hp -= 1;
      ctx.emit({ t: 'PoisonTick', side, l, d });
      if (u.hp <= 0) killUnit(ctx, side, l, d, u);
    }
  }
  draw(ctx, side);
}

export function startRound(ctx: Ctx): void {
  ctx.s.round++;
  ctx.emit({ t: 'RoundStarted', round: ctx.s.round });
  for (const side of SIDES) tickSide(ctx, side);
  checkOver(ctx);
  ctx.beat('tick');
}

export type ActionResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; reason: 'fase' | 'carta' | 'mana' | 'alvo' | 'queimou' };

/** Aplica uma ação do planejamento. Não altera o estado recebido. */
export function applyAction(state: GameState, side: Side, a: Action): ActionResult {
  if (state.phase !== 'plan') return { ok: false, reason: 'fase' };
  const s = structuredClone(state);
  const ctx = new Ctx(s, false);
  const P = s[side];
  const h = P.hand[a.hand];
  if (!h) return { ok: false, reason: 'carta' };

  if (a.t === 'burn') {
    if (P.recharged) return { ok: false, reason: 'queimou' };
    P.hand.splice(a.hand, 1);
    P.mana++;
    P.recharged = true;
    ctx.emit({ t: 'CardBurned', side, cid: h.cid });
    return { ok: true, state: s, events: ctx.flush() };
  }

  const c = card(h.cid);
  const cost = costOf(P, h.cid);
  if (cost > P.mana) return { ok: false, reason: 'mana' };

  if (a.t === 'summon') {
    if (c.type !== 'unit') return { ok: false, reason: 'carta' };
    if (!validSummon(s, side, a.l, a.d)) return { ok: false, reason: 'alvo' };
    P.mana -= cost;
    P.hand.splice(a.hand, 1);
    const u = mkUnit(ctx, h.cid, !!h.ghost);
    u.pending = !!(u.on || u.kw.includes('investida'));
    u.hidden = true;
    P.board[a.l][a.d] = u;
    ctx.emit({ t: 'UnitPlaced', side, l: a.l, d: a.d, cid: h.cid });
    return { ok: true, state: s, events: ctx.flush() };
  }

  if (c.type !== 'spell') return { ok: false, reason: 'carta' };
  if (!validSpellTarget(ctx, side, spellCard(h.cid).sp, a.tg)) return { ok: false, reason: 'alvo' };
  P.mana -= cost;
  P.hand.splice(a.hand, 1);
  P.queue.push({ cid: h.cid, tg: { ...a.tg } });
  ctx.emit({ t: 'SpellQueued', side, cid: h.cid, tg: { ...a.tg } });
  return { ok: true, state: s, events: ctx.flush() };
}

function validSummon(s: GameState, side: Side, l: number, d: number): boolean {
  return l >= 0 && l < 3 && d >= 0 && d < 3 && !s[side].board[l][d];
}

/** A carta da mão pode ir nesta casa? (para destacar as casas válidas na interface) */
export function isValidTarget(s: GameState, side: Side, hand: number, tg: Target): boolean {
  const h = s[side].hand[hand];
  if (!h || s.phase !== 'plan' || costOf(s[side], h.cid) > s[side].mana) return false;
  const c = card(h.cid);
  if (c.type === 'unit') return tg.side === side && validSummon(s, side, tg.l, tg.d);
  return validSpellTarget({ s }, side, c.sp, tg);
}
