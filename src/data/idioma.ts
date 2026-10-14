// Idioma do jogo: português ou inglês. Escolhido pelo jogador (Configurações) ou, na primeira vez, pelo idioma do navegador.
// Trocar recarrega a página: os textos são escolhidos uma vez, quando o jogo abre.
export type Idioma = 'pt' | 'en';

const CHAVE = 'arena-dos-pactos:idioma';

function detectar(): Idioma {
  // fora do navegador (testes, simulador): português, o idioma original do jogo
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'pt';
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo === 'pt' || salvo === 'en') return salvo;
  } catch { /* sem armazenamento */ }
  const pedido = new URLSearchParams(location.search).get('lang');
  if (pedido === 'pt' || pedido === 'en') return pedido;
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  return langs.some(l => /^pt\b/i.test(l ?? '')) ? 'pt' : 'en';
}

export const IDIOMA: Idioma = detectar();
export const EN = IDIOMA === 'en';

export function trocarIdioma(l: Idioma): void {
  try { localStorage.setItem(CHAVE, l); } catch { /* sem armazenamento */ }
  location.reload();
}
