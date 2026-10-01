import { card } from '../data/cards';
import type { SpellCard, TipoMagia } from '../data/schema';
import type { Ctx } from './ctx';
import { damageUnit } from './keywords';
import { draw, healHero, hitHero } from './state';
import { opp, type Side, type Target } from './types';

/** Magias de suporte resolvem antes das de dano. */
export const SUPPORT: readonly TipoMagia[] = ['buff', 'shield', 'heal', 'draw'];
export const isSupport = (sp: TipoMagia) => SUPPORT.includes(sp);

/** Magias que precisam de uma criatura que já estava em campo antes desta rodada. */
export const needsUnit = (sp: TipoMagia) => sp === 'dmg' || sp === 'buff' || sp === 'shield' || sp === 'poison';

export function spellCard(cid: string): SpellCard {
  const c = card(cid);
  if (c.type !== 'spell') throw new Error(`${cid} não é magia`);
  return c;
}

/** Alvo válido para preparar a magia `sp` do lado `side` na casa `tg` (durante o planejamento). */
export function validSpellTarget(ctx: Pick<Ctx, 's'>, side: Side, sp: TipoMagia, tg: Target): boolean {
  const u = ctx.s[tg.side].board[tg.l]?.[tg.d];
  const old = !!u && u.entered !== ctx.s.round;
  switch (sp) {
    case 'dmg': case 'poison': return tg.side !== side && old;
    case 'buff': case 'shield': return tg.side === side && old;
    case 'lane': case 'face': return tg.side !== side;
    case 'heal': case 'draw': return tg.side === side;
  }
}

/** Resolve a magia na Batalha. Devolve false se ela perdeu o alvo. */
export function castSpell(ctx: Ctx, side: Side, cid: string, tg: Target): boolean {
  const c = spellCard(cid);
  const o = opp(side);
  const u = ctx.s[tg.side].board[tg.l][tg.d];
  if (needsUnit(c.sp) && (!u || u.entered === ctx.s.round)) {
    ctx.emit({ t: 'SpellFizzled', side, cid });
    return false;
  }
  ctx.emit({ t: 'SpellResolved', side, cid, tg });
  switch (c.sp) {
    case 'dmg': damageUnit(ctx, tg.side, tg.l, tg.d, c.v); break;
    case 'buff':
      u!.atk += c.a; u!.hp += c.h; u!.max += c.h;
      ctx.emit({ t: 'Buffed', side: tg.side, l: tg.l, d: tg.d, atk: c.a, hp: c.h });
      break;
    case 'shield':
      u!.shield = true;
      ctx.emit({ t: 'ShieldGained', side: tg.side, l: tg.l, d: tg.d });
      break;
    case 'poison':
      u!.poison = true;
      ctx.emit({ t: 'Poisoned', side: tg.side, l: tg.l, d: tg.d });
      break;
    case 'lane':
      for (let d = 0; d < 3; d++) if (ctx.s[o].board[tg.l][d]) damageUnit(ctx, o, tg.l, d, c.v);
      break;
    case 'face': hitHero(ctx, o, c.v); break;
    case 'heal': healHero(ctx, side, c.v); break;
    case 'draw': for (let i = 0; i < c.v; i++) draw(ctx, side); break;
  }
  return true;
}
