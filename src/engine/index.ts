// Motor de regras do Arena dos Pactos: TypeScript puro, sem DOM, sem Math.random, sem relógio.
// Entra estado + ações; sai estado novo + quadros/eventos para a interface animar.
export * from './types';
export { newGame, applyAction, isValidTarget, type ActionResult, type NewGameOptions } from './round';
export { resolveBattle } from './battle';
export { costOf, unitsInOrder } from './state';
export { effAtk } from './keywords';
export { needsUnit, isSupport, SUPPORT } from './spells';
export { Rng } from './rng';
export { planTurn } from './ai/simples';
