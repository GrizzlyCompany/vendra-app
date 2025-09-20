"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

// Helper
const toNumber = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

type FormState = {
  title: string;
  description: string;
  price: string;
  location: string;
  type: string;
  images: string; // comma-separated URLs
};

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    price: "",
    location: "",
    type: "",
    images: "",
  });

  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);

  const typedPreviewUrls = useMemo(
    () =>
      form.images
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    [form.images]
  );

  // Auth + fetch current property
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id ?? null;
      if (!active) return;
      if (!userId) {
        router.replace("/login");
        return;
      }
      setUid(userId);

      // Fetch property
      const { data: prop, error: propErr } = await supabase
        .from("properties")
        .select("id,title,description,price,location,images,type,owner_id")
        .eq("id", id)
        .maybeSingle();

      if (propErr || !prop) {
        setError(propErr?.message || "Propiedad no encontrada.");
        setLoading(false);
        return;
      }

      if (prop.owner_id !== userId) {
        // No permitir editar propiedades de otros
        router.replace(`/properties/${id}`);
        return;
      }

      setForm({
        title: prop.title ?? "",
        description: prop.description ?? "",
        price: String(prop.price ?? ""),
        location: prop.location ?? "",
        type: prop.type ?? "",
        images: Array.isArray(prop.images) ? prop.images.join(", ") : prop.images ?? "",
      });

      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id, router]);

  // cleanup object URLs
  useEffect(() => {
    return () => {
      filePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [filePreviews]);

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!uid) return;

    const priceNum = toNumber(form.price);
    if (!form.title || !form.location || isNaN(priceNum)) {
      setError("Título, ubicación y precio válido son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      const typedUrls = form.images
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      // Upload any new files
      let uploadedUrls: string[] = [];
      if (files && files.length > 0) {
        setUploading(true);
        const bucket = "property-images";
        for (let i = 0; i < files.length; i++) {
          const f = files.item(i)!;
          const ext = f.name.split(".").pop() || "bin";
          const path = `${uid}/${Date.now()}-${i}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: upErr } = await supabase.storage.from(bucket).upload(path, f, { upsert: false, cacheControl: "3600" });
          if (upErr) {
            setError(`Error al subir imagen: ${upErr.message}`);
            setUploading(false);
            return;
          }
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
          if (pub?.publicUrl) uploadedUrls.push(pub.publicUrl);
        }
        setUploading(false);
      }

      const images = [...uploadedUrls, ...typedUrls];

      const { error: updErr } = await supabase
        .from("properties")
        .update({
          title: form.title,
          description: form.description || null,
          price: priceNum,
          location: form.location,
          images: images.length ? images : null,
          type: form.type || null,
        })
        .eq("id", id)
        .eq("owner_id", uid);

      if (updErr) {
        setError(updErr.message);
      } else {
        router.replace(`/properties/${id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-[calc(100dvh-64px)] px-4 py-10 mobile-bottom-safe">
        <div className="container mx-auto">Cargando…</div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background px-4 py-10 mobile-bottom-safe">
      <div className="container mx-auto max-w-3xl">
        <Card className="border-[hsl(var(--border))]">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Editar Propiedad</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="grid gap-2">
                <label className="text-sm text-muted-foreground" htmlFor="title">Título</label>
                <Input id="title" name="title" placeholder="Ej. Apartamento moderno" value={form.title} onChange={onChange} />
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-muted-foreground" htmlFor="description">Descripción</label>
                <textarea
                  id="description"
                  name="description"
                  className="min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  placeholder="Detalles de la propiedad"
                  value={form.description}
                  onChange={onChange}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm text-muted-foreground" htmlFor="price">Precio (USD)</label>
                  <Input id="price" name="price" type="number" min="0" step="1" placeholder="185000" value={form.price} onChange={onChange} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-muted-foreground" htmlFor="location">Ubicación</label>
                  <Input id="location" name="location" placeholder="Santo Domingo" value={form.location} onChange={onChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm text-muted-foreground" htmlFor="type">Tipo</label>
                  <Select id="type" name="type" value={form.type} onChange={onChange}>
                    <option value="">Seleccionar</option>
                    <option value="Casa">Casa</option>
                    <option value="Apartamento">Apartamento</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Terreno">Terreno</option>
                    <option value="Villa">Villa</option>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-muted-foreground" htmlFor="images">Imágenes (URLs, separadas por coma)</label>
                  <Input id="images" name="images" placeholder="https://... , https://..." value={form.images} onChange={onChange} />
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-muted-foreground" htmlFor="fileImages">Subir imágenes adicionales</label>
                <input
                  id="fileImages"
                  name="fileImages"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const fl = e.target.files;
                    setFiles(fl);
                    filePreviews.forEach((u) => URL.revokeObjectURL(u));
                    if (fl && fl.length > 0) {
                      const previews = Array.from(fl).map((f) => URL.createObjectURL(f));
                      setFilePreviews(previews);
                    } else {
                      setFilePreviews([]);
                    }
                  }}
                  className="file:mr-3 file:rounded-md file:border file:px-3 file:py-2 file:text-sm file:bg-secondary file:text-secondary-foreground rounded-md border bg-background px-3 py-2 text-sm"
                />
                {(files?.length || 0) > 0 && (
                  <div className="text-xs text-muted-foreground">{files!.length} archivo(s) seleccionado(s)</div>
                )}
              </div>

              {(filePreviews.length > 0 || typedPreviewUrls.length > 0) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filePreviews.map((src, i) => (
                    <div key={`fp-${i}`} className="relative overflow-hidden rounded-md border">
                      <img src={src} alt={`preview-${i}`} className="h-28 w-full object-cover" />
                    </div>
                  ))}
                  {typedPreviewUrls.map((src, i) => (
                    <div key={`tp-${i}`} className="relative overflow-hidden rounded-md border">
                      <img src={src} alt={`url-${i}`} className="h-28 w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button type="submit" disabled={saving || uploading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {saving || uploading ? "Guardando…" : "Guardar cambios"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href={`/properties/${id}`}>Cancelar</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
