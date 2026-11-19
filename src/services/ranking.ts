// Ranking na nuvem (Supabase, tabela "ranking" — ver supabase/ranking.sql).
// Cada jogador com conta tem uma linha com os pontos da temporada; todos podem ler a lista, cada um só grava a sua.
// O cálculo dos pontos fica em meta/ranking.ts; aqui só lê, grava e lembra o que falta enviar.
import { clienteNuvem, idConta } from './nuvem';
import {
  aplicarResultado, classificar, linhasDosBots, novoEstado, temporadaDe, temporadaPorId, virarTemporada,
  type Classificacao, type EstadoRank, type Linha, type Resultado, type Temporada,
} from '../meta/ranking';
import { ORDER } from '../data/signos';
import type { Signo } from '../data/schema';

const TABELA = 'ranking';
/** Partida ranqueada em andamento: se o jogo fechar no meio, conta como derrota quando voltar. */
const PENDENTE = 'arena-dos-pactos:rank-pendente';
/** Último estado conhecido (e se ainda falta enviar para a nuvem). */
const CACHE = 'arena-dos-pactos:rank';

interface Cache { conta: string; e: EstadoRank; enviar: boolean }
interface Pendente { conta: string; temporada: string; rival: number }

const ler = <T>(k: string): T | null => { try { return JSON.parse(localStorage.getItem(k) ?? 'null') as T | null; } catch { return null; } };
const gravarLocal = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } };

export interface PremioTemporada { poeira: number; gemas: number; top10: boolean; liga: number; signo: Signo }

export interface SituacaoRanking {
  estado: 'carregando' | 'pronto' | 'erro';
  temporada: Temporada;
  /** Seus pontos (null = sem conta ou ainda carregando). */
  meu: EstadoRank | null;
  /** Outros jogadores com conta que estão entre os 100 primeiros da nuvem. */
  reais: Linha[];
  reaisAcima: number;
}

let sit: SituacaoRanking = { estado: 'carregando', temporada: temporadaDe(Date.now()), meu: null, reais: [], reaisAcima: 0 };
let nomeAtual = '', signoAtual: Signo = 'aries';
/** Envio do último resultado (a leitura espera ele terminar, para não trazer pontos velhos). */
let gravando: Promise<unknown> = Promise.resolve();

export const situacaoRanking = () => sit;

interface LinhaNuvem {
  id: string; nome: string; signo: string; temporada: string; pontos: number; liga_max: number; seguidas: number;
  vitorias: number; derrotas: number; trofeus: number;
}

const doBanco = (r: LinhaNuvem): EstadoRank => ({
  temporada: r.temporada, pontos: r.pontos, ligaMax: r.liga_max, seguidas: r.seguidas, vitorias: r.vitorias, derrotas: r.derrotas, trofeus: r.trofeus,
});

const signoValido = (s: string): Signo => (ORDER.includes(s as Signo) ? s as Signo : 'aries');

/** Nome que aparece no ranking: o nome de invocador, ou "Invocador" + 4 números da conta. */
export function nomeNoRanking(nome: string, conta: string): string {
  const n = nome.trim().replace(/\s+/g, ' ').slice(0, 16);
  return n || `Invocador${parseInt(conta.replace(/-/g, '').slice(0, 6), 16) % 10000}`;
}

async function enviar(e: EstadoRank, extra: Record<string, unknown> = {}): Promise<boolean> {
  const sb = clienteNuvem(), conta = idConta();
  if (!sb || !conta) return false;
  const { error } = await sb.from(TABELA).upsert({
    id: conta, nome: nomeNoRanking(nomeAtual, conta), signo: signoAtual, temporada: e.temporada, pontos: e.pontos,
    liga_max: e.ligaMax, seguidas: e.seguidas, vitorias: e.vitorias, derrotas: e.derrotas, trofeus: e.trofeus, ...extra,
  });
  gravarLocal(CACHE, { conta, e, enviar: !!error } satisfies Cache);
  return !error;
}

/** Posição final numa temporada que acabou (bots no último momento dela + jogadores reais que ficaram acima). */
async function posicaoFinal(e: EstadoRank): Promise<number> {
  const sb = clienteNuvem(), temp = temporadaPorId(e.temporada);
  if (!temp || !sb) return 0;
  const fim = temp.fim - 1;
  const bots = linhasDosBots(temp, fim).filter(b => b.pontos > e.pontos).length;
  const { count } = await sb.from(TABELA).select('id', { count: 'exact', head: true })
    .or(`and(temporada.eq.${e.temporada},pontos.gt.${e.pontos}),and(ant_temporada.eq.${e.temporada},ant_pontos.gt.${e.pontos})`);
  return 1 + bots + (count ?? 0);
}

/**
 * Lê o ranking da temporada. Com conta: lê (ou cria) a sua linha, vira a temporada se mudou (devolve o prêmio),
 * conta a partida que ficou pela metade como derrota e envia o que estava faltando.
 */
export async function carregarRanking(nome: string, signo: Signo): Promise<PremioTemporada | null> {
  nomeAtual = nome; signoAtual = signo;
  await gravando.catch(() => undefined);
  const temporada = temporadaDe(Date.now());
  sit = { ...sit, estado: 'carregando', temporada };
  const sb = clienteNuvem(), conta = idConta();
  if (!sb) { sit = { ...sit, estado: 'erro' }; return null; }
  let premio: PremioTemporada | null = null;
  try {
    let meu: EstadoRank | null = null;
    if (conta) {
      const { data, error } = await sb.from(TABELA).select('*').eq('id', conta).maybeSingle();
      if (error) throw error;
      const cache = ler<Cache>(CACHE);
      meu = data ? doBanco(data as LinhaNuvem) : null;
      // resultado que não chegou a ser enviado (sem internet no fim da partida)
      if (cache && cache.conta === conta && cache.enviar && (!meu || cache.e.temporada === meu.temporada)) {
        if (await enviar(cache.e)) meu = cache.e;
      }
      if (!meu) { meu = novoEstado(temporada.id); await enviar(meu); }
      if (meu.temporada !== temporada.id) {
        const velho = meu;
        const pos = await posicaoFinal(velho);
        const v = virarTemporada(velho, temporada.id, pos);
        if (await enviar(v.e, { ant_temporada: velho.temporada, ant_pontos: velho.pontos })) {
          meu = v.e;
          premio = { poeira: v.poeira, gemas: v.gemas, top10: v.top10, liga: velho.ligaMax, signo: signoValido(velho.temporada.split('-')[1] ?? '') };
        }
      }
      // partida que ficou pela metade (fechou o jogo ou caiu a internet): derrota
      const p = ler<Pendente>(PENDENTE);
      if (p && p.conta === conta) {
        gravarLocal(PENDENTE, null);
        if (p.temporada === meu.temporada) { meu = aplicarResultado(meu, 'derrota', p.rival).e; await enviar(meu); }
      }
    }
    const { data: lista, error: e2 } = await sb.from(TABELA).select('id, nome, signo, pontos, trofeus')
      .eq('temporada', temporada.id).order('pontos', { ascending: false }).limit(101);
    if (e2) throw e2;
    const reais: Linha[] = (lista as LinhaNuvem[]).filter(r => r.id !== conta)
      .map(r => ({ nome: r.nome, signo: signoValido(r.signo), pontos: r.pontos, trofeus: r.trofeus, id: r.id })).slice(0, 100);
    let reaisAcima = meu ? reais.filter(r => r.pontos > meu!.pontos).length : 0;
    // a lista só traz os primeiros: se você está abaixo de todos eles, conta quantos há acima na nuvem
    if (meu && reais.length >= 100 && reaisAcima === reais.length) {
      const { count } = await sb.from(TABELA).select('id', { count: 'exact', head: true }).eq('temporada', temporada.id).gt('pontos', meu.pontos);
      reaisAcima = Math.max(0, (count ?? reaisAcima));
    }
    sit = { estado: 'pronto', temporada, meu, reais, reaisAcima };
  } catch {
    sit = { ...sit, estado: 'erro' };
  }
  return premio;
}

/** Top 100 e a sua posição, agora. */
export function classificacaoAtual(): Classificacao {
  const conta = idConta();
  const eu: Linha | null = sit.meu && conta ? { nome: nomeNoRanking(nomeAtual, conta), signo: signoAtual, pontos: sit.meu.pontos, trofeus: sit.meu.trofeus, id: conta } : null;
  return classificar(sit.temporada, Date.now(), eu, sit.reais, sit.reaisAcima);
}

/** Começo de uma partida ranqueada: se ela não terminar, conta como derrota. */
export function comecarRanqueada(rival: number): void {
  const conta = idConta();
  if (conta && sit.meu) gravarLocal(PENDENTE, { conta, temporada: sit.meu.temporada, rival } satisfies Pendente);
}

/** Fim de uma partida ranqueada: aplica os pontos na hora e envia para a nuvem. */
export function terminarRanqueada(r: Resultado, rival: number): { delta: number; subiu: boolean; e: EstadoRank } | null {
  gravarLocal(PENDENTE, null);
  if (!sit.meu) return null;
  const x = aplicarResultado(sit.meu, r, rival);
  // a posição dos outros reais pode ter mudado; até recarregar, conta só os que estavam acima e continuam
  sit = { ...sit, meu: x.e, reaisAcima: sit.reais.filter(l => l.pontos > x.e.pontos).length + Math.max(0, sit.reaisAcima - sit.reais.filter(l => l.pontos > sit.meu!.pontos).length) };
  gravando = enviar(x.e);
  return x;
}
