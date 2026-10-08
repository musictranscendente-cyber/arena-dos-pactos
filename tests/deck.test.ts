// Decks montados com 2 signos e decks aleatórios dos bots.
import { describe, expect, it } from 'vitest';
import { cardsOfSign, CARDS } from '../src/data/cards';
import { ORDER } from '../src/data/signos';
import { cartasDisponiveis, COPIAS, deckAleatorio, doisSignos, maxCopias, validarDeck } from '../src/engine/deck';
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
  it('aceita deck de 1 signo só (os 30 do signo)', () => {
    expect(validarDeck({ signos: ['aries', 'aries'], cartas: cardsOfSign('aries') })).toBeNull();
    expect(cartasDisponiveis('aries', 'aries')).toHaveLength(30);
  });
  it('recusa tamanho errado ou carta de outro signo', () => {
    expect(validarDeck({ signos: ['aries', 'aries'], cartas: ok15 })).toBe('signo');
    expect(validarDeck({ signos: ['aries', 'leao'], cartas: ok15.slice(1) })).toBe('tamanho');
    expect(validarDeck({ signos: ['aries', 'leao'], cartas: [...ok15.slice(1), cardsOfSign('touro')[0]] })).toBe('signo');
  });
  it('cópias pela raridade: comum 4, rara 3, épica 2, lendária 1', () => {
    expect(COPIAS).toEqual({ c: 4, r: 3, e: 2, l: 1 });
    const porR = (r: string) => cartasDisponiveis('aries', 'leao').find(c => CARDS[c].r === r)!;
    const com = (cid: string, n: number) => {
      const resto = cartasDisponiveis('aries', 'leao').filter(c => c !== cid && CARDS[c].r !== 'l').slice(0, DECK_SIZE - n);
      return { signos: ['aries', 'leao'] as ['aries', 'leao'], cartas: [...Array(n).fill(cid), ...resto] };
    };
    expect(validarDeck(com(porR('c'), 4))).toBeNull();
    expect(validarDeck(com(porR('c'), 5))).toBe('copias');
    expect(validarDeck(com(porR('r'), 3))).toBeNull();
    expect(validarDeck(com(porR('r'), 4))).toBe('copias');
    expect(validarDeck(com(porR('e'), 2))).toBeNull();
    expect(validarDeck(com(porR('e'), 3))).toBe('copias');
    expect(validarDeck(com(porR('l'), 1))).toBeNull();
    expect(validarDeck(com(porR('l'), 2))).toBe('copias');
    expect(maxCopias(porR('l'))).toBe(1);
  });
  it('completar mantém as cópias já escolhidas', () => {
    const c = cardsOfSign('aries').find(x => CARDS[x].r === 'c')!;
    const cartas = deckAleatorio(new Rng(2), 'aries', 'leao', [c, c, c]);
    expect(cartas.filter(x => x === c)).toHaveLength(3);
    expect(validarDeck({ signos: ['aries', 'leao'], cartas })).toBeNull();
  });
  it('partida com cópias repetidas: cada cópia vira uma carta na mão/deck', () => {
    const c = cardsOfSign('aries').find(x => CARDS[x].r === 'c')!;
    const cartas = deckAleatorio(new Rng(2), 'aries', 'leao', [c, c, c, c]);
    const { state } = newGame({ pSign: 'aries', pSign2: 'leao', pDeck: cartas, eSign: 'touro', seed: 3, record: false });
    const todas = [...state.p.deck, ...state.p.hand.map(h => h.cid)];
    expect(todas.filter(x => x === c)).toHaveLength(4);
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
