'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isNative } from '@/lib/capacitor/platform';
import { initBackButton, initDeepLinks } from '@/lib/capacitor/navigation';
import { registerPushNotifications } from '@/lib/capacitor/push';

/**
 * Hook to initialize all Capacitor features
 * Call this once in your root layout or app component
 */
export function useCapacitorInit() {
    const router = useRouter();
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current || !isNative()) return;
        initialized.current = true;

        const init = async () => {
            console.log('Capacitor: Initializing native features...');

            // Initialize back button handling
            await initBackButton();

            // Initialize deep linking
            await initDeepLinks((url) => {
                console.log('Capacitor: Deep link received:', url);

                // Parse the URL and navigate
                try {
                    const urlObj = new URL(url);
                    const path = urlObj.pathname;

                    // Handle property deep links: /properties/123 -> /properties/view?id=123
                    if (path.startsWith('/properties/')) {
                        const id = path.split('/').pop();
                        if (id && id !== 'view') {
                            router.push(`/properties/view?id=${id}`);
                            return;
                        }
                    }

                    // Handle other paths
                    if (path && path !== '/') {
                        router.push(path);
                    }
                } catch (error) {
                    console.error('Capacitor: Error parsing deep link:', error);
                }
            });

            // Initialize push notifications
            await registerPushNotifications(
                (token) => {
                    console.log('Capacitor: Push token received');
                },
                (notification) => {
                    console.log('Capacitor: Push notification received:', notification);
                    // Handle notification tap - navigate to relevant screen
                    const data = notification.data;
                    if (data?.url) {
                        router.push(data.url);
                    } else if (data?.type === 'message') {
                        router.push('/messages');
                    }
                }
            );

            // Set status bar style
            try {
                const { StatusBar, Style } = await import('@capacitor/status-bar');
                await StatusBar.setStyle({ style: Style.Dark });
                await StatusBar.setBackgroundColor({ color: '#1a1a2e' });
            } catch { }

            // Hide splash screen after init
            try {
                const { SplashScreen } = await import('@capacitor/splash-screen');
                await SplashScreen.hide();
            } catch { }

            console.log('Capacitor: Native features initialized');
        };

        init();
    }, [router]);
}
