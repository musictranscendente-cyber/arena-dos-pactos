// Telas da coleção: escolha do signo inicial, coleção com fusão de cartas e pacotes.
import { card, CARDS, cardsOfSign, comNivel, ECO_ID, NIVEL_MAX } from '../data/cards';
import { RARITY } from '../data/raridades';
import type { Raridade, Signo } from '../data/schema';
import { ORDER, RACES } from '../data/signos';
import { T } from '../data/textos';
import {
  CARTAS_PACOTE, CHANCES, copias, CUSTO_FUSAO, melhorNivel, podeFundir, PRECO_PACOTE, totalCopias, type Progresso,
} from '../meta/progresso';
import { cardHtml, zoomHtml } from './desenho';

function fecha(): string {
  return `<button class="m-fecha" data-act="hub" aria-label="${T.sair}" title="${T.sair}">✕</button>`;
}

/** Moedas do jogador (canto da tela). */
export function moedasHtml(p: Progresso): string {
  return `<span class="moedas"><span title="${T.poeira}">✨ <b>${p.poeira}</b></span><span title="${T.gemas}">💎 <b>${p.gemas}</b></span></span>`;
}

/** Primeira vez: escolher o signo inicial (ganha as 30 cartas dele). */
export function inicialHtml(): string {
  const signs = ORDER.map(k => {
    const r = RACES[k];
    return `<button class="sign" data-act="inicial" data-r="${k}" style="--rc:${r.c}">`
      + `<span class="g"><span>${r.g}</span></span><span class="sn">${r.n}</span><span class="sm">${r.el}, ${r.m}</span></button>`;
  }).join('');
  return `<div class="ov inicial"><div class="panel wide"><h2>${T.escolhaInicialTitulo}</h2><p>${T.escolhaInicialTexto}</p>`
    + `<div class="signs">${signs}</div></div></div>`;
}

export interface TelaColecao { filtro: Signo | 'todas'; sel: string | null; msg: string }

export function colecaoHtml(p: Progresso, t: TelaColecao): string {
  const lista = (t.filtro === 'todas' ? Object.keys(CARDS).filter(k => k !== ECO_ID) : cardsOfSign(t.filtro))
    .sort((a, b) => {
      const ta = totalCopias(p, a) > 0 ? 0 : 1, tb = totalCopias(p, b) > 0 ? 0 : 1;
      return ta - tb || ORDER.indexOf(CARDS[a].race) - ORDER.indexOf(CARDS[b].race) || CARDS[a].cost - CARDS[b].cost;
    });
  const tem = Object.keys(p.cartas).length;
  const abas = [`<button class="c-aba${t.filtro === 'todas' ? ' on' : ''}" data-act="cfiltro" data-r="todas">${T.todas}</button>`]
    .concat(ORDER.map(k => `<button class="c-aba${t.filtro === k ? ' on' : ''}" data-act="cfiltro" data-r="${k}" style="--rc:${RACES[k].c}" title="${RACES[k].n}">${RACES[k].g}</button>`)).join('');
  const cards = lista.map(k => {
    const n = totalCopias(p, k), nv = Math.max(1, melhorNivel(p, k)), id = comNivel(k, nv);
    const fundivel = [1, 2, 3, 4].some(x => podeFundir(p, k, x) !== 'copias' && podeFundir(p, k, x) !== 'nivel');
    const cls = [n ? 'tenho' : 'bloq', t.sel === k ? 'sel' : '', fundivel ? 'fundivel' : ''].join(' ');
    return cardHtml(card(id), card(id).cost, `data-act="ccarta" data-k="${k}" data-n="${n}" tabindex="0" role="button"`, cls, id);
  }).join('');
  let lado = `<p class="m-dica">${t.msg || T.fusaoAjuda}</p><p class="m-dica">${T.bonusNivel}</p>`;
  if (t.sel) {
    const k = t.sel, c = copias(p, k), n = totalCopias(p, k);
    const nv = Math.max(1, melhorNivel(p, k));
    const linhas = c.map((q, i) => `<span class="c-nv${q ? '' : ' zero'}"><b>${'★'.repeat(i + 1)}</b> ${q}</span>`).join('');
    const fusoes = [1, 2, 3, 4].filter(x => c[x - 1] >= 2).map(x => {
      const motivo = podeFundir(p, k, x);
      return `<button class="btn go c-fundir" data-act="cfundir" data-nv="${x}" ${motivo ? 'disabled' : ''}>${T.fundir(x, CUSTO_FUSAO[x + 1])}</button>`;
    }).join('');
    lado = (t.msg ? `<p class="m-dica">${t.msg}</p>` : '')
      + `<p class="c-tem">${n ? T.naColecao(n) : T.naoTem}</p>`
      + (n ? `<div class="c-nvs" aria-label="${T.copiasPorNivel}">${linhas}</div>` : '')
      + (fusoes || (n ? `<p class="m-dica">${T.precisaCopias}</p>` : ''))
      + `<div class="m-detalhe">${zoomHtml({ cid: comNivel(k, nv), lado: 'p' })}</div>`;
  }
  return `<div class="ov montar gal colecao"><div class="panel wide"><div class="m-fixo">`
    + `<div class="gtop"><h2>${T.colecao} <small>${tem}/360</small></h2><span class="m-topo-bts">${moedasHtml(p)}${fecha()}</span></div>`
    + `<div class="c-abas">${abas}</div></div>`
    + `<div class="m-corpo"><div class="m-lado">${lado}</div><div class="ggrid">${cards}</div></div></div></div>`;
}

const NOMES_R: Record<Raridade, string> = { c: 'Comum', r: 'Rara', e: 'Épica', l: 'Lendária' };

export function pacotesHtml(p: Progresso): string {
  const chances = (Object.keys(CHANCES) as Raridade[]).map(r =>
    `<li style="--rr:${RARITY[r].col}"><b>${NOMES_R[r]}</b> ${(CHANCES[r] * 100).toFixed(0)}%</li>`).join('');
  return `<div class="ov tela-pacotes"><div class="panel wide pacotes"><div class="gtop"><h2>${T.pacotes}</h2><span class="m-topo-bts">${moedasHtml(p)}${fecha()}</span></div>`
    + `<div class="pk"><div class="pk-arte"><span>✦</span></div><div class="pk-info"><h3>${T.pacoteEstelar}</h3><p>${T.pacoteDesc(CARTAS_PACOTE)}</p>`
    + `<p class="pk-ch">${T.chances}:</p><ul class="pk-lista">${chances}</ul>`
    + `<button class="btn go" data-act="pabrir" ${p.poeira >= PRECO_PACOTE ? '' : 'disabled'}>${T.abrirPacote(PRECO_PACOTE)}</button>`
    + (p.poeira < PRECO_PACOTE ? `<p class="m-dica">${T.semPoeira}</p>` : '')
    + '</div></div></div></div>';
}

/** Cartas recebidas (pacote, prêmio): aparecem viradas e desviram uma a uma. */
export function revelarHtml(titulo: string, cartas: readonly string[], novas: readonly string[], extra = ''): string {
  const cs = cartas.map((k, i) => `<div class="rv-c" style="--i:${i}">${novas.includes(k) ? `<span class="rv-nova">${T.novaCarta}</span>` : ''}`
    + cardHtml(card(k), card(k).cost, '', '', k) + '</div>').join('');
  return `<div class="ov revela"><div class="panel wide"><h2>${titulo}</h2>${extra ? `<p class="rv-extra">${extra}</p>` : ''}<div class="rv-cartas">${cs}</div>`
    + `<button class="btn go" data-act="rv-ok">${T.continuar}</button></div></div>`;
}

export { NIVEL_MAX };
