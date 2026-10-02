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
