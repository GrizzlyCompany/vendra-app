'use client';

import { isNative } from './platform';

interface PhotoResult {
    dataUrl?: string;
    webPath?: string;
    path?: string;
    format: string;
}

/**
 * Take a photo or select from gallery
 */
export async function takePhoto(): Promise<PhotoResult | null> {
    try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

        const photo = await Camera.getPhoto({
            quality: 80,
            allowEditing: false,
            resultType: CameraResultType.Uri,
            source: CameraSource.Prompt, // Let user choose camera or gallery
            saveToGallery: false,
            correctOrientation: true,
        });

        return {
            webPath: photo.webPath,
            path: photo.path,
            format: photo.format,
        };
    } catch (error) {
        console.warn('Camera error:', error);
        return null;
    }
}

/**
 * Pick image from gallery only
 */
export async function pickFromGallery(): Promise<PhotoResult | null> {
    try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

        const photo = await Camera.getPhoto({
            quality: 80,
            allowEditing: false,
            resultType: CameraResultType.Uri,
            source: CameraSource.Photos,
            correctOrientation: true,
        });

        return {
            webPath: photo.webPath,
            path: photo.path,
            format: photo.format,
        };
    } catch (error) {
        console.warn('Gallery error:', error);
        return null;
    }
}

/**
 * Take photo with camera only
 */
export async function captureFromCamera(): Promise<PhotoResult | null> {
    try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

        const photo = await Camera.getPhoto({
            quality: 80,
            allowEditing: false,
            resultType: CameraResultType.Uri,
            source: CameraSource.Camera,
            correctOrientation: true,
        });

        return {
            webPath: photo.webPath,
            path: photo.path,
            format: photo.format,
        };
    } catch (error) {
        console.warn('Camera capture error:', error);
        return null;
    }
}

/**
 * Check camera permissions
 */
export async function checkCameraPermission(): Promise<'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'limited'> {
    if (!isNative()) return 'prompt';

    try {
        const { Camera } = await import('@capacitor/camera');
        const result = await Camera.checkPermissions();
        return result.camera;
    } catch {
        return 'denied';
    }
}

/**
 * Request camera permissions
 */
export async function requestCameraPermission(): Promise<boolean> {
    if (!isNative()) return true;

    try {
        const { Camera } = await import('@capacitor/camera');
        const result = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
        return result.camera === 'granted';
    } catch {
        return false;
    }
}
