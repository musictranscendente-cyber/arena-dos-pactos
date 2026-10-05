// Decks montados com 2 signos e decks aleatórios dos bots.
import { describe, expect, it } from 'vitest';
import { cardsOfSign, CARDS } from '../src/data/cards';
import { ORDER } from '../src/data/signos';
import { cartasDisponiveis, deckAleatorio, doisSignos, validarDeck } from '../src/engine/deck';
import { newGame } from '../src/engine/round';
import { Rng } from '../src/engine/rng';
import { DECK_SIZE } from '../src/engine/types';

const ok15 = [...cardsOfSign('aries').slice(0, 15), ...cardsOfSign('leao').slice(0, 15)];

describe('Montar deck', () => {
  it('as cartas disponíveis são as 60 dos 2 signos', () => {
    expect(cartasDisponiveis('aries', 'leao')).toHaveLength(60);
  });
  it('deck válido: 30 cartas diferentes dos 2 signos', () => {
    expect(validarDeck({ signos: ['aries', 'leao'], cartas: ok15 })).toBeNull();
  });
  it('recusa signos iguais, tamanho errado, carta repetida ou de outro signo', () => {
    expect(validarDeck({ signos: ['aries', 'aries'], cartas: ok15 })).toBe('signos');
    expect(validarDeck({ signos: ['aries', 'leao'], cartas: ok15.slice(1) })).toBe('tamanho');
    expect(validarDeck({ signos: ['aries', 'leao'], cartas: [...ok15.slice(1), ok15[0 + 2]] })).toBe('repetida');
    expect(validarDeck({ signos: ['aries', 'leao'], cartas: [...ok15.slice(1), cardsOfSign('touro')[0]] })).toBe('signo');
  });
});

describe('Deck aleatório (bots e completar)', () => {
  it('gera 30 cartas válidas dos 2 signos, com as duas metades representadas', () => {
    for (let seed = 1; seed < 40; seed++) {
      const rng = new Rng(seed);
      const [a, b] = doisSignos(rng, ORDER);
      expect(a).not.toBe(b);
      const cartas = deckAleatorio(rng, a, b);
      expect(validarDeck({ signos: [a, b], cartas })).toBeNull();
      const deA = cartas.filter(c => CARDS[c].race === a).length;
      expect(deA).toBeGreaterThan(5);
      expect(deA).toBeLessThan(25);
    }
  });
  it('completar mantém as cartas já escolhidas', () => {
    const base = cardsOfSign('touro').slice(0, 7);
    const cartas = deckAleatorio(new Rng(3), 'touro', 'peixes', base);
    expect(cartas).toHaveLength(DECK_SIZE);
    for (const c of base) expect(cartas).toContain(c);
  });
  it('curva parecida com um deck normal: poucas cartas muito caras', () => {
    const cartas = deckAleatorio(new Rng(9), 'virgem', 'aquario');
    expect(cartas.filter(c => CARDS[c].cost >= 7).length).toBeLessThanOrEqual(4);
  });
});

describe('Partida com deck montado', () => {
  it('usa exatamente as 30 cartas escolhidas, e guarda o segundo signo', () => {
    const { state } = newGame({ pSign: 'aries', pSign2: 'leao', pDeck: ok15, eSign: 'touro', seed: 5, record: false });
    const todas = [...state.p.deck, ...state.p.hand.map(h => h.cid)];
    expect(todas.sort()).toEqual([...ok15].sort());
    expect(state.p.sign2).toBe('leao');
    expect(state.e.deck.length + state.e.hand.length).toBe(DECK_SIZE);
  });
  it('não altera a lista recebida', () => {
    const copia = [...ok15];
    newGame({ pSign: 'aries', pDeck: ok15, eSign: 'touro', seed: 5, record: false });
    expect(ok15).toEqual(copia);
  });
});

describe('Partidas inteiras com decks combinados', () => {
  it('bots com decks aleatórios de 2 signos jogam até o fim sem erro', async () => {
    const { planTurn } = await import('../src/engine/ai/simples');
    const { resolveBattle } = await import('../src/engine/battle');
    for (let seed = 1; seed <= 10; seed++) {
      const rng = new Rng(seed * 7919);
      const [pa, pb] = doisSignos(rng, ORDER), [ea, eb] = doisSignos(rng, ORDER);
      let { state } = newGame({ pSign: pa, pSign2: pb, pDeck: deckAleatorio(rng, pa, pb), eSign: ea, eSign2: eb, eDeck: deckAleatorio(rng, ea, eb), seed, record: false });
      const rp = new Rng(seed + 1), re = new Rng(seed + 2);
      while (state.phase === 'plan' && state.round < 60) {
        state = planTurn(state, 'p', rp).state;
        state = planTurn(state, 'e', re).state;
        state = resolveBattle(state, { record: false }).state;
      }
      expect(state.phase).toBe('over');
    }
  });
});
