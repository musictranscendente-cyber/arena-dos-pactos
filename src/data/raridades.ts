import type { Raridade } from './schema';
import { EN } from './idioma';

export const RARITY: Record<Raridade, { n: string; col: string }> = {
  c: { n: EN ? 'Common' : 'Comum', col: '#9aa6bd' },
  r: { n: EN ? 'Rare' : 'Rara', col: '#4f9be8' },
  e: { n: EN ? 'Epic' : 'Épica', col: '#a86be0' },
  l: { n: EN ? 'Legendary' : 'Lendária', col: '#e0aa45' },
};
/** Raridade em minúsculas, para o meio de frases ("uma carta rara"). */
export const rarMinusc = (r: Raridade): string => RARITY[r].n.toLowerCase();
