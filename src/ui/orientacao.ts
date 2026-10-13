// Modo deitado: se a tela estiver em pé, o jogo é desenhado girado 90°. O botão ⟳ liga/desliga.

let rotPref = true;
/** Altura do palco no computador (como um celular deitado); a tela inteira é uma ampliação dele. */
const ALTURA_PALCO = 480;
let escala = 1;
/** Quanto o palco está ampliado (1 no celular). */
export const escalaPalco = () => escala;
try { rotPref = localStorage.getItem('rotPref') !== 'off'; } catch { /* sem armazenamento */ }

export function applyOrient(): void {
  const app = document.getElementById('app')!;
  const W = window.innerWidth, H = window.innerHeight;
  // telas de leitura (Conhecer os Decks, Missões) seguem o celular em pé, sem girar
  const rot = rotPref && H > W && !document.body.classList.contains('sem-giro');
  // computador/tablet (tela grande e deitada): o jogo é desenhado num palco com a altura de um celular deitado
  // e ampliado por inteiro; tudo cresce junto, na mesma proporção (antes sobrava espaço e tudo ficava pequeno)
  const palco = !rot && W >= 1000 && H >= 560;
  escala = palco ? H / ALTURA_PALCO : 1;
  document.body.classList.toggle('rot', rot);
  document.body.classList.toggle('palco', palco);
  // telas que já se medem pela janela (ex.: "Próximo desafio") desfazem a ampliação
  document.body.style.setProperty('--zinv', String(1 / escala));
  document.body.classList.toggle('land', rot || palco || H <= 520);
  if (rot) { app.style.width = H + 'px'; app.style.height = W + 'px'; app.style.transform = ''; app.style.removeProperty('zoom'); }
  else if (palco) {
    // "zoom" (e não transform: scale): o navegador desenha tudo já no tamanho final, então texto e imagens ficam nítidos
    app.style.width = Math.round(W / escala) + 'px'; app.style.height = ALTURA_PALCO + 'px';
    app.style.transform = ''; app.style.setProperty('zoom', String(escala));
  } else { app.style.width = ''; app.style.height = ''; app.style.transform = ''; app.style.removeProperty('zoom'); }
}

/** O jogo gira sozinho quando o celular está em pé? */
export const giroLigado = () => rotPref;

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
