// Gerador aleatório com semente (mulberry32). O estado é só um número, então cabe no GameState
// e a mesma semente sempre gera a mesma partida.

export function nextFloat(seedState: number): [number, number] {
  let t = (seedState + 0x6d2b79f5) | 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** Gerador mutável, para quem não guarda o estado no GameState (ex.: a IA). */
export class Rng {
  constructor(public state: number) {}
  float(): number {
    const [v, s] = nextFloat(this.state);
    this.state = s;
    return v;
  }
  int(n: number): number {
    return Math.floor(this.float() * n);
  }
}

export function shuffleWith<T>(arr: T[], int: (n: number) => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = int(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
