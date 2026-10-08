// Campanha: 12 mundos (os signos, na ordem do zodíaco) com 10 fases cada.
// Cada fase enfrenta o deck do signo do mundo; a dificuldade sobe a cada fase e a cada mundo.
// Fase 5 = guardião (deck mais forte); fase 10 = chefe (o próprio signo, com mais vida).
import { CARDS, cardsOfSign, comNivel } from '../data/cards';
import { ORDER } from '../data/signos';
import type { Signo } from '../data/schema';
import { deckForte } from '../engine/ai/deckForte';
import type { Nivel } from '../engine/ai/niveis';
import type { Rng } from '../engine/rng';
import { cartaDaRaridade, darCartas, sortearCarta, type Progresso } from './progresso';

export const FASES = 10;
export const MUNDOS: readonly Signo[] = ORDER;
export const VIDA_CHEFE = 30;

export const chave = (signo: Signo, fase: number) => `${signo}-${fase}`;
const chaveLenda = (signo: Signo) => `${signo}-lenda`;

export function estrelas(p: Progresso, signo: Signo, fase: number): number {
  return p.campanha[chave(signo, fase)] ?? 0;
}

/** Todos os mundos ficam liberados: o jogador escolhe de qual signo quer ganhar cartas. */
export function mundoLiberado(p: Progresso, signo: Signo): boolean {
  return !!p && MUNDOS.includes(signo);
}

/** Fase liberada: a 1ª do mundo liberado; as outras depois de vencer a anterior. */
export function faseLiberada(p: Progresso, signo: Signo, fase: number): boolean {
  if (!mundoLiberado(p, signo)) return false;
  return fase <= 1 || estrelas(p, signo, fase - 1) > 0;
}

export const estrelasDoMundo = (p: Progresso, signo: Signo) =>
  Array.from({ length: FASES }, (_, i) => estrelas(p, signo, i + 1)).reduce((t, n) => t + n, 0);

/** Mundo em que o mapa abre: o do signo inicial do jogador (ou o primeiro ainda não terminado). */
export function mundoAtual(p: Progresso): Signo {
  if (p.inicial && estrelas(p, p.inicial, FASES) === 0) return p.inicial;
  for (const s of MUNDOS) if (estrelas(p, s, FASES) === 0) return s;
  return MUNDOS[MUNDOS.length - 1];
}

export type TipoFase = 'normal' | 'guardiao' | 'chefe';

export interface Fase {
  signo: Signo;
  fase: number;
  tipo: TipoFase;
  /** Nome do rival (guardião e chefe usam o nome de uma carta forte do signo). */
  rival: string;
  nivelIA: Nivel;
  /** Nível das cartas do rival. */
  nivelCartas: number;
  /** Rival usa as cartas mais fortes do signo (com cópias). */
  forte: boolean;
  vidaRival: number;
}

/**
 * Dificuldade de cada fase (igual em todos os mundos, já que todos ficam liberados):
 * IA, nível das cartas do rival, se o rival usa o deck "forte" (as melhores cartas) e a vida dele.
 * Calibrada com o simulador (src/sim/campanha.ts) para começar fácil e subir aos poucos.
 */
export const DIFICULDADE: readonly { ia: Nivel; nv: number; forte: boolean; vida: number }[] = [
  { ia: 'facil', nv: 1, forte: false, vida: 20 },
  { ia: 'facil', nv: 1, forte: false, vida: 25 },
  { ia: 'facil', nv: 1, forte: false, vida: 30 },
  { ia: 'normal', nv: 1, forte: false, vida: 20 },
  { ia: 'normal', nv: 1, forte: false, vida: 30 }, // guardião
  { ia: 'normal', nv: 1, forte: false, vida: 30 },
  { ia: 'normal', nv: 2, forte: false, vida: 25 },
  { ia: 'normal', nv: 2, forte: false, vida: 30 },
  { ia: 'normal', nv: 2, forte: false, vida: 35 },
  { ia: 'dificil', nv: 1, forte: false, vida: 30 }, // chefe
]

export function fase(signo: Signo, n: number): Fase {
  const tipo: TipoFase = n === FASES ? 'chefe' : n === 5 ? 'guardiao' : 'normal';
  const d = DIFICULDADE[Math.max(1, Math.min(FASES, n)) - 1];
  const cartas = cardsOfSign(signo);
  const rival = tipo === 'chefe' ? CARDS[`${signo}25`]?.name ?? signo
    : tipo === 'guardiao' ? CARDS[cartas[22]]?.name ?? signo
    : '';
  return { signo, fase: n, tipo, rival, nivelIA: d.ia, nivelCartas: d.nv, forte: d.forte, vidaRival: d.vida };
}

/** Deck do rival da fase, já com o nível das cartas. Fases normais: as 30 do signo; guardião e chefe: as mais fortes. */
export function deckDaFase(f: Fase, rng: Rng): string[] {
  const base = f.forte ? deckForte(rng, f.signo, f.signo) : cardsOfSign(f.signo);
  return base.map(c => comNivel(c, f.nivelCartas));
}

/** Estrelas de uma vitória pela vida que sobrou: 25+ = 3, 15+ = 2, senão 1. */
export function estrelasDaVitoria(vida: number): number {
  return vida >= 25 ? 3 : vida >= 15 ? 2 : 1;
}

export const poeiraDaFase = (n: number) => 40 + Math.round((n - 1) * 60 / (FASES - 1));
export const POEIRA_REPETIR = 10;
export const GEMAS_CHEFE = 5;

export interface PremioFase {
  p: Progresso;
  estrelas: number;
  primeira: boolean;
  poeira: number;
  gemas: number;
  cartas: string[];
  novas: string[];
  /** Ganhou a lendária do signo (3 estrelas em todas as fases do mundo). */
  lenda: boolean;
}

/**
 * Vitória numa fase: guarda as estrelas (fica a melhor) e dá os prêmios.
 * Primeira vitória: Poeira (40 a 100) + 1 carta do signo; chefe: + 1 épica do signo e 5 Gemas.
 * Repetir: 10 de Poeira. 3 estrelas em todas as 10 fases: a lendária do signo (uma vez).
 */
export function vencerFase(p0: Progresso, signo: Signo, n: number, vida: number, rng: Rng): PremioFase {
  const p = structuredClone(p0);
  const k = chave(signo, n);
  const est = estrelasDaVitoria(vida);
  const primeira = !p.campanha[k];
  p.campanha[k] = Math.max(p.campanha[k] ?? 0, est);
  let poeira = POEIRA_REPETIR, gemas = 0;
  const cartas: string[] = [];
  if (primeira) {
    poeira = poeiraDaFase(n);
    cartas.push(sortearCarta(rng, signo));
    if (n === FASES) { cartas.push(cartaDaRaridade(rng, 'e', signo)); gemas = GEMAS_CHEFE; }
  }
  let lenda = false;
  const todas3 = Array.from({ length: FASES }, (_, i) => p.campanha[chave(signo, i + 1)] ?? 0).every(e => e === 3);
  if (todas3 && !p.campanha[chaveLenda(signo)] && CARDS[`${signo}25`]) {
    p.campanha[chaveLenda(signo)] = 1;
    cartas.push(`${signo}25`);
    lenda = true;
  }
  p.poeira += poeira;
  p.gemas += gemas;
  const r = darCartas(p, cartas);
  return { p: r.p, estrelas: est, primeira, poeira, gemas, cartas, novas: r.novas, lenda };
}
