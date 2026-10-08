// Telas da coleção: escolha do signo inicial, coleção com fusão de cartas e pacotes.
import { card, CARDS, cardsOfSign, comNivel, ECO_ID, NIVEL_MAX } from '../data/cards';
import { RARITY } from '../data/raridades';
import type { Raridade, Signo } from '../data/schema';
import { ORDER, RACES } from '../data/signos';
import { T } from '../data/textos';
import {
  CARTAS_PACOTE, CHANCES, copias, CUSTO_FUSAO, melhorNivel, podeFundir, PRECO_PACOTE, PRECO_PACOTE_SIGNO, totalCopias, type Progresso,
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

export interface TelaColecao {
  filtro: Signo | 'todas';
  sel: string | null;
  msg: string;
  /** Filtros extras: nível (0 = todos), raridade e tipo. */
  nivel?: number;
  rar?: Raridade | 'todas';
  tipo?: 'todos' | 'unit' | 'spell';
  /** Explicação da fusão aberta (botão ⓘ). */
  ajuda?: boolean;
}

const ORDEM_RAR: (Raridade | 'todas')[] = ['todas', 'c', 'r', 'e', 'l'];
const ORDEM_TIPO: ('todos' | 'unit' | 'spell')[] = ['todos', 'unit', 'spell'];
/** Próximo valor de cada filtro (cada toque no botão passa para o seguinte). */
export function proximoFiltro(t: TelaColecao, qual: 'nivel' | 'rar' | 'tipo'): TelaColecao {
  if (qual === 'nivel') return { ...t, nivel: ((t.nivel ?? 0) + 1) % (NIVEL_MAX + 1) };
  if (qual === 'rar') return { ...t, rar: ORDEM_RAR[(ORDEM_RAR.indexOf(t.rar ?? 'todas') + 1) % ORDEM_RAR.length] };
  return { ...t, tipo: ORDEM_TIPO[(ORDEM_TIPO.indexOf(t.tipo ?? 'todos') + 1) % ORDEM_TIPO.length] };
}

/** Dá para fundir alguma cópia dessa carta agora (tem 2 do mesmo nível e Poeira)? */
const fundivelAgora = (p: Progresso, k: string) => [1, 2, 3, 4].some(x => !podeFundir(p, k, x));
/** Tem 2 do mesmo nível (mesmo sem Poeira suficiente)? */
const temPar = (p: Progresso, k: string) => copias(p, k).slice(0, 4).some(q => q >= 2);

export function colecaoHtml(p: Progresso, t: TelaColecao): string {
  const nvF = t.nivel ?? 0, rarF = t.rar ?? 'todas', tipoF = t.tipo ?? 'todos';
  const lista = (t.filtro === 'todas' ? Object.keys(CARDS).filter(k => k !== ECO_ID) : cardsOfSign(t.filtro))
    .filter(k => (rarF === 'todas' || CARDS[k].r === rarF) && (tipoF === 'todos' || CARDS[k].type === tipoF)
      && (!nvF || copias(p, k)[nvF - 1] > 0))
    // as que dá para fundir primeiro, depois as que tem, depois as que faltam
    .sort((a, b) => {
      const peso = (k: string) => (fundivelAgora(p, k) ? 0 : temPar(p, k) ? 1 : totalCopias(p, k) > 0 ? 2 : 3);
      return peso(a) - peso(b) || ORDER.indexOf(CARDS[a].race) - ORDER.indexOf(CARDS[b].race) || CARDS[a].cost - CARDS[b].cost;
    });
  const tem = Object.keys(p.cartas).length;
  const abas = [`<button class="c-aba${t.filtro === 'todas' ? ' on' : ''}" data-act="cfiltro" data-r="todas">${T.todas}</button>`]
    .concat(ORDER.map(k => `<button class="c-aba${t.filtro === k ? ' on' : ''}" data-act="cfiltro" data-r="${k}" style="--rc:${RACES[k].c}" title="${RACES[k].n}">${RACES[k].g}</button>`)).join('');
  const filtros = `<button class="c-aba c-ciclo${nvF ? ' on' : ''}" data-act="cnivel">${T.filtroNivel}: <b>${nvF ? `Nv${nvF}` : T.todos}</b></button>`
    + `<button class="c-aba c-ciclo${rarF !== 'todas' ? ' on' : ''}" data-act="crar">${T.filtroRaridade}: <b>${rarF === 'todas' ? T.todas : NOMES_R[rarF]}</b></button>`
    + `<button class="c-aba c-ciclo${tipoF !== 'todos' ? ' on' : ''}" data-act="ctipo">${T.filtroTipo}: <b>${tipoF === 'todos' ? T.todos : tipoF === 'unit' ? T.criaturas : T.magiasTipo}</b></button>`
    + `<button class="c-aba c-info${t.ajuda ? ' on' : ''}" data-act="cajuda" aria-label="${T.comoFundir}" title="${T.comoFundir}">ⓘ</button>`;
  const cards = lista.map(k => {
    const n = totalCopias(p, k), nv = Math.max(1, melhorNivel(p, k)), id = comNivel(k, nv);
    const cls = [n ? 'tenho' : 'bloq', t.sel === k ? 'sel' : '', fundivelAgora(p, k) ? 'fundivel' : ''].join(' ');
    return cardHtml(card(id), card(id).cost, `data-act="ccarta" data-k="${k}" data-n="${n}" tabindex="0" role="button"`, cls, id);
  }).join('') || `<p class="m-dica">${T.nenhumaCarta}</p>`;
  let lado = `<p class="m-dica">${t.msg || T.toqueColecao}</p>`;
  if (t.sel) {
    const k = t.sel, c = copias(p, k), n = totalCopias(p, k);
    const nv = Math.max(1, melhorNivel(p, k));
    const linhas = c.map((q, i) => (q ? `<span class="c-nv"><b>Nv${i + 1}</b>×${q}</span>` : '')).join('');
    const fusoes = [1, 2, 3, 4].filter(x => c[x - 1] >= 2).map(x => {
      const motivo = podeFundir(p, k, x);
      return `<button class="btn go c-fundir" data-act="cfundir" data-nv="${x}" ${motivo ? 'disabled' : ''}>${T.fundir(x, CUSTO_FUSAO[x + 1])}</button>`;
    }).join('');
    // tudo compacto em cima (cópias e fundir), para a carta grande caber inteira embaixo
    lado = (t.msg ? `<p class="m-dica">${t.msg}</p>` : '')
      + `<div class="c-resumo"><b>${n ? T.naColecao(n) : T.naoTem}</b>${linhas}</div>`
      + (fusoes ? `<div class="c-fusoes">${fusoes}</div>` : '')
      + `<div class="m-detalhe">${zoomHtml({ cid: comNivel(k, nv), lado: 'p' })}</div>`;
  }
  const ajuda = t.ajuda ? `<div class="c-ajuda" data-act="cajuda"><p><b>${T.comoFundir}</b></p><p>${T.fusaoAjuda}</p><p>${T.bonusNivel}</p><p>${T.precisaCopias}</p></div>` : '';
  return `<div class="ov montar gal colecao"><div class="panel wide"><div class="m-fixo">`
    + `<div class="gtop"><h2>${T.colecao} <small>${tem}/360</small></h2><span class="m-topo-bts">${moedasHtml(p)}${fecha()}</span></div>`
    + `<div class="c-abas">${abas}</div><div class="c-abas c-filtros">${filtros}</div></div>`
    + `<div class="m-corpo"><div class="m-lado">${lado}</div><div class="ggrid">${cards}</div></div>${ajuda}</div></div>`;
}

const NOMES_R: Record<Raridade, string> = { c: 'Comum', r: 'Rara', e: 'Épica', l: 'Lendária' };

export function pacotesHtml(p: Progresso): string {
  const chances = (Object.keys(CHANCES) as Raridade[]).map(r =>
    `<li style="--rr:${RARITY[r].col}"><b>${NOMES_R[r]}</b> ${(CHANCES[r] * 100).toFixed(0)}%</li>`).join('');
  const signos = ORDER.map(k => `<button class="pk-signo" data-act="pabrir" data-r="${k}" style="--rc:${RACES[k].c}" ${p.poeira >= PRECO_PACOTE_SIGNO ? '' : 'disabled'}>`
    + `<span class="pk-g">${RACES[k].g}</span><b>${RACES[k].n}</b><small>${PRECO_PACOTE_SIGNO} ✨</small></button>`).join('');
  return `<div class="ov tela-pacotes"><div class="panel wide pacotes"><div class="gtop"><h2>${T.pacotes}</h2><span class="m-topo-bts">${moedasHtml(p)}${fecha()}</span></div>`
    + `<div class="pk"><div class="pk-arte"><span>✦</span></div><div class="pk-info"><h3>${T.pacoteEstelar}</h3><p>${T.pacoteDesc(CARTAS_PACOTE)}</p>`
    + `<p class="pk-ch">${T.chances}:</p><ul class="pk-lista">${chances}</ul>`
    + `<button class="btn go" data-act="pabrir" ${p.poeira >= PRECO_PACOTE ? '' : 'disabled'}>${T.abrirPacote(PRECO_PACOTE)}</button>`
    + '</div></div>'
    + `<h3 class="pk-h">${T.pacotesSigno}</h3><p class="pk-sub">${T.pacotesSignoDesc(CARTAS_PACOTE)}</p><div class="pk-signos">${signos}</div>`
    + (p.poeira < PRECO_PACOTE ? `<p class="m-dica">${T.semPoeira}</p>` : '')
    + '</div></div>';
}

/** Cartas recebidas (pacote, prêmio): aparecem viradas e desviram uma a uma. */
export function revelarHtml(titulo: string, cartas: readonly string[], novas: readonly string[], extra = ''): string {
  const cs = cartas.map((k, i) => `<div class="rv-c" style="--i:${i}">${novas.includes(k) ? `<span class="rv-nova">${T.novaCarta}</span>` : ''}`
    + cardHtml(card(k), card(k).cost, '', '', k) + '</div>').join('');
  return `<div class="ov revela"><div class="panel wide"><h2>${titulo}</h2>${extra ? `<p class="rv-extra">${extra}</p>` : ''}<div class="rv-cartas">${cs}</div>`
    + `<button class="btn go" data-act="rv-ok">${T.continuar}</button></div></div>`;
}

export { NIVEL_MAX };
