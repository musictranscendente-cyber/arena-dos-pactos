// Funções que montam o HTML de cada parte da tela (sem estado próprio).
import { card, cardsOfSign, CARDS } from '../data/cards';
import { ANIM, animUrl, ARTE, artUrl, type Tira } from '../data/arte';
import { RARITY } from '../data/raridades';
import type { Card, Signo } from '../data/schema';
import { currentSign, ORDER, RACES } from '../data/signos';
import { cardText, KW, T } from '../data/textos';
import { pronta } from './precarga';
import { isRanged } from './projetil';
import { costOf, effAtk, isValidTarget, type GameState, type Side, type Target } from '../engine';

export interface View {
  s: GameState;
  sel: number | null;
  /** Jogador pode agir (planejamento, sem animação rodando). */
  canAct: boolean;
  msg: string;
  active: Target[] | null;
  striking: Target[] | null;
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
    + `<img src="${src}" alt=""></span>`;
}

function figHtml(c: Card, cid: string, cell: { atk: boolean; strike: boolean }, uid: number): string {
  const an = ANIM[cid];
  if (an) {
    const base = an.idle.h;
    const sz = `--s:${an.s ?? 1}`;
    const urlAtk = animUrl(cid, c.race, 'ataque');
    // só troca para o golpe se a imagem dele já carregou; senão continua respirando
    if ((!cell.atk && !cell.strike) || !pronta(urlAtk)) {
      const ph = ((Date.now() / 1000 + uid * 0.77) % 3).toFixed(2);
      return `<span class="fig has-anim" style="${sz}">${tiraHtml(animUrl(cid, c.race, 'idle'), an.idle, base, `--pa:-${ph}s`, 'idle')}</span>`;
    }
    // o ataque continua do ponto certo quando a tela é redesenhada no quadro do golpe
    const delay = cell.strike ? -ATK_MS.start : 0;
    return `<span class="fig has-anim" style="${sz}">${tiraHtml(urlAtk, an.ataque, base, `--pa:${delay}ms`, 'ataque')}</span>`;
  }
  const ar = ARTE[cid];
  if (!ar) return `<span class="fig" style="${idlePhase(uid)}">${artOrEmoji(c)}</span>`;
  // a pose parada define o lugar da figura; a de ataque (mais larga, o golpe vai para a frente)
  // fica por cima, deslocada para o corpo não sair do lugar
  const podeGolpear = pronta(artUrl(cid, c.race, 'ataque'));
  if (!podeGolpear) cell = { atk: false, strike: false };
  const mode = cell.strike ? 'gone' : cell.atk ? 'wind' : '';
  let h = `<img class="art parado ${mode}" src="${artUrl(cid, c.race, 'parado')}" style="--rw:${ar[0]};${idlePhase(uid)}" alt="">`;
  if (cell.atk || cell.strike) {
    h += `<img class="art ataque ${cell.strike ? '' : 'late'}" src="${artUrl(cid, c.race, 'ataque')}" style="--rw:${ar[1]};--dx:${(ar[1] - ar[0]) / 2}" alt="">`;
  }
  return `<span class="fig has-art" style="${idlePhase(uid)};--s:${ar[2] ?? 1}">${h}</span>`;
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
      return q.tg.side === side && q.tg.l === l && ((c.type === 'spell' && c.sp === 'lane') || q.tg.d === d);
    })
    .map(q => card(q.cid).e).join('');
  let inner = '';
  if (u) {
    const c = card(u.cid);
    const atk = effAtk(s[side].board, l, u);
    inner = `<div class="unit ${side === 'e' ? 'foe' : ''} r-${c.r}" style="--rc:${RACES[c.race].c}">`
      + '<span class="aura"></span>'
      + (u.pending ? '<span class="pnd">⏳</span>' : '')
      + figHtml(c, u.cid, pose, u.uid)
      + `<span class="kws">${u.kw.filter(k => k !== 'escudo').map(k => KW[k].i).join('')}${u.poison ? '🤢' : ''}</span>`
      + (u.shield ? '<span class="shd">🛡️</span>' : '')
      + `<b class="a${atk > u.atk ? ' up' : ''}">${atk}</b><b class="h">${u.hp}</b></div>`;
  }
  const col = side === 'p' ? 3 - d : 5 + d;
  return `<div class="${cls.join(' ')}" style="grid-row:${l + 1};grid-column:${col};z-index:${l + 1}" id="c-${side}-${l}-${d}" data-act="cell" data-side="${side}" data-l="${l}" data-d="${d}">${inner}${pend ? `<span class="spell-mark">${pend}</span>` : ''}</div>`;
}

function boardHtml(v: View): string {
  const { s } = v;
  const pr = RACES[s.p.sign], er = RACES[s.e.sign];
  let h = `<div class="board" style="--prc:${pr.c};--erc:${er.c}"><div class="plat mine" data-g="${pr.g}\uFE0E" style="--rc:${pr.c}"></div>`
    + `<div class="chasm"></div><div class="plat theirs" data-g="${er.g}\uFE0E" style="--rc:${er.c}"></div>`;
  for (let l = 0; l < 3; l++) {
    for (let d = 0; d < 3; d++) h += cellHtml(v, 'p', l, d) + cellHtml(v, 'e', l, d);
  }
  return h + '</div>';
}

function heroCard(s: GameState, side: Side): string {
  const H = s[side], r = RACES[H.sign];
  const hp = Math.max(0, H.hp);
  const pct = Math.min(100, (hp / HEART_MAX) * 100);
  const name = side === 'p' ? T.voce : T.rivalDe(r.n);
  const sub = side === 'p' ? T.deck(H.deck.length) : T.maoDeck(H.hand.length, H.deck.length);
  const extra = side === 'e' ? `<span class="gem" title="Mana">${H.max}</span>` : '';
  return `<div class="hcard ${side === 'p' ? 'mine' : 'theirs'}" style="--rc:${r.c}">`
    + `<div class="medal"><span>${r.g}</span></div>`
    + `<div class="hinfo"><div class="hname">${name}</div><div class="hpbar${pct <= 30 ? ' low' : ''}"><i style="width:${pct}%"></i></div><div class="hsub">${sub}${extra}</div></div>`
    + `<div class="heart" id="hero-${side}">${hp}</div></div>`;
}

function hudHtml(s: GameState): string {
  return `<div class="hud">${heroCard(s, 'p')}`
    + `<div class="vs"><button class="rotbtn" data-act="rot" aria-label="${T.alternarDeitado}">⟳</button><span class="vsb">VS</span><span class="rd">${T.rodadaN(s.round)}</span></div>`
    + `${heroCard(s, 'e')}</div>`;
}

function manaHtml(v: View): string {
  const P = v.s.p, n = Math.max(P.max, P.mana);
  let pips = '';
  for (let i = 0; i < n; i++) pips += `<i class="${i < P.mana ? (i >= P.max ? 'bonus' : 'on') : ''}"></i>`;
  return `<div class="manaorb" aria-label="Mana ${P.mana}/${P.max}"><div class="orbc"><b>${P.mana}</b><small>/${P.max}</small></div><span class="pips">${pips}</span></div>`;
}

function actsHtml(v: View): string {
  const P = v.s.p;
  return `<div class="acts"><button class="btn rc" data-act="recharge" ${v.canAct && v.sel !== null && !P.recharged ? '' : 'disabled'}>${T.queimar}</button>`
    + `<button class="btn go" data-act="punch" ${v.canAct ? '' : 'disabled'}><span class="ico">⚔️</span>${T.batalha}</button></div>`;
}

export function cardHtml(c: Card, cost: number, attrs = '', cls = '', cid?: string): string {
  const body = c.type === 'unit'
    ? `<span class="ck">${c.kw.map(k => KW[k].i).join('')}${c.on ? '⭐' : ''}</span><span class="st"><b class="a">${c.atk}</b><b class="h">${c.hp}</b></span>`
    : `<span class="sp">${cardText(c)}</span>`;
  return `<div class="card ${c.type === 'spell' ? 'spell' : ''} r-${c.r} ${cls}" style="--rc:${RACES[c.race].c};--rr:${RARITY[c.r].col}" ${attrs}><span class="cost">${cost}</span>`
    + `<span class="cart">${artOrEmoji(c, cid)}<span class="sg">${RACES[c.race].g}</span></span><span class="cn">${c.name}</span>${body}</div>`;
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

export function gameHtml(v: View): string {
  return hudHtml(v.s)
    + `<div class="table">${boardHtml(v)}<div class="mid" aria-live="polite">${v.msg}</div></div>`
    + `<div class="bottom">${manaHtml(v)}${handHtml(v)}${actsHtml(v)}</div>`;
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
    <h1>${T.titulo}</h1>
    <p>${T.escolhaSigno}</p>
    <div class="signs">${signs}</div>
    <button class="btn rc" data-act="gal" data-r="${cur}" style="width:100%;margin-bottom:6px">${T.verCartas}</button>
    <details><summary>${T.comoJogar}</summary>
    <ul>${T.regras.map(x => `<li>${x}</li>`).join('')}</ul>
    <div class="legend">${legend}</div>
    </details>
  </div></div>`;
}

export function endHtml(s: GameState): string {
  const t = s.result === 'p' ? T.vitoria : s.result === 'draw' ? T.empate : T.derrota;
  const p = s.result === 'p' ? T.venceu(RACES[s.p.sign].n, RACES[s.e.sign].n)
    : s.result === 'draw' ? T.caíramJuntos : T.rivalVenceu(RACES[s.e.sign].n);
  return `<div class="ov"><div class="panel"><h2>${t}</h2><p>${p}</p><p>${T.rodadasJogadas(s.round)}</p>`
    + `<div class="acts2"><button class="btn go" data-act="again">${T.revanche}</button><button class="btn rc" data-act="menu">${T.trocarSigno}</button></div></div></div>`;
}
