// Anúncios dos portais de jogos (por enquanto o CrazyGames). Fora do portal, nada aparece e nada é carregado.
// Documentação do SDK: https://docs.crazygames.com/sdk/
interface SdkCrazy {
  init(): Promise<void>;
  environment: 'local' | 'crazygames' | 'disabled';
  ad: { requestAd(tipo: 'midgame' | 'rewarded', cb: { adStarted?: () => void; adFinished?: () => void; adError?: (e: unknown) => void }): void };
  game: { gameplayStart(): void; gameplayStop(): void; loadingStart(): void; loadingStop(): void };
}
declare global { interface Window { CrazyGames?: { SDK: SdkCrazy } } }

let sdk: SdkCrazy | null = null;
let pronto = false;
let emJogo = false;
let silenciar: (s: boolean) => void = () => {};

/** O jogo está dentro do CrazyGames? (em iframe vindo de crazygames.*, ou com ?portal=crazygames para testar) */
export function noCrazyGames(): boolean {
  // versão gerada para o portal (npm run build:crazy): sempre no modo CrazyGames
  if (import.meta.env.VITE_PORTAL === 'crazygames') return true;
  try {
    if (new URLSearchParams(location.search).get('portal') === 'crazygames') return true;
    const ref = document.referrer || (window.top !== window ? document.referrer : '');
    return window.top !== window && /crazygames\./i.test(ref || location.ancestorOrigins?.[0] || '');
  } catch { return false; }
}

/** Carrega o SDK do portal (só dentro dele). `mudo` silencia/volta o som durante os anúncios. */
export async function iniciarAnuncios(mudo: (s: boolean) => void): Promise<void> {
  silenciar = mudo;
  if (!noCrazyGames()) return;
  try {
    await new Promise<void>((ok, erro) => {
      const s = document.createElement('script');
      s.src = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
      s.onload = () => ok(); s.onerror = () => erro(new Error('sdk'));
      document.head.appendChild(s);
    });
    const c = window.CrazyGames?.SDK;
    if (!c) return;
    await c.init();
    sdk = c;
    pronto = c.environment !== 'disabled';
  } catch { sdk = null; pronto = false; }
}

/** Dá para oferecer "assista e ganhe"? */
export const temAnuncios = () => pronto;

/** Avisa o portal: carregamento terminou / partida começou / partida acabou (eles pedem isso). */
export function avisarCarregou(): void { try { sdk?.game.loadingStop(); } catch { /* ignora */ } }
export function avisarJogando(sim: boolean): void {
  if (!sdk || sim === emJogo) return;
  emJogo = sim;
  try { if (sim) sdk.game.gameplayStart(); else sdk.game.gameplayStop(); } catch { /* ignora */ }
}

function pedir(tipo: 'midgame' | 'rewarded'): Promise<boolean> {
  return new Promise(ok => {
    if (!sdk || !pronto) { ok(false); return; }
    let fim = false;
    const terminar = (v: boolean) => { if (fim) return; fim = true; silenciar(false); ok(v); };
    try {
      sdk.ad.requestAd(tipo, {
        adStarted: () => silenciar(true),
        adFinished: () => terminar(true),
        adError: () => terminar(false),
      });
    } catch { terminar(false); }
  });
}

/** Anúncio com recompensa. Devolve true só se o jogador assistiu até o fim. */
export const anuncioRecompensa = () => pedir('rewarded');

/** Anúncio entre partidas (o portal decide se mostra e com que frequência). */
export function anuncioIntervalo(): void { void pedir('midgame'); }
