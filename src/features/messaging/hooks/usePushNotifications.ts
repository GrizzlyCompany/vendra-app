"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function usePushNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSupported, setIsSupported] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const checkSupport = () => {
            const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
            setIsSupported(supported);
            if (supported) {
                setPermission(Notification.permission);
            }
            setLoading(false);
        };

        checkSupport();

        // Register Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW Registered:', registration.scope);
                })
                .catch(err => {
                    console.error('SW Registration failed:', err);
                });
        }
    }, []);

    const subscribe = async (vapidPublicKey: string) => {
        if (!('serviceWorker' in navigator)) {
            console.warn('Service Worker is not supported in this browser');
            return;
        }
        if (!('PushManager' in window)) {
            console.warn('Push Manager is not supported in this browser');
            return;
        }

        try {
            console.log('Push: Waiting for service worker to be ready...');
            const registration = await navigator.serviceWorker.ready;
            console.log('Push: Service worker ready');

            // Request permission
            console.log('Push: Requesting notification permission...');
            const result = await Notification.requestPermission();
            console.log('Push: Permission result:', result);
            setPermission(result);

            if (result !== 'granted') {
                console.warn('Push: Notification permission denied');
                return;
            }

            // Subscribe to push manager
            console.log('Push: Subscribing to Push Manager...');
            const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            });
            console.log('Push: Subscription object obtained');

            // Save to Supabase
            const { data: sess } = await supabase.auth.getSession();
            const user = sess.session?.user;

            if (!user) {
                console.warn('Push: No authenticated user found, skipping database save');
                return;
            }

            console.log('Push: Saving subscription to Supabase for user:', user.id);
            const subJson = subscription.toJSON();

            const { error } = await supabase
                .from('push_subscriptions')
                .upsert({
                    user_id: user.id,
                    endpoint: subJson.endpoint,
                    p256dh: subJson.keys?.p256dh,
                    auth_key: subJson.keys?.auth,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,endpoint'
                });

            if (error) {
                console.error('Push: Error saving to Supabase:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                throw error;
            }

            console.log('Push: Subscription saved successfully to database');
            return subscription;
        } catch (error) {
            console.error('Push: Error in subscription process:', error);
            throw error;
        }
    };

    return { permission, subscribe, isSupported, loading };
}
