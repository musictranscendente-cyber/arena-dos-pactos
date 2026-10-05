// Tela inicial (ilhas flutuantes com os modos de jogo) e a montagem de deck com 2 signos.
import { CARDS } from '../data/cards';
import { ARTE, artUrl } from '../data/arte';
import type { Signo } from '../data/schema';
import { currentSign, ORDER, RACES } from '../data/signos';
import { cardText, T } from '../data/textos';
import { cartasDisponiveis, DECK_SIZE, type DeckMontado } from '../engine';
import { cardHtml } from './desenho';

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

/** Nome curto de um deck montado: "♈ Áries + ♌ Leão". */
export function nomeDeckMontado(d: DeckMontado): string {
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

/** Partida rápida sem deck salvo: montar agora ou jogar com um deck aleatório. */
export function semDeckHtml(): string {
  return `<div class="ov"><div class="panel"><h2>${T.partidaRapida}</h2><p>${T.semDeckPergunta}</p>`
    + `<div class="acts2"><button class="btn go" data-act="montar">${T.montarAgora}</button>`
    + `<button class="btn rc" data-act="rapida-aleatorio">${T.deckAleatorioBt}</button>`
    + `<button class="btn rc" data-act="fechar">${T.voltar}</button></div></div></div>`;
}

export function regrasHtml(): string {
  return `<div class="ov"><div class="panel wide"><div class="gtop"><h2>${T.comoJogar}</h2><button class="btn rc" data-act="fechar">${T.voltar}</button></div>`
    + `<ul>${T.regras.map(x => `<li>${x}</li>`).join('')}</ul></div></div>`;
}

export interface Montagem {
  passo: 1 | 2;
  signos: Signo[];
  cartas: string[];
  info: string | null;
  msg: string;
}

export function montarHtml(m: Montagem): string {
  if (m.passo === 1) {
    const signs = ORDER.map(k => {
      const r = RACES[k], on = m.signos.includes(k);
      return `<button class="sign${on ? ' on' : ''}" data-act="msigno" data-r="${k}" style="--rc:${r.c}" aria-pressed="${on}">`
        + (on ? `<span class="tag">${m.signos.indexOf(k) + 1}º</span>` : '')
        + `<span class="g"><span>${r.g}</span></span><span class="sn">${r.n}</span><span class="sm">${r.el}, ${r.m}</span></button>`;
    }).join('');
    return `<div class="ov montar"><div class="panel wide">`
      + `<div class="gtop"><h2>${T.montarDeck}</h2><button class="btn rc" data-act="hub">${T.voltar}</button></div>`
      + `<p>${T.escolha2Signos} <b>${m.signos.length}/2</b></p><div class="signs">${signs}</div>`
      + `<button class="btn go" data-act="mseguir" ${m.signos.length === 2 ? '' : 'disabled'} style="width:100%">${T.escolherCartas}</button>`
      + '</div></div>';
  }
  const [a, b] = m.signos as [Signo, Signo];
  const lista = cartasDisponiveis(a, b).sort((x, y) => CARDS[x].cost - CARDS[y].cost || (CARDS[x].race === a ? 0 : 1) - (CARDS[y].race === a ? 0 : 1));
  const dentro = new Set(m.cartas);
  const cards = lista.map(k => cardHtml(CARDS[k], CARDS[k].cost, `data-act="mcarta" data-k="${k}" tabindex="0" role="button" aria-pressed="${dentro.has(k)}"`, dentro.has(k) ? 'no-deck' : 'fora-deck', k)).join('');
  // curva de mana do deck: quantas cartas de cada custo (7+ juntas)
  const curva = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const k of m.cartas) curva[Math.min(7, CARDS[k].cost)]++;
  const max = Math.max(1, ...curva);
  const barras = curva.map((n, i) => `<span class="cv"><i style="height:${(n / max) * 100}%"></i><b>${n}</b><small>${i === 7 ? '7+' : i}</small></span>`).join('');
  const deA = m.cartas.filter(k => CARDS[k].race === a).length;
  const sel = m.info ? CARDS[m.info] : null;
  const info = sel
    ? `<b>${sel.name}</b>${sel.type === 'unit' ? ` (${sel.atk}/${sel.hp})` : ` (${T.magia})`}: ${cardText(sel)}`
    : m.msg || T.toqueParaAdicionar;
  const cheio = m.cartas.length === DECK_SIZE;
  return `<div class="ov montar gal"><div class="panel wide">`
    + `<div class="gtop"><h2><span style="color:${RACES[a].c}">${RACES[a].g}</span> + <span style="color:${RACES[b].c}">${RACES[b].g}</span> <small>${RACES[a].n} + ${RACES[b].n}</small></h2>`
    + `<button class="btn rc" data-act="mvoltar">${T.trocarSignos}</button></div>`
    + `<div class="m-barra"><div class="m-conta${cheio ? ' cheio' : ''}"><b>${m.cartas.length}</b>/${DECK_SIZE}<small>${RACES[a].g} ${deA} · ${RACES[b].g} ${m.cartas.length - deA}</small></div>`
    + `<div class="m-curva" aria-label="${T.curvaMana}">${barras}</div>`
    + `<div class="m-bts"><button class="btn rc" data-act="mcompletar" ${cheio ? 'disabled' : ''}>${T.completar}</button>`
    + `<button class="btn rc" data-act="mlimpar" ${m.cartas.length ? '' : 'disabled'}>${T.limpar}</button>`
    + `<button class="btn go" data-act="msalvar" ${cheio ? '' : 'disabled'}>${T.salvarDeck}</button></div></div>`
    + `<p class="ginfo">${info}</p><div class="ggrid">${cards}</div></div></div>`;
}
