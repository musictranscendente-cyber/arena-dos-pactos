import type { Chegada, Keyword, Signo } from '../data/schema';

/** 'p' = jogador da esquerda (resolve primeiro nos empates de ordem), 'e' = rival da direita. */
export type Side = 'p' | 'e';
export const SIDES: readonly Side[] = ['p', 'e'];
export const opp = (s: Side): Side => (s === 'p' ? 'e' : 'p');

export const HERO_HP = 30;
export const MAX_MANA = 9;
export const HAND_MAX = 8;
export const START_HAND = 3;
export const DECK_EMPTY_DMG = 2;
/** Cartas num deck (de um signo só ou montado com 2 signos). */
export const DECK_SIZE = 30;

export interface Unit {
  uid: number;
  cid: string;
  atk: number;
  hp: number;
  max: number;
  shield: boolean;
  kw: Keyword[];
  on: Chegada | null;
  /** Rodada em que entrou em campo (magias só miram criaturas de rodadas anteriores). */
  entered: number;
  poison: boolean;
  /** Ilusão: a cópia que voltou para a mão (e o Eco) não voltam de novo. */
  noReturn: boolean;
  /** Efeito de chegada / Investida ainda por resolver na Batalha (⏳). */
  pending: boolean;
  /** Invocada em segredo nesta rodada; o outro lado só vê depois da Revelação. */
  hidden: boolean;
}

export interface HandCard {
  hid: number;
  cid: string;
  /** Cópia devolvida pela Ilusão. */
  ghost?: boolean;
}

/** Linha (fileira 0..2, de cima para baixo) × profundidade (0 = frente ... 2 = fundo). */
export type Board = (Unit | null)[][];

export interface Target { side: Side; l: number; d: number }

export interface QueuedSpell { cid: string; tg: Target }

export interface PlayerState {
  sign: Signo;
  /** Segundo signo, quando o deck foi montado com 2 signos. */
  sign2?: Signo;
  hp: number;
  max: number;
  mana: number;
  deck: string[];
  hand: HandCard[];
  board: Board;
  /** Já queimou uma carta nesta rodada. */
  recharged: boolean;
  /** Magias preparadas nesta rodada (já pagas), resolvem na Batalha. */
  queue: QueuedSpell[];
}

export type Phase = 'plan' | 'over';
export type Result = 'p' | 'e' | 'draw';

export interface GameState {
  round: number;
  phase: Phase;
  result: Result | null;
  /** Lado que desistiu da batalha (se a partida acabou assim). */
  surrendered?: Side;
  /** Estado do gerador aleatório com semente. */
  rng: number;
  /** Contador de ids (criaturas e cartas na mão). */
  uid: number;
  p: PlayerState;
  e: PlayerState;
}

export type GameEvent =
  | { t: 'RoundStarted'; round: number }
  | { t: 'ManaRefilled'; side: Side; max: number }
  | { t: 'CardDrawn'; side: Side; cid: string }
  | { t: 'DrawDiscarded'; side: Side; cid: string }
  | { t: 'DeckEmpty'; side: Side }
  | { t: 'CardBurned'; side: Side; cid: string }
  | { t: 'UnitPlaced'; side: Side; l: number; d: number; cid: string; token?: boolean }
  | { t: 'SpellQueued'; side: Side; cid: string; tg: Target }
  | { t: 'Reveal'; side: Side; l: number; d: number; cid: string }
  | { t: 'SpellResolved'; side: Side; cid: string; tg: Target }
  | { t: 'SpellFizzled'; side: Side; cid: string }
  | { t: 'ArrivalResolved'; side: Side; l: number; d: number; cid: string }
  | { t: 'RowStarted'; row: number }
  | { t: 'Attack'; side: Side; l: number; d: number; cid: string }
  | { t: 'Damage'; side: Side; l: number; d: number; amount: number; poisoned: boolean; fury: boolean }
  | { t: 'ShieldBroken'; side: Side; l: number; d: number }
  | { t: 'ArmorBlocked'; side: Side; l: number; d: number }
  | { t: 'ShieldGained'; side: Side; l: number; d: number }
  | { t: 'Poisoned'; side: Side; l: number; d: number }
  | { t: 'PoisonTick'; side: Side; l: number; d: number }
  | { t: 'Buffed'; side: Side; l: number; d: number; atk: number; hp: number }
  | { t: 'UnitHealed'; side: Side; l: number; d: number; amount: number }
  | { t: 'UnitDied'; side: Side; l: number; d: number; cid: string }
  | { t: 'UnitReturnedToHand'; side: Side; l: number; d: number; cid: string }
  | { t: 'HeroDamaged'; side: Side; amount: number }
  | { t: 'HeroHealed'; side: Side; amount: number }
  | { t: 'Sting'; side: Side; l: number; d: number; from: Target; cid: string }
  | { t: 'UnitPushed'; side: Side; l: number; from: number; to: number; cid: string }
  | { t: 'GameOver'; result: Result; surrendered?: Side };

/** Um "quadro" da Batalha: os eventos que aconteceram juntos e como ficou a mesa depois. */
export interface Frame {
  kind: 'tick' | 'reveal' | 'spells' | 'spell' | 'arrival' | 'battle' | 'row' | 'step-start' | 'step' | 'ferrao' | 'end';
  events: GameEvent[];
  /** Criaturas atacando neste passo (para destacar). */
  active?: Target[];
  /** Foto do estado ao fim do quadro (ausente quando a gravação está desligada, ex.: simulador). */
  state?: GameState;
}

export type Action =
  | { t: 'summon'; hand: number; l: number; d: number }
  | { t: 'spell'; hand: number; tg: Target }
  | { t: 'burn'; hand: number };
