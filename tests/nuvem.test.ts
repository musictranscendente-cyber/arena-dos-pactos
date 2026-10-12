import { describe, expect, it } from 'vitest';
import { decidirSincronia } from '../src/services/nuvem';

describe('sincronia com a nuvem', () => {
  const base = { temNuvem: true, nuvemAtualizado: '2026-10-12T10:00:00Z', usuario: 'u1' };
  it('nuvem vazia: envia o progresso do aparelho', () => {
    expect(decidirSincronia({ ...base, temNuvem: false, contaDoAparelho: null, base: null })).toBe('enviar');
  });
  it('aparelho de quem jogou sem conta ou de outra conta: baixa a nuvem (nunca apaga a nuvem)', () => {
    expect(decidirSincronia({ ...base, contaDoAparelho: null, base: null })).toBe('baixar');
    expect(decidirSincronia({ ...base, contaDoAparelho: 'u2', base: base.nuvemAtualizado })).toBe('baixar');
  });
  it('mesma conta, outro aparelho salvou depois: baixa', () => {
    expect(decidirSincronia({ ...base, contaDoAparelho: 'u1', base: '2026-10-11T10:00:00Z' })).toBe('baixar');
  });
  it('mesma conta e só este aparelho mexeu: envia', () => {
    expect(decidirSincronia({ ...base, contaDoAparelho: 'u1', base: base.nuvemAtualizado })).toBe('enviar');
  });
});
