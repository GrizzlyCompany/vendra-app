"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LogIn, ArrowLeft } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string>("comprador");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if already logged in
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/main");
    });
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role } },
      } as any);
      if (error) throw error;

      const userId = data.user?.id;
      if (userId) {
        // Crea/actualiza el perfil con el rol elegido.
        const { error: profileError } = await supabase
          .from("users")
          .upsert({ id: userId, name, role, email }, { onConflict: "id" });
        if (profileError) {
          // Logically non-fatal for signup flow. Keep going.
          console.warn("Profile insert error:", profileError.message);
        }
      }

      // If email confirmations are enabled, session may be null. For this demo, navigate anyway.
      router.replace("/main");
    } catch (err: any) {
      setError(err?.message ?? "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Left Half - Signup Content */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 py-1 mobile-bottom-safe relative z-20 overflow-y-auto">
        {/* Back Button */}
        <div className="w-full max-w-xs mb-1">
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
        <div className="flex flex-col items-center mb-2">
          <div className="flex flex-col items-center">
            <Image
              src="https://vvuvuibcmvqxtvdadwne.supabase.co/storage/v1/object/public/logo/logo3.png"
              alt="Logotipo de Vendra"
              width={160}
              height={58}
              className="h-12 sm:h-14 lg:h-16 w-auto -mb-1"
              priority
            />
            <h1 className="text-lg sm:text-xl lg:text-2xl font-serif font-extrabold tracking-wide text-primary text-center">
              VENDRA
            </h1>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-0.5 max-w-sm">
            Conecta compradores y vendedores de propiedades
          </p>
        </div>

      {/* Signup Card */}
      <Card className="w-full max-w-xs border-0 shadow-xl rounded-t-none rounded-b-2xl bg-background">
        <CardHeader className="text-center pb-1 pt-3">
          <CardTitle className="font-serif text-base sm:text-lg text-foreground">Crear cuenta</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Únete a nuestra comunidad inmobiliaria</p>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <form onSubmit={onSubmit} className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-0.5">Nombre completo</label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                placeholder="Tu nombre completo"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-0.5">Correo electrónico</label>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="tu@correo.com"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-0.5">Contraseña</label>
              <Input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="••••••••"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-0.5">Tipo de cuenta</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-8 rounded-md border bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <option value="comprador">Comprador</option>
                <option value="vendedor_agente">Vendedor/Agente</option>
                <option value="empresa_constructora">Empresa constructora</option>
              </select>
            </div>
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1">{error}</div>
            )}
            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full h-8 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm mt-2"
            >
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </form>
          
          {/* Login link */}
          <div className="mt-2 text-center">
            <p className="text-xs text-muted-foreground">
              ¿Ya tienes una cuenta?{" "}
              <Button asChild variant="link" className="p-0 h-auto font-medium text-primary text-xs">
                <Link href="/login" className="inline-flex items-center gap-1">
                  <LogIn className="w-3 h-3" />
                  Iniciar sesión
                </Link>
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
      
      {/* Right Half - Image Overlay */}
      <div className="hidden lg:block fixed top-0 right-0 w-1/2 h-screen z-0">
        <Image
          src="https://vvuvuibcmvqxtvdadwne.supabase.co/storage/v1/object/public/logo/signuplogo.png"
          alt="Signup background"
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}
