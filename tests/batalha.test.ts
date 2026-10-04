import { describe, expect, it } from 'vitest';
import { resolveBattle } from '../src/engine/battle';
import { applyAction, isValidTarget, newGame, surrender } from '../src/engine/round';
import { planTurn } from '../src/engine/ai/simples';
import { Rng } from '../src/engine/rng';
import { HAND_MAX, HERO_HP, MAX_MANA, type GameEvent } from '../src/engine/types';
import { blank, give, ofType, put } from './ajuda';

const events = (s: Parameters<typeof resolveBattle>[0]) => resolveBattle(s).frames.flatMap(f => f.events);

describe('Ordem da Batalha', () => {
  it('Revelação → suporte → dano → chegadas → enfrentamento → nova rodada', () => {
    const s = blank();
    put(s, 'p', 0, 0, { hp: 9 });
    put(s, 'e', 1, 0, { hp: 9 });
    // rival invoca em segredo uma criatura com chegada; jogador prepara suporte e dano
    let r = applyAction(s, 'e', { t: 'summon', hand: give(s, 'e', 'aries04'), l: 2, d: 0 });
    if (!r.ok) throw new Error();
    let st = r.state;
    r = applyAction(st, 'p', { t: 'spell', hand: give(st, 'p', 'touros4'), tg: { side: 'e', l: 1, d: 0 } });
    if (!r.ok) throw new Error(); st = r.state;
    r = applyAction(st, 'p', { t: 'spell', hand: give(st, 'p', 'touros1'), tg: { side: 'p', l: 0, d: 0 } });
    if (!r.ok) throw new Error(); st = r.state;

    const ev = events(st);
    const idx = (pred: (e: GameEvent) => boolean) => ev.findIndex(pred);
    const reveal = idx(e => e.t === 'Reveal');
    const support = idx(e => e.t === 'SpellResolved' && e.cid === 'touros1');
    const damage = idx(e => e.t === 'SpellResolved' && e.cid === 'touros4');
    const arrival = idx(e => e.t === 'ArrivalResolved');
    const row = idx(e => e.t === 'RowStarted');
    const next = idx(e => e.t === 'RoundStarted');
    expect([reveal, support, damage, arrival, row, next].every(x => x >= 0)).toBe(true);
    expect(reveal).toBeLessThan(support);
    expect(support).toBeLessThan(damage);
    expect(damage).toBeLessThan(arrival);
    expect(arrival).toBeLessThan(row);
    expect(row).toBeLessThan(next);
  });

  it('criaturas invocadas em segredo ficam escondidas até a Revelação', () => {
    const s = blank();
    const r = applyAction(s, 'e', { t: 'summon', hand: give(s, 'e', 'aries10'), l: 0, d: 0 });
    if (!r.ok) throw new Error();
    expect(r.state.e.board[0][0]!.hidden).toBe(true);
    const b = resolveBattle(r.state);
    expect(b.frames[0].kind).toBe('reveal');
    expect(b.frames[0].state!.e.board[0][0]!.hidden).toBe(false);
  });

  it('chegadas: jogador da esquerda primeiro, depois o rival, em ordem de leitura', () => {
    const s = blank();
    let st = s;
    for (const [side, cid, l, d] of [['e', 'aries04', 0, 0], ['p', 'aries04', 2, 0], ['p', 'touro04', 0, 1]] as const) {
      const r = applyAction(st, side, { t: 'summon', hand: give(st, side, cid), l, d });
      if (!r.ok) throw new Error(); st = r.state;
    }
    const arr = ofType(events(st), 'ArrivalResolved').map(e => `${e.side}${e.l}${e.d}`);
    expect(arr).toEqual(['p01', 'p20', 'e00']);
  });
});

describe('Enfrentamento por fileira', () => {
  it('a 1ª criatura de cada lado ataca junto, não importa a casa; extras atacam sozinhas', () => {
    const s = blank();
    put(s, 'p', 0, 2, { atk: 1, hp: 20, cid: 'aries01' }); // única do jogador, no fundo
    put(s, 'e', 0, 0, { atk: 1, hp: 20, cid: 'touro01' });
    put(s, 'e', 0, 1, { atk: 1, hp: 20, cid: 'touro02' });
    const b = resolveBattle(s);
    const steps = b.frames.filter(f => f.kind === 'step-start');
    expect(steps).toHaveLength(2);
    expect(steps[0].active).toEqual([{ side: 'p', l: 0, d: 2 }, { side: 'e', l: 0, d: 0 }]);
    expect(steps[1].active).toEqual([{ side: 'e', l: 0, d: 1 }]);
  });

  it('a próxima fileira só começa quando a anterior termina', () => {
    const s = blank();
    put(s, 'p', 0, 0, { hp: 9 }); put(s, 'p', 0, 1, { hp: 9 });
    put(s, 'e', 1, 0, { hp: 9 });
    put(s, 'p', 2, 0, { hp: 9 });
    const b = resolveBattle(s);
    const rows = b.frames.filter(f => f.kind === 'step-start').map(f => f.active![0].l);
    expect(rows).toEqual([0, 0, 1, 2]);
  });

  it('ataques do mesmo passo são simultâneos: as duas morrem e as duas causam dano', () => {
    const s = blank();
    put(s, 'p', 0, 0, { atk: 3, hp: 3, kw: ['vampirico'] });
    put(s, 'e', 0, 0, { atk: 3, hp: 3, kw: ['vampirico'] });
    s.p.hp = 10; s.e.hp = 10;
    const r = resolveBattle(s, { record: false }).state;
    expect(r.p.board[0][0]).toBeNull();
    expect(r.e.board[0][0]).toBeNull();
    expect(r.p.hp).toBe(13);
    expect(r.e.hp).toBe(13);
  });

  it('criatura que morreu num passo anterior não ataca', () => {
    const s = blank();
    put(s, 'p', 1, 0, { atk: 5, hp: 9, kw: ['distancia'] }); // passo 1: mata a do fundo do rival
    put(s, 'e', 1, 0, { atk: 1, hp: 9 });
    put(s, 'e', 1, 1, { atk: 7, hp: 1 }); // seria a 2ª do rival a atacar, no passo 2
    const ev = events(s);
    expect(ofType(ev, 'Attack').filter(e => e.side === 'e')).toHaveLength(1);
    expect(resolveBattle(s, { record: false }).state.p.board[1][0]!.hp).toBe(8);
  });

  it('fileira inimiga vazia: dano no herói', () => {
    const s = blank();
    put(s, 'p', 1, 1, { atk: 4 });
    expect(resolveBattle(s, { record: false }).state.e.hp).toBe(HERO_HP - 4);
  });
});

describe('Vitória', () => {
  it('herói a 0 perde', () => {
    const s = blank();
    s.e.hp = 2;
    put(s, 'p', 0, 0, { atk: 2 });
    const r = resolveBattle(s, { record: false }).state;
    expect(r.phase).toBe('over');
    expect(r.result).toBe('p');
  });
  it('os dois a 0 no mesmo passo = empate', () => {
    const s = blank();
    s.e.hp = 2; s.p.hp = 2;
    // passo simultâneo: cada uma mata a outra e a sobra do Perfurar vai no herói
    put(s, 'p', 0, 0, { atk: 3, hp: 1, kw: ['perfurar'] });
    put(s, 'e', 0, 0, { atk: 3, hp: 1, kw: ['perfurar'] });
    expect(resolveBattle(s, { record: false }).state.result).toBe('draw');
  });
  it('a partida acaba no meio do enfrentamento: fileiras seguintes não atacam', () => {
    const s = blank();
    s.e.hp = 2; s.p.hp = 2;
    put(s, 'p', 0, 0, { atk: 2 });
    put(s, 'e', 1, 0, { atk: 2 });
    expect(resolveBattle(s, { record: false }).state.result).toBe('p');
  });
  it('magias de dano resolvem uma por uma: a primeira já pode terminar a partida', () => {
    let st = blank();
    st.e.hp = 2; st.p.hp = 2;
    for (const side of ['e', 'p'] as const) {
      const r = applyAction(st, side, { t: 'spell', hand: give(st, side, 'sagitarios3'), tg: { side: side === 'p' ? 'e' : 'p', l: 0, d: 0 } });
      if (!r.ok) throw new Error(); st = r.state;
    }
    expect(resolveBattle(st, { record: false }).state.result).toBe('p');
  });
  it('empate quando o veneno/deck derrubam os dois no início da rodada', () => {
    const s = blank();
    s.p.hp = 2; s.e.hp = 2;
    s.p.deck = []; s.e.deck = [];
    const r = resolveBattle(s, { record: false }).state;
    expect(r.result).toBe('draw');
  });
});

describe('Rodada: mana, compra, queimar', () => {
  it('mana máxima +1 por rodada até 9 e recarga total', () => {
    let { state } = newGame({ pSign: 'aries', eSign: 'touro', seed: 3, record: false });
    expect(state.p.max).toBe(1);
    for (let i = 0; i < 12 && state.phase === 'plan'; i++) {
      state.p.board = [[null, null, null], [null, null, null], [null, null, null]];
      state.e.board = [[null, null, null], [null, null, null], [null, null, null]];
      state = resolveBattle(state, { record: false }).state;
    }
    expect(state.p.max).toBe(MAX_MANA);
    expect(state.p.mana).toBe(MAX_MANA);
  });
  it('mão inicial de 3, e compra 1 no início da rodada', () => {
    const { state } = newGame({ pSign: 'aries', eSign: 'touro', seed: 3, record: false });
    expect(state.p.hand).toHaveLength(4);
    expect(state.p.deck).toHaveLength(26);
  });
  it('queimar: +1 de mana, uma vez por rodada', () => {
    const s = blank();
    s.p.mana = 2;
    give(s, 'p', 'aries01'); give(s, 'p', 'aries02');
    const r = applyAction(s, 'p', { t: 'burn', hand: 0 });
    if (!r.ok) throw new Error();
    expect(r.state.p.mana).toBe(3);
    expect(r.state.p.hand).toHaveLength(1);
    expect(applyAction(r.state, 'p', { t: 'burn', hand: 0 })).toMatchObject({ ok: false, reason: 'queimou' });
  });
  it('mão cheia: a carta comprada é descartada', () => {
    const s = blank();
    for (let i = 0; i < HAND_MAX; i++) give(s, 'p', 'aries01');
    const deck = s.p.deck.length;
    const ev = events(s);
    expect(ofType(ev, 'DrawDiscarded').filter(e => e.side === 'p')).toHaveLength(1);
    expect(resolveBattle(s, { record: false }).state.p.deck).toHaveLength(deck - 1);
  });
  it('deck vazio: herói perde 2', () => {
    const s = blank();
    s.p.deck = [];
    expect(resolveBattle(s, { record: false }).state.p.hp).toBe(HERO_HP - 2);
  });
  it('invocar só em casa vazia do próprio lado', () => {
    const s = blank();
    put(s, 'p', 0, 0);
    const i = give(s, 'p', 'aries01');
    expect(isValidTarget(s, 'p', i, { side: 'p', l: 0, d: 0 })).toBe(false);
    expect(isValidTarget(s, 'p', i, { side: 'e', l: 0, d: 1 })).toBe(false);
    expect(isValidTarget(s, 'p', i, { side: 'p', l: 0, d: 1 })).toBe(true);
  });
});

describe('IA', () => {
  it('não enxerga as criaturas que o outro lado invocou em segredo', () => {
    const s = blank();
    s.e.mana = 0;
    const r = applyAction(s, 'p', { t: 'summon', hand: give(s, 'p', 'aries25'), l: 0, d: 0 });
    if (!r.ok) throw new Error();
    // com uma criatura "visível", a fileira 0 viraria alvo de ameaça; escondida, não muda nada
    const a = planTurn({ ...r.state, e: { ...r.state.e, mana: 9 } }, 'e', new Rng(1));
    const st0 = structuredClone(r.state);
    st0.p.board[0][0] = null;
    const b = planTurn({ ...st0, e: { ...st0.e, mana: 9 } }, 'e', new Rng(1));
    expect(a.actions).toEqual(b.actions);
  });
  it('partida IA vs IA termina e é determinística', () => {
    const play = () => {
      let { state } = newGame({ pSign: 'gemeos', eSign: 'virgem', seed: 42, record: false });
      const rp = new Rng(1), re = new Rng(2);
      while (state.phase === 'plan' && state.round < 100) {
        state = planTurn(state, 'p', rp).state;
        state = planTurn(state, 'e', re).state;
        state = resolveBattle(state, { record: false }).state;
      }
      return state;
    };
    const a = play(), b = play();
    expect(a.phase).toBe('over');
    expect(a).toEqual(b);
  });
});

describe('Desistir', () => {
  it('quem desiste perde na hora e o estado original não muda', () => {
    const s = blank();
    const r = surrender(s, 'p');
    if (!r.ok) throw new Error();
    expect(r.state.phase).toBe('over');
    expect(r.state.result).toBe('e');
    expect(r.state.surrendered).toBe('p');
    expect(r.events).toContainEqual({ t: 'GameOver', result: 'e', surrendered: 'p' });
    expect(s.phase).toBe('plan');
    expect(surrender(r.state, 'e').ok).toBe(false);
  });
});
