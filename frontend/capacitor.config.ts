import type { CapacitorConfig } from '@capacitor/cli';

const liveReloadUrl = process.env.CAP_LIVE_RELOAD_URL;

const config: CapacitorConfig = {
  appId: 'com.etherealgains.gymentry',
  appName: 'Ethereal Gains',
  webDir: 'dist',
  ...(liveReloadUrl
    ? {
        server: {
          url: liveReloadUrl,
          cleartext: true,
        },
      }
    : {}),
};

export default config;
