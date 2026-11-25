// Visuais (cosméticos): tabuleiros, avatares (foto do perfil) e cenários de duelo (tela de VS antes da partida).
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

/** Cores de um cenário de duelo: fundo (centro → borda), raios, faixa e brilho do VS. */
export interface TemaDuelo {
  fundo: [string, string, string];
  raios: string;
  faixa: string;
  brilho: string;
  /** Estrelas/constelações por cima do fundo. */
  estrelas?: boolean;
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
  duelo?: TemaDuelo;
  /** Avatar: criatura (id da carta) ou medalhão do signo. */
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

export const DUELOS: readonly ItemVisual[] = [
  { id: 'duelo-classico', tipo: 'duelo', n: ['Arena Clássica', 'Classic Arena'], r: 'c', preco: null },
  { id: 'duelo-supernova', tipo: 'duelo', n: ['Supernova', 'Supernova'], r: 'e', preco: p(1500),
    duelo: { fundo: ['#fff2c4', '#ff8a2a', '#3a0a00'], raios: '#fff6d0', faixa: '#ff9a3a', brilho: '#ffb02e' } },
  { id: 'duelo-nebulosa', tipo: 'duelo', n: ['Nebulosa Rosa', 'Pink Nebula'], r: 'e', preco: p(1500),
    duelo: { fundo: ['#ff9ad8', '#8a2a9a', '#14041e'], raios: '#ffd0f0', faixa: '#ff6ac0', brilho: '#ff7ad0', estrelas: true } },
  { id: 'duelo-aurora', tipo: 'duelo', n: ['Aurora Boreal', 'Northern Lights'], r: 'l', preco: g(80),
    duelo: { fundo: ['#8affd0', '#0a6a7a', '#020e1a'], raios: '#c8fff0', faixa: '#3affb0', brilho: '#3affc8', estrelas: true } },
  { id: 'duelo-eclipse', tipo: 'duelo', n: ['Eclipse Dourado', 'Golden Eclipse'], r: 'l', preco: g(80),
    duelo: { fundo: ['#ffd76a', '#2a1a04', '#000000'], raios: '#ffd76a', faixa: '#ffc23a', brilho: '#ffd76a' } },
  { id: 'duelo-lua-sangue', tipo: 'duelo', n: ['Lua de Sangue', 'Blood Moon'], r: 'l', preco: g(100),
    duelo: { fundo: ['#ff4a3a', '#5a0a10', '#0a0002'], raios: '#ff9a8a', faixa: '#ff2a2a', brilho: '#ff3a2a', estrelas: true } },
  { id: 'duelo-abismo', tipo: 'duelo', n: ['Abismo Cósmico', 'Cosmic Abyss'], r: 'l', preco: g(100),
    duelo: { fundo: ['#6ab8ff', '#0a1a5a', '#00020a'], raios: '#bfe0ff', faixa: '#3a7aff', brilho: '#5ab0ff', estrelas: true } },
];

/** Avatares: criaturas (lendária e épica por Gemas, rara por Poeira) e, no fim, o medalhão de cada signo, grátis. */
export const AVATARES: readonly ItemVisual[] = [
  ...ORDER.flatMap((s): ItemVisual[] => [
    { id: `av-${s}25`, tipo: 'avatar', n: ['', ''], r: 'l', preco: g(40), cid: `${s}25`, signo: s },
    { id: `av-${s}24`, tipo: 'avatar', n: ['', ''], r: 'e', preco: g(25), cid: `${s}24`, signo: s },
    { id: `av-${s}23`, tipo: 'avatar', n: ['', ''], r: 'r', preco: p(700), cid: `${s}23`, signo: s },
  ]),
  ...ORDER.map((s): ItemVisual => ({ id: `av-sg-${s}`, tipo: 'avatar', n: ['Medalhão', 'Medallion'], r: 'c', preco: null, signo: s })),
];

export const VISUAIS: readonly ItemVisual[] = [...TABULEIROS, ...AVATARES, ...DUELOS];
const POR_ID = new Map(VISUAIS.map(i => [i.id, i]));
export const itemVisual = (id: string): ItemVisual | undefined => POR_ID.get(id);

export const PADRAO: Record<TipoVisual, string> = { tabuleiro: 'tab-classico', avatar: '', duelo: 'duelo-classico' };

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
