// Missões diárias, baú e calendário de 7 dias.
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/rng';
import {
  abrirBau, bauPronto, CALENDARIO, coletar, coletarLogin, COMPARTILHAR, garantirDia, missao, POR_DIA, registrar, trocar,
} from '../src/meta/missoes';
import { novoProgresso } from '../src/meta/progresso';

describe('missões diárias', () => {
  it('cada dia: 3 missões sorteadas + compartilhar; muda no dia seguinte', () => {
    const p = garantirDia(novoProgresso(), '2026-10-10', new Rng(1));
    expect(p.missoes.lista).toHaveLength(POR_DIA + 1);
    expect(p.missoes.lista.at(-1)!.id).toBe(COMPARTILHAR.id);
    expect(new Set(p.missoes.lista.map(m => m.id)).size).toBe(POR_DIA + 1);
    expect(garantirDia(p, '2026-10-10', new Rng(2))).toBe(p);
    expect(garantirDia(p, '2026-10-11', new Rng(2)).missoes.dia).toBe('2026-10-11');
  });
  it('progresso, coletar, trocar uma vez e baú depois das 3', () => {
    let p = garantirDia(novoProgresso(), '2026-10-10', new Rng(5));
    const ids = p.missoes.lista.map(m => m.id);
    p = trocar(p, ids[0], new Rng(9));
    expect(p.missoes.trocou).toBe(true);
    expect(trocar(p, p.missoes.lista[1].id, new Rng(9))).toBe(p);
    // completa tudo
    p = registrar(p, { vitoria: 9, partida: 9, invocar: 99, magia: 9, queimar: 9, danoHeroi: 99, abater: 99, fase: 9, compartilhar: 1 });
    expect(bauPronto(p)).toBe(false);
    let total = 0;
    for (const m of p.missoes.lista) { const r = coletar(p, m.id); p = r.p; total += r.poeira; }
    expect(total).toBe(p.missoes.lista.reduce((t, m) => t + missao(m.id)!.poeira, 0));
    expect(coletar(p, p.missoes.lista[0].id).poeira).toBe(0);
    expect(bauPronto(p)).toBe(true);
    const b = abrirBau(p, new Rng(3))!;
    expect(b.cartas).toHaveLength(3);
    expect(bauPronto(b.p)).toBe(false);
  });
});

describe('calendário de 7 dias', () => {
  it('um prêmio por dia; pular dia não zera; volta ao dia 1 depois do 7', () => {
    let p = novoProgresso();
    for (let i = 0; i < 7; i++) {
      const r = coletarLogin(p, `2026-10-${10 + i * 2}`, new Rng(i))!;
      expect(r.premio).toBe(CALENDARIO[i]);
      expect(coletarLogin(r.p, `2026-10-${10 + i * 2}`, new Rng(i))).toBeNull();
      p = r.p;
    }
    expect(p.login.passo).toBe(0);
    expect(p.gemas).toBe(10);
  });
});
