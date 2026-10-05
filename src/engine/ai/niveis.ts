// Três níveis de IA para a Partida Rápida:
// - fácil: joga sem pensar muito (cartas e casas sorteadas, às vezes para cedo, nunca queima carta);
// - normal: a IA heurística do protótipo (simples.ts);
// - difícil: monta vários planos possíveis e simula a Batalha de cada um com o próprio motor,
//   escolhendo o que deixa ela em melhor situação. Como as outras, nunca enxerga as jogadas secretas do rival.
import { card } from '../../data/cards';
import { resolveBattle } from '../battle';
import { applyAction, isValidTarget } from '../round';
import { Rng, shuffleWith } from '../rng';
import { costOf } from '../state';
import { opp, type Action, type GameState, type Side, type Target } from '../types';
import { planTurn } from './simples';

export type Nivel = 'facil' | 'normal' | 'dificil';
export const NIVEIS: readonly Nivel[] = ['facil', 'normal', 'dificil'];

type Plano = { state: GameState; actions: Action[] };

/** Joga cartas em ordem e casas sorteadas. `parar` = chance de encerrar antes de cada jogada. */
function planoSorteado(state: GameState, side: Side, rng: Rng, parar: number, queima: boolean): Plano {
  let s = state;
  const actions: Action[] = [];
  for (let g = 0; g < 12; g++) {
    if (g > 0 && rng.float() < parar) break;
    const P = s[side];
    const ordem = shuffleWith(P.hand.map((_, i) => i), n => rng.int(n));
    let feito = false;
    for (const i of ordem) {
      const cid = P.hand[i].cid, c = card(cid);
      if (costOf(P, cid) > P.mana) continue;
      const alvos: Target[] = [];
      for (const lado of [side, opp(side)] as const) {
        for (let l = 0; l < 3; l++) for (let d = 0; d < 3; d++) {
          const tg = { side: lado, l, d };
          if (isValidTarget(s, side, i, tg)) alvos.push(tg);
        }
      }
      if (!alvos.length) continue;
      const tg = alvos[rng.int(alvos.length)];
      const act: Action = c.type === 'unit' ? { t: 'summon', hand: i, l: tg.l, d: tg.d } : { t: 'spell', hand: i, tg };
      const r = applyAction(s, side, act);
      if (!r.ok) continue;
      s = r.state; actions.push(act); feito = true;
      break;
    }
    if (!feito) {
      if (queima && !P.recharged && P.hand.length >= 2) {
        const queimar: Action = { t: 'burn', hand: rng.int(P.hand.length) };
        const r = applyAction(s, side, queimar);
        if (r.ok) { s = r.state; actions.push(queimar); continue; }
      }
      break;
    }
  }
  return { state: s, actions };
}

/** Quanto um estado é bom para `side` (depois da Batalha simulada). */
function nota(s: GameState, side: Side): number {
  const me = s[side], foe = s[opp(side)];
  if (s.phase === 'over') return s.result === side ? 1e6 : s.result === 'draw' ? 0 : -1e6;
  let v = (me.hp - foe.hp) * 4;
  // perto de morrer pesa mais
  if (me.hp <= 8) v -= (9 - me.hp) * 6;
  if (foe.hp <= 8) v += (9 - foe.hp) * 6;
  const forca = (b: GameState['p']['board']) => b.flat().reduce((t, u) => t + (u ? u.atk * 1.2 + u.hp + u.kw.length * 0.8 : 0), 0);
  v += forca(me.board) - forca(foe.board);
  v += me.hand.length * 0.6 - foe.hand.length * 0.3;
  return v;
}

/** O estado como a IA pode imaginar: sem as invocações secretas nem as magias preparadas do rival. */
function visao(s: GameState, side: Side): GameState {
  const v = structuredClone(s);
  const o = opp(side);
  v[o].board = v[o].board.map(row => row.map(u => (u && u.hidden ? null : u)));
  v[o].queue = [];
  return v;
}

function planoDificil(state: GameState, side: Side, rng: Rng): Plano {
  const candidatos: Plano[] = [];
  // a jogada "normal" com sorteios diferentes de casa
  for (let k = 0; k < 4; k++) candidatos.push(planTurn(state, side, new Rng(rng.int(2 ** 31))));
  // variações: ordens e casas sorteadas, gastando a mana toda ou guardando cartas
  for (let k = 0; k < 16; k++) candidatos.push(planoSorteado(state, side, new Rng(rng.int(2 ** 31)), k < 11 ? 0 : 0.35, k % 3 === 0));
  candidatos.push({ state, actions: [] });
  let melhor = candidatos[0], mn = -Infinity;
  const resposta = rng.int(2 ** 31);
  for (const c of candidatos) {
    // imagina o rival respondendo com a jogada "normal" (ele também não vê as invocações secretas da IA)
    const v = visao(c.state, side);
    const comResposta = planTurn(v, opp(side), new Rng(resposta)).state;
    const n = nota(resolveBattle(comResposta, { record: false }).state, side) * 0.6
      + nota(resolveBattle(v, { record: false }).state, side) * 0.4;
    if (n > mn) { mn = n; melhor = c; }
  }
  return melhor;
}

/** Planejamento de um lado no nível escolhido. */
export function planTurnNivel(state: GameState, side: Side, rng: Rng, nivel: Nivel): Plano {
  if (nivel === 'facil') return planoSorteado(state, side, rng, 0.5, false);
  if (nivel === 'dificil') return planoDificil(state, side, rng);
  return planTurn(state, side, rng);
}
