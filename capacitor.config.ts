import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.vendra.app',
    appName: 'Vendra',
    webDir: 'out',

    // Plugin configurations
    plugins: {
        SplashScreen: {
            launchShowDuration: 2000,
            launchAutoHide: true,
            backgroundColor: '#1a1a2e',
            androidSplashResourceName: 'splash',
            androidScaleType: 'CENTER_CROP',
            showSpinner: false,
        },
        PushNotifications: {
            presentationOptions: ['badge', 'sound', 'alert'],
        },
        Keyboard: {
            resize: 'body',
            resizeOnFullScreen: true,
        },
        StatusBar: {
            style: 'dark',
            backgroundColor: '#1a1a2e',
        },
    },

    // Android specific
    android: {
        allowMixedContent: true,
        captureInput: true,
        webContentsDebuggingEnabled: false,
    },

    // iOS specific  
    ios: {
        contentInset: 'always',
        allowsLinkPreview: true,
        scrollEnabled: true,
    },
};

export default config;
