// Efeito visual de magia na Batalha: a animação da magia toca sobre o alvo (criatura, fileira ou herói).
import { card } from '../data/cards';
import { MAGIA, magiaUrl } from '../data/arte';
import type { GameEvent, Side } from '../engine';
import { pronta } from './precarga';
import { center } from './projetil';

/** Duração do efeito (ms): a pausa do quadro 'spell' da Batalha é do mesmo tamanho. */
export const MAGIA_MS = 1100;

function alvo(e: Extract<GameEvent, { t: 'SpellResolved' }>): { id: string; grande: boolean } {
  const c = card(e.cid);
  const foe: Side = e.side === 'p' ? 'e' : 'p';
  if (c.type !== 'spell') return { id: `c-${e.tg.side}-${e.tg.l}-${e.tg.d}`, grande: false };
  switch (c.sp) {
    case 'face': return { id: `hero-${foe}`, grande: false };
    case 'heal': case 'draw': return { id: `hero-${e.side}`, grande: false };
    case 'lane': return { id: `c-${e.tg.side}-${e.tg.l}-1`, grande: true };
    default: return { id: `c-${e.tg.side}-${e.tg.l}-${e.tg.d}`, grande: false };
  }
}

export function efeitosDeMagia(root: HTMLElement, events: GameEvent[]): void {
  for (const e of events) {
    if (e.t !== 'SpellResolved' || !MAGIA[e.cid]) continue;
    const url = magiaUrl(e.cid, card(e.cid).race);
    if (!pronta(url)) continue;
    const { id, grande } = alvo(e);
    const el = document.getElementById(id);
    if (!el) continue;
    const p = center(el, root);
    const fx = document.createElement('div');
    fx.className = `magia-fx${grande ? ' grande' : ''}`;
    fx.style.cssText = `left:${p.x}px;top:${p.y}px;--n:${MAGIA[e.cid]};--t:${MAGIA_MS}ms`;
    fx.innerHTML = `<img src="${url}" alt="">`;
    root.appendChild(fx);
    setTimeout(() => fx.remove(), MAGIA_MS);
  }
}
