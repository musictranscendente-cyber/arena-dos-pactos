// Funções que montam o HTML de cada parte da tela (sem estado próprio).
import { card, cardsOfSign, CARDS } from '../data/cards';
import { ANIM, animUrl, ARTE, artUrl, CENTRO, escalaCampo, porte, type Tira } from '../data/arte';
import { RARITY } from '../data/raridades';
import type { Card, Signo } from '../data/schema';
import { currentSign, ELEMENTO, ORDER, RACES } from '../data/signos';
import { cardText, KW, T } from '../data/textos';
import { pronta } from './precarga';
import { isRanged } from './projetil';
import { iconeSom } from './som';
import { costOf, effAtk, isValidTarget, type GameState, type Side, type Target } from '../engine';

export interface View {
  s: GameState;
  sel: number | null;
  /** Jogador pode agir (planejamento, sem animação rodando). */
  canAct: boolean;
  msg: string;
  active: Target[] | null;
  striking: Target[] | null;
  /** Há jogadas nesta rodada que podem ser desfeitas. */
  canUndo?: boolean;
  /** Botão Queimar ativo (carta selecionada, ou uma única magia preparada). */
  canBurn?: boolean;
  /** Carta aberta grande no meio de uma das metades da arena, para ler os detalhes. */
  zoom?: Zoom | null;
  /** Magias sem alvo já preparadas (k = posição na lista de jogadas, para devolver à mão). */
  preparadas?: { cid: string; k: number }[];
  /** Mostrar a mensagem de ajuda (só quando o jogador toca no ícone de informação). */
  info?: boolean;
  /** Dificuldade do bot (Partida Rápida), mostrada embaixo do nome do rival. */
  nivel?: string;
  /** Fim de partida: o lado de quem perdeu afunda, treme e racha ('anim'); depois fica parado assim ('fixo'). */
  fim?: 'anim' | 'fixo' | null;
  /** Perguntando se o jogador quer mesmo desistir. */
  confirmaDesistir?: boolean;
}

export interface Zoom {
  cid: string;
  /** Lado da arena onde a carta aparece (o outro fica livre para tocar). */
  lado: Side;
  cost?: number;
  atk?: number;
  hp?: number;
}

/** Carta grande com a descrição completa: nome, arte, raridade, atributos e cada habilidade explicada. */
/** Número acima do original da carta fica verde; abaixo, vermelho. */
function compara(atual: number, original: number): string {
  return atual > original ? ' up' : atual < original ? ' down' : '';
}

export function zoomHtml(z: Zoom): string {
  const c = card(z.cid);
  const r = RACES[c.race];
  const img = ARTE[z.cid]
    ? `<img src="${artUrl(z.cid, c.race, 'parado')}" alt="">`
    : c.art ? `<img src="${c.art}" alt="">` : `<span class="z-emo">${c.e}</span>`;
  let corpo: string;
  if (c.type === 'unit') {
    const habs = c.kw.map(k => `<li><b>${KW[k].i} ${KW[k].n}</b> ${KW[k].d}</li>`);
    if (c.on) habs.push(`<li><b>⭐ ${T.aoEntrar}</b> ${cardText({ ...c, kw: [] })}</li>`);
    corpo = `<div class="z-st"><span class="z-a"><b class="a${compara(z.atk ?? c.atk, c.atk)}">${z.atk ?? c.atk}</b> ${T.ataque}</span><span class="z-h"><b class="h${compara(z.hp ?? c.hp, c.hp)}">${z.hp ?? c.hp}</b> ${T.vida}</span></div>`
      + `<ul class="z-hab">${habs.length ? habs.join('') : `<li>${T.semHabilidade}</li>`}</ul>`;
  } else {
    corpo = `<p class="z-magia"><b>✨ ${T.magia}</b> ${cardText(c)}</p>`;
  }
  return `<div class="zoom lado-${z.lado} r-${c.r}" style="--rc:${r.c};--rr:${RARITY[c.r].col}" aria-live="polite">`
    + `<div class="z-topo"><span class="cost">${z.cost ?? c.cost}</span><span class="z-nome">${c.name}</span></div>`
    + elemHtml(c)
    + `<div class="z-arte">${img}<span class="z-sg">${r.g}</span></div>`
    + `<div class="z-rar">${gemaHtml(c)}${RARITY[c.r].n} · ${ELEMENTO[r.el].i} ${r.el}</div>${corpo}</div>`;
}

function artOrEmoji(c: Card, cid?: string): string {
  if (cid && ARTE[cid]) return `<img class="art" src="${artUrl(cid, c.race, 'parado')}" alt="">`;
  return c.art ? `<img class="art" src="${c.art}" alt="">` : `<span class="emo">${c.e}</span>`;
}

/** Figura da criatura no campo: arte com pose parada/ataque, ou o emoji enquanto não houver arte. */
/** Fase da animação parada, contínua entre redesenhos (cada criatura numa fase diferente). */
const IDLE_S = 3.6;
const BOB_S = 2.3;
function idlePhase(uid: number): string {
  const t = Date.now() / 1000;
  return `--ph:-${((t + uid * 0.77) % IDLE_S).toFixed(2)}s;--pb:-${((t + uid * 0.41) % BOB_S).toFixed(2)}s`;
}

/** Duração do ataque animado: os dois quadros da Batalha (avanço + golpe), ver PAUSE em app.ts. */
export const ATK_MS = { start: 900, strike: 900 };

function tiraHtml(src: string, t: Tira, base: number, extra: string, cls: string): string {
  return `<span class="spr ${cls}" style="--n:${t.n};--fw:${t.w / base};--fh:${t.h / base};--ax:${t.ax};--by:${t.by};${extra}">`
    + `<img src="${src}" decoding="sync" alt=""></span>`;
}

/** Fator de tamanho (--s) da figura no campo, para cartas com arte; null = emoji. */
function escalaFig(c: Card, cid: string): number | null {
  const an = ANIM[cid], ar = ARTE[cid];
  if (an) return escalaCampo((an.s ?? 1) * porte(cid, c.cost, c.r));
  if (ar) return escalaCampo((ar[2] ?? 1) * porte(cid, c.cost, c.r));
  return null;
}

function figHtml(c: Card, cid: string, cell: { atk: boolean; strike: boolean }, uid: number): string {
  const an = ANIM[cid];
  if (an) {
    const base = an.idle.h;
    // centro visível do desenho no meio da casa (na horizontal); os pés ficam logo acima dos números
    const ox = CENTRO[cid]?.[0] ?? 0;
    const sz = `--s:${escalaFig(c, cid)};--ox:${ox}`;
    const urlAtk = animUrl(cid, c.race, 'ataque');
    // só troca para o golpe se a imagem dele já carregou; senão continua respirando
    if ((!cell.atk && !cell.strike) || !pronta(urlAtk)) {
      const ph = ((Date.now() / 1000 + uid * 0.77) % 3).toFixed(2);
      // a tira do golpe já fica na página, invisível: assim o navegador deixa ela pronta e a troca não pisca
      const espera = pronta(urlAtk) ? tiraHtml(urlAtk, an.ataque, base, '', 'ataque espera') : '';
      return `<span class="fig has-anim" style="${sz}">${tiraHtml(animUrl(cid, c.race, 'idle'), an.idle, base, `--pa:-${ph}s`, 'idle')}${espera}</span>`;
    }
    // o ataque continua do ponto certo quando a tela é redesenhada no quadro do golpe
    const delay = cell.strike ? -ATK_MS.start : 0;
    return `<span class="fig has-anim" style="${sz}">${tiraHtml(urlAtk, an.ataque, base, `--pa:${delay}ms`, 'ataque')}</span>`;
  }
  const ar = ARTE[cid];
  if (!ar) return `<span class="fig" style="${idlePhase(uid)};--s:${porte(cid, c.cost, c.r)}">${artOrEmoji(c)}</span>`;
  // a pose parada define o lugar da figura; a de ataque (mais larga, o golpe vai para a frente)
  // fica por cima, deslocada para o corpo não sair do lugar
  const podeGolpear = pronta(artUrl(cid, c.race, 'ataque'));
  if (!podeGolpear) cell = { atk: false, strike: false };
  const mode = cell.strike ? 'gone' : cell.atk ? 'wind' : '';
  let h = `<img class="art parado ${mode}" decoding="sync" src="${artUrl(cid, c.race, 'parado')}" style="--rw:${ar[0]};${idlePhase(uid)}" alt="">`;
  if (cell.atk || cell.strike) {
    h += `<img class="art ataque ${cell.strike ? '' : 'late'}" decoding="sync" src="${artUrl(cid, c.race, 'ataque')}" style="--rw:${ar[1]};--dx:${(ar[1] - ar[0]) / 2}" alt="">`;
  }
  return `<span class="fig has-art" style="${idlePhase(uid)};--s:${escalaFig(c, cid)}">${h}</span>`;
}

const HEART_MAX = 30;

function cellHtml(v: View, side: Side, l: number, d: number): string {
  const { s } = v;
  const raw = s[side].board[l][d];
  const u = raw && !(side === 'e' && raw.hidden) ? raw : null; // invocação secreta do rival não aparece
  const cls = ['cell', side === 'p' ? 'mine' : 'theirs'];
  if (d === 0) cls.push('front');
  if (v.canAct && v.sel !== null && isValidTarget(s, 'p', v.sel, { side, l, d })) cls.push('ok');
  const here = (ts: Target[] | null) => !!ts?.some(x => x.side === side && x.l === l && x.d === d);
  const pose = { atk: here(v.active), strike: here(v.striking) };
  if (pose.atk) cls.push('atk');
  if ((pose.atk || pose.strike) && u && isRanged(u.cid)) cls.push('ranged');
  if ((pose.atk || pose.strike) && u && ANIM[u.cid]) cls.push('animated');
  if (pose.strike) cls.push('strike');
  // Ícone das magias que o jogador já preparou neste alvo (magia de fileira marca a fileira toda).
  const pend = s.p.queue
    .filter(q => {
      const c = card(q.cid);
      if (c.type === 'spell' && ['heal', 'draw', 'face'].includes(c.sp)) return false; // ficam no canto (preparadas)
      return q.tg.side === side && q.tg.l === l && ((c.type === 'spell' && c.sp === 'lane') || q.tg.d === d);
    })
    .map(q => card(q.cid).e).join('');
  let inner = '';
  if (u) {
    const c = card(u.cid);
    const atk = effAtk(s[side].board, l, u);
    const esc = escalaFig(c, u.cid);
    // habilidades e estados em fichas pequenas no canto de cima da casa, longe dos pés da criatura
    const fichas = [
      ...(u.shield ? ['<i class="f-escudo" title="Escudo">🛡️</i>'] : []),
      ...u.kw.filter(k => k !== 'escudo').map(k => `<i title="${KW[k].n}">${KW[k].i}</i>`),
      ...(c.type === 'unit' && c.on ? ['<i title="Efeito de chegada">⭐</i>'] : []),
      ...(u.poison ? ['<i class="f-veneno" title="Envenenada">🤢</i>'] : []),
    ];
    inner = `<div class="unit ${side === 'e' ? 'foe' : ''} r-${c.r}${esc ? ' com-arte' : ''}" style="--rc:${RACES[c.race].c}${esc ? `;--s:${esc}` : ''}">`
      + '<span class="aura"></span>'
      + (u.pending ? '<span class="pnd">⏳</span>' : '')
      + figHtml(c, u.cid, pose, u.uid)
      + (fichas.length ? `<span class="kws">${fichas.join('')}</span>` : '')
      + `<b class="a${compara(atk, c.type === 'unit' ? c.atk : atk)}">${atk}</b><b class="h${compara(u.hp, c.type === 'unit' ? c.hp : u.hp)}">${u.hp}</b></div>`;
  }
  const col = side === 'p' ? 3 - d : 5 + d;
  return `<div class="${cls.join(' ')}" style="grid-row:${l + 1};grid-column:${col};--z:${l + 1}" id="c-${side}-${l}-${d}" data-act="cell" data-side="${side}" data-l="${l}" data-d="${d}">${inner}${pend ? `<span class="spell-mark">${pend}</span>` : ''}</div>`;
}

function boardHtml(v: View): string {
  const { s } = v;
  const pr = RACES[s.p.sign], er = RACES[s.e.sign];
  // quem perdeu: o lado dele desce, treme e racha (empate: os dois)
  const caiu = (side: Side) => s.phase === 'over' && v.fim && (s.result === 'draw' || (s.result !== null && s.result !== side));
  const fim = (['p', 'e'] as const).filter(caiu).map(x => ` desaba-${x}`).join('') + (v.fim === 'fixo' ? ' desabado' : '');
  let h = `<div class="board${fim}" style="--prc:${pr.c};--erc:${er.c}"><div class="plat mine" data-g="${pr.g}\uFE0E" style="--rc:${pr.c}"><i class="racha"></i></div>`
    + `<div class="chasm"></div><div class="plat theirs" data-g="${er.g}\uFE0E" style="--rc:${er.c}"><i class="racha"></i></div>`;
  for (let l = 0; l < 3; l++) {
    for (let d = 0; d < 3; d++) h += cellHtml(v, 'p', l, d) + cellHtml(v, 'e', l, d);
  }
  return h + '</div>';
}

/** Nome dos signos de um lado: "Áries" ou, com deck montado, "Áries + Leão". */
export function nomeLado(H: GameState['p']): string {
  return H.sign2 ? `${RACES[H.sign].n} + ${RACES[H.sign2].n}` : RACES[H.sign].n;
}

function heroCard(s: GameState, side: Side, nivel?: string): string {
  const H = s[side], r = RACES[H.sign];
  const hp = Math.max(0, H.hp);
  const pct = Math.min(100, (hp / HEART_MAX) * 100);
  const name = side === 'p' ? T.voce : T.rivalDe(nomeLado(H));
  const sub = T.deck(H.deck.length) + (side === 'e' && nivel ? ` · <b class="nv-tag">${nivel}</b>` : '');
  const extra = side === 'e' ? `<span class="gem" title="Mana">${H.max}</span>` : '';
  return `<div class="hcard ${side === 'p' ? 'mine' : 'theirs'}" style="--rc:${r.c}">`
    + `<div class="medal"><span>${r.g}</span>${H.sign2 ? `<i class="medal2" style="--rc2:${RACES[H.sign2].c}">${RACES[H.sign2].g}</i>` : ''}</div>`
    + (side === 'e' ? `<span class="maorival" title="${T.cartasNaMao(H.hand.length)}" aria-label="${T.cartasNaMao(H.hand.length)}"><i class="verso"></i><i class="verso"></i><b>${H.hand.length}</b></span>` : '')
    + (side === 'p' && s.phase !== 'over' ? `<button class="flagbtn" data-act="desistir" aria-label="${T.desistir}" title="${T.desistir}">${BANDEIRA}<span>${T.desistirCurto}</span></button>` : '')
    + `<div class="hinfo"><div class="hname">${name}</div><div class="hpbar${pct <= 30 ? ' low' : ''}"><i style="width:${pct}%"></i></div><div class="hsub">${sub}${extra}</div></div>`
    + `<div class="heart" id="hero-${side}">${hp}</div></div>`;
}

/** Bandeira branca (desistir): mastro dourado e pano que tremula. */
const BANDEIRA = '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.2" y="1.5" width="1.8" height="17" rx=".9" fill="#e9c77a" stroke="#4a2c0a" stroke-width=".6"/>'
  + '<circle cx="3.1" cy="1.6" r="1.4" fill="#ffe08a" stroke="#4a2c0a" stroke-width=".5"/>'
  + '<path class="pano" d="M4 3.2 C8 1.6 11 5 17.5 3.4 L17.5 11.4 C11 13 8 9.6 4 11.2 Z" fill="#fff" stroke="#2a1d3d" stroke-width=".8" stroke-linejoin="round"/></svg>';

function hudHtml(s: GameState, nivel?: string): string {
  return `<div class="hud">${heroCard(s, 'p')}`
    + `<div class="vs"><span class="vs-bts"><button class="rotbtn" data-act="rot" aria-label="${T.alternarDeitado}">⟳</button><button class="rotbtn" data-act="som" aria-label="${T.som}" title="${T.som}">${iconeSom()}</button></span><span class="vsb">VS</span><span class="rd">${T.rodadaN(s.round)}<button class="infobtn" data-act="info" aria-label="${T.info}">i</button></span></div>`
    + `${heroCard(s, 'e', nivel)}</div>`;
}

function manaHtml(v: View): string {
  const P = v.s.p, n = Math.max(P.max, P.mana);
  let pips = '';
  for (let i = 0; i < n; i++) pips += `<i class="${i < P.mana ? (i >= P.max ? 'bonus' : 'on') : ''}"></i>`;
  return `<div class="manaorb" aria-label="Mana ${P.mana}/${P.max}"><div class="orbc"><b>${P.mana}</b><small>/${P.max}</small></div><span class="pips">${pips}</span></div>`;
}

function actsHtml(v: View): string {
  return `<div class="acts"><button class="btn go" data-act="punch" ${v.canAct ? '' : 'disabled'}><span class="ico">⚔️</span>${T.batalha}</button></div>`;
}

/** Voltar e queimar: logo à direita da mana. */
function actsEsqHtml(v: View): string {
  return `<div class="acts-esq"><button class="btn rc" data-act="recharge" ${v.canBurn ? '' : 'disabled'}>${T.queimar}</button>`
    + `<button class="btn un" data-act="undo" ${v.canUndo ? '' : 'disabled'} title="${T.desfazer}">↩</button></div>`;
}

export function cardHtml(c: Card, cost: number, attrs = '', cls = '', cid?: string): string {
  const body = c.type === 'unit'
    ? `<span class="ck">${c.kw.map(k => KW[k].i).join('')}${c.on ? '⭐' : ''}</span><span class="st"><b class="a">${c.atk}</b><b class="h">${c.hp}</b></span>`
    : `<span class="sp">${cardText(c)}</span>`;
  return `<div class="card ${c.type === 'spell' ? 'spell' : ''} r-${c.r} ${cls}" style="--rc:${RACES[c.race].c};--rr:${RARITY[c.r].col}" ${attrs}><span class="cost">${cost}</span>`
    + elemHtml(c)
    + `<span class="cart">${artOrEmoji(c, cid)}<span class="sg">${RACES[c.race].g}</span></span>${gemaHtml(c)}<span class="cn">${c.name}</span>${body}</div>`;
}

/** Medalhão do elemento no canto de cima da carta. */
function elemHtml(c: Card): string {
  const el = RACES[c.race].el, E = ELEMENTO[el];
  return `<span class="elem el-${E.k}" title="${T.elemento}: ${el}" aria-label="${T.elemento}: ${el}">${E.i}</span>`;
}

/** Gema da raridade, entre a arte e o nome (cinza, azul, roxa, dourada). */
function gemaHtml(c: Card): string {
  return `<span class="gema" title="${RARITY[c.r].n}" aria-label="${RARITY[c.r].n}"><i></i></span>`;
}

function handHtml(v: View): string {
  const P = v.s.p;
  if (!P.hand.length) return `<div class="hand"><div class="empty">${T.semCartas}</div></div>`;
  return '<div class="hand">' + P.hand.map((h, i) => {
    const c = card(h.cid), cost = costOf(P, h.cid);
    const cls: string[] = [];
    if (v.sel === i) cls.push('sel');
    if (cost > P.mana) cls.push('poor');
    return cardHtml(c, cost, `data-act="hand" data-i="${i}" tabindex="0" role="button"`, cls.join(' '), h.cid);
  }).join('') + '</div>';
}

/** Magias sem alvo preparadas: cartinhas paradas no canto do seu lado, até a Batalha (tocar devolve à mão). */
function preparadasHtml(v: View): string {
  if (!v.preparadas?.length) return '';
  return `<div class="preparadas">${v.preparadas.map(({ cid, k }) => {
    const c = card(cid);
    return `<button class="prep" data-act="desprep" data-k="${k}" title="${T.tocarParaVoltar}" style="--rc:${RACES[c.race].c}">`
      + `<span class="prep-e">${artOrEmoji(c, cid)}</span><span class="prep-n">${c.name}</span></button>`;
  }).join('')}</div>`;
}

export function gameHtml(v: View): string {
  return hudHtml(v.s, v.nivel)
    + `<div class="table">${boardHtml(v)}<div class="mid${v.info ? ' aberta' : ''}" aria-live="polite">${v.msg}</div>${preparadasHtml(v)}</div>`
    + `<div class="bottom">${manaHtml(v)}${actsEsqHtml(v)}${handHtml(v)}${actsHtml(v)}</div>`
    + (v.zoom ? zoomHtml(v.zoom) : '');
}

export function galleryHtml(sign: Signo, selected: string | null): string {
  const r = RACES[sign];
  const tabs = ORDER.map(k => `<button class="gtab ${k === sign ? 'on' : ''}" data-act="gal" data-r="${k}" style="--rc:${RACES[k].c}" aria-label="${RACES[k].n}">${RACES[k].g}</button>`).join('');
  const list = cardsOfSign(sign).sort((a, b) => CARDS[a].cost - CARDS[b].cost || (CARDS[a].type > CARDS[b].type ? 1 : -1));
  const cards = list.map(k => cardHtml(CARDS[k], CARDS[k].cost, `data-act="gcard" data-k="${k}" tabindex="0" role="button"`, selected === k ? 'sel' : '', k)).join('');
  const sel = selected ? CARDS[selected] : null;
  const info = sel
    ? `<b>${sel.name}</b> (${RARITY[sel.r].n}${sel.type === 'unit' ? `, ${sel.atk}/${sel.hp}` : `, ${T.magia}`}): ${cardText(sel)}`
    : T.toqueCartaGaleria;
  return `<div class="ov gal"><div class="panel wide">
    <div class="gtop"><h2 style="color:${r.c}">${r.g} ${r.n}</h2><button class="btn rc" data-act="galback">${T.voltar}</button></div>
    <div class="gtabs">${tabs}</div>
    <p class="ginfo">${info}</p>
    <div class="ggrid">${cards}</div>
  </div></div>`;
}

export function startHtml(now: Date): string {
  const cur = currentSign(now);
  const signs = ORDER.map(k => {
    const r = RACES[k];
    return `<button class="sign" data-act="pick" data-r="${k}" style="--rc:${r.c}">${k === cur ? `<span class="tag">${T.temporada}</span>` : ''}`
      + `<span class="g"><span>${r.g}</span></span><span class="sn">${r.n}</span><span class="sm">${r.el}, ${r.m}</span></button>`;
  }).join('');
  const legend = Object.values(KW).map(k => `<span>${k.i}</span><span>${k.n}: ${k.d}</span>`).join('') + `<span>⭐</span><span>${T.efeitoChegada}</span>`;
  return `<div class="ov"><div class="panel wide">
    <div class="gtop"><h2>${T.conhecerDecks}</h2><button class="btn rc" data-act="hub">${T.voltar}</button></div>
    <p>${T.escolhaSigno}</p>
    <div class="signs">${signs}</div>
    <button class="btn rc" data-act="gal" data-r="${cur}" style="width:100%;margin-bottom:6px">${T.verCartas}</button>
    <details><summary>${T.comoJogar}</summary>
    <ul>${T.regras.map(x => `<li>${x}</li>`).join('')}</ul>
    <div class="legend">${legend}</div>
    </details>
  </div></div>`;
}

/** Pergunta antes de desistir, para não sair da batalha por um toque sem querer. */
export function desistirHtml(): string {
  return `<div class="ov"><div class="panel"><h2>${T.desistirPergunta}</h2><p>${T.desistirAviso}</p>`
    + `<div class="acts2"><button class="btn rc desiste" data-act="desistir-sim">${BANDEIRA}${T.desistirCurto}</button><button class="btn go" data-act="desistir-nao">${T.desistirNao}</button></div></div></div>`;
}

export function endHtml(s: GameState): string {
  const t = s.result === 'p' ? T.vitoria : s.result === 'draw' ? T.empate : T.derrota;
  const p = s.surrendered === 'p' ? T.voceDesistiu : s.surrendered === 'e' ? T.rivalDesistiu
    : s.result === 'p' ? T.venceu(nomeLado(s.p), nomeLado(s.e))
    : s.result === 'draw' ? T.caíramJuntos : T.rivalVenceu(nomeLado(s.e));
  return `<div class="ov"><div class="panel"><h2>${t}</h2><p>${p}</p><p>${T.rodadasJogadas(s.round)}</p>`
    + `<div class="acts2"><button class="btn go" data-act="again">${T.revanche}</button><button class="btn rc" data-act="menu">${T.menuPrincipal}</button></div></div></div>`;
}
