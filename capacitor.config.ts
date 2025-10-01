import { CapacitorConfig } from '@capacitor/cli';

// Only use live-reload when LIVE_RELOAD_URL env var is set
// For APK builds, don't set this variable so the app uses bundled dist
const liveReloadUrl = process.env.LIVE_RELOAD_URL;

const config: CapacitorConfig = {
  appId: 'app.lovable.d77ef270ed774aa583ba6329e19bd8b5',
  appName: 'learnverse-blueprint',
  webDir: 'dist',
  ...(liveReloadUrl && {
    server: {
      url: liveReloadUrl,
      cleartext: true
    }
  }),
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false
    }
  }
};

export default config;
