import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

async function getEmpresaProjects() {
  // Filtrar directamente por owner_role para evitar depender de la tabla users
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, project_name, city_province, address, images, unit_price_range, created_at")
    .eq("owner_role", "empresa_constructora")
    .order("created_at", { ascending: false })
    .limit(24);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("Error cargando projects:", error.message);
    return [] as any[];
  }
  return (projects ?? []) as any[];
}

export default async function ProjectsIndexPage() {
  const projects = await getEmpresaProjects();

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background px-3 sm:px-4 py-10 mobile-bottom-safe">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 text-center">
          <h1 className="font-serif text-2xl text-primary">Proyectos Exclusivos</h1>
          <p className="text-sm text-muted-foreground">Descubre los desarrollos mas destacados de nuestras empresas constructoras asociadas.</p>
        </header>
        {projects.length === 0 ? (
          <div className="text-muted-foreground text-center">No hay proyectos publicados aún.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const img = Array.isArray(p.images) ? p.images[0] : (p.images ? String(p.images) : null);
              return (
                <div key={p.id} className="overflow-hidden rounded-2xl border shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col bg-card">
                  <div className="relative aspect-video w-full bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <Link href={`/projects/${p.id}`}>
                      <img
                        src={img ?? "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1600&auto=format&fit=crop"}
                        alt={p.project_name}
                        className="h-full w-full object-cover"
                      />
                    </Link>
                  </div>
                  <div className="flex flex-col flex-1 p-0">
                    <CardHeader className="px-6 pt-4 pb-2">
                      <CardTitle className="font-serif text-lg">
                        <Link href={`/projects/${p.id}`} className="hover:underline">
                          {p.project_name}
                        </Link>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 mt-auto pb-4">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <MapPin className="mr-1.5 h-4 w-4" />
                          {p.city_province || p.address || ""}
                        </span>
                        {/* Enhanced price display with larger text, dark green color, and $ symbol */}
                        <span className="text-lg font-bold text-green-800">
                          {p.unit_price_range ? `$${p.unit_price_range}` : "—"}
                        </span>
                      </div>
                    </CardContent>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}