"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToastContext } from "@/components/ToastProvider";
import { handleSupabaseError } from "@/lib/errors";
import { ArrowLeft, CheckCircle } from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error: showError, success: showSuccess } = useToastContext();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [isValidRecovery, setIsValidRecovery] = useState(true); // Assume valid by default
  const [sessionChecked, setSessionChecked] = useState(false);

  // Check if we have a valid recovery session on page load
  useEffect(() => {
    const checkRecoverySession = async () => {
      try {
        // Small delay to allow Supabase to establish the recovery session
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        
        // For password reset flow, we'll allow the user to proceed
        // The actual validation will happen when they try to update the password
        setIsValidRecovery(true);
      } catch (error) {
        console.error('Error checking recovery session:', error);
        setIsValidRecovery(false);
      } finally {
        setSessionChecked(true);
      }
    };

    checkRecoverySession();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      showError("Error", "Las contraseñas no coinciden");
      return;
    }
    
    if (password.length < 6) {
      showError("Error", "La contraseña debe tener al menos 6 caracteres");
      return;
    }
    
    setLoading(true);
    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) throw error;
      
      showSuccess("¡Contraseña actualizada!", "Tu contraseña ha sido restablecida correctamente");
      setResetComplete(true);
      
      // Sign out to clear the recovery session
      await supabase.auth.signOut();
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.replace("/login");
      }, 3000);
    } catch (err: any) {
      const error = handleSupabaseError(err);
      // Check if this is a session error
      if (error.message.includes('session') || error.message.includes('Session')) {
        showError("Enlace expirado", "El enlace para restablecer la contraseña ha expirado. Solicita uno nuevo desde la página de inicio de sesión.");
      } else {
        showError("Error al restablecer contraseña", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Verificando enlace de recuperación...</p>
        </div>
      </div>
    );
  }

  if (!isValidRecovery && sessionChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm p-4">
          <div className="text-red-500 mb-4">
            <p className="text-lg font-semibold">Enlace inválido o expirado</p>
            <p className="text-muted-foreground mt-2 text-sm">
              El enlace para restablecer la contraseña no es válido o ha expirado. 
              Solicita un nuevo enlace desde la página de inicio de sesión.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/login">Volver al inicio de sesión</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Half - Reset Password Content */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 py-2 mobile-bottom-safe relative z-20">
        {/* Back Button */}
        <div className="w-full max-w-sm mb-2">
          <Button 
            asChild 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 w-10 h-10 border border-border/30 hover:border-border/50"
          >
            <Link href="/login">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </div>
        
        {/* Logo and Brand */}
        <div className="flex flex-col items-center mb-3">
          <div className="flex flex-col items-center mb-1">
            <Image
              src="https://vvuvuibcmvqxtvdadwne.supabase.co/storage/v1/object/public/logo/logo3.png"
              alt="Logotipo de Vendra"
              width={180}
              height={65}
              className="h-16 sm:h-18 lg:h-20 w-auto -mb-1"
              priority
            />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-extrabold tracking-wide text-primary text-center">
              VENDRA
            </h1>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1 max-w-sm">
            Conecta compradores y vendedores de propiedades
          </p>
        </div>

        {/* Reset Password Card */}
        <Card className="w-full max-w-sm border-0 shadow-xl rounded-t-none rounded-b-2xl bg-background">
          <CardHeader className="text-center pb-2 pt-4">
            <CardTitle className="font-serif text-lg sm:text-xl text-foreground">
              {resetComplete ? "¡Contraseña actualizada!" : "Restablecer contraseña"}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {resetComplete 
                ? "Tu contraseña ha sido actualizada correctamente" 
                : "Ingresa tu nueva contraseña"}
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-4">
            {resetComplete ? (
              <div className="text-center py-6">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Serás redirigido al inicio de sesión en unos segundos...
                </p>
                <Button asChild variant="default" className="w-full">
                  <Link href="/login">Ir al inicio de sesión ahora</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Nueva contraseña</label>
                  <Input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    placeholder="••••••••"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Confirmar contraseña</label>
                  <Input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required 
                    placeholder="••••••••"
                    className="h-9 text-sm"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm mt-4"
                >
                  {loading ? "Actualizando..." : "Actualizar contraseña"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Right Half - Image Overlay */}
      <div className="hidden lg:block fixed top-0 right-0 bottom-0 w-1/2 z-0">
        <div className="relative w-full h-full">
          <Image
            src="https://vvuvuibcmvqxtvdadwne.supabase.co/storage/v1/object/public/logo/loginimage2.png"
            alt="Reset password background"
            fill
            className="object-cover object-center"
            priority
            sizes="50vw"
          />
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-center text-muted-foreground">Cargando...</div></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}