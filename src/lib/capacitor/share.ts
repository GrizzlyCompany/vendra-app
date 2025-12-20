'use client';

import { isNative } from './platform';

/**
 * Share a property via native share sheet
 */
export async function shareProperty(
    title: string,
    url: string,
    description?: string
): Promise<boolean> {
    try {
        const { Share } = await import('@capacitor/share');

        await Share.share({
            title,
            text: description || `Mira esta propiedad en Vendra: ${title}`,
            url,
            dialogTitle: 'Compartir propiedad',
        });

        return true;
    } catch (error) {
        // User cancelled or share failed
        console.warn('Share failed:', error);

        // Fallback: copy to clipboard on web
        if (!isNative() && navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(url);
                return true;
            } catch { }
        }

        return false;
    }
}

/**
 * Check if native sharing is available
 */
export async function canShare(): Promise<boolean> {
    if (!isNative()) {
        // Check Web Share API
        return typeof navigator !== 'undefined' && !!navigator.share;
    }

    try {
        const { Share } = await import('@capacitor/share');
        const result = await Share.canShare();
        return result.value;
    } catch {
        return false;
    }
}
