import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

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

  return (
    <div className="overflow-hidden rounded-2xl border shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col bg-card">
      <div className="relative aspect-video w-full bg-muted">
        <Link href={`/projects/${project.id}`}>
          <img
            src={img ?? "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1600&auto=format&fit=crop"}
            alt={project.project_name}
            className="h-full w-full object-cover"
          />
        </Link>
        {project.project_status && (
          <div className={`absolute left-3 top-3 z-10 rounded-full px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow ${
            project.project_status?.toLowerCase().includes('construccion') || project.project_status?.toLowerCase().includes('construcción')
              ? 'bg-orange-500'
              : project.project_status?.toLowerCase().includes('preventa')
              ? 'bg-blue-500'
              : project.project_status?.toLowerCase().includes('entrega') || project.project_status?.toLowerCase().includes('finalizado')
              ? 'bg-green-500'
              : 'bg-primary'
          }`}>
            {project.project_status}
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 p-0">
        <CardHeader className="px-6 pt-4 pb-2">
          <CardTitle className="font-sans text-lg">
            <Link href={`/projects/${project.id}`} className="hover:underline">
              {project.project_name}
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 mt-auto pb-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center">
              <MapPin className="mr-1.5 h-4 w-4" />
              {project.city_province || project.address || ""}
            </span>
            <span className="text-lg font-bold text-green-800">
              {project.unit_price_range ? `$${project.unit_price_range}` : "—"}
            </span>
          </div>
        </CardContent>
      </div>
    </div>
  );
}
