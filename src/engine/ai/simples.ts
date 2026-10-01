// IA simples (heurística do protótipo): joga as cartas mais caras que couberem, escolhe a fileira
// pela ameaça, usa magias com alvo óbvio e queima uma carta quando isso libera uma jogada.
// Ela nunca enxerga criaturas que o outro lado invocou em segredo nesta rodada.
import { card } from '../../data/cards';
import type { SpellCard, UnitCard } from '../../data/schema';
import { applyAction } from '../round';
import type { Rng } from '../rng';
import { costOf } from '../state';
import { HERO_HP, opp, type Action, type GameState, type Side, type Target, type Unit } from '../types';

type Board = (Unit | null)[][];

/** O tabuleiro do outro lado como a IA pode vê-lo (sem as invocações secretas). */
const visible = (b: Board): Board => b.map(row => row.map(u => (u && !u.hidden ? u : null)));

function aiCell(s: GameState, side: Side, c: UnitCard, rng: Rng): { l: number; d: number } | null {
  const mine = s[side].board, foe = visible(s[opp(side)].board);
  let best: { l: number; d: number } | null = null, bs = -1e9;
  for (let l = 0; l < 3; l++) {
    const empty = [0, 1, 2].filter(d => !mine[l][d]);
    if (!empty.length) continue;
    const pu = foe[l].filter((u): u is Unit => !!u);
    const ou = [0, 1, 2].filter(d => mine[l][d]);
    const threat = pu.reduce((sum, u) => sum + u.atk, 0);
    let sc: number;
    if (pu.length && !ou.length) sc = 10 + threat;
    else if (!pu.length) sc = 6 + c.atk - ou.length * 2;
    else sc = 3 + threat - ou.length * 2;
    sc += rng.float();
    if (sc > bs) {
      bs = sc;
      const tank = c.hp > c.atk || c.kw.includes('escudo');
      best = { l, d: tank ? empty[0] : empty[empty.length - 1] };
    }
  }
  return best;
}

function aiSpell(s: GameState, side: Side, c: SpellCard): Target | null {
  const o = opp(side), me = s[side];
  let best: Target | null = null, bs = -1e9;
  const each = (who: Side, fn: (u: Unit, l: number, d: number) => void) => {
    for (let l = 0; l < 3; l++) for (let d = 0; d < 3; d++) {
      const u = s[who].board[l][d];
      if (u && u.entered !== s.round) fn(u, l, d);
    }
  };
  if (c.sp === 'dmg') each(o, (u, l, d) => {
    const sc = (!u.shield && u.hp <= c.v ? 10 : 0) + u.atk - (u.shield ? 3 : 0);
    if (sc > bs) { bs = sc; best = { side: o, l, d }; }
  });
  if (c.sp === 'poison') each(o, (u, l, d) => { if (!u.poison && u.hp > bs) { bs = u.hp; best = { side: o, l, d }; } });
  if (c.sp === 'buff') each(side, (u, l, d) => { if (u.atk > bs) { bs = u.atk; best = { side, l, d }; } });
  if (c.sp === 'shield') each(side, (u, l, d) => { if (!u.shield && u.atk + u.hp > bs) { bs = u.atk + u.hp; best = { side, l, d }; } });
  if (c.sp === 'lane') {
    const foe = visible(s[o].board);
    for (let l = 0; l < 3; l++) {
      let sc = 0;
      for (let d = 0; d < 3; d++) {
        const u = foe[l][d];
        if (u && !u.shield) sc += Math.min(c.v, u.hp) + (u.hp <= c.v ? 3 : 0);
      }
      if (sc >= 3 && sc > bs) { bs = sc; best = { side: o, l, d: 0 }; }
    }
  }
  if (c.sp === 'face') best = { side: o, l: 0, d: 0 };
  if (c.sp === 'heal' && me.hp <= HERO_HP - c.v) best = { side, l: 0, d: 0 };
  if (c.sp === 'draw' && me.hand.length <= 4) best = { side, l: 0, d: 0 };
  return best;
}

function aiPick(s: GameState, side: Side, rng: Rng): Action | null {
  const P = s[side];
  const opts = P.hand
    .map((h, i) => ({ i, cid: h.cid, c: card(h.cid) }))
    .filter(o => costOf(P, o.cid) <= P.mana)
    .sort((a, b) => b.c.cost - a.c.cost);
  for (const o of opts) {
    if (o.c.type === 'unit') {
      const cell = aiCell(s, side, o.c, rng);
      if (cell) return { t: 'summon', hand: o.i, l: cell.l, d: cell.d };
    } else {
      const tg = aiSpell(s, side, o.c);
      if (tg) return { t: 'spell', hand: o.i, tg };
    }
  }
  if (!P.recharged && P.hand.length >= 2) {
    const want = P.hand.findIndex(h => costOf(P, h.cid) === P.mana + 1);
    if (want >= 0) {
      let burn = -1, bc = 99;
      P.hand.forEach((h, i) => { const c = card(h.cid).cost; if (i !== want && c < bc) { bc = c; burn = i; } });
      if (burn >= 0) return { t: 'burn', hand: burn };
    }
  }
  return null;
}

/** Faz todo o planejamento de um lado. Devolve o estado depois das jogadas e a lista de ações. */
export function planTurn(state: GameState, side: Side, rng: Rng): { state: GameState; actions: Action[] } {
  let s = state;
  const actions: Action[] = [];
  for (let g = 0; g < 12; g++) {
    const act = aiPick(s, side, rng);
    if (!act) break;
    const r = applyAction(s, side, act);
    if (!r.ok) break;
    s = r.state;
    actions.push(act);
  }
  return { state: s, actions };
}
