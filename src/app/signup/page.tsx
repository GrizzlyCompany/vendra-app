"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { validateSignupForm, SignupFormData } from "@/lib/validation";
import { handleSupabaseError } from "@/lib/errors";
import { useToastContext } from "@/components/ToastProvider";
import { LogIn, ArrowLeft, Building2, User, Key, Quote } from "lucide-react";

function SignupPageContent() {
  const router = useRouter();
  const { success: showSuccess } = useToastContext();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string>("comprador");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/main");
    });
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData: SignupFormData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: role as SignupFormData['role']
    };

    const validation = validateSignupForm(formData);
    if (!validation.success) {
      const errorMessage = validation.error.issues
        .map((issue) => issue.message)
        .join(', ');
      setError(errorMessage);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: formData.role,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        if (data.session) {
          showSuccess("Cuenta creada exitosamente", "Bienvenido a Vendra!");
          router.replace("/main");
        } else {
          router.replace("/login?message=email-confirmation-sent");
        }
      } else {
        throw new Error("Cuenta no pudo ser creada.");
      }
    } catch (err: any) {
      const supabaseError = handleSupabaseError(err);
      setError(supabaseError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background overflow-hidden">

      {/* Left Column: Form (Clean Bone White) */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 sm:px-12 xl:px-24 py-12 bg-background text-foreground animate-in fade-in slide-in-from-left-4 duration-700">

        <div className="absolute top-[calc(2rem+env(safe-area-inset-top,0px))] left-8 z-20">
          <Link href="/" className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <div className="p-2 rounded-full border border-border/50 bg-background group-hover:bg-primary/5 transition-colors">
              <ArrowLeft className="size-4" />
            </div>
            <span className="font-medium">Volver al inicio</span>
          </Link>
        </div>

        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-6">
              <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20 text-primary-foreground font-serif text-2xl font-bold">V</div>
            </div>
            <h1 className="text-3xl font-serif font-bold text-foreground tracking-tight">Crear cuenta</h1>
            <p className="text-muted-foreground">Únete a la plataforma inmobiliaria más exclusiva</p>
          </div>

          {/* Form Container */}
          <div className="w-full">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">Nombre completo</label>
                <Input
                  value={name} onChange={(e) => setName(e.target.value)} required
                  placeholder="Nombre Apellido"
                  className="h-12 rounded-xl bg-secondary/10 border-transparent focus:border-primary focus:bg-background transition-all text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">Correo electrónico</label>
                <Input
                  type="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} required
                  placeholder="ejemplo@vendra.com"
                  className="h-12 rounded-xl bg-secondary/10 border-transparent focus:border-primary focus:bg-background transition-all text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">Contraseña</label>
                <Input
                  type="password"
                  value={password} onChange={(e) => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="h-12 rounded-xl bg-secondary/10 border-transparent focus:border-primary focus:bg-background transition-all text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">Tipo de cuenta</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: "comprador", icon: User, label: "Comprador" },
                    { val: "vendedor_agente", icon: Key, label: "Agente" },
                    { val: "empresa_constructora", icon: Building2, label: "Empresa" }
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setRole(opt.val)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${role === opt.val
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                        : "bg-background border-border hover:bg-secondary/20 hover:border-primary/30 text-muted-foreground"
                        }`}
                    >
                      <opt.icon className="size-5 mb-1 opacity-80" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 animate-in slide-in-from-top-1">{error}</div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-base font-medium shadow-md shadow-primary/20 hover:shadow-lg transition-all mt-4"
              >
                {loading ? "Creando cuenta..." : "Registrarse"}
              </Button>
            </form>
          </div>

          <div className="text-center text-sm pt-2">
            <span className="text-muted-foreground">¿Ya tienes cuenta? </span>
            <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>

      {/* Right Column: Image (Premium Dark) */}
      <div className="hidden lg:block relative h-full w-full">
        <Image
          src="https://vvuvuibcmvqxtvdadwne.supabase.co/storage/v1/object/public/logo/signuplogo.png"
          alt="Signup Luxury"
          fill
          className="object-cover"
          priority
          quality={95}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

        <div className="absolute bottom-16 left-12 right-12 text-white space-y-6">
          <Quote className="size-10 text-primary/80 fill-primary/20" />
          <blockquote className="font-serif text-3xl md:text-4xl leading-tight font-medium opacity-95">
            "Diseña la vida que siempre has soñado."
          </blockquote>
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-white/20" />
            <p className="text-sm font-medium tracking-widest uppercase opacity-70">Únete a Vendra</p>
          </div>
        </div>
      </div>

    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignupPageContent />
    </Suspense>
  );
}
