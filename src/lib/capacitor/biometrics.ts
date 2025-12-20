'use client';

import { isNative } from './platform';

// Type definitions for biometric auth
interface BiometricAuthResult {
    verified: boolean;
    error?: string;
}

/**
 * Check if biometric authentication is available on the device
 */
export async function isBiometricAvailable(): Promise<boolean> {
    if (!isNative()) return false;

    try {
        // Dynamic import to avoid issues on web
        const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
        const result = await BiometricAuth.checkBiometry();
        return result.isAvailable;
    } catch (error) {
        console.warn('Biometric auth not available:', error);
        return false;
    }
}

/**
 * Authenticate user with biometrics (fingerprint or Face ID)
 */
export async function authenticateWithBiometrics(): Promise<BiometricAuthResult> {
    if (!isNative()) {
        return { verified: false, error: 'Not running on native platform' };
    }

    try {
        const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');

        await BiometricAuth.authenticate({
            reason: 'Inicia sesión con tu huella o Face ID',
            cancelTitle: 'Usar contraseña',
            allowDeviceCredential: true,
        });

        return { verified: true };
    } catch (error) {
        console.error('Biometric authentication failed:', error);
        return {
            verified: false,
            error: error instanceof Error ? error.message : 'Authentication failed'
        };
    }
}

/**
 * Check if we should show biometric login option
 * (user must have previously logged in and biometrics available)
 */
export async function shouldShowBiometricLogin(): Promise<boolean> {
    if (!isNative()) return false;

    // Check if biometrics available
    const available = await isBiometricAvailable();
    if (!available) return false;

    // Check if user has stored credentials (to be implemented with secure storage)
    // For now, check localStorage for a flag
    if (typeof window !== 'undefined') {
        const hasPreviousSession = localStorage.getItem('vendra_biometric_enabled');
        return hasPreviousSession === 'true';
    }

    return false;
}

/**
 * Enable biometric login for the current user
 */
export function enableBiometricLogin(): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem('vendra_biometric_enabled', 'true');
    }
}

/**
 * Disable biometric login
 */
export function disableBiometricLogin(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('vendra_biometric_enabled');
    }
}
