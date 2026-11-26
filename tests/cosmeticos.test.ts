import { describe, expect, it } from 'vitest';
import { AVATARES, CAMPEOES, comprarVisual, itemVisual, normalizarVisual, podeComprar, TABULEIROS, temVisual, usarVisual, VISUAIS } from '../src/meta/cosmeticos';
import { normalizar, novoProgresso } from '../src/meta/progresso';

const rico = () => ({ ...novoProgresso(), gemas: 500, poeira: 5000 });

describe('visuais', () => {
  it('catálogo: ids únicos, um tabuleiro e um campeão grátis (automático), 12 medalhões grátis', () => {
    expect(new Set(VISUAIS.map(i => i.id)).size).toBe(VISUAIS.length);
    expect(TABULEIROS.filter(i => !i.preco)).toHaveLength(1);
    expect(CAMPEOES.filter(i => !i.preco)).toHaveLength(1);
    expect(CAMPEOES.filter(i => i.preco).every(i => i.cid)).toBe(true);
    expect(AVATARES.filter(i => !i.preco)).toHaveLength(12);
    expect(TABULEIROS.filter(i => i.preco).every(i => i.tab)).toBe(true);
  });
  it('itens grátis já são seus; pagos não', () => {
    const p = novoProgresso();
    expect(temVisual(p, 'tab-classico')).toBe(true);
    expect(temVisual(p, 'av-sg-leao')).toBe(true);
    expect(temVisual(p, 'tab-gelo')).toBe(false);
  });
  it('comprar desconta a moeda certa e já passa a usar', () => {
    const p = comprarVisual(rico(), 'tab-gelo');
    expect(p.gemas).toBe(500 - itemVisual('tab-gelo')!.preco!.v);
    expect(p.poeira).toBe(5000);
    expect(p.visual.tem).toContain('tab-gelo');
    expect(p.visual.tabuleiro).toBe('tab-gelo');
    const q = comprarVisual(p, 'av-leao23');
    expect(q.poeira).toBe(5000 - 700);
    expect(q.visual.avatar).toBe('av-leao23');
  });
  it('sem moeda ou já tendo: não compra', () => {
    const pobre = novoProgresso();
    expect(podeComprar(pobre, 'tab-gelo')).toBe('gemas');
    expect(podeComprar(pobre, 'tab-ouro')).toBe('poeira');
    expect(comprarVisual(pobre, 'tab-gelo')).toBe(pobre);
    const p = comprarVisual(rico(), 'camp-leao25');
    expect(p.visual.duelo).toBe('camp-leao25');
    expect(podeComprar(p, 'camp-leao25')).toBe('tem');
    expect(comprarVisual(p, 'camp-leao25')).toBe(p);
  });
  it('só usa o que tem; trocar entre os seus', () => {
    const p = novoProgresso();
    expect(usarVisual(p, 'tab-gelo')).toBe(p);
    const q = usarVisual(comprarVisual(rico(), 'tab-gelo'), 'tab-classico');
    expect(q.visual.tabuleiro).toBe('tab-classico');
    expect(usarVisual(q, 'tab-gelo').visual.tabuleiro).toBe('tab-gelo');
  });
  it('salvo mexido: itens inexistentes ou não comprados não ficam em uso', () => {
    const v = normalizarVisual({ tem: ['tab-gelo', 'lixo', 'tab-classico'], tabuleiro: 'tab-fogo', avatar: 'av-leao25', duelo: 'duelo-classico' });
    expect(v.duelo).toBe('camp-auto');
    expect(v.tem).toEqual(['tab-gelo']);
    expect(v.tabuleiro).toBe('tab-classico');
    expect(v.avatar).toBe('');
    expect(normalizar({ visual: { tem: ['tab-gelo'], tabuleiro: 'tab-gelo' } }).visual.tabuleiro).toBe('tab-gelo');
    expect(normalizar({}).visual.tabuleiro).toBe('tab-classico');
  });
  it('cenários de duelo antigos (retirados): a moeda volta', () => {
    const p = normalizar({ gemas: 10, poeira: 0, visual: { tem: ['duelo-aurora', 'duelo-supernova', 'tab-gelo'], duelo: 'duelo-aurora' } });
    expect(p.gemas).toBe(90);
    expect(p.poeira).toBe(1500);
    expect(p.visual.tem).toEqual(['tab-gelo']);
    expect(p.visual.duelo).toBe('camp-auto');
  });
});
