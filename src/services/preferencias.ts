// Pequenas preferências do jogador guardadas no aparelho (se o navegador deixar).
import { NIVEIS, type Nivel } from '../engine';

const CHAVE_NIVEL = 'arena-dos-pactos:nivel';

export function lerNivel(): Nivel {
  try {
    const v = localStorage.getItem(CHAVE_NIVEL) as Nivel | null;
    return v && NIVEIS.includes(v) ? v : 'normal';
  } catch {
    return 'normal';
  }
}

export function salvarNivel(n: Nivel): void {
  try { localStorage.setItem(CHAVE_NIVEL, n); } catch { /* sem armazenamento */ }
}
