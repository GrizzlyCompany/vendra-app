-- Enable UUID extension just in case (usually on by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  branding_settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Team Policies
-- Owner can do everything
CREATE POLICY "Team owners can do everything" ON public.teams
  FOR ALL USING (auth.uid() = owner_id);

-- Members can view their team
CREATE POLICY "Members can view their team" ON public.teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
    )
  );

-- 2. Create Team Members Table
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'agent')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Team Member Policies
-- Team owners can manage members
CREATE POLICY "Team owners can manage members" ON public.team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- Members can view their teammates
CREATE POLICY "Members can view teammates" ON public.team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members AS tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
    )
  );

-- Users can view their own membership
CREATE POLICY "Users can view own membership" ON public.team_members
  FOR SELECT USING (user_id = auth.uid());

-- 3. Update Properties Table
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- 4. Update Priority Trigger
CREATE OR REPLACE FUNCTION update_property_priority()
RETURNS TRIGGER AS $$
DECLARE
  owner_role text;
BEGIN
  -- 1. If property is assigned to a Team, it implies Business Plan (Priority 30)
  -- (Assuming for now only Business users create teams, or we want team properties to be boosted)
  IF NEW.team_id IS NOT NULL THEN
    NEW.role_priority := 30;
    RETURN NEW;
  END IF;

  -- 2. Fallback to individual User Role
  SELECT role INTO owner_role FROM users WHERE id = NEW.owner_id;
  
  IF owner_role = 'empresa_constructora' THEN
    NEW.role_priority := 30;
  ELSIF owner_role = 'agente' THEN
    NEW.role_priority := 20;
  ELSIF owner_role = 'vendedor' THEN
    NEW.role_priority := 10;
  ELSE
    NEW.role_priority := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Helper Function: Auto-create Team for 'empresa_constructora'
-- When a user is upgraded to 'empresa_constructora', ensure they have a team?
-- Optional, but good for UX. Let's make a function callable via RPC or Trigger.
-- For now, we'll handle creation in the UI/RPC.

-- 6. Update Property RLS to allow Team Members to EDIT properties
-- Existing policies are usually "Users can update own properties".
-- We need to add: "Team members can update properties belonging to their team"

CREATE POLICY "Team members can update team properties" ON public.properties
  FOR UPDATE USING (
    team_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = properties.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('admin', 'agent') -- Both roles can edit? Or just admin? Let's say all for now.
    )
  );
