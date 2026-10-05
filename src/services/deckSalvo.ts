// Guarda o deck montado no próprio aparelho (localStorage). Se o navegador bloquear, o jogo segue sem salvar.
import { ORDER } from '../data/signos';
import { validarDeck, type DeckMontado } from '../engine';

const CHAVE = 'arena-dos-pactos:deck';

export function lerDeck(): DeckMontado | null {
  try {
    const raw = localStorage.getItem(CHAVE);
    if (!raw) return null;
    const d = JSON.parse(raw) as DeckMontado;
    if (!Array.isArray(d?.signos) || !d.signos.every(s => ORDER.includes(s)) || !Array.isArray(d.cartas)) return null;
    return validarDeck(d) ? null : d;
  } catch {
    return null;
  }
}

export function salvarDeck(d: DeckMontado): boolean {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}
