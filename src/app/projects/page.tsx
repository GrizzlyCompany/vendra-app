import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { ChevronLeft, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailBackButton } from "@/components/transitions/DetailPageTransition";
import { ProjectCard } from "@/features/projects/components/ProjectCard"; // Make sure this path is correct based on previous step
import { Input } from "@/components/ui/input";

// Force dynamic rendering for this page
// export const dynamic = 'force-dynamic'; // Removed for static export

async function getEmpresaProjects() {
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
    <main className="min-h-[calc(100dvh-64px)] bg-background mobile-bottom-safe">
      {/* Mobile Header */}
      <DetailBackButton className="md:hidden sticky top-0 bg-background/80 backdrop-blur-md z-30 mobile-top-safe border-b border-border/5">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-black/5 -ml-2"
          >
            <Link href="/main">
              <ChevronLeft className="w-6 h-6" />
            </Link>
          </Button>
          <span className="font-serif font-bold text-lg">Proyectos</span>
          <div className="w-10"></div> {/* Spacer */}
        </div>
      </DetailBackButton>

      {/* Hero Header Section */}
      <section className="relative px-4 sm:px-6 py-12 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-4">
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-primary tracking-tight">
            Desarrollos Exclusivos
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto font-light leading-relaxed">
            Explora nuestra colección curada de proyectos inmobiliarios de vanguardia.
            El hogar de tus sueños, diseñado por las mejores constructoras.
          </p>

          {/* Search/Filter Bar Placeholder - Visual Only */}
          <div className="mt-8 flex items-center max-w-md mx-auto bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-border rounded-full p-2 shadow-sm">
            <div className="pl-3 text-muted-foreground">
              <Search className="w-5 h-5" />
            </div>
            <Input
              placeholder="Buscar por ciudad o nombre..."
              className="border-none bg-transparent shadow-none focus-visible:ring-0 h-10 text-base"
            />
            <Button size="icon" variant="ghost" className="rounded-full hover:bg-black/5">
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="px-4 sm:px-6 pb-24 max-w-[1600px] mx-auto">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
            <div className="w-24 h-24 bg-secondary/10 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-10 h-10 text-primary/40" />
            </div>
            <h3 className="font-serif text-xl font-bold text-primary">Próximamente</h3>
            <p className="text-muted-foreground mt-2">Estamos curando los mejores proyectos para ti.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {projects.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// Icon for empty state
import { Building2 } from "lucide-react";