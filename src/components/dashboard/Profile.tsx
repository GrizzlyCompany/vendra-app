"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";

export function ProfileSection() {
  const [uid, setUid] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    logo_url: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const id = data.session?.user.id ?? null;
      if (!mounted) return;
      setUid(id);
      if (!id) return;
      const { data: user } = await supabase.from("users").select("name,email,avatar_url").eq("id", id).single();
      if (user && mounted) setForm((p) => ({ ...p, name: user.name ?? "", email: user.email ?? "", logo_url: user.avatar_url ?? "" }));
    });
    return () => {
      mounted = false;
    };
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSave = async () => {
    if (!uid) return;
    setSaving(true);
    await supabase.from("users").update({ name: form.name, email: form.email, avatar_url: form.logo_url }).eq("id", uid);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-2xl text-[#1C4B2E]">Perfil</h2>
      <Card className="rounded-2xl border shadow-md">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Datos de la empresa</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm text-[#6B7280]" htmlFor="name">Nombre de la empresa</label>
            <Input id="name" name="name" value={form.name} onChange={onChange} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-[#6B7280]" htmlFor="email">Correo</label>
            <Input id="email" name="email" value={form.email} onChange={onChange} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-[#6B7280]" htmlFor="phone">Teléfono</label>
            <Input id="phone" name="phone" value={form.phone} onChange={onChange} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-[#6B7280]" htmlFor="logo_url">Logo (URL)</label>
            <Input id="logo_url" name="logo_url" value={form.logo_url} onChange={onChange} placeholder="https://..." />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={onSave} disabled={saving} className="bg-[#1C4B2E] text-white hover:bg-[#163c25]">{saving ? "Guardando..." : "Guardar cambios"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
