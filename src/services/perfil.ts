// Perfil do jogador: nome de invocador (salvo no aparelho e, com login, na nuvem).
import { marcarMudanca } from './nuvem';

const CHAVE = 'arena-dos-pactos:perfil';
export interface Perfil { nome: string }

export function lerPerfil(): Perfil {
  try {
    const p = JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as Partial<Perfil>;
    return { nome: typeof p.nome === 'string' ? p.nome.slice(0, 16) : '' };
  } catch { return { nome: '' }; }
}

export function salvarPerfil(p: Perfil): void {
  try { localStorage.setItem(CHAVE, JSON.stringify({ nome: p.nome.slice(0, 16) })); } catch { /* sem armazenamento */ }
  marcarMudanca();
}
