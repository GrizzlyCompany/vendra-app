"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/ui/form-select";
import { supabase } from "@/lib/supabase/client";
import { ImageSelector } from "@/components/dashboard/ImageSelector";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function AddPropertySection() {
  const t = useTranslations("forms.property");
  const tProj = useTranslations("projects"); // Reuse amenities/unit types

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
      setError(t("feedback.authError"));
      return;
    }

    // Validaciones mínimas
    if (!form.projectName || !form.category) {
      setError(t("feedback.requiredError"));
      return;
    }

    setSaving(true);
    try {
      // 1) Subir archivos a Storage y recolectar URLs públicas
      const imageUrls: string[] = [];
      const planUrls: string[] = [];
      const brochureUrls: string[] = [];

      if (imagesFiles && imagesFiles.length > 0) {
        setUploading(true);
        const bucket = "project-images";
        for (let i = 0; i < imagesFiles.length; i++) {
          const f = imagesFiles.item(i)!;
          const ext = f.name.split(".").pop() || "bin";
          const path = `${uid}/projects/${Date.now()}-${i}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: upErr } = await supabase.storage.from(bucket).upload(path, f, { upsert: false, cacheControl: "3600" });
          if (upErr) {
            setError(t("feedback.uploadError", { fileType: "imagen", message: upErr.message }));
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
            setError(t("feedback.uploadError", { fileType: "plano", message: upErr.message }));
            setUploading(false);
            return;
          }
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
          if (pub?.publicUrl) planUrls.push(pub.publicUrl);
        }
        setUploading(false);
      }

      if (brochureFiles && brochureFiles.length > 0) {
        setUploading(true);
        const bucket = "project-brochures";
        for (let i = 0; i < brochureFiles.length; i++) {
          const f = brochureFiles.item(i)!;
          const ext = f.name.split(".").pop() || "bin";
          const path = `${uid}/projects/${Date.now()}-brochure-${i}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: upErr } = await supabase.storage.from(bucket).upload(path, f, { upsert: false, cacheControl: "3600" });
          if (upErr) {
            setError(t("feedback.uploadError", { fileType: "brochure", message: upErr.message }));
            setUploading(false);
            return;
          }
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
          if (pub?.publicUrl) brochureUrls.push(pub.publicUrl);
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
        unit_types: JSON.stringify(form.unitEntries.filter(e => e.type)),
        size_range: form.sizeRange || null,
        // Keep quantity_per_type for semi-backward compatibility with search if needed, but the main data is in unit_types
        quantity_per_type: form.unitEntries.filter(e => e.type && e.quantity).map(e => `${e.quantity} ${e.type}`).join(", ") || null,
        amenities: Array.from(form.amenities),
        images: imageUrls.length ? imageUrls : null,
        promo_video: form.promoVideo || null,
        plans: planUrls.length ? planUrls : null,
        brochure: brochureUrls.length ? brochureUrls : null,
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

      setSuccess(t("feedback.success"));
      // Opcional: reset del formulario
      // setForm({ ...estadoInicial })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("feedback.genericError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <div className="text-center space-y-2 mb-8">
        <h2 className="font-serif text-3xl font-bold text-foreground">{t("title")}</h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">{t("subtitle")}</p>
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
        <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm relative z-50">
          <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
              {t("sections.general")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="projectName">{t("labels.projectName")}</label>
              <Input id="projectName" name="projectName" value={form.projectName} onChange={onChange} placeholder={t("placeholders.projectName")} className="h-11 bg-background/50" />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="descriptionTitle">{t("labels.adTitle")}</label>
              <Input id="descriptionTitle" name="descriptionTitle" value={form.descriptionTitle} onChange={onChange} placeholder={t("placeholders.adTitle")} className="h-11 bg-background/50" />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="shortDescription">{t("labels.shortDesc")}</label>
              <textarea
                id="shortDescription"
                name="shortDescription"
                maxLength={300}
                value={form.shortDescription}
                onChange={onChange}
                rows={3}
                className="rounded-md border bg-background/50 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                placeholder={t("placeholders.shortDesc")}
              />
              <div className="text-xs text-right text-muted-foreground">{form.shortDescription.length}/300</div>
            </div>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{t("labels.category")}</label>
              <FormSelect
                value={form.category}
                onChange={(val) => setForm(p => ({ ...p, category: val }))}
                placeholder={t("placeholders.selectType")}
                options={[
                  { value: "Residencial", label: t("options.residential") },
                  { value: "Comercial", label: t("options.commercial") },
                  { value: "Mixto", label: t("options.mixed") },
                  { value: "Turístico", label: t("options.tourist") },
                  { value: "Otro", label: t("options.other") }
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
              {t("sections.location")}
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
                    <span className="text-sm font-medium">{t("actions.mapMap")}</span>
                  </div>
                </div>
              )}
              {!markerPos && isLoaded && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-xs font-medium backdrop-blur-sm pointer-events-none">
                  {t("actions.mapHint")}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-2 md:col-span-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="address">{t("labels.address")}</label>
                <Input id="address" name="address" value={form.address} onChange={onChange} placeholder={t("placeholders.address")} className="h-11 bg-background/50 icon-map" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="cityProvince">{t("labels.city")}</label>
                <Input id="cityProvince" name="cityProvince" value={form.cityProvince} onChange={onChange} placeholder={t("placeholders.city")} className="h-11 bg-background/50" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="zoneSector">{t("labels.sector")}</label>
                <Input id="zoneSector" name="zoneSector" value={form.zoneSector} onChange={onChange} placeholder={t("placeholders.sector")} className="h-11 bg-background/50" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Detalles Técnicos */}
        <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm relative z-30">
          <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
              {t("sections.details")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{t("labels.status")}</label>
              <FormSelect
                value={form.projectStatus}
                onChange={(val) => setForm(p => ({ ...p, projectStatus: val }))}
                placeholder={t("placeholders.select")}
                options={[
                  { value: "En planos", label: t("options.plans") },
                  { value: "En construcción", label: t("options.construction") },
                  { value: "En preventa", label: t("options.presale") },
                  { value: "Terminado", label: t("options.ready") }
                ]}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80 font-medium" htmlFor="deliveryDate">{t("labels.deliveryDate")}</label>
              <Input type="date" id="deliveryDate" name="deliveryDate" value={form.deliveryDate} onChange={onChange} className="h-11 bg-background/50" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80 font-medium" htmlFor="unitsCount">{t("labels.totalUnits")}</label>
              <Input type="number" min="0" id="unitsCount" name="unitsCount" value={form.unitsCount} onChange={onChange} placeholder="0" className="h-11 bg-background/50" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80 font-medium" htmlFor="floors">{t("labels.floors")}</label>
              <Input type="number" min="0" id="floors" name="floors" value={form.floors} onChange={onChange} placeholder="0" className="h-11 bg-background/50" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80 font-medium" htmlFor="landSize">{t("labels.landSize")}</label>
              <Input type="number" min="0" id="landSize" name="landSize" value={form.landSize} onChange={onChange} placeholder="0" className="h-11 bg-background/50" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80 font-medium" htmlFor="builtAreas">{t("labels.builtArea")}</label>
              <Input type="number" min="0" id="builtAreas" name="builtAreas" value={form.builtAreas} onChange={onChange} placeholder="0" className="h-11 bg-background/50" />
            </div>
          </CardContent>
        </Card>

        {/* 4. Unidades & Distribución */}
        <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm relative z-20">
          <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">4</span>
              {t("sections.units")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground mb-2">{t("unitsHint")}</p>

            {form.unitEntries.map((entry, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl border border-border/50 bg-background/30">
                <div className="flex-1 grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("labels.unitType")}</label>
                  <FormSelect
                    value={entry.type}
                    onChange={(val) => updateUnitEntry(index, "type", val)}
                    placeholder={t("placeholders.select")}
                    options={[
                      { value: "Estudio", label: tProj("unitTypes.Studio") },
                      { value: "1 Habitación", label: tProj("unitTypes.1Bedroom") },
                      { value: "2 Habitaciones", label: tProj("unitTypes.2Bedrooms") },
                      { value: "3 Habitaciones", label: tProj("unitTypes.3Bedrooms") },
                      { value: "4+ Habitaciones", label: tProj("unitTypes.4PlusBedrooms") },
                      { value: "Penthouse", label: tProj("unitTypes.Penthouse") },
                      { value: "Local Comercial", label: tProj("unitTypes.Local Comercial") },
                      { value: "Oficina", label: tProj("unitTypes.Office") },
                      { value: "Otro", label: t("options.other") }
                    ]}
                  />
                </div>

                <div className="w-full sm:w-28 grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("labels.quantity")}</label>
                  <Input
                    type="number"
                    min="1"
                    value={entry.quantity}
                    onChange={(e) => updateUnitEntry(index, "quantity", e.target.value)}
                    placeholder="0"
                    className="h-10 bg-background/50"
                  />
                </div>

                <div className="w-full sm:w-32 grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("labels.size")}</label>
                  <Input
                    type="number"
                    min="1"
                    value={entry.size}
                    onChange={(e) => updateUnitEntry(index, "size", e.target.value)}
                    placeholder="0"
                    className="h-10 bg-background/50"
                  />
                </div>

                <div className="w-full sm:w-28 grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("labels.available")}</label>
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

            <button
              type="button"
              onClick={addUnitEntry}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">{t("actions.addUnit")}</span>
            </button>
          </CardContent>
        </Card>

        {/* 5. Amenidades */}
        <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm relative z-10">
          <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">5</span>
              {t("sections.amenities")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                "Piscina Infinity", "Gimnasio Equipado", "Lobby Climatizado", "Terraza Social", "Area BBQ",
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
                  <span className={`text-sm font-medium ${form.amenities.has(a) ? "text-primary" : "text-muted-foreground"}`}>{tProj(`amenities.${a}`) || a}</span>
                </label>
              ))}
            </div>

            <div className="pt-4 border-t border-border/40">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block mb-3">{t("labels.otherAmenities")}</label>
              <div className="flex gap-2 mb-3">
                <Input
                  type="text"
                  value={form.customAmenity}
                  onChange={handleCustomAmenityChange}
                  placeholder={t("placeholders.customAmenity")}
                  className="h-11 flex-1 bg-background/50"
                />
                <Button type="button" onClick={addCustomAmenity} variant="secondary" className="px-6">
                  {t("actions.add")}
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
        <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm relative z-[5]">
          <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">6</span>
              {t("sections.media")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">{t("labels.images")}</label>
              <div className="bg-muted/10 rounded-xl p-6 border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors">
                <ImageSelector
                  onImagesChange={setImagesFiles}
                  maxImages={5}
                  label={t("dragDrop")}
                  id="imagesFiles"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="promoVideo">{t("labels.video")}</label>
                <Input id="promoVideo" name="promoVideo" value={form.promoVideo} onChange={onChange} placeholder={t("placeholders.video")} className="h-11 bg-background/50" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="plansFiles">{t("labels.plans")}</label>
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
                  <div className="text-xs text-primary font-medium mt-1">{t("filesSelected", { count: plansFiles!.length })}</div>
                )}
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="brochureFiles">{t("labels.brochure")}</label>
                <input
                  id="brochureFiles"
                  name="brochureFiles"
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(e) => setBrochureFiles(e.target.files)}
                  className="file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20 text-sm text-muted-foreground cursor-pointer"
                />
                {(brochureFiles?.length || 0) > 0 && (
                  <div className="text-xs text-primary font-medium mt-1">{t("filesSelected", { count: brochureFiles!.length })}</div>
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
              {t("sections.finance")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="unitPriceRange">{t("labels.priceRange")}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input id="unitPriceRange" name="unitPriceRange" value={form.unitPriceRange} onChange={onChange} placeholder={t("placeholders.priceRange")} className="h-11 bg-background/50 pl-7" />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{t("labels.currency")}</label>
              <FormSelect
                value={form.currency}
                onChange={(val) => setForm(p => ({ ...p, currency: val }))}
                placeholder={t("placeholders.select")}
                options={[
                  { value: "USD", label: "USD (Dólares)" },
                  { value: "DOP", label: "DOP (Pesos)" },
                  { value: "EUR", label: "EUR (Euros)" }
                ]}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="paymentMethods">{t("labels.paymentPlan")}</label>
              <Input id="paymentMethods" name="paymentMethods" value={form.paymentMethods} onChange={onChange} placeholder={t("placeholders.paymentPlan")} className="h-11 bg-background/50" />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground" htmlFor="partnerBank">{t("labels.trust")}</label>
              <Input id="partnerBank" name="partnerBank" value={form.partnerBank} onChange={onChange} placeholder={t("placeholders.trust")} className="h-11 bg-background/50" />
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
            {t("actions.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={saving || uploading}
            className="w-full sm:w-auto h-12 px-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 text-lg font-medium transition-all active:scale-95"
          >
            {saving || uploading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                {uploading ? t("actions.uploading") : t("actions.saving")}
              </span>
            ) : t("actions.publish")}
          </Button>
        </div>
      </form>
    </div>
  );
}