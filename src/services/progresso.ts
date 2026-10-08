// Guarda o progresso do jogador no aparelho (localStorage). Se o navegador bloquear, o jogo segue sem salvar.
import { normalizar, novoProgresso, type Progresso } from '../meta/progresso';

const CHAVE = 'arena-dos-pactos:progresso';

export function lerProgresso(): Progresso {
  try {
    const raw = localStorage.getItem(CHAVE);
    return raw ? normalizar(JSON.parse(raw)) : novoProgresso();
  } catch {
    return novoProgresso();
  }
}

export function salvarProgresso(p: Progresso): boolean {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}
