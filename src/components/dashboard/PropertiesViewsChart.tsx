"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home } from "lucide-react";
import { PropertyChartData } from "@/hooks/useStatsCharts";

interface PropertiesViewsChartProps {
  data: PropertyChartData[];
  loading?: boolean;
  title?: string;
}

