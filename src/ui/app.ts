// Controla as telas e a partida contra a IA. Toda regra vem do motor; aqui só desenha e anima.
import { card } from '../data/cards';
import type { Signo } from '../data/schema';
import { ORDER } from '../data/signos';
import { cardText, T } from '../data/textos';
import {
  applyAction, costOf, effAtk, newGame, planTurn, resolveBattle, Rng,
  type Action, type Frame, type GameEvent, type GameState, type Side, type Target,
} from '../engine';
import { ATK_MS, endHtml, galleryHtml, gameHtml, startHtml, type View } from './desenho';
import { toggleRot, tryLandscape } from './orientacao';
import { launch, shotsOf } from './projetil';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms: number) => new Promise(r => setTimeout(r, reduce ? ms * 0.4 : ms));
const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

/** Pausa depois de cada tipo de quadro da Batalha (mesmos tempos do protótipo). */
const PAUSE: Record<Frame['kind'], number> = {
  tick: 0, reveal: 450, spells: 450, spell: 650, arrival: 550, battle: 450, row: 0, 'step-start': ATK_MS.start, step: ATK_MS.strike, end: 700,
};

interface Match {
  /** Estado verdadeiro do motor. */
  g: GameState;
  /** Estado desenhado (durante a animação é a foto do quadro atual). */
  shown: GameState;
  sel: number | null;
  busy: boolean;
  msg: string;
  active: Target[] | null;
  /** Quem acabou de atacar: fica na pose de golpe enquanto o dano aparece, depois recua. */
  striking: Target[] | null;
  aiRng: Rng;
}

let M: Match | null = null;
let gal: Signo | null = null, galSel: string | null = null;
const app = () => document.getElementById('app')!;

const who = (side: Side) => (side === 'p' ? T.voce : 'O rival');
const name = (cid: string) => card(cid).name;

/* ---------- partida ---------- */

function startMatch(sign: Signo): void {
  const foes = ORDER.filter(k => k !== sign);
  const foe = foes[Math.floor(Math.random() * foes.length)];
  const seed = randomSeed();
  const { state } = newGame({ pSign: sign, eSign: foe, seed, record: false });
  M = { g: state, shown: state, sel: null, busy: false, msg: '', active: null, striking: null, aiRng: new Rng(seed ^ 0x5bd1e995) };
  beginPlanning([]);
}

/** Rival planeja em segredo e o jogador recebe a vez. */
function beginPlanning(tickEvents: GameEvent[]): void {
  const m = M!;
  if (m.g.phase === 'plan') m.g = planTurn(m.g, 'e', m.aiRng).state;
  m.shown = m.g;
  m.busy = false;
  m.sel = null;
  m.active = null;
  m.striking = null;
  const extra: string[] = [];
  if (tickEvents.some(e => e.t === 'DeckEmpty' && e.side === 'p')) extra.push(T.deckAcabou);
  if (tickEvents.some(e => e.t === 'DrawDiscarded' && e.side === 'p')) extra.push(T.maoCheia);
  m.msg = [...extra, T.rodadaInicio(m.g.round)].join(' ');
  render();
}

/** Aplica a jogada do jogador no motor; se for inválida, mostra a dica. */
function act(a: Action, okMsg: string, failMsg?: string): void {
  const m = M!;
  const r = applyAction(m.g, 'p', a);
  if (!r.ok) {
    if (failMsg) { m.msg = failMsg; render(); }
    return;
  }
  m.g = m.shown = r.state;
  m.sel = null;
  m.msg = okMsg;
  render();
}

async function battle(): Promise<void> {
  const m = M!;
  m.busy = true;
  m.sel = null;
  const { state, frames } = resolveBattle(m.g);
  let revealed = false;
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if (!f.state) continue;
    // as minhas criaturas já estavam à vista: a Revelação delas não precisa de pausa
    if (f.kind === 'reveal' && f.events.every(e => e.t !== 'Reveal' || e.side === 'p')) { m.shown = f.state; continue; }
    if (f.kind === 'reveal' && !revealed) {
      revealed = true;
      m.msg = T.revela; render(); await sleep(600);
    }
    if (f.kind === 'tick') break; // nova rodada: tratada abaixo
    m.shown = f.state;
    m.striking = f.kind === 'step' ? m.active : null;
    m.active = f.active ?? null;
    const msg = frameMsg(f);
    if (msg) m.msg = msg;
    render();
    showFx(f.events);
    // ataque à distância: o projétil sai no meio do avanço e chega junto com o dano do próximo quadro
    const next = frames[i + 1];
    if (f.kind === 'step-start' && next?.kind === 'step') {
      const t = PAUSE['step-start'] * (reduce ? 0.4 : 1);
      for (const sh of shotsOf(next.events)) launch(app(), sh, t * 0.5, t * 0.48);
    }
    await sleep(PAUSE[f.kind]);
  }
  m.active = null;
  m.striking = null;
  m.g = state;
  const tick = frames.find(f => f.kind === 'tick');
  if (state.phase === 'over') { m.shown = state; m.busy = false; render(); return; }
  beginPlanning(tick?.events ?? []);
  if (tick) showFx(tick.events);
}

function frameMsg(f: Frame): string | null {
  for (const e of f.events) {
    switch (e.t) {
      case 'Reveal': return T.invocou('O rival', name(e.cid));
      case 'SpellResolved': return T.usou(who(e.side), name(e.cid));
      case 'SpellFizzled': return T.perdeuAlvo(name(e.cid), e.side === 'p' ? '(sua)' : 'do rival');
      case 'ArrivalResolved': return T.chegada(name(e.cid), e.side === 'p' ? 'seu' : 'do rival');
    }
  }
  if (f.kind === 'spells') return T.magias;
  if (f.kind === 'battle') return T.batalhaMsg;
  return null;
}

/* ---------- números flutuantes ---------- */

function fxText(e: GameEvent): [string, string, string] | null {
  const cell = (side: Side, l: number, d: number) => `c-${side}-${l}-${d}`;
  switch (e.t) {
    case 'Damage': return [cell(e.side, e.l, e.d), `-${e.amount}${e.poisoned ? ' 🧪' : ''}${e.fury ? ' 💢' : ''}`, 'dmg'];
    case 'ShieldBroken': return [cell(e.side, e.l, e.d), '🛡️', 'sh'];
    case 'ArmorBlocked': return [cell(e.side, e.l, e.d), '🐚 0', 'sh'];
    case 'ShieldGained': return [cell(e.side, e.l, e.d), '🛡️', 'sh'];
    case 'Poisoned': return [cell(e.side, e.l, e.d), '🧪', 'dmg'];
    case 'PoisonTick': return [cell(e.side, e.l, e.d), '-1 🧪', 'dmg'];
    case 'Buffed': return [cell(e.side, e.l, e.d), `+${e.atk}/+${e.hp}`, 'heal'];
    case 'UnitHealed': return [cell(e.side, e.l, e.d), `+${e.amount}`, 'heal'];
    case 'UnitReturnedToHand': return [cell(e.side, e.l, e.d), '🫧 volta', 'sh'];
    case 'UnitPlaced': return e.token ? [cell(e.side, e.l, e.d), 'Eco!', 'heal'] : null;
    case 'UnitDied': return [cell(e.side, e.l, e.d), '💀', 'die'];
    case 'HeroDamaged': return [`hero-${e.side}`, `-${e.amount}`, 'dmg'];
    case 'HeroHealed': return [`hero-${e.side}`, `+${e.amount}`, 'heal'];
  }
  return null;
}

/** Tremida rápida em quem levou dano. */
function shake(el: HTMLElement): void {
  el.classList.remove('hit');
  void el.offsetWidth; // reinicia a animação
  el.classList.add('hit');
}

function showFx(events: GameEvent[]): void {
  for (const e of events) {
    const fx = fxText(e);
    if (!fx) continue;
    const el = document.getElementById(fx[0]);
    if (!el) continue;
    if (fx[2] === 'dmg' || fx[2] === 'die') shake(el.closest<HTMLElement>('.hcard') ?? el);
    const s = document.createElement('span');
    s.className = 'fx ' + fx[2];
    s.textContent = fx[1];
    el.appendChild(s);
    setTimeout(() => s.remove(), 1000);
  }
}

/* ---------- desenho ---------- */

function render(): void {
  const root = app();
  if (!M) {
    root.innerHTML = gal ? galleryHtml(gal, galSel) : startHtml(new Date());
    return;
  }
  const hs = root.querySelector('.hand');
  const sl = hs ? hs.scrollLeft : 0;
  const v: View = {
    s: M.shown, sel: M.sel, msg: M.msg, active: M.active, striking: M.striking,
    canAct: !M.busy && M.g.phase === 'plan',
  };
  root.innerHTML = gameHtml(v) + (M.g.phase === 'over' && !M.busy ? endHtml(M.g) : '');
  const h2 = root.querySelector('.hand');
  if (h2) h2.scrollLeft = sl;
}

/* ---------- toques ---------- */

function onClick(ev: Event): void {
  const t = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (!t) return;
  const a = t.dataset.act;
  if (a === 'rot') { toggleRot(); return; }
  if (a === 'gal') { gal = t.dataset.r as Signo; galSel = null; render(); return; }
  if (a === 'gcard') {
    galSel = t.dataset.k!;
    const top = document.querySelector('.ov.gal')?.scrollTop ?? 0;
    render();
    const sc = document.querySelector('.ov.gal');
    if (sc) sc.scrollTop = top;
    return;
  }
  if (a === 'galback') { gal = null; render(); return; }
  if (a === 'pick') { void tryLandscape(); startMatch(t.dataset.r as Signo); return; }
  if (a === 'again' && M) { startMatch(M.g.p.sign); return; }
  if (a === 'menu') { M = null; render(); return; }

  const m = M;
  if (!m || m.busy || m.g.phase !== 'plan') return;
  const P = m.g.p;

  if (a === 'hand') {
    const i = Number(t.dataset.i);
    m.sel = m.sel === i ? null : i;
    if (m.sel !== null) {
      const c = card(P.hand[i].cid);
      m.msg = costOf(P, P.hand[i].cid) > P.mana ? T.manaInsuficienteQueimar(c.name) : `${c.name}: ${cardText(c)} ${hintFor(P.hand[i].cid)}`;
    } else m.msg = T.suaVez;
    render();
    return;
  }

  if (a === 'cell') {
    const side = t.dataset.side as Side, l = Number(t.dataset.l), d = Number(t.dataset.d);
    if (m.sel === null) {
      const u = m.g[side].board[l][d];
      if (u && !(side === 'e' && u.hidden)) {
        const c = card(u.cid);
        m.msg = `${c.name} (${effAtk(m.g[side].board, l, u)}/${u.hp}). ${cardText(c)}`;
        render();
      }
      return;
    }
    const h = P.hand[m.sel];
    const c = card(h.cid);
    if (costOf(P, h.cid) > P.mana) { m.msg = T.manaInsuficiente(c.name); render(); return; }
    const action: Action = c.type === 'unit'
      ? { t: 'summon', hand: m.sel, l, d }
      : { t: 'spell', hand: m.sel, tg: { side, l, d } };
    act(action, c.type === 'unit' ? T.invocou(T.voce, c.name) : T.magiaPreparada(c.name), hintFor(h.cid));
    return;
  }

  if (a === 'recharge') {
    if (m.sel === null || P.recharged) return;
    const c = card(P.hand[m.sel].cid);
    act({ t: 'burn', hand: m.sel }, T.queimada(c.name));
    return;
  }

  if (a === 'punch') void battle();
}

function hintFor(cid: string): string {
  const c = card(cid);
  if (c.type === 'unit') return T.hint.unit;
  switch (c.sp) {
    case 'dmg': case 'poison': return T.hint.inimiga;
    case 'buff': case 'shield': return T.hint.sua;
    case 'lane': return T.hint.lane;
    case 'face': return T.hint.face;
    default: return T.hint.propria;
  }
}

export function startApp(): void {
  app().addEventListener('click', onClick);
  app().addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && (e.target as HTMLElement).matches('[role="button"]')) {
      e.preventDefault();
      (e.target as HTMLElement).click();
    }
  });
  render();
}
