// Tela da campanha: os 12 mundos, o mapa de 10 fases do mundo escolhido e os detalhes da fase.
import { CARDS } from '../data/cards';
import type { Signo } from '../data/schema';
import { RACES } from '../data/signos';
import { T } from '../data/textos';
import type { DeckMontado } from '../engine';
import {
  estrelas, estrelasDoMundo, fase, nivelMedioDeck, faseLiberada, FASES, GEMAS_CHEFE, MUNDOS, mundoLiberado, poeiraDaFase, POEIRA_REPETIR,
} from '../meta/campanha';
import type { Progresso } from '../meta/progresso';
import { moedasHtml } from './colecao';
import { COR_MEDALHAO, ic, sg } from './icones';
import { criatura, nomeDeckMontado } from './menu';

export interface TelaCampanha { signo: Signo; fase: number; ajuda?: boolean }

/** Símbolo do signo desenhado como texto, num círculo da cor do signo (igual em qualquer celular). */
const sgIco = (s: Signo) => sg(s, 'sg-ico');
const estrelinhas = (n: number) => `<span class="cp-est">${[1, 2, 3].map(i => ic('estrela', i <= n ? 'on' : '')).join('')}</span>`;

export function campanhaHtml(p: Progresso, t: TelaCampanha, deck: DeckMontado | null): string {
  const abas = MUNDOS.map(s => {
    const livre = mundoLiberado(p, s);
    return `<button class="c-aba cp-mundo${t.signo === s ? ' on' : ''}${livre ? '' : ' bloq'}" data-act="cmundo" data-r="${s}" style="--rc:${COR_MEDALHAO[s]}" title="${RACES[s].n}">`
      + `${livre ? sgIco(s) : '🔒'}<small>${livre ? `${estrelasDoMundo(p, s)}★` : ''}</small></button>`;
  }).join('');
  const r = RACES[t.signo];
  // caminho em zigue-zague: fases 1-5 em cima (esquerda→direita), 6-10 embaixo (direita→esquerda)
  const pos = Array.from({ length: FASES }, (_, i) => ({ x: i < 5 ? 10 + i * 20 : 10 + (9 - i) * 20, y: (i < 5 ? 30 : 74) + (i % 2 ? -7 : 7) }));
  // trilha dourada ligando as fases: trecho já vencido sólido, o resto tracejado
  const trilha = '<svg class="cp-trilha" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'
    + pos.slice(1).map((q, i) => `<line x1="${pos[i].x}" y1="${pos[i].y}" x2="${q.x}" y2="${q.y}" class="${estrelas(p, t.signo, i + 1) ? 'feito' : ''}"/>`).join('')
    + '</svg>';
  const nos = Array.from({ length: FASES }, (_, i) => {
    const n = i + 1, f = fase(t.signo, n), est = estrelas(p, t.signo, n), livre = faseLiberada(p, t.signo, n);
    const cls = ['cp-fase', `t-${f.tipo}`, est ? 'feita' : livre ? 'livre' : 'bloq', t.fase === n ? 'sel' : ''].join(' ');
    const fig = f.tipo === 'chefe' ? criatura(`${t.signo}25`, 'cp-fig') : f.tipo === 'guardiao' ? criatura(`${t.signo}23`, 'cp-fig') : '';
    const { x, y } = pos[i];
    return `<button class="${cls}" data-act="cfase" data-n="${n}" style="left:${x}%;top:${y}%">${fig}<b>${livre ? n : '🔒'}</b>${est ? estrelinhas(est) : ''}</button>`;
  }).join('');
  // detalhes da fase escolhida
  const f = fase(t.signo, t.fase, deck ? nivelMedioDeck(deck.cartas) : 1), est = estrelas(p, t.signo, t.fase), livre = faseLiberada(p, t.signo, t.fase);
  const titulo = f.tipo === 'chefe' ? T.chefe(f.rival) : f.tipo === 'guardiao' ? T.guardiao(f.rival) : T.rivalDoMundo(r.n);
  const premio = est
    ? `<p><b>${T.repetir}:</b> +${POEIRA_REPETIR} ${ic('poeira')}</p>`
    : `<p title="${T.primeiraVitoria}">${ic('premio', 'ic-g')} +${poeiraDaFase(t.fase)} ${ic('poeira')} · ${T.umaCarta}`
      + (f.tipo === 'chefe' ? ` · ${T.umaEpica} · +${GEMAS_CHEFE} ${ic('gema')}` : '') + '</p>';
  const lenda = CARDS[`${t.signo}25`];
  // painel compacto (cabe sem rolar); critérios das estrelas e a meta da lendária ficam no ⓘ
  const det = `<div class="cp-det"><div class="cp-tit"><h3>${T.faseN(t.fase)} · ${titulo}</h3>`
    + `<button class="c-aba c-info${t.ajuda ? ' on' : ''}" data-act="cpajuda" aria-label="${T.comoFunciona}" title="${T.comoFunciona}">${ic('info', 'ic-g')}</button></div>`
    + `<p class="cp-info"><span class="cp-chip" title="${T.dificuldade}">${ic('dificuldade')}<b>${T.nivelNome[f.nivelIA]}</b></span>`
    + `<span class="cp-chip" title="${T.cartasRival}">${ic('carta')}<b>Nv${f.nivelCartas}</b></span><span class="cp-chip" title="${T.vidaRival}">${ic('vida')}<b>${f.vidaRival}</b></span>`
    + `${estrelinhas(est)}${lenda ? `<span class="cp-chip cp-meta" title="${lenda.name}">${ic('trofeu')}${estrelasDoMundo(p, t.signo)}/30</span>` : ''}</p>`
    + premio
    + `<p class="nv-deck">${T.seuDeck}: <b>${deck ? nomeDeckMontado(deck) : T.semDeck}</b> <button class="btn rc mini" data-act="montar">${T.trocar}</button></p>`
    + (livre ? `<button class="btn go cp-lutar" data-act="clutar">${ic('lutar', 'ic-bt')}${T.lutarCurto}</button>`
      : `<p class="m-dica">${mundoLiberado(p, t.signo) ? T.bloqueada : T.mundoBloqueado(RACES[MUNDOS[MUNDOS.indexOf(t.signo) - 1]].n)}</p>`)
    + '</div>';
  const ajuda = t.ajuda ? `<div class="c-ajuda" data-act="cpajuda"><p><b>${T.comoFunciona}</b></p><p>${T.criteriosEstrelas}</p>`
    + (lenda ? `<p>${T.lendaMeta(lenda.name, estrelasDoMundo(p, t.signo))}</p>` : '') + `<p>${T.legendaFase}</p><p>${T.ajudaCampanha(r.n)}</p></div>` : '';
  return `<div class="ov montar gal campanha" style="--rc:${COR_MEDALHAO[t.signo]}"><div class="panel wide"><div class="m-fixo">`
    + `<div class="gtop"><h2>${T.campanha} <small>${sgIco(t.signo)} ${T.mundo(r.n)}</small></h2><span class="m-topo-bts">${moedasHtml(p)}`
    + `<button class="m-fecha" data-act="hub" aria-label="${T.sair}">✕</button></span></div>`
    + `<div class="c-abas">${abas}</div></div>`
    + `<div class="m-corpo cp-corpo"><div class="cp-mapa">${trilha}${nos}</div>${det}</div>${ajuda}</div></div>`;
}
