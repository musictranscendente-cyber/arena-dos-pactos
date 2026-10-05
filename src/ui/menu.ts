// Tela inicial (ilhas flutuantes com os modos de jogo) e a montagem de deck com 2 signos.
import { CARDS } from '../data/cards';
import { ARTE, artUrl } from '../data/arte';
import type { Signo } from '../data/schema';
import { currentSign, ORDER, RACES } from '../data/signos';
import { T } from '../data/textos';
import { cartasDisponiveis, contarCopias, DECK_SIZE, maxCopias, type DeckMontado, type Nivel } from '../engine';
import { cardHtml, zoomHtml } from './desenho';

/** Criatura de pé numa ilha (arte parada); `vira` espelha para ela olhar para a esquerda. */
function criatura(cid: string, cls = '', vira = false): string {
  const c = CARDS[cid];
  if (!c || !ARTE[cid]) return '';
  return `<img class="ilha-fig ${cls}${vira ? ' vira' : ''}" src="${artUrl(cid, c.race, 'parado')}" alt="" draggable="false">`;
}

interface Ilha {
  act: string;
  nome: string;
  /** Posição do centro da ilha na tela (%) e largura relativa. */
  x: number; y: number; w: number;
  figs: string;
  breve?: boolean;
  cls?: string;
  sub?: string;
}

function ilhaHtml(i: Ilha, k: number): string {
  return `<button class="ilha ${i.cls ?? ''}${i.breve ? ' breve' : ''}" data-act="${i.act}" style="--x:${i.x}%;--y:${i.y}%;--w:${i.w};--d:${(k % 4) * -1.3}s" aria-label="${i.nome}${i.breve ? ` (${T.emBreve})` : ''}">`
    + `<span class="ilha-figs">${i.figs}</span><span class="ilha-rocha"><i></i></span>`
    + `<span class="placa"><b>${i.nome}</b>${i.sub ? `<small>${i.sub}</small>` : ''}</span>`
    + (i.breve ? `<span class="cadeado" aria-hidden="true">🔒<small>${T.emBreve}</small></span>` : '')
    + '</button>';
}

/** Texto do jogador dentro do HTML (nome do deck): sem tags. */
export function esc(t: string): string {
  return t.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
}

/** Nome curto de um deck montado: "♈ Áries + ♌ Leão". */
export function nomeDeckMontado(d: DeckMontado): string {
  if (d.nome?.trim()) return esc(d.nome.trim());
  return d.signos.map(s => `${RACES[s].g} ${RACES[s].n}`).join(' + ');
}

export function hubHtml(now: Date, deck: DeckMontado | null): string {
  const tem = currentSign(now);
  const avatar = deck ? deck.signos[0] : tem;
  const ilhas: Ilha[] = [
    { act: 'campanha', nome: T.campanha, x: 38, y: 39, w: .8, breve: true, figs: criatura('capricornio25') + criatura('capricornio22', 'peq', true) },
    { act: 'torneio', nome: T.torneio, x: 67, y: 34, w: .72, breve: true, figs: criatura('sagitario25') },
    { act: 'conhecer', nome: T.conhecerDecks, sub: T.conhecerSub, x: 14, y: 47, w: .8, figs: criatura('peixes25') + criatura('gemeos25', 'peq', true) },
    { act: 'ranqueada', nome: T.ranqueada, x: 85, y: 58, w: .85, breve: true, figs: criatura('touro25') + criatura('escorpiao25', '', true) },
    { act: 'montar', nome: T.montarDeck, sub: deck ? nomeDeckMontado(deck) : T.montarSub, x: 35, y: 73, w: .92, cls: 'deck', figs: criatura('libra25') + '<span class="leque"><i></i><i></i><i></i></span>' },
    { act: 'rapida', nome: T.partidaRapida, sub: T.rapidaSub, x: 60, y: 74, w: 1.15, cls: 'principal', figs: criatura('aries25') + criatura('leao25', '', true) },
  ];
  const r = RACES[avatar];
  return `<div class="hub" style="--rc:${r.c}">`
    + '<div class="hub-ceu"></div><div class="hub-brilho"></div>'
    + `<div class="hub-topo"><div class="hub-perfil"><div class="medal"><span>${r.g}</span></div>`
    + `<div class="hub-nome"><b>${T.invocador}</b><small>${deck ? nomeDeckMontado(deck) : T.semDeck}</small></div></div>`
    + `<div class="hub-titulo">${T.titulo}</div>`
    + `<button class="hub-evento breve" data-act="evento" style="--rc:${RACES[tem].c}" aria-label="${T.eventoTemporada} (${T.emBreve})">`
    + `${criatura(tem + '25', 'mini')}<span><b>${T.eventoTemporada}</b><small>${RACES[tem].g} ${RACES[tem].n} · ${T.emBreve}</small></span></button></div>`
    + ilhas.map(ilhaHtml).join('')
    + `<div class="hub-base"><button class="hub-bt breve" data-act="missoes"><span>📜</span><b>${T.missoes}</b><small>${T.emBreve}</small></button>`
    + `<button class="hub-bt" data-act="regras"><span>📖</span><b>${T.comoJogar}</b></button></div>`
    + '</div>';
}

/** Aviso rápido no meio da tela (ex.: "Em breve!"). */
export function avisoHtml(txt: string): string {
  return `<div class="hub-aviso" role="status">${txt}</div>`;
}

/** Partida Rápida: escolhe a dificuldade do bot; mostra com qual deck você vai jogar. */
export function dificuldadeHtml(deck: DeckMontado | null, ultimo: Nivel): string {
  const nv = (n: Nivel, icone: string) => `<button class="nivel n-${n}${n === ultimo ? ' ultimo' : ''}" data-act="nivel" data-n="${n}">`
    + `<span class="nv-ic">${icone}</span><b>${T.nivelNome[n]}</b><small>${T.nivelDesc[n]}</small></button>`;
  const seu = deck
    ? `<p class="nv-deck">${T.seuDeck}: <b>${nomeDeckMontado(deck)}</b> <button class="btn rc mini" data-act="montar">${T.trocar}</button></p>`
    : `<p class="nv-deck">${T.semDeckAviso} <button class="btn rc mini" data-act="montar">${T.montarAgora}</button></p>`;
  return `<div class="ov"><div class="panel wide nivel-painel"><div class="gtop"><h2>${T.partidaRapida}</h2>`
    + `<button class="m-fecha" data-act="fechar" aria-label="${T.sair}">✕</button></div>`
    + seu + `<p>${T.escolhaDificuldade}</p>`
    + `<div class="niveis">${nv('facil', '🌱')}${nv('normal', '⚔️')}${nv('dificil', '🔥')}</div></div></div>`;
}

export function regrasHtml(): string {
  return `<div class="ov"><div class="panel wide"><div class="gtop"><h2>${T.comoJogar}</h2><button class="btn rc" data-act="fechar">${T.voltar}</button></div>`
    + `<ul>${T.regras.map(x => `<li>${x}</li>`).join('')}</ul></div></div>`;
}

export interface Montagem {
  /** 0 = meus decks (3 espaços); 1 = escolher os 2 signos; 2 = escolher as cartas. */
  passo: 0 | 1 | 2;
  /** Espaço (0..2) que está sendo editado. */
  espaco: number;
  signos: Signo[];
  cartas: string[];
  /** Carta aberta no painel de detalhes. */
  info: string | null;
  msg: string;
  /** Espaço esperando confirmar para apagar. */
  apagar: number | null;
  /** Nome do deck (vazio = usa os signos). */
  nome: string;
}

const RAR_NOME: Record<string, string> = { c: 'Comum', r: 'Rara', e: 'Épica', l: 'Lendária' };

function fechaHtml(): string {
  return `<button class="m-fecha" data-act="hub" aria-label="${T.sair}" title="${T.sair}">✕</button>`;
}

/** Lista dos 3 espaços de deck: editar, usar (o deck da Partida Rápida) ou apagar. */
function meusDecksHtml(m: Montagem, decks: (DeckMontado | null)[], ativo: number): string {
  const slots = decks.map((d, i) => {
    if (!d) {
      return `<div class="m-slot vazio"><b class="m-slot-n">${T.deckN(i + 1)}</b><span class="m-slot-vazio">${T.espacoVazio}</span>`
        + `<button class="btn go" data-act="mespaco" data-i="${i}">＋ ${T.novoDeck}</button></div>`;
    }
    const [a, b] = d.signos;
    const em = i === ativo;
    return `<div class="m-slot${em ? ' ativo' : ''}" style="--rc:${RACES[a].c};--rc2:${RACES[b].c}">`
      + `<b class="m-slot-n">${T.deckN(i + 1)}${em ? ` <em>${T.emUso}</em>` : ''}</b>`
      + `<span class="m-slot-sg"><i>${RACES[a].g}</i><i class="b">${RACES[b].g}</i></span>`
      + `<span class="m-slot-nome">${nomeDeckMontado(d)}</span>`
      + (d.nome?.trim() ? `<span class="m-slot-sub">${RACES[a].n} + ${RACES[b].n}</span>` : '')
      + `<span class="m-slot-bts">`
      + (em ? `<button class="btn rc" disabled>✓ ${T.emUso}</button>` : `<button class="btn go" data-act="musar" data-i="${i}">${T.usarDeck}</button>`)
      + `<button class="btn rc" data-act="mespaco" data-i="${i}">${T.editar}</button>`
      + `<button class="btn rc apaga" data-act="mapagar" data-i="${i}">${m.apagar === i ? T.confirmarApagar : '🗑️'}</button>`
      + '</span></div>';
  }).join('');
  return `<div class="ov montar"><div class="panel wide">`
    + `<div class="gtop"><h2>${T.meusDecks}</h2>${fechaHtml()}</div>`
    + `<p>${T.meusDecksAjuda}</p><div class="m-slots">${slots}</div></div></div>`;
}

export function montarHtml(m: Montagem, decks: (DeckMontado | null)[], ativo: number): string {
  if (m.passo === 0) return meusDecksHtml(m, decks, ativo);
  if (m.passo === 1) {
    const signs = ORDER.map(k => {
      const r = RACES[k], on = m.signos.includes(k);
      return `<button class="sign${on ? ' on' : ''}" data-act="msigno" data-r="${k}" style="--rc:${r.c}" aria-pressed="${on}">`
        + (on ? `<span class="tag">${m.signos.indexOf(k) + 1}º</span>` : '')
        + `<span class="g"><span>${r.g}</span></span><span class="sn">${r.n}</span><span class="sm">${r.el}, ${r.m}</span></button>`;
    }).join('');
    return `<div class="ov montar"><div class="panel wide">`
      + `<div class="gtop"><h2>${T.deckN(m.espaco + 1)}: ${T.escolhaOsSignos}</h2><span class="m-topo-bts"><button class="btn rc" data-act="mdecks">${T.voltar}</button>${fechaHtml()}</span></div>`
      + `<p>${T.escolha2Signos} <b>${m.signos.length}/2</b></p><div class="signs">${signs}</div>`
      + `<button class="btn go" data-act="mseguir" ${m.signos.length === 2 ? '' : 'disabled'} style="width:100%">${T.escolherCartas}</button>`
      + '</div></div>';
  }
  const [a, b] = m.signos as [Signo, Signo];
  const lista = cartasDisponiveis(a, b).sort((x, y) => CARDS[x].cost - CARDS[y].cost || (CARDS[x].race === a ? 0 : 1) - (CARDS[y].race === a ? 0 : 1));
  const qtd = contarCopias(m.cartas);
  const cards = lista.map(k => {
    const n = qtd.get(k) ?? 0;
    const cls = [n ? 'no-deck' : 'fora-deck', m.info === k ? 'sel' : ''].join(' ');
    return cardHtml(CARDS[k], CARDS[k].cost, `data-act="mcarta" data-k="${k}" data-n="${n}" tabindex="0" role="button" aria-label="${CARDS[k].name}: ${n}"`, cls, k);
  }).join('');
  // curva de mana do deck: quantas cartas de cada custo (7+ juntas)
  const curva = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const k of m.cartas) curva[Math.min(7, CARDS[k].cost)]++;
  const max = Math.max(1, ...curva);
  const barras = curva.map((n, i) => `<span class="cv"><i style="height:${(n / max) * 100}%"></i><b>${n}</b><small>${i === 7 ? '7+' : i}</small></span>`).join('');
  const deA = m.cartas.filter(k => CARDS[k].race === a).length;
  const cheio = m.cartas.length === DECK_SIZE;
  // painel da carta aberta: a carta grande com tudo, quantas cópias tem no deck e os botões de colocar/tirar
  let lado = `<p class="m-dica">${m.msg || T.toqueParaVer}</p>`;
  if (m.info) {
    const k = m.info, n = qtd.get(k) ?? 0, mx = maxCopias(k);
    // quantidade e botões em cima (sempre à vista); a carta grande logo abaixo
    lado = `<div class="m-qtd"><button class="btn rc" data-act="mmenos" ${n ? '' : 'disabled'} aria-label="${T.tirar}">－ ${T.tirar}</button>`
      + `<button class="btn go" data-act="mmais" ${n < mx && !cheio ? '' : 'disabled'} aria-label="${T.colocar}">＋ ${T.colocar}</button></div>`
      + `<p class="m-copias">${T.noDeck}: <b>${n}</b> / ${mx} <small>(${RAR_NOME[CARDS[k].r]})</small></p>`
      + (m.msg ? `<p class="m-dica">${m.msg}</p>` : '')
      + `<div class="m-detalhe">${zoomHtml({ cid: k, lado: 'p' })}</div>`;
  }
  return `<div class="ov montar gal"><div class="panel wide"><div class="m-fixo">`
    + `<div class="gtop"><div class="m-titulo"><span class="m-sg"><i style="--rc:${RACES[a].c}">${RACES[a].g}</i><i style="--rc:${RACES[b].c}">${RACES[b].g}</i></span>`
    + `<label class="m-nome"><small>${T.deckN(m.espaco + 1)} · ${T.nomeDoDeck}</small>`
    + `<input id="m-nome" type="text" maxlength="22" autocomplete="off" spellcheck="false" value="${esc(m.nome)}" placeholder="${RACES[a].n} + ${RACES[b].n}"></label></div>`
    + `<span class="m-topo-bts"><button class="btn rc" data-act="mvoltar">${T.trocarSignos}</button>${fechaHtml()}</span></div>`
    + `<div class="m-barra"><div class="m-conta${cheio ? ' cheio' : ''}"><b>${m.cartas.length}</b>/${DECK_SIZE}<small>${RACES[a].g} ${deA} · ${RACES[b].g} ${m.cartas.length - deA}</small></div>`
    + `<div class="m-curva" aria-label="${T.curvaMana}">${barras}</div>`
    + `<div class="m-bts"><button class="btn rc" data-act="mcompletar" ${cheio ? 'disabled' : ''}>${T.completar}</button>`
    + `<button class="btn rc" data-act="mlimpar" ${m.cartas.length ? '' : 'disabled'}>${T.limpar}</button>`
    + `<button class="btn go" data-act="msalvar" ${cheio ? '' : 'disabled'}>${T.salvarDeck}</button></div></div></div>`
    + `<div class="m-corpo"><div class="m-lado">${lado}</div><div class="ggrid">${cards}</div></div></div></div>`;
}
