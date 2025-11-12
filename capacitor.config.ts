import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.medflow.meditrack',
  appName: 'meditrack',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'MediTrack',
      iconColor: '#488AFF',
      sound: 'default',
    },
  },
};

export default config;