"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { supabase } from "@/lib/supabase/client";
import { ImageSelector } from "@/components/dashboard/ImageSelector";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { MapPin } from "lucide-react";

export function AddPropertySection() {
  const [form, setForm] = useState({
    // 1. Información General
    projectName: "",
    descriptionTitle: "", // New field for description title
    shortDescription: "",
    category: "",

    // 2. Ubicación
    address: "",
    cityProvince: "",
    zoneSector: "",

    // 3. Características del Proyecto
    projectStatus: "",
    deliveryDate: "",
    unitsCount: "",
    floors: "",
    landSize: "",
    builtAreas: "",

    // 4. Detalles de las Unidades
    unitTypes: "",
    sizeRange: "",
    quantityPerType: "",

    // 5. Amenidades y Servicios
    amenities: new Set<string>(),
    customAmenity: "",

    // 6. Galería
    promoVideo: "",

    // 7. Información Financiera
    unitPriceRange: "",
    paymentMethods: "",
    partnerBank: "",
    currency: "USD",
  });

  const [uid, setUid] = useState<string | null>(null);
  const [ownerRole, setOwnerRole] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imagesFiles, setImagesFiles] = useState<FileList | null>(null);
  const [plansFiles, setPlansFiles] = useState<FileList | null>(null);

  // Google Maps State
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ['places']
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markerPos, setMarkerPos] = useState<google.maps.LatLngLiteral | null>(null);

  const containerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '0.75rem'
  };

  const defaultCenter = {
    lat: 18.4861,
    lng: -69.9312
  };

  const onLoad = (map: google.maps.Map) => setMap(map);
  const onUnmount = (map: google.maps.Map) => setMap(null);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
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
          let locality = "";
          let sublocality = "";
          let administrative_area_level_1 = "";

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
            zoneSector: zone,
            cityProvince: administrative_area_level_1
          }));
        }
      });
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const u = data.session?.user ?? null;
      setUid(u?.id ?? null);
      // intentar leer role del user_metadata y/o de la tabla users
      const metaRole = (u?.user_metadata as Record<string, unknown>)?.role as string | undefined;
      if (metaRole) setOwnerRole(metaRole);
      const uidLocal = u?.id ?? null;
      if (uidLocal) {
        const { data: dbUser } = await supabase.from("users").select("role").eq("id", uidLocal).maybeSingle();
        const dbRole = (dbUser?.role as string | undefined) ?? null;
        if (dbRole && dbRole !== ownerRole) setOwnerRole(dbRole);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    // Basic guard for number inputs to keep as string but trimmed
    const v = type === "number" ? value : value;
    setForm((p) => ({ ...p, [name]: v }));
  };

  const toggleAmenity = (key: string) => {
    setForm((p) => {
      const next = new Set(p.amenities);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...p, amenities: next };
    });
  };

  const addCustomAmenity = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.customAmenity.trim() !== "") {
      setForm((p) => {
        const next = new Set(p.amenities);
        next.add(form.customAmenity.trim());
        return { ...p, amenities: next, customAmenity: "" };
      });
    }
  };

  const removeCustomAmenity = (amenity: string) => {
    setForm((p) => {
      const next = new Set(p.amenities);
      next.delete(amenity);
      return { ...p, amenities: next };
    });
  };

  const handleCustomAmenityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, customAmenity: e.target.value }));
  };

  const toNumber = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!uid) {
      setError("Debes iniciar sesión para publicar.");
      return;
    }

    // Validaciones mínimas
    if (!form.projectName || !form.category) {
      setError("Nombre del proyecto y categoría son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      // 1) Subir archivos a Storage y recolectar URLs públicas
      const imageUrls: string[] = [];
      const planUrls: string[] = [];

      if (imagesFiles && imagesFiles.length > 0) {
        setUploading(true);
        const bucket = "project-images";
        for (let i = 0; i < imagesFiles.length; i++) {
          const f = imagesFiles.item(i)!;
          const ext = f.name.split(".").pop() || "bin";
          const path = `${uid}/projects/${Date.now()}-${i}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: upErr } = await supabase.storage.from(bucket).upload(path, f, { upsert: false, cacheControl: "3600" });
          if (upErr) {
            setError(`Error al subir imagen: ${upErr.message}`);
            setUploading(false);
            return;
          }
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
          if (pub?.publicUrl) imageUrls.push(pub.publicUrl);
        }
        setUploading(false);
      }

      if (plansFiles && plansFiles.length > 0) {
        setUploading(true);
        const bucket = "project-plans";
        for (let i = 0; i < plansFiles.length; i++) {
          const f = plansFiles.item(i)!;
          const ext = f.name.split(".").pop() || "bin";
          const path = `${uid}/projects/${Date.now()}-plan-${i}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: upErr } = await supabase.storage.from(bucket).upload(path, f, { upsert: false, cacheControl: "3600" });
          if (upErr) {
            setError(`Error al subir plano: ${upErr.message}`);
            setUploading(false);
            return;
          }
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
          if (pub?.publicUrl) planUrls.push(pub.publicUrl);
        }
        setUploading(false);
      }

      const payload = {
        project_name: form.projectName || null,
        description_title: form.descriptionTitle || null, // New field
        short_description: form.shortDescription || null,
        category: form.category || null,
        address: form.address || null,
        city_province: form.cityProvince || null,
        zone_sector: form.zoneSector || null,
        project_status: form.projectStatus || null,
        delivery_date: form.deliveryDate || null,
        units_count: toNumber(form.unitsCount),
        floors: toNumber(form.floors),
        land_size: toNumber(form.landSize),
        built_areas: toNumber(form.builtAreas),
        unit_types: form.unitTypes || null,
        size_range: form.sizeRange || null,
        quantity_per_type: form.quantityPerType || null,
        amenities: Array.from(form.amenities),
        images: imageUrls.length ? imageUrls : null,
        promo_video: form.promoVideo || null,
        plans: planUrls.length ? planUrls : null,
        unit_price_range: form.unitPriceRange || null,
        payment_methods: form.paymentMethods || null,
        partner_bank: form.partnerBank || null,
        currency: form.currency || null,
        owner_id: uid,
        owner_role: ownerRole ?? null,
        latitude: markerPos?.lat || null,
        longitude: markerPos?.lng || null,
      } as const;

      const { error: insertError } = await supabase.from("projects").insert(payload);
      if (insertError) throw insertError;

      setSuccess("Proyecto publicado correctamente.");
      // Opcional: reset del formulario
      // setForm({ ...estadoInicial })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al publicar el proyecto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <div className="text-center space-y-2 mb-8">
        <h2 className="font-serif text-3xl font-bold text-foreground">Crear Nuevo Proyecto</h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">Completa la información detallada para presentar tu desarrollo inmobiliario al mercado.</p>
      </div>

      <form className="space-y-8" onSubmit={onSubmit}>

        {/* State Feedback */}
        {(error || success) && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 backdrop-blur-md shadow-sm ${error ? 'bg-red-500/10 border-red-500/20 text-red-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${error ? 'bg-red-100 dark:bg-red-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
              {error ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              )}
            </div>
            <p className="font-medium text-sm">{error || success}</p>
          </div>
        )}

        {/* 1. Información General */}
        <Card className="border-border/40 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
              Información General
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="projectName">Nombre del proyecto</label>
              <Input id="projectName" name="projectName" value={form.projectName} onChange={onChange} placeholder='Ej: "Residencial Vendra Towers"' className="h-11 bg-background/50" />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="descriptionTitle">Título Publicitario</label>
              <Input id="descriptionTitle" name="descriptionTitle" value={form.descriptionTitle} onChange={onChange} placeholder='Ej: "Vive en la Cima del Lujo Urbano"' className="h-11 bg-background/50" />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="shortDescription">Descripción Breve</label>
              <textarea
                id="shortDescription"
                name="shortDescription"
                maxLength={300}
                value={form.shortDescription}
                onChange={onChange}
                rows={3}
                className="rounded-md border bg-background/50 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                placeholder="Describe los puntos clave que hacen único a este proyecto..."
              />
              <div className="text-xs text-right text-muted-foreground">{form.shortDescription.length}/300</div>
            </div>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="category">Categoría</label>
              <div className="relative">
                <Select id="category" name="category" value={form.category} onChange={onChange} className="h-11 bg-background/50">
                  <option value="">Seleccionar Tipo...</option>
                  <option value="Residencial">Residencial</option>
                  <option value="Comercial">Comercial</option>
                  <option value="Mixto">Mixto</option>
                  <option value="Turístico">Turístico</option>
                  <option value="Otro">Otro</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Ubicación */}
        <Card className="border-border/40 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
              Ubicación
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
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
                  Toca en el mapa para ubicar el proyecto
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-2 md:col-span-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="address">Dirección Exacta</label>
                <Input id="address" name="address" value={form.address} onChange={onChange} placeholder="Ej: Av. Winston Churchill #123" className="h-11 bg-background/50 icon-map" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="cityProvince">Ciudad / Provincia</label>
                <Input id="cityProvince" name="cityProvince" value={form.cityProvince} onChange={onChange} placeholder="Ej: Santo Domingo" className="h-11 bg-background/50" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="zoneSector">Sector / Zona</label>
                <Input id="zoneSector" name="zoneSector" value={form.zoneSector} onChange={onChange} placeholder="Ej: Piantini" className="h-11 bg-background/50" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Detalles Técnicos */}
        <Card className="border-border/40 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
              Detalles del Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="projectStatus">Estado de Obra</label>
              <Select id="projectStatus" name="projectStatus" value={form.projectStatus} onChange={onChange} className="h-11 bg-background/50">
                <option value="">Seleccionar...</option>
                <option value="En planos">En planos</option>
                <option value="En construcción">En construcción</option>
                <option value="En preventa">En preventa</option>
                <option value="Terminado">Terminado</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80 font-medium" htmlFor="deliveryDate">Fecha de Entrega</label>
              <Input type="date" id="deliveryDate" name="deliveryDate" value={form.deliveryDate} onChange={onChange} className="h-11 bg-background/50" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80 font-medium" htmlFor="unitsCount">Total Unidades</label>
              <Input type="number" min="0" id="unitsCount" name="unitsCount" value={form.unitsCount} onChange={onChange} placeholder="0" className="h-11 bg-background/50" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80 font-medium" htmlFor="floors">Niveles / Pisos</label>
              <Input type="number" min="0" id="floors" name="floors" value={form.floors} onChange={onChange} placeholder="0" className="h-11 bg-background/50" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80 font-medium" htmlFor="landSize">Terreno (m²)</label>
              <Input type="number" min="0" id="landSize" name="landSize" value={form.landSize} onChange={onChange} placeholder="0" className="h-11 bg-background/50" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80 font-medium" htmlFor="builtAreas">Constr. Total (m²)</label>
              <Input type="number" min="0" id="builtAreas" name="builtAreas" value={form.builtAreas} onChange={onChange} placeholder="0" className="h-11 bg-background/50" />
            </div>
          </CardContent>
        </Card>

        {/* 4. Unidades & Distribución */}
        <Card className="border-border/40 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">4</span>
              Unidades & Distribución
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="unitTypes">Tipos de Unidades</label>
              <textarea id="unitTypes" name="unitTypes" value={form.unitTypes} onChange={onChange} rows={2} className="rounded-md border bg-background/50 px-3 py-2 text-sm resize-none" placeholder="Describe brevemente los tipos (ej: Apts estudio, 2 habs, Penthouses...)" />
            </div>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="sizeRange">Rango Metrajes (m²)</label>
              <Input id="sizeRange" name="sizeRange" value={form.sizeRange} onChange={onChange} placeholder="Ej: 85 - 240 m²" className="h-11 bg-background/50" />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="quantityPerType">Cantidad por Tipo</label>
              <textarea id="quantityPerType" name="quantityPerType" value={form.quantityPerType} onChange={onChange} rows={2} className="rounded-md border bg-background/50 px-3 py-2 text-sm resize-none" placeholder="Ej: 20 Unidades Tipo A, 15 Tipo B..." />
            </div>
          </CardContent>
        </Card>

        {/* 5. Amenidades */}
        <Card className="border-border/40 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">5</span>
              Amenidades
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                "Piscina Inifinity", "Gimnasio Equipado", "Lobby Climatizado", "Terraza Social", "Area BBQ",
                "Parque Infantil", "Seguridad 24/7", "Parqueo Techado", "Planta Eléctrica", "Ascensor",
                "Cine", "Coworking", "Pet Friendly"
              ].map((a) => (
                <label key={a} className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${form.amenities.has(a) ? "bg-primary/5 border-primary/40 shadow-sm" : "bg-background/50 border-transparent hover:bg-muted"}`}>
                  <div className={`h-5 w-5 rounded border flex items-center justify-center ${form.amenities.has(a) ? "bg-primary border-primary text-white" : "border-muted-foreground/30 bg-background"}`}>
                    {form.amenities.has(a) && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                  </div>
                  <input
                    type="checkbox"
                    checked={form.amenities.has(a)}
                    onChange={() => toggleAmenity(a)}
                    className="hidden"
                  />
                  <span className={`text-sm font-medium ${form.amenities.has(a) ? "text-primary" : "text-muted-foreground"}`}>{a}</span>
                </label>
              ))}
            </div>

            <div className="pt-4 border-t border-border/40">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block mb-3">Otras Amenidades</label>
              <div className="flex gap-2 mb-3">
                <Input
                  type="text"
                  value={form.customAmenity}
                  onChange={handleCustomAmenityChange}
                  placeholder="Escribe una amenidad personalizada..."
                  className="h-11 flex-1 bg-background/50"
                />
                <Button type="button" onClick={addCustomAmenity} variant="secondary" className="px-6">
                  Agregar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from(form.amenities).filter(a => ![
                  "Piscina Inifinity", "Gimnasio Equipado", "Lobby Climatizado", "Terraza Social", "Area BBQ",
                  "Parque Infantil", "Seguridad 24/7", "Parqueo Techado", "Planta Eléctrica", "Ascensor",
                  "Cine", "Coworking", "Pet Friendly"
                ].includes(a)).map((amenity) => (
                  <div key={amenity} className="flex items-center bg-secondary/50 text-secondary-foreground border border-secondary rounded-full px-3 py-1 text-sm pl-4">
                    <span className="mr-2">{amenity}</span>
                    <button
                      type="button"
                      onClick={() => removeCustomAmenity(amenity)}
                      className="h-5 w-5 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 6. Multimedia */}
        <Card className="border-border/40 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">6</span>
              Galería Multimedia
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Renderings & Fotos (Máx 5)</label>
              <div className="bg-muted/10 rounded-xl p-6 border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors">
                <ImageSelector
                  onImagesChange={setImagesFiles}
                  maxImages={5}
                  label="Arrastra imágenes aquí o haz clic para seleccionar"
                  id="imagesFiles"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="promoVideo">Link de Video (YouTube/Vimeo)</label>
                <Input id="promoVideo" name="promoVideo" value={form.promoVideo} onChange={onChange} placeholder="https://..." className="h-11 bg-background/50" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="plansFiles">Planos (PDF/Imagen)</label>
                <input
                  id="plansFiles"
                  name="plansFiles"
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(e) => setPlansFiles(e.target.files)}
                  className="file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20 text-sm text-muted-foreground cursor-pointer"
                />
                {(plansFiles?.length || 0) > 0 && (
                  <div className="text-xs text-primary font-medium mt-1">✓ {plansFiles!.length} archivos seleccionados</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 7. Finanzas */}
        <Card className="border-border/40 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">7</span>
              Inversión & Finanzas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="unitPriceRange">Rango de Precios</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input id="unitPriceRange" name="unitPriceRange" value={form.unitPriceRange} onChange={onChange} placeholder="120,000 – 350,000" className="h-11 bg-background/50 pl-7" />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="currency">Moneda</label>
              <Select id="currency" name="currency" value={form.currency} onChange={onChange} className="h-11 bg-background/50">
                <option value="USD">USD (Dólares)</option>
                <option value="DOP">DOP (Pesos)</option>
                <option value="EUR">EUR (Euros)</option>
              </Select>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="paymentMethods">Plan de Pagos / Métodos</label>
              <Input id="paymentMethods" name="paymentMethods" value={form.paymentMethods} onChange={onChange} placeholder="Ej: Reserva 5%, Separación 10%..." className="h-11 bg-background/50" />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="partnerBank">Fideicomiso / Banco Aliado</label>
              <Input id="partnerBank" name="partnerBank" value={form.partnerBank} onChange={onChange} placeholder="Ej: Fiduciaria Banreservas" className="h-11 bg-background/50" />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 pb-12">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto h-12 px-8 rounded-full border-2 hover:bg-muted"
            onClick={() => window.history.back()}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving || uploading}
            className="w-full sm:w-auto h-12 px-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 text-lg font-medium transition-all active:scale-95"
          >
            {saving || uploading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                {uploading ? "Subiendo archivos..." : "Guardando..."}
              </span>
            ) : "Publicar Proyecto"}
          </Button>
        </div>
      </form>
    </div>
  );
}