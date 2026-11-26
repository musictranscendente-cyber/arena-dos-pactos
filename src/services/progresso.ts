// Guarda o progresso do jogador no aparelho (localStorage). Se o navegador bloquear, o jogo segue sem salvar.
import { normalizar, novoProgresso, type Progresso } from '../meta/progresso';
import { marcarMudanca } from './nuvem';

const CHAVE = 'arena-dos-pactos:progresso';

export function lerProgresso(): Progresso {
  try {
    const raw = localStorage.getItem(CHAVE);
    if (!raw) return novoProgresso();
    const p = normalizar(JSON.parse(raw));
    // o salvo tinha cenários de duelo antigos (devolvidos em normalizar): grava já, para não devolver de novo
    if (/"duelo-(supernova|nebulosa|aurora|eclipse|lua-sangue|abismo)"/.test(raw)) salvarProgresso(p);
    return p;
  } catch {
    return novoProgresso();
  }
}

export function salvarProgresso(p: Progresso): boolean {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(p));
    marcarMudanca();
    return true;
  } catch {
    return false;
  }
}
