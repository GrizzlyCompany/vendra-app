import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Building2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: string;
  project_name: string;
  city_province: string | null;
  address: string | null;
  images: string[] | null;
  unit_price_range: string | null;
  project_status: string | null;
}

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const img = Array.isArray(project.images) ? project.images[0] : (project.images ? String(project.images) : null);

  // Status color mapping
  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-primary';
    const s = status.toLowerCase();
    if (s.includes('construccion') || s.includes('construcción')) return 'bg-orange-500';
    if (s.includes('preventa')) return 'bg-blue-500';
    if (s.includes('entrega') || s.includes('finalizado')) return 'bg-green-500';
    return 'bg-primary';
  };

  return (
    <Card className="group h-full overflow-hidden rounded-2xl border-white/20 bg-card/60 backdrop-blur-md shadow-lg transition-all duration-300 hover:translate-y-[-4px] hover:shadow-2xl hover:bg-card/80 flex flex-col dark:bg-card/40 dark:hover:bg-card/60">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-10" />

        <Link href={`/projects/${project.id}`}>
          <img
            src={img ?? "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1600&auto=format&fit=crop"}
            alt={project.project_name}
            className="h-full w-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
          />
        </Link>

        {project.project_status && (
          <div className={`absolute left-3 top-3 z-20 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm ring-1 ring-white/20 backdrop-blur-sm ${getStatusColor(project.project_status)}`}>
            {project.project_status}
          </div>
        )}

        <div className="absolute right-3 top-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm hover:bg-white text-black">
            <Building2 className="mr-1 h-3 w-3" /> Proyecto
          </Badge>
        </div>
      </div>

      <div className="flex flex-col flex-1 p-0">
        <CardHeader className="px-5 pt-4 pb-2">
          <CardTitle className="font-serif text-xl font-bold leading-tight">
            <Link href={`/projects/${project.id}`} className="transition-colors group-hover:text-primary">
              {project.project_name}
            </Link>
          </CardTitle>
        </CardHeader>

        <CardContent className="px-5 mt-auto pb-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-start text-sm text-muted-foreground min-h-[40px]">
              <MapPin className="mr-1.5 h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{project.city_province || project.address || "Ubicación no disponible"}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Desde</p>
                <p className="text-lg font-bold text-primary">
                  {project.unit_price_range ? `$${project.unit_price_range}` : "Consultar"}
                </p>
              </div>

              <Link
                href={`/projects/${project.id}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
