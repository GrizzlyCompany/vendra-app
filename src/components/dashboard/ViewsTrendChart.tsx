"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { MonthlyViewsData } from "@/hooks/useStatsCharts";

interface ViewsTrendChartProps {
  data: MonthlyViewsData[];
  loading?: boolean;
  title?: string;
}

export function ViewsTrendChart({ data, loading = false, title = "Tendencia de visualizaciones" }: ViewsTrendChartProps) {
  if (loading) {
    return (
      <Card className="rounded-2xl border shadow-md">
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <TrendingUp className="size-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full animate-pulse bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
            <div className="text-center text-gray-500">
              <TrendingUp className="size-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Cargando gráfico...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="rounded-2xl border shadow-md">
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <TrendingUp className="size-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full rounded-xl bg-gradient-to-br from-[#1C4B2E]/5 to-[#1C4B2E]/10 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <TrendingUp className="size-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay datos disponibles</p>
              <p className="text-xs mt-1">Las visualizaciones aparecerán aquí una vez que tengas visitas en tus propiedades</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort data by month (assuming month_year contains month names or dates)
  const sortedData = [...data].sort((a, b) => {
    // Simple sort - if it's already sorted from the backend, this won't change anything
    // But if not, this provides basic chronological ordering
    return data.indexOf(a) - data.indexOf(b);
  });

  return (
    <Card className="rounded-2xl border shadow-md">
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          <TrendingUp className="size-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sortedData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="month_year"
                axisLine={false}
                tickLine={false}
                className="text-xs fill-gray-600"
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                className="text-xs fill-gray-600"
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                labelStyle={{ color: '#374151', fontWeight: '600' }}
                formatter={(value: number) => [value.toLocaleString(), 'Visualizaciones']}
                labelFormatter={(label) => `Mes: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="views_count"
                stroke="#1C4B2E"
                strokeWidth={2}
                dot={{ fill: '#1C4B2E', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#1C4B2E', strokeWidth: 2 }}
                name="Visualizaciones"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
