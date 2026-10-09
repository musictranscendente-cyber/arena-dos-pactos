// Tela de "próximo desafio" da campanha: aparece por alguns segundos antes de entrar na arena,
// com o seu herói de um lado, o rival da fase do outro e um VS no meio.
import { baseCid, CARDS, cardsOfSign } from '../data/cards';
import { ARTE } from '../data/arte';
import type { Signo } from '../data/schema';
import { RACES } from '../data/signos';
import { T } from '../data/textos';
import type { DeckMontado } from '../engine';
import { fase, FASES, nivelMedioDeck } from '../meta/campanha';
import { criatura, nomeDeckMontado } from './menu';

/** Quanto tempo a tela fica antes de entrar sozinha na arena (ms). */
export const TEMPO_DESAFIO = 3200;

/** Criatura que representa o rival: chefe = o próprio signo, guardião = a do mapa, normais variam com a fase. */
function figuraRival(signo: Signo, n: number): string {
  const f = fase(signo, n);
  if (f.tipo === 'chefe') return `${signo}25`;
  if (f.tipo === 'guardiao') return `${signo}23`;
  const comArte = cardsOfSign(signo).filter(k => CARDS[k].type === 'unit' && ARTE[k] && !/2[345]$/.test(k));
  return comArte[(n * 2 + 3) % comArte.length] ?? `${signo}01`;
}

/** Criatura que representa o jogador: a mais cara do deck que já tem arte (e não é a mesma do rival). */
function figuraJogador(d: DeckMontado, evitar: string): string {
  const ids = [...new Set(d.cartas.map(baseCid))].filter(k => CARDS[k]?.type === 'unit' && ARTE[k] && k !== evitar);
  ids.sort((a, b) => CARDS[b].cost - CARDS[a].cost);
  return ids[0] ?? '';
}

export function desafioHtml(signo: Signo, n: number, deck: DeckMontado): string {
  const f = fase(signo, n, nivelMedioDeck(deck.cartas)), r = RACES[signo];
  const titulo = f.tipo === 'chefe' ? T.desafioChefe : f.tipo === 'guardiao' ? T.desafioGuardiao : T.proximoDesafio;
  const rival = f.tipo === 'normal' ? T.rivalDoMundo(r.n) : f.rival;
  const [a, b] = deck.signos;
  const sg = (s: Signo) => `<i style="--rc:${RACES[s].c}">${RACES[s].g}</i>`;
  const fr = figuraRival(signo, n), fj = figuraJogador(deck, fr);
  return `<div class="desafio t-${f.tipo}" data-act="desafio-ir" style="--rc:${r.c};--tempo:${TEMPO_DESAFIO}ms" role="dialog" aria-label="${titulo}">`
    + '<div class="df-raios"></div><div class="df-faixa"></div>'
    + `<div class="df-topo"><small>${r.g} ${T.mundo(r.n)} · ${T.faseN(n)}/${FASES}</small><b>${titulo}</b></div>`
    + `<div class="df-lado df-voce"><div class="df-fig">${fj ? criatura(fj, 'df-img') : ''}</div>`
    + `<span class="df-sg">${sg(a)}${b !== a ? sg(b) : ''}</span><b>${T.voce}</b><small>${nomeDeckMontado(deck)}</small></div>`
    + '<div class="df-vs">VS</div>'
    + `<div class="df-lado df-rival"><div class="df-fig">${criatura(fr, 'df-img', true) || `<span class="df-emoji">${CARDS[fr]?.e ?? r.g}</span>`}</div>`
    + `<span class="df-sg">${sg(signo)}</span><b>${rival}</b>`
    + `<small><span>🧠 ${T.nivelNome[f.nivelIA]}</span> <span>🃏 Nv${f.nivelCartas}</span> <span>❤️ ${f.vidaRival}</span></small></div>`
    + `<div class="df-dica">${T.toqueParaLutar}</div><div class="df-barra"><i></i></div></div>`;
}
