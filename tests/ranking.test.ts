import { describe, expect, it } from 'vitest';
import {
  aplicarResultado, BOTS, classificar, forcaDaLiga, ligaDe, linhasDosBots, multidaoAcima, novoEstado, pontosBot,
  sortearRival, tamanhoMultidao, temporadaDe, temporadaPorId, virarTemporada,
} from '../src/meta/ranking';
import { Rng } from '../src/engine/rng';

const DIA = 86400_000;

describe('temporadas', () => {
  it('segue a temporada do signo (UTC)', () => {
    expect(temporadaDe(Date.UTC(2026, 10, 19)).id).toBe('2026-escorpiao');
    expect(temporadaDe(Date.UTC(2026, 10, 22)).id).toBe('2026-sagitario');
    // Capricórnio começa em dezembro e atravessa o ano novo
    expect(temporadaDe(Date.UTC(2027, 0, 5)).id).toBe('2026-capricornio');
    expect(temporadaDe(Date.UTC(2027, 0, 20)).id).toBe('2027-aquario');
  });
  it('início e fim batem com a próxima temporada', () => {
    const t = temporadaDe(Date.UTC(2026, 10, 25));
    expect(t.inicio).toBe(Date.UTC(2026, 10, 22));
    expect(t.fim).toBe(Date.UTC(2026, 11, 22));
    expect(temporadaDe(t.fim).id).toBe('2026-capricornio');
    expect(temporadaPorId('2026-capricornio')?.fim).toBe(Date.UTC(2027, 0, 20));
    expect(temporadaPorId('lixo')).toBeNull();
  });
});

describe('pontos da partida', () => {
  const e0 = { ...novoEstado('t'), pontos: 400, ligaMax: 1 };
  it('vitória dá 20, mais bônus contra quem tem mais pontos (até +10)', () => {
    expect(aplicarResultado(e0, 'vitoria', 400).delta).toBe(20);
    expect(aplicarResultado(e0, 'vitoria', 470).delta).toBe(23);
    expect(aplicarResultado(e0, 'vitoria', 2000).delta).toBe(30);
    expect(aplicarResultado(e0, 'vitoria', 100).delta).toBe(20);
  });
  it('a partir da 3ª vitória seguida, +5', () => {
    let e = e0;
    const d: number[] = [];
    for (let i = 0; i < 4; i++) { const r = aplicarResultado(e, 'vitoria', e.pontos); d.push(r.delta); e = r.e; }
    expect(d).toEqual([20, 20, 25, 25]);
    expect(e.seguidas).toBe(4);
    expect(aplicarResultado(e, 'derrota', 0).e.seguidas).toBe(0);
  });
  it('derrota −12, empate +3', () => {
    expect(aplicarResultado(e0, 'derrota', 400).delta).toBe(-12);
    expect(aplicarResultado(e0, 'empate', 400).delta).toBe(3);
  });
  it('não cai abaixo do piso da maior liga alcançada', () => {
    const e = { ...novoEstado('t'), pontos: 305, ligaMax: 1 };
    const r = aplicarResultado(e, 'derrota', 300);
    expect(r.e.pontos).toBe(300);
    expect(r.delta).toBe(-5);
    expect(aplicarResultado(novoEstado('t'), 'derrota', 0).e.pontos).toBe(0);
  });
  it('sobe de liga', () => {
    const r = aplicarResultado({ ...novoEstado('t'), pontos: 290 }, 'vitoria', 290);
    expect(r.subiu).toBe(true);
    expect(r.e.ligaMax).toBe(1);
    expect(ligaDe(2500)).toBe(5);
  });
});

describe('virada de temporada', () => {
  it('pontos pela metade, prêmio pela liga e troféu no Top 10', () => {
    const e = { ...novoEstado('a'), pontos: 1301, ligaMax: 3, vitorias: 60 };
    const v = virarTemporada(e, 'b', 7);
    expect(v.e).toMatchObject({ temporada: 'b', pontos: 650, ligaMax: 1, vitorias: 0, trofeus: 1 });
    expect(v.poeira).toBe(350);
    expect(v.gemas).toBe(25);
    expect(virarTemporada(e, 'b', 11).top10).toBe(false);
  });
});

describe('os 100 jogadores da arena', () => {
  const t = temporadaDe(Date.UTC(2026, 10, 25));
  it('mesma pontuação em qualquer aparelho e nomes únicos', () => {
    expect(BOTS).toHaveLength(100);
    expect(new Set(BOTS.map(b => b.nome)).size).toBe(100);
    expect(pontosBot(5, t, t.inicio + 3 * DIA)).toBe(pontosBot(5, t, t.inicio + 3 * DIA));
  });
  it('sobem ao longo da temporada: o 1º termina perto de 2.800 e o 100º perto de 700', () => {
    const ini = linhasDosBots(t, t.inicio + 3600_000).map(l => l.pontos).sort((a, b) => b - a);
    const fim = linhasDosBots(t, t.fim - 3600_000).map(l => l.pontos).sort((a, b) => b - a);
    expect(ini[0]).toBeLessThan(1700);
    expect(fim[0]).toBeGreaterThan(2600);
    expect(fim[99]).toBeGreaterThan(550);
    expect(fim[99]).toBeLessThan(900);
  });
  it('a colocação muda com o tempo', () => {
    const ordem = (x: number) => linhasDosBots(t, x).sort((a, b) => b.pontos - a.pontos).map(l => l.bot).slice(0, 10).join();
    expect(ordem(t.inicio + 5 * DIA)).not.toBe(ordem(t.inicio + 20 * DIA));
  });
});

describe('classificação', () => {
  const t = temporadaDe(Date.UTC(2026, 10, 25));
  const agora = t.inicio + 10 * DIA;
  it('quem começa fica bem abaixo do Top 100', () => {
    const c = classificar(t, agora, { nome: 'eu', signo: 'aries', pontos: 0, trofeus: 0 }, [], 0);
    expect(c.top).toHaveLength(100);
    expect(c.posicao).toBeGreaterThan(1000);
    expect(c.top.some(l => l.eu)).toBe(false);
    expect(c.eu?.eu).toBe(true);
  });
  it('quanto mais pontos, melhor a posição; com muitos pontos entra no Top 100', () => {
    const pos = (p: number) => classificar(t, agora, { nome: 'eu', signo: 'aries', pontos: p, trofeus: 0 }, [], 0).posicao;
    expect(pos(200)).toBeLessThan(pos(0));
    expect(pos(5000)).toBe(1);
    const c = classificar(t, agora, { nome: 'eu', signo: 'aries', pontos: 5000, trofeus: 0 }, [], 0);
    expect(c.top[0].eu).toBe(true);
  });
  it('jogadores reais entram na lista e contam na posição', () => {
    const reais = [{ nome: 'Real', signo: 'leao' as const, pontos: 4000, trofeus: 0, id: 'x' }];
    const c = classificar(t, agora, { nome: 'eu', signo: 'aries', pontos: 3000, trofeus: 0 }, reais, 1);
    expect(c.top[0].nome).toBe('Real');
    expect(c.posicao).toBe(2);
  });
  it('multidão: ninguém acima de quem passou do corte; todos acima de quem tem 0', () => {
    expect(multidaoAcima(800, 700, 2000)).toBe(0);
    expect(multidaoAcima(0, 700, 2000)).toBe(2000);
    expect(tamanhoMultidao(Date.UTC(2027, 10, 1))).toBeGreaterThan(tamanhoMultidao(Date.UTC(2026, 10, 1)));
  });
});

describe('adversário', () => {
  const t = temporadaDe(Date.UTC(2026, 10, 25));
  const agora = t.inicio + 10 * DIA;
  it('iniciante enfrenta alguém da multidão, com pontos parecidos e IA fácil', () => {
    const r = sortearRival(new Rng(1), t, agora, 0);
    expect(r.pontos).toBeLessThan(100);
    expect(r.ia).toBe('facil');
    expect(BOTS.some(b => b.nome === r.nome)).toBe(false);
  });
  it('perto do Top 100, enfrenta um dos 100 da arena', () => {
    const r = sortearRival(new Rng(2), t, agora, 1500);
    expect(BOTS.some(b => b.nome === r.nome)).toBe(true);
    expect(Math.abs(r.pontos - 1500)).toBeLessThan(400);
  });
  it('a força acompanha a liga e o nível do seu deck', () => {
    expect(forcaDaLiga(0)).toEqual({ ia: 'facil', nv: 1, forte: false });
    expect(forcaDaLiga(2600)).toEqual({ ia: 'dificil', nv: 3, forte: true });
    expect(forcaDaLiga(0, 3).nv).toBe(3);
    expect(forcaDaLiga(2600, 5).nv).toBe(5);
  });
});
