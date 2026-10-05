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

/** Refaz as jogadas de um plano a partir do estado inicial (com uma ação trocada). Null se alguma não valer mais. */
function refazer(state: GameState, side: Side, actions: Action[]): Plano | null {
  let s = state;
  for (const a of actions) {
    const r = applyAction(s, side, a);
    if (!r.ok) return null;
    s = r.state;
  }
  return { state: s, actions };
}

/** Variações de um plano: cada criatura invocada tentada em todas as outras casas vazias. */
function vizinhos(state: GameState, side: Side, p: Plano): Plano[] {
  const out: Plano[] = [];
  p.actions.forEach((a, k) => {
    if (a.t !== 'summon') return;
    for (let l = 0; l < 3; l++) for (let d = 0; d < 3; d++) {
      if (l === a.l && d === a.d) continue;
      const acts = p.actions.slice();
      acts[k] = { ...a, l, d };
      const r = refazer(state, side, acts);
      if (r) out.push(r);
    }
  });
  return out;
}

/** Rodada seguinte imaginada: os dois jogam a jogada "normal" e a Batalha acontece. */
function maisUmaRodada(s: GameState, side: Side, seed: number): GameState {
  if (s.phase !== 'plan') return s;
  let x = planTurn(s, opp(side), new Rng(seed)).state;
  x = planTurn(x, side, new Rng(seed ^ 0x2c1b3c6d)).state;
  return resolveBattle(x, { record: false }).state;
}

function planoDificil(state: GameState, side: Side, rng: Rng): Plano {
  const candidatos: Plano[] = [];
  // a jogada "normal" com sorteios diferentes de casa
  for (let k = 0; k < 6; k++) candidatos.push(planTurn(state, side, new Rng(rng.int(2 ** 31))));
  // variações: ordens e casas sorteadas, gastando a mana toda ou guardando cartas
  for (let k = 0; k < 40; k++) candidatos.push(planoSorteado(state, side, new Rng(rng.int(2 ** 31)), k < 28 ? 0 : 0.35, k % 3 === 0));
  candidatos.push({ state, actions: [] });

  // respostas imaginadas do rival (ele também não vê as invocações secretas da IA)
  const seeds = [rng.int(2 ** 31), rng.int(2 ** 31), rng.int(2 ** 31)];
  const futuro = rng.int(2 ** 31);
  const avaliar = (c: Plano, fundo: boolean): number => {
    const v = visao(c.state, side);
    const finais: GameState[] = [resolveBattle(v, { record: false }).state];
    for (const sd of seeds) finais.push(resolveBattle(planTurn(v, opp(side), new Rng(sd)).state, { record: false }).state);
    // avaliação funda: também olha a rodada seguinte (quem ganha a troca a longo prazo)
    const notas = finais.map(f => (fundo ? nota(f, side) * 0.5 + nota(maisUmaRodada(f, side, futuro), side) * 0.5 : nota(f, side)));
    const media = notas.reduce((t, n) => t + n, 0) / notas.length;
    return media * 0.75 + Math.min(...notas) * 0.25;
  };

  // 1ª peneira rápida; os melhores ganham avaliação funda e ajuste de casas
  const rapidos = candidatos.map(c => ({ c, n: avaliar(c, false) })).sort((a, b) => b.n - a.n);
  let finalistas = rapidos.slice(0, 6).map(x => x.c);
  for (const f of finalistas.slice(0, 2)) finalistas = finalistas.concat(vizinhos(state, side, f));
  let melhor = finalistas[0], mn = -Infinity;
  for (const c of finalistas) {
    const n = avaliar(c, true);
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
