import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'at.gastauferden.app',
  appName: 'Gast auf Erden',
  webDir: 'dashboard',
  server: {
    // Für Entwicklung: Live-Reload vom lokalen Server
    // url: 'http://localhost:8080',
    // cleartext: true,
    
    // Für Produktion: Lade von der echten Domain
    url: 'https://www.gastauferden.at',
    // Oder bundled (offline-fähig):
    // androidScheme: 'https'
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#f5f3ef'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#f5f3ef',
      showSpinner: false
    }
  }
};

export default config;
