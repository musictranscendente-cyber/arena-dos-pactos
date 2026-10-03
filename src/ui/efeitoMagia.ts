// Efeito visual de magia na Batalha: a animação da magia toca sobre o alvo (criatura, fileira ou herói).
import { card } from '../data/cards';
import { MAGIA, magiaUrl } from '../data/arte';
import { RACES } from '../data/signos';
import type { GameEvent, Side } from '../engine';
import { pronta } from './precarga';
import { center } from './projetil';

/** Duração do efeito (ms): a pausa do quadro 'spell' da Batalha é do mesmo tamanho. */
export const MAGIA_MS = 1100;

/** Onde a magia aparece: a criatura, o herói, ou cada casa da fileira (magia de linha). */
function alvos(e: Extract<GameEvent, { t: 'SpellResolved' }>): string[] {
  const c = card(e.cid);
  const foe: Side = e.side === 'p' ? 'e' : 'p';
  const casa = (d: number) => `c-${e.tg.side}-${e.tg.l}-${d}`;
  if (c.type !== 'spell') return [casa(e.tg.d)];
  switch (c.sp) {
    case 'face': return [`hero-${foe}`];
    case 'heal': case 'draw': return [`hero-${e.side}`];
    case 'lane': return [casa(0), casa(1), casa(2)];
    default: return [casa(e.tg.d)];
  }
}

/** Atraso entre as casas da magia de linha: o efeito "corre" pela fileira. */
const ONDA_MS = 140;

export function efeitosDeMagia(root: HTMLElement, events: GameEvent[]): void {
  for (const e of events) {
    if (e.t !== 'SpellResolved') continue;
    const c = card(e.cid);
    const url = MAGIA[e.cid] ? magiaUrl(e.cid, c.race) : null;
    const comArte = !!url && pronta(url);
    alvos(e).forEach((id, i) => {
      setTimeout(() => {
        const el = document.getElementById(id);
        if (!el) return;
        const p = center(el, root);
        const fx = document.createElement('div');
        if (comArte) {
          fx.className = 'magia-fx';
          fx.style.cssText = `left:${p.x}px;top:${p.y}px;--n:${MAGIA[e.cid]};--t:${MAGIA_MS - i * ONDA_MS}ms`;
          fx.innerHTML = `<img src="${url}" alt="">`;
        } else {
          // magia ainda sem arte própria: brilho na cor do signo
          fx.className = 'magia-gen';
          fx.style.cssText = `left:${p.x}px;top:${p.y}px;--c:${RACES[c.race].c}`;
        }
        root.appendChild(fx);
        setTimeout(() => fx.remove(), MAGIA_MS - i * ONDA_MS);
      }, i * ONDA_MS);
    });
  }
}
