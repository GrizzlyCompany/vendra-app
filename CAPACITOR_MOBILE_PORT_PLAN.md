# Capacitor Mobile Port - Vendra

Portar Vendra (Next.js 16 + React 19) a apps nativas con comportamiento 100% nativo.

## User Review Required

> [!IMPORTANT]
> **Requisitos:**
> - Android Studio con SDK
> - Cuenta Google para Firebase (gratis)
> - Xcode solo en Mac (iOS)

> [!WARNING]
> **iOS desde Windows:** No se puede compilar localmente. Opciones: Mac o CI/CD (GitHub Actions).

---

## Features Recomendadas para App Inmobiliaria

| Feature | Beneficio |
|---------|-----------|
| **Deep Linking** | Compartir URLs de propiedades que abren directo en la app |
| **Share** | Compartir propiedades en WhatsApp, redes sociales |
| **Cámara/Galería** | Subir fotos de propiedades desde móvil |
| **Biometrics** | Login rápido con huella/Face ID |
| **Push Notifications** | Alertas de nuevos mensajes y propiedades |
| **Geolocation** | Ubicación actual para búsqueda cercana |

---

## Proposed Changes

### Fase 1: Dependencias

#### [MODIFY] [package.json](file:///c:/Users/Grizzly/Documents/vendra-app/vendra-app/package.json)

```json
{
  "dependencies": {
    "@capacitor/core": "^6.1.0",
    "@capacitor/app": "^6.0.0",
    "@capacitor/haptics": "^6.0.0",
    "@capacitor/keyboard": "^6.0.0",
    "@capacitor/push-notifications": "^6.0.0",
    "@capacitor/status-bar": "^6.0.0",
    "@capacitor/splash-screen": "^6.0.0",
    "@capacitor/share": "^6.0.0",
    "@capacitor/camera": "^6.0.0",
    "@capacitor/geolocation": "^6.0.0",
    "@capacitor-community/biometric-auth": "^1.0.0"
  },
  "devDependencies": {
    "@capacitor/cli": "^6.1.0",
    "@capacitor/android": "^6.1.0",
    "@capacitor/ios": "^6.1.0"
  }
}
```

---

### Fase 2: Configuración

#### [MODIFY] [next.config.ts](file:///c:/Users/Grizzly/Documents/vendra-app/vendra-app/next.config.ts)

```diff
+  output: 'export',
```

#### [NEW] [capacitor.config.ts](file:///c:/Users/Grizzly/Documents/vendra-app/vendra-app/capacitor.config.ts)

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vendra.app',
  appName: 'Vendra',
  webDir: 'out',
  plugins: {
    SplashScreen: { launchShowDuration: 2000, backgroundColor: '#1a1a2e' },
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
    Keyboard: { resize: 'body' }
  },
  // Deep Linking
  server: {
    url: 'https://vendra.app',  // Tu dominio
    cleartext: true
  }
};
export default config;
```

---

### Fase 3: Firebase Setup (Nuevo Proyecto)

**Pasos manuales:**

1. Ir a [Firebase Console](https://console.firebase.google.com)
2. Crear nuevo proyecto "Vendra"
3. **Android:**
   - Agregar app Android con `com.vendra.app`
   - Descargar `google-services.json` → `android/app/`
4. **iOS:**
   - Agregar app iOS con `com.vendra.app`
   - Descargar `GoogleService-Info.plist` → `ios/App/App/`
   - Subir APNs Key desde Apple Developer

---

### Fase 4: Nuevos Módulos Capacitor

#### [NEW] [src/lib/capacitor/index.ts](file:///c:/Users/Grizzly/Documents/vendra-app/vendra-app/src/lib/capacitor/index.ts)

```typescript
export * from './platform';
export * from './navigation';
export * from './push';
export * from './share';
export * from './camera';
```

#### [NEW] [src/lib/capacitor/platform.ts](file:///c:/Users/Grizzly/Documents/vendra-app/vendra-app/src/lib/capacitor/platform.ts)

```typescript
import { Capacitor } from '@capacitor/core';
export const isNative = () => Capacitor.isNativePlatform();
export const platform = () => Capacitor.getPlatform();
```

#### [NEW] [src/lib/capacitor/navigation.ts](file:///c:/Users/Grizzly/Documents/vendra-app/vendra-app/src/lib/capacitor/navigation.ts)

```typescript
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isNative } from './platform';

export function initBackButton() {
  if (!isNative()) return;
  App.addListener('backButton', ({ canGoBack }) => {
    Haptics.impact({ style: ImpactStyle.Light });
    canGoBack ? window.history.back() : App.exitApp();
  });
}
```

#### [NEW] [src/lib/capacitor/share.ts](file:///c:/Users/Grizzly/Documents/vendra-app/vendra-app/src/lib/capacitor/share.ts)

```typescript
import { Share } from '@capacitor/share';

export async function shareProperty(title: string, url: string) {
  await Share.share({
    title,
    text: `Mira esta propiedad en Vendra: ${title}`,
    url,
    dialogTitle: 'Compartir propiedad'
  });
}
```

#### [NEW] [src/lib/capacitor/camera.ts](file:///c:/Users/Grizzly/Documents/vendra-app/vendra-app/src/lib/capacitor/camera.ts)

```typescript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export async function takePhoto() {
  return Camera.getPhoto({
    quality: 80,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Prompt  // Cámara o galería
  });
}
```

#### [NEW] [src/lib/capacitor/push.ts](file:///c:/Users/Grizzly/Documents/vendra-app/vendra-app/src/lib/capacitor/push.ts)

```typescript
import { PushNotifications } from '@capacitor/push-notifications';
import { isNative } from './platform';

export async function registerPush(onToken: (token: string) => void) {
  if (!isNative()) return;
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') return;
  await PushNotifications.register();
  PushNotifications.addListener('registration', (t) => onToken(t.value));
}
```

---

### Fase 5: Deep Linking

#### [NEW] Android: `android/app/src/main/AndroidManifest.xml` (agregar intent-filter)

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="vendra.app" />
</intent-filter>
```

#### Handler en app:

```typescript
App.addListener('appUrlOpen', ({ url }) => {
  // Ejemplo: https://vendra.app/properties/123
  const match = url.match(/\/properties\/(\d+)/);
  if (match) router.push(`/properties/${match[1]}`);
});
```

---

## Assets Requeridos

| Archivo | Tamaño | Ubicación |
|---------|--------|-----------|
| `icon.png` | 1024×1024 | `resources/` |
| `splash.png` | 2732×2732 | `resources/` |

Generar: `npx capacitor-assets generate`

---

## Verification Checklist

| Test | Android | iOS |
|------|---------|-----|
| Back button/gesto funciona | ⬜ | ⬜ |
| Push notifications llegan | ⬜ | ⬜ |
| Compartir propiedad | ⬜ | ⬜ |
| Tomar/subir foto | ⬜ | ⬜ |
| Deep link abre propiedad | ⬜ | ⬜ |
| Status bar correcto | ⬜ | ⬜ |
| Safe areas (notch) | ⬜ | ⬜ |

---

## Archivos a Crear/Modificar

| Acción | Archivo |
|--------|---------|
| MODIFY | `package.json` |
| MODIFY | `next.config.ts` |
| NEW | `capacitor.config.ts` |
| NEW | `src/lib/capacitor/*.ts` (5 archivos) |
| MODIFY | `src/features/messaging/hooks/usePushNotifications.ts` |
| NEW | `resources/icon.png`, `splash.png` |
| MANUAL | Firebase: `google-services.json`, `GoogleService-Info.plist` |
