// Tutorial da primeira partida: balõezinhos curtos que ensinam a jogar, um passo de cada vez.
// Aparece só uma vez (fica guardado no aparelho); dá para pular a qualquer momento e rever em "Como jogar".
import { T } from '../data/textos';

const CHAVE = 'arena-dos-pactos:tutorial-feito';

/** O que o tutorial precisa saber da partida para decidir se o passo já foi cumprido. */
export interface EstadoTut {
  rodada: number;
  ocupado: boolean;
  selecionou: boolean;
  jogou: boolean;
  /** Há criatura na mão que cabe na mana (se não houver, pula direto para a Batalha). */
  podeInvocar: boolean;
}

interface Passo {
  txt: string;
  /** Elemento que brilha para chamar a atenção. */
  alvo?: string;
  /** Passo com botão "Entendi" (sem isso, avança sozinho quando `feito` der verdadeiro). */
  ok?: boolean;
  feito?: (e: EstadoTut) => boolean;
  /** Só aparece a partir desta rodada. */
  desde?: number;
}

const PASSOS: Passo[] = [
  { txt: T.tut.bemVindo, ok: true },
  { txt: T.tut.mana, alvo: '.manaorb', ok: true },
  { txt: T.tut.escolha, alvo: '.hand', feito: e => e.selecionou || e.jogou || e.ocupado || !e.podeInvocar },
  { txt: T.tut.casa, alvo: '.cell.ok', feito: e => e.jogou || e.ocupado || !e.podeInvocar },
  { txt: T.tut.batalha, alvo: '[data-act=punch]', feito: e => e.ocupado },
  { txt: T.tut.ataque, ok: true, desde: 2 },
  { txt: T.tut.queimar, alvo: '[data-act=recharge]', ok: true, desde: 2 },
  { txt: T.tut.detalhes, ok: true, desde: 2 },
];

let passo: number | null = null;

function feito(): boolean {
  try { return localStorage.getItem(CHAVE) === '1'; } catch { return false; }
}

function marcarFeito(): void {
  passo = null;
  try { localStorage.setItem(CHAVE, '1'); } catch { /* sem armazenamento: some só nesta visita */ }
}

/** Começo de uma partida: liga o tutorial se o jogador ainda não fez. */
export function tutorialNovaPartida(): void {
  passo = feito() ? null : 0;
}

/** "Ver o tutorial de novo" (em Como jogar): vale para a próxima partida. */
export function reverTutorial(): void {
  try { localStorage.removeItem(CHAVE); } catch { /* ignora */ }
}

/** Fim da partida: não mostra mais (mesmo que não tenha chegado ao último passo). */
export function tutorialFimDePartida(): void {
  if (passo !== null) marcarFeito();
}

export function tutorialPular(): void { marcarFeito(); }

export function tutorialEntendi(): void {
  if (passo === null) return;
  passo++;
  if (passo >= PASSOS.length) marcarFeito();
}

/** Avança os passos já cumpridos e devolve o balão a mostrar (ou vazio). */
export function tutorialHtml(e: EstadoTut): { html: string; alvo?: string } {
  while (passo !== null && PASSOS[passo].feito?.(e)) tutorialEntendi();
  if (passo === null || e.ocupado) return { html: '' };
  const p = PASSOS[passo];
  if (p.desde && e.rodada < p.desde) return { html: '' };
  return {
    alvo: p.alvo,
    html: `<div class="tut" role="dialog" aria-live="polite"><p>${p.txt}</p><div class="tut-bts">`
      + `<button class="tut-pular" data-act="tut-pular">${T.tut.pular}</button>`
      + (p.ok ? `<button class="btn go tut-ok" data-act="tut-ok">${passo === PASSOS.length - 1 ? T.tut.fim : T.tut.entendi}</button>` : '')
      + `<span class="tut-n">${passo + 1}/${PASSOS.length}</span></div></div>`,
  };
}
