import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        <header className="mb-6">
          <h1 className="font-serif text-2xl text-primary">Proyectos publicados</h1>
          <p className="text-sm text-muted-foreground">Proyectos de usuarios con rol empresa_constructora</p>
        </header>
        {projects.length === 0 ? (
          <div className="text-muted-foreground">No hay proyectos publicados aún.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const img = Array.isArray(p.images) ? p.images[0] : (p.images ? String(p.images) : null);
              return (
                <Card key={p.id} className="overflow-hidden rounded-2xl border shadow-md">
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
                  <CardHeader className="px-6">
                    <CardTitle className="font-serif text-lg">
                      <Link href={`/projects/${p.id}`} className="hover:underline">
                        {p.project_name}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-6">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{p.city_province || p.address || ""}</span>
                      <span>{p.unit_price_range || "—"}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
