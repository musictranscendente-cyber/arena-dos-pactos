// Ranking (Ranqueada): ligas, pontos de cada partida, temporadas e os jogadores da arena.
// Lógica pura (sem tela e sem internet): quem lê e grava na nuvem é services/ranking.ts.
//
// Pontos de Glória:
// - vitória: +20, +1 para cada 20 pontos que o rival tem a mais que você (até +10), +5 a partir da 3ª vitória seguida;
// - derrota (ou desistência): −12; empate: +3;
// - quem chega a uma liga não cai para a de baixo (os pontos param no piso da liga).
// Temporada = temporada do signo (ex.: Sagitário de 22/11 a 21/12). Na virada, os pontos caem pela metade
// e cada um ganha um prêmio pela maior liga alcançada (Top 10 ganha também um troféu).
//
// Os 100 jogadores da arena (bots) "jogam" sozinhos: a pontuação de cada um sai de uma conta com a data,
// então todo mundo vê o mesmo ranking sem precisar de servidor. Abaixo deles há uma multidão de jogadores
// que não aparece na lista, só na sua posição (#1.384, por exemplo).
import { NIVEL_MAX } from '../data/cards';
import { ORDER, RACES } from '../data/signos';
import type { Signo } from '../data/schema';
import type { Nivel } from '../engine/ai/niveis';
import type { Rng } from '../engine/rng';

/* ---------- ligas ---------- */

export type IdLiga = 'poeira' | 'cometa' | 'lua' | 'sol' | 'constelacao' | 'cosmico';
export const LIGAS: readonly { id: IdLiga; min: number; i: string }[] = [
  { id: 'poeira', min: 0, i: '✨' },
  { id: 'cometa', min: 300, i: '☄️' },
  { id: 'lua', min: 700, i: '🌙' },
  { id: 'sol', min: 1200, i: '☀️' },
  { id: 'constelacao', min: 1800, i: '🌌' },
  { id: 'cosmico', min: 2500, i: '👑' },
];

/** Índice da liga (0 = Poeira Estelar ... 5 = Cósmico) para uma pontuação. */
export function ligaDe(pontos: number): number {
  let i = 0;
  LIGAS.forEach((l, k) => { if (pontos >= l.min) i = k; });
  return i;
}

/** Prêmio do fim da temporada pela maior liga alcançada. */
export const PREMIO_LIGA: readonly { poeira: number; gemas: number }[] = [
  { poeira: 50, gemas: 0 },
  { poeira: 100, gemas: 0 },
  { poeira: 200, gemas: 0 },
  { poeira: 350, gemas: 5 },
  { poeira: 500, gemas: 10 },
  { poeira: 800, gemas: 25 },
];
export const GEMAS_TOP10 = 20;

/* ---------- temporada ---------- */

export interface Temporada { id: string; signo: Signo; inicio: number; fim: number }

/** Temporada do signo em que a data cai (horário UTC, igual para todos os jogadores). */
export function temporadaDe(agora: number): Temporada {
  const d = new Date(agora);
  const ano = d.getUTCFullYear();
  // começos das temporadas do ano passado, deste e do próximo, em ordem
  const marcos: { signo: Signo; t: number }[] = [];
  for (const a of [ano - 1, ano, ano + 1]) {
    for (const s of ORDER) marcos.push({ signo: s, t: Date.UTC(a, RACES[s].dt[0] - 1, RACES[s].dt[1]) });
  }
  marcos.sort((x, y) => x.t - y.t);
  let i = 0;
  while (i + 1 < marcos.length && marcos[i + 1].t <= agora) i++;
  const m = marcos[i];
  return { id: `${new Date(m.t).getUTCFullYear()}-${m.signo}`, signo: m.signo, inicio: m.t, fim: marcos[i + 1].t };
}

/** Temporada a partir do id ("2026-sagitario"); null se o id não fizer sentido. */
export function temporadaPorId(id: string): Temporada | null {
  const [ano, signo] = id.split('-');
  if (!ORDER.includes(signo as Signo) || !/^\d{4}$/.test(ano)) return null;
  const t = temporadaDe(Date.UTC(Number(ano), RACES[signo as Signo].dt[0] - 1, RACES[signo as Signo].dt[1]));
  return t.id === id ? t : null;
}

/* ---------- pontos da partida ---------- */

export interface EstadoRank {
  temporada: string;
  pontos: number;
  /** Maior liga alcançada nesta temporada (não cai abaixo do piso dela). */
  ligaMax: number;
  /** Vitórias seguidas. */
  seguidas: number;
  vitorias: number;
  derrotas: number;
  /** Quantas vezes terminou uma temporada no Top 10. */
  trofeus: number;
}

export const novoEstado = (temporada: string): EstadoRank =>
  ({ temporada, pontos: 0, ligaMax: 0, seguidas: 0, vitorias: 0, derrotas: 0, trofeus: 0 });

export const VITORIA = 20, BONUS_MAX = 10, BONUS_SEQUENCIA = 5, DERROTA = 12, EMPATE = 3;

export type Resultado = 'vitoria' | 'derrota' | 'empate';

/** Aplica o resultado de uma partida ranqueada. `rival` = pontos do adversário. */
export function aplicarResultado(e: EstadoRank, r: Resultado, rival: number): { e: EstadoRank; delta: number; subiu: boolean } {
  let delta: number;
  const n = { ...e };
  if (r === 'vitoria') {
    const bonus = Math.min(BONUS_MAX, Math.max(0, Math.floor((rival - e.pontos) / 20)));
    delta = VITORIA + bonus + (e.seguidas >= 2 ? BONUS_SEQUENCIA : 0);
    n.seguidas++; n.vitorias++;
  } else if (r === 'empate') {
    delta = EMPATE; n.seguidas = 0;
  } else {
    delta = -DERROTA; n.seguidas = 0; n.derrotas++;
  }
  // proteção da liga: não cai abaixo do piso da maior liga alcançada
  n.pontos = Math.max(LIGAS[e.ligaMax].min, e.pontos + delta);
  delta = n.pontos - e.pontos;
  n.ligaMax = Math.max(e.ligaMax, ligaDe(n.pontos));
  return { e: n, delta, subiu: n.ligaMax > e.ligaMax };
}

/** Virada de temporada: prêmio pela liga (e pelo Top 10), pontos pela metade. */
export function virarTemporada(e: EstadoRank, nova: string, posicaoFinal: number): { e: EstadoRank; poeira: number; gemas: number; top10: boolean } {
  const p = PREMIO_LIGA[e.ligaMax];
  const top10 = posicaoFinal >= 1 && posicaoFinal <= 10 && e.vitorias > 0;
  const pontos = Math.floor(e.pontos / 2);
  return {
    e: { temporada: nova, pontos, ligaMax: ligaDe(pontos), seguidas: 0, vitorias: 0, derrotas: 0, trofeus: e.trofeus + (top10 ? 1 : 0) },
    poeira: p.poeira, gemas: p.gemas + (top10 ? GEMAS_TOP10 : 0), top10,
  };
}

/* ---------- números "aleatórios" fixos (mesmo resultado em qualquer aparelho) ---------- */

function mistura(h: number, x: number): number {
  h = Math.imul(h ^ x, 0x5bd1e995);
  h ^= h >>> 15;
  return Math.imul(h, 0x27d4eb2d);
}
/** Número entre 0 e 1 a partir de vários inteiros. */
export function sorte(...n: number[]): number {
  let h = 0x9e3779b9;
  for (const x of n) h = mistura(h, x | 0);
  h ^= h >>> 13; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function textoNum(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h | 0;
}

/* ---------- os 100 jogadores da arena ---------- */

/** Apelidos dos jogadores da arena (estilo de nome que as pessoas usam em jogos). */
export const APELIDOS: readonly string[] = [
  'lucas_aries', 'MoonQueen', 'Kenji77', 'SrtaEscorpiao', 'DarkLeo', 'bia.sol', 'xXDragaoXx', 'Thiago_GM', 'StarFox99', 'Mari.Lua',
  'ZodiacKing', 'pedrinho10', 'CelestialAna', 'Rafa_Tauro', 'NightOwl', 'juliana.r', 'ProGamerBR', 'AstroBoy22', 'Luna_Mistica', 'Kaique07',
  'GabiFire', 'MrCapricorn', 'SakuraChan', 'joao_pisces', 'VitorHugo', 'CosmicJoe', 'Fe_Gemeos', 'Lobo_Solitario', 'NinaStar', 'Matheus_X',
  'ShadowLibra', 'CarolzinhaS2', 'TheArcher', 'Duda_Leao', 'Kratos_br', 'IsaMoon', 'EnzoGamer', 'MysticVirgo', 'Ricardo_88', 'AuroraBR',
  'TigerClaw', 'leticia.m', 'Bruno_Sagitario', 'Valkyria', 'HenriqueZ', 'PixelWitch', 'Ana_Aquario', 'GuiSantos', 'Orion_77', 'Manu.Astral',
  'Diego_TCG', 'StarlightSue', 'CaioCards', 'Yuki_Neko', 'Felipe.R', 'Draconis', 'Lari_Cancer', 'Samurai_X', 'Pri_Zodiaco', 'Nexus_99',
  'DaniLua', 'Ronin_BR', 'Clara.Estrela', 'IronTaurus', 'Leozinho', 'Vega_Star', 'Amanda_88', 'Phoenix_Rise', 'Igor_Cards', 'Selene',
  'Murilo.gg', 'BlueComet', 'Raissa_S', 'Hades_Lord', 'Vini_Escorpiao', 'Stellaris', 'Bea_Libra', 'KingAries', 'Lorena.M', 'Zephyr',
  'Arthur_TCG', 'Nebulosa', 'Giovana.k', 'Atlas_Prime', 'Rodrigo_Leao', 'Mia_Cosmos', 'Cadu_99', 'Andromeda', 'Sofia.gm', 'BlackPisces',
  'Wesley_BR', 'Lyra_Sky', 'Otavio.X', 'Polaris', 'Bianca_Astro', 'Hunter_GO', 'Tati.Sol', 'Sirius_Black', 'Yasmin_Z', 'Gaia_Earth',
];
export const TOTAL_BOTS = APELIDOS.length;

export interface Bot { i: number; nome: string; signo: Signo; signo2: Signo }

export const BOTS: readonly Bot[] = APELIDOS.map((nome, i) => {
  const signo = ORDER[Math.floor(sorte(i, 11) * ORDER.length)];
  const outros = ORDER.filter(s => s !== signo);
  // 1 em cada 4 joga com um signo só
  const signo2 = sorte(i, 12) < 0.25 ? signo : outros[Math.floor(sorte(i, 13) * outros.length)];
  return { i, nome, signo, signo2 };
});

/** Talento fixo de cada bot (o mesmo em todas as temporadas) e meta da temporada pela colocação. */
function metasDaTemporada(temp: string): number[] {
  const t = textoNum(temp);
  const talento = BOTS.map(b => ({ i: b.i, v: 0.6 * sorte(b.i, 1) + 0.4 * sorte(b.i, t, 2) }));
  talento.sort((a, b) => b.v - a.v);
  const meta = new Array<number>(TOTAL_BOTS);
  // 1º termina perto de 2.800; o 100º perto de 700
  talento.forEach((x, r) => { meta[x.i] = Math.round(700 + 2100 * Math.pow(1 - r / (TOTAL_BOTS - 1), 1.6)); });
  return meta;
}
const cacheMetas = new Map<string, number[]>();
function metas(temp: string): number[] {
  let m = cacheMetas.get(temp);
  if (!m) { m = metasDaTemporada(temp); cacheMetas.set(temp, m); }
  return m;
}

const HORA = 3600_000, DIA = 24 * HORA;

/** Pontos de um bot num momento da temporada. */
export function pontosBot(i: number, temp: Temporada, agora: number): number {
  const t = textoNum(temp.id);
  const meta = metas(temp.id)[i];
  const f = Math.min(1, Math.max(0, (agora - temp.inicio) / (temp.fim - temp.inicio)));
  // começa com metade (mais ou menos) do que fez na temporada passada; uns sobem cedo, outros no fim
  const inicio = meta * (0.45 + 0.1 * sorte(i, t, 3));
  const ritmo = 0.7 + 0.7 * sorte(i, t, 4);
  const hora = Math.floor(agora / HORA), dia = Math.floor(agora / DIA);
  const sobeDesce = (sorte(i, hora, 5) - 0.5) * 24 + (sorte(i, dia, 6) - 0.5) * 60 * Math.min(1, f * 4);
  return Math.max(0, Math.round(inicio + (meta - inicio) * Math.pow(f, ritmo) + sobeDesce));
}

export interface Linha {
  nome: string;
  signo: Signo;
  pontos: number;
  trofeus: number;
  /** Bot (índice) ou jogador real (id da conta). */
  bot?: number;
  id?: string;
  eu?: boolean;
}

export function linhasDosBots(temp: Temporada, agora: number): Linha[] {
  return BOTS.map(b => ({ nome: b.nome, signo: b.signo, pontos: pontosBot(b.i, temp, agora), trofeus: sorte(b.i, 7) < 0.12 ? 1 + Math.floor(sorte(b.i, 8) * 3) : 0, bot: b.i }));
}

/* ---------- a multidão abaixo do Top 100 ---------- */

/** Quantos jogadores existem abaixo dos 100 da arena (cresce aos poucos com o tempo). */
export function tamanhoMultidao(agora: number): number {
  const dias = Math.max(0, Math.floor((agora - Date.UTC(2026, 10, 1)) / DIA));
  return Math.min(9000, 1400 + dias * 3);
}

/** Quantos da multidão têm mais pontos que você. `corte` = pontos do último bot do Top 100. */
export function multidaoAcima(pontos: number, corte: number, total: number): number {
  if (corte <= 0 || pontos >= corte) return 0;
  return Math.round(total * Math.pow((corte - pontos) / corte, 2.5));
}

export interface Classificacao {
  /** Top 100 (bots + jogadores reais + você, se couber). */
  top: Linha[];
  /** Sua posição (1 = primeiro). */
  posicao: number;
  /** Sua linha (null = sem conta). */
  eu: Linha | null;
}

/**
 * Monta o Top 100 e a sua posição.
 * `reais` = outros jogadores com conta (sem você); `reaisAcima` = quantos deles têm mais pontos que você
 * (a lista da nuvem só traz os 100 primeiros, então a contagem vem à parte).
 */
export function classificar(temp: Temporada, agora: number, eu: Linha | null, reais: Linha[], reaisAcima: number): Classificacao {
  const bots = linhasDosBots(temp, agora);
  const todos = [...bots, ...reais, ...(eu ? [{ ...eu, eu: true }] : [])];
  // empate: quem é jogador real vem antes, depois por nome (ordem estável)
  const ehBot = (l: Linha) => (l.bot === undefined ? 0 : 1);
  todos.sort((a, b) => b.pontos - a.pontos || ehBot(a) - ehBot(b) || a.nome.localeCompare(b.nome));
  const top = todos.slice(0, 100);
  if (!eu) return { top, posicao: 0, eu: null };
  const corte = Math.min(...bots.map(b => b.pontos));
  const posicao = 1 + bots.filter(b => b.pontos > eu.pontos).length + reaisAcima
    + multidaoAcima(eu.pontos, corte, tamanhoMultidao(agora));
  return { top, posicao, eu: { ...eu, eu: true } };
}

/* ---------- adversário ---------- */

export interface Rival {
  nome: string;
  signo: Signo;
  signo2: Signo;
  pontos: number;
  ia: Nivel;
  /** Nível das cartas do rival. */
  nv: number;
  /** Usa as cartas mais fortes dos signos. */
  forte: boolean;
}

/** Força do rival pela liga dele; acompanha o nível médio das cartas do seu deck (como na campanha). */
export function forcaDaLiga(pontos: number, nivelDeck = 1): { ia: Nivel; nv: number; forte: boolean } {
  const TAB: readonly { ia: Nivel; nv: number; forte: boolean }[] = [
    { ia: 'facil', nv: 1, forte: false },
    { ia: 'normal', nv: 1, forte: false },
    { ia: 'normal', nv: 2, forte: false },
    { ia: 'dificil', nv: 2, forte: false },
    { ia: 'dificil', nv: 3, forte: false },
    { ia: 'dificil', nv: 3, forte: true },
  ];
  const f = TAB[ligaDe(pontos)];
  const extra = Math.max(0, Math.round(nivelDeck - 1));
  return { ...f, nv: Math.min(NIVEL_MAX, f.nv + extra) };
}

const PRIMEIROS = ['ana', 'leo', 'gabi', 'rafa', 'duda', 'enzo', 'malu', 'davi', 'lara', 'theo', 'nina', 'caio', 'bia', 'gui', 'lis', 'joao', 'mel', 'vini',
  'alex', 'sam', 'max', 'kai', 'zoe', 'liam', 'emma', 'noah', 'yuri', 'hana', 'luca', 'iris'];
const FINAIS = ['_', '.', '', 'x', '_br', '_gg', '.zod', '_tcg'];
const TEMAS = ['star', 'moon', 'sol', 'lua', 'astro', 'cosmo', 'nova', 'fire', 'zen', 'dark', 'sky', 'wolf'];

/** Apelido de um jogador da multidão (gerado na hora). */
export function apelidoSorteado(rng: Rng): string {
  const p = PRIMEIROS[rng.int(PRIMEIROS.length)];
  const forma = rng.int(4);
  const num = rng.float() < 0.6 ? String(rng.int(rng.float() < 0.5 ? 100 : 2010)) : '';
  if (forma === 0) return (p[0].toUpperCase() + p.slice(1) + num).slice(0, 16);
  if (forma === 1) return (p + FINAIS[rng.int(FINAIS.length)] + num).slice(0, 16);
  const t = TEMAS[rng.int(TEMAS.length)];
  if (forma === 2) return (t[0].toUpperCase() + t.slice(1) + p[0].toUpperCase() + p.slice(1) + num).slice(0, 16);
  return (p + '_' + t + num).slice(0, 16);
}

/**
 * Sorteia o adversário: um dos 100 da arena com pontos parecidos com os seus; se você ainda está longe do Top 100,
 * um jogador da multidão com mais ou menos os seus pontos.
 */
export function sortearRival(rng: Rng, temp: Temporada, agora: number, meus: number, nivelDeck = 1): Rival {
  const bots = linhasDosBots(temp, agora);
  const corte = Math.min(...bots.map(b => b.pontos));
  let nome: string, signo: Signo, signo2: Signo, pontos: number;
  if (meus < corte - 60) {
    nome = apelidoSorteado(rng);
    signo = ORDER[rng.int(ORDER.length)];
    const outros = ORDER.filter(s => s !== signo);
    signo2 = rng.float() < 0.25 ? signo : outros[rng.int(outros.length)];
    pontos = Math.max(0, meus - 40 + rng.int(100));
  } else {
    // os 6 mais próximos dos seus pontos; sorteia um deles
    const perto = [...bots].sort((a, b) => Math.abs(a.pontos - meus) - Math.abs(b.pontos - meus)).slice(0, 6);
    const l = perto[rng.int(perto.length)];
    const b = BOTS[l.bot!];
    nome = b.nome; signo = b.signo; signo2 = b.signo2; pontos = l.pontos;
  }
  return { nome, signo, signo2, pontos, ...forcaDaLiga(pontos, nivelDeck) };
}
