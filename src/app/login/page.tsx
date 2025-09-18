"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToastContext } from "@/components/ToastProvider";
import { handleSupabaseError } from "@/lib/errors";
import { UserPlus, ArrowLeft, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { error: showError, success: showSuccess } = useToastContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      router.replace("/main");
    }
  }, [user, authLoading, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showSuccess("¡Bienvenido de vuelta!");
      router.replace("/main");
    } catch (err: any) {
      const error = handleSupabaseError(err);
      showError("Error al iniciar sesión", error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryLoading(true);
    try {
      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      showSuccess(
        "Correo de recuperación enviado", 
        "Revisa tu bandeja de entrada para restablecer tu contraseña"
      );
      
      // Reset form and return to login
      setRecoveryEmail("");
      setIsRecoveryMode(false);
    } catch (err: any) {
      const error = handleSupabaseError(err);
      showError("Error al enviar correo", error.message);
    } finally {
      setRecoveryLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Half - Login Content */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 py-2 mobile-bottom-safe relative z-20">
        {/* Back Button */}
        <div className="w-full max-w-sm mb-2">
          <Button 
            asChild 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 w-10 h-10 border border-border/30 hover:border-border/50"
          >
            <Link href="/">
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

        {/* Login Card */}
        <Card className="w-full max-w-sm border-0 shadow-xl rounded-t-none rounded-b-2xl bg-background">
          <CardHeader className="text-center pb-2 pt-4">
            <CardTitle className="font-serif text-lg sm:text-xl text-foreground">
              {isRecoveryMode ? "Recuperar contraseña" : "Iniciar sesión"}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {isRecoveryMode 
                ? "Ingresa tu correo para recibir instrucciones de recuperación" 
                : "Accede a tu cuenta para continuar"}
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-4">
            {isRecoveryMode ? (
              <form onSubmit={onRecoverySubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Correo electrónico</label>
                  <Input 
                    type="email" 
                    value={recoveryEmail} 
                    onChange={(e) => setRecoveryEmail(e.target.value)} 
                    required 
                    placeholder="tu@correo.com"
                    className="h-9 text-sm"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={recoveryLoading} 
                  className="w-full h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm mt-4"
                >
                  {recoveryLoading ? "Enviando..." : "Enviar instrucciones"}
                </Button>
                <div className="mt-3 text-center">
                  <Button 
                    variant="link" 
                    className="p-0 h-auto font-medium text-primary text-xs"
                    onClick={() => setIsRecoveryMode(false)}
                  >
                    Volver al inicio de sesión
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={onSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Correo electrónico</label>
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    placeholder="tu@correo.com"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Contraseña</label>
                  <Input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
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
                  {loading ? "Ingresando..." : "Iniciar sesión"}
                </Button>
                
                {/* Forgot password link */}
                <div className="mt-2 text-center">
                  <Button 
                    variant="link" 
                    className="p-0 h-auto font-medium text-primary text-xs"
                    onClick={() => setIsRecoveryMode(true)}
                  >
                    ¿Olvidaste tu contraseña?
                  </Button>
                </div>
              </form>
            )}
            
            {/* Sign up link */}
            <div className="mt-3 text-center">
              <p className="text-xs text-muted-foreground">
                ¿No tienes una cuenta?{" "}
                <Button asChild variant="link" className="p-0 h-auto font-medium text-primary text-xs">
                  <Link href="/signup" className="inline-flex items-center gap-1">
                    <UserPlus className="w-3 h-3" />
                    Crear cuenta
                  </Link>
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Right Half - Image Overlay */}
      <div className="hidden lg:block fixed top-0 right-0 bottom-0 w-1/2 z-0">
        <div className="relative w-full h-full">
          <Image
            src="https://vvuvuibcmvqxtvdadwne.supabase.co/storage/v1/object/public/logo/loginimage2.png"
            alt="Login background"
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