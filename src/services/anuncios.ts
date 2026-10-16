// Anúncios dos portais de jogos (CrazyGames e GameDistribution). Fora do portal, nada aparece e nada é carregado.
// Documentação: https://docs.crazygames.com/sdk/ e https://github.com/GameDistribution/GD-HTML5/wiki
// Cada portal tem a sua versão do jogo (npm run build:crazy / build:gd / build:itch), escolhida por VITE_PORTAL.
interface SdkCrazy {
  init(): Promise<void>;
  environment: 'local' | 'crazygames' | 'disabled';
  ad: { requestAd(tipo: 'midgame' | 'rewarded', cb: { adStarted?: () => void; adFinished?: () => void; adError?: (e: unknown) => void }): void };
  game: { gameplayStart(): void; gameplayStop(): void; loadingStart(): void; loadingStop(): void };
  data?: { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };
}
/** SDK do GameDistribution: showAd() é o anúncio entre partidas; showAd('rewarded') o que dá prêmio. */
interface SdkGD { showAd(tipo?: 'rewarded'): Promise<unknown>; preloadAd?(tipo: 'rewarded'): Promise<unknown> }
declare global {
  interface Window {
    CrazyGames?: { SDK: SdkCrazy };
    gdsdk?: SdkGD;
    GD_OPTIONS?: { gameId: string; onEvent: (e: { name: string }) => void };
  }
}

const PORTAL = (import.meta.env.VITE_PORTAL as string | undefined) ?? '';
/** Versão feita para um site de jogos (CrazyGames, GameDistribution, itch.io): sem login próprio e sem links para fora. */
export const emPortal = (): boolean => !!PORTAL || noCrazyGames();
const noGD = PORTAL === 'gamedistribution';
let gd: SdkGD | null = null;
/** O GameDistribution avisa por evento que o jogador assistiu o anúncio com prêmio até o fim. */
let premioGD = false;

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
export async function iniciarAnuncios(mudo: (s: boolean) => void, recarregar: () => void = () => {}): Promise<void> {
  silenciar = mudo;
  if (noGD) { iniciarGD(); return; }
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
    if (trazerDoPortal()) recarregar();
  } catch { sdk = null; pronto = false; }
}

/** GameDistribution: o SDK lê as opções em window.GD_OPTIONS e avisa por eventos (anúncio começou, terminou...). */
function iniciarGD(): void {
  const id = (import.meta.env.VITE_GD_ID as string | undefined) ?? '';
  if (!id) return;
  window.GD_OPTIONS = {
    gameId: id,
    onEvent: e => {
      switch (e.name) {
        case 'SDK_READY': gd = window.gdsdk ?? null; pronto = !!gd; void gd?.preloadAd?.('rewarded').catch(() => undefined); break;
        case 'SDK_GAME_PAUSE': silenciar(true); break; // anúncio na tela: som desligado
        case 'SDK_GAME_START': silenciar(false); break; // anúncio acabou
        case 'SDK_REWARDED_WATCH_COMPLETE': premioGD = true; break;
      }
    },
  };
  const s = document.createElement('script');
  s.id = 'gamedistribution-jssdk';
  s.src = 'https://html5.api.gamedistribution.com/main.min.js';
  document.head.appendChild(s);
}

/* ---------- progresso salvo pelo CrazyGames (módulo de dados do SDK) ---------- */
const PREFIXO = 'arena-dos-pactos:';
const FORA = new Set(['arena-dos-pactos:aparelho', 'arena-dos-pactos:salvoEm']);
const nossas = () => Object.keys(localStorage).filter(k => k.startsWith(PREFIXO) && !FORA.has(k));

/**
 * Ao abrir no portal: traz para o aparelho o que o CrazyGames guardou (conta do jogador).
 * Devolve true se algo mudou (o jogo relê o progresso).
 */
function trazerDoPortal(): boolean {
  const d = sdk?.data;
  if (!d) return false;
  let mudou = false;
  try {
    const lista = JSON.parse(d.getItem(PREFIXO + 'chaves') ?? '[]') as string[];
    for (const k of lista) {
      const v = d.getItem(k);
      if (v !== null && localStorage.getItem(k) !== v) { localStorage.setItem(k, v); mudou = true; }
    }
    if (!lista.length) espelharNoPortal(); // primeira vez: o portal recebe o que já está no aparelho
  } catch { /* sem armazenamento */ }
  return mudou;
}

/** Copia o progresso do aparelho para o CrazyGames (chamado sempre que o jogo salva). */
export function espelharNoPortal(): void {
  const d = sdk?.data;
  if (!d) return;
  try {
    const ks = nossas();
    for (const k of ks) { const v = localStorage.getItem(k); if (v !== null && d.getItem(k) !== v) d.setItem(k, v); }
    d.setItem(PREFIXO + 'chaves', JSON.stringify(ks));
  } catch { /* ignora */ }
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

async function pedirGD(tipo: 'midgame' | 'rewarded'): Promise<boolean> {
  if (!gd || !pronto) return false;
  premioGD = false;
  try {
    await gd.showAd(tipo === 'rewarded' ? 'rewarded' : undefined);
    if (tipo === 'rewarded') void gd.preloadAd?.('rewarded').catch(() => undefined);
    return tipo === 'rewarded' ? premioGD : true;
  } catch { return false; } finally { silenciar(false); }
}

function pedir(tipo: 'midgame' | 'rewarded'): Promise<boolean> {
  if (noGD) return pedirGD(tipo);
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
