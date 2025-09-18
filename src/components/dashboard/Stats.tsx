"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, CheckCircle2, Home, TrendingUp } from "lucide-react";
import { useStats } from "@/hooks/useStats";
import { Skeleton } from "@/components/ui/skeleton";

export function StatsSection() {
  const { stats, propertyViews, projectViews, loading, error } = useStats();

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="font-serif text-2xl text-[#1C4B2E]">Estadísticas</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="rounded-2xl border shadow-md">
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="font-serif text-2xl text-[#1C4B2E]">Estadísticas</h2>
        <Card className="rounded-2xl border shadow-md">
          <CardContent className="p-4">
            <div className="text-center text-red-600">
              Error al cargar estadísticas: {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-2xl text-[#1C4B2E]">Estadísticas</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[#6B7280]">Propiedades activas</div>
                <div className="text-2xl font-semibold text-[#1C4B2E]">
                  {stats?.activeProperties || 0}
                </div>
              </div>
              <Home className="size-6 text-[#1C4B2E]" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[#6B7280]">Proyectos activos</div>
                <div className="text-2xl font-semibold text-[#1C4B2E]">
                  {stats?.activeProjects || 0}
                </div>
              </div>
              <CheckCircle2 className="size-6 text-[#1C4B2E]" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[#6B7280]">Visualizaciones totales</div>
                <div className="text-2xl font-semibold text-[#1C4B2E]">
                  {stats?.totalViews?.toLocaleString() || 0}
                </div>
              </div>
              <Eye className="size-6 text-[#1C4B2E]" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[#6B7280]">Visualizaciones este mes</div>
                <div className="text-2xl font-semibold text-[#1C4B2E]">
                  {stats?.viewsThisMonth?.toLocaleString() || 0}
                </div>
              </div>
              <TrendingUp className="size-6 text-[#1C4B2E]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property-specific view statistics */}
      {propertyViews.length > 0 && (
        <Card className="rounded-2xl border shadow-md">
          <CardHeader>
            <CardTitle className="font-serif">Visualizaciones por propiedad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {propertyViews.slice(0, 10).map((property) => (
                <div key={property.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {property.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      Publicado: {new Date(property.inserted_at).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="size-4 text-gray-400" />
                    <span className="font-semibold text-[#1C4B2E]">
                      {property.views_count || 0}
                    </span>
                  </div>
                </div>
              ))}
              {propertyViews.length > 10 && (
                <div className="text-center text-sm text-gray-500 pt-2">
                  Y {propertyViews.length - 10} propiedades más...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project-specific statistics */}
      {projectViews.length > 0 && (
        <Card className="rounded-2xl border shadow-md">
          <CardHeader>
            <CardTitle className="font-serif">Proyectos publicados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {projectViews.slice(0, 10).map((project) => (
                <div key={project.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {project.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      Publicado: {new Date(project.inserted_at).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-green-500" />
                    <span className="font-semibold text-[#1C4B2E]">
                      Activo
                    </span>
                  </div>
                </div>
              ))}
              {projectViews.length > 10 && (
                <div className="text-center text-sm text-gray-500 pt-2">
                  Y {projectViews.length - 10} proyectos más...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Placeholder for future chart */}
      <Card className="rounded-2xl border shadow-md">
        <CardHeader>
          <CardTitle className="font-serif">Tendencia de visualizaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full rounded-xl bg-gradient-to-br from-[#1C4B2E]/5 to-[#1C4B2E]/10 flex items-center justify-center">
            <div className="text-center text-[#6B7280]">
              <TrendingUp className="size-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Gráfico de tendencias próximamente</p>
              <p className="text-xs mt-1">Instala Recharts para visualizar datos históricos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
