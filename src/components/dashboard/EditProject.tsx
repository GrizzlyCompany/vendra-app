"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/ui/form-select";
import { supabase } from "@/lib/supabase/client";
import { ImageSelector } from "@/components/dashboard/ImageSelector";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { MapPin, Plus, Trash2, Calendar, Building2, Layout, Image as ImageIcon, DollarSign, Check } from "lucide-react";

export function EditProjectSection({ projectId }: { projectId: string }) {
  const [form, setForm] = useState({
    // 1. Información General
    projectName: "",
    descriptionTitle: "",
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
    unitEntries: [{ type: "", quantity: "", size: "", available: "" }] as Array<{ type: string; quantity: string; size: string; available: string }>,
    sizeRange: "",

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

  // Existing assets
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [existingPlans, setExistingPlans] = useState<string[]>([]);
  const [existingBrochures, setExistingBrochures] = useState<string[]>([]);

  // New file selections
  const [imagesFiles, setImagesFiles] = useState<FileList | null>(null);
  const [plansFiles, setPlansFiles] = useState<FileList | null>(null);
  const [brochureFiles, setBrochureFiles] = useState<FileList | null>(null);

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

  const defaultCenter = { lat: 18.4861, lng: -69.9312 };

  const onLoad = (map: google.maps.Map) => setMap(map);
  const onUnmount = (map: google.maps.Map) => setMap(null);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPos({ lat, lng });

      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const addressComponents = results[0].address_components;
          let route = "";
          let streetNumber = "";
          let locality = "";
          let sublocality = "";
          let admin1 = "";

          for (const component of addressComponents) {
            const types = component.types;
            if (types.includes("route")) route = component.long_name;
            if (types.includes("street_number")) streetNumber = component.long_name;
            if (types.includes("locality")) locality = component.long_name;
            if (types.includes("sublocality")) sublocality = component.long_name;
            if (types.includes("administrative_area_level_1")) admin1 = component.long_name;
          }

          const formattedAddress = `${route} ${streetNumber}`.trim() || results[0].formatted_address;
          const zone = sublocality || locality || admin1;

          setForm(prev => ({
            ...prev,
            address: formattedAddress,
            zoneSector: zone,
            cityProvince: admin1
          }));
        }
      });
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!active) return;
      const u = sess.session?.user ?? null;
      setUid(u?.id ?? null);

      if (u?.id) {
        const { data: dbUser } = await supabase.from("users").select("role").eq("id", u.id).maybeSingle();
        if (active && dbUser?.role) setOwnerRole(dbUser.role);
      }

      // Load project
      const { data: proj, error: projErr } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

      if (!active) return;
      if (projErr || !proj) {
        setError(projErr?.message || "Proyecto no encontrado");
        return;
      }

      if (u?.id && proj.owner_id && u.id !== proj.owner_id) {
        setError("No tienes permisos para editar este proyecto.");
        return;
      }

      let parsedEntries = [];
      try {
        // Try to parse as JSON first (new format)
        parsedEntries = JSON.parse(proj.unit_types);
        if (!Array.isArray(parsedEntries)) throw new Error("Not an array");
      } catch (e) {
        // Fallback to old comma-separated string format
        const typesStr = proj.unit_types || "";
        const quantitiesStr = proj.quantity_per_type || "";
        const typesList = typesStr.split(",").map((t: string) => t.trim()).filter(Boolean);
        const qtysList = quantitiesStr.split(",").map((q: string) => q.trim()).filter(Boolean);

        parsedEntries = typesList.map((t: string) => {
          const sizeMatch = t.match(/\((.*?)\s*m²\)/);
          const size = sizeMatch ? sizeMatch[1] : "";
          const cleanType = t.replace(/\s*\(.*?\)/, "").trim();
          const qtyMatch = qtysList.find((q: string) => q.includes(cleanType));
          const quantity = qtyMatch ? qtyMatch.replace(new RegExp(cleanType, 'g'), "").trim() : "";
          return { type: cleanType, quantity, size, available: "" };
        });
      }

      if (parsedEntries.length === 0) {
        parsedEntries = [{ type: "", quantity: "", size: "" }];
      }

      setForm({
        projectName: proj.project_name ?? "",
        descriptionTitle: proj.description_title ?? "",
        shortDescription: proj.short_description ?? "",
        category: proj.category ?? "",
        address: proj.address ?? "",
        cityProvince: proj.city_province ?? "",
        zoneSector: proj.zone_sector ?? "",
        projectStatus: proj.project_status ?? "",
        deliveryDate: proj.delivery_date ?? "",
        unitsCount: String(proj.units_count ?? ""),
        floors: String(proj.floors ?? ""),
        landSize: String(proj.land_size ?? ""),
        builtAreas: String(proj.built_areas ?? ""),
        unitEntries: parsedEntries,
        sizeRange: proj.size_range ?? "",
        amenities: new Set<string>(Array.isArray(proj.amenities) ? proj.amenities : []),
        customAmenity: "",
        promoVideo: proj.promo_video ?? "",
        unitPriceRange: proj.unit_price_range ?? "",
        paymentMethods: proj.payment_methods ?? "",
        partnerBank: proj.partner_bank ?? "",
        currency: proj.currency ?? "USD",
      });

      if (proj.latitude && proj.longitude) {
        setMarkerPos({ lat: Number(proj.latitude), lng: Number(proj.longitude) });
      }

      setExistingImages(Array.isArray(proj.images) ? proj.images : proj.images ? [String(proj.images)] : []);
      setExistingPlans(Array.isArray(proj.plans) ? proj.plans : proj.plans ? [String(proj.plans)] : []);
      setExistingBrochures(Array.isArray(proj.brochure) ? proj.brochure : proj.brochure ? [String(proj.brochure)] : []);
    })();
    return () => { active = false; };
  }, [projectId]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const toggleAmenity = (key: string) => {
    setForm((p) => {
      const next = new Set(p.amenities);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...p, amenities: next };
    });
  };

  // Unit entry helpers
  const addUnitEntry = () => {
    setForm((p) => ({
      ...p,
      unitEntries: [...p.unitEntries, { type: "", quantity: "", size: "", available: "" }]
    }));
  };

  const removeUnitEntry = (index: number) => {
    setForm((p) => ({
      ...p,
      unitEntries: p.unitEntries.filter((_, i) => i !== index)
    }));
  };

  const updateUnitEntry = (index: number, field: "type" | "quantity" | "size" | "available", value: string) => {
    setForm((p) => ({
      ...p,
      unitEntries: p.unitEntries.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      )
    }));
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

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingPlan = (index: number) => {
    setExistingPlans(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingBrochure = (index: number) => {
    setExistingBrochures(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (bucket: string, files: FileList, userId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files.item(i)!;
      const ext = f.name.split(".").pop() || "bin";
      const path = `${userId}/projects/${Date.now()}-${i}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, f, { upsert: false, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      if (pub?.publicUrl) urls.push(pub.publicUrl);
    }
    return urls;
  };

  const toNumber = (v: any) => {
    if (v === "" || v === undefined || v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Get fresh user ID to avoid stale state issues
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Debes iniciar sesión para editar este proyecto.");
      return;
    }

    if (!form.projectName || !form.category) {
      setError("Nombre del proyecto y categoría son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      let imageUrls = [...existingImages];
      let planUrls = [...existingPlans];
      let brochureUrls = [...existingBrochures];

      if (imagesFiles && imagesFiles.length > 0) {
        setUploading(true);
        const uploaded = await uploadFiles("project-images", imagesFiles, user.id);
        imageUrls = [...imageUrls, ...uploaded];
        setUploading(false);
      }

      if (plansFiles && plansFiles.length > 0) {
        setUploading(true);
        const uploaded = await uploadFiles("project-plans", plansFiles, user.id);
        planUrls = [...planUrls, ...uploaded];
        setUploading(false);
      }

      if (brochureFiles && brochureFiles.length > 0) {
        setUploading(true);
        const uploaded = await uploadFiles("project-brochures", brochureFiles, user.id);
        brochureUrls = [...brochureUrls, ...uploaded];
        setUploading(false);
      }

      const payload = {
        project_name: form.projectName || null,
        description_title: form.descriptionTitle || null,
        short_description: form.shortDescription || null,
        category: form.category || null,
        address: form.address || null,
        city_province: form.cityProvince || null,
        zone_sector: form.zoneSector || null,
        project_status: form.projectStatus || null,
        delivery_date: (form.deliveryDate && form.deliveryDate !== "") ? form.deliveryDate : null,
        units_count: toNumber(form.unitsCount),
        floors: toNumber(form.floors),
        land_size: toNumber(form.landSize),
        built_areas: toNumber(form.builtAreas),
        unit_types: JSON.stringify(form.unitEntries.filter(e => e.type)),
        size_range: form.sizeRange || null,
        quantity_per_type: form.unitEntries.filter(e => e.type && e.quantity).map(e => `${e.quantity} ${e.type}`).join(", ") || null,
        amenities: Array.from(form.amenities),
        images: imageUrls,
        promo_video: form.promoVideo || null,
        plans: planUrls,
        brochure: brochureUrls,
        unit_price_range: form.unitPriceRange || null,
        payment_methods: form.paymentMethods || null,
        partner_bank: form.partnerBank || null,
        currency: form.currency || null,
        latitude: markerPos?.lat || null,
        longitude: markerPos?.lng || null,
        updated_at: new Date().toISOString(),
      };

      console.log("Full Payload being sent to Supabase:", JSON.stringify(payload, null, 2));

      const { error: updErr, data } = await supabase
        .from("projects")
        .update(payload)
        .eq("id", projectId)
        .select();

      if (updErr) {
        console.error("Supabase update error detail:", JSON.stringify(updErr, Object.getOwnPropertyNames(updErr), 2));
        throw updErr;
      }

      if (!data || data.length === 0) {
        throw new Error("No se pudo actualizar el proyecto. Verifica tus permisos o si el proyecto existe.");
      }

      setSuccess("Proyecto actualizado correctamente.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error("Save error caught detail:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      // Detailed error breakdown for debugging
      let errorMsg = err?.message || "Error al actualizar el proyecto.";
      if (err?.code) errorMsg += ` (Código: ${err.code})`;
      if (err?.details) errorMsg += ` - ${err.details}`;
      if (err?.hint) errorMsg += ` - Hint: ${err.hint}`;

      setError(errorMsg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-2 mb-8">
        <h2 className="font-serif text-3xl font-bold text-foreground">Editar Proyecto</h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">Actualiza la información de tu desarrollo inmobiliario.</p>
      </div>

      <form className="space-y-8" onSubmit={onSubmit}>
        {(error || success) && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 backdrop-blur-md shadow-sm ${error ? 'bg-red-500/10 border-red-500/20 text-red-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${error ? 'bg-red-100 dark:bg-red-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
              {error ? <Trash2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            </div>
            <p className="font-medium text-sm">{error || success}</p>
          </div>
        )}

        {/* 1. Información General */}
        <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm relative z-50">
          <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
              Información General
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Nombre del proyecto</label>
              <Input name="projectName" value={form.projectName} onChange={onChange} className="h-11 bg-background/50" />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Título Publicitario</label>
              <Input name="descriptionTitle" value={form.descriptionTitle} onChange={onChange} className="h-11 bg-background/50" />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Descripción Breve</label>
              <textarea
                name="shortDescription"
                maxLength={300}
                value={form.shortDescription}
                onChange={onChange}
                rows={3}
                className="rounded-md border bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              />
              <div className="text-xs text-right text-muted-foreground">{form.shortDescription.length}/300</div>
            </div>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Categoría</label>
              <FormSelect
                value={form.category}
                onChange={(val) => setForm(p => ({ ...p, category: val }))}
                options={[
                  { value: "Residencial", label: "Residencial" },
                  { value: "Comercial", label: "Comercial" },
                  { value: "Mixto", label: "Mixto" },
                  { value: "Turístico", label: "Turístico" },
                  { value: "Otro", label: "Otro" }
                ]}
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Ubicación */}
        <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm relative z-40">
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
                >
                  {markerPos && <Marker position={markerPos} />}
                </GoogleMap>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted/20">Cargando Mapa...</div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-2 md:col-span-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Dirección Exacta</label>
                <Input name="address" value={form.address} onChange={onChange} className="h-11 bg-background/50" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Ciudad / Provincia</label>
                <Input name="cityProvince" value={form.cityProvince} onChange={onChange} className="h-11 bg-background/50" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Sector / Zona</label>
                <Input name="zoneSector" value={form.zoneSector} onChange={onChange} className="h-11 bg-background/50" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Características */}
        <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm relative z-30">
          <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
              Detalles del Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Estado de Obra</label>
              <FormSelect
                value={form.projectStatus}
                onChange={(val) => setForm(p => ({ ...p, projectStatus: val }))}
                options={[
                  { value: "En planos", label: "En planos" },
                  { value: "En construcción", label: "En construcción" },
                  { value: "En preventa", label: "En preventa" },
                  { value: "Terminado", label: "Terminado" }
                ]}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Fecha de Entrega</label>
              <Input type="date" name="deliveryDate" value={form.deliveryDate} onChange={onChange} className="h-11 bg-background/50" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Total Unidades</label>
              <Input type="number" name="unitsCount" value={form.unitsCount} onChange={onChange} className="h-11 bg-background/50" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Pisos / Niveles</label>
              <Input type="number" name="floors" value={form.floors} onChange={onChange} className="h-11 bg-background/50" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Terreno (m²)</label>
              <Input type="number" name="landSize" value={form.landSize} onChange={onChange} className="h-11 bg-background/50" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Constr. Total (m²)</label>
              <Input type="number" name="builtAreas" value={form.builtAreas} onChange={onChange} className="h-11 bg-background/50" />
            </div>
          </CardContent>
        </Card>

        {/* 4. Unidades */}
        <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm relative z-20">
          <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">4</span>
              Unidades & Distribución
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {form.unitEntries.map((entry, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl border border-border/50 bg-background/30">
                <div className="flex-1 grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                  <FormSelect
                    value={entry.type}
                    onChange={(val) => updateUnitEntry(index, "type", val)}
                    options={[
                      { value: "Estudio", label: "Estudio" },
                      { value: "1 Habitación", label: "1 Habitación" },
                      { value: "2 Habitaciones", label: "2 Habitaciones" },
                      { value: "3 Habitaciones", label: "3 Habitaciones" },
                      { value: "4+ Habitaciones", label: "4+ Habitaciones" },
                      { value: "Penthouse", label: "Penthouse" },
                      { value: "Local Comercial", label: "Local Comercial" },
                      { value: "Oficina", label: "Oficina" }
                    ]}
                  />
                </div>
                <div className="w-full sm:w-28 grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Cantidad</label>
                  <Input type="number" value={entry.quantity} onChange={(e) => updateUnitEntry(index, "quantity", e.target.value)} className="h-10 bg-background/50" />
                </div>
                <div className="w-full sm:w-32 grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Tamaño (m²)</label>
                  <Input type="number" value={entry.size} onChange={(e) => updateUnitEntry(index, "size", e.target.value)} className="h-10 bg-background/50" />
                </div>
                <div className="w-full sm:w-28 grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Disponibles</label>
                  <Input
                    type="number"
                    min="0"
                    value={entry.available || ""}
                    onChange={(e) => updateUnitEntry(index, "available", e.target.value)}
                    placeholder="0"
                    className="h-10 border-primary/30 bg-primary/5 focus:bg-background"
                  />
                </div>

                {form.unitEntries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeUnitEntry(index)}
                    className="self-end h-10 w-10 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addUnitEntry} className="w-full p-3 rounded-xl border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-all text-sm font-medium">+ Agregar Unidad</button>
          </CardContent>
        </Card>

        {/* 5. Amenidades */}
        <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm relative z-10">
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
                    {form.amenities.has(a) && <Check className="w-3 h-3" />}
                  </div>
                  <input type="checkbox" checked={form.amenities.has(a)} onChange={() => toggleAmenity(a)} className="hidden" />
                  <span className={`text-sm font-medium ${form.amenities.has(a) ? "text-primary" : "text-muted-foreground"}`}>{a}</span>
                </label>
              ))}
            </div>

            <div className="pt-4 border-t border-border/40">
              <label className="text-xs font-bold text-muted-foreground block mb-3">Otras Amenidades</label>
              <div className="flex gap-2 mb-3">
                <Input value={form.customAmenity} onChange={(e) => setForm(p => ({ ...p, customAmenity: e.target.value }))} placeholder="Amenidad personalizada..." className="h-11 flex-1 bg-background/50" />
                <Button type="button" onClick={addCustomAmenity} variant="secondary">Agregar</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from(form.amenities).filter(a => ![
                  "Piscina Inifinity", "Gimnasio Equipado", "Lobby Climatizado", "Terraza Social", "Area BBQ",
                  "Parque Infantil", "Seguridad 24/7", "Parqueo Techado", "Planta Eléctrica", "Ascensor",
                  "Cine", "Coworking", "Pet Friendly"
                ].includes(a)).map((amenity) => (
                  <div key={amenity} className="flex items-center bg-secondary/50 border border-secondary rounded-full px-3 py-1 text-sm pl-4">
                    <span className="mr-2">{amenity}</span>
                    <button type="button" onClick={() => removeCustomAmenity(amenity)} className="h-5 w-5 hover:bg-black/10 rounded-full flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 6. Multimedia */}
        <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm relative z-[5]">
          <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">6</span>
              Galería Multimedia
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <label className="text-xs font-bold text-muted-foreground block">Renderings & Fotos (Máx 5)</label>
              <ImageSelector
                onImagesChange={setImagesFiles}
                existingImages={existingImages}
                maxImages={5}
                onRemoveExistingImage={removeExistingImage}
                label="Agregar imágenes..."
                id="imagesFiles"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <label className="text-xs font-bold text-muted-foreground">Video Link</label>
                <Input name="promoVideo" value={form.promoVideo} onChange={onChange} className="h-11 bg-background/50" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-bold text-muted-foreground">Planos (PDF/Imagen)</label>
                <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => setPlansFiles(e.target.files)} className="text-sm cursor-pointer" />
                {existingPlans.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {existingPlans.map((url, i) => (
                      <div key={url} className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                        Archivo {i + 1} <button type="button" onClick={() => removeExistingPlan(i)}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-bold text-muted-foreground">Brochure/Folleto (PDF/Imagen)</label>
                <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => setBrochureFiles(e.target.files)} className="text-sm cursor-pointer" />
                {existingBrochures.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {existingBrochures.map((url, i) => (
                      <div key={url} className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-full flex items-center gap-1">
                        Brochure {i + 1} <button type="button" onClick={() => removeExistingBrochure(i)}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 7. Finanzas */}
        <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm relative z-0">
          <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">7</span>
              Inversión & Finanzas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-2">
              <label className="text-xs font-bold text-muted-foreground">Rango de Precios</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input name="unitPriceRange" value={form.unitPriceRange} onChange={onChange} className="h-11 bg-background/50 pl-7" />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-bold text-muted-foreground">Moneda</label>
              <FormSelect
                value={form.currency}
                onChange={(val) => setForm(p => ({ ...p, currency: val }))}
                options={[
                  { value: "USD", label: "USD (Dólares)" },
                  { value: "DOP", label: "DOP (Pesos)" },
                  { value: "EUR", label: "EUR (Euros)" }
                ]}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label className="text-xs font-bold text-muted-foreground">Plan de Pagos</label>
              <Input name="paymentMethods" value={form.paymentMethods} onChange={onChange} className="h-11 bg-background/50" />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 pb-12">
          <Button type="button" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-full" onClick={() => window.history.back()}>Cancelar</Button>
          <Button type="submit" disabled={saving || uploading} className="w-full sm:w-auto h-12 px-10 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 text-lg font-medium transition-all active:scale-95">
            {saving || uploading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}