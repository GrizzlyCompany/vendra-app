import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailBackButton } from "@/components/transitions/DetailPageTransition";

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

async function getEmpresaProjects() {
  // Filtrar directamente por owner_role para evitar depender de la tabla users
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, project_name, city_province, address, images, unit_price_range, created_at, project_status")
    .eq("owner_role", "empresa_constructora")
    .order("created_at", { ascending: false })
    .limit(24);
  if (error) {
     
    console.warn("Error cargando projects:", error.message);
    return [] as any[];
  }
  return (projects ?? []) as any[];
}

export default async function ProjectsIndexPage() {
  const projects = await getEmpresaProjects();

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background px-3 sm:px-4 py-4 mobile-bottom-safe">
      {/* Mobile Header - visible only on mobile/tablet */}
      <DetailBackButton className="lg:hidden mb-4 sticky top-0 bg-background z-10 pt-4">
        <div className="flex items-center justify-between w-full">
          {/* Back Button */}
          <Button 
            asChild 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 w-8 h-8 border border-border/30 hover:border-border/50 transition-all duration-200"
          >
            <Link href="/">
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </Button>
          
          {/* Center Title */}
          <h1 className="text-base font-medium text-foreground truncate mx-2">
            Proyectos
          </h1>
          
          {/* Spacer for alignment */}
          <div className="w-8 h-8" />
        </div>
      </DetailBackButton>
      
      {/* Desktop: Show original content without changes */}
      <div className="hidden lg:block">
        {/* This empty div ensures desktop version remains unchanged */}
      </div>

      <div className="mx-auto max-w-6xl">
        {/* Search Filter Section (visual only, no functionality) */}
        <div className="text-card-foreground flex flex-col gap-6 py-6 mb-8 rounded-2xl shadow-lg overflow-visible bg-background border-0 relative before:content-[''] before:absolute before:inset-y-2 before:left-0.5 before:w-px before:bg-gradient-to-b before:from-transparent before:via-[hsl(var(--border))]/20 before:to-transparent after:content-[''] after:absolute after:inset-y-2 after:right-0.5 after:w-px after:bg-gradient-to-b after:from-transparent after:via-[hsl(var(--border))]/20 after:to-transparent">
          <div className="p-8 md:p-10">
            <h1 className="font-serif text-4xl md:text-6xl font-bold text-primary text-center">Proyectos Exclusivos</h1>
            <p className="mt-3 text-center text-muted-foreground max-w-2xl mx-auto">Descubre los desarrollos mas destacados de nuestras empresas constructoras asociadas.</p>
            <div className="mt-6 rounded-2xl bg-background p-4 sm:p-3 shadow-lg overflow-visible transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 max-w-5xl mx-auto border-0 relative before:content-[''] before:absolute before:inset-y-2 before:left-0.5 before:w-px before:bg-gradient-to-b before:from-transparent before:via-[hsl(var(--border))]/18 before:to-transparent after:content-[''] after:absolute after:inset-y-2 after:right-0.5 after:w-px after:bg-gradient-to-b after:from-transparent after:via-[hsl(var(--border))]/18 after:to-transparent">
              {/* Removed the grid with form elements */}
            </div>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="text-muted-foreground text-center">No hay proyectos publicados aún.</div>
        ) : (
          <>
            <h2 className="font-serif text-2xl font-bold mb-8 mt-4 text-primary">Proyectos Destacados</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => {
                const img = Array.isArray(p.images) ? p.images[0] : (p.images ? String(p.images) : null);
                return (
                  <div key={p.id} className="overflow-hidden rounded-2xl border shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col bg-card">
                    <div className="relative aspect-video w-full bg-muted">
                      { }
                      <Link href={`/projects/${p.id}`}>
                        <img
                          src={img ?? "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1600&auto=format&fit=crop"}
                          alt={p.project_name}
                          className="h-full w-full object-cover"
                        />
                      </Link>
                      {p.project_status && (
                        <div className={`absolute left-3 top-3 z-10 rounded-full px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow ${
                          p.project_status.toLowerCase().includes('construccion') || p.project_status.toLowerCase().includes('construcción') 
                            ? 'bg-orange-500' 
                            : p.project_status.toLowerCase().includes('preventa') 
                            ? 'bg-blue-500' 
                            : p.project_status.toLowerCase().includes('entrega') || p.project_status.toLowerCase().includes('finalizado') 
                            ? 'bg-green-500' 
                            : 'bg-primary'
                        }`}>
                          {p.project_status}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 p-0">
                      <CardHeader className="px-6 pt-4 pb-2">
                        <CardTitle className="font-sans text-lg">
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
          </>
        )}
      </div>
    </main>
  );
}