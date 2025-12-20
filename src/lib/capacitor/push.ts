'use client';

import { isNative } from './platform';
import { supabase } from '@/lib/supabase/client';

interface PushToken {
    value: string;
}

/**
 * Register for push notifications and get FCM token
 */
export async function registerPushNotifications(
    onToken?: (token: string) => void,
    onNotification?: (notification: any) => void
): Promise<string | null> {
    if (!isNative()) {
        console.log('Push: Not on native platform, skipping');
        return null;
    }

    try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Request permission
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== 'granted') {
            console.log('Push: Permission denied');
            return null;
        }

        // Register with FCM/APNs
        await PushNotifications.register();

        // Listen for registration success
        return new Promise((resolve) => {
            PushNotifications.addListener('registration', async (token: PushToken) => {
                console.log('Push: Registered with token', token.value.substring(0, 20) + '...');

                // Save token to Supabase
                await savePushToken(token.value);

                onToken?.(token.value);
                resolve(token.value);
            });

            PushNotifications.addListener('registrationError', (error) => {
                console.error('Push: Registration error', error);
                resolve(null);
            });

            // Listen for notifications
            PushNotifications.addListener('pushNotificationReceived', (notification) => {
                console.log('Push: Notification received', notification);
                onNotification?.(notification);
            });

            PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                console.log('Push: Notification tapped', notification);
                onNotification?.(notification.notification);
            });
        });
    } catch (error) {
        console.error('Push: Error registering', error);
        return null;
    }
}

/**
 * Save push token to Supabase for the current user
 */
async function savePushToken(token: string): Promise<void> {
    try {
        const { data: session } = await supabase.auth.getSession();
        const userId = session.session?.user?.id;

        if (!userId) {
            console.log('Push: No user session, skipping token save');
            return;
        }

        // Upsert token (platform = 'android' or 'ios')
        const { getPlatform } = await import('./platform');
        const platform = getPlatform();

        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: userId,
                token,
                platform,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,platform',
            });

        if (error) {
            console.error('Push: Error saving token', error);
        } else {
            console.log('Push: Token saved to Supabase');
        }
    } catch (error) {
        console.error('Push: Error in savePushToken', error);
    }
}

/**
 * Check if push notifications are enabled
 */
export async function arePushNotificationsEnabled(): Promise<boolean> {
    if (!isNative()) return false;

    try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const result = await PushNotifications.checkPermissions();
        return result.receive === 'granted';
    } catch {
        return false;
    }
}

/**
 * Get delivered notifications
 */
export async function getDeliveredNotifications(): Promise<any[]> {
    if (!isNative()) return [];

    try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const result = await PushNotifications.getDeliveredNotifications();
        return result.notifications;
    } catch {
        return [];
    }
}

/**
 * Remove all delivered notifications
 */
export async function removeAllNotifications(): Promise<void> {
    if (!isNative()) return;

    try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        await PushNotifications.removeAllDeliveredNotifications();
    } catch { }
}
