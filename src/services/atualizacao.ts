// App Android instalado pelo APK: confere no site se saiu versão nova e avisa, com um botão que baixa a atualização.
// (Na Play Store a atualização é automática; no site, o jogo já abre sempre na versão nova.)
import { Capacitor } from '@capacitor/core';

const SITE = 'https://musictranscendente-cyber.github.io/arena-dos-pactos/';
export const URL_APK = `${SITE}baixar/cosmic-citadel.apk`;

/** Devolve true se o site tem um build mais novo que este app. */
export async function temVersaoNova(): Promise<boolean> {
  // versão da Play Store: quem atualiza é a loja
  if (!Capacitor.isNativePlatform() || !__BUILD__ || import.meta.env.VITE_LOJA === 'play') return false;
  try {
    const r = await fetch(`${SITE}versao.json?t=${Date.now()}`, { cache: 'no-store' });
    const v = (await r.json()) as { build?: number };
    return typeof v.build === 'number' && v.build > __BUILD__;
  } catch { return false; }
}

export async function baixarAtualizacao(): Promise<void> {
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url: URL_APK });
}
