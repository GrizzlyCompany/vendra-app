"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Simple edit form for public.users, mirroring the look & feel of seller/apply
export default function ProfileEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);

  // Fields present in public.users
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState<"comprador" | "vendedor_agente" | "empresa_constructora">("comprador");
  // Extra fields styled like seller/apply (stored in seller_applications draft)
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [nationality, setNationality] = useState("");
  const [birthDate, setBirthDate] = useState("");
  

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: session } = await supabase.auth.getSession();
        const uid = session.session?.user?.id;
        if (!uid) {
          router.replace("/login");
          return;
        }
        const { data, error } = await supabase
          .from("users")
          .select("name, email, bio, role")
          .eq("id", uid)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setName(data.name ?? "");
          setEmail(data.email ?? session.session?.user?.email ?? "");
          setBio(data.bio ?? "");
          setRole((data.role as any) ?? "comprador");
        } else {
          // If row missing, prefill from auth
          setEmail(session.session?.user?.email ?? "");
          setRole("comprador");
        }

        // Load latest seller_applications to prefill extra fields
        const { data: existing } = await supabase
          .from("seller_applications")
          .select("id, phone, address, nationality, birth_date")
          .eq("user_id", uid)
          .in("status", ["draft", "submitted", "needs_more_info"] as any)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing) {
          setAppId(existing.id);
          setPhone(existing.phone ?? "");
          setAddress(existing.address ?? "");
          setNationality(existing.nationality ?? "");
          setBirthDate(existing.birth_date ?? "");
        }
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) {
        router.replace("/login");
        return;
      }
      // Upsert the users row
      const { error } = await supabase
        .from("users")
        .upsert({ id: uid, name, email, bio, role })
        .eq("id", uid);
      if (error) throw error;

      // Upsert/merge seller_applications draft with extra fields (no status change)
      if (phone || address || nationality || birthDate || appId) {
        if (appId) {
          const { error: e2 } = await supabase
            .from("seller_applications")
            .update({ phone, address, nationality, birth_date: birthDate })
            .eq("id", appId);
          if (e2) throw e2;
        } else {
          const { data: ins, error: e3 } = await supabase
            .from("seller_applications")
            .insert({ user_id: uid, phone, address, nationality, birth_date: birthDate, status: "draft" })
            .select("id")
            .single();
          if (e3) throw e3;
          setAppId(ins.id);
        }
      }
      // Sync into auth metadata for convenience
      try {
        await supabase.auth.updateUser({ data: { name, role } });
      } catch {}
      setSuccess("Perfil actualizado correctamente");
      // Navigate back to profile after a brief delay
      setTimeout(() => router.push("/profile"), 600);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  // Sin edición de avatar aquí; eso se maneja desde el menú del perfil.

  return (
    <div className="container mx-auto max-w-3xl p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Editar información del perfil</CardTitle>
          <p className="text-sm text-muted-foreground">Actualiza tus datos básicos y tu rol en la plataforma. Este formulario mantiene el mismo estilo y estructura que el de verificación de vendedor.</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Cargando…</div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-3 py-2 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 px-3 py-2 text-sm">
                  {success}
                </div>
              )}

              {/* 1) Datos básicos */}
              <section className="space-y-3">
                <h3 className="text-sm font-medium">1) Datos básicos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Nombre completo</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Email</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="tu@email.com" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-muted-foreground mb-1">Biografía</label>
                  <textarea 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={bio} 
                    onChange={(e) => setBio(e.target.value)} 
                    placeholder="Escribe una breve introducción sobre ti..."
                    maxLength={500}
                    rows={3}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{bio.length}/500 caracteres</p>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Nacionalidad</label>
                  <Input value={nationality} onChange={(e)=>setNationality(e.target.value)} placeholder="Dominicana" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Fecha de nacimiento</label>
                  <Input type="date" value={birthDate} onChange={(e)=>setBirthDate(e.target.value)} />
                </div>
                </div>
              </section>

              {/* 2) Foto de perfil */}
              <section className="space-y-2">
                <h3 className="text-sm font-medium">2) Foto de perfil</h3>
                <p className="text-xs text-muted-foreground">La edición de la foto se realiza desde el menú de tu perfil usando la opción “Editar foto de perfil”.</p>
              </section>

              {/* 3) Contacto */}
              <section className="space-y-3">
                <h3 className="text-sm font-medium">3) Información de contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Teléfono</label>
                    <Input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="809-000-0000" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Dirección</label>
                    <Input value={address} onChange={(e)=>setAddress(e.target.value)} placeholder="Calle, ciudad" />
                  </div>
                </div>
              </section>

              {/* 4) Rol en la plataforma (solo lectura) */}
              <section className="space-y-3">
                <h3 className="text-sm font-medium">4) Rol en la plataforma</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Rol</label>
                  <Input
                    readOnly
                    value={role === "comprador" ? "Comprador" : role === "vendedor_agente" ? "Vendedor/Agente" : "Empresa constructora"}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">El rol es administrado por el sistema según tus acciones.</p>
                </div>
                </div>
              </section>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="button" onClick={onSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {saving ? "Guardando…" : "Guardar cambios"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
