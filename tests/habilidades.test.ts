import { describe, expect, it } from 'vitest';
import { attack, damageUnit, effAtk } from '../src/engine/keywords';
import { applyAction, newGame } from '../src/engine/round';
import { resolveBattle } from '../src/engine/battle';
import { costOf } from '../src/engine/state';
import { HAND_MAX, HERO_HP } from '../src/engine/types';
import { card } from '../src/data/cards';
import { blank, ctxOf, give, ofType, put } from './ajuda';

describe('🛡️ Escudo', () => {
  it('anula completamente o primeiro dano e some', () => {
    const s = blank(); const ctx = ctxOf(s);
    const u = put(s, 'e', 0, 0, { hp: 3, kw: ['escudo'] });
    expect(damageUnit(ctx, 'e', 0, 0, 10)).toEqual({ dealt: 0, overflow: 0 });
    expect(u.hp).toBe(3);
    expect(u.shield).toBe(false);
    damageUnit(ctx, 'e', 0, 0, 2);
    expect(u.hp).toBe(1);
  });
  it('é checado antes da Carapaça', () => {
    const s = blank(); const ctx = ctxOf(s);
    const u = put(s, 'e', 0, 0, { hp: 5, kw: ['escudo', 'carapaca'] });
    damageUnit(ctx, 'e', 0, 0, 3);
    expect(u.hp).toBe(5);
    expect(u.shield).toBe(false);
    damageUnit(ctx, 'e', 0, 0, 3);
    expect(u.hp).toBe(3);
  });
});

describe('🐚 Carapaça', () => {
  it('reduz todo dano em 1', () => {
    const s = blank(); const ctx = ctxOf(s);
    const u = put(s, 'e', 0, 0, { hp: 5, kw: ['carapaca'] });
    damageUnit(ctx, 'e', 0, 0, 3);
    expect(u.hp).toBe(3);
  });
  it('dano de 1 vira 0 e não causa nada', () => {
    const s = blank(); const ctx = ctxOf(s);
    const u = put(s, 'e', 0, 0, { hp: 2, kw: ['carapaca', 'furia'] });
    damageUnit(ctx, 'e', 0, 0, 1);
    expect(u.hp).toBe(2);
    expect(u.atk).toBe(1); // nem ativa Fúria
    expect(ofType(ctx.flush(), 'ArmorBlocked')).toHaveLength(1);
  });
});

describe('🗡️ Perfurar', () => {
  it('o dano que sobra passa para a próxima criatura da fileira', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 5, kw: ['perfurar'] });
    put(s, 'e', 0, 0, { hp: 2 });
    const back = put(s, 'e', 0, 2, { hp: 5 });
    attack(ctx, 'p', 0, 0, a);
    expect(s.e.board[0][0]).toBeNull();
    expect(back.hp).toBe(2);
    expect(s.e.hp).toBe(HERO_HP);
  });
  it('sem próxima criatura, a sobra vai para o herói', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 1, 0, { atk: 5, kw: ['perfurar'] });
    put(s, 'e', 1, 1, { hp: 2 });
    attack(ctx, 'p', 1, 0, a);
    expect(s.e.hp).toBe(HERO_HP - 3);
  });
  it('Escudo do alvo segura tudo (não sobra nada)', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 5, kw: ['perfurar'] });
    put(s, 'e', 0, 0, { hp: 1, kw: ['escudo'] });
    attack(ctx, 'p', 0, 0, a);
    expect(s.e.hp).toBe(HERO_HP);
    expect(s.e.board[0][0]).not.toBeNull();
  });
  it('sem Perfurar, a sobra se perde', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 5 });
    put(s, 'e', 0, 0, { hp: 1 });
    attack(ctx, 'p', 0, 0, a);
    expect(s.e.hp).toBe(HERO_HP);
  });
});

describe('🎯 Distância e alvo do ataque', () => {
  it('normal: ataca a primeira inimiga da frente para o fundo', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 2, { atk: 1 });
    const mid = put(s, 'e', 0, 1, { hp: 3 });
    const back = put(s, 'e', 0, 2, { hp: 3 });
    attack(ctx, 'p', 0, 2, a);
    expect(mid.hp).toBe(2);
    expect(back.hp).toBe(3);
  });
  it('Distância: ataca a mais ao fundo', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 1, kw: ['distancia'] });
    const front = put(s, 'e', 0, 0, { hp: 3 });
    const back = put(s, 'e', 0, 1, { hp: 3 });
    attack(ctx, 'p', 0, 0, a);
    expect(front.hp).toBe(3);
    expect(back.hp).toBe(2);
  });
  it('fileira inimiga vazia: dano direto no herói', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 2, 0, { atk: 4 });
    put(s, 'e', 0, 0, { hp: 3 }); // outra fileira não conta
    attack(ctx, 'p', 2, 0, a);
    expect(s.e.hp).toBe(HERO_HP - 4);
  });
  it('ataque 0 não faz nada', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 0 });
    attack(ctx, 'p', 0, 0, a);
    expect(s.e.hp).toBe(HERO_HP);
  });
});

describe('🩸 Vampírico', () => {
  it('cura o herói no valor do dano causado (limitado à vida do alvo)', () => {
    const s = blank(); const ctx = ctxOf(s);
    s.p.hp = 10;
    const a = put(s, 'p', 0, 0, { atk: 5, kw: ['vampirico'] });
    put(s, 'e', 0, 0, { hp: 2 });
    attack(ctx, 'p', 0, 0, a);
    expect(s.p.hp).toBe(12);
  });
  it('conta o dano no herói e não passa de 30', () => {
    const s = blank(); const ctx = ctxOf(s);
    s.p.hp = 28;
    const a = put(s, 'p', 0, 0, { atk: 5, kw: ['vampirico'] });
    attack(ctx, 'p', 0, 0, a);
    expect(s.p.hp).toBe(HERO_HP);
  });
  it('soma o dano do Perfurar', () => {
    const s = blank(); const ctx = ctxOf(s);
    s.p.hp = 10;
    const a = put(s, 'p', 0, 0, { atk: 5, kw: ['vampirico', 'perfurar'] });
    put(s, 'e', 0, 0, { hp: 2 });
    attack(ctx, 'p', 0, 0, a);
    expect(s.p.hp).toBe(15);
  });
  it('dano bloqueado por Escudo não cura', () => {
    const s = blank(); const ctx = ctxOf(s);
    s.p.hp = 10;
    const a = put(s, 'p', 0, 0, { atk: 5, kw: ['vampirico'] });
    put(s, 'e', 0, 0, { hp: 2, kw: ['escudo'] });
    attack(ctx, 'p', 0, 0, a);
    expect(s.p.hp).toBe(10);
  });
});

describe('🧪 Veneno', () => {
  it('envenena quem sobrevive ao ataque', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 1, kw: ['veneno'] });
    const t = put(s, 'e', 0, 0, { hp: 3 });
    attack(ctx, 'p', 0, 0, a);
    expect(t.poison).toBe(true);
  });
  it('perde 1 de vida no início de cada rodada, e pode morrer disso', () => {
    const s = blank();
    put(s, 'e', 0, 0, { hp: 3 }).poison = true;
    put(s, 'e', 1, 0, { hp: 1 }).poison = true;
    const r = resolveBattle(s, { record: false });
    // 3 de vida: não ataca ninguém do outro lado vazio... mas toma 1 do veneno no início da rodada
    expect(r.state.e.board[0][0]!.hp).toBe(2);
    expect(r.state.e.board[1][0]).toBeNull();
  });
  it('Escudo impede o envenenamento pelo ataque', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 1, kw: ['veneno'] });
    const t = put(s, 'e', 0, 0, { hp: 3, kw: ['escudo'] });
    attack(ctx, 'p', 0, 0, a);
    expect(t.poison).toBe(false);
  });
});

describe('🌀 Corrente', () => {
  it('magias custam 1 a menos, criaturas não, e não acumula', () => {
    const s = blank();
    expect(costOf(s.p, 'ariess4')).toBe(3);
    put(s, 'p', 0, 0, { kw: ['corrente'] });
    put(s, 'p', 1, 0, { kw: ['corrente'] });
    expect(costOf(s.p, 'ariess4')).toBe(2);
    expect(costOf(s.p, 'aries10')).toBe(3);
    expect(costOf(s.e, 'ariess4')).toBe(3);
  });
  it('custo nunca fica negativo', () => {
    const s = blank();
    put(s, 'p', 0, 0, { kw: ['corrente'] });
    expect(costOf(s.p, 'gemeoss3')).toBe(0); // custa 1
  });
  it('vale a partir do momento em que a Corrente é invocada', () => {
    const s = blank();
    s.p.mana = 3;
    put(s, 'p', 2, 0, { atk: 1, hp: 1 }); // alvo antigo para o +3/+1
    give(s, 'p', 'aquario01'); // Corrente, custo 1
    give(s, 'p', 'ariess4'); // magia custo 3
    let r = applyAction(s, 'p', { t: 'summon', hand: 0, l: 0, d: 0 });
    if (!r.ok) throw new Error(r.reason);
    expect(r.state.p.mana).toBe(2);
    r = applyAction(r.state, 'p', { t: 'spell', hand: 0, tg: { side: 'p', l: 2, d: 0 } });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.p.mana).toBe(0);
  });
});

describe('💢 Fúria', () => {
  it('ganha +1 de ataque quando sobrevive a um dano', () => {
    const s = blank(); const ctx = ctxOf(s);
    const u = put(s, 'e', 0, 0, { atk: 2, hp: 5, kw: ['furia'] });
    damageUnit(ctx, 'e', 0, 0, 1);
    damageUnit(ctx, 'e', 0, 0, 1);
    expect(u.atk).toBe(4);
  });
  it('não ganha quando o Escudo segura o dano', () => {
    const s = blank(); const ctx = ctxOf(s);
    const u = put(s, 'e', 0, 0, { atk: 2, hp: 5, kw: ['furia', 'escudo'] });
    damageUnit(ctx, 'e', 0, 0, 1);
    expect(u.atk).toBe(2);
  });
});

describe('💨 Investida', () => {
  it('ataca na fase de chegada, antes do enfrentamento', () => {
    const s = blank();
    s.p.hand = [];
    give(s, 'p', 'aries01'); // 1/1 Investida
    const r = applyAction(s, 'p', { t: 'summon', hand: 0, l: 0, d: 0 });
    if (!r.ok) throw new Error();
    expect(r.state.p.board[0][0]!.pending).toBe(true);
    const b = resolveBattle(r.state);
    const arrivalFrame = b.frames.find(f => f.kind === 'arrival')!;
    expect(ofType(arrivalFrame.events, 'Attack')).toHaveLength(1);
    // ataca de novo no enfrentamento: 1 (chegada) + 1 (fileira)
    expect(b.state.e.hp).toBe(HERO_HP - 2);
  });
});

describe('📣 Liderança', () => {
  it('dá +1 aos outros aliados da mesma fileira, não a si mesma nem a outras fileiras', () => {
    const s = blank();
    const lider = put(s, 'p', 0, 0, { atk: 2, kw: ['lideranca'] });
    const aliado = put(s, 'p', 0, 1, { atk: 2 });
    const outro = put(s, 'p', 1, 0, { atk: 2 });
    expect(effAtk(s.p.board, 0, lider)).toBe(2);
    expect(effAtk(s.p.board, 0, aliado)).toBe(3);
    expect(effAtk(s.p.board, 1, outro)).toBe(2);
  });
  it('duas Lideranças somam +2 para os outros', () => {
    const s = blank();
    put(s, 'p', 0, 0, { kw: ['lideranca'] });
    put(s, 'p', 0, 1, { kw: ['lideranca'] });
    const a = put(s, 'p', 0, 2, { atk: 1 });
    expect(effAtk(s.p.board, 0, a)).toBe(3);
  });
  it('o bônus entra no dano do ataque', () => {
    const s = blank(); const ctx = ctxOf(s);
    put(s, 'p', 0, 1, { kw: ['lideranca'] });
    const a = put(s, 'p', 0, 0, { atk: 2 });
    attack(ctx, 'p', 0, 0, a);
    expect(s.e.hp).toBe(HERO_HP - 3);
  });
});

describe('💚 Cura', () => {
  it('no início da rodada cura 2 dos aliados da mesma fileira (inclusive ela), até a vida máxima', () => {
    const s = blank();
    const c = put(s, 'p', 0, 2, { hp: 4, kw: ['cura'] }); c.hp = 3;
    const a = put(s, 'p', 0, 1, { hp: 5 }); a.hp = 1;
    const b = put(s, 'p', 1, 1, { hp: 5 }); b.hp = 1;
    // sem inimigos: as criaturas batem no herói e ninguém perde vida
    const r = resolveBattle(s, { record: false }).state;
    expect(r.p.board[0][2]!.hp).toBe(4);
    expect(r.p.board[0][1]!.hp).toBe(3);
    expect(r.p.board[1][1]!.hp).toBe(1);
  });
});

describe('⚖️ Reflexo', () => {
  it('quem ataca esta criatura leva 1 de dano', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 1, hp: 2 });
    put(s, 'e', 0, 0, { hp: 5, kw: ['reflexo'] });
    attack(ctx, 'p', 0, 0, a);
    expect(a.hp).toBe(1);
  });
  it('vale mesmo se a criatura com Reflexo morrer no golpe', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 5, hp: 1 });
    put(s, 'e', 0, 0, { hp: 1, kw: ['reflexo'] });
    attack(ctx, 'p', 0, 0, a);
    expect(s.p.board[0][0]).toBeNull();
  });
  it('não fere quem atacou já morto (ataque simultâneo)', () => {
    const s = blank(); const ctx = ctxOf(s);
    const a = put(s, 'p', 0, 0, { atk: 1, hp: 1 });
    put(s, 'e', 0, 0, { hp: 5, kw: ['reflexo'] });
    s.p.board[0][0] = null; // morreu no mesmo passo
    attack(ctx, 'p', 0, 0, a);
    expect(ofType(ctx.flush(), 'Damage')).toHaveLength(1);
  });
});

describe('⛰️ Ascensão', () => {
  it('ganha +1/+1 (vida máxima também) no início de cada rodada', () => {
    const s = blank();
    put(s, 'p', 0, 0, { atk: 0, hp: 2, kw: ['ascensao'] });
    const r = resolveBattle(s, { record: false }).state;
    const u = r.p.board[0][0]!;
    expect([u.atk, u.hp, u.max]).toEqual([1, 3, 3]);
  });
});

describe('🫧 Ilusão', () => {
  it('na primeira morte volta para a mão; a cópia que volta não volta de novo', () => {
    const s = blank(); const ctx = ctxOf(s);
    put(s, 'p', 0, 0, { cid: 'peixes24', hp: 1, kw: ['ilusao'] });
    damageUnit(ctx, 'p', 0, 0, 5);
    expect(s.p.hand).toHaveLength(1);
    expect(s.p.hand[0]).toMatchObject({ cid: 'peixes24', ghost: true });
    // a cópia fantasma, quando invocada, tem noReturn
    const r = applyAction(s, 'p', { t: 'summon', hand: 0, l: 1, d: 0 });
    if (!r.ok) throw new Error();
    const ghost = r.state.p.board[1][0]!;
    expect(ghost.noReturn).toBe(true);
    const ctx2 = ctxOf(r.state);
    damageUnit(ctx2, 'p', 1, 0, 99);
    expect(r.state.p.hand).toHaveLength(0);
  });
  it('com a mão cheia, não volta', () => {
    const s = blank(); const ctx = ctxOf(s);
    for (let i = 0; i < HAND_MAX; i++) give(s, 'p', 'aries01');
    put(s, 'p', 0, 0, { hp: 1, kw: ['ilusao'] });
    damageUnit(ctx, 'p', 0, 0, 5);
    expect(s.p.hand).toHaveLength(HAND_MAX);
  });
});

describe('⭐ Efeitos de chegada', () => {
  const summon = (s: ReturnType<typeof blank>, cid: string, l = 0, d = 0) => {
    s.p.hand = [];
    give(s, 'p', cid);
    const r = applyAction(s, 'p', { t: 'summon', hand: 0, l, d });
    if (!r.ok) throw new Error(r.reason);
    return r.state;
  };
  it('Duplicar: cria um Eco 1/1 numa casa vazia da mesma fileira', () => {
    const s = summon(blank(), 'gemeos01', 1, 0);
    const b = resolveBattle(s);
    const arr = b.frames.find(f => f.kind === 'arrival')!;
    expect(ofType(arr.events, 'UnitPlaced')[0]).toMatchObject({ l: 1, d: 1, cid: 'eco', token: true });
  });
  it('Duplicar: fileira cheia, vai para a primeira casa vazia em qualquer fileira', () => {
    const s0 = blank();
    put(s0, 'p', 1, 1, { hp: 9 }); put(s0, 'p', 1, 2, { hp: 9 });
    put(s0, 'p', 0, 0, { hp: 9 }); put(s0, 'p', 0, 1, { hp: 9 }); put(s0, 'p', 0, 2, { hp: 9 });
    const s = summon(s0, 'gemeos01', 1, 0);
    const arr = resolveBattle(s).frames.find(f => f.kind === 'arrival')!;
    expect(ofType(arr.events, 'UnitPlaced')[0]).toMatchObject({ l: 2, d: 0 });
  });
  it('Duplicar: o Eco não volta pela Ilusão e entra na luta da mesma rodada', () => {
    const s = summon(blank(), 'gemeos01', 0, 0);
    const r = resolveBattle(s);
    const eco = r.frames.flatMap(f => f.events).filter(e => e.t === 'Attack' && e.cid === 'eco');
    expect(eco).toHaveLength(1);
    // Gêmeos 01 + Eco (1) batem no herói vazio na fileira 0
    const gemeos = card('gemeos01');
    expect(r.state.e.hp).toBe(HERO_HP - (gemeos.type === 'unit' ? gemeos.atk : 0) - 1);
    expect(r.state.p.board[0][1]!.noReturn).toBe(true);
  });
  it('face1: 1 de dano no herói inimigo', () => {
    const s = summon(blank(), 'aries04', 0, 0);
    s.p.board[0][0]!.atk = 0; // isola o efeito do ataque normal
    const b = resolveBattle(s, { record: false }).state;
    expect(b.e.hp).toBe(HERO_HP - 1);
  });
  it('heal2: cura 2 do próprio herói', () => {
    const s = summon(blank(), 'touro04', 0, 0);
    s.p.hp = 20;
    const b = resolveBattle(s, { record: false }).state;
    expect(b.p.hp).toBe(22);
  });
  it('draw: compra 1 carta', () => {
    const s = summon(blank(), 'gemeos04', 0, 0);
    const b = resolveBattle(s);
    const arr = b.frames.find(f => f.kind === 'arrival')!;
    expect(ofType(arr.events, 'CardDrawn')).toHaveLength(1);
  });
  it('volley: 2 de dano numa criatura inimiga aleatória (determinístico pela semente)', () => {
    const run = (seed: number) => {
      const s = summon(blank(seed), 'cancer04', 0, 0);
      put(s, 'e', 1, 0, { hp: 5 }); put(s, 'e', 2, 0, { hp: 5 });
      const arr = resolveBattle(s).frames.find(f => f.kind === 'arrival')!;
      return ofType(arr.events, 'Damage');
    };
    const a = run(7), b = run(7);
    expect(a).toHaveLength(1);
    expect(a[0].amount).toBe(2);
    expect(a).toEqual(b);
  });
});

describe('Determinismo', () => {
  it('a mesma semente gera a mesma partida', () => {
    const a = newGame({ pSign: 'leao', eSign: 'peixes', seed: 99, record: false }).state;
    const b = newGame({ pSign: 'leao', eSign: 'peixes', seed: 99, record: false }).state;
    expect(a).toEqual(b);
    const c = newGame({ pSign: 'leao', eSign: 'peixes', seed: 100, record: false }).state;
    expect(c.p.deck).not.toEqual(a.p.deck);
  });
});
