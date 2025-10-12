"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, CheckCircle2, Home, TrendingUp, BarChart3, Download, Building } from "lucide-react";
import { useStats } from "@/hooks/useStats";
import { useStatsCharts } from "@/hooks/useStatsCharts";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewsTrendChart } from "./ViewsTrendChart";
import { Button } from "@/components/ui/button";

export function StatsSection() {
  const { stats, propertyViews, projectViews, loading, error } = useStats();
  const { monthlyViews, loading: chartsLoading, error: chartsError, refetchMonthlyViews } = useStatsCharts();
  const [period, setPeriod] = useState("6");

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    refetchMonthlyViews(parseInt(value));
  };

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

  // Calculate total views (properties + projects)
  const totalViews = (stats?.totalViews || 0) + (stats?.totalProjectViews || 0);
  const totalViewsThisMonth = (stats?.viewsThisMonth || 0) + (stats?.projectViewsThisMonth || 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl text-[#1C4B2E]">Estadísticas</h2>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="h-10 w-[180px] rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="3">Últimos 3 meses</option>
            <option value="6">Últimos 6 meses</option>
            <option value="12">Último año</option>
          </select>
          <Button variant="outline" size="sm">
            <Download className="size-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

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
              <Building className="size-6 text-[#1C4B2E]" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[#6B7280]">Visualizaciones totales</div>
                <div className="text-2xl font-semibold text-[#1C4B2E]">
                  {totalViews.toLocaleString()}
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
                  {totalViewsThisMonth.toLocaleString()}
                </div>
              </div>
              <TrendingUp className="size-6 text-[#1C4B2E]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts section */}
      <ViewsTrendChart
        data={monthlyViews}
        loading={chartsLoading}
        title={`Tendencia de visualizaciones - ${period === "3" ? "3 meses" : period === "12" ? "1 año" : "6 meses"}`}
      />

      {/* Property-specific view statistics */}
      {propertyViews.length > 0 && (
        <Card className="rounded-2xl border shadow-md">
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <BarChart3 className="size-5" />
              Visualizaciones por propiedad
            </CardTitle>
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

      {/* Project-specific view statistics */}
      {projectViews.length > 0 && (
        <Card className="rounded-2xl border shadow-md">
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <Building className="size-5" />
              Visualizaciones por proyecto
            </CardTitle>
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
                    <Eye className="size-4 text-gray-400" />
                    <span className="font-semibold text-[#1C4B2E]">
                      {project.views_count || 0}
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
    </div>
  );
}