// Tela inicial (ilhas flutuantes com os modos de jogo) e a montagem de deck com 2 signos.
import { baseCid, card, CARDS, nivelDe } from '../data/cards';
import { ARTE, artUrl } from '../data/arte';
import type { Signo } from '../data/schema';
import { currentSign, ORDER, RACES } from '../data/signos';
import { iconeSom } from './som';
import { T } from '../data/textos';
import { cartasDisponiveis, contarCopias, DECK_SIZE, maxCopias, type DeckMontado, type Nivel } from '../engine';
import { cardHtml, zoomHtml } from './desenho';
import { moedasHtml, NOMES_R } from './colecao';
import { copiasNoNivel, copiasParaDeck, niveisQueTem, type Progresso } from '../meta/progresso';

/** Criatura de pé numa ilha (arte parada); `vira` espelha para ela olhar para a esquerda. */
export function criatura(cid: string, cls = '', vira = false): string {
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
  return [...new Set(d.signos)].map(s => `${RACES[s].g} ${RACES[s].n}`).join(' + ');
}

export function hubHtml(now: Date, deck: DeckMontado | null, prog: Progresso, alerta = false): string {
  const tem = currentSign(now);
  const avatar = deck ? deck.signos[0] : tem;
  // a ilha de montar deck usa um signo que não aparece em outra ilha nem no evento da temporada
  const ilhas: Ilha[] = [
    { act: 'campanha', nome: T.campanha, sub: T.campSub, x: 40, y: 35, w: .8, figs: criatura('capricornio25') + criatura('capricornio22', 'peq', true) },
    { act: 'torneio', nome: T.torneio, x: 67, y: 34, w: .72, breve: true, figs: criatura('sagitario25') },
    { act: 'conhecer', nome: T.conhecerDecks, sub: T.conhecerSub, x: 14, y: 47, w: .8, figs: criatura('peixes25') + criatura('gemeos25', 'peq', true) },
    { act: 'ranqueada', nome: T.ranqueada, x: 85, y: 58, w: .85, breve: true, figs: criatura('touro25') + criatura('escorpiao25', '', true) },
    { act: 'montar', nome: T.montarDeck, sub: deck ? nomeDeckMontado(deck) : T.montarSub, x: 35, y: 73, w: .92, cls: 'deck', figs: '<span class="leque"><i></i><i></i><i></i></span>' + criatura(tem === 'aquario' ? 'cancer25' : 'aquario25', 'peq frente') },
    { act: 'rapida', nome: T.partidaRapida, sub: T.rapidaSub, x: 60, y: 74, w: 1.15, cls: 'principal', figs: criatura('aries25') + criatura('leao25', '', true) },
  ];
  const r = RACES[avatar];
  return `<div class="hub" style="--rc:${r.c}">`
    + '<div class="hub-ceu"></div><div class="hub-brilho"></div>'
    + `<div class="hub-topo"><div class="hub-perfil"><div class="medal"><span>${r.g}</span></div>`
    + `<div class="hub-nome"><b>${T.invocador}</b><small>${deck ? nomeDeckMontado(deck) : T.semDeck}</small>${moedasHtml(prog)}</div></div>`
    + `<div class="hub-titulo" role="img" aria-label="${T.titulo}"></div>`
    + `<span class="hub-dir"><button class="hub-som" data-act="som" aria-label="${T.som}" title="${T.som}">${iconeSom()}</button>`
    + `<button class="hub-evento breve" data-act="evento" style="--rc:${RACES[tem].c}" aria-label="${T.eventoTemporada} (${T.emBreve})">`
    + `${criatura(tem + '25', 'mini')}<span><b>${T.eventoTemporada}</b><small>${RACES[tem].g} ${RACES[tem].n} · ${T.emBreve}</small></span></button></span></div>`
    + ilhas.map(ilhaHtml).join('')
    + `<div class="hub-base esq"><button class="hub-bt" data-act="colecao"><span>🗂️</span><b>${T.colecao}</b></button>`
    + `<button class="hub-bt" data-act="pacotes"><span>📦</span><b>${T.pacotes}</b></button></div>`
    + `<div class="hub-base"><button class="hub-bt${alerta ? ' alerta' : ''}" data-act="missoes"><span>📜</span><b>${T.missoes}</b>${alerta ? `<i class="hub-alerta" aria-label="${T.temPremio}">!</i>` : ''}</button>`
    + `<button class="hub-bt" data-act="regras"><span>📖</span><b>${T.comoJogar}</b></button>`
    + '</div>'
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

export function regrasHtml(teste: boolean): string {
  // modo teste e tutorial no alto, à vista sem precisar rolar
  return `<div class="ov"><div class="panel wide"><div class="gtop"><h2>${T.comoJogar}</h2><button class="btn rc" data-act="fechar">${T.voltar}</button></div>`
    + `<div class="acts2 regras-bts"><button class="btn rc teste${teste ? ' on' : ''}" data-act="teste" aria-pressed="${teste}">${T.modoTeste}: ${teste ? T.ligado : T.desligado}</button>`
    + (teste ? `<button class="btn rc" data-act="teste-poeira">${T.maisPoeira}</button>` : '')
    + `<button class="btn rc" data-act="rever-tut">${T.reverTutorial}</button></div>`
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
  /** Filtros da lista de cartas: nível (0 = todos), raridade e custo de mana (-1 = todos; 7 = 7 ou mais). */
  fNv?: number;
  fRar?: 'todas' | 'c' | 'r' | 'e' | 'l';
  fMana?: number;
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
      + `<span class="m-slot-sg"><i>${RACES[a].g}</i>${a === b ? '' : `<i class="b">${RACES[b].g}</i>`}</span>`
      + `<span class="m-slot-nome">${nomeDeckMontado(d)}</span>`
      + (d.nome?.trim() ? `<span class="m-slot-sub">${a === b ? RACES[a].n : `${RACES[a].n} + ${RACES[b].n}`}</span>` : '')
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

export function montarHtml(m: Montagem, decks: (DeckMontado | null)[], ativo: number, prog: Progresso): string {
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
      + `<button class="btn go" data-act="mseguir" ${m.signos.length ? '' : 'disabled'} style="width:100%">${T.escolherCartas}</button>`
      + '</div></div>';
  }
  const a = m.signos[0], b = m.signos[1] ?? m.signos[0];
  const um = a === b;
  // cada nível de uma carta é uma entrada separada (ex.: Basilisco Nv1 e Basilisco Nv2);
  // as que o jogador tem vêm primeiro, as que não tem aparecem apagadas no fim
  const qtd = contarCopias(m.cartas);
  const porBase = contarCopias(m.cartas.map(baseCid));
  const pode = (id: string) => Math.max(0, Math.min(copiasParaDeck(prog, id), maxCopias(id) - ((porBase.get(baseCid(id)) ?? 0) - (qtd.get(id) ?? 0))));
  const entradas: { id: string; tem: boolean }[] = [];
  for (const k of cartasDisponiveis(a, b)) {
    const ids = niveisQueTem(prog, k);
    if (prog.teste && !ids.includes(k)) ids.push(k);
    if (ids.length) for (const id of ids) entradas.push({ id, tem: true });
    else entradas.push({ id: k, tem: false });
  }
  entradas.sort((x, y) => (x.tem ? 0 : 1) - (y.tem ? 0 : 1) || card(x.id).cost - card(y.id).cost
    || (card(x.id).race === a ? 0 : 1) - (card(y.id).race === a ? 0 : 1) || baseCid(x.id).localeCompare(baseCid(y.id)) || nivelDe(y.id) - nivelDe(x.id));
  const fNv = m.fNv ?? 0, fRar = m.fRar ?? 'todas', fMana = m.fMana ?? -1;
  const visiveis = entradas.filter(({ id, tem }) => (!fNv || (tem && nivelDe(id) === fNv))
    && (fRar === 'todas' || card(id).r === fRar)
    && (fMana < 0 || (fMana >= 7 ? card(id).cost >= 7 : card(id).cost === fMana)));
  const filtros = `<button class="c-aba c-ciclo${fNv ? ' on' : ''}" data-act="mfnivel">${T.filtroNivel}: <b>${fNv ? `Nv${fNv}` : T.todos}</b></button>`
    + `<button class="c-aba c-ciclo${fRar !== 'todas' ? ' on' : ''}" data-act="mfrar">${T.filtroRaridade}: <b>${fRar === 'todas' ? T.todas : NOMES_R[fRar]}</b></button>`
    + `<button class="c-aba c-ciclo${fMana >= 0 ? ' on' : ''}" data-act="mfmana">${T.filtroMana}: <b>${fMana < 0 ? T.todos : fMana >= 7 ? '7+' : fMana}</b></button>`;
  const cards = visiveis.map(({ id, tem }) => {
    const n = qtd.get(id) ?? 0;
    const cls = [n ? 'no-deck' : 'fora-deck', tem ? '' : 'bloq', m.info === id ? 'sel' : ''].join(' ');
    return cardHtml(card(id), card(id).cost, `data-act="mcarta" data-k="${id}" data-n="${n}" tabindex="0" role="button" aria-label="${card(id).name} ${T.nivelN(nivelDe(id))}: ${n}"`, cls, id);
  }).join('') || `<p class="m-dica">${T.nenhumaCarta}</p>`;
  // curva de mana do deck: quantas cartas de cada custo (7+ juntas)
  const curva = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const k of m.cartas) curva[Math.min(7, card(k).cost)]++;
  const max = Math.max(1, ...curva);
  // tocar numa barra filtra a lista por esse custo (tocar de novo tira o filtro)
  const barras = curva.map((n, i) => `<button class="cv${fMana === i ? ' on' : ''}" data-act="mfmana" data-c="${i}" aria-label="${T.filtroMana} ${i === 7 ? '7+' : i}"><i style="height:${(n / max) * 100}%"></i><b>${n}</b><small>${i === 7 ? '7+' : i}</small></button>`).join('');
  const deA = m.cartas.filter(k => card(k).race === a).length;
  const cheio = m.cartas.length === DECK_SIZE;
  // painel da carta aberta: a carta grande com tudo, quantas cópias tem no deck e os botões de colocar/tirar
  let lado = `<p class="m-dica">${m.msg || T.toqueParaVer}</p>`;
  if (m.info) {
    const k = m.info, n = qtd.get(k) ?? 0, mx = pode(k);
    // quantidade e botões em cima (sempre à vista); a carta grande logo abaixo
    // tudo numa linha só (tirar · quantas no deck · colocar) para sobrar altura para a carta
    lado = `<div class="m-qtd"><button class="btn rc" data-act="mmenos" ${n ? '' : 'disabled'} aria-label="${T.tirar}">－ ${T.tirar}</button>`
      + `<p class="m-copias" title="${RAR_NOME[card(k).r]}"><small>${T.noDeck}</small><span><b>${n}</b>/${mx}</span></p>`
      + `<button class="btn go" data-act="mmais" ${n < mx && !cheio ? '' : 'disabled'} aria-label="${T.colocar}">＋ ${T.colocar}</button></div>`
      + `<p class="m-dica m-tem">${m.msg || T.semCopiasNivel(prog.teste && nivelDe(k) === 1 ? maxCopias(k) : copiasNoNivel(prog, k), nivelDe(k))}</p>`
      + `<div class="m-detalhe">${zoomHtml({ cid: k, lado: 'p' })}</div>`;
  }
  return `<div class="ov montar gal"><div class="panel wide"><div class="m-fixo">`
    + `<div class="gtop"><div class="m-titulo"><span class="m-sg"><i style="--rc:${RACES[a].c}">${RACES[a].g}</i>${um ? '' : `<i style="--rc:${RACES[b].c}">${RACES[b].g}</i>`}</span>`
    + `<label class="m-nome"><small>${T.deckN(m.espaco + 1)} · ${T.nomeDoDeck}</small>`
    + `<input id="m-nome" type="text" maxlength="22" autocomplete="off" spellcheck="false" value="${esc(m.nome)}" placeholder="${um ? RACES[a].n : `${RACES[a].n} + ${RACES[b].n}`}"></label></div>`
    + `<span class="m-topo-bts"><button class="btn rc" data-act="mvoltar">${T.trocarSignos}</button>${fechaHtml()}</span></div>`
    + `<div class="m-barra"><div class="m-conta${cheio ? ' cheio' : ''}"><b>${m.cartas.length}</b>/${DECK_SIZE}<small>${um ? T.umSigno : `${RACES[a].g} ${deA} · ${RACES[b].g} ${m.cartas.length - deA}`}</small></div>`
    + `<div class="m-curva" aria-label="${T.curvaMana}">${barras}</div>`
    + `<div class="m-bts"><button class="btn rc" data-act="mcompletar" ${cheio ? 'disabled' : ''}>${T.completar}</button>`
    + `<button class="btn rc" data-act="mlimpar" ${m.cartas.length ? '' : 'disabled'}>${T.limpar}</button>`
    + `<button class="btn go" data-act="msalvar" ${cheio ? '' : 'disabled'}>${T.salvarDeck}</button></div></div></div>`
    + `<div class="m-corpo"><div class="m-lado">${lado}</div><div class="m-dir"><div class="c-abas c-filtros m-filtros">${filtros}</div><div class="ggrid">${cards}</div></div></div></div></div>`;
}
