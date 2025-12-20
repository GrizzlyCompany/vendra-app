'use client';

import { isNative } from './platform';

/**
 * Initialize Android back button handling with haptic feedback
 */
export async function initBackButton(onExit?: () => void): Promise<void> {
    if (!isNative()) return;

    try {
        const { App } = await import('@capacitor/app');
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');

        App.addListener('backButton', async ({ canGoBack }) => {
            // Provide haptic feedback
            try {
                await Haptics.impact({ style: ImpactStyle.Light });
            } catch { }

            if (canGoBack) {
                window.history.back();
            } else {
                // At root - exit app or call custom handler
                if (onExit) {
                    onExit();
                } else {
                    App.exitApp();
                }
            }
        });
    } catch (error) {
        console.warn('Failed to init back button:', error);
    }
}

/**
 * Initialize deep linking handler
 */
export async function initDeepLinks(
    onUrl: (url: string) => void
): Promise<void> {
    if (!isNative()) return;

    try {
        const { App } = await import('@capacitor/app');

        // Handle app opened via URL
        App.addListener('appUrlOpen', ({ url }) => {
            onUrl(url);
        });

        // Check if app was launched with a URL
        const launchUrl = await App.getLaunchUrl();
        if (launchUrl?.url) {
            onUrl(launchUrl.url);
        }
    } catch (error) {
        console.warn('Failed to init deep links:', error);
    }
}

/**
 * Trigger haptic feedback
 */
export async function hapticFeedback(
    style: 'light' | 'medium' | 'heavy' = 'light'
): Promise<void> {
    if (!isNative()) return;

    try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        const styleMap = {
            light: ImpactStyle.Light,
            medium: ImpactStyle.Medium,
            heavy: ImpactStyle.Heavy,
        };
        await Haptics.impact({ style: styleMap[style] });
    } catch { }
}

/**
 * Vibrate for notifications
 */
export async function hapticNotification(
    type: 'success' | 'warning' | 'error' = 'success'
): Promise<void> {
    if (!isNative()) return;

    try {
        const { Haptics, NotificationType } = await import('@capacitor/haptics');
        const typeMap = {
            success: NotificationType.Success,
            warning: NotificationType.Warning,
            error: NotificationType.Error,
        };
        await Haptics.notification({ type: typeMap[type] });
    } catch { }
}
