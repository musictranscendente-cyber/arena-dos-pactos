// Campanha: liberação de mundos/fases, estrelas, prêmios e a vida do chefe.
import { describe, expect, it } from 'vitest';
import { card, nivelDe } from '../src/data/cards';
import { newGame } from '../src/engine/round';
import { Rng } from '../src/engine/rng';
import {
  deckDaFase, estrelasDaVitoria, fase, faseLiberada, FASES, mundoAtual, mundoLiberado, nivelMedioDeck, poeiraDaFase, POEIRA_REPETIR, vencerFase, VIDA_CHEFE,
} from '../src/meta/campanha';
import { novoProgresso, totalCopias } from '../src/meta/progresso';
import { healHero } from '../src/engine/state';
import { Ctx } from '../src/engine/ctx';

describe('campanha', () => {
  it('todos os mundos liberados; dentro do mundo, uma fase libera a próxima', () => {
    const p = novoProgresso();
    expect(mundoLiberado(p, 'aries')).toBe(true);
    expect(mundoLiberado(p, 'peixes')).toBe(true);
    expect(faseLiberada(p, 'peixes', 1)).toBe(true);
    expect(faseLiberada(p, 'aries', 1)).toBe(true);
    expect(faseLiberada(p, 'aries', 2)).toBe(false);
    expect(mundoAtual(p)).toBe('aries');
  });
  it('estrelas pela vida que sobrou', () => {
    expect(estrelasDaVitoria(30)).toBe(3);
    expect(estrelasDaVitoria(25)).toBe(3);
    expect(estrelasDaVitoria(24)).toBe(2);
    expect(estrelasDaVitoria(15)).toBe(2);
    expect(estrelasDaVitoria(3)).toBe(1);
  });
  it('primeira vitória dá Poeira e 1 carta do signo; repetir dá 10; guarda a melhor estrela', () => {
    let r = vencerFase(novoProgresso(), 'aries', 1, 10, new Rng(1));
    expect(r.primeira).toBe(true);
    expect(r.poeira).toBe(poeiraDaFase(1));
    expect(r.cartas).toHaveLength(1);
    expect(card(r.cartas[0]).race).toBe('aries');
    expect(faseLiberada(r.p, 'aries', 2)).toBe(true);
    r = vencerFase(r.p, 'aries', 1, 28, new Rng(2));
    expect(r.primeira).toBe(false);
    expect(r.poeira).toBe(POEIRA_REPETIR);
    expect(r.p.campanha['aries-1']).toBe(3);
    r = vencerFase(r.p, 'aries', 1, 5, new Rng(3));
    expect(r.p.campanha['aries-1']).toBe(3);
  });
  it('vencer o chefe dá épica + gemas; 3 estrelas em tudo dá a lendária', () => {
    let p = novoProgresso();
    for (let n = 1; n <= FASES; n++) p = vencerFase(p, 'aries', n, 30, new Rng(n)).p;
    expect(p.gemas).toBe(5);
    expect(totalCopias(p, 'aries25')).toBeGreaterThanOrEqual(1);
    const antes = totalCopias(p, 'aries25');
    p = vencerFase(p, 'aries', 3, 30, new Rng(9)).p;
    expect(totalCopias(p, 'aries25')).toBe(antes); // lendária só uma vez
  });
  it('dificuldade depende só da fase (igual em todo mundo): começa fácil, chefe no difícil', () => {
    expect(fase('aries', 10).vidaRival).toBe(VIDA_CHEFE);
    expect(fase('escorpiao', 1).nivelIA).toBe('facil');
    expect(fase('peixes', 1)).toEqual({ ...fase('aries', 1), signo: 'peixes' });
    expect(fase('peixes', 10).nivelIA).toBe('dificil');
    const d = deckDaFase(fase('peixes', 8), new Rng(1));
    expect(d).toHaveLength(30);
    expect(d.every(c => nivelDe(c) === 2)).toBe(true);
  });
  it('rival acompanha o nível médio do deck do jogador (até o Nv5)', () => {
    expect(fase('aries', 1, 1).nivelCartas).toBe(1);
    expect(fase('aries', 1, 2.4).nivelCartas).toBe(2);
    expect(fase('aries', 8, 3).nivelCartas).toBe(4);
    expect(fase('aries', 10, 5).nivelCartas).toBe(5);
    expect(nivelMedioDeck(['aries01', 'aries02*3'])).toBe(2);
  });
  it('herói com vida maior (chefe) não perde vida ao ser curado', () => {
    const { state } = newGame({ pSign: 'aries', eSign: 'leao', seed: 1, record: false, eHp: 40 });
    expect(state.e.hp).toBe(40);
    const s = structuredClone(state);
    s.e.hp = 38;
    healHero(new Ctx(s, false), 'e', 5);
    expect(s.e.hp).toBe(40);
  });
});
