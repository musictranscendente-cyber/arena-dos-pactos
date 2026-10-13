// Abertura: vídeo curto (public/abertura.webm, ou .mp4 no navegador sem WebM) que toca por cima de tudo ao abrir o jogo.
// Começa sem som (os navegadores bloqueiam som automático); o botão 🔊 liga o som; "Pular" ou o fim do vídeo fecham.
// Aparece uma vez por visita (sessionStorage), para não atrapalhar quem recarrega a página.
import { T } from '../data/textos';

const CHAVE = 'arena-dos-pactos:abertura-vista';

export function mostrarAbertura(): void {
  try { if (sessionStorage.getItem(CHAVE)) return; sessionStorage.setItem(CHAVE, '1'); } catch { /* sem armazenamento: mostra */ }
  const tela = document.createElement('div');
  tela.id = 'abertura';
  tela.innerHTML = '<video muted autoplay playsinline preload="auto">'
    + '<source src="./abertura.webm" type="video/webm"><source src="./abertura.mp4" type="video/mp4"></video>'
    + `<button class="ab-som" type="button" aria-label="${T.aberturaSom}">🔇</button>`
    + `<button class="ab-pular" type="button">${T.aberturaPular} ▶</button>`;
  document.body.appendChild(tela);
  const video = tela.querySelector('video')!;
  const som = tela.querySelector<HTMLButtonElement>('.ab-som')!;
  let fechou = false;
  const fechar = () => {
    if (fechou) return;
    fechou = true;
    tela.classList.add('sai');
    video.pause();
    setTimeout(() => tela.remove(), 600);
  };
  video.addEventListener('ended', fechar);
  // erro na última fonte = nenhum formato funcionou
  video.querySelector('source:last-child')!.addEventListener('error', fechar);
  // vídeo que não começa (economia de dados, navegador sem autoplay): não prende o jogador
  setTimeout(() => { if (video.currentTime === 0) fechar(); }, 6000);
  // play() pode falhar só por ter sido interrompido pelo carregamento; quem decide desistir é o tempo acima
  void video.play().catch(() => undefined);
  som.addEventListener('click', e => {
    e.stopPropagation();
    video.muted = !video.muted;
    som.textContent = video.muted ? '🔇' : '🔊';
  });
  tela.querySelector('.ab-pular')!.addEventListener('click', e => { e.stopPropagation(); fechar(); });
  document.addEventListener('keydown', function tecla(e) {
    if (fechou) { document.removeEventListener('keydown', tecla); return; }
    if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); fechar(); }
  });
}
