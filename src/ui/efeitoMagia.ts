// Efeito visual de magia na Batalha: a animação da magia toca sobre o alvo (criatura, fileira ou herói).
import { card } from '../data/cards';
import { MAGIA, MAGIA_LIVRE, magiaUrl } from '../data/arte';
import { RACES } from '../data/signos';
import { T } from '../data/textos';
import type { GameEvent, Side } from '../engine';
import { pronta } from './precarga';
import { center } from './projetil';

/** Duração do efeito (ms): a pausa do quadro 'spell' da Batalha é do mesmo tamanho. */
export const MAGIA_MS = 1100;

/** Onde a magia aparece: a criatura, cada casa da fileira (magia de linha) ou o centro da arena (efeito geral). */
function alvos(e: Extract<GameEvent, { t: 'SpellResolved' }>): string[] {
  const c = card(e.cid);
  const casa = (d: number) => `c-${e.tg.side}-${e.tg.l}-${d}`;
  if (c.type !== 'spell') return [casa(e.tg.d)];
  switch (c.sp) {
    case 'face': case 'heal': case 'draw': return [CENTRO];
    case 'lane': return [casa(0), casa(1), casa(2)];
    default: return [casa(e.tg.d)];
  }
}

const CENTRO = 'centro';
function alvoEl(root: HTMLElement, id: string): HTMLElement | null {
  return id === CENTRO ? root.querySelector<HTMLElement>('.board') : document.getElementById(id);
}

/** Magia de efeito geral (vida, cartas, dano no herói)? Ela ganha o anúncio grande no centro. */
export function efeitoGeral(events: GameEvent[]): boolean {
  return events.some(e => e.t === 'SpellResolved' && (() => {
    const c = card(e.cid);
    return c.type === 'spell' && (c.sp === 'face' || c.sp === 'heal' || c.sp === 'draw');
  })());
}

/** Anúncio grande no centro da arena: ícone, número e uma frase dizendo o que aconteceu. */
function anunciar(root: HTMLElement, e: Extract<GameEvent, { t: 'SpellResolved' }>, events: GameEvent[]): void {
  const c = card(e.cid);
  if (c.type !== 'spell') return;
  const foe: Side = e.side === 'p' ? 'e' : 'p';
  let ico: string, num: string, txt: string, cls: string, destino: string;
  if (c.sp === 'heal') {
    const n = events.filter(x => x.t === 'HeroHealed' && x.side === e.side).reduce((a, x) => a + (x.t === 'HeroHealed' ? x.amount : 0), 0);
    ico = '❤️'; num = `+${n}`; txt = T.efeito.cura(e.side, n); cls = 'cura'; destino = `hero-${e.side}`;
  } else if (c.sp === 'draw') {
    const n = events.filter(x => x.t === 'CardDrawn' && x.side === e.side).length;
    ico = '🃏'; num = `+${n}`; txt = T.efeito.compra(e.side, n); cls = 'compra'; destino = e.side === 'p' ? 'mao' : `hero-${e.side}`;
  } else if (c.sp === 'face') {
    const n = events.filter(x => x.t === 'HeroDamaged' && x.side === foe).reduce((a, x) => a + (x.t === 'HeroDamaged' ? x.amount : 0), 0);
    ico = '💥'; num = `-${n}`; txt = T.efeito.dano(foe, n); cls = 'dano'; destino = `hero-${foe}`;
  } else return;
  const board = root.querySelector<HTMLElement>('.board');
  if (!board) return;
  const p = center(board, root);
  p.y += board.offsetHeight * 0.16; // o quadro fica um pouco abaixo; o efeito animado da magia, um pouco acima
  const el = document.createElement('div');
  el.className = `anuncio-centro ${cls}`;
  el.style.cssText = `left:${p.x}px;top:${p.y}px;--c:${RACES[c.race].c}`;
  el.innerHTML = `<div class="ac-ico">${ico}<b>${num}</b></div><div class="ac-nome">${c.name}</div><div class="ac-txt">${txt}</div>`;
  root.appendChild(el);
  setTimeout(() => el.remove(), MAGIA_MS + EXTRA_GERAL_MS);
  // o ícone voa do centro até quem recebeu o efeito (o coração do herói, ou a mão)
  const alvo = destino === 'mao' ? root.querySelector<HTMLElement>('.hand') : document.getElementById(destino);
  if (!alvo) return;
  setTimeout(() => {
    const q = center(alvo, root);
    const voo = document.createElement('div');
    voo.className = `voo-efeito ${cls}`;
    voo.textContent = ico;
    voo.style.cssText = `left:${p.x}px;top:${p.y}px;--dx:${q.x - p.x}px;--dy:${q.y - p.y}px`;
    root.appendChild(voo);
    setTimeout(() => voo.remove(), 650);
  }, MAGIA_MS * 0.7);
}

/** Tempo a mais que a Batalha espera quando há anúncio no centro (para dar tempo de ler). */
export const EXTRA_GERAL_MS = 700;

/** Atraso entre as casas da magia de linha: o efeito "corre" pela fileira. */
const ONDA_MS = 140;

export function efeitosDeMagia(root: HTMLElement, events: GameEvent[]): void {
  for (const e of events) {
    if (e.t !== 'SpellResolved') continue;
    const c = card(e.cid);
    anunciar(root, e, events);
    const url = MAGIA[e.cid] ? magiaUrl(e.cid, c.race) : null;
    const comArte = !!url && pronta(url);
    alvos(e).forEach((id, i) => {
      setTimeout(() => {
        const el = alvoEl(root, id);
        if (!el) return;
        const p = center(el, root);
        if (id === CENTRO) p.y -= el.offsetHeight * 0.22;
        const fx = document.createElement('div');
        if (comArte) {
          fx.className = MAGIA_LIVRE.has(e.cid) ? 'magia-fx livre' : 'magia-fx';
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
