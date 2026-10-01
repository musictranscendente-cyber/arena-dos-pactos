import { describe, expect, it } from 'vitest';
import { resolveBattle } from '../src/engine/battle';
import { applyAction } from '../src/engine/round';
import { HERO_HP, type GameState, type Side, type Target } from '../src/engine/types';
import { blank, give, ofType, put } from './ajuda';

/** Prepara a magia `cid` do lado `side` no alvo `tg` e resolve a Batalha. */
function cast(s: GameState, side: Side, cid: string, tg: Target) {
  const i = give(s, side, cid);
  const r = applyAction(s, side, { t: 'spell', hand: i, tg });
  if (!r.ok) throw new Error(`magia recusada: ${r.reason}`);
  return r.state;
}
const battle = (s: GameState) => resolveBattle(s);
const allEvents = (s: GameState) => battle(s).frames.flatMap(f => f.events);

describe('Magias: cada tipo', () => {
  it('buff: +a/+h e aumenta a vida máxima', () => {
    const s = blank();
    put(s, 'p', 0, 2, { atk: 1, hp: 2 });
    const r = battle(cast(s, 'p', 'touros2', { side: 'p', l: 0, d: 2 })).state; // +1/+3
    const u = r.p.board[0][2]!;
    expect([u.atk, u.hp, u.max]).toEqual([2, 5, 5]);
  });
  it('shield: dá Escudo', () => {
    const s = blank();
    put(s, 'p', 0, 0, { hp: 2 });
    put(s, 'e', 0, 0, { atk: 5, hp: 9 });
    const r = battle(cast(s, 'p', 'touros1', { side: 'p', l: 0, d: 0 })).state;
    expect(r.p.board[0][0]).not.toBeNull(); // o escudo segurou os 5 de dano
  });
  it('heal: cura v do herói, até 30', () => {
    const s = blank();
    s.p.hp = 20;
    expect(battle(cast(s, 'p', 'touros3', { side: 'p', l: 2, d: 2 })).state.p.hp).toBe(25);
    const s2 = blank();
    s2.p.hp = 28;
    expect(battle(cast(s2, 'p', 'touros3', { side: 'p', l: 0, d: 0 })).state.p.hp).toBe(HERO_HP);
  });
  it('draw: compra v cartas', () => {
    const s = cast(blank(), 'p', 'gemeoss4', { side: 'p', l: 0, d: 0 });
    const spellFrame = battle(s).frames.find(f => f.kind === 'spell')!;
    expect(ofType(spellFrame.events, 'CardDrawn')).toHaveLength(2);
  });
  it('dmg: v de dano na criatura inimiga', () => {
    const s = blank();
    put(s, 'e', 1, 2, { hp: 5 });
    const ev = allEvents(cast(s, 'p', 'touros4', { side: 'e', l: 1, d: 2 }));
    expect(ofType(ev, 'Damage')[0]).toMatchObject({ side: 'e', l: 1, d: 2, amount: 3 });
  });
  it('poison: envenena', () => {
    const s = blank();
    put(s, 'e', 0, 0, { hp: 5 });
    const r = battle(cast(s, 'p', 'escorpiaos1', { side: 'e', l: 0, d: 0 })).state;
    expect(r.e.board[0][0]!.poison).toBe(true);
    expect(r.e.board[0][0]!.hp).toBe(4); // já perdeu 1 no início da rodada seguinte
  });
  it('lane: v de dano em todas as criaturas da fileira inimiga', () => {
    const s = blank();
    const a = put(s, 'e', 2, 0, { hp: 5 }), b = put(s, 'e', 2, 2, { hp: 5 }), c = put(s, 'e', 1, 0, { hp: 5 });
    const ev = allEvents(cast(s, 'p', 'ariess3', { side: 'e', l: 2, d: 1 }));
    const dmg = ofType(ev, 'Damage').filter(e => e.side === 'e');
    expect(dmg.filter(e => e.l === 2)).toHaveLength(2);
    expect(dmg.filter(e => e.l === 1)).toHaveLength(0);
    void a; void b; void c;
  });
  it('face: v de dano no herói inimigo', () => {
    const r = battle(cast(blank(), 'p', 'sagitarios3', { side: 'e', l: 0, d: 0 })).state;
    expect(r.e.hp).toBe(HERO_HP - 3);
  });
});

describe('Magias: alvos e custo', () => {
  it('paga a mana na hora de preparar', () => {
    const s = blank();
    s.p.mana = 5;
    const r = cast(s, 'p', 'sagitarios3', { side: 'e', l: 0, d: 0 });
    expect(r.p.mana).toBe(3);
    expect(r.p.queue).toHaveLength(1);
  });
  it('sem mana, recusa', () => {
    const s = blank();
    s.p.mana = 1;
    const i = give(s, 'p', 'sagitarios3');
    expect(applyAction(s, 'p', { t: 'spell', hand: i, tg: { side: 'e', l: 0, d: 0 } })).toMatchObject({ ok: false, reason: 'mana' });
  });
  it('só mira criatura que já estava em campo antes desta rodada', () => {
    const s = blank();
    put(s, 'e', 0, 0, { hp: 5, entered: 2 }); // entrou nesta rodada
    const i = give(s, 'p', 'touros4');
    expect(applyAction(s, 'p', { t: 'spell', hand: i, tg: { side: 'e', l: 0, d: 0 } })).toMatchObject({ ok: false, reason: 'alvo' });
  });
  it('lado errado é recusado (dano no próprio lado, buff no inimigo)', () => {
    const s = blank();
    put(s, 'p', 0, 0, { hp: 5 });
    put(s, 'e', 0, 0, { hp: 5 });
    const d = give(s, 'p', 'touros4');
    expect(applyAction(s, 'p', { t: 'spell', hand: d, tg: { side: 'p', l: 0, d: 0 } }).ok).toBe(false);
    const b = give(s, 'p', 'touros2');
    expect(applyAction(s, 'p', { t: 'spell', hand: b, tg: { side: 'e', l: 0, d: 0 } }).ok).toBe(false);
  });
  it('magia cujo alvo sumiu é perdida', () => {
    const s = blank();
    put(s, 'e', 0, 0, { hp: 2 });
    let st = cast(s, 'p', 'touros4', { side: 'e', l: 0, d: 0 }); // 3 de dano: mata
    st = cast(st, 'p', 'escorpiaos1', { side: 'e', l: 0, d: 0 }); // veneno: alvo já morreu
    const ev = allEvents(st);
    expect(ofType(ev, 'SpellFizzled')).toHaveLength(1);
  });
  it('magia perde o alvo se a criatura morreu e outra nova ocupou a casa', () => {
    const s = blank();
    put(s, 'e', 0, 0, { hp: 2 });
    let st = cast(s, 'p', 'touros4', { side: 'e', l: 0, d: 0 });
    st = cast(st, 'p', 'escorpiaos1', { side: 'e', l: 0, d: 0 });
    // não há como a casa ser reocupada antes das magias pela regra, mas a checagem existe:
    st.e.board[0][0]!.entered = st.round;
    const ev = allEvents(st);
    expect(ofType(ev, 'SpellFizzled')).toHaveLength(2);
  });
});

describe('Magias: ordem de resolução', () => {
  it('suporte (dos dois lados) antes do dano: o Escudo do rival chega antes do meu dano', () => {
    const s = blank();
    put(s, 'e', 0, 0, { hp: 2 });
    let st = cast(s, 'p', 'touros4', { side: 'e', l: 0, d: 0 }); // dano 3
    st = cast(st, 'e', 'touros1', { side: 'e', l: 0, d: 0 }); // escudo do rival
    const resolved = ofType(allEvents(st), 'SpellResolved');
    expect(resolved.map(e => e.cid)).toEqual(['touros1', 'touros4']);
    expect(battle(st).state.e.board[0][0]).not.toBeNull();
  });
  it('dentro do mesmo grupo, o jogador da esquerda resolve primeiro', () => {
    const s = blank();
    put(s, 'e', 0, 0, { hp: 9 });
    let st = cast(s, 'e', 'sagitarios3', { side: 'p', l: 0, d: 0 });
    st = cast(st, 'p', 'gemeoss4', { side: 'p', l: 0, d: 0 });
    st = cast(st, 'e', 'touros3', { side: 'e', l: 0, d: 0 });
    st = cast(st, 'p', 'touros4', { side: 'e', l: 0, d: 0 });
    const order = ofType(allEvents(st), 'SpellResolved').map(e => `${e.side}:${e.cid}`);
    expect(order).toEqual(['p:gemeoss4', 'e:touros3', 'p:touros4', 'e:sagitarios3']);
  });
  it('dano da magia pode vencer a partida antes do enfrentamento', () => {
    const s = blank();
    s.e.hp = 3;
    put(s, 'e', 0, 0, { atk: 50 });
    const r = battle(cast(s, 'p', 'sagitarios3', { side: 'e', l: 0, d: 0 }));
    expect(r.state.result).toBe('p');
    expect(r.state.p.hp).toBe(HERO_HP);
  });
});
