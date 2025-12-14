"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToastContext } from "@/components/ToastProvider";
import { handleSupabaseError } from "@/lib/errors";
import { validateLoginForm, LoginFormData } from "@/lib/validation";
import { UserPlus, ArrowLeft, Mail, Quote } from "lucide-react";

export const dynamic = 'force-dynamic';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { error: showError, success: showSuccess } = useToastContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  useEffect(() => {
    const message = searchParams.get('message');
    if (message === 'email-confirmation-sent') {
      showSuccess(
        "Cuenta creada exitosamente",
        "Revisa tu correo electrónico para confirmar tu cuenta antes de iniciar sesión"
      );
      router.replace('/login', { scroll: false });
    }
  }, [searchParams, router, showSuccess]);

  useEffect(() => {
    if (user && !authLoading) {
      router.replace("/main");
    }
  }, [user, authLoading, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData: LoginFormData = {
      email: email.trim().toLowerCase(),
      password: password.trim()
    };

    const validation = validateLoginForm(formData);
    if (!validation.success) {
      const errorMessage = validation.error.issues
        .map((issue) => issue.message)
        .join(', ');
      showError("Datos inválidos", errorMessage);
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });
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
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      showSuccess(
        "Correo de recuperación enviado",
        "Revisa tu bandeja de entrada para restablecer tu contraseña"
      );

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
          <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground font-serif">Iniciando experiencia...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background overflow-hidden">

      {/* Left Column: Form Section (Clean Bone White) */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 sm:px-12 xl:px-24 py-12 bg-background text-foreground animate-in fade-in slide-in-from-left-4 duration-700">

        {/* Back Button */}
        <div className="absolute top-8 left-8">
          <Link href="/" className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <div className="p-2 rounded-full border border-border/50 bg-background group-hover:bg-primary/5 transition-colors">
              <ArrowLeft className="size-4" />
            </div>
            <span className="font-medium">Volver al inicio</span>
          </Link>
        </div>

        <div className="w-full max-w-md space-y-8">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-6">
              <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20 text-primary-foreground font-serif text-2xl font-bold">V</div>
            </div>
            <h1 className="text-3xl font-serif font-bold text-foreground">
              {isRecoveryMode ? "Recuperar acceso" : "Bienvenido de nuevo"}
            </h1>
            <p className="text-muted-foreground">
              {isRecoveryMode
                ? "Te enviaremos las instrucciones a tu correo"
                : "Ingresa tus credenciales para acceder a tu panel"
              }
            </p>
          </div>

          {/* Form Container - CLEAN NO CARD */}
          <div className="w-full">
            {isRecoveryMode ? (
              <form onSubmit={onRecoverySubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground ml-1">Correo electrónico</label>
                  <Input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    required
                    placeholder="ejemplo@vendra.com"
                    className="h-12 rounded-xl bg-secondary/10 border-transparent focus:border-primary focus:bg-background transition-all text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={recoveryLoading}
                  className="w-full h-12 rounded-xl text-base font-medium shadow-md shadow-primary/20 hover:shadow-lg transition-all"
                >
                  {recoveryLoading ? "Enviando..." : "Enviar enlace de recuperación"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsRecoveryMode(false)}
                  className="w-full hover:bg-transparent hover:text-primary transition-colors h-auto p-0"
                >
                  Volver a iniciar sesión
                </Button>
              </form>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground ml-1">Correo electrónico</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="ejemplo@vendra.com"
                    className="h-12 rounded-xl bg-secondary/10 border-transparent focus:border-primary focus:bg-background transition-all text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-sm font-medium text-foreground">Contraseña</label>
                    <button
                      type="button"
                      onClick={() => setIsRecoveryMode(true)}
                      className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="h-12 rounded-xl bg-secondary/10 border-transparent focus:border-primary focus:bg-background transition-all text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-base font-medium shadow-md shadow-primary/20 hover:shadow-lg transition-all"
                >
                  {loading ? "Accediendo..." : "Iniciar Sesión"}
                </Button>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-sm pt-4">
            <span className="text-muted-foreground">{isRecoveryMode ? "¿Ya la recordaste?" : "¿Aún no tienes cuenta?"} </span>
            <Link href={isRecoveryMode ? "#" : "/signup"} onClick={() => isRecoveryMode && setIsRecoveryMode(false)} className="font-semibold text-primary hover:text-primary/80 transition-colors">
              {isRecoveryMode ? "Inicia sesión" : "Regístrate gratis"}
            </Link>
          </div>
        </div>
      </div>

      {/* Right Column: Image & Quote (Kept Dark & Premium) */}
      <div className="hidden lg:block relative h-full w-full">
        <Image
          src="https://vvuvuibcmvqxtvdadwne.supabase.co/storage/v1/object/public/logo/loginimage2.png"
          alt="Luxury Architecture"
          fill
          className="object-cover"
          priority
          quality={95}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

        {/* Quote Overlay */}
        <div className="absolute bottom-16 left-12 right-12 text-white space-y-6">
          <Quote className="size-10 text-primary/80 fill-primary/20" />
          <blockquote className="font-serif text-3xl md:text-4xl leading-tight font-medium opacity-95">
            "El hogar es el punto de partida del amor, la esperanza y los sueños."
          </blockquote>
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-white/20" />
            <p className="text-sm font-medium tracking-widest uppercase opacity-70">Experiencia Vendra</p>
          </div>
        </div>
      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginPageContent />
    </Suspense>
  );
}
