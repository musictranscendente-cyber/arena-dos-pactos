// Telas da coleção: escolha do signo inicial, coleção com fusão de cartas e pacotes.
import { card, CARDS, cardsOfSign, comNivel, ECO_ID, NIVEL_MAX } from '../data/cards';
import { ARTE, artUrl } from '../data/arte';
import { RARITY } from '../data/raridades';
import type { Raridade, Signo } from '../data/schema';
import { ORDER, RACES } from '../data/signos';
import { T } from '../data/textos';
import {
  CARTAS_PACOTE, CHANCES, copias, CUSTO_FUSAO, MAX_PACOTES, melhorNivel, podeFundir, precoPacote, totalCopias, type Progresso,
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

/** Loja de pacotes: vitrine que corre para os lados; tocar abre os detalhes; comprar pede confirmação. */
export interface TelaPacotes { aberto: Signo | 'estelar' | null; qtd: number; confirmar: boolean }

const signoDe = (id: Signo | 'estelar') => (id === 'estelar' ? undefined : id);

/** Arte do pacote: o signo usa a figura da lendária dele; o Estelar, uma estrela. */
function arteDoPacote(id: Signo | 'estelar'): string {
  if (id === 'estelar') return '<span class="pk-estrela">✦</span>';
  const cid = `${id}25`;
  return ARTE[cid] ? `<img src="${artUrl(cid, id, 'parado')}" alt="" draggable="false">` : `<span class="pk-estrela">${RACES[id].g}</span>`;
}

function nomePacote(id: Signo | 'estelar'): string {
  return id === 'estelar' ? T.pacoteEstelar : T.pacoteDe(RACES[id].n);
}

export function pacotesHtml(p: Progresso, tp: TelaPacotes): string {
  const ids: (Signo | 'estelar')[] = ['estelar', ...ORDER];
  const vitrine = ids.map(id => {
    const preco = precoPacote(signoDe(id)), cor = id === 'estelar' ? '#8a6ad8' : RACES[id].c;
    return `<button class="pk-cartao${id === 'estelar' ? ' estelar' : ''}" data-act="pver" data-r="${id}" style="--rc:${cor}">`
      + `<span class="pk-topo">${id === 'estelar' ? T.todosSignos : `${RACES[id].g} ${RACES[id].n}`}</span>`
      + `<span class="pk-img">${arteDoPacote(id)}</span>`
      + `<b class="pk-nome">${nomePacote(id)}</b><small class="pk-qtd">${T.nCartas(CARTAS_PACOTE)}</small>`
      + `<span class="pk-preco">✨ ${preco}</span><span class="btn go pk-comprar">${T.comprar}</span></button>`;
  }).join('');
  const detalhe = tp.aberto ? pacoteDetalheHtml(p, tp) : '';
  return `<div class="ov tela-pacotes loja"><div class="panel wide pacotes"><div class="gtop"><h2>${T.pacotes}</h2><span class="m-topo-bts">${moedasHtml(p)}${fecha()}</span></div>`
    + `<div class="pk-vitrine-box"><button class="pk-seta esq" data-act="pcorre" data-d="-1" aria-label="${T.anterior}">‹</button>`
    + `<div class="pk-vitrine">${vitrine}</div>`
    + `<button class="pk-seta dir" data-act="pcorre" data-d="1" aria-label="${T.proximo}">›</button></div>`
    + `<p class="pk-sub">${T.lojaDica}</p></div>${detalhe}</div>`;
}

function pacoteDetalheHtml(p: Progresso, tp: TelaPacotes): string {
  const id = tp.aberto!, sg = signoDe(id), preco = precoPacote(sg);
  const max = Math.max(1, Math.min(MAX_PACOTES, Math.floor(p.poeira / preco)));
  const qtd = Math.max(1, Math.min(tp.qtd, max));
  const total = preco * qtd, pode = p.poeira >= total;
  // destaques: o que de melhor pode vir (lendárias e épicas)
  const base = sg ? cardsOfSign(sg) : ORDER.map(s => `${s}25`);
  const destaques = base.filter(k => CARDS[k] && (CARDS[k].r === 'l' || CARDS[k].r === 'e')).slice(sg ? -5 : 0, sg ? undefined : 5);
  const cs = destaques.map(k => `<div class="pk-d">${cardHtml(card(k), card(k).cost, '', '', k)}</div>`).join('');
  const chances = (Object.keys(CHANCES) as Raridade[]).map(r =>
    `<li style="--rr:${RARITY[r].col}"><b>${NOMES_R[r]}</b> ${(CHANCES[r] * 100).toFixed(0)}%</li>`).join('');
  const conf = tp.confirmar
    ? `<div class="ov pk-conf"><div class="panel"><h3>${T.notificacao}</h3><p class="pk-custa">${T.custa} <b>✨ ${total}</b> ${T.continuarPergunta}</p>`
      + `<p class="pk-sub">${qtd}× ${nomePacote(id)} = ${T.nCartas(qtd * CARTAS_PACOTE)}</p>`
      + `<div class="acts2 pk-conf-bts"><button class="btn rc" data-act="pcancela">${T.cancelar}</button><button class="btn go" data-act="pconfirma">${T.confirmar}</button></div></div></div>`
    : '';
  return `<div class="ov pk-det"><div class="panel wide"><div class="gtop"><h2>${nomePacote(id)}</h2><button class="m-fecha" data-act="pfecha" aria-label="${T.sair}">✕</button></div>`
    + `<div class="pk-det-corpo"><div class="pk-det-esq"><p class="pk-sub">${sg ? T.pacotesSignoDesc(CARTAS_PACOTE) : T.pacoteDesc(CARTAS_PACOTE)} ${T.podeVir}</p>`
    + `<div class="pk-destaques">${cs}</div>`
    + `<ul class="pk-lista">${chances}</ul></div><div class="pk-det-dir">`
    + `<span class="pk-img pk-img-det" style="--rc:${sg ? RACES[sg].c : '#8a6ad8'}">${arteDoPacote(id)}</span>`
    + `<div class="pk-qtd-linha"><button class="btn rc pk-q" data-act="pmenos" ${qtd <= 1 ? 'disabled' : ''}>−</button><span class="pk-qn">${qtd}</span>`
    + `<button class="btn rc pk-q" data-act="pmais" ${qtd >= max ? 'disabled' : ''}>+</button><button class="btn rc pk-max" data-act="pmax" ${qtd >= max ? 'disabled' : ''}>${T.maximo}</button></div>`
    + `<button class="btn go pk-total" data-act="ppedir" ${pode ? '' : 'disabled'}>✨ ${total}</button>`
    + (pode ? '' : `<p class="m-dica">${T.semPoeira}</p>`)
    + `</div></div></div></div>${conf}`;
}

/** Cartas recebidas (pacote, prêmio): aparecem viradas e desviram uma a uma. */
export function revelarHtml(titulo: string, cartas: readonly string[], novas: readonly string[], extra = ''): string {
  // "NOVA!" só na primeira vez que a carta aparece (a repetida já não é nova)
  const cs = cartas.map((k, i) => `<div class="rv-c" style="--i:${Math.min(i, 14)}">${novas.includes(k) && cartas.indexOf(k) === i ? `<span class="rv-nova">${T.novaCarta}</span>` : ''}`
    + cardHtml(card(k), card(k).cost, '', '', k) + '</div>').join('');
  return `<div class="ov revela"><div class="panel wide"><h2>${titulo}</h2>${extra ? `<p class="rv-extra">${extra}</p>` : ''}<div class="rv-cartas">${cs}</div>`
    + `<button class="btn go" data-act="rv-ok">${T.continuar}</button></div></div>`;
}

export { NIVEL_MAX };
