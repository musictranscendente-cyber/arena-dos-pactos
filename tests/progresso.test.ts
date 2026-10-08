// Progresso fora da partida: nível das cartas, coleção, fusão, pacotes e prêmios.
import { describe, expect, it } from 'vitest';
import { card, cardsOfSign, comNivel, nivelDe } from '../src/data/cards';
import { Rng } from '../src/engine/rng';
import {
  abrirPacote, completarDeck, copiasParaDeck, CUSTO_FUSAO, darCarta, deckComNiveis, escolherInicial, faltando, fundir,
  melhorNivel, normalizar, novoProgresso, podeFundir, premioRapida, PRECO_PACOTE, RAPIDA_LIMITE, totalCopias,
} from '../src/meta/progresso';

describe('nível das cartas', () => {
  it('criatura: Nv2 +1 vida, Nv3 +1 ataque, Nv4 +1 vida, Nv5 +1/+1', () => {
    const b = card('aries10');
    if (b.type !== 'unit') throw new Error();
    const st = (n: number) => { const c = card(comNivel('aries10', n)); return c.type === 'unit' ? [c.atk - b.atk, c.hp - b.hp] : []; };
    expect(st(1)).toEqual([0, 0]);
    expect(st(2)).toEqual([0, 1]);
    expect(st(3)).toEqual([1, 1]);
    expect(st(4)).toEqual([1, 2]);
    expect(st(5)).toEqual([2, 3]);
    expect(nivelDe('aries10*4')).toBe(4);
    expect(card('aries10*4').name).toBe(b.name);
  });
  it('magia de dano: +1 no Nv3 e no Nv5', () => {
    const k = Object.keys({ ...Object.fromEntries(cardsOfSign('aries').map(x => [x, 1])) }).find(x => { const c = card(x); return c.type === 'spell' && c.sp === 'dmg'; })!;
    const v = (n: number) => { const c = card(comNivel(k, n)); return c.type === 'spell' ? c.v : 0; };
    expect(v(3) - v(1)).toBe(1);
    expect(v(5) - v(1)).toBe(2);
  });
});

describe('coleção e fusão', () => {
  it('signo inicial dá as 30 cartas e 100 de Poeira', () => {
    const p = escolherInicial(novoProgresso(), 'leao');
    expect(cardsOfSign('leao').every(c => totalCopias(p, c) === 1)).toBe(true);
    expect(p.poeira).toBe(100);
    expect(escolherInicial(p, 'aries')).toBe(p); // só uma vez
  });
  it('funde 2 iguais do mesmo nível em 1 do próximo, pagando Poeira', () => {
    let p = darCarta(darCarta(novoProgresso(), 'aries01'), 'aries01');
    expect(podeFundir(p, 'aries01', 1)).toBe('poeira');
    p = { ...p, poeira: 60 };
    expect(podeFundir(p, 'aries01', 1)).toBeNull();
    p = fundir(p, 'aries01', 1);
    expect(melhorNivel(p, 'aries01')).toBe(2);
    expect(totalCopias(p, 'aries01')).toBe(1);
    expect(p.poeira).toBe(60 - CUSTO_FUSAO[2]);
    expect(podeFundir(p, 'aries01', 1)).toBe('copias');
  });
  it('deck usa as cópias de maior nível primeiro; falta carta se não tiver', () => {
    let p = darCarta(darCarta(novoProgresso(), 'aries01', 3), 'aries01');
    expect(deckComNiveis(p, ['aries01', 'aries01'])).toEqual(['aries01*3', 'aries01']);
    expect(faltando(p, ['aries01', 'aries01', 'aries01'])).toEqual(['aries01']);
    p = { ...p, teste: true };
    expect(faltando(p, ['aries01', 'aries01', 'aries01'])).toEqual([]);
    expect(copiasParaDeck(p, 'aries02')).toBeGreaterThan(0);
  });
  it('completar deck só usa cartas da coleção', () => {
    const p = escolherInicial(novoProgresso(), 'touro');
    const d = completarDeck(p, 'touro', 'touro', [], new Rng(3));
    expect(d).toHaveLength(30);
    expect(faltando(p, d)).toEqual([]);
  });
});

describe('pacotes e prêmios', () => {
  it('pacote custa 200 e dá 5 cartas', () => {
    expect(abrirPacote(novoProgresso(), new Rng(1))).toBeNull();
    const r = abrirPacote({ ...novoProgresso(), poeira: 250 }, new Rng(1))!;
    expect(r.cartas).toHaveLength(5);
    expect(r.p.poeira).toBe(250 - PRECO_PACOTE);
    expect(r.cartas.reduce((t, c) => t + totalCopias(r.p, c), 0)).toBeGreaterThanOrEqual(5);
  });
  it('Partida Rápida: 20 por vitória, 5 por derrota, até 10 vitórias por dia', () => {
    let p = novoProgresso();
    expect(premioRapida(p, false, '2026-10-10').poeira).toBe(5);
    for (let i = 0; i < RAPIDA_LIMITE; i++) p = premioRapida(p, true, '2026-10-10').p;
    expect(p.poeira).toBe(20 * RAPIDA_LIMITE);
    expect(premioRapida(p, true, '2026-10-10').poeira).toBe(0);
    expect(premioRapida(p, true, '2026-10-11').poeira).toBe(20);
  });
  it('progresso mexido ou antigo volta ao normal', () => {
    const p = normalizar({ poeira: -5, gemas: 'x', cartas: { aries01: [2, 0, 0, 0, 0], naoexiste: [1] }, inicial: 'plutao' });
    expect(p.poeira).toBe(0);
    expect(p.gemas).toBe(0);
    expect(p.inicial).toBeNull();
    expect(totalCopias(p, 'aries01')).toBe(2);
    expect(Object.keys(p.cartas)).toEqual(['aries01']);
  });
});

describe('pacote de signo', () => {
  it('custa 350 e só traz cartas do signo escolhido', () => {
    const r = abrirPacote({ ...novoProgresso(), poeira: 400 }, new Rng(4), 'peixes')!;
    expect(r.p.poeira).toBe(50);
    expect(r.cartas).toHaveLength(5);
    expect(r.cartas.every(c => card(c).race === 'peixes')).toBe(true);
    expect(abrirPacote({ ...novoProgresso(), poeira: 300 }, new Rng(4), 'peixes')).toBeNull();
  });
});
