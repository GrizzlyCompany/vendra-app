"use client";

import { useEffect, useMemo, useRef, useState, useCallback, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Trash2, Upload, MapPin } from "lucide-react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.75rem'
};

const defaultCenter = {
  lat: 18.4861,
  lng: -69.9312
};

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

  // Google Maps State
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ['places'] // Pre-load places lib if needed down the road
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markerPos, setMarkerPos] = useState<google.maps.LatLngLiteral | null>(null);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPos({ lat, lng });

      // Reverse Geocoding
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const addressComponents = results[0].address_components;

          let route = "";
          let streetNumber = "";
          let locality = ""; // Sector/City part
          let sublocality = "";
          let administrative_area_level_1 = ""; // Province

          for (const component of addressComponents) {
            const types = component.types;
            if (types.includes("route")) route = component.long_name;
            if (types.includes("street_number")) streetNumber = component.long_name;
            if (types.includes("locality")) locality = component.long_name;
            if (types.includes("sublocality")) sublocality = component.long_name;
            if (types.includes("administrative_area_level_1")) administrative_area_level_1 = component.long_name;
          }

          const formattedAddress = `${route} ${streetNumber}`.trim() || results[0].formatted_address;
          const zone = sublocality || locality || administrative_area_level_1;

          setForm(prev => ({
            ...prev,
            address: formattedAddress,
            location: zone
          }));
        }
      });
    }
  }, []);

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
        // We verify everyone against the seller_applications table. 
        // Detailed check: To publish, you must have at least submitted an application.
        const { data: app } = await supabase
          .from("seller_applications")
          .select("id,status")
          .eq("user_id", userId)
          .in("status", ["approved", "submitted"] as any)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!app) {
          // Fallback: Check for very recent application (latency/consistency)
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
        } else if ((app as any).status === "submitted") {
          setPendingReview(true);
        }

        // Additional check for Empresa Constructora profile completeness (optional but good for data integrity)
        if (prof?.role === "empresa_constructora") {
          const { data: userProfile } = await supabase.from("users").select("company_name, rnc").eq("id", userId).maybeSingle();
          if (!userProfile?.company_name || !userProfile?.rnc) {
            router.replace("/profile/edit?complete=company");
            return;
          }
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
      const uploadedUrls: string[] = [];
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
          latitude: markerPos?.lat || null,
          longitude: markerPos?.lng || null,
        });

      if (insertError) {
        if (insertError.message.includes('Property limit reached')) {
          setError("Has alcanzado el límite de propiedades para tu plan actual. Actualiza tu plan para publicar más.");
          // Ideally show a link to /pricing here or a modal
        } else {
          setError(insertError.message);
        }
        setSaving(false);
        return;
      }

      // Promote role to vendedor if user is comprador (basic selling tier)
      try {
        await supabase
          .from("users")
          .update({ role: "vendedor" })
          .eq("id", uid)
          .eq("role", "comprador");

        // Refresh session to reflect new role
        await supabase.auth.refreshSession();
      } catch { }

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
    <main className="min-h-[calc(100dvh-64px)] bg-background px-4 sm:px-6 py-10 mobile-bottom-safe">
      <div className="mx-auto w-full max-w-4xl space-y-8">

        <div className="text-center space-y-2 mb-8">
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground">Listar Propiedad</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Completa los detalles para presentar tu propiedad al mundo.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-8">

          {/* Status Banners */}
          {(pendingReview || error) && (
            <div className="space-y-4">
              {pendingReview && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-800 backdrop-blur-sm">
                  Tu verificación está <strong>pendiente de revisión</strong>. Puedes publicar ahora; si la verificación falla, podríamos pausar tus publicaciones.
                </div>
              )}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm text-red-700 backdrop-blur-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Basic Info */}
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
              <CardTitle className="font-serif text-xl">Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              <div className="col-span-1 md:col-span-2 grid gap-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="title">Título</label>
                <Input id="title" name="title" className="h-11 font-serif text-lg bg-transparent" placeholder="Ej: Villa de lujo con vista al mar" value={form.title} onChange={onChange} />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="price">Precio</label>
                <div className="flex gap-2">
                  <Input id="price" name="price" className="h-11 bg-transparent" type="number" min="0" step="1" placeholder="0" value={form.price} onChange={onChange} />
                  <select id="currency" name="currency" value={form.currency} onChange={onChange} className="w-24 rounded-md border bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none">
                    <option value="USD">USD</option>
                    <option value="DOP">DOP</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="type">Tipo</label>
                <Select id="type" name="type" className="h-11 bg-transparent" value={form.type} onChange={onChange}>
                  <option value="">Seleccionar...</option>
                  <option value="Casa">Casa</option>
                  <option value="Apartamento">Apartamento</option>
                  <option value="Complejo de Aptos">Complejo de Aptos</option>
                  <option value="Condominio">Condominio</option>
                  <option value="Comercial">Comercial</option>
                  <option value="Terreno">Terreno</option>
                  <option value="Villa">Villa</option>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
              <CardTitle className="font-serif text-xl">Ubicación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Google Map */}
              <div className="w-full h-[400px] border border-border rounded-xl overflow-hidden relative">
                {isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={markerPos || defaultCenter}
                    zoom={13}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    onClick={handleMapClick}
                    options={{
                      disableDefaultUI: false,
                      streetViewControl: false,
                      mapTypeControl: false,
                    }}
                  >
                    {markerPos && <Marker position={markerPos} />}
                  </GoogleMap>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted/20">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                      <span className="text-sm font-medium">Cargando Mapa...</span>
                    </div>
                  </div>
                )}
                {!markerPos && isLoaded && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-xs font-medium backdrop-blur-sm pointer-events-none">
                    Toca en el mapa para ubicar la propiedad
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2 grid gap-2">
                  <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="address">Dirección Exacta</label>
                  <Input id="address" name="address" className="h-11 bg-transparent" placeholder="123 Calle Principal..." value={form.address} onChange={onChange} />
                  <p className="text-[10px] text-muted-foreground">Puedes escribirla o seleccionarla en el mapa.</p>
                </div>
                <div className="grid gap-2">
                  <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="location">Sector / Ciudad</label>
                  <Input id="location" name="location" className="h-11 bg-transparent" placeholder="Ej. Piantini" value={form.location} onChange={onChange} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
              <CardTitle className="font-serif text-xl">Detalles y Características</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6">
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="bedrooms">Habitaciones</label>
                <Input id="bedrooms" name="bedrooms" type="number" min="0" className="h-11 bg-transparent" placeholder="0" value={form.bedrooms} onChange={onChange} />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="bathrooms">Baños</label>
                <Input id="bathrooms" name="bathrooms" type="number" min="0" className="h-11 bg-transparent" placeholder="0" value={form.bathrooms} onChange={onChange} />
              </div>
              <div className="col-span-2 grid gap-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="area">Área (m²)</label>
                <Input id="area" name="area" className="h-11 bg-transparent" placeholder="Ej. 150" value={form.area} onChange={onChange} />
              </div>
              <div className="col-span-2 md:col-span-4 grid gap-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="features">Características Adicionales (Separadas por comas)</label>
                <Input id="features" name="features" className="h-11 bg-transparent" placeholder="Piscina, Gimnasio, Balcón..." value={form.features} onChange={onChange} />
              </div>
              <div className="col-span-2 md:col-span-4 grid gap-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="description">Descripción</label>
                <textarea
                  id="description"
                  name="description"
                  className="min-h-[140px] rounded-md border bg-transparent px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 resize-y"
                  placeholder="Describe lo que hace única a esta propiedad..."
                  value={form.description}
                  onChange={onChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Media */}
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/40 pb-4 flex flex-row items-center justify-between">
              <CardTitle className="font-serif text-xl">Galería de Fotos</CardTitle>
              <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-1 rounded-full border border-border">{totalPhotos}/5</span>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {filePreviews.map((src, i) => (
                  <div key={`fp-${i}`} className="relative group aspect-square rounded-xl overflow-hidden shadow-sm border border-border/50">
                    <img src={src} alt={`preview-${i}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <button
                      type="button"
                      onClick={() => removeFileAt(i)}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {typedPreviewUrls.map((src, i) => (
                  <div key={`tp-${i}`} className="relative group aspect-square rounded-xl overflow-hidden shadow-sm border border-border/50">
                    <img src={src} alt={`url-${i}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <button
                      type="button"
                      onClick={() => removeTypedUrl(src)}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {canAddMore && (
                  <div
                    className={`aspect-square rounded-xl border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/30 transition-all hover:border-primary/50 group focus-visible:ring-2 ring-primary ${isDragging ? 'bg-primary/5 border-primary' : ''}`}
                    onClick={openFilePicker}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); onDropFiles(e.dataTransfer.files); }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFilePicker(); } }}
                  >
                    <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Upload className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Subir Foto</span>
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

              {/* Optional URL input hidden by default but functional if needed via state */}
              <div className="hidden">
                <Input id="images" name="images" value={form.images} onChange={onChange} />
              </div>
            </CardContent>
          </Card>

          {/* Action Footer */}
          <div className="flex flex-col-reverse sm:flex-row items-center gap-4 pt-4">
            <Button type="button" variant="ghost" asChild className="w-full sm:w-auto text-muted-foreground hover:text-foreground">
              <Link href="/profile">Cancelar y Volver</Link>
            </Button>
            <Button type="submit" disabled={saving || uploading} size="lg" className="w-full sm:w-auto ml-auto bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 shadow-lg shadow-primary/20 transition-all active:scale-95">
              {saving || uploading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Procesando...
                </>
              ) : "Publicar Propiedad"}
            </Button>
          </div>

        </form>
      </div>
    </main>
  );
}
