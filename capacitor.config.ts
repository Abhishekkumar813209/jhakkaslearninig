import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.d77ef270ed774aa583ba6329e19bd8b5',
  appName: 'learnverse-blueprint',
  webDir: 'dist',
  server: {
    url: 'https://d77ef270-ed77-4aa5-83ba-6329e19bd8b5.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false
    }
  }
};

export default config;
