import type { Signo } from './schema';
import { SIGNOS } from './schema';

export interface InfoSigno {
  n: string;
  g: string;
  el: 'Fogo' | 'Terra' | 'Ar' | 'Água';
  c: string;
  m: string;
  /** Início da temporada: [mês, dia]. */
  dt: [number, number];
}

export const ORDER: readonly Signo[] = SIGNOS;

/** Elementos: ícone e classe de cor usados nas cartas. */
export const ELEMENTO: Record<InfoSigno['el'], { i: string; k: string }> = {
  Fogo: { i: '🔥', k: 'fogo' },
  Terra: { i: '⛰️', k: 'terra' },
  Ar: { i: '🌪️', k: 'ar' },
  Água: { i: '💧', k: 'agua' },
};

export const RACES: Record<Signo, InfoSigno> = {
  aries: { n: 'Áries', g: '♈', el: 'Fogo', c: '#d6452f', m: 'Arremetida', dt: [3, 21] },
  touro: { n: 'Touro', g: '♉', el: 'Terra', c: '#6f8f2e', m: 'Inabalável', dt: [4, 20] },
  gemeos: { n: 'Gêmeos', g: '♊', el: 'Ar', c: '#d4b234', m: 'Duplicar', dt: [5, 21] },
  cancer: { n: 'Câncer', g: '♋', el: 'Água', c: '#3fa79a', m: 'Carapaça', dt: [6, 21] },
  leao: { n: 'Leão', g: '♌', el: 'Fogo', c: '#e08a1e', m: 'Liderança', dt: [7, 23] },
  virgem: { n: 'Virgem', g: '♍', el: 'Terra', c: '#a57c4a', m: 'Cura', dt: [8, 23] },
  libra: { n: 'Libra', g: '♎', el: 'Ar', c: '#c06fb5', m: 'Julgamento', dt: [9, 23] },
  escorpiao: { n: 'Escorpião', g: '♏', el: 'Água', c: '#7a3fa6', m: 'Ferrão Final', dt: [10, 23] },
  sagitario: { n: 'Sagitário', g: '♐', el: 'Fogo', c: '#e35d6a', m: 'Mira Certeira', dt: [11, 22] },
  capricornio: { n: 'Capricórnio', g: '♑', el: 'Terra', c: '#7d8a99', m: 'Ascensão', dt: [12, 22] },
  aquario: { n: 'Aquário', g: '♒', el: 'Ar', c: '#2e9cc8', m: 'Feitiços', dt: [1, 20] },
  peixes: { n: 'Peixes', g: '♓', el: 'Água', c: '#4a6fd6', m: 'Ilusão', dt: [2, 19] },
};

/** Signo da temporada atual para a data informada. */
export function currentSign(date: Date): Signo {
  const m = date.getMonth() + 1, d = date.getDate();
  let cur: Signo = 'capricornio';
  [...ORDER].sort((a, b) => RACES[a].dt[0] - RACES[b].dt[0]).forEach(k => {
    const [sm, sd] = RACES[k].dt;
    if (m > sm || (m === sm && d >= sd)) cur = k;
  });
  return cur;
}
