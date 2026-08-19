import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pardaisparty.app',
  appName: 'Pardais Party',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'pardaisparty.soulverseapps.com',
      '*.soulverseapps.com'
    ]
  }
};

export default config;
