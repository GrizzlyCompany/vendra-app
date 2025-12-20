# KYC + Biometric Login - Implementation Plan

Sistema de verificación de identidad manual + login biométrico para Vendra.

## Análisis del Estado Actual

> [!TIP]
> **Buenas noticias:** La infraestructura KYC ya existe parcialmente:
> - Tabla `seller_applications` tiene campos: `doc_front_url`, `doc_back_url`, `selfie_url`
> - Bucket `kyc-docs` en Storage ya configurado
> - Flujo de aprobar/rechazar ya implementado en "Solicitudes"

---

## Enfoque Seleccionado: Mejorar "Solicitudes"

✅ **Decisión:** Mejorar la sección existente "Solicitudes" en `/admin` agregando visualización de documentos KYC en el modal de detalles. Mantiene flujo unificado y minimiza código nuevo.

### Estado de Implementación ✅

| Componente | Estado | Archivo |
|------------|--------|---------|
| Biometric Login | ✅ Creado | `src/lib/capacitor/biometrics.ts` |
| Platform Detection | ✅ Creado | `src/lib/capacitor/platform.ts` |
| Login Page | ✅ Modificado | Botón biométrico agregado |
| Admin Panel KYC | ✅ Modificado | Preview + comparación lado a lado |
| Paquetes Capacitor | ⏳ Pendiente | Instalar al configurar móvil |

---

## Proposed Changes

### Fase 1: Biometric Login (Capacitor)

#### [NEW] [src/lib/capacitor/biometrics.ts](file:///c:/Users/Grizzly/Documents/vendra-app/vendra-app/src/lib/capacitor/biometrics.ts)

```typescript
import { BiometricAuth } from '@capacitor-community/biometric-auth';
import { Capacitor } from '@capacitor/core';

export async function isBiometricAvailable() {
  if (!Capacitor.isNativePlatform()) return false;
  const result = await BiometricAuth.isAvailable();
  return result.isAvailable;
}

export async function authenticateWithBiometrics() {
  return BiometricAuth.authenticate({
    reason: 'Inicia sesión con tu huella o Face ID',
    title: 'Acceso Biométrico',
    subtitle: 'Vendra',
    negativeButtonText: 'Usar contraseña'
  });
}
```

#### [MODIFY] Login page - Agregar botón biométrico
En la página de login, agregar opción de login con huella/Face ID para usuarios que ya tienen sesión guardada.

---

### Fase 2: Mejorar Formulario del Usuario (Subida de Documentos)

#### [MODIFY] [src/app/seller/apply/page.tsx](file:///c:/Users/Grizzly/Documents/vendra-app/vendra-app/src/app/seller/apply/page.tsx)

El formulario ya tiene campos, pero mejorar la UI para:
- Subir **foto frontal de cédula**
- Subir **foto trasera de cédula**  
- Tomar/subir **selfie**
- Preview de imágenes antes de enviar

```typescript
// Campos existentes en seller_applications:
doc_front_url   // Foto frontal cédula
doc_back_url    // Foto trasera cédula
selfie_url      // Selfie del usuario
```

---

### Fase 3: Mejorar Panel Admin "Solicitudes"

#### [MODIFY] [src/components/admin/ApplicationsTable.tsx](file:///c:/Users/Grizzly/Documents/vendra-app/vendra-app/src/components/admin/ApplicationsTable.tsx)

Agregar al modal de detalles:

```typescript
// Sección KYC Documents en el modal
{/* Documentos de Verificación */}
<div className="space-y-4 border-t pt-4">
  <h4 className="font-semibold">Verificación de Identidad</h4>
  
  <div className="grid grid-cols-2 gap-4">
    {/* Cédula Frontal */}
    <div className="space-y-2">
      <label>Cédula (Frontal)</label>
      {selectedApplication.doc_front_url ? (
        <img 
          src={selectedApplication.doc_front_url} 
          alt="Cédula frontal"
          className="w-full rounded-lg border cursor-pointer"
          onClick={() => openImagePreview(selectedApplication.doc_front_url)}
        />
      ) : (
        <div className="bg-gray-100 p-4 text-gray-500 rounded-lg">
          No subido
        </div>
      )}
    </div>
    
    {/* Cédula Trasera */}
    <div className="space-y-2">
      <label>Cédula (Trasera)</label>
      {/* Similar */}
    </div>
  </div>
  
  {/* Selfie */}
  <div className="space-y-2">
    <label>Selfie de Verificación</label>
    {/* Mostrar selfie al lado de la cédula para comparar */}
  </div>
  
  {/* Comparación lado a lado */}
  <div className="flex gap-4 p-4 bg-blue-50 rounded-lg">
    <img src={doc_front_url} className="w-1/2" />
    <img src={selfie_url} className="w-1/2" />
    <p className="text-sm">Compare visualmente la foto de la cédula con el selfie</p>
  </div>
</div>
```

#### [MODIFY] Supabase function - Agregar campos KYC a response

La función `admin-get-applications` debe incluir los campos de documentos:
```sql
SELECT ..., doc_front_url, doc_back_url, selfie_url FROM seller_applications
```

---

## Verificación

| Test | Descripción |
|------|-------------|
| ⬜ Subir documentos | Usuario puede subir cédula + selfie |
| ⬜ Ver en admin | Admin ve imágenes en modal de detalles |
| ⬜ Comparar | Admin puede ver cédula y selfie lado a lado |
| ⬜ Aprobar/Rechazar | Flujo existente sigue funcionando |
| ⬜ Biometrics | Login con huella funciona en móvil |

---

## Resumen de Archivos

| Acción | Archivo |
|--------|---------|
| NEW | `src/lib/capacitor/biometrics.ts` |
| MODIFY | `src/app/seller/apply/page.tsx` (mejorar UI documentos) |
| MODIFY | `src/components/admin/ApplicationsTable.tsx` (mostrar docs) |
| MODIFY | `supabase/functions/admin-get-applications/index.ts` |
| MODIFY | `src/app/login/page.tsx` (botón biométrico) |
