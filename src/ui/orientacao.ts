// Modo deitado: se a tela estiver em pé, o jogo é desenhado girado 90°. O botão ⟳ liga/desliga.

let rotPref = true;
try { rotPref = localStorage.getItem('rotPref') !== 'off'; } catch { /* sem armazenamento */ }

export function applyOrient(): void {
  const app = document.getElementById('app')!;
  const W = window.innerWidth, H = window.innerHeight;
  // telas de leitura (Conhecer os Decks, Missões) seguem o celular em pé, sem girar
  const rot = rotPref && H > W && !document.body.classList.contains('sem-giro');
  document.body.classList.toggle('rot', rot);
  document.body.classList.toggle('land', rot || H <= 520);
  if (rot) { app.style.width = H + 'px'; app.style.height = W + 'px'; }
  else { app.style.width = ''; app.style.height = ''; }
}

export function toggleRot(): void {
  rotPref = !rotPref;
  try { localStorage.setItem('rotPref', rotPref ? 'on' : 'off'); } catch { /* ignora */ }
  applyOrient();
}

/** Tenta tela cheia + travar em paisagem (só funciona em alguns navegadores de celular). */
export async function tryLandscape(): Promise<void> {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen();
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    if (o && o.lock) await o.lock('landscape');
  } catch { /* não suportado */ }
  setTimeout(applyOrient, 200);
}

export function watchOrient(): void {
  // no primeiro toque em qualquer lugar: tenta tela cheia e travar deitado (o navegador só deixa depois de um toque)
  const primeiro = () => { void tryLandscape(); };
  window.addEventListener('pointerdown', primeiro, { once: true });
  window.addEventListener('resize', applyOrient);
  window.addEventListener('orientationchange', () => setTimeout(applyOrient, 150));
  applyOrient();
}
