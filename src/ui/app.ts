// Controla as telas e a partida contra a IA. Toda regra vem do motor; aqui só desenha e anima.
import { card } from '../data/cards';
import type { Signo } from '../data/schema';
import { ORDER } from '../data/signos';
import { cardText, T } from '../data/textos';
import {
  applyAction, costOf, deckAleatorio, deckForte, doisSignos, DECK_SIZE, effAtk, newGame, resolveBattle, Rng, surrender,
  maxCopias, planTurnNivel, type DeckMontado, type Nivel,
  type Action, type Frame, type GameEvent, type GameState, type Side, type Target,
} from '../engine';
import { ATK_MS, desistirHtml, endHtml, galleryHtml, gameHtml, startHtml, zoomHtml, type View, type Zoom } from './desenho';
import { toggleRot, tryLandscape } from './orientacao';
import { efeitoGeral, efeitosDeMagia, EXTRA_GERAL_MS, MAGIA_MS } from './efeitoMagia';
import { precarregarVisiveis } from './precarga';
import { launch, shotsOf } from './projetil';
import { desbloquear, tocar, trocarModoSom, type Efeito } from './som';
import { reverTutorial, tutorialEntendi, tutorialFimDePartida, tutorialHtml, tutorialNovaPartida, tutorialPular } from './tutorial';
import { avisoHtml, dificuldadeHtml, hubHtml, montarHtml, regrasHtml, type Montagem } from './menu';
import { deckAtivo, lerDecks, salvarDecks } from '../services/deckSalvo';
import { lerNivel, salvarNivel } from '../services/preferencias';

/** Nome da raridade em minúsculas, para os avisos. */
const RARIDADE_NOME: Record<string, string> = { c: 'comum', r: 'rara', e: 'épica', l: 'lendária' };

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms: number) => new Promise(r => setTimeout(r, reduce ? ms * 0.4 : ms));
const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

/** Pausa depois de cada tipo de quadro da Batalha (mesmos tempos do protótipo). */
/** Ferrão Final: espera depois do golpe, tempo da animação do ferrão e pausa depois do dano. */
const FERRAO_ESPERA_MS = 450;
const FERRAO_ANIM_MS = 900;
const FERRAO_MS = 700;

const PAUSE: Record<Frame['kind'], number> = {
  tick: 0, reveal: 450, spells: 450, spell: MAGIA_MS, arrival: 550, battle: 450, row: 0, 'step-start': ATK_MS.start, step: ATK_MS.strike, ferrao: FERRAO_MS, end: 700,
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
  /** Estado no começo do planejamento: as jogadas só valem de vez quando o jogador toca em Batalha. */
  base: GameState;
  /** Jogadas feitas nesta rodada; bi = posição da carta na mão do começo da rodada. */
  plan: { bi: number; a: Action }[];
  /** Fim de partida: 'caindo' enquanto o lado de quem perdeu desaba; 'pronto' quando aparece o resultado. */
  fim?: 'caindo' | 'pronto';
  /** Perguntando se o jogador quer desistir. */
  confirma?: boolean;
  /** Desistiu no meio da animação da Batalha: a animação para. */
  abortado?: boolean;
  /** Criatura do tabuleiro aberta grande para ver os detalhes. */
  inspect: Target | null;
  /** Dificuldade do bot nesta partida. */
  nivel: Nivel;
}

/** Dica de texto aberta pelo ícone de informação (fica escondida para não poluir a tela). */
let infoAberta = false;

let M: Match | null = null;
let gal: Signo | null = null, galSel: string | null = null;
/** Telas fora da partida: menu de ilhas, escolha de signo (deck inteiro) e montagem de deck. */
let tela: 'hub' | 'conhecer' | 'montar' = 'hub';
let montagem: Montagem | null = null;
let dialogo: 'nivel' | 'regras' | null = null;
/** Última dificuldade escolhida na Partida Rápida. */
let nivel: Nivel = lerNivel();
/** Os 3 espaços de deck e qual está em uso. */
const meus = lerDecks();
/** Como foi a última partida (para a Revanche repetir igual). */
type Modo = { modo: 'signo'; sign: Signo } | { modo: 'rapida'; deck: DeckMontado; nivel: Nivel };
let ultimo: Modo | null = null;
const app = () => document.getElementById('app')!;

const who = (side: Side) => (side === 'p' ? T.voce : 'O rival');
const name = (cid: string) => card(cid).name;

/* ---------- partida ---------- */

function startMatch(cfg: Modo): void {
  ultimo = cfg;
  tutorialNovaPartida();
  const seed = randomSeed();
  let state: GameState;
  if (cfg.modo === 'signo') {
    const foes = ORDER.filter(k => k !== cfg.sign);
    const foe = foes[Math.floor(Math.random() * foes.length)];
    state = newGame({ pSign: cfg.sign, eSign: foe, seed, record: false }).state;
  } else {
    // Partida Rápida: o seu deck contra um bot com 2 signos e 30 cartas (sorteadas; no difícil, as mais fortes)
    const rng = new Rng(seed ^ 0x2545f491);
    const [ea, eb] = doisSignos(rng, ORDER);
    const [pa, pb] = cfg.deck.signos;
    const eDeck = cfg.nivel === 'dificil' ? deckForte(rng, ea, eb) : deckAleatorio(rng, ea, eb);
    state = newGame({ pSign: pa, pSign2: pb, pDeck: cfg.deck.cartas, eSign: ea, eSign2: eb, eDeck, seed, record: false }).state;
  }
  M = { g: state, shown: state, sel: null, busy: false, msg: '', active: null, striking: null, aiRng: new Rng(seed ^ 0x5bd1e995), base: state, plan: [], inspect: null, nivel: cfg.modo === 'rapida' ? cfg.nivel : 'normal' };
  beginPlanning([]);
}

/** Rival planeja em segredo e o jogador recebe a vez. */
function beginPlanning(tickEvents: GameEvent[]): void {
  const m = M!;
  if (m.g.phase === 'plan') m.g = planTurnNivel(m.g, 'e', m.aiRng, m.nivel).state;
  m.shown = m.base = m.g;
  m.plan = [];
  m.busy = false;
  m.sel = null;
  m.active = null;
  m.striking = null;
  const extra: string[] = [];
  if (tickEvents.some(e => e.t === 'DeckEmpty' && e.side === 'p')) extra.push(T.deckAcabou);
  if (tickEvents.some(e => e.t === 'DrawDiscarded' && e.side === 'p')) extra.push(T.maoCheia);
  m.msg = [...extra, T.rodadaInicio(m.g.round)].join(' ');
  m.inspect = null;
  render();
  if (m.g.phase === 'plan') faixaRodada(m.g.round);
}

/** Cartas da mão do começo da rodada que ainda não foram usadas (na ordem em que aparecem na mão). */
function livres(m: Match): number[] {
  const usadas = new Set(m.plan.map(x => x.bi));
  return m.base.p.hand.map((_, i) => i).filter(i => !usadas.has(i));
}

/** Refaz as jogadas da rodada a partir do começo (depois de tirar uma delas). */
function refazer(m: Match): void {
  let s = m.base;
  const feitas: Match['plan'] = [];
  const usadas = new Set<number>();
  for (const x of m.plan) {
    const hand = m.base.p.hand.map((_, i) => i).filter(i => !usadas.has(i)).indexOf(x.bi);
    const r = applyAction(s, 'p', { ...x.a, hand });
    if (!r.ok) continue; // ficou sem mana (ex.: a Corrente saiu): a jogada cai
    s = r.state;
    usadas.add(x.bi);
    feitas.push(x);
  }
  m.plan = feitas;
  m.g = m.shown = s;
}

/** Tira uma jogada da rodada; a carta volta para a mão. Devolve a posição dela na mão agora. */
function desfazer(m: Match, k: number): number {
  const [x] = m.plan.splice(k, 1);
  refazer(m);
  return livres(m).indexOf(x.bi);
}

/** Aplica a jogada do jogador no motor; se for inválida, mostra a dica. */
function act(a: Action, okMsg: string, failMsg?: string): void {
  const m = M!;
  const r = applyAction(m.g, 'p', a);
  if (!r.ok) {
    if (failMsg) { m.msg = failMsg; render(); }
    return;
  }
  m.plan.push({ bi: livres(m)[a.hand], a });
  tocar(a.t === 'burn' ? 'queimar' : a.t === 'spell' ? 'magia' : 'carta');
  m.g = m.shown = r.state;
  m.sel = null;
  m.msg = okMsg;
  render();
}

async function battle(): Promise<void> {
  const m = M!;
  m.busy = true;
  tocar('batalha');
  m.sel = null;
  m.inspect = null;
  const { state, frames } = resolveBattle(m.g);
  let revealed = false;
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if (!f.state) continue;
    // as minhas criaturas já estavam à vista: a Revelação delas não precisa de pausa
    if (f.kind === 'reveal' && f.events.every(e => e.t !== 'Reveal' || e.side === 'p')) { m.shown = f.state; continue; }
    if (f.kind === 'reveal' && !revealed) {
      revealed = true;
      m.msg = T.revela; render(); await sleep(600); if (m.abortado) return;
    }
    if (f.kind === 'tick') break; // nova rodada: tratada abaixo
    // Investida: a criatura acabou de entrar e já ataca — mostra o avanço antes do golpe, com o aviso
    const inv = f.kind === 'arrival' ? f.events.find(e => e.t === 'Attack') : undefined;
    if (inv && inv.t === 'Attack') {
      m.active = [{ side: inv.side, l: inv.l, d: inv.d }];
      m.striking = null;
      m.msg = T.investidaMsg(name(inv.cid), inv.side === 'p' ? 'sua' : 'do rival');
      render();
      avisoInvestida(`c-${inv.side}-${inv.l}-${inv.d}`);
      const t = PAUSE['step-start'] * (reduce ? 0.4 : 1);
      for (const sh of shotsOf(f.events)) launch(app(), sh, t * 0.5, t * 0.48);
      await sleep(PAUSE['step-start']); if (m.abortado) return;
    }
    // Ferrão Final: uma pausa depois do golpe, o escorpião aparece onde morreu e lança o ferrão; só então o dano
    if (f.kind === 'ferrao') {
      m.active = null;
      m.striking = null;
      for (const e of f.events) if (e.t === 'Sting') { m.msg = T.ferraoMsg(name(e.cid), e.from.side === 'p' ? 'seu' : 'do rival'); }
      render();
      await sleep(FERRAO_ESPERA_MS); if (m.abortado) return;
      for (const e of f.events) if (e.t === 'Sting') animaFerrao(e);
      await sleep(FERRAO_ANIM_MS); if (m.abortado) return;
    }
    m.shown = f.state;
    m.striking = f.kind === 'step' || inv ? m.active : null;
    m.active = f.active ?? null;
    const msg = frameMsg(f);
    if (msg) m.msg = msg;
    const mortos = capturarMortos(f.events);
    render();
    soltarMortos(mortos);
    efeitosDeMagia(app(), f.events);
    // fortalecer/escudo de magia: o número e a luz aparecem logo depois do efeito da magia, para não ficarem por baixo dele
    const reforco: GameEvent[] = f.kind === 'spell' ? f.events.filter(e => e.t === 'Buffed' || e.t === 'ShieldGained') : [];
    showFx(f.events.filter(e => !reforco.includes(e)));
    sonsDoQuadro(f.events);
    if (reforco.length) setTimeout(() => showFx(reforco), REFORCO_MS);
    // ataque à distância: o projétil sai no meio do avanço e chega junto com o dano do próximo quadro
    const next = frames[i + 1];
    if (f.kind === 'step-start' && next?.kind === 'step') {
      const t = PAUSE['step-start'] * (reduce ? 0.4 : 1);
      for (const sh of shotsOf(next.events)) launch(app(), sh, t * 0.5, t * 0.48);
    }
    const pausa = inv ? PAUSE.step
      : PAUSE[f.kind] + (f.kind === 'spell' && efeitoGeral(f.events) ? EXTRA_GERAL_MS : 0) + (reforco.length ? REFORCO_MS : 0);
    await sleep(pausa); if (m.abortado) return;
  }
  m.active = null;
  m.striking = null;
  m.inspect = null;
  m.g = state;
  const tick = frames.find(f => f.kind === 'tick');
  if (state.phase === 'over') { m.shown = state; m.busy = false; m.confirma = false; fimDeJogo(m); return; }
  const mortos = capturarMortos(tick?.events ?? []);
  beginPlanning(tick?.events ?? []);
  soltarMortos(mortos);
  if (tick) showFx(tick.events);
}

/** Sons dos acontecimentos de um quadro da Batalha (cada som uma vez por quadro). */
function sonsDoQuadro(evs: GameEvent[]): void {
  const sons = new Set<Efeito>();
  for (const e of evs) {
    switch (e.t) {
      case 'Attack': sons.add('ataque'); break;
      case 'Damage': sons.add('golpe'); break;
      case 'HeroDamaged': sons.add('heroi'); break;
      case 'UnitDied': sons.add('morte'); break;
      case 'SpellResolved': sons.add('magia'); break;
      case 'ShieldBroken': case 'ShieldGained': sons.add('escudo'); break;
      case 'HeroHealed': case 'UnitHealed': sons.add('cura'); break;
      case 'Reveal': case 'UnitPlaced': sons.add('carta'); break;
    }
  }
  for (const s of sons) tocar(s);
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
    case 'ShieldGained': return [cell(e.side, e.l, e.d), '🛡️ Escudo!', 'sh ganho'];
    case 'Poisoned': return [cell(e.side, e.l, e.d), '🧪', 'dmg'];
    case 'PoisonTick': return [cell(e.side, e.l, e.d), '-1 🧪', 'dmg'];
    case 'Buffed': return [cell(e.side, e.l, e.d), `⬆ +${e.atk}/+${e.hp}`, 'buff'];
    case 'UnitHealed': return [cell(e.side, e.l, e.d), `+${e.amount}`, 'heal'];
    case 'UnitReturnedToHand': return [cell(e.side, e.l, e.d), '🫧 volta', 'sh'];
    case 'UnitPlaced': return e.token ? [cell(e.side, e.l, e.d), 'Eco!', 'heal'] : null;
    case 'UnitPushed': return [cell(e.side, e.l, e.to), '🐏 empurrado!', 'sh'];
    case 'HeroDamaged': return [`hero-${e.side}`, `-${e.amount}`, 'dmg heroi'];
    case 'HeroHealed': return [`hero-${e.side}`, `+${e.amount}`, 'heal'];
  }
  return null;
}

/** Tempo da animação de morte (ms); igual ao CSS (.unit.morrendo). */
const MORTE_MS = 1400;
/** Tempo do lado de quem perdeu desabando antes de aparecer o resultado. */
const DESABA_MS = 2200;
/** Criaturas morrendo: continuam na tela até a animação acabar, mesmo se a tela for redesenhada. */
let morrendo: { id: string; el: HTMLElement; t0: number }[] = [];

/** Guarda o desenho das criaturas que morrem neste quadro (o novo estado já não tem elas). */
function capturarMortos(events: GameEvent[]): { id: string; el: HTMLElement }[] {
  const out: { id: string; el: HTMLElement }[] = [];
  for (const e of events) {
    if (e.t !== 'UnitDied') continue;
    const id = `c-${e.side}-${e.l}-${e.d}`;
    const el = document.getElementById(id)?.querySelector<HTMLElement>('.unit');
    if (el) out.push({ id, el });
  }
  return out;
}

/** Depois de redesenhar, põe as criaturas mortas de volta para a animação de morte. */
function soltarMortos(novos: { id: string; el: HTMLElement }[]): void {
  const t0 = Date.now();
  for (const x of novos) {
    x.el.classList.add('morrendo');
    x.el.insertAdjacentHTML('beforeend', '<span class="morte-onda"></span><span class="morte-nuvem"></span><span class="morte-alma"></span>');
    morrendo.push({ ...x, t0 });
  }
  reporMortos();
}

/** Recoloca as que ainda estão morrendo (a tela foi redesenhada), continuando do ponto em que estavam. */
function reporMortos(): void {
  const agora = Date.now();
  morrendo = morrendo.filter(x => agora - x.t0 < MORTE_MS);
  for (const x of morrendo) {
    const cell = document.getElementById(x.id);
    if (!cell || cell.querySelector('.unit:not(.morrendo)')) continue; // a casa já tem outra criatura
    x.el.style.setProperty('--md', `-${agora - x.t0}ms`);
    if (x.el.parentElement !== cell) cell.appendChild(x.el);
  }
}

/** Golpe no herói: a tela pisca em vermelho do lado dele. */
function golpeNoHeroi(side: Side, amount: number): void {
  const v = document.createElement('div');
  v.className = `vinheta ${side}${amount >= 5 ? ' forte' : ''}`;
  app().appendChild(v);
  setTimeout(() => v.remove(), 800);
}

/** Atraso do número de fortalecer/escudo depois do efeito da magia. */
const REFORCO_MS = 550;

/** Aviso grande em cima de quem entrou com Investida. */
/** Ferrão Final: escorpião fantasma surge onde a criatura morreu, com o aviso, e o ferrão voa até quem a matou. */
function animaFerrao(e: Extract<GameEvent, { t: 'Sting' }>): void {
  const de = `c-${e.from.side}-${e.from.l}-${e.from.d}`, para = `c-${e.side}-${e.l}-${e.d}`;
  const cell = document.getElementById(de);
  if (!cell) return;
  const g = document.createElement('span');
  g.className = 'ferrao-fantasma';
  g.innerHTML = `<i>🦂</i><b>${T.ferrao}</b>`;
  cell.appendChild(g);
  setTimeout(() => g.remove(), FERRAO_ANIM_MS + 500);
  const t = FERRAO_ANIM_MS * (reduce ? 0.4 : 1);
  launch(app(), { from: de, to: para, kind: 'ferrao', color: '#b56cff' }, t * 0.45, t * 0.5);
}

function avisoInvestida(id: string): void {
  const cell = document.getElementById(id);
  if (!cell) return;
  const a = document.createElement('span');
  a.className = 'aviso-investida';
  a.textContent = T.investida;
  cell.appendChild(a);
  cell.classList.add('investindo');
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
    if (fx[2].startsWith('dmg')) {
      shake(el.closest<HTMLElement>('.hcard') ?? el);
      // impacto bem visível onde o golpe acertou
      const imp = document.createElement('span');
      imp.className = 'impacto';
      el.appendChild(imp);
      setTimeout(() => imp.remove(), 500);
      if (e.t === 'HeroDamaged') golpeNoHeroi(e.side, e.amount);
    }
    if (fx[2] === 'buff' || fx[2] === 'sh ganho') {
      // fortalecer: coluna de luz dourada com setas subindo e a criatura brilhando
      const au = document.createElement('span');
      au.className = fx[2] === 'buff' ? 'buff-aura' : 'buff-aura escudo';
      au.innerHTML = '<i></i><i></i><i></i>';
      el.appendChild(au);
      el.classList.add('fortalecida');
      setTimeout(() => { au.remove(); el.classList.remove('fortalecida'); }, 1200);
    }
    if (e.t === 'HeroHealed') {
      const hc = el.closest<HTMLElement>('.hcard');
      if (hc) { hc.classList.add('curado'); setTimeout(() => hc.classList.remove('curado'), 900); }
    }
    const s = document.createElement('span');
    s.className = 'fx ' + fx[2];
    s.textContent = fx[1];
    el.appendChild(s);
    setTimeout(() => s.remove(), 1100);
  }
}

/* ---------- desenho ---------- */

function render(): void {
  const root = app();
  if (!M) {
    const dlg = dialogo === 'nivel' ? dificuldadeHtml(deckAtivo(meus), nivel) : dialogo === 'regras' ? regrasHtml() : '';
    root.innerHTML = gal ? galleryHtml(gal, galSel)
      : tela === 'montar' && montagem ? montarHtml(montagem, meus.decks, meus.ativo)
      : tela === 'conhecer' ? startHtml(new Date())
      : hubHtml(new Date(), deckAtivo(meus)) + dlg;
    return;
  }
  const hs = root.querySelector('.hand');
  const sl = hs ? hs.scrollLeft : 0;
  precarregarVisiveis(M.g);
  const v: View = {
    s: M.shown, sel: M.sel, msg: M.msg, active: M.active, striking: M.striking,
    canAct: !M.busy && M.g.phase === 'plan',
    canUndo: !M.busy && M.g.phase === 'plan' && M.plan.length > 0,
    canBurn: !M.busy && M.g.phase === 'plan' && !M.g.p.recharged && (M.sel !== null || preparadasAtual(M).length === 1),
    zoom: zoomAtual(M),
    preparadas: preparadasAtual(M),
    info: infoAberta,
    nivel: ultimo?.modo === 'rapida' ? T.nivelNome[M.nivel] : undefined,
    fim: M.g.phase !== 'over' || M.busy ? null : M.fim === 'pronto' ? 'fixo' : 'anim',
  };
  const tut = M.confirma || M.g.phase === 'over' ? { html: '' }
    : tutorialHtml({ rodada: M.g.round, ocupado: M.busy, selecionou: M.sel !== null, jogou: M.plan.length > 0,
      podeInvocar: M.g.p.hand.some(h => card(h.cid).type === 'unit' && costOf(M!.g.p, h.cid) <= M!.g.p.mana) });
  root.innerHTML = gameHtml(v) + tut.html + (M.confirma ? desistirHtml() : '') + (M.g.phase === 'over' && M.fim === 'pronto' ? endHtml(M.g) : '');
  if (tut.alvo) root.querySelectorAll(tut.alvo).forEach(el => el.classList.add('tut-alvo'));
  reporMortos();
  const h2 = root.querySelector('.hand');
  if (h2) h2.scrollLeft = sl;
}

/** Magias sem alvo já preparadas nesta rodada (aparecem paradas ao lado do campo até a Batalha). */
function preparadasAtual(m: Match): { cid: string; k: number }[] {
  if (m.busy || m.g.phase !== 'plan') return [];
  return m.plan.flatMap((x, k) => {
    const cid = m.base.p.hand[x.bi]?.cid;
    return x.a.t === 'spell' && cid && alvoAutomatico(cid) ? [{ cid, k }] : [];
  });
}

/** Troca só a carta aberta grande (sem redesenhar a tela toda). */
function atualizarZoom(m: Match): void {
  const root = app();
  root.querySelector(':scope > .zoom')?.remove();
  const z = zoomAtual(m);
  if (z) root.insertAdjacentHTML('beforeend', zoomHtml(z));
}

/** Carta aberta grande: a selecionada na mão, ou a criatura tocada no tabuleiro (também durante a Batalha). */
function zoomAtual(m: Match): Zoom | null {
  if (m.busy) return zoomCriatura(m, m.shown);
  if (m.g.phase !== 'plan') return null;
  if (m.sel !== null) {
    const h = m.g.p.hand[m.sel];
    if (!h) return null;
    const c = card(h.cid);
    // aparece na metade da arena que não vai ser tocada: criatura e magia em aliado vão para o seu lado
    const miraInimigo = c.type === 'spell' && ['dmg', 'poison', 'lane', 'face'].includes(c.sp);
    return { cid: h.cid, cost: costOf(m.g.p, h.cid), lado: miraInimigo ? 'p' : 'e' };
  }
  return zoomCriatura(m, m.g);
}

function zoomCriatura(m: Match, s: GameState): Zoom | null {
  if (!m.inspect) return null;
  const { side, l, d } = m.inspect;
  const u = s[side].board[l][d];
  if (!u || (side === 'e' && u.hidden)) return null;
  return { cid: u.cid, atk: effAtk(s[side].board, l, u), hp: u.hp, lado: side === 'p' ? 'e' : 'p' };
}

/** Fim de partida: primeiro o lado de quem perdeu desce, treme e racha; depois aparece o resultado. */
function fimDeJogo(m: Match): void {
  m.fim = 'caindo';
  tutorialFimDePartida();
  tocar(m.g.result === 'p' ? 'vitoria' : 'derrota');
  render();
  setTimeout(() => { if (M === m) { m.fim = 'pronto'; render(); } }, DESABA_MS);
}

/** Toques do menu de ilhas e da montagem de deck. Devolve true se tratou o toque. */
function menuClick(a: string | undefined, t: HTMLElement): boolean {
  switch (a) {
    case 'hub': tela = 'hub'; gal = null; dialogo = null; render(); return true;
    case 'fechar': dialogo = null; render(); return true;
    case 'conhecer': tela = 'conhecer'; render(); return true;
    case 'regras': dialogo = 'regras'; render(); return true;
    case 'campanha': case 'torneio': case 'ranqueada': case 'evento': case 'missoes': emBreve(); return true;
    case 'rapida': dialogo = 'nivel'; render(); return true;
    case 'nivel': {
      nivel = t.dataset.n as Nivel;
      salvarNivel(nivel);
      dialogo = null;
      // sem deck montado: joga com um deck aleatório de 2 signos
      let d = deckAtivo(meus);
      if (!d) {
        const rng = new Rng(randomSeed());
        const sg = doisSignos(rng, ORDER);
        d = { signos: sg, cartas: deckAleatorio(rng, sg[0], sg[1]) };
      }
      void tryLandscape();
      startMatch({ modo: 'rapida', deck: d, nivel });
      return true;
    }
    case 'montar':
      dialogo = null;
      tela = 'montar';
      montagem = { passo: 0, espaco: 0, signos: [], cartas: [], info: null, msg: '', apagar: null, nome: '' };
      render();
      return true;
  }
  const mg = montagem;
  if (!mg || tela !== 'montar') return false;
  if (a !== 'mapagar') mg.apagar = null;
  switch (a) {
    case 'mdecks': mg.passo = 0; break;
    case 'mespaco': {
      const i = Number(t.dataset.i), d = meus.decks[i];
      mg.espaco = i; mg.info = null; mg.msg = '';
      if (d) { mg.signos = [...d.signos]; mg.cartas = [...d.cartas]; mg.nome = d.nome ?? ''; mg.passo = 2; }
      else { mg.signos = []; mg.cartas = []; mg.nome = ''; mg.passo = 1; }
      break;
    }
    case 'musar': meus.ativo = Number(t.dataset.i); salvarDecks(meus); break;
    case 'mapagar': {
      const i = Number(t.dataset.i);
      if (mg.apagar !== i) { mg.apagar = i; break; }
      meus.decks[i] = null;
      if (meus.ativo === i) meus.ativo = meus.decks.findIndex(Boolean);
      salvarDecks(meus);
      mg.apagar = null;
      break;
    }
    case 'msigno': {
      const r = t.dataset.r as Signo;
      if (mg.signos.includes(r)) mg.signos = mg.signos.filter(x => x !== r);
      else if (mg.signos.length < 2) mg.signos.push(r);
      else mg.signos = [mg.signos[1], r];
      break;
    }
    case 'mseguir':
      if (mg.signos.length !== 2) return true;
      // trocou de signos: as cartas que não são deles saem do deck
      mg.cartas = mg.cartas.filter(k => mg.signos.includes(card(k).race));
      mg.passo = 2; mg.info = null; mg.msg = '';
      break;
    case 'mvoltar': mg.passo = 1; break;
    // tocar numa carta abre ela no painel; os botões do painel colocam e tiram cópias
    case 'mcarta': mg.info = t.dataset.k!; mg.msg = ''; keepScroll(); return true;
    case 'mmais': {
      const k = mg.info;
      if (!k) return true;
      const n = mg.cartas.filter(x => x === k).length, mx = maxCopias(k);
      if (mg.cartas.length >= DECK_SIZE) mg.msg = T.deckCheio;
      else if (n >= mx) mg.msg = T.limiteCopias(mx, RARIDADE_NOME[card(k).r]);
      else { mg.cartas.push(k); mg.msg = ''; }
      keepScroll(); return true;
    }
    case 'mmenos': {
      const k = mg.info, i = k ? mg.cartas.lastIndexOf(k) : -1;
      if (i >= 0) mg.cartas.splice(i, 1);
      mg.msg = '';
      keepScroll(); return true;
    }
    case 'mcompletar': {
      const [x, y] = mg.signos as [Signo, Signo];
      mg.cartas = deckAleatorio(new Rng(randomSeed()), x, y, mg.cartas);
      mg.msg = '';
      keepScroll(); return true;
    }
    case 'mlimpar': mg.cartas = []; mg.msg = ''; keepScroll(); return true;
    case 'msalvar': {
      if (mg.cartas.length !== DECK_SIZE) return true;
      const nome = mg.nome.trim().slice(0, 22);
      meus.decks[mg.espaco] = { signos: [mg.signos[0], mg.signos[1]], cartas: [...mg.cartas], ...(nome ? { nome } : {}) };
      if (meus.ativo < 0) meus.ativo = mg.espaco;
      const ok = salvarDecks(meus);
      mg.passo = 0;
      render();
      aviso(ok ? T.deckSalvo : T.deckNaoSalvo);
      return true;
    }
    default: return false;
  }
  render();
  return true;
}

/** Redesenha a montagem sem perder a rolagem da lista de cartas. */
function keepScroll(): void {
  const lista = () => document.querySelector('.m-corpo .ggrid') ?? document.querySelector('.ov.montar');
  const top = lista()?.scrollTop ?? 0;
  render();
  const sc = lista();
  if (sc) sc.scrollTop = top;
}

function emBreve(): void { aviso(T.emBreveAviso); }

/** Aviso que aparece no meio da tela e some sozinho. */
function aviso(txt: string): void {
  app().querySelector('.hub-aviso')?.remove();
  const tmp = document.createElement('div');
  tmp.innerHTML = avisoHtml(txt);
  const el = tmp.firstElementChild as HTMLElement;
  app().appendChild(el);
  setTimeout(() => el.remove(), 1900);
}

/** Faixa grande "Rodada N" atravessando a tela no começo de cada rodada. */
function faixaRodada(n: number): void {
  const f = document.createElement('div');
  f.className = 'faixa-rodada';
  // roda do zodíaco dourada girando, estrelas em volta e o número da rodada no meio
  f.innerHTML = '<i class="fr-roda"></i><i class="fr-brilho"></i>'
    + Array.from({ length: 10 }, (_, k) => `<b class="fr-estrela" style="--a:${k * 36}deg;--d:${(k % 3) * 80}ms"></b>`).join('')
    + `<span class="fr-txt"><small>${T.rodada}</small>${n}</span>`;
  app().appendChild(f);
  setTimeout(() => f.remove(), 1900);
}

/* ---------- toques ---------- */

function onClick(ev: Event): void {
  const t = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (!t) return;
  const a = t.dataset.act;
  desbloquear();
  if (a === 'som') { trocarModoSom(); desbloquear(); tocar('clique'); render(); return; }
  if (a === 'tut-ok') { tutorialEntendi(); tocar('clique'); render(); return; }
  if (a === 'tut-pular') { tutorialPular(); tocar('clique'); render(); return; }
  if (a === 'rever-tut') { reverTutorial(); dialogo = null; render(); aviso(T.tutorialVolta); return; }
  if (a !== 'hand' && a !== 'cell' && a !== 'punch' && a !== 'recharge') tocar('clique');
  if (a === 'rot') { toggleRot(); return; }
  if (a === 'info') { infoAberta = !infoAberta; render(); return; }
  if (a === 'gal') { gal = t.dataset.r as Signo; galSel = null; render(); return; }
  if (a === 'gcard') {
    galSel = t.dataset.k!;
    const top = document.querySelector('.ov.gal')?.scrollTop ?? 0;
    render();
    const sc = document.querySelector('.ov.gal');
    if (sc) sc.scrollTop = top;
    return;
  }
  if (a === 'galback') { gal = null; tela = 'conhecer'; render(); return; }
  if (a === 'pick') { void tryLandscape(); startMatch({ modo: 'signo', sign: t.dataset.r as Signo }); return; }
  if (a === 'again' && M && ultimo) { startMatch(ultimo); return; }
  if (a === 'menu') { M = null; tela = 'hub'; render(); return; }
  if (!M && menuClick(a, t)) return;
  // dá para desistir também durante a animação da Batalha
  if (a === 'desistir' && M && M.g.phase === 'plan' && M.fim === undefined) { M.confirma = true; M.sel = null; M.inspect = null; render(); return; }
  if (a === 'desistir-nao' && M) { M.confirma = false; render(); return; }
  if (a === 'desistir-sim' && M && M.confirma) {
    M.confirma = false;
    // no meio da Batalha: a animação para na hora
    if (M.busy) { M.abortado = true; M.busy = false; M.active = M.striking = null; M.inspect = null; }
    // as jogadas ainda não confirmadas desta rodada (e a Batalha em andamento) não contam: desiste a partir do começo do planejamento
    const r = surrender(M.base, 'p');
    if (r.ok) { M.g = M.shown = r.state; M.msg = T.voceDesistiu; fimDeJogo(M); }
    return;
  }

  const m = M;
  // durante a Batalha: tocar numa criatura abre os detalhes dela (sem redesenhar a arena, a animação segue)
  if (m && m.busy && a === 'cell') {
    const side = t.dataset.side as Side, l = Number(t.dataset.l), d = Number(t.dataset.d);
    const mesma = m.inspect && m.inspect.side === side && m.inspect.l === l && m.inspect.d === d;
    m.inspect = mesma ? null : { side, l, d };
    atualizarZoom(m);
    return;
  }
  if (!m || m.busy || m.g.phase !== 'plan') return;
  const P = m.g.p;
  if (a !== 'cell') m.inspect = null;

  if (a === 'hand') {
    const i = Number(t.dataset.i);
    // magia sem escolha de casa (curar, comprar, dano no herói): já fica preparada, sem tocar no campo
    const auto = alvoAutomatico(P.hand[i].cid);
    if (auto && costOf(P, P.hand[i].cid) <= P.mana) {
      const c = card(P.hand[i].cid);
      act({ t: 'spell', hand: i, tg: auto }, T.magiaPreparada(c.name) + ' ' + T.tocarParaVoltar);
      return;
    }
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
    // criatura invocada nesta rodada: tocar nela devolve para a mão (para trocar de casa ou de criatura)
    const selUnit = m.sel === null || card(m.g.p.hand[m.sel].cid).type === 'unit';
    const k = side === 'p' && selUnit ? m.plan.findIndex(x => x.a.t === 'summon' && x.a.l === l && x.a.d === d) : -1;
    if (k >= 0) {
      const selBi = m.sel === null ? null : livres(m)[m.sel];
      const nome = name(m.g.p.board[l][d]!.cid);
      const i = desfazer(m, k);
      if (selBi === null) {
        m.sel = i;
        m.msg = T.voltouMao(nome);
        render();
        return;
      }
      m.sel = livres(m).indexOf(selBi); // troca: a carta escolhida entra no lugar
    }
    if (m.sel === null) {
      const u = m.g[side].board[l][d];
      const mesma = m.inspect && m.inspect.side === side && m.inspect.l === l && m.inspect.d === d;
      if (u && !(side === 'e' && u.hidden) && !mesma) {
        const c = card(u.cid);
        m.inspect = { side, l, d };
        m.msg = `${c.name} (${effAtk(m.g[side].board, l, u)}/${u.hp}). ${cardText(c)}`;
      } else m.inspect = null;
      render();
      return;
    }
    const h = m.g.p.hand[m.sel];
    const c = card(h.cid);
    if (costOf(m.g.p, h.cid) > m.g.p.mana) { m.msg = T.manaInsuficiente(c.name); render(); return; }
    const action: Action = c.type === 'unit'
      ? { t: 'summon', hand: m.sel, l, d }
      : { t: 'spell', hand: m.sel, tg: { side, l, d } };
    act(action, c.type === 'unit' ? T.invocou(T.voce, c.name) : T.magiaPreparada(c.name), hintFor(h.cid));
    return;
  }

  if (a === 'desprep') {
    const k = Number(t.dataset.k);
    const x = m.plan[k];
    if (!x) return;
    // volta para a mão já selecionada (como a criatura): dá para queimar ou tocar de novo para preparar
    m.sel = desfazer(m, k);
    m.msg = T.voltouMaoQueimar(name(m.base.p.hand[x.bi].cid));
    render();
    return;
  }

  if (a === 'recharge') {
    if (P.recharged) return;
    // nada selecionado e só uma magia preparada: queima ela (volta para a mão e é queimada)
    if (m.sel === null) {
      const prep = preparadasAtual(m);
      if (prep.length !== 1) return;
      m.sel = desfazer(m, prep[0].k);
    }
    const c = card(m.g.p.hand[m.sel].cid);
    act({ t: 'burn', hand: m.sel }, T.queimada(c.name));
    return;
  }

  if (a === 'undo') {
    if (!m.plan.length) return;
    const x = m.plan[m.plan.length - 1];
    desfazer(m, m.plan.length - 1);
    m.sel = null;
    m.msg = T.desfeito(name(m.base.p.hand[x.bi].cid));
    render();
    return;
  }

  if (a === 'punch') void battle();
}

/** Magias sem escolha de casa (curar/comprar/dano no herói): o alvo é fixo, então ela é preparada direto da mão. */
function alvoAutomatico(cid: string): Target | null {
  const c = card(cid);
  if (c.type !== 'spell') return null;
  if (c.sp === 'heal' || c.sp === 'draw') return { side: 'p', l: 0, d: 0 };
  if (c.sp === 'face') return { side: 'e', l: 0, d: 0 };
  return null;
}

function hintFor(cid: string): string {
  const c = card(cid);
  if (c.type === 'unit') return T.hint.unit;
  switch (c.sp) {
    case 'dmg': case 'poison': return T.hint.inimiga;
    case 'buff': case 'shield': return T.hint.sua;
    case 'lane': return T.hint.lane;
    default: return T.hint.propria;
  }
}

export function startApp(): void {
  app().addEventListener('click', onClick);
  // nome do deck: guarda enquanto digita, sem redesenhar (o teclado não fecha)
  app().addEventListener('input', e => {
    const t = e.target as HTMLInputElement;
    if (t.id === 'm-nome' && montagem) montagem.nome = t.value;
  });
  app().addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && (e.target as HTMLElement).matches('[role="button"]')) {
      e.preventDefault();
      (e.target as HTMLElement).click();
    }
  });
  render();
}
