// Sons do jogo, feitos na hora pelo navegador (Web Audio), sem arquivos.
// Para não soar "8 bits": impactos com corpo (graves que caem de tom + ruído filtrado), timbres de metal e sino
// (parciais inarmônicas), reverberação de sala e pequenas variações a cada vez que um som toca.
// O navegador só deixa tocar depois do primeiro toque do jogador (desbloquear()).
// Música e efeitos ligam/desligam separados (guardado no aparelho).

export type Efeito =
  | 'clique' | 'selecionar' | 'carta' | 'comprar' | 'voltar' | 'ataque' | 'golpe' | 'heroi' | 'morte'
  | 'magia' | 'buff' | 'escudo' | 'bloqueio' | 'cura' | 'veneno' | 'ferrao' | 'empurrao' | 'ilusao'
  | 'queimar' | 'batalha' | 'rodada' | 'vitoria' | 'derrota';

const CHAVE = 'arena-dos-pactos:som2';
const CHAVE_ANTIGA = 'arena-dos-pactos:som';

interface Prefs { musica: boolean; efeitos: boolean }
let prefs: Prefs = lerPrefs();

let ctx: AudioContext | null = null;
let fx: GainNode | null = null;
let musica: GainNode | null = null;
let eco: GainNode | null = null; // envio para a reverberação
let fxEco: GainNode | null = null; // parte dos efeitos que vai para a reverberação
const ultimo = new Map<Efeito, number>();

function lerPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(CHAVE);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>;
      return { musica: p.musica !== false, efeitos: p.efeitos !== false };
    }
    const antigo = localStorage.getItem(CHAVE_ANTIGA);
    if (antigo === 'mudo') return { musica: false, efeitos: false };
    if (antigo === 'efeitos') return { musica: false, efeitos: true };
  } catch { /* sem armazenamento */ }
  return { musica: true, efeitos: true };
}

export function prefsSom(): Prefs { return { ...prefs }; }

/** Ícone do botão de som: 🔊 tudo, 🔉 só um dos dois, 🔇 nada. */
export function iconeSom(): string {
  return prefs.musica && prefs.efeitos ? '🔊' : prefs.musica || prefs.efeitos ? '🔉' : '🔇';
}

export function alternarSom(qual: keyof Prefs): void {
  prefs = { ...prefs, [qual]: !prefs[qual] };
  try { localStorage.setItem(CHAVE, JSON.stringify(prefs)); } catch { /* sem armazenamento */ }
  desbloquear();
  aplicar();
}

/** Chamado em todo toque: cria o áudio na primeira vez (exigência dos navegadores). */
export function desbloquear(): void {
  if (!prefs.musica && !prefs.efeitos && !ctx) return;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch { return; }
    const comp = ctx.createDynamicsCompressor(); // segura picos quando muitos sons tocam juntos
    comp.threshold.value = -14; comp.ratio.value = 4;
    comp.connect(ctx.destination);
    const rev = ctx.createConvolver();
    rev.buffer = salaImpulso(ctx, 1.8);
    const revVol = ctx.createGain();
    revVol.gain.value = 0.55;
    rev.connect(revVol).connect(comp);
    eco = ctx.createGain();
    eco.connect(rev);
    fxEco = ctx.createGain();
    fxEco.connect(eco);
    fx = ctx.createGain();
    fx.connect(comp);
    musica = ctx.createGain();
    musica.gain.value = 0;
    musica.connect(comp);
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) void ctx.suspend(); else void ctx.resume();
    });
    aplicar();
  }
  if (ctx.state === 'suspended' && !document.hidden) void ctx.resume();
}

function aplicar(): void {
  if (!ctx || !fx || !musica) return;
  const t = ctx.currentTime;
  fx.gain.setTargetAtTime(prefs.efeitos ? 0.6 : 0, t, 0.02);
  fxEco!.gain.setTargetAtTime(prefs.efeitos ? 1 : 0, t, 0.02);
  musica.gain.setTargetAtTime(prefs.musica ? 0.22 : 0, t, 0.4);
  if (prefs.musica) iniciarMusica();
}

/** Resposta de uma sala (ruído que some aos poucos, estéreo): dá o "ar" de ambiente real. */
function salaImpulso(c: AudioContext, seg: number): AudioBuffer {
  const n = Math.floor(c.sampleRate * seg);
  const b = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3;
  }
  return b;
}

/* ---------- peças básicas ---------- */

const varia = (v: number, p = 0.06) => v * (1 + (Math.random() * 2 - 1) * p);

/** Volume que sobe rápido e cai em curva (como um som de verdade). */
function envelope(g: GainNode, ini: number, ataque: number, dur: number, vol: number): void {
  g.gain.setValueAtTime(0.0001, ini);
  g.gain.exponentialRampToValueAtTime(vol, ini + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, ini + dur);
}

/** Saída com um pouco de reverberação (molhado 0..1). */
function saida(molhado: number): GainNode {
  const c = ctx!;
  const g = c.createGain();
  g.connect(fx!);
  if (molhado > 0) {
    const w = c.createGain();
    w.gain.value = molhado;
    g.connect(w).connect(fxEco!);
  }
  return g;
}

/** Grave que cai de tom: o "corpo" de um impacto. */
function corpo(ini: number, f0: number, f1: number, dur: number, vol: number, dest: AudioNode): void {
  const c = ctx!;
  const o = c.createOscillator(), g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(varia(f0), ini);
  o.frequency.exponentialRampToValueAtTime(f1, ini + dur * 0.8);
  envelope(g, ini, 0.004, dur, vol);
  o.connect(g).connect(dest);
  o.start(ini); o.stop(ini + dur + 0.05);
}

let ruidoBuf: AudioBuffer | null = null;
/** Ruído filtrado com varredura de frequência (vento, papel, golpe, fogo...). */
function sopro(ini: number, dur: number, vol: number, tipo: BiquadFilterType, f0: number, f1: number, q: number,
  dest: AudioNode, ataque = 0.006): void {
  const c = ctx!;
  if (!ruidoBuf) {
    ruidoBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = ruidoBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = ruidoBuf;
  f.type = tipo;
  f.frequency.setValueAtTime(varia(f0), ini);
  f.frequency.exponentialRampToValueAtTime(varia(f1), ini + dur);
  f.Q.value = q;
  envelope(g, ini, ataque, dur, vol);
  s.connect(f).connect(g).connect(dest);
  s.start(ini, Math.random() * 1.5);
  s.stop(ini + dur + 0.05);
}

/** Timbre de metal/sino: várias frequências inarmônicas que somem em tempos diferentes. */
function sino(ini: number, f: number, razoes: number[], dur: number, vol: number, dest: AudioNode): void {
  const c = ctx!;
  const base = varia(f, 0.02);
  razoes.forEach((r, i) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.value = base * r;
    envelope(g, ini, 0.003, dur / (1 + i * 0.6), vol / (1 + i * 0.7));
    o.connect(g).connect(dest);
    o.start(ini); o.stop(ini + dur + 0.05);
  });
}

const SINO = [1, 2.0, 3.01, 4.17];
const METAL = [1, 2.32, 4.25, 6.63, 9.38];
const GONGO = [1, 1.48, 2.0, 2.68, 3.4, 4.1];
const nota = (n: number) => 440 * 2 ** ((n - 69) / 12);

/** Toca um efeito. Repetições do mesmo efeito muito juntas viram uma só. */
export function tocar(e: Efeito): void {
  if (!prefs.efeitos || !ctx || !fx || ctx.state !== 'running') return;
  const agora = ctx.currentTime;
  if (agora - (ultimo.get(e) ?? -1) < 0.06) return;
  ultimo.set(e, agora);
  const t = agora + 0.005;
  switch (e) {
    case 'clique': {
      const d = saida(0.05);
      sopro(t, 0.03, 0.25, 'highpass', 3000, 2500, 0.7, d, 0.001);
      corpo(t, 900, 500, 0.04, 0.12, d);
      break;
    }
    case 'selecionar': sopro(t, 0.09, 0.22, 'bandpass', 2600, 5200, 1.2, saida(0.1)); break;
    case 'carta': {
      const d = saida(0.15);
      sopro(t, 0.14, 0.3, 'bandpass', 1500, 4200, 1, d);
      corpo(t + 0.08, 160, 70, 0.1, 0.35, d);
      sopro(t + 0.08, 0.05, 0.2, 'lowpass', 2000, 500, 0.7, d, 0.001);
      break;
    }
    case 'comprar': sopro(t, 0.22, 0.22, 'bandpass', 1800, 6000, 1.4, saida(0.1), 0.03); break;
    case 'voltar': sopro(t, 0.18, 0.2, 'bandpass', 5000, 1500, 1.2, saida(0.1), 0.05); break;
    case 'ataque': sopro(t, 0.26, 0.5, 'bandpass', 350, 2200, 3, saida(0.15), 0.08); break;
    case 'golpe': {
      const d = saida(0.22);
      corpo(t, 130, 45, 0.18, 0.8, d);
      sopro(t, 0.1, 0.5, 'lowpass', 3000, 300, 0.8, d, 0.002);
      sopro(t, 0.025, 0.25, 'highpass', 4000, 3000, 0.7, d, 0.001);
      break;
    }
    case 'heroi': {
      const d = saida(0.35);
      corpo(t, 95, 32, 0.45, 1, d);
      sopro(t, 0.25, 0.45, 'lowpass', 1600, 120, 0.8, d, 0.003);
      sopro(t + 0.02, 0.06, 0.2, 'highpass', 3000, 2000, 0.7, d, 0.001);
      break;
    }
    case 'morte': {
      const d = saida(0.5);
      corpo(t, 110, 40, 0.3, 0.6, d);
      sopro(t, 0.9, 0.35, 'lowpass', 2200, 90, 0.9, d, 0.02);
      sino(t + 0.05, 660, SINO, 0.7, 0.05, d);
      sino(t + 0.16, 495, SINO, 0.8, 0.04, d);
      break;
    }
    case 'magia': {
      const d = saida(0.6);
      sopro(t, 0.55, 0.18, 'bandpass', 3500, 8000, 2, d, 0.15);
      [0, 0.06, 0.13].forEach((dt, i) => sino(t + dt, varia(1200 + i * 380, 0.1), METAL, 0.6, 0.06, d));
      break;
    }
    case 'buff': {
      const d = saida(0.55);
      sopro(t, 0.5, 0.22, 'bandpass', 400, 3200, 2.5, d, 0.25);
      sino(t + 0.18, nota(79), SINO, 0.9, 0.09, d);
      sino(t + 0.3, nota(84), SINO, 1.1, 0.08, d);
      break;
    }
    case 'escudo': {
      const d = saida(0.4);
      sopro(t, 0.03, 0.3, 'highpass', 5000, 4000, 0.7, d, 0.001);
      sino(t, 820, METAL, 1.1, 0.16, d);
      break;
    }
    case 'bloqueio': {
      const d = saida(0.2);
      corpo(t, 220, 120, 0.09, 0.5, d);
      sopro(t, 0.07, 0.35, 'bandpass', 900, 600, 1.5, d, 0.001);
      break;
    }
    case 'cura': {
      const d = saida(0.65);
      [72, 76, 79, 84].forEach((n, i) => sino(t + i * 0.09, nota(n), SINO, 1.2, 0.07, d));
      sopro(t, 0.8, 0.07, 'highpass', 6000, 9000, 0.7, d, 0.3);
      break;
    }
    case 'veneno': {
      const d = saida(0.3);
      for (let i = 0; i < 6; i++) {
        const ti = t + Math.random() * 0.35;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(varia(260, 0.3), ti);
        o.frequency.exponentialRampToValueAtTime(varia(950, 0.25), ti + 0.04);
        envelope(g, ti, 0.004, 0.06, 0.14);
        o.connect(g).connect(d); o.start(ti); o.stop(ti + 0.08);
      }
      sopro(t, 0.4, 0.08, 'bandpass', 500, 300, 2, d, 0.05);
      break;
    }
    case 'ferrao': {
      const d = saida(0.3);
      sopro(t, 0.12, 0.35, 'bandpass', 1500, 6000, 2, d, 0.04);
      sopro(t + 0.11, 0.04, 0.4, 'highpass', 3500, 2500, 0.8, d, 0.001);
      corpo(t + 0.11, 180, 60, 0.15, 0.6, d);
      break;
    }
    case 'empurrao': {
      const d = saida(0.25);
      corpo(t, 100, 50, 0.2, 0.6, d);
      sopro(t, 0.35, 0.3, 'lowpass', 700, 180, 0.9, d, 0.01);
      break;
    }
    case 'ilusao': {
      const d = saida(0.6);
      sopro(t, 0.45, 0.25, 'bandpass', 6000, 800, 2, d, 0.35);
      sino(t + 0.35, 990, SINO, 0.6, 0.06, d);
      break;
    }
    case 'queimar': {
      const d = saida(0.3);
      sopro(t, 0.5, 0.45, 'lowpass', 300, 3500, 0.9, d, 0.12);
      for (let i = 0; i < 9; i++) sopro(t + Math.random() * 0.45, 0.02, 0.25, 'highpass', 2500, 2000, 0.7, d, 0.001);
      break;
    }
    case 'batalha': {
      const d = saida(0.5);
      corpo(t, 75, 38, 0.55, 1, d);
      sopro(t, 0.2, 0.3, 'lowpass', 900, 150, 0.8, d, 0.002);
      corpo(t + 0.2, 85, 40, 0.5, 0.9, d);
      sopro(t + 0.2, 0.2, 0.3, 'lowpass', 900, 150, 0.8, d, 0.002);
      break;
    }
    case 'rodada': sino(t, 130, GONGO, 2.2, 0.12, saida(0.5)); break;
    case 'vitoria': {
      const d = saida(0.6);
      [72, 76, 79, 84, 88].forEach((n, i) => sino(t + i * 0.11, nota(n), SINO, i === 4 ? 2 : 1, 0.11, d));
      corpo(t, 80, 45, 0.6, 0.6, d);
      sopro(t + 0.4, 1.2, 0.08, 'highpass', 6000, 10000, 0.7, d, 0.4);
      break;
    }
    case 'derrota': {
      const d = saida(0.6);
      [64, 60, 57, 52].forEach((n, i) => sino(t + i * 0.28, nota(n), SINO, i === 3 ? 2.2 : 1.1, 0.1, d));
      corpo(t + 0.85, 70, 32, 0.9, 0.7, d);
      break;
    }
  }
}

/* ---------- música ambiente ---------- */
// Acordes lentos (Lá menor, Fá, Dó, Sol) em pads suaves, com notas de sino (estilo celesta) por cima.

const ACORDES = [[57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62]];
const PENTA = [69, 72, 74, 76, 79, 81, 84];
const COMPASSO = 5.2; // segundos por acorde
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
  if (!prefs.musica) { if (musicaTimer !== null) { clearInterval(musicaTimer); musicaTimer = null; } return; }
  while (proximo < ctx.currentTime + 1.5) {
    const ac = ACORDES[passo % ACORDES.length];
    for (const n of ac) pad(nota(n), proximo, COMPASSO);
    pad(nota(ac[0] - 12), proximo, COMPASSO, 0.6);
    const k = 3 + (passo % 3);
    for (let i = 0; i < k; i++) {
      const n = PENTA[(passo * 3 + i * 2 + (i % 2)) % PENTA.length];
      celesta(nota(n), proximo + 0.4 + i * (COMPASSO / (k + 0.5)));
    }
    proximo += COMPASSO;
    passo++;
  }
}

function pad(f: number, ini: number, dur: number, vol = 1): void {
  const c = ctx!;
  const filt = c.createBiquadFilter(), g = c.createGain();
  filt.type = 'lowpass'; filt.frequency.value = 1100; filt.Q.value = 0.5;
  // 3 vozes levemente desafinadas = coro suave
  for (const det of [-7, 0, 7]) {
    const o = c.createOscillator();
    o.type = det === 0 ? 'triangle' : 'sine';
    o.frequency.value = f;
    o.detune.value = det;
    o.connect(filt);
    o.start(ini); o.stop(ini + dur + 1);
  }
  g.gain.setValueAtTime(0.0001, ini);
  g.gain.linearRampToValueAtTime(0.05 * vol, ini + 1.5);
  g.gain.linearRampToValueAtTime(0.04 * vol, ini + dur - 0.6);
  g.gain.linearRampToValueAtTime(0.0001, ini + dur + 0.9);
  filt.connect(g);
  g.connect(musica!);
  const w = c.createGain(); w.gain.value = 0.5;
  g.connect(w).connect(eco!);
}

function celesta(f: number, ini: number): void {
  const c = ctx!;
  const g = c.createGain();
  g.gain.value = 1;
  g.connect(musica!);
  const w = c.createGain(); w.gain.value = 0.8;
  g.connect(w).connect(eco!);
  sino(ini, f, SINO, 1.6, 0.05, g);
}
