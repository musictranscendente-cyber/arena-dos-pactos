// Tela da campanha: os 12 mundos, o mapa de 10 fases do mundo escolhido e os detalhes da fase.
import { CARDS } from '../data/cards';
import type { Signo } from '../data/schema';
import { RACES } from '../data/signos';
import { T } from '../data/textos';
import type { DeckMontado } from '../engine';
import {
  estrelas, estrelasDoMundo, fase, faseLiberada, FASES, GEMAS_CHEFE, MUNDOS, mundoLiberado, poeiraDaFase, POEIRA_REPETIR,
} from '../meta/campanha';
import type { Progresso } from '../meta/progresso';
import { moedasHtml } from './colecao';
import { criatura, nomeDeckMontado } from './menu';

export interface TelaCampanha { signo: Signo; fase: number }

const estrelinhas = (n: number) => `<span class="cp-est">${[1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}">★</i>`).join('')}</span>`;

export function campanhaHtml(p: Progresso, t: TelaCampanha, deck: DeckMontado | null): string {
  const abas = MUNDOS.map(s => {
    const livre = mundoLiberado(p, s);
    return `<button class="c-aba cp-mundo${t.signo === s ? ' on' : ''}${livre ? '' : ' bloq'}" data-act="cmundo" data-r="${s}" style="--rc:${RACES[s].c}" title="${RACES[s].n}">`
      + `${livre ? RACES[s].g : '🔒'}<small>${livre ? `${estrelasDoMundo(p, s)}★` : ''}</small></button>`;
  }).join('');
  const r = RACES[t.signo];
  const nos = Array.from({ length: FASES }, (_, i) => {
    const n = i + 1, f = fase(t.signo, n), est = estrelas(p, t.signo, n), livre = faseLiberada(p, t.signo, n);
    const cls = ['cp-fase', `t-${f.tipo}`, est ? 'feita' : livre ? 'livre' : 'bloq', t.fase === n ? 'sel' : ''].join(' ');
    const fig = f.tipo === 'chefe' ? criatura(`${t.signo}25`, 'cp-fig') : f.tipo === 'guardiao' ? criatura(`${t.signo}23`, 'cp-fig') : '';
    // caminho em zigue-zague: fases 1-5 em cima (esquerda→direita), 6-10 embaixo (direita→esquerda)
    const x = i < 5 ? 10 + i * 20 : 10 + (9 - i) * 20, y = (i < 5 ? 30 : 74) + (i % 2 ? -7 : 7);
    return `<button class="${cls}" data-act="cfase" data-n="${n}" style="left:${x}%;top:${y}%">${fig}<b>${livre ? n : '🔒'}</b>${est ? estrelinhas(est) : ''}</button>`;
  }).join('');
  // detalhes da fase escolhida
  const f = fase(t.signo, t.fase), est = estrelas(p, t.signo, t.fase), livre = faseLiberada(p, t.signo, t.fase);
  const titulo = f.tipo === 'chefe' ? T.chefe(f.rival) : f.tipo === 'guardiao' ? T.guardiao(f.rival) : T.rivalDoMundo(r.n);
  const premio = est
    ? `<p><b>${T.repetir}:</b> +${POEIRA_REPETIR} ✨</p>`
    : `<p><b>${T.primeiraVitoria}:</b> +${poeiraDaFase(t.fase)} ✨ · ${T.cartaDoSigno(r.n)}`
      + (f.tipo === 'chefe' ? ` · ${T.epicaDoSigno(r.n)} · +${GEMAS_CHEFE} 💎` : '') + '</p>';
  const lenda = CARDS[`${t.signo}25`];
  const det = `<div class="cp-det"><h3>${T.faseN(t.fase)} · ${titulo}</h3>`
    + `<p class="cp-info"><span>${T.dificuldade}: <b>${T.nivelNome[f.nivelIA]}</b></span><span>${T.cartasRival}: <b>${T.nivelN(f.nivelCartas)}</b></span><span>${T.vidaRival}: <b>${f.vidaRival}</b></span></p>`
    + `<p class="cp-melhor">${estrelinhas(est)}</p><p class="cp-crit">${T.criteriosEstrelas}</p>`
    + premio
    + (lenda ? `<p class="cp-lenda">${T.lendaMeta(lenda.name, estrelasDoMundo(p, t.signo))}</p>` : '')
    + `<p class="nv-deck">${T.seuDeck}: <b>${deck ? nomeDeckMontado(deck) : T.semDeck}</b> <button class="btn rc mini" data-act="montar">${T.trocar}</button></p>`
    + (livre ? `<button class="btn go cp-lutar" data-act="clutar">${T.lutar}</button>`
      : `<p class="m-dica">${mundoLiberado(p, t.signo) ? T.bloqueada : T.mundoBloqueado(RACES[MUNDOS[MUNDOS.indexOf(t.signo) - 1]].n)}</p>`)
    + '</div>';
  return `<div class="ov montar gal campanha" style="--rc:${r.c}"><div class="panel wide"><div class="m-fixo">`
    + `<div class="gtop"><h2>${T.campanha} <small>${r.g} ${T.mundo(r.n)}</small></h2><span class="m-topo-bts">${moedasHtml(p)}`
    + `<button class="m-fecha" data-act="hub" aria-label="${T.sair}">✕</button></span></div>`
    + `<div class="c-abas">${abas}</div></div>`
    + `<div class="m-corpo cp-corpo"><div class="cp-mapa">${nos}</div>${det}</div></div></div>`;
}
