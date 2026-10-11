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

const CHAVE_CAMP = 'arena-dos-pactos:campanha-tela';

/** Último mundo e fase abertos na campanha (para voltar no mesmo lugar). */
export function lerTelaCampanha(): { signo: string; fase: number } | null {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE_CAMP) ?? 'null') as { signo?: unknown; fase?: unknown } | null;
    return v && typeof v.signo === 'string' && typeof v.fase === 'number' ? { signo: v.signo, fase: v.fase } : null;
  } catch {
    return null;
  }
}

export function salvarTelaCampanha(signo: string, fase: number): void {
  try { localStorage.setItem(CHAVE_CAMP, JSON.stringify({ signo, fase })); } catch { /* sem armazenamento */ }
}
