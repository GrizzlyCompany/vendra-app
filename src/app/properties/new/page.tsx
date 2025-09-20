"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Trash2, Upload } from "lucide-react";

// Simple helper
const toNumber = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

export default function NewPropertyPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingReview, setPendingReview] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    currency: "USD",
    location: "",
    address: "",
    type: "",
    bedrooms: "",
    bathrooms: "",
    area: "",
    features: "",
    images: "", // comma-separated URLs
  });
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);

  // derive typed URLs preview from the text input
  const typedPreviewUrls = useMemo(() =>
    form.images
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  [form.images]);

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
      // Eligibility check: allow empresa_constructora or approved seller application
      try {
        const { data: prof } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
        const role = prof?.role ?? null;
        if (role === "empresa_constructora") {
          setUid(userId);
          setLoading(false);
          return;
        }
        const { data: app } = await supabase
          .from("seller_applications")
          .select("id,status")
          .eq("user_id", userId)
          .in("status", ["approved", "submitted"] as any)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!app) {
          // Fallback: si existe una solicitud reciente (posible latencia/replicación), permitir y mostrar banner
          const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
          const { data: recent } = await supabase
            .from("seller_applications")
            .select("id,status,created_at")
            .eq("user_id", userId)
            .gte("created_at", tenMinAgo)
            .order("created_at", { ascending: false })
            .limit(1);
          if (!recent || recent.length === 0) {
            router.replace("/seller/apply");
            return;
          }
          setPendingReview(true);
        }
        if ((app as any).status === "submitted") {
          setPendingReview(true);
        }
        setUid(userId);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  // clean up object URLs when files change or on unmount
  useEffect(() => {
    return () => {
      filePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [filePreviews]);

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Drag & drop helpers for images (max 5)
  const [isDragging, setIsDragging] = useState(false);
  const onDropFiles = (fl: FileList | null) => {
    const incoming = fl ? Array.from(fl) : [];
    const currentTyped = typedPreviewUrls.length;
    const currentFiles = files ? Array.from(files) : [];
    const remaining = Math.max(0, 5 - currentTyped - currentFiles.length);
    const toAdd = remaining > 0 ? incoming.slice(0, remaining) : [];

    const dt = new DataTransfer();
    // keep existing files
    currentFiles.forEach((f) => dt.items.add(f));
    // add new files up to remaining
    toAdd.forEach((f) => dt.items.add(f));

    const merged = dt.files;
    setFiles(merged);

    // rebuild previews for merged list
    filePreviews.forEach((u) => URL.revokeObjectURL(u));
    if (merged && merged.length > 0) {
      const previews = Array.from(merged).map((f) => URL.createObjectURL(f));
      setFilePreviews(previews);
    } else {
      setFilePreviews([]);
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const openFilePicker = () => fileInputRef.current?.click();
  const totalPhotos = (files?.length || 0) + typedPreviewUrls.length;
  const canAddMore = totalPhotos < 5;

  const removeFileAt = (idx: number) => {
    if (!files) return;
    const dt = new DataTransfer();
    Array.from(files).forEach((f, i) => {
      if (i !== idx) dt.items.add(f);
    });
    // revoke and rebuild previews
    const toRemove = filePreviews[idx];
    if (toRemove) URL.revokeObjectURL(toRemove);
    setFiles(dt.files);
    const newPreviews = Array.from(dt.files).map((f) => URL.createObjectURL(f));
    setFilePreviews(newPreviews);
  };

  const removeTypedUrl = (url: string) => {
    const arr = typedPreviewUrls.filter((u) => u !== url);
    setForm((prev) => ({ ...prev, images: arr.join(", ") }));
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
      // Parse URLs provided manually
      const typedUrls = form.images
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      // Parse optional fields
      const featuresArr = (form.features || "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const areaNum = toNumber(form.area as unknown as string);
      const bedroomsNum = Number(form.bedrooms);
      const bathroomsNum = Number(form.bathrooms);

      // Upload files to Supabase Storage (bucket: property-images)
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
      const { error: insertError } = await supabase
        .from("properties")
        .insert({
          title: form.title,
          description: form.description || null,
          price: priceNum,
          location: form.location,
          address: form.address || null,
          images: images.length ? images : null,
          type: form.type || null,
          currency: form.currency || null,
          bedrooms: Number.isFinite(bedroomsNum) ? bedroomsNum : null,
          bathrooms: Number.isFinite(bathroomsNum) ? bathroomsNum : null,
          area: Number.isFinite(areaNum) ? areaNum : null,
          features: featuresArr.length ? featuresArr : null,
          owner_id: uid,
          status: 'active',
          is_published: true,
        });

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      // Promote role to vendedor_agente if user is not empresa_constructora
      try {
        await supabase
          .from("users")
          .update({ role: "vendedor_agente" })
          .eq("id", uid)
          .neq("role", "empresa_constructora");
      } catch {}

      // success
      router.replace("/profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-[calc(100dvh-64px)] bg-background px-3 sm:px-4 py-10 mobile-bottom-safe">
        <div className="container mx-auto">Cargando…</div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background px-3 sm:px-4 py-8 mobile-bottom-safe">
      <div className="mx-auto w-full max-w-4xl">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-2xl">Listar una Nueva Propiedad</CardTitle>
            <p className="text-sm text-muted-foreground">Rellena los detalles a continuación para poner tu propiedad en el mercado.</p>
          </CardHeader>
          <CardContent className="pt-2">
            {pendingReview && (
              <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Tu verificación está <strong>pendiente de revisión</strong>. Puedes publicar ahora; si la verificación falla, podríamos pausar tus publicaciones.
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-6">
              {/* Título y Precio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm text-muted-foreground" htmlFor="title">Nombre de la Propiedad</label>
                  <Input id="title" name="title" placeholder="Ej: Villa de lujo con vista al mar" value={form.title} onChange={onChange} />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 grid gap-2">
                      <label className="text-sm text-muted-foreground" htmlFor="price">Precio</label>
                      <Input id="price" name="price" type="number" min="0" step="1" placeholder="3500000" value={form.price} onChange={onChange} />
                    </div>
                    <div className="w-28 grid gap-2">
                      <label className="text-sm text-muted-foreground" htmlFor="currency">&nbsp;</label>
                      <select id="currency" name="currency" value={form.currency} onChange={onChange} className="rounded-md border bg-background px-3 py-2 text-sm">
                        <option value="USD">USD</option>
                        <option value="DOP">DOP</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dirección y Ubicación */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm text-muted-foreground" htmlFor="address">Dirección Completa</label>
                  <Input id="address" name="address" placeholder="123 Rodeo Drive, Beverly Hills, CA" value={form.address} onChange={onChange} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-muted-foreground" htmlFor="location">Ubicación</label>
                  <Input id="location" name="location" placeholder="Beverly Hills" value={form.location} onChange={onChange} />
                </div>
              </div>

              {/* Tipo, Dormitorios, Baños */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm text-muted-foreground" htmlFor="type">Tipo de Propiedad</label>
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
                  <label className="text-sm text-muted-foreground" htmlFor="bedrooms">Dormitorios</label>
                  <Input id="bedrooms" name="bedrooms" type="number" min="0" placeholder="4" value={form.bedrooms} onChange={onChange} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-muted-foreground" htmlFor="bathrooms">Baños</label>
                  <Input id="bathrooms" name="bathrooms" type="number" min="0" placeholder="3" value={form.bathrooms} onChange={onChange} />
                </div>
              </div>

              {/* Área y Características */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm text-muted-foreground" htmlFor="area">Área (m²)</label>
                  <Input id="area" name="area" placeholder="600" value={form.area} onChange={onChange} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-muted-foreground" htmlFor="features">Características</label>
                  <Input id="features" name="features" placeholder="Swimming Pool, Garage, Ocean view" value={form.features} onChange={onChange} />
                  <span className="text-xs text-muted-foreground">Lista separada por comas.</span>
                </div>
              </div>

              {/* Descripción */}
              <div className="grid gap-2">
                <label className="text-sm text-muted-foreground" htmlFor="description">Descripción</label>
                <textarea
                  id="description"
                  name="description"
                  className="min-h-[140px] rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  placeholder="Describe la propiedad..."
                  value={form.description}
                  onChange={onChange}
                />
              </div>

              {/* Fotos grid */}
              <div className="grid gap-2">
                <div className="text-sm text-muted-foreground">Fotos ({totalPhotos}/5)</div>
                <span className="text-xs text-muted-foreground">Gestiona las imágenes de tu propiedad. Puedes añadir hasta 5 fotos.</span>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {filePreviews.map((src, i) => (
                    <div key={`fp-${i}`} className="relative group aspect-square">
                      <img src={src} alt={`preview-${i}`} className="h-full w-full object-cover rounded-md" />
                      <button
                        type="button"
                        onClick={() => removeFileAt(i)}
                        className="absolute -top-2 -right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Eliminar imagen"
                        title="Eliminar imagen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {typedPreviewUrls.map((src, i) => (
                    <div key={`tp-${i}`} className="relative group aspect-square">
                      <img src={src} alt={`url-${i}`} className="h-full w-full object-cover rounded-md" />
                      <button
                        type="button"
                        onClick={() => removeTypedUrl(src)}
                        className="absolute -top-2 -right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Eliminar imagen"
                        title="Eliminar imagen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {canAddMore && (
                    <div
                      className={`group aspect-square rounded-md border-2 border-dashed grid place-items-center text-center cursor-pointer hover:bg-muted transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${isDragging ? 'bg-muted/50' : ''}`}
                      onClick={openFilePicker}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setIsDragging(false); onDropFiles(e.dataTransfer.files); }}
                      role="button"
                      aria-label="Añadir fotos"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFilePicker(); } }}
                    >
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                      <div className="text-xs text-muted-foreground mt-1">Añadir Fotos</div>
                    </div>
                  )}
                </div>

                {/* Hidden input for selecting more images */}
                <input
                  ref={fileInputRef}
                  id="fileImages"
                  name="fileImages"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => onDropFiles(e.target.files)}
                  className="sr-only"
                />
              </div>

              {/* URLs opcionales */}
              <div className="grid gap-2">
                <label className="text-sm text-muted-foreground" htmlFor="images">Imágenes (URLs, separadas por coma)</label>
                <Input id="images" name="images" placeholder="https://... , https://..." value={form.images} onChange={onChange} />
              </div>

              {/* Previews moved above in unified grid with add tile */}

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={saving || uploading} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                  {saving || uploading ? "Publicando…" : "Listar Propiedad"}
                </Button>
                <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
                  <Link href="/profile">Cancelar</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
