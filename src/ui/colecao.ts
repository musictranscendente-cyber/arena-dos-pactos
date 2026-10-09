// Telas da coleção: escolha do signo inicial, coleção com fusão de cartas e pacotes.
import { baseCid, card, CARDS, cardsOfSign, comNivel, ECO_ID, NIVEL_MAX, nivelDe } from '../data/cards';
import { ARTE, artUrl } from '../data/arte';
import { RARITY } from '../data/raridades';
import type { Raridade, Signo } from '../data/schema';
import { ORDER, RACES } from '../data/signos';
import { T } from '../data/textos';
import {
  CARTAS_PACOTE, CHANCES, copiasNoNivel, CUSTO_FUSAO, MAX_PACOTES, niveisQueTem, podeFundir, PRECO_PACOTE, PRECO_PACOTE_SIGNO, precoPacote, type Progresso,
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

export const ORDEM_RAR: (Raridade | 'todas')[] = ['todas', 'c', 'r', 'e', 'l'];
const ORDEM_TIPO: ('todos' | 'unit' | 'spell')[] = ['todos', 'unit', 'spell'];
/** Próximo valor de cada filtro (cada toque no botão passa para o seguinte). */
export function proximoFiltro(t: TelaColecao, qual: 'nivel' | 'rar' | 'tipo'): TelaColecao {
  if (qual === 'nivel') return { ...t, nivel: ((t.nivel ?? 0) + 1) % (NIVEL_MAX + 1) };
  if (qual === 'rar') return { ...t, rar: ORDEM_RAR[(ORDEM_RAR.indexOf(t.rar ?? 'todas') + 1) % ORDEM_RAR.length] };
  return { ...t, tipo: ORDEM_TIPO[(ORDEM_TIPO.indexOf(t.tipo ?? 'todos') + 1) % ORDEM_TIPO.length] };
}

export function colecaoHtml(p: Progresso, t: TelaColecao): string {
  const nvF = t.nivel ?? 0, rarF = t.rar ?? 'todas', tipoF = t.tipo ?? 'todos';
  const bases = (t.filtro === 'todas' ? Object.keys(CARDS).filter(k => k !== ECO_ID) : cardsOfSign(t.filtro))
    .filter(k => (rarF === 'todas' || CARDS[k].r === rarF) && (tipoF === 'todos' || CARDS[k].type === tipoF));
  // cada nível que o jogador tem é uma carta separada (Basilisco Nv1 ×3 e Basilisco Nv2 ×1 são duas)
  const entradas: { id: string; n: number }[] = [];
  for (const k of bases) {
    const ids = niveisQueTem(p, k);
    if (ids.length) { for (const id of ids) if (!nvF || nivelDe(id) === nvF) entradas.push({ id, n: copiasNoNivel(p, id) }); }
    else if (!nvF) entradas.push({ id: k, n: 0 });
  }
  // as que dá para fundir agora primeiro, depois as que têm par, as que tem e as que faltam
  const peso = (e: { id: string; n: number }) => (!e.n ? 3 : !podeFundir(p, e.id, nivelDe(e.id)) ? 0 : e.n >= 2 && nivelDe(e.id) < NIVEL_MAX ? 1 : 2);
  entradas.sort((x, y) => peso(x) - peso(y) || ORDER.indexOf(card(x.id).race) - ORDER.indexOf(card(y.id).race)
    || card(x.id).cost - card(y.id).cost || baseCid(x.id).localeCompare(baseCid(y.id)) || nivelDe(y.id) - nivelDe(x.id));
  const tem = Object.keys(p.cartas).length;
  const abas = [`<button class="c-aba${t.filtro === 'todas' ? ' on' : ''}" data-act="cfiltro" data-r="todas">${T.todas}</button>`]
    .concat(ORDER.map(k => `<button class="c-aba${t.filtro === k ? ' on' : ''}" data-act="cfiltro" data-r="${k}" style="--rc:${RACES[k].c}" title="${RACES[k].n}">${RACES[k].g}</button>`)).join('');
  const filtros = `<button class="c-aba c-ciclo${nvF ? ' on' : ''}" data-act="cnivel">${T.filtroNivel}: <b>${nvF ? `Nv${nvF}` : T.todos}</b></button>`
    + `<button class="c-aba c-ciclo${rarF !== 'todas' ? ' on' : ''}" data-act="crar">${T.filtroRaridade}: <b>${rarF === 'todas' ? T.todas : NOMES_R[rarF]}</b></button>`
    + `<button class="c-aba c-ciclo${tipoF !== 'todos' ? ' on' : ''}" data-act="ctipo">${T.filtroTipo}: <b>${tipoF === 'todos' ? T.todos : tipoF === 'unit' ? T.criaturas : T.magiasTipo}</b></button>`
    + `<button class="c-aba c-info${t.ajuda ? ' on' : ''}" data-act="cajuda" aria-label="${T.comoFundir}" title="${T.comoFundir}">ⓘ</button>`;
  const cards = entradas.map(({ id, n }) => {
    const cls = [n ? 'tenho' : 'bloq', t.sel === id ? 'sel' : '', n && !podeFundir(p, id, nivelDe(id)) ? 'fundivel' : ''].join(' ');
    return cardHtml(card(id), card(id).cost, `data-act="ccarta" data-k="${id}" data-n="${n}" tabindex="0" role="button"`, cls, id);
  }).join('') || `<p class="m-dica">${T.nenhumaCarta}</p>`;
  let lado = `<p class="m-dica">${t.msg || T.toqueColecao}</p>`;
  if (t.sel) {
    const id = t.sel, nv = nivelDe(id), n = copiasNoNivel(p, id);
    const outros = niveisQueTem(p, id).filter(x => x !== id).map(x => `<span class="c-nv"><b>Nv${nivelDe(x)}</b>×${copiasNoNivel(p, x)}</span>`).join('');
    // fusão: mostra a carta como está e como fica depois (Nv atual → Nv seguinte)
    let fusao = '';
    if (n >= 2 && nv < NIVEL_MAX) {
      const prox = comNivel(id, nv + 1), motivo = podeFundir(p, id, nv);
      fusao = `<div class="c-fusao"><div class="c-f-carta">${cardHtml(card(id), card(id).cost, '', '', id)}<small>2×</small></div><span class="c-f-seta">➜</span>`
        + `<div class="c-f-carta">${cardHtml(card(prox), card(prox).cost, '', 'depois', prox)}<small>1×</small></div></div>`
        + `<button class="btn go c-fundir" data-act="cfundir" data-nv="${nv}" ${motivo ? 'disabled' : ''}>${T.fundir(nv, CUSTO_FUSAO[nv + 1])}</button>`;
    }
    lado = (t.msg ? `<p class="m-dica">${t.msg}</p>` : '')
      + `<div class="c-resumo"><b>${n ? `${T.nivelN(nv)}: ×${n}` : T.naoTem}</b>${outros ? `<small>${T.outrosNiveis}</small>${outros}` : ''}</div>`
      + (fusao || `<div class="m-detalhe">${zoomHtml({ cid: id, lado: 'p' })}</div>`);
  }
  const ajuda = t.ajuda ? `<div class="c-ajuda" data-act="cajuda"><p><b>${T.comoFundir}</b></p><p>${T.fusaoAjuda}</p><p>${T.bonusNivel}</p><p>${T.precisaCopias}</p></div>` : '';
  return `<div class="ov montar gal colecao"><div class="panel wide"><div class="m-fixo">`
    + `<div class="gtop"><h2>${T.colecao} <small>${tem}/360</small></h2><span class="m-topo-bts">${moedasHtml(p)}${fecha()}</span></div>`
    + `<div class="c-abas">${abas}</div><div class="c-abas c-filtros">${filtros}</div></div>`
    + `<div class="m-corpo"><div class="m-lado">${lado}</div><div class="ggrid">${cards}</div></div>${ajuda}</div></div>`;
}

export const NOMES_R: Record<Raridade, string> = { c: 'Comum', r: 'Rara', e: 'Épica', l: 'Lendária' };

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
  // Estelar em destaque no alto (faixa larga); os 12 de signo em quadradinhos, todos à vista
  const estelar = `<button class="pk-faixa" data-act="pver" data-r="estelar">`
    + `<span class="pk-faixa-img">${arteDoPacote('estelar')}</span>`
    + `<span class="pk-faixa-txt"><b>${T.pacoteEstelar}</b><small>${T.pacoteDesc(CARTAS_PACOTE)}</small></span>`
    + `<span class="pk-faixa-preco">✨ ${PRECO_PACOTE}</span><span class="btn go pk-faixa-bt">${T.comprar}</span></button>`;
  const quadros = ORDER.map(id => `<button class="pk-quad" data-act="pver" data-r="${id}" style="--rc:${RACES[id].c}">`
    + `<span class="pk-quad-nome">${RACES[id].g} ${RACES[id].n}</span><span class="pk-img">${arteDoPacote(id)}</span>`
    + `<span class="pk-quad-preco">✨ ${PRECO_PACOTE_SIGNO}</span></button>`).join('');
  const detalhe = tp.aberto ? pacoteDetalheHtml(p, tp) : '';
  return `<div class="ov tela-pacotes loja"><div class="panel wide pacotes"><div class="gtop"><h2>${T.pacotes}</h2><span class="m-topo-bts">${moedasHtml(p)}${fecha()}</span></div>`
    + estelar + `<p class="pk-sub pk-sub-signo">${T.pacotesSigno}: ${T.pacotesSignoDesc(CARTAS_PACOTE)}</p>`
    + `<div class="pk-grade">${quadros}</div></div>${detalhe}</div>`;
}

function pacoteDetalheHtml(p: Progresso, tp: TelaPacotes): string {
  const id = tp.aberto!, sg = signoDe(id), preco = precoPacote(sg);
  const max = Math.max(1, Math.min(MAX_PACOTES, Math.floor(p.poeira / preco)));
  const qtd = Math.max(1, Math.min(tp.qtd, max));
  const total = preco * qtd, pode = p.poeira >= total;
  // só as chances (sem mostrar cartas de exemplo, que davam a impressão de que aquelas iam sair)
  const total5 = (sg ? cardsOfSign(sg) : Object.keys(CARDS).filter(k => k !== ECO_ID));
  const chances = (['l', 'e', 'r', 'c'] as Raridade[]).map(r => {
    const n = total5.filter(k => CARDS[k].r === r).length;
    return `<div class="pk-ch-q" style="--rr:${RARITY[r].col}"><b>${(CHANCES[r] * 100).toFixed(0)}%</b><span>${NOMES_R[r]}</span><small>${T.cartasPossiveis(n)}</small></div>`;
  }).join('');
  const conf = tp.confirmar
    ? `<div class="ov pk-conf"><div class="panel"><h3>${T.notificacao}</h3><p class="pk-custa">${T.custa} <b>✨ ${total}</b> ${T.continuarPergunta}</p>`
      + `<p class="pk-sub">${qtd}× ${nomePacote(id)} = ${T.nCartas(qtd * CARTAS_PACOTE)}</p>`
      + `<div class="acts2 pk-conf-bts"><button class="btn rc" data-act="pcancela">${T.cancelar}</button><button class="btn go" data-act="pconfirma">${T.confirmar}</button></div></div></div>`
    : '';
  return `<div class="ov pk-det"><div class="panel wide"><div class="gtop"><h2>${nomePacote(id)}</h2><button class="m-fecha" data-act="pfecha" aria-label="${T.sair}">✕</button></div>`
    + `<div class="pk-det-corpo"><div class="pk-det-esq"><p class="pk-sub">${sg ? T.pacotesSignoDesc(CARTAS_PACOTE) : T.pacoteDesc(CARTAS_PACOTE)}</p>`
    + `<div class="pk-chances">${chances}</div><p class="pk-sub">${T.chancePorCarta}</p></div><div class="pk-det-dir">`
    + `<span class="pk-img pk-img-det" style="--rc:${sg ? RACES[sg].c : '#8a6ad8'}">${arteDoPacote(id)}</span>`
    + `<div class="pk-qtd-linha"><button class="btn rc pk-q" data-act="pmenos" ${qtd <= 1 ? 'disabled' : ''}>−</button><span class="pk-qn">${qtd}</span>`
    + `<button class="btn rc pk-q" data-act="pmais" ${qtd >= max ? 'disabled' : ''}>+</button><button class="btn rc pk-max" data-act="pmax" ${qtd >= max ? 'disabled' : ''}>${T.maximo}</button></div>`
    + `<button class="btn go pk-total" data-act="ppedir" ${pode ? '' : 'disabled'}>✨ ${total}</button>`
    + (pode ? '' : `<p class="m-dica">${T.semPoeira}</p>`)
    + `</div></div></div></div>${conf}`;
}

/** Cartas recebidas (pacote, prêmio): aparecem viradas e desviram uma a uma. */
const PESO_R: Record<Raridade, number> = { l: 0, e: 1, r: 2, c: 3 };

export function revelarHtml(titulo: string, cartas0: readonly string[], novas: readonly string[], extra = ''): string {
  // da mais rara para a mais comum (e por custo dentro da mesma raridade)
  const cartas = [...cartas0].sort((a, b) => PESO_R[card(a).r] - PESO_R[card(b).r] || card(b).cost - card(a).cost);
  // "NOVA!" só na primeira vez que a carta aparece (a repetida já não é nova)
  const cs = cartas.map((k, i) => `<div class="rv-c" style="--i:${Math.min(i, 14)}">${novas.includes(k) && cartas.indexOf(k) === i ? `<span class="rv-nova">${T.novaCarta}</span>` : ''}`
    + cardHtml(card(k), card(k).cost, '', '', k) + '</div>').join('');
  return `<div class="ov revela"><div class="panel wide"><h2>${titulo}</h2>${extra ? `<p class="rv-extra">${extra}</p>` : ''}<div class="rv-cartas">${cs}</div>`
    + `<button class="btn go" data-act="rv-ok">${T.continuar}</button></div></div>`;
}

export { NIVEL_MAX };
