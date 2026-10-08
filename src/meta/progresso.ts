// Progresso do jogador (fora da partida): moedas, coleção de cartas com nível, fusão e pacotes.
// Lógica pura (sem tela e sem salvar): recebe o progresso e devolve um novo. Quem salva é services/progresso.ts.
import { baseCid, CARDS, cardsOfSign, comNivel, ECO_ID, NIVEL_MAX } from '../data/cards';
import { ORDER } from '../data/signos';
import type { Raridade, Signo } from '../data/schema';
import { maxCopias } from '../engine/deck';
import type { Rng } from '../engine/rng';

/** Quantas cópias de uma carta o jogador tem em cada nível: [nv1, nv2, nv3, nv4, nv5]. */
export type Copias = [number, number, number, number, number];

export interface Progresso {
  v: 1;
  /** Signo escolhido no começo (ganha as 30 cartas dele). null = ainda não escolheu. */
  inicial: Signo | null;
  poeira: number;
  gemas: number;
  /** Coleção: id da carta (sem nível) → cópias por nível. */
  cartas: Record<string, Copias>;
  /** Modo teste: todas as cartas liberadas para montar deck (para testar o jogo). */
  teste: boolean;
  /** Campanha: "signo-fase" → estrelas (1 a 3) da melhor vitória. */
  campanha: Record<string, number>;
  /** Partida Rápida: vitórias com prêmio no dia (limite diário). */
  rapida: { dia: string; vitorias: number };
  /** Missões diárias (sorteadas a cada dia). */
  missoes: EstadoMissoes;
  /** Calendário de 7 dias: último dia em que coletou e qual o próximo prêmio (0..6). */
  login: { dia: string; passo: number };
}

export interface MissaoDia { id: string; prog: number; coletada: boolean }
export interface EstadoMissoes { dia: string; lista: MissaoDia[]; trocou: boolean; bau: boolean }

export function novoProgresso(): Progresso {
  return {
    v: 1, inicial: null, poeira: 0, gemas: 0, cartas: {}, teste: false, campanha: {},
    rapida: { dia: '', vitorias: 0 },
    missoes: { dia: '', lista: [], trocou: false, bau: false },
    login: { dia: '', passo: 0 },
  };
}

const num = (x: unknown, d = 0) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : d);

/** Confere um progresso lido do aparelho (pode estar velho ou mexido): o que não fizer sentido volta ao padrão. */
export function normalizar(raw: unknown): Progresso {
  const p = novoProgresso();
  if (!raw || typeof raw !== 'object') return p;
  const r = raw as Partial<Progresso>;
  p.inicial = r.inicial && ORDER.includes(r.inicial) ? r.inicial : null;
  p.poeira = num(r.poeira);
  p.gemas = num(r.gemas);
  p.teste = r.teste === true;
  if (r.cartas && typeof r.cartas === 'object') {
    for (const [k, v] of Object.entries(r.cartas)) {
      if (!CARDS[k] || k === ECO_ID || !Array.isArray(v)) continue;
      const c = [0, 1, 2, 3, 4].map(i => num(v[i])) as Copias;
      if (c.some(n => n > 0)) p.cartas[k] = c;
    }
  }
  if (r.campanha && typeof r.campanha === 'object') {
    for (const [k, v] of Object.entries(r.campanha)) { const e = num(v); if (e >= 1 && e <= 3) p.campanha[k] = e; }
  }
  if (r.rapida && typeof r.rapida.dia === 'string') p.rapida = { dia: r.rapida.dia, vitorias: num(r.rapida.vitorias) };
  if (r.missoes && typeof r.missoes.dia === 'string' && Array.isArray(r.missoes.lista)) {
    p.missoes = {
      dia: r.missoes.dia,
      lista: r.missoes.lista.filter(m => m && typeof m.id === 'string').map(m => ({ id: m.id, prog: num(m.prog), coletada: m.coletada === true })),
      trocou: r.missoes.trocou === true,
      bau: r.missoes.bau === true,
    };
  }
  if (r.login && typeof r.login.dia === 'string') p.login = { dia: r.login.dia, passo: num(r.login.passo) % 7 };
  return p;
}

/* ---------- coleção ---------- */

const copiasDe = (p: Progresso, cid: string): Copias => p.cartas[baseCid(cid)] ?? [0, 0, 0, 0, 0];

/** Total de cópias de uma carta (qualquer nível). */
export function totalCopias(p: Progresso, cid: string): number {
  return copiasDe(p, cid).reduce((t, n) => t + n, 0);
}

/** Maior nível que o jogador tem dessa carta (0 = não tem). */
export function melhorNivel(p: Progresso, cid: string): number {
  const c = copiasDe(p, cid);
  for (let i = NIVEL_MAX - 1; i >= 0; i--) if (c[i] > 0) return i + 1;
  return 0;
}

export function copias(p: Progresso, cid: string): Copias { return [...copiasDe(p, cid)] as Copias; }

/** Quantas cópias dessa carta podem ir para um deck (o que tem, até o limite da raridade; no modo teste, o limite). */
export function copiasParaDeck(p: Progresso, cid: string): number {
  const mx = maxCopias(cid);
  return p.teste ? mx : Math.min(mx, totalCopias(p, cid));
}

export function darCarta(p: Progresso, cid: string, nivel = 1): Progresso {
  const q = structuredClone(p);
  const k = baseCid(cid);
  const c = copiasDe(q, k);
  c[Math.max(1, Math.min(NIVEL_MAX, nivel)) - 1]++;
  q.cartas[k] = [...c] as Copias;
  return q;
}

/** Começo do jogo: escolhe o signo e ganha as 30 cartas dele (nível 1) e um pouco de Poeira. */
export const POEIRA_INICIAL = 100;
export function escolherInicial(p: Progresso, signo: Signo): Progresso {
  if (p.inicial) return p;
  let q: Progresso = { ...structuredClone(p), inicial: signo };
  for (const cid of cardsOfSign(signo)) q = darCarta(q, cid);
  q.poeira += POEIRA_INICIAL;
  return q;
}

/** Cartas do deck (ids sem nível) → ids com o nível de cada cópia, usando as de maior nível primeiro. */
export function deckComNiveis(p: Progresso, cartas: readonly string[]): string[] {
  const usadas = new Map<string, Copias>();
  return cartas.map(cid => {
    const k = baseCid(cid);
    if (!usadas.has(k)) usadas.set(k, copias(p, k));
    const c = usadas.get(k)!;
    for (let i = NIVEL_MAX - 1; i >= 0; i--) {
      if (c[i] > 0) { c[i]--; return comNivel(k, i + 1); }
    }
    return k; // modo teste (ou carta que não tem mais): nível 1
  });
}

/** Cartas do deck que o jogador não tem cópias suficientes (fora do modo teste). Vazio = pode jogar. */
export function faltando(p: Progresso, cartas: readonly string[]): string[] {
  if (p.teste) return [];
  const pedidas = new Map<string, number>();
  for (const c of cartas) pedidas.set(baseCid(c), (pedidas.get(baseCid(c)) ?? 0) + 1);
  return [...pedidas].filter(([k, n]) => totalCopias(p, k) < n).map(([k]) => k);
}

/* ---------- fusão ---------- */

/** Custo em Poeira para fundir duas cartas do nível n e criar uma do nível n+1 (índice = nível de destino). */
export const CUSTO_FUSAO: Record<number, number> = { 2: 50, 3: 150, 4: 400, 5: 1000 };

/** Motivo de não poder fundir 2 cartas do nível `nivel`, ou null se pode. */
export function podeFundir(p: Progresso, cid: string, nivel: number): 'nivel' | 'copias' | 'poeira' | null {
  if (nivel < 1 || nivel >= NIVEL_MAX) return 'nivel';
  if (copiasDe(p, cid)[nivel - 1] < 2) return 'copias';
  if (p.poeira < CUSTO_FUSAO[nivel + 1]) return 'poeira';
  return null;
}

export function fundir(p: Progresso, cid: string, nivel: number): Progresso {
  if (podeFundir(p, cid, nivel)) return p;
  const q = structuredClone(p);
  const k = baseCid(cid);
  const c = copiasDe(q, k);
  c[nivel - 1] -= 2;
  c[nivel]++;
  q.cartas[k] = [...c] as Copias;
  q.poeira -= CUSTO_FUSAO[nivel + 1];
  return q;
}

/* ---------- pacotes ---------- */

export const PRECO_PACOTE = 200;
export const CARTAS_PACOTE = 5;
/** Chance de cada raridade por carta do pacote (mostrada ao jogador). */
export const CHANCES: Record<Raridade, number> = { c: 0.70, r: 0.22, e: 0.07, l: 0.01 };

const PORRARIDADE: Record<Raridade, string[]> = { c: [], r: [], e: [], l: [] };
for (const k of Object.keys(CARDS)) if (k !== ECO_ID) PORRARIDADE[CARDS[k].r].push(k);

/** Sorteia uma carta (de qualquer signo, ou de um signo só) pelas chances de raridade. */
export function sortearCarta(rng: Rng, signo?: Signo, minimo: Raridade = 'c'): string {
  const ordem: Raridade[] = ['l', 'e', 'r', 'c'];
  let x = rng.float(), r: Raridade = 'c';
  for (const q of ordem) { if (x < CHANCES[q]) { r = q; break; } x -= CHANCES[q]; }
  const nivelR = { c: 0, r: 1, e: 2, l: 3 };
  if (nivelR[r] < nivelR[minimo]) r = minimo;
  const lista = signo ? PORRARIDADE[r].filter(k => CARDS[k].race === signo) : PORRARIDADE[r];
  return lista[rng.int(lista.length)];
}

/** Sorteia uma carta de uma raridade exata (de um signo, se dado). */
export function cartaDaRaridade(rng: Rng, r: Raridade, signo?: Signo): string {
  const lista = signo ? PORRARIDADE[r].filter(k => CARDS[k].race === signo) : PORRARIDADE[r];
  return lista[rng.int(lista.length)];
}

/** Dá várias cartas e conta quais eram novas na coleção. */
export function darCartas(p: Progresso, cids: readonly string[]): { p: Progresso; novas: string[] } {
  let q = p;
  const novas: string[] = [];
  for (const c of cids) {
    if (totalCopias(q, c) === 0 && !novas.includes(c)) novas.push(c);
    q = darCarta(q, c);
  }
  return { p: q, novas };
}

export function abrirPacote(p: Progresso, rng: Rng): { p: Progresso; cartas: string[]; novas: string[] } | null {
  if (p.poeira < PRECO_PACOTE) return null;
  const cartas = Array.from({ length: CARTAS_PACOTE }, () => sortearCarta(rng));
  const pago = { ...p, poeira: p.poeira - PRECO_PACOTE };
  const r = darCartas(pago, cartas);
  return { p: r.p, cartas, novas: r.novas };
}

/* ---------- Partida Rápida ---------- */

export const RAPIDA_VITORIA = 20;
export const RAPIDA_DERROTA = 5;
export const RAPIDA_LIMITE = 10;

/** Prêmio de uma Partida Rápida (as 10 primeiras vitórias do dia dão prêmio; derrota dá um pouco sempre que ainda há vitórias no dia). */
export function premioRapida(p: Progresso, venceu: boolean, dia: string): { p: Progresso; poeira: number } {
  const q = structuredClone(p);
  if (q.rapida.dia !== dia) q.rapida = { dia, vitorias: 0 };
  if (q.rapida.vitorias >= RAPIDA_LIMITE) return { p: q, poeira: 0 };
  const poeira = venceu ? RAPIDA_VITORIA : RAPIDA_DERROTA;
  if (venceu) q.rapida.vitorias++;
  q.poeira += poeira;
  return { p: q, poeira };
}

/** Dia local no formato AAAA-MM-DD (as missões e o calendário viram à meia-noite do aparelho). */
export function diaDe(d: Date): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

/* ---------- montar deck com a coleção ---------- */

/**
 * Completa um deck até 30 cartas usando só o que o jogador pode pôr (cópias da coleção, até o limite da raridade),
 * com uma curva de mana parecida com a de um deck normal. Pode ficar com menos de 30 se a coleção não tiver cartas suficientes.
 */
export function completarDeck(p: Progresso, a: Signo, b: Signo, base: readonly string[], rng: Rng, tamanho = 30): string[] {
  const ok = new Set(a === b ? cardsOfSign(a) : [...cardsOfSign(a), ...cardsOfSign(b)]);
  const deck = base.filter(c => ok.has(baseCid(c))).map(baseCid).slice(0, tamanho);
  const ja = new Map<string, number>();
  for (const c of deck) ja.set(c, (ja.get(c) ?? 0) + 1);
  // cada cópia que ainda pode entrar vira uma ficha; embaralha e escolhe pelas faixas de custo
  const fichas: string[] = [];
  for (const c of ok) for (let i = ja.get(c) ?? 0; i < copiasParaDeck(p, c); i++) fichas.push(c);
  for (let i = fichas.length - 1; i > 0; i--) { const j = rng.int(i + 1); [fichas[i], fichas[j]] = [fichas[j], fichas[i]]; }
  const faixa = (c: string) => Math.min(4, Math.floor(CARDS[c].cost / 2));
  const alvo = [0, 0, 0, 0, 0];
  for (const c of cardsOfSign(a)) alvo[faixa(c)]++;
  const tem = [0, 0, 0, 0, 0];
  for (const c of deck) tem[faixa(c)]++;
  const usadas = new Set<number>();
  fichas.forEach((c, i) => {
    if (deck.length >= tamanho) return;
    if (tem[faixa(c)] < alvo[faixa(c)]) { deck.push(c); tem[faixa(c)]++; usadas.add(i); }
  });
  fichas.forEach((c, i) => { if (deck.length < tamanho && !usadas.has(i)) deck.push(c); });
  return deck;
}
