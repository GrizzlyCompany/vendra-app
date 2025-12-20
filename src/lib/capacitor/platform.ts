'use client';

import { Capacitor } from '@capacitor/core';

/**
 * Check if the app is running on a native platform (iOS/Android)
 */
export const isNative = (): boolean => {
    if (typeof window === 'undefined') return false;
    return Capacitor.isNativePlatform();
};

/**
 * Get the current platform: 'ios', 'android', or 'web'
 */
export const getPlatform = (): 'ios' | 'android' | 'web' => {
    if (typeof window === 'undefined') return 'web';
    return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
};

/**
 * Check if running on Android
 */
export const isAndroid = (): boolean => getPlatform() === 'android';

/**
 * Check if running on iOS
 */
export const isIOS = (): boolean => getPlatform() === 'ios';
