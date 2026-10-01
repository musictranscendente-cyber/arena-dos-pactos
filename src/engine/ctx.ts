import { nextFloat } from './rng';
import type { Frame, GameEvent, GameState, Target } from './types';

/** Contexto de uma resolução: o estado (já clonado) + o gravador de quadros/eventos. */
export class Ctx {
  frames: Frame[] = [];
  private cur: GameEvent[] = [];

  constructor(public s: GameState, private record = true) {}

  emit(e: GameEvent): void {
    this.cur.push(e);
  }

  /** Fecha um quadro: na interface, cada quadro é desenhado e depois há uma pausa. */
  beat(kind: Frame['kind'], active?: Target[]): void {
    const f: Frame = { kind, events: this.cur };
    if (active) f.active = active;
    if (this.record) f.state = structuredClone(this.s);
    this.frames.push(f);
    this.cur = [];
  }

  /** Eventos ainda não fechados em quadro. */
  flush(): GameEvent[] {
    const ev = this.cur;
    this.cur = [];
    return ev;
  }

  rand(): number {
    const [v, next] = nextFloat(this.s.rng);
    this.s.rng = next;
    return v;
  }

  randInt(n: number): number {
    return Math.floor(this.rand() * n);
  }

  nextId(): number {
    return ++this.s.uid;
  }
}
