-- Add view tracking for projects similar to properties
-- 1. Add views_count column to projects table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='projects' AND column_name='views_count'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN views_count integer DEFAULT 0;
  END IF;
END $$;

-- 2. Create project_views table for detailed tracking
CREATE TABLE IF NOT EXISTS public.project_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewer_ip text,
  user_agent text,
  referrer text,
  session_id text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_views ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_views
DO $$
BEGIN
  -- Project owners can see views of their projects
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_views' AND policyname='project_views_owner_read'
  ) THEN
    CREATE POLICY "project_views_owner_read" ON public.project_views 
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.projects p 
          WHERE p.id = project_id AND p.owner_id = auth.uid()
        )
      );
  END IF;

  -- Anyone can insert views (for tracking)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_views' AND policyname='project_views_insert_public'
  ) THEN
    CREATE POLICY "project_views_insert_public" ON public.project_views 
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Indexes for project_views performance
CREATE INDEX IF NOT EXISTS idx_project_views_project_id ON public.project_views (project_id);
CREATE INDEX IF NOT EXISTS idx_project_views_viewer_id ON public.project_views (viewer_id);
CREATE INDEX IF NOT EXISTS idx_project_views_created_at ON public.project_views (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_views_project_date ON public.project_views (project_id, created_at DESC);

-- 3. Function to increment project view count
CREATE OR REPLACE FUNCTION public.increment_project_views(project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.projects 
  SET views_count = COALESCE(views_count, 0) + 1 
  WHERE id = project_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.increment_project_views(uuid) TO authenticated;

-- 4. Update the get_monthly_view_trends function to include project views
DROP FUNCTION IF EXISTS public.get_monthly_view_trends(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_monthly_view_trends(owner_id uuid, months_back integer DEFAULT 6)
RETURNS TABLE (
  month_year text,
  views_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH combined_views AS (
    -- Property views
    SELECT 
      date_trunc('month', pv.created_at) as month,
      COUNT(*) as views
    FROM public.property_views pv
    JOIN public.properties p ON p.id = pv.property_id
    WHERE p.owner_id = $1
      AND pv.created_at >= date_trunc('month', now()) - INTERVAL '1 month' * months_back
    GROUP BY date_trunc('month', pv.created_at)
    
    UNION ALL
    
    -- Project views
    SELECT 
      date_trunc('month', pv.created_at) as month,
      COUNT(*) as views
    FROM public.project_views pv
    JOIN public.projects p ON p.id = pv.project_id
    WHERE p.owner_id = $1
      AND pv.created_at >= date_trunc('month', now()) - INTERVAL '1 month' * months_back
    GROUP BY date_trunc('month', pv.created_at)
  )
  SELECT 
    TO_CHAR(month, 'Mon YYYY') as month_year,
    SUM(views)::bigint as views_count
  FROM combined_views
  GROUP BY month
  ORDER BY month DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_monthly_view_trends(uuid, integer) TO authenticated;

-- 5. Update the get_property_stats function to include project statistics
-- First drop the existing function
DROP FUNCTION IF EXISTS public.get_property_stats(uuid);

-- Then create the updated function with the new return type
CREATE OR REPLACE FUNCTION public.get_property_stats(owner_id uuid)
RETURNS TABLE (
  active_properties bigint,
  total_views bigint,
  views_this_month bigint,
  unique_viewers bigint,
  active_projects bigint,
  total_project_views bigint,
  project_views_this_month bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.properties WHERE owner_id = $1) as active_properties,
    (SELECT COALESCE(SUM(views_count), 0) FROM public.properties WHERE owner_id = $1) as total_views,
    (SELECT COUNT(*) FROM public.property_views pv 
     JOIN public.properties p ON p.id = pv.property_id 
     WHERE p.owner_id = $1 
     AND pv.created_at >= date_trunc('month', now())) as views_this_month,
    (SELECT COUNT(DISTINCT viewer_id) FROM public.property_views pv 
     JOIN public.properties p ON p.id = pv.property_id 
     WHERE p.owner_id = $1 
     AND viewer_id IS NOT NULL) as unique_viewers,
    (SELECT COUNT(*) FROM public.projects WHERE owner_id = $1) as active_projects,
    (SELECT COALESCE(SUM(views_count), 0) FROM public.projects WHERE owner_id = $1) as total_project_views,
    (SELECT COUNT(*) FROM public.project_views pv 
     JOIN public.projects p ON p.id = pv.project_id 
     WHERE p.owner_id = $1 
     AND pv.created_at >= date_trunc('month', now())) as project_views_this_month;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_property_stats(uuid) TO authenticated;