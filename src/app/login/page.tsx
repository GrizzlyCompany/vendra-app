"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToastContext } from "@/components/ToastProvider";
import { handleSupabaseError } from "@/lib/errors";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { error: showError, success: showSuccess } = useToastContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

  if (authLoading) {
    return (
      <div className="min-h-[calc(100dvh-64px)] bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-64px)] bg-background flex items-center justify-center px-3 sm:px-4 py-10 mobile-bottom-safe">
      <Card className="w-full max-w-md border-[hsl(var(--border))]">
        <CardHeader>
          <CardTitle className="font-serif text-2xl text-foreground">Iniciar sesión</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@correo.com" />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="********" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
