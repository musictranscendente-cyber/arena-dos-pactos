// Sons do jogo, feitos na hora pelo navegador (Web Audio): efeitos curtos e uma música ambiente suave.
// Não usa arquivos. O navegador só deixa tocar depois do primeiro toque do jogador (desbloquear()).
// Modo guardado no aparelho: 'tudo' (efeitos + música), 'efeitos' (sem música) ou 'mudo'.

export type ModoSom = 'tudo' | 'efeitos' | 'mudo';
export type Efeito =
  | 'clique' | 'carta' | 'ataque' | 'golpe' | 'heroi' | 'morte' | 'magia' | 'escudo' | 'cura'
  | 'queimar' | 'batalha' | 'vitoria' | 'derrota';

const CHAVE = 'arena-dos-pactos:som';
const ORDEM: ModoSom[] = ['tudo', 'efeitos', 'mudo'];

let modo: ModoSom = lerModo();
let ctx: AudioContext | null = null;
let fx: GainNode | null = null;
let musica: GainNode | null = null;
const ultimo = new Map<Efeito, number>();

function lerModo(): ModoSom {
  try {
    const v = localStorage.getItem(CHAVE) as ModoSom | null;
    return v && ORDEM.includes(v) ? v : 'tudo';
  } catch {
    return 'tudo';
  }
}

export function modoSom(): ModoSom { return modo; }

export const ICONE_SOM: Record<ModoSom, string> = { tudo: '🔊', efeitos: '🔉', mudo: '🔇' };

/** Toque no botão de som: tudo → só efeitos → mudo → tudo. */
export function trocarModoSom(): ModoSom {
  modo = ORDEM[(ORDEM.indexOf(modo) + 1) % ORDEM.length];
  try { localStorage.setItem(CHAVE, modo); } catch { /* sem armazenamento */ }
  aplicarModo();
  return modo;
}

/** Chamado em todo toque: cria o áudio na primeira vez (exigência dos navegadores). */
export function desbloquear(): void {
  if (modo === 'mudo' && !ctx) return;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch { return; }
    fx = ctx.createGain();
    fx.connect(ctx.destination);
    musica = ctx.createGain();
    musica.gain.value = 0;
    musica.connect(ctx.destination);
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) void ctx.suspend(); else void ctx.resume();
    });
    aplicarModo();
  }
  if (ctx.state === 'suspended' && !document.hidden) void ctx.resume();
}

function aplicarModo(): void {
  if (!ctx || !fx || !musica) return;
  const t = ctx.currentTime;
  fx.gain.setTargetAtTime(modo === 'mudo' ? 0 : 0.5, t, 0.02);
  musica.gain.setTargetAtTime(modo === 'tudo' ? 0.16 : 0, t, 0.4);
  if (modo === 'tudo') iniciarMusica();
}

/* ---------- peças básicas ---------- */

function tom(tipo: OscillatorType, f0: number, f1: number, ini: number, dur: number, vol: number, dest: AudioNode): void {
  const c = ctx!;
  const o = c.createOscillator(), g = c.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f0, ini);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), ini + dur);
  g.gain.setValueAtTime(0.0001, ini);
  g.gain.exponentialRampToValueAtTime(vol, ini + Math.min(0.012, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, ini + dur);
  o.connect(g).connect(dest);
  o.start(ini);
  o.stop(ini + dur + 0.02);
}

let ruidoBuf: AudioBuffer | null = null;
function ruido(ini: number, dur: number, vol: number, filtro: BiquadFilterType, f0: number, f1: number, dest: AudioNode): void {
  const c = ctx!;
  if (!ruidoBuf) {
    ruidoBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = ruidoBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = ruidoBuf;
  f.type = filtro;
  f.frequency.setValueAtTime(f0, ini);
  f.frequency.exponentialRampToValueAtTime(f1, ini + dur);
  f.Q.value = 1.2;
  g.gain.setValueAtTime(0.0001, ini);
  g.gain.exponentialRampToValueAtTime(vol, ini + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ini + dur);
  s.connect(f).connect(g).connect(dest);
  s.start(ini, Math.random() * 0.5);
  s.stop(ini + dur + 0.02);
}

const nota = (n: number) => 440 * 2 ** ((n - 69) / 12);

/** Toca um efeito curto. Repetições do mesmo efeito muito juntas viram uma só. */
export function tocar(e: Efeito): void {
  if (modo === 'mudo' || !ctx || !fx || ctx.state !== 'running') return;
  const agora = ctx.currentTime;
  if (agora - (ultimo.get(e) ?? -1) < 0.05) return;
  ultimo.set(e, agora);
  const t = agora + 0.005, d = fx;
  switch (e) {
    case 'clique': tom('sine', 880, 660, t, 0.05, 0.12, d); break;
    case 'carta':
      ruido(t, 0.09, 0.25, 'bandpass', 2500, 900, d);
      tom('sine', 180, 90, t + 0.03, 0.12, 0.3, d);
      break;
    case 'ataque': ruido(t, 0.16, 0.35, 'bandpass', 500, 2800, d); break;
    case 'golpe':
      tom('sine', 150, 55, t, 0.16, 0.5, d);
      ruido(t, 0.06, 0.3, 'lowpass', 3000, 600, d);
      break;
    case 'heroi':
      tom('sine', 110, 40, t, 0.3, 0.6, d);
      ruido(t, 0.12, 0.3, 'lowpass', 1500, 200, d);
      break;
    case 'morte':
      tom('triangle', 420, 70, t, 0.4, 0.28, d);
      ruido(t + 0.05, 0.3, 0.15, 'lowpass', 1200, 150, d);
      break;
    case 'magia':
      [84, 88, 91, 96].forEach((n, i) => tom('sine', nota(n), nota(n), t + i * 0.05, 0.25, 0.12, d));
      ruido(t, 0.3, 0.06, 'highpass', 5000, 9000, d);
      break;
    case 'escudo':
      tom('square', 1250, 1250, t, 0.12, 0.08, d);
      tom('sine', 1870, 1870, t, 0.3, 0.12, d);
      break;
    case 'cura': [72, 76, 79].forEach((n, i) => tom('sine', nota(n), nota(n), t + i * 0.08, 0.3, 0.14, d)); break;
    case 'queimar':
      ruido(t, 0.35, 0.3, 'lowpass', 400, 4000, d);
      tom('sawtooth', 90, 180, t, 0.3, 0.06, d);
      break;
    case 'batalha':
      tom('sine', 90, 45, t, 0.35, 0.6, d);
      ruido(t, 0.25, 0.2, 'lowpass', 900, 200, d);
      tom('sawtooth', nota(57), nota(64), t + 0.08, 0.3, 0.06, d);
      break;
    case 'vitoria':
      [72, 76, 79, 84].forEach((n, i) => {
        tom('triangle', nota(n), nota(n), t + i * 0.13, i === 3 ? 0.8 : 0.25, 0.22, d);
        tom('sine', nota(n + 12), nota(n + 12), t + i * 0.13, i === 3 ? 0.8 : 0.2, 0.06, d);
      });
      break;
    case 'derrota':
      [69, 65, 62, 57].forEach((n, i) => tom('triangle', nota(n), nota(n), t + i * 0.22, i === 3 ? 0.9 : 0.3, 0.2, d));
      break;
  }
}

/* ---------- música ambiente ---------- */
// Acordes lentos (Lá menor, Fá, Dó, Sol) com notas soltas da escala pentatônica por cima.

const ACORDES = [[57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62]];
const PENTA = [69, 72, 74, 76, 79, 81, 84];
const COMPASSO = 4.8; // segundos por acorde
let musicaTimer: number | null = null;
let proximo = 0;
let passo = 0;

function iniciarMusica(): void {
  if (musicaTimer !== null || !ctx) return;
  proximo = ctx.currentTime + 0.1;
  musicaTimer = window.setInterval(agendar, 400);
  agendar();
}

function agendar(): void {
  if (!ctx || !musica) return;
  if (modo !== 'tudo') { if (musicaTimer !== null) { clearInterval(musicaTimer); musicaTimer = null; } return; }
  while (proximo < ctx.currentTime + 1.5) {
    const ac = ACORDES[passo % ACORDES.length];
    for (const n of ac) pad(nota(n), proximo, COMPASSO);
    tom('sine', nota(ac[0] - 12), nota(ac[0] - 12), proximo, COMPASSO, 0.18, musica);
    // 3 a 5 notas soltas por acorde, em tempos variados
    const k = 3 + (passo % 3);
    for (let i = 0; i < k; i++) {
      const n = PENTA[(passo * 3 + i * 2 + (i % 2 ? 1 : 0)) % PENTA.length];
      tom('triangle', nota(n), nota(n), proximo + 0.3 + i * (COMPASSO / (k + 0.5)), 1.2, 0.07, musica);
    }
    proximo += COMPASSO;
    passo++;
  }
}

function pad(f: number, ini: number, dur: number): void {
  const c = ctx!;
  const o = c.createOscillator(), o2 = c.createOscillator(), filt = c.createBiquadFilter(), g = c.createGain();
  o.type = 'triangle'; o2.type = 'sine';
  o.frequency.value = f; o2.frequency.value = f * 1.003;
  filt.type = 'lowpass'; filt.frequency.value = 900;
  g.gain.setValueAtTime(0.0001, ini);
  g.gain.linearRampToValueAtTime(0.09, ini + 1.2);
  g.gain.linearRampToValueAtTime(0.07, ini + dur - 0.8);
  g.gain.linearRampToValueAtTime(0.0001, ini + dur + 0.6);
  o.connect(filt); o2.connect(filt);
  filt.connect(g).connect(musica!);
  o.start(ini); o2.start(ini);
  o.stop(ini + dur + 0.7); o2.stop(ini + dur + 0.7);
}
