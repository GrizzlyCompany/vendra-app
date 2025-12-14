import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';

export interface MonthlyViewsData {
  month_year: string;
  views_count: number;
}

export interface PropertyChartData {
  title: string;
  views: number;
  percentage: number;
}

export function useStatsCharts() {
  const { user } = useAuth();
  const [monthlyViews, setMonthlyViews] = useState<MonthlyViewsData[]>([]);
  const [propertyBreakdown, setPropertyBreakdown] = useState<PropertyChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMonthlyViews = async (monthsBack: number = 6) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try to get monthly trends using the database function
      try {
        const { data: trendsData, error: trendsError } = await supabase.rpc('get_monthly_view_trends', {
          owner_id: user.id,
          months_back: monthsBack
        });

        if (!trendsError && trendsData) {
          setMonthlyViews(trendsData);
        } else {
          console.warn('Monthly trends RPC failed:', trendsError);
          // Fallback to calculated data
          await calculateMonthlyViews(monthsBack);
        }
      } catch (rpcError) {
        console.warn('Monthly trends RPC not available, using fallback:', rpcError);
        await calculateMonthlyViews(monthsBack);
      }
    } catch (err) {
      console.error('Error fetching monthly views:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar tendencias';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyViews = async (monthsBack: number) => {
    if (!user) return;

    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsBack);

      // First get property IDs for the user
      const { data: properties, error: propsError } = await supabase
        .from('properties')
        .select('id')
        .eq('owner_id', user.id);

      if (propsError) {
        console.error('Error getting properties:', propsError);
        return;
      }

      const propertyIds = properties?.map(p => p.id) || [];

      if (propertyIds.length === 0) {
        setMonthlyViews([]);
        return;
      }

      const { data: viewsData, error: viewsError } = await supabase
        .from('property_views')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .in('property_id', propertyIds);

      if (viewsError) {
        console.error('Error calculating monthly views:', viewsError);
        return;
      }

      // Group by month and count views
      const monthlyMap = new Map<string, number>();
      viewsData?.forEach(view => {
        const date = new Date(view.created_at);
        const monthKey = date.toLocaleString('es-ES', { year: 'numeric', month: 'short' });
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
      });

      // Convert to array format expected by Recharts
      const monthlyData = Array.from(monthlyMap.entries()).map(([month, views]) => ({
        month_year: month,
        views_count: views
      }));

      setMonthlyViews(monthlyData);
    } catch (err) {
      console.error('Error in calculateMonthlyViews:', err);
    }
  };

  const fetchPropertyBreakdown = async () => {
    if (!user) return;

    try {
      const { data: properties, error } = await supabase
        .from('properties')
        .select('id, title, views_count')
        .eq('owner_id', user.id)
        .order('views_count', { ascending: false, nullsFirst: false })
        .limit(10);

      if (error) {
        console.error('Error fetching property breakdown:', error);
        return;
      }

      const totalViews = properties?.reduce((sum, prop) => sum + (prop.views_count || 0), 0) || 1;

      const breakdownData = properties?.map(prop => ({
        title: prop.title || 'Sin título',
        views: prop.views_count || 0,
        percentage: totalViews > 0 ? ((prop.views_count || 0) / totalViews) * 100 : 0
      })) || [];

      setPropertyBreakdown(breakdownData);
    } catch (err) {
      console.error('Error in fetchPropertyBreakdown:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMonthlyViews();
      fetchPropertyBreakdown();
    }
  }, [user]);

  const refetchMonthlyViews = (monthsBack: number = 6) => fetchMonthlyViews(monthsBack);

  return {
    monthlyViews,
    propertyBreakdown,
    loading,
    error,
    refetchMonthlyViews,
    refetchPropertyBreakdown: fetchPropertyBreakdown
  };
}
