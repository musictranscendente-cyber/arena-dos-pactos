// Dano, morte e ataque: onde a maioria das habilidades (keywords) age.
import type { Ctx } from './ctx';
import { findUnit, healHero, hitHero } from './state';
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

/** Inabalável: nunca recebe mais que isto de dano de uma vez. */
export const INABALAVEL_MAX = 3;
/** Ferrão Final: dano em quem matou a criatura. */
export const FERRAO_DANO = 3;

/**
 * Causa dano numa criatura. Ordem: Escudo anula tudo → Carapaça reduz 1 → Inabalável limita a 3 → aplica.
 * Mira Certeira (da fonte) ignora Escudo e Carapaça.
 * Se sobreviver: Veneno (da fonte) envenena e Fúria dá +1 de ataque. Se morrer: Ferrão Final fere quem matou.
 */
export function damageUnit(ctx: Ctx, side: Side, l: number, d: number, amt: number, src?: Unit): DamageResult {
  const u = ctx.s[side].board[l][d];
  if (!u) return { dealt: 0, overflow: 0 };
  const mira = !!src?.kw.includes('mira');
  if (u.shield && !mira) {
    u.shield = false;
    ctx.emit({ t: 'ShieldBroken', side, l, d });
    return { dealt: 0, overflow: 0 };
  }
  if (u.kw.includes('carapaca') && !mira) {
    amt = Math.max(0, amt - 1);
    if (!amt) {
      ctx.emit({ t: 'ArmorBlocked', side, l, d });
      return { dealt: 0, overflow: 0 };
    }
  }
  if (u.kw.includes('inabalavel')) amt = Math.min(amt, INABALAVEL_MAX);
  const before = u.hp;
  u.hp -= amt;
  let poisoned = false, fury = false;
  if (u.hp > 0) {
    if (src && src.kw.includes('veneno') && !u.poison) { u.poison = true; poisoned = true; }
    if (u.kw.includes('furia')) { u.atk++; fury = true; }
  }
  ctx.emit({ t: 'Damage', side, l, d, amount: amt, poisoned, fury });
  if (u.hp <= 0) {
    killUnit(ctx, side, l, d, u);
    // Ferrão Final: quem matou (com um ataque) leva 3 de dano, se ainda estiver em campo.
    if (u.kw.includes('ferrao') && src) {
      const o = opp(side);
      const pos = findUnit(ctx.s[o].board, src);
      if (pos) damageUnit(ctx, o, pos.l, pos.d, FERRAO_DANO);
    }
  }
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
    const td = occ[idx];
    const alvo = foe[l][td]!;
    const refl = alvo.kw.includes('reflexo');
    let dmg = atk;
    // Julgamento: dano dobrado em quem tem mais ataque que ela.
    if (u.kw.includes('julgamento') && effAtk(foe, l, alvo) > atk) dmg *= 2;
    // Arremetida: empurra o alvo uma casa para trás; sem casa vazia atrás, +1 de dano.
    const empurra = u.kw.includes('arremetida');
    const podeEmpurrar = empurra && td < 2 && !foe[l][td + 1];
    if (empurra && !podeEmpurrar) dmg += 1;
    const r = damageUnit(ctx, o, l, td, dmg, u);
    dealt = r.dealt;
    if (podeEmpurrar && foe[l][td] === alvo && !foe[l][td + 1]) {
      foe[l][td + 1] = alvo;
      foe[l][td] = null;
      ctx.emit({ t: 'UnitPushed', side: o, l, from: td, to: td + 1, cid: alvo.cid });
    }
    // Reflexo só fere o atacante se ele ainda estiver em campo.
    if (refl && board[l][d] === u) damageUnit(ctx, side, l, d, 1);
    if (u.kw.includes('perfurar') && r.overflow > 0) {
      // próxima criatura da fileira depois do alvo (o alvo pode ter sido empurrado: procura de novo)
      const nd = [0, 1, 2].find(dd => dd > td && foe[l][dd] && foe[l][dd] !== alvo);
      if (nd !== undefined) dealt += damageUnit(ctx, o, l, nd, r.overflow, u).dealt;
      else { hitHero(ctx, o, r.overflow); dealt += r.overflow; }
    }
  }
  if (u.kw.includes('vampirico') && dealt > 0) healHero(ctx, side, dealt);
}
