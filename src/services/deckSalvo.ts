// Guarda os decks montados no próprio aparelho (localStorage): 3 espaços e qual deles está em uso.
// Se o navegador bloquear, o jogo segue sem salvar.
import { ORDER } from '../data/signos';
import { validarDeck, type DeckMontado } from '../engine';

export const ESPACOS = 3;

export interface MeusDecks {
  /** Espaço do deck em uso (Partida Rápida), ou -1 se nenhum. */
  ativo: number;
  decks: (DeckMontado | null)[];
}

const CHAVE = 'arena-dos-pactos:decks';
/** Versão antiga (um deck só): vira o espaço 1. */
const CHAVE_ANTIGA = 'arena-dos-pactos:deck';

function valido(d: unknown): d is DeckMontado {
  const x = d as DeckMontado;
  return !!x && Array.isArray(x.signos) && x.signos.length === 2 && x.signos.every(s => ORDER.includes(s))
    && Array.isArray(x.cartas) && !validarDeck(x);
}

function vazio(): MeusDecks {
  return { ativo: -1, decks: Array.from({ length: ESPACOS }, () => null) };
}

export function lerDecks(): MeusDecks {
  try {
    const raw = localStorage.getItem(CHAVE);
    if (raw) {
      const m = JSON.parse(raw) as MeusDecks;
      const decks = Array.from({ length: ESPACOS }, (_, i) => {
        const d = m?.decks?.[i];
        if (!valido(d)) return null;
        // nome é texto livre do jogador: só aceita texto curto
        return typeof d.nome === 'string' ? { ...d, nome: d.nome.slice(0, 22) } : { signos: d.signos, cartas: d.cartas };
      });
      const ativo = typeof m?.ativo === 'number' && decks[m.ativo] ? m.ativo : decks.findIndex(Boolean);
      return { ativo, decks };
    }
    const antigo = localStorage.getItem(CHAVE_ANTIGA);
    if (antigo) {
      const d = JSON.parse(antigo);
      if (valido(d)) { const m = vazio(); m.decks[0] = d; m.ativo = 0; return m; }
    }
  } catch { /* sem armazenamento: começa vazio */ }
  return vazio();
}

export function salvarDecks(m: MeusDecks): boolean {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(m));
    return true;
  } catch {
    return false;
  }
}

/** O deck em uso, ou null. */
export function deckAtivo(m: MeusDecks): DeckMontado | null {
  return m.ativo >= 0 ? m.decks[m.ativo] ?? null : null;
}
