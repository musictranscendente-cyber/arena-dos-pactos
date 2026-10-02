// Cartas que já têm arte própria (em public/art/<signo>/<id>-parado.webp e -ataque.webp).
// Os números são largura/altura de cada pose: servem para a pose de ataque não "pular" de lugar.
// Carta sem entrada aqui continua usando o emoji.

export const ARTE: Record<string, readonly [parado: number, ataque: number]> = {
  aries25: [0.715, 1.46],
  touro25: [0.658, 1.115],
  gemeos25: [0.967, 1.4],
  cancer25: [0.769, 1.419],
  leao25: [0.825, 1.596],
  virgem25: [0.575, 1.198],
  libra25: [0.812, 1.415],
  escorpiao25: [0.754, 1.033],
  sagitario25: [0.921, 1.115],
  capricornio25: [0.879, 1.396],
  aquario25: [0.817, 1.569],
  peixes25: [0.815, 1.419],
};

export type Pose = 'parado' | 'ataque';

export function artUrl(cid: string, race: string, pose: Pose): string {
  return `art/${race}/${cid}-${pose}.webp`;
}

/** Uma tira de quadros (sprite sheet) feita a partir de vídeo. w/h em px de um quadro; ax = centro do corpo (0..1). */
export interface Tira { n: number; w: number; h: number; ax: number }

/**
 * Cartas com animação quadro a quadro (public/art/<signo>/<id>-idle-anim.webp e -ataque-anim.webp).
 * A altura do quadro parado é a referência de tamanho: as outras tiras usam a mesma escala.
 */
export const ANIM: Record<string, { idle: Tira; ataque: Tira }> = {
  aries25: { idle: { n: 24, w: 120, h: 150, ax: 0.487 }, ataque: { n: 31, w: 246, h: 179, ax: 0.451 } },
};

export function animUrl(cid: string, race: string, kind: 'idle' | 'ataque'): string {
  return `art/${race}/${cid}-${kind}-anim.webp`;
}
