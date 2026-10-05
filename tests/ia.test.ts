// Níveis da IA: jogadas sempre válidas, o difícil ganha bem mais do que perde contra o normal e o deck forte é sempre válido.
import { describe, expect, it } from 'vitest';
import { ORDER } from '../src/data/signos';
import { resolveBattle } from '../src/engine/battle';
import { deckAleatorio, doisSignos, validarDeck } from '../src/engine/deck';
import { deckForte } from '../src/engine/ai/deckForte';
import { NIVEIS, planTurnNivel, type Nivel } from '../src/engine/ai/niveis';
import { newGame } from '../src/engine/round';
import { Rng } from '../src/engine/rng';

function jogo(pn: Nivel, en: Nivel, seed: number) {
  const rng = new Rng(seed * 7919 + 1);
  const [pa, pb] = doisSignos(rng, ORDER), [ea, eb] = doisSignos(rng, ORDER);
  let { state } = newGame({ pSign: pa, pSign2: pb, pDeck: deckAleatorio(rng, pa, pb), eSign: ea, eSign2: eb, eDeck: deckAleatorio(rng, ea, eb), seed, record: false });
  const rp = new Rng(seed ^ 0x9e3779b9), re = new Rng(seed ^ 0x85ebca6b);
  while (state.phase === 'plan' && state.round < 80) {
    state = planTurnNivel(state, 'e', re, en).state;
    state = planTurnNivel(state, 'p', rp, pn).state;
    state = resolveBattle(state, { record: false }).state;
  }
  return state;
}

describe('Níveis da IA', () => {
  it('os 3 níveis jogam partidas inteiras sem erro', () => {
    for (const n of NIVEIS) for (let s = 1; s <= 3; s++) expect(jogo(n, 'normal', s).phase).toBe('over');
  });
  it('mesmo sorteio = mesma jogada (determinístico)', () => {
    const { state } = newGame({ pSign: 'aries', eSign: 'leao', seed: 4, record: false });
    for (const n of NIVEIS) {
      const a = planTurnNivel(state, 'e', new Rng(9), n).actions;
      const b = planTurnNivel(state, 'e', new Rng(9), n).actions;
      expect(a).toEqual(b);
    }
  });
  it('fácil nunca queima carta', () => {
    const { state } = newGame({ pSign: 'aries', eSign: 'leao', seed: 7, record: false });
    for (let s = 0; s < 20; s++) expect(planTurnNivel(state, 'e', new Rng(s), 'facil').actions.every(a => a.t !== 'burn')).toBe(true);
  });
  it('difícil vence o normal na maioria das partidas', () => {
    let v = 0;
    for (let i = 0; i < 12; i++) {
      if (jogo('dificil', 'normal', 500 + i).result === 'p') v++;
      if (jogo('normal', 'dificil', 500 + i).result === 'e') v++;
    }
    expect(v).toBeGreaterThan(12);
  }, 60000);
});

describe('deck forte do bot difícil', () => {
  it('é sempre um deck válido de 30 cartas, nos dois signos', () => {
    const rng = new Rng(77);
    for (let i = 0; i < 40; i++) {
      const [a, b] = doisSignos(rng, ORDER);
      const cartas = deckForte(rng, a, b);
      expect(cartas).toHaveLength(30);
      expect(validarDeck({ signos: [a, b], cartas })).toBeNull();
    }
  });
});
