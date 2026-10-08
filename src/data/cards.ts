import raw from './cartas.json';
import { CardDbSchema, type Card, type Signo } from './schema';

/** Todas as cartas do jogo, validadas pelo schema ao carregar. Um erro aqui = cartas.json quebrado. */
export const CARDS: Readonly<Record<string, Card>> = CardDbSchema.parse(raw);

export const ECO_ID = 'eco';

/* ---------- nível das cartas (fusão) ----------
 * Uma carta de nível 2..5 é a mesma carta com bônus; o id dela é "<id>*<nível>" (ex.: "aries01*3").
 * Nível 1 é o id normal. O motor do jogo não precisa saber de nível: card() já devolve a carta com o bônus.
 */
export const NIVEL_MAX = 5;

/** Id da carta sem o nível ("aries01*3" → "aries01"). */
export function baseCid(cid: string): string {
  const i = cid.indexOf('*');
  return i < 0 ? cid : cid.slice(0, i);
}

/** Nível da carta pelo id (1 a 5). */
export function nivelDe(cid: string): number {
  const i = cid.indexOf('*');
  if (i < 0) return 1;
  const n = Number(cid.slice(i + 1));
  return n >= 1 && n <= NIVEL_MAX ? Math.floor(n) : 1;
}

/** Id da carta num nível. */
export function comNivel(cid: string, nivel: number): string {
  const b = baseCid(cid);
  return nivel <= 1 ? b : `${b}*${Math.min(NIVEL_MAX, Math.floor(nivel))}`;
}

/**
 * Bônus por nível. Criatura: Nv2 +1 vida, Nv3 +1 ataque, Nv4 +1 vida, Nv5 +1 ataque e +1 vida.
 * Magia: Nv3 e Nv5 dão +1 no efeito (fortalecer: +1 ataque no Nv3, +1 vida no Nv5);
 * as que não têm número (escudo, veneno) e comprar cartas ficam 1 mais baratas no Nv5.
 */
export function aplicarNivel(c: Card, nivel: number): Card {
  const n = Math.max(1, Math.min(NIVEL_MAX, nivel));
  if (n === 1) return c;
  if (c.type === 'unit') {
    return { ...c, atk: c.atk + (n >= 3 ? 1 : 0) + (n >= 5 ? 1 : 0), hp: c.hp + (n >= 2 ? 1 : 0) + (n >= 4 ? 1 : 0) + (n >= 5 ? 1 : 0) };
  }
  const extra = (n >= 3 ? 1 : 0) + (n >= 5 ? 1 : 0);
  switch (c.sp) {
    case 'buff': return { ...c, a: c.a + (n >= 3 ? 1 : 0), h: c.h + (n >= 5 ? 1 : 0) };
    case 'shield': case 'poison': case 'draw': return n >= 5 ? { ...c, cost: Math.max(0, c.cost - 1) } : c;
    default: return { ...c, v: c.v + extra };
  }
}

const comBonus = new Map<string, Card>();

export function card(cid: string): Card {
  const c = CARDS[cid];
  if (c) return c;
  const b = CARDS[baseCid(cid)];
  if (!b) throw new Error(`Carta desconhecida: ${cid}`);
  let v = comBonus.get(cid);
  if (!v) { v = aplicarNivel(b, nivelDe(cid)); comBonus.set(cid, v); }
  return v;
}

/** As 30 cartas de um signo (sem o token Eco). */
export function cardsOfSign(sign: Signo): string[] {
  return Object.keys(CARDS).filter(k => k !== ECO_ID && CARDS[k].race === sign);
}
