import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { PropertyGallery } from "@/components/PropertyGallery";

async function getProject(id: string) {
  const { data, error } = await supabase
    .from("projects")
    .select(`
      id,
      project_name,
      short_description,
      category,
      address,
      city_province,
      zone_sector,
      project_status,
      delivery_date,
      units_count,
      floors,
      land_size,
      built_areas,
      unit_types,
      size_range,
      price_range,
      quantity_per_type,
      amenities,
      images,
      promo_video,
      plans,
      unit_price_range,
      payment_methods,
      partner_bank,
      owner_id,
      created_at
    `)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as any;
}

export default async function ProjectDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const images: string[] = project.images ?? [];
  const title: string = project.project_name;
  const location: string = project.city_province || project.address || "";
  const priceRange: string | null = project.unit_price_range ?? project.price_range ?? null;
  // Load constructor public profile
  let owner: { id: string; name: string | null; email: string | null; avatar_url: string | null; role: string | null } | null = null;
  try {
    const { data: pp } = await supabase
      .from("public_profiles")
      .select("id,name,email,avatar_url,role")
      .eq("id", project.owner_id)
      .maybeSingle();
    owner = pp ?? null;
  } catch {}

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background px-3 sm:px-4 py-10 mobile-bottom-safe">
      <div className="container mx-auto max-w-6xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <PropertyGallery images={images} />
          </div>
          <div className="md:col-span-1">
            <Card className="rounded-2xl border shadow-md">
              <CardHeader className="px-6">
                <CardTitle className="font-serif text-2xl text-primary">{title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-6">
                <div className="text-sm text-muted-foreground">{location}</div>
                {priceRange && (
                  <div className="text-2xl font-semibold text-foreground">{priceRange}</div>
                )}
                {project.category && (
                  <span className="inline-flex items-center rounded-full border border-transparent bg-[hsl(var(--secondary))] px-2.5 py-0.5 text-xs font-medium text-[hsl(var(--secondary-foreground))]">
                    {project.category}
                  </span>
                )}
                {project.project_status && (
                  <div className="text-sm text-muted-foreground">Estado: {project.project_status}</div>
                )}
                {project.delivery_date && (
                  <div className="text-sm text-muted-foreground">Entrega: {new Date(project.delivery_date).toLocaleDateString()}</div>
                )}
              </CardContent>
            </Card>

            {/* Constructor / Empresa Card */}
            {owner && (
              <Card className="mt-4 rounded-2xl border shadow-md">
                <CardHeader className="px-6">
                  <CardTitle className="font-serif text-xl text-primary">Constructora</CardTitle>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {owner.avatar_url ? (
                        <img src={owner.avatar_url} alt={owner.name ?? 'Empresa'} className="h-full w-full object-cover" />
                      ) : (
                        <Avatar alt={owner.name ?? 'Empresa'} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate">{owner.name ?? 'Empresa constructora'}</div>
                      {owner.role && (
                        <div className="text-xs text-muted-foreground">{owner.role}</div>
                      )}
                      {owner.email && (
                        <div className="text-xs text-muted-foreground break-all">{owner.email}</div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button asChild variant="outline" className="rounded-full">
                      <Link href={`/profile/${owner.id}`}>Ver perfil</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Card className="rounded-2xl border shadow-md">
          <CardHeader className="px-6">
            <CardTitle className="font-serif text-xl text-primary">Descripción</CardTitle>
          </CardHeader>
          <CardContent className="px-6">
            <p className="text-sm leading-6 text-foreground whitespace-pre-wrap">{project.short_description || "Sin descripción."}</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="rounded-2xl border shadow-md">
            <CardHeader className="px-6">
              <CardTitle className="font-serif text-xl text-primary">Características del Proyecto</CardTitle>
            </CardHeader>
            <CardContent className="px-6 text-sm text-foreground space-y-2">
              {project.units_count != null && <div>Unidades: {project.units_count}</div>}
              {project.floors != null && <div>Pisos/Niveles: {project.floors}</div>}
              {project.land_size != null && <div>Terreno: {project.land_size} m²</div>}
              {project.built_areas != null && <div>Áreas construidas: {project.built_areas} m²</div>}
              {project.unit_types && <div>Tipos de unidades: {project.unit_types}</div>}
              {project.size_range && <div>Tamaños: {project.size_range}</div>}
              {project.quantity_per_type && <div>Cantidad por tipo: {project.quantity_per_type}</div>}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-md">
            <CardHeader className="px-6">
              <CardTitle className="font-serif text-xl text-primary">Amenidades y Servicios</CardTitle>
            </CardHeader>
            <CardContent className="px-6 text-sm text-foreground space-y-2">
              {Array.isArray(project.amenities) && project.amenities.length > 0 ? (
                <ul className="list-disc pl-5">
                  {project.amenities.map((a: string, i: number) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              ) : (
                <div>Sin amenidades listadas.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {Array.isArray(project.plans) && project.plans.length > 0 && (
          <Card className="rounded-2xl border shadow-md">
            <CardHeader className="px-6">
              <CardTitle className="font-serif text-xl text-primary">Planos</CardTitle>
            </CardHeader>
            <CardContent className="px-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {project.plans.map((p: string, i: number) => (
                <a key={i} href={p} target="_blank" rel="noreferrer" className="text-primary underline break-all">
                  {p}
                </a>
              ))}
            </CardContent>
          </Card>
        )}

        {project.promo_video && (
          <Card className="rounded-2xl border shadow-md">
            <CardHeader className="px-6">
              <CardTitle className="font-serif text-xl text-primary">Video</CardTitle>
            </CardHeader>
            <CardContent className="px-6">
              <a href={project.promo_video} target="_blank" rel="noreferrer" className="text-primary underline break-all">
                {project.promo_video}
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
