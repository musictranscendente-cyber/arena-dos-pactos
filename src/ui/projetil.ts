// Projéteis: quem ataca de longe lança algo que voa até o alvo (flecha, bola de fogo, água...).
import { card } from '../data/cards';
import { RACES } from '../data/signos';
import type { GameEvent, Side } from '../engine';

/** Criaturas sem Distância cuja arte lança algo (o golpe sai de longe). */
const LANCA = new Set(['virgem25', 'aquario25', 'aries09', 'aries06', 'aries04',
  'escorpiao02', 'escorpiao04', 'escorpiao07', 'escorpiao10', 'escorpiao11', 'escorpiao13', 'escorpiao16',
  'escorpiao17', 'escorpiao18', 'escorpiao20', 'escorpiao21', 'escorpiao23',
  'libra04', 'libra12', 'libra16', 'libra17', 'libra21', 'libra23', 'libra25',
  'sagitario02', 'sagitario04', 'sagitario11', 'sagitario13', 'sagitario17', 'sagitario23',
  'touro03', 'touro04', 'touro09', 'touro18', 'touro23', 'touro24',
  'peixes01', 'peixes04', 'peixes05', 'peixes06', 'peixes07', 'peixes08', 'peixes10', 'peixes11', 'peixes13', 'peixes14',
  'peixes15', 'peixes16', 'peixes17', 'peixes18', 'peixes19', 'peixes20', 'peixes22', 'peixes23', 'peixes24',
  'gemeos01', 'gemeos03', 'gemeos04', 'gemeos05', 'gemeos07', 'gemeos08', 'gemeos10', 'gemeos11', 'gemeos12', 'gemeos14',
  'gemeos17', 'gemeos18', 'gemeos20', 'gemeos23', 'gemeos24',
  'leao01', 'leao04', 'leao08', 'leao10', 'leao11', 'leao12', 'leao17', 'leao18', 'leao19', 'leao21', 'leao22', 'leao24', 'leao25',
  'cancer04', 'cancer10', 'cancer11', 'cancer12', 'cancer13', 'cancer14', 'cancer16', 'cancer17', 'cancer18', 'cancer19', 'cancer21', 'cancer23', 'cancer24', 'cancer25',
  'virgem02', 'virgem03', 'virgem04', 'virgem06', 'virgem10', 'virgem11', 'virgem12', 'virgem15', 'virgem16', 'virgem17', 'virgem18', 'virgem19', 'virgem21', 'virgem23', 'virgem24',
  'aquario01', 'aquario02', 'aquario03', 'aquario04', 'aquario05', 'aquario06', 'aquario07', 'aquario08', 'aquario09', 'aquario10', 'aquario11', 'aquario12', 'aquario13', 'aquario15', 'aquario16', 'aquario17', 'aquario19', 'aquario20', 'aquario21', 'aquario22', 'aquario23', 'aquario24']);

/** Projétil próprio de algumas cartas (senão vale o do elemento do signo). */
const TIPO: Record<string, string> = { aries06: 'flecha', aries09: 'ar', escorpiao11: 'flecha', escorpiao23: 'flecha',
  libra06: 'flecha', libra13: 'flecha', libra17: 'flecha', libra24: 'flecha',
  sagitario01: 'fogo', sagitario03: 'ar', sagitario04: 'ar', sagitario08: 'fogo', sagitario10: 'fogo', sagitario11: 'ar',
  sagitario13: 'terra', sagitario14: 'fogo', sagitario23: 'terra', sagitario24: 'ar', touro04: 'fogo',
  peixes05: 'ar', peixes06: 'veneno', peixes08: 'fogo', peixes13: 'veneno', peixes17: 'fogo', peixes18: 'ar', peixes19: 'veneno',
  gemeos01: 'fogo', gemeos02: 'ar', gemeos03: 'ar', gemeos04: 'ar', gemeos05: 'ar', gemeos07: 'fogo', gemeos09: 'ar',
  gemeos10: 'fogo', gemeos11: 'ar', gemeos12: 'ar', gemeos14: 'ar', gemeos15: 'fogo', gemeos17: 'ar', gemeos18: 'ar',
  gemeos20: 'ar', gemeos21: 'fogo', gemeos23: 'fogo', gemeos24: 'fogo', gemeos25: 'fogo',
  cancer10: 'ar', cancer11: 'ar', cancer12: 'fogo', cancer17: 'ar', cancer24: 'fogo', cancer25: 'ar', virgem02: 'fogo', virgem03: 'veneno', virgem18: 'fogo', virgem21: 'fogo', virgem23: 'fogo', virgem24: 'fogo', virgem25: 'fogo',
  aquario10: 'fogo', aquario16: 'fogo', aquario17: 'fogo', aquario20: 'fogo', aquario21: 'fogo', aquario23: 'fogo', aquario24: 'fogo', aquario05: 'agua', aquario08: 'agua', aquario19: 'agua', aquario25: 'agua' };

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
export function center(el: HTMLElement, root: HTMLElement, up = 0): { x: number; y: number } {
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
