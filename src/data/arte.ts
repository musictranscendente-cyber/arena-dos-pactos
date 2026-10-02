// Cartas que já têm arte própria. Os dados ficam em arte.json e anim.json,
// gerados por ferramentas/video_para_sprite.py (ou à mão, para imagens paradas).
import arteJson from './arte.json';
import animJson from './anim.json';

/**
 * Imagens paradas (public/art/<signo>/<id>-parado.webp e -ataque.webp).
 * Os números: largura/altura de cada pose (para a pose de ataque não "pular" de lugar) e o fator de
 * tamanho, que deixa os personagens com tamanhos parecidos no tabuleiro.
 * Carta sem entrada aqui continua usando o emoji.
 */
export const ARTE = arteJson as unknown as Record<string, readonly [parado: number, ataque: number, tamanho?: number]>;

export type Pose = 'parado' | 'ataque';

export function artUrl(cid: string, race: string, pose: Pose): string {
  return `art/${race}/${cid}-${pose}.webp`;
}

/** Uma tira de quadros feita de vídeo. w/h em px de um quadro; ax = centro do corpo (0..1); by = espaço abaixo dos pés (0..1). */
export interface Tira { n: number; w: number; h: number; ax: number; by: number }

/** Cartas com animação quadro a quadro (public/art/<signo>/<id>-idle-anim.webp e -ataque-anim.webp). */
export const ANIM = animJson as Record<string, { idle: Tira; ataque: Tira; s?: number }>;

export function animUrl(cid: string, race: string, kind: 'idle' | 'ataque'): string {
  return `art/${race}/${cid}-${kind}-anim.webp`;
}

/**
 * Porte da criatura no tabuleiro: as mais caras/raras ficam maiores e se destacam.
 * Vai de ~0,74 (custo 1) a ~1,2 (custo 8); a lendária ganha um extra.
 */
const PORTE_CUSTO = [0.74, 0.74, 0.82, 0.9, 0.96, 1.02, 1.08, 1.14, 1.2];

/** Ajuste pela natureza do personagem (bicho pequeno, gigante...), multiplicado ao porte pelo custo. */
const PORTE_EXTRA: Record<string, number> = {
  aries01: 0.9, // cordeirinho
  aries02: 0.9, // planetinha
  aries04: 0.9, // passarinho
  aries08: 0.95, // escudeiro mirim
  aries10: 1.08, // carneiro de guerra
  aries15: 1.08, // cavaleiro montado
  aries18: 0.95, // fênix jovem
  aries21: 1.1, // carneiro colossal
  aries22: 1.12, // titã
};

export function porte(cid: string, custo: number, raridade: string): number {
  const base = PORTE_CUSTO[Math.max(0, Math.min(8, custo))] * (raridade === 'l' ? 1.04 : 1);
  return Math.round(base * (PORTE_EXTRA[cid] ?? 1) * 1000) / 1000;
}
