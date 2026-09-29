import type { ExpoConfig } from 'expo/config';
const config: ExpoConfig = {
  name: 'Syscall',
  slug: 'mobile-frontend',
  scheme: 'syscall',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: { supportsTablet: false, bundleIdentifier: 'com.ts47andres.syscallmobile' },
  android: {
    package: 'com.ts47andres.syscallmobile',
    blockedPermissions: ['android.permission.RECORD_AUDIO'],
    adaptiveIcon: { backgroundColor: '#E6F4FE', foregroundImage: './assets/android-icon-foreground.png', backgroundImage: './assets/android-icon-background.png', monochromeImage: './assets/android-icon-monochrome.png' },
    predictiveBackGestureEnabled: false,
  },
  web: { favicon: './assets/favicon.png' },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-secure-store',
    ['expo-notifications', { color: '#0B57D0', defaultChannel: 'mail' }],
    ['expo-image-picker', { photosPermission: 'Syscall uses your photos when you choose a profile picture.' }],
    'expo-sharing',
    '@react-native-community/datetimepicker',
  ],
  extra: {
    eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID },
  },
};

export default config;
