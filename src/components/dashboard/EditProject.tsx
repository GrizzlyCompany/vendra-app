"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";

export function EditProjectSection({ projectId }: { projectId: string }) {
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

  // Mantener arrays existentes
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [existingPlans, setExistingPlans] = useState<string[]>([]);

  // Selección nueva de archivos
  const [imagesFiles, setImagesFiles] = useState<FileList | null>(null);
  const [plansFiles, setPlansFiles] = useState<FileList | null>(null);

  const canSubmit = useMemo(() => !!uid && !!projectId, [uid, projectId]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!active) return;
      const u = sess.session?.user ?? null;
      setUid(u?.id ?? null);
      const metaRole = (u?.user_metadata as Record<string, unknown>)?.role as string | undefined;
      if (metaRole) setOwnerRole(metaRole);
      const uidLocal = u?.id ?? null;
      if (uidLocal) {
        const { data: dbUser } = await supabase.from("users").select("role").eq("id", uidLocal).maybeSingle();
        const dbRole = (dbUser?.role as string | undefined) ?? null;
        if (dbRole && dbRole !== ownerRole) setOwnerRole(dbRole);
      }

      // Cargar proyecto
      const { data: proj, error: projErr } = await supabase
        .from("projects")
        .select(
          "id, owner_id, owner_role, project_name, short_description, category, address, city_province, zone_sector, project_status, delivery_date, units_count, floors, land_size, built_areas, unit_types, size_range, price_range, quantity_per_type, amenities, images, promo_video, plans, unit_price_range, payment_methods, partner_bank"
        )
        .eq("id", projectId)
        .maybeSingle();

      if (!active) return;
      if (projErr || !proj) {
        setError(projErr?.message || "Proyecto no encontrado");
        return;
      }

      // Chequear ownership (client-side; RLS hará el resto)
      if (u?.id && proj.owner_id && u.id !== proj.owner_id) {
        setError("No tienes permisos para editar este proyecto.");
        return;
      }

      // Pre-cargar formulario con los datos existentes
      setForm({
        projectName: proj.project_name ?? "",
        shortDescription: proj.short_description ?? "",
        category: proj.category ?? "",
        address: proj.address ?? "",
        cityProvince: proj.city_province ?? "",
        zoneSector: proj.zone_sector ?? "",
        projectStatus: proj.project_status ?? "",
        deliveryDate: proj.delivery_date ?? "",
        unitsCount: proj.units_count ?? "",
        floors: proj.floors ?? "",
        landSize: proj.land_size ?? "",
        builtAreas: proj.built_areas ?? "",
        unitTypes: proj.unit_types ?? "",
        sizeRange: proj.size_range ?? "",
        priceRange: proj.price_range ?? "",
        quantityPerType: proj.quantity_per_type ?? "",
        amenities: new Set<string>(Array.isArray(proj.amenities) ? proj.amenities : []),
        promoVideo: proj.promo_video ?? "",
        unitPriceRange: proj.unit_price_range ?? "",
        paymentMethods: proj.payment_methods ?? "",
        partnerBank: proj.partner_bank ?? "",
      });

      setExistingImages(Array.isArray(proj.images) ? proj.images : proj.images ? [String(proj.images)] : []);
      setExistingPlans(Array.isArray(proj.plans) ? proj.plans : proj.plans ? [String(proj.plans)] : []);
    })();
    return () => {
      active = false;
    };
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

  const uploadFiles = async (bucket: string, files: FileList): Promise<string[]> => {
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files.item(i)!;
      const ext = f.name.split(".").pop() || "bin";
      const path = `${uid}/projects/${Date.now()}-${i}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, f, { upsert: false, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      if (pub?.publicUrl) urls.push(pub.publicUrl);
    }
    return urls;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!canSubmit) {
      setError("Debes iniciar sesión.");
      return;
    }
    if (!form.projectName || !form.category) {
      setError("Nombre del proyecto y categoría son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      // Subidas opcionales
      let imageUrls = existingImages.slice();
      let planUrls = existingPlans.slice();

      if (imagesFiles && imagesFiles.length > 0) {
        setUploading(true);
        const uploaded = await uploadFiles("project-images", imagesFiles);
        imageUrls = uploaded; // Reemplazar con nuevas imágenes
        setUploading(false);
      }

      if (plansFiles && plansFiles.length > 0) {
        setUploading(true);
        const uploaded = await uploadFiles("project-plans", plansFiles);
        planUrls = uploaded; // Reemplazar con nuevos planos
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
        units_count: form.unitsCount || null,
        floors: form.floors || null,
        land_size: form.landSize || null,
        built_areas: form.builtAreas || null,
        unit_types: form.unitTypes || null,
        size_range: form.sizeRange || null,
        price_range: form.priceRange || null,
        quantity_per_type: form.quantityPerType || null,
        amenities: Array.from(form.amenities),
        images: imageUrls,
        promo_video: form.promoVideo || null,
        plans: planUrls,
        unit_price_range: form.unitPriceRange || null,
        payment_methods: form.paymentMethods || null,
        partner_bank: form.partnerBank || null,
        owner_role: ownerRole ?? null,
        updated_at: new Date().toISOString(),
      } as const;

      const { error: updErr } = await supabase.from("projects").update(payload).eq("id", projectId);
      if (updErr) throw updErr;

      setSuccess("Proyecto actualizado correctamente.");
    } catch (err: any) {
      setError(err?.message || "Error al actualizar el proyecto.");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border shadow-md">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Editar proyecto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-8">
            {/* 1. Información General */}
            <section className="space-y-4">
              <h3 className="font-serif text-lg text-[#1C4B2E]">1. Información General</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="projectName">Nombre del Proyecto</label>
                  <Input id="projectName" name="projectName" value={form.projectName} onChange={onChange} placeholder="Ej: Residencial Las Palmeras" />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="shortDescription">Descripción corta</label>
                  <textarea id="shortDescription" name="shortDescription" value={form.shortDescription} onChange={onChange} className="min-h-28 rounded-md border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Resumen del proyecto" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="category">Categoría</label>
                  <Input id="category" name="category" value={form.category} onChange={onChange} placeholder="Residencial, Comercial, Mixto…" />
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
                  <Input id="cityProvince" name="cityProvince" value={form.cityProvince} onChange={onChange} placeholder="Santo Domingo, Santiago…" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="zoneSector">Zona / Sector</label>
                  <Input id="zoneSector" name="zoneSector" value={form.zoneSector} onChange={onChange} placeholder="Naco, Piantini, etc." />
                </div>
              </div>
            </section>

            {/* 3. Características del Proyecto */}
            <section className="space-y-4">
              <h3 className="font-serif text-lg text-[#1C4B2E]">3. Características del Proyecto</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="projectStatus">Estado del Proyecto</label>
                  <Input id="projectStatus" name="projectStatus" value={form.projectStatus} onChange={onChange} placeholder="En planos, En construcción…" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="deliveryDate">Fecha Entrega (YYYY-MM)</label>
                  <Input id="deliveryDate" name="deliveryDate" value={form.deliveryDate} onChange={onChange} placeholder="2026-06" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="unitsCount">Unidades</label>
                  <Input id="unitsCount" name="unitsCount" value={form.unitsCount} onChange={onChange} type="number" placeholder="Ej: 24" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="floors">Pisos / Niveles</label>
                  <Input id="floors" name="floors" value={form.floors} onChange={onChange} type="number" placeholder="Ej: 8" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="landSize">Terreno (m²)</label>
                  <Input id="landSize" name="landSize" value={form.landSize} onChange={onChange} type="number" placeholder="Ej: 1200" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="builtAreas">Áreas construidas (m²)</label>
                  <Input id="builtAreas" name="builtAreas" value={form.builtAreas} onChange={onChange} type="number" placeholder="Ej: 5000" />
                </div>
              </div>
            </section>

            {/* 4. Detalles de las Unidades */}
            <section className="space-y-4">
              <h3 className="font-serif text-lg text-[#1C4B2E]">4. Detalles de las Unidades</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="unitTypes">Tipos de unidades</label>
                  <Input id="unitTypes" name="unitTypes" value={form.unitTypes} onChange={onChange} placeholder="Aptos 1,2,3h, PH…" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="sizeRange">Rango de tamaños</label>
                  <Input id="sizeRange" name="sizeRange" value={form.sizeRange} onChange={onChange} placeholder="50–120 m²" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="priceRange">Rango de precios (global)</label>
                  <Input id="priceRange" name="priceRange" value={form.priceRange} onChange={onChange} placeholder="US$120,000–350,000" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="quantityPerType">Cantidad por tipo</label>
                  <Input id="quantityPerType" name="quantityPerType" value={form.quantityPerType} onChange={onChange} placeholder="8 de 1h, 12 de 2h…" />
                </div>
              </div>
            </section>

            {/* 5. Amenidades */}
            <section className="space-y-4">
              <h3 className="font-serif text-lg text-[#1C4B2E]">5. Amenidades y Servicios</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  "Piscina",
                  "Gimnasio",
                  "Área social",
                  "Seguridad 24/7",
                  "Parque infantil",
                  "Parqueos",
                  "Ascensor",
                  "BBQ",
                  "Pet-friendly",
                ].map((label) => {
                  const active = form.amenities.has(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleAmenity(label)}
                      className={`rounded-md border px-3 py-2 text-sm ${active ? "bg-secondary text-secondary-foreground" : "bg-background"}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 6. Galería */}
            <section className="space-y-4">
              <h3 className="font-serif text-lg text-[#1C4B2E]">6. Galería</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 text-sm text-muted-foreground">
                  {existingImages.length > 0 ? `${existingImages.length} imagen(es) actual(es)` : "Sin imágenes actuales"}
                </div>
                <div className="sm:col-span-2 grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="imagesFiles">Reemplazar imágenes principales</label>
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
                    <div className="text-xs text-muted-foreground">{imagesFiles!.length} imagen(es) nuevas seleccionadas</div>
                  )}
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="promoVideo">Video promocional (YouTube/Vimeo)</label>
                  <Input id="promoVideo" name="promoVideo" value={form.promoVideo} onChange={onChange} placeholder="https://…" />
                </div>
                <div className="sm:col-span-2 text-sm text-muted-foreground">
                  {existingPlans.length > 0 ? `${existingPlans.length} plano(s) actual(es)` : "Sin planos actuales"}
                </div>
                <div className="sm:col-span-2 grid gap-2">
                  <label className="text-sm text-[#6B7280]" htmlFor="plansFiles">Reemplazar planos arquitectónicos</label>
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
                    <div className="text-xs text-muted-foreground">{plansFiles!.length} archivo(s) de plano nuevos</div>
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

            {error && <div className="text-sm text-red-600">{error}</div>}
            {success && <div className="text-sm text-green-600">{success}</div>}
            <div className="pt-2">
              <Button type="submit" disabled={saving || uploading || !canSubmit} className="bg-[#1C4B2E] text-white hover:bg-[#163c25]">
                {saving || uploading ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
