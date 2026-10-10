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
import { cardHtml, habilidadesHtml } from './desenho';
import { ELEMENTO } from '../data/signos';

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
  /** Janela de confirmação da fusão aberta. */
  confirmar?: boolean;
  /** Carta que acabou de nascer de uma fusão (toca a animação uma vez). */
  fundiu?: string;
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
    const pode = n > 0 && !podeFundir(p, id, nivelDe(id));
    const cls = [n ? 'tenho' : 'bloq', t.sel === id ? 'sel' : '', pode ? 'fundivel' : ''].join(' ');
    // além do brilho verde, as que dá para fundir levam a etiqueta "⚡ Fundir"
    const html = cardHtml(card(id), card(id).cost, `data-act="ccarta" data-k="${id}" data-n="${n}" tabindex="0" role="button"${pode ? ` aria-label="${card(id).name}: ${T.fundivelTag}"` : ''}`, cls, id);
    return pode ? html.replace(/<\/div>$/, `<span class="c-tag-fundir">⚡ ${T.fundivelTag}</span></div>`) : html;
  }).join('') || `<p class="m-dica">${T.nenhumaCarta}</p>`;
  const sel = t.sel;
  const det = sel ? detalheHtml(p, sel, t) : '';
  const ajuda = t.ajuda ? `<div class="c-ajuda" data-act="cajuda"><p><b>${T.comoFundir}</b></p><p>${T.fusaoAjuda}</p><p>${T.bonusNivel}</p><p>${T.precisaCopias}</p></div>` : '';
  return `<div class="ov montar gal colecao${sel ? ' com-sel' : ''}"><div class="panel wide"><div class="c-esq"><div class="m-fixo">`
    + `<div class="gtop"><h2>${T.colecao} <small>${tem}/360</small></h2><span class="m-topo-bts">${moedasHtml(p)}${sel ? '' : fecha()}</span></div>`
    + `<div class="c-abas">${abas}</div><div class="c-abas c-filtros">${filtros}</div>`
    + (sel ? '' : `<p class="m-dica c-dica">${t.msg || T.toqueColecao}</p>`) + '</div>'
    + `<div class="m-corpo"><div class="ggrid">${cards}</div></div></div>${det}${ajuda}</div></div>`;
}

/** Atributos que mudam entre dois níveis da mesma carta (ataque/vida da criatura ou o valor da magia). */
function atributosHtml(id: string): string {
  const c = card(id);
  if (c.type === 'unit') return `<span class="c-at"><i>⚔️</i>${c.atk}</span><span class="c-at"><i>❤️</i>${c.hp}</span>`;
  return 'v' in c && typeof c.v === 'number' ? `<span class="c-at"><i>✨</i>${c.v}</span>` : '';
}

/** Painel da carta escolhida: detalhes completos e a fusão (Atual → Resultado → Cópias). */
function detalheHtml(p: Progresso, id: string, t: TelaColecao): string {
  const c = card(id), nv = nivelDe(id), n = copiasNoNivel(p, id), r = RACES[c.race];
  const outros = niveisQueTem(p, id).filter(x => x !== id).map(x => `<span class="c-nv"><b>Nv${nivelDe(x)}</b>×${copiasNoNivel(p, x)}</span>`).join('');
  const info = `<div class="cd-info">`
    + `<p><span>${T.rotTipo}:</span> ${c.type === 'unit' ? T.tipoCriatura : T.tipoMagia}</p>`
    + `<p><span>${T.rotSigno}:</span> ${r.g} ${r.n} · ${ELEMENTO[r.el].i} ${r.el}</p>`
    + `<p><span>${T.rotRaridade}:</span> <b class="cd-rar" style="--rr:${RARITY[c.r].col}">${RARITY[c.r].n}</b> <b class="cd-nv">Nv${nv} ${'★'.repeat(nv)}</b></p>`
    + `<p><span>${T.rotCopias}:</span> <b>${n ? `×${n}` : T.naoTem}</b>${outros ? ` <small>${T.outrosNiveis}</small> ${outros}` : ''}</p></div>`;
  const hab = `<div class="cd-hab"><h4>${c.type === 'unit' ? 'Habilidades' : T.tipoMagia}</h4>${habilidadesHtml(id)}</div>`;
  // fusão: regras reais (2 cópias do mesmo nível + Poeira; até o nível máximo)
  let fusao: string;
  if (n > 0) {
    let corpo: string;
    if (nv >= NIVEL_MAX) corpo = `<p class="cd-motivo">${T.nivelMaximo}</p>`;
    else {
      const prox = comNivel(id, nv + 1), custo = CUSTO_FUSAO[nv + 1], motivo = podeFundir(p, id, nv);
      const porque = motivo === 'copias' ? T.faltamCopias(2 - n) : motivo === 'poeira' ? T.faltaPoeira(custo - p.poeira) : '';
      corpo = `<div class="cd-fusao-linha">`
        + `<div class="cd-col"><small>${T.fusaoAtual}</small>${cardHtml(c, c.cost, '', '', id)}<span class="cd-ats">${atributosHtml(id)}</span></div>`
        + `<span class="cd-seta" aria-hidden="true">❯❯❯</span>`
        + `<div class="cd-col"><small>${T.fusaoResultado}</small>${cardHtml(card(prox), card(prox).cost, '', `depois${t.fundiu === prox ? ' nasceu' : ''}`, prox)}<span class="cd-ats sobe">${atributosHtml(prox)}</span></div>`
        + `<div class="cd-col cd-req"><small>${T.fusaoCopias}</small><b class="cd-qtd${n >= 2 ? ' ok' : ''}">${n} / 2</b>`
        + `<span class="cd-custo${p.poeira >= custo ? ' ok' : ''}">${T.fusaoCusto}: ✨ ${custo}</span>`
        + `<button class="btn go cd-fundir" data-act="cfundir" data-nv="${nv}" ${motivo ? 'disabled aria-disabled="true"' : ''}>${T.fusaoBotao}</button></div></div>`
        + `<p class="cd-motivo">${porque || '&nbsp;'}</p>`;
    }
    fusao = `<div class="cd-fusao"><h4>${T.fusaoTitulo}</h4>${corpo}</div>`;
  } else fusao = `<p class="cd-motivo">${T.precisaCopias}</p>`;
  const confirmar = t.confirmar && nv < NIVEL_MAX
    ? `<div class="cd-confirma" role="dialog" aria-modal="true"><div class="cd-confirma-caixa"><p>${T.confirmarFusao(c.name, nv, CUSTO_FUSAO[nv + 1])}</p>`
      + `<div class="cd-confirma-bts"><button class="btn rc" data-act="cfundir-nao">${T.cancelar}</button><button class="btn go" data-act="cfundir-ok" data-nv="${nv}">${T.confirmar}</button></div></div></div>`
    : '';
  return `<aside class="c-det" style="--rc:${r.c}" aria-label="${c.name}"><div class="c-det-in">`
    + `<div class="cd-topo"><h3>${c.name}</h3><button class="m-fecha" data-act="cfechar" aria-label="${T.fechar}" title="${T.fechar}">✕</button></div>`
    + (t.msg ? `<p class="cd-msg">${t.msg}</p>` : '')
    + `<div class="cd-cima"><div class="cd-carta">${cardHtml(c, c.cost, '', '', id)}</div><div class="cd-txt">${info}${hab}</div></div>`
    + fusao + '</div>' + confirmar + '</aside>';
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

/** As cartas ganhas, da mais rara para a mais comum, com "NOVA!" na primeira vez que cada uma aparece. */
export function cartasGanhasHtml(cartas0: readonly string[], novas: readonly string[]): string {
  const cartas = [...cartas0].sort((a, b) => PESO_R[card(a).r] - PESO_R[card(b).r] || card(b).cost - card(a).cost);
  return cartas.map((k, i) => `<div class="rv-c" style="--i:${Math.min(i, 14)}">${novas.includes(k) && cartas.indexOf(k) === i ? `<span class="rv-nova">${T.novaCarta}</span>` : ''}`
    + cardHtml(card(k), card(k).cost, '', '', k) + '</div>').join('');
}

export function revelarHtml(titulo: string, cartas: readonly string[], novas: readonly string[], extra = ''): string {
  return `<div class="ov revela"><div class="panel wide"><h2>${titulo}</h2>${extra ? `<p class="rv-extra">${extra}</p>` : ''}<div class="rv-cartas">${cartasGanhasHtml(cartas, novas)}</div>`
    + `<button class="btn go" data-act="rv-ok">${T.continuar}</button></div></div>`;
}

export { NIVEL_MAX };
