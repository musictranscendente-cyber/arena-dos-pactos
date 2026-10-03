// Cartas que já têm arte própria. Os dados ficam em arte.json e anim.json,
// gerados por ferramentas/video_para_sprite.py (ou à mão, para imagens paradas).
import arteJson from './arte.json';
import animJson from './anim.json';
import magiaJson from './magia.json';
import centroJson from './centro.json';

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
  escorpiao01: 0.9, // escorpiãozinho
  escorpiao03: 0.9, // morceguinho
  escorpiao04: 0.9, // sapinho
  escorpiao09: 0.92, // vespa
  escorpiao12: 1.08, // escorpião gigante
  escorpiao19: 1.1, // hidra
  escorpiao21: 1.05, // basilisco
  libra03: 0.9, // pombinha
  libra09: 0.95, // cisne
  libra15: 1.08, // urso guardião
  libra18: 1.08, // grifo
  libra21: 1.05, // templo vivo
  sagitario03: 0.9, // falcão abre as asas
  sagitario21: 0.9, // cometa: a cauda é comprida
  peixes03: 0.82, peixes06: 0.85, peixes12: 0.9, peixes17: 0.9, // peixes compridos: o corpo deitado ocupa a largura toda
};

export function porte(cid: string, custo: number, raridade: string): number {
  const base = PORTE_CUSTO[Math.max(0, Math.min(8, custo))] * (raridade === 'l' ? 1.04 : 1);
  return Math.round(base * (PORTE_EXTRA[cid] ?? 1) * 1000) / 1000;
}

/**
 * Tamanho final da figura no campo (fator --s), a partir de normalização × porte.
 * A figura tem 1,28 × s da altura da casa; acima de LIVRE o crescimento é bem amortecido
 * (a maior chega a ~0,74 da casa), para todas caberem centralizadas no quadrado e os grandes ainda se destacarem.
 */
const LIVRE = 0.5, AMORTECE = 0.2;
export function escalaCampo(s: number): number {
  const h = 1.28 * s;
  return h <= LIVRE ? s : (LIVRE + (h - LIVRE) * AMORTECE) / 1.28;
}

/**
 * Centro visível de cada personagem animado (ferramentas/centros.py): [ox, oy] em alturas do quadro,
 * medidos a partir da âncora do corpo (ox) e dos pés (oy). Usado para pôr o personagem bem no meio da casa.
 */
export const CENTRO = centroJson as unknown as Record<string, [number, number]>;

/**
 * Magias com animação de efeito (public/art/<signo>/<id>-magia-anim.webp): número de quadros.
 * No json: um número (ilustração com cenário, vira um clarão redondo) ou { n, livre } (efeito com
 * o fundo recortado, aparece solto sobre a arena).
 */
const magiaDados = magiaJson as Record<string, number | { n: number; livre?: boolean }>;
export const MAGIA: Record<string, number> = Object.fromEntries(
  Object.entries(magiaDados).map(([k, v]) => [k, typeof v === 'number' ? v : v.n]));
export const MAGIA_LIVRE = new Set(Object.keys(magiaDados).filter(k => typeof magiaDados[k] === 'object'));

export function magiaUrl(cid: string, race: string): string {
  return `art/${race}/${cid}-magia-anim.webp`;
}
