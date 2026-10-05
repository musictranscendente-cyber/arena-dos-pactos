// O botão "Batalha!": Revelação → magias de suporte → magias de dano → chegadas → enfrentamento por fileira.
import { Ctx } from './ctx';
import { attack, damageUnit, resolverFerroes } from './keywords';
import { startRound } from './round';
import { castSpell, isSupport, spellCard } from './spells';
import { checkOver, draw, findUnit, healHero, hitHero, mkUnit, unitsInOrder } from './state';
import { ECO_ID } from '../data/cards';
import { opp, SIDES, type Frame, type GameState, type Side, type Target, type Unit } from './types';

export function resolveBattle(state: GameState, opts: { record?: boolean } = {}): { state: GameState; frames: Frame[] } {
  if (state.phase !== 'plan') throw new Error('A Batalha só acontece durante o planejamento.');
  const ctx = new Ctx(structuredClone(state), opts.record ?? true);
  runBattle(ctx);
  return { state: ctx.s, frames: ctx.frames };
}

function runBattle(ctx: Ctx): void {
  const s = ctx.s;

  // 1) Revelação: as criaturas invocadas em segredo aparecem.
  for (const side of SIDES) {
    for (const { l, d, u } of unitsInOrder(s[side].board)) {
      if (!u.hidden) continue;
      u.hidden = false;
      ctx.emit({ t: 'Reveal', side, l, d, cid: u.cid });
      ctx.beat('reveal');
    }
  }

  // 2) e 3) Magias: suporte antes de dano; dentro do grupo, jogador da esquerda primeiro.
  const spells = [
    ...s.p.queue.map(q => ({ side: 'p' as Side, ...q })),
    ...s.e.queue.map(q => ({ side: 'e' as Side, ...q })),
  ].sort((a, b) => (isSupport(spellCard(a.cid).sp) ? 0 : 1) - (isSupport(spellCard(b.cid).sp) ? 0 : 1));
  s.p.queue = [];
  s.e.queue = [];
  if (spells.length) ctx.beat('spells');
  for (const q of spells) {
    castSpell(ctx, q.side, q.cid, q.tg);
    if (checkOver(ctx)) return void ctx.beat('end');
    ctx.beat('spell');
  }

  // 4) Efeitos de chegada pendentes, em ordem de leitura.
  for (const side of SIDES) {
    for (const { l, d, u } of unitsInOrder(s[side].board)) {
      if (!u.pending || s[side].board[l][d] !== u) continue;
      arrive(ctx, side, l, d, u);
      if (checkOver(ctx)) return void ctx.beat('end');
      ctx.beat('arrival');
      if (ferroes(ctx)) return;
    }
  }

  // 5) Enfrentamento fileira por fileira; a n-ésima criatura de cada lado ataca junto.
  ctx.beat('battle');
  for (let row = 0; row < 3; row++) {
    ctx.emit({ t: 'RowStarted', row });
    const P = unitsInOrder(s.p.board).filter(x => x.l === row);
    const E = unitsInOrder(s.e.board).filter(x => x.l === row);
    for (let i = 0; i < Math.max(P.length, E.length); i++) {
      const pe = alive(s, 'p', P[i]?.u);
      const ee = alive(s, 'e', E[i]?.u);
      if (!pe && !ee) continue;
      const active: Target[] = [];
      if (pe) active.push({ side: 'p', l: pe.l, d: pe.d });
      if (ee) active.push({ side: 'e', l: ee.l, d: ee.d });
      ctx.beat('step-start', active);
      // Simultâneo: as duas criaturas foram escolhidas antes; quem morrer no passo ainda bate.
      if (pe) attack(ctx, 'p', pe.l, pe.d, pe.u);
      if (ee) attack(ctx, 'e', ee.l, ee.d, ee.u);
      if (checkOver(ctx)) return void ctx.beat('end');
      ctx.beat('step');
      if (ferroes(ctx)) return;
    }
  }

  startRound(ctx);
}

/** Ferrão Final depois do golpe, num quadro próprio. Devolve true se a partida acabou. */
function ferroes(ctx: Ctx): boolean {
  if (!ctx.ferroes.length) return false;
  resolverFerroes(ctx);
  if (checkOver(ctx)) { ctx.beat('end'); return true; }
  ctx.beat('ferrao');
  return false;
}

function alive(s: GameState, side: Side, u: Unit | undefined): { l: number; d: number; u: Unit } | null {
  if (!u) return null;
  const pos = findUnit(s[side].board, u);
  return pos ? { ...pos, u } : null;
}

function arrive(ctx: Ctx, side: Side, l: number, d: number, u: Unit): void {
  const s = ctx.s;
  u.pending = false;
  ctx.emit({ t: 'ArrivalResolved', side, l, d, cid: u.cid });
  const board = s[side].board;
  switch (u.on) {
    case 'twin': {
      // Duplicar: Eco 1/1 numa casa vazia da mesma fileira, senão em qualquer casa vazia.
      let spot: [number, number] | null = null;
      for (let dd = 0; dd < 3 && !spot; dd++) if (!board[l][dd]) spot = [l, dd];
      for (let a = 0; a < 3 && !spot; a++) for (let b = 0; b < 3 && !spot; b++) if (!board[a][b]) spot = [a, b];
      if (spot) {
        board[spot[0]][spot[1]] = mkUnit(ctx, ECO_ID, true);
        ctx.emit({ t: 'UnitPlaced', side, l: spot[0], d: spot[1], cid: ECO_ID, token: true });
      }
      break;
    }
    case 'draw': draw(ctx, side); break;
    case 'face1': hitHero(ctx, opp(side), 1); break;
    case 'heal2': healHero(ctx, side, 2); break;
    case 'volley': {
      const o = opp(side);
      const foes = unitsInOrder(s[o].board);
      if (foes.length) {
        const f = foes[ctx.randInt(foes.length)];
        damageUnit(ctx, o, f.l, f.d, 2);
      }
      break;
    }
  }
  if (u.kw.includes('investida')) attack(ctx, side, l, d, u);
}
