"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PropertyCard } from "@/features/properties/components/PropertyCard";
import { ProjectCard } from "@/features/properties/components/ProjectCard";
import { Building } from "lucide-react";
import type { Property } from "@/types";
import type { ProfileProject } from "@/features/properties/hooks/useUserListings";

interface ListingsTabContentProps {
  profile: { name: string | null; role: string | null } | null;
  properties: Property[];
  projects: ProfileProject[];
  isLoading: boolean;
  error: string | null;
}

export function ListingsTabContent({ profile, properties, projects, isLoading, error }: ListingsTabContentProps) {
  const isCompany = profile?.role === 'empresa_constructora';
  const listings = isCompany ? projects : properties;
  const hasListings = listings.length > 0;

  return (
    <Card className="mt-3 sm:mt-4">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-lg sm:text-xl">
          {isCompany
            ? `Proyectos de ${profile?.name ?? "esta empresa"}`
            : `Propiedades de ${profile?.name ?? "este usuario"}`
          }
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="rounded-md border bg-muted/30 p-4 sm:p-6 text-sm text-muted-foreground">
            Cargando…
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 sm:p-6 text-sm text-destructive">
            {error}
          </div>
        ) : !hasListings ? (
          <div className="rounded-md border bg-muted/30 p-4 sm:p-6 text-sm text-muted-foreground">
            {isCompany
              ? "Esta empresa aún no tiene proyectos publicados."
              : "Este usuario aún no tiene propiedades publicadas."
            }
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {isCompany
              ? projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))
              : properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
}
