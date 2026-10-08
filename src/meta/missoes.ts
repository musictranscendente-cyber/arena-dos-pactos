// Missões diárias e calendário de 7 dias (recompensa por entrar).
// Todo dia (meia-noite do aparelho) saem 3 missões sorteadas + a missão de compartilhar o jogo.
// Completar as 3 libera o Baú Diário. Dá para trocar 1 missão por dia.
import type { Signo } from '../data/schema';
import type { Rng } from '../engine/rng';
import { cartaDaRaridade, darCartas, sortearCarta, type MissaoDia, type Progresso } from './progresso';

/** O que conta para as missões, somado ao fim de cada partida (ou na hora, no caso de compartilhar). */
export type Contagem = 'vitoria' | 'partida' | 'invocar' | 'magia' | 'queimar' | 'danoHeroi' | 'abater' | 'fase' | 'compartilhar';

export interface Missao { id: string; tipo: Contagem; alvo: number; poeira: number }

export const MISSOES: readonly Missao[] = [
  { id: 'vencer2', tipo: 'vitoria', alvo: 2, poeira: 50 },
  { id: 'jogar3', tipo: 'partida', alvo: 3, poeira: 30 },
  { id: 'invocar10', tipo: 'invocar', alvo: 10, poeira: 30 },
  { id: 'magias4', tipo: 'magia', alvo: 4, poeira: 30 },
  { id: 'queimar3', tipo: 'queimar', alvo: 3, poeira: 30 },
  { id: 'dano30', tipo: 'danoHeroi', alvo: 30, poeira: 40 },
  { id: 'abater8', tipo: 'abater', alvo: 8, poeira: 40 },
  { id: 'fase1', tipo: 'fase', alvo: 1, poeira: 40 },
];
export const COMPARTILHAR: Missao = { id: 'compartilhar', tipo: 'compartilhar', alvo: 1, poeira: 20 };
export const POR_DIA = 3;
export const BAU_POEIRA = 50;
export const BAU_CARTAS = 3;

export const missao = (id: string): Missao | undefined => (id === COMPARTILHAR.id ? COMPARTILHAR : MISSOES.find(m => m.id === id));

function sortear(rng: Rng, fora: readonly string[], n: number): MissaoDia[] {
  const livres = MISSOES.filter(m => !fora.includes(m.id)).map(m => m.id);
  const out: MissaoDia[] = [];
  for (let i = 0; i < n && livres.length; i++) out.push({ id: livres.splice(rng.int(livres.length), 1)[0], prog: 0, coletada: false });
  return out;
}

/** Virou o dia: missões novas. */
export function garantirDia(p: Progresso, dia: string, rng: Rng): Progresso {
  if (p.missoes.dia === dia && p.missoes.lista.length) return p;
  const lista = [...sortear(rng, [], POR_DIA), { id: COMPARTILHAR.id, prog: 0, coletada: false }];
  return { ...p, missoes: { dia, lista, trocou: false, bau: false } };
}

/** Soma o que aconteceu (ex.: { invocar: 4, vitoria: 1 }) nas missões do dia. */
export function registrar(p: Progresso, cont: Partial<Record<Contagem, number>>): Progresso {
  const lista = p.missoes.lista.map(md => {
    const m = missao(md.id);
    if (!m || md.coletada) return md;
    return { ...md, prog: Math.min(m.alvo, md.prog + (cont[m.tipo] ?? 0)) };
  });
  return { ...p, missoes: { ...p.missoes, lista } };
}

export const pronta = (md: MissaoDia) => { const m = missao(md.id); return !!m && !md.coletada && md.prog >= m.alvo; };

/** Pega o prêmio de uma missão completa. */
export function coletar(p: Progresso, id: string): { p: Progresso; poeira: number } {
  const md = p.missoes.lista.find(x => x.id === id);
  const m = missao(id);
  if (!md || !m || !pronta(md)) return { p, poeira: 0 };
  const lista = p.missoes.lista.map(x => (x.id === id ? { ...x, coletada: true } : x));
  return { p: { ...p, poeira: p.poeira + m.poeira, missoes: { ...p.missoes, lista } }, poeira: m.poeira };
}

/** Troca uma missão (ainda não coletada, e não a de compartilhar) por outra. Uma vez por dia. */
export function trocar(p: Progresso, id: string, rng: Rng): Progresso {
  const i = p.missoes.lista.findIndex(x => x.id === id);
  if (p.missoes.trocou || i < 0 || id === COMPARTILHAR.id || p.missoes.lista[i].coletada) return p;
  const nova = sortear(rng, p.missoes.lista.map(x => x.id), 1)[0];
  if (!nova) return p;
  const lista = p.missoes.lista.map((x, j) => (j === i ? nova : x));
  return { ...p, missoes: { ...p.missoes, lista, trocou: true } };
}

/** As 3 missões principais (sem a de compartilhar) foram coletadas e o baú ainda não foi aberto. */
export function bauPronto(p: Progresso): boolean {
  const principais = p.missoes.lista.filter(x => x.id !== COMPARTILHAR.id);
  return !p.missoes.bau && principais.length > 0 && principais.every(x => x.coletada);
}

export function abrirBau(p: Progresso, rng: Rng): { p: Progresso; cartas: string[]; novas: string[] } | null {
  if (!bauPronto(p)) return null;
  const cartas = Array.from({ length: BAU_CARTAS }, () => sortearCarta(rng));
  const r = darCartas({ ...p, poeira: p.poeira + BAU_POEIRA, missoes: { ...p.missoes, bau: true } }, cartas);
  return { p: r.p, cartas, novas: r.novas };
}

/* ---------- calendário de 7 dias ---------- */

export interface PremioLogin { poeira?: number; gemas?: number; cartas?: { r: 'c' | 'r' | 'e' | 'qualquer'; n: number } }

/** Dia 1..7. Pular um dia não zera: continua de onde parou. */
export const CALENDARIO: readonly PremioLogin[] = [
  { poeira: 50 },
  { cartas: { r: 'c', n: 1 } },
  { poeira: 100 },
  { cartas: { r: 'qualquer', n: 3 } },
  { poeira: 150 },
  { cartas: { r: 'r', n: 1 } },
  { cartas: { r: 'e', n: 1 }, gemas: 10 },
];

export const loginDisponivel = (p: Progresso, dia: string) => p.login.dia !== dia;

export function coletarLogin(p: Progresso, dia: string, rng: Rng, signo?: Signo): { p: Progresso; premio: PremioLogin; cartas: string[]; novas: string[] } | null {
  if (!loginDisponivel(p, dia)) return null;
  const premio = CALENDARIO[p.login.passo % CALENDARIO.length];
  const cartas: string[] = [];
  if (premio.cartas) {
    for (let i = 0; i < premio.cartas.n; i++) {
      cartas.push(premio.cartas.r === 'qualquer' ? sortearCarta(rng) : cartaDaRaridade(rng, premio.cartas.r, signo && rng.float() < 0.5 ? signo : undefined));
    }
  }
  const q: Progresso = {
    ...p,
    poeira: p.poeira + (premio.poeira ?? 0),
    gemas: p.gemas + (premio.gemas ?? 0),
    login: { dia, passo: (p.login.passo + 1) % CALENDARIO.length },
  };
  const r = darCartas(q, cartas);
  return { p: r.p, premio, cartas, novas: r.novas };
}
