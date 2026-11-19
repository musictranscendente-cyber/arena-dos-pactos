// Aviso de versão nova no app Android.
// - Play Store: pergunta à própria loja se há atualização e abre a atualização da Play ali mesmo, sem sair do jogo.
// - APK (baixado do site): confere no site se saiu versão nova e o botão baixa o APK.
// (No site, o jogo já abre sempre na versão nova.)
import { Capacitor } from '@capacitor/core';

const SITE = 'https://musictranscendente-cyber.github.io/arena-dos-pactos/';
export const URL_APK = `${SITE}baixar/cosmic-citadel.apk`;
const PLAY = import.meta.env.VITE_LOJA === 'play';

const appUpdate = () => import('@capawesome/capacitor-app-update');

/** Devolve true se há uma versão mais nova que este app (na Play Store ou no site). */
export async function temVersaoNova(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    if (PLAY) {
      const { AppUpdate, AppUpdateAvailability } = await appUpdate();
      const info = await AppUpdate.getAppUpdateInfo();
      return info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE;
    }
    if (!__BUILD__) return false;
    const r = await fetch(`${SITE}versao.json?t=${Date.now()}`, { cache: 'no-store' });
    const v = (await r.json()) as { build?: number };
    return typeof v.build === 'number' && v.build > __BUILD__;
  } catch { return false; }
}

export async function baixarAtualizacao(): Promise<void> {
  if (PLAY) {
    const { AppUpdate } = await appUpdate();
    try {
      // tela de atualização da própria Play Store: baixa, instala e reabre o jogo
      const info = await AppUpdate.getAppUpdateInfo();
      if (info.immediateUpdateAllowed) { await AppUpdate.performImmediateUpdate(); return; }
    } catch { /* sem a tela da Play: abre a página do jogo na loja */ }
    await AppUpdate.openAppStore().catch(() => undefined);
    return;
  }
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url: URL_APK });
}
