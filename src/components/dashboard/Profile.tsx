"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { Upload } from "lucide-react";

export function ProfileSection() {
  const [uid, setUid] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    logo_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const id = data.session?.user.id ?? null;
      if (!mounted) return;
      setUid(id);
      if (!id) return;
      const { data: user } = await supabase.from("users").select("name,email,avatar_url").eq("id", id).single();
      if (user && mounted) {
        setForm((p) => ({ 
          ...p, 
          name: user.name ?? "", 
          email: user.email ?? "", 
          logo_url: user.avatar_url ?? "" 
        }));
        setAvatarPreview(user.avatar_url ?? null);
      }
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

  // Avatar: open file picker and upload to Supabase, then update profile
  const onPickAvatar = () => {
    if (fileInputRef.current) fileInputRef.current.value = ""; // permite re-seleccionar el mismo archivo
    fileInputRef.current?.click();
  };

  const onAvatarFile = async (file?: File | null) => {
    if (!file) return;
    // Show instant local preview
    try {
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);
      setForm(prev => ({ ...prev, logo_url: objectUrl }));
    } catch {}
    
    try {
      const uid = (await supabase.auth.getSession()).data.session?.user?.id ?? null;
      if (!uid) {
        alert("No se pudo identificar al usuario. Intenta iniciar sesión nuevamente.");
        return;
      }
      
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${uid}/${Date.now()}.${ext}`;
      const { data: upData, error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type || "image/jpeg" });
      
      if (upErr) {
        alert(`Error al subir la imagen: ${upErr.message}`);
        return;
      }
      
      const storedPath = upData?.path ?? path;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(storedPath);
      const publicUrl = pub?.publicUrl ?? null;
      
      if (!publicUrl) {
        alert("No se pudo obtener la URL pública del avatar.");
        return;
      }
      
      const { error: updErr } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", uid);
        
      if (updErr) {
        alert(`La imagen se subió pero no se pudo guardar en el perfil: ${updErr.message}`);
      }
      
      // Update form with the public URL
      setForm(prev => ({ ...prev, logo_url: publicUrl }));
      
      // Persist also in auth metadata as fallback source on reload
      try {
        await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      } catch {}
    } catch (e: any) {
      alert(`Error inesperado al subir avatar: ${e?.message ?? e}`);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-2xl text-[#1C4B2E]">Perfil</h2>
      <Card className="rounded-2xl border shadow-md">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Datos de la empresa</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Avatar section */}
          <div className="sm:col-span-2 flex flex-col items-center gap-4">
            <Avatar 
              className="h-24 w-24 border-2 border-primary" 
              src={avatarPreview ?? null} 
              initials={form.name ? form.name.charAt(0) : "E"} 
            />
            <Button 
              onClick={onPickAvatar}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Subir Logo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onAvatarFile(e.target.files?.[0])}
            />
          </div>
          
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
          {/* Hidden logo_url field - keeping it for form state but not displaying it */}
          <input type="hidden" id="logo_url" name="logo_url" value={form.logo_url} onChange={onChange} />
          <div className="sm:col-span-2">
            <Button onClick={onSave} disabled={saving} className="bg-[#1C4B2E] text-white hover:bg-[#163c25]">
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}