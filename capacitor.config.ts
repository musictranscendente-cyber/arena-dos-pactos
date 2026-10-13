import type { CapacitorConfig } from '@capacitor/cli';

// App Android (Capacitor): empacota o build de `npm run build:android` (pasta dist-android).
const config: CapacitorConfig = {
  appId: 'com.cosmiccitadel.game',
  appName: 'Cosmic Citadel',
  webDir: 'dist-android',
  android: { backgroundColor: '#0b0722' },
};

export default config;
