// Dano, morte e ataque: onde a maioria das habilidades (keywords) age.
import type { Ctx } from './ctx';
import { healHero, hitHero } from './state';
import { HAND_MAX, opp, type Board, type Side, type Unit } from './types';

export function killUnit(ctx: Ctx, side: Side, l: number, d: number, u: Unit): void {
  const P = ctx.s[side];
  P.board[l][d] = null;
  ctx.emit({ t: 'UnitDied', side, l, d, cid: u.cid });
  // Ilusão: na primeira morte volta para a mão (se couber).
  if (u.kw.includes('ilusao') && !u.noReturn && P.hand.length < HAND_MAX) {
    P.hand.push({ hid: ctx.nextId(), cid: u.cid, ghost: true });
    ctx.emit({ t: 'UnitReturnedToHand', side, l, d, cid: u.cid });
  }
}

export interface DamageResult { dealt: number; overflow: number }

/**
 * Causa dano numa criatura. Ordem: Escudo anula tudo → Carapaça reduz 1 → aplica.
 * Se sobreviver: Veneno (da fonte) envenena e Fúria dá +1 de ataque.
 */
export function damageUnit(ctx: Ctx, side: Side, l: number, d: number, amt: number, src?: Unit): DamageResult {
  const u = ctx.s[side].board[l][d];
  if (!u) return { dealt: 0, overflow: 0 };
  if (u.shield) {
    u.shield = false;
    ctx.emit({ t: 'ShieldBroken', side, l, d });
    return { dealt: 0, overflow: 0 };
  }
  if (u.kw.includes('carapaca')) {
    amt = Math.max(0, amt - 1);
    if (!amt) {
      ctx.emit({ t: 'ArmorBlocked', side, l, d });
      return { dealt: 0, overflow: 0 };
    }
  }
  const before = u.hp;
  u.hp -= amt;
  let poisoned = false, fury = false;
  if (u.hp > 0) {
    if (src && src.kw.includes('veneno') && !u.poison) { u.poison = true; poisoned = true; }
    if (u.kw.includes('furia')) { u.atk++; fury = true; }
  }
  ctx.emit({ t: 'Damage', side, l, d, amount: amt, poisoned, fury });
  if (u.hp <= 0) killUnit(ctx, side, l, d, u);
  return { dealt: Math.min(amt, before), overflow: Math.max(0, amt - before) };
}

/** Ataque efetivo = ataque + 1 por aliado com Liderança na mesma fileira (exceto ele mesmo). */
export function effAtk(board: Board, l: number, u: Unit): number {
  let a = u.atk;
  for (let d = 0; d < 3; d++) {
    const x = board[l][d];
    if (x && x !== u && x.kw.includes('lideranca')) a++;
  }
  return a;
}

/**
 * Uma criatura ataca. `u` pode já ter morrido neste mesmo passo (ataque simultâneo): o dano dela acontece mesmo assim.
 * Alvo: primeira inimiga da fileira (Distância: a mais ao fundo); fileira vazia = herói.
 */
export function attack(ctx: Ctx, side: Side, l: number, d: number, u: Unit): void {
  const board = ctx.s[side].board;
  const atk = effAtk(board, l, u);
  if (atk <= 0) return;
  const o = opp(side);
  const foe = ctx.s[o].board;
  const occ = [0, 1, 2].filter(dd => foe[l][dd]);
  ctx.emit({ t: 'Attack', side, l, d, cid: u.cid });
  let dealt: number;
  if (!occ.length) {
    hitHero(ctx, o, atk);
    dealt = atk;
  } else {
    const idx = u.kw.includes('distancia') ? occ.length - 1 : 0;
    const refl = foe[l][occ[idx]]!.kw.includes('reflexo');
    const r = damageUnit(ctx, o, l, occ[idx], atk, u);
    dealt = r.dealt;
    // Reflexo só fere o atacante se ele ainda estiver em campo.
    if (refl && board[l][d] === u) damageUnit(ctx, side, l, d, 1);
    if (u.kw.includes('perfurar') && r.overflow > 0) {
      const nd = occ[idx + 1];
      if (nd !== undefined && foe[l][nd]) dealt += damageUnit(ctx, o, l, nd, r.overflow, u).dealt;
      else { hitHero(ctx, o, r.overflow); dealt += r.overflow; }
    }
  }
  if (u.kw.includes('vampirico') && dealt > 0) healHero(ctx, side, dealt);
}
