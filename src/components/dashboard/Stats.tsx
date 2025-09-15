"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, CheckCircle2, Home } from "lucide-react";

export function StatsSection() {
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-2xl text-[#1C4B2E]">Estadísticas</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl border shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[#6B7280]">Propiedades activas</div>
                <div className="text-2xl font-semibold text-[#1C4B2E]">12</div>
              </div>
              <Home className="size-6 text-[#1C4B2E]" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[#6B7280]">Visualizaciones</div>
                <div className="text-2xl font-semibold text-[#1C4B2E]">2,320</div>
              </div>
              <Eye className="size-6 text-[#1C4B2E]" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[#6B7280]">Ventas cerradas</div>
                <div className="text-2xl font-semibold text-[#1C4B2E]">7</div>
              </div>
              <CheckCircle2 className="size-6 text-[#1C4B2E]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border shadow-md">
        <CardHeader>
          <CardTitle className="font-serif">Tendencia de visualizaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full rounded-xl bg-white/60 text-center leading-[300px] text-[#6B7280]">
            Instala Recharts para gráficos: <code>npm i recharts</code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
