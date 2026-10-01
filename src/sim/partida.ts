import type { Signo } from '../data/schema';
import { newGame, planTurn, resolveBattle, Rng, type Result } from '../engine';

/** Limite de segurança: depois disso a partida conta como empate. */
export const MAX_ROUNDS = 100;

export interface GameSummary { result: Result | 'limite'; rounds: number }

/** Uma partida inteira IA contra IA, sem interface e sem gravar quadros. */
export function playAiGame(pSign: Signo, eSign: Signo, seed: number): GameSummary {
  let { state } = newGame({ pSign, eSign, seed, record: false });
  const rngP = new Rng(seed ^ 0x9e3779b9), rngE = new Rng(seed ^ 0x85ebca6b);
  while (state.phase === 'plan') {
    if (state.round > MAX_ROUNDS) return { result: 'limite', rounds: state.round };
    state = planTurn(state, 'p', rngP).state;
    state = planTurn(state, 'e', rngE).state;
    state = resolveBattle(state, { record: false }).state;
  }
  return { result: state.result!, rounds: state.round };
}
