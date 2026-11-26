// Visuais (cosméticos): tabuleiros, avatares (foto do perfil) e campeões do duelo (quem representa você na tela de VS).
// Não mudam nada na partida: só a aparência. Alguns são grátis; os outros custam Poeira ou Gemas.
// Lógica pura (sem tela): comprar e usar devolvem um progresso novo.
import { ORDER } from '../data/signos';
import type { Signo } from '../data/schema';
import type { Progresso } from './progresso';

export type TipoVisual = 'tabuleiro' | 'avatar' | 'duelo';
export type Moeda = 'poeira' | 'gemas';
export type RaridadeVisual = 'c' | 'r' | 'e' | 'l';

/** Cores de um tabuleiro: tinta das casas (e como ela mistura com o mármore), bloco, borda, brilho e filtro do cenário. */
export interface TemaTabuleiro {
  tinta: string;
  modo: 'multiply' | 'color' | 'overlay' | 'hard-light' | 'soft-light';
  plat: [string, string, string];
  borda: string;
  brilho: string;
  cena: string;
  friso: string;
}

export interface ItemVisual {
  id: string;
  tipo: TipoVisual;
  /** Nome em português e em inglês. */
  n: [string, string];
  r: RaridadeVisual;
  /** null = grátis. */
  preco: { m: Moeda; v: number } | null;
  tab?: TemaTabuleiro;
  /** Avatar ou campeão: criatura (id da carta); avatar sem criatura = medalhão do signo. */
  cid?: string;
  signo?: Signo;
}

const g = (v: number) => ({ m: 'gemas' as const, v });
const p = (v: number) => ({ m: 'poeira' as const, v });

export const TABULEIROS: readonly ItemVisual[] = [
  { id: 'tab-classico', tipo: 'tabuleiro', n: ['Mármore Celestial', 'Celestial Marble'], r: 'c', preco: null },
  { id: 'tab-ouro', tipo: 'tabuleiro', n: ['Trono Solar', 'Solar Throne'], r: 'e', preco: p(2500),
    tab: { tinta: '#ffc94a', modo: 'multiply', plat: ['#fff1c2', '#f0c560', '#c08a2a'], borda: '#fff2b0', brilho: '#ffb52e', cena: 'sepia(.35) saturate(1.3) hue-rotate(-12deg) brightness(.95)', friso: 'sepia(.6) saturate(1.6) hue-rotate(-10deg)' } },
  { id: 'tab-jardim', tipo: 'tabuleiro', n: ['Jardim de Virgem', 'Virgo Garden'], r: 'e', preco: p(2500),
    tab: { tinta: '#8fdc7a', modo: 'multiply', plat: ['#e4f7d4', '#a9d98c', '#6aa257'], borda: '#d9f5a8', brilho: '#7be06a', cena: 'hue-rotate(-80deg) saturate(1.1)', friso: 'hue-rotate(-90deg) saturate(1.2)' } },
  { id: 'tab-gelo', tipo: 'tabuleiro', n: ['Geleira Eterna', 'Eternal Glacier'], r: 'l', preco: g(120),
    tab: { tinta: '#9fe4ff', modo: 'multiply', plat: ['#f2fbff', '#bfe6f7', '#86c2e0'], borda: '#e8fbff', brilho: '#6fd8ff', cena: 'hue-rotate(-40deg) saturate(.8) brightness(1.05)', friso: 'hue-rotate(-50deg) saturate(.6) brightness(1.1)' } },
  { id: 'tab-fogo', tipo: 'tabuleiro', n: ['Forja de Áries', 'Aries Forge'], r: 'l', preco: g(120),
    tab: { tinta: '#ff8a5a', modo: 'multiply', plat: ['#ffd6b8', '#f0875a', '#a8422a'], borda: '#ffcf7a', brilho: '#ff5a2a', cena: 'hue-rotate(-115deg) saturate(1.5) brightness(.9)', friso: 'hue-rotate(-120deg) saturate(1.8) brightness(.9)' } },
  { id: 'tab-rosa', tipo: 'tabuleiro', n: ['Quartzo de Libra', 'Libra Quartz'], r: 'l', preco: g(120),
    tab: { tinta: '#ffa8d8', modo: 'multiply', plat: ['#ffe6f4', '#f2b4d8', '#c77aa8'], borda: '#fff0f8', brilho: '#ff7ac8', cena: 'hue-rotate(50deg) saturate(1.2)', friso: 'hue-rotate(40deg) saturate(1.3)' } },
  { id: 'tab-abismo', tipo: 'tabuleiro', n: ['Abismo de Peixes', 'Pisces Abyss'], r: 'l', preco: g(150),
    tab: { tinta: '#4f7cff', modo: 'multiply', plat: ['#6d8fe0', '#3a56b0', '#1e2c6a'], borda: '#9fd0ff', brilho: '#4fb0ff', cena: 'hue-rotate(-20deg) saturate(1.3) brightness(.75)', friso: 'hue-rotate(-30deg) saturate(1.5) brightness(.7)' } },
  { id: 'tab-obsidiana', tipo: 'tabuleiro', n: ['Obsidiana Abissal', 'Abyssal Obsidian'], r: 'l', preco: g(150),
    tab: { tinta: '#6a4a9a', modo: 'multiply', plat: ['#5a4680', '#36285a', '#1c1430'], borda: '#c79cff', brilho: '#a45cff', cena: 'saturate(1.2) brightness(.6) contrast(1.1)', friso: 'brightness(.45) saturate(1.4) hue-rotate(20deg)' } },
];

/**
 * Campeões do duelo: a criatura que representa você na tela de VS antes da partida (Campanha e Ranqueada).
 * "Automático" (grátis) = a criatura mais forte do seu deck. As outras: lendária e épica de cada signo por Gemas, rara por Poeira.
 */
export const CAMPEAO_AUTO = 'camp-auto';
export const CAMPEOES: readonly ItemVisual[] = [
  { id: CAMPEAO_AUTO, tipo: 'duelo', n: ['Automático', 'Automatic'], r: 'c', preco: null },
  ...ORDER.flatMap((s): ItemVisual[] => [
    { id: `camp-${s}25`, tipo: 'duelo', n: ['', ''], r: 'l', preco: g(60), cid: `${s}25`, signo: s },
    { id: `camp-${s}24`, tipo: 'duelo', n: ['', ''], r: 'e', preco: g(35), cid: `${s}24`, signo: s },
    { id: `camp-${s}22`, tipo: 'duelo', n: ['', ''], r: 'r', preco: p(900), cid: `${s}22`, signo: s },
  ]),
];

/** Cenários de duelo da primeira versão (retirados): quem comprou recebe a moeda de volta. */
const DUELOS_ANTIGOS: Record<string, { m: Moeda; v: number }> = {
  'duelo-supernova': p(1500), 'duelo-nebulosa': p(1500), 'duelo-aurora': g(80), 'duelo-eclipse': g(80), 'duelo-lua-sangue': g(100), 'duelo-abismo': g(100),
};
/** Moedas a devolver pelos cenários antigos que estão no salvo. */
export function reembolsoAntigo(raw: unknown): { poeira: number; gemas: number } {
  const r = { poeira: 0, gemas: 0 };
  const tem = (raw as { tem?: unknown } | null)?.tem;
  if (Array.isArray(tem)) for (const id of new Set(tem)) { const x = typeof id === 'string' ? DUELOS_ANTIGOS[id] : undefined; if (x) r[x.m] += x.v; }
  return r;
}

/** Avatares: criaturas (lendária e épica por Gemas, rara por Poeira) e, no fim, o medalhão de cada signo, grátis. */
export const AVATARES: readonly ItemVisual[] = [
  ...ORDER.flatMap((s): ItemVisual[] => [
    { id: `av-${s}25`, tipo: 'avatar', n: ['', ''], r: 'l', preco: g(40), cid: `${s}25`, signo: s },
    { id: `av-${s}24`, tipo: 'avatar', n: ['', ''], r: 'e', preco: g(25), cid: `${s}24`, signo: s },
    { id: `av-${s}23`, tipo: 'avatar', n: ['', ''], r: 'r', preco: p(700), cid: `${s}23`, signo: s },
  ]),
  ...ORDER.map((s): ItemVisual => ({ id: `av-sg-${s}`, tipo: 'avatar', n: ['Medalhão', 'Medallion'], r: 'c', preco: null, signo: s })),
];

export const VISUAIS: readonly ItemVisual[] = [...TABULEIROS, ...AVATARES, ...CAMPEOES];
const POR_ID = new Map(VISUAIS.map(i => [i.id, i]));
export const itemVisual = (id: string): ItemVisual | undefined => POR_ID.get(id);

export const PADRAO: Record<TipoVisual, string> = { tabuleiro: 'tab-classico', avatar: '', duelo: CAMPEAO_AUTO };

/** O que o jogador tem e está usando. avatar '' = medalhão do signo do deck. */
export interface EstadoVisual { tem: string[]; tabuleiro: string; avatar: string; duelo: string }
export const visualPadrao = (): EstadoVisual => ({ tem: [], ...PADRAO });

/** Confere o que veio salvo (itens que não existem mais saem). */
export function normalizarVisual(raw: unknown): EstadoVisual {
  const v = visualPadrao();
  if (!raw || typeof raw !== 'object') return v;
  const r = raw as Partial<EstadoVisual>;
  if (Array.isArray(r.tem)) v.tem = [...new Set(r.tem.filter(id => typeof id === 'string' && POR_ID.get(id)?.preco))];
  const ok = (id: unknown, t: TipoVisual) => typeof id === 'string' && POR_ID.get(id)?.tipo === t && (!POR_ID.get(id)!.preco || v.tem.includes(id));
  if (ok(r.tabuleiro, 'tabuleiro')) v.tabuleiro = r.tabuleiro!;
  if (ok(r.duelo, 'duelo')) v.duelo = r.duelo!;
  if (r.avatar === '' || ok(r.avatar, 'avatar')) v.avatar = r.avatar ?? '';
  return v;
}

export function temVisual(p: Progresso, id: string): boolean {
  const i = POR_ID.get(id);
  return !!i && (!i.preco || p.visual.tem.includes(id));
}

export type MotivoCompra = 'tem' | 'poeira' | 'gemas' | 'invalido';

export function podeComprar(p: Progresso, id: string): MotivoCompra | null {
  const i = POR_ID.get(id);
  if (!i) return 'invalido';
  if (temVisual(p, id)) return 'tem';
  if (i.preco && p[i.preco.m] < i.preco.v) return i.preco.m;
  return null;
}

/** Compra (desconta a moeda) e já passa a usar o item. Devolve o mesmo progresso se não puder. */
export function comprarVisual(p0: Progresso, id: string): Progresso {
  if (podeComprar(p0, id)) return p0;
  const i = POR_ID.get(id)!;
  const p = structuredClone(p0);
  if (i.preco) p[i.preco.m] -= i.preco.v;
  p.visual.tem.push(id);
  return usarVisual(p, id);
}

export function usarVisual(p0: Progresso, id: string): Progresso {
  const i = POR_ID.get(id);
  if (!i || !temVisual(p0, id)) return p0;
  return { ...p0, visual: { ...p0.visual, [i.tipo]: id } };
}

/** Avatar de um jogador da arena (bot): uns usam o medalhão, outros uma criatura (sempre o mesmo para o mesmo bot). */
export function avatarDoBot(signo: Signo, sorte: number): string {
  if (sorte < 0.45) return `av-sg-${signo}`;
  return `av-${signo}${sorte < 0.7 ? '23' : sorte < 0.88 ? '24' : '25'}`;
}
