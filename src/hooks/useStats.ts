import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';

export interface PropertyStats {
  activeProperties: number;
  totalViews: number;
  viewsThisMonth: number;
  uniqueViewers: number;
}

export interface ProjectStats {
  activeProjects: number;
  totalProjectViews: number;
  projectViewsThisMonth: number;
}

export interface CombinedStats extends PropertyStats, ProjectStats { }

export interface PropertyViewStats {
  id: string;
  title: string;
  views_count: number;
  inserted_at: string;
}

export function useStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<CombinedStats | null>(null);
  const [propertyViews, setPropertyViews] = useState<PropertyViewStats[]>([]);
  const [projectViews, setProjectViews] = useState<PropertyViewStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get properties data
      const { data: basicStats, error: basicError } = await supabase
        .from('properties')
        .select('id, views_count')
        .eq('owner_id', user.id);

      if (basicError) {
        console.error('Basic stats error:', basicError);
        throw new Error(`Database query failed: ${basicError.message}`);
      }

      // Get projects data
      const { data: projectsStats, error: projectsError } = await supabase
        .from('projects')
        .select('id, project_name, created_at, views_count')
        .eq('owner_id', user.id);

      if (projectsError) {
        console.warn('Projects stats error:', projectsError);
        // Don't throw error for projects, just log warning
      }

      // Calculate basic stats from the data
      const activeProperties = basicStats?.length || 0;
      const totalViews = basicStats?.reduce((sum, prop) => sum + (prop.views_count || 0), 0) || 0;
      const activeProjects = projectsStats?.length || 0;
      const totalProjectViews = projectsStats?.reduce((sum, proj) => sum + (proj.views_count || 0), 0) || 0;

      // Try to get general stats using the database function
      let statsData = null;
      try {
        const { data: rpcData, error: statsError } = await supabase.rpc('get_property_stats', {
          owner_id: user.id
        });

        if (!statsError && rpcData && rpcData.length > 0) {
          const rpcStats = rpcData[0];
          statsData = {
            activeProperties: rpcStats.active_properties,
            totalViews: rpcStats.total_views,
            viewsThisMonth: rpcStats.views_this_month,
            uniqueViewers: rpcStats.unique_viewers,
            activeProjects: rpcStats.active_projects,
            totalProjectViews: rpcStats.total_project_views,
            projectViewsThisMonth: rpcStats.project_views_this_month
          };
        } else {
          console.warn('RPC function not available, using fallback stats');
        }
      } catch (rpcError) {
        console.warn('RPC function failed, using fallback stats:', rpcError);
      }

      // Use RPC data if available, otherwise use calculated data
      setStats(statsData || {
        activeProperties,
        totalViews,
        viewsThisMonth: 0, // Will be 0 if RPC not available
        uniqueViewers: 0,
        activeProjects,
        totalProjectViews,
        projectViewsThisMonth: 0 // Will be 0 if RPC not available
      });

      // Get per-property view statistics
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('id, title, views_count, inserted_at')
        .eq('owner_id', user.id)
        .order('views_count', { ascending: false, nullsFirst: false });

      if (propertiesError) {
        console.error('Properties query error:', propertiesError);
        throw new Error(`Failed to load properties: ${propertiesError.message}`);
      }

      setPropertyViews(propertiesData || []);

      // Get per-project view statistics
      const { data: projectsData, error: projectsDataError } = await supabase
        .from('projects')
        .select('id, project_name, views_count, created_at')
        .eq('owner_id', user.id)
        .order('views_count', { ascending: false, nullsFirst: false });

      if (projectsDataError) {
        console.warn('Projects data error:', projectsDataError);
        // Don't throw error for projects data
      }

      // Transform projects data to match PropertyViewStats interface
      const transformedProjectsData = (projectsData || []).map(project => ({
        id: project.id,
        title: project.project_name,
        views_count: project.views_count || 0,
        inserted_at: project.created_at
      }));

      setProjectViews(transformedProjectsData);
    } catch (err) {
      console.error('Error fetching stats:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar estadísticas';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  return {
    stats,
    propertyViews,
    projectViews,
    loading,
    error,
    refetch: fetchStats
  };
}