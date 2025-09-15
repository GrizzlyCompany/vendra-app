"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-[calc(100dvh-64px)] bg-background flex items-center justify-center px-3 sm:px-4 py-10 mobile-bottom-safe">
      <Card className="w-full max-w-md border-[hsl(var(--border))]">
        <CardHeader>
          <CardTitle className="font-serif text-2xl text-foreground">Crear cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Nombre</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Tu nombre" />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@correo.com" />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="********" />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Rol</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="comprador">Comprador</option>
                <option value="vendedor_agente">Vendedor/Agente</option>
                <option value="empresa_constructora">Empresa constructora</option>
              </select>
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
            )}
            <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? "Creando..." : "Crear cuenta"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
