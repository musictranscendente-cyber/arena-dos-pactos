// Projéteis: quem ataca de longe lança algo que voa até o alvo (flecha, bola de fogo, água...).
import { card } from '../data/cards';
import { RACES } from '../data/signos';
import type { GameEvent, Side } from '../engine';

/** Criaturas sem Distância cuja arte lança algo (o golpe sai de longe). */
const LANCA = new Set(['virgem25', 'peixes25', 'aquario25', 'aries09', 'aries06', 'aries04',
  'escorpiao02', 'escorpiao04', 'escorpiao07', 'escorpiao10', 'escorpiao11', 'escorpiao13', 'escorpiao16',
  'escorpiao17', 'escorpiao18', 'escorpiao20', 'escorpiao21', 'escorpiao23']);

/** Projétil próprio de algumas cartas (senão vale o do elemento do signo). */
const TIPO: Record<string, string> = { aries06: 'flecha', aries09: 'ar', escorpiao11: 'flecha', escorpiao23: 'flecha' };

export function isRanged(cid: string): boolean {
  const c = card(cid);
  return c.type === 'unit' && (c.kw.includes('distancia') || LANCA.has(cid));
}

const ELEMENTO = { Fogo: 'fogo', Terra: 'terra', Ar: 'ar', 'Água': 'agua' } as const;

function kindOf(cid: string): string {
  if (TIPO[cid]) return TIPO[cid];
  const race = card(cid).race;
  if (race === 'sagitario' || race === 'gemeos') return 'flecha';
  if (race === 'escorpiao') return 'veneno';
  return ELEMENTO[RACES[race].el];
}

export interface Shot { from: string; to: string; kind: string; color: string }

/** Lê os eventos de um passo da Batalha: para cada ataque à distância, de onde sai e onde acerta primeiro. */
export function shotsOf(events: GameEvent[]): Shot[] {
  const out: Shot[] = [];
  let cur: { side: Side; l: number; d: number; cid: string } | null = null;
  for (const e of events) {
    if (e.t === 'Attack') { cur = e; continue; }
    if (!cur) continue;
    const foe: Side = cur.side === 'p' ? 'e' : 'p';
    let to: string | null = null;
    if ((e.t === 'Damage' || e.t === 'ShieldBroken' || e.t === 'ArmorBlocked') && e.side === foe) to = `c-${e.side}-${e.l}-${e.d}`;
    else if (e.t === 'HeroDamaged' && e.side === foe) to = `hero-${e.side}`;
    if (!to) continue;
    if (isRanged(cur.cid)) {
      out.push({ from: `c-${cur.side}-${cur.l}-${cur.d}`, to, kind: kindOf(cur.cid), color: RACES[card(cur.cid).race].c });
    }
    cur = null; // só o primeiro acerto de cada ataque
  }
  return out;
}

/**
 * Centro de um elemento em coordenadas do #app, já com a perspectiva da arena aplicada
 * (usa a posição real na tela e desfaz o giro do modo deitado, se ele estiver ligado).
 */
function center(el: HTMLElement, root: HTMLElement, up = 0): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  const X = (r.left + r.right) / 2, Y = (r.top + r.bottom) / 2;
  if (document.body.classList.contains('rot')) {
    // #app está girado 90° (rotate(90deg) translateY(-100%), a partir do canto de cima à esquerda):
    // o "para cima" do jogo é o "para a direita" da tela
    return { x: Y, y: root.offsetHeight - X - r.width * up };
  }
  const a = root.getBoundingClientRect();
  return { x: X - a.left, y: Y - a.top - r.height * up };
}

export function launch(root: HTMLElement, shot: Shot, delayMs: number, durMs: number): void {
  setTimeout(() => {
    const a = document.getElementById(shot.from), b = document.getElementById(shot.to);
    if (!a || !b) return;
    const p0 = center(a, root, 0.15), p1 = center(b, root, b.id.startsWith('hero') ? 0 : 0.15);
    const dx = p1.x - p0.x, dy = p1.y - p0.y;
    const el = document.createElement('div');
    el.className = `shot ${shot.kind}`;
    el.style.cssText = `left:${p0.x}px;top:${p0.y}px;--dx:${dx}px;--dy:${dy}px;--ang:${Math.atan2(dy, dx)}rad;--c:${shot.color};animation-duration:${durMs}ms`;
    el.innerHTML = '<i></i>';
    root.appendChild(el);
    setTimeout(() => {
      el.remove();
      const boom = document.createElement('div');
      boom.className = `boom ${shot.kind}`;
      boom.style.cssText = `left:${p1.x}px;top:${p1.y}px;--c:${shot.color}`;
      root.appendChild(boom);
      setTimeout(() => boom.remove(), 450);
    }, durMs);
  }, delayMs);
}
