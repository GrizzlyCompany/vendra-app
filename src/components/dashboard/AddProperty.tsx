"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { supabase } from "@/lib/supabase/client";

export function AddPropertySection() {
  const [form, setForm] = useState({
    // 1. Información General
    projectName: "",
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
    priceRange: "",
    quantityPerType: "",

    // 5. Amenidades y Servicios
    amenities: new Set<string>(),

    // 6. Galería
    promoVideo: "",

    // 7. Información Financiera
    unitPriceRange: "",
    paymentMethods: "",
    partnerBank: "",
  });

  const [uid, setUid] = useState<string | null>(null);
  const [ownerRole, setOwnerRole] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imagesFiles, setImagesFiles] = useState<FileList | null>(null);
  const [plansFiles, setPlansFiles] = useState<FileList | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const u = data.session?.user ?? null;
      setUid(u?.id ?? null);
      // intentar leer role del user_metadata y/o de la tabla users
      const metaRole = (u?.user_metadata as any)?.role as string | undefined;
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
      let imageUrls: string[] = [];
      let planUrls: string[] = [];

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
        price_range: form.priceRange || null,
        quantity_per_type: form.quantityPerType || null,
        amenities: Array.from(form.amenities),
        images: imageUrls.length ? imageUrls : null,
        promo_video: form.promoVideo || null,
        plans: planUrls.length ? planUrls : null,
        unit_price_range: form.unitPriceRange || null,
        payment_methods: form.paymentMethods || null,
        partner_bank: form.partnerBank || null,
        owner_id: uid,
        owner_role: ownerRole ?? null,
      } as const;

      const { error: insertError } = await supabase.from("projects").insert(payload);
      if (insertError) throw insertError;

      setSuccess("Proyecto publicado correctamente.");
      // Opcional: reset del formulario
      // setForm({ ...estadoInicial })
    } catch (err: any) {
      setError(err.message ?? "Error al publicar el proyecto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border shadow-md">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Nuevo proyecto</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-8" onSubmit={onSubmit}>
            {/* 1. Información General */}
            <section className="space-y-4">
              <h3 className="font-serif text-lg text-[#1C4B2E]">1. Información General</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="projectName">Nombre del proyecto</label>
                  <Input id="projectName" name="projectName" value={form.projectName} onChange={onChange} placeholder='Ej: "Residencial Vendra Towers"' />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="shortDescription">Descripción breve (máx. 300)</label>
                  <textarea id="shortDescription" name="shortDescription" maxLength={300} value={form.shortDescription} onChange={onChange} rows={3} className="rounded-md border bg-background px-3 py-2 text-sm" />
                </div>
                <div className="grid gap-2 sm:col-span-1">
                  <label className="text-sm text-[#6B7280]" htmlFor="category">Categoría / Tipo de proyecto</label>
                  <Select id="category" name="category" value={form.category} onChange={onChange}>
                    <option value="">Seleccionar</option>
                    <option value="Residencial">Residencial</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Mixto">Mixto</option>
                    <option value="Otro">Otro</option>
                  </Select>
                </div>
              </div>
            </section>

            {/* 2. Ubicación */}
            <section className="space-y-4">
              <h3 className="font-serif text-lg text-[#1C4B2E]">2. Ubicación</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="address">Dirección</label>
                  <Input id="address" name="address" value={form.address} onChange={onChange} placeholder="Calle, número, referencia" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="cityProvince">Ciudad / Provincia</label>
                  <Input id="cityProvince" name="cityProvince" value={form.cityProvince} onChange={onChange} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="zoneSector">Zona / Sector</label>
                  <Input id="zoneSector" name="zoneSector" value={form.zoneSector} onChange={onChange} />
                </div>
              </div>
            </section>

            {/* 3. Características del Proyecto */}
            <section className="space-y-4">
              <h3 className="font-serif text-lg text-[#1C4B2E]">3. Características del Proyecto</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-2 sm:col-span-1">
                  <label className="text-sm text-[#6B7280]" htmlFor="projectStatus">Estado del proyecto</label>
                  <Select id="projectStatus" name="projectStatus" value={form.projectStatus} onChange={onChange}>
                    <option value="">Seleccionar</option>
                    <option value="En planos">En planos</option>
                    <option value="En construcción">En construcción</option>
                    <option value="En preventa">En preventa</option>
                    <option value="Terminado">Terminado</option>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="deliveryDate">Fecha estimada de entrega</label>
                  <Input type="date" id="deliveryDate" name="deliveryDate" value={form.deliveryDate} onChange={onChange} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="unitsCount">Cantidad de unidades</label>
                  <Input type="number" min="0" id="unitsCount" name="unitsCount" value={form.unitsCount} onChange={onChange} placeholder="Ej: 120" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="floors">Niveles / pisos</label>
                  <Input type="number" min="0" id="floors" name="floors" value={form.floors} onChange={onChange} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="landSize">Tamaño del terreno (m²)</label>
                  <Input type="number" min="0" id="landSize" name="landSize" value={form.landSize} onChange={onChange} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="builtAreas">Áreas construidas (m²)</label>
                  <Input type="number" min="0" id="builtAreas" name="builtAreas" value={form.builtAreas} onChange={onChange} />
                </div>
              </div>
            </section>

            {/* 4. Detalles de las Unidades */}
            <section className="space-y-4">
              <h3 className="font-serif text-lg text-[#1C4B2E]">4. Detalles de las Unidades</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="unitTypes">Tipos de unidades disponibles</label>
                  <textarea id="unitTypes" name="unitTypes" value={form.unitTypes} onChange={onChange} rows={2} className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Ej: Apts. 2 y 3 hab, locales, oficinas" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="sizeRange">Rango de tamaños (m²)</label>
                  <Input id="sizeRange" name="sizeRange" value={form.sizeRange} onChange={onChange} placeholder="Ej: 60–180 m²" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="priceRange">Rango de precios</label>
                  <Input id="priceRange" name="priceRange" value={form.priceRange} onChange={onChange} placeholder="Ej: 120,000–350,000" />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="quantityPerType">Cantidad disponible por tipo de unidad</label>
                  <textarea id="quantityPerType" name="quantityPerType" value={form.quantityPerType} onChange={onChange} rows={2} className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Ej: 40 apts 2H, 60 apts 3H, 10 locales" />
                </div>
              </div>
            </section>

            {/* 5. Amenidades y Servicios */}
            <section className="space-y-4">
              <h3 className="font-serif text-lg text-[#1C4B2E]">5. Amenidades y Servicios</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  "Piscina",
                  "Gimnasio",
                  "Lobby",
                  "Área social",
                  "Parque infantil",
                  "Seguridad 24/7",
                  "Parqueo techado",
                ].map((a) => (
                  <label key={a} className="flex items-center gap-2 text-sm text-[#1C4B2E]">
                    <input
                      type="checkbox"
                      checked={form.amenities.has(a)}
                      onChange={() => toggleAmenity(a)}
                    />
                    {a}
                  </label>
                ))}
              </div>
            </section>

            {/* 6. Galería */}
            <section className="space-y-4">
              <h3 className="font-serif text-lg text-[#1C4B2E]">6. Galería</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="imagesFiles">Imágenes principales</label>
                  <input
                    id="imagesFiles"
                    name="imagesFiles"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setImagesFiles(e.target.files)}
                    className="file:mr-3 file:rounded-md file:border file:px-3 file:py-2 file:text-sm file:bg-secondary file:text-secondary-foreground rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  {(imagesFiles?.length || 0) > 0 && (
                    <div className="text-xs text-muted-foreground">{imagesFiles!.length} imagen(es) seleccionada(s)</div>
                  )}
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="promoVideo">Video promocional (YouTube/Vimeo)</label>
                  <Input id="promoVideo" name="promoVideo" value={form.promoVideo} onChange={onChange} placeholder="https://…" />
                </div>
                <div className="sm:col-span-2 grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="plansFiles">Planos arquitectónicos (opcional)</label>
                  <input
                    id="plansFiles"
                    name="plansFiles"
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={(e) => setPlansFiles(e.target.files)}
                    className="file:mr-3 file:rounded-md file:border file:px-3 file:py-2 file:text-sm file:bg-secondary file:text-secondary-foreground rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  {(plansFiles?.length || 0) > 0 && (
                    <div className="text-xs text-muted-foreground">{plansFiles!.length} archivo(s) de plano seleccionados</div>
                  )}
                </div>
              </div>
            </section>

            {/* 7. Información Financiera */}
            <section className="space-y-4">
              <h3 className="font-serif text-lg text-[#1C4B2E]">7. Información Financiera</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="unitPriceRange">Rango de precios por unidad</label>
                  <Input id="unitPriceRange" name="unitPriceRange" value={form.unitPriceRange} onChange={onChange} placeholder="Ej: 120,000–350,000" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="paymentMethods">Formas de pago</label>
                  <Input id="paymentMethods" name="paymentMethods" value={form.paymentMethods} onChange={onChange} placeholder="Contado, financiamiento, fideicomiso…" />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="partnerBank">Banco aliado / fideicomiso (si aplica)</label>
                  <Input id="partnerBank" name="partnerBank" value={form.partnerBank} onChange={onChange} placeholder="Nombre del banco / fideicomiso" />
                </div>
              </div>
            </section>

            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}
            {success && (
              <div className="text-sm text-green-600">{success}</div>
            )}
            <div className="pt-2">
              <Button type="submit" disabled={saving || uploading} className="bg-[#1C4B2E] text-white hover:bg-[#163c25]">
                {saving || uploading ? "Publicando…" : "Publicar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
