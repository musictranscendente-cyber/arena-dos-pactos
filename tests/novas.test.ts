// Habilidades exclusivas de Áries, Touro, Libra, Escorpião e Sagitário.
import { describe, expect, it } from 'vitest';
import { attack, damageUnit } from '../src/engine/keywords';
import { blank, ctxOf, ofType, put } from './ajuda';

describe('🐏 Arremetida', () => {
  it('empurra o alvo uma casa para trás quando há espaço', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 2, kw: ['arremetida'] });
    const t = put(s, 'e', 0, 0, { hp: 5 });
    attack(ctx, 'p', 0, 0, a);
    expect(s.e.board[0][0]).toBeNull();
    expect(s.e.board[0][1]).toBe(t);
    expect(t.hp).toBe(3);
    expect(ofType(ctx.flush(), 'UnitPushed')).toEqual([{ t: 'UnitPushed', side: 'e', l: 0, from: 0, to: 1, cid: t.cid }]);
  });
  it('sem casa vazia atrás, causa +1 de dano e não empurra', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 2, kw: ['arremetida'] });
    const t = put(s, 'e', 0, 0, { hp: 9 });
    put(s, 'e', 0, 1, { hp: 9 });
    attack(ctx, 'p', 0, 0, a);
    expect(s.e.board[0][0]).toBe(t);
    expect(t.hp).toBe(6);
  });
  it('alvo na casa do fundo também leva +1', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 2, kw: ['arremetida'] });
    const t = put(s, 'e', 0, 2, { hp: 9 });
    attack(ctx, 'p', 0, 0, a);
    expect(t.hp).toBe(6);
  });
  it('se o alvo morre, nada é empurrado', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 3, kw: ['arremetida'] });
    put(s, 'e', 0, 0, { hp: 2 });
    attack(ctx, 'p', 0, 0, a);
    expect(s.e.board[0]).toEqual([null, null, null]);
    expect(ofType(ctx.flush(), 'UnitPushed')).toHaveLength(0);
  });
});

describe('🗿 Inabalável', () => {
  it('nunca recebe mais que 3 de dano de uma vez', () => {
    const s = blank(); const ctx = ctxOf(s);
    const t = put(s, 'e', 0, 0, { hp: 10, kw: ['inabalavel'] });
    damageUnit(ctx, 'e', 0, 0, 9);
    expect(t.hp).toBe(7);
    damageUnit(ctx, 'e', 0, 0, 2);
    expect(t.hp).toBe(5);
  });
  it('a sobra do Perfurar conta a partir do dano limitado', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 8, kw: ['perfurar'] });
    put(s, 'e', 0, 0, { hp: 2, kw: ['inabalavel'] });
    const atras = put(s, 'e', 0, 1, { hp: 9 });
    attack(ctx, 'p', 0, 0, a);
    expect(s.e.board[0][0]).toBeNull();
    expect(atras.hp).toBe(8); // 3 aplicados, 2 de vida: sobra 1
  });
});

describe('⚖️ Julgamento', () => {
  it('dano dobrado em quem tem mais ataque', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 2, kw: ['julgamento'] });
    const t = put(s, 'e', 0, 0, { atk: 5, hp: 9 });
    attack(ctx, 'p', 0, 0, a);
    expect(t.hp).toBe(5);
  });
  it('dano normal em quem tem ataque igual ou menor', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 2, kw: ['julgamento'] });
    const t = put(s, 'e', 0, 0, { atk: 2, hp: 9 });
    attack(ctx, 'p', 0, 0, a);
    expect(t.hp).toBe(7);
  });
  it('conta a Liderança dos aliados do alvo', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 2, kw: ['julgamento'] });
    const t = put(s, 'e', 0, 0, { atk: 2, hp: 9 });
    put(s, 'e', 0, 1, { atk: 1, hp: 9, kw: ['lideranca'] });
    attack(ctx, 'p', 0, 0, a);
    expect(t.hp).toBe(5);
  });
});

describe('🦂 Ferrão Final', () => {
  it('quem mata com um ataque leva 3 de dano', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 5, hp: 4 });
    put(s, 'e', 0, 0, { hp: 2, kw: ['ferrao'] });
    attack(ctx, 'p', 0, 0, a);
    expect(s.e.board[0][0]).toBeNull();
    expect(a.hp).toBe(1);
  });
  it('pode matar quem matou', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 5, hp: 3 });
    put(s, 'e', 0, 0, { hp: 2, kw: ['ferrao'] });
    attack(ctx, 'p', 0, 0, a);
    expect(s.p.board[0][0]).toBeNull();
  });
  it('magia (sem criatura de origem) não ativa o ferrão', () => {
    const s = blank(); const ctx = ctxOf(s);
    put(s, 'e', 0, 0, { hp: 2, kw: ['ferrao'] });
    const vizinho = put(s, 'p', 0, 0, { hp: 3 });
    damageUnit(ctx, 'e', 0, 0, 5);
    expect(vizinho.hp).toBe(3);
  });
  it('dano que não mata não ativa', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 1, hp: 4 });
    put(s, 'e', 0, 0, { hp: 5, kw: ['ferrao'] });
    attack(ctx, 'p', 0, 0, a);
    expect(a.hp).toBe(4);
  });
});

describe('🏹 Mira Certeira', () => {
  it('atravessa o Escudo (o escudo continua lá)', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 3, kw: ['mira'] });
    const t = put(s, 'e', 0, 0, { hp: 9, kw: ['escudo'] });
    attack(ctx, 'p', 0, 0, a);
    expect(t.hp).toBe(6);
    expect(t.shield).toBe(true);
  });
  it('atravessa a Carapaça', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 3, kw: ['mira'] });
    const t = put(s, 'e', 0, 0, { hp: 9, kw: ['carapaca'] });
    attack(ctx, 'p', 0, 0, a);
    expect(t.hp).toBe(6);
  });
  it('sem Mira, Escudo e Carapaça funcionam normalmente', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 3 });
    const t = put(s, 'e', 0, 0, { hp: 9, kw: ['carapaca'] });
    attack(ctx, 'p', 0, 0, a);
    expect(t.hp).toBe(7);
  });
});
