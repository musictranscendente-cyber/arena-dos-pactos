import './ui/style.css';
import { startApp } from './ui/app';
import { watchOrient } from './ui/orientacao';

watchOrient();
startApp();
esconderCarregamento();

/** Tela de carregamento: a barra enche enquanto as imagens principais e as fontes chegam; depois some. */
function esconderCarregamento(): void {
  const tela = document.getElementById('carregando');
  if (!tela) return;
  const barra = document.getElementById('cg-prog');
  // tudo o que a tela inicial usa: imagens já presentes na página (fundo, logo, criaturas das ilhas)
  const imgs = [...document.querySelectorAll<HTMLImageElement>('#app img')];
  const fundos = [...new Set([...document.querySelectorAll<HTMLElement>('#app *')].map(e => getComputedStyle(e).backgroundImage)
    .flatMap(b => [...b.matchAll(/url\("?([^")]+)"?\)/g)].map(m => m[1])))].slice(0, 20);
  const tarefas: Promise<unknown>[] = [
    ...imgs.map(i => (i.complete ? Promise.resolve() : i.decode().catch(() => undefined))),
    ...fundos.map(u => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = u; })),
    document.fonts?.ready ?? Promise.resolve(),
  ];
  let feitas = 0;
  const avanca = () => { feitas++; if (barra) barra.style.width = `${Math.max(5, Math.round((feitas / tarefas.length) * 100))}%`; };
  tarefas.forEach(t => void t.then(avanca, avanca));
  const minimo = new Promise(r => setTimeout(r, 900));
  const limite = new Promise(r => setTimeout(r, 8000)); // internet lenta: não prende o jogador
  void Promise.race([Promise.all([Promise.allSettled(tarefas), minimo]), limite]).then(() => {
    if (barra) barra.style.width = '100%';
    setTimeout(() => { tela.classList.add('sai'); setTimeout(() => tela.remove(), 600); }, 250);
  });
}
