import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.amped.fieldops',
  appName: 'AmpedFieldOps',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#121417',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#121417',
      style: 'DARK',
    },
  },
}

export default config
