import type { Raridade } from './schema';

export const RARITY: Record<Raridade, { n: string; col: string }> = {
  c: { n: 'Comum', col: '#9aa6bd' },
  r: { n: 'Rara', col: '#4f9be8' },
  e: { n: 'Épica', col: '#a86be0' },
  l: { n: 'Lendária', col: '#e0aa45' },
};
